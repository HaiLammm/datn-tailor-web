"""Authentication service: user lookup, credential verification, role detection."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.security import verify_password
from src.models.db_models import StaffWhitelistDB, UserDB


async def get_user_by_email(db: AsyncSession, email: str) -> UserDB | None:
    """Look up a user by email address."""
    result = await db.execute(select(UserDB).where(UserDB.email == email))
    return result.scalar_one_or_none()


async def determine_role(db: AsyncSession, email: str) -> str:
    """Determine user role based on config and staff_whitelist.

    Priority:
        1. OWNER_EMAIL in config.py → 'Owner'
        2. Email in staff_whitelist → whitelist.role
        3. Otherwise → 'Customer'
    """
    if email.lower() == settings.OWNER_EMAIL.lower():
        return "Owner"

    result = await db.execute(
        select(StaffWhitelistDB.role).where(StaffWhitelistDB.email == email)
    )
    whitelist_role = result.scalar_one_or_none()
    if whitelist_role:
        return whitelist_role

    return "Customer"


async def authenticate_user(
    db: AsyncSession, email: str, password: str
) -> UserDB | None:
    """Authenticate a user by email and password.

    Returns the UserDB object if credentials are valid, otherwise None.
    """
    user = await get_user_by_email(db, email)
    if user is None:
        return None
    if user.hashed_password is None:
        # OAuth-only user, cannot login with password
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user
