"""Tests for Story 12.2: State machine transitions, stage lifecycle, matching scores.

Covers:
- All valid state transitions (happy paths)
- All invalid state transitions (expect 400)
- Optimistic locking conflict (expect 409)
- Stage sequential enforcement
- Matching score calculation
- Task history audit trail
- Reject flow (assigned → rejected → unassigned)
- QC workflow (submit, pass, fail-rework, fail-reassign, fail-terminal)
- Reassign chain transitions
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import (
    Base,
    OrderDB,
    TailorTaskDB,
    TaskHistoryDB,
    TaskStageLogDB,
    TenantDB,
    UserDB,
)
from src.models.tailor_task import (
    QCResultRequest,
    TaskAcceptRequest,
    TaskHoldRequest,
    TaskReassignRequest,
    TaskRejectRequest,
    TaskResumeRequest,
    TaskStartRequest,
)
from src.services import tailor_task_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.uuid4()
TAILOR_ID = uuid.uuid4()
TAILOR2_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
CUSTOMER_ID = uuid.uuid4()
ORDER_ID = uuid.uuid4()


@pytest_asyncio.fixture
async def engine():
    eng = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with eng.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield eng
    await eng.dispose()


@pytest_asyncio.fixture
async def db(engine):
    session_factory = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
        session.add(tenant)

        owner = UserDB(id=OWNER_ID, email="owner@test.com", role="Owner", tenant_id=TENANT_ID, full_name="Owner Nguyen")
        tailor = UserDB(id=TAILOR_ID, email="tailor@test.com", role="Tailor", tenant_id=TENANT_ID, full_name="Tailor Tran")
        tailor2 = UserDB(id=TAILOR2_ID, email="tailor2@test.com", role="Tailor", tenant_id=TENANT_ID, full_name="Tailor Le")
        customer = UserDB(id=CUSTOMER_ID, email="customer@test.com", role="Customer", tenant_id=TENANT_ID)
        session.add_all([owner, tailor, tailor2, customer])

        order = OrderDB(
            id=ORDER_ID,
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            customer_name="Nguyen Van A",
            customer_phone="0901234567",
            shipping_address={},
            subtotal_amount=Decimal("500000"),
            total_amount=Decimal("500000"),
            status="confirmed",
            # Story 12.6: only bespoke orders get the "fitting" stage
            service_type="bespoke",
        )
        session.add(order)
        await session.flush()
        yield session


def _make_task(
    status="assigned",
    assigned_to=TAILOR_ID,
    **kwargs,
) -> TailorTaskDB:
    return TailorTaskDB(
        id=kwargs.pop("task_id", uuid.uuid4()),
        tenant_id=TENANT_ID,
        order_id=ORDER_ID,
        assigned_to=assigned_to,
        assigned_by=OWNER_ID,
        garment_name="Ao dai",
        customer_name="Nguyen Van A",
        status=status,
        version=kwargs.pop("version", 1),
        **kwargs,
    )


# ── Transition validation tests ────────────────────────────────────────────


class TestValidTransitions:
    @pytest.mark.asyncio
    async def test_accept_task_assigned_to_accepted(self, db):
        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
        )
        assert result.status == "accepted"
        assert result.accepted_at is not None
        assert result.expected_finish_at is not None

    @pytest.mark.asyncio
    async def test_reject_task_assigned_to_unassigned(self, db):
        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.reject_task(
            db, task.id, TAILOR_ID, TENANT_ID,
            TaskRejectRequest(rejection_reason="Too busy right now", rejection_category="overloaded"),
        )
        assert result.status == "unassigned"
        assert result.assigned_to is None
        assert result.rejection_reason == "Too busy right now"
        assert result.rejection_category == "overloaded"

    @pytest.mark.asyncio
    async def test_start_task_accepted_to_in_progress(self, db):
        task = _make_task(status="accepted")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.start_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest()
        )
        assert result.status == "in_progress"
        assert result.started_at is not None

    @pytest.mark.asyncio
    async def test_hold_task_in_progress_to_on_hold(self, db):
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.hold_task(
            db, task.id, TAILOR_ID, TENANT_ID,
            TaskHoldRequest(hold_reason="Waiting for fabric"),
        )
        assert result.status == "on_hold"
        assert result.hold_reason == "Waiting for fabric"
        assert result.on_hold_at is not None

    @pytest.mark.asyncio
    async def test_resume_task_on_hold_to_in_progress(self, db):
        now = datetime.now(timezone.utc)
        task = _make_task(
            status="on_hold",
            on_hold_at=now - timedelta(hours=2),
            expected_finish_at=now + timedelta(days=5),
        )
        db.add(task)
        await db.flush()

        result = await tailor_task_service.resume_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskResumeRequest()
        )
        assert result.status == "in_progress"
        assert result.resumed_at is not None


# ── Invalid transition tests ────────────────────────────────────────────────


class TestInvalidTransitions:
    @pytest.mark.asyncio
    async def test_cannot_accept_non_assigned_task(self, db):
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.accept_task(
                db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_start_non_accepted_task(self, db):
        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.start_task(
                db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest()
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_hold_non_in_progress_task(self, db):
        task = _make_task(status="accepted")
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.hold_task(
                db, task.id, TAILOR_ID, TENANT_ID,
                TaskHoldRequest(hold_reason="Testing invalid"),
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_wrong_tailor_cannot_accept(self, db):
        task = _make_task(status="assigned", assigned_to=TAILOR_ID)
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.accept_task(
                db, task.id, TAILOR2_ID, TENANT_ID, TaskAcceptRequest()
            )
        assert exc_info.value.status_code == 403


# ── QC workflow tests ───────────────────────────────────────────────────────


class TestQCWorkflow:
    @pytest.mark.asyncio
    async def test_submit_qc_requires_in_progress(self, db):
        task = _make_task(status="accepted")
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.submit_for_qc(db, task.id, TAILOR_ID, TENANT_ID)
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_submit_qc_requires_all_stages_completed(self, db):
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        stage = TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID, stage="cutting",
            stage_order=0, status="in_progress",
        )
        db.add(stage)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.submit_for_qc(db, task.id, TAILOR_ID, TENANT_ID)
        assert exc_info.value.status_code == 400
        assert "chưa hoàn thành" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_submit_qc_success_no_stages(self, db):
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.submit_for_qc(db, task.id, TAILOR_ID, TENANT_ID)
        assert result.status == "submitted_for_qc"
        assert result.submitted_at is not None

    @pytest.mark.asyncio
    async def test_qc_pass_completes_task(self, db):
        task = _make_task(status="submitted_for_qc")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID,
            QCResultRequest(result="pass"),
        )
        assert result.status == "completed"
        assert result.completed_at is not None

    @pytest.mark.asyncio
    async def test_qc_fail_rework(self, db):
        task = _make_task(status="submitted_for_qc")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID,
            QCResultRequest(result="fail", action_on_fail="rework", qc_issues="Stitching uneven"),
        )
        assert result.status == "in_progress"
        assert result.is_rework is True
        assert result.rework_count == 1
        assert result.qc_issues == "Stitching uneven"

    @pytest.mark.asyncio
    async def test_qc_fail_reassign(self, db):
        task = _make_task(status="submitted_for_qc")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID,
            QCResultRequest(result="fail", action_on_fail="reassign", qc_issues="Major defects"),
        )
        assert result.status == "unassigned"
        assert result.assigned_to is None

    @pytest.mark.asyncio
    async def test_qc_fail_terminal(self, db):
        task = _make_task(status="submitted_for_qc")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID,
            QCResultRequest(result="fail", action_on_fail="fail", qc_issues="Irreparable damage"),
        )
        assert result.status == "failed_qc"
        assert result.qc_issues == "Irreparable damage"


# ── Reassign tests ──────────────────────────────────────────────────────────


class TestReassign:
    @pytest.mark.asyncio
    async def test_reassign_from_in_progress(self, db):
        task = _make_task(status="in_progress", assigned_to=TAILOR_ID)
        db.add(task)
        await db.flush()

        result = await tailor_task_service.reassign_task(
            db, task.id, OWNER_ID, TENANT_ID,
            TaskReassignRequest(new_tailor_id=TAILOR2_ID, reassignment_reason="Better match"),
        )
        assert result.status == "assigned"
        assert result.assigned_to == str(TAILOR2_ID)
        assert result.reassignment_reason == "Better match"
        assert result.assignment_deadline_at is not None

    @pytest.mark.asyncio
    async def test_cannot_reassign_to_same_tailor(self, db):
        task = _make_task(status="in_progress", assigned_to=TAILOR_ID)
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.reassign_task(
                db, task.id, OWNER_ID, TENANT_ID,
                TaskReassignRequest(new_tailor_id=TAILOR_ID, reassignment_reason="Same tailor"),
            )
        assert exc_info.value.status_code == 400

    @pytest.mark.asyncio
    async def test_cannot_reassign_completed_task(self, db):
        task = _make_task(status="completed")
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.reassign_task(
                db, task.id, OWNER_ID, TENANT_ID,
                TaskReassignRequest(new_tailor_id=TAILOR2_ID, reassignment_reason="Too late"),
            )
        assert exc_info.value.status_code == 400


# ── Stage lifecycle tests ───────────────────────────────────────────────────


class TestStageLifecycle:
    @pytest.mark.asyncio
    async def test_start_task_creates_stages(self, db):
        from sqlalchemy import select

        task = _make_task(status="accepted")
        db.add(task)
        await db.flush()

        await tailor_task_service.start_task(db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest())

        result = await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == task.id)
            .order_by(TaskStageLogDB.stage_order)
        )
        stages = result.scalars().all()
        # Story 12.6: ao_dai stage set gained "fitting" after "assembly" → 7 stages
        assert len(stages) == 7
        assert stages[0].stage == "cutting"
        assert stages[0].status == "in_progress"
        assert stages[1].status == "pending"
        assert stages[4].stage == "fitting"

    @pytest.mark.asyncio
    async def test_complete_stage_sequential(self, db):
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        for i, stage_name in enumerate(["cutting", "body_sewing", "sleeve_sewing", "assembly", "finishing"]):
            stage = TaskStageLogDB(
                task_id=task.id, tenant_id=TENANT_ID,
                stage=stage_name, stage_order=i,
                status="in_progress" if i == 0 else "pending",
                started_at=datetime.now(timezone.utc) if i == 0 else None,
            )
            db.add(stage)
        await db.flush()

        result = await tailor_task_service.complete_stage(db, task.id, 0, TAILOR_ID, TENANT_ID)
        assert result["stage_completed"] == "cutting"
        assert result["next_stage"] == "body_sewing"
        assert result["progress_percent"] == 20.0

    @pytest.mark.asyncio
    async def test_cannot_skip_stages(self, db):
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        stage0 = TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID,
            stage="cutting", stage_order=0, status="in_progress",
            started_at=datetime.now(timezone.utc),
        )
        stage1 = TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID,
            stage="body_sewing", stage_order=1, status="pending",
        )
        db.add_all([stage0, stage1])
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.complete_stage(db, task.id, 1, TAILOR_ID, TENANT_ID)
        assert exc_info.value.status_code == 400
        assert "bước 0" in exc_info.value.detail


# ── Task history tests ──────────────────────────────────────────────────────


class TestTaskHistory:
    @pytest.mark.asyncio
    async def test_accept_creates_history_record(self, db):
        from sqlalchemy import select

        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
        )

        result = await db.execute(
            select(TaskHistoryDB).where(TaskHistoryDB.task_id == task.id)
        )
        records = result.scalars().all()
        assert len(records) >= 1
        assert records[0].from_status == "assigned"
        assert records[0].to_status == "accepted"
        assert records[0].actor_id == TAILOR_ID

    @pytest.mark.asyncio
    async def test_reject_creates_two_history_records(self, db):
        from sqlalchemy import select

        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        await tailor_task_service.reject_task(
            db, task.id, TAILOR_ID, TENANT_ID,
            TaskRejectRequest(rejection_reason="Cannot do this", rejection_category="overloaded"),
        )

        result = await db.execute(
            select(TaskHistoryDB)
            .where(TaskHistoryDB.task_id == task.id)
            .order_by(TaskHistoryDB.created_at)
        )
        records = result.scalars().all()
        assert len(records) == 2
        assert records[0].from_status == "assigned"
        assert records[0].to_status == "rejected"
        assert records[1].from_status == "rejected"
        assert records[1].to_status == "unassigned"

    @pytest.mark.asyncio
    async def test_get_task_history(self, db):
        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
        )

        history = await tailor_task_service.get_task_history(db, task.id, TENANT_ID)
        assert len(history) >= 1
        assert history[0].from_status == "assigned"
        assert history[0].to_status == "accepted"


# ── Matching score tests ────────────────────────────────────────────────────


class TestMatchingScores:
    @pytest.mark.asyncio
    async def test_matching_scores_returns_all_tailors(self, db):
        scores = await tailor_task_service.get_matching_scores(db, ORDER_ID, TENANT_ID)
        assert len(scores) == 2
        assert all(s.score >= 0 for s in scores)
        assert all(s.score <= 100 for s in scores)

    @pytest.mark.asyncio
    async def test_matching_scores_sorted_descending(self, db):
        scores = await tailor_task_service.get_matching_scores(db, ORDER_ID, TENANT_ID)
        for i in range(len(scores) - 1):
            assert scores[i].score >= scores[i + 1].score

    @pytest.mark.asyncio
    async def test_busy_tailor_gets_lower_workload_score(self, db):
        for i in range(5):
            task = TailorTaskDB(
                tenant_id=TENANT_ID, order_id=ORDER_ID,
                assigned_to=TAILOR_ID, assigned_by=OWNER_ID,
                garment_name=f"Task {i}", customer_name="Test",
                status="in_progress",
            )
            db.add(task)
        await db.flush()

        scores = await tailor_task_service.get_matching_scores(db, ORDER_ID, TENANT_ID)
        tailor1_score = next(s for s in scores if s.tailor_id == str(TAILOR_ID))
        tailor2_score = next(s for s in scores if s.tailor_id == str(TAILOR2_ID))
        assert tailor2_score.score > tailor1_score.score


# ── Optimistic locking test ─────────────────────────────────────────────────


class TestOptimisticLocking:
    @pytest.mark.asyncio
    async def test_version_increments_on_transition(self, db):
        task = _make_task(status="assigned", version=1)
        db.add(task)
        await db.flush()

        result = await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
        )
        assert result.version == 2

    @pytest.mark.asyncio
    async def test_multiple_transitions_increment_version(self, db):
        """Verify version increments with each transition."""
        task = _make_task(status="assigned", version=1)
        db.add(task)
        await db.flush()

        # Accept: version 1 → 2
        result = await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
        )
        assert result.version == 2

        # Start: version 2 → 3
        result = await tailor_task_service.start_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest()
        )
        assert result.version == 3


# ── Full workflow integration test ──────────────────────────────────────────


class TestFullWorkflow:
    @pytest.mark.asyncio
    async def test_full_happy_path(self, db):
        """Test complete workflow: assigned → accepted → in_progress → submitted_for_qc → completed"""
        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        # Accept
        result = await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
        )
        assert result.status == "accepted"

        # Start
        result = await tailor_task_service.start_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest()
        )
        assert result.status == "in_progress"

        # Complete all stages
        from sqlalchemy import select
        stage_result = await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == task.id)
            .order_by(TaskStageLogDB.stage_order)
        )
        stages = stage_result.scalars().all()
        for stage in stages:
            # Story 12.6 (AC5): the fitting stage only completes after a
            # passed fitting round is recorded — seed one directly here.
            if stage.stage == "fitting":
                from src.models.db_models import FittingRoundDB

                db.add(FittingRoundDB(
                    tenant_id=TENANT_ID,
                    order_id=ORDER_ID,
                    task_id=task.id,
                    round_number=1,
                    outcome="passed",
                ))
                await db.flush()
            await tailor_task_service.complete_stage(
                db, task.id, stage.stage_order, TAILOR_ID, TENANT_ID
            )

        # Submit for QC
        result = await tailor_task_service.submit_for_qc(db, task.id, TAILOR_ID, TENANT_ID)
        assert result.status == "submitted_for_qc"

        # QC pass
        result = await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID,
            QCResultRequest(result="pass"),
        )
        assert result.status == "completed"
        assert result.completed_at is not None

        # Verify full history trail
        history = await tailor_task_service.get_task_history(db, task.id, TENANT_ID)
        transitions = [(h.from_status, h.to_status) for h in history]
        assert ("assigned", "accepted") in transitions
        assert ("accepted", "in_progress") in transitions
        assert ("in_progress", "submitted_for_qc") in transitions
        assert ("submitted_for_qc", "completed") in transitions


# ── Story 12.5 review fixes ─────────────────────────────────────────────────


class TestTaskDetailIncludesStagesAndHistory:
    @pytest.mark.asyncio
    async def test_get_task_detail_returns_stage_logs_and_history(self, db):
        """B1: detail view must include populated stage_logs and history."""
        task = _make_task(status="assigned")
        db.add(task)
        await db.flush()

        await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest()
        )
        await tailor_task_service.start_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest()
        )

        detail = await tailor_task_service.get_task_detail(db, task.id, TAILOR_ID, TENANT_ID)

        # Stage logs created by start_task ("Ao dai" → 7 stages since Story
        # 12.6 added "fitting" after "assembly", ordered)
        assert len(detail.stage_logs) == 7
        assert detail.stage_logs[0].stage == "cutting"
        assert detail.stage_logs[0].status == "in_progress"
        assert detail.stage_logs[0].started_at is not None
        assert [s.stage_order for s in detail.stage_logs] == list(range(7))

        # History contains both transitions
        transitions = [(h.from_status, h.to_status) for h in detail.history]
        assert ("assigned", "accepted") in transitions
        assert ("accepted", "in_progress") in transitions

        # B2: order info exposes pattern_session_id (None for this order)
        assert detail.order_info is not None
        assert detail.order_info.pattern_session_id is None


class TestClientVersionOptimisticLocking:
    @pytest.mark.asyncio
    async def test_stale_client_version_raises_409(self, db):
        """B3: stale client-known version must be rejected with 409."""
        task = _make_task(status="assigned", version=1)
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.accept_task(
                db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest(), client_version=999
            )
        assert exc_info.value.status_code == 409

    @pytest.mark.asyncio
    async def test_matching_client_version_succeeds(self, db):
        task = _make_task(status="assigned", version=1)
        db.add(task)
        await db.flush()

        result = await tailor_task_service.accept_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskAcceptRequest(), client_version=1
        )
        assert result.status == "accepted"
        assert result.version == 2

    @pytest.mark.asyncio
    async def test_stale_version_rejected_on_submit_qc(self, db):
        task = _make_task(status="in_progress", version=3)
        db.add(task)
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.submit_for_qc(
                db, task.id, TAILOR_ID, TENANT_ID, client_version=2
            )
        assert exc_info.value.status_code == 409


class TestSkippedStagesSubmitQC:
    @pytest.mark.asyncio
    async def test_submit_qc_succeeds_with_completed_and_skipped_mix(self, db):
        """B4: skipped stages must not block QC submission."""
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        now = datetime.now(timezone.utc)
        stage_specs = [
            ("cutting", 0, "completed"),
            ("body_sewing", 1, "completed"),
            ("embroidery", 2, "skipped"),
            ("finishing", 3, "completed"),
        ]
        for stage_name, order, stage_status in stage_specs:
            db.add(TaskStageLogDB(
                task_id=task.id, tenant_id=TENANT_ID,
                stage=stage_name, stage_order=order, status=stage_status,
                started_at=now if stage_status == "completed" else None,
                completed_at=now if stage_status == "completed" else None,
            ))
        await db.flush()

        result = await tailor_task_service.submit_for_qc(db, task.id, TAILOR_ID, TENANT_ID)
        assert result.status == "submitted_for_qc"
        assert result.submitted_at is not None

    @pytest.mark.asyncio
    async def test_submit_qc_still_blocked_by_pending_stage(self, db):
        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        db.add(TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID,
            stage="cutting", stage_order=0, status="skipped",
        ))
        db.add(TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID,
            stage="finishing", stage_order=1, status="pending",
        ))
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.submit_for_qc(db, task.id, TAILOR_ID, TENANT_ID)
        assert exc_info.value.status_code == 400
        assert "chưa hoàn thành" in exc_info.value.detail


class TestCompleteStageNotes:
    @pytest.mark.asyncio
    async def test_complete_stage_persists_notes(self, db):
        """B3: notes provided on completion are stored on the stage log row."""
        from sqlalchemy import select

        task = _make_task(status="in_progress")
        db.add(task)
        await db.flush()

        stage0 = TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID,
            stage="cutting", stage_order=0, status="in_progress",
            started_at=datetime.now(timezone.utc),
        )
        stage1 = TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID,
            stage="finishing", stage_order=1, status="pending",
        )
        db.add_all([stage0, stage1])
        await db.flush()

        result = await tailor_task_service.complete_stage(
            db, task.id, 0, TAILOR_ID, TENANT_ID, notes="Cắt xong, vải hơi co"
        )
        assert result["stage_completed"] == "cutting"

        row = await db.execute(
            select(TaskStageLogDB).where(
                TaskStageLogDB.task_id == task.id,
                TaskStageLogDB.stage_order == 0,
            )
        )
        stage = row.scalar_one()
        assert stage.status == "completed"
        assert stage.notes == "Cắt xong, vải hơi co"

    @pytest.mark.asyncio
    async def test_complete_stage_stale_version_raises_409(self, db):
        task = _make_task(status="in_progress", version=2)
        db.add(task)
        await db.flush()

        db.add(TaskStageLogDB(
            task_id=task.id, tenant_id=TENANT_ID,
            stage="cutting", stage_order=0, status="in_progress",
            started_at=datetime.now(timezone.utc),
        ))
        await db.flush()

        with pytest.raises(HTTPException) as exc_info:
            await tailor_task_service.complete_stage(
                db, task.id, 0, TAILOR_ID, TENANT_ID, client_version=1
            )
        assert exc_info.value.status_code == 409
