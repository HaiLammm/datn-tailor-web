"""Pydantic schemas for Order and OrderItem (Story 3.3)."""

import re
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

_VN_PHONE_RE = re.compile(r"^(0[35789])\d{8}$")


class PaymentMethod(str, Enum):
    """Supported payment methods."""

    cod = "cod"
    vnpay = "vnpay"
    momo = "momo"
    internal = "internal"


class OrderStatus(str, Enum):
    """Order lifecycle statuses."""

    pending = "pending"
    confirmed = "confirmed"
    in_progress = "in_progress"
    checked = "checked"
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"


class PaymentStatus(str, Enum):
    """Payment status for orders and transactions."""

    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


class ShippingAddress(BaseModel):
    """Vietnamese shipping address format."""

    province: str = Field(..., min_length=1, description="Tinh/Thanh pho")
    district: str = Field(..., min_length=1, description="Quan/Huyen")
    ward: str = Field(..., min_length=1, description="Phuong/Xa")
    address_detail: str = Field(..., min_length=5, description="So nha, ten duong")


class OrderItemCreate(BaseModel):
    """Schema for creating an order item."""

    garment_id: UUID
    transaction_type: str = Field(..., pattern=r"^(buy|rent)$")
    size: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    rental_days: int | None = Field(None, ge=1)


class OrderCreate(BaseModel):
    """Schema for creating an order."""

    customer_name: str = Field(..., min_length=2, max_length=255)
    customer_phone: str = Field(..., max_length=20)
    shipping_address: ShippingAddress
    shipping_note: str | None = Field(None, max_length=500)
    payment_method: PaymentMethod = PaymentMethod.cod
    items: list[OrderItemCreate] = Field(..., min_length=1)
    voucher_codes: list[str] = Field(default_factory=list)

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate Vietnamese phone number format."""
        cleaned = v.strip()
        if not _VN_PHONE_RE.match(cleaned):
            msg = "So dien thoai khong hop le (VN format: 0xx xxx xxxx)"
            raise ValueError(msg)
        return cleaned


class OrderItemResponse(BaseModel):
    """Schema for order item in response."""

    garment_id: UUID
    garment_name: str
    image_url: str | None = None
    transaction_type: str
    size: str | None = None
    rental_days: int | None = None
    unit_price: Decimal
    total_price: Decimal

    model_config = {"from_attributes": True}


class OrderResponse(BaseModel):
    """Schema for order response."""

    id: UUID
    status: OrderStatus
    payment_status: PaymentStatus = PaymentStatus.pending
    subtotal_amount: Decimal
    discount_amount: Decimal = Decimal("0")
    total_amount: Decimal
    applied_voucher_ids: list[str] = []
    payment_method: PaymentMethod
    payment_url: str | None = None
    customer_name: str
    customer_phone: str
    shipping_address: ShippingAddress | None = None
    shipping_note: str | None = None
    is_internal: bool = False
    items: list[OrderItemResponse] = []
    created_at: datetime

    model_config = {"from_attributes": True}


class InternalOrderCreate(BaseModel):
    """Schema for creating an internal (Owner production) order."""

    items: list[OrderItemCreate] = Field(..., min_length=1)
    notes: str | None = Field(None, max_length=500)


class PaginationMeta(BaseModel):
    """Pagination metadata for list responses."""

    page: int
    page_size: int
    total: int
    total_pages: int


class OrderFilterParams(BaseModel):
    """Query params for filtering the order list."""

    status: list[OrderStatus] | None = None
    payment_status: list[PaymentStatus] | None = None
    transaction_type: str | None = Field(None, pattern=r"^(buy|rent)$")
    is_internal: bool | None = None
    search: str | None = Field(None, max_length=255)
    page: int = Field(1, ge=1)
    page_size: int = Field(20, ge=1, le=100)
    sort_by: str = Field("created_at", pattern=r"^(created_at|total_amount|status)$")
    sort_order: str = Field("desc", pattern=r"^(asc|desc)$")


class OrderListItem(BaseModel):
    """Order summary row for list view."""

    id: UUID
    status: OrderStatus
    payment_status: PaymentStatus
    subtotal_amount: Decimal
    discount_amount: Decimal = Decimal("0")
    total_amount: Decimal
    payment_method: PaymentMethod
    customer_name: str
    customer_phone: str
    is_internal: bool = False
    transaction_types: list[str] = []
    created_at: datetime
    next_valid_status: str | None = None

    model_config = {"from_attributes": True}


class OrderListResponse(BaseModel):
    """Response for paginated order list."""

    data: list[OrderListItem]
    meta: PaginationMeta


class OrderStatusUpdate(BaseModel):
    """Request body for status update."""

    status: OrderStatus


class PaymentTransactionResponse(BaseModel):
    """Schema for payment transaction response."""

    id: UUID
    order_id: UUID
    provider: str
    transaction_id: str
    amount: Decimal
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}
