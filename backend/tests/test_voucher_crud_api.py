"""Service tests for Voucher CRUD - Story 6.3: Voucher Creator UI.

Tests Owner CRUD operations for voucher management with multi-tenant isolation,
code uniqueness, validation rules, delete guard, toggle active, and stats.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, TenantDB, UserDB, VoucherDB
from src.services import voucher_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    """Create test database session."""
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_data(test_db_session: AsyncSession) -> dict:
    """Seed test database with tenants and users."""
    tenant1_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    tenant2_id = uuid.UUID("00000000-0000-0000-0000-000000000002")

    tenant1 = TenantDB(id=tenant1_id, name="Tiem May 1", slug="tiem-may-1")
    tenant2 = TenantDB(id=tenant2_id, name="Tiem May 2", slug="tiem-may-2")

    owner = UserDB(
        id=uuid.uuid4(),
        email="owner@example.com",
        role="Owner",
        is_active=True,
        tenant_id=tenant1_id,
        full_name="Cô Lan",
    )

    test_db_session.add_all([tenant1, tenant2, owner])
    await test_db_session.flush()
    await test_db_session.commit()

    return {
        "tenant1_id": tenant1_id,
        "tenant2_id": tenant2_id,
    }


def _make_create_request(**overrides):
    """Helper to build VoucherCreateRequest with defaults."""
    from src.models.voucher import VoucherCreateRequest

    defaults = {
        "code": "TETLUX26",
        "type": "percent",
        "value": Decimal("20"),
        "min_order_value": Decimal("500000"),
        "max_discount_value": Decimal("200000"),
        "description": "Giảm 20% dịp Tết",
        "expiry_date": date.today() + timedelta(days=30),
        "total_uses": 100,
    }
    defaults.update(overrides)
    return VoucherCreateRequest(**defaults)


# ========== CREATE TESTS ==========


@pytest.mark.asyncio
async def test_create_voucher_percent_success(test_db_session, seed_data):
    """Create a percent voucher successfully."""
    data = _make_create_request()
    voucher = await voucher_service.create_voucher(
        test_db_session, seed_data["tenant1_id"], data
    )

    assert voucher.code == "TETLUX26"
    assert voucher.type == "percent"
    assert voucher.value == Decimal("20")
    assert voucher.min_order_value == Decimal("500000")
    assert voucher.max_discount_value == Decimal("200000")
    assert voucher.is_active is True
    assert voucher.used_count == 0
    assert voucher.total_uses == 100


@pytest.mark.asyncio
async def test_create_voucher_fixed_success(test_db_session, seed_data):
    """Create a fixed VND voucher successfully."""
    data = _make_create_request(
        code="FIXED50K",
        type="fixed",
        value=Decimal("50000"),
        max_discount_value=None,
    )
    voucher = await voucher_service.create_voucher(
        test_db_session, seed_data["tenant1_id"], data
    )

    assert voucher.code == "FIXED50K"
    assert voucher.type == "fixed"
    assert voucher.value == Decimal("50000")
    assert voucher.max_discount_value is None


@pytest.mark.asyncio
async def test_create_voucher_duplicate_code_409(test_db_session, seed_data):
    """Duplicate voucher code within same tenant → 409."""
    data = _make_create_request(code="DUPE")
    await voucher_service.create_voucher(
        test_db_session, seed_data["tenant1_id"], data
    )

    with pytest.raises(HTTPException) as exc_info:
        await voucher_service.create_voucher(
            test_db_session, seed_data["tenant1_id"], _make_create_request(code="DUPE")
        )
    assert exc_info.value.status_code == 409


@pytest.mark.asyncio
async def test_create_voucher_same_code_different_tenant_ok(test_db_session, seed_data):
    """Same code in different tenant is allowed."""
    data = _make_create_request(code="SHARED")
    await voucher_service.create_voucher(
        test_db_session, seed_data["tenant1_id"], data
    )
    voucher2 = await voucher_service.create_voucher(
        test_db_session, seed_data["tenant2_id"], _make_create_request(code="SHARED")
    )
    assert voucher2.code == "SHARED"


@pytest.mark.asyncio
async def test_create_voucher_percent_over_100_400(test_db_session, seed_data):
    """Percent value > 100 → 400."""
    data = _make_create_request(type="percent", value=Decimal("150"))
    with pytest.raises(HTTPException) as exc_info:
        await voucher_service.create_voucher(
            test_db_session, seed_data["tenant1_id"], data
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_create_voucher_past_expiry_400(test_db_session, seed_data):
    """Expiry date in the past → 400."""
    data = _make_create_request(expiry_date=date.today() - timedelta(days=1))
    with pytest.raises(HTTPException) as exc_info:
        await voucher_service.create_voucher(
            test_db_session, seed_data["tenant1_id"], data
        )
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_create_fixed_with_max_discount_400(test_db_session, seed_data):
    """Fixed voucher with max_discount_value → 400."""
    data = _make_create_request(
        type="fixed", value=Decimal("50000"), max_discount_value=Decimal("30000")
    )
    with pytest.raises(HTTPException) as exc_info:
        await voucher_service.create_voucher(
            test_db_session, seed_data["tenant1_id"], data
        )
    assert exc_info.value.status_code == 400


# ========== LIST & GET TESTS ==========


@pytest.mark.asyncio
async def test_list_vouchers_pagination(test_db_session, seed_data):
    """List vouchers with pagination."""
    tid = seed_data["tenant1_id"]
    for i in range(5):
        await voucher_service.create_voucher(
            test_db_session, tid,
            _make_create_request(code=f"V{i:02d}"),
        )

    vouchers, total = await voucher_service.list_vouchers(
        test_db_session, tid, page=1, page_size=3
    )
    assert total == 5
    assert len(vouchers) == 3

    vouchers2, _ = await voucher_service.list_vouchers(
        test_db_session, tid, page=2, page_size=3
    )
    assert len(vouchers2) == 2


@pytest.mark.asyncio
async def test_list_vouchers_tenant_isolation(test_db_session, seed_data):
    """Vouchers from other tenant not visible."""
    await voucher_service.create_voucher(
        test_db_session, seed_data["tenant1_id"], _make_create_request(code="T1ONLY")
    )
    vouchers, total = await voucher_service.list_vouchers(
        test_db_session, seed_data["tenant2_id"]
    )
    assert total == 0


@pytest.mark.asyncio
async def test_list_vouchers_filter_active(test_db_session, seed_data):
    """Filter by is_active status."""
    tid = seed_data["tenant1_id"]
    v = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request(code="ACT1")
    )
    await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request(code="ACT2")
    )
    # Deactivate one
    await voucher_service.toggle_voucher_active(test_db_session, tid, v.id)

    active, active_total = await voucher_service.list_vouchers(
        test_db_session, tid, is_active=True
    )
    assert active_total == 1

    inactive, inactive_total = await voucher_service.list_vouchers(
        test_db_session, tid, is_active=False
    )
    assert inactive_total == 1


@pytest.mark.asyncio
async def test_list_vouchers_search(test_db_session, seed_data):
    """Search vouchers by code."""
    tid = seed_data["tenant1_id"]
    await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request(code="TETSPECIAL")
    )
    await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request(code="SUMMER50")
    )

    vouchers, total = await voucher_service.list_vouchers(
        test_db_session, tid, search="TET"
    )
    assert total == 1
    assert vouchers[0].code == "TETSPECIAL"


@pytest.mark.asyncio
async def test_get_voucher_success(test_db_session, seed_data):
    """Get voucher by ID."""
    tid = seed_data["tenant1_id"]
    created = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request()
    )
    fetched = await voucher_service.get_voucher(test_db_session, tid, created.id)
    assert fetched is not None
    assert fetched.code == "TETLUX26"


@pytest.mark.asyncio
async def test_get_voucher_wrong_tenant_returns_none(test_db_session, seed_data):
    """Get voucher from wrong tenant returns None (isolation)."""
    created = await voucher_service.create_voucher(
        test_db_session, seed_data["tenant1_id"], _make_create_request()
    )
    fetched = await voucher_service.get_voucher(
        test_db_session, seed_data["tenant2_id"], created.id
    )
    assert fetched is None


# ========== UPDATE TESTS ==========


@pytest.mark.asyncio
async def test_update_voucher_success(test_db_session, seed_data):
    """Update voucher fields."""
    from src.models.voucher import VoucherUpdateRequest

    tid = seed_data["tenant1_id"]
    created = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request()
    )

    update_data = VoucherUpdateRequest(
        value=Decimal("30"),
        description="Giảm 30% cập nhật",
    )
    updated = await voucher_service.update_voucher(
        test_db_session, tid, created.id, update_data
    )
    assert updated is not None
    assert updated.value == Decimal("30")
    assert updated.description == "Giảm 30% cập nhật"
    assert updated.code == "TETLUX26"  # Unchanged


@pytest.mark.asyncio
async def test_update_voucher_not_found(test_db_session, seed_data):
    """Update non-existent voucher returns None."""
    from src.models.voucher import VoucherUpdateRequest

    result = await voucher_service.update_voucher(
        test_db_session, seed_data["tenant1_id"], uuid.uuid4(),
        VoucherUpdateRequest(value=Decimal("10"))
    )
    assert result is None


@pytest.mark.asyncio
async def test_update_percent_over_100_400(test_db_session, seed_data):
    """Update percent value > 100 → 400."""
    from src.models.voucher import VoucherUpdateRequest

    tid = seed_data["tenant1_id"]
    created = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request()
    )

    with pytest.raises(HTTPException) as exc_info:
        await voucher_service.update_voucher(
            test_db_session, tid, created.id,
            VoucherUpdateRequest(value=Decimal("150"))
        )
    assert exc_info.value.status_code == 400


# ========== TOGGLE ACTIVE TESTS ==========


@pytest.mark.asyncio
async def test_toggle_voucher_active(test_db_session, seed_data):
    """Toggle active status back and forth."""
    tid = seed_data["tenant1_id"]
    created = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request()
    )
    assert created.is_active is True

    toggled = await voucher_service.toggle_voucher_active(
        test_db_session, tid, created.id
    )
    assert toggled.is_active is False

    toggled2 = await voucher_service.toggle_voucher_active(
        test_db_session, tid, created.id
    )
    assert toggled2.is_active is True


@pytest.mark.asyncio
async def test_toggle_voucher_not_found(test_db_session, seed_data):
    """Toggle non-existent voucher returns None."""
    result = await voucher_service.toggle_voucher_active(
        test_db_session, seed_data["tenant1_id"], uuid.uuid4()
    )
    assert result is None


# ========== DELETE TESTS ==========


@pytest.mark.asyncio
async def test_delete_voucher_success(test_db_session, seed_data):
    """Delete voucher with used_count == 0."""
    tid = seed_data["tenant1_id"]
    created = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request()
    )

    deleted = await voucher_service.delete_voucher(test_db_session, tid, created.id)
    assert deleted is True

    # Verify it's gone
    fetched = await voucher_service.get_voucher(test_db_session, tid, created.id)
    assert fetched is None


@pytest.mark.asyncio
async def test_delete_voucher_used_400(test_db_session, seed_data):
    """Delete voucher with used_count > 0 → 400."""
    tid = seed_data["tenant1_id"]
    created = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request()
    )

    # Simulate usage by directly updating used_count
    created.used_count = 5
    await test_db_session.flush()
    await test_db_session.commit()

    with pytest.raises(HTTPException) as exc_info:
        await voucher_service.delete_voucher(test_db_session, tid, created.id)
    assert exc_info.value.status_code == 400


@pytest.mark.asyncio
async def test_delete_voucher_not_found(test_db_session, seed_data):
    """Delete non-existent voucher returns False."""
    deleted = await voucher_service.delete_voucher(
        test_db_session, seed_data["tenant1_id"], uuid.uuid4()
    )
    assert deleted is False


# ========== STATS TESTS ==========


@pytest.mark.asyncio
async def test_get_voucher_stats(test_db_session, seed_data):
    """Stats: total, active, redemptions, rate."""
    tid = seed_data["tenant1_id"]

    # Create 3 vouchers
    v1 = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request(code="S1", total_uses=10)
    )
    v2 = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request(code="S2", total_uses=20)
    )
    v3 = await voucher_service.create_voucher(
        test_db_session, tid, _make_create_request(code="S3", total_uses=10)
    )

    # Simulate usage
    v1.used_count = 5
    v2.used_count = 10
    await test_db_session.flush()
    await test_db_session.commit()

    # Deactivate v3
    await voucher_service.toggle_voucher_active(test_db_session, tid, v3.id)

    stats = await voucher_service.get_voucher_stats(test_db_session, tid)
    assert stats.total_vouchers == 3
    assert stats.active_vouchers == 2
    assert stats.total_redemptions == 15
    assert stats.redemption_rate == 37.5  # 15/40 * 100


@pytest.mark.asyncio
async def test_get_voucher_stats_empty(test_db_session, seed_data):
    """Stats with no vouchers."""
    stats = await voucher_service.get_voucher_stats(
        test_db_session, seed_data["tenant1_id"]
    )
    assert stats.total_vouchers == 0
    assert stats.active_vouchers == 0
    assert stats.total_redemptions == 0
    assert stats.redemption_rate == 0.0
