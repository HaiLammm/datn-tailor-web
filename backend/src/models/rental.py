"""Pydantic schemas for Rental Management (Story 4.3)."""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class RentalStatus(str, Enum):
    """Rental item status."""

    active = "active"
    overdue = "overdue"
    returned = "returned"


class ReturnCondition(str, Enum):
    """Condition of returned rental item."""

    good = "good"
    damaged = "damaged"
    lost = "lost"


class RentalListItem(BaseModel):
    """Schema for a rental item in list response."""

    order_item_id: UUID
    garment_id: UUID
    garment_name: str
    customer_name: str
    customer_phone: str
    start_date: date
    end_date: date
    rental_days: int
    days_remaining: int  # Computed: end_date - today
    rental_status: str  # 'active', 'overdue', 'returned'
    deposit_amount: Decimal
    unit_price: Decimal
    image_url: str | None = None

    model_config = {"from_attributes": True}


class RentalListParams(BaseModel):
    """Filter parameters for rental list."""

    status: str | None = Field(None, pattern=r"^(active|overdue|returned)$")
    search: str | None = Field(None, max_length=255)  # Search by garment name, customer name, or phone
    sort_by: str = Field("end_date", pattern=r"^(end_date|days_remaining|customer_name)$")
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)


class RentalListResponse(BaseModel):
    """Response for rental list endpoint."""

    data: list[RentalListItem]
    meta: dict = Field(
        default_factory=dict,
        description="Pagination metadata: {pagination: {total, page, page_size, total_pages}}"
    )


class RentalStats(BaseModel):
    """Summary statistics for rental dashboard."""

    active_rentals: int = Field(..., description="Dang thue count")
    overdue_rentals: int = Field(..., description="Qua han count")
    due_this_week: int = Field(..., description="Tra trong tuan count")
    returned_this_month: int = Field(..., description="Da tra thang nay count")


class ProcessReturnInput(BaseModel):
    """Schema for processing return of rental item."""

    return_condition: ReturnCondition
    damage_notes: str | None = Field(None, max_length=500)
    deposit_deduction: Decimal = Field(..., ge=0)


class ProcessReturnResponse(BaseModel):
    """Response after processing return."""

    order_item_id: UUID
    garment_id: UUID
    return_condition: str
    deposit_deduction: Decimal
    damage_notes: str | None = None
    returned_at: datetime

    model_config = {"from_attributes": True}


class RentalDetailResponse(BaseModel):
    """Detail view of a single rental item."""

    order_item_id: UUID
    garment_id: UUID
    garment_name: str
    image_url: str | None = None
    category: str
    customer_name: str
    customer_phone: str
    customer_email: str | None = None
    start_date: date
    end_date: date
    rental_days: int
    days_remaining: int
    rental_status: str
    deposit_amount: Decimal
    unit_price: Decimal
    order_id: UUID
    return_history: dict | None = None  # Latest return if exists

    model_config = {"from_attributes": True}
