"""Tests for GET /api/v1/customers/me/measurements endpoint (Story 4.4d).

Tests: success with measurements, empty (no profile), empty (no measurements),
no tenant, unauthorized.
"""

import uuid
from datetime import date

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, CustomerProfileDB, MeasurementDB, TenantDB, UserDB

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


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


@pytest_asyncio.fixture
async def seed_data(test_db_session):
    """Seed tenant, user, customer profile, and measurements."""
    db = test_db_session

    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Test Shop", slug="test-shop")
    db.add(tenant)

    # Customer with account and tenant linkage
    user = UserDB(
        id=uuid.uuid4(),
        email="customer@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Nguyễn Thị Mai",
        phone="0901234567",
        gender="Nữ",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(user)
    await db.flush()

    # Customer profile
    profile = CustomerProfileDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        full_name="Nguyễn Thị Mai",
        phone="0901234567",
    )
    db.add(profile)
    await db.flush()

    # Default measurement
    default_m = MeasurementDB(
        id=uuid.uuid4(),
        customer_profile_id=profile.id,
        tenant_id=DEFAULT_TENANT_ID,
        neck=34,
        bust=88,
        waist=68,
        hip=92,
        shoulder_width=38,
        top_length=60,
        sleeve_length=58,
        wrist=15,
        height=162,
        weight=55,
        is_default=True,
        measured_date=date(2026, 1, 15),
        measured_by=None,
    )
    db.add(default_m)

    # Older non-default measurement
    old_m = MeasurementDB(
        id=uuid.uuid4(),
        customer_profile_id=profile.id,
        tenant_id=DEFAULT_TENANT_ID,
        neck=33,
        bust=86,
        waist=66,
        hip=90,
        shoulder_width=37,
        top_length=59,
        sleeve_length=57,
        wrist=15,
        height=162,
        weight=54,
        is_default=False,
        measured_date=date(2025, 6, 10),
        measured_by=None,
    )
    db.add(old_m)

    # User with no customer profile yet
    user_no_profile = UserDB(
        id=uuid.uuid4(),
        email="noprofile@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="No Profile User",
        phone="0912345678",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(user_no_profile)

    # User with profile but no measurements
    user_no_meas = UserDB(
        id=uuid.uuid4(),
        email="nomeas@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="No Measurements User",
        phone="0923456789",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(user_no_meas)
    await db.flush()

    profile_no_meas = CustomerProfileDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user_no_meas.id,
        full_name="No Measurements User",
        phone="0923456789",
    )
    db.add(profile_no_meas)

    # User with no tenant linkage
    user_no_tenant = UserDB(
        id=uuid.uuid4(),
        email="notenant@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="No Tenant User",
        phone="0934567890",
        tenant_id=None,
    )
    db.add(user_no_tenant)

    await db.commit()
    await db.refresh(user)
    await db.refresh(user_no_profile)
    await db.refresh(user_no_meas)
    await db.refresh(user_no_tenant)

    return {
        "user": user,
        "user_no_profile": user_no_profile,
        "user_no_meas": user_no_meas,
        "user_no_tenant": user_no_tenant,
    }


def make_token(email: str) -> str:
    return create_access_token({"sub": email})


@pytest.fixture
def override_db(test_db_session):
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


# ────────────────────────────────────────────────────────
# GET /api/v1/customers/me/measurements — Success cases
# ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_measurements_success(seed_data, override_db):
    """Customer with measurements gets default + history."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/measurements",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["measurement_count"] == 2
    assert data["default_measurement"] is not None
    assert data["default_measurement"]["is_default"] is True
    assert float(data["default_measurement"]["bust"]) == 88
    assert len(data["measurements"]) == 2
    # Sorted newest first
    dates = [m["measured_date"] for m in data["measurements"]]
    assert dates[0] > dates[1]


@pytest.mark.asyncio
async def test_get_measurements_default_highlight(seed_data, override_db):
    """Default measurement has neck/bust/waist/etc. with Vietnamese labels data."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/measurements",
            headers={"Authorization": f"Bearer {token}"},
        )

    data = resp.json()["data"]
    default_m = data["default_measurement"]
    assert float(default_m["neck"]) == 34
    assert float(default_m["waist"]) == 68
    assert float(default_m["height"]) == 162
    assert float(default_m["weight"]) == 55


# ────────────────────────────────────────────────────────
# Empty states
# ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_measurements_no_profile(seed_data, override_db):
    """Customer with no CustomerProfile gets empty response (not error)."""
    user = seed_data["user_no_profile"]
    token = make_token(user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/measurements",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["default_measurement"] is None
    assert data["measurements"] == []
    assert data["measurement_count"] == 0


@pytest.mark.asyncio
async def test_get_measurements_no_measurements(seed_data, override_db):
    """Customer with profile but no measurements gets empty response."""
    user = seed_data["user_no_meas"]
    token = make_token(user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/measurements",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["default_measurement"] is None
    assert data["measurements"] == []
    assert data["measurement_count"] == 0


@pytest.mark.asyncio
async def test_get_measurements_no_tenant(seed_data, override_db):
    """Customer with no tenant_id gets empty response (not error)."""
    user = seed_data["user_no_tenant"]
    token = make_token(user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/measurements",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["default_measurement"] is None
    assert data["measurements"] == []
    assert data["measurement_count"] == 0


# ────────────────────────────────────────────────────────
# Unauthorized
# ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_measurements_unauthorized():
    """No token → 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/customers/me/measurements")

    assert resp.status_code == 401
