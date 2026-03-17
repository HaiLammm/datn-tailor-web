"""Tailor Tasks API Router (Story 5.3).

Authenticated endpoints for Tailor/Owner roles.
Provides task listing, status updates, and task detail views.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOrTailor, TenantId
from src.core.database import get_db
from src.models.tailor_task import StatusUpdateRequest
from src.services import tailor_task_service

router = APIRouter(prefix="/api/v1/tailor-tasks", tags=["tailor-tasks"])


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
