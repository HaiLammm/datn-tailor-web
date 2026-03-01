"""Unit tests for OTP service.

Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP
Tests OTP generation, validation, expiration, and lifecycle management.
"""

from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, OTPCodeDB
from src.services.otp_service import (
    check_rate_limit,
    create_otp_record,
    generate_otp,
    get_latest_otp,
    invalidate_old_otps,
    verify_otp,
)

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
    """Create test database session for OTP tests."""
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


class TestGenerateOTP:
    """Test OTP generation."""

    def test_generate_otp_returns_6_digits(self):
        """OTP should be exactly 6 digits."""
        otp = generate_otp()
        assert len(otp) == 6
        assert otp.isdigit()

    def test_generate_otp_pads_with_zeros(self):
        """OTP should be zero-padded (e.g., '000123')."""
        # Generate multiple OTPs to ensure padding works
        for _ in range(100):
            otp = generate_otp()
            assert len(otp) == 6


class TestCreateOTPRecord:
    """Test OTP record creation in database."""

    @pytest.mark.asyncio
    async def test_create_otp_record_success(self, test_db_session: AsyncSession):
        """Should create OTP record with correct expiration."""
        email = "test@example.com"
        code = "123456"

        otp_record = await create_otp_record(test_db_session, email, code)

        assert otp_record.email == email.lower()
        assert otp_record.code == code
        assert otp_record.is_used is False
        assert otp_record.created_at is not None
        
        # Expiration should be ~10 minutes from creation
        # SQLite stores datetime as naive (no timezone), so compare deltas instead
        time_to_expiry = (otp_record.expires_at - otp_record.created_at).total_seconds()
        expected_seconds = 10 * 60  # 10 minutes = 600 seconds
        
        # Allow 2 seconds tolerance for test execution time
        assert abs(time_to_expiry - expected_seconds) < 2

    @pytest.mark.asyncio
    async def test_create_otp_record_normalizes_email(self, test_db_session: AsyncSession):
        """Should normalize email to lowercase."""
        email = "Test@EXAMPLE.COM"
        code = "123456"

        otp_record = await create_otp_record(test_db_session, email, code)

        assert otp_record.email == "test@example.com"


class TestVerifyOTP:
    """Test OTP verification logic."""

    @pytest.mark.asyncio
    async def test_verify_otp_success(self, test_db_session: AsyncSession):
        """Valid OTP should verify successfully."""
        email = "test@example.com"
        code = "123456"

        await create_otp_record(test_db_session, email, code)
        is_valid = await verify_otp(test_db_session, email, code)

        assert is_valid is True

        # OTP should be marked as used
        result = await test_db_session.execute(
            select(OTPCodeDB).where(OTPCodeDB.email == email.lower())
        )
        otp_record = result.scalar_one()
        assert otp_record.is_used is True

    @pytest.mark.asyncio
    async def test_verify_otp_wrong_code(self, test_db_session: AsyncSession):
        """Wrong OTP code should fail verification."""
        email = "test@example.com"
        code = "123456"

        await create_otp_record(test_db_session, email, code)
        is_valid = await verify_otp(test_db_session, email, "999999")  # Wrong code

        assert is_valid is False

    @pytest.mark.asyncio
    async def test_verify_otp_already_used(self, test_db_session: AsyncSession):
        """Used OTP should fail verification."""
        email = "test@example.com"
        code = "123456"

        await create_otp_record(test_db_session, email, code)
        
        # First verification - should succeed
        is_valid1 = await verify_otp(test_db_session, email, code)
        assert is_valid1 is True

        # Second verification - should fail (already used)
        is_valid2 = await verify_otp(test_db_session, email, code)
        assert is_valid2 is False

    @pytest.mark.asyncio
    async def test_verify_otp_expired(self, test_db_session: AsyncSession):
        """Expired OTP should fail verification."""
        email = "test@example.com"
        code = "123456"

        # Create OTP record with past expiration
        expired_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        otp_record = OTPCodeDB(
            email=email.lower(),
            code=code,
            expires_at=expired_at,
            is_used=False,
        )
        test_db_session.add(otp_record)
        await test_db_session.commit()

        is_valid = await verify_otp(test_db_session, email, code)

        assert is_valid is False

    @pytest.mark.asyncio
    async def test_verify_otp_email_not_found(self, test_db_session: AsyncSession):
        """OTP for non-existent email should fail."""
        is_valid = await verify_otp(test_db_session, "nonexistent@example.com", "123456")

        assert is_valid is False

    @pytest.mark.asyncio
    async def test_verify_otp_case_insensitive_email(self, test_db_session: AsyncSession):
        """Email should be case-insensitive for OTP verification."""
        email = "test@example.com"
        code = "123456"

        await create_otp_record(test_db_session, email, code)
        is_valid = await verify_otp(test_db_session, "TEST@EXAMPLE.COM", code)

        assert is_valid is True


