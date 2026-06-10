"""Fitting round service (Story 12.6, SCP 2026-06-10 — FR100).

Bespoke fitting ⇄ alteration loop: Owner/Tailor records each fitting round's
outcome (passed / needs_alteration + notes). Every round is one immutable
fitting_rounds row + one task_history event (status-transition tracking
principle, SCP 2026-05-01). round_number is computed server-side under the
task FOR UPDATE lock (Authoritative Server Pattern).

The loop lives at the stage-log + fitting_rounds level — orders.status is
NOT extended (anti-pattern guard).
"""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import (
    FittingRoundDB,
    OrderDB,
    TailorTaskDB,
    TaskHistoryDB,
    TaskStageLogDB,
    UserDB,
)
from src.models.fitting import FittingRoundCreate, FittingRoundResponse
from src.services.notification_creator import (
    FITTING_ALTERATION,
    FITTING_PASSED,
    create_notification,
)
from src.services.tailor_task_service import (
    _advance_current_stage,
    _check_client_version,
)

logger = logging.getLogger(__name__)

DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def _round_to_response(fitting_round: FittingRoundDB) -> FittingRoundResponse:
    return FittingRoundResponse(
        id=str(fitting_round.id),
        order_id=str(fitting_round.order_id),
        task_id=str(fitting_round.task_id),
        round_number=fitting_round.round_number,
        appointment_id=str(fitting_round.appointment_id) if fitting_round.appointment_id else None,
        outcome=fitting_round.outcome,
        notes=fitting_round.notes,
        fitted_at=fitting_round.fitted_at.isoformat() if fitting_round.fitted_at else None,
        created_at=fitting_round.created_at.isoformat(),
    )


async def record_fitting_round(
    db: AsyncSession,
    order_id: uuid.UUID,
    actor: UserDB,
    tenant_id: uuid.UUID,
    body: FittingRoundCreate,
) -> FittingRoundResponse:
    """Record one fitting round for a bespoke order in production (AC4).

    Requires: bespoke order, status in_production, an in_progress task whose
    current in_progress stage is 'fitting'. outcome='passed' additionally
    completes the fitting stage and starts the next stage (shared mechanics
    with complete_stage — _advance_current_stage).
    """
    order_result = await db.execute(
        select(OrderDB).where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
    )
    order = order_result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")
    if order.service_type != "bespoke":
        raise HTTPException(
            status_code=400, detail="Chỉ đơn đặt may riêng mới có vòng thử đồ"
        )
    # "in_progress" = Owner created the task on a confirmed order (create_task);
    # "in_production" = the tailor accepted it (accept_task). Both are live
    # production states, so both allow recording fitting rounds.
    if order.status not in ("in_production", "in_progress"):
        raise HTTPException(
            status_code=400,
            detail="Đơn hàng chưa ở giai đoạn sản xuất nên chưa thể ghi nhận vòng thử",
        )

    # Active task under FOR UPDATE — serializes round_number computation
    task_result = await db.execute(
        select(TailorTaskDB)
        .where(
            TailorTaskDB.order_id == order_id,
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.status == "in_progress",
        )
        .with_for_update()
    )
    task = task_result.scalars().first()
    if task is None:
        raise HTTPException(
            status_code=400, detail="Không có công việc đang thực hiện cho đơn hàng này"
        )

    if actor.role == "Tailor" and task.assigned_to != actor.id:
        raise HTTPException(
            status_code=403, detail="Chỉ thợ may được giao mới có thể ghi nhận vòng thử"
        )

    _check_client_version(task, body.version)

    # Current in_progress stage must be 'fitting'
    stage_result = await db.execute(
        select(TaskStageLogDB)
        .where(
            TaskStageLogDB.task_id == task.id,
            TaskStageLogDB.tenant_id == tenant_id,
            TaskStageLogDB.status == "in_progress",
        )
        .order_by(TaskStageLogDB.stage_order)
    )
    current_stage = stage_result.scalars().first()
    if current_stage is None or current_stage.stage != "fitting":
        raise HTTPException(
            status_code=400,
            detail="Sản phẩm chưa tới bước Thử đồ nên chưa thể ghi nhận vòng thử",
        )

    # round_number: count of existing rounds for this order + 1 (server-side)
    count_result = await db.execute(
        select(func.count(FittingRoundDB.id)).where(
            FittingRoundDB.order_id == order_id,
            FittingRoundDB.tenant_id == tenant_id,
        )
    )
    round_number = count_result.scalar_one() + 1

    now = datetime.now(timezone.utc)
    fitting_round = FittingRoundDB(
        tenant_id=tenant_id,
        order_id=order_id,
        task_id=task.id,
        round_number=round_number,
        appointment_id=body.appointment_id,
        outcome=body.outcome,
        notes=body.notes,
        fitted_at=now,
    )
    db.add(fitting_round)

    # Bump the task version under the FOR UPDATE lock so a second device
    # holding a stale version gets 409 from _check_client_version.
    task.version += 1
    task.updated_at = now

    # Immutable business event (SCP 2026-05-01 principle)
    history = TaskHistoryDB(
        task_id=task.id,
        tenant_id=tenant_id,
        actor_id=actor.id,
        actor_role=actor.role,
        action="fitting_round_recorded",
        from_status=task.status,
        to_status=task.status,
        reason=body.notes,
        extra_metadata={"round_number": round_number, "outcome": body.outcome},
    )
    db.add(history)

    # Flush so the new round is visible to the AC5 gate inside the shared
    # stage-advance path when outcome='passed'.
    await db.flush()

    if body.outcome == "passed":
        await _advance_current_stage(db, task, current_stage.stage_order, tenant_id)

    await db.flush()
    await db.commit()

    # Customer notifications (skip silently when no linked customer)
    if order.customer_id:
        try:
            if body.outcome == "passed":
                title, msg_tpl = FITTING_PASSED
                notification_type = "fitting_passed"
                message = msg_tpl.format(garment_name=task.garment_name)
            else:
                title, msg_tpl = FITTING_ALTERATION
                notification_type = "fitting_alteration"
                message = msg_tpl.format(
                    garment_name=task.garment_name, round_number=round_number
                )
            await create_notification(
                db=db, user_id=order.customer_id, tenant_id=tenant_id,
                notification_type=notification_type,
                title=title,
                message=message,
                data={"order_id": str(order_id), "round_number": round_number},
            )
        except Exception:
            logger.warning(
                "Failed to notify customer about fitting round %s of order %s",
                round_number, order_id,
            )

    return _round_to_response(fitting_round)


