"""Unit tests for owner task management functions in tailor_task_service (Story 5.2).

Tests create_task, list_all_tasks, update_task, delete_task.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import (
    Base,
    GarmentDB,
    OrderDB,
    OrderItemDB,
    TailorTaskDB,
    TenantDB,
    UserDB,
)
from src.models.tailor_task import TaskCreateRequest, TaskUpdateRequest
from src.services import tailor_task_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.uuid4()
OTHER_TENANT_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
TAILOR_A_ID = uuid.uuid4()
TAILOR_B_ID = uuid.uuid4()
CUSTOMER_USER_ID = uuid.uuid4()
ORDER_ID = uuid.uuid4()
ORDER_PENDING_ID = uuid.uuid4()
GARMENT_ID = uuid.uuid4()
ORDER_ITEM_ID = uuid.uuid4()


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db(test_db_engine):
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        # Seed tenants
        tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
        other_tenant = TenantDB(id=OTHER_TENANT_ID, name="Other Shop", slug="other-shop")
        session.add_all([tenant, other_tenant])

        # Seed users
        owner = UserDB(
            id=OWNER_ID, email="owner@test.com", role="Owner",
            tenant_id=TENANT_ID, full_name="Chủ tiệm"
        )
        tailor_a = UserDB(
            id=TAILOR_A_ID, email="tailora@test.com", role="Tailor",
            tenant_id=TENANT_ID, full_name="Thợ may A"
        )
        tailor_b = UserDB(
            id=TAILOR_B_ID, email="tailorb@test.com", role="Tailor",
            tenant_id=TENANT_ID, full_name="Thợ may B"
        )
        customer = UserDB(
            id=CUSTOMER_USER_ID, email="customer@test.com", role="Customer",
            tenant_id=TENANT_ID
        )
        session.add_all([owner, tailor_a, tailor_b, customer])

        # Seed garment
        garment = GarmentDB(
            id=GARMENT_ID, tenant_id=TENANT_ID, name="Áo dài cưới đỏ",
            category="wedding", rental_price=Decimal("1000000"),
            size_options=["S", "M", "L"],
        )
        session.add(garment)

        # Seed order (confirmed — ready for task assignment)
        order = OrderDB(
            id=ORDER_ID, tenant_id=TENANT_ID,
            customer_name="Nguyễn Thị Lan", customer_phone="0901234567",
            shipping_address={"city": "Hà Nội"}, total_amount=Decimal("3000000"),
            status="confirmed",
        )
        session.add(order)

        # Seed order (pending — should NOT be assignable)
        order_pending = OrderDB(
            id=ORDER_PENDING_ID, tenant_id=TENANT_ID,
            customer_name="Trần Văn B", customer_phone="0909876543",
            shipping_address={}, total_amount=Decimal("500000"),
            status="pending",
        )
        session.add(order_pending)

        await session.flush()

        # Seed order item (must be after flush so FK works)
        item = OrderItemDB(
            id=ORDER_ITEM_ID, order_id=ORDER_ID, garment_id=GARMENT_ID,
            transaction_type="buy", unit_price=Decimal("3000000"),
            total_price=Decimal("3000000"),
        )
        session.add(item)
        await session.flush()

        yield session


# ── create_task tests ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_task_success(db: AsyncSession):
    """Owner can create a task for a confirmed order."""
    request = TaskCreateRequest(
        order_id=ORDER_ID,
        assigned_to=TAILOR_A_ID,
        deadline=datetime.now(timezone.utc) + timedelta(days=7),
        notes="May cẩn thận",
        piece_rate=500000,
    )
    result = await tailor_task_service.create_task(db, request, OWNER_ID, TENANT_ID)

    assert result.order_id == str(ORDER_ID)
    assert result.assigned_to == str(TAILOR_A_ID)
    assert result.assigned_by == str(OWNER_ID)
    assert result.status == "assigned"
    assert result.notes == "May cẩn thận"
    assert result.piece_rate == 500000.0
    assert result.assignee_name == "Thợ may A"
    # customer_name auto-populated from order
    assert result.customer_name == "Nguyễn Thị Lan"


@pytest.mark.asyncio
async def test_create_task_auto_populates_garment_name(db: AsyncSession):
    """garment_name auto-populated from order item's garment."""
    request = TaskCreateRequest(
        order_id=ORDER_ID,
        order_item_id=ORDER_ITEM_ID,
        assigned_to=TAILOR_A_ID,
    )
    result = await tailor_task_service.create_task(db, request, OWNER_ID, TENANT_ID)
    assert result.garment_name == "Áo dài cưới đỏ"


@pytest.mark.asyncio
async def test_create_task_rejects_non_production_order(db: AsyncSession):
    """Cannot assign task for order not in 'confirmed' or 'in_progress' status."""
    request = TaskCreateRequest(
        order_id=ORDER_PENDING_ID,
        assigned_to=TAILOR_A_ID,
    )
    with pytest.raises(ValueError, match="đã xác nhận hoặc đang sản xuất"):
        await tailor_task_service.create_task(db, request, OWNER_ID, TENANT_ID)


@pytest.mark.asyncio
async def test_create_task_rejects_non_tailor_user(db: AsyncSession):
    """Cannot assign task to a non-Tailor user."""
    request = TaskCreateRequest(
        order_id=ORDER_ID,
        assigned_to=CUSTOMER_USER_ID,
    )
    with pytest.raises(ValueError, match="vai trò Thợ may"):
        await tailor_task_service.create_task(db, request, OWNER_ID, TENANT_ID)


