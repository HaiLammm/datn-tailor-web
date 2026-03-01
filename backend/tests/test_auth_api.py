"""API integration tests for authentication endpoints.

Tests POST /api/v1/auth/login, GET /api/v1/auth/me, and registration endpoints.
Story 1.1: AC2, AC5, AC7
Story 1.2: Registration, OTP verification, resend OTP
"""

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, patch

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, UserDB, OTPCodeDB
from src.services.otp_service import create_otp_record, generate_otp

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


# ==================== STORY 1.2: REGISTRATION TESTS ====================


class TestRegistration:
    """Tests for POST /api/v1/auth/register endpoint."""

    @pytest.mark.asyncio
    @patch("src.api.v1.auth.send_otp_email", new_callable=AsyncMock)
    async def test_register_success(self, mock_send_email, override_get_db):
        """Test successful user registration creates inactive user and sends OTP."""
        mock_send_email.return_value = True

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": "newuser@example.com",
                    "password": "SecurePass123!",
                    "full_name": "Nguyễn Văn A",
                    "phone": "0901234567",
                    "gender": "Male",
                },
            )

        assert response.status_code == 201
        data = response.json()
        assert "message" in data
        assert data["email"] == "newuser@example.com"
        assert "Đăng ký thành công" in data["message"]
        
        # Verify email was sent
        mock_send_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_register_email_already_exists(self, override_get_db, seed_test_user):
        """Test registration with existing email returns 409."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": seed_test_user.email,
                    "password": "AnotherPass123!",
                    "full_name": "Another User",
                },
            )

        assert response.status_code == 409
        assert "đã được đăng ký" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_register_invalid_email(self, override_get_db):
        """Test registration with invalid email format returns 422."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": "not-an-email",
                    "password": "SecurePass123!",
                    "full_name": "Test User",
                },
            )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_password_too_short(self, override_get_db):
        """Test registration with short password returns 422."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "short",
                    "full_name": "Test User",
                },
            )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_register_invalid_gender(self, override_get_db):
        """Test registration with invalid gender returns 422."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "SecurePass123!",
                    "full_name": "Test User",
                    "gender": "InvalidGender",
                },
            )

        assert response.status_code == 422

    @pytest.mark.asyncio
    @patch("src.api.v1.auth.send_otp_email", new_callable=AsyncMock)
    async def test_register_email_send_fails(self, mock_send_email, override_get_db):
        """Test registration when email sending fails returns 500."""
        mock_send_email.return_value = False

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": "test@example.com",
                    "password": "SecurePass123!",
                    "full_name": "Test User",
                },
            )

        assert response.status_code == 500
        assert "Không thể gửi email" in response.json()["detail"]

    @pytest.mark.asyncio
    @patch("src.api.v1.auth.send_otp_email", new_callable=AsyncMock)
    async def test_register_rate_limit_exceeded(self, mock_send_email, override_get_db, test_db_session):
        """Test registration rate limiting blocks after 3 requests (HIGH Priority Fix)."""
        mock_send_email.return_value = True
        
        # Create 3 OTP records for this email (hitting rate limit)
        from src.services.otp_service import create_otp_record
        test_email = "ratelimit@example.com"
        await create_otp_record(test_db_session, test_email, "111111")
        await create_otp_record(test_db_session, test_email, "222222")
        await create_otp_record(test_db_session, test_email, "333333")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/register",
                json={
                    "email": test_email,
                    "password": "SecurePass123!",
                    "full_name": "Rate Limit Test",
                },
            )

        assert response.status_code == 429  # Too Many Requests
        assert "quá nhiều yêu cầu" in response.json()["detail"]


class TestVerifyOTP:
    """Tests for POST /api/v1/auth/verify-otp endpoint."""

    @pytest.mark.asyncio
    async def test_verify_otp_success(self, override_get_db, test_db_session):
        """Test successful OTP verification."""
        # Create inactive user
        user = UserDB(
            email="test@example.com",
            hashed_password=hash_password("password123"),
            role="Customer",
            is_active=False,
            full_name="Test User",
        )
        test_db_session.add(user)
        await test_db_session.commit()

        # Create OTP
        otp_code = generate_otp()
        await create_otp_record(test_db_session, user.email, otp_code)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/verify-otp",
                json={
                    "email": user.email,
                    "code": otp_code,
                },
            )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

        # Verify user is now active
        await test_db_session.refresh(user)
        assert user.is_active is True

    @pytest.mark.asyncio
    async def test_verify_otp_wrong_code(self, override_get_db, test_db_session):
        """Test OTP verification with wrong code returns 400."""
        user = UserDB(
            email="test@example.com",
            hashed_password=hash_password("password123"),
            role="Customer",
            is_active=False,
            full_name="Test User",
        )
        test_db_session.add(user)
        await test_db_session.commit()

        otp_code = generate_otp()
        await create_otp_record(test_db_session, user.email, otp_code)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/verify-otp",
                json={
                    "email": user.email,
                    "code": "999999",  # Wrong code
                },
            )

        assert response.status_code == 400
        assert "không đúng" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_verify_otp_already_active(self, override_get_db, seed_test_user):
        """Test OTP verification for already active user returns 400."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/verify-otp",
                json={
                    "email": seed_test_user.email,
                    "code": "123456",
                },
            )

        assert response.status_code == 400
        assert "đã được kích hoạt" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_verify_otp_user_not_found(self, override_get_db):
        """Test OTP verification for non-existent user returns 404."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/verify-otp",
                json={
                    "email": "nonexistent@example.com",
                    "code": "123456",
                },
            )

        assert response.status_code == 404


