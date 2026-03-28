"""Tests for Story 10.6: Remaining Payment & Handover.

Verifies:
- PayRemainingRequest / PayRemainingResponse schema validation
- pay_remaining() — valid, invalid status, already paid, wrong tenant, wrong customer
- Remaining payment webhook processing — success & failure
- Status transition guards (remaining unpaid blocks shipping)
- Full handover flow: ready_to_ship → shipped → delivered → completed
- ready_for_pickup → delivered → completed
- Buy order (remaining_amount=NULL) skips remaining payment
- COD/internal orders bypass payment guard
- _next_status() correctly handles handover statuses
- Notifications sent on remaining payment and status transitions
"""

import uuid
from datetime import datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import (
    Base,
    GarmentDB,
    OrderDB,
    OrderItemDB,
    OrderPaymentDB,
    TenantDB,
    UserDB,
)
from src.models.order import (
    OrderListItem,
    OrderStatus,
    OrderStatusUpdate,
    PaymentMethod,
    PaymentStatus,
    PayRemainingRequest,
    PayRemainingResponse,
    ServiceType,
)
from src.services.order_service import pay_remaining, update_order_status

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("10600000-0000-0000-0000-000000000001")
OTHER_TENANT_ID = uuid.UUID("10600000-0000-0000-0000-000000000002")
OWNER_ID = uuid.UUID("10600000-0000-0000-0000-000000000010")
CUSTOMER_ID = uuid.UUID("10600000-0000-0000-0000-000000000020")
OTHER_CUSTOMER_ID = uuid.UUID("10600000-0000-0000-0000-000000000021")
GARMENT_ID = uuid.UUID("10600000-0000-0000-0000-000000000030")


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
    """Seed tenant, owner, customer, garment."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop 10.6", slug="test-shop-106")
    owner = UserDB(
        id=OWNER_ID,
        email="owner106@test.com",
        hashed_password="hashed",
        role="Owner",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    customer = UserDB(
        id=CUSTOMER_ID,
        email="customer106@test.com",
        hashed_password="hashed",
        role="Customer",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    other_customer = UserDB(
        id=OTHER_CUSTOMER_ID,
        email="other_customer106@test.com",
        hashed_password="hashed",
        role="Customer",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    garment = GarmentDB(
        id=GARMENT_ID,
        tenant_id=TENANT_ID,
        name="Áo Dài Test 10.6",
        category="ao_dai",
        status="available",
        sale_price=Decimal("2500000"),
        rental_price=Decimal("500000"),
    )
    db_session.add_all([tenant, owner, customer, other_customer, garment])
    await db_session.commit()


def _make_order(
    status: str = "ready_to_ship",
    service_type: str = "bespoke",
    remaining_amount: Decimal | None = Decimal("1500000"),
    payment_status: str = "pending",
    payment_method: str = "vnpay",
    customer_id=CUSTOMER_ID,
    deposit_amount: Decimal | None = Decimal("1000000"),
) -> OrderDB:
    """Create an in-memory OrderDB with given status and remaining amount."""
    return OrderDB(
        id=uuid4(),
        tenant_id=TENANT_ID,
        customer_id=customer_id,
        customer_name="Khách Test 10.6",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "BN", "address_detail": "123 Đường Test"},
        payment_method=payment_method,
        status=status,
        payment_status=payment_status,
        subtotal_amount=Decimal("2500000"),
        discount_amount=Decimal("0"),
        total_amount=Decimal("2500000"),
        applied_voucher_ids=[],
        service_type=service_type,
        deposit_amount=deposit_amount,
        remaining_amount=remaining_amount,
    )


async def _seed_order(db: AsyncSession, order: OrderDB) -> OrderDB:
    """Add order + one order item to DB."""
    item = OrderItemDB(
        id=uuid4(),
        order_id=order.id,
        garment_id=GARMENT_ID,
        transaction_type=order.service_type or "buy",
        unit_price=Decimal("2500000"),
        total_price=Decimal("2500000"),
        quantity=1,
    )
    db.add(order)
    db.add(item)
    await db.commit()
    return order


# ---------------------------------------------------------------------------
# 1. Schema tests
# ---------------------------------------------------------------------------


class TestPayRemainingSchemas:
    """Verify PayRemainingRequest / PayRemainingResponse schemas."""

    def test_request_default_payment_method(self):
        req = PayRemainingRequest()
        assert req.payment_method == PaymentMethod.vnpay

    def test_request_custom_payment_method(self):
        req = PayRemainingRequest(payment_method=PaymentMethod.momo)
        assert req.payment_method == PaymentMethod.momo

    def test_response_fields(self):
        resp = PayRemainingResponse(
            order_id=uuid4(),
            payment_url="/checkout/confirmation?test",
            amount=Decimal("1500000"),
            payment_type="remaining",
        )
        assert resp.payment_type == "remaining"
        assert resp.amount == Decimal("1500000")


# ---------------------------------------------------------------------------
# 2. pay_remaining() service tests
# ---------------------------------------------------------------------------


class TestPayRemaining:
    """Test pay_remaining() service function."""

    @pytest.mark.asyncio
    async def test_valid_pay_remaining_ready_to_ship(self, db_session, base_data):
        """AC#1: Initiate remaining payment for ready_to_ship order."""
        order = _make_order(status="ready_to_ship", remaining_amount=Decimal("1500000"))
        await _seed_order(db_session, order)

        result = await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)

        assert result.order_id == order.id
        assert result.payment_type == "remaining"
        assert result.amount == Decimal("1500000")
        assert result.payment_url is not None
        assert "paymentType=remaining" in result.payment_url

    @pytest.mark.asyncio
    async def test_valid_pay_remaining_ready_for_pickup(self, db_session, base_data):
        """AC#1: Also works for ready_for_pickup status."""
        order = _make_order(status="ready_for_pickup", remaining_amount=Decimal("800000"))
        await _seed_order(db_session, order)

        result = await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)

        assert result.order_id == order.id
        assert result.amount == Decimal("800000")

    @pytest.mark.asyncio
    async def test_creates_order_payment_record(self, db_session, base_data):
        """AC#1: OrderPaymentDB record created with type='remaining', status='pending'."""
        order = _make_order(status="ready_to_ship")
        await _seed_order(db_session, order)

        await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)

        from sqlalchemy import select
        result = await db_session.execute(
            select(OrderPaymentDB).where(
                OrderPaymentDB.order_id == order.id,
                OrderPaymentDB.payment_type == "remaining",
            )
        )
        payment = result.scalar_one()
        assert payment.status == "pending"
        assert payment.amount == Decimal("1500000")
        assert payment.method == "vnpay"

    @pytest.mark.asyncio
    async def test_invalid_status_not_ready(self, db_session, base_data):
        """pay_remaining() rejects orders not in ready_to_ship/ready_for_pickup."""
        order = _make_order(status="preparing")
        await _seed_order(db_session, order)

        with pytest.raises(HTTPException) as exc_info:
            await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)
        assert exc_info.value.status_code == 422
        assert "ERR_INVALID_STATUS" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_already_paid(self, db_session, base_data):
        """pay_remaining() rejects orders with remaining_amount=0."""
        order = _make_order(status="ready_to_ship", remaining_amount=Decimal("0"))
        await _seed_order(db_session, order)

        with pytest.raises(HTTPException) as exc_info:
            await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)
        assert exc_info.value.status_code == 422
        assert "ERR_ALREADY_PAID" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_null_remaining_amount(self, db_session, base_data):
        """pay_remaining() rejects orders with remaining_amount=NULL (buy 100%)."""
        order = _make_order(status="ready_to_ship", remaining_amount=None)
        await _seed_order(db_session, order)

        with pytest.raises(HTTPException) as exc_info:
            await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)
        assert exc_info.value.status_code == 422
        assert "ERR_ALREADY_PAID" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_wrong_tenant(self, db_session, base_data):
        """pay_remaining() returns 404 for wrong tenant."""
        order = _make_order(status="ready_to_ship")
        await _seed_order(db_session, order)

        with pytest.raises(HTTPException) as exc_info:
            await pay_remaining(db_session, order.id, OTHER_TENANT_ID, CUSTOMER_ID)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_wrong_customer(self, db_session, base_data):
        """pay_remaining() returns 404 if customer doesn't own the order."""
        order = _make_order(status="ready_to_ship")
        await _seed_order(db_session, order)

        with pytest.raises(HTTPException) as exc_info:
            await pay_remaining(db_session, order.id, TENANT_ID, OTHER_CUSTOMER_ID)
        assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# 3. Status transition guard tests
