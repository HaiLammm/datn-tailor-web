"""Pydantic models for notifications (Story 4.4f)."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationType(str, Enum):
    ORDER_STATUS = "order_status"
    APPOINTMENT = "appointment"
    RETURN_REMINDER = "return_reminder"
    PAYMENT = "payment"
    SYSTEM = "system"


class NotificationResponse(BaseModel):
    """Response schema for a single notification."""

    id: UUID
    type: NotificationType
    title: str
    message: str
    data: dict = {}
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
