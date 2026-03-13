"""API tests for Order endpoints - Story 3.3.

Tests POST /api/v1/orders and GET /api/v1/orders/{order_id}.
Validates response format, error handling, and guest checkout.
"""

import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.main import app
from src.models.db_models import Base, GarmentDB, TenantDB

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
async def seed_data(test_db_session: AsyncSession):
    """Seed tenant and garment."""
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
    test_db_session.add_all([tenant, garment])
    await test_db_session.commit()


VALID_ORDER_PAYLOAD = {
    "customer_name": "Nguyễn Văn A",
    "customer_phone": "0912345678",
    "shipping_address": {
        "province": "TP. Hồ Chí Minh",
        "district": "Quận 1",
        "ward": "Phường Bến Nghé",
        "address_detail": "123 Nguyễn Huệ",
    },
    "payment_method": "cod",
    "items": [
        {
            "garment_id": str(GARMENT_ID),
            "transaction_type": "buy",
            "size": "M",
        }
    ],
}


@pytest.mark.asyncio
async def test_create_order_success(client: AsyncClient, seed_data):
    """POST /api/v1/orders returns 201 with order data."""
    response = await client.post("/api/v1/orders", json=VALID_ORDER_PAYLOAD)

    assert response.status_code == 201
    body = response.json()
    assert "data" in body
    assert "meta" in body
    assert body["data"]["status"] == "pending"
    assert body["data"]["payment_method"] == "cod"
    assert float(body["data"]["total_amount"]) == 1200000.0
    assert body["data"]["customer_name"] == "Nguyễn Văn A"


@pytest.mark.asyncio
async def test_create_order_response_format(client: AsyncClient, seed_data):
    """Order response includes required fields."""
    response = await client.post("/api/v1/orders", json=VALID_ORDER_PAYLOAD)

    assert response.status_code == 201
    data = response.json()["data"]
    assert "id" in data
    assert "status" in data
    assert "total_amount" in data
    assert "payment_method" in data
    assert "customer_name" in data
    assert "shipping_address" in data
    assert "items" in data
    assert "created_at" in data


@pytest.mark.asyncio
async def test_create_order_vnpay_returns_payment_url(client: AsyncClient, seed_data):
    """VNPay orders return payment_url in response."""
    payload = {**VALID_ORDER_PAYLOAD, "payment_method": "vnpay"}
    response = await client.post("/api/v1/orders", json=payload)

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["payment_url"] is not None
    assert "orderId=" in data["payment_url"]


@pytest.mark.asyncio
async def test_create_order_cod_no_payment_url(client: AsyncClient, seed_data):
    """COD orders have null payment_url."""
    response = await client.post("/api/v1/orders", json=VALID_ORDER_PAYLOAD)

    assert response.status_code == 201
    data = response.json()["data"]
    assert data["payment_url"] is None


@pytest.mark.asyncio
async def test_create_order_invalid_phone(client: AsyncClient, seed_data):
    """Invalid phone returns 422 validation error."""
    payload = {**VALID_ORDER_PAYLOAD, "customer_phone": "12345"}
    response = await client.post("/api/v1/orders", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_order_missing_items(client: AsyncClient, seed_data):
    """Empty items list returns 422 validation error."""
    payload = {**VALID_ORDER_PAYLOAD, "items": []}
    response = await client.post("/api/v1/orders", json=payload)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_order_garment_not_found(client: AsyncClient, seed_data):
    """Nonexistent garment returns 404."""
    payload = {
        **VALID_ORDER_PAYLOAD,
        "items": [
            {
                "garment_id": str(uuid.uuid4()),
                "transaction_type": "buy",
            }
        ],
    }
    response = await client.post("/api/v1/orders", json=payload)

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_order_success(client: AsyncClient, seed_data):
    """GET /api/v1/orders/{id} returns order data."""
    create_resp = await client.post("/api/v1/orders", json=VALID_ORDER_PAYLOAD)
    assert create_resp.status_code == 201
    order_id = create_resp.json()["data"]["id"]

    get_resp = await client.get(f"/api/v1/orders/{order_id}")

    assert get_resp.status_code == 200
    data = get_resp.json()["data"]
    assert data["id"] == order_id
    assert data["status"] == "pending"


@pytest.mark.asyncio
async def test_get_order_not_found(client: AsyncClient, seed_data):
    """GET /api/v1/orders/{id} returns 404 for nonexistent order."""
    fake_id = uuid.uuid4()
    response = await client.get(f"/api/v1/orders/{fake_id}")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_order_missing_customer_name(client: AsyncClient, seed_data):
    """Missing customer_name returns 422."""
    payload = {**VALID_ORDER_PAYLOAD, "customer_name": ""}
    response = await client.post("/api/v1/orders", json=payload)

    assert response.status_code == 422
