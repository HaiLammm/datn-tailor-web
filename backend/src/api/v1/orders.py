"""Order API Router - Story 3.3 + 4.2.

Public POST/GET endpoints for guest checkout.
Owner-only GET list and PATCH status endpoints (Story 4.2).
Multi-tenant isolated by tenant_id.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, TenantId
from src.core.database import get_db
from src.models.order import (
    InternalOrderCreate,
    OrderCreate,
    OrderFilterParams,
    OrderStatus,
    OrderStatusUpdate,
    PaymentStatus,
)
from src.services import order_service

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


def get_default_tenant_id() -> uuid.UUID:
    """Return default tenant ID for public checkout.

    TODO: In production, extract from subdomain or request context.
    """
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post(
    "/internal",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create internal order (Owner only)",
)
async def create_internal_order_endpoint(
    order_data: InternalOrderCreate,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create an internal production order.

    Owner only — skips shipping/payment, auto-fills customer info from Owner.
    Order goes directly to in_production status.
    """
    result = await order_service.create_internal_order(db, order_data, user, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create order (Public / Guest checkout)",
    description="Create a new order. No authentication required — supports guest checkout.",
)
async def create_order_endpoint(
    order_data: OrderCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new order with server-verified prices.

    Backend is SSOT for prices — never trusts client-side price data
    (Authoritative Server Pattern).

    Returns:
        API Response Wrapper: {"data": {...}, "meta": {}}
    """
    tenant_id = get_default_tenant_id()
    result = await order_service.create_order(db, order_data, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.get(
    "/{order_id}",
    response_model=dict,
    summary="Get order detail (Public)",
    description="Get order details by ID. Public lookup for confirmation page.",
)
async def get_order_endpoint(
    order_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get order by ID.

    Public endpoint — no authentication required.
    Tenant isolated via default tenant.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    tenant_id = get_default_tenant_id()
    result = await order_service.get_order(db, order_id, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


# ---------------------------------------------------------------------------
# Story 4.2: Owner-only order management endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=dict,
    summary="List orders (Owner only)",
    description="Paginated, filtered, sorted order list for the Owner dashboard.",
)
async def list_orders_endpoint(
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
    status_filter: Optional[list[OrderStatus]] = Query(None, alias="status"),
    payment_status: Optional[list[PaymentStatus]] = Query(None),
    transaction_type: Optional[str] = Query(None, pattern=r"^(buy|rent)$"),
    is_internal: Optional[bool] = Query(None),
    search: Optional[str] = Query(None, max_length=255),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    sort_by: str = Query("created_at", pattern=r"^(created_at|total_amount|status)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
) -> dict:
    """Get paginated order list with filters.

    Owner only — tenant-scoped.

    Returns:
        API Response Wrapper: {"data": [...], "meta": {"pagination": {...}}}
    """
    params = OrderFilterParams(
        status=status_filter,
        payment_status=payment_status,
        transaction_type=transaction_type,
        is_internal=is_internal,
        search=search,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    result = await order_service.list_orders(db, tenant_id, params)
    return {
        "data": [item.model_dump(mode="json") for item in result.data],
        "meta": {"pagination": result.meta.model_dump()},
    }


@router.patch(
    "/{order_id}/status",
    response_model=dict,
    summary="Update order status (Owner only)",
    description="Advance order status to next valid step in pipeline. Enforces transition matrix.",
)
async def update_order_status_endpoint(
    order_id: uuid.UUID,
    update: OrderStatusUpdate,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Update order status with transition matrix enforcement.

    Owner only — tenant-scoped. Raises 422 for invalid transitions.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    result = await order_service.update_order_status(db, order_id, tenant_id, update)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.get(
    "/{order_id}/detail",
    response_model=dict,
    summary="Get order detail with transactions (Owner only)",
    description="Full order detail including payment transaction history for drawer.",
)
async def get_order_detail_endpoint(
    order_id: uuid.UUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get full order detail with payment transactions.

    Owner only — tenant-scoped.

    Returns:
        API Response Wrapper: {"data": {"order": {...}, "transactions": [...]}}
    """
    order, transactions = await order_service.get_order_with_transactions(
        db, order_id, tenant_id
    )
    return {
        "data": {
            "order": order.model_dump(mode="json"),
            "transactions": [tx.model_dump(mode="json") for tx in transactions],
        },
        "meta": {},
    }
