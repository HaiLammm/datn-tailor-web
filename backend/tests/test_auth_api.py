"""API integration tests for authentication endpoints.

Tests POST /api/v1/auth/login and GET /api/v1/auth/me endpoints.
Story 1.1: AC2, AC5, AC7
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, UserDB

# Test database setup
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
async def seed_test_user(test_db_session: AsyncSession):
    """Seed a test user for authentication."""
    user = UserDB(
        email="test@example.com",
        hashed_password=hash_password("testpassword123"),
        role="Customer",
        is_active=True,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    await test_db_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def seed_inactive_user(test_db_session: AsyncSession):
    """Seed an inactive user for testing."""
    user = UserDB(
        email="inactive@example.com",
        hashed_password=hash_password("password"),
        role="Customer",
        is_active=False,
    )
    test_db_session.add(user)
    await test_db_session.commit()
    return user


@pytest.mark.asyncio
async def test_login_success(override_get_db, seed_test_user):
    """Test POST /auth/login with valid credentials returns token."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "testpassword123"},
        )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_wrong_password(override_get_db, seed_test_user):
    """Test POST /auth/login with wrong password returns 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com", "password": "wrongpassword"},
        )

    assert response.status_code == 401
    data = response.json()
    assert "detail" in data
    assert "mật khẩu" in data["detail"].lower()


@pytest.mark.asyncio
async def test_login_user_not_found(override_get_db):
    """Test POST /auth/login with non-existent user returns 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "nonexistent@example.com", "password": "password"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_login_inactive_user(override_get_db, seed_inactive_user):
    """Test POST /auth/login with inactive user returns 403."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "inactive@example.com", "password": "password"},
        )

    assert response.status_code == 403
    data = response.json()
    assert "vô hiệu" in data["detail"].lower()


@pytest.mark.asyncio
async def test_login_invalid_email_format(override_get_db):
    """Test POST /auth/login with invalid email format returns 422."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "not-an-email", "password": "password"},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_get_me_success(override_get_db, seed_test_user):
    """Test GET /auth/me with valid token returns user info."""
    token = create_access_token(data={"sub": seed_test_user.email, "role": seed_test_user.role})

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "test@example.com"
    assert data["role"] == "Customer"
    assert data["is_active"] is True
    assert "id" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_get_me_no_token(override_get_db):
    """Test GET /auth/me without token returns 401 (not 403)."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/auth/me")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_invalid_token(override_get_db):
    """Test GET /auth/me with invalid token returns 401."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token-here"},
        )

    assert response.status_code == 401
    data = response.json()
    assert "token" in data["detail"].lower()


@pytest.mark.asyncio
async def test_get_me_expired_token(override_get_db, seed_test_user):
    """Test GET /auth/me with manually expired token returns 401."""
    from datetime import timedelta, timezone, datetime

    # Create an already-expired token by setting exp in the past
    expired_time = datetime.now(timezone.utc) - timedelta(hours=1)

    # We need to create the token payload manually with exp
    from jose import jwt
    from src.core.config import settings

    payload = {
        "sub": seed_test_user.email,
        "role": seed_test_user.role,
        "exp": expired_time
    }
    token = jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_get_me_user_deleted(override_get_db, seed_test_user, test_db_session):
    """Test GET /auth/me when user is deleted returns 404."""
    token = create_access_token(data={"sub": seed_test_user.email, "role": seed_test_user.role})

    # Delete the user
    await test_db_session.delete(seed_test_user)
    await test_db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 404