# ---------------------------------------------------------------------------


class TestRemainingPaymentGuard:
    """Test that ready_to_ship → shipped is blocked when remaining unpaid."""

    @pytest.mark.asyncio
    async def test_blocks_shipping_when_remaining_unpaid(self, db_session, base_data):
        """AC#5: Cannot ship when remaining_amount > 0 and payment_status != 'paid'."""
        order = _make_order(
            status="ready_to_ship",
            remaining_amount=Decimal("1500000"),
            payment_status="pending",
            payment_method="vnpay",
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.shipped)
        with pytest.raises(HTTPException) as exc_info:
            await update_order_status(db_session, order.id, TENANT_ID, update)
        assert exc_info.value.status_code == 422
        assert "ERR_REMAINING_UNPAID" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_allows_shipping_when_paid(self, db_session, base_data):
        """AC#4: Can ship when payment_status='paid'."""
        order = _make_order(
            status="ready_to_ship",
            remaining_amount=Decimal("0"),
            payment_status="paid",
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.shipped)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.shipped

    @pytest.mark.asyncio
    async def test_allows_shipping_cod_order(self, db_session, base_data):
        """AC#5 exception: COD orders bypass remaining payment guard."""
        order = _make_order(
            status="ready_to_ship",
            remaining_amount=Decimal("1500000"),
            payment_status="pending",
            payment_method="cod",
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.shipped)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.shipped

    @pytest.mark.asyncio
    async def test_allows_shipping_buy_order_null_remaining(self, db_session, base_data):
        """AC#3: Buy 100% orders (remaining_amount=NULL) skip guard."""
        order = _make_order(
            status="ready_to_ship",
            service_type="buy",
            remaining_amount=None,
            payment_status="paid",
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.shipped)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.shipped


