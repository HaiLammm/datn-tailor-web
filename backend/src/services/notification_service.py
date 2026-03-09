"""Notification Service - Story 5.4: Automatic Return Reminders.

Handles finding garments due for return and sending reminder emails.
Backend is SSOT for notification logic - frontend NEVER decides when to send.
"""

import logging
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.db_models import GarmentDB
from src.services.email_service import send_return_reminder_email

logger = logging.getLogger(__name__)


async def find_garments_due_tomorrow(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[GarmentDB]:
    """Find rented garments due for return tomorrow that haven't been reminded.

    Query conditions:
    - tenant_id matches (multi-tenant isolation)
    - status == "rented"
    - expected_return_date == tomorrow
    - reminder_sent_at IS NULL (not yet reminded - idempotency AC #3)
    - renter_email IS NOT NULL (must have email to send to - AC #2)

    Args:
        db: Database session
        tenant_id: Tenant UUID for isolation

    Returns:
        List of GarmentDB instances matching criteria
    """
    tomorrow = datetime.now(settings.VIETNAM_TZ_OFFSET).date() + timedelta(days=1)
    query = select(GarmentDB).where(
        and_(
            GarmentDB.tenant_id == tenant_id,
            GarmentDB.status == "rented",
            GarmentDB.expected_return_date == tomorrow,
            GarmentDB.reminder_sent_at.is_(None),
            GarmentDB.renter_email.isnot(None),
        )
    )
    result = await db.execute(query)
    return list(result.scalars().all())


async def send_return_reminder(db: AsyncSession, garment: GarmentDB) -> bool:
    """Send a return reminder email for a single garment and mark as sent.

    On success: sets reminder_sent_at timestamp, flushes to DB.
    On failure: logs error, does NOT mark reminder_sent_at (AC #6).

    Args:
        db: Database session
        garment: GarmentDB instance to send reminder for

    Returns:
        True if email sent and DB updated successfully, False otherwise
    """
    if not garment.renter_email or not garment.renter_name:
        logger.warning(f"Garment {garment.id}: missing renter info, skipping")
        return False

    success = await send_return_reminder_email(
        email=garment.renter_email,
        renter_name=garment.renter_name,
        garment_name=garment.name,
        return_date=garment.expected_return_date,
        shop_address=settings.SHOP_ADDRESS,
    )

    if success:
        garment.reminder_sent_at = datetime.now(timezone.utc)
        await db.flush()
        await db.commit()
        await db.refresh(garment)
        logger.info(f"Reminder sent for garment {garment.id} to {garment.renter_email}")
        return True

    logger.error(f"Failed to send reminder for garment {garment.id} to {garment.renter_email}")
    return False


async def process_return_reminders(
    db: AsyncSession, tenant_id: uuid.UUID
) -> dict[str, int]:
    """Orchestrate finding and sending return reminders for a tenant.

    Processes each garment independently - one failure doesn't stop others (AC #6).

    Args:
        db: Database session
        tenant_id: Tenant UUID

    Returns:
        Summary dict: {"sent": N, "failed": N, "skipped": N}
    """
    garments = await find_garments_due_tomorrow(db, tenant_id)
    sent, failed, skipped = 0, 0, 0

    for garment in garments:
        if not garment.renter_email or not garment.renter_name:
            skipped += 1
            logger.info(f"Skipped garment {garment.id}: missing renter info")
            continue

        try:
            success = await send_return_reminder(db, garment)
            if success:
                sent += 1
            else:
                failed += 1
        except Exception as e:
            failed += 1
            logger.error(f"Error processing reminder for garment {garment.id}: {e}")

    logger.info(
        f"Tenant {tenant_id}: Reminders processed - sent={sent}, failed={failed}, skipped={skipped}"
    )
    return {"sent": sent, "failed": failed, "skipped": skipped}
