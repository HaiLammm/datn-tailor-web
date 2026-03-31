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

from src.models.db_models import GarmentDB, OrderDB, OrderItemDB, OrderPaymentDB, PaymentTransactionDB, TailorTaskDB, UserDB
from src.services.notification_creator import (
    ORDER_APPROVED_BESPOKE_MESSAGE,
    ORDER_APPROVED_WAREHOUSE_MESSAGE,
    ORDER_READY_PICKUP_MESSAGE,
    ORDER_READY_SHIP_MESSAGE,
    ORDER_STATUS_MESSAGES,
    create_notification,
)
from src.services.voucher_service import (
    apply_vouchers_to_order,
    refund_vouchers_for_order,
    validate_and_calculate_multi_discount,
)
from src.models.order import (
    ApproveOrderRequest,
    ApproveOrderResponse,
    BUY_PREP_STEPS,
    InternalOrderCreate,
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
    PayRemainingResponse,
    RENT_PREP_STEPS,
    ServiceType,
    UpdatePreparationStepRequest,
    UpdatePreparationStepResponse,
)

logger = logging.getLogger(__name__)


def _build_order_code(order_id: UUID, created_at: datetime) -> str:
    """Generate human-readable order code: ORD-YYYYMMDD-XXXXXX."""
    date_part = created_at.strftime("%Y%m%d")
    uid_part = str(order_id).replace("-", "").upper()[:6]
    return f"ORD-{date_part}-{uid_part}"


async def _validate_and_price_items(
    db: AsyncSession,
    items: list,
    tenant_id: UUID,
    skip_availability_check: bool = False,
) -> tuple[list[OrderItemDB], list[dict], Decimal]:
    """Shared helper: validate garments and compute prices (Authoritative Server Pattern).

    Args:
        skip_availability_check: If True, skip garment status check (for internal orders).
    """
    total_amount = Decimal("0")
    order_items: list[OrderItemDB] = []
    item_details: list[dict] = []

    garment_ids = [item.garment_id for item in items]
    result = await db.execute(
        select(GarmentDB)
        .where(
            GarmentDB.id.in_(garment_ids),
            GarmentDB.tenant_id == tenant_id,
        )
        .with_for_update()
    )
    garments_map = {g.id: g for g in result.scalars().all()}

    for item in items:
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

        if not skip_availability_check and (garment.status != "available" or garment.quantity < 1):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_ITEM_UNAVAILABLE",
                        "message": f"San pham khong kha dung: {garment.name}",
                    }
                },
            )

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
        elif item.transaction_type == "bespoke":
            if garment.sale_price is None:
                raise HTTPException(
                    status_code=422,
                    detail={
                        "error": {
                            "code": "ERR_ITEM_NOT_FOR_BESPOKE",
                            "message": f"San pham khong ho tro dat may: {garment.name}",
                        }
                    },
                )
            unit_price = garment.sale_price
            item_total = unit_price
        else:
            # rent
            unit_price = garment.rental_price
            days = item.rental_days if item.rental_days else 1
            item_total = unit_price * days
        total_amount += item_total

        order_item = OrderItemDB(
            garment_id=item.garment_id,
            transaction_type=item.transaction_type,
            size=item.size,
            start_date=getattr(item, "start_date", None),
            end_date=getattr(item, "end_date", None),
            rental_days=getattr(item, "rental_days", None),
            unit_price=unit_price,
            total_price=item_total,
            quantity=1,
        )

        if item.transaction_type == "rent":
            order_item.rental_status = "active"
            order_item.deposit_amount = unit_price * Decimal("0.3")

        # Decrement garment quantity (guard against negative)
        if garment.quantity > 0:
            garment.quantity -= 1

        order_items.append(order_item)
        item_details.append(
            {
                "garment_name": garment.name,
                "image_url": garment.image_url,
                "garment_id": garment.id,
                "transaction_type": item.transaction_type,
                "size": item.size,
                "rental_days": getattr(item, "rental_days", None),
                "unit_price": unit_price,
                "total_price": item_total,
            }
        )

    return order_items, item_details, total_amount


