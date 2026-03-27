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
    """Order lifecycle statuses — expanded for Epic 10 Unified Order Workflow."""

    # --- Existing statuses (backward compatible) ---
    pending = "pending"
    confirmed = "confirmed"
    in_progress = "in_progress"  # Legacy — kept for backward compatibility
    checked = "checked"          # Legacy — kept for backward compatibility
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    # --- Epic 10: New statuses by service_type ---
    pending_measurement = "pending_measurement"  # Bespoke only — chờ xác nhận số đo
    preparing = "preparing"                      # Buy/Rent — đang chuẩn bị (sub-steps)
    ready_to_ship = "ready_to_ship"              # Sẵn sàng giao hàng
    ready_for_pickup = "ready_for_pickup"        # Sẵn sàng nhận tại tiệm
    in_production = "in_production"              # Bespoke only — đang trong sản xuất
    renting = "renting"                          # Rent only — khách đang giữ đồ thuê
    returned = "returned"                        # Rent only — khách đã trả đồ
    completed = "completed"                      # Hoàn tất toàn bộ lifecycle


class ServiceType(str, Enum):
    """Service type for Epic 10 Unified Order Workflow."""

    buy = "buy"          # Mua sẵn — thanh toán 100% upfront
    rent = "rent"        # Thuê — Deposit + Security Deposit + Remaining
    bespoke = "bespoke"  # Đặt may — Deposit + Remaining


class SecurityType(str, Enum):
    """Security deposit type for rental orders (Epic 10)."""

    cccd = "cccd"                  # Căn cước công dân (ID card)
    cash_deposit = "cash_deposit"  # Tiền cọc thế chân (cash)


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
    # Epic 10 fields — defaults ensure backward compatibility with existing orders
    service_type: ServiceType = ServiceType.buy
    deposit_amount: Decimal | None = None
    remaining_amount: Decimal | None = None

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


class OrderPaymentRecord(BaseModel):
    """Schema for order_payments table (Epic 10).

    Business-level multi-transaction tracking for deposit/remaining/security payments.
    Separate from PaymentTransactionResponse (webhook audit trail — Story 4.1).
    """

    id: UUID
    tenant_id: UUID
    order_id: UUID
    payment_type: str  # full | deposit | remaining | security_deposit
    amount: Decimal
    method: str        # cod | vnpay | momo | cash | internal
    status: str        # pending | paid | failed | refunded
    gateway_ref: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
