"""Service tests for Internal Order (Owner Internal Order feature).

Tests create_internal_order, is_internal filter, notification suppression,
and null shipping_address serialization.
"""

import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, GarmentDB, OrderDB, OrderItemDB, TenantDB, UserDB
from src.models.order import (
    InternalOrderCreate,
    OrderFilterParams,
    OrderItemCreate,
    OrderResponse,
    OrderStatus,
    OrderStatusUpdate,
)
from src.services import order_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
OWNER_ID = uuid.UUID("00000000-0000-0000-0000-000000000005")
GARMENT_ID_1 = uuid.UUID("00000000-0000-0000-0000-000000000010")
GARMENT_ID_2 = uuid.UUID("00000000-0000-0000-0000-000000000011")
GARMENT_NO_PRICE = uuid.UUID("00000000-0000-0000-0000-000000000012")
GARMENT_RENTED = uuid.UUID("00000000-0000-0000-0000-000000000013")


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
async def seeded_db(test_db_session: AsyncSession):
    """Seed tenant, owner, garments for internal order tests."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
    owner = UserDB(
        id=OWNER_ID,
        tenant_id=TENANT_ID,
        email="owner@test.com",
        full_name="Chủ Tiệm Test",
        phone="0901234567",
        role="owner",
        hashed_password="fake",
    )
    garment1 = GarmentDB(
        id=GARMENT_ID_1,
        tenant_id=TENANT_ID,
        name="Áo Dài Đỏ",
        category="ao_dai",
        rental_price=Decimal("500000"),
        sale_price=Decimal("1200000"),
        status="available",
        size_options=["S", "M", "L"],
    )
    garment2 = GarmentDB(
        id=GARMENT_ID_2,
        tenant_id=TENANT_ID,
        name="Áo Dài Xanh",
        category="ao_dai",
        rental_price=Decimal("400000"),
        sale_price=Decimal("900000"),
        status="available",
        size_options=["M", "L"],
    )
    garment_no_price = GarmentDB(
        id=GARMENT_NO_PRICE,
        tenant_id=TENANT_ID,
        name="Áo Dài Trắng",
        category="ao_dai",
        rental_price=Decimal("300000"),
        sale_price=None,
        status="available",
        size_options=["S"],
    )
    garment_rented = GarmentDB(
        id=GARMENT_RENTED,
        tenant_id=TENANT_ID,
        name="Áo Dài Vàng",
        category="ao_dai",
        rental_price=Decimal("600000"),
        sale_price=Decimal("1500000"),
        status="rented",
        size_options=["M"],
    )
    test_db_session.add_all([tenant, owner, garment1, garment2, garment_no_price, garment_rented])
    await test_db_session.commit()
    return {"owner": owner, "tenant": tenant}


# ---------------------------------------------------------------------------
# create_internal_order tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_internal_order_success(test_db_session, seeded_db):
    """Creates order with is_internal=True, status=in_progress, payment=paid."""
    order_data = InternalOrderCreate(
        items=[OrderItemCreate(garment_id=GARMENT_ID_1, transaction_type="buy", size="M")],
    )
    result = await order_service.create_internal_order(
        test_db_session, order_data, seeded_db["owner"], TENANT_ID
    )
    assert isinstance(result, OrderResponse)
    assert result.is_internal is True
    assert result.status == OrderStatus.in_progress
    assert result.payment_status.value == "paid"
    assert result.payment_method.value == "internal"
    assert result.shipping_address is None
    assert result.total_amount == Decimal("1200000")


@pytest.mark.asyncio
async def test_create_internal_order_auto_fills_owner_info(test_db_session, seeded_db):
    """Customer name matches owner full_name."""
    order_data = InternalOrderCreate(
        items=[OrderItemCreate(garment_id=GARMENT_ID_1, transaction_type="buy")],
    )
    result = await order_service.create_internal_order(
        test_db_session, order_data, seeded_db["owner"], TENANT_ID
    )
    assert result.customer_name == "Chủ Tiệm Test"
    assert result.customer_phone == "0901234567"


@pytest.mark.asyncio
async def test_create_internal_order_rejects_rent_items(test_db_session, seeded_db):
    """422 for transaction_type=rent."""
    from fastapi import HTTPException

    order_data = InternalOrderCreate(
        items=[OrderItemCreate(garment_id=GARMENT_ID_1, transaction_type="rent")],
    )
    with pytest.raises(HTTPException) as exc_info:
        await order_service.create_internal_order(
            test_db_session, order_data, seeded_db["owner"], TENANT_ID
        )
    assert exc_info.value.status_code == 422
    assert "rent" in str(exc_info.value.detail).lower()


@pytest.mark.asyncio
async def test_create_internal_order_allows_non_available_garment(test_db_session, seeded_db):
    """Garment with status 'rented' is accepted for internal orders (F10)."""
    order_data = InternalOrderCreate(
        items=[OrderItemCreate(garment_id=GARMENT_RENTED, transaction_type="buy")],
    )
    result = await order_service.create_internal_order(
        test_db_session, order_data, seeded_db["owner"], TENANT_ID
    )
    assert result.is_internal is True
    assert result.total_amount == Decimal("1500000")


@pytest.mark.asyncio
async def test_create_internal_order_requires_sale_price(test_db_session, seeded_db):
    """422 for garment without sale_price."""
    from fastapi import HTTPException

    order_data = InternalOrderCreate(
        items=[OrderItemCreate(garment_id=GARMENT_NO_PRICE, transaction_type="buy")],
    )
    with pytest.raises(HTTPException) as exc_info:
        await order_service.create_internal_order(
            test_db_session, order_data, seeded_db["owner"], TENANT_ID
        )
    assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# list_orders is_internal filter tests
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def seeded_mixed_orders(test_db_session: AsyncSession, seeded_db):
    """Seed both internal and customer orders."""
    shipping = {
        "province": "Hà Nội",
        "district": "Đống Đa",
        "ward": "Láng Hạ",
        "address_detail": "123 ABC",
    }
    customer_order = OrderDB(
        tenant_id=TENANT_ID,
        customer_name="Khách Hàng",
        customer_phone="0900000000",
        shipping_address=shipping,
        payment_method="cod",
        status="pending",
        payment_status="pending",
        total_amount=Decimal("1200000"),
        is_internal=False,
    )
    internal_order = OrderDB(
        tenant_id=TENANT_ID,
        customer_id=OWNER_ID,
        customer_name="Chủ Tiệm Test",
        customer_phone="0901234567",
        shipping_address=None,
        payment_method="internal",
        status="in_progress",
        payment_status="paid",
        total_amount=Decimal("900000"),
        is_internal=True,
    )
    item1 = OrderItemDB(
        garment_id=GARMENT_ID_1,
        transaction_type="buy",
        unit_price=Decimal("1200000"),
        total_price=Decimal("1200000"),
        quantity=1,
    )
    item2 = OrderItemDB(
        garment_id=GARMENT_ID_2,
        transaction_type="buy",
        unit_price=Decimal("900000"),
        total_price=Decimal("900000"),
        quantity=1,
    )
    customer_order.items.append(item1)
    internal_order.items.append(item2)
    test_db_session.add_all([customer_order, internal_order])
    await test_db_session.commit()
    return {"customer": customer_order, "internal": internal_order}


@pytest.mark.asyncio
async def test_list_orders_filter_is_internal_true(test_db_session, seeded_mixed_orders):
    """Only internal orders returned."""
    params = OrderFilterParams(is_internal=True)
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 1
    assert result.data[0].is_internal is True


@pytest.mark.asyncio
async def test_list_orders_filter_is_internal_false(test_db_session, seeded_mixed_orders):
    """Only customer orders returned."""
    params = OrderFilterParams(is_internal=False)
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 1
    assert result.data[0].is_internal is False


@pytest.mark.asyncio
async def test_internal_order_appears_in_progress_list(test_db_session, seeded_mixed_orders):
    """Internal order with in_progress status shows up when filtering by status."""
    params = OrderFilterParams(status=[OrderStatus.in_progress])
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 1
    assert result.data[0].is_internal is True


# ---------------------------------------------------------------------------
# Notification suppression test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_internal_order_status_update_no_notification(test_db_session, seeded_mixed_orders):
    """Status update on internal order does NOT create notification (F11)."""
    from src.models.db_models import TailorTaskDB
    internal_order = seeded_mixed_orders["internal"]

    # Add completed tailor task for checked guard
    task = TailorTaskDB(
        tenant_id=TENANT_ID,
        order_id=internal_order.id,
        assigned_to=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        assigned_by=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        garment_name="Test",
        customer_name="Test",
        status="completed",
    )
    test_db_session.add(task)
    await test_db_session.flush()

    with patch(
        "src.services.order_service.create_notification", new_callable=AsyncMock
    ) as mock_notify:
        # in_progress → checked
        await order_service.update_order_status(
            test_db_session,
            internal_order.id,
            TENANT_ID,
            OrderStatusUpdate(status=OrderStatus.checked),
        )
        # checked → shipped (internal has payment_status=paid)
        await order_service.update_order_status(
            test_db_session,
            internal_order.id,
            TENANT_ID,
            OrderStatusUpdate(status=OrderStatus.shipped),
        )
        mock_notify.assert_not_called()


# ---------------------------------------------------------------------------
# Serialization test
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_order_response_with_null_shipping_address(test_db_session, seeded_db):
    """OrderResponse serialization succeeds for internal order with null shipping (F1)."""
    order_data = InternalOrderCreate(
        items=[OrderItemCreate(garment_id=GARMENT_ID_1, transaction_type="buy")],
    )
    result = await order_service.create_internal_order(
        test_db_session, order_data, seeded_db["owner"], TENANT_ID
    )
    # Should not raise — model_dump confirms serialization works
    dumped = result.model_dump(mode="json")
    assert dumped["shipping_address"] is None
    assert dumped["is_internal"] is True
