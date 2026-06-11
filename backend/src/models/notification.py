"""Pydantic models for notifications (Story 4.4f)."""

from datetime import datetime
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class NotificationType(str, Enum):
    # Original five (Story 4.4f)
    ORDER_STATUS = "order_status"
    APPOINTMENT = "appointment"
    RETURN_REMINDER = "return_reminder"
    PAYMENT = "payment"
    SYSTEM = "system"
    # Task workflow (Story 5.2 / 12.2)
    TASK_CREATED = "task_created"
    TASK_ASSIGNED = "task_assigned"
    TASK_ACCEPTED = "task_accepted"
    TASK_REJECTED = "task_rejected"
    TASK_ON_HOLD = "task_on_hold"
    TASK_RESUMED = "task_resumed"
    TASK_REASSIGNED = "task_reassigned"
    TASK_CANCELLATION_REQUEST = "task_cancellation_request"
    TASK_CANCELLATION_RESOLVED = "task_cancellation_resolved"
    # QC (Story 12.2)
    TASK_SUBMITTED_QC = "task_submitted_qc"
    QC_PASSED = "qc_passed"
    QC_FAILED_REWORK = "qc_failed_rework"
    # Fitting loop (Story 12.6)
    FITTING_READY = "fitting_ready"
    FITTING_ALTERATION = "fitting_alteration"
    FITTING_PASSED = "fitting_passed"
    # Alteration warranty (Story 12.7)
    ALTERATION_REQUESTED = "alteration_requested"
    ALTERATION_APPROVED = "alteration_approved"
    ALTERATION_DONE = "alteration_done"


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