class TestVerifyToken:
    """Tests for POST /api/v1/auth/verify-token endpoint (Story 1.2 Critical Fix)."""

    @pytest.mark.asyncio
    async def test_verify_token_success(self, override_get_db, seed_test_user):
        """Test successful JWT token verification returns user info."""
        # Create a valid JWT token
        token = create_access_token(data={"sub": seed_test_user.email, "role": seed_test_user.role})

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/verify-token",
                json={"token": token},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == seed_test_user.email
        assert data["role"] == seed_test_user.role
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_verify_token_invalid(self, override_get_db):
        """Test invalid JWT token returns 401."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/verify-token",
                json={"token": "invalid.jwt.token"},
            )

        assert response.status_code == 401
        assert "không hợp lệ" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_verify_token_user_not_found(self, override_get_db):
        """Test token for non-existent user returns 404."""
        # Create token for non-existent user
        token = create_access_token(data={"sub": "nonexistent@example.com", "role": "Customer"})

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/verify-token",
                json={"token": token},
            )

        assert response.status_code == 404
        assert "Không tìm thấy" in response.json()["detail"]


class TestResendOTP:
    """Tests for POST /api/v1/auth/resend-otp endpoint."""

    @pytest.mark.asyncio
    @patch("src.api.v1.auth.send_otp_email", new_callable=AsyncMock)
    async def test_resend_otp_success(self, mock_send_email, override_get_db, test_db_session):
        """Test successful OTP resend."""
        mock_send_email.return_value = True

        # Create inactive user
        user = UserDB(
            email="test@example.com",
            hashed_password=hash_password("password123"),
            role="Customer",
            is_active=False,
            full_name="Test User",
        )
        test_db_session.add(user)
        await test_db_session.commit()

        # Create old OTP
        old_otp = generate_otp()
        await create_otp_record(test_db_session, user.email, old_otp)

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/resend-otp",
                json={"email": user.email},
            )

        assert response.status_code == 200
        assert "Mã OTP mới" in response.json()["message"]
        mock_send_email.assert_called_once()

    @pytest.mark.asyncio
    async def test_resend_otp_user_not_found(self, override_get_db):
        """Test resend OTP for non-existent user returns 404."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/resend-otp",
                json={"email": "nonexistent@example.com"},
            )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_resend_otp_already_active(self, override_get_db, seed_test_user):
        """Test resend OTP for active user returns 400."""
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/resend-otp",
                json={"email": seed_test_user.email},
            )

        assert response.status_code == 400
        assert "đã được kích hoạt" in response.json()["detail"]

    @pytest.mark.asyncio
    @patch("src.api.v1.auth.send_otp_email", new_callable=AsyncMock)
    async def test_resend_otp_rate_limit_exceeded(self, mock_send_email, override_get_db, test_db_session):
        """Test resend OTP rate limiting blocks after 3 requests (HIGH Priority Fix)."""
        mock_send_email.return_value = True
        
        # Create inactive user
        user = UserDB(
            email="ratelimit2@example.com",
            hashed_password=hash_password("password123"),
            role="Customer",
            is_active=False,
            full_name="Rate Limit Test",
        )
        test_db_session.add(user)
        await test_db_session.commit()
        
        # Create 3 OTP records (hitting rate limit)
        await create_otp_record(test_db_session, user.email, "111111")
        await create_otp_record(test_db_session, user.email, "222222")
        await create_otp_record(test_db_session, user.email, "333333")

        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post(
                "/api/v1/auth/resend-otp",
                json={"email": user.email},
            )

        assert response.status_code == 429  # Too Many Requests
        assert "quá nhiều yêu cầu" in response.json()["detail"]
