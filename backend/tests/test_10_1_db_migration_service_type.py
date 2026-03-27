"""Tests for Story 10.1: DB Migration & Service Type Model.

Verifies:
- OrderStatus enum expanded with 8 new Epic 10 values (backward compatible)
- ServiceType enum: buy, rent, bespoke
- SecurityType enum: cccd, cash_deposit
- OrderDB has 7 new columns with correct defaults
- OrderPaymentDB model maps to order_payments table correctly
- OrderResponse Pydantic schema includes service_type with default='buy'
- OrderPaymentRecord schema serializes/deserializes correctly
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, GarmentDB, OrderDB, OrderItemDB, OrderPaymentDB, TenantDB
from src.models.order import (
    OrderPaymentRecord,
    OrderResponse,
    OrderStatus,
    PaymentMethod,
    PaymentStatus,
    SecurityType,
    ServiceType,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("10000000-0000-0000-0000-000000000001")
GARMENT_ID = uuid.UUID("10000000-0000-0000-0000-000000000010")
ORDER_ID = uuid.UUID("10000000-0000-0000-0000-000000000100")


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def base_data(db_session: AsyncSession):
    """Seed a tenant, garment, and one order for relation tests."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop 10", slug="test-shop-10")
    garment = GarmentDB(
        id=GARMENT_ID,
        tenant_id=TENANT_ID,
        name="Áo Dài Story 10.1",
        category="ao_dai",
        rental_price=Decimal("500000"),
        sale_price=Decimal("1200000"),
        status="available",
        size_options=["S", "M"],
    )
    order = OrderDB(
        id=ORDER_ID,
        tenant_id=TENANT_ID,
        customer_name="Nguyễn Test",
        customer_phone="0912345678",
        payment_method="cod",
        status="pending",
        payment_status="pending",
        subtotal_amount=Decimal("1200000"),
        discount_amount=Decimal("0"),
        total_amount=Decimal("1200000"),
        applied_voucher_ids=[],
    )
    db_session.add_all([tenant, garment, order])
    await db_session.commit()


# ---------------------------------------------------------------------------
# Task 4.2 — OrderStatus enum — all values present
# ---------------------------------------------------------------------------


class TestOrderStatusEnum:
    """Verify OrderStatus has all legacy + new Epic 10 values."""

    def test_legacy_values_preserved(self):
        """Existing statuses must remain unchanged for backward compatibility."""
        assert OrderStatus.pending == "pending"
        assert OrderStatus.confirmed == "confirmed"
        assert OrderStatus.in_progress == "in_progress"
        assert OrderStatus.checked == "checked"
        assert OrderStatus.shipped == "shipped"
        assert OrderStatus.delivered == "delivered"
        assert OrderStatus.cancelled == "cancelled"

    def test_epic10_new_values(self):
        """All 8 new Epic 10 statuses must be present."""
        assert OrderStatus.pending_measurement == "pending_measurement"
        assert OrderStatus.preparing == "preparing"
        assert OrderStatus.ready_to_ship == "ready_to_ship"
        assert OrderStatus.ready_for_pickup == "ready_for_pickup"
        assert OrderStatus.in_production == "in_production"
        assert OrderStatus.renting == "renting"
        assert OrderStatus.returned == "returned"
        assert OrderStatus.completed == "completed"

    def test_total_status_count(self):
        """Ensure no accidental value deletions — expect 15 total statuses."""
        assert len(OrderStatus) == 15

    def test_status_values_fit_varchar20(self):
        """All status string values must be <= 20 chars (DB column constraint)."""
        for status in OrderStatus:
            assert len(status.value) <= 20, f"Status '{status.value}' exceeds VARCHAR(20)"


# ---------------------------------------------------------------------------
# Task 4.3 — ServiceType and SecurityType enums
# ---------------------------------------------------------------------------


class TestServiceTypeEnum:
    """Verify ServiceType enum for Epic 10."""

    def test_service_type_values(self):
        assert ServiceType.buy == "buy"
        assert ServiceType.rent == "rent"
        assert ServiceType.bespoke == "bespoke"

    def test_service_type_count(self):
        assert len(ServiceType) == 3

    def test_service_type_is_string_enum(self):
        assert isinstance(ServiceType.buy, str)


class TestSecurityTypeEnum:
    """Verify SecurityType enum for rental security deposits."""

    def test_security_type_values(self):
        assert SecurityType.cccd == "cccd"
        assert SecurityType.cash_deposit == "cash_deposit"

    def test_security_type_count(self):
        assert len(SecurityType) == 2


