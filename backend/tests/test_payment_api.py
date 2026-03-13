"""API tests for Payment webhook endpoints - Story 4.1.

Tests POST /api/v1/payments/webhook/{provider}.
Validates signature verification, idempotency, and response format.
"""

import hashlib
import hmac
import json
import uuid
from decimal import Decimal
from unittest.mock import patch

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.main import app
from src.models.db_models import Base, GarmentDB, OrderDB, PaymentTransactionDB, TenantDB

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
GARMENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")


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
async def override_get_db(test_db_session):
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(override_get_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def seed_order(test_db_session: AsyncSession) -> OrderDB:
    """Seed tenant and a pending order."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
    order = OrderDB(
        tenant_id=TENANT_ID,
        customer_name="Nguyễn Văn A",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "P1", "address_detail": "123 ABC"},
        payment_method="vnpay",
        status="pending",
        payment_status="pending",
        total_amount=Decimal("1200000"),
    )
    test_db_session.add_all([tenant, order])
    await test_db_session.commit()
    await test_db_session.refresh(order)
    return order


def _make_vnpay_payload(order_id: str, tx_id: str = "tx-api-001", code: str = "00") -> dict:
    return {
        "vnp_TxnRef": order_id,
        "vnp_TransactionNo": tx_id,
        "vnp_Amount": "120000000",
        "vnp_ResponseCode": code,
        "vnp_SecureHash": "placeholder",
    }


@pytest.mark.asyncio
@patch("src.services.payment_service.verify_webhook_signature", return_value=True)
@patch("src.services.payment_service.send_order_confirmation_email", return_value=True)
async def test_webhook_valid_callback(mock_email, mock_sig, client: AsyncClient, seed_order):
    """Valid VNPay webhook returns 200 with success data."""
    payload = _make_vnpay_payload(str(seed_order.id))
    response = await client.post("/api/v1/payments/webhook/vnpay", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert body["data"]["payment_status"] == "paid"


@pytest.mark.asyncio
@patch("src.services.payment_service.verify_webhook_signature", return_value=False)
async def test_webhook_invalid_signature(mock_sig, client: AsyncClient, seed_order):
    """Invalid signature returns 400."""
    payload = _make_vnpay_payload(str(seed_order.id))
    response = await client.post("/api/v1/payments/webhook/vnpay", json=payload)

    assert response.status_code == 400


@pytest.mark.asyncio
@patch("src.services.payment_service.verify_webhook_signature", return_value=True)
@patch("src.services.payment_service.send_order_confirmation_email", return_value=True)
async def test_webhook_idempotent_duplicate(mock_email, mock_sig, client: AsyncClient, seed_order, test_db_session):
    """Duplicate webhook returns 200 without state change."""
    payload = _make_vnpay_payload(str(seed_order.id), tx_id="dup-tx")

    # First call: processes normally
    resp1 = await client.post("/api/v1/payments/webhook/vnpay", json=payload)
    assert resp1.status_code == 200

    # Second call: idempotent
    resp2 = await client.post("/api/v1/payments/webhook/vnpay", json=payload)
    assert resp2.status_code == 200
    assert resp2.json()["data"]["message"] == "Already processed"


@pytest.mark.asyncio
async def test_webhook_unsupported_provider(client: AsyncClient, seed_order):
    """Unsupported provider returns 400 error."""
    response = await client.post(
        "/api/v1/payments/webhook/stripe",
        json={"test": "data"},
    )

    assert response.status_code == 400
    body = response.json()
    assert body["detail"]["error"]["code"] == "ERR_UNSUPPORTED_PROVIDER"


@pytest.mark.asyncio
@patch("src.services.payment_service.verify_webhook_signature", return_value=True)
async def test_webhook_nonexistent_order(mock_sig, client: AsyncClient, seed_order):
    """Webhook for nonexistent order returns 400."""
    payload = _make_vnpay_payload(str(uuid.uuid4()))
    response = await client.post("/api/v1/payments/webhook/vnpay", json=payload)

    assert response.status_code == 400


@pytest.mark.asyncio
@patch("src.services.payment_service.verify_webhook_signature", return_value=True)
@patch("src.services.payment_service.send_order_confirmation_email", return_value=True)
async def test_webhook_momo_callback(mock_email, mock_sig, client: AsyncClient, seed_order):
    """Momo webhook processes correctly."""
    payload = {
        "orderId": str(seed_order.id),
        "transId": 12345,
        "amount": 1200000,
        "resultCode": 0,
        "signature": "test-sig",
    }
    response = await client.post("/api/v1/payments/webhook/momo", json=payload)

    assert response.status_code == 200
    body = response.json()
    assert body["data"]["payment_status"] == "paid"
