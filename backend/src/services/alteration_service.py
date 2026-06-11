"""Post-delivery alteration warranty service (Story 12.7, SCP 2026-06-10 — FR101).

A bespoke order's customer may request free fit alterations within the
tenant's warranty window after delivery. Each request is owner-gated: once an
alteration closes, the customer may request again while the window is open —
deliberate; the owner is the rate limiter, not the system. Lightweight by
design (anti-pattern guard): NO alteration_requests table and NO new
orders.status value — the pending request is orders.alteration_requested_at +
orders.alteration_request_note (the customer's description; the owner
notification is only a courtesy copy), and the approved work is a normal
TailorTask with task_type='alteration' flowing through the existing 11-state
machine with the reduced stage list ["alteration", "finishing"].

All warranty window math happens here (Authoritative Server Pattern):
the frontend renders the computed AlterationInfo verbatim.
"""

import logging
import math
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.models.alteration import (
    AlterationInfo,
    AlterationRequestCreate,
    AlterationRequestResponse,
    ApproveAlterationRequest,
)
from src.models.db_models import (
    OrderDB,
    OrderItemDB,
    TailorTaskDB,
    TenantDB,
    UserDB,
)
from src.models.tailor_task import TailorTaskResponse
from src.services.notification_creator import (
    ALTERATION_APPROVED_CUSTOMER,
    ALTERATION_REQUESTED_OWNER,
    TASK_ASSIGNED_TAILOR,
    create_notification,
)
from src.services.tailor_task_service import (
    _create_stage_logs,
    _get_owner_for_tenant,
    _task_to_response,
)
from src.services.tenant_settings import (
    ALTERATION_WARRANTY_DAYS_KEY,
    DEFAULT_ALTERATION_WARRANTY_DAYS,
    get_tenant_setting,
)

logger = logging.getLogger(__name__)

# Order statuses in which the alteration warranty applies (post-handover).
_WARRANTY_ORDER_STATUSES = ("delivered", "completed")

# Task statuses that mean "this alteration is still being worked on".
# completed/cancelled close the request; everything else (incl. rejected →
# auto-unassigned awaiting reassign) keeps it open.
_OPEN_TASK_STATUSES_EXCLUDED = ("completed", "cancelled")


def _as_utc(dt: datetime) -> datetime:
    """Normalize possibly-naive DB datetimes (sqlite tests) to aware UTC."""
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def _build_order_code(order: OrderDB) -> str:
    date_part = order.created_at.strftime("%Y%m%d")
    uid_part = str(order.id).replace("-", "").upper()[:6]
    return f"ORD-{date_part}-{uid_part}"


def resolve_window_anchor(order: OrderDB) -> datetime:
    """Timestamp the warranty window counts from.

    Fallback chain (documented per AC2):
    1. order.delivery_date — authoritative. update_order_status stamps it
       exactly once when the order enters delivered (or completed, for paths
       that skip delivered), and migration 045 backfills existing
       delivered/completed rows from updated_at, so the anchor never moves.
    2. order.updated_at — last-resort approximation for legacy rows only
       (created before migration 045 ran). Approximate because updated_at is
       bumped by every transition; once 045's backfill has run this branch is
       effectively dead. To keep even the legacy proxy stable, the alteration
       request/approve mutations in this module deliberately do NOT bump
       order.updated_at.
    """
    anchor = order.delivery_date or order.updated_at
    return _as_utc(anchor)


async def _get_warranty_days(db: AsyncSession, tenant_id: uuid.UUID) -> int:
    tenant = await db.get(TenantDB, tenant_id)
    days = get_tenant_setting(
        tenant, ALTERATION_WARRANTY_DAYS_KEY, DEFAULT_ALTERATION_WARRANTY_DAYS
    )
    try:
        return int(days)
    except (TypeError, ValueError):
        logger.warning(
            "Tenant %s has a non-numeric %s setting (%r) — using default %d",
            tenant_id, ALTERATION_WARRANTY_DAYS_KEY, days,
            DEFAULT_ALTERATION_WARRANTY_DAYS,
        )
        return DEFAULT_ALTERATION_WARRANTY_DAYS


def _window_state(
    anchor: datetime, warranty_days: int, now: datetime
) -> tuple[bool, int]:
    """(is_within_window, remaining_days).

    The window is inclusive of the boundary moment: requests are accepted while
    now <= anchor + warranty_days. remaining_days is rounded UP so "Còn 1 ngày"
    shows for any partial last day (0 only at/after the boundary).
    """
    deadline = anchor + timedelta(days=warranty_days)
    within = now <= deadline
    remaining_seconds = (deadline - now).total_seconds()
    remaining_days = max(0, math.ceil(remaining_seconds / 86400))
    return within, remaining_days


