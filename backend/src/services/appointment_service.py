"""Appointment business logic service (Story 3.4).

Lịch Book Appointments Tiệm & Khách (Calendar UI).
Handles slot availability checks, booking creation (ACID/race-condition safe),
and reminder processing for the daily scheduler.
"""

import calendar
import logging
from datetime import date, timedelta
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.appointment import AppointmentCreate, AppointmentResponse, SlotAvailability
from src.models.db_models import AppointmentDB

logger = logging.getLogger(__name__)

# Maximum concurrent bookings per slot (morning or afternoon) per day
MAX_SLOTS_PER_SESSION = 3


async def get_availability(
    db: AsyncSession, tenant_id: UUID, target_date: date
) -> SlotAvailability:
    """Check slot availability for a specific date.

    Counts existing non-cancelled appointments per slot and returns
    remaining capacity for each session.
    """
    result = await db.execute(
        select(AppointmentDB.slot, func.count(AppointmentDB.id))
        .where(
            AppointmentDB.tenant_id == tenant_id,
            AppointmentDB.appointment_date == target_date,
            AppointmentDB.status != "cancelled",
        )
        .group_by(AppointmentDB.slot)
    )
    counts: dict[str, int] = {row[0]: row[1] for row in result}

    morning_count = counts.get("morning", 0)
    afternoon_count = counts.get("afternoon", 0)

    return SlotAvailability(
        date=str(target_date),
        morning_available=morning_count < MAX_SLOTS_PER_SESSION,
        morning_remaining=max(0, MAX_SLOTS_PER_SESSION - morning_count),
        afternoon_available=afternoon_count < MAX_SLOTS_PER_SESSION,
        afternoon_remaining=max(0, MAX_SLOTS_PER_SESSION - afternoon_count),
    )


async def get_month_availability(
    db: AsyncSession, tenant_id: UUID, year: int, month: int
) -> dict[str, SlotAvailability]:
    """Get slot availability for all days in a given month.

    Returns a dict keyed by 'YYYY-MM-DD' for the calendar frontend to render.
    Only returns days from today onwards (past days not bookable).
    """
    today = date.today()
    _, days_in_month = calendar.monthrange(year, month)
    month_start = date(year, month, 1)
    month_end = date(year, month, days_in_month)

    # Fetch all bookings for this month in one query
    result = await db.execute(
        select(
            AppointmentDB.appointment_date,
            AppointmentDB.slot,
            func.count(AppointmentDB.id),
        )
        .where(
            AppointmentDB.tenant_id == tenant_id,
            AppointmentDB.appointment_date >= month_start,
            AppointmentDB.appointment_date <= month_end,
            AppointmentDB.status != "cancelled",
        )
        .group_by(AppointmentDB.appointment_date, AppointmentDB.slot)
    )

    # Build count map: {date: {slot: count}}
    count_map: dict[date, dict[str, int]] = {}
    for row in result:
        d, slot, cnt = row[0], row[1], row[2]
        if d not in count_map:
            count_map[d] = {}
        count_map[d][slot] = cnt

    # Build availability for each day in month
    availability: dict[str, SlotAvailability] = {}
    current = month_start
    while current <= month_end:
        date_str = str(current)
        day_counts = count_map.get(current, {})
        morning_count = day_counts.get("morning", 0)
        afternoon_count = day_counts.get("afternoon", 0)
        availability[date_str] = SlotAvailability(
            date=date_str,
            morning_available=morning_count < MAX_SLOTS_PER_SESSION,
            morning_remaining=max(0, MAX_SLOTS_PER_SESSION - morning_count),
            afternoon_available=afternoon_count < MAX_SLOTS_PER_SESSION,
            afternoon_remaining=max(0, MAX_SLOTS_PER_SESSION - afternoon_count),
        )
        current += timedelta(days=1)

    return availability


