"""Seed the Owner account on application startup."""

import logging

from sqlalchemy import select

from src.core.config import settings
from src.core.database import async_session_factory
from src.core.security import hash_password
from src.models.db_models import UserDB

logger = logging.getLogger(__name__)


async def seed_owner_account() -> None:
    """Ensure the Owner account exists in the database on startup.

    Uses OWNER_EMAIL from config. Creates the user with role 'Owner'
    if not already present. If user exists but role is not 'Owner' or
    is_active is False, elevate role and activate account.

    Story 1.5 AC3: Role Elevation - ensure Owner role and active status.
    """
    try:
        async with async_session_factory() as session:
            result = await session.execute(
                select(UserDB).where(UserDB.email == settings.OWNER_EMAIL)
            )
            existing = result.scalar_one_or_none()

            if existing is None:
                # AC3: Create new Owner account
                owner = UserDB(
                    email=settings.OWNER_EMAIL,
                    hashed_password=hash_password("owner-default-password"),
                    role="Owner",
                    is_active=True,
                )
                session.add(owner)
                await session.commit()
                logger.info("✅ Owner account seeded: %s", settings.OWNER_EMAIL)
            else:
                # AC3: Role Elevation - ensure existing user has Owner role and is active
                needs_update = False
                if existing.role != "Owner":
                    logger.info(
                        "⬆️ Elevating %s from %s to Owner",
                        settings.OWNER_EMAIL,
                        existing.role,
                    )
                    existing.role = "Owner"
                    needs_update = True

                if not existing.is_active:
                    logger.info("🔓 Activating Owner account: %s", settings.OWNER_EMAIL)
                    existing.is_active = True
                    needs_update = True

                if needs_update:
                    await session.commit()
                    logger.info("✅ Owner account updated: %s", settings.OWNER_EMAIL)
                else:
                    logger.info("Owner account already configured: %s", settings.OWNER_EMAIL)
    except Exception as e:
        logger.warning("⚠️ Could not seed Owner account (DB not ready?): %s", e)
