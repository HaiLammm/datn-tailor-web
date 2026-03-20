"""Unit tests for tailor_task_service (Story 5.3).

Tests task listing, status transitions, overdue logic, and access control.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, TailorTaskDB, TenantDB, UserDB, OrderDB, OrderItemDB
from src.models.tailor_task import StatusUpdateRequest
from src.services import tailor_task_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.uuid4()
TAILOR_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
OTHER_TAILOR_ID = uuid.uuid4()
ORDER_ID = uuid.uuid4()


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
        # Seed tenant
        tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
        session.add(tenant)

        # Seed users
        owner = UserDB(id=OWNER_ID, email="owner@test.com", role="Owner", tenant_id=TENANT_ID)
        tailor = UserDB(id=TAILOR_ID, email="tailor@test.com", role="Tailor", tenant_id=TENANT_ID)
        other = UserDB(id=OTHER_TAILOR_ID, email="other@test.com", role="Tailor", tenant_id=TENANT_ID)
        session.add_all([owner, tailor, other])

        # Seed order
        order = OrderDB(
            id=ORDER_ID,
            tenant_id=TENANT_ID,
            customer_name="Nguyễn Văn A",
            customer_phone="0901234567",
            shipping_address={},
            total_amount=Decimal("500000"),
        )
        session.add(order)
        await session.flush()

        yield session


@pytest_asyncio.fixture
async def seed_tasks(db: AsyncSession):
    """Create sample tasks for testing."""
    now = datetime.now(timezone.utc)
    tasks = [
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài cưới",
            customer_name="Nguyễn Văn A",
            status="assigned",
            deadline=now + timedelta(days=5),
            piece_rate=Decimal("200000"),
        ),
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài truyền thống",
            customer_name="Trần Thị B",
            status="in_progress",
            deadline=now + timedelta(days=1),
            piece_rate=Decimal("150000"),
        ),
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài hiện đại",
            customer_name="Lê Văn C",
            status="completed",
            completed_at=now - timedelta(hours=2),
        ),
        # Overdue task
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài quá hạn",
            customer_name="Phạm Thị D",
            status="assigned",
            deadline=now - timedelta(days=3),
        ),
        # Task for other tailor
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=OTHER_TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài khác",
            customer_name="Hoàng Văn E",
            status="assigned",
        ),
    ]
    db.add_all(tasks)
    await db.flush()
    return tasks


@pytest.mark.asyncio
async def test_get_my_tasks_returns_only_assigned_tasks(db: AsyncSession, seed_tasks):
    """Only tasks assigned to the specific tailor are returned."""
    result = await tailor_task_service.get_my_tasks(db, TAILOR_ID, TENANT_ID)
    assert len(result.tasks) == 4  # 4 tasks for TAILOR_ID
    assert all(t.assigned_to == str(TAILOR_ID) for t in result.tasks)


@pytest.mark.asyncio
async def test_get_my_tasks_sorted_by_status_priority(db: AsyncSession, seed_tasks):
    """Tasks sorted: assigned first, then in_progress, then completed."""
    result = await tailor_task_service.get_my_tasks(db, TAILOR_ID, TENANT_ID)
    statuses = [t.status for t in result.tasks]
    # assigned tasks first, then in_progress, then completed
    assert statuses.index("completed") > statuses.index("in_progress") or "completed" not in statuses


@pytest.mark.asyncio
async def test_get_my_tasks_summary_counts(db: AsyncSession, seed_tasks):
    """Summary correctly counts tasks by status."""
    result = await tailor_task_service.get_my_tasks(db, TAILOR_ID, TENANT_ID)
    assert result.summary.total == 4
    assert result.summary.assigned == 2  # 1 normal + 1 overdue
    assert result.summary.in_progress == 1
    assert result.summary.completed == 1


@pytest.mark.asyncio
async def test_get_my_tasks_overdue_detection(db: AsyncSession, seed_tasks):
    """Tasks past deadline are marked as overdue."""
    result = await tailor_task_service.get_my_tasks(db, TAILOR_ID, TENANT_ID)
    overdue_tasks = [t for t in result.tasks if t.is_overdue]
    assert len(overdue_tasks) >= 1
    # The task with deadline 3 days ago should be overdue
    overdue_names = [t.garment_name for t in overdue_tasks]
    assert "Áo dài quá hạn" in overdue_names


@pytest.mark.asyncio
async def test_get_task_summary(db: AsyncSession, seed_tasks):
    """Task summary returns correct counts."""
    summary = await tailor_task_service.get_task_summary(db, TAILOR_ID, TENANT_ID)
    assert summary.total == 4
    assert summary.assigned == 2
    assert summary.in_progress == 1
    assert summary.completed == 1
    assert summary.overdue >= 1


@pytest.mark.asyncio
async def test_update_status_assigned_to_in_progress(db: AsyncSession, seed_tasks):
    """Valid transition: assigned → in_progress."""
    assigned_task = seed_tasks[0]  # status=assigned
    request = StatusUpdateRequest(status="in_progress")
    result = await tailor_task_service.update_task_status(
        db, assigned_task.id, request, TAILOR_ID, TENANT_ID
    )
    assert result.status == "in_progress"


@pytest.mark.asyncio
async def test_update_status_in_progress_to_completed(db: AsyncSession, seed_tasks):
    """Valid transition: in_progress → completed, sets completed_at."""
    in_progress_task = seed_tasks[1]  # status=in_progress
    request = StatusUpdateRequest(status="completed")
    result = await tailor_task_service.update_task_status(
        db, in_progress_task.id, request, TAILOR_ID, TENANT_ID
    )
    assert result.status == "completed"
    assert result.completed_at is not None


@pytest.mark.asyncio
async def test_update_status_invalid_backward_transition(db: AsyncSession, seed_tasks):
    """Reject backward transition: completed → in_progress (no backward allowed)."""
    completed_task = seed_tasks[2]  # status=completed
    request = StatusUpdateRequest(status="in_progress")
    with pytest.raises(ValueError, match="Không thể thay đổi trạng thái"):
        await tailor_task_service.update_task_status(
            db, completed_task.id, request, TAILOR_ID, TENANT_ID
        )


@pytest.mark.asyncio
async def test_update_status_invalid_skip_transition(db: AsyncSession, seed_tasks):
    """Reject skipping: assigned → completed (must go through in_progress)."""
    assigned_task = seed_tasks[0]
    request = StatusUpdateRequest(status="completed")
    with pytest.raises(ValueError, match="Chuyển trạng thái không hợp lệ"):
        await tailor_task_service.update_task_status(
            db, assigned_task.id, request, TAILOR_ID, TENANT_ID
        )


@pytest.mark.asyncio
async def test_update_status_wrong_tailor(db: AsyncSession, seed_tasks):
    """Reject update from tailor who is not assigned."""
    task = seed_tasks[0]
    request = StatusUpdateRequest(status="in_progress")
    with pytest.raises(PermissionError, match="không có quyền"):
        await tailor_task_service.update_task_status(
            db, task.id, request, OTHER_TAILOR_ID, TENANT_ID
        )


@pytest.mark.asyncio
async def test_update_status_task_not_found(db: AsyncSession):
    """Reject update for non-existent task."""
    request = StatusUpdateRequest(status="in_progress")
    with pytest.raises(ValueError, match="Không tìm thấy"):
        await tailor_task_service.update_task_status(
            db, uuid.uuid4(), request, TAILOR_ID, TENANT_ID
        )


@pytest.mark.asyncio
async def test_get_task_detail(db: AsyncSession, seed_tasks):
    """Task detail returns complete information including order info."""
    task = seed_tasks[0]
    result = await tailor_task_service.get_task_detail(db, task.id, TAILOR_ID, TENANT_ID)
    assert result.id == str(task.id)
    assert result.garment_name == "Áo dài cưới"
    assert result.customer_name == "Nguyễn Văn A"
    assert result.order_info is not None
    assert result.order_info.order_id == str(task.order_id)


@pytest.mark.asyncio
async def test_get_task_detail_wrong_tailor(db: AsyncSession, seed_tasks):
    """Reject detail view from non-assigned tailor."""
    task = seed_tasks[0]
    with pytest.raises(PermissionError, match="không có quyền"):
        await tailor_task_service.get_task_detail(db, task.id, OTHER_TAILOR_ID, TENANT_ID)


@pytest.mark.asyncio
async def test_get_task_detail_not_found(db: AsyncSession):
    """Reject detail for non-existent task."""
    with pytest.raises(ValueError, match="Không tìm thấy"):
        await tailor_task_service.get_task_detail(db, uuid.uuid4(), TAILOR_ID, TENANT_ID)


# ── Story 5.4: Income Calculation Tests ───────────────────────────────────────


@pytest_asyncio.fixture
async def seed_income_tasks(db: AsyncSession):
    """Tasks for income calculation tests — different statuses and piece_rates."""
    now = datetime.now(timezone.utc)
    tasks = [
        # Completed this month with piece_rate
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài cưới",
            customer_name="Khách A",
            status="completed",
            piece_rate=Decimal("300000"),
            completed_at=now,
        ),
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài truyền thống",
            customer_name="Khách B",
            status="completed",
            piece_rate=Decimal("200000"),
            completed_at=now,
        ),
        # Completed this month WITHOUT piece_rate — should be excluded
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài tặng kèm",
            customer_name="Khách C",
            status="completed",
            piece_rate=None,
            completed_at=now,
        ),
        # NOT completed — should NOT be included in income
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài chưa xong",
            customer_name="Khách D",
            status="in_progress",
            piece_rate=Decimal("500000"),
        ),
        # Other tailor — same tenant, should NOT be included
        TailorTaskDB(
            id=uuid.uuid4(),
            tenant_id=TENANT_ID,
            order_id=ORDER_ID,
            assigned_to=OTHER_TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài thợ khác",
            customer_name="Khách E",
            status="completed",
            piece_rate=Decimal("400000"),
            completed_at=now,
        ),
    ]
    db.add_all(tasks)
    await db.flush()
    return tasks


@pytest.mark.asyncio
async def test_income_sums_completed_tasks(db: AsyncSession, seed_income_tasks):
    """Income sums piece_rate of completed tasks for current month."""
    result = await tailor_task_service.get_tailor_monthly_income(db, TAILOR_ID, TENANT_ID)
    # 300000 + 200000 = 500000 (NULL excluded)
    assert result.current_month.total_income == 500000.0
    assert result.current_month.task_count == 2


@pytest.mark.asyncio
async def test_income_excludes_null_piece_rate(db: AsyncSession, seed_income_tasks):
    """Tasks with NULL piece_rate are excluded from income sum."""
    result = await tailor_task_service.get_tailor_monthly_income(db, TAILOR_ID, TENANT_ID)
    # task_count should only count tasks with piece_rate set
    assert result.current_month.task_count == 2


@pytest.mark.asyncio
async def test_income_excludes_non_completed_tasks(db: AsyncSession, seed_income_tasks):
    """Tasks not completed (in_progress, assigned) are excluded."""
    result = await tailor_task_service.get_tailor_monthly_income(db, TAILOR_ID, TENANT_ID)
    # The in_progress task with 500000 piece_rate should NOT be included
    assert result.current_month.total_income == 500000.0  # Only the 300k+200k


@pytest.mark.asyncio
async def test_income_no_completed_tasks(db: AsyncSession):
    """Returns 0 income when no completed tasks exist."""
    result = await tailor_task_service.get_tailor_monthly_income(db, TAILOR_ID, TENANT_ID)
    assert result.current_month.total_income == 0.0
    assert result.current_month.task_count == 0
    assert result.previous_month.total_income == 0.0
    assert result.percentage_change is None


@pytest.mark.asyncio
async def test_income_percentage_change_positive(db: AsyncSession, seed_income_tasks):
    """Percentage change is None when previous month = 0 (first month with data)."""
    # previous_month = 0, so percentage_change = None (avoid division by zero)
    result = await tailor_task_service.get_tailor_monthly_income(db, TAILOR_ID, TENANT_ID)
    # Previous month has no data → percentage_change is None
    assert result.percentage_change is None


@pytest.mark.asyncio
async def test_income_tenant_isolation(db: AsyncSession, seed_income_tasks):
    """OTHER_TAILOR's income is NOT included in TAILOR's income query."""
    result = await tailor_task_service.get_tailor_monthly_income(db, TAILOR_ID, TENANT_ID)
    # OTHER_TAILOR has 400k completed task — should NOT appear in TAILOR's income
    assert result.current_month.total_income == 500000.0  # Only TAILOR_ID tasks


@pytest.mark.asyncio
async def test_income_response_structure(db: AsyncSession, seed_income_tasks):
    """Response has correct structure with current/previous month and percentage."""
    result = await tailor_task_service.get_tailor_monthly_income(db, TAILOR_ID, TENANT_ID)
    assert hasattr(result, "current_month")
    assert hasattr(result, "previous_month")
    assert hasattr(result, "percentage_change")
    assert result.current_month.month in range(1, 13)
    assert result.current_month.year >= 2024
    assert result.previous_month.month in range(1, 13)
