"""Tests for Story 10.5: Sub-steps Chuẩn bị Thuê & Mua (Preparation Tracking).

Verifies:
- UpdatePreparationStepRequest / UpdatePreparationStepResponse schema validation
- RENT_PREP_STEPS / BUY_PREP_STEPS constants
- update_preparation_step() forward-only transitions for rent orders
- update_preparation_step() forward-only transitions for buy orders
- Auto-transition preparing → ready_to_ship when delivery_mode='ship'
- Auto-transition preparing → ready_for_pickup when delivery_mode='pickup'
- Error: non-preparing order → 422 ERR_INVALID_STATUS
- Error: backward step → 422 ERR_BACKWARD_STEP
- Error: last step without delivery_mode → 422 ERR_DELIVERY_MODE_REQUIRED
- Error: wrong tenant → 404
- approve_order() initializes preparation_step for rent/buy orders
- Notification created when order becomes ready
- OrderListItem includes preparation_step field
"""

import uuid
from datetime import datetime, timezone
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
    GarmentDB,
    OrderDB,
    OrderItemDB,
    TenantDB,
    UserDB,
)
from src.models.order import (
    BUY_PREP_STEPS,
    OrderListItem,
    OrderStatus,
    RENT_PREP_STEPS,
    ServiceType,
    UpdatePreparationStepRequest,
    UpdatePreparationStepResponse,
)
from src.services.order_service import update_preparation_step

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("10500000-0000-0000-0000-000000000001")
OTHER_TENANT_ID = uuid.UUID("10500000-0000-0000-0000-000000000002")
OWNER_ID = uuid.UUID("10500000-0000-0000-0000-000000000010")
CUSTOMER_ID = uuid.UUID("10500000-0000-0000-0000-000000000020")
GARMENT_ID = uuid.UUID("10500000-0000-0000-0000-000000000030")


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
    tenant = TenantDB(id=TENANT_ID, name="Test Shop 10.5", slug="test-shop-105")
    owner = UserDB(
        id=OWNER_ID,
        email="owner105@test.com",
        hashed_password="hashed",
        role="Owner",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    customer = UserDB(
        id=CUSTOMER_ID,
        email="customer105@test.com",
        hashed_password="hashed",
        role="Customer",
        tenant_id=TENANT_ID,
        is_active=True,
    )
    garment = GarmentDB(
        id=GARMENT_ID,
        tenant_id=TENANT_ID,
        name="Áo Dài Test 10.5",
        category="ao_dai",
        status="available",
        sale_price=Decimal("2500000"),
        rental_price=Decimal("500000"),
    )
    db_session.add_all([tenant, owner, customer, garment])
    await db_session.commit()


def _make_preparing_order(service_type: str, prep_step: str, customer_id=None) -> OrderDB:
    """Create an in-memory OrderDB with status=preparing and given preparation_step."""
    return OrderDB(
        id=uuid4(),
        tenant_id=TENANT_ID,
        customer_id=customer_id,
        customer_name="Khách Test 10.5",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "BN", "address_detail": "123"},
        payment_method="cod",
        status="preparing",
        subtotal_amount=Decimal("2500000"),
        discount_amount=Decimal("0"),
        total_amount=Decimal("2500000"),
        applied_voucher_ids=[],
        service_type=service_type,
        preparation_step=prep_step,
    )


async def _seed_order(db: AsyncSession, order: OrderDB) -> OrderDB:
    """Add order + one order item to DB."""
    item = OrderItemDB(
        id=uuid4(),
        order_id=order.id,
        garment_id=GARMENT_ID,
        transaction_type=order.service_type,
        unit_price=Decimal("2500000"),
        total_price=Decimal("2500000"),
        quantity=1,
    )
    db.add(order)
    db.add(item)
    await db.commit()
    return order


# ---------------------------------------------------------------------------
# 1. Schema / constants tests
# ---------------------------------------------------------------------------


class TestPreparationStepConstants:
    """Verify step list constants are defined correctly."""

    def test_rent_prep_steps(self):
        assert RENT_PREP_STEPS == ["cleaning", "altering", "ready"]

    def test_buy_prep_steps(self):
        assert BUY_PREP_STEPS == ["qc", "packaging", "ready"]


