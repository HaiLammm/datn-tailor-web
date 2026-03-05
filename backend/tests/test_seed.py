"""Unit tests for seed_owner_account function.

Story 1.5: Khoi tao Tai khoan Chu tiem
Tests owner account creation and role elevation on startup.
"""

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import patch, AsyncMock

from src.core.config import settings
from src.core.security import hash_password
from src.models.db_models import Base, UserDB


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
async def mock_session_factory(db_engine):
    """Create a mock session factory that returns test sessions."""
    async_session_maker = sessionmaker(
        db_engine, class_=AsyncSession, expire_on_commit=False
    )

    class MockAsyncContextManager:
        def __init__(self):
            self.session = None

        async def __aenter__(self):
            self.session = async_session_maker()
            return self.session

        async def __aexit__(self, exc_type, exc_val, exc_tb):
            await self.session.close()

    def factory():
        return MockAsyncContextManager()

    return factory


@pytest.mark.asyncio
async def test_seed_owner_creates_new_owner(mock_session_factory, db_session) -> None:
    """Test seed_owner_account creates Owner if not exists.

    Story 1.5 AC2, AC3: System creates Owner account on startup if not exists.
    """
    from src.core.seed import seed_owner_account

    with patch("src.core.seed.async_session_factory", mock_session_factory):
        await seed_owner_account()

    # Verify owner was created
    from sqlalchemy import select

    result = await db_session.execute(
        select(UserDB).where(UserDB.email == settings.OWNER_EMAIL)
    )
    owner = result.scalar_one_or_none()

    assert owner is not None
    assert owner.email == settings.OWNER_EMAIL
    assert owner.role == "Owner"
    assert owner.is_active is True


@pytest.mark.asyncio
async def test_seed_owner_elevates_existing_user_role(
    mock_session_factory, db_session
) -> None:
    """Test seed_owner_account elevates role if user exists but is not Owner.

    Story 1.5 AC3: If user exists, ensure role is 'Owner'.
    """
    # Create a user with OWNER_EMAIL but role='Customer'
    existing_user = UserDB(
        email=settings.OWNER_EMAIL,
        hashed_password=hash_password("test"),
        role="Customer",
        is_active=True,
    )
    db_session.add(existing_user)
    await db_session.commit()

    from src.core.seed import seed_owner_account

    with patch("src.core.seed.async_session_factory", mock_session_factory):
        await seed_owner_account()

    # Refresh from DB
    await db_session.refresh(existing_user)
    assert existing_user.role == "Owner"


@pytest.mark.asyncio
async def test_seed_owner_activates_inactive_owner(
    mock_session_factory, db_session
) -> None:
    """Test seed_owner_account activates Owner if inactive.

    Story 1.5 AC3: Ensure Owner is always active.
    """
    # Create an inactive Owner
    existing_user = UserDB(
        email=settings.OWNER_EMAIL,
        hashed_password=hash_password("test"),
        role="Owner",
        is_active=False,
    )
    db_session.add(existing_user)
    await db_session.commit()

    from src.core.seed import seed_owner_account

    with patch("src.core.seed.async_session_factory", mock_session_factory):
        await seed_owner_account()

    await db_session.refresh(existing_user)
    assert existing_user.is_active is True


@pytest.mark.asyncio
async def test_seed_owner_no_change_if_already_owner(
    mock_session_factory, db_session
) -> None:
    """Test seed_owner_account makes no changes if user is already active Owner.

    Story 1.5: Idempotent behavior.
    """
    # Create a proper Owner
    existing_owner = UserDB(
        email=settings.OWNER_EMAIL,
        hashed_password=hash_password("owner-pass"),
        role="Owner",
        is_active=True,
    )
    db_session.add(existing_owner)
    await db_session.commit()
    original_id = existing_owner.id

    from src.core.seed import seed_owner_account

    with patch("src.core.seed.async_session_factory", mock_session_factory):
        await seed_owner_account()

    await db_session.refresh(existing_owner)
    assert existing_owner.id == original_id
    assert existing_owner.role == "Owner"
    assert existing_owner.is_active is True


@pytest.mark.asyncio
async def test_seed_owner_handles_db_error_gracefully(mock_session_factory) -> None:
    """Test seed_owner_account does not crash server on DB errors.

    Story 1.5 Task 2.2: Ensure startup is non-blocking.
    """
    from src.core.seed import seed_owner_account

    # Mock factory to raise an exception
    def failing_factory():
        raise Exception("DB connection failed")

    with patch("src.core.seed.async_session_factory", failing_factory):
        # Should not raise, just log warning
        await seed_owner_account()


@pytest.mark.asyncio
async def test_determine_role_uses_current_owner_email(db_session) -> None:
    """Test determine_role always uses current OWNER_EMAIL setting.

    Story 1.5 Validation: When OWNER_EMAIL changes, new email gets Owner role.
    """
    from src.services.auth_service import determine_role

    # Test with a different email (simulating OWNER_EMAIL change scenario)
    # The determine_role always checks settings.OWNER_EMAIL at runtime
    current_owner_email = settings.OWNER_EMAIL
    role = await determine_role(db_session, current_owner_email)
    assert role == "Owner"

    # Non-owner email should not get Owner role
    role_other = await determine_role(db_session, "other@example.com")
    assert role_other == "Customer"


@pytest.mark.asyncio
async def test_seed_owner_with_changed_email_creates_new_owner(
    mock_session_factory, db_session
) -> None:
    """Test when OWNER_EMAIL changes, new owner is created.

    Story 1.5 Validation: Changing OWNER_EMAIL creates new Owner.
    Previous owner remains (manual cleanup required).
    """
    # Create an "old" owner with different email
    old_owner = UserDB(
        email="old-owner@test.com",
        hashed_password=hash_password("test"),
        role="Owner",
        is_active=True,
    )
    db_session.add(old_owner)
    await db_session.commit()

    # seed_owner_account will create Owner for current OWNER_EMAIL
    from src.core.seed import seed_owner_account

    with patch("src.core.seed.async_session_factory", mock_session_factory):
        await seed_owner_account()

    # Verify new owner created for current OWNER_EMAIL
    from sqlalchemy import select

    result = await db_session.execute(
        select(UserDB).where(UserDB.email == settings.OWNER_EMAIL)
    )
    new_owner = result.scalar_one_or_none()
    assert new_owner is not None
    assert new_owner.role == "Owner"

    # Old owner still exists (not automatically demoted - by design)
    await db_session.refresh(old_owner)
    assert old_owner.role == "Owner"  # Still owner - manual cleanup required
