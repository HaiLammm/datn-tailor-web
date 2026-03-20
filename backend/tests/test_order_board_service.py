"""Service tests for Order Board (Story 4.2).

Tests list_orders filtering/pagination/sorting and update_order_status transition matrix.
"""

import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, GarmentDB, OrderDB, OrderItemDB, TailorTaskDB, TenantDB
from src.models.order import OrderFilterParams, OrderStatus, OrderStatusUpdate
from src.services import order_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
OTHER_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000002")
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
async def seeded_db(test_db_session: AsyncSession):
    """Seed tenant, garment, and multiple orders in various statuses."""
    tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
    other_tenant = TenantDB(id=OTHER_TENANT_ID, name="Other Shop", slug="other-shop")
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
    test_db_session.add_all([tenant, other_tenant, garment])
    await test_db_session.flush()

    shipping = {
        "province": "Hà Nội",
        "district": "Đống Đa",
        "ward": "Láng Hạ",
        "address_detail": "123 Đường ABC",
    }

    orders = [
        OrderDB(
            tenant_id=TENANT_ID,
            customer_name=f"Khách {i}",
            customer_phone=f"090000000{i}",
            shipping_address=shipping,
            payment_method="cod",
            status=status,
            payment_status=pay_status,
            total_amount=Decimal(str(100000 * (i + 1))),
        )
        for i, (status, pay_status) in enumerate(
            [
                ("pending", "pending"),
                ("confirmed", "pending"),
                ("in_progress", "paid"),
                ("checked", "paid"),
                ("shipped", "paid"),
                ("delivered", "paid"),
                ("cancelled", "pending"),
            ]
        )
    ]

    for o in orders:
        item = OrderItemDB(
            garment_id=GARMENT_ID,
            transaction_type="buy" if o.total_amount < Decimal("400000") else "rent",
            unit_price=o.total_amount,
            total_price=o.total_amount,
            quantity=1,
        )
        o.items.append(item)

    test_db_session.add_all(orders)
    await test_db_session.commit()
    return orders


# ---------------------------------------------------------------------------
# list_orders tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_list_orders_returns_all(test_db_session, seeded_db):
    """list_orders returns all orders for tenant with no filters."""
    params = OrderFilterParams()
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 7
    assert len(result.data) == 7


@pytest.mark.asyncio
async def test_list_orders_tenant_isolation(test_db_session, seeded_db):
    """list_orders returns no orders for other tenant."""
    params = OrderFilterParams()
    result = await order_service.list_orders(test_db_session, OTHER_TENANT_ID, params)
    assert result.meta.total == 0


@pytest.mark.asyncio
async def test_list_orders_filter_by_status(test_db_session, seeded_db):
    """Filter by single status."""
    params = OrderFilterParams(status=[OrderStatus.pending])
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 1
    assert result.data[0].status == OrderStatus.pending


@pytest.mark.asyncio
async def test_list_orders_filter_multi_status(test_db_session, seeded_db):
    """Filter by multiple statuses."""
    params = OrderFilterParams(
        status=[OrderStatus.pending, OrderStatus.confirmed]
    )
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 2


@pytest.mark.asyncio
async def test_list_orders_filter_payment_status(test_db_session, seeded_db):
    """Filter by payment status."""
    from src.models.order import PaymentStatus

    params = OrderFilterParams(payment_status=[PaymentStatus.paid])
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 4


@pytest.mark.asyncio
async def test_list_orders_search_customer_name(test_db_session, seeded_db):
    """Search by customer name."""
    params = OrderFilterParams(search="Khách 0")
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert result.meta.total == 1
    assert "Khách 0" in result.data[0].customer_name


@pytest.mark.asyncio
async def test_list_orders_filter_transaction_type(test_db_session, seeded_db):
    """Filter by transaction type."""
    params = OrderFilterParams(transaction_type="buy")
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    # Orders with total_amount < 400000 have "buy" items (indices 0,1,2 → amounts 100k, 200k, 300k)
    assert result.meta.total == 3
    for order in result.data:
        assert "buy" in order.transaction_types


