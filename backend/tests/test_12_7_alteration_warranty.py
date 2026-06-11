"""Tests for Story 12.7: Post-Delivery Alteration Warranty (SCP 2026-06-10, FR101).

Covers:
- AC1: migration 045 ↔ ORM consistency (settings, task_type, marker, notification CHECK)
- AC2: request_alteration — window math (inside/outside/boundary day), settings
       default fallback + override, delivery_date fallback chain, duplicate 409,
       non-bespoke / wrong-status 400, ownership 404, owner notification
- AC3: approve_alteration — alteration task with reduced stages + task_type,
       marker cleared, customer + tailor notifications
- AC4: process_qc_result pass EXCLUDES alteration tasks from order-sync and
       sends alteration_done; QC-rework resets alteration tasks to the
       alteration stage list; production behavior unchanged (regression)
- AC5 (server side): compute_alteration_info state mapping
- Notification enum/serialization coverage for the 3 new types
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import CheckConstraint, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from pydantic import ValidationError

from src.models.alteration import AlterationRequestCreate, ApproveAlterationRequest
from src.models.order import OrderStatusUpdate
from src.models.db_models import (
    Base,
    NotificationDB,
    OrderDB,
    TailorTaskDB,
    TaskStageLogDB,
    TenantDB,
    UserDB,
)
from src.models.notification import NotificationResponse, NotificationType
from src.models.tailor_task import (
    QCResultRequest,
    ResolveCancellationInput,
    TaskStartRequest,
)
from src.services import alteration_service, order_service, tailor_task_service
from src.services.tenant_settings import get_tenant_setting

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
TAILOR_ID = uuid.uuid4()
CUSTOMER_ID = uuid.uuid4()
OTHER_CUSTOMER_ID = uuid.uuid4()
ORDER_ID = uuid.uuid4()

NOW = lambda: datetime.now(timezone.utc)  # noqa: E731

VALID_DESCRIPTION = "Áo hơi rộng ở phần eo, xin chỉnh lại"


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
        customer = UserDB(id=CUSTOMER_ID, email="customer@test.com", role="Customer", tenant_id=TENANT_ID)
        other_customer = UserDB(id=OTHER_CUSTOMER_ID, email="customer2@test.com", role="Customer", tenant_id=TENANT_ID)
        session.add_all([owner, tailor, customer, other_customer])

        # Bespoke order delivered 10 days ago — well inside the 30-day default
        order = OrderDB(
            id=ORDER_ID,
            tenant_id=TENANT_ID,
            customer_id=CUSTOMER_ID,
            customer_name="Nguyen Van A",
            customer_phone="0901234567",
            shipping_address={},
            subtotal_amount=Decimal("500000"),
            total_amount=Decimal("500000"),
            status="completed",
            service_type="bespoke",
            delivery_date=NOW() - timedelta(days=10),
        )
        session.add(order)
        await session.flush()
        yield session


async def _get_order(db, order_id=ORDER_ID) -> OrderDB:
    return (await db.execute(select(OrderDB).where(OrderDB.id == order_id))).scalar_one()


async def _get_user(db, user_id) -> UserDB:
    return (await db.execute(select(UserDB).where(UserDB.id == user_id))).scalar_one()


async def _get_tenant(db) -> TenantDB:
    return (await db.execute(select(TenantDB).where(TenantDB.id == TENANT_ID))).scalar_one()


def _make_alteration_task(status="assigned", assigned_to=TAILOR_ID) -> TailorTaskDB:
    return TailorTaskDB(
        id=uuid.uuid4(),
        tenant_id=TENANT_ID,
        order_id=ORDER_ID,
        assigned_to=assigned_to,
        assigned_by=OWNER_ID,
        garment_name="Áo dài lụa",
        customer_name="Nguyen Van A",
        status=status,
        task_type="alteration",
        version=1,
    )


class _NotificationSpy:
    def __init__(self):
        self.calls = []

    async def __call__(self, **kwargs):
        self.calls.append(kwargs)

    def of_type(self, notification_type):
        return [c for c in self.calls if c["notification_type"] == notification_type]


@pytest.fixture
def notify_spy(monkeypatch):
    spy = _NotificationSpy()
    monkeypatch.setattr(alteration_service, "create_notification", spy)
    monkeypatch.setattr(tailor_task_service, "create_notification", spy)
    return spy


async def _request(db, body=None, actor_id=CUSTOMER_ID, order_id=ORDER_ID):
    actor = await _get_user(db, actor_id)
    return await alteration_service.request_alteration(
        db, order_id, actor, TENANT_ID,
        body or AlterationRequestCreate(description=VALID_DESCRIPTION),
    )


# ── AC1: migration 045 ↔ ORM consistency ─────────────────────────────────────


class TestMigrationOrmConsistency:
    @property
    def sql(self) -> str:
        return (
            Path(__file__).resolve().parents[1] / "migrations" / "045_alteration_warranty.sql"
        ).read_text(encoding="utf-8")

    def test_migration_045_adds_all_columns_and_index(self):
        sql = self.sql
        assert "ALTER TABLE tenants" in sql and "settings JSONB NOT NULL DEFAULT '{}'::jsonb" in sql
        assert "ALTER TABLE tailor_tasks" in sql
        assert "task_type VARCHAR(20) NOT NULL DEFAULT 'production'" in sql
        assert "task_type IN ('production', 'alteration')" in sql
        assert "idx_tailor_tasks_task_type" in sql
        assert "alteration_requested_at TIMESTAMPTZ NULL" in sql

    def test_orm_matches_migration(self):
        # tenants.settings
        settings_col = TenantDB.__table__.columns["settings"]
        assert settings_col.nullable is False
        # tailor_tasks.task_type
        task_type_col = TailorTaskDB.__table__.columns["task_type"]
        assert task_type_col.nullable is False
        assert task_type_col.default.arg == "production"
        checks = [c for c in TailorTaskDB.__table__.constraints if isinstance(c, CheckConstraint)]
        assert any(c.name == "chk_tailor_task_type" for c in checks)
        # orders.alteration_requested_at
        assert OrderDB.__table__.columns["alteration_requested_at"].nullable is True

    def test_notification_check_rebuild_covers_every_enum_type(self):
        sql = self.sql
        assert "DROP CONSTRAINT IF EXISTS chk_notification_type" in sql
        for notification_type in NotificationType:
            assert f"'{notification_type.value}'" in sql, (
                f"Migration 045 CHECK missing notification type: {notification_type.value}"
            )

    def test_garment_stages_has_alteration_entry(self):
        assert tailor_task_service.GARMENT_STAGES["alteration"] == ["alteration", "finishing"]


# ── Settings helper ───────────────────────────────────────────────────────────


class TestTenantSettings:
    def test_default_when_settings_empty(self):
        tenant = TenantDB(name="T", slug="t", settings={})
        assert get_tenant_setting(tenant, "alteration_warranty_days", 30) == 30

    def test_override_wins(self):
        tenant = TenantDB(name="T", slug="t", settings={"alteration_warranty_days": 7})
        assert get_tenant_setting(tenant, "alteration_warranty_days", 30) == 7

    def test_none_tenant_and_null_settings_are_safe(self):
        assert get_tenant_setting(None, "k", "d") == "d"
        tenant = TenantDB(name="T", slug="t")
        tenant.settings = None  # rows predating migration 045
        assert get_tenant_setting(tenant, "k", "d") == "d"


# ── AC2: request_alteration window math + guards ──────────────────────────────


class TestRequestAlterationWindow:
    @pytest.mark.asyncio
    async def test_inside_window_sets_marker_and_notifies_owner(self, db, notify_spy):
        result = await _request(db)
        assert result.order_id == str(ORDER_ID)

        order = await _get_order(db)
        assert order.alteration_requested_at is not None

        calls = notify_spy.of_type("alteration_requested")
        assert len(calls) == 1
        call = calls[0]
        assert call["user_id"] == OWNER_ID
        assert call["title"] == "Khách yêu cầu chỉnh sửa"
        assert VALID_DESCRIPTION in call["message"]
        assert call["data"]["order_id"] == str(ORDER_ID)
        assert call["data"]["description"] == VALID_DESCRIPTION

    @pytest.mark.asyncio
    async def test_outside_window_422_with_exact_vietnamese_message(self, db, notify_spy):
        order = await _get_order(db)
        order.delivery_date = NOW() - timedelta(days=40)
        await db.flush()

        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 422
        assert exc.value.detail == (
            "Đã quá thời hạn chỉnh sửa miễn phí (30 ngày). Vui lòng liên hệ tiệm."
        )
        assert (await _get_order(db)).alteration_requested_at is None

    @pytest.mark.asyncio
    async def test_boundary_day_still_inside(self, db, notify_spy):
        # 30 days minus 2 minutes ago → the boundary day is still within the window
        order = await _get_order(db)
        order.delivery_date = NOW() - timedelta(days=30) + timedelta(minutes=2)
        await db.flush()

        result = await _request(db)
        assert result.order_id == str(ORDER_ID)

    @pytest.mark.asyncio
    async def test_just_past_boundary_is_outside(self, db, notify_spy):
        order = await _get_order(db)
        order.delivery_date = NOW() - timedelta(days=30, minutes=2)
        await db.flush()

        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 422

    @pytest.mark.asyncio
    async def test_tenant_setting_overrides_window(self, db, notify_spy):
        tenant = await _get_tenant(db)
        tenant.settings = {"alteration_warranty_days": 7}
        await db.flush()

        # delivery 10 days ago is outside a 7-day window
        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 422
        assert "(7 ngày)" in exc.value.detail

    @pytest.mark.asyncio
    async def test_missing_setting_falls_back_to_30_days(self, db, notify_spy):
        # delivery 20 days ago: inside the 30-day default (fixture tenant has
        # the empty-settings default)
        order = await _get_order(db)
        order.delivery_date = NOW() - timedelta(days=20)
        await db.flush()

        result = await _request(db)
        assert result.order_id == str(ORDER_ID)

    @pytest.mark.asyncio
    async def test_null_delivery_date_falls_back_to_updated_at(self, db, notify_spy):
        order = await _get_order(db)
        order.delivery_date = None
        order.updated_at = NOW() - timedelta(days=5)
        await db.flush()
        result = await _request(db)
        assert result.order_id == str(ORDER_ID)

        # and the fallback also expires
        order = await _get_order(db)
        order.alteration_requested_at = None
        order.updated_at = NOW() - timedelta(days=45)
        await db.flush()
        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 422


class TestRequestAlterationGuards:
    @pytest.mark.asyncio
    async def test_duplicate_pending_request_409(self, db, notify_spy):
        await _request(db)
        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 409

    @pytest.mark.asyncio
    async def test_open_alteration_task_409(self, db, notify_spy):
        db.add(_make_alteration_task(status="in_progress"))
        await db.flush()
        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 409

    @pytest.mark.asyncio
    async def test_completed_alteration_task_does_not_block_new_request(self, db, notify_spy):
        db.add(_make_alteration_task(status="completed"))
        await db.flush()
        result = await _request(db)
        assert result.order_id == str(ORDER_ID)

    @pytest.mark.asyncio
    async def test_non_bespoke_400(self, db, notify_spy):
        order = await _get_order(db)
        order.service_type = "buy"
        await db.flush()
        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_wrong_status_400(self, db, notify_spy):
        order = await _get_order(db)
        order.status = "in_production"
        await db.flush()
        with pytest.raises(HTTPException) as exc:
            await _request(db)
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_delivered_status_also_allowed(self, db, notify_spy):
        order = await _get_order(db)
        order.status = "delivered"
        await db.flush()
        result = await _request(db)
        assert result.order_id == str(ORDER_ID)

    @pytest.mark.asyncio
    async def test_other_customer_404_no_existence_oracle(self, db, notify_spy):
        with pytest.raises(HTTPException) as exc:
            await _request(db, actor_id=OTHER_CUSTOMER_ID)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_unknown_order_404(self, db, notify_spy):
        with pytest.raises(HTTPException) as exc:
            await _request(db, order_id=uuid.uuid4())
        assert exc.value.status_code == 404

    def test_description_min_10_chars_rejected_by_schema(self):
        with pytest.raises(Exception):
            AlterationRequestCreate(description="ngắn quá")


# ── AC3: approve_alteration ───────────────────────────────────────────────────


class TestApproveAlteration:
    async def _seed_pending(self, db):
        order = await _get_order(db)
        order.alteration_requested_at = NOW()
        await db.flush()

    @pytest.mark.asyncio
    async def test_approve_with_tailor_creates_assigned_alteration_task(self, db, notify_spy):
        await self._seed_pending(db)
        result = await alteration_service.approve_alteration(
            db, ORDER_ID, OWNER_ID, TENANT_ID,
            ApproveAlterationRequest(tailor_id=TAILOR_ID, notes="Nới eo 1cm"),
        )
        assert result.task_type == "alteration"
        assert result.status == "assigned"
        assert result.assigned_to == str(TAILOR_ID)

        # reduced stage list, consecutive stage_order
        stages = (await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == uuid.UUID(result.id))
            .order_by(TaskStageLogDB.stage_order)
        )).scalars().all()
        assert [s.stage for s in stages] == ["alteration", "finishing"]
        assert [s.stage_order for s in stages] == [0, 1]
        assert stages[0].status == "in_progress"

        # marker cleared
        assert (await _get_order(db)).alteration_requested_at is None

        # customer notified — exact plain-Vietnamese title
        approved = notify_spy.of_type("alteration_approved")
        assert len(approved) == 1
        assert approved[0]["user_id"] == CUSTOMER_ID
        assert approved[0]["title"] == "Yêu cầu chỉnh sửa đã được tiếp nhận"

        # assigned tailor notified
        assigned = notify_spy.of_type("task_assigned")
        assert len(assigned) == 1
        assert assigned[0]["user_id"] == TAILOR_ID

    @pytest.mark.asyncio
    async def test_approve_without_tailor_leaves_task_unassigned(self, db, notify_spy):
        await self._seed_pending(db)
        result = await alteration_service.approve_alteration(
            db, ORDER_ID, OWNER_ID, TENANT_ID, ApproveAlterationRequest(),
        )
        assert result.status == "unassigned"
        assert result.assigned_to is None
        assert notify_spy.of_type("task_assigned") == []
        assert len(notify_spy.of_type("alteration_approved")) == 1

    @pytest.mark.asyncio
    async def test_approve_without_pending_request_400(self, db, notify_spy):
        with pytest.raises(HTTPException) as exc:
            await alteration_service.approve_alteration(
                db, ORDER_ID, OWNER_ID, TENANT_ID, ApproveAlterationRequest(),
            )
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_approve_with_non_tailor_400(self, db, notify_spy):
        await self._seed_pending(db)
        with pytest.raises(HTTPException) as exc:
            await alteration_service.approve_alteration(
                db, ORDER_ID, OWNER_ID, TENANT_ID,
                ApproveAlterationRequest(tailor_id=CUSTOMER_ID),
            )
        assert exc.value.status_code == 400

    @pytest.mark.asyncio
    async def test_approve_unknown_order_404(self, db, notify_spy):
        with pytest.raises(HTTPException) as exc:
            await alteration_service.approve_alteration(
                db, uuid.uuid4(), OWNER_ID, TENANT_ID, ApproveAlterationRequest(),
            )
        assert exc.value.status_code == 404


# ── AC4 + lifecycle: alteration tasks in the 11-state machine ────────────────


class TestAlterationTaskLifecycle:
    @pytest.mark.asyncio
    async def test_start_task_recreates_alteration_stage_list(self, db):
        task = _make_alteration_task(status="accepted")
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
        # Garment name "Áo dài lụa" would resolve to the 7-stage ao_dai set —
        # task_type must win and give the reduced alteration list.
        assert [s.stage for s in stages] == ["alteration", "finishing"]

    @pytest.mark.asyncio
    async def test_qc_pass_on_alteration_excludes_order_sync_and_notifies_pickup(self, db, notify_spy):
        task = _make_alteration_task(status="submitted_for_qc")
        db.add(task)
        await db.flush()

        result = await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID, QCResultRequest(result="pass"),
        )
        assert result.status == "completed"
        assert result.task_type == "alteration"

        # Order is NOT re-transitioned (stays completed)
        order = await _get_order(db)
        assert order.status == "completed"

        # Customer gets the alteration_done copy — and NOT the production
        # qc_passed / order ready notifications
        done = notify_spy.of_type("alteration_done")
        assert len(done) == 1
        assert done[0]["user_id"] == CUSTOMER_ID
        assert done[0]["title"] == "Áo đã chỉnh xong — mời bạn tới nhận"
        assert notify_spy.of_type("qc_passed") == []
        assert notify_spy.of_type("order_status") == []

    @pytest.mark.asyncio
    async def test_qc_pass_on_delivered_order_does_not_retransition(self, db, notify_spy):
        order = await _get_order(db)
        order.status = "delivered"
        task = _make_alteration_task(status="submitted_for_qc")
        db.add(task)
        await db.flush()

        await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID, QCResultRequest(result="pass"),
        )
        assert (await _get_order(db)).status == "delivered"

    @pytest.mark.asyncio
    async def test_qc_pass_on_production_task_still_syncs_order(self, db, notify_spy):
        """Regression guard: the AC4 exclusion must not change production behavior."""
        order = OrderDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, customer_id=CUSTOMER_ID,
            customer_name="Nguyen Van A", customer_phone="0901234567",
            shipping_address={}, subtotal_amount=Decimal("1"), total_amount=Decimal("1"),
            status="in_production", service_type="bespoke",
        )
        db.add(order)
        task = TailorTaskDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, order_id=order.id,
            assigned_to=TAILOR_ID, assigned_by=OWNER_ID,
            garment_name="Áo dài lụa", customer_name="Nguyen Van A",
            status="submitted_for_qc", version=1,
        )
        db.add(task)
        await db.flush()
        assert task.task_type == "production"  # ORM default

        await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID, QCResultRequest(result="pass"),
        )

        refreshed = await _get_order(db, order.id)
        assert refreshed.status == "ready_to_ship"
        assert len(notify_spy.of_type("qc_passed")) == 1
        assert len(notify_spy.of_type("order_status")) == 1

    @pytest.mark.asyncio
    async def test_qc_rework_resets_to_alteration_stage_list(self, db, notify_spy):
        task = _make_alteration_task(status="submitted_for_qc")
        db.add(task)
        await db.flush()

        await tailor_task_service.process_qc_result(
            db, task.id, OWNER_ID, TENANT_ID,
            QCResultRequest(result="fail", action_on_fail="rework", qc_issues="Vẫn còn rộng eo"),
        )

        stages = (await db.execute(
            select(TaskStageLogDB)
            .where(TaskStageLogDB.task_id == task.id)
            .order_by(TaskStageLogDB.stage_order)
        )).scalars().all()
        assert [s.stage for s in stages] == ["alteration", "finishing"]
        assert [s.stage_order for s in stages] == [0, 1]


# ── AC5 (server side): compute_alteration_info state mapping ──────────────────


class TestComputeAlterationInfo:
    @pytest.mark.asyncio
    async def test_available_inside_window_with_remaining_days(self, db):
        order = await _get_order(db)
        info = await alteration_service.compute_alteration_info(db, order)
        assert info is not None
        assert info.state == "available"
        assert info.warranty_days == 30
        assert info.remaining_days == 20  # delivered 10 days ago, ceil

    @pytest.mark.asyncio
    async def test_pending_when_marker_set(self, db):
        order = await _get_order(db)
        order.alteration_requested_at = NOW()
        await db.flush()
        info = await alteration_service.compute_alteration_info(db, order)
        assert info.state == "pending"
        assert info.requested_at is not None

    @pytest.mark.asyncio
    async def test_in_alteration_when_open_task(self, db):
        db.add(_make_alteration_task(status="in_progress"))
        await db.flush()
        order = await _get_order(db)
        info = await alteration_service.compute_alteration_info(db, order)
        assert info.state == "in_alteration"

    @pytest.mark.asyncio
    async def test_expired_outside_window(self, db):
        order = await _get_order(db)
        order.delivery_date = NOW() - timedelta(days=60)
        await db.flush()
        info = await alteration_service.compute_alteration_info(db, order)
        assert info.state == "expired"
        assert info.remaining_days == 0

    @pytest.mark.asyncio
    async def test_none_for_non_bespoke_or_pre_handover(self, db):
        order = await _get_order(db)
        order.service_type = "buy"
        assert await alteration_service.compute_alteration_info(db, order) is None

        order.service_type = "bespoke"
        order.status = "in_production"
        assert await alteration_service.compute_alteration_info(db, order) is None

    @pytest.mark.asyncio
    async def test_tenant_override_reflected(self, db):
        tenant = await _get_tenant(db)
        tenant.settings = {"alteration_warranty_days": 7}
        await db.flush()
        order = await _get_order(db)  # delivered 10 days ago → outside 7
        info = await alteration_service.compute_alteration_info(db, order)
        assert info.state == "expired"
        assert info.warranty_days == 7


# ── Notification enum / serialization coverage ────────────────────────────────


class TestNotificationNewTypes:
    @pytest.mark.parametrize("sent_type", [
        "alteration_requested", "alteration_approved", "alteration_done",
    ])
    def test_new_types_in_enum(self, sent_type):
        assert NotificationType(sent_type).value == sent_type

    @pytest.mark.parametrize("sent_type,title", [
        ("alteration_requested", "Khách yêu cầu chỉnh sửa"),
        ("alteration_approved", "Yêu cầu chỉnh sửa đã được tiếp nhận"),
        ("alteration_done", "Áo đã chỉnh xong — mời bạn tới nhận"),
    ])
    def test_rows_validate_and_serialize(self, sent_type, title):
        row = NotificationDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, user_id=CUSTOMER_ID,
            type=sent_type, title=title, message="…",
            data={"order_id": str(ORDER_ID)}, is_read=False,
            created_at=datetime.now(timezone.utc),
        )
        response = NotificationResponse.model_validate(row)
        assert response.model_dump(mode="json")["type"] == sent_type


# ── TailorTaskResponse exposes task_type ──────────────────────────────────────


class TestTaskResponseExposesTaskType:
    def test_task_to_response_carries_task_type(self):
        # Unflushed ORM instance — set column defaults explicitly
        task = _make_alteration_task()
        task.production_step = "pending"
        task.is_rework = False
        task.rework_count = 0
        task.priority = "normal"
        task.created_at = datetime.now(timezone.utc)
        task.updated_at = datetime.now(timezone.utc)
        response = tailor_task_service._task_to_response(task, datetime.now(timezone.utc))
        assert response.task_type == "alteration"


# ── Review round 1 — FIX 1: cancellation resolution on alteration tasks ──────


class TestResolveCancellationOnAlterationTask:
    """Approving a tailor's cancellation request on an alteration task must
    cancel only the TASK — never the delivered/completed (paid) order — and
    must restore the pending marker + note so the owner can re-approve."""

    async def _seed_cancellation_requested(self, db, notes="Khách mô tả: Áo hơi rộng ở phần eo"):
        task = _make_alteration_task(status="cancellation_requested")
        task.notes = notes
        task.failure_reason = "Vải không đủ để sửa theo yêu cầu"
        db.add(task)
        await db.flush()
        return task

    @pytest.mark.asyncio
    async def test_approve_cancels_task_but_not_the_completed_order(self, db, notify_spy):
        task = await self._seed_cancellation_requested(db)
        order_before = await _get_order(db)
        updated_at_before = order_before.updated_at

        result = await tailor_task_service.resolve_cancellation_request(
            db, task.id, OWNER_ID, TENANT_ID, ResolveCancellationInput(decision="approve"),
        )

        assert result["decision"] == "approve"
        assert result["order_status"] == "completed"  # NOT cancelled
        assert task.status == "cancelled"

        order = await _get_order(db)
        assert order.status == "completed"
        assert order.cancellation_reason is None
        assert order.updated_at == updated_at_before
        # Pending marker + note restored → owner can re-approve with another tailor
        assert order.alteration_requested_at is not None
        assert order.alteration_request_note == "Khách mô tả: Áo hơi rộng ở phần eo"

    @pytest.mark.asyncio
    async def test_approve_on_delivered_order_keeps_delivered(self, db, notify_spy):
        order = await _get_order(db)
        order.status = "delivered"
        task = await self._seed_cancellation_requested(db)

        await tailor_task_service.resolve_cancellation_request(
            db, task.id, OWNER_ID, TENANT_ID, ResolveCancellationInput(decision="approve"),
        )
        assert (await _get_order(db)).status == "delivered"

    @pytest.mark.asyncio
    async def test_approve_without_task_notes_keeps_existing_note(self, db, notify_spy):
        order = await _get_order(db)
        order.alteration_request_note = "Mô tả gốc của khách hàng"
        task = await self._seed_cancellation_requested(db, notes=None)

        await tailor_task_service.resolve_cancellation_request(
            db, task.id, OWNER_ID, TENANT_ID, ResolveCancellationInput(decision="approve"),
        )
        refreshed = await _get_order(db)
        assert refreshed.alteration_requested_at is not None
        assert refreshed.alteration_request_note == "Mô tả gốc của khách hàng"

    @pytest.mark.asyncio
    async def test_reject_behavior_unchanged_for_alteration_tasks(self, db, notify_spy):
        task = await self._seed_cancellation_requested(db)

        result = await tailor_task_service.resolve_cancellation_request(
            db, task.id, OWNER_ID, TENANT_ID, ResolveCancellationInput(decision="reject"),
        )
        assert result["decision"] == "reject"
        assert task.status in ("assigned", "in_progress")

        order = await _get_order(db)
        assert order.status == "completed"
        assert order.alteration_requested_at is None  # reject does NOT reopen

    @pytest.mark.asyncio
    async def test_production_task_approve_still_cancels_order_regression(self, db, notify_spy):
        """Byte-identical production behavior: approve cancels the order."""
        order = OrderDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, customer_id=CUSTOMER_ID,
            customer_name="Nguyen Van A", customer_phone="0901234567",
            shipping_address={}, subtotal_amount=Decimal("1"), total_amount=Decimal("1"),
            status="in_production", service_type="bespoke",
        )
        db.add(order)
        task = TailorTaskDB(
            id=uuid.uuid4(), tenant_id=TENANT_ID, order_id=order.id,
            assigned_to=TAILOR_ID, assigned_by=OWNER_ID,
            garment_name="Áo dài lụa", customer_name="Nguyen Van A",
            status="cancellation_requested", failure_reason="Vải lỗi nặng quá",
            version=1,
        )
        db.add(task)
        await db.flush()
        assert task.task_type == "production"

        result = await tailor_task_service.resolve_cancellation_request(
            db, task.id, OWNER_ID, TENANT_ID, ResolveCancellationInput(decision="approve"),
        )
        assert result["order_status"] == "cancelled"
        refreshed = await _get_order(db, order.id)
        assert refreshed.status == "cancelled"
        assert refreshed.cancellation_reason == "Vải lỗi nặng quá"
        assert refreshed.alteration_requested_at is None

    @pytest.mark.asyncio
    async def test_reassign_preserves_alteration_task_type(self, db, notify_spy):
        task = await self._seed_cancellation_requested(db)
        result = await tailor_task_service.resolve_cancellation_request(
            db, task.id, OWNER_ID, TENANT_ID,
            ResolveCancellationInput(decision="reassign", new_tailor_id=TAILOR_ID),
        )
        new_task = (await db.execute(
            select(TailorTaskDB).where(TailorTaskDB.id == uuid.UUID(result["new_task_id"]))
        )).scalar_one()
        assert new_task.task_type == "alteration"
        # reassign keeps the work alive — no marker restore, order untouched
        order = await _get_order(db)
        assert order.status == "completed"
        assert order.alteration_requested_at is None


# ── Review round 1 — FIX 2: delivery_date is the stable window anchor ────────


class TestDeliveryDateStamping:
    async def _prepare(self, db, status, delivery_date=None):
        """Reset the fixture order for an update_order_status call (the
        response model needs a valid shipping_address: None, not {})."""
        order = await _get_order(db)
        order.status = status
        order.delivery_date = delivery_date
        order.shipping_address = None
        await db.flush()
        return order

    @pytest.mark.asyncio
    async def test_entering_delivered_stamps_delivery_date_once(self, db):
        await self._prepare(db, "shipped")

        await order_service.update_order_status(
            db, ORDER_ID, TENANT_ID, OrderStatusUpdate(status="delivered"),
        )
        order = await _get_order(db)
        assert order.status == "delivered"
        assert order.delivery_date is not None
        stamped = order.delivery_date

        # delivered → completed must NOT move the anchor
        await order_service.update_order_status(
            db, ORDER_ID, TENANT_ID, OrderStatusUpdate(status="completed"),
        )
        order = await _get_order(db)
        assert order.status == "completed"
        assert order.delivery_date == stamped
        assert alteration_service.resolve_window_anchor(order) == alteration_service._as_utc(stamped)

    @pytest.mark.asyncio
    async def test_existing_delivery_date_never_overwritten(self, db):
        original = NOW() - timedelta(days=3)
        await self._prepare(db, "shipped", delivery_date=original)

        await order_service.update_order_status(
            db, ORDER_ID, TENANT_ID, OrderStatusUpdate(status="delivered"),
        )
        order = await _get_order(db)
        assert alteration_service._as_utc(order.delivery_date) == original

    @pytest.mark.asyncio
    async def test_entering_completed_with_null_delivery_date_stamps_it(self, db):
        # delivered rows predating the fix (NULL delivery_date) get stamped on
        # the next transition instead of extending the window forever
        await self._prepare(db, "delivered")

        await order_service.update_order_status(
            db, ORDER_ID, TENANT_ID, OrderStatusUpdate(status="completed"),
        )
        order = await _get_order(db)
        assert order.delivery_date is not None

    def test_migration_045_backfills_legacy_anchor(self):
        sql = (
            Path(__file__).resolve().parents[1] / "migrations" / "045_alteration_warranty.sql"
        ).read_text(encoding="utf-8")
        assert "SET delivery_date = updated_at" in sql
        assert "WHERE status IN ('delivered', 'completed')" in sql
        assert "delivery_date IS NULL" in sql
        assert "alteration_request_note TEXT NULL" in sql


# ── Review round 1 — FIX 3: non-dict tenant settings JSONB ───────────────────


class TestTenantSettingsNonDict:
    @pytest.mark.parametrize("bad_settings", ["30", [1, 2], 30, True])
    def test_non_dict_settings_return_default(self, bad_settings):
        tenant = TenantDB(name="T", slug="t")
        tenant.settings = bad_settings
        assert get_tenant_setting(tenant, "alteration_warranty_days", 30) == 30

    @pytest.mark.asyncio
    async def test_compute_alteration_info_survives_scalar_settings(self, db):
        tenant = await _get_tenant(db)
        tenant.settings = "30"  # valid JSONB, not a bag
        await db.flush()
        order = await _get_order(db)
        info = await alteration_service.compute_alteration_info(db, order)
        assert info is not None
        assert info.warranty_days == 30  # default, no AttributeError


# ── Review round 1 — FIX 4: the description is persisted, not notification-only ──


class TestAlterationRequestNote:
    @pytest.mark.asyncio
    async def test_request_persists_note_on_the_order(self, db, notify_spy):
        await _request(db)
        order = await _get_order(db)
        assert order.alteration_request_note == VALID_DESCRIPTION

    @pytest.mark.asyncio
    async def test_note_survives_notification_failure(self, db, monkeypatch):
        async def boom(**kwargs):
            raise RuntimeError("notification insert failed")
        monkeypatch.setattr(alteration_service, "create_notification", boom)

        await _request(db)
        order = await _get_order(db)
        assert order.alteration_requested_at is not None
        assert order.alteration_request_note == VALID_DESCRIPTION

    @pytest.mark.asyncio
    async def test_approve_copies_note_to_task_and_clears_it(self, db, notify_spy):
        order = await _get_order(db)
        order.alteration_requested_at = NOW()
        order.alteration_request_note = "Phần eo hơi rộng, xin chỉnh lại"
        await db.flush()

        result = await alteration_service.approve_alteration(
            db, ORDER_ID, OWNER_ID, TENANT_ID,
            ApproveAlterationRequest(tailor_id=TAILOR_ID, notes="Ưu tiên làm trước"),
        )
        task = (await db.execute(
            select(TailorTaskDB).where(TailorTaskDB.id == uuid.UUID(result.id))
        )).scalar_one()
        assert "Khách mô tả: Phần eo hơi rộng, xin chỉnh lại" in task.notes
        assert "Ưu tiên làm trước" in task.notes

        order = await _get_order(db)
        assert order.alteration_requested_at is None
        assert order.alteration_request_note is None

    @pytest.mark.asyncio
    async def test_approve_without_owner_notes_uses_customer_note_only(self, db, notify_spy):
        order = await _get_order(db)
        order.alteration_requested_at = NOW()
        order.alteration_request_note = "Tay áo hơi dài, xin cắt bớt"
        await db.flush()

        result = await alteration_service.approve_alteration(
            db, ORDER_ID, OWNER_ID, TENANT_ID, ApproveAlterationRequest(),
        )
        task = (await db.execute(
            select(TailorTaskDB).where(TailorTaskDB.id == uuid.UUID(result.id))
        )).scalar_one()
        assert task.notes == "Khách mô tả: Tay áo hơi dài, xin cắt bớt"

    @pytest.mark.asyncio
    async def test_full_recovery_loop_keeps_a_usable_note(self, db, notify_spy):
        """request → approve → tailor requests cancel → owner approves cancel:
        the reopened pending request still carries the description."""
        await _request(db)
        result = await alteration_service.approve_alteration(
            db, ORDER_ID, OWNER_ID, TENANT_ID,
            ApproveAlterationRequest(tailor_id=TAILOR_ID),
        )
        task = (await db.execute(
            select(TailorTaskDB).where(TailorTaskDB.id == uuid.UUID(result.id))
        )).scalar_one()
        task.status = "cancellation_requested"
        await db.flush()

        await tailor_task_service.resolve_cancellation_request(
            db, task.id, OWNER_ID, TENANT_ID, ResolveCancellationInput(decision="approve"),
        )
        order = await _get_order(db)
        assert order.status == "completed"
        assert order.alteration_requested_at is not None
        assert VALID_DESCRIPTION in order.alteration_request_note

    @pytest.mark.asyncio
    async def test_compute_alteration_info_exposes_note_when_pending(self, db, notify_spy):
        await _request(db)
        order = await _get_order(db)
        info = await alteration_service.compute_alteration_info(db, order)
        assert info.state == "pending"
        assert info.request_note == VALID_DESCRIPTION


# ── Review round 1 — FIX 5: whitespace-only description rejected ─────────────


class TestDescriptionStripValidation:
    def test_whitespace_only_rejected(self):
        with pytest.raises(ValidationError):
            AlterationRequestCreate(description=" " * 10)

    def test_padding_does_not_satisfy_minimum(self):
        with pytest.raises(ValidationError):
            AlterationRequestCreate(description="   ngắn quá   ")

    def test_valid_value_is_stored_stripped(self):
        body = AlterationRequestCreate(description="  đúng mười ký tự  ")
        assert body.description == "đúng mười ký tự"
