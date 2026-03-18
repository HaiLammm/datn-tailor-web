"""Tests for notification endpoints in customer_profile router (Story 4.4f).

Endpoints tested:
  GET  /api/v1/customers/me/notifications            — list (success, empty, unauthorized)
  GET  /api/v1/customers/me/notifications/unread-count — unread count
  PATCH /api/v1/customers/me/notifications/read-all  — mark all read
  PATCH /api/v1/customers/me/notifications/{id}/read — mark single read (success, not-found, unauthorized)
  DELETE /api/v1/customers/me/notifications/{id}     — soft delete (success, not-found, unauthorized)
  create_notification service                         — creates NotificationDB record
"""

import uuid
from datetime import datetime, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, NotificationDB, TenantDB, UserDB
from src.services.notification_creator import create_notification

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


def make_token(email: str) -> str:
    return create_access_token({"sub": email})


# ─── Fixtures ────────────────────────────────────────────────────────────────


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest.fixture
def override_db(test_db_session):
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_data(test_db_session):
    """Seed tenant, two users, and some notifications."""
    db = test_db_session

    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Test Shop", slug="test-shop")
    db.add(tenant)

    user = UserDB(
        id=uuid.uuid4(),
        email="customer@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Nguyễn Thị Linh",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(user)

    other_user = UserDB(
        id=uuid.uuid4(),
        email="other@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        full_name="Người khác",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(other_user)
    await db.flush()

    # Seed notifications for main user
    notif1 = NotificationDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        type="order_status",
        title="Đơn hàng đã xác nhận",
        message="Đơn hàng #ABC123 đã xác nhận.",
        data={"order_id": "abc123"},
        is_read=False,
        created_at=datetime(2026, 3, 18, 10, 0, 0, tzinfo=timezone.utc),
    )
    notif2 = NotificationDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        type="appointment",
        title="Lịch hẹn đã hủy",
        message="Lịch hẹn ngày 2026-03-20 đã được hủy.",
        data={},
        is_read=True,
        read_at=datetime(2026, 3, 18, 11, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 3, 18, 9, 0, 0, tzinfo=timezone.utc),
    )
    # Soft-deleted notification (should be excluded)
    notif_deleted = NotificationDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        type="system",
        title="Deleted",
        message="Đã xóa",
        data={},
        is_read=False,
        deleted_at=datetime(2026, 3, 17, 0, 0, 0, tzinfo=timezone.utc),
        created_at=datetime(2026, 3, 17, 0, 0, 0, tzinfo=timezone.utc),
    )
    db.add(notif1)
    db.add(notif2)
    db.add(notif_deleted)
    await db.commit()

    return {
        "user": user,
        "other_user": other_user,
        "notif1": notif1,
        "notif2": notif2,
        "notif_deleted": notif_deleted,
    }


# ─── GET /notifications ───────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_notifications_success(override_db, seed_data):
    """AC1: Returns non-deleted notifications sorted DESC."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/notifications",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    # Deleted notification excluded → only 2 returned
    assert data["notification_count"] == 2
    notifications = data["notifications"]
    assert len(notifications) == 2
    # Sorted DESC by created_at (notif1 newer than notif2)
    assert notifications[0]["title"] == "Đơn hàng đã xác nhận"
    assert notifications[1]["title"] == "Lịch hẹn đã hủy"
    # Fields present
    assert "id" in notifications[0]
    assert "type" in notifications[0]
    assert "is_read" in notifications[0]
    assert "created_at" in notifications[0]


@pytest.mark.asyncio
async def test_get_notifications_empty(override_db, test_db_session):
    """AC5: Returns empty list when user has no notifications."""
    db = test_db_session
    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Shop", slug="shop-empty")
    db.add(tenant)
    new_user = UserDB(
        id=uuid.uuid4(),
        email="empty@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(new_user)
    await db.commit()

    token = make_token(new_user.email)
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/notifications",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["notification_count"] == 0
    assert data["notifications"] == []


@pytest.mark.asyncio
async def test_get_notifications_unauthorized(override_db):
    """Returns 401/403 without auth token."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/customers/me/notifications")

    assert resp.status_code in (401, 403)


