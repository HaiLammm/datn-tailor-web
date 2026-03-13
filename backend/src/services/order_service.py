"""Order business logic service (Story 3.3)."""

import logging
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.dialects.postgresql import insert as pg_insert

from src.models.db_models import GarmentDB, OrderDB, OrderItemDB
from src.models.order import (
    OrderCreate,
    OrderItemResponse,
    OrderResponse,
    PaymentMethod,
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
