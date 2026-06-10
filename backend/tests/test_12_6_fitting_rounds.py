"""Tests for Story 12.6: Fitting Rounds & Alteration Loop (SCP 2026-06-10).

Covers:
- AC1: migration ↔ ORM consistency (Base.metadata vs 044 SQL)
- AC2: GARMENT_STAGES gained 'fitting' after 'assembly' in all 3 sets
- AC3: customer invite notification when the fitting stage starts
- AC4: record_fitting_round happy paths (both outcomes) + validations
- AC5: complete_stage gate on the fitting stage
- AC6: list_fitting_rounds authorization matrix + ordering
- round_number auto-increment (server-side)
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import UniqueConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import (
    Base,
    FittingRoundDB,
    NotificationDB,
    OrderDB,
    TailorTaskDB,
    TaskHistoryDB,
    TaskStageLogDB,
    TenantDB,
    UserDB,
)
from src.models.fitting import FittingRoundCreate
from src.models.notification import NotificationResponse, NotificationType
from src.models.tailor_task import QCResultRequest, TaskStartRequest
from src.services import fitting_service, tailor_task_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
TAILOR_ID = uuid.uuid4()
OTHER_TAILOR_ID = uuid.uuid4()
CUSTOMER_ID = uuid.uuid4()
OTHER_CUSTOMER_ID = uuid.uuid4()
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
        other_tailor = UserDB(id=OTHER_TAILOR_ID, email="tailor2@test.com", role="Tailor", tenant_id=TENANT_ID, full_name="Tailor Le")
        customer = UserDB(id=CUSTOMER_ID, email="customer@test.com", role="Customer", tenant_id=TENANT_ID)
        other_customer = UserDB(id=OTHER_CUSTOMER_ID, email="customer2@test.com", role="Customer", tenant_id=TENANT_ID)
        session.add_all([owner, tailor, other_tailor, customer, other_customer])

        order = OrderDB(
            id=ORDER_ID,
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            customer_name="Nguyen Van A",
            customer_phone="0901234567",
            shipping_address={},
            subtotal_amount=Decimal("500000"),
            total_amount=Decimal("500000"),
            status="in_production",
            service_type="bespoke",
        )
        session.add(order)
        await session.flush()
        yield session


def _make_task(order_id=ORDER_ID, status="in_progress", assigned_to=TAILOR_ID) -> TailorTaskDB:
    return TailorTaskDB(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        order_id=order_id,
        assigned_to=assigned_to,
        assigned_by=OWNER_ID,
        garment_name="Áo dài lụa",
        customer_name="Nguyen Van A",
        status=status,
        version=1,
    )


def _add_stage_logs(db, task_id, current_stage: str, stages=None) -> None:
    """Create stage logs with everything before `current_stage` completed."""
    stages = stages or tailor_task_service.GARMENT_STAGES["ao_dai"]
    current_idx = stages.index(current_stage)
    now = datetime.now(timezone.utc)
    for i, name in enumerate(stages):
        if i < current_idx:
            status = "completed"
        elif i == current_idx:
            status = "in_progress"
        else:
            status = "pending"
        db.add(TaskStageLogDB(
            task_id=task_id, tenant_id=TENANT_ID,
            stage=name, stage_order=i, status=status,
            started_at=now if i <= current_idx else None,
            completed_at=now if i < current_idx else None,
            # Explicit: rounds seeded afterwards (flush-time default) belong
            # to this cycle for the cycle-scoped fitting gate.
            created_at=now,
        ))


async def _get_user(db, user_id) -> UserDB:
    return (await db.execute(select(UserDB).where(UserDB.id == user_id))).scalar_one()


class _NotificationSpy:
    def __init__(self):
        self.calls = []

    async def __call__(self, **kwargs):
        self.calls.append(kwargs)


@pytest.fixture
def notify_spy(monkeypatch):
    """Capture create_notification calls in both service namespaces."""
    spy = _NotificationSpy()
    monkeypatch.setattr(fitting_service, "create_notification", spy)
    monkeypatch.setattr(tailor_task_service, "create_notification", spy)
    return spy


# ── AC1: migration ↔ ORM consistency ─────────────────────────────────────────


class TestMigrationOrmConsistency:
    EXPECTED_COLUMNS = {
        "id", "tenant_id", "order_id", "task_id", "round_number",
        "appointment_id", "outcome", "notes", "fitted_at", "created_at",
    }

    def test_orm_model_columns(self):
        assert set(FittingRoundDB.__table__.columns.keys()) == self.EXPECTED_COLUMNS

    def test_migration_044_contains_all_columns_and_indexes(self):
        sql = (
            Path(__file__).resolve().parents[1] / "migrations" / "044_add_fitting_rounds.sql"
        ).read_text(encoding="utf-8")
        assert "CREATE TABLE IF NOT EXISTS fitting_rounds" in sql
        for col in self.EXPECTED_COLUMNS:
            assert col in sql, f"Migration 044 missing column: {col}"
        assert "outcome IN ('passed', 'needs_alteration')" in sql
        for idx_col in ("order_id", "task_id", "tenant_id"):
            assert f"idx_fitting_rounds_{idx_col}" in sql

    def test_appointment_id_has_no_fk(self):
        # appointments are guest-booked and unlinked — informational only
        assert not FittingRoundDB.__table__.columns["appointment_id"].foreign_keys

    def test_round_number_unique_per_order_in_migration_and_orm(self):
        # round_number is computed as count+1 per ORDER under the task lock —
        # UNIQUE (order_id, round_number) is the DB-level backstop.
        sql = (
            Path(__file__).resolve().parents[1] / "migrations" / "044_add_fitting_rounds.sql"
        ).read_text(encoding="utf-8")
        assert "UNIQUE (order_id, round_number)" in sql
        uniques = [
            c for c in FittingRoundDB.__table__.constraints
            if isinstance(c, UniqueConstraint)
        ]
        assert any(
            {col.name for col in c.columns} == {"order_id", "round_number"}
            and c.name == "uq_fitting_round_order_number"
            for c in uniques
        )

    def test_migration_044_notification_check_covers_all_sent_types(self):
        # Migration 016's CHECK only allowed the original five types; 044
        # re-creates it with the full union of every type the codebase sends.
        sql = (
            Path(__file__).resolve().parents[1] / "migrations" / "044_add_fitting_rounds.sql"
        ).read_text(encoding="utf-8")
        assert "DROP CONSTRAINT IF EXISTS chk_notification_type" in sql
        for notification_type in NotificationType:
            assert f"'{notification_type.value}'" in sql, (
                f"Migration 044 CHECK missing notification type: {notification_type.value}"
            )


# ── AC2: GARMENT_STAGES gained fitting after assembly ────────────────────────


class TestGarmentStages:
    @pytest.mark.parametrize("stage_key", ["default", "ao_dai", "wedding"])
    def test_fitting_inserted_after_assembly(self, stage_key):
        stages = tailor_task_service.GARMENT_STAGES[stage_key]
        assert "fitting" in stages
        assert stages.index("fitting") == stages.index("assembly") + 1


# ── AC3: invite notification when fitting stage starts ───────────────────────


class TestFittingInviteNotification:
    @pytest.mark.asyncio
    async def test_completing_assembly_starts_fitting_and_notifies_customer(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="assembly")
        await db.flush()

        result = await tailor_task_service.complete_stage(
            db, task.id, 3, TAILOR_ID, TENANT_ID  # assembly is stage_order 3
        )
        assert result["next_stage"] == "fitting"

        fitting_calls = [c for c in notify_spy.calls if c["notification_type"] == "fitting_ready"]
        assert len(fitting_calls) == 1
        call = fitting_calls[0]
        assert call["user_id"] == CUSTOMER_ID
        assert call["title"] == "Mời bạn tới thử đồ"
        assert "Áo dài lụa" in call["message"]
        assert call["data"]["order_id"] == str(ORDER_ID)
        assert call["data"]["booking_url"] == "/booking"

    @pytest.mark.asyncio
    async def test_no_customer_linked_skips_silently(self, db, notify_spy):
        order = OrderDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, customer_id=None,
            customer_name="Guest", customer_phone="0900000000",
            shipping_address={}, subtotal_amount=Decimal("1"), total_amount=Decimal("1"),
            status="in_production", service_type="bespoke",
        )
        db.add(order)
        task = _make_task(order_id=order.id)
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="assembly")
        await db.flush()

        result = await tailor_task_service.complete_stage(db, task.id, 3, TAILOR_ID, TENANT_ID)
        assert result["next_stage"] == "fitting"
        assert all(c["notification_type"] != "fitting_ready" for c in notify_spy.calls)


# ── AC4: record_fitting_round ─────────────────────────────────────────────────


class TestRecordFittingRound:
    @pytest.mark.asyncio
    async def test_needs_alteration_keeps_fitting_in_progress(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, TAILOR_ID)
        result = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID,
            FittingRoundCreate(outcome="needs_alteration", notes="Hơi rộng eo"),
        )
        assert result.round_number == 1
        assert result.outcome == "needs_alteration"
        assert result.notes == "Hơi rộng eo"
        assert result.fitted_at is not None

        # fitting stage stays in_progress
        stage = (await db.execute(
            select(TaskStageLogDB).where(
                TaskStageLogDB.task_id == task.id, TaskStageLogDB.stage == "fitting"
            )
        )).scalar_one()
        assert stage.status == "in_progress"

        # task_history event
        history = (await db.execute(
            select(TaskHistoryDB).where(
                TaskHistoryDB.task_id == task.id,
                TaskHistoryDB.action == "fitting_round_recorded",
            )
        )).scalars().all()
        assert len(history) == 1
        assert history[0].extra_metadata == {"round_number": 1, "outcome": "needs_alteration"}

        # customer notified — alteration copy
        assert len(notify_spy.calls) == 1
        call = notify_spy.calls[0]
        assert call["notification_type"] == "fitting_alteration"
        assert call["title"] == "Đang chỉnh sửa theo góp ý của bạn"
        assert call["user_id"] == CUSTOMER_ID

    @pytest.mark.asyncio
    async def test_passed_completes_fitting_and_starts_next_stage(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        result = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="passed"),
        )
        assert result.outcome == "passed"

        stages = (await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == task.id)
            .order_by(TaskStageLogDB.stage_order)
        )).scalars().all()
        by_name = {s.stage: s for s in stages}
        assert by_name["fitting"].status == "completed"
        assert by_name["embroidery"].status == "in_progress"  # next ao_dai stage

        assert len(notify_spy.calls) == 1
        call = notify_spy.calls[0]
        assert call["notification_type"] == "fitting_passed"
        assert call["title"] == "Thử đạt — đang hoàn thiện"

    @pytest.mark.asyncio
    async def test_round_number_auto_increments(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        r1 = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="needs_alteration"),
        )
        r2 = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="needs_alteration"),
        )
        r3 = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="passed"),
        )
        assert (r1.round_number, r2.round_number, r3.round_number) == (1, 2, 3)

    @pytest.mark.asyncio
    async def test_non_bespoke_order_rejected(self, db, notify_spy):
        order = (await db.execute(select(OrderDB).where(OrderDB.id == ORDER_ID))).scalar_one()
        order.service_type = "buy"
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.record_fitting_round(
                db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="passed"),
            )
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_order_not_in_production_rejected(self, db, notify_spy):
        order = (await db.execute(select(OrderDB).where(OrderDB.id == ORDER_ID))).scalar_one()
        order.status = "confirmed"
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.record_fitting_round(
                db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="passed"),
            )
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_current_stage_not_fitting_rejected(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="assembly")
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.record_fitting_round(
                db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="passed"),
            )
        assert exc.value.status_code == 400
        assert "Thử đồ" in exc.value.detail

    @pytest.mark.asyncio
    async def test_unassigned_tailor_forbidden(self, db, notify_spy):
        task = _make_task(assigned_to=TAILOR_ID)
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, OTHER_TAILOR_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.record_fitting_round(
                db, ORDER_ID, actor, TENANT_ID, FittingRoundCreate(outcome="passed"),
            )
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_stale_version_conflicts(self, db, notify_spy):
        task = _make_task()
        task.version = 5
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.record_fitting_round(
                db, ORDER_ID, actor, TENANT_ID,
                FittingRoundCreate(outcome="passed", version=4),
            )
        assert exc.value.status_code == 409


# ── AC5: complete_stage gate on the fitting stage ────────────────────────────


class TestFittingStageGate:
    @pytest.mark.asyncio
    async def test_complete_fitting_without_passed_round_rejected(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        with pytest.raises(HTTPException) as exc:
            await tailor_task_service.complete_stage(db, task.id, 4, TAILOR_ID, TENANT_ID)
        assert exc.value.status_code == 400
        assert exc.value.detail == (
            "Cần ghi nhận kết quả thử đồ đạt (qua Vòng thử) trước khi hoàn thành bước Thử đồ"
        )

    @pytest.mark.asyncio
    async def test_needs_alteration_round_does_not_open_gate(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        db.add(FittingRoundDB(
            tenant_id=TENANT_ID, order_id=ORDER_ID, task_id=task.id,
            round_number=1, outcome="needs_alteration",
        ))
        await db.flush()

        with pytest.raises(HTTPException) as exc:
            await tailor_task_service.complete_stage(db, task.id, 4, TAILOR_ID, TENANT_ID)
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_passed_round_opens_gate(self, db, notify_spy):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        db.add(FittingRoundDB(
            tenant_id=TENANT_ID, order_id=ORDER_ID, task_id=task.id,
            round_number=1, outcome="passed",
        ))
        await db.flush()

        result = await tailor_task_service.complete_stage(db, task.id, 4, TAILOR_ID, TENANT_ID)
        assert result["stage_completed"] == "fitting"
        assert result["next_stage"] == "embroidery"


# ── AC6: round history + authorization matrix ────────────────────────────────


class TestListFittingRounds:
    async def _seed_rounds(self, db):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        db.add_all([
            FittingRoundDB(
                tenant_id=TENANT_ID, order_id=ORDER_ID, task_id=task.id,
                round_number=2, outcome="passed",
            ),
            FittingRoundDB(
                tenant_id=TENANT_ID, order_id=ORDER_ID, task_id=task.id,
                round_number=1, outcome="needs_alteration", notes="Chỉnh vai",
            ),
        ])
        await db.flush()
        return task

    @pytest.mark.asyncio
    async def test_owner_sees_rounds_ordered_asc(self, db):
        await self._seed_rounds(db)
        actor = await _get_user(db, OWNER_ID)
        rounds, fitting_status = await fitting_service.list_fitting_rounds(db, ORDER_ID, actor)
        assert [r.round_number for r in rounds] == [1, 2]
        assert rounds[0].outcome == "needs_alteration"
        assert fitting_status == "in_progress"

    @pytest.mark.asyncio
    async def test_assigned_tailor_allowed(self, db):
        await self._seed_rounds(db)
        actor = await _get_user(db, TAILOR_ID)
        rounds, _ = await fitting_service.list_fitting_rounds(db, ORDER_ID, actor)
        assert len(rounds) == 2

    @pytest.mark.asyncio
    async def test_unassigned_tailor_forbidden(self, db):
        await self._seed_rounds(db)
        actor = await _get_user(db, OTHER_TAILOR_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.list_fitting_rounds(db, ORDER_ID, actor)
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_own_customer_allowed(self, db):
        await self._seed_rounds(db)
        actor = await _get_user(db, CUSTOMER_ID)
        rounds, _ = await fitting_service.list_fitting_rounds(db, ORDER_ID, actor)
        assert len(rounds) == 2

    @pytest.mark.asyncio
    async def test_other_customer_forbidden(self, db):
        await self._seed_rounds(db)
        actor = await _get_user(db, OTHER_CUSTOMER_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.list_fitting_rounds(db, ORDER_ID, actor)
        assert exc.value.status_code == 403

    @pytest.mark.asyncio
    async def test_unknown_order_404(self, db):
        actor = await _get_user(db, OWNER_ID)
        with pytest.raises(HTTPException) as exc:
            await fitting_service.list_fitting_rounds(db, uuid.uuid4(), actor)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_foreign_tenant_actor_gets_404_not_403(self, db):
        """Tenant-scoped lookup: a foreign tenant must not learn the order exists."""
        await self._seed_rounds(db)
        other_tenant = TenantDB(id=uuid.uuid4(), name="Other Shop", slug="other-shop")
        foreign_owner = UserDB(
            id=uuid.uuid4(), email="owner-other@test.com", role="Owner",
            tenant_id=other_tenant.id, full_name="Owner Khac",
        )
        db.add_all([other_tenant, foreign_owner])
        await db.flush()

        with pytest.raises(HTTPException) as exc:
            await fitting_service.list_fitting_rounds(db, ORDER_ID, foreign_owner)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_no_rounds_returns_empty_with_stage_status(self, db):
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, CUSTOMER_ID)
        rounds, fitting_status = await fitting_service.list_fitting_rounds(db, ORDER_ID, actor)
        assert rounds == []
        assert fitting_status == "in_progress"


# ── Review fixes (2026-06-11) ─────────────────────────────────────────────────


class TestNonBespokeOrdersHaveNoFittingStage:
    """The fitting stage exists only for bespoke orders — buy/rent tasks must
    never get a 'fitting' stage they can never complete."""

    def _make_buy_order(self) -> OrderDB:
        return OrderDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, customer_id=CUSTOMER_ID,
            customer_name="Nguyen Van A", customer_phone="0901234567",
            shipping_address={}, subtotal_amount=Decimal("500000"),
            total_amount=Decimal("500000"),
            status="in_progress", service_type="buy",
        )

    @pytest.mark.asyncio
    async def test_start_task_buy_order_excludes_fitting(self, db):
        order = self._make_buy_order()
        db.add(order)
        task = _make_task(order_id=order.id, status="accepted")
        db.add(task)
        await db.flush()

        await tailor_task_service.start_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest()
        )

        stages = (await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == task.id)
            .order_by(TaskStageLogDB.stage_order)
        )).scalars().all()
        names = [s.stage for s in stages]
        assert "fitting" not in names
        # "Áo dài lụa" → ao_dai set (7 stages) minus fitting = 6, consecutive
        assert len(stages) == 6
        assert [s.stage_order for s in stages] == list(range(6))

    @pytest.mark.asyncio
    async def test_qc_rework_reset_buy_order_still_excludes_fitting(self, db, notify_spy):
        order = self._make_buy_order()
        db.add(order)
        task = _make_task(order_id=order.id, status="submitted_for_qc")
        db.add(task)
        await db.flush()

        await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID,
            QCResultRequest(result="fail", action_on_fail="rework", qc_issues="Đường may lệch"),
        )

        stages = (await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == task.id)
            .order_by(TaskStageLogDB.stage_order)
        )).scalars().all()
        names = [s.stage for s in stages]
        assert "fitting" not in names
        assert len(stages) == 6
        assert [s.stage_order for s in stages] == list(range(6))

    @pytest.mark.asyncio
    async def test_start_task_bespoke_order_keeps_fitting(self, db):
        # Regression guard: the fixture order (bespoke) still gets 7 stages
        task = _make_task(status="accepted")
        db.add(task)
        await db.flush()

        await tailor_task_service.start_task(
            db, task.id, TAILOR_ID, TENANT_ID, TaskStartRequest()
        )

        stages = (await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == task.id)
            .order_by(TaskStageLogDB.stage_order)
        )).scalars().all()
        assert [s.stage for s in stages] == tailor_task_service.GARMENT_STAGES["ao_dai"]


class TestNotificationResponseNewTypes:
    """NotificationResponse must validate every type the codebase sends —
    otherwise GET /customers/me/notifications 500s on new types."""

    def test_fitting_ready_row_validates_and_serializes(self):
        row = NotificationDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, user_id=CUSTOMER_ID,
            type="fitting_ready", title="Mời bạn tới thử đồ",
            message="Sản phẩm 'Áo dài lụa' đã sẵn sàng để thử.",
            data={"order_id": str(ORDER_ID)}, is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        response = NotificationResponse.model_validate(row)
        assert response.type == NotificationType.FITTING_READY
        assert response.model_dump(mode="json")["type"] == "fitting_ready"

    @pytest.mark.parametrize("sent_type", [
        "fitting_alteration", "fitting_passed", "qc_passed", "qc_failed_rework",
        "task_assigned", "task_accepted", "task_rejected", "task_created",
        "task_on_hold", "task_resumed", "task_reassigned", "task_submitted_qc",
        "task_cancellation_request", "task_cancellation_resolved",
    ])
    def test_every_sent_type_is_in_enum(self, sent_type):
        assert NotificationType(sent_type).value == sent_type


class TestRecordOnInProgressOrder:
    @pytest.mark.asyncio
    async def test_record_succeeds_on_in_progress_bespoke_order(self, db, notify_spy):
        """Owner create-task flow leaves confirmed orders at 'in_progress' —
        recording a fitting round must work there too."""
        order = (await db.execute(select(OrderDB).where(OrderDB.id == ORDER_ID))).scalar_one()
        order.status = "in_progress"
        task = _make_task()
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        result = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID,
            FittingRoundCreate(outcome="needs_alteration", notes="Hơi chật vai"),
        )
        assert result.round_number == 1
        assert result.outcome == "needs_alteration"


class TestFittingGateScopedToCurrentCycle:
    @pytest.mark.asyncio
    async def test_stale_passed_round_from_pre_rework_cycle_does_not_open_gate(self, db, notify_spy):
        """QC rework recreates stage logs but fitting_rounds are immutable —
        only passed rounds of the CURRENT cycle (created at/after the current
        fitting stage log) may complete the fitting stage."""
        now = datetime.now(timezone.utc)
        task = _make_task()
        db.add(task)
        # Passed round from the pre-rework cycle (older than the new stage logs)
        db.add(FittingRoundDB(
            tenant_id=TENANT_ID, order_id=ORDER_ID, task_id=task.id,
            round_number=1, outcome="passed",
            created_at=now - timedelta(minutes=10),
        ))
        # Simulated rework reset: fresh stage logs, fitting in_progress again
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        with pytest.raises(HTTPException) as exc:
            await tailor_task_service.complete_stage(db, task.id, 4, TAILOR_ID, TENANT_ID)
        assert exc.value.status_code == 400

        # A NEW passed round in the current cycle opens the gate
        db.add(FittingRoundDB(
            tenant_id=TENANT_ID, order_id=ORDER_ID, task_id=task.id,
            round_number=2, outcome="passed",
            created_at=now + timedelta(minutes=10),
        ))
        await db.flush()

        result = await tailor_task_service.complete_stage(db, task.id, 4, TAILOR_ID, TENANT_ID)
        assert result["stage_completed"] == "fitting"


class TestRecordBumpsTaskVersion:
    @pytest.mark.asyncio
    async def test_stale_second_record_conflicts_fresh_version_succeeds(self, db, notify_spy):
        task = _make_task()  # version=1
        db.add(task)
        _add_stage_logs(db, task.id, current_stage="fitting")
        await db.flush()

        actor = await _get_user(db, OWNER_ID)
        r1 = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID,
            FittingRoundCreate(outcome="needs_alteration", version=1),
        )
        assert r1.round_number == 1
        assert task.version == 2

        # Second device still holding version 1 → 409
        with pytest.raises(HTTPException) as exc:
            await fitting_service.record_fitting_round(
                db, ORDER_ID, actor, TENANT_ID,
                FittingRoundCreate(outcome="needs_alteration", version=1),
            )
        assert exc.value.status_code == 409

        # Fresh version → round 2
        r2 = await fitting_service.record_fitting_round(
            db, ORDER_ID, actor, TENANT_ID,
            FittingRoundCreate(outcome="needs_alteration", version=2),
        )
        assert r2.round_number == 2
        assert task.version == 3
