import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from unittest.mock import AsyncMock, patch

from src.core.database import get_db
from src.core.security import hash_password
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

@pytest.mark.asyncio
@patch("src.api.v1.auth.send_reset_password_email", new_callable=AsyncMock)
async def test_forgot_password_success(mock_send_email, override_get_db, test_db_session: AsyncSession):
    """Test successful forgot password request."""
    mock_send_email.return_value = True
    # Create a user
    email = "recovery@example.com"
    user = UserDB(
        email=email,
        hashed_password=hash_password("oldpassword"),
        is_active=True,
        full_name="Recovery User"
    )
    test_db_session.add(user)
    await test_db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Request password recovery
        response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": email}
        )
    
    assert response.status_code == 200
    assert response.json()["message"] == "Hướng dẫn khôi phục mật khẩu đã được gửi đến email của bạn."
    assert response.json()["email"] == email

    # Verify OTP was created with correct purpose
    result = await test_db_session.execute(
        select(OTPCodeDB).where(OTPCodeDB.email == email)
    )
    otp = result.scalar_one()
    assert otp.purpose == "recovery"
    assert otp.is_used is False
    mock_send_email.assert_called_once()

@pytest.mark.asyncio
async def test_forgot_password_user_not_found(override_get_db):
    """Test forgot password with non-existent email."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/v1/auth/forgot-password",
            json={"email": "nonexistent@example.com"}
        )
    
    assert response.status_code == 404
    assert "Không tìm thấy tài khoản" in response.json()["detail"]

@pytest.mark.asyncio
async def test_reset_password_success(override_get_db, test_db_session: AsyncSession):
    """Test successful password reset."""
    # Create a user
    email = "reset@example.com"
    user = UserDB(
        email=email,
        hashed_password=hash_password("oldpassword"),
        is_active=True,
        full_name="Reset User"
    )
    test_db_session.add(user)
    await test_db_session.commit()

    # Add OTP manually for testing
    otp_record = await create_otp_record(test_db_session, email, "123456", purpose="recovery")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Reset password
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "email": email,
                "code": "123456",
                "new_password": "newsecurepassword"
            }
        )
    
    assert response.status_code == 200
    assert "Đặt lại mật khẩu thành công" in response.json()["message"]

    # Verify password was updated
    await test_db_session.refresh(user)
    from src.services.auth_service import authenticate_user
    authenticated_user = await authenticate_user(test_db_session, email, "newsecurepassword")
    assert authenticated_user is not None
    assert authenticated_user.id == user.id

    # Verify OTP is marked as used
    await test_db_session.refresh(otp_record)
    assert otp_record.is_used is True

@pytest.mark.asyncio
async def test_reset_password_invalid_otp(override_get_db, test_db_session: AsyncSession):
    """Test password reset with wrong OTP."""
    email = "wrong_otp@example.com"
    user = UserDB(
        email=email,
        hashed_password=hash_password("oldpassword"),
        is_active=True
    )
    test_db_session.add(user)
    await test_db_session.commit()

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Reset with wrong code
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "email": email,
                "code": "000000",
                "new_password": "newpassword123"
            }
        )
    
    assert response.status_code == 400
    assert "Mã xác thực không đúng" in response.json()["detail"]

@pytest.mark.asyncio
async def test_reset_password_wrong_purpose(override_get_db, test_db_session: AsyncSession):
    """Test that a register OTP cannot be used for recovery."""
    email = "wrong_purpose@example.com"
    user = UserDB(
        email=email,
        hashed_password=hash_password("oldpassword"),
        is_active=True
    )
    test_db_session.add(user)
    await test_db_session.commit()

    # Create a registration OTP
    await create_otp_record(test_db_session, email, "999999", purpose="register")

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        # Try to use it for reset
        response = await client.post(
            "/api/v1/auth/reset-password",
            json={
                "email": email,
                "code": "999999",
                "new_password": "newpassword123"
            }
        )
    
    assert response.status_code == 400
    assert "Mã xác thực không đúng" in response.json()["detail"]
