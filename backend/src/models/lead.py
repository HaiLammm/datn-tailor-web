"""Pydantic schemas for Lead CRM module (Story 6.1: Leads Board)."""

import re
import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator

_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class LeadSource(str, Enum):
    """Lead source enum - where the lead came from."""

    MANUAL = "manual"
    WEBSITE = "website"
    BOOKING_ABANDONED = "booking_abandoned"
    CART_ABANDONED = "cart_abandoned"
    SIGNUP = "signup"


class LeadClassification(str, Enum):
    """Lead classification enum - interest level."""

    HOT = "hot"
    WARM = "warm"
    COLD = "cold"


def _validate_email_value(v: str | None) -> str | None:
    """Shared email validation: normalize empty/whitespace to None, validate format."""
    if v is None:
        return None
    stripped = v.strip()
    if not stripped:
        return None
    if not _EMAIL_PATTERN.match(stripped):
        raise ValueError("Email không hợp lệ")
    return stripped


def _validate_phone_value(v: str | None) -> str | None:
    """Shared phone validation: normalize empty/whitespace to None."""
    if v is None:
        return None
    stripped = v.strip()
    return stripped or None


class LeadBase(BaseModel):
    """Base schema for lead with common fields."""

    name: str = Field(..., min_length=1, max_length=255, description="Ten khach hang tiem nang")
    phone: str | None = Field(None, max_length=20, description="So dien thoai")
    email: str | None = Field(None, max_length=255, description="Email")
    source: LeadSource = Field(LeadSource.MANUAL, description="Nguon tiep can")
    classification: LeadClassification = Field(
        LeadClassification.WARM, description="Phan loai: hot/warm/cold"
    )
    notes: str | None = Field(None, description="Ghi chu them")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        return _validate_email_value(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        return _validate_phone_value(v)


class LeadCreate(LeadBase):
    """Schema for creating a new lead (Owner only)."""

    pass


class LeadUpdate(BaseModel):
    """Schema for updating a lead (Owner only) - all fields optional."""

    name: str | None = Field(None, min_length=1, max_length=255)
    phone: str | None = Field(None, max_length=20)
    email: str | None = None
    source: LeadSource | None = None
    classification: LeadClassification | None = None
    notes: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str | None) -> str | None:
        return _validate_email_value(v)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str | None) -> str | None:
        return _validate_phone_value(v)


class LeadClassificationUpdate(BaseModel):
    """Schema for updating classification only (PATCH /leads/{id}/classification)."""

    classification: LeadClassification


class LeadResponse(BaseModel):
    """Schema for lead response."""

    id: uuid.UUID
    tenant_id: uuid.UUID
    name: str
    phone: str | None
    email: str | None
    source: str
    classification: str
    notes: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadFilter(BaseModel):
    """Schema for filtering leads in list queries."""

    classification: LeadClassification | None = Field(None, description="Filter by classification")
    source: LeadSource | None = Field(None, description="Filter by source")
    search: str | None = Field(None, max_length=255, description="Search by name or phone")
    page: int = Field(1, ge=1, description="Page number")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")
    sort_by: str = Field("created_at", description="Field to sort by")
    sort_order: str = Field("desc", description="Sort order: asc or desc")

    @field_validator("sort_by")
    @classmethod
    def validate_sort_by(cls, v: str) -> str:
        """Whitelist allowed sort fields to prevent injection."""
        allowed = {"created_at", "name", "classification", "source"}
        if v not in allowed:
            raise ValueError(f"sort_by must be one of: {', '.join(allowed)}")
        return v

    @field_validator("sort_order")
    @classmethod
    def validate_sort_order(cls, v: str) -> str:
        """Validate sort order value."""
        if v not in {"asc", "desc"}:
            raise ValueError("sort_order must be 'asc' or 'desc'")
        return v


class LeadListResponse(BaseModel):
    """Schema for paginated lead list response."""

    items: list[LeadResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
