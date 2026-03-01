"""Pydantic schemas for User and Auth operations."""

import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    """Schema for email/password login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    """Schema for user info returned by /auth/me."""

    id: uuid.UUID
    email: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    """Schema for creating a new user."""

    email: EmailStr
    password: str
    role: str = "Customer"


class StaffWhitelistEntry(BaseModel):
    """Schema for staff whitelist entries."""

    id: uuid.UUID
    email: str
    role: str
    created_by: str | None = None

    model_config = {"from_attributes": True}
