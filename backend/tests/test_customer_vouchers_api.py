"""Tests for voucher endpoints in customer_profile router (Story 4.4g).

Endpoints tested:
  GET  /api/v1/customers/me/vouchers  — list assigned vouchers (success, empty, unauthorized)

Status logic tested:
  - active: not used, expiry_date >= today
  - expired: not used, expiry_date < today
  - used: is_used = True
"""

import uuid
from datetime import date, datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, TenantDB, UserDB, VoucherDB, UserVoucherDB

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

TODAY = date.today()
TOMORROW = TODAY + timedelta(days=1)
YESTERDAY = TODAY - timedelta(days=1)


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
    """Seed tenant, two users, vouchers, and user_vouchers assignments."""
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
        full_name="Người Khác",
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(other_user)
    await db.flush()

    # Active voucher (percent, expires tomorrow)
    v_active = VoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        code="TET2026",
        type="percent",
        value=10,
        min_order_value=500000,
        max_discount_value=100000,
        description="Giảm 10% dịp Tết",
        expiry_date=TOMORROW,
        total_uses=100,
        used_count=0,
        is_active=True,
    )

    # Expired voucher (fixed, expired yesterday)
    v_expired = VoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        code="SUMMER25",
        type="fixed",
        value=50000,
        min_order_value=0,
        description="Giảm 50,000đ hè 2025",
        expiry_date=YESTERDAY,
        total_uses=50,
        used_count=0,
        is_active=True,
    )

    # Active voucher but marked used by user
    v_used = VoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        code="WELCOME",
        type="fixed",
        value=100000,
        min_order_value=200000,
        description="Chào mừng khách mới",
        expiry_date=TOMORROW,
        total_uses=1,
        used_count=1,
        is_active=True,
    )

    # Inactive voucher (should NOT appear in results)
    v_inactive = VoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        code="INACTIVE",
        type="percent",
        value=5,
        min_order_value=0,
        expiry_date=TOMORROW,
        is_active=False,  # deactivated by owner
    )

    db.add(v_active)
    db.add(v_expired)
    db.add(v_used)
    db.add(v_inactive)
    await db.flush()

    # Assign vouchers to main user
    uv_active = UserVoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        voucher_id=v_active.id,
        is_used=False,
        assigned_at=datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    uv_expired = UserVoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        voucher_id=v_expired.id,
        is_used=False,
        assigned_at=datetime(2025, 6, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    uv_used = UserVoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        voucher_id=v_used.id,
        is_used=True,
        used_at=datetime(2026, 2, 14, 12, 0, 0, tzinfo=timezone.utc),
        assigned_at=datetime(2026, 2, 1, 0, 0, 0, tzinfo=timezone.utc),
    )
    # Assign inactive to user too (should NOT appear)
    uv_inactive = UserVoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=user.id,
        voucher_id=v_inactive.id,
        is_used=False,
        assigned_at=datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc),
    )

    # Assign active voucher to OTHER user (should NOT appear for main user)
    v_other = VoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        code="OTHERVIP",
        type="fixed",
        value=200000,
        min_order_value=0,
        expiry_date=TOMORROW,
        is_active=True,
    )
    db.add(v_other)
    await db.flush()

    uv_other = UserVoucherDB(
        id=uuid.uuid4(),
        tenant_id=DEFAULT_TENANT_ID,
        user_id=other_user.id,
        voucher_id=v_other.id,
        is_used=False,
        assigned_at=datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc),
    )

    db.add(uv_active)
    db.add(uv_expired)
    db.add(uv_used)
    db.add(uv_inactive)
    db.add(uv_other)
    await db.commit()

    return {
        "user": user,
        "other_user": other_user,
        "v_active": v_active,
        "v_expired": v_expired,
        "v_used": v_used,
        "uv_active": uv_active,
        "uv_expired": uv_expired,
        "uv_used": uv_used,
    }


# ─── GET /vouchers ────────────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_get_vouchers_success(override_db, seed_data):
    """AC1, AC2, AC6: Returns all assigned active-def vouchers with correct status."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/vouchers",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    # inactive voucher excluded → only 3 active-def vouchers
    assert data["voucher_count"] == 3
    vouchers = data["vouchers"]
    assert len(vouchers) == 3

    # Verify required fields present
    for v in vouchers:
        assert "id" in v
        assert "voucher_id" in v
        assert "code" in v
        assert "type" in v
        assert "value" in v
        assert "min_order_value" in v
        assert "expiry_date" in v
        assert "status" in v
        assert "assigned_at" in v

    # Verify status values
    codes_by_status = {v["code"]: v["status"] for v in vouchers}
    assert codes_by_status["TET2026"] == "active"
    assert codes_by_status["SUMMER25"] == "expired"
    assert codes_by_status["WELCOME"] == "used"

    # Inactive voucher must NOT appear
    assert "INACTIVE" not in codes_by_status


@pytest.mark.asyncio
async def test_get_vouchers_inactive_excluded(override_db, seed_data):
    """AC6: Vouchers with is_active=False must not appear even if assigned."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/vouchers",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    codes = [v["code"] for v in resp.json()["data"]["vouchers"]]
    assert "INACTIVE" not in codes


@pytest.mark.asyncio
async def test_get_vouchers_empty(override_db, test_db_session):
    """AC4: User with no voucher assignments returns empty list."""
    db = test_db_session
    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Test Shop", slug="test-shop")
    db.add(tenant)
    empty_user = UserDB(
        id=uuid.uuid4(),
        email="empty@example.com",
        hashed_password=hash_password("Pass1234"),
        role="Customer",
        is_active=True,
        tenant_id=DEFAULT_TENANT_ID,
    )
    db.add(empty_user)
    await db.commit()

    token = make_token(empty_user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/vouchers",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["voucher_count"] == 0
    assert data["vouchers"] == []


@pytest.mark.asyncio
async def test_get_vouchers_unauthorized(override_db, seed_data):
    """AC5: No token → 401 Unauthorized."""
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get("/api/v1/customers/me/vouchers")

    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_vouchers_isolation(override_db, seed_data):
    """AC6: User sees only their own vouchers, not other users'."""
    other_user = seed_data["other_user"]
    token = make_token(other_user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/vouchers",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    codes = [v["code"] for v in resp.json()["data"]["vouchers"]]
    # Other user only has OTHERVIP
    assert codes == ["OTHERVIP"]
    # Main user's vouchers must NOT appear
    assert "TET2026" not in codes
    assert "SUMMER25" not in codes


@pytest.mark.asyncio
async def test_get_vouchers_decimal_serialization(override_db, seed_data):
    """AC6: Decimal fields serialized as strings (lesson from story 4.4d)."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/vouchers",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    for v in resp.json()["data"]["vouchers"]:
        # value and min_order_value must be strings (not raw numbers)
        assert isinstance(v["value"], str)
        assert isinstance(v["min_order_value"], str)
        # Verify parseable as float
        assert float(v["value"]) > 0


@pytest.mark.asyncio
async def test_get_vouchers_sorting(override_db, seed_data):
    """AC1: Active first, expired second, used last."""
    user = seed_data["user"]
    token = make_token(user.email)

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        resp = await client.get(
            "/api/v1/customers/me/vouchers",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert resp.status_code == 200
    vouchers = resp.json()["data"]["vouchers"]
    statuses = [v["status"] for v in vouchers]
    # AC1: active → expired → used
    assert statuses == ["active", "expired", "used"]
