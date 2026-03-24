"""Pydantic schemas for Customer-facing Order API (Story 4.4c)."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel


class CustomerOrderItemResponse(BaseModel):
    """Order item in customer view with rental-specific fields."""

    garment_id: UUID
    garment_name: str
    image_url: str | None = None
    transaction_type: str  # 'buy' | 'rent'
    size: str | None = None
    quantity: int = 1
    unit_price: Decimal
    total_price: Decimal
    # Rental-specific
    start_date: date | None = None
    end_date: date | None = None
    rental_days: int | None = None
    rental_status: str | None = None  # 'active', 'overdue', 'returned'
    deposit_amount: Decimal | None = None

    model_config = {"from_attributes": True}


class OrderTimelineEntry(BaseModel):
    """Single status entry in order timeline."""

    status: str
    timestamp: datetime
    description: str


class CustomerOrderDeliveryInfo(BaseModel):
    """Delivery/shipping info in order detail."""

    recipient_name: str
    phone: str
    address: str
    notes: str | None = None


class CustomerOrderSummary(BaseModel):
    """Order summary row for list view."""

    id: UUID
    order_number: str
    total_amount: Decimal
    status: str
    payment_status: str
    order_type: str  # 'buy' | 'rental' | 'mixed'
    created_at: datetime

    model_config = {"from_attributes": True}


class TailorInfoForCustomer(BaseModel):
    """Tailor info visible to customer — privacy-safe fields only."""

    full_name: str
    avatar_url: str | None = None
    role: str
    experience_years: int | None = None
    production_step: str
    garment_name: str


class CustomerOrderDetail(BaseModel):
    """Full order detail including items, delivery info, and timeline."""

    id: UUID
    order_number: str
    total_amount: Decimal
    status: str
    payment_status: str
    order_type: str
    created_at: datetime
    payment_method: str
    shipping_note: str | None = None
    items: list[CustomerOrderItemResponse] = []
    delivery_info: CustomerOrderDeliveryInfo
    timeline: list[OrderTimelineEntry] = []
    tailor_info: list[TailorInfoForCustomer] | None = None

    model_config = {"from_attributes": True}


class CustomerOrderListMeta(BaseModel):
    """Pagination metadata for customer order list."""

    total: int
    page: int
    limit: int
    total_pages: int


class CustomerOrderListResponse(BaseModel):
    """Paginated response for customer order list."""

    data: list[CustomerOrderSummary]
    meta: CustomerOrderListMeta
