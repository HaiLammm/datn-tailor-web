"""Notification creator service (Story 4.4f).

Central helper for creating in-app notifications.
Called by order, appointment, and return-reminder flows to persist
a notification record for the affected customer.

Usage:
    from src.services.notification_creator import create_notification

    await create_notification(
        db=db,
        user_id=user.id,
        tenant_id=user.tenant_id,
        notification_type="order_status",
        title="Đơn hàng đã xác nhận",
        message="Đơn hàng #ORD-001 đã được xác nhận thành công.",
        data={"order_id": str(order.id)},
    )
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import NotificationDB

# ─── Vietnamese notification message templates ────────────────────────────────

# Triggered when order status changes in order management flow
ORDER_STATUS_MESSAGES: dict[str, tuple[str, str]] = {
    "confirmed": (
        "Đơn hàng đã xác nhận",
        "Đơn hàng {order_code} đã được xác nhận thành công.",
    ),
    "in_progress": (
        "Đơn hàng đang thực hiện",
        "Đơn hàng {order_code} đã được giao cho thợ may và đang thực hiện.",
    ),
    "checked": (
        "Đơn hàng đã kiểm tra",
        "Đơn hàng {order_code} đã được kiểm tra hoàn thành, sẵn sàng gửi đi.",
    ),
    "shipped": (
        "Đơn hàng đã gửi đi",
        "Đơn hàng {order_code} đã được gửi đi. Vui lòng kiểm tra email.",
    ),
    "delivered": (
        "Đơn hàng hoàn thành",
        "Đơn hàng {order_code} đã giao thành công.",
    ),
    "cancelled": (
        "Đơn hàng đã hủy",
        "Đơn hàng {order_code} đã bị hủy.",
    ),
    "completed": (
        "Đơn hàng hoàn tất",
        "Đơn hàng {order_code} đã hoàn tất. Hẹn gặp lại!",
    ),
}

# Triggered when appointment is confirmed or cancelled
APPOINTMENT_MESSAGES: dict[str, tuple[str, str]] = {
    "confirmed": (
        "Lịch hẹn đã xác nhận",
        "Lịch hẹn ngày {date} ({slot}) đã được xác nhận.",
    ),
    "cancelled": (
        "Lịch hẹn đã hủy",
        "Lịch hẹn ngày {date} đã được hủy.",
    ),
    "reminder": (
        "Nhắc nhở lịch hẹn",
        "Bạn có lịch hẹn vào ngày mai {date} ({slot}).",
    ),
}

# Triggered by return reminder cron job
RETURN_REMINDER_MESSAGE = (
    "Nhắc trả đồ thuê",
    "Đồ thuê {garment_name} cần được trả vào ngày mai. Vui lòng liên hệ tiệm nếu cần gia hạn.",
)

# Triggered when Owner assigns production task to Tailor (Story 5.2)
TASK_ASSIGNMENT_MESSAGE = (
    "Công việc mới được giao",
    "Bạn được giao công việc mới: {garment_name} - Hạn chót: {deadline}.",
)

# Triggered when Owner approves order and routes to warehouse/tailor (Story 10.4)
ORDER_APPROVED_WAREHOUSE_MESSAGE = (
    "Đơn hàng đang chuẩn bị",
    "Đơn hàng {order_code} đã được phê duyệt và đang chuẩn bị tại kho.",
)

ORDER_APPROVED_BESPOKE_MESSAGE = (
    "Đơn hàng đặt may đã xác nhận",
    "Đơn hàng {order_code} đã được phê duyệt và giao cho thợ may thực hiện.",
)

# Triggered when order preparation completes and is ready for delivery/pickup (Story 10.5)
ORDER_READY_SHIP_MESSAGE = (
    "Đơn hàng sẵn sàng giao",
    "Đơn hàng {order_code} đã chuẩn bị xong và sẵn sàng giao hàng.",
)

ORDER_READY_PICKUP_MESSAGE = (
    "Đơn hàng sẵn sàng nhận",
    "Đơn hàng {order_code} đã chuẩn bị xong. Vui lòng đến tiệm nhận hàng.",
)

# Triggered when remaining payment is completed (Story 10.6)
ORDER_REMAINING_PAID_MESSAGE = (
    "Thanh toán hoàn tất",
    "Đơn hàng {order_code} đã thanh toán đầy đủ. Cảm ơn bạn!",
)



async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    tenant_id: UUID,
    notification_type: str,
    title: str,
    message: str,
    data: Optional[dict] = None,
) -> NotificationDB:
    """Persist a single in-app notification for a user.

    Args:
        db: Active async DB session.
        user_id: UUID of the target user (authenticated account).
        tenant_id: UUID of the tenant scope.
        notification_type: One of NotificationType enum values.
        title: Short notification title (Vietnamese).
        message: Full notification message (Vietnamese).
        data: Optional JSON payload (e.g. {"order_id": "...", "appointment_id": "..."}).

    Returns:
        The created NotificationDB instance (flushed & committed).
    """
    notification = NotificationDB(
        user_id=user_id,
        tenant_id=tenant_id,
        type=notification_type,
        title=title,
        message=message,
        data=data or {},
        is_read=False,
        created_at=datetime.now(timezone.utc),
    )
    db.add(notification)
    await db.flush()
    await db.commit()
    return notification
