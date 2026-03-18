"""Order business logic service (Story 3.3 + 4.2)."""

import logging
import math
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.db_models import GarmentDB, OrderDB, OrderItemDB, PaymentTransactionDB
from src.services.notification_creator import ORDER_STATUS_MESSAGES, create_notification
from src.models.order import (
    OrderCreate,
    OrderFilterParams,
    OrderItemResponse,
    OrderListItem,
    OrderListResponse,
    OrderResponse,
    OrderStatus,
    OrderStatusUpdate,
    PaginationMeta,
    PaymentMethod,
    PaymentTransactionResponse,
)

logger = logging.getLogger(__name__)


async def create_order(
    db: AsyncSession, order_data: OrderCreate, tenant_id: UUID
) -> OrderResponse:
    """Create a new order with verified prices (Authoritative Server Pattern).

    Backend is SSOT for prices - never trust client-side price data.
    """
    total_amount = Decimal("0")
    order_items: list[OrderItemDB] = []
    item_details: list[dict] = []

    # Batch fetch all garments with FOR UPDATE lock to prevent race conditions
    garment_ids = [item.garment_id for item in order_data.items]
    result = await db.execute(
        select(GarmentDB)
        .where(
            GarmentDB.id.in_(garment_ids),
            GarmentDB.tenant_id == tenant_id,
        )
        .with_for_update()
    )
    garments_map = {g.id: g for g in result.scalars().all()}

    # Verify each item: availability and price from GarmentDB
    for item in order_data.items:
        garment = garments_map.get(item.garment_id)

        if garment is None:
            raise HTTPException(
                status_code=404,
                detail={
                    "error": {
                        "code": "ERR_GARMENT_NOT_FOUND",
                        "message": f"San pham khong ton tai: {item.garment_id}",
                    }
                },
            )

        if garment.status != "available":
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_ITEM_UNAVAILABLE",
                        "message": f"San pham khong kha dung: {garment.name}",
                    }
                },
            )

        # Determine price from backend (SSOT)
        if item.transaction_type == "buy":
            if garment.sale_price is None:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": {
                            "code": "ERR_ITEM_NOT_FOR_SALE",
                            "message": f"San pham khong co gia ban: {garment.name}",
                        }
                    },
                )
            unit_price = garment.sale_price
            item_total = unit_price
        else:
            # rent: multiply by rental_days (default 1 if not provided)
            unit_price = garment.rental_price
            days = item.rental_days if item.rental_days else 1
            item_total = unit_price * days
        total_amount += item_total

        order_item = OrderItemDB(
            garment_id=item.garment_id,
            transaction_type=item.transaction_type,
            size=item.size,
            start_date=item.start_date,
            end_date=item.end_date,
            rental_days=item.rental_days,
            unit_price=unit_price,
            total_price=item_total,
            quantity=1,
        )

        # Set rental-specific fields for rent transactions (Story 4.3)
        if item.transaction_type == "rent":
            order_item.rental_status = "active"
            order_item.deposit_amount = unit_price * Decimal("0.3")  # 30% of rental price
        order_items.append(order_item)
        item_details.append(
            {
                "garment_name": garment.name,
                "image_url": garment.image_url,
                "garment_id": garment.id,
                "transaction_type": item.transaction_type,
                "size": item.size,
                "rental_days": item.rental_days,
                "unit_price": unit_price,
                "total_price": item_total,
            }
        )

    # Create OrderDB
    order = OrderDB(
        tenant_id=tenant_id,
        customer_name=order_data.customer_name,
        customer_phone=order_data.customer_phone,
        shipping_address=order_data.shipping_address.model_dump(),
        shipping_note=order_data.shipping_note,
        payment_method=order_data.payment_method.value,
        status="pending",
        total_amount=total_amount,
    )
    order.items = order_items

    db.add(order)
    await db.flush()
    await db.commit()
    await db.refresh(order)

    # Generate payment URL for online payment methods (mock for MVP)
    payment_url: str | None = None
    if order_data.payment_method in (PaymentMethod.vnpay, PaymentMethod.momo):
        payment_url = f"/checkout/confirmation?orderId={order.id}&status=success"

    # Log email trigger (MVP: log instead of sending)
    logger.info(
        "Order confirmation email triggered for order %s to %s",
        order.id,
        order_data.customer_phone,
    )

    # Build response with garment details
    response_items = [
        OrderItemResponse(
            garment_id=detail["garment_id"],
            garment_name=detail["garment_name"],
            image_url=detail["image_url"],
            transaction_type=detail["transaction_type"],
            size=detail["size"],
            rental_days=detail["rental_days"],
            unit_price=detail["unit_price"],
            total_price=detail["total_price"],
        )
        for detail in item_details
    ]

    return OrderResponse(
        id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        total_amount=order.total_amount,
        payment_method=order.payment_method,
        payment_url=payment_url,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order_data.shipping_address,
        shipping_note=order.shipping_note,
        items=response_items,
        created_at=order.created_at,
    )