# ---------------------------------------------------------------------------
# Task 4.4 — OrderDB ORM model has 7 new columns
# ---------------------------------------------------------------------------


class TestOrderDBNewColumns:
    """Verify OrderDB has all Epic 10 columns with correct defaults."""

    def test_service_type_column_exists(self):
        """Verify service_type column exists on OrderDB.
        SQLAlchemy column defaults apply at insert time (not Python object creation).
        Actual default='buy' behavior verified in test_order_defaults_backward_compat.
        """
        order = OrderDB(
            tenant_id=TENANT_ID,
            customer_name="Test",
            customer_phone="0912345678",
            payment_method="cod",
            status="pending",
            payment_status="pending",
            subtotal_amount=Decimal("100000"),
            discount_amount=Decimal("0"),
            total_amount=Decimal("100000"),
            applied_voucher_ids=[],
            service_type="buy",  # Explicit set
        )
        assert order.service_type == "buy"

    def test_security_type_nullable(self):
        order = OrderDB(
            tenant_id=TENANT_ID,
            customer_name="Test",
            customer_phone="0912345678",
            payment_method="cod",
            status="pending",
            payment_status="pending",
            subtotal_amount=Decimal("100000"),
            discount_amount=Decimal("0"),
            total_amount=Decimal("100000"),
            applied_voucher_ids=[],
        )
        assert order.security_type is None
        assert order.security_value is None
        assert order.pickup_date is None
        assert order.return_date is None
        assert order.deposit_amount is None
        assert order.remaining_amount is None

    def test_order_db_has_order_payments_relationship(self):
        """OrderDB must have order_payments relationship attribute."""
        assert hasattr(OrderDB, "order_payments")


# ---------------------------------------------------------------------------
# Task 4.5 — Backward compatibility: existing orders default to service_type='buy'
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_order_defaults_backward_compat(db_session: AsyncSession, base_data):
    """Orders created without service_type must default to 'buy'."""
    from sqlalchemy import select

    result = await db_session.execute(select(OrderDB).where(OrderDB.id == ORDER_ID))
    order = result.scalar_one()

    assert order.service_type == "buy"
    assert order.security_type is None
    assert order.security_value is None
    assert order.pickup_date is None
    assert order.return_date is None
    assert order.deposit_amount is None
    assert order.remaining_amount is None


@pytest.mark.asyncio
async def test_order_with_bespoke_service_type(db_session: AsyncSession, base_data):
    """Orders can be created with service_type='bespoke' and deposit_amount."""
    bespoke_order = OrderDB(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        customer_name="Khách Đặt May",
        customer_phone="0987654321",
        payment_method="vnpay",
        status="pending_measurement",
        payment_status="pending",
        subtotal_amount=Decimal("3000000"),
        discount_amount=Decimal("0"),
        total_amount=Decimal("3000000"),
        applied_voucher_ids=[],
        service_type="bespoke",
        deposit_amount=Decimal("1000000"),
        remaining_amount=Decimal("2000000"),
    )
    db_session.add(bespoke_order)
    await db_session.commit()

    from sqlalchemy import select

    result = await db_session.execute(select(OrderDB).where(OrderDB.id == bespoke_order.id))
    fetched = result.scalar_one()
    assert fetched.service_type == "bespoke"
    assert fetched.status == "pending_measurement"
    assert fetched.deposit_amount == Decimal("1000000")
    assert fetched.remaining_amount == Decimal("2000000")


@pytest.mark.asyncio
async def test_order_with_rent_service_type(db_session: AsyncSession, base_data):
    """Rental orders can store security_type, security_value, pickup/return dates."""
    now = datetime.now(timezone.utc)
    rent_order = OrderDB(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        customer_name="Khách Thuê",
        customer_phone="0909090909",
        payment_method="vnpay",
        status="pending",
        payment_status="pending",
        subtotal_amount=Decimal("500000"),
        discount_amount=Decimal("0"),
        total_amount=Decimal("500000"),
        applied_voucher_ids=[],
        service_type="rent",
        security_type="cccd",
        security_value="012345678901",
        pickup_date=now,
        return_date=now,
        deposit_amount=Decimal("150000"),
        remaining_amount=Decimal("350000"),
    )
    db_session.add(rent_order)
    await db_session.commit()

    from sqlalchemy import select

    result = await db_session.execute(select(OrderDB).where(OrderDB.id == rent_order.id))
    fetched = result.scalar_one()
    assert fetched.service_type == "rent"
    assert fetched.security_type == "cccd"
    assert fetched.security_value == "012345678901"
    assert fetched.pickup_date is not None
    assert fetched.deposit_amount == Decimal("150000")


