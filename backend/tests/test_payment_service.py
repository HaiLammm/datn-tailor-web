"""Service tests for Payment webhook logic - Story 4.1.

Tests signature verification, idempotency, status transitions, email trigger.
"""

import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, GarmentDB, OrderDB, PaymentTransactionDB, TenantDB, UserDB
from src.services import payment_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
GARMENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")
CUSTOMER_ID = uuid.UUID("00000000-0000-0000-0000-000000000020")


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(
        test_db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_order(test_db_session: AsyncSession) -> OrderDB:
    """Seed tenant, garment, user, and a pending order."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
    garment = GarmentDB(
        id=GARMENT_ID,
        tenant_id=TENANT_ID,
        name="Áo Dài Test",
        category="ao_dai",
        rental_price=Decimal("500000"),
        sale_price=Decimal("1200000"),
        status="available",
        size_options=["S", "M", "L"],
    )
    customer = UserDB(
        id=CUSTOMER_ID,
        email="customer@test.com",
        role="Customer",
        tenant_id=TENANT_ID,
    )
    order = OrderDB(
        tenant_id=TENANT_ID,
        customer_id=CUSTOMER_ID,
        customer_name="Nguyễn Văn A",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "P1", "address_detail": "123 ABC"},
        payment_method="vnpay",
        status="pending",
        payment_status="pending",
        total_amount=Decimal("1200000"),
    )
    test_db_session.add_all([tenant, garment, customer, order])
    await test_db_session.commit()
    await test_db_session.refresh(order)
    return order


# --- Signature Verification Tests ---

def test_verify_signature_valid():
    """Valid HMAC-SHA256 signature passes verification."""
    secret = "test_secret_key"
    body = b'{"vnp_TxnRef": "123"}'
    signature = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    assert payment_service.verify_webhook_signature("vnpay", body, signature, secret) is True


def test_verify_signature_invalid():
    """Incorrect signature fails verification."""
    secret = "test_secret_key"
    body = b'{"vnp_TxnRef": "123"}'

    assert payment_service.verify_webhook_signature("vnpay", body, "wrong_signature", secret) is False


def test_verify_signature_empty_secret():
    """Empty secret fails verification."""
    body = b'{"vnp_TxnRef": "123"}'

    assert payment_service.verify_webhook_signature("vnpay", body, "any_sig", "") is False


# --- Provider Parser Tests ---

def test_parse_vnpay_success():
    """VNPay callback with response code 00 parses as success."""
    payload = {
        "vnp_TxnRef": "order-123",
        "vnp_TransactionNo": "tx-456",
        "vnp_Amount": "120000000",  # VNPay sends amount * 100
        "vnp_ResponseCode": "00",
        "vnp_SecureHash": "abc123",
    }
    result = payment_service._parse_vnpay_callback(payload)

    assert result["order_id"] == "order-123"
    assert result["transaction_id"] == "tx-456"
    assert result["amount"] == Decimal("1200000")
    assert result["status"] == "success"


def test_parse_vnpay_failed():
    """VNPay callback with non-00 response code parses as failed."""
    payload = {
        "vnp_TxnRef": "order-123",
        "vnp_TransactionNo": "tx-456",
        "vnp_Amount": "120000000",
        "vnp_ResponseCode": "24",
        "vnp_SecureHash": "abc123",
    }
    result = payment_service._parse_vnpay_callback(payload)

    assert result["status"] == "failed"


def test_parse_momo_success():
    """Momo callback with resultCode 0 parses as success."""
    payload = {
        "orderId": "order-789",
        "transId": 99999,
        "amount": 500000,
        "resultCode": 0,
        "signature": "sig-abc",
    }
    result = payment_service._parse_momo_callback(payload)

    assert result["order_id"] == "order-789"
    assert result["transaction_id"] == "99999"
    assert result["amount"] == Decimal("500000")
    assert result["status"] == "success"


def test_parse_momo_failed():
    """Momo callback with non-0 resultCode parses as failed."""
    payload = {
        "orderId": "order-789",
        "transId": 99999,
        "amount": 500000,
        "resultCode": 1006,
        "signature": "sig-abc",
    }
    result = payment_service._parse_momo_callback(payload)

    assert result["status"] == "failed"


# --- Process Webhook Integration Tests ---

def _make_vnpay_payload(order_id: str, tx_id: str = "tx-001", amount: int = 120000000, code: str = "00") -> dict:
    return {
        "vnp_TxnRef": order_id,
        "vnp_TransactionNo": tx_id,
        "vnp_Amount": str(amount),
        "vnp_ResponseCode": code,
        "vnp_SecureHash": "placeholder",
    }


def _sign_body(body: bytes, secret: str) -> str:
    return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()


@pytest.mark.asyncio
@patch.object(payment_service, "_get_webhook_secret", return_value="test_secret")
@patch.object(payment_service, "send_order_confirmation_email", new_callable=AsyncMock, return_value=True)
async def test_process_webhook_success(mock_email, mock_secret, test_db_session, seed_order):
    """Successful webhook updates order to confirmed and payment_status to paid."""
    order = seed_order
    payload = _make_vnpay_payload(str(order.id))
    raw_body = json.dumps(payload).encode()
    # Set correct signature
    payload["vnp_SecureHash"] = _sign_body(raw_body, "test_secret")
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        result = await payment_service.process_webhook(
            test_db_session, "vnpay", raw_body, payload
        )

    assert result["data"]["payment_status"] == "paid"

    # Verify order updated in DB
    db_order = await test_db_session.get(OrderDB, order.id)
    assert db_order.status == "confirmed"
    assert db_order.payment_status == "paid"

    # Verify transaction record created
    tx_result = await test_db_session.execute(
        select(PaymentTransactionDB).where(PaymentTransactionDB.order_id == order.id)
    )
    tx = tx_result.scalar_one()
    assert tx.provider == "vnpay"
    assert tx.status == "success"

    # Verify email was triggered with customer email (H2 fix)
    mock_email.assert_called_once()
    call_args = mock_email.call_args
    assert call_args[0][1] == "customer@test.com"  # customer_email param


@pytest.mark.asyncio
@patch.object(payment_service, "send_order_confirmation_email", new_callable=AsyncMock, return_value=True)
async def test_process_webhook_failed_payment(mock_email, test_db_session, seed_order):
    """Failed payment keeps order pending but sets payment_status to failed."""
    order = seed_order
    payload = _make_vnpay_payload(str(order.id), code="24")
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        result = await payment_service.process_webhook(
            test_db_session, "vnpay", raw_body, payload
        )

    db_order = await test_db_session.get(OrderDB, order.id)
    assert db_order.status == "pending"  # Order stays pending
    assert db_order.payment_status == "failed"

    # Email should NOT be triggered for failed payments
    mock_email.assert_not_called()


@pytest.mark.asyncio
async def test_process_webhook_idempotent(test_db_session, seed_order):
    """Duplicate webhook returns 200 without changing state."""
    order = seed_order
    payload = _make_vnpay_payload(str(order.id), tx_id="idempotent-tx")
    raw_body = json.dumps(payload).encode()

    # Insert existing transaction
    existing_tx = PaymentTransactionDB(
        order_id=order.id,
        provider="vnpay",
        transaction_id="idempotent-tx",
        amount=Decimal("1200000"),
        status="success",
        raw_payload=payload,
    )
    test_db_session.add(existing_tx)
    await test_db_session.commit()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        result = await payment_service.process_webhook(
            test_db_session, "vnpay", raw_body, payload
        )

    assert result["data"]["message"] == "Already processed"


@pytest.mark.asyncio
async def test_process_webhook_invalid_signature(test_db_session, seed_order):
    """Invalid signature returns 400 error."""
    from fastapi import HTTPException

    order = seed_order
    payload = _make_vnpay_payload(str(order.id))
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=False):
        with pytest.raises(HTTPException) as exc_info:
            await payment_service.process_webhook(
                test_db_session, "vnpay", raw_body, payload
            )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_process_webhook_order_not_found(test_db_session, seed_order):
    """Webhook for nonexistent order returns 400."""
    from fastapi import HTTPException

    fake_id = str(uuid.uuid4())
    payload = _make_vnpay_payload(fake_id)
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        with pytest.raises(HTTPException) as exc_info:
            await payment_service.process_webhook(
                test_db_session, "vnpay", raw_body, payload
            )

    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
@patch.object(payment_service, "send_order_confirmation_email", new_callable=AsyncMock, side_effect=Exception("SMTP down"))
async def test_process_webhook_email_failure_does_not_block(mock_email, test_db_session, seed_order):
    """Email failure does not block webhook processing or rollback order."""
    order = seed_order
    payload = _make_vnpay_payload(str(order.id), tx_id="tx-email-fail")
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        result = await payment_service.process_webhook(
            test_db_session, "vnpay", raw_body, payload
        )

    # Order should still be confirmed despite email failure
    assert result["data"]["payment_status"] == "paid"
    db_order = await test_db_session.get(OrderDB, order.id)
    assert db_order.status == "confirmed"


# --- H1: IntegrityError Race Condition Test ---

@pytest.mark.asyncio
@patch.object(payment_service, "send_order_confirmation_email", new_callable=AsyncMock, return_value=True)
async def test_process_webhook_integrity_error_returns_already_processed(mock_email, test_db_session, seed_order):
    """IntegrityError on commit (race condition duplicate) returns 200 'Already processed'."""
    from sqlalchemy.exc import IntegrityError

    order = seed_order
    payload = _make_vnpay_payload(str(order.id), tx_id="tx-race")
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        # Patch db.commit to raise IntegrityError simulating a race condition
        original_commit = test_db_session.commit

        async def raise_integrity(*args, **kwargs):
            raise IntegrityError("duplicate", {}, Exception("unique constraint"))

        with patch.object(test_db_session, "commit", side_effect=raise_integrity):
            with patch.object(test_db_session, "rollback", new_callable=AsyncMock):
                result = await payment_service.process_webhook(
                    test_db_session, "vnpay", raw_body, payload
                )

    assert result["data"]["message"] == "Already processed"
    mock_email.assert_not_called()


# --- M1: Amount Mismatch Logging Test ---

@pytest.mark.asyncio
@patch.object(payment_service, "send_order_confirmation_email", new_callable=AsyncMock, return_value=True)
async def test_process_webhook_amount_mismatch_logs_error(mock_email, test_db_session, seed_order, caplog):
    """Amount mismatch between webhook and order logs ERROR but still processes."""
    import logging

    order = seed_order  # total_amount = 1200000
    # Send mismatched amount (999999 instead of 1200000)
    payload = _make_vnpay_payload(str(order.id), tx_id="tx-mismatch", amount=99999900)
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        with caplog.at_level(logging.ERROR, logger="src.services.payment_service"):
            result = await payment_service.process_webhook(
                test_db_session, "vnpay", raw_body, payload
            )

    # Should still process successfully
    assert result["data"]["payment_status"] == "paid"
    # Should have logged the amount mismatch
    assert any("Amount mismatch" in record.message for record in caplog.records)


# --- H2: Guest Order Without customer_id Skips Email ---

@pytest.mark.asyncio
@patch.object(payment_service, "send_order_confirmation_email", new_callable=AsyncMock, return_value=True)
async def test_process_webhook_guest_order_no_email(mock_email, test_db_session, seed_order):
    """Guest order (no customer_id) skips email sending."""
    order = seed_order
    # Remove customer_id to simulate guest checkout
    order.customer_id = None
    await test_db_session.commit()

    payload = _make_vnpay_payload(str(order.id), tx_id="tx-guest")
    raw_body = json.dumps(payload).encode()

    with patch.object(payment_service, "verify_webhook_signature", return_value=True):
        result = await payment_service.process_webhook(
            test_db_session, "vnpay", raw_body, payload
        )

    assert result["data"]["payment_status"] == "paid"
    # Email should NOT be called because no customer_id → no email
    mock_email.assert_not_called()
