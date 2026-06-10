"""Tailor Task service for production task management (Story 5.3, 5.2, 12.2).

All task status transitions and overdue calculations happen here
(Authoritative Server Pattern). Frontend only renders pre-calculated data.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import case, delete as sa_delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

import logging

from src.models.db_models import (
    OrderDB,
    OrderItemDB,
    TailorTaskDB,
    TaskHistoryDB,
    TaskStageLogDB,
    UserDB,
)
from src.models.tailor_task import (
    CancellationRequestInput,
    OrderInfoForTask,
    OwnerTaskItem,
    OwnerTaskListResponse,
    ProductionStepUpdateRequest,
    QCResultRequest,
    ResolveCancellationInput,
    StatusUpdateRequest,
    TaskAcceptRequest,
    TaskHoldRequest,
    TaskReassignRequest,
    TaskRejectRequest,
    TaskResumeRequest,
    TaskStartRequest,
    TaskStageLogResponse,
    TaskHistoryResponse,
    TailorIncomeResponse,
    TailorMatchingScore,
    TailorMonthlyIncome,
    TaskCreateRequest,
    TaskFilterParams,
    TaskUpdateRequest,
    TailorTaskDetailResponse,
    TailorTaskListResponse,
    TailorTaskResponse,
    TailorTaskSummary,
    IncomeDetailItem,
    TailorIncomeDetailResponse,
    IncomePeriod,
)
from src.services.notification_creator import (
    TAILOR_CANCEL_REQUEST_TO_OWNER,
    TAILOR_CANCEL_APPROVED,
    TAILOR_CANCEL_REJECTED,
    TAILOR_REASSIGNED,
    ORDER_UNDER_REVIEW,
    TASK_ASSIGNMENT_MESSAGE,
    TASK_CREATED_OWNER,
    TAILOR_ACCEPTED,
    TAILOR_REJECTED,
    TASK_ON_HOLD,
    TASK_RESUMED,
    TASK_SUBMITTED_QC,
    QC_PASSED,
    QC_FAILED_REWORK,
    TASK_REASSIGNED_OLD,
    TASK_REASSIGNED_NEW,
    CUSTOMER_QC_PASSED,
    ORDER_READY_SHIP_MESSAGE,
    ORDER_READY_PICKUP_MESSAGE,
    TASK_ASSIGNED_TAILOR,
    create_notification,
)

logger = logging.getLogger(__name__)

# ── 11-state machine transitions ────────────────────────────────────────────
_VALID_TRANSITIONS: dict[str, list[str]] = {
    "unassigned": ["assigned", "cancelled"],
    "assigned": ["accepted", "rejected", "reassigning", "cancelled"],
    "accepted": ["in_progress", "cancelled"],
    "rejected": ["unassigned"],
    "in_progress": ["on_hold", "submitted_for_qc", "reassigning", "cancelled"],
    "on_hold": ["in_progress", "reassigning", "cancelled"],
    "reassigning": ["unassigned"],
    "submitted_for_qc": ["completed", "failed_qc"],
    "completed": [],
    "cancelled": [],
    "failed_qc": ["in_progress", "reassigning", "cancelled"],
}

# Backward compat alias
VALID_TRANSITIONS = {"assigned": "in_progress", "in_progress": "completed"}

# Production sub-steps: forward-only transitions (deprecated, kept for backward compat)
PRODUCTION_STEPS = ["pending", "cutting", "sewing", "finishing", "quality_check", "done"]

# Stage definitions per garment type
GARMENT_STAGES: dict[str, list[str]] = {
    "default": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "finishing"],
    "ao_dai": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "finishing"],
    "wedding": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "beading", "finishing"],
}


def _resolve_stage_key(garment_name: str | None) -> str:
    if not garment_name:
        return "default"
    name_lower = garment_name.lower()
    if "wedding" in name_lower or "cưới" in name_lower or "cuoi" in name_lower:
        return "wedding"
    if "áo dài" in name_lower or "ao dai" in name_lower:
        return "ao_dai"
    return "default"


async def _transition_task(
    db: AsyncSession,
    task: TailorTaskDB,
    to_status: str,
    actor_id: uuid.UUID,
    actor_role: str,
    reason: str | None = None,
    metadata: dict | None = None,
) -> TailorTaskDB:
    """Core state machine transition with optimistic locking and audit trail.

    Every status change MUST go through this function.
    """
    from_status = task.status
    allowed = _VALID_TRANSITIONS.get(from_status, [])
    if to_status not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Chuyển trạng thái không hợp lệ: '{from_status}' → '{to_status}'. "
            f"Trạng thái hợp lệ: {allowed}",
        )

    now = datetime.now(timezone.utc)
    result = await db.execute(
        update(TailorTaskDB)
        .where(TailorTaskDB.id == task.id, TailorTaskDB.version == task.version)
        .values(status=to_status, version=task.version + 1, updated_at=now)
        .returning(TailorTaskDB.version)
    )
    row = result.first()
    if row is None:
        raise HTTPException(
            status_code=409,
            detail="Task was modified by another request. Please refresh and try again.",
        )

    history = TaskHistoryDB(
        task_id=task.id,
        tenant_id=task.tenant_id,
        actor_id=actor_id,
        actor_role=actor_role,
        action=f"{from_status}_to_{to_status}",
        from_status=from_status,
        to_status=to_status,
        reason=reason,
        extra_metadata=metadata,
    )
    db.add(history)

    task.status = to_status
    task.version = row.version
    task.updated_at = now
    return task


async def _get_task_for_transition(
    db: AsyncSession, task_id: uuid.UUID, tenant_id: uuid.UUID
) -> TailorTaskDB:
    result = await db.execute(
        select(TailorTaskDB).where(
            TailorTaskDB.id == task_id,
            TailorTaskDB.tenant_id == tenant_id,
        ).with_for_update()
    )
    task = result.scalar_one_or_none()
    if task is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy công việc")
    return task


def _check_client_version(task: TailorTaskDB, client_version: int | None) -> None:
    """Reject stale client requests (optimistic locking from client-known version)."""
    if client_version is not None and client_version != task.version:
        raise HTTPException(
            status_code=409,
            detail="Task was modified by another request. Please refresh and try again.",
        )


async def _get_owner_for_tenant(db: AsyncSession, tenant_id: uuid.UUID) -> uuid.UUID | None:
    result = await db.execute(
        select(UserDB.id).where(
            UserDB.tenant_id == tenant_id,
            UserDB.role == "Owner",
            UserDB.is_active == True,  # noqa: E712
        ).limit(1)
    )
    return result.scalar_one_or_none()


def _create_stage_logs(
    db: AsyncSession,
    task_id: uuid.UUID,
    tenant_id: uuid.UUID,
    garment_type: str | None = None,
) -> list[TaskStageLogDB]:
    stage_key = garment_type if garment_type in GARMENT_STAGES else "default"
    stages = GARMENT_STAGES[stage_key]
    now = datetime.now(timezone.utc)
    logs = []
    for i, stage_name in enumerate(stages):
        log = TaskStageLogDB(
            task_id=task_id,
            tenant_id=tenant_id,
            stage=stage_name,
            stage_order=i,
            status="in_progress" if i == 0 else "pending",
            started_at=now if i == 0 else None,
        )
        db.add(log)
        logs.append(log)
    return logs


# ── New workflow service functions (Story 12.2) ─────────────────────────────


async def accept_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    request: TaskAcceptRequest,
    client_version: int | None = None,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)
    _check_client_version(task, client_version)

    if task.status != "assigned":
        raise HTTPException(status_code=400, detail="Chỉ có thể nhận công việc khi trạng thái là 'assigned'")
    if task.assigned_to != actor_id:
        raise HTTPException(status_code=403, detail="Bạn không được giao công việc này")

    now = datetime.now(timezone.utc)
    await _transition_task(db, task, "accepted", actor_id, "Tailor")
    task.accepted_at = now
    if request.expected_finish_at:
        eft = request.expected_finish_at
        if eft.tzinfo is None:
            eft = eft.replace(tzinfo=timezone.utc)
        task.expected_finish_at = eft
    else:
        task.expected_finish_at = now + timedelta(days=7)

    # Transition bespoke order confirmed → in_production (same transaction)
    order_result = await db.execute(
        select(OrderDB).where(OrderDB.id == task.order_id).with_for_update()
    )
    order = order_result.scalar_one_or_none()
    if order and order.service_type == "bespoke" and order.status == "confirmed":
        order.status = "in_production"
        if order.preparation_step is None:
            order.preparation_step = "cutting"
        order.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()

    owner_id = await _get_owner_for_tenant(db, tenant_id)
    if owner_id:
        try:
            tailor = await db.get(UserDB, actor_id)
            tailor_name = tailor.full_name if tailor and tailor.full_name else "Thợ may"
            title, msg_tpl = TAILOR_ACCEPTED
            await create_notification(
                db=db, user_id=owner_id, tenant_id=tenant_id,
                notification_type="task_accepted",
                title=title,
                message=msg_tpl.format(tailor_name=tailor_name, garment_name=task.garment_name),
                data={"task_id": str(task.id), "order_id": str(task.order_id)},
            )
        except Exception:
            logger.warning("Failed to create notification for task acceptance %s", task.id)

    return _task_to_response(task, datetime.now(timezone.utc))


async def reject_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    request: TaskRejectRequest,
    client_version: int | None = None,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)
    _check_client_version(task, client_version)

    if task.status != "assigned":
        raise HTTPException(status_code=400, detail="Chỉ có thể từ chối công việc khi trạng thái là 'assigned'")
    if task.assigned_to != actor_id:
        raise HTTPException(status_code=403, detail="Bạn không được giao công việc này")

    await _transition_task(db, task, "rejected", actor_id, "Tailor", reason=request.rejection_reason)
    task.rejection_reason = request.rejection_reason
    task.rejection_category = request.rejection_category

    await _transition_task(db, task, "unassigned", actor_id, "Tailor", reason="Auto-unassign after rejection")
    task.assigned_to = None

    await db.flush()
    await db.commit()

    owner_id = await _get_owner_for_tenant(db, tenant_id)
    if owner_id:
        try:
            tailor = await db.get(UserDB, actor_id)
            tailor_name = tailor.full_name if tailor and tailor.full_name else "Thợ may"
            title, msg_tpl = TAILOR_REJECTED
            await create_notification(
                db=db, user_id=owner_id, tenant_id=tenant_id,
                notification_type="task_rejected",
                title=title,
                message=msg_tpl.format(
                    tailor_name=tailor_name,
                    garment_name=task.garment_name,
                    reason=request.rejection_reason[:100],
                ),
                data={"task_id": str(task.id), "order_id": str(task.order_id)},
            )
        except Exception:
            logger.warning("Failed to create notification for task rejection %s", task.id)

    return _task_to_response(task, datetime.now(timezone.utc))


async def start_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    request: TaskStartRequest,
    client_version: int | None = None,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)
    _check_client_version(task, client_version)

    if task.status != "accepted":
        raise HTTPException(status_code=400, detail="Chỉ có thể bắt đầu khi trạng thái là 'accepted'")
    if task.assigned_to != actor_id:
        raise HTTPException(status_code=403, detail="Chỉ thợ may được giao mới có thể thực hiện hành động này")

    now = datetime.now(timezone.utc)
    await _transition_task(db, task, "in_progress", actor_id, "Tailor")
    task.started_at = now
    if request.notes:
        task.notes = request.notes

    await db.execute(sa_delete(TaskStageLogDB).where(TaskStageLogDB.task_id == task_id))
    _create_stage_logs(db, task.id, tenant_id, _resolve_stage_key(task.garment_name))

    await db.flush()
    await db.commit()

    return _task_to_response(task, datetime.now(timezone.utc))


async def hold_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    request: TaskHoldRequest,
    client_version: int | None = None,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)
    _check_client_version(task, client_version)

    if task.status != "in_progress":
        raise HTTPException(status_code=400, detail="Chỉ có thể tạm dừng khi đang thực hiện")
    if task.assigned_to != actor_id:
        raise HTTPException(status_code=403, detail="Chỉ thợ may được giao mới có thể thực hiện hành động này")

    now = datetime.now(timezone.utc)
    await _transition_task(db, task, "on_hold", actor_id, "Tailor", reason=request.hold_reason)
    task.hold_reason = request.hold_reason
    task.on_hold_at = now

    await db.flush()
    await db.commit()

    owner_id = await _get_owner_for_tenant(db, tenant_id)
    if owner_id:
        try:
            title, msg_tpl = TASK_ON_HOLD
            await create_notification(
                db=db, user_id=owner_id, tenant_id=tenant_id,
                notification_type="task_on_hold",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name, reason=request.hold_reason[:100]),
                data={"task_id": str(task.id)},
            )
        except Exception:
            logger.warning("Failed to create notification for task hold %s", task.id)

    return _task_to_response(task, datetime.now(timezone.utc))


async def resume_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    request: TaskResumeRequest,
    client_version: int | None = None,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)
    _check_client_version(task, client_version)

    if task.status != "on_hold":
        raise HTTPException(status_code=400, detail="Chỉ có thể tiếp tục khi đang tạm dừng")
    if task.assigned_to != actor_id:
        raise HTTPException(status_code=403, detail="Chỉ thợ may được giao mới có thể thực hiện hành động này")

    now = datetime.now(timezone.utc)
    await _transition_task(db, task, "in_progress", actor_id, "Tailor")
    task.resumed_at = now

    if task.on_hold_at and task.expected_finish_at:
        hold_duration = now - task.on_hold_at
        task.expected_finish_at = task.expected_finish_at + hold_duration

    await db.flush()
    await db.commit()

    owner_id = await _get_owner_for_tenant(db, tenant_id)
    if owner_id:
        try:
            title, msg_tpl = TASK_RESUMED
            await create_notification(
                db=db, user_id=owner_id, tenant_id=tenant_id,
                notification_type="task_resumed",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name),
                data={"task_id": str(task.id)},
            )
        except Exception:
            logger.warning("Failed to create notification for task resume %s", task.id)

    return _task_to_response(task, datetime.now(timezone.utc))


async def submit_for_qc(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    client_version: int | None = None,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)
    _check_client_version(task, client_version)

    if task.status != "in_progress":
        raise HTTPException(status_code=400, detail="Chỉ có thể gửi kiểm tra khi đang thực hiện")
    if task.assigned_to != actor_id:
        raise HTTPException(status_code=403, detail="Chỉ thợ may được giao mới có thể thực hiện hành động này")

    # Validate all stages completed (skipped stages do not block submission)
    stage_result = await db.execute(
        select(TaskStageLogDB).where(
            TaskStageLogDB.task_id == task_id,
            TaskStageLogDB.tenant_id == tenant_id,
        )
    )
    stages = stage_result.scalars().all()
    if not stages:
        logger.warning("Task %s submitted for QC with no stage logs (legacy path?)", task_id)
    if stages:
        incomplete = [s for s in stages if s.status not in ("completed", "skipped")]
        if incomplete:
            raise HTTPException(
                status_code=400,
                detail=f"Còn {len(incomplete)} bước chưa hoàn thành. Hoàn tất tất cả bước trước khi gửi kiểm tra.",
            )

    now = datetime.now(timezone.utc)
    await _transition_task(db, task, "submitted_for_qc", actor_id, "Tailor")
    task.submitted_at = now

    await db.flush()
    await db.commit()

    owner_id = await _get_owner_for_tenant(db, tenant_id)
    if owner_id:
        try:
            title, msg_tpl = TASK_SUBMITTED_QC
            await create_notification(
                db=db, user_id=owner_id, tenant_id=tenant_id,
                notification_type="task_submitted_qc",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name),
                data={"task_id": str(task.id)},
            )
        except Exception:
            logger.warning("Failed to create notification for QC submission %s", task.id)

    return _task_to_response(task, datetime.now(timezone.utc))


async def process_qc_result(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    request: QCResultRequest,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)

    if task.status not in ("submitted_for_qc", "failed_qc"):
        raise HTTPException(status_code=400, detail="Chỉ có thể xử lý QC khi trạng thái là 'submitted_for_qc' hoặc 'failed_qc'")

    already_failed = task.status == "failed_qc"
    now = datetime.now(timezone.utc)

    if request.result == "pass":
        if already_failed:
            raise HTTPException(status_code=400, detail="Không thể đánh dấu đạt khi đã không đạt QC. Hãy giao sửa lại hoặc chuyển thợ.")
        await _transition_task(db, task, "completed", actor_id, "Owner")
        task.completed_at = now

        order_result = await db.execute(
            select(OrderDB).where(OrderDB.id == task.order_id).with_for_update()
        )
        order = order_result.scalar_one_or_none()
        order_transitioned = False
        if order and order.service_type == "bespoke" and order.status == "in_production":
            from src.services.order_service import _all_tailor_tasks_completed
            if await _all_tailor_tasks_completed(db, task.order_id):
                order.status = "ready_for_pickup" if order.pickup_date else "ready_to_ship"
                order.updated_at = datetime.now(timezone.utc)
                order_transitioned = True

        customer_id = order.customer_id if order else None
        order_code = f"ORD-{order.created_at.strftime('%Y%m%d')}-{str(order.id).replace('-', '').upper()[:6]}" if order else None

        await db.flush()
        await db.commit()

        # Notify customer — QC passed
        if customer_id:
            try:
                title, msg_tpl = CUSTOMER_QC_PASSED
                await create_notification(
                    db=db, user_id=customer_id, tenant_id=tenant_id,
                    notification_type="qc_passed",
                    title=title,
                    message=msg_tpl.format(garment_name=task.garment_name),
                    data={"task_id": str(task.id), "order_id": str(task.order_id)},
                )
            except Exception:
                logger.warning("Failed to notify customer about QC pass %s", task.id)

        # Notify customer — order ready for ship/pickup
        if order_transitioned and customer_id and order_code:
            try:
                ready_msg = ORDER_READY_PICKUP_MESSAGE if order.pickup_date else ORDER_READY_SHIP_MESSAGE
                r_title, r_tpl = ready_msg
                await create_notification(
                    db=db, user_id=customer_id, tenant_id=tenant_id,
                    notification_type="order_status",
                    title=r_title,
                    message=r_tpl.format(order_code=order_code),
                    data={"order_id": str(order.id)},
                )
            except Exception:
                logger.warning("Failed to notify customer about order ready %s", task.order_id)

    elif request.action_on_fail == "rework":
        if not already_failed:
            await _transition_task(db, task, "failed_qc", actor_id, "Owner", reason=request.qc_issues)
        await _transition_task(db, task, "in_progress", actor_id, "Owner", reason="Rework after QC failure")
        task.is_rework = True
        task.rework_count += 1
        task.qc_issues = request.qc_issues

        # Reset stage logs for rework cycle
        await db.execute(sa_delete(TaskStageLogDB).where(TaskStageLogDB.task_id == task_id))
        _create_stage_logs(db, task_id, tenant_id, _resolve_stage_key(task.garment_name))

        await db.flush()
        await db.commit()

        if task.assigned_to:
            try:
                title, msg_tpl = QC_FAILED_REWORK
                await create_notification(
                    db=db, user_id=task.assigned_to, tenant_id=tenant_id,
                    notification_type="qc_failed_rework",
                    title=title,
                    message=msg_tpl.format(garment_name=task.garment_name, qc_issues=request.qc_issues[:100]),
                    data={"task_id": str(task.id)},
                )
            except Exception:
                logger.warning("Failed to notify tailor about QC rework %s", task.id)

    elif request.action_on_fail == "reassign":
        old_tailor_id = task.assigned_to
        if not already_failed:
            await _transition_task(db, task, "failed_qc", actor_id, "Owner", reason=request.qc_issues)
        await _transition_task(db, task, "reassigning", actor_id, "Owner", reason="Reassign after QC failure")
        await _transition_task(db, task, "unassigned", actor_id, "Owner")
        task.assigned_to = None
        task.qc_issues = request.qc_issues

        await db.flush()
        await db.commit()

        if old_tailor_id:
            try:
                title, msg_tpl = TASK_REASSIGNED_OLD
                await create_notification(
                    db=db, user_id=old_tailor_id, tenant_id=tenant_id,
                    notification_type="task_reassigned",
                    title=title,
                    message=msg_tpl.format(garment_name=task.garment_name),
                    data={"task_id": str(task.id)},
                )
            except Exception:
                logger.warning("Failed to notify old tailor about reassign %s", task.id)

    elif request.action_on_fail == "fail":
        if already_failed:
            await _transition_task(db, task, "cancelled", actor_id, "Owner", reason=request.qc_issues or "Hỏng vĩnh viễn")
        else:
            await _transition_task(db, task, "failed_qc", actor_id, "Owner", reason=request.qc_issues)
        task.qc_issues = request.qc_issues

        await db.flush()
        await db.commit()

    return _task_to_response(task, datetime.now(timezone.utc))


async def reassign_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    request: TaskReassignRequest,
) -> TailorTaskResponse:
    task = await _get_task_for_transition(db, task_id, tenant_id)

    reassignable = ["assigned", "in_progress", "on_hold", "failed_qc", "unassigned"]
    if task.status not in reassignable:
        raise HTTPException(
            status_code=400,
            detail=f"Không thể giao lại khi trạng thái là '{task.status}'. Cho phép: {reassignable}",
        )

    new_tailor = await db.get(UserDB, request.new_tailor_id)
    if not new_tailor:
        raise HTTPException(status_code=400, detail="Không tìm thấy thợ may mới")
    if new_tailor.role != "Tailor":
        raise HTTPException(status_code=400, detail="Người được giao phải có vai trò Thợ may")
    if not new_tailor.is_active:
        raise HTTPException(status_code=400, detail="Tài khoản thợ may đã bị vô hiệu hóa")
    if new_tailor.tenant_id != tenant_id:
        raise HTTPException(status_code=403, detail="Thợ may không thuộc cùng cơ sở")
    if task.assigned_to and new_tailor.id == task.assigned_to:
        raise HTTPException(status_code=400, detail="Không thể giao lại cho cùng thợ may")

    old_tailor_id = task.assigned_to
    meta = {"old_tailor_id": str(old_tailor_id) if old_tailor_id else None, "new_tailor_id": str(request.new_tailor_id)}

    now = datetime.now(timezone.utc)
    if task.status == "unassigned":
        await _transition_task(db, task, "assigned", actor_id, "Owner", reason=request.reassignment_reason, metadata=meta)
    else:
        await _transition_task(db, task, "reassigning", actor_id, "Owner", reason=request.reassignment_reason, metadata=meta)
        await _transition_task(db, task, "unassigned", actor_id, "Owner")
        await _transition_task(db, task, "assigned", actor_id, "Owner")

    task.assigned_to = request.new_tailor_id
    task.reassignment_reason = request.reassignment_reason
    task.assignment_deadline_at = now + timedelta(hours=4)

    await db.flush()
    await db.commit()

    if old_tailor_id:
        try:
            title, msg_tpl = TASK_REASSIGNED_OLD
            await create_notification(
                db=db, user_id=old_tailor_id, tenant_id=tenant_id,
                notification_type="task_reassigned",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name),
                data={"task_id": str(task.id)},
            )
        except Exception:
            logger.warning("Failed to notify old tailor about reassign %s", task.id)

    try:
        title, msg_tpl = TASK_REASSIGNED_NEW
        await create_notification(
            db=db, user_id=request.new_tailor_id, tenant_id=tenant_id,
            notification_type="task_assigned",
            title=title,
            message=msg_tpl.format(garment_name=task.garment_name),
            data={"task_id": str(task.id)},
        )
    except Exception:
        logger.warning("Failed to notify new tailor about reassign %s", task.id)

    return _task_to_response(task, datetime.now(timezone.utc))


async def complete_stage(
    db: AsyncSession,
    task_id: uuid.UUID,
    stage_order: int,
    actor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    client_version: int | None = None,
    notes: str | None = None,
) -> dict:
    task = await _get_task_for_transition(db, task_id, tenant_id)
    _check_client_version(task, client_version)

    if task.status != "in_progress":
        raise HTTPException(status_code=400, detail="Chỉ có thể hoàn thành bước khi đang thực hiện")

    result = await db.execute(
        select(TaskStageLogDB)
        .where(TaskStageLogDB.task_id == task_id, TaskStageLogDB.tenant_id == tenant_id)
        .order_by(TaskStageLogDB.stage_order)
    )
    stages = result.scalars().all()

    if not stages:
        raise HTTPException(status_code=400, detail="Không tìm thấy bước sản xuất cho công việc này")

    current_in_progress = next((s for s in stages if s.status == "in_progress"), None)
    if current_in_progress is None:
        raise HTTPException(status_code=400, detail="Không có bước nào đang thực hiện")
    if current_in_progress.stage_order != stage_order:
        raise HTTPException(
            status_code=400,
            detail=f"Phải hoàn thành bước {current_in_progress.stage_order} ('{current_in_progress.stage}') trước",
        )

    now = datetime.now(timezone.utc)
    current_in_progress.status = "completed"
    current_in_progress.completed_at = now
    current_in_progress.updated_at = now
    if notes:
        current_in_progress.notes = notes

    next_stage = next((s for s in stages if s.stage_order > stage_order and s.status == "pending"), None)
    if next_stage:
        next_stage.status = "in_progress"
        next_stage.started_at = now
        next_stage.updated_at = now

    completed_count = sum(1 for s in stages if s.status == "completed" or s.id == current_in_progress.id)
    total_count = len(stages)
    progress_percent = round((completed_count / total_count) * 100, 1) if total_count > 0 else 0

    await db.flush()
    await db.commit()

    return {
        "task_id": str(task_id),
        "stage_completed": current_in_progress.stage,
        "stage_order": stage_order,
        "next_stage": next_stage.stage if next_stage else None,
        "progress_percent": progress_percent,
        "total_stages": total_count,
        "completed_stages": completed_count,
    }


async def get_matching_scores(
    db: AsyncSession,
    order_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> list[TailorMatchingScore]:
    order = await db.execute(
        select(OrderDB).where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
    )
    if order.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Không tìm thấy đơn hàng")

    result = await db.execute(
        select(UserDB).where(
            UserDB.tenant_id == tenant_id,
            UserDB.role == "Tailor",
            UserDB.is_active == True,  # noqa: E712
        )
    )
    tailors = result.scalars().all()
    if not tailors:
        return []

    tailor_ids = [t.id for t in tailors]
    now = datetime.now(timezone.utc)
    ninety_days_ago = now - timedelta(days=90)

    # Batch workload query
    workload_result = await db.execute(
        select(
            TailorTaskDB.assigned_to,
            func.count(TailorTaskDB.id).label("active_count"),
        ).where(
            TailorTaskDB.assigned_to.in_(tailor_ids),
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.status.in_(["assigned", "accepted", "in_progress", "on_hold"]),
        ).group_by(TailorTaskDB.assigned_to)
    )
    workload_map = {row.assigned_to: row.active_count for row in workload_result}

    # Batch on-time query
    ontime_result = await db.execute(
        select(
            TailorTaskDB.assigned_to,
            func.count(TailorTaskDB.id).label("total"),
            func.count(TailorTaskDB.id).filter(
                TailorTaskDB.completed_at <= TailorTaskDB.deadline
            ).label("on_time"),
        ).where(
            TailorTaskDB.assigned_to.in_(tailor_ids),
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.status == "completed",
            TailorTaskDB.completed_at >= ninety_days_ago,
            TailorTaskDB.deadline.isnot(None),
        ).group_by(TailorTaskDB.assigned_to)
    )
    ontime_map = {row.assigned_to: (row.total, row.on_time) for row in ontime_result}

    scores = []
    for tailor in tailors:
        active_tasks = workload_map.get(tailor.id, 0)
        workload_score = max(0.0, 1.0 - (active_tasks / 5.0))

        total, on_time = ontime_map.get(tailor.id, (0, 0))
        on_time_rate = (on_time / total) if total > 0 else 1.0

        specialty_match = True
        overall_score = workload_score * 0.5 + on_time_rate * 0.3 + (1.0 if specialty_match else 0.0) * 0.2

        reasons = []
        if workload_score >= 0.8:
            reasons.append("Ít việc đang làm")
        elif workload_score <= 0.2:
            reasons.append("Đang bận nhiều việc")
        if on_time_rate >= 0.9:
            reasons.append("Tỉ lệ đúng hạn cao")
        if specialty_match:
            reasons.append("Phù hợp chuyên môn")

        scores.append(TailorMatchingScore(
            tailor_id=str(tailor.id),
            tailor_name=tailor.full_name or tailor.email,
            score=round(overall_score * 100, 1),
            workload_score=round(workload_score, 3),
            specialty_match=specialty_match,
            on_time_rate=round(on_time_rate, 3),
            reasons=reasons,
        ))

    scores.sort(key=lambda s: s.score, reverse=True)
    return scores


async def get_task_history(
    db: AsyncSession,
    task_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> list[TaskHistoryResponse]:
    result = await db.execute(
        select(TaskHistoryDB)
        .where(TaskHistoryDB.task_id == task_id, TaskHistoryDB.tenant_id == tenant_id)
        .order_by(TaskHistoryDB.created_at.asc())
    )
    records = result.scalars().all()
    return [
        TaskHistoryResponse(
            id=str(r.id),
            task_id=str(r.task_id),
            actor_id=str(r.actor_id) if r.actor_id else None,
            actor_role=r.actor_role,
            action=r.action,
            from_status=r.from_status,
            to_status=r.to_status,
            reason=r.reason,
            metadata=r.extra_metadata,
            created_at=r.created_at.isoformat(),
        )
        for r in records
    ]


def _task_to_response(task: TailorTaskDB, now: datetime) -> TailorTaskResponse:
    """Convert DB model to response with overdue calculation.

    Overdue = deadline has passed AND task not completed (SSOT definition).
    """
    is_overdue = False
    days_until_deadline = None

    if task.deadline and task.status != "completed":
        # Ensure both datetimes have matching timezone awareness
        deadline = task.deadline
        compare_now = now
        if deadline.tzinfo is None and compare_now.tzinfo is not None:
            compare_now = compare_now.replace(tzinfo=None)
        elif deadline.tzinfo is not None and compare_now.tzinfo is None:
            deadline = deadline.replace(tzinfo=None)
        delta = deadline - compare_now
        days_until_deadline = delta.days
        if days_until_deadline < 0:
            is_overdue = True  # Deadline has passed

    return TailorTaskResponse(
        id=str(task.id),
        tenant_id=str(task.tenant_id),
        order_id=str(task.order_id),
        order_item_id=str(task.order_item_id) if task.order_item_id else None,
        assigned_to=str(task.assigned_to) if task.assigned_to else None,
        assigned_by=str(task.assigned_by),
        garment_name=task.garment_name,
        customer_name=task.customer_name,
        status=task.status,
        production_step=task.production_step,
        deadline=task.deadline.isoformat() if task.deadline else None,
        notes=task.notes,
        piece_rate=float(task.piece_rate) if task.piece_rate else None,
        design_id=str(task.design_id) if task.design_id else None,
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
        failure_reason=task.failure_reason,
        failure_category=task.failure_category,
        cancellation_resolved_at=task.cancellation_resolved_at.isoformat() if task.cancellation_resolved_at else None,
        version=task.version,
        accepted_at=task.accepted_at.isoformat() if task.accepted_at else None,
        started_at=task.started_at.isoformat() if task.started_at else None,
        submitted_at=task.submitted_at.isoformat() if task.submitted_at else None,
        hold_reason=task.hold_reason,
        on_hold_at=task.on_hold_at.isoformat() if task.on_hold_at else None,
        resumed_at=task.resumed_at.isoformat() if task.resumed_at else None,
        assignment_deadline_at=task.assignment_deadline_at.isoformat() if task.assignment_deadline_at else None,
        expected_finish_at=task.expected_finish_at.isoformat() if task.expected_finish_at else None,
        is_rework=task.is_rework,
        rework_count=task.rework_count,
        qc_issues=task.qc_issues,
        rejection_reason=task.rejection_reason,
        rejection_category=task.rejection_category,
        reassignment_reason=task.reassignment_reason,
        priority=task.priority,
        is_overdue=is_overdue,
        days_until_deadline=days_until_deadline,
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
    )


async def get_my_tasks(
    db: AsyncSession,
    tailor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    filters: TaskFilterParams | None = None,
) -> TailorTaskListResponse:
    """Get all tasks assigned to a tailor with summary counts.

    Tasks sorted by: status priority (assigned > in_progress > completed > cancelled),
    then deadline ASC (urgent first).
    
    Supports filtering by:
    - status: comma-separated list (e.g., "assigned,in_progress")
    - date_from/date_to: filter by deadline range
    - month/year: filter by deadline month/year
    """
    now = datetime.now(timezone.utc)

    # Status priority ordering: assigned=1, in_progress=2, completed=3, cancelled=4
    status_order = case(
        (TailorTaskDB.status == "assigned", 1),
        (TailorTaskDB.status == "in_progress", 2),
        (TailorTaskDB.status == "completed", 3),
        (TailorTaskDB.status == "cancelled", 4),
        else_=5,
    )

    # Build base query
    query = select(TailorTaskDB).where(
        TailorTaskDB.tenant_id == tenant_id,
        TailorTaskDB.assigned_to == tailor_id,
    )

    # Apply filters if provided
    if filters:
        # Status filter
        if filters.status:
            status_list = [s.strip() for s in filters.status.split(",")]
            query = query.where(TailorTaskDB.status.in_(status_list))

        # Date range filter
        if filters.date_from:
            query = query.where(TailorTaskDB.deadline >= filters.date_from)
        if filters.date_to:
            query = query.where(TailorTaskDB.deadline <= filters.date_to)

        # Month/Year filter
        if filters.month:
            query = query.where(func.extract("month", TailorTaskDB.deadline) == filters.month)
        if filters.year:
            query = query.where(func.extract("year", TailorTaskDB.deadline) == filters.year)

    query = query.order_by(status_order, TailorTaskDB.deadline.asc().nulls_last())

    result = await db.execute(query)
    tasks = result.scalars().all()

    task_responses = [_task_to_response(t, now) for t in tasks]

    # Calculate summary
    summary = TailorTaskSummary(
        total=len(tasks),
        assigned=sum(1 for t in tasks if t.status == "assigned"),
        in_progress=sum(1 for t in tasks if t.status == "in_progress"),
        completed=sum(1 for t in tasks if t.status == "completed"),
        cancelled=sum(1 for t in tasks if t.status == "cancelled"),
        cancellation_requested=sum(1 for t in tasks if t.status == "cancellation_requested"),
        overdue=sum(1 for t in task_responses if t.is_overdue),
    )

    return TailorTaskListResponse(tasks=task_responses, summary=summary)


async def get_task_summary(
    db: AsyncSession, tailor_id: uuid.UUID, tenant_id: uuid.UUID
) -> TailorTaskSummary:
    """Get task count summary by status."""
    now = datetime.now(timezone.utc)

    query = (
        select(
            func.count().label("total"),
            func.count().filter(TailorTaskDB.status == "assigned").label("assigned"),
            func.count().filter(TailorTaskDB.status == "in_progress").label("in_progress"),
            func.count().filter(TailorTaskDB.status == "completed").label("completed"),
            func.count().filter(TailorTaskDB.status == "cancelled").label("cancelled"),
            func.count().filter(TailorTaskDB.status == "cancellation_requested").label("cancellation_requested"),
            func.count().filter(
                TailorTaskDB.deadline < now,
                TailorTaskDB.status != "completed",
                TailorTaskDB.status != "cancelled",
            ).label("overdue"),
        )
        .where(
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.assigned_to == tailor_id,
        )
    )

    result = (await db.execute(query)).one()

    return TailorTaskSummary(
        total=result.total,
        assigned=result.assigned,
        in_progress=result.in_progress,
        completed=result.completed,
        cancelled=result.cancelled,
        cancellation_requested=result.cancellation_requested,
        overdue=result.overdue,
    )


async def update_task_status(
    db: AsyncSession,
    task_id: uuid.UUID,
    request: StatusUpdateRequest,
    tailor_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> TailorTaskResponse:
    """Update task status with validation (backward compat via _transition_task).

    Kept for PATCH /{task_id}/status backward compatibility.
    Supports: assigned→in_progress, in_progress→completed.
    """
    # Use legacy-style error raising for backward compatibility
    query = select(TailorTaskDB).where(
        TailorTaskDB.id == task_id,
        TailorTaskDB.tenant_id == tenant_id,
    ).with_for_update()
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if task is None:
        raise ValueError("Không tìm thấy công việc")
    if task.assigned_to != tailor_id:
        raise PermissionError("Bạn không có quyền cập nhật công việc này")

    expected_next = VALID_TRANSITIONS.get(task.status)
    if expected_next is None:
        raise ValueError(f"Không thể thay đổi trạng thái từ '{task.status}'")

    if request.status != expected_next:
        raise ValueError(
            f"Chuyển trạng thái không hợp lệ: '{task.status}' → '{request.status}'. "
            f"Trạng thái tiếp theo phải là '{expected_next}'"
        )

    # Backward compat: chain through intermediate states for legacy transitions
    if task.status == "assigned" and request.status == "in_progress":
        await _transition_task(db, task, "accepted", tailor_id, "Tailor", reason="auto-accept via legacy endpoint")
        task.accepted_at = datetime.now(timezone.utc)
        await _transition_task(db, task, "in_progress", tailor_id, "Tailor", reason="auto-start via legacy endpoint")
        task.started_at = datetime.now(timezone.utc)
    elif task.status == "in_progress" and request.status == "completed":
        await _transition_task(db, task, "submitted_for_qc", tailor_id, "Tailor", reason="auto-submit via legacy endpoint")
        task.submitted_at = datetime.now(timezone.utc)
        await _transition_task(db, task, "completed", tailor_id, "Tailor", reason="auto-complete via legacy endpoint")
    else:
        await _transition_task(db, task, request.status, tailor_id, "Tailor")

    if request.status == "completed":
        task.completed_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()

    now = datetime.now(timezone.utc)
    return _task_to_response(task, now)


async def update_production_step(
    db: AsyncSession,
    task_id: uuid.UUID,
    request: ProductionStepUpdateRequest,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> TailorTaskResponse:
    """Update production sub-step with forward-only validation.

    Enforces:
    - Multi-tenant isolation
    - Ownership: assigned tailor or owner can update
    - Forward-only: new step index must be greater than current
    - Auto-transitions: step past 'pending' → status 'in_progress';
      step 'done' → status 'completed' + completed_at
    """
    query = select(TailorTaskDB).where(
        TailorTaskDB.id == task_id,
        TailorTaskDB.tenant_id == tenant_id,
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if task is None:
        raise ValueError("Không tìm thấy công việc")

    # Ownership check: only assigned tailor or owner (assigned_by) can update
    if user_id != task.assigned_to and user_id != task.assigned_by:
        raise PermissionError("Bạn không có quyền cập nhật bước sản xuất của công việc này")

    if task.production_step not in PRODUCTION_STEPS:
        raise ValueError(
            f"Bước sản xuất hiện tại '{task.production_step}' không hợp lệ. "
            f"Vui lòng liên hệ quản trị viên."
        )

    current_index = PRODUCTION_STEPS.index(task.production_step)
    new_index = PRODUCTION_STEPS.index(request.production_step)

    if new_index <= current_index:
        raise ValueError(
            f"Chuyển bước không hợp lệ: '{task.production_step}' → '{request.production_step}'. "
            f"Chỉ được chuyển tiếp, không được quay lại."
        )

    task.production_step = request.production_step
    task.updated_at = datetime.now(timezone.utc)

    # Auto-transition status: step past 'pending' → in_progress
    if task.status == "assigned" and request.production_step != "pending":
        task.status = "in_progress"

    # Auto-completion: step 'done' → completed
    if request.production_step == "done":
        task.status = "completed"
        task.completed_at = datetime.now(timezone.utc)

    await db.flush()

    now = datetime.now(timezone.utc)
    return _task_to_response(task, now)


async def get_task_detail(
    db: AsyncSession, task_id: uuid.UUID, tailor_id: uuid.UUID, tenant_id: uuid.UUID
) -> TailorTaskDetailResponse:
    """Get full task detail with order info.

    Loads related order data to provide complete context for task execution.
    """
    query = select(TailorTaskDB).options(joinedload(TailorTaskDB.order)).where(TailorTaskDB.id == task_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if task is None:
        raise ValueError("Không tìm thấy công việc")

    if task.tenant_id != tenant_id:
        raise PermissionError("Công việc này không thuộc về hộp kinh doanh của bạn")

    if task.assigned_to != tailor_id:
        raise PermissionError("Bạn không có quyền xem công việc này")

    now = datetime.now(timezone.utc)
    base_response = _task_to_response(task, now)

    # Build order info from related order
    order_info = None
    if task.order:
        order_info = OrderInfoForTask(
            order_id=str(task.order.id),
            status=task.order.status,
            payment_status=task.order.payment_status,
            total_amount=float(task.order.total_amount),
            customer_name=task.order.customer_name,
            customer_phone=task.order.customer_phone,
            shipping_address=task.order.shipping_address,
            shipping_note=task.order.shipping_note,
            pattern_session_id=(
                str(task.order.pattern_session_id)
                if task.order.pattern_session_id is not None
                else None
            ),
        )

    # Load production stage logs (ordered by stage_order)
    stage_result = await db.execute(
        select(TaskStageLogDB)
        .where(TaskStageLogDB.task_id == task_id, TaskStageLogDB.tenant_id == tenant_id)
        .order_by(TaskStageLogDB.stage_order)
    )
    stage_logs = [
        TaskStageLogResponse(
            id=str(s.id),
            task_id=str(s.task_id),
            stage=s.stage,
            stage_order=s.stage_order,
            status=s.status,
            started_at=s.started_at.isoformat() if s.started_at else None,
            completed_at=s.completed_at.isoformat() if s.completed_at else None,
            notes=s.notes,
            created_at=s.created_at.isoformat(),
        )
        for s in stage_result.scalars().all()
    ]

    # Load status transition history (audit trail)
    history = await get_task_history(db, task_id, tenant_id)

    # Extend base response with order info, stage logs, and history
    detail_response_data = base_response.model_dump(mode="json")
    detail_response_data["order_info"] = order_info.model_dump(mode="json") if order_info else None
    detail_response_data["stage_logs"] = [s.model_dump(mode="json") for s in stage_logs]
    detail_response_data["history"] = [h.model_dump(mode="json") for h in history]
    return TailorTaskDetailResponse(**detail_response_data)


# ── Story 5.2: Owner Task Management ──────────────────────────────────────────


def _task_to_owner_item(task: TailorTaskDB, now: datetime) -> OwnerTaskItem:
    """Convert DB model to Owner task item with assignee name."""
    base = _task_to_response(task, now)
    assignee_name = ""
    if task.assignee:
        assignee_name = task.assignee.full_name or task.assignee.email
    data = base.model_dump(mode="json")
    data["assignee_name"] = assignee_name
    return OwnerTaskItem(**data)


async def create_task(
    db: AsyncSession,
    request: TaskCreateRequest,
    owner_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> OwnerTaskItem:
    """Create a new tailor task (Owner assigns work).

    Validates:
    - Order exists and belongs to tenant
    - Order status is 'confirmed', 'in_progress', or 'preparing'
    - Assigned tailor exists, is active, role=Tailor, same tenant
    Auto-populates garment_name and customer_name from order.
    """
    # Validate order
    order_query = select(OrderDB).where(OrderDB.id == request.order_id)
    order_result = await db.execute(order_query)
    order = order_result.scalar_one_or_none()

    if order is None:
        raise ValueError("Không tìm thấy đơn hàng")
    if order.tenant_id != tenant_id:
        raise PermissionError("Đơn hàng này không thuộc về cơ sở của bạn")
    if order.status not in ("confirmed", "in_progress", "preparing"):
        raise ValueError(
            f"Chỉ có thể giao việc cho đơn hàng đã xác nhận hoặc đang sản xuất. "
            f"Trạng thái hiện tại: '{order.status}'"
        )

    # Check: one order can only have one active task (excludes cancelled/cancellation_requested)
    existing_task_result = await db.execute(
        select(func.count(TailorTaskDB.id)).where(
            TailorTaskDB.order_id == request.order_id,
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.status.not_in(["cancelled", "cancellation_requested", "unassigned", "rejected"]),
        )
    )
    if existing_task_result.scalar_one() > 0:
        raise ValueError("Đơn hàng này đã được giao cho thợ may rồi")

    # Validate assigned tailor
    tailor_query = select(UserDB).where(UserDB.id == request.assigned_to)
    tailor_result = await db.execute(tailor_query)
    tailor = tailor_result.scalar_one_or_none()

    if tailor is None:
        raise ValueError("Không tìm thấy thợ may")
    if tailor.role != "Tailor":
        raise ValueError("Người được giao phải có vai trò Thợ may")
    if not tailor.is_active:
        raise ValueError("Tài khoản thợ may đã bị vô hiệu hóa")
    if tailor.tenant_id != tenant_id:
        raise PermissionError("Thợ may không thuộc cùng cơ sở")

    # Auto-populate garment_name from order item or fallback
    garment_name = request.garment_name
    if not garment_name:
        if request.order_item_id:
            item_query = (
                select(OrderItemDB)
                .options(joinedload(OrderItemDB.garment))
                .where(OrderItemDB.id == request.order_item_id)
            )
            item_result = await db.execute(item_query)
            item = item_result.scalar_one_or_none()
            if item and item.garment:
                garment_name = item.garment.name
        if not garment_name:
            # Fallback: get first item's garment name
            items_query = (
                select(OrderItemDB)
                .options(joinedload(OrderItemDB.garment))
                .where(OrderItemDB.order_id == order.id)
                .limit(1)
            )
            items_result = await db.execute(items_query)
            first_item = items_result.scalar_one_or_none()
            if first_item and first_item.garment:
                garment_name = first_item.garment.name
            else:
                garment_name = "Áo dài"

    customer_name = request.customer_name or order.customer_name

    new_task = TailorTaskDB(
        tenant_id=tenant_id,
        order_id=request.order_id,
        order_item_id=request.order_item_id,
        assigned_to=request.assigned_to,
        assigned_by=owner_id,
        garment_name=garment_name,
        customer_name=customer_name,
        status="assigned",
        deadline=request.deadline,
        notes=request.notes,
        piece_rate=Decimal(str(request.piece_rate)) if request.piece_rate is not None else None,
    )

    db.add(new_task)
    await db.flush()

    # Auto-transition order status: confirmed → in_progress
    if order.status == "confirmed":
        order.status = "in_progress"
        order.updated_at = datetime.now(timezone.utc)

    # Reload with assignee relationship
    reload_query = (
        select(TailorTaskDB)
        .options(joinedload(TailorTaskDB.assignee))
        .where(TailorTaskDB.id == new_task.id)
    )
    reload_result = await db.execute(reload_query)
    task = reload_result.scalar_one()

    await db.commit()

    now = datetime.now(timezone.utc)
    return _task_to_owner_item(task, now)


async def _create_task_no_commit(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    order: OrderDB,
    assigned_to: uuid.UUID,
    assigned_by: uuid.UUID,
    garment_name: str,
    customer_name: str,
    deadline: datetime | None = None,
    notes: str | None = None,
    piece_rate: Decimal | None = None,
    order_item_id: uuid.UUID | None = None,
) -> TailorTaskDB:
    """Internal helper: create a TailorTask and flush (no commit).

    Used by resolve_cancellation_request for atomic reassign.
    """
    new_task = TailorTaskDB(
        tenant_id=tenant_id,
        order_id=order.id,
        order_item_id=order_item_id,
        assigned_to=assigned_to,
        assigned_by=assigned_by,
        garment_name=garment_name,
        customer_name=customer_name,
        status="assigned",
        deadline=deadline,
        notes=notes,
        piece_rate=piece_rate,
    )
    db.add(new_task)
    await db.flush()
    return new_task


# ── Tailor cancellation request + Owner resolve ──────────────────────────────


def _build_order_code(order: OrderDB) -> str:
    date_part = order.created_at.strftime("%Y%m%d")
    uid_part = str(order.id).replace("-", "").upper()[:6]
    return f"ORD-{date_part}-{uid_part}"


async def request_task_cancellation(
    db: AsyncSession,
    task_id: uuid.UUID,
    user_id: uuid.UUID,
    tenant_id: uuid.UUID,
    input_data: CancellationRequestInput,
) -> TailorTaskResponse:
    """Tailor requests cancellation with structured reason. Does NOT cancel order."""
    task = await db.get(TailorTaskDB, task_id)
    if not task or task.tenant_id != tenant_id:
        raise ValueError("Không tìm thấy công việc")
    if task.assigned_to != user_id:
        raise PermissionError("Bạn không được giao công việc này")
    if task.status not in ("assigned", "in_progress"):
        raise ValueError("Chỉ có thể yêu cầu huỷ khi công việc đang thực hiện hoặc chờ nhận")

    task.status = "cancellation_requested"
    task.failure_reason = input_data.failure_reason
    task.failure_category = input_data.failure_category
    task.updated_at = datetime.now(timezone.utc)

    await db.flush()

    # Load relationships for notifications
    order = await db.get(OrderDB, task.order_id)
    tailor = await db.get(UserDB, task.assigned_to)
    tailor_name = tailor.full_name if tailor else "Thợ may"

    await db.commit()

    # Notify owner
    if order:
        owner_result = await db.execute(
            select(UserDB.id).where(
                UserDB.tenant_id == tenant_id,
                UserDB.role == "Owner",
                UserDB.is_active == True,  # noqa: E712
            ).limit(1)
        )
        owner_id = owner_result.scalar_one_or_none()
        if owner_id:
            try:
                title, msg_tpl = TAILOR_CANCEL_REQUEST_TO_OWNER
                await create_notification(
                    db=db, user_id=owner_id, tenant_id=tenant_id,
                    notification_type="task_cancellation_request",
                    title=title,
                    message=msg_tpl.format(
                        tailor_name=tailor_name,
                        garment_name=task.garment_name,
                        reason=input_data.failure_reason[:100],
                    ),
                    data={"task_id": str(task.id), "order_id": str(task.order_id)},
                )
            except Exception:
                logger.warning("Failed to notify owner about cancellation request for task %s", task.id)

        # Notify customer
        if order.customer_id:
            try:
                title, msg_tpl = ORDER_UNDER_REVIEW
                await create_notification(
                    db=db, user_id=order.customer_id, tenant_id=tenant_id,
                    notification_type="order_status",
                    title=title,
                    message=msg_tpl.format(order_code=_build_order_code(order)),
                    data={"order_id": str(order.id)},
                )
            except Exception:
                logger.warning("Failed to notify customer about order under review for task %s", task.id)

    now = datetime.now(timezone.utc)
    return _task_to_response(task, now)


async def resolve_cancellation_request(
    db: AsyncSession,
    task_id: uuid.UUID,
    owner_id: uuid.UUID,
    tenant_id: uuid.UUID,
    input_data: ResolveCancellationInput,
) -> dict:
    """Owner resolves tailor's cancellation request: approve, reject, or reassign."""
    result = await db.execute(
        select(TailorTaskDB)
        .options(joinedload(TailorTaskDB.assignee))
        .where(TailorTaskDB.id == task_id, TailorTaskDB.tenant_id == tenant_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise ValueError("Không tìm thấy công việc")
    if task.status != "cancellation_requested":
        raise ValueError("Công việc không có yêu cầu huỷ đang chờ xử lý")

    order = await db.get(OrderDB, task.order_id)
    if not order:
        raise ValueError("Không tìm thấy đơn hàng")

    tailor_id = task.assigned_to
    decision = input_data.decision

    if decision == "approve":
        task.status = "cancelled"
        task.cancellation_resolved_at = datetime.now(timezone.utc)
        task.updated_at = datetime.now(timezone.utc)

        # Cancel order with reason
        cancel_reason = input_data.cancellation_reason or task.failure_reason or "Thợ may yêu cầu huỷ"
        order.status = "cancelled"
        order.cancellation_reason = cancel_reason
        order.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.commit()

        # Notify tailor
        try:
            title, msg_tpl = TAILOR_CANCEL_APPROVED
            await create_notification(
                db=db, user_id=tailor_id, tenant_id=tenant_id,
                notification_type="task_cancellation_resolved",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name),
                data={"task_id": str(task.id)},
            )
        except Exception:
            logger.warning("Failed to notify tailor about approved cancellation for task %s", task.id)

        return {"decision": "approve", "task_id": str(task.id), "order_status": "cancelled"}

    elif decision == "reject":
        previous_status = "in_progress" if task.production_step != "pending" else "assigned"
        task.status = previous_status
        task.cancellation_resolved_at = datetime.now(timezone.utc)
        task.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.commit()

        # Notify tailor
        try:
            title, msg_tpl = TAILOR_CANCEL_REJECTED
            await create_notification(
                db=db, user_id=tailor_id, tenant_id=tenant_id,
                notification_type="task_cancellation_resolved",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name),
                data={"task_id": str(task.id)},
            )
        except Exception:
            logger.warning("Failed to notify tailor about rejected cancellation for task %s", task.id)

        return {"decision": "reject", "task_id": str(task.id), "task_status": previous_status}

    elif decision == "reassign":
        if not input_data.new_tailor_id:
            raise ValueError("Cần chọn thợ may mới khi giao lại công việc")

        # Validate new tailor
        new_tailor = await db.get(UserDB, input_data.new_tailor_id)
        if not new_tailor or new_tailor.role != "Tailor" or new_tailor.tenant_id != tenant_id:
            raise ValueError("Thợ may mới không hợp lệ")
        if not new_tailor.is_active:
            raise ValueError("Tài khoản thợ may mới đã bị vô hiệu hóa")

        # Cancel old task
        task.status = "cancelled"
        task.cancellation_resolved_at = datetime.now(timezone.utc)
        task.updated_at = datetime.now(timezone.utc)

        # Create new task (no commit)
        new_task = await _create_task_no_commit(
            db=db,
            tenant_id=tenant_id,
            order=order,
            assigned_to=input_data.new_tailor_id,
            assigned_by=owner_id,
            garment_name=task.garment_name,
            customer_name=task.customer_name,
            deadline=task.deadline,
            notes=task.notes,
            piece_rate=task.piece_rate,
            order_item_id=task.order_item_id,
        )

        await db.commit()

        # Notify old tailor
        try:
            title, msg_tpl = TAILOR_REASSIGNED
            await create_notification(
                db=db, user_id=tailor_id, tenant_id=tenant_id,
                notification_type="task_cancellation_resolved",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name),
                data={"task_id": str(task.id)},
            )
        except Exception:
            logger.warning("Failed to notify old tailor about reassignment for task %s", task.id)

        # Notify new tailor
        try:
            deadline_text = task.deadline.strftime("%Y-%m-%d") if task.deadline else "Không có hạn"
            title, msg_tpl = TASK_ASSIGNMENT_MESSAGE
            await create_notification(
                db=db, user_id=input_data.new_tailor_id, tenant_id=tenant_id,
                notification_type="task_assigned",
                title=title,
                message=msg_tpl.format(garment_name=task.garment_name, deadline=deadline_text),
                data={"task_id": str(new_task.id), "order_id": str(order.id)},
            )
        except Exception:
            logger.warning("Failed to notify new tailor about assignment for task %s", new_task.id)

        return {
            "decision": "reassign",
            "old_task_id": str(task.id),
            "new_task_id": str(new_task.id),
            "new_tailor_id": str(input_data.new_tailor_id),
        }

    raise ValueError(f"Quyết định không hợp lệ: {decision}")