class TestInvalidateOldOTPs:
    """Test OTP invalidation."""

    @pytest.mark.asyncio
    async def test_invalidate_old_otps_success(self, test_db_session: AsyncSession):
        """Should mark all unused OTPs for email as used."""
        email = "test@example.com"

        # Create 3 OTP records
        await create_otp_record(test_db_session, email, "111111")
        await create_otp_record(test_db_session, email, "222222")
        await create_otp_record(test_db_session, email, "333333")

        count = await invalidate_old_otps(test_db_session, email)

        assert count == 3

        # All should be marked as used
        result = await test_db_session.execute(
            select(OTPCodeDB).where(OTPCodeDB.email == email.lower())
        )
        otps = result.scalars().all()
        assert all(otp.is_used for otp in otps)

    @pytest.mark.asyncio
    async def test_invalidate_old_otps_already_used(self, test_db_session: AsyncSession):
        """Should not count already-used OTPs."""
        email = "test@example.com"

        # Create 2 OTPs, mark 1 as used
        await create_otp_record(test_db_session, email, "111111")
        otp2 = await create_otp_record(test_db_session, email, "222222")
        otp2.is_used = True
        await test_db_session.commit()

        count = await invalidate_old_otps(test_db_session, email)

        assert count == 1  # Only 1 was unused

    @pytest.mark.asyncio
    async def test_invalidate_old_otps_no_records(self, test_db_session: AsyncSession):
        """Should return 0 if no OTPs exist."""
        count = await invalidate_old_otps(test_db_session, "nonexistent@example.com")

        assert count == 0


class TestGetLatestOTP:
    """Test fetching latest OTP record."""

    @pytest.mark.asyncio
    async def test_get_latest_otp_success(self, test_db_session: AsyncSession):
        """Should return the most recent OTP."""
        email = "test@example.com"

        otp1 = await create_otp_record(test_db_session, email, "111111")
        otp2 = await create_otp_record(test_db_session, email, "222222")
        otp3 = await create_otp_record(test_db_session, email, "333333")

        latest = await get_latest_otp(test_db_session, email)

        assert latest is not None
        assert latest.code == "333333"
        assert latest.id == otp3.id

    @pytest.mark.asyncio
    async def test_get_latest_otp_not_found(self, test_db_session: AsyncSession):
        """Should return None if no OTPs exist."""
        latest = await get_latest_otp(test_db_session, "nonexistent@example.com")

        assert latest is None


class TestRateLimiting:
    """Test OTP rate limiting (HIGH Priority Fix)."""

    @pytest.mark.asyncio
    async def test_rate_limit_allows_first_request(self, test_db_session: AsyncSession):
        """First OTP request should be allowed."""
        email = "test@example.com"
        
        is_allowed, remaining = await check_rate_limit(test_db_session, email)
        
        assert is_allowed is True
        assert remaining == 3  # 3 requests allowed per hour

    @pytest.mark.asyncio
    async def test_rate_limit_allows_up_to_3_requests(self, test_db_session: AsyncSession):
        """Should allow up to 3 OTP requests per hour."""
        email = "test@example.com"
        
        # Create 2 OTP records
        await create_otp_record(test_db_session, email, "111111")
        await create_otp_record(test_db_session, email, "222222")
        
        is_allowed, remaining = await check_rate_limit(test_db_session, email)
        
        assert is_allowed is True
        assert remaining == 1  # 1 request remaining

    @pytest.mark.asyncio
    async def test_rate_limit_blocks_after_3_requests(self, test_db_session: AsyncSession):
        """Should block OTP requests after 3 requests within 1 hour."""
        email = "test@example.com"
        
        # Create 3 OTP records (hitting the limit)
        await create_otp_record(test_db_session, email, "111111")
        await create_otp_record(test_db_session, email, "222222")
        await create_otp_record(test_db_session, email, "333333")
        
        is_allowed, remaining = await check_rate_limit(test_db_session, email)
        
        assert is_allowed is False
        assert remaining == 0

    @pytest.mark.asyncio
    async def test_rate_limit_different_emails_independent(self, test_db_session: AsyncSession):
        """Rate limit should be per-email (different emails don't affect each other)."""
        email1 = "user1@example.com"
        email2 = "user2@example.com"
        
        # Create 3 OTP records for email1 (hit limit)
        await create_otp_record(test_db_session, email1, "111111")
        await create_otp_record(test_db_session, email1, "222222")
        await create_otp_record(test_db_session, email1, "333333")
        
        # Check rate limit for email1 - should be blocked
        is_allowed1, _ = await check_rate_limit(test_db_session, email1)
        assert is_allowed1 is False
        
        # Check rate limit for email2 - should still be allowed
        is_allowed2, remaining2 = await check_rate_limit(test_db_session, email2)
        assert is_allowed2 is True
        assert remaining2 == 3