async def create_order(
    db: AsyncSession, order_data: OrderCreate, tenant_id: UUID, *, customer_id: UUID | None = None
) -> OrderResponse:
    """Create a new order with verified prices (Authoritative Server Pattern).

    Backend is SSOT for prices - never trust client-side price data.
    If customer_id is provided, links order to authenticated customer.
    """
    order_items, item_details, subtotal = await _validate_and_price_items(
        db, order_data.items, tenant_id, skip_availability_check=False
    )

    # Voucher discount (only for authenticated customers with voucher codes)
    discount_amount = Decimal("0")
    applied_voucher_ids: list[str] = []
    voucher_apply_data: list = []

    if order_data.voucher_codes and not customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Vui lòng đăng nhập để sử dụng voucher",
        )

    if order_data.voucher_codes and customer_id:
        voucher_apply_data, discount_amount = await validate_and_calculate_multi_discount(
            db, tenant_id, customer_id, order_data.voucher_codes, subtotal
        )
        applied_voucher_ids = [str(v[0].id) for v in voucher_apply_data]

    final_total = max(subtotal - discount_amount, Decimal("0"))

    # Story 10.3: Determine order-level service_type by highest-complexity item
    item_types = {i.transaction_type for i in order_data.items}
    if "bespoke" in item_types:
        order_service_type = "bespoke"
    elif "rent" in item_types:
        order_service_type = "rent"
    else:
        order_service_type = "buy"

    # Story 10.3: Calculate deposit/remaining based on service_type
    deposit_amount: Decimal | None = None
    remaining_amount: Decimal | None = None
    if order_service_type == "rent":
        deposit_amount = (final_total * Decimal("0.30")).quantize(Decimal("0.01"))
        remaining_amount = final_total - deposit_amount
    elif order_service_type == "bespoke":
        deposit_amount = (final_total * Decimal("0.50")).quantize(Decimal("0.01"))
        remaining_amount = final_total - deposit_amount

    # Create OrderDB
    order = OrderDB(
        tenant_id=tenant_id,
        customer_id=customer_id,
        customer_name=order_data.customer_name,
        customer_phone=order_data.customer_phone,
        shipping_address=order_data.shipping_address.model_dump(),
        shipping_note=order_data.shipping_note,
        payment_method=order_data.payment_method.value,
        status="pending",
        subtotal_amount=subtotal,
        discount_amount=discount_amount,
        total_amount=final_total,
        applied_voucher_ids=applied_voucher_ids,
        # Story 10.3: Service-type fields
        service_type=order_service_type,
        deposit_amount=deposit_amount,
        remaining_amount=remaining_amount,
    )

    # Story 10.3: Set rental-specific fields
    if order_service_type == "rent" and order_data.rental_fields:
        order.pickup_date = datetime.combine(
            order_data.rental_fields.pickup_date, datetime.min.time()
        ).replace(tzinfo=timezone.utc)
        order.return_date = datetime.combine(
            order_data.rental_fields.return_date, datetime.min.time()
        ).replace(tzinfo=timezone.utc)
        order.security_type = order_data.rental_fields.security_type.value
        order.security_value = order_data.rental_fields.security_value

    order.items = order_items

    db.add(order)
    await db.flush()

    # Story 10.3: Create OrderPaymentDB record
    payment_type = "full" if order_service_type == "buy" else "deposit"
    payment_amount = final_total if order_service_type == "buy" else deposit_amount
    payment_record = OrderPaymentDB(
        tenant_id=tenant_id,
        order_id=order.id,
        payment_type=payment_type,
        amount=payment_amount,
        method=order_data.payment_method.value,
        status="pending",
    )
    db.add(payment_record)

    # Apply vouchers (mark as used, link to order)
    if voucher_apply_data:
        await apply_vouchers_to_order(db, voucher_apply_data, order.id)

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
        subtotal_amount=order.subtotal_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        applied_voucher_ids=[str(v) for v in (order.applied_voucher_ids or [])],
        payment_method=order.payment_method,
        payment_url=payment_url,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order_data.shipping_address,
        shipping_note=order.shipping_note,
        is_internal=False,
        items=response_items,
        created_at=order.created_at,
        service_type=order.service_type,
        deposit_amount=order.deposit_amount,
        remaining_amount=order.remaining_amount,
        security_type=order.security_type,
        security_value=order.security_value,
        pickup_date=order.pickup_date,
        return_date=order.return_date,
    )


async def create_internal_order(
    db: AsyncSession,
    order_data: InternalOrderCreate,
    owner: UserDB,
    tenant_id: UUID,
) -> OrderResponse:
    """Create an internal production order (Owner only).

    Skips shipping/payment. Auto-fills customer info from Owner profile.
    Status goes directly to in_progress.
    """
    # Reject any rent items — internal orders are buy-only
    for item in order_data.items:
        if item.transaction_type != "buy":
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_INTERNAL_BUY_ONLY",
                        "message": "Don noi bo chi ho tro mua (buy), khong ho tro thue (rent)",
                    }
                },
            )

    order_items, item_details, total_amount = await _validate_and_price_items(
        db, order_data.items, tenant_id, skip_availability_check=True
    )

    customer_name = owner.full_name or owner.email
    customer_phone = owner.phone or "N/A"

    order = OrderDB(
        tenant_id=tenant_id,
        customer_id=owner.id,
        customer_name=customer_name,
        customer_phone=customer_phone,
        shipping_address=None,
        shipping_note=order_data.notes,
        payment_method="internal",
        status="confirmed",
        payment_status="paid",
        is_internal=True,
        subtotal_amount=total_amount,
        discount_amount=Decimal("0"),
        total_amount=total_amount,
        applied_voucher_ids=[],
    )
    order.items = order_items

    db.add(order)
    await db.flush()
    await db.commit()
    await db.refresh(order)

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
        subtotal_amount=order.subtotal_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        applied_voucher_ids=[str(v) for v in (order.applied_voucher_ids or [])],
        payment_method=order.payment_method,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=None,
        shipping_note=order.shipping_note,
        is_internal=True,
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
        subtotal_amount=order.subtotal_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        applied_voucher_ids=[str(v) for v in (order.applied_voucher_ids or [])],
        payment_method=order.payment_method,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order.shipping_address,
        shipping_note=order.shipping_note,
        is_internal=order.is_internal,
        items=response_items,
        created_at=order.created_at,
        service_type=order.service_type,
        deposit_amount=order.deposit_amount,
        remaining_amount=order.remaining_amount,
        security_type=order.security_type,
        security_value=order.security_value,
        pickup_date=order.pickup_date,
        return_date=order.return_date,
    )


# ---------------------------------------------------------------------------
# Story 4.2: Order list & status update
# ---------------------------------------------------------------------------

# Valid forward-only transition matrix
# Note: branching statuses (preparing, confirmed) are handled by dedicated service functions.
# pending transitions via approve_order() (Story 10.4), not update_order_status().
_VALID_TRANSITIONS: dict[str, str | None] = {
    "pending": None,            # transitions via approve_order() only (Story 10.4)
    "confirmed": None,         # auto → in_progress via task assignment; or → preparing via approve
    "in_progress": "checked",  # requires all tailor tasks completed
    "checked": "shipped",      # requires paid or COD
    "shipped": "delivered",
    "delivered": "completed",  # Story 10.6: buy/bespoke → completed; rent → renting (Story 10.7)
    "cancelled": None,
    # Epic 10: new statuses (Stories 10.5–10.7 use update_order_status for these)
    "pending_measurement": "pending",
    "preparing": None,           # branching: → ready_to_ship or → ready_for_pickup (Story 10.5)
    "ready_to_ship": "shipped",
    "ready_for_pickup": "delivered",
    "in_production": "ready_to_ship",
    "renting": "returned",
    "returned": "completed",
    "completed": None,
}


async def _all_tailor_tasks_completed(db: AsyncSession, order_id: UUID) -> bool:
    """Check if all tailor tasks for an order are completed."""
    task_result = await db.execute(
        select(
            func.count(TailorTaskDB.id),
            func.count(TailorTaskDB.id).filter(TailorTaskDB.status == "completed"),
        ).where(TailorTaskDB.order_id == order_id)
    )
    total_tasks, completed_tasks = task_result.one()
    return total_tasks > 0 and total_tasks == completed_tasks


def _payment_ok(payment_status: str, payment_method: str) -> bool:
    """Check if payment is settled (paid) or COD."""
    return payment_status == "paid" or payment_method == "cod"


def _is_remaining_unpaid(o: OrderDB) -> bool:
    """Check if order has unpaid remaining amount (excludes COD/internal)."""
    return bool(
        o.remaining_amount
        and o.remaining_amount > 0
        and o.payment_status != "paid"
        and o.payment_method not in ("cod", "internal")
    )


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

    if params.is_internal is not None:
        query = query.where(OrderDB.is_internal == params.is_internal)

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

    # Batch-check readiness for in_progress (→ checked) and checked (→ shipped)
    checkable_ids: set[UUID] = set()
    shippable_ids: set[UUID] = set()
    for o in orders:
        if o.status == "in_progress":
            if await _all_tailor_tasks_completed(db, o.id):
                checkable_ids.add(o.id)
        elif o.status == "checked":
            if _payment_ok(o.payment_status, o.payment_method):
                shippable_ids.add(o.id)

    def _next_status(o: OrderDB) -> str | None:
        # pending uses approve_order() — no generic next status button shown
        if o.status in ("cancelled", "confirmed", "pending",
                        "completed", "preparing", "renting", "returned"):
            return None
        if o.status == "in_progress":
            return "checked" if o.id in checkable_ids else None
        if o.status == "checked":
            return "shipped" if o.id in shippable_ids else None
        # Story 10.6: ready_to_ship/ready_for_pickup blocked if remaining unpaid
        if o.status == "ready_to_ship":
            return None if _is_remaining_unpaid(o) else "shipped"
        if o.status == "ready_for_pickup":
            return None if _is_remaining_unpaid(o) else "delivered"
        if o.status == "shipped":
            return "delivered"
        if o.status == "delivered":
            return "completed" if o.service_type != "rent" else None
        return _VALID_TRANSITIONS.get(o.status)

    items = [
        OrderListItem(
            id=o.id,
            status=o.status,
            payment_status=o.payment_status,
            subtotal_amount=o.subtotal_amount,
            discount_amount=o.discount_amount,
            total_amount=o.total_amount,
            payment_method=o.payment_method,
            customer_name=o.customer_name,
            customer_phone=o.customer_phone,
            is_internal=o.is_internal,
            transaction_types=list({item.transaction_type for item in o.items}),
            created_at=o.created_at,
            next_valid_status=_next_status(o),
            service_type=ServiceType(o.service_type) if o.service_type else ServiceType.buy,
            preparation_step=o.preparation_step,
            remaining_amount=o.remaining_amount,
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
        if current_status in ("delivered", "cancelled", "completed"):
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

    # Guard: in_progress → checked requires all tailor tasks completed
    if current_status == "in_progress" and new_status == "checked":
        if not await _all_tailor_tasks_completed(db, order.id):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_CHECK_NOT_READY",
                        "message": "Chưa thể kiểm tra: cần tất cả thợ may đã hoàn thành công việc",
                    }
                },
            )

    # Guard: checked → shipped requires payment settled or COD
    if current_status == "checked" and new_status == "shipped":
        if not _payment_ok(order.payment_status, order.payment_method):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_SHIP_NOT_READY",
                        "message": "Chưa thể gửi đi: cần đã thanh toán (hoặc COD)",
                    }
                },
            )

    # Guard: ready_to_ship → shipped / ready_for_pickup → delivered requires remaining payment (Story 10.6)
    _handover_guard = (
        (current_status == "ready_to_ship" and new_status == "shipped")
        or (current_status == "ready_for_pickup" and new_status == "delivered")
    )
    if _handover_guard:
        if _is_remaining_unpaid(order):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_REMAINING_UNPAID",
                        "message": "Chưa thể giao hàng: khách hàng chưa thanh toán phần còn lại.",
                    }
                },
            )

    # Guard: delivered → completed blocked for rent orders (Story 10.7 will handle rent flow)
    if current_status == "delivered" and new_status == "completed":
        if order.service_type == "rent":
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_INVALID_TRANSITION",
                        "message": "Đơn thuê cần qua giai đoạn cho thuê trước khi hoàn tất.",
                    }
                },
            )

    # Refund vouchers on cancellation
    if new_status == "cancelled" and order.applied_voucher_ids:
        await refund_vouchers_for_order(db, order.id, tenant_id=order.tenant_id)

    order.status = new_status
    order.updated_at = datetime.now(timezone.utc)
    # Capture fields before commit (for notification, since session may expire objects)
    _customer_id = order.customer_id
    _tenant_id = order.tenant_id
    _order_id_str = str(order.id)
    _order_code = _build_order_code(order.id, order.created_at)
    _is_internal = order.is_internal
    await db.flush()
    await db.commit()

    # Story 4.4f: Create in-app notification for authenticated customers
    # Suppress notifications for internal orders (F11)
    if _customer_id is not None and new_status in ORDER_STATUS_MESSAGES and not _is_internal:
        try:
            title, msg_template = ORDER_STATUS_MESSAGES[new_status]
            message = msg_template.format(order_code=_order_code)
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
        subtotal_amount=order.subtotal_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        applied_voucher_ids=[str(v) for v in (order.applied_voucher_ids or [])],
        payment_method=order.payment_method,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order.shipping_address,
        shipping_note=order.shipping_note,
        is_internal=order.is_internal,
        items=response_items,
        created_at=order.created_at,
        service_type=order.service_type,
        deposit_amount=order.deposit_amount,
        remaining_amount=order.remaining_amount,
        security_type=order.security_type,
        security_value=order.security_value,
        pickup_date=order.pickup_date,
        return_date=order.return_date,
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
        subtotal_amount=order.subtotal_amount,
        discount_amount=order.discount_amount,
        total_amount=order.total_amount,
        applied_voucher_ids=[str(v) for v in (order.applied_voucher_ids or [])],
        payment_method=order.payment_method,
        customer_name=order.customer_name,
        customer_phone=order.customer_phone,
        shipping_address=order.shipping_address,
        shipping_note=order.shipping_note,
        is_internal=order.is_internal,
        items=response_items,
        created_at=order.created_at,
        service_type=order.service_type,
        deposit_amount=order.deposit_amount,
        remaining_amount=order.remaining_amount,
        security_type=order.security_type,
        security_value=order.security_value,
        pickup_date=order.pickup_date,
        return_date=order.return_date,
    )

    return order_response, transactions


async def approve_order(
    db: AsyncSession,
    order_id: UUID,
    tenant_id: UUID,
    owner_id: UUID,
    request: ApproveOrderRequest,
) -> ApproveOrderResponse:
    """Approve a pending order and auto-route based on service type (Story 10.4).

    Business rules:
    - Order must be status='pending' and belong to tenant.
    - Bespoke orders require assigned_to (tailor UUID) in request.
    - Bespoke: pending→confirmed→in_progress (via create_task side-effect) + TailorTask created.
    - Rent/Buy: pending→confirmed→preparing.
    - Customer notification sent after routing.

    All transitions happen atomically in a single DB transaction.
    """
    # Import here to avoid circular import at module level
    from src.services.tailor_task_service import create_task
    from src.models.tailor_task import TaskCreateRequest

    # Fetch and lock order for update
    result = await db.execute(
        select(OrderDB)
        .options(selectinload(OrderDB.items).selectinload(OrderItemDB.garment))
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

    if order.status != "pending":
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_INVALID_STATUS",
                    "message": f"Chỉ có thể phê duyệt đơn hàng ở trạng thái chờ xác nhận. Trạng thái hiện tại: '{order.status}'",
                }
            },
        )

    service_type = order.service_type or "buy"

    # Bespoke orders require tailor assignment
    if service_type == "bespoke" and request.assigned_to is None:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_TAILOR_REQUIRED",
                    "message": "Đơn đặt may cần chỉ định thợ may (assigned_to) khi phê duyệt",
                }
            },
        )

    # Capture fields before any mutations (for notification after commit)
    _customer_id = order.customer_id
    _tenant_id = order.tenant_id
    _order_id_str = str(order.id)
    _order_code = _build_order_code(order.id, order.created_at)
    _is_internal = order.is_internal

    # Step 1: Transition pending → confirmed
    order.status = "confirmed"
    order.updated_at = datetime.now(timezone.utc)
    await db.flush()  # Flush so create_task() sees 'confirmed'

    task_id: UUID | None = None

    if service_type == "bespoke":
        # Step 2a (bespoke): Build measurement notes for TailorTask
        measurement_notes = request.notes or ""
        if order.customer_id:
            try:
                measurement_data = await check_customer_measurement(db, order.customer_id, tenant_id)
                if measurement_data.get("has_measurements") and measurement_data.get("measurements_summary"):
                    summary = measurement_data["measurements_summary"]
                    lines = ["[Số đo khách hàng đã xác nhận]"]
                    field_labels = {
                        "neck": "Cổ",
                        "shoulder_width": "Rộng vai",
                        "bust": "Vòng ngực",
                        "waist": "Eo",
                        "hip": "Hông",
                        "top_length": "Dài thân",
                        "height": "Chiều cao",
                    }
                    for field, label in field_labels.items():
                        val = summary.get(field)
                        if val is not None:
                            lines.append(f"  {label}: {val} cm")
                    measurement_notes = "\n".join(lines)
                    if request.notes:
                        measurement_notes = f"{measurement_notes}\n\nGhi chú: {request.notes}"
            except Exception:
                logger.warning("Could not load measurement data for bespoke task, continuing without it")
                measurement_notes = request.notes or ""

        # Step 2b (bespoke): Create TailorTask — auto-transitions confirmed → in_progress
        task_request = TaskCreateRequest(
            order_id=order_id,
            assigned_to=request.assigned_to,
            notes=measurement_notes if measurement_notes else None,
        )
        try:
            task_item = await create_task(db, task_request, owner_id, tenant_id)
            task_id = UUID(task_item.id)
        except ValueError as e:
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_TASK_CREATION_FAILED",
                        "message": str(e),
                    }
                },
            ) from e
        except PermissionError as e:
            raise HTTPException(
                status_code=403,
                detail={
                    "error": {
                        "code": "ERR_PERMISSION_DENIED",
                        "message": str(e),
                    }
                },
            ) from e
        except Exception as e:
            logger.error("Unexpected error creating bespoke task for order %s: %s", _order_id_str, e)
            raise HTTPException(
                status_code=500,
                detail={
                    "error": {
                        "code": "ERR_TASK_CREATION_FAILED",
                        "message": "Không thể tạo công việc cho thợ may. Vui lòng thử lại.",
                    }
                },
            ) from e

        # create_task() already committed (pending→confirmed→in_progress + task)
        new_status = "in_progress"
        routing_destination = "tailor"

        # Customer notification (new transaction since create_task committed)
        if _customer_id is not None and not _is_internal:
            try:
                title, msg_template = ORDER_APPROVED_BESPOKE_MESSAGE
                message = msg_template.format(order_code=_order_code)
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
                logger.warning("Failed to create approval notification for bespoke order %s", _order_id_str)

    else:
        # Step 2b (rent/buy): Transition confirmed → preparing + init sub-step (Story 10.5)
        order.status = "preparing"
        order.preparation_step = RENT_PREP_STEPS[0] if service_type == "rent" else BUY_PREP_STEPS[0]
        order.updated_at = datetime.now(timezone.utc)
        await db.flush()
        await db.commit()

        new_status = "preparing"
        routing_destination = "warehouse"

        # Customer notification (new transaction after commit)
        if _customer_id is not None and not _is_internal:
            try:
                title, msg_template = ORDER_APPROVED_WAREHOUSE_MESSAGE
                message = msg_template.format(order_code=_order_code)
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
                logger.warning("Failed to create approval notification for order %s", _order_id_str)

    return ApproveOrderResponse(
        order_id=order_id,
        new_status=new_status,
        service_type=service_type,
        routing_destination=routing_destination,
        task_id=task_id,
    )


async def update_preparation_step(
    db: AsyncSession,
    order_id: UUID,
    tenant_id: UUID,
    request: UpdatePreparationStepRequest,
) -> UpdatePreparationStepResponse:
    """Advance preparation sub-step for a Buy/Rent order in 'preparing' status (Story 10.5).

    Business rules:
    - Order must be status='preparing' and belong to tenant.
    - Forward-only transitions within service-type-specific step list.
    - On last step: delivery_mode required ('ship' or 'pickup') to transition out of preparing.
    - Customer notification sent when order becomes ready.
    """
    result = await db.execute(
        select(OrderDB)
        .where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
        .with_for_update()
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ERR_ORDER_NOT_FOUND", "message": "Đơn hàng không tồn tại"}},
        )

    if order.status != "preparing":
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_INVALID_STATUS",
                    "message": f"Chỉ có thể cập nhật bước chuẩn bị khi đơn hàng ở trạng thái 'preparing'. Trạng thái hiện tại: '{order.status}'",
                }
            },
        )

    # Patch #4: Raise error if service_type is missing (data integrity)
    service_type = order.service_type
    if not service_type:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_MISSING_SERVICE_TYPE",
                    "message": "Đơn hàng thiếu loại dịch vụ (service_type). Vui lòng liên hệ quản trị viên.",
                }
            },
        )
    steps = RENT_PREP_STEPS if service_type == "rent" else BUY_PREP_STEPS

    # Patch #5: Explicit None check with clear error message
    current_step = order.preparation_step
    if current_step is None:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_PREP_NOT_INITIALIZED",
                    "message": "Bước chuẩn bị chưa được khởi tạo cho đơn hàng này. Vui lòng liên hệ quản trị viên.",
                }
            },
        )
    if current_step not in steps:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_INVALID_STEP",
                    "message": f"Bước chuẩn bị hiện tại '{current_step}' không hợp lệ cho loại dịch vụ '{service_type}'",
                }
            },
        )

    new_step = request.preparation_step
    if new_step not in steps:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_INVALID_STEP",
                    "message": f"Bước '{new_step}' không hợp lệ cho loại dịch vụ '{service_type}'. Các bước hợp lệ: {', '.join(steps)}",
                }
            },
        )

    current_index = steps.index(current_step)
    new_index = steps.index(new_step)

    # Patch #11 + Decision 1A: Strictly sequential — must advance exactly +1
    if new_index == current_index:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_SAME_STEP",
                    "message": f"Đơn hàng đã ở bước '{current_step}'. Vui lòng chọn bước tiếp theo.",
                }
            },
        )
    if new_index < current_index:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_BACKWARD_STEP",
                    "message": f"Chuyển bước không hợp lệ: '{current_step}' → '{new_step}'. Chỉ được chuyển tiếp, không được quay lại.",
                }
            },
        )
    if new_index != current_index + 1:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_SKIP_STEP",
                    "message": f"Không được bỏ qua bước. Bước tiếp theo phải là '{steps[current_index + 1]}', không phải '{new_step}'.",
                }
            },
        )

    # Capture before mutation
    _customer_id = order.customer_id
    _tenant_id = order.tenant_id
    _order_id_str = str(order.id)
    _order_code = _build_order_code(order.id, order.created_at)
    _is_internal = order.is_internal

    is_last_step = new_index == len(steps) - 1
    is_completed = False

    if is_last_step:
        # Last step reached — transition out of preparing
        delivery_mode = request.delivery_mode
        if delivery_mode not in ("ship", "pickup"):
            raise HTTPException(
                status_code=422,
                detail={
                    "error": {
                        "code": "ERR_DELIVERY_MODE_REQUIRED",
                        "message": "Cần chọn hình thức giao hàng (ship/pickup) khi hoàn thành bước chuẩn bị cuối cùng.",
                    }
                },
            )

        new_status = "ready_to_ship" if delivery_mode == "ship" else "ready_for_pickup"
        order.status = new_status
        order.preparation_step = None
        order.updated_at = datetime.now(timezone.utc)
        is_completed = True
    else:
        order.preparation_step = new_step
        order.updated_at = datetime.now(timezone.utc)

    # Patch #1: Create notification before commit for atomicity
    delivery_mode = request.delivery_mode  # safe to read here; validated above if is_last_step
    if is_completed and _customer_id is not None and not _is_internal:
        try:
            msg_tuple = ORDER_READY_SHIP_MESSAGE if delivery_mode == "ship" else ORDER_READY_PICKUP_MESSAGE
            title, msg_template = msg_tuple
            message = msg_template.format(order_code=_order_code)
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
            logger.warning("Failed to create ready notification for order %s", _order_id_str)

    await db.flush()
    await db.commit()

    return UpdatePreparationStepResponse(
        order_id=order_id,
        preparation_step=order.preparation_step,
        status=order.status,
        service_type=service_type,
        is_completed=is_completed,
    )


# ---------------------------------------------------------------------------
# Story 10.6: Remaining Payment
# ---------------------------------------------------------------------------


async def pay_remaining(
    db: AsyncSession,
    order_id: UUID,
    tenant_id: UUID,
    customer_id: UUID,
    payment_method: str = "vnpay",
) -> PayRemainingResponse:
    """Initiate remaining payment for an order ready for delivery (Story 10.6).

    Business rules:
    - Order must be status in (ready_to_ship, ready_for_pickup) and belong to tenant.
    - remaining_amount must be > 0 (else 422 ERR_ALREADY_PAID).
    - Creates OrderPaymentDB (type='remaining', status='pending').
    - Returns mock payment URL for gateway redirect.
    """
    result = await db.execute(
        select(OrderDB)
        .where(OrderDB.id == order_id, OrderDB.tenant_id == tenant_id)
        .with_for_update()
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ERR_ORDER_NOT_FOUND", "message": "Đơn hàng không tồn tại"}},
        )

    # Validate customer owns this order
    if order.customer_id != customer_id:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "ERR_ORDER_NOT_FOUND", "message": "Đơn hàng không tồn tại"}},
        )

    # Validate status
    if order.status not in ("ready_to_ship", "ready_for_pickup"):
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_INVALID_STATUS",
                    "message": f"Chỉ có thể thanh toán còn lại khi đơn hàng ở trạng thái sẵn sàng giao/nhận. Trạng thái hiện tại: '{order.status}'",
                }
            },
        )

    # P11 fix: Reject COD/internal for remaining payment (they bypass payment guard)
    if payment_method in ("cod", "internal"):
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_INVALID_PAYMENT_METHOD",
                    "message": "Phương thức thanh toán không hợp lệ cho thanh toán còn lại. Vui lòng chọn VNPay hoặc MoMo.",
                }
            },
        )

    # Validate remaining amount
    if not order.remaining_amount or order.remaining_amount <= 0:
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_ALREADY_PAID",
                    "message": "Đơn hàng đã thanh toán đầy đủ, không cần thanh toán thêm.",
                }
            },
        )

    # P1 fix: Idempotency — check for existing pending remaining payment
    existing_pending = await db.execute(
        select(OrderPaymentDB).where(
            OrderPaymentDB.order_id == order.id,
            OrderPaymentDB.payment_type == "remaining",
            OrderPaymentDB.status == "pending",
        )
    )
    existing_record = existing_pending.scalar_one_or_none()

    if existing_record is not None:
        # Return existing payment URL instead of creating duplicate
        payment_url = f"/checkout/confirmation?orderId={order.id}&paymentType=remaining&status=success"
        return PayRemainingResponse(
            order_id=order.id,
            payment_url=payment_url,
            amount=existing_record.amount,
            payment_type="remaining",
        )

    # Capture before commit (P4 fix: avoid DetachedInstanceError)
    _remaining_amount = order.remaining_amount

    # Create OrderPaymentDB record (type='remaining')
    payment_record = OrderPaymentDB(
        tenant_id=tenant_id,
        order_id=order.id,
        payment_type="remaining",
        amount=_remaining_amount,
        method=payment_method,
        status="pending",
    )
    db.add(payment_record)

    # Generate mock payment URL (same pattern as order creation)
    payment_url = f"/checkout/confirmation?orderId={order.id}&paymentType=remaining&status=success"

    await db.flush()
    await db.commit()

    return PayRemainingResponse(
        order_id=order.id,
        payment_url=payment_url,
        amount=_remaining_amount,
        payment_type="remaining",
    )


async def check_customer_measurement(
    db: AsyncSession, customer_id: UUID, tenant_id: UUID
) -> dict:
    """Check if customer has valid measurements for bespoke gate (Story 10.2).

    Looks up CustomerProfileDB by user_id, then finds default MeasurementDB.

    Args:
        db: Database session
        customer_id: User ID (from JWT token, NOT customer_profile_id)
        tenant_id: Tenant ID for multi-tenant isolation

    Returns:
        Dict with has_measurements, last_updated, measurements_summary
    """
    from src.models.db_models import CustomerProfileDB

    # Step 1: Find customer profile by user_id
    profile_result = await db.execute(
        select(CustomerProfileDB).where(
            CustomerProfileDB.user_id == customer_id,
            CustomerProfileDB.tenant_id == tenant_id,
            CustomerProfileDB.is_deleted == False,  # noqa: E712
        )
    )
    profile = profile_result.scalar_one_or_none()

    if profile is None:
        return {"has_measurements": False, "last_updated": None, "measurements_summary": None}

    # Step 2: Get default measurement via existing service
    from src.services.measurement_service import get_default_measurement

    measurement = await get_default_measurement(db, profile.id, tenant_id)

    if measurement is None:
        return {"has_measurements": False, "last_updated": None, "measurements_summary": None}

    return {
        "has_measurements": True,
        "last_updated": measurement.updated_at or measurement.created_at,
        "measurements_summary": {
            "neck": float(measurement.neck) if measurement.neck else None,
            "shoulder_width": float(measurement.shoulder_width) if measurement.shoulder_width else None,
            "bust": float(measurement.bust) if measurement.bust else None,
            "waist": float(measurement.waist) if measurement.waist else None,
            "hip": float(measurement.hip) if measurement.hip else None,
            "top_length": float(measurement.top_length) if measurement.top_length else None,
            "height": float(measurement.height) if measurement.height else None,
        },
    }
