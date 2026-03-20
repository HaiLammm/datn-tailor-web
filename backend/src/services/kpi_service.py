"""KPI aggregation service for Owner Dashboard (Story 5.1).

All revenue and order calculations happen here (Authoritative Server Pattern).
Frontend only renders pre-calculated data.
"""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import case, distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import AppointmentDB, OrderDB, OrderItemDB
from src.models.kpi import (
    AppointmentToday,
    DailyRevenue,
    KPIQuickGlanceResponse,
    OrderStats,
    OrderStatusCount,
    OrderTypeCount,
    ProductionAlert,
    RevenueSummary,
)


def _start_of_week(d: date) -> date:
    """Return Monday of the week containing date d."""
    return d - timedelta(days=d.weekday())


def _start_of_month(d: date) -> date:
    """Return first day of the month containing date d."""
    return d.replace(day=1)


async def _get_revenue_summary(
    db: AsyncSession, tenant_id: uuid.UUID, today: date
) -> RevenueSummary:
    """Calculate revenue summary with trend indicators."""
    yesterday = today - timedelta(days=1)
    week_start = _start_of_week(today)
    prev_week_start = week_start - timedelta(days=7)
    month_start = _start_of_month(today)
    prev_month_start = (month_start - timedelta(days=1)).replace(day=1)
    prev_month_end = month_start - timedelta(days=1)

    # Build a single query with conditional aggregation
    today_start = datetime(today.year, today.month, today.day, tzinfo=timezone.utc)
    today_end = today_start + timedelta(days=1)
    yesterday_start = datetime(yesterday.year, yesterday.month, yesterday.day, tzinfo=timezone.utc)
    yesterday_end = yesterday_start + timedelta(days=1)
    week_start_dt = datetime(week_start.year, week_start.month, week_start.day, tzinfo=timezone.utc)
    prev_week_start_dt = datetime(prev_week_start.year, prev_week_start.month, prev_week_start.day, tzinfo=timezone.utc)
    month_start_dt = datetime(month_start.year, month_start.month, month_start.day, tzinfo=timezone.utc)
    prev_month_start_dt = datetime(prev_month_start.year, prev_month_start.month, prev_month_start.day, tzinfo=timezone.utc)
    prev_month_end_dt = datetime(prev_month_end.year, prev_month_end.month, prev_month_end.day, tzinfo=timezone.utc) + timedelta(days=1)

    # Use >= and < for correct boundary handling (avoid double-counting at period edges)
    base = select(
        func.coalesce(
            func.sum(
                case(
                    (
                        (OrderDB.created_at >= today_start) & (OrderDB.created_at < today_end),
                        OrderDB.total_amount,
                    )
                )
            ),
            0,
        ).label("daily"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (OrderDB.created_at >= yesterday_start) & (OrderDB.created_at < yesterday_end),
                        OrderDB.total_amount,
                    )
                )
            ),
            0,
        ).label("daily_prev"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (OrderDB.created_at >= week_start_dt) & (OrderDB.created_at < today_end),
                        OrderDB.total_amount,
                    )
                )
            ),
            0,
        ).label("weekly"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (OrderDB.created_at >= prev_week_start_dt) & (OrderDB.created_at < week_start_dt),
                        OrderDB.total_amount,
                    )
                )
            ),
            0,
        ).label("weekly_prev"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (OrderDB.created_at >= month_start_dt) & (OrderDB.created_at < today_end),
                        OrderDB.total_amount,
                    )
                )
            ),
            0,
        ).label("monthly"),
        func.coalesce(
            func.sum(
                case(
                    (
                        (OrderDB.created_at >= prev_month_start_dt) & (OrderDB.created_at < month_start_dt),
                        OrderDB.total_amount,
                    )
                )
            ),
            0,
        ).label("monthly_prev"),
    ).where(OrderDB.tenant_id == tenant_id, OrderDB.status != "cancelled")

    result = (await db.execute(base)).one()

    daily = float(result.daily)
    daily_prev = float(result.daily_prev)
    weekly = float(result.weekly)
    weekly_prev = float(result.weekly_prev)
    monthly = float(result.monthly)
    monthly_prev = float(result.monthly_prev)

    def trend(current: float, previous: float) -> float:
        if previous == 0:
            return 100.0 if current > 0 else 0.0
        return round(((current - previous) / previous) * 100, 1)

    return RevenueSummary(
        daily=daily,
        daily_previous=daily_prev,
        daily_trend=trend(daily, daily_prev),
        weekly=weekly,
        weekly_previous=weekly_prev,
        weekly_trend=trend(weekly, weekly_prev),
        monthly=monthly,
        monthly_previous=monthly_prev,
        monthly_trend=trend(monthly, monthly_prev),
    )


