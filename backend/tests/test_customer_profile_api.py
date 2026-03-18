"""Tests for Customer Profile API endpoints (Story 4.4b).

Uses in-memory SQLite with inline fixtures — follows project test patterns.
Tests: GET profile, PATCH profile, change-password (happy + error paths).
"""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, TenantDB, UserDB

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
async def seed_user_data(test_db_session):
    """Seed a regular customer and an OAuth-only customer."""
    db = test_db_session

    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Test Shop", slug="test-shop")
    db.add(tenant)

    # Regular user with password
    customer = UserDB(
        id=uuid.uuid4(),
        email="customer@example.com",
        hashed_password=hash_password("OldPass1"),
        role="Customer",
        is_active=True,
        full_name="Nguyễn Thị Linh",
        phone="0901234567",
        gender="Nữ",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(customer)

    # OAuth-only user (no password)
    oauth_user = UserDB(
        id=uuid.uuid4(),
        email="google@example.com",
        hashed_password=None,  # OAuth user
        role="Customer",
        is_active=True,
        full_name="Google User",
        phone=None,
        gender=None,
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(oauth_user)

    await db.commit()
    await db.refresh(customer)
    await db.refresh(oauth_user)
    return {"customer": customer, "oauth_user": oauth_user}


def make_token(email: str) -> str:
    return create_access_token({"sub": email})


@pytest.fixture
def override_db(test_db_session):
    """Override FastAPI's get_db dependency with test session."""

    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


# ────────────────────────────────────────────────────────
# GET /api/v1/customers/me/profile
# ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_profile_success(seed_user_data, override_db):
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["email"] == customer.email
    assert data["full_name"] == "Nguyễn Thị Linh"
    assert data["has_password"] is True


@pytest.mark.asyncio
async def test_get_profile_oauth_user(seed_user_data, override_db):
    oauth_user = seed_user_data["oauth_user"]
    token = make_token(oauth_user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get(
            "/api/v1/customers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["has_password"] is False


@pytest.mark.asyncio
async def test_get_profile_unauthorized():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.get("/api/v1/customers/me/profile")

    assert resp.status_code == 401  # HTTPBearer returns 401 for missing/invalid token


# ────────────────────────────────────────────────────────
# PATCH /api/v1/customers/me/profile
# ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_patch_profile_success(seed_user_data, override_db):
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            "/api/v1/customers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"full_name": "Linh Nguyễn", "phone": "0987654321", "gender": "Nữ"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["full_name"] == "Linh Nguyễn"
    assert data["phone"] == "0987654321"
    # Email must not change
    assert data["email"] == customer.email


@pytest.mark.asyncio
async def test_patch_profile_invalid_gender(seed_user_data, override_db):
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            "/api/v1/customers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"gender": "Unknown"},
        )

    assert resp.status_code == 422  # Pydantic validation error


@pytest.mark.asyncio
async def test_patch_profile_invalid_phone(seed_user_data, override_db):
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            "/api/v1/customers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"phone": "123"},  # Too short, doesn't match VN format
        )

    assert resp.status_code == 422  # Pydantic validation error


# ────────────────────────────────────────────────────────
# POST /api/v1/customers/me/change-password
# ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_change_password_success(seed_user_data, override_db):
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/customers/me/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "OldPass1", "new_password": "NewPass99"},
        )

    assert resp.status_code == 200
    assert "Mật khẩu đã cập nhật" in resp.json()["data"]["message"]


@pytest.mark.asyncio
async def test_change_password_wrong_old_password(seed_user_data, override_db):
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/customers/me/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "WrongPass1", "new_password": "NewPass99"},
        )

    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "WRONG_PASSWORD"


@pytest.mark.asyncio
async def test_change_password_oauth_user(seed_user_data, override_db):
    oauth_user = seed_user_data["oauth_user"]
    token = make_token(oauth_user.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/customers/me/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "anything", "new_password": "NewPass99"},
        )

    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "NO_PASSWORD"


@pytest.mark.asyncio
async def test_change_password_weak_new_password(seed_user_data, override_db):
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.post(
            "/api/v1/customers/me/change-password",
            headers={"Authorization": f"Bearer {token}"},
            json={"old_password": "OldPass1", "new_password": "weak"},
        )

    assert resp.status_code == 400
    assert resp.json()["detail"]["code"] == "WEAK_PASSWORD"


# ────────────────────────────────────────────────────────
# PATCH — clearing fields (empty string → None)
# ────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_patch_profile_clear_gender(seed_user_data, override_db):
    """Sending gender="" should clear gender (store None, not empty string)."""
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            "/api/v1/customers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"gender": ""},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["gender"] is None


@pytest.mark.asyncio
async def test_patch_profile_clear_phone(seed_user_data, override_db):
    """Sending phone="" should clear phone (store None, not empty string)."""
    customer = seed_user_data["customer"]
    token = make_token(customer.email)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        resp = await ac.patch(
            "/api/v1/customers/me/profile",
            headers={"Authorization": f"Bearer {token}"},
            json={"phone": ""},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["phone"] is None
