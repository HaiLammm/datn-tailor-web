"""Order API Router - Story 3.3: Checkout Information & Payment Gateway.

Public POST endpoint for order creation (guest checkout supported).
Public GET endpoint for order lookup by ID.
Multi-tenant isolated by tenant_id (uses default tenant for now).
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.order import OrderCreate
from src.services import order_service

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


def get_default_tenant_id() -> uuid.UUID:
    """Return default tenant ID for public checkout.

    TODO: In production, extract from subdomain or request context.
    """
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


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
