"""Service layer for Staff Whitelist management.

Handles CRUD operations for staff_whitelist table and retrieves active staff.
Story 1.4: Staff Whitelist Management
"""

import uuid

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.security import hash_password
from src.models.db_models import StaffWhitelistDB, UserDB
from src.models.staff import DEFAULT_STAFF_PASSWORD


async def get_all_whitelist_entries(db: AsyncSession) -> list[StaffWhitelistDB]:
    """Retrieve all staff whitelist entries.

    Args:
        db: Database session

    Returns:
        List of StaffWhitelistDB instances
    """
    result = await db.execute(select(StaffWhitelistDB).order_by(StaffWhitelistDB.created_at.desc()))
    return list(result.scalars().all())


async def get_active_staff_users(db: AsyncSession) -> list[UserDB]:
    """Retrieve all active staff users (Owner or Tailor).

    Args:
        db: Database session

    Returns:
        List of UserDB instances with staff roles
    """
    result = await db.execute(
        select(UserDB)
        .where(UserDB.role.in_(["Owner", "Tailor"]))
        .where(UserDB.is_active == True)
        .order_by(UserDB.created_at.desc())
    )
    return list(result.scalars().all())


async def add_staff_to_whitelist(
    db: AsyncSession, email: str, role: str, created_by_email: str, password: str | None = None
) -> tuple[StaffWhitelistDB, str] | None:
    """Add a new email to staff whitelist and create user account.

    Args:
        db: Database session
        email: Email address to add
        role: Role to assign (Tailor or Owner)
        created_by_email: Email of the Owner creating this entry
        password: Optional password. If None, default password is used.

    Returns:
        Tuple of (StaffWhitelistDB, plain_password), or None if email already exists

    Raises:
        ValueError: If attempting to add Owner email (must be in config.py)
    """
    # Validation: Cannot add OWNER_EMAIL to whitelist (must be in config.py)
    if email.lower() == settings.OWNER_EMAIL.lower():
        raise ValueError(
            "Không thể thêm email Owner vào whitelist. Email Owner phải được cấu hình trong config.py"
        )

    # Check if email already exists in whitelist
    existing = await db.execute(
        select(StaffWhitelistDB).where(StaffWhitelistDB.email == email)
    )
    if existing.scalar_one_or_none() is not None:
        return None

    plain_password = password if password else DEFAULT_STAFF_PASSWORD

    new_entry = StaffWhitelistDB(
        email=email,
        role=role,
        created_by=created_by_email,
    )
    db.add(new_entry)

    # Create or update user account
    existing_user = await db.execute(
        select(UserDB).where(UserDB.email == email)
    )
    user = existing_user.scalar_one_or_none()
    if user is None:
        new_user = UserDB(
            email=email,
            hashed_password=hash_password(plain_password),
            role=role,
            is_active=True,
        )
        db.add(new_user)
    else:
        user.hashed_password = hash_password(plain_password)
        user.role = role
        user.is_active = True

    try:
        await db.commit()
        await db.refresh(new_entry)
        return new_entry, plain_password
    except IntegrityError:
        await db.rollback()
        return None


async def remove_staff_from_whitelist(
    db: AsyncSession, entry_id: uuid.UUID, requester_email: str
) -> bool:
    """Remove a staff entry from whitelist.

    Args:
        db: Database session
        entry_id: UUID of whitelist entry to remove
        requester_email: Email of the Owner making this request

    Returns:
        True if removed successfully, False if not found or validation failed

    Raises:
        ValueError: If attempting to remove Owner's own email
    """
    result = await db.execute(select(StaffWhitelistDB).where(StaffWhitelistDB.id == entry_id))
    entry = result.scalar_one_or_none()

    if entry is None:
        return False

    # Validation: Owner cannot remove their own email
    if entry.email.lower() == requester_email.lower():
        raise ValueError("Không thể xóa email của chính mình khỏi whitelist")

    # Validation: Cannot remove OWNER_EMAIL from whitelist
    if entry.email.lower() == settings.OWNER_EMAIL.lower():
        raise ValueError("Không thể xóa email Owner khỏi whitelist")

    await db.delete(entry)
    await db.commit()
    return True


async def get_whitelist_entry_by_id(
    db: AsyncSession, entry_id: uuid.UUID
) -> StaffWhitelistDB | None:
    """Get a specific whitelist entry by ID.

    Args:
        db: Database session
        entry_id: UUID of the whitelist entry

    Returns:
        StaffWhitelistDB instance or None if not found
    """
    result = await db.execute(select(StaffWhitelistDB).where(StaffWhitelistDB.id == entry_id))
    return result.scalar_one_or_none()
