"""Owner Appointment Management endpoints.

Endpoints:
  GET   /api/v1/appointments/tenant    — list all tenant appointments (Owner only)
  PATCH /api/v1/appointments/tenant/{id}/confirm — confirm an appointment (Owner only)
  PATCH /api/v1/appointments/tenant/{id}/cancel  — cancel an appointment (Owner only)
"""

import logging
from datetime import date as date_type
from uuid import UUID as PyUUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, TenantId
from src.core.database import get_db
from src.models.appointment import AppointmentResponse
from src.models.db_models import AppointmentDB

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/appointments/tenant", tags=["owner-appointments"])


@router.get("", response_model=dict)
async def list_tenant_appointments(
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
    status_filter: str | None = Query(None, alias="status", description="Filter by status: pending, confirmed, cancelled"),
    date_from: str | None = Query(None, description="Filter from date (YYYY-MM-DD)"),
    date_to: str | None = Query(None, description="Filter to date (YYYY-MM-DD)"),
) -> dict:
    """List all appointments for the owner's tenant.

    Returns appointments sorted by appointment_date DESC.
    Supports optional filtering by status and date range.
    """
    stmt = (
        select(AppointmentDB)
        .where(AppointmentDB.tenant_id == tenant_id)
    )

    if status_filter:
        if status_filter not in ("pending", "confirmed", "cancelled"):
            raise HTTPException(
                status_code=400,
                detail={"code": "INVALID_STATUS", "message": f"Trạng thái không hợp lệ: {status_filter}"},
            )
        stmt = stmt.where(AppointmentDB.status == status_filter)

    if date_from:
        try:
            from_date = date_type.fromisoformat(date_from)
            stmt = stmt.where(AppointmentDB.appointment_date >= from_date)
        except ValueError:
            raise HTTPException(status_code=400, detail={"code": "INVALID_DATE", "message": "date_from không hợp lệ"})

    if date_to:
        try:
            to_date = date_type.fromisoformat(date_to)
            stmt = stmt.where(AppointmentDB.appointment_date <= to_date)
        except ValueError:
            raise HTTPException(status_code=400, detail={"code": "INVALID_DATE", "message": "date_to không hợp lệ"})

    stmt = stmt.order_by(AppointmentDB.appointment_date.desc())
    result = await db.execute(stmt)
    appointments = result.scalars().all()

    return {
        "data": {
            "appointments": [
                AppointmentResponse.model_validate(a).model_dump(mode="json")
                for a in appointments
            ],
            "appointment_count": len(appointments),
        },
        "meta": {},
    }


@router.patch("/{appointment_id}/confirm", response_model=dict)
async def confirm_appointment(
    appointment_id: PyUUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Confirm a pending appointment.

    - 404 if not found or wrong tenant
    - 400 if not in pending status
    """
    stmt = (
        select(AppointmentDB)
        .where(
            AppointmentDB.id == appointment_id,
            AppointmentDB.tenant_id == tenant_id,
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()

    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Lịch hẹn không tồn tại"},
        )

    if appointment.status != "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"code": "INVALID_STATUS", "message": f"Không thể xác nhận lịch hẹn có trạng thái '{appointment.status}'"},
        )

    appointment.status = "confirmed"
    await db.commit()
    await db.refresh(appointment)

    return {
        "data": AppointmentResponse.model_validate(appointment).model_dump(mode="json"),
        "meta": {},
    }


@router.patch("/{appointment_id}/cancel", response_model=dict)
async def cancel_appointment(
    appointment_id: PyUUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Cancel an appointment (Owner action — no 24h restriction).

    - 404 if not found or wrong tenant
    - 409 if already cancelled
    """
    stmt = (
        select(AppointmentDB)
        .where(
            AppointmentDB.id == appointment_id,
            AppointmentDB.tenant_id == tenant_id,
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()

    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"code": "NOT_FOUND", "message": "Lịch hẹn không tồn tại"},
        )

    if appointment.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "ALREADY_CANCELLED", "message": "Lịch hẹn đã được hủy trước đó"},
        )

    # Capture info before status change for email
    customer_email = appointment.customer_email
    customer_name = appointment.customer_name
    appt_date = appointment.appointment_date
    appt_slot = appointment.slot

    appointment.status = "cancelled"
    await db.commit()
    await db.refresh(appointment)

    # Send cancellation email (non-blocking)
    try:
        from src.services.email_service import send_appointment_cancellation_email

        await send_appointment_cancellation_email(
            email=customer_email,
            customer_name=customer_name,
            appointment_date=appt_date,
            slot=appt_slot,
        )
    except Exception:
        logger.warning("Failed to send cancellation email for appointment %s", appointment_id)

    return {
        "data": AppointmentResponse.model_validate(appointment).model_dump(mode="json"),
        "meta": {},
    }
