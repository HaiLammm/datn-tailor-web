"""Pydantic schemas for Staff Whitelist management operations."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class StaffWhitelistCreateRequest(BaseModel):
    """Schema for adding a new staff member to whitelist."""

    email: EmailStr = Field(..., description="Email address of staff member")
    role: str = Field(..., description="Role: Tailor or Owner")
    password: str | None = Field(None, description="Password for staff account. If empty, default password will be generated.")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        """Normalize email to lowercase."""
        return v.lower()

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        """Validate role is either Tailor or Owner."""
        allowed = ["Tailor", "Owner"]
        if v not in allowed:
            raise ValueError(f"Role must be one of {allowed}")
        return v


DEFAULT_STAFF_PASSWORD = "Tailor@123"


class StaffWhitelistResponse(BaseModel):
    """Schema for staff whitelist entry response."""

    id: uuid.UUID
    email: str
    role: str
    created_by: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StaffCreateResponse(BaseModel):
    """Schema for staff creation response, includes plain password for Owner to share."""

    whitelist_entry: StaffWhitelistResponse
    plain_password: str = Field(..., description="Plain text password to share with the staff member")


class ActiveStaffResponse(BaseModel):
    """Schema for active staff user (registered in users table)."""

    id: uuid.UUID
    email: str
    role: str
    full_name: str | None = None
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class StaffManagementResponse(BaseModel):
    """Schema for combined staff management view."""

    whitelist: list[StaffWhitelistResponse] = Field(
        default_factory=list, description="Staff whitelist entries"
    )
    active_staff: list[ActiveStaffResponse] = Field(
        default_factory=list, description="Registered active staff users"
    )