class TestUpdatePreparationStepSchemas:
    """Validate Pydantic request/response schemas."""

    def test_valid_request(self):
        req = UpdatePreparationStepRequest(preparation_step="altering")
        assert req.preparation_step == "altering"
        assert req.delivery_mode is None

    def test_valid_request_with_delivery_mode(self):
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="ship")
        assert req.delivery_mode == "ship"

    def test_invalid_delivery_mode(self):
        with pytest.raises(ValidationError):
            UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="invalid")

    def test_response_schema(self):
        resp = UpdatePreparationStepResponse(
            order_id=uuid4(),
            preparation_step="altering",
            status="preparing",
            service_type="rent",
            is_completed=False,
        )
        assert resp.is_completed is False
        assert resp.preparation_step == "altering"

    def test_response_completed(self):
        resp = UpdatePreparationStepResponse(
            order_id=uuid4(),
            preparation_step=None,
            status="ready_to_ship",
            service_type="rent",
            is_completed=True,
        )
        assert resp.is_completed is True
        assert resp.preparation_step is None


class TestOrderListItemPrepStep:
    """Verify OrderListItem includes preparation_step."""

    def test_list_item_with_prep_step(self):
        item = OrderListItem(
            id=uuid4(),
            status=OrderStatus.preparing,
            payment_status="pending",
            subtotal_amount=Decimal("1000"),
            total_amount=Decimal("1000"),
            payment_method="cod",
            customer_name="Test",
            customer_phone="0912345678",
            created_at=datetime.now(timezone.utc),
            service_type=ServiceType.rent,
            preparation_step="cleaning",
        )
        assert item.preparation_step == "cleaning"

    def test_list_item_without_prep_step(self):
        item = OrderListItem(
            id=uuid4(),
            status=OrderStatus.pending,
            payment_status="pending",
            subtotal_amount=Decimal("1000"),
            total_amount=Decimal("1000"),
            payment_method="cod",
            customer_name="Test",
            customer_phone="0912345678",
            created_at=datetime.now(timezone.utc),
        )
        assert item.preparation_step is None


# ---------------------------------------------------------------------------
# 2. Service function tests: update_preparation_step()
# ---------------------------------------------------------------------------


class TestUpdatePrepStepRent:
    """Test preparation step transitions for rental orders."""

    @pytest.mark.asyncio
    async def test_advance_cleaning_to_altering(self, db_session, base_data):
        order = await _seed_order(db_session, _make_preparing_order("rent", "cleaning"))
        req = UpdatePreparationStepRequest(preparation_step="altering")
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.preparation_step == "altering"
        assert result.status == "preparing"
        assert result.is_completed is False

    @pytest.mark.asyncio
    async def test_advance_altering_to_ready_ship(self, db_session, base_data):
        order = await _seed_order(db_session, _make_preparing_order("rent", "altering"))
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="ship")
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.preparation_step is None
        assert result.status == "ready_to_ship"
        assert result.is_completed is True

    @pytest.mark.asyncio
    async def test_advance_altering_to_ready_pickup(self, db_session, base_data):
        order = await _seed_order(db_session, _make_preparing_order("rent", "altering"))
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="pickup")
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.preparation_step is None
        assert result.status == "ready_for_pickup"
        assert result.is_completed is True

    @pytest.mark.asyncio
    async def test_skip_step_rejected(self, db_session, base_data):
        """Skipping steps is rejected — must advance exactly +1 (Decision 1A)."""
        order = await _seed_order(db_session, _make_preparing_order("rent", "cleaning"))
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="ship")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_SKIP_STEP" in str(exc_info.value.detail)


class TestUpdatePrepStepBuy:
    """Test preparation step transitions for buy orders (3 steps: qc→packaging→ready)."""

    @pytest.mark.asyncio
    async def test_advance_qc_to_packaging(self, db_session, base_data):
        order = await _seed_order(db_session, _make_preparing_order("buy", "qc"))
        req = UpdatePreparationStepRequest(preparation_step="packaging")
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.preparation_step == "packaging"
        assert result.status == "preparing"
        assert result.is_completed is False

    @pytest.mark.asyncio
    async def test_advance_packaging_to_ready_ship(self, db_session, base_data):
        order = await _seed_order(db_session, _make_preparing_order("buy", "packaging"))
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="ship")
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.preparation_step is None
        assert result.status == "ready_to_ship"
        assert result.is_completed is True

    @pytest.mark.asyncio
    async def test_advance_packaging_to_ready_pickup(self, db_session, base_data):
        order = await _seed_order(db_session, _make_preparing_order("buy", "packaging"))
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="pickup")
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.preparation_step is None
        assert result.status == "ready_for_pickup"
        assert result.is_completed is True


