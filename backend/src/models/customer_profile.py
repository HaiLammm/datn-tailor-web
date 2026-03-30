"""Pydantic models for Customer Profile self-service endpoints (Story 4.4b)."""

import re
from datetime import date

from pydantic import BaseModel, field_validator


class CustomerProfileResponse(BaseModel):
    """Response model for GET /api/v1/customers/me/profile."""

    full_name: str | None
    email: str
    phone: str | None
    gender: str | None
    date_of_birth: date | None
    has_password: bool
    shipping_province: str | None
    shipping_district: str | None
    shipping_ward: str | None
    shipping_address_detail: str | None
    auto_fill_infor: bool


class CustomerProfileUpdateRequest(BaseModel):
    """Request body for PATCH /api/v1/customers/me/profile.
    Email is NOT updatable through this endpoint.
    """

    full_name: str | None = None
    phone: str | None = None
    gender: str | None = None
    shipping_province: str | None = None
    shipping_district: str | None = None
    shipping_ward: str | None = None
    shipping_address_detail: str | None = None
    auto_fill_infor: bool | None = None

    @field_validator("full_name")
    @classmethod
    def full_name_not_empty(cls, v: str | None) -> str | None:
        if v is not None and len(v.strip()) < 2:
            raise ValueError("Họ tên phải có ít nhất 2 ký tự")
        return v

    @field_validator("phone")
    @classmethod
    def phone_format_valid(cls, v: str | None) -> str | None:
        if v is not None and v != "" and not re.match(r"^0[0-9]{9,10}$", v):
            raise ValueError("Số điện thoại không đúng định dạng (VD: 0901234567)")
        return v

    @field_validator("gender")
    @classmethod
    def gender_valid(cls, v: str | None) -> str | None:
        if v is not None and v != "" and v not in ("Nam", "Nữ", "Khác"):
            raise ValueError("Giới tính không hợp lệ. Chọn: Nam, Nữ, hoặc Khác")
        return v


class ChangePasswordRequest(BaseModel):
    """Request body for POST /api/v1/customers/me/change-password.

    Step 1: Verify old password and send OTP to email.
    """

    old_password: str
    new_password: str


class ConfirmPasswordChangeRequest(BaseModel):
    """Request body for POST /api/v1/customers/me/confirm-password-change.

    Step 2: Verify OTP code and apply the new password.
    """

    otp_code: str
    new_password: str
