"""API tests for Customer Order endpoints (Story 4.4c).

Tests GET /api/v1/customer/orders and related endpoints.
Uses in-memory SQLite with inline fixtures following project test patterns.
"""

import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, GarmentDB, OrderDB, OrderItemDB, TenantDB, UserDB

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
CUSTOMER_ID = uuid.UUID("00000000-0000-0000-0000-000000000100")
OTHER_CUSTOMER_ID = uuid.UUID("00000000-0000-0000-0000-000000000200")
GARMENT_ID = uuid.UUID("00000000-0000-0000-0000-000000000010")
ORDER_ID = uuid.UUID("00000000-0000-0000-0000-000000000300")
ORDER_ID_2 = uuid.UUID("00000000-0000-0000-0000-000000000301")


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_data(test_db_session: AsyncSession):
    """Seed tenant, users, garment, and orders."""
    db = test_db_session

    tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
    db.add(tenant)

    customer = UserDB(
        id=CUSTOMER_ID,
        email="customer@test.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Nguyễn Thị Linh",
        phone="0901234567",
        tenant_id=TENANT_ID,
    )
    other_customer = UserDB(
        id=OTHER_CUSTOMER_ID,
        email="other@test.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Khách Khác",
        phone="0901234568",
        tenant_id=TENANT_ID,
    )
    db.add_all([customer, other_customer])

    garment = GarmentDB(
        id=GARMENT_ID,
        tenant_id=TENANT_ID,
        name="Áo Dài Lụa",
        category="ao_dai",
        rental_price=Decimal("300000"),
        sale_price=Decimal("1200000"),
        status="available",
        size_options=["S", "M", "L"],
    )
    db.add(garment)

    # Order belonging to CUSTOMER_ID
    order = OrderDB(
        id=ORDER_ID,
        tenant_id=TENANT_ID,
        customer_id=CUSTOMER_ID,
        customer_name="Nguyễn Thị Linh",
        customer_phone="0901234567",
        shipping_address={
            "province": "TP. Hồ Chí Minh",
            "district": "Quận 1",
            "ward": "Phường Bến Nghé",
            "address_detail": "123 Nguyễn Huệ",
        },
        payment_method="cod",
        status="delivered",
        payment_status="paid",
        total_amount=Decimal("1200000"),
    )

    order_item = OrderItemDB(
        id=uuid.uuid4(),
        order_id=ORDER_ID,
        garment_id=GARMENT_ID,
        transaction_type="buy",
        unit_price=Decimal("1200000"),
        total_price=Decimal("1200000"),
        quantity=1,
    )

    # Rental order
    order2 = OrderDB(
        id=ORDER_ID_2,
        tenant_id=TENANT_ID,
        customer_id=CUSTOMER_ID,
        customer_name="Nguyễn Thị Linh",
        customer_phone="0901234567",
        shipping_address={
            "province": "TP. Hồ Chí Minh",
            "district": "Quận 1",
            "ward": "Phường Bến Nghé",
            "address_detail": "123 Nguyễn Huệ",
        },
        payment_method="cod",
        status="confirmed",
        payment_status="pending",
        total_amount=Decimal("600000"),
    )
    rental_item = OrderItemDB(
        id=uuid.uuid4(),
        order_id=ORDER_ID_2,
        garment_id=GARMENT_ID,
        transaction_type="rent",
        rental_status="active",
        rental_days=2,
        unit_price=Decimal("300000"),
        total_price=Decimal("600000"),
        quantity=1,
    )

    db.add_all([order, order_item, order2, rental_item])
    await db.commit()
    return {
        "customer": customer,
        "other_customer": other_customer,
        "order": order,
        "order2": order2,
    }


@pytest.fixture
def override_db(test_db_session):
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


def customer_token() -> str:
    return create_access_token({"sub": "customer@test.com"})


def other_token() -> str:
    return create_access_token({"sub": "other@test.com"})


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/customer/orders — list orders
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_list_orders_success(override_db, seed_data):
    """Customer can list own orders."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/customer/orders",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert "data" in body
    assert "meta" in body
    assert body["meta"]["total"] == 2
    assert len(body["data"]) == 2


@pytest.mark.asyncio
async def test_list_orders_empty_for_other_customer(override_db, seed_data):
    """Other customer sees empty list — cannot see different customer's orders."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/customer/orders",
            headers={"Authorization": f"Bearer {other_token()}"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] == 0
    assert body["data"] == []


@pytest.mark.asyncio
async def test_list_orders_unauthorized(override_db, seed_data):
    """Unauthenticated request returns 401."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/customer/orders")
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_list_orders_filter_by_status(override_db, seed_data):
    """Filter by status works correctly."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/customer/orders?status=delivered",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert body["meta"]["total"] == 1
    assert body["data"][0]["status"] == "delivered"


@pytest.mark.asyncio
async def test_list_orders_filter_by_type_buy(override_db, seed_data):
    """Filter by order_type=buy returns buy orders only."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/customer/orders?order_type=buy",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert all(o["order_type"] == "buy" for o in body["data"])


@pytest.mark.asyncio
async def test_list_orders_filter_by_type_rental(override_db, seed_data):
    """Filter by order_type=rental returns rental orders only."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            "/api/v1/customer/orders?order_type=rental",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 200
    body = resp.json()
    assert all(o["order_type"] == "rental" for o in body["data"])


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/customer/orders/{order_id} — order detail
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_order_detail_success(override_db, seed_data):
    """Customer can get own order detail."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/v1/customer/orders/{ORDER_ID}",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 200
    body = resp.json()
    data = body["data"]
    assert data["status"] == "delivered"
    assert "items" in data
    assert len(data["items"]) == 1
    assert "delivery_info" in data
    assert "timeline" in data
    assert len(data["timeline"]) >= 1


@pytest.mark.asyncio
async def test_get_order_detail_not_found(override_db, seed_data):
    """Returns 404 for non-existent order."""
    non_existent = uuid.uuid4()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/v1/customer/orders/{non_existent}",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_get_order_detail_unauthorized_other_customer(override_db, seed_data):
    """Other customer cannot access order they don't own (returns 404, not 403)."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/v1/customer/orders/{ORDER_ID}",
            headers={"Authorization": f"Bearer {other_token()}"},
        )
    # Returns 404 to not reveal order existence
    assert resp.status_code == 404


# ──────────────────────────────────────────────────────────────────────────────
# GET /api/v1/customer/orders/{order_id}/invoice
# ──────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_invoice_success(override_db, seed_data):
    """Customer can download invoice for own order."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/v1/customer/orders/{ORDER_ID}/invoice",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 200
    assert "text/html" in resp.headers["content-type"]
    assert "content-disposition" in resp.headers
    assert "invoice" in resp.headers["content-disposition"]
    # Verify HTML contains key order data
    html_content = resp.text
    assert "HÓA ĐƠN" in html_content
    assert "Nguyễn Thị Linh" in html_content


@pytest.mark.asyncio
async def test_get_invoice_not_found(override_db, seed_data):
    """Returns 404 for invoice of non-existent order."""
    non_existent = uuid.uuid4()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(
            f"/api/v1/customer/orders/{non_existent}/invoice",
            headers={"Authorization": f"Bearer {customer_token()}"},
        )
    assert resp.status_code == 404