async def _get_order_stats(db: AsyncSession, tenant_id: uuid.UUID) -> OrderStats:
    """Get order count breakdown by status and type."""
    # Count by status
    status_query = (
        select(OrderDB.status, func.count().label("cnt"))
        .where(OrderDB.tenant_id == tenant_id)
        .group_by(OrderDB.status)
    )
    status_rows = (await db.execute(status_query)).all()
    by_status = [OrderStatusCount(status=row.status, count=row.cnt) for row in status_rows]

    # Count by transaction type (from order_items)
    type_query = (
        select(OrderItemDB.transaction_type, func.count(distinct(OrderItemDB.order_id)).label("cnt"))
        .join(OrderDB, OrderItemDB.order_id == OrderDB.id)
        .where(OrderDB.tenant_id == tenant_id)
        .group_by(OrderItemDB.transaction_type)
    )
    type_rows = (await db.execute(type_query)).all()
    by_type = [OrderTypeCount(transaction_type=row.transaction_type, count=row.cnt) for row in type_rows]

    total = sum(s.count for s in by_status)

    return OrderStats(total=total, by_status=by_status, by_type=by_type)


async def _get_production_alerts(
    db: AsyncSession, tenant_id: uuid.UUID, today: date
) -> list[ProductionAlert]:
    """Get orders in production for more than 7 days (deadline alert)."""
    seven_days_ago = datetime(
        today.year, today.month, today.day, tzinfo=timezone.utc
    ) - timedelta(days=7)

    query = (
        select(
            OrderDB.id,
            OrderDB.customer_name,
            OrderDB.created_at,
            OrderItemDB.garment_id,
        )
        .join(OrderItemDB, OrderItemDB.order_id == OrderDB.id)
        .where(
            OrderDB.tenant_id == tenant_id,
            OrderDB.status.in_(["in_progress", "checked"]),
            OrderDB.created_at <= seven_days_ago,
        )
        .order_by(OrderDB.created_at.asc())
        .limit(10)
    )
    rows = (await db.execute(query)).all()

    alerts: list[ProductionAlert] = []
    for row in rows:
        days_since = (datetime.now(timezone.utc) - row.created_at).days
        alerts.append(
            ProductionAlert(
                order_id=str(row.id),
                customer_name=row.customer_name,
                garment_name=f"Đơn #{str(row.id)[:8]}",
                order_date=row.created_at.strftime("%Y-%m-%d"),
                days_since_order=days_since,
            )
        )

    return alerts


async def _get_appointments_today(
    db: AsyncSession, tenant_id: uuid.UUID, today: date
) -> list[AppointmentToday]:
    """Get all appointments scheduled for today."""
    query = (
        select(AppointmentDB)
        .where(
            AppointmentDB.tenant_id == tenant_id,
            AppointmentDB.appointment_date == today,
        )
        .order_by(AppointmentDB.slot.asc(), AppointmentDB.created_at.asc())
    )
    rows = (await db.execute(query)).scalars().all()

    return [
        AppointmentToday(
            id=str(a.id),
            customer_name=a.customer_name,
            customer_phone=a.customer_phone,
            slot=a.slot,
            status=a.status,
            special_requests=a.special_requests,
        )
        for a in rows
    ]


async def _get_revenue_chart(
    db: AsyncSession, tenant_id: uuid.UUID, today: date, chart_days: int = 7
) -> list[DailyRevenue]:
    """Get daily revenue for the last N days (for bar chart)."""
    start = today - timedelta(days=chart_days - 1)
    start_dt = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)

    query = (
        select(
            func.date(OrderDB.created_at).label("day"),
            func.coalesce(func.sum(OrderDB.total_amount), 0).label("amount"),
        )
        .where(
            OrderDB.tenant_id == tenant_id,
            OrderDB.status != "cancelled",
            OrderDB.created_at >= start_dt,
        )
        .group_by(func.date(OrderDB.created_at))
        .order_by(func.date(OrderDB.created_at))
    )
    rows = (await db.execute(query)).all()

    # Fill in missing days with 0
    revenue_map = {str(row.day): float(row.amount) for row in rows}
    chart: list[DailyRevenue] = []
    for i in range(chart_days):
        d = start + timedelta(days=i)
        chart.append(DailyRevenue(date=str(d), amount=revenue_map.get(str(d), 0)))

    return chart


async def get_quick_glance(
    db: AsyncSession, tenant_id: uuid.UUID, chart_range: str = "week"
) -> KPIQuickGlanceResponse:
    """Aggregate all KPI data for Owner Dashboard quick-glance view.

    This is the main entry point called by the API endpoint.
    All calculations are server-side (Authoritative Server Pattern).

    Args:
        chart_range: "week" (7 days) or "month" (30 days) for revenue chart.
    """
    today = date.today()
    chart_days = 30 if chart_range == "month" else 7

    revenue = await _get_revenue_summary(db, tenant_id, today)
    orders = await _get_order_stats(db, tenant_id)
    production_alerts = await _get_production_alerts(db, tenant_id, today)
    appointments_today = await _get_appointments_today(db, tenant_id, today)
    revenue_chart = await _get_revenue_chart(db, tenant_id, today, chart_days)

    return KPIQuickGlanceResponse(
        revenue=revenue,
        orders=orders,
        production_alerts=production_alerts,
        appointments_today=appointments_today,
        revenue_chart=revenue_chart,
    )