async def get_order(
    db: AsyncSession, order_id: UUID, tenant_id: UUID
) -> OrderResponse:
    """Get order by ID with tenant isolation."""
    result = await db.execute(
        select(OrderDB)
        .options(selectinload(OrderDB.items).selectinload(OrderItemDB.garment))
        .where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ERR_ORDER_NOT_FOUND",
                    "message": "Don hang khong ton tai",
                }
            },
        )

    response_items = [
        OrderItemResponse(
            garment_id=item.garment_id,
            garment_name=item.garment.name if item.garment else "Unknown",
            image_url=item.garment.image_url if item.garment else None,
            transaction_type=item.transaction_type,
            size=item.size,
            rental_days=item.rental_days,
            unit_price=item.unit_price,
            total_price=item.total_price,
        )
        for item in order.items
    ]

    return OrderResponse(
        id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        total_amount=order.total_amount,
        payment_method=order.payment_method,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order.shipping_address,
        shipping_note=order.shipping_note,
        items=response_items,
        created_at=order.created_at,
    )


# ---------------------------------------------------------------------------
# Story 4.2: Order list & status update
# ---------------------------------------------------------------------------

# Valid forward-only transition matrix
_VALID_TRANSITIONS: dict[str, str | None] = {
    "pending": "confirmed",
    "confirmed": "in_production",
    "in_production": "shipped",
    "shipped": "delivered",
    "delivered": None,
    "cancelled": None,
}


async def list_orders(
    db: AsyncSession,
    tenant_id: UUID,
    params: OrderFilterParams,
) -> OrderListResponse:
    """Return paginated, filtered, sorted order list for Owner dashboard."""
    query = (
        select(OrderDB)
        .where(OrderDB.tenant_id == tenant_id)
        .options(selectinload(OrderDB.items))
    )

    # ---- filters ----
    if params.status:
        query = query.where(OrderDB.status.in_([s.value for s in params.status]))

    if params.payment_status:
        query = query.where(
            OrderDB.payment_status.in_([p.value for p in params.payment_status])
        )

    if params.transaction_type:
        # Filter orders that have at least one item with matching transaction_type
        query = query.where(
            OrderDB.id.in_(
                select(OrderItemDB.order_id).where(
                    OrderItemDB.transaction_type == params.transaction_type
                )
            )
        )

    if params.search:
        # NOTE: AC2 mentions search by email, but OrderDB has no customer_email field.
        # Email search deferred until customer_email is added to the orders table.
        escaped = params.search.strip().replace("%", "\\%").replace("_", "\\_")
        search_term = f"%{escaped}%"
        query = query.where(
            or_(
                OrderDB.customer_name.ilike(search_term),
                OrderDB.customer_phone.ilike(search_term),
                cast(OrderDB.id, String).ilike(search_term),
            )
        )

    # ---- count ----
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    # ---- sort ----
    sort_col = {
        "created_at": OrderDB.created_at,
        "total_amount": OrderDB.total_amount,
        "status": OrderDB.status,
    }[params.sort_by]
    query = query.order_by(
        sort_col.desc() if params.sort_order == "desc" else sort_col.asc()
    )

    # ---- pagination ----
    offset = (params.page - 1) * params.page_size
    query = query.offset(offset).limit(params.page_size)

    result = await db.execute(query)
    orders = result.scalars().all()

    items = [
        OrderListItem(
            id=o.id,
            status=o.status,
            payment_status=o.payment_status,
            total_amount=o.total_amount,
            payment_method=o.payment_method,
            customer_name=o.customer_name,
            customer_phone=o.customer_phone,
            transaction_types=list({item.transaction_type for item in o.items}),
            created_at=o.created_at,
            next_valid_status=_VALID_TRANSITIONS.get(o.status) if o.status not in ("cancelled", "delivered") else None,
        )
        for o in orders
    ]

    total_pages = max(1, math.ceil(total / params.page_size))

    return OrderListResponse(
        data=items,
        meta=PaginationMeta(
            page=params.page,
            page_size=params.page_size,
            total=total,
            total_pages=total_pages,
        ),
    )