async def list_all_tasks(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    assigned_to: uuid.UUID | None = None,
    status_filter: str | None = None,
    overdue_only: bool = False,
) -> OwnerTaskListResponse:
    """List ALL tasks for tenant (Owner view).

    Returns all tasks across all tailors with optional filters.
    Includes assignee_name via JOIN on users table.
    """
    now = datetime.now(timezone.utc)

    status_order = case(
        (TailorTaskDB.status == "assigned", 1),
        (TailorTaskDB.status == "in_progress", 2),
        (TailorTaskDB.status == "completed", 3),
        else_=4,
    )

    query = (
        select(TailorTaskDB)
        .options(joinedload(TailorTaskDB.assignee))
        .where(TailorTaskDB.tenant_id == tenant_id)
    )

    if assigned_to is not None:
        query = query.where(TailorTaskDB.assigned_to == assigned_to)

    if status_filter:
        if status_filter == "overdue":
            query = query.where(
                TailorTaskDB.deadline < now,
                TailorTaskDB.status != "completed",
            )
        else:
            query = query.where(TailorTaskDB.status == status_filter)

    if overdue_only:
        query = query.where(
            TailorTaskDB.deadline < now,
            TailorTaskDB.status != "completed",
        )

    query = query.order_by(status_order, TailorTaskDB.deadline.asc().nulls_last())

    result = await db.execute(query)
    tasks = result.scalars().unique().all()

    task_items = [_task_to_owner_item(t, now) for t in tasks]

    # Summary counts across ALL tasks in tenant (unfiltered)
    summary_query = (
        select(
            func.count().label("total"),
            func.count().filter(TailorTaskDB.status == "assigned").label("assigned"),
            func.count().filter(TailorTaskDB.status == "in_progress").label("in_progress"),
            func.count().filter(TailorTaskDB.status == "completed").label("completed"),
            func.count().filter(
                TailorTaskDB.deadline < now,
                TailorTaskDB.status != "completed",
            ).label("overdue"),
        )
        .where(TailorTaskDB.tenant_id == tenant_id)
    )
    summary_result = (await db.execute(summary_query)).one()

    summary = TailorTaskSummary(
        total=summary_result.total,
        assigned=summary_result.assigned,
        in_progress=summary_result.in_progress,
        completed=summary_result.completed,
        overdue=summary_result.overdue,
    )

    return OwnerTaskListResponse(tasks=task_items, summary=summary)


