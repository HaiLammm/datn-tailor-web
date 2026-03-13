"""Payment Webhook API Router - Story 4.1: Xử lý State Thanh toán qua Webhook.

Receives POST callbacks from VNPay/Momo payment gateways.
Accepts raw body for signature verification, returns 200 quickly.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.database import get_db
from src.services import payment_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payments", tags=["payments"])


@router.post(
    "/webhook/{provider}",
    response_model=dict,
    summary="Payment webhook callback",
    description="Receives payment gateway callbacks. Verifies signature, updates order status.",
)
async def webhook_endpoint(
    provider: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Handle payment gateway webhook callback.

    Accepts raw body for HMAC signature verification.
    Processes payment result and updates order status atomically.

    Returns 200 OK quickly to prevent gateway timeout.
    """
    # Validate provider
    if provider not in settings.PAYMENT_PROVIDERS:
        logger.warning("Webhook from unsupported provider: %s", provider)
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_UNSUPPORTED_PROVIDER",
                    "message": f"Provider khong duoc ho tro: {provider}",
                }
            },
        )

    # Read raw body for signature verification
    raw_body = await request.body()

    # Parse JSON payload
    try:
        payload = await request.json()
    except Exception:
        logger.error("Invalid JSON in webhook body from %s", provider)
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_INVALID_PAYLOAD",
                    "message": "Payload khong hop le",
                }
            },
        )

    logger.info(
        "Webhook received from %s, processing...",
        provider,
    )

    result = await payment_service.process_webhook(db, provider, raw_body, payload)
    return result
