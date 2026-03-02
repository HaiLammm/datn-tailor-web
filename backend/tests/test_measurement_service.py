"""Unit tests for Measurement Service layer.

Story 1.3: Quản lý Hồ sơ & Số đo
Tests measurement CRUD, versioning, and default selection logic.
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.customer import MeasurementCreateRequest, MeasurementUpdateRequest
from src.models.db_models import Base, CustomerProfileDB, MeasurementDB, UserDB
from src.services import measurement_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """Create an in-memory test database session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest_asyncio.fixture
async def seed_customer(db_session: AsyncSession) -> CustomerProfileDB:
    """Seed a test customer profile."""
    tenant_id = uuid.uuid4()
    customer = CustomerProfileDB(
        tenant_id=tenant_id,
        full_name="Test Customer",
        phone="0901234567",
    )
    db_session.add(customer)
    await db_session.commit()
    return customer


@pytest_asyncio.fixture
async def seed_user(db_session: AsyncSession) -> UserDB:
    """Seed a test user (tailor)."""
    user = UserDB(
        email="tailor@test.com",
        hashed_password="hashed",
        role="Tailor",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    return user


# ===== Test create_measurement =====


@pytest.mark.asyncio
async def test_create_measurement_success(
    db_session: AsyncSession, seed_customer: CustomerProfileDB, seed_user: UserDB
):
    """Test creating measurement successfully."""
    data = MeasurementCreateRequest(
        neck=Decimal("38.5"),
        bust=Decimal("90.0"),
        waist=Decimal("70.0"),
        hip=Decimal("95.0"),
        height=Decimal("165.0"),
        weight=Decimal("55.0"),
        measurement_notes="Khách hàng có vai cao bên phải",
    )

    measurement = await measurement_service.create_measurement(
        db=db_session,
        customer_id=seed_customer.id,
        tenant_id=seed_customer.tenant_id,
        data=data,
        measured_by=seed_user.id,
    )

    assert measurement.neck == Decimal("38.5")
    assert measurement.bust == Decimal("90.0")
    assert measurement.waist == Decimal("70.0")
    assert measurement.measured_by == seed_user.id
    assert measurement.customer_profile_id == seed_customer.id


@pytest.mark.asyncio
async def test_create_first_measurement_auto_default(
    db_session: AsyncSession, seed_customer: CustomerProfileDB, seed_user: UserDB
):
    """Test first measurement is automatically set as default."""
    data = MeasurementCreateRequest(bust=Decimal("90.0"), waist=Decimal("70.0"))

    measurement = await measurement_service.create_measurement(
        db=db_session,
        customer_id=seed_customer.id,
        tenant_id=seed_customer.tenant_id,
        data=data,
        measured_by=seed_user.id,
    )

    assert measurement.is_default is True


@pytest.mark.asyncio
async def test_create_second_measurement_not_default(
    db_session: AsyncSession, seed_customer: CustomerProfileDB, seed_user: UserDB
):
    """Test second measurement is not auto-default."""
    # Create first measurement
    data1 = MeasurementCreateRequest(bust=Decimal("90.0"))
    await measurement_service.create_measurement(
        db=db_session,
        customer_id=seed_customer.id,
        tenant_id=seed_customer.tenant_id,
        data=data1,
        measured_by=seed_user.id,
    )

    # Create second measurement
    data2 = MeasurementCreateRequest(bust=Decimal("92.0"))
    measurement2 = await measurement_service.create_measurement(
        db=db_session,
        customer_id=seed_customer.id,
        tenant_id=seed_customer.tenant_id,
        data=data2,
        measured_by=seed_user.id,
    )

    assert measurement2.is_default is False


@pytest.mark.asyncio
async def test_create_measurement_with_custom_date(
    db_session: AsyncSession, seed_customer: CustomerProfileDB, seed_user: UserDB
):
    """Test creating measurement with custom measured_date."""
    custom_date = date(2026, 1, 15)
    data = MeasurementCreateRequest(
        bust=Decimal("90.0"), measured_date=custom_date
    )

    measurement = await measurement_service.create_measurement(
        db=db_session,
        customer_id=seed_customer.id,
        tenant_id=seed_customer.tenant_id,
        data=data,
        measured_by=seed_user.id,
    )

    assert measurement.measured_date == custom_date


# ===== Test get_measurements_history =====


@pytest.mark.asyncio
async def test_get_measurements_history_ordered_by_date(
    db_session: AsyncSession, seed_customer: CustomerProfileDB
):
    """Test measurements are returned sorted by date (newest first)."""
    tenant_id = seed_customer.tenant_id

    # Create measurements with different dates
    m1 = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("90.0"),
        measured_date=date(2026, 1, 1),
    )
    m2 = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("92.0"),
        measured_date=date(2026, 3, 1),  # Most recent
    )
    m3 = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("91.0"),
        measured_date=date(2026, 2, 1),
    )
    db_session.add_all([m1, m2, m3])
    await db_session.commit()

    measurements = await measurement_service.get_measurements_history(
        db=db_session, customer_id=seed_customer.id, tenant_id=tenant_id
    )

    assert len(measurements) == 3
    assert measurements[0].measured_date == date(2026, 3, 1)  # Newest first
    assert measurements[1].measured_date == date(2026, 2, 1)
    assert measurements[2].measured_date == date(2026, 1, 1)


