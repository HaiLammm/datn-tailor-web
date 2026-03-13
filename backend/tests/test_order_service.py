"""Unit tests for Order Service - Story 3.3.

Tests order creation with authoritative server pricing,
availability checks, and multi-tenant isolation.
"""

import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, GarmentDB, TenantDB
from src.models.order import OrderCreate, OrderItemCreate, ShippingAddress, PaymentMethod
from src.services import order_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    """Create test database session."""
    async_session = sessionmaker(
        test_db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_tenant(test_db_session: AsyncSession) -> uuid.UUID:
    """Seed a test tenant."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
    test_db_session.add(tenant)
    await test_db_session.commit()
    return TENANT_ID


@pytest_asyncio.fixture
async def seed_garment(test_db_session: AsyncSession, seed_tenant: uuid.UUID):
    """Seed a test garment."""
    garment = GarmentDB(
        id=uuid.UUID("00000000-0000-0000-0000-000000000010"),
        tenant_id=TENANT_ID,
        name="Áo Dài Đỏ",
        category="ao_dai",
        rental_price=Decimal("500000"),
        sale_price=Decimal("1200000"),
        status="available",
        size_options=["S", "M", "L"],
    )
    test_db_session.add(garment)
    await test_db_session.commit()
    await test_db_session.refresh(garment)
    return garment


def make_order_data(
    garment_id: uuid.UUID,
    transaction_type: str = "buy",
    payment_method: PaymentMethod = PaymentMethod.cod,
    rental_days: int | None = None,
) -> OrderCreate:
    return OrderCreate(
        customer_name="Nguyễn Văn A",
        customer_phone="0912345678",
        shipping_address=ShippingAddress(
            province="TP. Hồ Chí Minh",
            district="Quận 1",
            ward="Phường Bến Nghé",
            address_detail="123 Nguyễn Huệ",
        ),
        payment_method=payment_method,
        items=[
            OrderItemCreate(
                garment_id=garment_id,
                transaction_type=transaction_type,
                size="M" if transaction_type == "buy" else None,
                rental_days=rental_days,
            )
        ],
    )


@pytest.mark.asyncio
async def test_create_order_buy_uses_sale_price(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Backend uses sale_price for buy transactions (Authoritative Server)."""
    order_data = make_order_data(seed_garment.id, transaction_type="buy")
    result = await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert result.status == "pending"
    assert result.total_amount == Decimal("1200000")
    assert result.payment_method == PaymentMethod.cod
    assert len(result.items) == 1
    assert result.items[0].unit_price == Decimal("1200000")


@pytest.mark.asyncio
async def test_create_order_rent_uses_rental_price(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Backend uses rental_price for rent transactions (1 day default)."""
    order_data = make_order_data(seed_garment.id, transaction_type="rent")
    result = await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert result.total_amount == Decimal("500000")
    assert result.items[0].unit_price == Decimal("500000")


@pytest.mark.asyncio
async def test_create_order_rent_multiplies_by_rental_days(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Rental total = unit_price * rental_days (3 days = 1,500,000)."""
    order_data = make_order_data(
        seed_garment.id, transaction_type="rent", rental_days=3
    )
    result = await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert result.total_amount == Decimal("1500000")
    assert result.items[0].unit_price == Decimal("500000")
    assert result.items[0].total_price == Decimal("1500000")


@pytest.mark.asyncio
async def test_create_order_buy_no_sale_price_raises_422(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Buy transaction fails with 422 when garment has no sale_price."""
    seed_garment.sale_price = None
    test_db_session.add(seed_garment)
    await test_db_session.commit()

    order_data = make_order_data(seed_garment.id, transaction_type="buy")

    with pytest.raises(HTTPException) as exc_info:
        await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert exc_info.value.status_code == 422
    assert "ERR_ITEM_NOT_FOR_SALE" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_create_order_cod_no_payment_url(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """COD orders have no payment_url."""
    order_data = make_order_data(
        seed_garment.id, payment_method=PaymentMethod.cod
    )
    result = await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert result.payment_url is None


@pytest.mark.asyncio
async def test_create_order_vnpay_generates_payment_url(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """VNPay orders get a mock payment_url."""
    order_data = make_order_data(
        seed_garment.id, payment_method=PaymentMethod.vnpay
    )
    result = await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert result.payment_url is not None
    assert "orderId=" in result.payment_url
    assert "status=success" in result.payment_url


@pytest.mark.asyncio
async def test_create_order_momo_generates_payment_url(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Momo orders get a mock payment_url."""
    order_data = make_order_data(
        seed_garment.id, payment_method=PaymentMethod.momo
    )
    result = await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert result.payment_url is not None


@pytest.mark.asyncio
async def test_create_order_garment_not_found_raises_404(
    test_db_session: AsyncSession, seed_tenant: uuid.UUID
):
    """Raises 404 when garment does not exist."""
    nonexistent_id = uuid.uuid4()
    order_data = make_order_data(nonexistent_id)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert exc_info.value.status_code == 404
    assert "ERR_GARMENT_NOT_FOUND" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_create_order_garment_unavailable_raises_422(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Raises 422 when garment is not available (e.g., rented)."""
    # Mark garment as rented
    seed_garment.status = "rented"
    test_db_session.add(seed_garment)
    await test_db_session.commit()

    order_data = make_order_data(seed_garment.id)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert exc_info.value.status_code == 422
    assert "ERR_ITEM_UNAVAILABLE" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_create_order_wrong_tenant_raises_404(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Garment from another tenant returns 404 (tenant isolation)."""
    other_tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000099")
    order_data = make_order_data(seed_garment.id)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.create_order(
            test_db_session, order_data, other_tenant_id
        )

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_get_order_success(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Get order by ID returns correct data."""
    order_data = make_order_data(seed_garment.id)
    created = await order_service.create_order(
        test_db_session, order_data, TENANT_ID
    )

    result = await order_service.get_order(test_db_session, created.id, TENANT_ID)

    assert result.id == created.id
    assert result.status == "pending"
    assert result.customer_name == "Nguyễn Văn A"


@pytest.mark.asyncio
async def test_get_order_not_found_raises_404(
    test_db_session: AsyncSession, seed_tenant: uuid.UUID
):
    """Raises 404 when order does not exist."""
    nonexistent_id = uuid.uuid4()

    with pytest.raises(HTTPException) as exc_info:
        await order_service.get_order(test_db_session, nonexistent_id, TENANT_ID)

    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_create_order_stores_customer_info(
    test_db_session: AsyncSession, seed_garment: GarmentDB
):
    """Order stores customer name, phone, and shipping address."""
    order_data = make_order_data(seed_garment.id)
    result = await order_service.create_order(test_db_session, order_data, TENANT_ID)

    assert result.customer_name == "Nguyễn Văn A"
    assert result.customer_phone == "0912345678"
    assert result.shipping_address.province == "TP. Hồ Chí Minh"
    assert result.shipping_address.district == "Quận 1"
    assert result.shipping_address.address_detail == "123 Nguyễn Huệ"
