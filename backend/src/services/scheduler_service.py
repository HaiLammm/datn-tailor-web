"""Scheduler Service - Story 5.4: Background scheduler for daily return reminders.

Simple asyncio-based scheduler (NOT Celery) for MVP single-instance deployment.
Runs process_return_reminders daily at configurable hour (default 8 AM Vietnam time).
"""

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from src.core.config import settings
from src.core.database import async_session_factory

logger = logging.getLogger(__name__)





async def _run_daily_reminders() -> None:
    """Run reminder process for all tenants.

    Opens a fresh DB session, queries all tenants, and processes
    return reminders and booking reminders for each independently.
    """
    from sqlalchemy import select

    from src.models.db_models import TenantDB
    from src.services.notification_service import process_return_reminders
    from src.services.appointment_service import send_booking_reminders

    async with async_session_factory() as db:
        try:
            result = await db.execute(select(TenantDB))
            tenants = result.scalars().all()

            for tenant in tenants:
                try:
                    summary = await process_return_reminders(db, tenant.id)
                    logger.info(
                        f"Tenant {tenant.id} ({tenant.name}): "
                        f"Reminders sent={summary['sent']}, "
                        f"failed={summary['failed']}, "
                        f"skipped={summary['skipped']}"
                    )
                except Exception as e:
                    logger.error(f"Reminder error for tenant {tenant.id}: {e}")

                # Story 3.4: Send booking reminders for tomorrow's appointments
                try:
                    booking_sent = await send_booking_reminders(db, tenant.id)
                    logger.info(
                        f"Tenant {tenant.id} ({tenant.name}): "
                        f"Booking reminders sent={booking_sent}"
                    )
                except Exception as e:
                    logger.error(f"Booking reminder error for tenant {tenant.id}: {e}")

        except Exception as e:
            logger.error(f"Failed to run daily reminders: {e}")


async def start_reminder_scheduler() -> asyncio.Task:
    """Start background scheduler for daily return reminders.

    Calculates time until next target hour (Vietnam time), sleeps until then,
    runs reminders, then repeats. Graceful shutdown via task cancellation.

    Returns:
        asyncio.Task that can be cancelled on shutdown
    """

    async def scheduler_loop() -> None:
        while True:
            try:
                now = datetime.now(settings.VIETNAM_TZ_OFFSET)
                target = now.replace(
                    hour=settings.REMINDER_HOUR,
                    minute=0,
                    second=0,
                    microsecond=0,
                )
                if now >= target:
                    target += timedelta(days=1)

                sleep_seconds = (target - now).total_seconds()
                logger.info(
                    f"Next reminder run at {target.isoformat()}, "
                    f"sleeping {sleep_seconds:.0f}s"
                )
                await asyncio.sleep(sleep_seconds)
                await _run_daily_reminders()

            except asyncio.CancelledError:
                logger.info("Reminder scheduler cancelled, shutting down gracefully")
                break
            except Exception as e:
                logger.error(f"Scheduler error: {e}")
                # Wait 60 seconds before retrying on unexpected error
                await asyncio.sleep(60)

    task = asyncio.create_task(scheduler_loop())
    logger.info(f"Reminder scheduler started (target hour: {settings.REMINDER_HOUR}:00 VN time)")
    return task
