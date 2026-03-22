"""SQLAlchemy ORM models for database tables."""

import uuid
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, JSON, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base class for all ORM models."""

    pass


class TenantDB(Base):
    """ORM model for the `tenants` table (Story 1.6).

    Multi-tenant infrastructure - each tenant represents a tailor shop.
    """

    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


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
    
    # Multi-tenant support (Story 1.6)
    tenant_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tenants.id", ondelete="SET NULL"), nullable=True, index=True
    )
    
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
    purpose: Mapped[str] = mapped_column(String(50), nullable=False, default="register", index=True)
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
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
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
    
    # Local-first sync fields (Story 1.6 AC3)
    is_deleted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, index=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
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
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
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
    
    # Local-first sync fields (Story 1.6 AC3)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    
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


class DesignDB(Base):
    """ORM model for the `designs` table (Story 3.4).

    Stores locked designs with Master Geometry JSON (SSOT).
    """

    __tablename__ = "designs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    master_geometry: Mapped[dict] = mapped_column(JSON, nullable=False)
    geometry_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="locked"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    overrides: Mapped[list["DesignOverrideDB"]] = relationship(
        "DesignOverrideDB", back_populates="design", cascade="all, delete-orphan"
    )


class DesignOverrideDB(Base):
    """ORM model for the `design_overrides` table (Story 4.3).

    Stores manual overrides from tailors based on experience.
    """

    __tablename__ = "design_overrides"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    design_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("designs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tailor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    delta_key: Mapped[str] = mapped_column(String(100), nullable=False)
    original_value: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    overridden_value: Mapped[Decimal] = mapped_column(Numeric(5, 2), nullable=False)
    delta_unit: Mapped[str] = mapped_column(String(20), nullable=False, default="cm")
    label_vi: Mapped[str] = mapped_column(String(255), nullable=False)
    reason_vi: Mapped[str | None] = mapped_column(Text, nullable=True)
    flagged_for_learning: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    sequence_id: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    design: Mapped["DesignDB"] = relationship("DesignDB", back_populates="overrides")
    tailor: Mapped["UserDB"] = relationship("UserDB")


class OrderDB(Base):
    """ORM model for the `orders` table (Story 3.3).

    E-commerce orders with shipping and payment info.
    Multi-tenant isolated by tenant_id.
    """

    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    shipping_address: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    shipping_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    payment_method: Mapped[str] = mapped_column(String(20), nullable=False, default="cod")
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True
    )
    payment_status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="pending", index=True
    )
    total_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    items: Mapped[list["OrderItemDB"]] = relationship(
        "OrderItemDB", back_populates="order", cascade="all, delete-orphan"
    )
    payment_transactions: Mapped[list["PaymentTransactionDB"]] = relationship(
        "PaymentTransactionDB", back_populates="order", cascade="all, delete-orphan"
    )


class OrderItemDB(Base):
    """ORM model for the `order_items` table (Story 3.3).

    Individual items within an order, linked to garments.
    """

    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    garment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("garments.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    transaction_type: Mapped[str] = mapped_column(String(10), nullable=False, default="buy", index=True)
    size: Mapped[str | None] = mapped_column(String(10), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    rental_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rental_status: Mapped[str | None] = mapped_column(String(20), nullable=True)  # 'active', 'overdue', 'returned'
    deposit_amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    order: Mapped["OrderDB"] = relationship("OrderDB", back_populates="items")
    garment: Mapped["GarmentDB"] = relationship("GarmentDB")


class PaymentTransactionDB(Base):
    """ORM model for the `payment_transactions` table (Story 4.1).

    Stores payment gateway webhook callback records for audit and idempotency.
    """

    __tablename__ = "payment_transactions"
    __table_args__ = (
        UniqueConstraint("provider", "transaction_id", name="uq_payment_tx_provider_txid"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    transaction_id: Mapped[str] = mapped_column(String(255), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    raw_payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    order: Mapped["OrderDB"] = relationship("OrderDB", back_populates="payment_transactions")


class AppointmentDB(Base):
    """ORM model for the `appointments` table (Story 3.4).

    Stores Bespoke consultation appointment bookings.
    Slots: morning (9:00-12:00) or afternoon (13:00-17:00).
    Max 3 bookings per slot per day (enforced in service layer).
    """

    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(20), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    appointment_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    slot: Mapped[str] = mapped_column(String(20), nullable=False, default="morning")
    special_requests: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending", index=True)
    reminder_sent: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class GarmentDB(Base):
    """ORM model for the `garments` table (Story 5.1).
    
    Digital Showroom - stores ao dai garments available for rental.
    Multi-tenant isolated by tenant_id.
    """

    __tablename__ = "garments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    color: Mapped[str | None] = mapped_column(String(50), nullable=True)
    occasion: Mapped[str | None] = mapped_column(String(50), nullable=True)
    material: Mapped[str | None] = mapped_column(String(50), nullable=True, index=True)
    size_options: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    rental_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    sale_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    image_urls: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="available", index=True)
    expected_return_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    renter_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("customer_profiles.id", ondelete="SET NULL"), nullable=True
    )
    renter_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    renter_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class TailorTaskDB(Base):
    """ORM model for the `tailor_tasks` table (Story 5.3).

    Tracks production tasks assigned to tailors.
    Denormalized garment_name and customer_name for query performance.
    Status flow: assigned → in_progress → completed (no backward transitions).
    """

    __tablename__ = "tailor_tasks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_item_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("order_items.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    assigned_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    garment_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(
        String(50), nullable=False, default="assigned", index=True
    )
    deadline: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    piece_rate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    design_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("designs.id", ondelete="SET NULL"), nullable=True
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    order: Mapped["OrderDB"] = relationship("OrderDB")
    assignee: Mapped["UserDB"] = relationship("UserDB", foreign_keys=[assigned_to])
    assigner: Mapped["UserDB"] = relationship("UserDB", foreign_keys=[assigned_by])
    design: Mapped["DesignDB | None"] = relationship("DesignDB")


class RentalReturnDB(Base):
    """ORM model for the `rental_returns` table (Story 4.3).

    Tracks rental returns with condition assessment and deposit deduction.
    Linked to order_items for rental processing.
    """

    __tablename__ = "rental_returns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    order_item_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("order_items.id", ondelete="CASCADE"), nullable=False, index=True
    )
    garment_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("garments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    return_condition: Mapped[str] = mapped_column(String(20), nullable=False)  # 'good', 'damaged', 'lost'
    damage_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    deposit_deduction: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    processed_by: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    returned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    order_item: Mapped["OrderItemDB"] = relationship("OrderItemDB")
    garment: Mapped["GarmentDB"] = relationship("GarmentDB")
    processor: Mapped["UserDB | None"] = relationship("UserDB")



class NotificationDB(Base):
    """ORM model for the `notifications` table (Story 4.4f).

    In-app notifications for customers.
    - Links to users.id (authenticated account), NOT customer_profiles.id.
    - Soft delete via deleted_at.
    - is_read + read_at track read state.
    """

    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    data: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class VoucherDB(Base):
    """ORM model for the `vouchers` table (Story 4.4g).

    Master voucher definitions — will be managed by Owner via Story 6.3.
    Linked to customers via user_vouchers (many-to-many assignment).
    - type: 'percent' (0-100) or 'fixed' (VND amount).
    - min_order_value: minimum order total before voucher applies.
    - max_discount_value: cap for percent vouchers (None = no cap).
    """

    __tablename__ = "vouchers"
    __table_args__ = (
        UniqueConstraint("tenant_id", "code", name="uq_vouchers_tenant_code"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)        # 'percent' | 'fixed'
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_order_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=Decimal("0"))
    max_discount_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_uses: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    used_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    assignments: Mapped[list["UserVoucherDB"]] = relationship(
        "UserVoucherDB", back_populates="voucher", cascade="all, delete-orphan"
    )


class UserVoucherDB(Base):
    """ORM model for the `user_vouchers` table (Story 4.4g).

    Per-customer assignment of a voucher.
    - One assignment per user per voucher (UNIQUE constraint).
    - is_used tracks whether the customer has applied this voucher.
    - used_in_order_id: FK to orders.id will be added in Epic 6 checkout integration.
    """

    __tablename__ = "user_vouchers"
    __table_args__ = (
        UniqueConstraint("user_id", "voucher_id", name="uq_user_vouchers_user_voucher"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    voucher_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False, index=True
    )
    is_used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    used_in_order_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    voucher: Mapped["VoucherDB"] = relationship("VoucherDB", back_populates="assignments")


class LeadDB(Base):
    """ORM model for the `leads` table (Story 6.1: CRM Leads Board).

    Tracks potential customers (leads) who have expressed interest but not yet placed an order.
    Multi-tenant isolated by tenant_id.
    Classification: hot / warm / cold (Owner manually assigns).
    """

    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    source: Mapped[str] = mapped_column(String(50), nullable=False, default="manual")
    # source enum: manual | website | booking_abandoned | cart_abandoned | signup
    classification: Mapped[str] = mapped_column(String(10), nullable=False, default="warm", index=True)
    # classification enum: hot | warm | cold
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )


class LeadConversionDB(Base):
    """ORM model for the `lead_conversions` audit table (Story 6.2).

    Records lead-to-customer conversion history for CRM analytics.
    Lead data is denormalized here since the lead record is deleted after conversion.
    """

    __tablename__ = "lead_conversions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    lead_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    lead_name: Mapped[str] = mapped_column(String(255), nullable=False)
    lead_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    lead_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    lead_source: Mapped[str | None] = mapped_column(String(50), nullable=True)
    customer_profile_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customer_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    converted_by: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc)
    )