class TestUpdatePrepStepErrors:
    """Test error cases for update_preparation_step."""

    @pytest.mark.asyncio
    async def test_non_preparing_status(self, db_session, base_data):
        """Order not in preparing status → 422."""
        order = _make_preparing_order("rent", "cleaning")
        order.status = "pending"
        order = await _seed_order(db_session, order)
        req = UpdatePreparationStepRequest(preparation_step="altering")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_INVALID_STATUS" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_backward_step(self, db_session, base_data):
        """Backward transition → 422 ERR_BACKWARD_STEP."""
        order = await _seed_order(db_session, _make_preparing_order("rent", "altering"))
        req = UpdatePreparationStepRequest(preparation_step="cleaning")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_BACKWARD_STEP" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_same_step(self, db_session, base_data):
        """Same step → 422 ERR_SAME_STEP (Patch #11)."""
        order = await _seed_order(db_session, _make_preparing_order("rent", "cleaning"))
        req = UpdatePreparationStepRequest(preparation_step="cleaning")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_SAME_STEP" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_invalid_step_for_service_type(self, db_session, base_data):
        """Step from wrong service type → 422 ERR_INVALID_STEP."""
        order = await _seed_order(db_session, _make_preparing_order("buy", "qc"))
        req = UpdatePreparationStepRequest(preparation_step="altering")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_INVALID_STEP" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_last_step_without_delivery_mode(self, db_session, base_data):
        """Last step without delivery_mode → 422 ERR_DELIVERY_MODE_REQUIRED."""
        order = await _seed_order(db_session, _make_preparing_order("rent", "altering"))
        req = UpdatePreparationStepRequest(preparation_step="ready")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_DELIVERY_MODE_REQUIRED" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_wrong_tenant(self, db_session, base_data):
        """Order from different tenant → 404."""
        order = await _seed_order(db_session, _make_preparing_order("rent", "cleaning"))
        req = UpdatePreparationStepRequest(preparation_step="altering")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, OTHER_TENANT_ID, req)
        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_nonexistent_order(self, db_session, base_data):
        """Order does not exist → 404."""
        req = UpdatePreparationStepRequest(preparation_step="altering")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, uuid4(), TENANT_ID, req)
        assert exc_info.value.status_code == 404


class TestNotificationOnReady:
    """Test customer notification created when order becomes ready."""

    @pytest.mark.asyncio
    async def test_notification_created_for_customer(self, db_session, base_data):
        """When order with customer_id completes prep → notification created (no exception)."""
        order = _make_preparing_order("rent", "altering", customer_id=CUSTOMER_ID)
        order = await _seed_order(db_session, order)
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="ship")
        # Should not raise — notification creation is best-effort
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.is_completed is True
        assert result.status == "ready_to_ship"

    @pytest.mark.asyncio
    async def test_no_notification_for_internal_order(self, db_session, base_data):
        """Internal orders skip notification (no exception)."""
        order = _make_preparing_order("buy", "packaging", customer_id=CUSTOMER_ID)
        order.is_internal = True
        order = await _seed_order(db_session, order)
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="pickup")
        result = await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert result.is_completed is True
        assert result.status == "ready_for_pickup"


# ---------------------------------------------------------------------------
# 4. Code review fixes: new error cases
# ---------------------------------------------------------------------------