@pytest.mark.asyncio
async def test_list_orders_pagination(test_db_session, seeded_db):
    """Pagination returns correct page and page_size."""
    params = OrderFilterParams(page=1, page_size=3)
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    assert len(result.data) == 3
    assert result.meta.total == 7
    assert result.meta.total_pages == 3

    params2 = OrderFilterParams(page=2, page_size=3)
    result2 = await order_service.list_orders(test_db_session, TENANT_ID, params2)
    assert len(result2.data) == 3

    # Pages should not overlap
    ids_page1 = {o.id for o in result.data}
    ids_page2 = {o.id for o in result2.data}
    assert ids_page1.isdisjoint(ids_page2)


@pytest.mark.asyncio
async def test_list_orders_sort_amount_asc(test_db_session, seeded_db):
    """Sort by total_amount ascending."""
    params = OrderFilterParams(sort_by="total_amount", sort_order="asc")
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    amounts = [float(o.total_amount) for o in result.data]
    assert amounts == sorted(amounts)


@pytest.mark.asyncio
async def test_list_orders_sort_amount_desc(test_db_session, seeded_db):
    """Sort by total_amount descending."""
    params = OrderFilterParams(sort_by="total_amount", sort_order="desc")
    result = await order_service.list_orders(test_db_session, TENANT_ID, params)
    amounts = [float(o.total_amount) for o in result.data]
    assert amounts == sorted(amounts, reverse=True)


# ---------------------------------------------------------------------------
# update_order_status tests
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def pending_order(test_db_session: AsyncSession) -> OrderDB:
    """Create a fresh pending order for status transition tests."""
    tenant = TenantDB(
        id=uuid.UUID("00000000-0000-0000-0000-000000000099"),
        name="Tx Shop",
        slug="tx-shop",
    )
    garment = GarmentDB(
        id=uuid.UUID("00000000-0000-0000-0000-000000000099"),
        tenant_id=tenant.id,
        name="Áo Dài Tx",
        category="ao_dai",
        rental_price=Decimal("300000"),
        sale_price=Decimal("900000"),
        status="available",
        size_options=["M"],
    )
    order = OrderDB(
        tenant_id=tenant.id,
        customer_name="Test Customer",
        customer_phone="0901234567",
        shipping_address={
            "province": "TP HCM",
            "district": "Q1",
            "ward": "Bến Nghé",
            "address_detail": "1 Lê Lợi",
        },
        payment_method="cod",
        status="pending",
        payment_status="pending",
        total_amount=Decimal("900000"),
    )
    item = OrderItemDB(
        garment_id=garment.id,
        transaction_type="buy",
        unit_price=Decimal("900000"),
        total_price=Decimal("900000"),
        quantity=1,
    )
    order.items.append(item)
    test_db_session.add_all([tenant, garment, order])
    await test_db_session.commit()
    await test_db_session.refresh(order)
    return order


@pytest.mark.asyncio
async def test_update_status_pending_to_confirmed(test_db_session, pending_order):
    """Valid transition: pending → confirmed."""
    result = await order_service.update_order_status(
        test_db_session,
        pending_order.id,
        pending_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.confirmed),
    )
    assert result.status == OrderStatus.confirmed


async def _make_order_shippable(session: AsyncSession, order: OrderDB):
    """Add a completed tailor task and set payment to paid so order can ship."""
    task = TailorTaskDB(
        tenant_id=order.tenant_id,
        order_id=order.id,
        assigned_to=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        assigned_by=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        garment_name="Test Garment",
        customer_name=order.customer_name,
        status="completed",
    )
    session.add(task)
    order.payment_status = "paid"
    await session.flush()


@pytest.mark.asyncio
async def test_update_status_full_pipeline(test_db_session, pending_order):
    """Walk the full pipeline: pending → confirmed → (task assigns → in_progress) → checked → shipped → delivered."""
    # pending → confirmed (manual)
    result = await order_service.update_order_status(
        test_db_session,
        pending_order.id,
        pending_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.confirmed),
    )
    assert result.status == OrderStatus.confirmed

    # Simulate task assignment auto-transition: confirmed → in_progress
    pending_order.status = "in_progress"
    await test_db_session.flush()

    # Add completed tailor task for in_progress → checked guard
    await _make_order_shippable(test_db_session, pending_order)

    # in_progress → checked (manual, requires tailor tasks completed)
    result = await order_service.update_order_status(
        test_db_session,
        pending_order.id,
        pending_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.checked),
    )
    assert result.status == OrderStatus.checked

    # checked → shipped (manual, requires paid/cod — pending_order is COD)
    result = await order_service.update_order_status(
        test_db_session,
        pending_order.id,
        pending_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.shipped),
    )
    assert result.status == OrderStatus.shipped

    # shipped → delivered
    result = await order_service.update_order_status(
        test_db_session,
        pending_order.id,
        pending_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.delivered),
    )
    assert result.status == OrderStatus.delivered


