"""Tailor Tasks API Router (Story 5.3, 5.2, 12.2).

Authenticated endpoints for Tailor/Owner roles.
Provides task listing, status updates, task detail views,
Owner task management (create, list-all, update, delete),
and full state machine workflow endpoints.
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, OwnerOrTailor, TenantId
from src.core.database import get_db
from src.models.tailor_task import (
    CancellationRequestInput,
    ProductionStepUpdateRequest,
    QCResultRequest,
    ResolveCancellationInput,
    StatusUpdateRequest,
    TaskAcceptRequest,
    TaskCreateRequest,
    TaskFilterParams,
    TaskHoldRequest,
    TaskReassignRequest,
    TaskRejectRequest,
    TaskResumeRequest,
    TaskStartRequest,
    TaskUpdateRequest,
)
from src.services import tailor_task_service
from src.services.notification_creator import (
    TASK_ASSIGNMENT_MESSAGE,
    create_notification,
)

router = APIRouter(prefix="/api/v1/tailor-tasks", tags=["tailor-tasks"])


# ── Tailor-facing endpoints (Story 5.3) ───────────────────────────────────────


@router.get(
    "/my-tasks",
    response_model=dict,
    summary="Danh sách công việc của thợ may",
    description="Trả về danh sách tasks được giao kèm summary counts. Hỗ trợ filter theo status, date range, month/year.",
)
async def get_my_tasks(
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
    status: str | None = Query(None, description="Comma-separated status filter (e.g., 'assigned,in_progress')"),
    date_from: str | None = Query(None, description="Filter by deadline >= date_from (ISO format)"),
    date_to: str | None = Query(None, description="Filter by deadline <= date_to (ISO format)"),
    month: int | None = Query(None, ge=1, le=12, description="Filter by deadline month (1-12)"),
    year: int | None = Query(None, description="Filter by deadline year"),
) -> dict:
    """Get tasks assigned to current tailor with summary.

    Sorted by status priority (assigned > in_progress > completed > cancelled),
    then deadline ASC.
    
    Supports filtering by status, date range, and month/year.
    """
    from datetime import datetime
    
    # Build filters object
    filters = TaskFilterParams()
    if status:
        filters.status = status
    if date_from:
        try:
            filters.date_from = datetime.fromisoformat(date_from.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date_from format: {date_from}"
            )
    if date_to:
        try:
            filters.date_to = datetime.fromisoformat(date_to.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid date_to format: {date_to}"
            )
    if month:
        filters.month = month
    if year:
        filters.year = year
    
    result = await tailor_task_service.get_my_tasks(db, user.id, tenant_id, filters)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.get(
    "/summary",
    response_model=dict,
    summary="Tổng hợp số lượng công việc",
    description="Trả về số đếm tasks theo trạng thái.",
)
async def get_task_summary(
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get task count summary by status."""
    result = await tailor_task_service.get_task_summary(db, user.id, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.patch(
    "/{task_id}/status",
    response_model=dict,
    summary="Cập nhật trạng thái công việc",
    description="Chuyển trạng thái: assigned → in_progress → completed.",
)
async def update_task_status(
    task_id: uuid.UUID,
    body: StatusUpdateRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update task status with transition validation.

    Only the assigned tailor can update their own tasks.
    Transitions: assigned → in_progress → completed (no backward).
    """
    try:
        result = await tailor_task_service.update_task_status(
            db, task_id, body, user.id, tenant_id
        )
        return {"data": result.model_dump(mode="json"), "meta": {}}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )


@router.patch(
    "/{task_id}/production-step",
    response_model=dict,
    summary="Cập nhật bước sản xuất",
    description="Chuyển bước sản xuất: pending → cutting → sewing → finishing → quality_check → done.",
)
async def update_production_step(
    task_id: uuid.UUID,
    body: ProductionStepUpdateRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update production sub-step with forward-only validation.

    Both Owner and Tailor can update. Auto-transitions task status
    when step moves past 'pending' or reaches 'done'.
    """
    try:
        result = await tailor_task_service.update_production_step(
            db, task_id, body, user.id, tenant_id
        )
        return {"data": result.model_dump(mode="json"), "meta": {}}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )


# ── Story 5.4: Tailor Income Endpoint ─────────────────────────────────────────


@router.get(
    "/my-income",
    response_model=dict,
    summary="Thu nhập theo kỳ (ngày/tuần/tháng/năm)",
    description="Trả về thu nhập theo period với so sánh kỳ trước. Day period trả chi tiết từng task.",
)
async def get_my_income(
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
    period: str = Query("month", description="Period: day | week | month | year"),
    reference_date: str | None = Query(None, description="Reference date (ISO format, defaults to today)"),
) -> dict:
    """Get income summary for current tailor by period.

    - day: returns detailed task list for the specified date
    - week/month/year: returns aggregated comparison with previous period
    
    Sums piece_rate from completed tasks.
    Excludes NULL piece_rate tasks (unpriced).
    Multi-tenant isolated by tenant_id.
    """
    from datetime import datetime, timezone
    
    # Validate period
    valid_periods = ["day", "week", "month", "year"]
    if period not in valid_periods:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid period. Must be one of: {', '.join(valid_periods)}"
        )
    
    # Parse reference_date or use today
    if reference_date:
        try:
            ref_dt = datetime.fromisoformat(reference_date.replace("Z", "+00:00"))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid reference_date format: {reference_date}"
            )
    else:
        ref_dt = datetime.now(timezone.utc)
    
    result = await tailor_task_service.get_tailor_income_by_period(
        db, user.id, tenant_id, period, ref_dt
    )
    return {"data": result.model_dump(mode="json"), "meta": {}}