async def update_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    request: TaskUpdateRequest,
    owner_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> OwnerTaskItem:
    """Owner updates task fields (deadline, notes, piece_rate, reassign).

    If assigned_to changes, validates new tailor.
    """
    query = (
        select(TailorTaskDB)
        .options(joinedload(TailorTaskDB.assignee))
        .where(TailorTaskDB.id == task_id)
    )
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if task is None:
        raise ValueError("Không tìm thấy công việc")
    if task.tenant_id != tenant_id:
        raise PermissionError("Công việc này không thuộc về cơ sở của bạn")

    reassigned = False

    if request.assigned_to is not None and request.assigned_to != task.assigned_to:
        # Validate new tailor
        tailor_query = select(UserDB).where(UserDB.id == request.assigned_to)
        tailor_result = await db.execute(tailor_query)
        new_tailor = tailor_result.scalar_one_or_none()

        if new_tailor is None:
            raise ValueError("Không tìm thấy thợ may mới")
        if new_tailor.role != "Tailor":
            raise ValueError("Người được giao phải có vai trò Thợ may")
        if not new_tailor.is_active:
            raise ValueError("Tài khoản thợ may đã bị vô hiệu hóa")
        if new_tailor.tenant_id != tenant_id:
            raise PermissionError("Thợ may không thuộc cùng cơ sở")

        task.assigned_to = request.assigned_to
        reassigned = True

    if request.deadline is not None:
        task.deadline = request.deadline

    if request.notes is not None:
        task.notes = request.notes

    if request.piece_rate is not None:
        task.piece_rate = Decimal(str(request.piece_rate))

    task.updated_at = datetime.now(timezone.utc)
    task_id = task.id
    await db.flush()
    await db.commit()

    # Fresh query to get updated assignee relationship
    reload_query = (
        select(TailorTaskDB)
        .options(joinedload(TailorTaskDB.assignee))
        .where(TailorTaskDB.id == task_id)
        .execution_options(populate_existing=True)
    )
    reload_result = await db.execute(reload_query)
    task = reload_result.scalar_one()

    now = datetime.now(timezone.utc)
    return _task_to_owner_item(task, now), reassigned