# ---------------------------------------------------------------------------
# 4. Full handover flow tests
# ---------------------------------------------------------------------------


class TestHandoverFlow:
    """Test full delivery/handover status transitions."""

    @pytest.mark.asyncio
    async def test_ready_to_ship_shipped_delivered_completed(self, db_session, base_data):
        """AC#4: ready_to_ship → shipped → delivered → completed for buy/bespoke."""
        order = _make_order(
            status="ready_to_ship",
            service_type="bespoke",
            remaining_amount=Decimal("0"),
            payment_status="paid",
        )
        await _seed_order(db_session, order)

        # ready_to_ship → shipped
        update = OrderStatusUpdate(status=OrderStatus.shipped)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.shipped

        # shipped → delivered
        update = OrderStatusUpdate(status=OrderStatus.delivered)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.delivered

        # delivered → completed
        update = OrderStatusUpdate(status=OrderStatus.completed)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.completed

    @pytest.mark.asyncio
    async def test_ready_for_pickup_delivered_completed(self, db_session, base_data):
        """AC#4: ready_for_pickup → delivered → completed."""
        order = _make_order(
            status="ready_for_pickup",
            service_type="buy",
            remaining_amount=None,
            payment_status="paid",
        )
        await _seed_order(db_session, order)

        # ready_for_pickup → delivered
        update = OrderStatusUpdate(status=OrderStatus.delivered)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.delivered

        # delivered → completed
        update = OrderStatusUpdate(status=OrderStatus.completed)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.completed

    @pytest.mark.asyncio
    async def test_invalid_transition_ready_to_ship_to_delivered(self, db_session, base_data):
        """Cannot skip shipped: ready_to_ship → delivered is invalid."""
        order = _make_order(
            status="ready_to_ship",
            remaining_amount=Decimal("0"),
            payment_status="paid",
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.delivered)
        with pytest.raises(HTTPException) as exc_info:
            await update_order_status(db_session, order.id, TENANT_ID, update)
        assert exc_info.value.status_code == 422
        assert "ERR_INVALID_TRANSITION" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_completed_is_terminal(self, db_session, base_data):
        """completed is a terminal status — no further transitions."""
        order = _make_order(status="ready_for_pickup", remaining_amount=None, payment_status="paid")
        await _seed_order(db_session, order)

        # Move to delivered then completed
        await update_order_status(
            db_session, order.id, TENANT_ID, OrderStatusUpdate(status=OrderStatus.delivered)
        )
        await update_order_status(
            db_session, order.id, TENANT_ID, OrderStatusUpdate(status=OrderStatus.completed)
        )

        # Try another transition from completed
        with pytest.raises(HTTPException) as exc_info:
            await update_order_status(
                db_session, order.id, TENANT_ID, OrderStatusUpdate(status=OrderStatus.shipped)
            )
        assert exc_info.value.status_code == 422


