"""OTP service for email verification.

Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP
Handles OTP generation, validation, and lifecycle management.
HIGH Priority Fix: Rate limiting to prevent OTP spam.
"""

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.db_models import OTPCodeDB


# Rate limiting configuration
OTP_MAX_REQUESTS_PER_HOUR = 3
OTP_RATE_LIMIT_WINDOW_MINUTES = 60


def generate_otp() -> str:
    """Generate a 6-digit random OTP code.
    
    Returns:
        str: 6-digit numeric string (e.g., "123456")
    """
    return str(secrets.randbelow(1000000)).zfill(6)


async def create_otp_record(db: AsyncSession, email: str, code: str) -> OTPCodeDB:
    """Create a new OTP record in the database.
    
    Args:
        db: Database session
        email: User's email address (lowercase normalized)
        code: 6-digit OTP code
        
    Returns:
        OTPCodeDB: Created OTP record
    """
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)
    
    otp_record = OTPCodeDB(
        email=email.lower(),
        code=code,
        expires_at=expires_at,
        is_used=False,
    )
    
    db.add(otp_record)
    await db.commit()
    await db.refresh(otp_record)
    
    return otp_record


async def verify_otp(db: AsyncSession, email: str, code: str) -> bool:
    """Verify an OTP code for a given email.
    
    Args:
        db: Database session
        email: User's email address
        code: OTP code to verify
        
    Returns:
        bool: True if OTP is valid (correct, not expired, not used), False otherwise
    """
    now = datetime.now(timezone.utc)
    
    # Find matching OTP that hasn't been used and hasn't expired
    result = await db.execute(
        select(OTPCodeDB)
        .where(OTPCodeDB.email == email.lower())
        .where(OTPCodeDB.code == code)
        .where(OTPCodeDB.is_used == False)  # noqa: E712
        .where(OTPCodeDB.expires_at > now)
        .order_by(OTPCodeDB.created_at.desc())
    )
    otp_record = result.scalar_one_or_none()
    
    if otp_record is None:
        return False
    
    # Mark OTP as used
    otp_record.is_used = True
    await db.commit()
    
    return True


async def invalidate_old_otps(db: AsyncSession, email: str) -> int:
    """Mark all unused OTPs for an email as used (invalidate them).
    
    This is called when resending OTP to prevent confusion with old codes.
    
    Args:
        db: Database session
        email: User's email address
        
    Returns:
        int: Number of OTPs invalidated
    """
    result = await db.execute(
        update(OTPCodeDB)
        .where(OTPCodeDB.email == email.lower())
        .where(OTPCodeDB.is_used == False)  # noqa: E712
        .values(is_used=True)
    )
    await db.commit()
    
    return result.rowcount  # type: ignore


async def get_latest_otp(db: AsyncSession, email: str) -> OTPCodeDB | None:
    """Get the latest OTP record for an email (for testing/debugging).
    
    Args:
        db: Database session
        email: User's email address
        
    Returns:
        OTPCodeDB | None: Latest OTP record, or None if not found
    """
    result = await db.execute(
        select(OTPCodeDB)
        .where(OTPCodeDB.email == email.lower())
        .order_by(OTPCodeDB.created_at.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def check_rate_limit(db: AsyncSession, email: str) -> tuple[bool, int]:
    """Check if email has exceeded OTP rate limit.
    
    Story 1.2: HIGH Priority Fix - Prevent OTP spam
    Max 3 OTP requests per email per hour.
    
    Args:
        db: Database session
        email: User's email address
        
    Returns:
        tuple[bool, int]: (is_allowed, remaining_requests)
            - is_allowed: True if within rate limit, False if exceeded
            - remaining_requests: Number of requests remaining (0 if exceeded)
    """
    rate_limit_start = datetime.now(timezone.utc) - timedelta(minutes=OTP_RATE_LIMIT_WINDOW_MINUTES)
    
    # Count OTP requests in the last hour
    result = await db.execute(
        select(func.count(OTPCodeDB.id))
        .where(OTPCodeDB.email == email.lower())
        .where(OTPCodeDB.created_at >= rate_limit_start)
    )
    count = result.scalar() or 0
    
    is_allowed = count < OTP_MAX_REQUESTS_PER_HOUR
    remaining = max(0, OTP_MAX_REQUESTS_PER_HOUR - count)
    
    return (is_allowed, remaining)
