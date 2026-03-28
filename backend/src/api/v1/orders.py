"""Order API Router - Story 3.3 + 4.2.

Public POST/GET endpoints for guest checkout.
Owner-only GET list and PATCH status endpoints (Story 4.2).
Multi-tenant isolated by tenant_id.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import CurrentUser, OptionalCurrentUser, OwnerOnly, TenantId
from src.core.database import get_db
from src.models.order import (
    ApproveOrderRequest,
    InternalOrderCreate,
    MeasurementCheckResponse,
    OrderCreate,
    OrderFilterParams,
    OrderStatus,
    OrderStatusUpdate,
    PaymentStatus,
    PayRemainingRequest,
    RentalCheckoutFields,
    UpdatePreparationStepRequest,
)
from src.services import order_service

router = APIRouter(prefix="/api/v1/orders", tags=["orders"])


def get_default_tenant_id() -> uuid.UUID:
    """Return default tenant ID for public checkout.

    TODO: In production, extract from subdomain or request context.
    """
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.post(
    "/check-measurement",
    response_model=dict,
    summary="Check customer measurements for bespoke gate (Story 10.2)",
)
async def check_measurement_endpoint(
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Check if authenticated customer has valid measurements for bespoke orders.

    Returns measurement summary if available, or indicates no measurements exist.
    Customer must be authenticated (JWT required).
    """
    tenant_id = get_default_tenant_id()
    result = await order_service.check_customer_measurement(db, user.id, tenant_id)
    return {"data": MeasurementCheckResponse(**result).model_dump(mode="json"), "meta": {}}


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
    Order goes directly to in_progress status.
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
    user: OptionalCurrentUser = None,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new order with server-verified prices.

    Backend is SSOT for prices — never trusts client-side price data
    (Authoritative Server Pattern).
    If user is authenticated, links order to their account via customer_id.

    Returns:
        API Response Wrapper: {"data": {...}, "meta": {}}
    """
    tenant_id = get_default_tenant_id()
    customer_id = user.id if user else None
    result = await order_service.create_order(db, order_data, tenant_id, customer_id=customer_id)
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
    transaction_type: Optional[str] = Query(None, pattern=r"^(buy|rent|bespoke)$"),
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


@router.post(
    "/{order_id}/approve",
    response_model=dict,
    summary="Approve order and auto-route (Owner only, Story 10.4)",
    description="Approve a pending order. Bespoke orders are auto-routed to tailor with TailorTask created. Rent/Buy orders are routed to warehouse (preparing).",
)
async def approve_order_endpoint(
    order_id: uuid.UUID,
    request: ApproveOrderRequest,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Approve a pending order with auto-routing based on service type.

    Owner only — tenant-scoped.
    Bespoke orders require assigned_to (tailor UUID) in request body.

    Returns:
        API Response Wrapper: {"data": ApproveOrderResponse}
    """
    result = await order_service.approve_order(db, order_id, tenant_id, user.id, request)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{order_id}/update-preparation",
    response_model=dict,
    summary="Advance preparation sub-step (Owner only, Story 10.5)",
    description="Advance the preparation sub-step for a Buy/Rent order in 'preparing' status. Forward-only transitions. On last step, delivery_mode is required.",
)
async def update_preparation_step_endpoint(
    order_id: uuid.UUID,
    request: UpdatePreparationStepRequest,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Advance preparation sub-step for order in preparing status.

    Owner only — tenant-scoped.
    """
    result = await order_service.update_preparation_step(db, order_id, tenant_id, request)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/{order_id}/pay-remaining",
    response_model=dict,
    summary="Initiate remaining payment (Customer auth, Story 10.6)",
    description="Start remaining payment for an order in ready_to_ship/ready_for_pickup status.",
)
async def pay_remaining_endpoint(
    order_id: uuid.UUID,
    request: PayRemainingRequest,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Initiate remaining payment for a ready order.

    Customer auth required — customer must own the order.
    """
    tenant_id = get_default_tenant_id()
    result = await order_service.pay_remaining(
        db, order_id, tenant_id, user.id, request.payment_method.value
    )
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
