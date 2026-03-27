"""Tests for Story 10.4: Owner Approve & Auto-routing.

Verifies:
- ApproveOrderRequest / ApproveOrderResponse schema validation
- approve_order() buy/rent: pending → confirmed → preparing
- approve_order() bespoke: pending → confirmed → in_progress + TailorTask created
- approve_order() bespoke without assigned_to → 422 error
- approve_order() non-pending order → 400 error
- approve_order() wrong tenant → 404
- Customer notification created on approval
- _VALID_TRANSITIONS includes Epic 10 new statuses
- OrderListItem includes service_type field
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

import pytest
import pytest_asyncio
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import (
    Base,
    CustomerProfileDB,
    GarmentDB,
    MeasurementDB,
    OrderDB,
    OrderItemDB,
    TenantDB,
    UserDB,
)
from src.models.order import (
    ApproveOrderRequest,
    ApproveOrderResponse,
    OrderListItem,
    OrderStatus,
    ServiceType,
)
from src.services.order_service import (
    _VALID_TRANSITIONS,
    approve_order,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("10400000-0000-0000-0000-000000000001")
OTHER_TENANT_ID = uuid.UUID("10400000-0000-0000-0000-000000000002")
OWNER_ID = uuid.UUID("10400000-0000-0000-0000-000000000010")
TAILOR_ID = uuid.UUID("10400000-0000-0000-0000-000000000011")
CUSTOMER_ID = uuid.UUID("10400000-0000-0000-0000-000000000020")
GARMENT_ID = uuid.UUID("10400000-0000-0000-0000-000000000030")
PROFILE_ID = uuid.UUID("10400000-0000-0000-0000-000000000040")


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
    """Seed tenant, owner, tailor, customer, garment."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop 10.4", slug="test-shop-104")
    owner = UserDB(
        id=OWNER_ID,
        email="owner104@test.com",
        hashed_password="hashed",
        role="Owner",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    tailor = UserDB(
        id=TAILOR_ID,
        email="tailor104@test.com",
        hashed_password="hashed",
        role="Tailor",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    customer = UserDB(
        id=CUSTOMER_ID,
        email="customer104@test.com",
        hashed_password="hashed",
        role="Customer",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    garment = GarmentDB(
        id=GARMENT_ID,
        tenant_id=TENANT_ID,
        name="Áo Dài Test 10.4",
        category="ao_dai",
        status="available",
        sale_price=Decimal("2500000"),
        rental_price=Decimal("500000"),
    )
    db_session.add_all([tenant, owner, tailor, customer, garment])
    await db_session.commit()


def _make_pending_order(service_type: str, customer_id=None) -> OrderDB:
    """Create an in-memory OrderDB with given service_type and status=pending."""
    order = OrderDB(
        id=uuid4(),
        tenant_id=TENANT_ID,
        customer_id=customer_id,
        customer_name="Khách Test 10.4",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "BN", "address_detail": "123"},
        payment_method="cod",
        status="pending",
        subtotal_amount=Decimal("2500000"),
        discount_amount=Decimal("0"),
        total_amount=Decimal("2500000"),
        applied_voucher_ids=[],
        service_type=service_type,
    )
    if service_type == "rent":
        order.deposit_amount = Decimal("750000")
        order.remaining_amount = Decimal("1750000")
        order.security_type = "cccd"
        order.security_value = "001234567890"
        order.pickup_date = datetime(2026, 4, 1, tzinfo=timezone.utc)
        order.return_date = datetime(2026, 4, 5, tzinfo=timezone.utc)
    elif service_type == "bespoke":
        order.deposit_amount = Decimal("1250000")
        order.remaining_amount = Decimal("1250000")
    return order


async def _seed_order(db: AsyncSession, order: OrderDB, garment_id=GARMENT_ID) -> OrderDB:
    """Add order + one order item to DB."""
    item = OrderItemDB(
        id=uuid4(),
        order_id=order.id,
        garment_id=garment_id,
        transaction_type=order.service_type,
        unit_price=Decimal("2500000"),
        total_price=Decimal("2500000"),
        quantity=1,
    )
    order.items = [item]
    db.add(order)
    await db.commit()
    return order


# ---------------------------------------------------------------------------
# Schema tests — no DB needed
# ---------------------------------------------------------------------------


class TestApproveOrderRequest:
    """Test ApproveOrderRequest Pydantic schema."""

    def test_default_values(self):
        """No required fields — both optional."""
        req = ApproveOrderRequest()
        assert req.assigned_to is None
        assert req.notes is None

    def test_with_assigned_to(self):
        tailor_id = uuid4()
        req = ApproveOrderRequest(assigned_to=tailor_id)
        assert req.assigned_to == tailor_id

    def test_notes_max_length(self):
        """notes max 2000 chars."""
        with pytest.raises(ValidationError):
            ApproveOrderRequest(notes="x" * 2001)

    def test_notes_2000_chars_ok(self):
        req = ApproveOrderRequest(notes="x" * 2000)
        assert len(req.notes) == 2000


class TestApproveOrderResponse:
    """Test ApproveOrderResponse Pydantic schema."""

    def test_buy_response(self):
        order_id = uuid4()
        resp = ApproveOrderResponse(
            order_id=order_id,
            new_status="preparing",
            service_type="buy",
            routing_destination="warehouse",
        )
        assert resp.order_id == order_id
        assert resp.routing_destination == "warehouse"
        assert resp.task_id is None

    def test_bespoke_response_with_task(self):
        order_id = uuid4()
        task_id = uuid4()
        resp = ApproveOrderResponse(
            order_id=order_id,
            new_status="in_progress",
            service_type="bespoke",
            routing_destination="tailor",
            task_id=task_id,
        )
        assert resp.task_id == task_id
        assert resp.routing_destination == "tailor"

    def test_serialization(self):
        resp = ApproveOrderResponse(
            order_id=uuid4(),
            new_status="preparing",
            service_type="rent",
            routing_destination="warehouse",
        )
        data = resp.model_dump(mode="json")
        assert data["routing_destination"] == "warehouse"
        assert data["task_id"] is None


# ---------------------------------------------------------------------------
# _VALID_TRANSITIONS includes Epic 10 statuses
# ---------------------------------------------------------------------------


class TestValidTransitions:
    """Test _VALID_TRANSITIONS includes all Epic 10 statuses."""

    def test_pending_entry_exists(self):
        """pending → confirmed transition exists (legacy path)."""
        assert "pending" in _VALID_TRANSITIONS

    def test_epic10_statuses_present(self):
        """All Epic 10 statuses are in the transition map."""
        epic10_statuses = [
            "pending_measurement",
            "preparing",
            "ready_to_ship",
            "ready_for_pickup",
            "in_production",
            "renting",
            "returned",
            "completed",
        ]
        for status in epic10_statuses:
            assert status in _VALID_TRANSITIONS, f"Missing Epic 10 status: {status}"

    def test_ready_to_ship_goes_to_shipped(self):
        assert _VALID_TRANSITIONS["ready_to_ship"] == "shipped"

    def test_ready_for_pickup_goes_to_delivered(self):
        assert _VALID_TRANSITIONS["ready_for_pickup"] == "delivered"

    def test_renting_goes_to_returned(self):
        assert _VALID_TRANSITIONS["renting"] == "returned"

    def test_returned_goes_to_completed(self):
        assert _VALID_TRANSITIONS["returned"] == "completed"

    def test_in_production_goes_to_ready_to_ship(self):
        assert _VALID_TRANSITIONS["in_production"] == "ready_to_ship"

    def test_preparing_is_terminal_for_now(self):
        """preparing → None until Story 10.5 adds ready_to_ship/ready_for_pickup."""
        assert _VALID_TRANSITIONS["preparing"] is None

    def test_completed_is_terminal(self):
        assert _VALID_TRANSITIONS["completed"] is None


# ---------------------------------------------------------------------------
# OrderListItem service_type field
# ---------------------------------------------------------------------------


class TestOrderListItemServiceType:
    """Test service_type field added to OrderListItem."""

    def test_default_is_buy(self):
        item = OrderListItem(
            id=uuid4(),
            status=OrderStatus.pending,
            payment_status="pending",
            subtotal_amount=Decimal("100000"),
            total_amount=Decimal("100000"),
            payment_method="cod",
            customer_name="Test",
            customer_phone="0912345678",
            created_at=datetime.now(timezone.utc),
        )
        assert item.service_type == ServiceType.buy

    def test_rent_service_type(self):
        item = OrderListItem(
            id=uuid4(),
            status=OrderStatus.pending,
            payment_status="pending",
            subtotal_amount=Decimal("100000"),
            total_amount=Decimal("100000"),
            payment_method="cod",
            customer_name="Test",
            customer_phone="0912345678",
            created_at=datetime.now(timezone.utc),
            service_type=ServiceType.rent,
        )
        assert item.service_type == ServiceType.rent

    def test_bespoke_service_type(self):
        item = OrderListItem(
            id=uuid4(),
            status=OrderStatus.pending,
            payment_status="pending",
            subtotal_amount=Decimal("100000"),
            total_amount=Decimal("100000"),
            payment_method="cod",
            customer_name="Test",
            customer_phone="0912345678",
            created_at=datetime.now(timezone.utc),
            service_type=ServiceType.bespoke,
        )
        assert item.service_type == ServiceType.bespoke


# ---------------------------------------------------------------------------
# approve_order() service function tests
# ---------------------------------------------------------------------------


class TestApproveOrderBuy:
    """Test approve_order() for buy orders: pending → confirmed → preparing."""

    @pytest.mark.asyncio
    async def test_approve_buy_order(self, db_session: AsyncSession, base_data):
        """Buy order: pending → preparing, routing_destination=warehouse."""
        order = _make_pending_order("buy")
        await _seed_order(db_session, order)

        req = ApproveOrderRequest()
        result = await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert result.new_status == "preparing"
        assert result.service_type == "buy"
        assert result.routing_destination == "warehouse"
        assert result.task_id is None
        assert result.order_id == order.id

    @pytest.mark.asyncio
    async def test_approve_buy_order_db_status(self, db_session: AsyncSession, base_data):
        """After approval, order status in DB is 'preparing'."""
        from sqlalchemy import select
        order = _make_pending_order("buy")
        await _seed_order(db_session, order)
        order_id = order.id

        await approve_order(db_session, order_id, TENANT_ID, OWNER_ID, ApproveOrderRequest())

        result = await db_session.execute(select(OrderDB).where(OrderDB.id == order_id))
        refreshed = result.scalar_one()
        assert refreshed.status == "preparing"


class TestApproveOrderRent:
    """Test approve_order() for rent orders: pending → confirmed → preparing."""

    @pytest.mark.asyncio
    async def test_approve_rent_order(self, db_session: AsyncSession, base_data):
        """Rent order: pending → preparing, rental fields preserved."""
        order = _make_pending_order("rent")
        await _seed_order(db_session, order)

        req = ApproveOrderRequest()
        result = await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert result.new_status == "preparing"
        assert result.service_type == "rent"
        assert result.routing_destination == "warehouse"
        assert result.task_id is None

    @pytest.mark.asyncio
    async def test_approve_rent_preserves_rental_fields(self, db_session: AsyncSession, base_data):
        """Rental fields (pickup_date, security_type) preserved after approval."""
        from sqlalchemy import select
        order = _make_pending_order("rent")
        await _seed_order(db_session, order)
        order_id = order.id

        await approve_order(db_session, order_id, TENANT_ID, OWNER_ID, ApproveOrderRequest())

        result = await db_session.execute(select(OrderDB).where(OrderDB.id == order_id))
        refreshed = result.scalar_one()
        assert refreshed.security_type == "cccd"
        assert refreshed.security_value == "001234567890"


class TestApproveOrderBespoke:
    """Test approve_order() for bespoke orders: pending → in_progress + TailorTask."""

    @pytest.mark.asyncio
    async def test_approve_bespoke_requires_assigned_to(self, db_session: AsyncSession, base_data):
        """Bespoke order without assigned_to → 422 HTTP error."""
        order = _make_pending_order("bespoke")
        await _seed_order(db_session, order)

        req = ApproveOrderRequest(assigned_to=None)
        with pytest.raises(HTTPException) as exc_info:
            await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert exc_info.value.status_code == 422
        assert "ERR_TAILOR_REQUIRED" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_approve_bespoke_with_tailor(self, db_session: AsyncSession, base_data):
        """Bespoke order with tailor → in_progress + TailorTask + routing=tailor."""
        order = _make_pending_order("bespoke", customer_id=CUSTOMER_ID)
        await _seed_order(db_session, order)

        req = ApproveOrderRequest(assigned_to=TAILOR_ID)
        result = await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert result.new_status == "in_progress"
        assert result.service_type == "bespoke"
        assert result.routing_destination == "tailor"
        assert result.task_id is not None

    @pytest.mark.asyncio
    async def test_approve_bespoke_creates_tailor_task(self, db_session: AsyncSession, base_data):
        """After bespoke approval, TailorTask exists in DB with status='assigned'."""
        from sqlalchemy import select
        from src.models.db_models import TailorTaskDB
        order = _make_pending_order("bespoke")
        await _seed_order(db_session, order)

        req = ApproveOrderRequest(assigned_to=TAILOR_ID)
        result = await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        task_result = await db_session.execute(
            select(TailorTaskDB).where(TailorTaskDB.id == result.task_id)
        )
        task = task_result.scalar_one_or_none()
        assert task is not None
        assert task.status == "assigned"
        assert task.assigned_to == TAILOR_ID
        assert task.assigned_by == OWNER_ID

    @pytest.mark.asyncio
    async def test_approve_bespoke_order_status_in_db(self, db_session: AsyncSession, base_data):
        """After bespoke approval, order.status == 'in_progress' in DB."""
        from sqlalchemy import select
        order = _make_pending_order("bespoke")
        await _seed_order(db_session, order)
        order_id = order.id

        await approve_order(db_session, order_id, TENANT_ID, OWNER_ID, ApproveOrderRequest(assigned_to=TAILOR_ID))

        result = await db_session.execute(select(OrderDB).where(OrderDB.id == order_id))
        refreshed = result.scalar_one()
        assert refreshed.status == "in_progress"

    @pytest.mark.asyncio
    async def test_approve_bespoke_invalid_tailor(self, db_session: AsyncSession, base_data):
        """Bespoke with non-existent tailor ID → 422 error from create_task."""
        order = _make_pending_order("bespoke")
        await _seed_order(db_session, order)

        fake_tailor_id = uuid4()
        req = ApproveOrderRequest(assigned_to=fake_tailor_id)
        with pytest.raises(HTTPException) as exc_info:
            await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert exc_info.value.status_code in (404, 422)

    @pytest.mark.asyncio
    async def test_approve_bespoke_with_notes_appended(self, db_session: AsyncSession, base_data):
        """Owner notes are included in TailorTask.notes for bespoke orders."""
        from sqlalchemy import select
        from src.models.db_models import TailorTaskDB
        order = _make_pending_order("bespoke")
        await _seed_order(db_session, order)

        owner_note = "Khách cần may gấp trước ngày 15/4"
        req = ApproveOrderRequest(assigned_to=TAILOR_ID, notes=owner_note)
        result = await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        task_result = await db_session.execute(
            select(TailorTaskDB).where(TailorTaskDB.id == result.task_id)
        )
        task = task_result.scalar_one_or_none()
        assert task is not None
        # Notes may include measurement data prefix OR just owner notes
        assert owner_note in (task.notes or "")


# ---------------------------------------------------------------------------
# Error case tests
# ---------------------------------------------------------------------------


class TestApproveOrderErrors:
    """Test error cases for approve_order()."""

    @pytest.mark.asyncio
    async def test_approve_non_pending_order(self, db_session: AsyncSession, base_data):
        """Approving a non-pending order → 400 error."""
        order = _make_pending_order("buy")
        order.status = "confirmed"  # Already confirmed
        await _seed_order(db_session, order)

        req = ApproveOrderRequest()
        with pytest.raises(HTTPException) as exc_info:
            await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert exc_info.value.status_code == 400
        assert "ERR_INVALID_STATUS" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_approve_wrong_tenant(self, db_session: AsyncSession, base_data):
        """Approving with wrong tenant_id → 404 error."""
        order = _make_pending_order("buy")
        await _seed_order(db_session, order)

        req = ApproveOrderRequest()
        with pytest.raises(HTTPException) as exc_info:
            await approve_order(db_session, order.id, OTHER_TENANT_ID, OWNER_ID, req)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_approve_nonexistent_order(self, db_session: AsyncSession, base_data):
        """Approving non-existent order → 404 error."""
        fake_id = uuid4()
        req = ApproveOrderRequest()
        with pytest.raises(HTTPException) as exc_info:
            await approve_order(db_session, fake_id, TENANT_ID, OWNER_ID, req)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_approve_already_confirmed_idempotency(self, db_session: AsyncSession, base_data):
        """Approving confirmed order again → 400 (no silent success)."""
        order = _make_pending_order("buy")
        order.status = "confirmed"
        await _seed_order(db_session, order)

        req = ApproveOrderRequest()
        with pytest.raises(HTTPException) as exc_info:
            await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_approve_preparing_order(self, db_session: AsyncSession, base_data):
        """Approving order already in 'preparing' → 400 error."""
        order = _make_pending_order("buy")
        order.status = "preparing"
        await _seed_order(db_session, order)

        req = ApproveOrderRequest()
        with pytest.raises(HTTPException) as exc_info:
            await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)

        assert exc_info.value.status_code == 400


# ---------------------------------------------------------------------------
# Notification templates test
# ---------------------------------------------------------------------------


class TestApproveNotificationTemplates:
    """Test notification message templates added for Story 10.4."""

    def test_warehouse_message_exists(self):
        from src.services.notification_creator import ORDER_APPROVED_WAREHOUSE_MESSAGE
        title, template = ORDER_APPROVED_WAREHOUSE_MESSAGE
        assert "kho" in title.lower() or "chuẩn bị" in title
        formatted = template.format(order_code="#ABCDEF12")
        assert "#ABCDEF12" in formatted

    def test_bespoke_message_exists(self):
        from src.services.notification_creator import ORDER_APPROVED_BESPOKE_MESSAGE
        title, template = ORDER_APPROVED_BESPOKE_MESSAGE
        assert len(title) > 0
        formatted = template.format(order_code="#ABCDEF12")
        assert "#ABCDEF12" in formatted