async def list_fitting_rounds(
    db: AsyncSession,
    order_id: uuid.UUID,
    actor: UserDB,
) -> tuple[list[FittingRoundResponse], str | None]:
    """Round history ordered by round_number asc (AC6).

    Accessible to Owner (same tenant), the assigned Tailor, and the order's
    own Customer — 403 otherwise. Returns (rounds, fitting_stage_status) so
    the customer UI can render the waiting state before any round exists.

    The order lookup is tenant-scoped (404 outside the actor's tenant) so a
    foreign tenant cannot probe order existence — same as the POST path.
    """
    actor_tenant = actor.tenant_id if actor.tenant_id else DEFAULT_TENANT_ID
    order_result = await db.execute(
        select(OrderDB).where(OrderDB.id == order_id, OrderDB.tenant_id == actor_tenant)
    )
    order = order_result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    if actor.role == "Customer":
        if order.customer_id != actor.id:
            raise HTTPException(status_code=403, detail="Bạn không có quyền xem đơn hàng này")
    elif actor.role == "Owner":
        pass  # same-tenant Owner — already scoped by the lookup above
    elif actor.role == "Tailor":
        assigned_result = await db.execute(
            select(func.count(TailorTaskDB.id)).where(
                TailorTaskDB.order_id == order_id,
                TailorTaskDB.tenant_id == order.tenant_id,
                TailorTaskDB.assigned_to == actor.id,
            )
        )
        if assigned_result.scalar_one() == 0:
            raise HTTPException(status_code=403, detail="Bạn không được giao công việc của đơn hàng này")
    else:
        raise HTTPException(status_code=403, detail="Bạn không có quyền xem vòng thử của đơn hàng này")

    rounds_result = await db.execute(
        select(FittingRoundDB)
        .where(
            FittingRoundDB.order_id == order_id,
            FittingRoundDB.tenant_id == order.tenant_id,
        )
        .order_by(FittingRoundDB.round_number.asc())
    )
    rounds = [_round_to_response(r) for r in rounds_result.scalars().all()]

    # Fitting stage status of the latest active task (for the customer strip)
    task_id_result = await db.execute(
        select(TailorTaskDB.id)
        .where(
            TailorTaskDB.order_id == order_id,
            TailorTaskDB.tenant_id == order.tenant_id,
            TailorTaskDB.status.not_in(["cancelled", "rejected", "unassigned"]),
        )
        .order_by(TailorTaskDB.created_at.desc())
        .limit(1)
    )
    latest_task_id = task_id_result.scalar_one_or_none()
    fitting_stage_status: str | None = None
    if latest_task_id:
        stage_status_result = await db.execute(
            select(TaskStageLogDB.status)
            .where(
                TaskStageLogDB.task_id == latest_task_id,
                TaskStageLogDB.tenant_id == order.tenant_id,
                TaskStageLogDB.stage == "fitting",
            )
            .limit(1)
        )
        fitting_stage_status = stage_status_result.scalar_one_or_none()

    return rounds, fitting_stage_status