# ---------------------------------------------------------------------------
# Task 4.6 — OrderPaymentDB model
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_create_order_payment_record(db_session: AsyncSession, base_data):
    """OrderPaymentDB can be created and associated with an order."""
    payment = OrderPaymentDB(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        order_id=ORDER_ID,
        payment_type="deposit",
        amount=Decimal("500000"),
        method="vnpay",
        status="pending",
    )
    db_session.add(payment)
    await db_session.commit()

    from sqlalchemy import select

    result = await db_session.execute(
        select(OrderPaymentDB).where(OrderPaymentDB.order_id == ORDER_ID)
    )
    fetched = result.scalar_one()
    assert fetched.payment_type == "deposit"
    assert fetched.amount == Decimal("500000")
    assert fetched.method == "vnpay"
    assert fetched.status == "pending"
    assert fetched.gateway_ref is None


@pytest.mark.asyncio
async def test_order_has_multiple_payments(db_session: AsyncSession, base_data):
    """An order can have multiple OrderPaymentDB records (multi-transaction pattern)."""
    deposit = OrderPaymentDB(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        order_id=ORDER_ID,
        payment_type="deposit",
        amount=Decimal("400000"),
        method="momo",
        status="paid",
        gateway_ref="MOMO_TX_001",
    )
    remaining = OrderPaymentDB(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        order_id=ORDER_ID,
        payment_type="remaining",
        amount=Decimal("800000"),
        method="vnpay",
        status="pending",
    )
    db_session.add_all([deposit, remaining])
    await db_session.commit()

    from sqlalchemy import select

    result = await db_session.execute(
        select(OrderPaymentDB).where(OrderPaymentDB.order_id == ORDER_ID)
    )
    payments = result.scalars().all()
    assert len(payments) == 2
    types = {p.payment_type for p in payments}
    assert types == {"deposit", "remaining"}


# ---------------------------------------------------------------------------
# Pydantic schema validation
# ---------------------------------------------------------------------------


class TestOrderResponsePydantic:
    """Verify OrderResponse Pydantic schema includes Epic 10 fields with defaults."""

    def test_order_response_service_type_defaults_to_buy(self):
        now = datetime.now(timezone.utc)
        response = OrderResponse(
            id=uuid.uuid4(),
            status=OrderStatus.pending,
            payment_status=PaymentStatus.pending,
            subtotal_amount=Decimal("100000"),
            total_amount=Decimal("100000"),
            payment_method=PaymentMethod.cod,
            customer_name="Test",
            customer_phone="0912345678",
            created_at=now,
        )
        assert response.service_type == ServiceType.buy
        assert response.deposit_amount is None
        assert response.remaining_amount is None

    def test_order_response_with_epic10_fields(self):
        now = datetime.now(timezone.utc)
        response = OrderResponse(
            id=uuid.uuid4(),
            status=OrderStatus.pending_measurement,
            payment_status=PaymentStatus.pending,
            subtotal_amount=Decimal("3000000"),
            total_amount=Decimal("3000000"),
            payment_method=PaymentMethod.vnpay,
            customer_name="Test Bespoke",
            customer_phone="0987654321",
            created_at=now,
            service_type=ServiceType.bespoke,
            deposit_amount=Decimal("1000000"),
            remaining_amount=Decimal("2000000"),
        )
        assert response.service_type == ServiceType.bespoke
        assert response.status == OrderStatus.pending_measurement
        assert response.deposit_amount == Decimal("1000000")


class TestOrderPaymentRecordPydantic:
    """Verify OrderPaymentRecord schema."""

    def test_order_payment_record_serialization(self):
        now = datetime.now(timezone.utc)
        record = OrderPaymentRecord(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            payment_type="deposit",
            amount=Decimal("500000"),
            method="vnpay",
            status="pending",
            created_at=now,
            updated_at=now,
        )
        assert record.payment_type == "deposit"
        assert record.gateway_ref is None

    def test_order_payment_record_with_gateway_ref(self):
        now = datetime.now(timezone.utc)
        record = OrderPaymentRecord(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            payment_type="full",
            amount=Decimal("1200000"),
            method="vnpay",
            status="paid",
            gateway_ref="VNP_TXN_2026_ABC",
            created_at=now,
            updated_at=now,
        )
        assert record.status == "paid"
        assert record.gateway_ref == "VNP_TXN_2026_ABC"
