"""Pydantic schemas for voucher models (Story 4.4g).

Vouchers: customer-facing view of assigned discount vouchers.
- VoucherType: 'percent' (0-100) or 'fixed' (VND amount)
- VoucherStatus: computed from is_used + expiry_date at API layer
"""

from datetime import date, datetime
from decimal import Decimal
from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel


class VoucherType(str, Enum):
    PERCENT = "percent"
    FIXED = "fixed"


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
    status: VoucherStatus
    assigned_at: datetime

    model_config = {"from_attributes": True}