# ─── GET /notifications/unread-count ─────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_unread_count(override_db, seed_data):
    """AC2: Returns correct unread count (only non-deleted unread)."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/notifications/unread-count",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    # notif1 is unread, notif2 is read, notif_deleted is excluded → count = 1
    assert resp.json()["data"]["unread_count"] == 1


# ─── PATCH /notifications/{id}/read ──────────────────────────────────────────


@pytest.mark.asyncio
async def test_mark_notification_read_success(override_db, seed_data):
    """AC3: Marks unread notification as read."""
    user = seed_data["user"]
    notif1 = seed_data["notif1"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.patch(
            f"/api/v1/customers/me/notifications/{notif1.id}/read",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["is_read"] is True
    assert data["read_at"] is not None


@pytest.mark.asyncio
async def test_mark_notification_read_already_read(override_db, seed_data):
    """AC3: Already-read notification returns 200 (idempotent)."""
    user = seed_data["user"]
    notif2 = seed_data["notif2"]  # already read
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.patch(
            f"/api/v1/customers/me/notifications/{notif2.id}/read",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    assert resp.json()["data"]["is_read"] is True


@pytest.mark.asyncio
async def test_mark_notification_read_not_found(override_db, seed_data):
    """404 for non-existent notification."""
    user = seed_data["user"]
    token = make_token(user.email)
    fake_id = uuid.uuid4()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.patch(
            f"/api/v1/customers/me/notifications/{fake_id}/read",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "NOT_FOUND"
    assert "Thông báo không tồn tại" in resp.json()["detail"]["message"]


@pytest.mark.asyncio
async def test_mark_notification_read_other_user(override_db, seed_data):
    """404 if notification belongs to different user (security isolation)."""
    other_user = seed_data["other_user"]
    notif1 = seed_data["notif1"]  # belongs to main user, not other_user
    token = make_token(other_user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.patch(
            f"/api/v1/customers/me/notifications/{notif1.id}/read",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_mark_notification_read_unauthorized(override_db, seed_data):
    """401/403 without auth token."""
    notif1 = seed_data["notif1"]

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.patch(
            f"/api/v1/customers/me/notifications/{notif1.id}/read"
        )

    assert resp.status_code in (401, 403)


# ─── PATCH /notifications/read-all ───────────────────────────────────────────


@pytest.mark.asyncio
async def test_mark_all_notifications_read(override_db, seed_data, test_db_session):
    """AC3: Marks all unread notifications as read."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.patch(
            "/api/v1/customers/me/notifications/read-all",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    assert "Đã đánh dấu tất cả" in resp.json()["data"]["message"]

    # Verify in DB: all non-deleted notifications should be read now
    db = test_db_session
    result = await db.execute(
        select(NotificationDB).where(
            NotificationDB.user_id == user.id,
            NotificationDB.deleted_at.is_(None),
            NotificationDB.is_read.is_(False),
        )
    )
    remaining_unread = result.scalars().all()
    assert len(remaining_unread) == 0


# ─── DELETE /notifications/{id} ──────────────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_notification_success(override_db, seed_data, test_db_session):
    """AC6: Soft-deletes notification (sets deleted_at)."""
    user = seed_data["user"]
    notif1 = seed_data["notif1"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.delete(
            f"/api/v1/customers/me/notifications/{notif1.id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    assert "Thông báo đã được xóa" in resp.json()["data"]["message"]

    # Verify soft delete in DB
    db = test_db_session
    result = await db.execute(
        select(NotificationDB).where(NotificationDB.id == notif1.id)
    )
    notif = result.scalar_one()
    assert notif.deleted_at is not None


@pytest.mark.asyncio
async def test_delete_notification_not_found(override_db, seed_data):
    """404 for non-existent notification."""
    user = seed_data["user"]
    token = make_token(user.email)
    fake_id = uuid.uuid4()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.delete(
            f"/api/v1/customers/me/notifications/{fake_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 404
    assert resp.json()["detail"]["code"] == "NOT_FOUND"
    assert "Thông báo không tồn tại" in resp.json()["detail"]["message"]


@pytest.mark.asyncio
async def test_delete_notification_unauthorized(override_db, seed_data):
    """401/403 without auth token."""
    notif1 = seed_data["notif1"]

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.delete(
            f"/api/v1/customers/me/notifications/{notif1.id}"
        )

    assert resp.status_code in (401, 403)


# ─── create_notification service ─────────────────────────────────────────────


@pytest.mark.asyncio
async def test_create_notification_service(test_db_session):
    """AC7: notification_creator.create_notification persists a NotificationDB record."""
    db = test_db_session
    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Shop", slug="shop-notif-svc")
    db.add(tenant)
    user = UserDB(
        id=uuid.uuid4(),
        email="svc@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(user)
    await db.commit()

    notif = await create_notification(
        db=db,
        user_id=user.id,
        tenant_id=DEFAULT_TENANT_ID,
        notification_type="order_status",
        title="Đơn hàng đã xác nhận",
        message="Đơn hàng #TEST001 đã xác nhận.",
        data={"order_id": "test001"},
    )

    assert notif.id is not None
    assert notif.user_id == user.id
    assert notif.tenant_id == DEFAULT_TENANT_ID
    assert notif.type == "order_status"
    assert notif.title == "Đơn hàng đã xác nhận"
    assert notif.message == "Đơn hàng #TEST001 đã xác nhận."
    assert notif.data == {"order_id": "test001"}
    assert notif.is_read is False
    assert notif.deleted_at is None


@pytest.mark.asyncio
async def test_create_notification_default_data(test_db_session):
    """create_notification works without explicit data param (defaults to empty dict)."""
    db = test_db_session
    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Shop", slug="shop-default-data")
    db.add(tenant)
    user = UserDB(
        id=uuid.uuid4(),
        email="nodata@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(user)
    await db.commit()

    notif = await create_notification(
        db=db,
        user_id=user.id,
        tenant_id=DEFAULT_TENANT_ID,
        notification_type="system",
        title="Thông báo hệ thống",
        message="Hệ thống bảo trì vào lúc 22:00.",
    )

    assert notif.data == {}
    assert notif.type == "system"
