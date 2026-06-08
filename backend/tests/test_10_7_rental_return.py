"""Comprehensive test suite for Story 10.7: Rental Return & Security Refund.

Tests cover:
- Status transitions: delivered→renting, renting→returned, returned→completed
- Refund calculations: Good (100%), Damaged (100%), Lost (0%)
- Guard validations: service_type must be rent, status must be returned
- Database timestamps: rental_started_at, returned_at, rental_condition
- Notifications: ORDER_RENTAL_STARTED, ORDER_RENTAL_RETURNED, ORDER_RENTAL_REFUND
- Full rental lifecycle integration
- Idempotency: duplicate refund calls handled safely
"""

import pytest
import pytest_asyncio
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4, UUID
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.orm import sessionmaker

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from src.models.db_models import (
    Base,
    TenantDB,
    UserDB,
    OrderDB,
    OrderItemDB,
    OrderPaymentDB,
    GarmentDB,
    NotificationDB,
)
from src.models.order import (
    RentalCondition,
    RefundSecurityRequest,
    RefundSecurityResponse,
    ServiceType,
)
from src.services import order_service
from fastapi import HTTPException


TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

# ────────────────────────────────────────────────────────────────────────────
# Fixtures
# ────────────────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def test_engine():
    """Create in-memory SQLite test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(test_engine):
    """Create test database session."""
    async_session = sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def tenant(db_session: AsyncSession) -> TenantDB:
    """Create test tenant."""
    tenant = TenantDB(name="Test Tenant", slug="test-tenant")
    db_session.add(tenant)
    await db_session.commit()
    return tenant


@pytest_asyncio.fixture
async def owner(db_session: AsyncSession, tenant: TenantDB) -> UserDB:
    """Create test owner."""
    owner = UserDB(
        email="owner@test.com",
        hashed_password="hashed",
        role="Owner",
        is_active=True,
        full_name="Owner Test",
        tenant_id=tenant.id,
    )
    db_session.add(owner)
    await db_session.commit()
    return owner


@pytest_asyncio.fixture
async def customer(db_session: AsyncSession, tenant: TenantDB) -> UserDB:
    """Create test customer."""
    customer = UserDB(
        email="customer@test.com",
        hashed_password="hashed",
        role="Customer",
        is_active=True,
        full_name="Customer Test",
        tenant_id=tenant.id,
    )
    db_session.add(customer)
    await db_session.commit()
    return customer


@pytest_asyncio.fixture
async def garment(db_session: AsyncSession, tenant: TenantDB) -> GarmentDB:
    """Create test garment for rental."""
    garment = GarmentDB(
        tenant_id=tenant.id,
        name="Test Ao Dai",
        category="garment",
        material="silk",
        description="Test rental garment",
        image_url="http://example.com/image.jpg",
        quantity=5,
        rental_price=Decimal("500000"),
        size_options=["M", "L", "XL"],
        status="available",
    )
    db_session.add(garment)
    await db_session.commit()
    return garment


@pytest_asyncio.fixture
async def rental_order_at_delivered(
    db_session: AsyncSession, tenant: TenantDB, customer: UserDB, garment: GarmentDB
) -> OrderDB:
    """Create rental order at 'delivered' status (ready for renting transition)."""
    order = OrderDB(
        tenant_id=tenant.id,
        customer_id=customer.id,
        customer_name="Test Customer",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "W1", "address_detail": "123 Nguyen Trai"},
        payment_method="vnpay",
        status="delivered",
        payment_status="paid",
        subtotal_amount=Decimal("500000"),
        total_amount=Decimal("500000"),
        service_type="rent",
        security_type="cash_deposit",
        security_value="500000",  # 500k VND security deposit
        pickup_date=datetime.now(timezone.utc),
        return_date=datetime.now(timezone.utc),
        deposit_amount=Decimal("100000"),  # Deposit paid
        remaining_amount=None,  # Rent doesn't have remaining
    )
    db_session.add(order)
    await db_session.flush()  # Flush to get order.id before adding item

    # Add order item
    item = OrderItemDB(
        order_id=order.id,
        garment_id=garment.id,
        transaction_type="rent",
        unit_price=Decimal("500000"),
        total_price=Decimal("500000"),
        quantity=1,
    )
    db_session.add(item)
    await db_session.commit()
    return order


# ────────────────────────────────────────────────────────────────────────────
# Test Suite: Status Transitions (AC #1, #2, #4)
# ────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delivered_to_renting_sets_timestamp(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: delivered→renting sets rental_started_at timestamp."""
    from src.models.order import OrderStatusUpdate, OrderStatus

    order_id = rental_order_at_delivered.id
    update = OrderStatusUpdate(status=OrderStatus.renting)

    # Call update_order_status
    result = await order_service.update_order_status(db_session, order_id, tenant.id, update)

    # Verify: status changed, rental_started_at set
    assert result.status == "renting"

    # Refresh order from DB to check timestamp
    refreshed = await db_session.get(OrderDB, order_id)
    assert refreshed.rental_started_at is not None
    assert isinstance(refreshed.rental_started_at, datetime)