# ── Owner-facing endpoints (Story 5.2) ───────────────────────────────────────


@router.post(
    "/",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Giao việc mới cho thợ may",
    description="Owner tạo task giao việc cho thợ may, kèm notification.",
)
async def create_task_endpoint(
    body: TaskCreateRequest,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new tailor task (Owner assigns work)."""
    try:
        task_item = await tailor_task_service.create_task(
            db, body, user.id, tenant_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )

    # Send in-app notification — failure must not break the create response
    try:
        deadline_text = (
            task_item.deadline[:10] if task_item.deadline else "Không có hạn"
        )
        title, message_template = TASK_ASSIGNMENT_MESSAGE
        message = message_template.format(
            garment_name=task_item.garment_name,
            deadline=deadline_text,
        )
        await create_notification(
            db=db,
            user_id=body.assigned_to,
            tenant_id=tenant_id,
            notification_type="task_assigned",
            title=title,
            message=message,
            data={"task_id": task_item.id, "order_id": task_item.order_id},
        )
    except Exception:
        logging.getLogger(__name__).warning(
            "Failed to send task assignment notification for task %s",
            task_item.id,
        )

    return {"data": task_item.model_dump(mode="json"), "meta": {}}


@router.get(
    "/",
    response_model=dict,
    summary="Danh sách tất cả công việc (Owner)",
    description="Liệt kê tất cả tasks cho tenant với bộ lọc.",
)
async def list_all_tasks_endpoint(
    user: OwnerOnly,
    tenant_id: TenantId,
    assigned_to: uuid.UUID | None = Query(default=None, description="Lọc theo thợ may"),
    task_status: str | None = Query(
        default=None,
        alias="status",
        description="Lọc theo trạng thái: assigned, in_progress, completed, overdue",
    ),
    overdue_only: bool = Query(default=False, description="Chỉ hiện quá hạn"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """List ALL tasks for tenant with optional filters (Owner view)."""
    result = await tailor_task_service.list_all_tasks(
        db,
        tenant_id=tenant_id,
        assigned_to=assigned_to,
        status_filter=task_status,
        overdue_only=overdue_only,
    )
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.patch(
    "/{task_id}",
    response_model=dict,
    summary="Chỉnh sửa công việc (Owner)",
    description="Owner cập nhật deadline, ghi chú, tiền công, hoặc đổi thợ may.",
)
async def update_task_endpoint(
    task_id: uuid.UUID,
    body: TaskUpdateRequest,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Owner updates task fields."""
    try:
        task_item, reassigned = await tailor_task_service.update_task(
            db, task_id, body, user.id, tenant_id
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )

    # Send notification if reassigned — failure must not break the update response
    if reassigned and body.assigned_to:
        try:
            deadline_text = (
                task_item.deadline[:10] if task_item.deadline else "Không có hạn"
            )
            title, message_template = TASK_ASSIGNMENT_MESSAGE
            message = message_template.format(
                garment_name=task_item.garment_name,
                deadline=deadline_text,
            )
            await create_notification(
                db=db,
                user_id=body.assigned_to,
                tenant_id=tenant_id,
                notification_type="task_assigned",
                title=title,
                message=message,
                data={"task_id": task_item.id, "order_id": task_item.order_id},
            )
        except Exception:
            import logging
            logging.getLogger(__name__).warning(
                "Failed to send reassignment notification for task %s",
                task_item.id,
            )

    return {"data": task_item.model_dump(mode="json"), "meta": {}}


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Xóa công việc (Owner)",
    description="Chỉ xóa được task chưa bắt đầu (trạng thái 'Chờ nhận').",
)
async def delete_task_endpoint(
    task_id: uuid.UUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete task only if status is 'assigned' (not started)."""
    try:
        await tailor_task_service.delete_task(db, task_id, tenant_id)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )


# ── Story 12.2: State Machine Workflow Endpoints ────────────────────────────


@router.post(
    "/{task_id}/accept",
    response_model=dict,
    summary="Thợ may nhận việc",
)
async def accept_task_endpoint(
    task_id: uuid.UUID,
    body: TaskAcceptRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.accept_task(db, task_id, user.id, tenant_id, body)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/reject",
    response_model=dict,
    summary="Thợ may từ chối việc",
)
async def reject_task_endpoint(
    task_id: uuid.UUID,
    body: TaskRejectRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.reject_task(db, task_id, user.id, tenant_id, body)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/start",
    response_model=dict,
    summary="Bắt đầu công việc",
)
async def start_task_endpoint(
    task_id: uuid.UUID,
    body: TaskStartRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.start_task(db, task_id, user.id, tenant_id, body)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/hold",
    response_model=dict,
    summary="Tạm dừng công việc",
)
async def hold_task_endpoint(
    task_id: uuid.UUID,
    body: TaskHoldRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.hold_task(db, task_id, user.id, tenant_id, body)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/resume",
    response_model=dict,
    summary="Tiếp tục công việc",
)
async def resume_task_endpoint(
    task_id: uuid.UUID,
    body: TaskResumeRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.resume_task(db, task_id, user.id, tenant_id, body)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/submit-qc",
    response_model=dict,
    summary="Gửi kiểm tra chất lượng",
)
async def submit_qc_endpoint(
    task_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.submit_for_qc(db, task_id, user.id, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/qc-result",
    response_model=dict,
    summary="Kết quả kiểm tra chất lượng",
)
async def qc_result_endpoint(
    task_id: uuid.UUID,
    body: QCResultRequest,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.process_qc_result(db, task_id, user.id, tenant_id, body)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/reassign",
    response_model=dict,
    summary="Giao lại công việc cho thợ may khác",
)
async def reassign_task_endpoint(
    task_id: uuid.UUID,
    body: TaskReassignRequest,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.reassign_task(db, task_id, user.id, tenant_id, body)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{task_id}/stages/{stage_order}/complete",
    response_model=dict,
    summary="Hoàn thành bước sản xuất",
)
async def complete_stage_endpoint(
    task_id: uuid.UUID,
    stage_order: int,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.complete_stage(db, task_id, stage_order, user.id, tenant_id)
    return {"data": result, "meta": {}}


@router.get(
    "/{task_id}/history",
    response_model=dict,
    summary="Lịch sử thay đổi trạng thái",
)
async def get_task_history_endpoint(
    task_id: uuid.UUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.get_task_history(db, task_id, tenant_id)
    return {"data": [r.model_dump(mode="json") for r in result], "meta": {}}


@router.get(
    "/matching-scores/{order_id}",
    response_model=dict,
    summary="Điểm phù hợp thợ may cho đơn hàng",
)
async def get_matching_scores_endpoint(
    order_id: uuid.UUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await tailor_task_service.get_matching_scores(db, order_id, tenant_id)
    return {"data": [r.model_dump(mode="json") for r in result], "meta": {}}


# ── Tailor cancellation request + Owner resolve ──────────────────────────────


@router.post(
    "/{task_id}/request-cancellation",
    response_model=dict,
    summary="Thợ may yêu cầu huỷ công việc",
    description="Thợ may báo lỗi / yêu cầu huỷ với lý do. Chủ tiệm sẽ duyệt.",
)
async def request_cancellation(
    task_id: uuid.UUID,
    body: CancellationRequestInput,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Tailor requests cancellation of their task with structured reason."""
    try:
        result = await tailor_task_service.request_task_cancellation(
            db, task_id, user.id, tenant_id, body
        )
        return {"data": result.model_dump(mode="json"), "meta": {}}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )


@router.post(
    "/{task_id}/resolve-cancellation",
    response_model=dict,
    summary="Chủ tiệm xử lý yêu cầu huỷ",
    description="Chủ tiệm duyệt/từ chối/giao thợ khác cho yêu cầu huỷ từ thợ may.",
)
async def resolve_cancellation(
    task_id: uuid.UUID,
    body: ResolveCancellationInput,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Owner resolves tailor's cancellation request: approve, reject, or reassign."""
    try:
        result = await tailor_task_service.resolve_cancellation_request(
            db, task_id, user.id, tenant_id, body
        )
        return {"data": result, "meta": {}}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )


# ── Shared detail endpoint (Story 5.3 — placed LAST to avoid path conflicts) ─


@router.get(
    "/{task_id}",
    response_model=dict,
    summary="Chi tiết công việc",
    description="Trả về thông tin đầy đủ của task kèm order info.",
)
async def get_task_detail(
    task_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get single task detail with order info, notes, design link."""
    try:
        result = await tailor_task_service.get_task_detail(db, task_id, user.id, tenant_id)
        return {"data": result.model_dump(mode="json"), "meta": {}}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )
