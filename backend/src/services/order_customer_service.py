"""Customer-facing order service (Story 4.4c).

Queries orders filtered by customer_id for the authenticated customer.
Provides list, detail, and timeline generation.
"""

import math
from datetime import datetime, timedelta, timezone
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, or_, select, String
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.db_models import GarmentDB, OrderDB, OrderItemDB, TailorTaskDB, UserDB
from src.models.order import OrderStatus
from src.models.order_customer import (
    CustomerOrderDeliveryInfo,
    CustomerOrderDetail,
    CustomerOrderItemResponse,
    CustomerOrderListMeta,
    CustomerOrderListResponse,
    CustomerOrderSummary,
    OrderTimelineEntry,
    TailorInfoForCustomer,
)

# Default tenant (all orders use this tenant)
DEFAULT_TENANT_ID = UUID("00000000-0000-0000-0000-000000000001")

# Status display order for timeline — per service type (Epic 10)
_STATUS_ORDER_BUY = [
    "pending", "confirmed", "preparing", "ready_to_ship", "shipped", "delivered", "completed",
]
_STATUS_ORDER_BUY_PICKUP = [
    "pending", "confirmed", "preparing", "ready_for_pickup", "delivered", "completed",
]
_STATUS_ORDER_RENT = [
    "pending", "confirmed", "preparing", "ready_to_ship", "shipped", "delivered",
    "renting", "returned", "completed",
]
_STATUS_ORDER_RENT_PICKUP = [
    "pending", "confirmed", "preparing", "ready_for_pickup", "delivered",
    "renting", "returned", "completed",
]
_STATUS_ORDER_BESPOKE = [
    "pending", "confirmed", "in_progress", "in_production", "checked",
    "ready_to_ship", "shipped", "delivered", "completed",
]
# Legacy fallback (pre-Epic 10 orders without service_type)
_STATUS_ORDER = ["pending", "confirmed", "in_progress", "checked", "shipped", "delivered"]

_STATUS_LABELS: dict[str, str] = {
    "pending": "Đơn hàng được tạo",
    "confirmed": "Đơn hàng được xác nhận",
    "in_progress": "Đang may đo",
    "checked": "Đã kiểm tra hoàn thành",
    "shipped": "Đã giao cho đơn vị vận chuyển",
    "delivered": "Giao hàng thành công",
    "cancelled": "Đơn hàng đã bị hủy",
    "returned": "Sản phẩm đã được trả lại",
    "pending_measurement": "Chờ xác nhận số đo",
    "preparing": "Đang chuẩn bị",
    "ready_to_ship": "Sẵn sàng giao hàng",
    "ready_for_pickup": "Sẵn sàng nhận tại tiệm",
    "in_production": "Đang sản xuất",
    "renting": "Khách đang thuê",
    "completed": "Hoàn tất",
}


def _build_order_number(order_id: UUID, created_at: datetime) -> str:
    """Generate human-readable order number from UUID and date."""
    date_part = created_at.strftime("%Y%m%d")
    uid_part = str(order_id).replace("-", "").upper()[:6]
    return f"ORD-{date_part}-{uid_part}"


def _determine_order_type(items: list[OrderItemDB]) -> str:
    """Determine order type from items: 'buy', 'rental', or 'mixed'."""
    types = {item.transaction_type for item in items}
    if types == {"buy"}:
        return "buy"
    if types == {"rent"}:
        return "rental"
    return "mixed"


def _get_status_order(service_type: str | None, current_status: str) -> list[str]:
    """Return status progression list for the given service type."""
    if service_type == "bespoke":
        return _STATUS_ORDER_BESPOKE
    if service_type == "rent":
        if current_status in ("ready_for_pickup", "delivered") and current_status not in _STATUS_ORDER_RENT:
            return _STATUS_ORDER_RENT_PICKUP
        return _STATUS_ORDER_RENT
    if service_type == "buy":
        if current_status in ("ready_for_pickup",):
            return _STATUS_ORDER_BUY_PICKUP
        return _STATUS_ORDER_BUY
    # Legacy fallback
    return _STATUS_ORDER


def _build_timeline(
    current_status: str,
    created_at: datetime,
    updated_at: datetime,
    service_type: str | None = None,
) -> list[OrderTimelineEntry]:
    """Build synthetic timeline from order status and timestamps.

    Since we don't store status history, we interpolate timestamps
    between created_at and updated_at.
    """
    entries: list[OrderTimelineEntry] = []

    if current_status == "cancelled":
        entries.append(
            OrderTimelineEntry(
                status="pending",
                timestamp=created_at,
                description=_STATUS_LABELS["pending"],
            )
        )
        entries.append(
            OrderTimelineEntry(
                status="cancelled",
                timestamp=updated_at,
                description=_STATUS_LABELS["cancelled"],
            )
        )
        return entries

    status_order = _get_status_order(service_type, current_status)

    # Find index of current status in progression
    # If status is unknown, show only pending and the current status
    if current_status in status_order:
        current_idx = status_order.index(current_status)
        statuses_passed = status_order[: current_idx + 1]
    else:
        # Unknown status: show pending + current status
        statuses_passed = ["pending", current_status]

    if len(statuses_passed) == 1:
        # Only pending
        entries.append(
            OrderTimelineEntry(
                status="pending",
                timestamp=created_at,
                description=_STATUS_LABELS["pending"],
            )
        )
        return entries

    # Interpolate timestamps between created_at and updated_at
    total_delta = (updated_at - created_at).total_seconds()
    step_seconds = total_delta / max(len(statuses_passed) - 1, 1)

    for i, status in enumerate(statuses_passed):
        if i == 0:
            ts = created_at
        elif i == len(statuses_passed) - 1:
            ts = updated_at
        else:
            ts = created_at + timedelta(seconds=step_seconds * i)

        entries.append(
            OrderTimelineEntry(
                status=status,
                timestamp=ts,
                description=_STATUS_LABELS.get(status, status),
            )
        )

    return entries


def _build_delivery_info(order: OrderDB) -> CustomerOrderDeliveryInfo:
    """Build delivery info from order shipping_address dict."""
    addr = order.shipping_address or {}
    parts = [
        addr.get("address_detail", ""),
        addr.get("ward", ""),
        addr.get("district", ""),
        addr.get("province", ""),
    ]
    address_str = ", ".join(p for p in parts if p)

    return CustomerOrderDeliveryInfo(
        recipient_name=order.customer_name,
        phone=order.customer_phone,
        address=address_str or "Chưa có địa chỉ",
        notes=order.shipping_note,
    )


async def get_customer_orders(
    db: AsyncSession,
    customer_id: UUID,
    *,
    page: int = 1,
    limit: int = 10,
    status: str | None = None,
    order_type: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    search: str | None = None,
) -> CustomerOrderListResponse:
    """Return paginated order list for the given customer."""
    query = (
        select(OrderDB)
        .where(
            OrderDB.customer_id == customer_id,
            OrderDB.tenant_id == DEFAULT_TENANT_ID,
        )
        .options(selectinload(OrderDB.items).selectinload(OrderItemDB.garment))
    )

    # -- filters --
    if status:
        # Validate status against OrderStatus enum
        try:
            valid_status = OrderStatus(status)
            query = query.where(OrderDB.status == valid_status)
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail={
                    "error": {
                        "code": "ERR_INVALID_STATUS",
                        "message": f"Invalid status value. Must be one of: {', '.join(s.value for s in OrderStatus)}",
                    }
                },
            )

    if order_type:
        # 'buy' → items all 'buy'; 'rental' → items all 'rent'
        tx_val = "rent" if order_type == "rental" else order_type
        query = query.where(
            OrderDB.id.in_(
                select(OrderItemDB.order_id).where(
                    OrderItemDB.transaction_type == tx_val
                )
            )
        )

    if date_from:
        try:
            dt_from = datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc)
            query = query.where(OrderDB.created_at >= dt_from)
        except ValueError:
            pass

    if date_to:
        try:
            dt_to = datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc)
            query = query.where(OrderDB.created_at <= dt_to)
        except ValueError:
            pass

    if search:
        # Search by order UUID prefix - escape wildcards for LIKE
        uid_str = search.strip().replace("%", "\\%").replace("_", "\\_")
        query = query.where(
            OrderDB.id.cast(String).ilike(f"%{uid_str}%", escape="\\")
        )

    # -- count --
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # -- sort & paginate --
    query = query.order_by(OrderDB.created_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)

    rows = (await db.execute(query)).scalars().all()

    items = [
        CustomerOrderSummary(
            id=o.id,
            order_number=_build_order_number(o.id, o.created_at),
            total_amount=o.total_amount,
            status=o.status,
            payment_status=o.payment_status,
            order_type=_determine_order_type(o.items),
            created_at=o.created_at,
        )
        for o in rows
    ]

    total_pages = max(1, math.ceil(total / limit))

    return CustomerOrderListResponse(
        data=items,
        meta=CustomerOrderListMeta(
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
        ),
    )


async def get_order_detail(
    db: AsyncSession,
    order_id: UUID,
    customer_id: UUID,
) -> CustomerOrderDetail:
    """Return full order detail for the given customer.

    Validates that the order belongs to the customer (ownership check).
    """
    result = await db.execute(
        select(OrderDB)
        .where(
            OrderDB.id == order_id,
            OrderDB.customer_id == customer_id,
            OrderDB.tenant_id == DEFAULT_TENANT_ID,
        )
        .options(selectinload(OrderDB.items).selectinload(OrderItemDB.garment))
    )
    order = result.scalar_one_or_none()

    if order is None:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ERR_ORDER_NOT_FOUND",
                    "message": "Đơn hàng không tồn tại hoặc không thuộc về tài khoản của bạn",
                }
            },
        )

    item_responses = [
        CustomerOrderItemResponse(
            garment_id=item.garment_id,
            garment_name=item.garment.name if item.garment else "Sản phẩm không xác định",
            image_url=item.garment.image_url if item.garment else None,
            transaction_type=item.transaction_type,
            size=item.size,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=item.total_price,
            start_date=item.start_date,
            end_date=item.end_date,
            rental_days=item.rental_days,
            rental_status=item.rental_status,
            deposit_amount=item.deposit_amount,
        )
        for item in order.items
    ]

    timeline = _build_timeline(order.status, order.created_at, order.updated_at, order.service_type)
    delivery_info = _build_delivery_info(order)

    # Query tailor tasks for this order (privacy-safe fields only)
    task_query = (
        select(TailorTaskDB, UserDB)
        .join(UserDB, TailorTaskDB.assigned_to == UserDB.id)
        .where(TailorTaskDB.order_id == order.id)
    )
    task_results = (await db.execute(task_query)).all()

    tailor_info: list[TailorInfoForCustomer] | None = None
    if task_results:
        tailor_info = [
            TailorInfoForCustomer(
                full_name=user.full_name or "Thợ may",
                avatar_url=user.avatar_url,
                role=user.role,
                experience_years=user.experience_years,
                production_step=task.production_step,
                garment_name=task.garment_name,
            )
            for task, user in task_results
        ]

    return CustomerOrderDetail(
        id=order.id,
        order_number=_build_order_number(order.id, order.created_at),
        total_amount=order.total_amount,
        status=order.status,
        payment_status=order.payment_status,
        order_type=_determine_order_type(order.items),
        created_at=order.created_at,
        payment_method=order.payment_method,
        shipping_note=order.shipping_note,
        items=item_responses,
        delivery_info=delivery_info,
        timeline=timeline,
        tailor_info=tailor_info,
        deposit_amount=order.deposit_amount,
        remaining_amount=order.remaining_amount,
    )
