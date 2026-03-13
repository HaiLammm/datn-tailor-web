"""Pydantic schemas for Appointment domain (Story 3.4).

Lịch Book Appointments Tiệm & Khách (Calendar UI).
Supports morning/afternoon slots with max 3 bookings per slot per day.
"""

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


AppointmentSlot = Literal["morning", "afternoon"]
AppointmentStatus = Literal["pending", "confirmed", "cancelled"]


class AppointmentCreate(BaseModel):
    """Input schema for creating a new appointment booking."""

    customer_name: str = Field(..., min_length=2, max_length=255)
    customer_phone: str = Field(..., min_length=10, max_length=20)
    customer_email: EmailStr
    appointment_date: date
    slot: AppointmentSlot
    special_requests: str | None = Field(None, max_length=500)


class AppointmentResponse(BaseModel):
    """Response schema for appointment data."""

    id: UUID
    customer_name: str
    customer_phone: str
    customer_email: str
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
