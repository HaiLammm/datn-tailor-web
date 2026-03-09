"""Pydantic schemas for Garment (Story 5.1: Digital Showroom, Story 5.2: Return Timeline)."""

import uuid
from datetime import date, datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, computed_field, field_validator, model_validator


class GarmentStatus(str, Enum):
    """Garment status enum."""

    AVAILABLE = "available"
    RENTED = "rented"
    MAINTENANCE = "maintenance"


class GarmentCategory(str, Enum):
    """Garment category enum."""

    AO_DAI_TRUYEN_THONG = "ao_dai_truyen_thong"
    AO_DAI_CACH_TAN = "ao_dai_cach_tan"
    AO_DAI_CUOI = "ao_dai_cuoi"
    AO_DAI_TE_NHI = "ao_dai_te_nhi"


class GarmentOccasion(str, Enum):
    """Garment occasion enum."""

    LE_CUOI = "le_cuoi"
    KHAI_TRUONG = "khai_truong"
    TET = "tet"
    CONG_SO = "cong_so"
    TIEC_TUNG = "tiec_tung"
    SINH_NHAT = "sinh_nhat"


class GarmentBase(BaseModel):
    """Base schema for garment with common fields."""

    name: str = Field(..., min_length=1, max_length=255, description="Ten bo do")
    description: str | None = Field(None, description="Mo ta chi tiet")
    category: GarmentCategory = Field(..., description="Loai ao dai")
    color: str | None = Field(None, max_length=50, description="Mau sac")
    occasion: GarmentOccasion | None = Field(None, description="Dip su dung")
    size_options: list[str] = Field(default_factory=list, description="Kich co co san (S/M/L/XL/XXL)")
    rental_price: Decimal = Field(..., ge=0, description="Gia thue (VND)")
    image_url: str | None = Field(None, max_length=500, description="URL hinh anh")

    @field_validator("size_options")
    @classmethod
    def validate_size_options(cls, v: list[str]) -> list[str]:
        """Validate size options are valid sizes."""
        valid_sizes = {"S", "M", "L", "XL", "XXL"}
        if not v:
            raise ValueError("Phai co it nhat mot kich co")
        for size in v:
            if size not in valid_sizes:
                raise ValueError(f"Kich co '{size}' khong hop le. Cho phep: {', '.join(valid_sizes)}")
        return v


class GarmentCreate(GarmentBase):
    """Schema for creating a new garment (Owner only)."""

    pass


class GarmentUpdate(BaseModel):
    """Schema for updating a garment (Owner only)."""

    name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    category: GarmentCategory | None = None
    color: str | None = Field(None, max_length=50)
    occasion: GarmentOccasion | None = None
    size_options: list[str] | None = None
    rental_price: Decimal | None = Field(None, ge=0)
    image_url: str | None = Field(None, max_length=500)
    status: GarmentStatus | None = None
    expected_return_date: date | None = None

    @field_validator("size_options")
    @classmethod
    def validate_size_options(cls, v: list[str] | None) -> list[str] | None:
        """Validate size options if provided."""
        if v is None:
            return v
        valid_sizes = {"S", "M", "L", "XL", "XXL"}
        if not v:
            raise ValueError("Phai co it nhat mot kich co")
        for size in v:
            if size not in valid_sizes:
                raise ValueError(f"Kich co '{size}' khong hop le. Cho phep: {', '.join(valid_sizes)}")
        return v


class GarmentResponse(BaseModel):
    """Schema for garment response."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    description: str | None
    category: str
    color: str | None
    occasion: str | None
    size_options: list[str]
    rental_price: Decimal
    image_url: str | None
    status: str
    expected_return_date: date | None
    renter_id: uuid.UUID | None = None
    renter_name: str | None = None
    renter_email: str | None = None
    reminder_sent_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @computed_field  # type: ignore[prop-decorator]
    @property
    def reminder_sent(self) -> bool:
        """True if a return reminder has been sent for this garment."""
        return self.reminder_sent_at is not None

    @computed_field  # type: ignore[prop-decorator]
    @property
    def days_until_available(self) -> int | None:
        """Days until garment is available (negative = overdue).

        Returns None if status is not 'rented'/'maintenance' or no expected_return_date.
        Backend is SSOT — frontend MUST NOT recalculate this.
        """
        if self.status not in ("rented", "maintenance"):
            return None
        if self.expected_return_date is None:
            return None
        today = date.today()
        return (self.expected_return_date - today).days

    @computed_field  # type: ignore[prop-decorator]
    @property
    def is_overdue(self) -> bool:
        """True if garment is rented and expected_return_date is in the past.

        Only 'rented' status can be overdue. Maintenance garments are not flagged.
        """
        if self.status != "rented" or self.expected_return_date is None:
            return False
        return date.today() > self.expected_return_date

    model_config = {"from_attributes": True}


class GarmentStatusUpdate(BaseModel):
    """Schema for updating garment status - Story 5.3 '2-Touch' Update, Story 5.4 renter tracking."""

    status: GarmentStatus
    expected_return_date: date | None = None
    renter_id: uuid.UUID | None = None
    renter_name: str | None = None
    renter_email: str | None = None

    @field_validator("expected_return_date")
    @classmethod
    def validate_date(cls, v: date | None) -> date | None:
        """Ensure date is in the future if provided."""
        if v and v <= date.today():
            raise ValueError("Ngày dự kiến trả đồ phải ở tương lai")
        return v

    @field_validator("renter_email")
    @classmethod
    def validate_renter_email(cls, v: str | None) -> str | None:
        """Basic email format validation."""
        if v is not None and v.strip():
            import re
            if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", v.strip()):
                raise ValueError("Email khách thuê không hợp lệ")
            return v.strip()
        return v

    @model_validator(mode="after")
    def validate_rented_date(self) -> "GarmentStatusUpdate":
        """Cross-field validation for rented status."""
        if self.status == GarmentStatus.RENTED:
            if self.expected_return_date is None:
                raise ValueError("Phải nhập ngày dự kiến trả đồ khi trạng thái là 'rented'")
            if not self.renter_name or not self.renter_name.strip():
                raise ValueError("Phải nhập tên khách thuê khi trạng thái là 'rented'")
            if not self.renter_email or not self.renter_email.strip():
                raise ValueError("Phải nhập email khách thuê khi trạng thái là 'rented'")
        if self.status != GarmentStatus.RENTED:
            # Auto-clear date and renter fields for non-rented statuses (AC #5, AC #7)
            self.expected_return_date = None
            self.renter_id = None
            self.renter_name = None
            self.renter_email = None
        return self


class GarmentFilter(BaseModel):
    """Schema for filtering garments in list queries."""

    color: str | None = Field(None, description="Filter by color")
    occasion: str | None = Field(None, description="Filter by occasion")
    status: GarmentStatus | None = Field(None, description="Filter by status")
    category: GarmentCategory | None = Field(None, description="Filter by category")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")


class GarmentListResponse(BaseModel):
    """Schema for paginated garment list response."""

    items: list[GarmentResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
