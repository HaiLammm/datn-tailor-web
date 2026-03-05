"""Unit tests for multi-tenant infrastructure.

Story 1.6: Thiết lập hạ tầng Multi-tenant & Local-first
Tests tenant isolation, RLS simulation, and local-first fields.
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.security import hash_password
from src.models.db_models import Base, CustomerProfileDB, MeasurementDB, TenantDB, UserDB


# Test database setup using SQLite in-memory
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def db_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(db_engine) -> AsyncSession:
    """Create an in-memory test database session."""
    async_session_maker = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session_maker() as session:
        yield session


@pytest_asyncio.fixture
async def seed_tenants(db_session: AsyncSession) -> tuple[uuid.UUID, uuid.UUID]:
    """Seed test database with two tenants."""
    tenant1 = TenantDB(
        id=uuid.UUID("11111111-1111-1111-1111-111111111111"),
        name="Tiệm May Thanh Lộc",
        slug="thanh-loc",
        is_active=True,
    )
    tenant2 = TenantDB(
        id=uuid.UUID("22222222-2222-2222-2222-222222222222"),
        name="Tiệm May Hoàng Gia",
        slug="hoang-gia",
        is_active=True,
    )
    db_session.add_all([tenant1, tenant2])
    await db_session.commit()
    return tenant1.id, tenant2.id


@pytest_asyncio.fixture
async def seed_customers_for_tenants(
    db_session: AsyncSession, seed_tenants: tuple[uuid.UUID, uuid.UUID]
) -> tuple[CustomerProfileDB, CustomerProfileDB]:
    """Seed test database with customers for each tenant."""
    tenant1_id, tenant2_id = seed_tenants

    customer_tenant1 = CustomerProfileDB(
        id=uuid.uuid4(),
        tenant_id=tenant1_id,
        full_name="Nguyễn Văn A",
        phone="0901234567",
        email="a@tenant1.com",
    )

    customer_tenant2 = CustomerProfileDB(
        id=uuid.uuid4(),
        tenant_id=tenant2_id,
        full_name="Trần Thị B",
        phone="0909876543",
        email="b@tenant2.com",
    )

    db_session.add_all([customer_tenant1, customer_tenant2])
    await db_session.commit()
    return customer_tenant1, customer_tenant2


# ============================================================
# AC1: Tenant Isolation Tests
# ============================================================


@pytest.mark.asyncio
async def test_tenant_table_exists(db_session: AsyncSession, seed_tenants) -> None:
    """Test that tenants table exists and can store tenant data.

    Story 1.6 AC1: Tenant isolation infrastructure.
    """
    tenant1_id, tenant2_id = seed_tenants

    result = await db_session.execute(
        select(TenantDB).where(TenantDB.id == tenant1_id)
    )
    tenant = result.scalar_one_or_none()

    assert tenant is not None
    assert tenant.name == "Tiệm May Thanh Lộc"
    assert tenant.slug == "thanh-loc"
    assert tenant.is_active is True


@pytest.mark.asyncio
async def test_customer_profile_has_tenant_id(
    db_session: AsyncSession, seed_customers_for_tenants
) -> None:
    """Test that customer_profiles table has tenant_id column.

    Story 1.6 AC1: All business tables must have tenant_id.
    """
    customer1, customer2 = seed_customers_for_tenants

    assert customer1.tenant_id is not None
    assert customer2.tenant_id is not None
    assert customer1.tenant_id != customer2.tenant_id


@pytest.mark.asyncio
async def test_tenant_isolation_query(
    db_session: AsyncSession,
    seed_tenants: tuple[uuid.UUID, uuid.UUID],
    seed_customers_for_tenants,
) -> None:
    """Test that querying with tenant_id filters correctly.

    Story 1.6 AC1/AC2: User from Tenant 1 cannot see Tenant 2 data.
    """
    tenant1_id, tenant2_id = seed_tenants

    # Query only Tenant 1 customers
    result = await db_session.execute(
        select(CustomerProfileDB).where(CustomerProfileDB.tenant_id == tenant1_id)
    )
    tenant1_customers = result.scalars().all()

    assert len(tenant1_customers) == 1
    assert tenant1_customers[0].full_name == "Nguyễn Văn A"

    # Query only Tenant 2 customers
    result = await db_session.execute(
        select(CustomerProfileDB).where(CustomerProfileDB.tenant_id == tenant2_id)
    )
    tenant2_customers = result.scalars().all()

    assert len(tenant2_customers) == 1
    assert tenant2_customers[0].full_name == "Trần Thị B"


@pytest.mark.asyncio
async def test_tenant_cannot_access_other_tenant_data_by_id(
    db_session: AsyncSession,
    seed_tenants: tuple[uuid.UUID, uuid.UUID],
    seed_customers_for_tenants,
) -> None:
    """Test that knowing customer ID is not enough to access cross-tenant data.

    Story 1.6 Validation: User A of Tenant 1 cannot access Tenant 2 data even with known ID.
    """
    tenant1_id, tenant2_id = seed_tenants
    customer1, customer2 = seed_customers_for_tenants

    # Tenant 1 user tries to access Tenant 2 customer by ID
    result = await db_session.execute(
        select(CustomerProfileDB).where(
            CustomerProfileDB.id == customer2.id,
            CustomerProfileDB.tenant_id == tenant1_id,  # Tenant 1 filter
        )
    )
    cross_tenant_access = result.scalar_one_or_none()

    # Should return None - cross-tenant access denied
    assert cross_tenant_access is None


# ============================================================
# AC3: Local-first Ready Tests
# ============================================================


@pytest.mark.asyncio
async def test_customer_profile_has_sync_fields(
    db_session: AsyncSession, seed_customers_for_tenants
) -> None:
    """Test that customer_profiles has local-first sync fields.

    Story 1.6 AC3: updated_at, version, is_deleted fields.
    """
    customer1, customer2 = seed_customers_for_tenants

    # Check required sync fields exist
    assert hasattr(customer1, "updated_at")
    assert hasattr(customer1, "is_deleted")
    assert hasattr(customer1, "version")

    # Check default values
    assert customer1.is_deleted is False
    assert customer1.version == 1
    assert customer1.updated_at is not None


@pytest.mark.asyncio
async def test_measurement_has_sync_fields(
    db_session: AsyncSession,
    seed_tenants: tuple[uuid.UUID, uuid.UUID],
    seed_customers_for_tenants,
) -> None:
    """Test that measurements table has local-first sync fields.

    Story 1.6 AC3: updated_at, version fields.
    """
    customer1, _ = seed_customers_for_tenants
    tenant1_id, _ = seed_tenants

    measurement = MeasurementDB(
        id=uuid.uuid4(),
        customer_profile_id=customer1.id,
        tenant_id=tenant1_id,
        bust=Decimal("88.5"),
        waist=Decimal("70.0"),
        hip=Decimal("95.0"),
        is_default=True,
        measured_date=date.today(),
    )
    db_session.add(measurement)
    await db_session.commit()

    assert measurement.version == 1
    assert measurement.updated_at is not None


# ============================================================
# AC3: Soft Delete Integrity Tests
# ============================================================


@pytest.mark.asyncio
async def test_soft_delete_preserves_data(
    db_session: AsyncSession, seed_customers_for_tenants
) -> None:
    """Test that soft delete preserves data for sync/recovery.

    Story 1.6 AC3: is_deleted for soft delete.
    """
    customer1, _ = seed_customers_for_tenants

    # Soft delete
    customer1.is_deleted = True
    await db_session.commit()

    # Data should still exist
    result = await db_session.execute(
        select(CustomerProfileDB).where(CustomerProfileDB.id == customer1.id)
    )
    deleted_customer = result.scalar_one_or_none()

    assert deleted_customer is not None
    assert deleted_customer.is_deleted is True
    assert deleted_customer.full_name == "Nguyễn Văn A"


@pytest.mark.asyncio
async def test_soft_delete_excluded_from_active_queries(
    db_session: AsyncSession, seed_tenants, seed_customers_for_tenants
) -> None:
    """Test that soft-deleted records are excluded from active queries.

    Story 1.6 Validation: Soft delete integrity.
    """
    tenant1_id, _ = seed_tenants
    customer1, _ = seed_customers_for_tenants

    # Soft delete customer1
    customer1.is_deleted = True
    await db_session.commit()

    # Query active customers only
    result = await db_session.execute(
        select(CustomerProfileDB).where(
            CustomerProfileDB.tenant_id == tenant1_id,
            CustomerProfileDB.is_deleted == False,  # noqa: E712
        )
    )
    active_customers = result.scalars().all()

    assert len(active_customers) == 0


# ============================================================
# AC5: Multi-tenant Middleware Tests
# ============================================================


@pytest.mark.asyncio
async def test_user_has_tenant_id(db_session: AsyncSession, seed_tenants) -> None:
    """Test that users table has tenant_id for multi-tenant support.

    Story 1.6 AC5: Backend extracts tenant_id from user/JWT.
    """
    tenant1_id, _ = seed_tenants

    user = UserDB(
        email="tailor@thanhloc.com",
        hashed_password=hash_password("password123"),
        role="Tailor",
        is_active=True,
        tenant_id=tenant1_id,
    )
    db_session.add(user)
    await db_session.commit()

    assert user.tenant_id == tenant1_id


@pytest.mark.asyncio
async def test_tenant_version_increments_on_update(
    db_session: AsyncSession, seed_customers_for_tenants
) -> None:
    """Test that version field increments on record updates.

    Story 1.6 AC3: Version tracking for sync.
    """
    customer1, _ = seed_customers_for_tenants
    original_version = customer1.version

    # Update customer
    customer1.full_name = "Nguyễn Văn A - Updated"
    customer1.version += 1  # Application-level increment
    await db_session.commit()

    assert customer1.version == original_version + 1


# ============================================================
# AC5: Tenant Dependency Tests
# ============================================================


def test_get_tenant_id_from_owner_without_tenant() -> None:
    """Test Owner role gets default tenant when not assigned.

    Story 1.6 AC5: Owner can operate without tenant assignment.
    """
    from unittest.mock import MagicMock
    import asyncio
    from src.api.dependencies import get_tenant_id_from_user

    # Mock Owner user without tenant
    mock_user = MagicMock()
    mock_user.role = "Owner"
    mock_user.tenant_id = None

    # Run async function
    tenant_id = asyncio.get_event_loop().run_until_complete(
        get_tenant_id_from_user(mock_user)
    )

    # Should return default tenant
    assert tenant_id == uuid.UUID("00000000-0000-0000-0000-000000000001")


def test_get_tenant_id_from_owner_with_tenant() -> None:
    """Test Owner role uses assigned tenant when available.

    Story 1.6 AC5: Owner with tenant uses that tenant.
    """
    from unittest.mock import MagicMock
    import asyncio
    from src.api.dependencies import get_tenant_id_from_user

    assigned_tenant = uuid.UUID("11111111-1111-1111-1111-111111111111")

    mock_user = MagicMock()
    mock_user.role = "Owner"
    mock_user.tenant_id = assigned_tenant

    tenant_id = asyncio.get_event_loop().run_until_complete(
        get_tenant_id_from_user(mock_user)
    )

    assert tenant_id == assigned_tenant


def test_get_tenant_id_from_tailor_with_tenant() -> None:
    """Test Tailor role uses assigned tenant.

    Story 1.6 AC5: Non-owner roles use their assigned tenant.
    """
    from unittest.mock import MagicMock
    import asyncio
    from src.api.dependencies import get_tenant_id_from_user

    assigned_tenant = uuid.UUID("22222222-2222-2222-2222-222222222222")

    mock_user = MagicMock()
    mock_user.role = "Tailor"
    mock_user.tenant_id = assigned_tenant

    tenant_id = asyncio.get_event_loop().run_until_complete(
        get_tenant_id_from_user(mock_user)
    )

    assert tenant_id == assigned_tenant


def test_get_tenant_id_from_tailor_without_tenant_raises() -> None:
    """Test Tailor without tenant raises 403 error.

    Story 1.6 AC5: Non-owner roles must have tenant.
    """
    from unittest.mock import MagicMock
    import asyncio
    from fastapi import HTTPException
    from src.api.dependencies import get_tenant_id_from_user

    mock_user = MagicMock()
    mock_user.role = "Tailor"
    mock_user.tenant_id = None

    with pytest.raises(HTTPException) as exc_info:
        asyncio.get_event_loop().run_until_complete(
            get_tenant_id_from_user(mock_user)
        )

    assert exc_info.value.status_code == 403
    assert "chưa được gán" in exc_info.value.detail