@pytest.mark.asyncio
async def test_update_status_skip_transition_rejected(test_db_session, pending_order):
    """Invalid skip: pending → in_progress should raise 422."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(
            test_db_session,
            pending_order.id,
            pending_order.tenant_id,
            OrderStatusUpdate(status=OrderStatus.in_progress),
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_update_status_cancel_from_pending(test_db_session, pending_order):
    """Cancel from pending is valid."""
    result = await order_service.update_order_status(
        test_db_session,
        pending_order.id,
        pending_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.cancelled),
    )
    assert result.status == OrderStatus.cancelled


@pytest.mark.asyncio
async def test_update_status_cannot_cancel_delivered(test_db_session, pending_order):
    """Cannot cancel an already delivered order."""
    from fastapi import HTTPException

    # Walk to delivered
    await order_service.update_order_status(
        test_db_session, pending_order.id, pending_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.confirmed),
    )
    # Simulate task assignment auto-transition
    pending_order.status = "in_progress"
    await test_db_session.flush()
    await _make_order_shippable(test_db_session, pending_order)
    for step in ["checked", "shipped", "delivered"]:
        await order_service.update_order_status(
            test_db_session, pending_order.id, pending_order.tenant_id,
            OrderStatusUpdate(status=OrderStatus(step)),
        )

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(
            test_db_session,
            pending_order.id,
            pending_order.tenant_id,
            OrderStatusUpdate(status=OrderStatus.cancelled),
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_update_status_not_found(test_db_session, pending_order):
    """Returns 404 for unknown order_id."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(
            test_db_session,
            uuid.uuid4(),
            pending_order.tenant_id,
            OrderStatusUpdate(status=OrderStatus.confirmed),
        )
    assert exc_info.value.status_code == 404


# ---------------------------------------------------------------------------
# Guard tests: in_progress → checked (tailor tasks) & checked → shipped (payment)
# ---------------------------------------------------------------------------


@pytest_asyncio.fixture
async def in_progress_order(test_db_session: AsyncSession) -> OrderDB:
    """Create an order at in_progress status for guard tests."""
    tenant = TenantDB(
        id=uuid.UUID("00000000-0000-0000-0000-000000000077"),
        name="Ship Shop",
        slug="ship-shop",
    )
    garment = GarmentDB(
        id=uuid.UUID("00000000-0000-0000-0000-000000000077"),
        tenant_id=tenant.id,
        name="Áo Dài Ship",
        category="ao_dai",
        rental_price=Decimal("300000"),
        sale_price=Decimal("900000"),
        status="available",
        size_options=["M"],
    )
    order = OrderDB(
        tenant_id=tenant.id,
        customer_name="Ship Customer",
        customer_phone="0901234567",
        shipping_address={
            "province": "TP HCM",
            "district": "Q1",
            "ward": "Bến Nghé",
            "address_detail": "1 Lê Lợi",
        },
        payment_method="vnpay",
        status="in_progress",
        payment_status="pending",
        total_amount=Decimal("900000"),
    )
    item = OrderItemDB(
        garment_id=garment.id,
        transaction_type="buy",
        unit_price=Decimal("900000"),
        total_price=Decimal("900000"),
        quantity=1,
    )
    order.items.append(item)
    test_db_session.add_all([tenant, garment, order])
    await test_db_session.commit()
    await test_db_session.refresh(order)
    return order


