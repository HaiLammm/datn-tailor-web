"""Appointment API Router - Story 3.4: Lịch Book Appointments Tiệm & Khách.

Public endpoints for calendar availability and appointment booking.
No authentication required (guest booking supported).
Multi-tenant isolated by tenant_id (default tenant for now).
"""

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.models.appointment import AppointmentCreate
from src.services import appointment_service

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])


def get_default_tenant_id() -> uuid.UUID:
    """Return default tenant ID for public booking.

    TODO: In production, extract from subdomain or request context.
    """
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.get(
    "/availability",
    response_model=dict,
    summary="Get month availability",
    description="Return slot availability for all days in a given month. Used by calendar frontend.",
)
async def get_month_availability(
    year: int = Query(..., ge=2024, le=2030, description="Year (e.g. 2026)"),
    month: int = Query(..., ge=1, le=12, description="Month (1-12)"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get availability map for an entire month.

    Returns dict keyed by 'YYYY-MM-DD' with morning/afternoon slot data.
    Frontend uses this to render the booking calendar.

    Returns:
        API Response Wrapper: {"data": {"YYYY-MM-DD": {...}, ...}, "meta": {}}
    """
    tenant_id = get_default_tenant_id()
    result = await appointment_service.get_month_availability(db, tenant_id, year, month)
    # Convert SlotAvailability objects to dicts for JSON serialization
    data = {date_str: avail.model_dump() for date_str, avail in result.items()}
    return {"data": data, "meta": {}}


@router.get(
    "/availability/date",
    response_model=dict,
    summary="Get single date availability",
    description="Return slot availability for a specific date.",
)
async def get_date_availability(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get availability for a specific date.

    Returns:
        API Response Wrapper: {"data": {...SlotAvailability}, "meta": {}}
    """
    from datetime import date as date_type
    try:
        target_date = date_type.fromisoformat(date)
    except ValueError:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "ERR_INVALID_DATE", "message": "Định dạng ngày không hợp lệ (dùng YYYY-MM-DD)"}},
        )

    tenant_id = get_default_tenant_id()
    result = await appointment_service.get_availability(db, tenant_id, target_date)
    return {"data": result.model_dump(), "meta": {}}


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create appointment (Public / Guest booking)",
    description="Book a Bespoke consultation appointment. No authentication required.",
)
async def create_appointment_endpoint(
    appointment_data: AppointmentCreate,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Create a new appointment with race-condition safe slot checking.

    Returns 409 Conflict if the slot is fully booked (concurrent request protection).
    Returns 400 Bad Request if date is in the past.

    Returns:
        API Response Wrapper: {"data": {...AppointmentResponse}, "meta": {}}
    """
    tenant_id = get_default_tenant_id()
    result = await appointment_service.create_appointment(db, appointment_data, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}