async def _has_open_alteration_task(
    db: AsyncSession, order_id: uuid.UUID, tenant_id: uuid.UUID
) -> bool:
    result = await db.execute(
        select(func.count(TailorTaskDB.id)).where(
            TailorTaskDB.order_id == order_id,
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.task_type == "alteration",
            TailorTaskDB.status.not_in(_OPEN_TASK_STATUSES_EXCLUDED),
        )
    )
    return result.scalar_one() > 0


async def compute_alteration_info(
    db: AsyncSession, order: OrderDB
) -> AlterationInfo | None:
    """Server-computed warranty state for the customer order detail (AC5).

    None for non-bespoke orders or orders not yet handed over — the customer
    UI shows nothing in that case.
    """
    if order.service_type != "bespoke" or order.status not in _WARRANTY_ORDER_STATUSES:
        return None

    warranty_days = await _get_warranty_days(db, order.tenant_id)
    now = datetime.now(timezone.utc)
    within, remaining_days = _window_state(
        resolve_window_anchor(order), warranty_days, now
    )

    request_note = None
    if order.alteration_requested_at is not None:
        state = "pending"
        request_note = order.alteration_request_note
    elif await _has_open_alteration_task(db, order.id, order.tenant_id):
        state = "in_alteration"
    elif within:
        state = "available"
    else:
        state = "expired"

    return AlterationInfo(
        state=state,
        warranty_days=warranty_days,
        remaining_days=remaining_days,
        requested_at=order.alteration_requested_at,
        request_note=request_note,
    )


async def request_alteration(
    db: AsyncSession,
    order_id: uuid.UUID,
    actor: UserDB,
    tenant_id: uuid.UUID,
    body: AlterationRequestCreate,
) -> AlterationRequestResponse:
    """Customer requests a free alteration on their own bespoke order (AC2).

    404 unknown / not the actor's own order (no existence oracle, matches
    the customer order detail endpoint); 400 non-bespoke or wrong status;
    409 duplicate open request; 422 outside the warranty window.
    Stores the request as orders.alteration_requested_at + an owner
    notification (no task yet — owner approval is the gate, AC3).
    """
    order_result = await db.execute(
        select(OrderDB)
        .where(
            OrderDB.id == order_id,
            OrderDB.tenant_id == tenant_id,
            OrderDB.customer_id == actor.id,
        )
        .with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Đơn hàng không tồn tại hoặc không thuộc về tài khoản của bạn",
        )

    if order.service_type != "bespoke":
        raise HTTPException(
            status_code=400,
            detail="Chỉ đơn đặt may riêng mới được chỉnh sửa miễn phí",
        )
    if order.status not in _WARRANTY_ORDER_STATUSES:
        raise HTTPException(
            status_code=400,
            detail="Chỉ có thể yêu cầu chỉnh sửa sau khi bạn đã nhận áo",
        )

    if order.alteration_requested_at is not None:
        raise HTTPException(
            status_code=409,
            detail="Bạn đã gửi yêu cầu chỉnh sửa cho đơn này — tiệm sẽ sớm xác nhận",
        )
    if await _has_open_alteration_task(db, order.id, tenant_id):
        raise HTTPException(
            status_code=409,
            detail="Tiệm đang chỉnh sửa áo của đơn này — vui lòng chờ nhận áo",
        )

    warranty_days = await _get_warranty_days(db, tenant_id)
    now = datetime.now(timezone.utc)
    within, _ = _window_state(resolve_window_anchor(order), warranty_days, now)
    if not within:
        raise HTTPException(
            status_code=422,
            detail=(
                f"Đã quá thời hạn chỉnh sửa miễn phí ({warranty_days} ngày). "
                "Vui lòng liên hệ tiệm."
            ),
        )

    # Pending marker + the customer's description (already stripped by the
    # AlterationRequestCreate validator) — persisted BEFORE the commit so the
    # owner can always read it, even when the courtesy notification below
    # fails. Intentionally NOT bumping order.updated_at so the legacy
    # window-anchor fallback (resolve_window_anchor) stays stable.
    order.alteration_requested_at = now
    order.alteration_request_note = body.description
    await db.flush()
    await db.commit()

    # Notify the owner (courtesy copy — the authoritative description lives in
    # orders.alteration_request_note; no dedicated table by design)
    owner_id = await _get_owner_for_tenant(db, tenant_id)
    if owner_id:
        try:
            title, msg_tpl = ALTERATION_REQUESTED_OWNER
            await create_notification(
                db=db, user_id=owner_id, tenant_id=tenant_id,
                notification_type="alteration_requested",
                title=title,
                message=msg_tpl.format(
                    customer_name=order.customer_name,
                    order_code=_build_order_code(order),
                    description=body.description[:200],
                ),
                data={"order_id": str(order.id), "description": body.description},
            )
        except Exception:
            logger.warning(
                "Failed to notify owner about alteration request for order %s", order.id
            )

    return AlterationRequestResponse(
        order_id=str(order.id),
        alteration_requested_at=now.isoformat(),
    )