async def delete_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> bool:
    """Delete task only if status is 'assigned' (not started).

    Raises ValueError if task is in_progress or completed.
    """
    query = select(TailorTaskDB).where(TailorTaskDB.id == task_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if task is None:
        raise ValueError("Không tìm thấy công việc")
    if task.tenant_id != tenant_id:
        raise PermissionError("Công việc này không thuộc về cơ sở của bạn")
    if task.status != "assigned":
        raise ValueError(
            f"Chỉ có thể xóa công việc chưa bắt đầu (trạng thái 'Chờ nhận'). "
            f"Trạng thái hiện tại: '{task.status}'"
        )

    await db.delete(task)
    await db.commit()
    return True


# ── Story 5.4: Tailor Income Calculation ──────────────────────────────────────


async def get_tailor_monthly_income(
    db: AsyncSession,
    tailor_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> TailorIncomeResponse:
    """Calculate monthly income for a tailor by summing piece_rate of completed tasks.

    Groups by month/year of completed_at. Returns current month + previous month.
    Excludes tasks with NULL piece_rate (unpriced tasks).
    Authoritative Server Pattern: all calculation happens here, NOT on frontend.
    """
    from datetime import date

    today = date.today()
    current_month = today.month
    current_year = today.year

    # Calculate previous month/year
    if current_month == 1:
        prev_month = 12
        prev_year = current_year - 1
    else:
        prev_month = current_month - 1
        prev_year = current_year

    # Query: aggregate piece_rate by year+month for completed tasks
    query = (
        select(
            func.extract("year", TailorTaskDB.completed_at).label("year"),
            func.extract("month", TailorTaskDB.completed_at).label("month"),
            func.coalesce(func.sum(TailorTaskDB.piece_rate), 0).label("total_income"),
            func.count().label("task_count"),
        )
        .where(
            TailorTaskDB.assigned_to == tailor_id,
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.status == "completed",
            TailorTaskDB.piece_rate.isnot(None),
            TailorTaskDB.completed_at.isnot(None),
        )
        .group_by(
            func.extract("year", TailorTaskDB.completed_at),
            func.extract("month", TailorTaskDB.completed_at),
        )
        .order_by(
            func.extract("year", TailorTaskDB.completed_at).desc(),
            func.extract("month", TailorTaskDB.completed_at).desc(),
        )
    )

    result = await db.execute(query)
    rows = result.fetchall()

    # Parse rows into month buckets
    income_map: dict[tuple[int, int], tuple[float, int]] = {}  # (year, month) → (total, count)
    for row in rows:
        y = int(row.year)
        m = int(row.month)
        income_map[(y, m)] = (float(row.total_income), int(row.task_count))

    # Build current and previous month results
    curr_total, curr_count = income_map.get((current_year, current_month), (0.0, 0))
    prev_total, prev_count = income_map.get((prev_year, prev_month), (0.0, 0))

    # Percentage change: None if previous = 0 (avoid division by zero)
    percentage_change: float | None = None
    if prev_total > 0:
        percentage_change = round(((curr_total - prev_total) / prev_total) * 100, 1)

    return TailorIncomeResponse(
        current_month=TailorMonthlyIncome(
            month=current_month,
            year=current_year,
            total_income=curr_total,
            task_count=curr_count,
        ),
        previous_month=TailorMonthlyIncome(
            month=prev_month,
            year=prev_year,
            total_income=prev_total,
            task_count=prev_count,
        ),
        percentage_change=percentage_change,
    )


# ── Tech-Spec: Dashboard Restructure (Task 2) ─────────────────────────────────


async def get_tailor_income_by_period(
    db: AsyncSession,
    tailor_id: uuid.UUID,
    tenant_id: uuid.UUID,
    period: IncomePeriod,
    reference_date: datetime,
) -> TailorIncomeResponse | TailorIncomeDetailResponse:
    """Calculate income by period (day/week/month/year) with comparison to previous period.
    
    - day: returns TailorIncomeDetailResponse with individual task items
    - week/month/year: returns TailorIncomeResponse with aggregated comparison
    """
    from datetime import timedelta
    from calendar import monthrange
    
    if period == "day":
        # For daily view, return detailed task list
        start_of_day = reference_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = start_of_day + timedelta(days=1)
        
        query = (
            select(TailorTaskDB)
            .where(
                TailorTaskDB.assigned_to == tailor_id,
                TailorTaskDB.tenant_id == tenant_id,
                TailorTaskDB.status == "completed",
                TailorTaskDB.piece_rate.isnot(None),
                TailorTaskDB.completed_at >= start_of_day,
                TailorTaskDB.completed_at < end_of_day,
            )
            .order_by(TailorTaskDB.completed_at.desc())
        )
        
        result = await db.execute(query)
        tasks = result.scalars().all()
        
        items = [
            IncomeDetailItem(
                task_id=str(task.id),
                garment_name=task.garment_name,
                customer_name=task.customer_name,
                piece_rate=float(task.piece_rate),
                completed_at=task.completed_at.isoformat(),
            )
            for task in tasks
        ]
        
        total_income = sum(float(t.piece_rate) for t in tasks)
        
        return TailorIncomeDetailResponse(
            items=items,
            total_income=total_income,
            task_count=len(tasks),
            date=reference_date.date().isoformat(),
        )
    
    elif period == "week":
        # Week: Mon-Sun containing reference_date
        # Find Monday of the week
        days_since_monday = reference_date.weekday()  # 0=Mon, 6=Sun
        week_start = (reference_date - timedelta(days=days_since_monday)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        week_end = week_start + timedelta(days=7)
        
        # Previous week
        prev_week_start = week_start - timedelta(days=7)
        prev_week_end = week_start
        
        # Current week income
        curr_query = (
            select(
                func.coalesce(func.sum(TailorTaskDB.piece_rate), 0).label("total_income"),
                func.count().label("task_count"),
            )
            .where(
                TailorTaskDB.assigned_to == tailor_id,
                TailorTaskDB.tenant_id == tenant_id,
                TailorTaskDB.status == "completed",
                TailorTaskDB.piece_rate.isnot(None),
                TailorTaskDB.completed_at >= week_start,
                TailorTaskDB.completed_at < week_end,
            )
        )
        curr_result = (await db.execute(curr_query)).one()
        curr_total = float(curr_result.total_income)
        curr_count = int(curr_result.task_count)
        
        # Previous week income
        prev_query = (
            select(
                func.coalesce(func.sum(TailorTaskDB.piece_rate), 0).label("total_income"),
                func.count().label("task_count"),
            )
            .where(
                TailorTaskDB.assigned_to == tailor_id,
                TailorTaskDB.tenant_id == tenant_id,
                TailorTaskDB.status == "completed",
                TailorTaskDB.piece_rate.isnot(None),
                TailorTaskDB.completed_at >= prev_week_start,
                TailorTaskDB.completed_at < prev_week_end,
            )
        )
        prev_result = (await db.execute(prev_query)).one()
        prev_total = float(prev_result.total_income)
        prev_count = int(prev_result.task_count)
        
        # Calculate percentage change
        percentage_change: float | None = None
        if prev_total > 0:
            percentage_change = round(((curr_total - prev_total) / prev_total) * 100, 1)
        
        # Use week number and year for display
        current_week = reference_date.isocalendar()[1]
        current_year = reference_date.year
        prev_week_date = prev_week_start
        prev_week_num = prev_week_date.isocalendar()[1]
        prev_year = prev_week_date.year
        
        return TailorIncomeResponse(
            current_month=TailorMonthlyIncome(
                month=current_week,  # Using week number instead of month
                year=current_year,
                total_income=curr_total,
                task_count=curr_count,
            ),
            previous_month=TailorMonthlyIncome(
                month=prev_week_num,
                year=prev_year,
                total_income=prev_total,
                task_count=prev_count,
            ),
            percentage_change=percentage_change,
        )
    
    elif period == "month":
        # Use existing logic
        return await get_tailor_monthly_income(db, tailor_id, tenant_id)
    
    else:  # period == "year"
        current_year = reference_date.year
        prev_year = current_year - 1
        
        # Current year income
        curr_query = (
            select(
                func.coalesce(func.sum(TailorTaskDB.piece_rate), 0).label("total_income"),
                func.count().label("task_count"),
            )
            .where(
                TailorTaskDB.assigned_to == tailor_id,
                TailorTaskDB.tenant_id == tenant_id,
                TailorTaskDB.status == "completed",
                TailorTaskDB.piece_rate.isnot(None),
                TailorTaskDB.completed_at.isnot(None),
                func.extract("year", TailorTaskDB.completed_at) == current_year,
            )
        )
        curr_result = (await db.execute(curr_query)).one()
        curr_total = float(curr_result.total_income)
        curr_count = int(curr_result.task_count)
        
        # Previous year income
        prev_query = (
            select(
                func.coalesce(func.sum(TailorTaskDB.piece_rate), 0).label("total_income"),
                func.count().label("task_count"),
            )
            .where(
                TailorTaskDB.assigned_to == tailor_id,
                TailorTaskDB.tenant_id == tenant_id,
                TailorTaskDB.status == "completed",
                TailorTaskDB.piece_rate.isnot(None),
                TailorTaskDB.completed_at.isnot(None),
                func.extract("year", TailorTaskDB.completed_at) == prev_year,
            )
        )
        prev_result = (await db.execute(prev_query)).one()
        prev_total = float(prev_result.total_income)
        prev_count = int(prev_result.task_count)
        
        # Calculate percentage change
        percentage_change: float | None = None
        if prev_total > 0:
            percentage_change = round(((curr_total - prev_total) / prev_total) * 100, 1)
        
        # Return year as "month" field (reusing the structure)
        return TailorIncomeResponse(
            current_month=TailorMonthlyIncome(
                month=current_year % 100,  # Last 2 digits for display
                year=current_year,
                total_income=curr_total,
                task_count=curr_count,
            ),
            previous_month=TailorMonthlyIncome(
                month=prev_year % 100,
                year=prev_year,
                total_income=prev_total,
                task_count=prev_count,
            ),
            percentage_change=percentage_change,
        )
