"""Vouchers API Router - Story 6.3: Voucher Creator UI.

Owner-only CRUD for managing voucher codes.
Multi-tenant isolated by tenant_id.
"""

import uuid

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_id_from_user, require_roles
from src.core.database import get_db
from src.models.voucher import (
    OwnerVoucherResponse,
    VoucherCreateRequest,
    VoucherStatsResponse,
    VoucherUpdateRequest,
)
from src.services import voucher_service

router = APIRouter(prefix="/api/v1/vouchers", tags=["vouchers"])


@router.get(
    "",
    response_model=dict,
    summary="List vouchers (Owner only)",
    description="Get paginated list of vouchers with optional filters and search.",
)
async def list_vouchers_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
    is_active: bool | None = Query(None, description="Filter by active status"),
    search: str | None = Query(None, max_length=255, description="Search by code or description"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: Literal["created_at", "code", "expiry_date", "value", "used_count"] = Query("created_at", description="Sort field"),
    sort_order: Literal["asc", "desc"] = Query("desc", description="Sort order"),
) -> dict:
    """List vouchers with filters, search, sorting and pagination (Owner only)."""
    vouchers, total = await voucher_service.list_vouchers(
        db, tenant_id,
        is_active=is_active,
        search=search,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    return {
        "data": [OwnerVoucherResponse.model_validate(v).model_dump(mode="json") for v in vouchers],
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    }


@router.get(
    "/stats",
    response_model=dict,
    summary="Voucher analytics summary (Owner only)",
    description="Get total vouchers, active count, redemptions, and redemption rate.",
)
async def get_voucher_stats_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get voucher analytics summary (Owner only)."""
    stats = await voucher_service.get_voucher_stats(db, tenant_id)

    return {
        "data": stats.model_dump(),
    }


@router.get(
    "/{voucher_id}",
    response_model=dict,
    summary="Get voucher detail (Owner only)",
)
async def get_voucher_endpoint(
    voucher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get voucher detail by ID (Owner only)."""
    voucher = await voucher_service.get_voucher(db, tenant_id, voucher_id)
    if not voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy voucher",
        )

    return {
        "data": OwnerVoucherResponse.model_validate(voucher).model_dump(mode="json"),
    }


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create voucher (Owner only)",
)
async def create_voucher_endpoint(
    data: VoucherCreateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Create a new voucher (Owner only)."""
    voucher = await voucher_service.create_voucher(db, tenant_id, data)

    return {
        "data": OwnerVoucherResponse.model_validate(voucher).model_dump(mode="json"),
    }


@router.put(
    "/{voucher_id}",
    response_model=dict,
    summary="Update voucher (Owner only)",
)
async def update_voucher_endpoint(
    voucher_id: uuid.UUID,
    data: VoucherUpdateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Update a voucher (Owner only)."""
    voucher = await voucher_service.update_voucher(db, tenant_id, voucher_id, data)
    if not voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy voucher",
        )

    return {
        "data": OwnerVoucherResponse.model_validate(voucher).model_dump(mode="json"),
    }


@router.patch(
    "/{voucher_id}/toggle-active",
    response_model=dict,
    summary="Toggle voucher active status (Owner only)",
)
async def toggle_voucher_active_endpoint(
    voucher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Toggle voucher is_active status (Owner only)."""
    voucher = await voucher_service.toggle_voucher_active(db, tenant_id, voucher_id)
    if not voucher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy voucher",
        )

    return {
        "data": OwnerVoucherResponse.model_validate(voucher).model_dump(mode="json"),
    }


@router.delete(
    "/{voucher_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete voucher (Owner only)",
    description="Delete a voucher. Only allowed if used_count == 0.",
)
async def delete_voucher_endpoint(
    voucher_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> None:
    """Delete a voucher (Owner only). Only if used_count == 0."""
    deleted = await voucher_service.delete_voucher(db, tenant_id, voucher_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy voucher",
        )