@pytest.mark.asyncio
async def test_create_task_rejects_nonexistent_order(db: AsyncSession):
    """Cannot assign task for non-existent order."""
    request = TaskCreateRequest(
        order_id=uuid.uuid4(),
        assigned_to=TAILOR_A_ID,
    )
    with pytest.raises(ValueError, match="Không tìm thấy đơn hàng"):
        await tailor_task_service.create_task(db, request, OWNER_ID, TENANT_ID)


# ── list_all_tasks tests ──────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def seed_owner_tasks(db: AsyncSession):
    """Seed tasks for list_all_tasks testing.

    Note: Use naive datetimes because SQLite strips timezone info.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    tasks = [
        TailorTaskDB(
            tenant_id=TENANT_ID, order_id=ORDER_ID,
            assigned_to=TAILOR_A_ID, assigned_by=OWNER_ID,
            garment_name="Áo 1", customer_name="KH 1",
            status="assigned", deadline=now + timedelta(days=5),
        ),
        TailorTaskDB(
            tenant_id=TENANT_ID, order_id=ORDER_ID,
            assigned_to=TAILOR_B_ID, assigned_by=OWNER_ID,
            garment_name="Áo 2", customer_name="KH 2",
            status="in_progress", deadline=now - timedelta(days=1),
        ),
        TailorTaskDB(
            tenant_id=TENANT_ID, order_id=ORDER_ID,
            assigned_to=TAILOR_A_ID, assigned_by=OWNER_ID,
            garment_name="Áo 3", customer_name="KH 3",
            status="completed",
        ),
    ]
    db.add_all(tasks)
    await db.flush()
    return tasks


@pytest.mark.asyncio
async def test_list_all_tasks_returns_all_tailors(db: AsyncSession, seed_owner_tasks):
    """Owner sees tasks across all tailors."""
    result = await tailor_task_service.list_all_tasks(db, TENANT_ID)
    assert result.summary.total == 3
    assignee_ids = {t.assigned_to for t in result.tasks}
    assert str(TAILOR_A_ID) in assignee_ids
    assert str(TAILOR_B_ID) in assignee_ids


@pytest.mark.asyncio
async def test_list_all_tasks_filter_by_tailor(db: AsyncSession, seed_owner_tasks):
    """Filter tasks by specific tailor."""
    result = await tailor_task_service.list_all_tasks(
        db, TENANT_ID, assigned_to=TAILOR_A_ID
    )
    assert len(result.tasks) == 2
    assert all(t.assigned_to == str(TAILOR_A_ID) for t in result.tasks)
    # Summary still reflects all tasks (unfiltered)
    assert result.summary.total == 3


@pytest.mark.asyncio
async def test_list_all_tasks_filter_by_status(db: AsyncSession, seed_owner_tasks):
    """Filter tasks by status."""
    result = await tailor_task_service.list_all_tasks(
        db, TENANT_ID, status_filter="assigned"
    )
    assert len(result.tasks) == 1
    assert result.tasks[0].status == "assigned"


@pytest.mark.asyncio
async def test_list_all_tasks_includes_assignee_name(db: AsyncSession, seed_owner_tasks):
    """Each task includes the assignee's name."""
    result = await tailor_task_service.list_all_tasks(db, TENANT_ID)
    names = {t.assignee_name for t in result.tasks}
    assert "Thợ may A" in names
    assert "Thợ may B" in names


# ── update_task tests ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_update_task_notes_and_piece_rate(db: AsyncSession, seed_owner_tasks):
    """Owner can update task notes and piece_rate."""
    task = seed_owner_tasks[0]
    request = TaskUpdateRequest(notes="Ghi chú mới", piece_rate=300000)
    result, reassigned = await tailor_task_service.update_task(
        db, task.id, request, OWNER_ID, TENANT_ID
    )
    assert not reassigned
    assert result.notes == "Ghi chú mới"
    assert result.piece_rate == 300000.0


@pytest.mark.asyncio
async def test_update_task_reassign(db: AsyncSession, seed_owner_tasks):
    """Owner can reassign task to different tailor."""
    task = seed_owner_tasks[0]  # currently assigned to TAILOR_A
    request = TaskUpdateRequest(assigned_to=TAILOR_B_ID)
    result, reassigned = await tailor_task_service.update_task(
        db, task.id, request, OWNER_ID, TENANT_ID
    )
    assert reassigned is True
    assert result.assigned_to == str(TAILOR_B_ID)
    assert result.assignee_name == "Thợ may B"


@pytest.mark.asyncio
async def test_update_task_not_found(db: AsyncSession):
    """Reject update for non-existent task."""
    request = TaskUpdateRequest(notes="test")
    with pytest.raises(ValueError, match="Không tìm thấy"):
        await tailor_task_service.update_task(
            db, uuid.uuid4(), request, OWNER_ID, TENANT_ID
        )


# ── delete_task tests ──────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_task_assigned_status(db: AsyncSession, seed_owner_tasks):
    """Owner can delete task in 'assigned' status."""
    task = seed_owner_tasks[0]  # status=assigned
    result = await tailor_task_service.delete_task(db, task.id, TENANT_ID)
    assert result is True


@pytest.mark.asyncio
async def test_delete_task_rejects_in_progress(db: AsyncSession, seed_owner_tasks):
    """Cannot delete task that is in_progress."""
    task = seed_owner_tasks[1]  # status=in_progress
    with pytest.raises(ValueError, match="chưa bắt đầu"):
        await tailor_task_service.delete_task(db, task.id, TENANT_ID)


@pytest.mark.asyncio
async def test_delete_task_rejects_completed(db: AsyncSession, seed_owner_tasks):
    """Cannot delete completed task."""
    task = seed_owner_tasks[2]  # status=completed
    with pytest.raises(ValueError, match="chưa bắt đầu"):
        await tailor_task_service.delete_task(db, task.id, TENANT_ID)
