"""Notification API Router - Story 5.4: Automatic Return Reminders.

Manual trigger endpoint for Owner to send return reminders.
"""

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_id_from_user, require_roles
from src.core.database import get_db
from src.services.notification_service import process_return_reminders

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.post(
    "/send-return-reminders",
    response_model=dict,
    summary="Send return reminders (Owner only)",
    description="Manually trigger sending return reminders for garments due tomorrow. Owner role required.",
)
async def send_return_reminders_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Manually trigger return reminder emails (Owner only).

    Finds all rented garments due tomorrow and sends reminder emails.
    Idempotent - won't send duplicate reminders (AC #3).

    Returns:
        API Response Wrapper: {"data": {"sent": N, "failed": N, "skipped": N}, "meta": {}}
    """
    summary = await process_return_reminders(db, tenant_id)

    return {
        "data": summary,
        "meta": {},
    }
