"""Voucher Service - Story 6.3: Owner CRUD for Voucher Management.

Manages voucher CRUD operations with multi-tenant isolation.
Owner-only access enforced at API layer.
"""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import VoucherDB
from src.models.voucher import (
    VoucherCreateRequest,
    VoucherStatsResponse,
    VoucherUpdateRequest,
)


async def list_vouchers(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    is_active: bool | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 20,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[VoucherDB], int]:
    """List vouchers for a tenant with optional filtering and pagination.

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        is_active: Optional filter by active status
        search: Optional search by code or description
        page: Page number (1-based)
        page_size: Items per page
        sort_by: Sort field
        sort_order: Sort direction (asc/desc)

    Returns:
        Tuple of (voucher_list, total_count)
    """
    query = select(VoucherDB).where(VoucherDB.tenant_id == tenant_id)

    if is_active is not None:
        query = query.where(VoucherDB.is_active == is_active)

    if search:
        escaped = search.replace("%", r"\%").replace("_", r"\_")
        search_term = f"%{escaped}%"
        query = query.where(
            VoucherDB.code.ilike(search_term)
            | VoucherDB.description.ilike(search_term)
        )

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Apply sorting
    sort_col = {
        "created_at": VoucherDB.created_at,
        "code": VoucherDB.code,
        "expiry_date": VoucherDB.expiry_date,
        "value": VoucherDB.value,
        "used_count": VoucherDB.used_count,
    }.get(sort_by, VoucherDB.created_at)

    order_fn = asc if sort_order == "asc" else desc
    query = query.order_by(order_fn(sort_col))

    # Apply pagination
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    vouchers = result.scalars().all()

    return list(vouchers), total


async def get_voucher(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    voucher_id: uuid.UUID,
) -> VoucherDB | None:
    """Get a single voucher by ID with tenant isolation."""
    query = select(VoucherDB).where(
        VoucherDB.id == voucher_id,
        VoucherDB.tenant_id == tenant_id,
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_voucher(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: VoucherCreateRequest,
) -> VoucherDB:
    """Create a new voucher (Owner only).

    Validates:
    - Code unique per tenant
    - Percent type: value <= 100
    - Expiry date must be in the future

    Raises:
        HTTPException 400: Validation errors
        HTTPException 409: Duplicate voucher code
    """
    # Validate percent range
    if data.type.value == "percent" and data.value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giảm giá theo phần trăm phải từ 0-100",
        )

    # Validate expiry_date in the future
    if data.expiry_date <= date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải ở tương lai",
        )

    # Validate max_discount_value only for percent type
    if data.type.value == "fixed" and data.max_discount_value is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giảm giá cố định không cần giới hạn tối đa",
        )

    # Check code uniqueness within tenant
    existing = await db.execute(
        select(VoucherDB).where(
            VoucherDB.tenant_id == tenant_id,
            VoucherDB.code == data.code,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mã voucher '{data.code}' đã tồn tại",
        )

    voucher = VoucherDB(
        tenant_id=tenant_id,
        code=data.code,
        type=data.type.value,
        value=data.value,
        min_order_value=data.min_order_value,
        max_discount_value=data.max_discount_value,
        description=data.description,
        expiry_date=data.expiry_date,
        total_uses=data.total_uses,
    )

    db.add(voucher)
    try:
        await db.flush()
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Mã voucher '{data.code}' đã tồn tại",
        )
    await db.refresh(voucher)

    return voucher


async def update_voucher(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    voucher_id: uuid.UUID,
    data: VoucherUpdateRequest,
) -> VoucherDB | None:
    """Update an existing voucher (Owner only).

    Returns:
        Updated VoucherDB instance or None if not found
    """
    voucher = await get_voucher(db, tenant_id, voucher_id)
    if not voucher:
        return None

    update_data = data.model_dump(exclude_unset=True)

    # Determine the effective type after update
    effective_type = update_data.get("type", voucher.type)
    if hasattr(effective_type, "value"):
        effective_type = effective_type.value

    # Determine the effective value after update
    effective_value = update_data.get("value", voucher.value)

    # Validate percent range
    if effective_type == "percent" and effective_value > 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giảm giá theo phần trăm phải từ 0-100",
        )

    # Validate max_discount_value only for percent type
    effective_max_discount = update_data.get("max_discount_value", voucher.max_discount_value)
    if effective_type == "fixed" and effective_max_discount is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Giảm giá cố định không cần giới hạn tối đa",
        )

    # Validate total_uses >= used_count
    if "total_uses" in update_data and update_data["total_uses"] < voucher.used_count:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Số lượt sử dụng không thể nhỏ hơn số đã dùng ({voucher.used_count})",
        )

    # Validate expiry_date not in the past
    if "expiry_date" in update_data and update_data["expiry_date"] <= date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ngày hết hạn phải ở tương lai",
        )

    for key, value in update_data.items():
        if key == "type" and value is not None:
            value = value.value if hasattr(value, "value") else value
        setattr(voucher, key, value)

    voucher.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(voucher)

    return voucher


async def toggle_voucher_active(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    voucher_id: uuid.UUID,
) -> VoucherDB | None:
    """Toggle is_active status of a voucher.

    Returns:
        Updated VoucherDB instance or None if not found
    """
    voucher = await get_voucher(db, tenant_id, voucher_id)
    if not voucher:
        return None

    voucher.is_active = not voucher.is_active
    voucher.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(voucher)

    return voucher


async def delete_voucher(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    voucher_id: uuid.UUID,
) -> bool:
    """Delete a voucher (only if used_count == 0).

    Returns:
        True if deleted, False if not found

    Raises:
        HTTPException 400: If voucher has been used (used_count > 0)
    """
    voucher = await get_voucher(db, tenant_id, voucher_id)
    if not voucher:
        return False

    if voucher.used_count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Không thể xóa voucher đã được sử dụng ({voucher.used_count} lần)",
        )

    await db.delete(voucher)
    await db.flush()
    await db.commit()

    return True


async def get_voucher_stats(
    db: AsyncSession,
    tenant_id: uuid.UUID,
) -> VoucherStatsResponse:
    """Get voucher analytics summary for a tenant.

    Returns:
        VoucherStatsResponse with totals and redemption rate
    """
    # Total vouchers
    total_result = await db.execute(
        select(func.count()).where(VoucherDB.tenant_id == tenant_id)
    )
    total_vouchers = total_result.scalar() or 0

    # Active vouchers
    active_result = await db.execute(
        select(func.count()).where(
            VoucherDB.tenant_id == tenant_id,
            VoucherDB.is_active == True,  # noqa: E712
        )
    )
    active_vouchers = active_result.scalar() or 0

    # Total redemptions and total uses
    stats_result = await db.execute(
        select(
            func.coalesce(func.sum(VoucherDB.used_count), 0),
            func.coalesce(func.sum(VoucherDB.total_uses), 0),
        ).where(VoucherDB.tenant_id == tenant_id)
    )
    row = stats_result.one()
    total_redemptions = int(row[0])
    total_uses = int(row[1])

    redemption_rate = (total_redemptions / total_uses * 100) if total_uses > 0 else 0.0

    return VoucherStatsResponse(
        total_vouchers=total_vouchers,
        active_vouchers=active_vouchers,
        total_redemptions=total_redemptions,
        redemption_rate=round(redemption_rate, 1),
    )