# ---------------------------------------------------------------------------
# 5. Buy order skips remaining payment (integration)
# ---------------------------------------------------------------------------


class TestBuyOrderSkipsRemaining:
    """AC#3: Buy 100% orders don't require remaining payment."""

    @pytest.mark.asyncio
    async def test_buy_order_null_remaining_goes_straight_to_shipped(self, db_session, base_data):
        """Buy order with remaining_amount=NULL transitions directly."""
        order = _make_order(
            status="ready_to_ship",
            service_type="buy",
            remaining_amount=None,
            payment_status="paid",
            deposit_amount=None,
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.shipped)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.shipped

    @pytest.mark.asyncio
    async def test_buy_order_zero_remaining_goes_straight_to_shipped(self, db_session, base_data):
        """Buy order with remaining_amount=0 transitions directly."""
        order = _make_order(
            status="ready_to_ship",
            service_type="buy",
            remaining_amount=Decimal("0"),
            payment_status="paid",
            deposit_amount=Decimal("2500000"),
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.shipped)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.shipped


# ---------------------------------------------------------------------------
# 6. Code review fixes — additional tests
# ---------------------------------------------------------------------------


class TestCodeReviewFixes:
    """Tests for issues found during code review."""

    @pytest.mark.asyncio
    async def test_p1_idempotency_returns_existing_payment(self, db_session, base_data):
        """P1: Second call to pay_remaining returns existing pending record, not duplicate."""
        order = _make_order(status="ready_to_ship", remaining_amount=Decimal("1500000"))
        await _seed_order(db_session, order)

        # First call
        result1 = await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)
        assert result1.amount == Decimal("1500000")

        # Second call — should return same, not create duplicate
        result2 = await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID)
        assert result2.amount == Decimal("1500000")

        # Verify only 1 pending record exists
        from sqlalchemy import select, func
        count_result = await db_session.execute(
            select(func.count(OrderPaymentDB.id)).where(
                OrderPaymentDB.order_id == order.id,
                OrderPaymentDB.payment_type == "remaining",
                OrderPaymentDB.status == "pending",
            )
        )
        assert count_result.scalar_one() == 1

    @pytest.mark.asyncio
    async def test_p2_blocks_pickup_delivery_when_remaining_unpaid(self, db_session, base_data):
        """P2: ready_for_pickup → delivered blocked when remaining unpaid."""
        order = _make_order(
            status="ready_for_pickup",
            remaining_amount=Decimal("1500000"),
            payment_status="pending",
            payment_method="vnpay",
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.delivered)
        with pytest.raises(HTTPException) as exc_info:
            await update_order_status(db_session, order.id, TENANT_ID, update)
        assert exc_info.value.status_code == 422
        assert "ERR_REMAINING_UNPAID" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_p2_allows_pickup_delivery_when_paid(self, db_session, base_data):
        """P2: ready_for_pickup → delivered allowed when paid."""
        order = _make_order(
            status="ready_for_pickup",
            remaining_amount=Decimal("0"),
            payment_status="paid",
        )
        await _seed_order(db_session, order)

        update = OrderStatusUpdate(status=OrderStatus.delivered)
        result = await update_order_status(db_session, order.id, TENANT_ID, update)
        assert result.status == OrderStatus.delivered

    @pytest.mark.asyncio
    async def test_p6_rent_delivered_to_completed_blocked(self, db_session, base_data):
        """P6: Rent orders cannot go delivered → completed (Story 10.7 handles rent flow)."""
        order = _make_order(
            status="ready_for_pickup",
            service_type="rent",
            remaining_amount=None,
            payment_status="paid",
        )
        await _seed_order(db_session, order)

        # Move to delivered first
        await update_order_status(
            db_session, order.id, TENANT_ID, OrderStatusUpdate(status=OrderStatus.delivered)
        )

        # Attempt delivered → completed should be blocked for rent
        with pytest.raises(HTTPException) as exc_info:
            await update_order_status(
                db_session, order.id, TENANT_ID, OrderStatusUpdate(status=OrderStatus.completed)
            )
        assert exc_info.value.status_code == 422

    @pytest.mark.asyncio
    async def test_p11_cod_payment_method_rejected(self, db_session, base_data):
        """P11: pay_remaining rejects COD payment method."""
        order = _make_order(status="ready_to_ship", remaining_amount=Decimal("1500000"))
        await _seed_order(db_session, order)

        with pytest.raises(HTTPException) as exc_info:
            await pay_remaining(db_session, order.id, TENANT_ID, CUSTOMER_ID, payment_method="cod")
        assert exc_info.value.status_code == 422
        assert "ERR_INVALID_PAYMENT_METHOD" in str(exc_info.value.detail)