# ===== Test get_default_measurement =====


@pytest.mark.asyncio
async def test_get_default_measurement_found(
    db_session: AsyncSession, seed_customer: CustomerProfileDB
):
    """Test retrieving default measurement."""
    tenant_id = seed_customer.tenant_id

    m1 = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("90.0"),
        is_default=False,
    )
    m2 = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("92.0"),
        is_default=True,  # Default
    )
    db_session.add_all([m1, m2])
    await db_session.commit()

    default = await measurement_service.get_default_measurement(
        db=db_session, customer_id=seed_customer.id, tenant_id=tenant_id
    )

    assert default is not None
    assert default.id == m2.id
    assert default.bust == Decimal("92.0")


@pytest.mark.asyncio
async def test_get_default_measurement_not_found(
    db_session: AsyncSession, seed_customer: CustomerProfileDB
):
    """Test returns None when no default measurement exists."""
    default = await measurement_service.get_default_measurement(
        db=db_session, customer_id=seed_customer.id, tenant_id=seed_customer.tenant_id
    )

    assert default is None


# ===== Test set_default_measurement =====


@pytest.mark.asyncio
async def test_set_default_measurement_unsets_previous(
    db_session: AsyncSession, seed_customer: CustomerProfileDB
):
    """Test setting new default unsets previous default."""
    tenant_id = seed_customer.tenant_id

    # Create two measurements, first is default
    m1 = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("90.0"),
        is_default=True,
    )
    m2 = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("92.0"),
        is_default=False,
    )
    db_session.add_all([m1, m2])
    await db_session.commit()

    # Set m2 as default
    success = await measurement_service.set_default_measurement(
        db=db_session,
        measurement_id=m2.id,
        customer_id=seed_customer.id,
        tenant_id=tenant_id,
    )

    assert success is True

    # Verify m1 is no longer default
    await db_session.refresh(m1)
    await db_session.refresh(m2)
    assert m1.is_default is False
    assert m2.is_default is True


@pytest.mark.asyncio
async def test_set_default_measurement_not_found(
    db_session: AsyncSession, seed_customer: CustomerProfileDB
):
    """Test setting default for non-existent measurement returns False."""
    fake_id = uuid.uuid4()

    success = await measurement_service.set_default_measurement(
        db=db_session,
        measurement_id=fake_id,
        customer_id=seed_customer.id,
        tenant_id=seed_customer.tenant_id,
    )

    assert success is False


# ===== Test update_measurement =====


@pytest.mark.asyncio
async def test_update_measurement_success(
    db_session: AsyncSession, seed_customer: CustomerProfileDB
):
    """Test updating measurement fields."""
    tenant_id = seed_customer.tenant_id

    measurement = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("90.0"),
        waist=Decimal("70.0"),
        hip=Decimal("95.0"),
    )
    db_session.add(measurement)
    await db_session.commit()

    # Update waist and hip
    update_data = MeasurementUpdateRequest(
        waist=Decimal("72.0"), hip=Decimal("97.0")
    )
    updated = await measurement_service.update_measurement(
        db=db_session,
        measurement_id=measurement.id,
        tenant_id=tenant_id,
        data=update_data,
    )

    assert updated is not None
    assert updated.waist == Decimal("72.0")
    assert updated.hip == Decimal("97.0")
    assert updated.bust == Decimal("90.0")  # Unchanged


@pytest.mark.asyncio
async def test_update_measurement_not_found(db_session: AsyncSession):
    """Test updating non-existent measurement returns None."""
    fake_id = uuid.uuid4()
    tenant_id = uuid.uuid4()
    update_data = MeasurementUpdateRequest(waist=Decimal("70.0"))

    updated = await measurement_service.update_measurement(
        db=db_session,
        measurement_id=fake_id,
        tenant_id=tenant_id,
        data=update_data,
    )

    assert updated is None


# ===== Test delete_measurement =====


@pytest.mark.asyncio
async def test_delete_measurement_success(
    db_session: AsyncSession, seed_customer: CustomerProfileDB
):
    """Test hard deleting measurement."""
    tenant_id = seed_customer.tenant_id

    measurement = MeasurementDB(
        customer_profile_id=seed_customer.id,
        tenant_id=tenant_id,
        bust=Decimal("90.0"),
    )
    db_session.add(measurement)
    await db_session.commit()
    measurement_id = measurement.id

    success = await measurement_service.delete_measurement(
        db=db_session, measurement_id=measurement_id, tenant_id=tenant_id
    )

    assert success is True

    # Verify measurement is deleted (hard delete)
    result = await db_session.get(MeasurementDB, measurement_id)
    assert result is None


@pytest.mark.asyncio
async def test_delete_measurement_not_found(db_session: AsyncSession):
    """Test deleting non-existent measurement returns False."""
    fake_id = uuid.uuid4()
    tenant_id = uuid.uuid4()

    success = await measurement_service.delete_measurement(
        db=db_session, measurement_id=fake_id, tenant_id=tenant_id
    )

    assert success is False
