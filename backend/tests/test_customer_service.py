"""Unit tests for Customer Service layer.

Story 1.3: Quản lý Hồ sơ & Số đo
Tests customer profile CRUD, account linking, and search functionality.
"""

import uuid
from datetime import date

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.customer import (
    CustomerProfileCreateRequest,
    CustomerProfileUpdateRequest,
)
from src.models.db_models import Base, CustomerProfileDB, UserDB
from src.services import customer_service

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
async def seed_test_user(db_session: AsyncSession) -> UserDB:
    """Seed a test user for account linking."""
    user = UserDB(
        email="existing@example.com",
        hashed_password="hashed",
        role="Customer",
        is_active=True,
        full_name="Existing User",
    )
    db_session.add(user)
    await db_session.commit()
    return user


# ===== Test create_customer_profile =====


@pytest.mark.asyncio
async def test_create_customer_profile_success(db_session: AsyncSession):
    """Test creating customer profile successfully."""
    tenant_id = uuid.uuid4()
    data = CustomerProfileCreateRequest(
        full_name="Nguyễn Văn A",
        phone="0901234567",
        email="nguyenvana@example.com",
        gender="Nam",
        address="123 ABC Street",
        notes="VIP customer",
    )

    customer = await customer_service.create_customer_profile(
        db=db_session, tenant_id=tenant_id, data=data
    )

    assert customer.full_name == "Nguyễn Văn A"
    assert customer.phone == "0901234567"
    assert customer.email == "nguyenvana@example.com"
    assert customer.gender == "Nam"
    assert customer.tenant_id == tenant_id
    assert customer.is_deleted is False


@pytest.mark.asyncio
async def test_create_customer_duplicate_phone_fails(db_session: AsyncSession):
    """Test creating customer with duplicate phone raises ValueError."""
    tenant_id = uuid.uuid4()

    # Create first customer
    data1 = CustomerProfileCreateRequest(full_name="First", phone="0901111111")
    await customer_service.create_customer_profile(
        db=db_session, tenant_id=tenant_id, data=data1
    )

    # Try to create second with same phone
    data2 = CustomerProfileCreateRequest(full_name="Second", phone="0901111111")
    with pytest.raises(ValueError, match="đã được sử dụng"):
        await customer_service.create_customer_profile(
            db=db_session, tenant_id=tenant_id, data=data2
        )


@pytest.mark.asyncio
async def test_create_customer_links_to_existing_user(
    db_session: AsyncSession, seed_test_user: UserDB
):
    """Test customer profile auto-links to existing user account by email."""
    tenant_id = uuid.uuid4()
    data = CustomerProfileCreateRequest(
        full_name="Test User",
        phone="0901234567",
        email="existing@example.com",  # Matches seed_test_user
    )

    customer = await customer_service.create_customer_profile(
        db=db_session, tenant_id=tenant_id, data=data
    )

    assert customer.user_id == seed_test_user.id
    assert customer.email == seed_test_user.email.lower()


# ===== Test get_customer_list =====


@pytest.mark.asyncio
async def test_get_customer_list_with_pagination(db_session: AsyncSession):
    """Test getting customer list with pagination."""
    tenant_id = uuid.uuid4()

    # Create 5 customers
    for i in range(5):
        customer = CustomerProfileDB(
            tenant_id=tenant_id,
            full_name=f"Customer {i}",
            phone=f"090111111{i}",
        )
        db_session.add(customer)
    await db_session.commit()

    # Get page 1 with limit 3
    customers, total = await customer_service.get_customer_list(
        db=db_session, tenant_id=tenant_id, page=1, limit=3
    )

    assert len(customers) == 3
    assert total == 5


@pytest.mark.asyncio
async def test_get_customer_list_with_search(db_session: AsyncSession):
    """Test searching customers by name, phone, or email."""
    tenant_id = uuid.uuid4()

    customers_data = [
        CustomerProfileDB(
            tenant_id=tenant_id,
            full_name="Nguyễn Văn A",
            phone="0901111111",
            email="nguyenvana@example.com",
        ),
        CustomerProfileDB(
            tenant_id=tenant_id, full_name="Trần Thị B", phone="0902222222"
        ),
        CustomerProfileDB(
            tenant_id=tenant_id, full_name="Lê Văn C", phone="0903333333"
        ),
    ]
    db_session.add_all(customers_data)
    await db_session.commit()

    # Search by name
    customers, total = await customer_service.get_customer_list(
        db=db_session, tenant_id=tenant_id, search="Nguyễn"
    )
    assert total == 1
    assert customers[0].full_name == "Nguyễn Văn A"

    # Search by phone
    customers, total = await customer_service.get_customer_list(
        db=db_session, tenant_id=tenant_id, search="0902"
    )
    assert total == 1
    assert customers[0].phone == "0902222222"


