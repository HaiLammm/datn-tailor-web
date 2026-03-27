"""Tests for Story 10.2: Measurement Gate cho Đặt May.

Verifies:
- check_customer_measurement service function returns correct data
- No measurement case returns has_measurements=False
- Default measurement case returns summary with correct fields
- Customer without profile returns has_measurements=False
- MeasurementCheckResponse Pydantic schema validates correctly
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, CustomerProfileDB, MeasurementDB, TenantDB, UserDB
from src.models.order import MeasurementCheckResponse
from src.services.order_service import check_customer_measurement

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("10200000-0000-0000-0000-000000000001")
USER_ID = uuid.UUID("10200000-0000-0000-0000-000000000010")
PROFILE_ID = uuid.UUID("10200000-0000-0000-0000-000000000020")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def base_data(db_session: AsyncSession):
    """Seed tenant + user (no customer profile yet)."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop 10.2", slug="test-shop-102")
    user = UserDB(
        id=USER_ID,
        email="customer102@test.com",
        hashed_password="hashed",
        role="Customer",
        tenant_id=TENANT_ID,
    )
    db_session.add_all([tenant, user])
    await db_session.commit()


@pytest_asyncio.fixture
async def profile_no_measurement(db_session: AsyncSession, base_data):
    """Customer profile exists but no measurements."""
    profile = CustomerProfileDB(
        id=PROFILE_ID,
        tenant_id=TENANT_ID,
        user_id=USER_ID,
        full_name="Khách Test 10.2",
        phone="0912345678",
    )
    db_session.add(profile)
    await db_session.commit()


@pytest_asyncio.fixture
async def profile_with_measurement(db_session: AsyncSession, profile_no_measurement):
    """Customer profile with a default measurement."""
    measurement = MeasurementDB(
        id=uuid.uuid4(),
        customer_profile_id=PROFILE_ID,
        tenant_id=TENANT_ID,
        neck=Decimal("38.50"),
        shoulder_width=Decimal("42.00"),
        bust=Decimal("92.00"),
        waist=Decimal("78.00"),
        hip=Decimal("96.00"),
        top_length=Decimal("65.00"),
        height=Decimal("168.00"),
        is_default=True,
        measured_date=date(2026, 3, 15),
    )
    db_session.add(measurement)
    await db_session.commit()


# ---------------------------------------------------------------------------
# Service function tests
# ---------------------------------------------------------------------------


class TestCheckCustomerMeasurement:
    """Test check_customer_measurement service function."""

    @pytest.mark.asyncio
    async def test_no_customer_profile(self, db_session: AsyncSession, base_data):
        """Customer without profile → has_measurements=False."""
        result = await check_customer_measurement(db_session, USER_ID, TENANT_ID)
        assert result["has_measurements"] is False
        assert result["last_updated"] is None
        assert result["measurements_summary"] is None

    @pytest.mark.asyncio
    async def test_profile_without_measurement(self, db_session: AsyncSession, profile_no_measurement):
        """Customer with profile but no measurements → has_measurements=False."""
        result = await check_customer_measurement(db_session, USER_ID, TENANT_ID)
        assert result["has_measurements"] is False
        assert result["last_updated"] is None
        assert result["measurements_summary"] is None

    @pytest.mark.asyncio
    async def test_profile_with_default_measurement(self, db_session: AsyncSession, profile_with_measurement):
        """Customer with default measurement → has_measurements=True + summary."""
        result = await check_customer_measurement(db_session, USER_ID, TENANT_ID)
        assert result["has_measurements"] is True
        assert result["last_updated"] is not None
        summary = result["measurements_summary"]
        assert summary is not None
        assert summary["neck"] == 38.5
        assert summary["shoulder_width"] == 42.0
        assert summary["bust"] == 92.0
        assert summary["waist"] == 78.0
        assert summary["hip"] == 96.0
        assert summary["top_length"] == 65.0
        assert summary["height"] == 168.0

    @pytest.mark.asyncio
    async def test_wrong_tenant(self, db_session: AsyncSession, profile_with_measurement):
        """Different tenant_id → has_measurements=False (multi-tenant isolation)."""
        other_tenant = uuid.uuid4()
        result = await check_customer_measurement(db_session, USER_ID, other_tenant)
        assert result["has_measurements"] is False


# ---------------------------------------------------------------------------
# Pydantic schema tests
# ---------------------------------------------------------------------------


class TestMeasurementCheckResponse:
    """Test MeasurementCheckResponse Pydantic schema."""

    def test_no_measurements_response(self):
        resp = MeasurementCheckResponse(
            has_measurements=False,
            last_updated=None,
            measurements_summary=None,
        )
        assert resp.has_measurements is False
        assert resp.last_updated is None

    def test_with_measurements_response(self):
        now = datetime.now(timezone.utc)
        resp = MeasurementCheckResponse(
            has_measurements=True,
            last_updated=now,
            measurements_summary={
                "neck": 38.5,
                "bust": 92.0,
                "waist": 78.0,
                "hip": 96.0,
                "height": 168.0,
                "shoulder_width": None,
                "top_length": None,
            },
        )
        assert resp.has_measurements is True
        assert resp.measurements_summary["neck"] == 38.5
        assert resp.measurements_summary["shoulder_width"] is None

    def test_serialization(self):
        resp = MeasurementCheckResponse(has_measurements=False)
        data = resp.model_dump(mode="json")
        assert data["has_measurements"] is False
        assert data["last_updated"] is None
