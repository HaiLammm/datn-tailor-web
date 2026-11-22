"""Pydantic schemas for Appointment domain (Story 3.4).

Lịch Book Appointments Tiệm & Khách (Calendar UI).
Supports morning/afternoon slots with max 3 bookings per slot per day.
"""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator


AppointmentSlot = Literal["morning", "afternoon"]
AppointmentStatus = Literal["pending", "confirmed", "cancelled"]
AppointmentService = Literal["may_do", "thue", "mua", "ao_cuoi", "chua_ro"]

SERVICE_LABELS: dict[str, str] = {
    "may_do": "May đo",
    "thue": "Thuê áo",
    "mua": "Mua áo may sẵn",
    "ao_cuoi": "Áo dài cưới",
    "chua_ro": "Chưa rõ, cần tư vấn",
}


class AppointmentCreate(BaseModel):
    """Input schema for creating a new appointment booking."""

    customer_name: str = Field(..., min_length=2, max_length=255)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    customer_email: EmailStr | None = None
    appointment_date: date
    slot: AppointmentSlot
    service_type: AppointmentService | None = None
    special_requests: str | None = Field(None, max_length=500)

    @field_validator("customer_email", mode="before")
    @classmethod
    def _blank_email_to_none(cls, v):
        """Email là tuỳ chọn: chuỗi rỗng/khoảng trắng coi như không nhập."""
        if isinstance(v, str) and not v.strip():
            return None
        return v


class AppointmentResponse(BaseModel):
    """Response schema for appointment data."""

    id: UUID
    customer_name: str
    customer_phone: str
    customer_email: str | None
    appointment_date: date
    slot: AppointmentSlot
    status: AppointmentStatus
    special_requests: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SlotAvailability(BaseModel):
    """Availability data for a single date's morning/afternoon slots."""

    date: str  # YYYY-MM-DD format
    morning_available: bool
    morning_remaining: int = Field(ge=0)
    afternoon_available: bool
    afternoon_remaining: int = Field(ge=0)
