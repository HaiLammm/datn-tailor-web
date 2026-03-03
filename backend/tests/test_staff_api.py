"""Integration tests for Staff API endpoints.

Tests staff management API with RBAC enforcement.
Story 1.4: AC1, AC2, AC5
"""

import uuid

import pytest
import pytest_asyncio
from fastapi import status
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, StaffWhitelistDB, UserDB

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    """Create test database session."""
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def override_get_db(test_db_session):
    """Override FastAPI dependency to use test database."""
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_users_and_whitelist(test_db_session: AsyncSession) -> dict:
    """Seed test users and whitelist entries."""
    # Create users
    owner = UserDB(
        email="owner@test.com",
        role="Owner",
        hashed_password=hash_password("ownerpass"),
        is_active=True,
        full_name="Owner User",
    )
    tailor = UserDB(
        email="tailor@test.com",
        role="Tailor",
        hashed_password=hash_password("tailorpass"),
        is_active=True,
        full_name="Tailor User",
    )
    customer = UserDB(
        email="customer@test.com",
        role="Customer",
        hashed_password=hash_password("customerpass"),
        is_active=True,
        full_name="Customer User",
    )

    test_db_session.add_all([owner, tailor, customer])
    await test_db_session.commit()

    # Create whitelist entry
    whitelist_entry = StaffWhitelistDB(
        email="tailor@test.com",
        role="Tailor",
        created_by="owner@test.com",
    )
    test_db_session.add(whitelist_entry)
    await test_db_session.commit()
    await test_db_session.refresh(whitelist_entry)

    return {
        "owner_token": create_access_token({"sub": owner.email}),
        "tailor_token": create_access_token({"sub": tailor.email}),
        "customer_token": create_access_token({"sub": customer.email}),
        "whitelist_entry_id": str(whitelist_entry.id),
    }


@pytest.mark.asyncio
async def test_get_staff_management_data_owner_success(
    override_get_db, seed_users_and_whitelist: dict,
) -> None:
    """Test Owner can retrieve staff management data."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/staff/",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['owner_token']}"},
        )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "whitelist" in data
    assert "active_staff" in data
    assert len(data["whitelist"]) >= 1
    assert len(data["active_staff"]) >= 2  # Owner + Tailor


@pytest.mark.asyncio
async def test_get_staff_management_data_tailor_forbidden(
    override_get_db, seed_users_and_whitelist: dict,
) -> None:
    """Test Tailor cannot access staff management (403 Forbidden)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/staff/",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['tailor_token']}"},
        )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_get_staff_management_data_customer_forbidden(
    override_get_db, seed_users_and_whitelist: dict,
) -> None:
    """Test Customer cannot access staff management (403 Forbidden)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/staff/",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['customer_token']}"},
        )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_add_staff_member_owner_success(override_get_db, seed_users_and_whitelist: dict) -> None:
    """Test Owner can add new staff member."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/staff/",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['owner_token']}"},
            json={"email": "newstaff@test.com", "role": "Tailor"},
        )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["email"] == "newstaff@test.com"
    assert data["role"] == "Tailor"
    assert "id" in data


@pytest.mark.asyncio
async def test_add_staff_member_duplicate_email(override_get_db, seed_users_and_whitelist: dict) -> None:
    """Test adding duplicate email returns 400 Bad Request."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/staff/",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['owner_token']}"},
            json={"email": "tailor@test.com", "role": "Tailor"},  # Already exists
        )

    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.asyncio
async def test_add_staff_member_invalid_role(override_get_db, seed_users_and_whitelist: dict) -> None:
    """Test adding staff with invalid role returns 422 Validation Error."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/staff/",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['owner_token']}"},
            json={"email": "invalid@test.com", "role": "InvalidRole"},
        )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_add_staff_member_tailor_forbidden(override_get_db, seed_users_and_whitelist: dict) -> None:
    """Test Tailor cannot add staff members (403 Forbidden)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/staff/",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['tailor_token']}"},
            json={"email": "newstaff@test.com", "role": "Tailor"},
        )

    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_remove_staff_member_owner_success(override_get_db, seed_users_and_whitelist: dict) -> None:
    """Test Owner can remove staff member."""
    entry_id = seed_users_and_whitelist["whitelist_entry_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.delete(
            f"/api/v1/staff/{entry_id}",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['owner_token']}"},
        )

    assert response.status_code == status.HTTP_204_NO_CONTENT


@pytest.mark.asyncio
async def test_remove_staff_member_not_found(override_get_db, seed_users_and_whitelist: dict) -> None:
    """Test removing non-existent entry returns 404."""
    fake_id = str(uuid.uuid4())

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.delete(
            f"/api/v1/staff/{fake_id}",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['owner_token']}"},
        )

    assert response.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.asyncio
async def test_remove_staff_member_tailor_forbidden(override_get_db, seed_users_and_whitelist: dict) -> None:
    """Test Tailor cannot remove staff members (403 Forbidden)."""
    entry_id = seed_users_and_whitelist["whitelist_entry_id"]

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.delete(
            f"/api/v1/staff/{entry_id}",
            headers={"Authorization": f"Bearer {seed_users_and_whitelist['tailor_token']}"},
        )

    assert response.status_code == status.HTTP_403_FORBIDDEN
