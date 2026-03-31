"""Rental management business logic (Story 4.3)."""

import logging
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import Date, Integer, and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import GarmentDB, OrderDB, OrderItemDB, RentalReturnDB
from src.models.rental import (
    ProcessReturnInput,
    ProcessReturnResponse,
    RentalDetailResponse,
    RentalListItem,
    RentalListParams,
    RentalListResponse,
    RentalStats,
    ReturnCondition,
)

logger = logging.getLogger(__name__)


async def list_rentals(
    db: AsyncSession, tenant_id: UUID, params: RentalListParams
) -> RentalListResponse:
    """List rental items with filtering, pagination, and sorting (Story 4.3).

    Backend is SSOT for rental status. Computes status based on current date vs end_date.
    """

    # Build filter conditions
    filters = [OrderItemDB.transaction_type == "rent"]

    # Filter by rental_status
    if params.status:
        if params.status == "returned":
            filters.append(OrderItemDB.rental_status == "returned")
        elif params.status == "overdue":
            filters.append(
                and_(
                    OrderItemDB.rental_status != "returned",
                    OrderItemDB.end_date < func.current_date(),
                )
            )
        elif params.status == "active":
            filters.append(
                and_(
                    OrderItemDB.rental_status != "returned",
                    OrderItemDB.end_date >= func.current_date(),
                )
            )

    # Search filter: escape wildcards to prevent SQL injection (Story 4.2 learning)
    if params.search:
        escaped_search = params.search.replace("%", "\\%").replace("_", "\\_")
        search_pattern = f"%{escaped_search}%"
        filters.append(
            or_(
                GarmentDB.name.ilike(search_pattern, escape="\\"),
                OrderDB.customer_name.ilike(search_pattern, escape="\\"),
                OrderDB.customer_phone.ilike(search_pattern, escape="\\"),
            )
        )

    # Query with joins to get customer info from orders table
    query = (
        select(
            OrderItemDB.id.label("order_item_id"),
            OrderItemDB.garment_id,
            GarmentDB.name.label("garment_name"),
            GarmentDB.image_url,
            GarmentDB.category,
            OrderItemDB.start_date,
            OrderItemDB.end_date,
            OrderItemDB.rental_days,
            OrderItemDB.unit_price,
            OrderItemDB.deposit_amount,
            OrderItemDB.rental_status,
            OrderDB.customer_name,
            OrderDB.customer_phone,
            (OrderItemDB.end_date - func.current_date()).label("days_remaining"),
        )
        .select_from(OrderItemDB)
        .join(GarmentDB, OrderItemDB.garment_id == GarmentDB.id)
        .join(OrderDB, OrderItemDB.order_id == OrderDB.id)
        .where(*filters, GarmentDB.tenant_id == tenant_id)
    )

    # Count total for pagination
    count_query = (
        select(func.count(OrderItemDB.id))
        .select_from(OrderItemDB)
        .join(GarmentDB, OrderItemDB.garment_id == GarmentDB.id)
        .join(OrderDB, OrderItemDB.order_id == OrderDB.id)
        .where(*filters, GarmentDB.tenant_id == tenant_id)
    )
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Sort
    if params.sort_by == "days_remaining":
        query = query.order_by("days_remaining")
    elif params.sort_by == "customer_name":
        query = query.order_by(OrderDB.customer_name)
    else:  # end_date (default)
        # Overdue items first, then by end_date
        query = query.order_by(
            case(
                (OrderItemDB.end_date < func.current_date(), 0),  # Overdue first
                else_=1,
            ),
            OrderItemDB.end_date,
        )

    # Pagination
    offset = (params.page - 1) * params.page_size
    query = query.offset(offset).limit(params.page_size)

    result = await db.execute(query)
    rows = result.all()

    items = [
        RentalListItem(
            order_item_id=row.order_item_id,
            garment_id=row.garment_id,
            garment_name=row.garment_name,
            customer_name=row.customer_name,
            customer_phone=row.customer_phone,
            start_date=row.start_date,
            end_date=row.end_date,
            rental_days=row.rental_days,
            days_remaining=row.days_remaining or 0,
            rental_status=row.rental_status or "active",
            deposit_amount=row.deposit_amount or Decimal("0"),
            unit_price=row.unit_price,
            image_url=row.image_url,
        )
        for row in rows
    ]

    total_pages = (total + params.page_size - 1) // params.page_size
    meta = {
        "pagination": {
            "total": total,
            "page": params.page,
            "page_size": params.page_size,
            "total_pages": total_pages,
        }
    }

    return RentalListResponse(data=items, meta=meta)


async def get_rental_stats(db: AsyncSession, tenant_id: UUID) -> RentalStats:
    """Get rental statistics summary (Story 4.3)."""

    from datetime import date, timedelta

    today = date.today()

    # Reusable condition: not returned (handles NULL rental_status from pre-migration rows)
    not_returned = or_(
        OrderItemDB.rental_status.is_(None),
        OrderItemDB.rental_status != "returned",
    )

    # Count active rentals (not returned, not overdue)
    active_query = (
        select(func.count())
        .select_from(OrderItemDB)
        .join(GarmentDB, OrderItemDB.garment_id == GarmentDB.id)
        .where(
            OrderItemDB.transaction_type == "rent",
            not_returned,
            OrderItemDB.end_date >= func.current_date(),
            GarmentDB.tenant_id == tenant_id,
        )
    )
    active_count = await db.execute(active_query)
    active = active_count.scalar() or 0

    # Count overdue rentals
    overdue_query = (
        select(func.count())
        .select_from(OrderItemDB)
        .join(GarmentDB, OrderItemDB.garment_id == GarmentDB.id)
        .where(
            OrderItemDB.transaction_type == "rent",
            not_returned,
            OrderItemDB.end_date < func.current_date(),
            GarmentDB.tenant_id == tenant_id,
        )
    )
    overdue_count = await db.execute(overdue_query)
    overdue = overdue_count.scalar() or 0

    # Count returns due this week
    week_end = today + timedelta(days=7)
    due_week_query = (
        select(func.count())
        .select_from(OrderItemDB)
        .join(GarmentDB, OrderItemDB.garment_id == GarmentDB.id)
        .where(
            OrderItemDB.transaction_type == "rent",
            not_returned,
            OrderItemDB.end_date.between(today, week_end),
            GarmentDB.tenant_id == tenant_id,
        )
    )
    due_week_count = await db.execute(due_week_query)
    due_week = due_week_count.scalar() or 0

    # Count returned this month — cast TIMESTAMPTZ to DATE for correct comparison
    month_start = date(today.year, today.month, 1)
    returned_month_query = (
        select(func.count())
        .select_from(RentalReturnDB)
        .where(
            func.cast(RentalReturnDB.returned_at, Date) >= month_start,
            func.cast(RentalReturnDB.returned_at, Date) <= today,
            RentalReturnDB.tenant_id == tenant_id,
        )
    )
    returned_month_count = await db.execute(returned_month_query)
    returned_month = returned_month_count.scalar() or 0

    return RentalStats(
        active_rentals=active,
        overdue_rentals=overdue,
        due_this_week=due_week,
        returned_this_month=returned_month,
    )


