"""Pydantic schemas for KPI Dashboard (Story 5.1)."""

from pydantic import BaseModel, Field


class RevenueSummary(BaseModel):
    """Revenue summary with trend indicators."""

    daily: float = Field(default=0, description="Doanh thu hôm nay")
    daily_previous: float = Field(default=0, description="Doanh thu hôm qua")
    daily_trend: float = Field(default=0, description="% thay đổi so với hôm qua")
    weekly: float = Field(default=0, description="Doanh thu tuần này")
    weekly_previous: float = Field(default=0, description="Doanh thu tuần trước")
    weekly_trend: float = Field(default=0, description="% thay đổi so với tuần trước")
    monthly: float = Field(default=0, description="Doanh thu tháng này")
    monthly_previous: float = Field(default=0, description="Doanh thu tháng trước")
    monthly_trend: float = Field(default=0, description="% thay đổi so với tháng trước")


class OrderStatusCount(BaseModel):
    """Order count by status."""

    status: str
    count: int


class OrderTypeCount(BaseModel):
    """Order count by transaction type (buy/rent)."""

    transaction_type: str
    count: int


class OrderStats(BaseModel):
    """Order statistics breakdown."""

    total: int = 0
    by_status: list[OrderStatusCount] = []
    by_type: list[OrderTypeCount] = []


class ProductionAlert(BaseModel):
    """Production alert for orders needing attention."""

    order_id: str
    customer_name: str
    garment_name: str
    order_date: str
    days_since_order: int


class AppointmentToday(BaseModel):
    """Appointment scheduled for today."""

    id: str
    customer_name: str
    customer_phone: str
    slot: str
    status: str
    special_requests: str | None = None


class DailyRevenue(BaseModel):
    """Revenue for a single day (for chart)."""

    date: str
    amount: float


class KPIQuickGlanceResponse(BaseModel):
    """Complete KPI dashboard response."""

    revenue: RevenueSummary = RevenueSummary()
    orders: OrderStats = OrderStats()
    production_alerts: list[ProductionAlert] = []
    appointments_today: list[AppointmentToday] = []
    revenue_chart: list[DailyRevenue] = []
