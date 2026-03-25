"""Pydantic schemas for voucher models (Story 4.4g + Story 6.3).

Vouchers: customer-facing view of assigned discount vouchers.
- VoucherType: 'percent' (0-100) or 'fixed' (VND amount)
- VoucherStatus: computed from is_used + expiry_date at API layer

Story 6.3 adds Owner CRUD schemas for voucher management.
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class VoucherType(str, Enum):
    PERCENT = "percent"
    FIXED = "fixed"


class VoucherVisibility(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class VoucherStatus(str, Enum):
    ACTIVE = "active"    # assigned, not used, not expired
    EXPIRED = "expired"  # past expiry_date
    USED = "used"        # is_used = True in user_vouchers


class VoucherResponse(BaseModel):
    """Response schema for a single customer-assigned voucher."""

    id: UUID                            # user_vouchers.id
    voucher_id: UUID                    # vouchers.id
    code: str
    type: VoucherType
    value: Decimal
    min_order_value: Decimal
    max_discount_value: Optional[Decimal] = None
    description: Optional[str] = None
    expiry_date: date
    visibility: str = "private"
    status: VoucherStatus
    assigned_at: datetime

    model_config = {"from_attributes": True}


# --- Story 6.3: Owner CRUD schemas ---


class VoucherCreateRequest(BaseModel):
    """Request schema for creating a new voucher (Owner only)."""

    code: str
    type: VoucherType
    value: Decimal
    min_order_value: Decimal = Decimal("0")
    max_discount_value: Optional[Decimal] = None
    description: Optional[str] = None
    expiry_date: date
    total_uses: int = 1
    visibility: VoucherVisibility = VoucherVisibility.PRIVATE

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = v.strip().upper()
        if not v or len(v) > 50:
            raise ValueError("Mã voucher phải từ 1-50 ký tự")
        return v

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Giá trị giảm giá phải lớn hơn 0")
        return v

    @field_validator("min_order_value")
    @classmethod
    def validate_min_order(cls, v: Decimal) -> Decimal:
        if v < 0:
            raise ValueError("Giá trị đơn hàng tối thiểu không được âm")
        return v

    @field_validator("total_uses")
    @classmethod
    def validate_total_uses(cls, v: int) -> int:
        if v < 1:
            raise ValueError("Số lượt sử dụng phải >= 1")
        return v


class VoucherUpdateRequest(BaseModel):
    """Request schema for updating an existing voucher (Owner only)."""

    type: Optional[VoucherType] = None
    value: Optional[Decimal] = None
    min_order_value: Optional[Decimal] = None
    max_discount_value: Optional[Decimal] = None
    description: Optional[str] = None
    expiry_date: Optional[date] = None
    total_uses: Optional[int] = None
    visibility: Optional[VoucherVisibility] = None

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v <= 0:
            raise ValueError("Giá trị giảm giá phải lớn hơn 0")
        return v

    @field_validator("min_order_value")
    @classmethod
    def validate_min_order(cls, v: Optional[Decimal]) -> Optional[Decimal]:
        if v is not None and v < 0:
            raise ValueError("Giá trị đơn hàng tối thiểu không được âm")
        return v

    @field_validator("total_uses")
    @classmethod
    def validate_total_uses(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 1:
            raise ValueError("Số lượt sử dụng phải >= 1")
        return v


class OwnerVoucherResponse(BaseModel):
    """Response schema for owner voucher management."""

    id: UUID
    code: str
    type: VoucherType
    value: Decimal
    min_order_value: Decimal
    max_discount_value: Optional[Decimal] = None
    description: Optional[str] = None
    expiry_date: date
    total_uses: int
    used_count: int
    is_active: bool
    visibility: str = "private"
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VoucherStatsResponse(BaseModel):
    """Response schema for voucher analytics summary."""

    total_vouchers: int
    active_vouchers: int
    total_redemptions: int
    redemption_rate: float


# --- Voucher Checkout schemas ---


class VoucherDiscountDetail(BaseModel):
    """Detail of a single voucher's discount calculation."""

    voucher_id: UUID
    code: str
    type: VoucherType
    visibility: str = "private"
    value: Decimal
    discount_amount: Decimal  # actual discount calculated for this voucher


class DiscountPreviewRequest(BaseModel):
    """Request schema for previewing voucher discounts."""

    voucher_codes: list[str] = Field(..., min_length=1)
    order_subtotal: Decimal

    @field_validator("order_subtotal")
    @classmethod
    def validate_subtotal(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Tổng đơn hàng phải lớn hơn 0")
        return v


class DiscountPreviewResponse(BaseModel):
    """Response schema for voucher discount preview."""

    vouchers: list[VoucherDiscountDetail]
    total_discount: Decimal
    final_total: Decimal