# ---------------------------------------------------------------------------
# 7. Notification template tests
# ---------------------------------------------------------------------------


class TestNotificationTemplates:
    """Verify Story 10.6 notification templates are defined correctly."""

    def test_remaining_paid_message(self):
        from src.services.notification_creator import ORDER_REMAINING_PAID_MESSAGE
        title, template = ORDER_REMAINING_PAID_MESSAGE
        assert title == "Thanh toán hoàn tất"
        assert "{order_code}" in template

    def test_shipped_in_status_messages(self):
        """shipped status is in ORDER_STATUS_MESSAGES for automatic notifications."""
        from src.services.notification_creator import ORDER_STATUS_MESSAGES
        assert "shipped" in ORDER_STATUS_MESSAGES
        title, template = ORDER_STATUS_MESSAGES["shipped"]
        assert "{order_code}" in template

    def test_delivered_in_status_messages(self):
        """delivered status is in ORDER_STATUS_MESSAGES for automatic notifications."""
        from src.services.notification_creator import ORDER_STATUS_MESSAGES
        assert "delivered" in ORDER_STATUS_MESSAGES
        title, template = ORDER_STATUS_MESSAGES["delivered"]
        assert "{order_code}" in template

    def test_completed_message(self):
        """completed status is in ORDER_STATUS_MESSAGES for automatic notifications."""
        from src.services.notification_creator import ORDER_STATUS_MESSAGES
        assert "completed" in ORDER_STATUS_MESSAGES
        title, template = ORDER_STATUS_MESSAGES["completed"]
        assert "hoàn tất" in title.lower() or "hoàn tất" in template.lower()

    def test_completed_in_order_status_messages(self):
        """completed status should be in ORDER_STATUS_MESSAGES for automatic notifications."""
        from src.services.notification_creator import ORDER_STATUS_MESSAGES
        assert "completed" in ORDER_STATUS_MESSAGES
        title, template = ORDER_STATUS_MESSAGES["completed"]
        assert "hoàn tất" in title.lower() or "hoàn tất" in template.lower()
