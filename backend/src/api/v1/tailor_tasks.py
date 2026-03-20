"""Tailor Tasks API Router (Story 5.3, 5.2).

Authenticated endpoints for Tailor/Owner roles.
Provides task listing, status updates, task detail views,
and Owner task management (create, list-all, update, delete).
"""

import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, OwnerOrTailor, TenantId
from src.core.database import get_db
from src.models.tailor_task import StatusUpdateRequest, TaskCreateRequest, TaskUpdateRequest
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
    description="Trả về danh sách tasks được giao kèm summary counts.",
)
async def get_my_tasks(
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get tasks assigned to current tailor with summary.

    Sorted by status priority (assigned > in_progress > completed),
    then deadline ASC.
    """
    result = await tailor_task_service.get_my_tasks(db, user.id, tenant_id)
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


# ── Story 5.4: Tailor Income Endpoint ─────────────────────────────────────────


@router.get(
    "/my-income",
    response_model=dict,
    summary="Thu nhập tháng này vs tháng trước",
    description="Trả về tổng tiền công tháng hiện tại và tháng trước, cùng % thay đổi.",
)
async def get_my_income(
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get monthly income summary for current tailor.

    Sums piece_rate from completed tasks grouped by month.
    Excludes NULL piece_rate tasks (unpriced).
    Multi-tenant isolated by tenant_id.
    """
    result = await tailor_task_service.get_tailor_monthly_income(db, user.id, tenant_id)
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
