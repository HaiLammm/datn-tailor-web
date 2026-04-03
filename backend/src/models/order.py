"""Pydantic schemas for Order and OrderItem (Story 3.3)."""

import re
from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

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


class RentalCondition(str, Enum):
    """Condition of returned rental item (Story 10.7)."""

    good = "Good"        # Tốt — hoàn trả 100% cọc
    damaged = "Damaged"  # Hỏng — hoàn trả 100% (MVP, no damage fee)
    lost = "Lost"        # Thất lạc — không hoàn trả cọc


class PaymentStatus(str, Enum):
    """Payment status for orders and transactions."""

    pending = "pending"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"


# Story 10.5: Preparation sub-step definitions per service type
RENT_PREP_STEPS = ["cleaning", "altering", "ready"]
BUY_PREP_STEPS = ["qc", "packaging", "ready"]


class ShippingAddress(BaseModel):
    """Vietnamese shipping address format."""

    province: str = Field(..., min_length=1, description="Tinh/Thanh pho")
    district: str = Field(..., min_length=1, description="Quan/Huyen")
    ward: str = Field(..., min_length=1, description="Phuong/Xa")
    address_detail: str = Field(..., min_length=5, description="So nha, ten duong")


class RentalCheckoutFields(BaseModel):
    """Rental-specific checkout fields (Story 10.3)."""

    pickup_date: date
    return_date: date
    security_type: SecurityType
    security_value: str = Field(..., min_length=1, max_length=50)

    @field_validator("return_date")
    @classmethod
    def return_after_pickup(cls, v: date, info) -> date:
        if "pickup_date" in info.data and v <= info.data["pickup_date"]:
            raise ValueError("Ngay tra phai sau ngay nhan")
        return v


class OrderItemCreate(BaseModel):
    """Schema for creating an order item."""

    garment_id: UUID
    transaction_type: str = Field(..., pattern=r"^(buy|rent|bespoke)$")
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
    # Story 10.3: Service-type checkout fields
    rental_fields: RentalCheckoutFields | None = None
    measurement_confirmed: bool = False

    @field_validator("customer_phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        """Validate Vietnamese phone number format."""
        cleaned = v.strip()
        if not _VN_PHONE_RE.match(cleaned):
            msg = "So dien thoai khong hop le (VN format: 0xx xxx xxxx)"
            raise ValueError(msg)
        return cleaned

    @model_validator(mode="after")
    def validate_service_type_requirements(self) -> "OrderCreate":
        """Cross-field validation: rental_fields required for rent, measurement for bespoke."""
        has_rent = any(i.transaction_type == "rent" for i in self.items)
        has_bespoke = any(i.transaction_type == "bespoke" for i in self.items)
        if has_rent and self.rental_fields is None:
            raise ValueError("rental_fields bat buoc cho don thue")
        if has_bespoke and not self.measurement_confirmed:
            raise ValueError("Phai xac nhan so do truoc khi dat may")
        return self


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
    # Story 10.3: Rental/security fields
    security_type: str | None = None
    security_value: str | None = None
    pickup_date: datetime | None = None
    return_date: datetime | None = None
    # Story 10.5: Preparation sub-step tracking
    preparation_step: str | None = None

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
    transaction_type: str | None = Field(None, pattern=r"^(buy|rent|bespoke)$")
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
    # Epic 10: service type for badge display
    service_type: ServiceType = ServiceType.buy
    # Story 10.5: Preparation sub-step tracking
    preparation_step: str | None = None
    # Story 10.6: remaining amount for payment indicator
    remaining_amount: Decimal | None = None

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


class MeasurementCheckResponse(BaseModel):
    """Response schema for measurement gate check (Story 10.2).

    Returns whether the customer has valid measurements for bespoke orders.
    """

    has_measurements: bool
    last_updated: datetime | None = None
    measurements_summary: dict[str, float | None] | None = None


class ApproveOrderRequest(BaseModel):
    """Request body for Owner order approval (Story 10.4).

    assigned_to is required for bespoke orders (auto-creates TailorTask).
    """

    assigned_to: UUID | None = None  # Tailor user ID — required for bespoke
    notes: str | None = Field(None, max_length=2000)


class ApproveOrderResponse(BaseModel):
    """Response for order approval with routing destination (Story 10.4)."""

    order_id: UUID
    new_status: str
    service_type: str
    routing_destination: str  # "tailor" | "warehouse"
    task_id: UUID | None = None


# ── Story 10.5: Preparation Sub-step Tracking ────────────────────────────────


class UpdatePreparationStepRequest(BaseModel):
    """Request body for advancing preparation sub-step (Story 10.5).

    preparation_step: target step (forward-only).
    delivery_mode: required when advancing to the last step (triggers status transition).
    """

    preparation_step: str = Field(..., description="Target preparation step (forward-only)")
    delivery_mode: str | None = Field(
        None,
        pattern=r"^(ship|pickup)$",
        description="Required on last step: 'ship' → ready_to_ship, 'pickup' → ready_for_pickup",
    )


class UpdatePreparationStepResponse(BaseModel):
    """Response for preparation step update (Story 10.5)."""

    order_id: UUID
    preparation_step: str | None  # None if completed (moved out of preparing)
    status: str
    service_type: str
    is_completed: bool  # True if order moved out of preparing


# ── Story 10.6: Remaining Payment & Handover ────────────────────────────────


class PayRemainingRequest(BaseModel):
    """Request body for remaining payment initiation (Story 10.6)."""

    payment_method: PaymentMethod = PaymentMethod.vnpay


class PayRemainingResponse(BaseModel):
    """Response for remaining payment initiation (Story 10.6)."""

    order_id: UUID
    payment_url: str | None
    amount: Decimal
    payment_type: str  # "remaining"


# ── Story 10.7: Rental Return & Security Refund ────────────────────────────────


class RefundSecurityRequest(BaseModel):
    """Request body for security deposit refund processing (Story 10.7).

    condition: Rental item condition (Good | Damaged | Lost).
    """

    condition: RentalCondition = Field(..., description="Rental item condition")


class RefundSecurityResponse(BaseModel):
    """Response for security deposit refund processing (Story 10.7)."""

    order_id: UUID
    refund_amount: Decimal  # Calculated based on condition
    security_type: str  # cccd or cash_deposit
    original_amount: str | None  # Original security deposit value (str from DB VARCHAR)
    condition: RentalCondition  # Good | Damaged | Lost
    already_processed: bool = False  # True if this is an idempotent return