async def create_appointment(
    db: AsyncSession, appointment_data: AppointmentCreate, tenant_id: UUID
) -> AppointmentResponse:
    """Create a new appointment with race-condition safe slot checking.

    Uses SELECT ... WITH FOR UPDATE to lock the count query and prevent
    double-booking when concurrent requests hit the same slot.

    Raises:
        HTTPException 400: appointment_date is in the past
        HTTPException 409: slot is fully booked (ACID race-condition safe)
    """
    today = date.today()
    if appointment_data.appointment_date < today:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_PAST_DATE",
                    "message": "Không thể đặt lịch cho ngày đã qua",
                }
            },
        )

    # Count existing bookings with row-level lock to prevent race conditions.
    # PostgreSQL does not allow FOR UPDATE with aggregate functions, so we lock
    # the individual rows first, then count in a subquery.
    locked_ids_subq = (
        select(AppointmentDB.id)
        .where(
            AppointmentDB.tenant_id == tenant_id,
            AppointmentDB.appointment_date == appointment_data.appointment_date,
            AppointmentDB.slot == appointment_data.slot,
            AppointmentDB.status != "cancelled",
        )
        .with_for_update()
        .subquery()
    )
    existing_count = await db.scalar(
        select(func.count()).select_from(locked_ids_subq)
    )

    if (existing_count or 0) >= MAX_SLOTS_PER_SESSION:
        slot_label = "Buổi Sáng" if appointment_data.slot == "morning" else "Buổi Chiều"
        raise HTTPException(
            status_code=409,
            detail={
                "error": {
                    "code": "ERR_SLOT_FULL",
                    "message": f"Khung giờ {slot_label} ngày {appointment_data.appointment_date} đã đầy. Vui lòng chọn slot khác.",
                }
            },
        )

    # Create the appointment record
    new_appointment = AppointmentDB(
        tenant_id=tenant_id,
        customer_name=appointment_data.customer_name,
        customer_phone=appointment_data.customer_phone,
        customer_email=appointment_data.customer_email,
        appointment_date=appointment_data.appointment_date,
        slot=appointment_data.slot,
        special_requests=appointment_data.special_requests,
        status="pending",
        reminder_sent=False,
    )
    db.add(new_appointment)
    await db.flush()
    await db.commit()
    await db.refresh(new_appointment)

    # Trigger confirmation email (non-blocking)
    try:
        from src.services.email_service import send_booking_confirmation_email
        await send_booking_confirmation_email(
            email=appointment_data.customer_email,
            customer_name=appointment_data.customer_name,
            appointment_date=appointment_data.appointment_date,
            slot=appointment_data.slot,
        )
    except Exception as e:
        logger.error("Failed to send booking confirmation email: %s", e)

    return AppointmentResponse.model_validate(new_appointment)


async def send_booking_reminders(db: AsyncSession, tenant_id: UUID) -> int:
    """Find tomorrow's pending appointments and send reminder emails.

    Called by the scheduler daily. Updates reminder_sent flag after sending.

    Returns:
        Number of reminders successfully sent.
    """
    from src.services.email_service import send_booking_reminder_email

    tomorrow = date.today() + timedelta(days=1)

    result = await db.execute(
        select(AppointmentDB).where(
            AppointmentDB.tenant_id == tenant_id,
            AppointmentDB.appointment_date == tomorrow,
            AppointmentDB.reminder_sent == False,  # noqa: E712
            AppointmentDB.status != "cancelled",
        )
    )
    appointments = result.scalars().all()

    sent_count = 0
    for appt in appointments:
        try:
            success = await send_booking_reminder_email(
                email=appt.customer_email,
                customer_name=appt.customer_name,
                appointment_date=appt.appointment_date,
                slot=appt.slot,
            )
            if success:
                appt.reminder_sent = True
                sent_count += 1
        except Exception as e:
            logger.error(
                "Failed to send booking reminder for appointment %s: %s", appt.id, e
            )

    if sent_count > 0:
        await db.commit()

    logger.info(
        "Booking reminders: sent %d out of %d for tenant %s (tomorrow: %s)",
        sent_count,
        len(appointments),
        tenant_id,
        tomorrow,
    )
    return sent_count
