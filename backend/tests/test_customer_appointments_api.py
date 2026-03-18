"""Tests for GET /api/v1/customers/me/appointments and
PATCH /api/v1/customers/me/appointments/{id}/cancel endpoints (Story 4.4e).

Tests:
  GET:  success (with appointments), empty (no appointments), unauthorized
  CANCEL: success, within 24h (400), not found (404), already cancelled (409), unauthorized
"""

import uuid
from datetime import date, timedelta

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import AppointmentDB, Base, TenantDB, UserDB

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def make_token(email: str) -> str:
    return create_access_token({"sub": email})


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest.fixture
def override_db(test_db_session):
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_data(test_db_session):
    """Seed tenant, user, and appointments."""
    db = test_db_session

    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Test Shop", slug="test-shop")
    db.add(tenant)

    user = UserDB(
        id=uuid.uuid4(),
        email="customer@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Nguyễn Thị Linh",
        phone="0931234567",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(user)
    await db.flush()

    tomorrow = date.today() + timedelta(days=2)
    past_date = date.today() - timedelta(days=5)

    appointment_upcoming = AppointmentDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        customer_name="Nguyễn Thị Linh",
        customer_phone="0931234567",
        customer_email="customer@example.com",
        appointment_date=tomorrow,
        slot="morning",
        status="confirmed",
        special_requests="Tư vấn áo dài cưới",
    )
    db.add(appointment_upcoming)

    appointment_past = AppointmentDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        customer_name="Nguyễn Thị Linh",
        customer_phone="0931234567",
        customer_email="customer@example.com",
        appointment_date=past_date,
        slot="afternoon",
        status="pending",
        special_requests=None,
    )
    db.add(appointment_past)

    await db.commit()
    await db.refresh(user)

    return {
        "user": user,
        "appointment_upcoming": appointment_upcoming,
        "appointment_past": appointment_past,
    }


# ─── GET /appointments ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_appointments_success(seed_data, override_db):
    """GET appointments returns appointments sorted DESC for authenticated user."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/appointments",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert body["data"]["appointment_count"] == 2
    appointments = body["data"]["appointments"]
    assert len(appointments) == 2
    # Sorted DESC by date — upcoming first (tomorrow > past)
    assert appointments[0]["appointment_date"] > appointments[1]["appointment_date"]
    assert appointments[0]["customer_email"] == "customer@example.com"
    assert appointments[0]["slot"] == "morning"
    assert appointments[0]["special_requests"] == "Tư vấn áo dài cưới"


@pytest.mark.asyncio
async def test_get_appointments_empty(test_db_session, override_db):
    """GET appointments returns empty array when user has no appointments."""
    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Test Shop", slug="test-shop")
    test_db_session.add(tenant)
    user = UserDB(
        id=uuid.uuid4(),
        email="noappointments@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Trần Văn B",
        tenant_id=DEFAULT_TENANT_ID,
    )
    test_db_session.add(user)
    await test_db_session.commit()

    token = make_token("noappointments@example.com")
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/appointments",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["appointment_count"] == 0
    assert body["data"]["appointments"] == []


@pytest.mark.asyncio
async def test_get_appointments_unauthorized():
    """GET appointments returns 401 without auth token."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/customers/me/appointments")
    assert resp.status_code == 401


# ─── PATCH /appointments/{id}/cancel ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_cancel_appointment_success(seed_data, override_db):
    """PATCH cancel updates status to cancelled for a future appointment."""
    user = seed_data["user"]
    token = make_token(user.email)
    appointment_id = seed_data["appointment_upcoming"].id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            f"/api/v1/customers/me/appointments/{appointment_id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    body = resp.json()
    assert body["data"]["status"] == "cancelled"
    assert str(body["data"]["id"]) == str(appointment_id)


@pytest.mark.asyncio
async def test_cancel_appointment_within_24h(seed_data, override_db, test_db_session):
    """PATCH cancel returns 400 for same-day appointment (within 24h rule)."""
    user = seed_data["user"]
    token = make_token(user.email)

    # Create a same-day appointment
    today_appt = AppointmentDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        customer_name="Nguyễn Thị Linh",
        customer_phone="0931234567",
        customer_email="customer@example.com",
        appointment_date=date.today(),
        slot="morning",
        status="confirmed",
    )
    test_db_session.add(today_appt)
    await test_db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            f"/api/v1/customers/me/appointments/{today_appt.id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 400
    body = resp.json()
    assert body["detail"]["code"] == "WITHIN_24H"
    assert "24h" in body["detail"]["message"]


@pytest.mark.asyncio
async def test_cancel_appointment_not_found(seed_data, override_db):
    """PATCH cancel returns 404 for non-existent appointment."""
    user = seed_data["user"]
    token = make_token(user.email)
    fake_id = uuid.uuid4()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            f"/api/v1/customers/me/appointments/{fake_id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 404
    body = resp.json()
    assert body["detail"]["code"] == "NOT_FOUND"


@pytest.mark.asyncio
async def test_cancel_appointment_already_cancelled(seed_data, override_db, test_db_session):
    """PATCH cancel returns 409 for already cancelled appointment."""
    user = seed_data["user"]
    token = make_token(user.email)

    # Create a pre-cancelled appointment in the future
    future_date = date.today() + timedelta(days=3)
    cancelled_appt = AppointmentDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        customer_name="Nguyễn Thị Linh",
        customer_phone="0931234567",
        customer_email="customer@example.com",
        appointment_date=future_date,
        slot="afternoon",
        status="cancelled",
    )
    test_db_session.add(cancelled_appt)
    await test_db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            f"/api/v1/customers/me/appointments/{cancelled_appt.id}/cancel",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 409
    body = resp.json()
    assert body["detail"]["code"] == "ALREADY_CANCELLED"


@pytest.mark.asyncio
async def test_cancel_appointment_unauthorized():
    """PATCH cancel returns 401 without auth token."""
    fake_id = uuid.uuid4()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            f"/api/v1/customers/me/appointments/{fake_id}/cancel"
        )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_cancel_appointment_other_user(seed_data, override_db, test_db_session):
    """PATCH cancel returns 404 when appointment belongs to another user."""
    other_user = UserDB(
        id=uuid.uuid4(),
        email="other@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Lê Văn C",
        tenant_id=DEFAULT_TENANT_ID,
    )
    test_db_session.add(other_user)
    await test_db_session.commit()

    other_token = make_token("other@example.com")
    appointment_id = seed_data["appointment_upcoming"].id

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            f"/api/v1/customers/me/appointments/{appointment_id}/cancel",
            headers={"Authorization": f"Bearer {other_token}"},
        )

    # Other user cannot see/cancel appointments belonging to customer@example.com
    assert resp.status_code == 404