@pytest.mark.asyncio
async def test_get_customer_list_excludes_deleted(db_session: AsyncSession):
    """Test that soft-deleted customers are excluded from list."""
    tenant_id = uuid.uuid4()

    customer1 = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Active", phone="0901111111", is_deleted=False
    )
    customer2 = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Deleted", phone="0902222222", is_deleted=True
    )
    db_session.add_all([customer1, customer2])
    await db_session.commit()

    customers, total = await customer_service.get_customer_list(
        db=db_session, tenant_id=tenant_id
    )

    assert total == 1
    assert customers[0].full_name == "Active"


# ===== Test update_customer_profile =====


@pytest.mark.asyncio
async def test_update_customer_profile_success(db_session: AsyncSession):
    """Test updating customer profile fields."""
    tenant_id = uuid.uuid4()

    # Create customer
    customer = CustomerProfileDB(
        tenant_id=tenant_id,
        full_name="Original Name",
        phone="0901234567",
        email="original@example.com",
    )
    db_session.add(customer)
    await db_session.commit()

    # Update
    update_data = CustomerProfileUpdateRequest(
        full_name="Updated Name", address="New Address"
    )
    updated = await customer_service.update_customer_profile(
        db=db_session, customer_id=customer.id, tenant_id=tenant_id, data=update_data
    )

    assert updated is not None
    assert updated.full_name == "Updated Name"
    assert updated.address == "New Address"
    assert updated.phone == "0901234567"  # Unchanged


@pytest.mark.asyncio
async def test_update_customer_phone_duplicate_fails(db_session: AsyncSession):
    """Test updating phone to duplicate value raises ValueError."""
    tenant_id = uuid.uuid4()

    # Create two customers
    customer1 = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Customer 1", phone="0901111111"
    )
    customer2 = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Customer 2", phone="0902222222"
    )
    db_session.add_all([customer1, customer2])
    await db_session.commit()

    # Try to update customer2's phone to customer1's phone
    update_data = CustomerProfileUpdateRequest(phone="0901111111")
    with pytest.raises(ValueError, match="đã được sử dụng"):
        await customer_service.update_customer_profile(
            db=db_session,
            customer_id=customer2.id,
            tenant_id=tenant_id,
            data=update_data,
        )


# ===== Test soft_delete_customer =====


@pytest.mark.asyncio
async def test_soft_delete_customer_success(db_session: AsyncSession):
    """Test soft deleting customer marks is_deleted=True."""
    tenant_id = uuid.uuid4()

    customer = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Test", phone="0901234567"
    )
    db_session.add(customer)
    await db_session.commit()

    success = await customer_service.soft_delete_customer(
        db=db_session, customer_id=customer.id, tenant_id=tenant_id
    )

    assert success is True
    await db_session.refresh(customer)
    assert customer.is_deleted is True


@pytest.mark.asyncio
async def test_soft_delete_customer_not_found(db_session: AsyncSession):
    """Test soft deleting non-existent customer returns False."""
    tenant_id = uuid.uuid4()
    fake_id = uuid.uuid4()

    success = await customer_service.soft_delete_customer(
        db=db_session, customer_id=fake_id, tenant_id=tenant_id
    )

    assert success is False


# ===== Test link_customer_to_user_by_email =====


@pytest.mark.asyncio
async def test_link_customer_to_user_by_email_found(
    db_session: AsyncSession, seed_test_user: UserDB
):
    """Test linking returns user_id when email exists."""
    user_id = await customer_service.link_customer_to_user_by_email(
        db=db_session, email="existing@example.com"
    )

    assert user_id == seed_test_user.id


@pytest.mark.asyncio
async def test_link_customer_to_user_by_email_not_found(db_session: AsyncSession):
    """Test linking returns None when email doesn't exist."""
    user_id = await customer_service.link_customer_to_user_by_email(
        db=db_session, email="nonexistent@example.com"
    )

    assert user_id is None
