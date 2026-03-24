"""Unit tests for production sub-step transitions (Tailor Assignment Tracking).

Tests forward-only transitions, backward rejection, auto-status transitions,
and tenant isolation.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, TailorTaskDB, TenantDB, UserDB, OrderDB
from src.models.tailor_task import ProductionStepUpdateRequest
from src.services import tailor_task_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_A_ID = uuid.uuid4()
TENANT_B_ID = uuid.uuid4()
TAILOR_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
TAILOR_B_ID = uuid.uuid4()
ORDER_ID = uuid.uuid4()
ORDER_B_ID = uuid.uuid4()
TASK_ID = uuid.uuid4()
TASK_B_ID = uuid.uuid4()


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
        tenant_a = TenantDB(id=TENANT_A_ID, name="Shop A", slug="shop-a")
        tenant_b = TenantDB(id=TENANT_B_ID, name="Shop B", slug="shop-b")
        session.add_all([tenant_a, tenant_b])

        # Seed users
        owner = UserDB(id=OWNER_ID, email="owner@test.com", role="Owner", tenant_id=TENANT_A_ID)
        tailor = UserDB(id=TAILOR_ID, email="tailor@test.com", role="Tailor", tenant_id=TENANT_A_ID)
        tailor_b = UserDB(id=TAILOR_B_ID, email="tailorb@test.com", role="Tailor", tenant_id=TENANT_B_ID)
        session.add_all([owner, tailor, tailor_b])

        # Seed orders
        order_a = OrderDB(
            id=ORDER_ID,
            tenant_id=TENANT_A_ID,
            customer_name="Nguyễn Văn A",
            customer_phone="0901234567",
            shipping_address={},
            total_amount=Decimal("500000"),
        )
        order_b = OrderDB(
            id=ORDER_B_ID,
            tenant_id=TENANT_B_ID,
            customer_name="Trần Văn B",
            customer_phone="0909876543",
            shipping_address={},
            total_amount=Decimal("300000"),
        )
        session.add_all([order_a, order_b])

        # Seed tasks
        task_a = TailorTaskDB(
            id=TASK_ID,
            tenant_id=TENANT_A_ID,
            order_id=ORDER_ID,
            assigned_to=TAILOR_ID,
            assigned_by=OWNER_ID,
            garment_name="Áo dài cưới",
            customer_name="Nguyễn Văn A",
            status="assigned",
            production_step="pending",
        )
        task_b = TailorTaskDB(
            id=TASK_B_ID,
            tenant_id=TENANT_B_ID,
            order_id=ORDER_B_ID,
            assigned_to=TAILOR_B_ID,
            assigned_by=TAILOR_B_ID,
            garment_name="Vest nam",
            customer_name="Trần Văn B",
            status="assigned",
            production_step="pending",
        )
        session.add_all([task_a, task_b])
        await session.flush()

        yield session


# ── Forward-only transition tests ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_forward_transition_pending_to_cutting(db: AsyncSession):
    """Step from pending to cutting should succeed and auto-set status to in_progress."""
    request = ProductionStepUpdateRequest(production_step="cutting")
    result = await tailor_task_service.update_production_step(
        db, TASK_ID, request, TAILOR_ID, TENANT_A_ID
    )
    assert result.production_step == "cutting"
    assert result.status == "in_progress"


@pytest.mark.asyncio
async def test_forward_transition_full_sequence(db: AsyncSession):
    """Walk through the entire production step sequence."""
    steps = ["cutting", "sewing", "finishing", "quality_check", "done"]
    for step in steps:
        request = ProductionStepUpdateRequest(production_step=step)
        result = await tailor_task_service.update_production_step(
            db, TASK_ID, request, TAILOR_ID, TENANT_A_ID
        )
        assert result.production_step == step

    # After 'done', status should be 'completed' and completed_at set
    assert result.status == "completed"
    assert result.completed_at is not None


@pytest.mark.asyncio
async def test_skip_steps_forward_allowed(db: AsyncSession):
    """Skipping steps forward (e.g., pending → sewing) should be allowed."""
    request = ProductionStepUpdateRequest(production_step="sewing")
    result = await tailor_task_service.update_production_step(
        db, TASK_ID, request, TAILOR_ID, TENANT_A_ID
    )
    assert result.production_step == "sewing"
    assert result.status == "in_progress"


# ── Backward transition rejection tests ───────────────────────────────────────


@pytest.mark.asyncio
async def test_backward_transition_rejected(db: AsyncSession):
    """Moving backward (e.g., sewing → cutting) should raise ValueError."""
    # First move to sewing
    await tailor_task_service.update_production_step(
        db, TASK_ID,
        ProductionStepUpdateRequest(production_step="sewing"),
        TAILOR_ID, TENANT_A_ID,
    )
    # Try to go back to cutting
    with pytest.raises(ValueError, match="Chỉ được chuyển tiếp"):
        await tailor_task_service.update_production_step(
            db, TASK_ID,
            ProductionStepUpdateRequest(production_step="cutting"),
            TAILOR_ID, TENANT_A_ID,
        )


@pytest.mark.asyncio
async def test_same_step_rejected(db: AsyncSession):
    """Setting the same step should be rejected (not strictly forward)."""
    await tailor_task_service.update_production_step(
        db, TASK_ID,
        ProductionStepUpdateRequest(production_step="cutting"),
        TAILOR_ID, TENANT_A_ID,
    )
    with pytest.raises(ValueError, match="Chỉ được chuyển tiếp"):
        await tailor_task_service.update_production_step(
            db, TASK_ID,
            ProductionStepUpdateRequest(production_step="cutting"),
            TAILOR_ID, TENANT_A_ID,
        )


# ── Auto-status transition tests ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_auto_transition_assigned_to_in_progress(db: AsyncSession):
    """When step moves past 'pending', status should auto-transition to 'in_progress'."""
    request = ProductionStepUpdateRequest(production_step="cutting")
    result = await tailor_task_service.update_production_step(
        db, TASK_ID, request, TAILOR_ID, TENANT_A_ID
    )
    assert result.status == "in_progress"


@pytest.mark.asyncio
async def test_auto_completion_on_done(db: AsyncSession):
    """When step becomes 'done', task should auto-complete."""
    # Move through to done
    for step in ["cutting", "sewing", "finishing", "quality_check", "done"]:
        result = await tailor_task_service.update_production_step(
            db, TASK_ID,
            ProductionStepUpdateRequest(production_step=step),
            TAILOR_ID, TENANT_A_ID,
        )

    assert result.status == "completed"
    assert result.completed_at is not None


# ── Tenant isolation tests ────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_tenant_isolation_cross_tenant_rejected(db: AsyncSession):
    """Tailor from tenant A cannot update task from tenant B (returns not found)."""
    request = ProductionStepUpdateRequest(production_step="cutting")
    with pytest.raises(ValueError, match="Không tìm thấy"):
        await tailor_task_service.update_production_step(
            db, TASK_B_ID, request, TAILOR_ID, TENANT_A_ID
        )


@pytest.mark.asyncio
async def test_ownership_check_other_tailor_rejected(db: AsyncSession):
    """A different tailor in same tenant cannot update the task."""
    OTHER_TAILOR = uuid.uuid4()
    other_tailor = UserDB(id=OTHER_TAILOR, email="other@test.com", role="Tailor", tenant_id=TENANT_A_ID)
    db.add(other_tailor)
    await db.flush()

    request = ProductionStepUpdateRequest(production_step="cutting")
    with pytest.raises(PermissionError, match="không có quyền"):
        await tailor_task_service.update_production_step(
            db, TASK_ID, request, OTHER_TAILOR, TENANT_A_ID
        )


@pytest.mark.asyncio
async def test_owner_can_update_production_step(db: AsyncSession):
    """Owner (assigned_by) can update production step."""
    request = ProductionStepUpdateRequest(production_step="cutting")
    result = await tailor_task_service.update_production_step(
        db, TASK_ID, request, OWNER_ID, TENANT_A_ID
    )
    assert result.production_step == "cutting"


@pytest.mark.asyncio
async def test_task_not_found(db: AsyncSession):
    """Non-existent task ID should raise ValueError."""
    fake_id = uuid.uuid4()
    request = ProductionStepUpdateRequest(production_step="cutting")
    with pytest.raises(ValueError, match="Không tìm thấy"):
        await tailor_task_service.update_production_step(
            db, fake_id, request, TAILOR_ID, TENANT_A_ID
        )
