"""Rental Management API Router - Story 4.3.

Owner-only endpoints for rental management board.
Multi-tenant isolated by tenant_id.
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, TenantId
from src.core.database import get_db
from src.models.rental import (
    ProcessReturnInput,
    RentalListParams,
)
from src.services import rental_service
import uuid

router = APIRouter(prefix="/api/v1/rentals", tags=["rentals"])


@router.get(
    "",
    response_model=dict,
    summary="List rental items (Owner only)",
    description="Paginated, filtered list of rental items for the Owner rental management board.",
)
async def list_rentals_endpoint(
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[str] = Query(None, alias="status", pattern=r"^(active|overdue|returned)$"),
    search: Optional[str] = Query(None, max_length=255),
    sort_by: str = Query("end_date", pattern=r"^(end_date|days_remaining|customer_name)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    """List rental items with filtering and pagination.

    Returns:
        API Response Wrapper: {"data": [...], "meta": {"pagination": {...}}}
    """
    params = RentalListParams(
        status=status_filter,
        search=search,
        sort_by=sort_by,
        page=page,
        page_size=page_size,
    )
    result = await rental_service.list_rentals(db, tenant_id, params)
    return result.model_dump(mode="json")


@router.get(
    "/stats",
    response_model=dict,
    summary="Get rental statistics (Owner only)",
    description="Summary statistics for the rental management dashboard.",
)
async def get_rental_stats_endpoint(
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get rental statistics summary.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    result = await rental_service.get_rental_stats(db, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.get(
    "/{order_item_id}",
    response_model=dict,
    summary="Get rental detail (Owner only)",
    description="Get detailed information about a specific rental item for the detail drawer.",
)
async def get_rental_detail_endpoint(
    user: OwnerOnly,
    tenant_id: TenantId,
    order_item_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get rental item details for drawer view.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    result = await rental_service.get_rental_detail(db, tenant_id, order_item_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{order_item_id}/return",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Process return of rental item (Owner only)",
    description="Process return with condition assessment and deposit deduction.",
)
async def process_return_endpoint(
    user: OwnerOnly,
    tenant_id: TenantId,
    order_item_id: uuid.UUID,
    return_data: ProcessReturnInput,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Process rental return with row locking.

    Backend handles status transitions to prevent race conditions.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    result = await rental_service.process_return(
        db,
        tenant_id,
        order_item_id,
        return_data,
        processed_by_id=user.user_id,
    )
    return {"data": result.model_dump(mode="json"), "meta": {}}