async def _resolve_garment_name(db: AsyncSession, order: OrderDB) -> str:
    """First item's garment name — same fallback as create_task."""
    items_result = await db.execute(
        select(OrderItemDB)
        .options(joinedload(OrderItemDB.garment))
        .where(OrderItemDB.order_id == order.id)
        .limit(1)
    )
    first_item = items_result.scalar_one_or_none()
    if first_item and first_item.garment:
        return first_item.garment.name
    return "Áo dài"


async def approve_alteration(
    db: AsyncSession,
    order_id: uuid.UUID,
    owner_id: uuid.UUID,
    tenant_id: uuid.UUID,
    body: ApproveAlterationRequest,
) -> TailorTaskResponse:
    """Owner approves a pending alteration request (AC3).

    Creates a TailorTask with task_type='alteration' (unassigned, or assigned
    when tailor_id is given) and the reduced stage list, clears the pending
    marker, and notifies the customer (+ the assigned tailor). The task then
    flows through the existing 11-state machine unchanged.
    """
    order_result = await db.execute(
        select(OrderDB)
        .where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
        .with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    if order.alteration_requested_at is None:
        raise HTTPException(
            status_code=400,
            detail="Đơn hàng không có yêu cầu chỉnh sửa đang chờ xử lý",
        )
    if await _has_open_alteration_task(db, order.id, tenant_id):
        raise HTTPException(
            status_code=409,
            detail="Đơn hàng đã có công việc chỉnh sửa đang thực hiện",
        )

    # Validate the optional tailor — same rules as the create-task path
    tailor: UserDB | None = None
    if body.tailor_id is not None:
        tailor = await db.get(UserDB, body.tailor_id)
        if tailor is None:
            raise HTTPException(status_code=400, detail="Không tìm thấy thợ may")
        if tailor.role != "Tailor":
            raise HTTPException(status_code=400, detail="Người được giao phải có vai trò Thợ may")
        if not tailor.is_active:
            raise HTTPException(status_code=400, detail="Tài khoản thợ may đã bị vô hiệu hóa")
        if tailor.tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="Thợ may không thuộc cùng cơ sở")

    garment_name = await _resolve_garment_name(db, order)

    deadline = body.deadline
    if deadline is not None and deadline.tzinfo is None:
        deadline = deadline.replace(tzinfo=timezone.utc)

    # The customer's description travels onto the task so the assigned tailor
    # sees what to fix; the owner's own notes (if any) are appended after it.
    customer_note = (order.alteration_request_note or "").strip() or None
    notes_parts = [
        part
        for part in (
            f"Khách mô tả: {customer_note}" if customer_note else None,
            body.notes,
        )
        if part
    ]
    task_notes = "\n".join(notes_parts) or None

    task = TailorTaskDB(
        tenant_id=tenant_id,
        order_id=order.id,
        assigned_to=body.tailor_id,
        assigned_by=owner_id,
        garment_name=garment_name,
        customer_name=order.customer_name,
        status="assigned" if body.tailor_id else "unassigned",
        task_type="alteration",
        deadline=deadline,
        notes=task_notes,
    )
    db.add(task)
    await db.flush()

    # Reduced stage list keyed by task_type (AC3) — start_task recreates the
    # same list via _resolve_stage_key_for_task, so both paths agree.
    _create_stage_logs(db, task.id, tenant_id, "alteration", order.service_type)

    # Clear the pending marker + note together (the task's notes now carry the
    # description; resolve_cancellation_request copies it back if the task is
    # cancelled). updated_at intentionally untouched — see resolve_window_anchor.
    order.alteration_requested_at = None
    order.alteration_request_note = None

    await db.flush()
    await db.commit()

    # Notify the customer — plain Vietnamese (AC3)
    if order.customer_id:
        try:
            title, msg_tpl = ALTERATION_APPROVED_CUSTOMER
            await create_notification(
                db=db, user_id=order.customer_id, tenant_id=tenant_id,
                notification_type="alteration_approved",
                title=title,
                message=msg_tpl.format(garment_name=garment_name),
                data={"order_id": str(order.id), "task_id": str(task.id)},
            )
        except Exception:
            logger.warning(
                "Failed to notify customer about alteration approval for order %s",
                order.id,
            )

    # Notify the assigned tailor
    if body.tailor_id:
        try:
            title, msg_tpl = TASK_ASSIGNED_TAILOR
            await create_notification(
                db=db, user_id=body.tailor_id, tenant_id=tenant_id,
                notification_type="task_assigned",
                title=title,
                message=msg_tpl.format(garment_name=garment_name),
                data={"task_id": str(task.id), "order_id": str(order.id)},
            )
        except Exception:
            logger.warning(
                "Failed to notify tailor about alteration task %s", task.id
            )

    return _task_to_response(task, datetime.now(timezone.utc))
