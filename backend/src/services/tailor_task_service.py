"""Tailor Task service for production task management (Story 5.3).

All task status transitions and overdue calculations happen here
(Authoritative Server Pattern). Frontend only renders pre-calculated data.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.models.db_models import TailorTaskDB
from src.models.tailor_task import (
    OrderInfoForTask,
    StatusUpdateRequest,
    TailorTaskDetailResponse,
    TailorTaskListResponse,
    TailorTaskResponse,
    TailorTaskSummary,
)

# Valid status transitions: current → allowed next statuses
VALID_TRANSITIONS = {
    "assigned": "in_progress",
    "in_progress": "completed",
}


def _task_to_response(task: TailorTaskDB, now: datetime) -> TailorTaskResponse:
    """Convert DB model to response with overdue calculation.

    Overdue = deadline has passed AND task not completed (SSOT definition).
    """
    is_overdue = False
    days_until_deadline = None

    if task.deadline and task.status != "completed":
        delta = task.deadline - now
        days_until_deadline = delta.days
        if days_until_deadline < 0:
            is_overdue = True  # Deadline has passed

    return TailorTaskResponse(
        id=str(task.id),
        tenant_id=str(task.tenant_id),
        order_id=str(task.order_id),
        order_item_id=str(task.order_item_id) if task.order_item_id else None,
        assigned_to=str(task.assigned_to),
        assigned_by=str(task.assigned_by),
        garment_name=task.garment_name,
        customer_name=task.customer_name,
        status=task.status,
        deadline=task.deadline.isoformat() if task.deadline else None,
        notes=task.notes,
        piece_rate=float(task.piece_rate) if task.piece_rate else None,
        design_id=str(task.design_id) if task.design_id else None,
        completed_at=task.completed_at.isoformat() if task.completed_at else None,
        is_overdue=is_overdue,
        days_until_deadline=days_until_deadline,
        created_at=task.created_at.isoformat(),
        updated_at=task.updated_at.isoformat(),
    )


async def get_my_tasks(
    db: AsyncSession, tailor_id: uuid.UUID, tenant_id: uuid.UUID
) -> TailorTaskListResponse:
    """Get all tasks assigned to a tailor with summary counts.

    Tasks sorted by: status priority (assigned > in_progress > completed),
    then deadline ASC (urgent first).
    """
    now = datetime.now(timezone.utc)

    # Status priority ordering: assigned=1, in_progress=2, completed=3
    status_order = case(
        (TailorTaskDB.status == "assigned", 1),
        (TailorTaskDB.status == "in_progress", 2),
        (TailorTaskDB.status == "completed", 3),
        else_=4,
    )

    query = (
        select(TailorTaskDB)
        .where(
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.assigned_to == tailor_id,
        )
        .order_by(status_order, TailorTaskDB.deadline.asc().nulls_last())
    )

    result = await db.execute(query)
    tasks = result.scalars().all()

    task_responses = [_task_to_response(t, now) for t in tasks]

    # Calculate summary
    summary = TailorTaskSummary(
        total=len(tasks),
        assigned=sum(1 for t in tasks if t.status == "assigned"),
        in_progress=sum(1 for t in tasks if t.status == "in_progress"),
        completed=sum(1 for t in tasks if t.status == "completed"),
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
            func.count().filter(
                TailorTaskDB.deadline < now,
                TailorTaskDB.status != "completed",
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
        overdue=result.overdue,
    )


async def update_task_status(
    db: AsyncSession,
    task_id: uuid.UUID,
    request: StatusUpdateRequest,
    tailor_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> TailorTaskResponse:
    """Update task status with validation.

    Enforces:
    - Multi-tenant isolation: task must belong to same tenant
    - Ownership: only assigned tailor can update
    - Linear transitions: assigned → in_progress → completed
    - Sets completed_at timestamp when completing
    """
    query = select(TailorTaskDB).where(TailorTaskDB.id == task_id)
    result = await db.execute(query)
    task = result.scalar_one_or_none()

    if task is None:
        raise ValueError("Không tìm thấy công việc")

    if task.tenant_id != tenant_id:
        raise PermissionError("Công việc này không thuộc về hộp kinh doanh của bạn")

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

    task.status = request.status
    task.updated_at = datetime.now(timezone.utc)

    if request.status == "completed":
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
        )

    # Extend base response with order info
    detail_response_data = base_response.model_dump(mode="json")
    detail_response_data["order_info"] = order_info.model_dump(mode="json") if order_info else None
    return TailorTaskDetailResponse(**detail_response_data)