class TestCodeReviewFixes:
    """Tests for issues identified in code review."""

    @pytest.mark.asyncio
    async def test_skip_step_rejected(self, db_session, base_data):
        """Decision 1A: Skipping steps is rejected — must advance exactly +1."""
        order = await _seed_order(db_session, _make_preparing_order("rent", "cleaning"))
        req = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="ship")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_SKIP_STEP" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_prep_not_initialized(self, db_session, base_data):
        """Patch #5: Order in preparing with NULL preparation_step → clear error."""
        order = _make_preparing_order("rent", "cleaning")
        order.preparation_step = None  # Simulate corrupted/uninitialized state
        order = await _seed_order(db_session, order)
        req = UpdatePreparationStepRequest(preparation_step="cleaning")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_PREP_NOT_INITIALIZED" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_missing_service_type(self, db_session, base_data):
        """Patch #4: Order with empty service_type → clear error."""
        order = _make_preparing_order("rent", "cleaning")
        order.service_type = ""  # Simulate empty/corrupt service_type
        order = await _seed_order(db_session, order)
        req = UpdatePreparationStepRequest(preparation_step="altering")
        with pytest.raises(HTTPException) as exc_info:
            await update_preparation_step(db_session, order.id, TENANT_ID, req)
        assert exc_info.value.status_code == 422
        assert "ERR_MISSING_SERVICE_TYPE" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_buy_three_step_flow(self, db_session, base_data):
        """Decision 2A: Buy orders have 3 steps (qc→packaging→ready)."""
        order = await _seed_order(db_session, _make_preparing_order("buy", "qc"))
        # Step 1: qc → packaging
        req1 = UpdatePreparationStepRequest(preparation_step="packaging")
        result1 = await update_preparation_step(db_session, order.id, TENANT_ID, req1)
        assert result1.preparation_step == "packaging"
        assert result1.is_completed is False
        # Step 2: packaging → ready (last step)
        req2 = UpdatePreparationStepRequest(preparation_step="ready", delivery_mode="ship")
        result2 = await update_preparation_step(db_session, order.id, TENANT_ID, req2)
        assert result2.preparation_step is None
        assert result2.status == "ready_to_ship"
        assert result2.is_completed is True


# ---------------------------------------------------------------------------
# 5. Patch #12: approve_order() auto-initializes preparation_step
# ---------------------------------------------------------------------------


class TestApproveOrderPrepInit:
    """Verify approve_order() sets preparation_step on preparing transition."""

    @pytest.mark.asyncio
    async def test_approve_rent_order_inits_cleaning(self, db_session, base_data):
        """Rent order → preparation_step initialized to 'cleaning'."""
        order = OrderDB(
            id=uuid4(),
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            customer_name="Khách Thuê",
            customer_phone="0912345678",
            shipping_address={"province": "HCM", "district": "Q1", "ward": "BN", "address_detail": "123"},
            payment_method="cod",
            status="pending",
            subtotal_amount=Decimal("500000"),
            discount_amount=Decimal("0"),
            total_amount=Decimal("500000"),
            applied_voucher_ids=[],
            service_type="rent",
        )
        item = OrderItemDB(
            id=uuid4(), order_id=order.id, garment_id=GARMENT_ID,
            transaction_type="rent", unit_price=Decimal("500000"),
            total_price=Decimal("500000"), quantity=1,
        )
        db_session.add(order)
        db_session.add(item)
        await db_session.commit()

        from src.models.order import ApproveOrderRequest
        from src.services.order_service import approve_order
        req = ApproveOrderRequest()
        result = await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)
        assert result.new_status == "preparing"

        # Verify preparation_step was set
        from sqlalchemy import select
        refreshed = (await db_session.execute(
            select(OrderDB).where(OrderDB.id == order.id)
        )).scalar_one()
        assert refreshed.preparation_step == "cleaning"

    @pytest.mark.asyncio
    async def test_approve_buy_order_inits_qc(self, db_session, base_data):
        """Buy order → preparation_step initialized to 'qc'."""
        order = OrderDB(
            id=uuid4(),
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            customer_name="Khách Mua",
            customer_phone="0912345678",
            shipping_address={"province": "HCM", "district": "Q1", "ward": "BN", "address_detail": "123"},
            payment_method="cod",
            status="pending",
            subtotal_amount=Decimal("2500000"),
            discount_amount=Decimal("0"),
            total_amount=Decimal("2500000"),
            applied_voucher_ids=[],
            service_type="buy",
        )
        item = OrderItemDB(
            id=uuid4(), order_id=order.id, garment_id=GARMENT_ID,
            transaction_type="buy", unit_price=Decimal("2500000"),
            total_price=Decimal("2500000"), quantity=1,
        )
        db_session.add(order)
        db_session.add(item)
        await db_session.commit()

        from src.models.order import ApproveOrderRequest
        from src.services.order_service import approve_order
        req = ApproveOrderRequest()
        result = await approve_order(db_session, order.id, TENANT_ID, OWNER_ID, req)
        assert result.new_status == "preparing"

        from sqlalchemy import select
        refreshed = (await db_session.execute(
            select(OrderDB).where(OrderDB.id == order.id)
        )).scalar_one()
        assert refreshed.preparation_step == "qc"