@pytest.mark.asyncio
async def test_check_rejected_no_tailor_tasks(test_db_session, in_progress_order):
    """Cannot check when no tailor tasks exist."""
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(
            test_db_session,
            in_progress_order.id,
            in_progress_order.tenant_id,
            OrderStatusUpdate(status=OrderStatus.checked),
        )
    assert exc_info.value.status_code == 422
    assert "ERR_CHECK_NOT_READY" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_check_rejected_tailor_not_completed(test_db_session, in_progress_order):
    """Cannot check when tailor task is still in_progress."""
    from fastapi import HTTPException

    task = TailorTaskDB(
        tenant_id=in_progress_order.tenant_id,
        order_id=in_progress_order.id,
        assigned_to=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        assigned_by=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        garment_name="Test",
        customer_name="Test",
        status="in_progress",
    )
    test_db_session.add(task)
    await test_db_session.flush()

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(
            test_db_session,
            in_progress_order.id,
            in_progress_order.tenant_id,
            OrderStatusUpdate(status=OrderStatus.checked),
        )
    assert exc_info.value.status_code == 422


@pytest.mark.asyncio
async def test_check_allowed_tailor_completed(test_db_session, in_progress_order):
    """Can check when all tailor tasks completed."""
    task = TailorTaskDB(
        tenant_id=in_progress_order.tenant_id,
        order_id=in_progress_order.id,
        assigned_to=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        assigned_by=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        garment_name="Test",
        customer_name="Test",
        status="completed",
    )
    test_db_session.add(task)
    await test_db_session.flush()

    result = await order_service.update_order_status(
        test_db_session,
        in_progress_order.id,
        in_progress_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.checked),
    )
    assert result.status == OrderStatus.checked


@pytest.mark.asyncio
async def test_ship_rejected_payment_not_settled(test_db_session, in_progress_order):
    """Cannot ship from checked when payment pending + non-COD."""
    from fastapi import HTTPException

    # Move to checked first
    task = TailorTaskDB(
        tenant_id=in_progress_order.tenant_id,
        order_id=in_progress_order.id,
        assigned_to=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        assigned_by=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        garment_name="Test",
        customer_name="Test",
        status="completed",
    )
    test_db_session.add(task)
    await test_db_session.flush()
    await order_service.update_order_status(
        test_db_session, in_progress_order.id, in_progress_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.checked),
    )

    with pytest.raises(HTTPException) as exc_info:
        await order_service.update_order_status(
            test_db_session,
            in_progress_order.id,
            in_progress_order.tenant_id,
            OrderStatusUpdate(status=OrderStatus.shipped),
        )
    assert exc_info.value.status_code == 422
    assert "ERR_SHIP_NOT_READY" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_ship_allowed_with_cod(test_db_session, in_progress_order):
    """COD orders can ship from checked even with pending payment."""
    in_progress_order.payment_method = "cod"
    task = TailorTaskDB(
        tenant_id=in_progress_order.tenant_id,
        order_id=in_progress_order.id,
        assigned_to=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        assigned_by=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        garment_name="Test",
        customer_name="Test",
        status="completed",
    )
    test_db_session.add(task)
    await test_db_session.flush()
    await order_service.update_order_status(
        test_db_session, in_progress_order.id, in_progress_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.checked),
    )

    result = await order_service.update_order_status(
        test_db_session,
        in_progress_order.id,
        in_progress_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.shipped),
    )
    assert result.status == OrderStatus.shipped


@pytest.mark.asyncio
async def test_ship_allowed_with_paid(test_db_session, in_progress_order):
    """Paid orders can ship from checked."""
    in_progress_order.payment_status = "paid"
    task = TailorTaskDB(
        tenant_id=in_progress_order.tenant_id,
        order_id=in_progress_order.id,
        assigned_to=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        assigned_by=uuid.UUID("00000000-0000-0000-0000-000000000088"),
        garment_name="Test",
        customer_name="Test",
        status="completed",
    )
    test_db_session.add(task)
    await test_db_session.flush()
    await order_service.update_order_status(
        test_db_session, in_progress_order.id, in_progress_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.checked),
    )

    result = await order_service.update_order_status(
        test_db_session,
        in_progress_order.id,
        in_progress_order.tenant_id,
        OrderStatusUpdate(status=OrderStatus.shipped),
    )
    assert result.status == OrderStatus.shipped