async def update_order_status(
    db: AsyncSession,
    order_id: UUID,
    tenant_id: UUID,
    update: OrderStatusUpdate,
) -> OrderResponse:
    """Update order status with transition matrix enforcement and row locking."""
    result = await db.execute(
        select(OrderDB)
        .where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
        .with_for_update()
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ERR_ORDER_NOT_FOUND",
                    "message": "Đơn hàng không tồn tại",
                }
            },
        )

    new_status = update.status.value
    current_status = order.status

    # Allow cancellation from any non-terminal status
    if new_status == "cancelled":
        if current_status in ("delivered", "cancelled"):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_INVALID_TRANSITION",
                        "message": f"Không thể hủy đơn hàng ở trạng thái: {current_status}",
                    }
                },
            )
    else:
        # Forward-only transition validation
        expected_next = _VALID_TRANSITIONS.get(current_status)
        if expected_next is None:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_INVALID_TRANSITION",
                        "message": f"Đơn hàng ở trạng thái cuối: {current_status}",
                    }
                },
            )
        if new_status != expected_next:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_INVALID_TRANSITION",
                        "message": f"Chuyển trạng thái không hợp lệ: {current_status} → {new_status}. Tiếp theo phải là: {expected_next}",
                    }
                },
            )

    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)
    # Capture fields before commit (for notification, since session may expire objects)
    _customer_id = order.customer_id
    _tenant_id = order.tenant_id
    _order_id_str = str(order.id)
    await db.flush()
    await db.commit()

    # Story 4.4f: Create in-app notification for authenticated customers
    if _customer_id is not None and new_status in ORDER_STATUS_MESSAGES:
        try:
            title, msg_template = ORDER_STATUS_MESSAGES[new_status]
            message = msg_template.format(order_code=f"#{_order_id_str[:8].upper()}")
            await create_notification(
                db=db,
                user_id=_customer_id,
                tenant_id=_tenant_id,
                notification_type="order_status",
                title=title,
                message=message,
                data={"order_id": _order_id_str},
            )
        except Exception:
            logger.warning(
                "Failed to create notification for order %s status %s", _order_id_str, new_status
            )

    # Re-query with eager loading after commit to avoid lazy-load issues
    refreshed = await db.execute(
        select(OrderDB)
        .options(
            selectinload(OrderDB.items).selectinload(OrderItemDB.garment),
        )
        .where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
    )
    order = refreshed.scalar_one()

    response_items = [
        OrderItemResponse(
            garment_id=item.garment_id,
            garment_name=item.garment.name if item.garment else "Unknown",
            image_url=item.garment.image_url if item.garment else None,
            transaction_type=item.transaction_type,
            size=item.size,
            rental_days=item.rental_days,
            unit_price=item.unit_price,
            total_price=item.total_price,
        )
        for item in order.items
    ]

    return OrderResponse(
        id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        total_amount=order.total_amount,
        payment_method=order.payment_method,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order.shipping_address,
        shipping_note=order.shipping_note,
        items=response_items,
        created_at=order.created_at,
    )


async def get_order_with_transactions(
    db: AsyncSession,
    order_id: UUID,
    tenant_id: UUID,
) -> tuple[OrderResponse, list[PaymentTransactionResponse]]:
    """Get full order detail including payment transactions for owner drawer."""
    result = await db.execute(
        select(OrderDB)
        .options(
            selectinload(OrderDB.items).selectinload(OrderItemDB.garment),
            selectinload(OrderDB.payment_transactions),
        )
        .where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ERR_ORDER_NOT_FOUND",
                    "message": "Đơn hàng không tồn tại",
                }
            },
        )

    response_items = [
        OrderItemResponse(
            garment_id=item.garment_id,
            garment_name=item.garment.name if item.garment else "Unknown",
            image_url=item.garment.image_url if item.garment else None,
            transaction_type=item.transaction_type,
            size=item.size,
            rental_days=item.rental_days,
            unit_price=item.unit_price,
            total_price=item.total_price,
        )
        for item in order.items
    ]

    transactions = [
        PaymentTransactionResponse(
            id=tx.id,
            order_id=tx.order_id,
            provider=tx.provider,
            transaction_id=tx.transaction_id,
            amount=tx.amount,
            status=tx.status,
            created_at=tx.created_at,
        )
        for tx in order.payment_transactions
    ]

    order_response = OrderResponse(
        id=order.id,
        status=order.status,
        payment_status=order.payment_status,
        total_amount=order.total_amount,
        payment_method=order.payment_method,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order.shipping_address,
        shipping_note=order.shipping_note,
        items=response_items,
        created_at=order.created_at,
    )

    return order_response, transactions