async def process_return(
    db: AsyncSession,
    tenant_id: UUID,
    order_item_id: UUID,
    return_data: ProcessReturnInput,
    processed_by_id: UUID | None = None,
) -> ProcessReturnResponse:
    """Process return of a rental item with row locking (Story 4.3).

    Backend handles all status transitions to prevent race conditions.
    Uses FOR UPDATE to lock rows during processing.
    """

    # Lock order_item row — JOIN through order to enforce tenant isolation
    result = await db.execute(
        select(OrderItemDB)
        .join(OrderDB, OrderItemDB.order_id == OrderDB.id)
        .where(
            OrderItemDB.id == order_item_id,
            OrderDB.tenant_id == tenant_id,
        )
        .with_for_update()
    )
    order_item = result.scalar_one_or_none()

    if not order_item:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ERR_ORDER_ITEM_NOT_FOUND",
                    "message": "Don hang khong ton tai",
                }
            },
        )

    # Validate rental item
    if order_item.transaction_type != "rent":
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_NOT_RENTAL",
                    "message": "San pham nay khong phai thue",
                }
            },
        )

    if order_item.rental_status == "returned":
        raise HTTPException(
            status_code=422,
            detail={
                "error": {
                    "code": "ERR_ALREADY_RETURNED",
                    "message": "San pham da duoc tra roi",
                }
            },
        )

    # Lock garment row
    garment_result = await db.execute(
        select(GarmentDB)
        .where(GarmentDB.id == order_item.garment_id)
        .with_for_update()
    )
    garment = garment_result.scalar_one_or_none()

    if not garment:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ERR_GARMENT_NOT_FOUND",
                    "message": "San pham khong ton tai",
                }
            },
        )

    # Create rental_returns record
    rental_return = RentalReturnDB(
        tenant_id=tenant_id,
        order_item_id=order_item_id,
        garment_id=order_item.garment_id,
        return_condition=return_data.return_condition.value,
        damage_notes=return_data.damage_notes,
        deposit_deduction=return_data.deposit_deduction,
        processed_by=processed_by_id,
    )
    db.add(rental_return)

    # Update order_item status
    order_item.rental_status = "returned"

    # Update garment status based on condition
    if return_data.return_condition == ReturnCondition.good:
        garment.status = "available"
        garment.quantity += 1
        # Clear renter fields for good condition
        garment.renter_id = None
        garment.renter_name = None
        garment.renter_email = None
        garment.expected_return_date = None
    elif return_data.return_condition == ReturnCondition.damaged:
        garment.status = "maintenance"
        # Clear renter fields for damaged
        garment.renter_id = None
        garment.renter_name = None
        garment.renter_email = None
        garment.expected_return_date = None
    elif return_data.return_condition == ReturnCondition.lost:
        garment.status = "lost"
        # Keep renter info for accountability

    await db.flush()
    await db.commit()

    return ProcessReturnResponse(
        order_item_id=order_item_id,
        garment_id=order_item.garment_id,
        return_condition=return_data.return_condition.value,
        deposit_deduction=return_data.deposit_deduction,
        damage_notes=return_data.damage_notes,
        returned_at=rental_return.returned_at,
    )


async def get_rental_detail(
    db: AsyncSession, tenant_id: UUID, order_item_id: UUID
) -> RentalDetailResponse:
    """Get detailed information about a rental item (Story 4.3)."""

    # Query rental item with all related info
    result = await db.execute(
        select(
            OrderItemDB.id.label("order_item_id"),
            OrderItemDB.garment_id,
            OrderItemDB.order_id,
            OrderItemDB.start_date,
            OrderItemDB.end_date,
            OrderItemDB.rental_days,
            OrderItemDB.unit_price,
            OrderItemDB.deposit_amount,
            OrderItemDB.rental_status,
            GarmentDB.name.label("garment_name"),
            GarmentDB.image_url,
            GarmentDB.category,
            OrderDB.customer_name,
            OrderDB.customer_phone,
            (OrderItemDB.end_date - func.current_date()).label("days_remaining"),
        )
        .select_from(OrderItemDB)
        .join(GarmentDB, OrderItemDB.garment_id == GarmentDB.id)
        .join(OrderDB, OrderItemDB.order_id == OrderDB.id)
        .where(
            OrderItemDB.id == order_item_id,
            GarmentDB.tenant_id == tenant_id,
        )
    )

    row = result.one_or_none()

    if not row:
        raise HTTPException(
            status_code=404,
            detail={
                "error": {
                    "code": "ERR_RENTAL_NOT_FOUND",
                    "message": "Don hang thue khong ton tai",
                }
            },
        )

    # Get latest return history if exists
    return_history_result = await db.execute(
        select(RentalReturnDB)
        .where(RentalReturnDB.order_item_id == order_item_id)
        .order_by(RentalReturnDB.returned_at.desc())
        .limit(1)
    )
    latest_return = return_history_result.scalar_one_or_none()

    return_history = None
    if latest_return:
        return_history = {
            "return_condition": latest_return.return_condition,
            "damage_notes": latest_return.damage_notes,
            "returned_at": latest_return.returned_at,
        }

    return RentalDetailResponse(
        order_item_id=row.order_item_id,
        garment_id=row.garment_id,
        garment_name=row.garment_name,
        image_url=row.image_url,
        category=row.category,
        customer_name=row.customer_name,
        customer_phone=row.customer_phone,
        customer_email=None,  # Customer email not tracked in current schema
        start_date=row.start_date,
        end_date=row.end_date,
        rental_days=row.rental_days,
        days_remaining=row.days_remaining or 0,
        rental_status=row.rental_status or "active",
        deposit_amount=row.deposit_amount or Decimal("0"),
        unit_price=row.unit_price,
        order_id=row.order_id,
        return_history=return_history,
    )
