"""Pydantic schemas for User and Auth operations."""

import uuid
from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


class LoginRequest(BaseModel):
    """Schema for email/password login."""

    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str = "bearer"


class VerifyTokenRequest(BaseModel):
    """Schema for JWT token verification request."""

    token: str = Field(..., description="JWT access token to verify")


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


class RegisterRequest(BaseModel):
    """Schema for user registration request."""

    email: EmailStr
    password: str = Field(..., min_length=8, description="Password must be at least 8 characters")
    full_name: str = Field(..., min_length=2, max_length=255, description="Full name")
    phone: str | None = Field(None, max_length=20, description="Phone number")
    date_of_birth: date | None = Field(None, description="Date of birth")
    gender: str | None = Field(None, description="Gender: Male, Female, Other")
    address: str | None = Field(None, description="Full address")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        """Normalize email to lowercase."""
        return v.lower()

    @field_validator("gender")
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        """Validate gender values."""
        if v is None:
            return v
        allowed = ["Male", "Female", "Other"]
        if v not in allowed:
            raise ValueError(f"Gender must be one of {allowed}")
        return v


class OTPVerifyRequest(BaseModel):
    """Schema for OTP verification request."""

    email: EmailStr
    code: str = Field(..., min_length=6, max_length=6, description="6-digit OTP code")

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        """Normalize email to lowercase."""
        return v.lower()

    @field_validator("code")
    @classmethod
    def code_numeric(cls, v: str) -> str:
        """Validate OTP code is numeric."""
        if not v.isdigit():
            raise ValueError("OTP code must be 6 digits")
        return v


class ResendOTPRequest(BaseModel):
    """Schema for resend OTP request."""

    email: EmailStr

    @field_validator("email")
    @classmethod
    def email_lowercase(cls, v: str) -> str:
        """Normalize email to lowercase."""
        return v.lower()


class UserProfileResponse(BaseModel):
    """Schema for user profile with full details."""

    id: uuid.UUID
    email: str
    role: str
    is_active: bool
    full_name: str | None = None
    phone: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    address: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
