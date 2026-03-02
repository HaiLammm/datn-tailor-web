"""SQLAlchemy ORM models for database tables."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


class UserDB(Base):
    """ORM model for the `users` table."""

    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[str] = mapped_column(String(50), nullable=False, default="Customer")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    
    # Profile fields (Story 1.2)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class StaffWhitelistDB(Base):
    """ORM model for the `staff_whitelist` table."""

    __tablename__ = "staff_whitelist"

    id: Mapped[uuid.UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4
    )
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class OTPCodeDB(Base):
    """ORM model for the `otp_codes` table."""

    __tablename__ = "otp_codes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(6), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    is_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class CustomerProfileDB(Base):
    """ORM model for the `customer_profiles` table (Story 1.3)."""

    __tablename__ = "customer_profiles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    gender: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    measurements: Mapped[list["MeasurementDB"]] = relationship(
        "MeasurementDB", back_populates="customer_profile", cascade="all, delete-orphan"
    )


class MeasurementDB(Base):
    """ORM model for the `measurements` table (Story 1.3)."""

    __tablename__ = "measurements"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    customer_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customer_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(nullable=False, index=True)
    neck: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    shoulder_width: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    bust: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    waist: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    hip: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    top_length: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    sleeve_length: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    wrist: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    height: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    weight: Mapped[Decimal | None] = mapped_column(Numeric(5, 2), nullable=True)
    measurement_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    measured_date: Mapped[date] = mapped_column(Date, nullable=False, default=date.today, index=True)
    measured_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    customer_profile: Mapped["CustomerProfileDB"] = relationship(
        "CustomerProfileDB", back_populates="measurements"
    )

