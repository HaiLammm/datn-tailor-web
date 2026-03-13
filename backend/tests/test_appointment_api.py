"""API tests for Appointment endpoints - Story 3.4.

Tests GET /api/v1/appointments/availability and POST /api/v1/appointments.
Validates availability map, booking creation, 409 conflict, and validation.
"""

import uuid
from datetime import date, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.main import app
from src.models.db_models import AppointmentDB, Base, TenantDB
from src.services.appointment_service import MAX_SLOTS_PER_SESSION

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
FUTURE_DATE = (date.today() + timedelta(days=10)).isoformat()
PAST_DATE = (date.today() - timedelta(days=1)).isoformat()


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(
        test_db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        tenant = TenantDB(id=TENANT_ID, name="Test Tiệm", slug="test-tiem")
        session.add(tenant)
        await session.commit()
        yield session


@pytest_asyncio.fixture
async def override_get_db(test_db_session):
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(override_get_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


VALID_BOOKING = {
    "customer_name": "Nguyễn Thị Lan",
    "customer_phone": "0912345678",
    "customer_email": "lan@test.com",
    "appointment_date": FUTURE_DATE,
    "slot": "morning",
    "special_requests": None,
}


# ---------------------------------------------------------------------------
# GET /availability tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_month_availability_returns_200(client):
    """GET availability returns 200 with data dict."""
    response = await client.get(
        "/api/v1/appointments/availability",
        params={"year": 2026, "month": 6},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    # June has 30 days
    assert len(body["data"]) == 30


@pytest.mark.asyncio
async def test_get_month_availability_slot_structure(client):
    """Each day in availability map has required slot fields."""
    response = await client.get(
        "/api/v1/appointments/availability",
        params={"year": 2026, "month": 6},
    )
    body = response.json()
    day = body["data"]["2026-06-01"]
    assert "morning_available" in day
    assert "morning_remaining" in day
    assert "afternoon_available" in day
    assert "afternoon_remaining" in day


@pytest.mark.asyncio
async def test_get_date_availability_returns_single_day(client):
    """GET /availability/date returns single day availability."""
    response = await client.get(
        "/api/v1/appointments/availability/date",
        params={"date": FUTURE_DATE},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["morning_available"] is True


@pytest.mark.asyncio
async def test_get_date_availability_invalid_date(client):
    """Invalid date format returns 400."""
    response = await client.get(
        "/api/v1/appointments/availability/date",
        params={"date": "not-a-date"},
    )
    assert response.status_code == 400


# ---------------------------------------------------------------------------
# POST /appointments tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_create_appointment_success(client, monkeypatch):
    """POST /appointments returns 201 with appointment data."""
    import src.services.email_service as email_svc
    monkeypatch.setattr(
        email_svc,
        "send_booking_confirmation_email",
        lambda *a, **kw: None,
    )

    response = await client.post("/api/v1/appointments", json=VALID_BOOKING)
    assert response.status_code == 201
    body = response.json()
    assert body["data"]["customer_name"] == "Nguyễn Thị Lan"
    assert body["data"]["slot"] == "morning"
    assert body["data"]["status"] == "pending"


@pytest.mark.asyncio
async def test_create_appointment_returns_appointment_id(client, monkeypatch):
    """Created appointment has a valid UUID id."""
    import src.services.email_service as email_svc
    monkeypatch.setattr(
        email_svc, "send_booking_confirmation_email", lambda *a, **kw: None
    )

    response = await client.post("/api/v1/appointments", json=VALID_BOOKING)
    assert response.status_code == 201
    appt_id = response.json()["data"]["id"]
    assert uuid.UUID(appt_id)  # valid UUID


@pytest.mark.asyncio
async def test_create_appointment_past_date_returns_400(client):
    """Booking for past date returns 400."""
    payload = {**VALID_BOOKING, "appointment_date": PAST_DATE}
    response = await client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 400
    assert "ERR_PAST_DATE" in str(response.json())


@pytest.mark.asyncio
async def test_create_appointment_full_slot_returns_409(client, test_db_session, monkeypatch):
    """Fully booked slot returns 409 Conflict."""
    import src.services.email_service as email_svc
    monkeypatch.setattr(
        email_svc, "send_booking_confirmation_email", lambda *a, **kw: None
    )

    target = date.today() + timedelta(days=15)
    # Fill up morning slot
    for i in range(MAX_SLOTS_PER_SESSION):
        appt = AppointmentDB(
            tenant_id=TENANT_ID,
            customer_name=f"C{i}",
            customer_phone="0912345678",
            customer_email=f"c{i}@test.com",
            appointment_date=target,
            slot="morning",
            status="pending",
        )
        test_db_session.add(appt)
    await test_db_session.commit()

    payload = {**VALID_BOOKING, "appointment_date": str(target)}
    response = await client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 409
    assert "ERR_SLOT_FULL" in str(response.json())


@pytest.mark.asyncio
async def test_create_appointment_invalid_email_returns_422(client):
    """Invalid email format returns 422 from Pydantic validation."""
    payload = {**VALID_BOOKING, "customer_email": "not-an-email"}
    response = await client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_appointment_invalid_slot_returns_422(client):
    """Invalid slot value returns 422 from Pydantic validation."""
    payload = {**VALID_BOOKING, "slot": "evening"}
    response = await client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_appointment_special_requests_optional(client, monkeypatch):
    """special_requests is optional — omitting it should succeed."""
    import src.services.email_service as email_svc
    monkeypatch.setattr(
        email_svc, "send_booking_confirmation_email", lambda *a, **kw: None
    )

    payload = {k: v for k, v in VALID_BOOKING.items() if k != "special_requests"}
    payload["appointment_date"] = (date.today() + timedelta(days=12)).isoformat()
    response = await client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_create_appointment_api_response_format(client, monkeypatch):
    """Response follows architecture standard: {"data": {...}, "meta": {}}."""
    import src.services.email_service as email_svc
    monkeypatch.setattr(
        email_svc, "send_booking_confirmation_email", lambda *a, **kw: None
    )

    payload = {**VALID_BOOKING, "appointment_date": (date.today() + timedelta(days=20)).isoformat()}
    response = await client.post("/api/v1/appointments", json=payload)
    assert response.status_code == 201
    body = response.json()
    assert "data" in body
    assert "meta" in body