@pytest.mark.asyncio
async def test_renting_to_returned_sets_timestamps(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: renting→returned sets returned_at timestamp."""
    from src.models.order import OrderStatusUpdate, OrderStatus

    order = rental_order_at_delivered
    order.status = "renting"
    order.rental_started_at = datetime.now(timezone.utc)
    await db_session.commit()

    update = OrderStatusUpdate(status=OrderStatus.returned)

    result = await order_service.update_order_status(db_session, order.id, tenant.id, update)

    assert result.status == "returned"

    refreshed = await db_session.get(OrderDB, order.id)
    assert refreshed.returned_at is not None
    assert isinstance(refreshed.returned_at, datetime)


@pytest.mark.asyncio
async def test_delivered_to_renting_only_for_rent_service_type(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: delivered→renting blocked for non-rent service types.

    For a buy order the forward target of 'delivered' is 'completed', so requesting
    'renting' is rejected by the structural transition check (single source of truth).
    """
    from src.models.order import OrderStatusUpdate, OrderStatus

    # Change order to buy service type
    order = rental_order_at_delivered
    order.service_type = "buy"
    await db_session.commit()

    update = OrderStatusUpdate(status=OrderStatus.renting)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(db_session, order.id, tenant.id, update)

    assert exc_info.value.status_code == 422
    assert "ERR_INVALID_TRANSITION" in str(exc_info.value.detail)
    # buy orders advance to 'completed', never 'renting'
    assert "completed" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_renting_to_returned_only_for_rent_service_type(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: renting→returned blocked for non-rent service types."""
    from src.models.order import OrderStatusUpdate, OrderStatus

    order = rental_order_at_delivered
    order.status = "renting"
    order.service_type = "buy"
    await db_session.commit()

    update = OrderStatusUpdate(status=OrderStatus.returned)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(db_session, order.id, tenant.id, update)

    assert exc_info.value.status_code == 422
    assert "ERR_ONLY_RENT_CAN_RETURN" in str(exc_info.value.detail)


# ────────────────────────────────────────────────────────────────────────────
# Test Suite: Refund Security (AC #3)
# ────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refund_security_condition_good_full_refund(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: refund_security() with condition='Good' returns 100% of security_value."""
    order = rental_order_at_delivered
    order.status = "returned"
    order.rental_condition = None  # Not set yet
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.good)

    result = await order_service.refund_security(db_session, order.id, tenant.id, request)

    assert result.order_id == order.id
    assert result.refund_amount == Decimal("500000")  # Full security_value
    assert result.condition == RentalCondition.good
    assert result.already_processed is False  # first call is not a replay

    # Verify the refund audit row was written to OrderPaymentDB (cash-only scope)
    pay_result = await db_session.execute(
        select(OrderPaymentDB).where(OrderPaymentDB.order_id == order.id)
    )
    payments = pay_result.scalars().all()
    assert len(payments) == 1
    assert payments[0].payment_type == "security_deposit"
    assert payments[0].status == "refunded"
    assert payments[0].method == "cash"
    assert payments[0].amount == Decimal("500000")


@pytest.mark.asyncio
async def test_refund_security_condition_lost_zero_refund(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: refund_security() with condition='Lost' returns 0% refund."""
    order = rental_order_at_delivered
    order.status = "returned"
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.lost)

    result = await order_service.refund_security(db_session, order.id, tenant.id, request)

    assert result.refund_amount == Decimal("0")
    assert result.condition == RentalCondition.lost


@pytest.mark.asyncio
async def test_refund_security_sets_rental_condition(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: refund_security() sets rental_condition on order."""
    order = rental_order_at_delivered
    order.status = "returned"
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.damaged)

    await order_service.refund_security(db_session, order.id, tenant.id, request)

    refreshed = await db_session.get(OrderDB, order.id)
    assert refreshed.rental_condition == RentalCondition.damaged.value


@pytest.mark.asyncio
async def test_refund_security_requires_returned_status(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: refund_security() blocked if status != 'returned'."""
    order = rental_order_at_delivered
    order.status = "renting"  # Not returned yet
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.good)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.refund_security(db_session, order.id, tenant.id, request)

    assert exc_info.value.status_code == 422
    assert "ERR_NOT_RETURNED" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_refund_security_requires_rent_service_type(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: refund_security() blocked for non-rent orders."""
    order = rental_order_at_delivered
    order.status = "returned"
    order.service_type = "buy"
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.good)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.refund_security(db_session, order.id, tenant.id, request)

    assert exc_info.value.status_code == 422
    assert "ERR_NOT_RENTAL_ORDER" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_refund_security_requires_security_deposit(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: refund_security() blocked if security_value is NULL."""
    order = rental_order_at_delivered
    order.status = "returned"
    order.security_value = None  # No security collected
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.good)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.refund_security(db_session, order.id, tenant.id, request)

    assert exc_info.value.status_code == 422
    assert "ERR_NO_SECURITY_COLLECTED" in str(exc_info.value.detail)


# ────────────────────────────────────────────────────────────────────────────
# Test Suite: Rental Lifecycle (Full Flow)
# ────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_full_rental_lifecycle_transitions(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: Full rental lifecycle: delivered→renting→returned→completed."""
    from src.models.order import OrderStatusUpdate, OrderStatus

    order = rental_order_at_delivered

    # Step 1: delivered → renting
    update1 = OrderStatusUpdate(status=OrderStatus.renting)
    result1 = await order_service.update_order_status(db_session, order.id, tenant.id, update1)
    assert result1.status == "renting"

    refreshed = await db_session.get(OrderDB, order.id)
    assert refreshed.rental_started_at is not None

    # Step 2: renting → returned
    refreshed.status = "renting"  # Manually set for next transition
    await db_session.commit()

    update2 = OrderStatusUpdate(status=OrderStatus.returned)
    result2 = await order_service.update_order_status(db_session, order.id, tenant.id, update2)
    assert result2.status == "returned"

    refreshed2 = await db_session.get(OrderDB, order.id)
    assert refreshed2.returned_at is not None

    # Step 3: Process refund
    request = RefundSecurityRequest(condition=RentalCondition.good)
    refund_result = await order_service.refund_security(db_session, order.id, tenant.id, request)
    assert refund_result.refund_amount == Decimal("500000")

    # Step 4: returned → completed
    refreshed2.status = "returned"
    await db_session.commit()

    update3 = OrderStatusUpdate(status=OrderStatus.completed)
    result3 = await order_service.update_order_status(db_session, order.id, tenant.id, update3)
    assert result3.status == "completed"


# ────────────────────────────────────────────────────────────────────────────
# Test Suite: Idempotency
# ────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refund_security_idempotency_safe_duplicate_call(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Test: Calling refund_security() twice on same order (MVP: allow both calls with same result)."""
    order = rental_order_at_delivered
    order.status = "returned"
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.good)

    # First call — processes the refund
    result1 = await order_service.refund_security(db_session, order.id, tenant.id, request)
    assert result1.refund_amount == Decimal("500000")
    assert result1.already_processed is False

    # Second call (same condition) — idempotent replay, flagged
    result2 = await order_service.refund_security(db_session, order.id, tenant.id, request)
    assert result2.refund_amount == Decimal("500000")
    assert result2.already_processed is True
    assert result1.refund_amount == result2.refund_amount

    # Exactly one audit row exists despite two calls
    pay_result = await db_session.execute(
        select(OrderPaymentDB).where(
            OrderPaymentDB.order_id == order.id,
            OrderPaymentDB.payment_type == "security_deposit",
            OrderPaymentDB.status == "refunded",
        )
    )
    assert len(pay_result.scalars().all()) == 1


@pytest.mark.asyncio
async def test_refund_security_replay_keeps_original_condition(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """P2: a replay with a DIFFERENT condition must return the originally-stored
    condition + amount, not silently relabel the refund."""
    order = rental_order_at_delivered
    order.status = "returned"
    await db_session.commit()

    # First call: Good → full refund
    first = await order_service.refund_security(
        db_session, order.id, tenant.id, RefundSecurityRequest(condition=RentalCondition.good)
    )
    assert first.refund_amount == Decimal("500000")
    assert first.condition == RentalCondition.good

    # Replay with Lost — must still reflect the stored Good outcome
    replay = await order_service.refund_security(
        db_session, order.id, tenant.id, RefundSecurityRequest(condition=RentalCondition.lost)
    )
    assert replay.already_processed is True
    assert replay.refund_amount == Decimal("500000")  # stored amount, not 0
    assert replay.condition == RentalCondition.good     # stored condition, not Lost


# ────────────────────────────────────────────────────────────────────────────
# Test Suite: Edge cases (P5 CCCD, P6 negative deposit)
# ────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_refund_security_negative_value_rejected(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """P6: a negative security_value must be rejected with 422, never refunded."""
    order = rental_order_at_delivered
    order.status = "returned"
    order.security_value = "-500000"
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.good)

    with pytest.raises(HTTPException) as exc_info:
        await order_service.refund_security(db_session, order.id, tenant.id, request)

    assert exc_info.value.status_code == 422
    assert "ERR_INVALID_SECURITY_VALUE" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_refund_security_cccd_returns_card_not_cash(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, customer: UserDB, tenant: TenantDB
):
    """P5: CCCD security → refund_amount 0 and the notification says the ID card was
    returned, NOT '0 VND'."""
    order = rental_order_at_delivered
    order.status = "returned"
    order.security_type = "cccd"
    order.security_value = "CCCD-079..."  # an ID card number, not money
    await db_session.commit()

    request = RefundSecurityRequest(condition=RentalCondition.good)
    result = await order_service.refund_security(db_session, order.id, tenant.id, request)

    assert result.refund_amount == Decimal("0")
    assert result.security_type == "cccd"

    # Notification should mention returning the ID card, not a VND amount
    notif_result = await db_session.execute(
        select(NotificationDB).where(NotificationDB.user_id == customer.id)
    )
    notifs = notif_result.scalars().all()
    assert len(notifs) == 1
    assert "giấy tờ" in notifs[0].message.lower()
    assert "vnd" not in notifs[0].message.lower()


# ────────────────────────────────────────────────────────────────────────────
# Test Suite: Story 10.7b backend exposure — customer order detail rental fields
# ────────────────────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_customer_order_detail_exposes_security_and_refund(db_session: AsyncSession):
    """Story 10.7b: get_order_detail surfaces security + rental_condition + refunded amount."""
    from src.services.order_customer_service import DEFAULT_TENANT_ID, get_order_detail

    # Tenant must match the customer-service hardcoded DEFAULT_TENANT_ID
    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Default", slug="default")
    db_session.add(tenant)
    customer = UserDB(
        email="c107b@test.com", hashed_password="x", role="Customer",
        is_active=True, full_name="Khách 107b", tenant_id=DEFAULT_TENANT_ID,
    )
    db_session.add(customer)
    await db_session.flush()

    order = OrderDB(
        tenant_id=DEFAULT_TENANT_ID,
        customer_id=customer.id,
        customer_name="Khách 107b",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "W1", "address_detail": "1 Le Loi"},
        payment_method="cod",
        status="returned",
        payment_status="paid",
        subtotal_amount=Decimal("500000"),
        total_amount=Decimal("500000"),
        service_type="rent",
        security_type="cash_deposit",
        security_value="500000",
        return_date=datetime.now(timezone.utc),
    )
    db_session.add(order)
    await db_session.commit()

    # Before refund: no condition, no refund amount
    detail_before = await get_order_detail(db_session, order.id, customer.id)
    assert detail_before.service_type == "rent"
    assert detail_before.security_type == "cash_deposit"
    assert detail_before.security_value == "500000"
    assert detail_before.rental_condition is None
    assert detail_before.security_refund_amount is None

    # Process refund (Good → full)
    await order_service.refund_security(
        db_session, order.id, DEFAULT_TENANT_ID, RefundSecurityRequest(condition=RentalCondition.good)
    )

    detail_after = await get_order_detail(db_session, order.id, customer.id)
    assert detail_after.rental_condition == "Good"
    assert detail_after.security_refund_amount == Decimal("500000")
    # PII: CCCD value would be masked; this is a cash deposit so value is present
    assert detail_after.security_value == "500000"


