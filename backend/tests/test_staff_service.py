"""Unit tests for StaffService.

Tests CRUD operations on staff_whitelist table.
Story 1.4: Staff Whitelist Management
"""

import uuid

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.models.db_models import Base, StaffWhitelistDB, UserDB
from src.services.staff_service import (
    add_staff_to_whitelist,
    get_active_staff_users,
    get_all_whitelist_entries,
    get_whitelist_entry_by_id,
    remove_staff_from_whitelist,
)

# Test database setup using SQLite in-memory
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
async def seed_test_data(db_session: AsyncSession) -> dict:
    """Seed test database with sample staff and users."""
    # Create whitelist entries
    tailor1 = StaffWhitelistDB(
        email="tailor1@test.com",
        role="Tailor",
        created_by="owner@test.com",
    )
    tailor2 = StaffWhitelistDB(
        email="tailor2@test.com",
        role="Tailor",
        created_by="owner@test.com",
    )

    db_session.add_all([tailor1, tailor2])
    await db_session.commit()
    await db_session.refresh(tailor1)
    await db_session.refresh(tailor2)

    # Create active staff users
    owner_user = UserDB(
        email="owner@test.com",
        role="Owner",
        hashed_password="hashed_pw",
        is_active=True,
        full_name="Owner User",
    )
    tailor_user = UserDB(
        email="tailor1@test.com",
        role="Tailor",
        hashed_password="hashed_pw",
        is_active=True,
        full_name="Tailor One",
    )
    customer_user = UserDB(
        email="customer@test.com",
        role="Customer",
        hashed_password="hashed_pw",
        is_active=True,
        full_name="Customer User",
    )

    db_session.add_all([owner_user, tailor_user, customer_user])
    await db_session.commit()

    return {"tailor1_id": tailor1.id, "tailor2_id": tailor2.id}


@pytest.mark.asyncio
async def test_get_all_whitelist_entries(db_session: AsyncSession, seed_test_data: dict) -> None:
    """Test retrieving all whitelist entries."""
    entries = await get_all_whitelist_entries(db_session)
    assert len(entries) == 2
    assert all(isinstance(entry, StaffWhitelistDB) for entry in entries)
    emails = [entry.email for entry in entries]
    assert "tailor1@test.com" in emails
    assert "tailor2@test.com" in emails


@pytest.mark.asyncio
async def test_get_active_staff_users(db_session: AsyncSession, seed_test_data: dict) -> None:
    """Test retrieving active staff users (Owner and Tailor roles)."""
    staff = await get_active_staff_users(db_session)
    assert len(staff) == 2  # Owner and Tailor, not Customer
    roles = [user.role for user in staff]
    assert "Owner" in roles
    assert "Tailor" in roles
    assert "Customer" not in roles


@pytest.mark.asyncio
async def test_add_staff_to_whitelist_success(db_session: AsyncSession) -> None:
    """Test adding a new staff member to whitelist."""
    new_entry = await add_staff_to_whitelist(
        db_session, email="newstaff@test.com", role="Tailor", created_by_email="owner@test.com"
    )

    assert new_entry is not None
    assert new_entry.email == "newstaff@test.com"
    assert new_entry.role == "Tailor"
    assert new_entry.created_by == "owner@test.com"


@pytest.mark.asyncio
async def test_add_staff_duplicate_email(db_session: AsyncSession, seed_test_data: dict) -> None:
    """Test adding a duplicate email returns None."""
    new_entry = await add_staff_to_whitelist(
        db_session,
        email="tailor1@test.com",  # Already exists
        role="Tailor",
        created_by_email="owner@test.com",
    )

    assert new_entry is None


@pytest.mark.asyncio
async def test_add_staff_owner_email_forbidden(db_session: AsyncSession) -> None:
    """Test that adding OWNER_EMAIL to whitelist raises ValueError."""
    with pytest.raises(ValueError, match="Không thể thêm email Owner"):
        await add_staff_to_whitelist(
            db_session,
            email=settings.OWNER_EMAIL,
            role="Owner",
            created_by_email="owner@test.com",
        )


@pytest.mark.asyncio
async def test_remove_staff_from_whitelist_success(
    db_session: AsyncSession, seed_test_data: dict
) -> None:
    """Test removing a staff member from whitelist."""
    entry_id = seed_test_data["tailor1_id"]

    success = await remove_staff_from_whitelist(
        db_session, entry_id=entry_id, requester_email="owner@test.com"
    )

    assert success is True

    # Verify removed
    entry = await get_whitelist_entry_by_id(db_session, entry_id)
    assert entry is None


@pytest.mark.asyncio
async def test_remove_staff_not_found(db_session: AsyncSession) -> None:
    """Test removing non-existent entry returns False."""
    fake_id = uuid.uuid4()

    success = await remove_staff_from_whitelist(
        db_session, entry_id=fake_id, requester_email="owner@test.com"
    )

    assert success is False


@pytest.mark.asyncio
async def test_remove_staff_cannot_remove_self(
    db_session: AsyncSession, seed_test_data: dict
) -> None:
    """Test that Owner cannot remove their own email from whitelist."""
    entry_id = seed_test_data["tailor1_id"]

    with pytest.raises(ValueError, match="Không thể xóa email của chính mình"):
        await remove_staff_from_whitelist(
            db_session,
            entry_id=entry_id,
            requester_email="tailor1@test.com",  # Same as the entry
        )


@pytest.mark.asyncio
async def test_get_whitelist_entry_by_id(db_session: AsyncSession, seed_test_data: dict) -> None:
    """Test retrieving a specific whitelist entry by ID."""
    entry_id = seed_test_data["tailor1_id"]

    entry = await get_whitelist_entry_by_id(db_session, entry_id)

    assert entry is not None
    assert entry.id == entry_id
    assert entry.email == "tailor1@test.com"


@pytest.mark.asyncio
async def test_get_whitelist_entry_by_id_not_found(db_session: AsyncSession) -> None:
    """Test retrieving non-existent entry returns None."""
    fake_id = uuid.uuid4()

    entry = await get_whitelist_entry_by_id(db_session, fake_id)

    assert entry is None
