"""Unit tests for appointment_service.py - Story 3.4.

Tests slot availability checking, appointment creation,
race-condition protection (409 for full slots), and reminder logic.
"""

import uuid
from datetime import date, timedelta

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.appointment import AppointmentCreate
from src.models.db_models import AppointmentDB, Base, TenantDB
from src.services.appointment_service import (
    MAX_SLOTS_PER_SESSION,
    create_appointment,
    get_availability,
    get_month_availability,
    send_booking_reminders,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TOMORROW = date.today() + timedelta(days=1)
FUTURE_DATE = date.today() + timedelta(days=7)


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db(engine):
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        # Seed tenant
        tenant = TenantDB(
            id=TENANT_ID,
            name="Test Tiệm",
            slug="test-tiem",
        )
        session.add(tenant)
        await session.commit()
        yield session


def make_appointment_data(
    appointment_date: date = FUTURE_DATE,
    slot: str = "morning",
    customer_name: str = "Nguyễn Thị Lan",
    customer_email: str = "lan@test.com",
) -> AppointmentCreate:
    return AppointmentCreate(
        customer_name=customer_name,
        customer_phone="0912345678",
        customer_email=customer_email,
        appointment_date=appointment_date,
        slot=slot,  # type: ignore[arg-type]
        special_requests=None,
    )


# ---------------------------------------------------------------------------
# get_availability tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_availability_empty_returns_full_capacity(db):
    """Empty day → both slots fully available."""
    avail = await get_availability(db, TENANT_ID, FUTURE_DATE)
    assert avail.morning_available is True
    assert avail.morning_remaining == MAX_SLOTS_PER_SESSION
    assert avail.afternoon_available is True
    assert avail.afternoon_remaining == MAX_SLOTS_PER_SESSION


@pytest.mark.asyncio
async def test_get_availability_decrements_remaining_after_booking(db):
    """One morning booking decrements morning remaining by 1."""
    appt = AppointmentDB(
        tenant_id=TENANT_ID,
        customer_name="Test",
        customer_phone="0912345678",
        customer_email="test@test.com",
        appointment_date=FUTURE_DATE,
        slot="morning",
        status="pending",
    )
    db.add(appt)
    await db.commit()

    avail = await get_availability(db, TENANT_ID, FUTURE_DATE)
    assert avail.morning_remaining == MAX_SLOTS_PER_SESSION - 1
    assert avail.afternoon_remaining == MAX_SLOTS_PER_SESSION


@pytest.mark.asyncio
async def test_get_availability_cancelled_not_counted(db):
    """Cancelled appointments do not count towards slot occupancy."""
    appt = AppointmentDB(
        tenant_id=TENANT_ID,
        customer_name="Test",
        customer_phone="0912345678",
        customer_email="test@test.com",
        appointment_date=FUTURE_DATE,
        slot="morning",
        status="cancelled",  # should not count
    )
    db.add(appt)
    await db.commit()

    avail = await get_availability(db, TENANT_ID, FUTURE_DATE)
    assert avail.morning_remaining == MAX_SLOTS_PER_SESSION  # unchanged


# ---------------------------------------------------------------------------
# create_appointment tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_appointment_success(db):
    """Valid appointment creation returns AppointmentResponse."""
    data = make_appointment_data()
    result = await create_appointment(db, data, TENANT_ID)

    assert result.id is not None
    assert result.customer_name == data.customer_name
    assert result.appointment_date == FUTURE_DATE
    assert result.slot == "morning"
    assert result.status == "pending"


@pytest.mark.asyncio
async def test_create_appointment_past_date_raises_400(db):
    """Past appointment date raises HTTPException 400."""
    from fastapi import HTTPException

    past_date = date.today() - timedelta(days=1)
    data = make_appointment_data(appointment_date=past_date)
    with pytest.raises(HTTPException) as exc_info:
        await create_appointment(db, data, TENANT_ID)
    assert exc_info.value.status_code == 400
    assert "ERR_PAST_DATE" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_create_appointment_full_slot_raises_409(db):
    """Fully booked slot raises HTTPException 409 (ACID protection)."""
    from fastapi import HTTPException

    # Fill up the morning slot
    for i in range(MAX_SLOTS_PER_SESSION):
        appt = AppointmentDB(
            tenant_id=TENANT_ID,
            customer_name=f"Customer {i}",
            customer_phone="0912345678",
            customer_email=f"c{i}@test.com",
            appointment_date=FUTURE_DATE,
            slot="morning",
            status="pending",
        )
        db.add(appt)
    await db.commit()

    # Next booking attempt should be rejected
    data = make_appointment_data(slot="morning")
    with pytest.raises(HTTPException) as exc_info:
        await create_appointment(db, data, TENANT_ID)
    assert exc_info.value.status_code == 409
    assert "ERR_SLOT_FULL" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_create_appointment_other_slot_still_available(db):
    """Full morning slot does not affect afternoon slot availability."""
    # Fill up morning
    for i in range(MAX_SLOTS_PER_SESSION):
        appt = AppointmentDB(
            tenant_id=TENANT_ID,
            customer_name=f"Customer {i}",
            customer_phone="0912345678",
            customer_email=f"c{i}@test.com",
            appointment_date=FUTURE_DATE,
            slot="morning",
            status="pending",
        )
        db.add(appt)
    await db.commit()

    # Afternoon should still accept bookings
    data = make_appointment_data(slot="afternoon")
    result = await create_appointment(db, data, TENANT_ID)
    assert result.slot == "afternoon"
    assert result.status == "pending"


# ---------------------------------------------------------------------------
# get_month_availability tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_month_availability_returns_all_days(db):
    """Month availability covers all days in the given month."""
    result = await get_month_availability(db, TENANT_ID, 2026, 3)
    # March has 31 days
    assert len(result) == 31
    assert "2026-03-01" in result
    assert "2026-03-31" in result


@pytest.mark.asyncio
async def test_get_month_availability_reflects_existing_bookings(db):
    """Existing bookings are reflected in month availability."""
    target_date = date(2026, 5, 15)
    for i in range(MAX_SLOTS_PER_SESSION):
        appt = AppointmentDB(
            tenant_id=TENANT_ID,
            customer_name=f"C{i}",
            customer_phone="0912345678",
            customer_email=f"c{i}@test.com",
            appointment_date=target_date,
            slot="morning",
            status="pending",
        )
        db.add(appt)
    await db.commit()

    result = await get_month_availability(db, TENANT_ID, 2026, 5)
    day_avail = result["2026-05-15"]
    assert day_avail.morning_available is False
    assert day_avail.morning_remaining == 0
    assert day_avail.afternoon_available is True


# ---------------------------------------------------------------------------
# send_booking_reminders tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_send_booking_reminders_returns_count(db, monkeypatch):
    """send_booking_reminders processes tomorrow's appointments."""
    # Create appointment for tomorrow
    appt = AppointmentDB(
        tenant_id=TENANT_ID,
        customer_name="Test",
        customer_phone="0912345678",
        customer_email="test@test.com",
        appointment_date=TOMORROW,
        slot="morning",
        status="pending",
        reminder_sent=False,
    )
    db.add(appt)
    await db.commit()

    # Mock email function to avoid real SMTP
    async def mock_send_reminder(email, customer_name, appointment_date, slot):
        return True

    import src.services.appointment_service as svc
    monkeypatch.setattr(
        svc,
        "send_booking_reminders",
        send_booking_reminders,
    )

    import src.services.email_service as email_svc
    monkeypatch.setattr(
        email_svc,
        "send_booking_reminder_email",
        mock_send_reminder,
    )

    count = await send_booking_reminders(db, TENANT_ID)
    assert count == 1  # exactly one reminder sent for tomorrow's appointment


@pytest.mark.asyncio
async def test_send_booking_reminders_skips_already_sent(db, monkeypatch):
    """Appointments with reminder_sent=True are skipped."""
    appt = AppointmentDB(
        tenant_id=TENANT_ID,
        customer_name="Already reminded",
        customer_phone="0912345678",
        customer_email="reminded@test.com",
        appointment_date=TOMORROW,
        slot="afternoon",
        status="pending",
        reminder_sent=True,  # already sent
    )
    db.add(appt)
    await db.commit()

    import src.services.email_service as email_svc

    called = []

    async def mock_send(email, customer_name, appointment_date, slot):
        called.append(email)
        return True

    monkeypatch.setattr(email_svc, "send_booking_reminder_email", mock_send)

    count = await send_booking_reminders(db, TENANT_ID)
    # Should not send to already-reminded appointment
    assert "reminded@test.com" not in called
    assert count == 0