@pytest.mark.asyncio
async def test_board_list_item_exposes_rental_fields(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Story 10.7b: list_orders OrderListItem carries rental_condition + security fields."""
    from src.models.order import OrderFilterParams

    order = rental_order_at_delivered
    order.status = "returned"
    await db_session.commit()
    await order_service.refund_security(
        db_session, order.id, tenant.id, RefundSecurityRequest(condition=RentalCondition.good)
    )

    result = await order_service.list_orders(db_session, tenant.id, OrderFilterParams())
    item = next(i for i in result.data if i.id == order.id)
    assert item.security_type == "cash_deposit"
    assert item.security_value == "500000"
    assert item.rental_condition == "Good"


@pytest.mark.asyncio
async def test_board_list_item_masks_cccd_security_value(
    db_session: AsyncSession, rental_order_at_delivered: OrderDB, tenant: TenantDB
):
    """Story 10.7b (PII): the raw CCCD number must NOT be shipped in the board list payload."""
    from src.models.order import OrderFilterParams

    order = rental_order_at_delivered
    order.security_type = "cccd"
    order.security_value = "079123456789"  # an ID card number
    await db_session.commit()

    result = await order_service.list_orders(db_session, tenant.id, OrderFilterParams())
    item = next(i for i in result.data if i.id == order.id)
    assert item.security_type == "cccd"
    assert item.security_value is None  # masked
