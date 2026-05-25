"""Tests for Story 12.3: Order-Task Lifecycle Integration & Task Info Enrichment."""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import (
    Base,
    OrderDB,
    TailorTaskDB,
    TaskStageLogDB,
    TenantDB,
    UserDB,
)
from src.models.tailor_task import QCResultRequest, TaskAcceptRequest
from src.services import tailor_task_service, order_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
TAILOR_ID = uuid.uuid4()
CUSTOMER_ID = uuid.uuid4()


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
        tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
        session.add(tenant)

        owner = UserDB(id=OWNER_ID, email="owner@test.com", role="Owner", tenant_id=TENANT_ID, full_name="Chủ tiệm")
        tailor = UserDB(id=TAILOR_ID, email="tailor@test.com", role="Tailor", tenant_id=TENANT_ID, full_name="Thợ May A")
        customer = UserDB(id=CUSTOMER_ID, email="customer@test.com", role="Customer", tenant_id=TENANT_ID)
        session.add_all([owner, tailor, customer])
        await session.flush()

        yield session


def _make_order(order_id=None, status="in_production", service_type="bespoke", **kwargs):
    return OrderDB(
        id=order_id or uuid.uuid4(),
        tenant_id=TENANT_ID,
        customer_id=CUSTOMER_ID,
        customer_name="Nguyễn Văn A",
        customer_phone="0901234567",
        shipping_address={},
        subtotal_amount=Decimal("1000000"),
        total_amount=Decimal("1000000"),
        status=status,
        service_type=service_type,
        **kwargs,
    )


def _make_task(order_id, status="submitted_for_qc", **kwargs):
    task_id = kwargs.pop("task_id", uuid.uuid4())
    assigned_to = kwargs.pop("assigned_to", TAILOR_ID)
    return TailorTaskDB(
        id=task_id,
        tenant_id=TENANT_ID,
        order_id=order_id,
        assigned_to=assigned_to,
        assigned_by=OWNER_ID,
        garment_name="Áo dài",
        customer_name="Nguyễn Văn A",
        status=status,
        version=1,
        **kwargs,
    )


# ── Test 7.1: QC pass → order transitions to ready_to_ship ──────────────────


@pytest.mark.asyncio
async def test_qc_pass_transitions_order_to_ready_to_ship(db: AsyncSession):
    order = _make_order(status="in_production")
    db.add(order)
    await db.flush()

    task = _make_task(order.id, status="submitted_for_qc")
    db.add(task)
    await db.flush()
    await db.commit()

    request = QCResultRequest(result="pass")
    await tailor_task_service.process_qc_result(db, task.id, OWNER_ID, TENANT_ID, request)

    await db.refresh(order)
    assert order.status == "ready_to_ship"


# ── Test 7.2: QC pass but order already past in_production → no double-transition


@pytest.mark.asyncio
async def test_qc_pass_no_double_transition(db: AsyncSession):
    order = _make_order(status="ready_to_ship")
    db.add(order)
    await db.flush()

    task = _make_task(order.id, status="submitted_for_qc")
    db.add(task)
    await db.flush()
    await db.commit()

    request = QCResultRequest(result="pass")
    await tailor_task_service.process_qc_result(db, task.id, OWNER_ID, TENANT_ID, request)

    await db.refresh(order)
    assert order.status == "ready_to_ship"


# ── Test 7.3: _all_tailor_tasks_completed with new statuses ─────────────────


@pytest.mark.asyncio
async def test_all_tasks_completed_excludes_non_blocking(db: AsyncSession):
    order = _make_order()
    db.add(order)
    await db.flush()

    # completed task
    t1 = _make_task(order.id, status="completed", task_id=uuid.uuid4())
    # non-blocking statuses
    t2 = _make_task(order.id, status="unassigned", task_id=uuid.uuid4(), assigned_to=None)
    t3 = _make_task(order.id, status="rejected", task_id=uuid.uuid4())
    t4 = _make_task(order.id, status="reassigning", task_id=uuid.uuid4())
    t5 = _make_task(order.id, status="cancelled", task_id=uuid.uuid4())
    db.add_all([t1, t2, t3, t4, t5])
    await db.flush()
    await db.commit()

    result = await order_service._all_tailor_tasks_completed(db, order.id)
    assert result is True


@pytest.mark.asyncio
async def test_failed_qc_blocks_completion(db: AsyncSession):
    order = _make_order()
    db.add(order)
    await db.flush()

    t1 = _make_task(order.id, status="completed", task_id=uuid.uuid4())
    t2 = _make_task(order.id, status="failed_qc", task_id=uuid.uuid4())
    db.add_all([t1, t2])
    await db.flush()
    await db.commit()

    result = await order_service._all_tailor_tasks_completed(db, order.id)
    assert result is False


# ── Test 7.4: tailor_task_info enrichment ─────────────────────────────────────


@pytest.mark.asyncio
async def test_build_tailor_task_info_enrichment(db: AsyncSession):
    order = _make_order()
    db.add(order)
    await db.flush()

    task = _make_task(order.id, status="in_progress", task_id=uuid.uuid4())
    db.add(task)
    await db.flush()

    s1 = TaskStageLogDB(
        task_id=task.id, tenant_id=TENANT_ID,
        stage="cutting", stage_order=1, status="completed",
    )
    s2 = TaskStageLogDB(
        task_id=task.id, tenant_id=TENANT_ID,
        stage="sewing", stage_order=2, status="in_progress",
    )
    s3 = TaskStageLogDB(
        task_id=task.id, tenant_id=TENANT_ID,
        stage="finishing", stage_order=3, status="pending",
    )
    db.add_all([s1, s2, s3])
    await db.flush()
    await db.commit()

    # Re-fetch with eager loads
    from sqlalchemy.orm import selectinload
    from sqlalchemy import select as sa_select
    result = await db.execute(
        sa_select(TailorTaskDB)
        .options(selectinload(TailorTaskDB.assignee), selectinload(TailorTaskDB.stage_logs))
        .where(TailorTaskDB.id == task.id)
    )
    loaded_task = result.scalar_one()

    from src.services.order_service import _build_tailor_task_info
    brief = _build_tailor_task_info(loaded_task)
    assert brief.progress_percent == pytest.approx(33.3, abs=0.1)
    assert brief.current_stage == "sewing"
    assert brief.is_rework is False
    assert brief.rework_count == 0
    assert brief.tailor_name == "Thợ May A"

    detail = _build_tailor_task_info(loaded_task, detail=True)
    assert detail.stage_logs is not None
    assert len(detail.stage_logs) == 3
    assert detail.stage_logs[0].stage == "cutting"
    assert detail.stage_logs[0].status == "completed"


# ── Test 7.5: accept_task sets preparation_step = "cutting" ──────────────────


@pytest.mark.asyncio
async def test_accept_task_sets_preparation_step(db: AsyncSession):
    order = _make_order(status="confirmed", service_type="bespoke")
    db.add(order)
    await db.flush()

    task = _make_task(order.id, status="assigned")
    db.add(task)
    await db.flush()
    await db.commit()

    request = TaskAcceptRequest()
    await tailor_task_service.accept_task(db, task.id, TAILOR_ID, TENANT_ID, request)

    await db.refresh(order)
    assert order.status == "in_production"
    assert order.preparation_step == "cutting"
