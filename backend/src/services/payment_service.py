"""Payment webhook business logic service (Story 4.1)."""

import hashlib
import hmac
import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.config import settings
from src.models.db_models import OrderDB, PaymentTransactionDB, UserDB
from src.models.order import PaymentStatus
from src.services.email_service import send_order_confirmation_email

logger = logging.getLogger(__name__)


def verify_webhook_signature(
    provider: str, raw_body: bytes, signature: str, secret: str
) -> bool:
    """HMAC-SHA256 signature verification for webhook callbacks.

    TODO: VNPay production uses SHA256 of sorted query params, not HMAC of raw body.
    Current implementation is acceptable for MVP mock but must be updated for real
    VNPay integration. See: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html
    """
    if not secret:
        logger.warning("Webhook secret not configured for provider %s", provider)
        return False
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def _get_webhook_secret(provider: str) -> str:
    """Get the webhook secret for a given provider."""
    secrets = {
        "vnpay": settings.VNPAY_WEBHOOK_SECRET,
        "momo": settings.MOMO_WEBHOOK_SECRET,
    }
    return secrets.get(provider, "")


def _parse_vnpay_callback(payload: dict) -> dict:
    """Parse VNPay IPN callback into normalized format.

    Returns dict with: order_id, transaction_id, amount, status, signature.
    """
    response_code = payload.get("vnp_ResponseCode", "")
    status = "success" if response_code == "00" else "failed"
    # VNPay amount is in VND * 100
    raw_amount = payload.get("vnp_Amount", "0")
    amount = Decimal(str(raw_amount)) / Decimal("100")

    return {
        "order_id": payload.get("vnp_TxnRef", ""),
        "transaction_id": payload.get("vnp_TransactionNo", ""),
        "amount": amount,
        "status": status,
        "signature": payload.get("vnp_SecureHash", ""),
    }


def _parse_momo_callback(payload: dict) -> dict:
    """Parse Momo webhook callback into normalized format.

    Returns dict with: order_id, transaction_id, amount, status, signature.
    """
    result_code = payload.get("resultCode", -1)
    status = "success" if result_code == 0 else "failed"

    return {
        "order_id": payload.get("orderId", ""),
        "transaction_id": str(payload.get("transId", "")),
        "amount": Decimal(str(payload.get("amount", 0))),
        "status": status,
        "signature": payload.get("signature", ""),
    }


def _parse_webhook(provider: str, payload: dict) -> dict:
    """Route to provider-specific parser."""
    parsers = {
        "vnpay": _parse_vnpay_callback,
        "momo": _parse_momo_callback,
    }
    parser = parsers.get(provider)
    if parser is None:
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_UNSUPPORTED_PROVIDER",
                    "message": f"Provider khong duoc ho tro: {provider}",
                }
            },
        )
    return parser(payload)


async def process_webhook(
    db: AsyncSession, provider: str, raw_body: bytes, payload: dict
) -> dict:
    """Main webhook handler: verify → idempotent check → update order → create tx → email.

    Returns standard API response.
    """
    # 1. Parse provider-specific payload into normalized format
    parsed = _parse_webhook(provider, payload)

    order_id_str = parsed["order_id"]
    gateway_tx_id = parsed["transaction_id"]
    amount = parsed["amount"]
    tx_status = parsed["status"]
    signature = parsed["signature"]

    logger.info(
        "Webhook received: provider=%s, order_id=%s, tx_id=%s, status=%s",
        provider,
        order_id_str,
        gateway_tx_id,
        tx_status,
    )

    # 2. Verify signature
    secret = _get_webhook_secret(provider)
    if not verify_webhook_signature(provider, raw_body, signature, secret):
        logger.warning(
            "Invalid webhook signature: provider=%s, order_id=%s",
            provider,
            order_id_str,
        )
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_INVALID_SIGNATURE",
                    "message": "Chu ky webhook khong hop le",
                }
            },
        )

    # 3. Idempotency check — if transaction already processed, return 200 OK
    existing = await db.execute(
        select(PaymentTransactionDB).where(
            PaymentTransactionDB.provider == provider,
            PaymentTransactionDB.transaction_id == gateway_tx_id,
        )
    )
    if existing.scalar_one_or_none():
        logger.info(
            "Duplicate webhook ignored: provider=%s, tx_id=%s",
            provider,
            gateway_tx_id,
        )
        return {"data": {"message": "Already processed"}, "meta": {}}

    # 4. Validate order_id format
    try:
        order_uuid = UUID(order_id_str)
    except (ValueError, AttributeError):
        logger.error("Invalid order_id format in webhook: %s", order_id_str)
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_INVALID_ORDER_ID",
                    "message": "Order ID khong hop le",
                }
            },
        )

    # 5. Lock and update order with SELECT ... FOR UPDATE, eagerly load items for email
    order_result = await db.execute(
        select(OrderDB)
        .where(OrderDB.id == order_uuid)
        .options(selectinload(OrderDB.items))
        .with_for_update()
    )
    order = order_result.scalar_one_or_none()

    if order is None:
        logger.error("Order not found for webhook: order_id=%s", order_id_str)
        raise HTTPException(
            status_code=400,
            detail={
                "error": {
                    "code": "ERR_ORDER_NOT_FOUND",
                    "message": "Don hang khong ton tai",
                }
            },
        )

    # 5b. Amount verification — log ERROR if webhook amount doesn't match order
    if amount != order.total_amount:
        logger.error(
            "Amount mismatch for order %s: webhook=%s, order=%s, provider=%s",
            order.id,
            amount,
            order.total_amount,
            provider,
        )

    # 6. Update order status based on payment result
    if tx_status == "success":
        order.status = "confirmed"
        order.payment_status = PaymentStatus.paid.value
        logger.info("Order %s confirmed via %s payment", order.id, provider)
    else:
        order.payment_status = PaymentStatus.failed.value
        logger.warning(
            "Payment failed for order %s via %s", order.id, provider
        )

    order.updated_at = datetime.now(timezone.utc)

    # 7. Create payment transaction record
    payment_tx = PaymentTransactionDB(
        order_id=order.id,
        provider=provider,
        transaction_id=gateway_tx_id,
        amount=amount,
        status=tx_status,
        raw_payload=payload,
    )
    db.add(payment_tx)

    try:
        await db.flush()
        await db.commit()
    except IntegrityError:
        await db.rollback()
        logger.info(
            "Duplicate transaction detected on commit: provider=%s, tx_id=%s",
            provider,
            gateway_tx_id,
        )
        return {"data": {"message": "Already processed"}, "meta": {}}

    # 8. Resolve customer email for confirmation (H2 fix)
    customer_email = None
    if order.customer_id:
        try:
            user_result = await db.execute(
                select(UserDB.email).where(UserDB.id == order.customer_id)
            )
            customer_email = user_result.scalar_one_or_none()
        except Exception:
            logger.warning("Could not look up email for customer_id=%s", order.customer_id)

    # 9. Trigger email for confirmed orders (non-blocking)
    if tx_status == "success" and customer_email:
        try:
            await send_order_confirmation_email(order, customer_email)
        except Exception:
            logger.exception(
                "Failed to send order confirmation email for order %s",
                order.id,
            )

    return {
        "data": {
            "message": "Webhook processed successfully",
            "order_id": str(order.id),
            "payment_status": order.payment_status,
        },
        "meta": {},
    }
