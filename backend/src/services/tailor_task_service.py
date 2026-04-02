"""Tailor Task service for production task management (Story 5.3, 5.2).

All task status transitions and overdue calculations happen here
(Authoritative Server Pattern). Frontend only renders pre-calculated data.
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.models.db_models import OrderDB, OrderItemDB, TailorTaskDB, UserDB
from src.models.tailor_task import (
    OrderInfoForTask,
    OwnerTaskItem,
    OwnerTaskListResponse,
    ProductionStepUpdateRequest,
    StatusUpdateRequest,
    TailorIncomeResponse,
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

# Valid status transitions: current → allowed next statuses
VALID_TRANSITIONS = {
    "assigned": "in_progress",
    "in_progress": "completed",
}

# Production sub-steps: forward-only transitions
PRODUCTION_STEPS = ["pending", "cutting", "sewing", "finishing", "quality_check", "done"]


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
        assigned_to=str(task.assigned_to),
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
        )

    # Extend base response with order info
    detail_response_data = base_response.model_dump(mode="json")
    detail_response_data["order_info"] = order_info.model_dump(mode="json") if order_info else None
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
    - Order status is 'confirmed'
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
    if order.status != "confirmed":
        raise ValueError(
            f"Chỉ có thể giao việc cho đơn hàng đã xác nhận. "
            f"Trạng thái hiện tại: '{order.status}'"
        )

    # Check: one order can only have one active task (not cancelled/deleted)
    existing_task_result = await db.execute(
        select(func.count(TailorTaskDB.id)).where(
            TailorTaskDB.order_id == request.order_id,
            TailorTaskDB.tenant_id == tenant_id,
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
