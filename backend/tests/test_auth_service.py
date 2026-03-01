"""Unit tests for authentication service functions.

Tests authenticate_user, get_user_by_email, and determine_role logic.
Story 1.1: AC2, AC3
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
from src.core.security import hash_password
from src.models.db_models import Base, StaffWhitelistDB, UserDB
from src.services.auth_service import authenticate_user, determine_role, get_user_by_email


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
async def seed_test_users(db_session: AsyncSession) -> None:
    """Seed test database with sample users."""
    # Customer user with password
    customer = UserDB(
        email="customer@test.com",
        hashed_password=hash_password("customer123"),
        role="Customer",
        is_active=True,
    )

    # OAuth user (no password)
    oauth_user = UserDB(
        email="oauth@test.com",
        hashed_password=None,
        role="Customer",
        is_active=True,
    )

    # Inactive user
    inactive_user = UserDB(
        email="inactive@test.com",
        hashed_password=hash_password("password"),
        role="Customer",
        is_active=False,
    )

    db_session.add_all([customer, oauth_user, inactive_user])

    # Add staff whitelist entry
    tailor = StaffWhitelistDB(
        email="tailor@test.com",
        role="Tailor",
        created_by="admin@test.com",
    )
    db_session.add(tailor)

    await db_session.commit()


@pytest.mark.asyncio
async def test_get_user_by_email_found(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test get_user_by_email returns user when email exists."""
    user = await get_user_by_email(db_session, "customer@test.com")
    assert user is not None
    assert user.email == "customer@test.com"
    assert user.role == "Customer"


@pytest.mark.asyncio
async def test_get_user_by_email_not_found(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test get_user_by_email returns None when email does not exist."""
    user = await get_user_by_email(db_session, "nonexistent@test.com")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_user_success(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test authenticate_user with valid credentials."""
    user = await authenticate_user(db_session, "customer@test.com", "customer123")
    assert user is not None
    assert user.email == "customer@test.com"


@pytest.mark.asyncio
async def test_authenticate_user_wrong_password(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test authenticate_user with incorrect password."""
    user = await authenticate_user(db_session, "customer@test.com", "wrongpassword")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_user_nonexistent_email(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test authenticate_user with non-existent email."""
    user = await authenticate_user(db_session, "nobody@test.com", "password")
    assert user is None


@pytest.mark.asyncio
async def test_authenticate_user_oauth_only(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test authenticate_user fails for OAuth-only users (no password)."""
    user = await authenticate_user(db_session, "oauth@test.com", "anypassword")
    assert user is None


@pytest.mark.asyncio
async def test_determine_role_owner(db_session: AsyncSession) -> None:
    """Test determine_role returns 'Owner' for OWNER_EMAIL."""
    role = await determine_role(db_session, settings.OWNER_EMAIL)
    assert role == "Owner"


@pytest.mark.asyncio
async def test_determine_role_tailor_from_whitelist(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test determine_role returns 'Tailor' for staff whitelist."""
    role = await determine_role(db_session, "tailor@test.com")
    assert role == "Tailor"


@pytest.mark.asyncio
async def test_determine_role_customer_default(db_session: AsyncSession, seed_test_users: None) -> None:
    """Test determine_role returns 'Customer' for unknown emails."""
    role = await determine_role(db_session, "customer@test.com")
    assert role == "Customer"


@pytest.mark.asyncio
async def test_determine_role_case_insensitive_owner(db_session: AsyncSession) -> None:
    """Test determine_role is case-insensitive for Owner email."""
    owner_email_upper = settings.OWNER_EMAIL.upper()
    role = await determine_role(db_session, owner_email_upper)
    assert role == "Owner"
