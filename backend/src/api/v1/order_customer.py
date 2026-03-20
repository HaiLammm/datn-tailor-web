"""Customer Order API endpoints (Story 4.4c).

Customer-facing endpoints for viewing own order history and downloading invoices.
Separate from owner order management (src/api/v1/orders.py).

Prefix: /api/v1/customer/orders
Auth: Bearer JWT required for all endpoints (CurrentUser)
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import CurrentUser
from src.core.database import get_db
from src.models.order import OrderStatus
from src.services import order_customer_service
from src.services.invoice_service import generate_invoice_html

router = APIRouter(prefix="/api/v1/customer/orders", tags=["customer-orders"])


@router.get(
    "",
    response_model=dict,
    summary="List customer's own orders",
    description="Paginated, filtered list of orders belonging to the authenticated customer.",
)
async def list_my_orders(
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: Optional[str] = Query(None, description="Order status filter (pending, confirmed, in_progress, checked, shipped, delivered, cancelled)"),
    order_type: Optional[str] = Query(None, pattern=r"^(buy|rental)$"),
    date_from: Optional[str] = Query(None, description="ISO date string, e.g. 2026-01-01"),
    date_to: Optional[str] = Query(None, description="ISO date string, e.g. 2026-12-31"),
    search: Optional[str] = Query(None, max_length=100),
) -> dict:
    """Return paginated order list for the authenticated customer.

    Filters by customer_id from JWT token — customers can only see their own orders.

    Returns:
        API Response Wrapper: {"data": [...], "meta": {...}}
    """
    result = await order_customer_service.get_customer_orders(
        db,
        customer_id=current_user.id,
        page=page,
        limit=limit,
        status=status,
        order_type=order_type,
        date_from=date_from,
        date_to=date_to,
        search=search,
    )
    return {
        "data": [item.model_dump(mode="json") for item in result.data],
        "meta": result.meta.model_dump(),
    }


@router.get(
    "/{order_id}",
    response_model=dict,
    summary="Get order detail for customer",
    description="Full order detail (items, delivery info, status timeline). Customer owns the order.",
)
async def get_my_order_detail(
    order_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get full detail of an order belonging to the authenticated customer.

    Returns 404 if the order does not exist or belongs to another customer.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    detail = await order_customer_service.get_order_detail(
        db,
        order_id=order_id,
        customer_id=current_user.id,
    )
    return {"data": detail.model_dump(mode="json"), "meta": {}}


@router.get(
    "/{order_id}/invoice",
    summary="Download order invoice as printable HTML",
    description=(
        "Returns a printable HTML invoice for the order. "
        "Browser can use Ctrl+P / window.print() to save as PDF. "
        "Returns 404 if order not found or does not belong to the customer."
    ),
)
async def download_order_invoice(
    order_id: uuid.UUID,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Generate and return a printable HTML invoice for the given order.

    The customer can print or save as PDF via the browser's print dialog.

    Returns:
        HTML response with Content-Disposition for download.
    """
    detail = await order_customer_service.get_order_detail(
        db,
        order_id=order_id,
        customer_id=current_user.id,
    )
    html_content = generate_invoice_html(detail)
    filename = f"order_{order_id}_invoice.html"

    return Response(
        content=html_content,
        media_type="text/html; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )
