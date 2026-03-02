"""Pydantic schemas for Customer Profile and Measurements."""

import re
import uuid
from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field, field_validator


class CustomerProfileCreateRequest(BaseModel):
    """Schema for creating a new customer profile."""

    full_name: str = Field(..., min_length=2, max_length=255, description="Full name of customer")
    phone: str = Field(..., min_length=10, max_length=20, description="Phone number (VN format)")
    email: EmailStr | None = Field(None, description="Optional email address")
    date_of_birth: date | None = Field(None, description="Date of birth")
    gender: str | None = Field(None, description="Gender: Nam, Nữ, Khác")
    address: str | None = Field(None, description="Full address")
    notes: str | None = Field(None, description="Additional notes")
    create_account: bool = Field(False, description="Create user account for customer if email provided")
    initial_measurements: "MeasurementCreateRequest | None" = Field(
        None, description="Optional initial measurements"
    )

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, v: str) -> str:
        """Validate Vietnamese phone format (10-11 digits, starting with 0)."""
        v = v.strip()
        pattern = r"^0[0-9]{9,10}$"
        if not re.match(pattern, v):
            raise ValueError(
                "Số điện thoại không đúng định dạng. Vui lòng nhập số điện thoại Việt Nam (VD: 0901234567)"
            )
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        """Validate gender values."""
        if v is None:
            return v
        allowed = ["Nam", "Nữ", "Khác"]
        if v not in allowed:
            raise ValueError(f"Giới tính phải là một trong: {', '.join(allowed)}")
        return v

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: EmailStr | None) -> str | None:
        """Normalize email to lowercase."""
        if v is None:
            return v
        return v.lower()


class CustomerProfileUpdateRequest(BaseModel):
    """Schema for updating customer profile."""

    full_name: str | None = Field(None, min_length=2, max_length=255)
    phone: str | None = Field(None, min_length=10, max_length=20)
    email: EmailStr | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    notes: str | None = None

    @field_validator("phone")
    @classmethod
    def validate_phone_format(cls, v: str | None) -> str | None:
        """Validate Vietnamese phone format."""
        if v is None:
            return v
        v = v.strip()
        pattern = r"^0[0-9]{9,10}$"
        if not re.match(pattern, v):
            raise ValueError(
                "Số điện thoại không đúng định dạng. Vui lòng nhập số điện thoại Việt Nam (VD: 0901234567)"
            )
        return v

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        """Validate gender values."""
        if v is None:
            return v
        allowed = ["Nam", "Nữ", "Khác"]
        if v not in allowed:
            raise ValueError(f"Giới tính phải là một trong: {', '.join(allowed)}")
        return v


class CustomerProfileResponse(BaseModel):
    """Schema for customer profile response."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    user_id: uuid.UUID | None = None
    full_name: str
    phone: str
    email: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    notes: str | None = None
    is_deleted: bool
    created_at: datetime
    updated_at: datetime
    has_account: bool = Field(False, description="Whether customer has a user account")
    measurement_count: int = Field(0, description="Number of measurement sets")

    model_config = {"from_attributes": True}


class MeasurementCreateRequest(BaseModel):
    """Schema for creating a new measurement set."""

    neck: Decimal | None = Field(None, ge=20, le=60, description="Vòng cổ (cm)")
    shoulder_width: Decimal | None = Field(None, ge=30, le=60, description="Rộng vai (cm)")
    bust: Decimal | None = Field(None, ge=60, le=180, description="Vòng ngực (cm)")
    waist: Decimal | None = Field(None, ge=40, le=150, description="Vòng eo (cm)")
    hip: Decimal | None = Field(None, ge=60, le=180, description="Vòng mông (cm)")
    top_length: Decimal | None = Field(None, ge=40, le=120, description="Dài áo (cm)")
    sleeve_length: Decimal | None = Field(None, ge=30, le=90, description="Dài tay (cm)")
    wrist: Decimal | None = Field(None, ge=10, le=30, description="Vòng cổ tay (cm)")
    height: Decimal | None = Field(None, ge=100, le=250, description="Chiều cao (cm)")
    weight: Decimal | None = Field(None, ge=30, le=200, description="Cân nặng (kg)")
    measurement_notes: str | None = Field(None, description="Ghi chú số đo đặc biệt")
    measured_date: date | None = Field(None, description="Ngày đo (mặc định: hôm nay)")

    @field_validator(
        "neck",
        "shoulder_width",
        "bust",
        "waist",
        "hip",
        "top_length",
        "sleeve_length",
        "wrist",
        "height",
        "weight",
    )
    @classmethod
    def validate_positive(cls, v: Decimal | None) -> Decimal | None:
        """Validate measurements are positive numbers."""
        if v is not None and v <= 0:
            raise ValueError("Số đo phải là số dương")
        return v


class MeasurementUpdateRequest(BaseModel):
    """Schema for updating measurement set."""

    neck: Decimal | None = Field(None, ge=20, le=60)
    shoulder_width: Decimal | None = Field(None, ge=30, le=60)
    bust: Decimal | None = Field(None, ge=60, le=180)
    waist: Decimal | None = Field(None, ge=40, le=150)
    hip: Decimal | None = Field(None, ge=60, le=180)
    top_length: Decimal | None = Field(None, ge=40, le=120)
    sleeve_length: Decimal | None = Field(None, ge=30, le=90)
    wrist: Decimal | None = Field(None, ge=10, le=30)
    height: Decimal | None = Field(None, ge=100, le=250)
    weight: Decimal | None = Field(None, ge=30, le=200)
    measurement_notes: str | None = None


class MeasurementResponse(BaseModel):
    """Schema for measurement response."""

    id: uuid.UUID
    customer_profile_id: uuid.UUID
    tenant_id: uuid.UUID
    neck: Decimal | None = None
    shoulder_width: Decimal | None = None
    bust: Decimal | None = None
    waist: Decimal | None = None
    hip: Decimal | None = None
    top_length: Decimal | None = None
    sleeve_length: Decimal | None = None
    wrist: Decimal | None = None
    height: Decimal | None = None
    weight: Decimal | None = None
    measurement_notes: str | None = None
    is_default: bool
    measured_date: date
    measured_by: uuid.UUID | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CustomerWithMeasurementsResponse(BaseModel):
    """Schema for customer with all measurements."""

    customer: CustomerProfileResponse
    measurements: list[MeasurementResponse] = []
    default_measurement: MeasurementResponse | None = None
