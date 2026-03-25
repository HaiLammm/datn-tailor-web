"""Service tests for Voucher Checkout Integration — Public/Private rules.

Tests voucher validation, discount calculation, multi-voucher logic with
public/private visibility, order creation with vouchers, and refund on cancellation.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, TenantDB, UserDB, UserVoucherDB, VoucherDB
from src.services.voucher_service import (
    apply_vouchers_to_order,
    calculate_single_discount,
    refund_vouchers_for_order,
    validate_and_calculate_multi_discount,
    validate_voucher_for_checkout,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_data(test_db_session: AsyncSession) -> dict:
    """Seed database with tenants, users, public/private vouchers, and assignments."""
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    customer_id = uuid.uuid4()
    other_customer_id = uuid.uuid4()

    tenant = TenantDB(id=tenant_id, name="Tiem May 1", slug="tiem-may-1")
    customer = UserDB(
        id=customer_id, email="customer@example.com", role="Customer",
        is_active=True, tenant_id=tenant_id, full_name="Nguyen Van A",
    )
    other_customer = UserDB(
        id=other_customer_id, email="other@example.com", role="Customer",
        is_active=True, tenant_id=tenant_id, full_name="Tran Van B",
    )

    # PUBLIC vouchers
    public_percent = VoucherDB(
        id=uuid.uuid4(), tenant_id=tenant_id, code="TETLUXV26",
        type="percent", value=Decimal("20"), visibility="public",
        min_order_value=Decimal("200000"), max_discount_value=Decimal("100000"),
        expiry_date=date.today() + timedelta(days=30), total_uses=100, used_count=0, is_active=True,
    )
    public_fixed = VoucherDB(
        id=uuid.uuid4(), tenant_id=tenant_id, code="SALE50K",
        type="fixed", value=Decimal("50000"), visibility="public",
        min_order_value=Decimal("100000"),
        expiry_date=date.today() + timedelta(days=30), total_uses=50, used_count=0, is_active=True,
    )

    # PRIVATE vouchers
    priv_50k = VoucherDB(
        id=uuid.uuid4(), tenant_id=tenant_id, code="PRIV50K",
        type="fixed", value=Decimal("50000"), visibility="private",
        min_order_value=Decimal("0"),
        expiry_date=date.today() + timedelta(days=30), total_uses=10, used_count=0, is_active=True,
    )
    priv_20k = VoucherDB(
        id=uuid.uuid4(), tenant_id=tenant_id, code="PRIV20K",
        type="fixed", value=Decimal("20000"), visibility="private",
        min_order_value=Decimal("0"),
        expiry_date=date.today() + timedelta(days=30), total_uses=10, used_count=0, is_active=True,
    )
    priv_10k = VoucherDB(
        id=uuid.uuid4(), tenant_id=tenant_id, code="PRIV10K",
        type="fixed", value=Decimal("10000"), visibility="private",
        min_order_value=Decimal("0"),
        expiry_date=date.today() + timedelta(days=30), total_uses=10, used_count=0, is_active=True,
    )
    priv_percent = VoucherDB(
        id=uuid.uuid4(), tenant_id=tenant_id, code="VIP15",
        type="percent", value=Decimal("15"), visibility="private",
        min_order_value=Decimal("0"),
        expiry_date=date.today() + timedelta(days=30), total_uses=5, used_count=0, is_active=True,
    )

    # Expired voucher
    expired = VoucherDB(
        id=uuid.uuid4(), tenant_id=tenant_id, code="EXPIRED",
        type="percent", value=Decimal("10"), visibility="public",
        min_order_value=Decimal("0"),
        expiry_date=date.today() - timedelta(days=1), total_uses=10, used_count=0, is_active=True,
    )

    test_db_session.add_all([
        tenant, customer, other_customer,
        public_percent, public_fixed, priv_50k, priv_20k, priv_10k, priv_percent, expired,
    ])
    await test_db_session.flush()

    # Assign PRIVATE vouchers to customer (public vouchers are NOT pre-assigned)
    assignments = [
        UserVoucherDB(tenant_id=tenant_id, user_id=customer_id, voucher_id=priv_50k.id),
        UserVoucherDB(tenant_id=tenant_id, user_id=customer_id, voucher_id=priv_20k.id),
        UserVoucherDB(tenant_id=tenant_id, user_id=customer_id, voucher_id=priv_10k.id),
        UserVoucherDB(tenant_id=tenant_id, user_id=customer_id, voucher_id=priv_percent.id),
    ]
    test_db_session.add_all(assignments)
    await test_db_session.flush()
    await test_db_session.commit()

    return {
        "tenant_id": tenant_id,
        "customer_id": customer_id,
        "other_customer_id": other_customer_id,
        "public_percent": public_percent,
        "public_fixed": public_fixed,
        "priv_50k": priv_50k,
        "priv_20k": priv_20k,
        "priv_10k": priv_10k,
        "priv_percent": priv_percent,
        "expired": expired,
    }


# ---------------------------------------------------------------------------
# Public Voucher Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_public_voucher_auto_assign(test_db_session, seed_data):
    """Public voucher code → auto-assigns and validates successfully."""
    d = seed_data
    voucher, uv = await validate_voucher_for_checkout(
        test_db_session, d["tenant_id"], d["customer_id"],
        "TETLUXV26", Decimal("500000")
    )
    assert voucher.code == "TETLUXV26"
    assert voucher.visibility == "public"
    assert uv.is_used is False


@pytest.mark.asyncio
async def test_public_voucher_lifetime_limit(test_db_session, seed_data):
    """Public voucher used once → second attempt rejected (lifetime)."""
    d = seed_data
    # First: auto-assign
    voucher, uv = await validate_voucher_for_checkout(
        test_db_session, d["tenant_id"], d["customer_id"],
        "TETLUXV26", Decimal("500000")
    )
    # Simulate usage
    uv.is_used = True
    await test_db_session.flush()
    await test_db_session.commit()

    # Second attempt: should fail
    with pytest.raises(HTTPException) as exc_info:
        await validate_voucher_for_checkout(
            test_db_session, d["tenant_id"], d["customer_id"],
            "TETLUXV26", Decimal("500000")
        )
    assert exc_info.value.status_code == 400
    assert "đã sử dụng" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_public_voucher_max_one_per_order(test_db_session, seed_data):
    """2 public vouchers in same order → rejected."""
    d = seed_data
    with pytest.raises(HTTPException) as exc_info:
        await validate_and_calculate_multi_discount(
            test_db_session, d["tenant_id"], d["customer_id"],
            ["TETLUXV26", "SALE50K"], Decimal("500000")
        )
    assert exc_info.value.status_code == 400
    assert "tối đa 1 voucher công khai" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_public_voucher_expired(test_db_session, seed_data):
    """Expired public voucher → rejected."""
    d = seed_data
    with pytest.raises(HTTPException) as exc_info:
        await validate_voucher_for_checkout(
            test_db_session, d["tenant_id"], d["customer_id"],
            "EXPIRED", Decimal("500000")
        )
    assert exc_info.value.status_code == 400
    assert "hết hạn" in str(exc_info.value.detail)


# ---------------------------------------------------------------------------
# Private Voucher Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_private_voucher_assigned_success(test_db_session, seed_data):
    """Private voucher pre-assigned → validates successfully."""
    d = seed_data
    voucher, uv = await validate_voucher_for_checkout(
        test_db_session, d["tenant_id"], d["customer_id"],
        "PRIV50K", Decimal("500000")
    )
    assert voucher.visibility == "private"
    assert uv.is_used is False


@pytest.mark.asyncio
async def test_private_voucher_not_assigned_rejected(test_db_session, seed_data):
    """Private voucher NOT assigned to user → rejected (no auto-assign)."""
    d = seed_data
    with pytest.raises(HTTPException) as exc_info:
        await validate_voucher_for_checkout(
            test_db_session, d["tenant_id"], d["other_customer_id"],
            "PRIV50K", Decimal("500000")
        )
    assert exc_info.value.status_code == 400
    assert "chưa được gán" in str(exc_info.value.detail)


@pytest.mark.asyncio
async def test_private_multiple_unique_per_order(test_db_session, seed_data):
    """3 different private vouchers in same order → all applied."""
    d = seed_data
    results, total_discount = await validate_and_calculate_multi_discount(
        test_db_session, d["tenant_id"], d["customer_id"],
        ["PRIV50K", "PRIV20K", "PRIV10K"], Decimal("500000")
    )
    assert len(results) == 3
    assert total_discount == Decimal("80000.00")  # 50k + 20k + 10k


@pytest.mark.asyncio
async def test_private_same_code_deduplicated(test_db_session, seed_data):
    """Same private code twice → deduplicated to 1."""
    d = seed_data
    results, total_discount = await validate_and_calculate_multi_discount(
        test_db_session, d["tenant_id"], d["customer_id"],
        ["PRIV50K", "PRIV50K"], Decimal("500000")
    )
    assert len(results) == 1
    assert total_discount == Decimal("50000.00")


# ---------------------------------------------------------------------------
# Combined Public + Private Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_public_plus_private_combo(test_db_session, seed_data):
    """1 public + 3 private → all 4 applied (percent first, then fixed)."""
    d = seed_data
    results, total_discount = await validate_and_calculate_multi_discount(
        test_db_session, d["tenant_id"], d["customer_id"],
        ["TETLUXV26", "PRIV50K", "PRIV20K", "PRIV10K"], Decimal("500000")
    )
    assert len(results) == 4
    # Percent first: TETLUXV26 = 20% of 500k = 100k (capped at max_discount_value=100k)
    # Then fixed: PRIV50K = 50k, PRIV20K = 20k, PRIV10K = 10k
    assert total_discount == Decimal("180000.00")


@pytest.mark.asyncio
async def test_public_plus_private_percent_first(test_db_session, seed_data):
    """Percent vouchers applied before fixed, regardless of public/private."""
    d = seed_data
    results, total_discount = await validate_and_calculate_multi_discount(
        test_db_session, d["tenant_id"], d["customer_id"],
        ["PRIV50K", "VIP15"], Decimal("500000")
    )
    assert len(results) == 2
    # VIP15 (percent 15%) first: 15% of 500k = 75k
    # PRIV50K (fixed) on remaining 425k: 50k
    assert total_discount == Decimal("125000.00")


# ---------------------------------------------------------------------------
# Discount Calculation Tests
# ---------------------------------------------------------------------------


def test_calculate_discount_percent():
    voucher = VoucherDB(type="percent", value=Decimal("20"), max_discount_value=None)
    assert calculate_single_discount(voucher, Decimal("500000")) == Decimal("100000.00")


def test_calculate_discount_percent_with_cap():
    voucher = VoucherDB(type="percent", value=Decimal("50"), max_discount_value=Decimal("100000"))
    assert calculate_single_discount(voucher, Decimal("1000000")) == Decimal("100000.00")


def test_calculate_discount_fixed():
    voucher = VoucherDB(type="fixed", value=Decimal("50000"), max_discount_value=None)
    assert calculate_single_discount(voucher, Decimal("200000")) == Decimal("50000.00")


def test_calculate_discount_fixed_exceeds_order():
    voucher = VoucherDB(type="fixed", value=Decimal("100000"), max_discount_value=None)
    assert calculate_single_discount(voucher, Decimal("50000")) == Decimal("50000.00")


# ---------------------------------------------------------------------------
# Apply & Refund Tests
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_apply_vouchers_to_order(test_db_session, seed_data):
    """Apply voucher marks is_used and increments used_count."""
    d = seed_data
    order_id = uuid.uuid4()

    results, _ = await validate_and_calculate_multi_discount(
        test_db_session, d["tenant_id"], d["customer_id"],
        ["PRIV50K"], Decimal("500000")
    )
    await apply_vouchers_to_order(test_db_session, results, order_id)
    await test_db_session.commit()

    voucher, uv = results[0][0], results[0][1]
    await test_db_session.refresh(uv)
    await test_db_session.refresh(voucher)

    assert uv.is_used is True
    assert uv.used_in_order_id == order_id
    assert voucher.used_count == 1


@pytest.mark.asyncio
async def test_refund_vouchers_for_order(test_db_session, seed_data):
    """Cancel order → vouchers refunded."""
    d = seed_data
    order_id = uuid.uuid4()

    results, _ = await validate_and_calculate_multi_discount(
        test_db_session, d["tenant_id"], d["customer_id"],
        ["PRIV20K"], Decimal("500000")
    )
    await apply_vouchers_to_order(test_db_session, results, order_id)
    await test_db_session.commit()

    await refund_vouchers_for_order(test_db_session, order_id)
    await test_db_session.commit()

    voucher, uv = results[0][0], results[0][1]
    await test_db_session.refresh(uv)
    await test_db_session.refresh(voucher)

    assert uv.is_used is False
    assert uv.used_in_order_id is None
    assert voucher.used_count == 0


@pytest.mark.asyncio
async def test_min_order_not_met(test_db_session, seed_data):
    """Voucher min_order_value not met → rejected."""
    d = seed_data
    with pytest.raises(HTTPException) as exc_info:
        await validate_voucher_for_checkout(
            test_db_session, d["tenant_id"], d["customer_id"],
            "TETLUXV26", Decimal("100000")  # min is 200000
        )
    assert exc_info.value.status_code == 400
    assert "tối thiểu" in str(exc_info.value.detail)
