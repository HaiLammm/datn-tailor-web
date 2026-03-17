"""KPI Dashboard API Router (Story 5.1).

Authenticated endpoint for Owner role only.
Returns aggregated KPI data for the Morning Command Center dashboard.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, TenantId
from src.core.database import get_db
from src.services import kpi_service

router = APIRouter(prefix="/api/v1/kpi", tags=["kpi"])


@router.get(
    "/quick-glance",
    response_model=dict,
    summary="KPI Quick Glance (Owner only)",
    description="Returns aggregated KPI data: revenue, order stats, production alerts, and today's appointments.",
)
async def get_quick_glance(
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
    chart_range: str = Query(default="week", pattern="^(week|month)$", description="Chart range: week (7 days) or month (30 days)"),
) -> dict:
    """Get KPI quick-glance data for Owner Dashboard.

    Requires Owner role authentication.
    All calculations are server-side (Authoritative Server Pattern).

    Returns:
        API Response Wrapper: {"data": {KPIQuickGlanceResponse}, "meta": {}}
    """
    result = await kpi_service.get_quick_glance(db, tenant_id, chart_range=chart_range)
    return {"data": result.model_dump(mode="json"), "meta": {}}
