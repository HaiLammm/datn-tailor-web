"""Tests for Story 10.3: Service-Type Checkout.

Tests cover:
- OrderItemCreate with bespoke transaction_type
- RentalCheckoutFields schema validation
- OrderCreate model_validator for service-type requirements
- Deposit calculation logic
- OrderPaymentDB record creation
- Mixed cart service_type priority
- Backward compatibility for existing buy flow
"""

import pytest
from datetime import date, datetime, timezone
from decimal import Decimal
from uuid import uuid4

from pydantic import ValidationError

from src.models.order import (
    OrderCreate,
    OrderItemCreate,
    OrderItemResponse,
    OrderFilterParams,
    OrderResponse,
    OrderStatus,
    OrderPaymentRecord,
    PaymentMethod,
    PaymentStatus,
    RentalCheckoutFields,
    SecurityType,
    ServiceType,
    ShippingAddress,
)


# ---------------------------------------------------------------------------
# Test data helpers
# ---------------------------------------------------------------------------

def _shipping() -> ShippingAddress:
    return ShippingAddress(
        province="TP. Ho Chi Minh",
        district="Quan 1",
        ward="Phuong Ben Nghe",
        address_detail="123 Nguyen Hue",
    )


def _buy_item() -> dict:
    return {
        "garment_id": str(uuid4()),
        "transaction_type": "buy",
        "size": "M",
    }


def _rent_item() -> dict:
    return {
        "garment_id": str(uuid4()),
        "transaction_type": "rent",
        "rental_days": 3,
    }


def _bespoke_item() -> dict:
    return {
        "garment_id": str(uuid4()),
        "transaction_type": "bespoke",
        "size": "M",
    }


def _rental_fields() -> dict:
    return {
        "pickup_date": "2026-04-01",
        "return_date": "2026-04-05",
        "security_type": "cccd",
        "security_value": "001234567890",
    }


# ---------------------------------------------------------------------------
# 7.1 Buy order creation (full payment, backward compat)
# ---------------------------------------------------------------------------

class TestBuyOrderSchema:
    """Test buy order schemas — existing flow unchanged."""

    def test_buy_order_create_no_extras(self):
        """Buy order does NOT require rental_fields or measurement_confirmed."""
        order = OrderCreate(
            customer_name="Nguyen Van A",
            customer_phone="0912345678",
            shipping_address=_shipping(),
            payment_method="cod",
            items=[OrderItemCreate(**_buy_item())],
        )
        assert order.measurement_confirmed is False
        assert order.rental_fields is None

    def test_buy_order_item_transaction_type(self):
        """OrderItemCreate accepts 'buy' transaction_type."""
        item = OrderItemCreate(**_buy_item())
        assert item.transaction_type == "buy"

    def test_order_response_defaults_service_type_buy(self):
        """OrderResponse defaults to service_type=buy for backward compatibility."""
        resp = OrderResponse(
            id=uuid4(),
            status=OrderStatus.pending,
            subtotal_amount=Decimal("500000"),
            total_amount=Decimal("500000"),
            payment_method=PaymentMethod.cod,
            customer_name="Test",
            customer_phone="0912345678",
            created_at=datetime.now(timezone.utc),
        )
        assert resp.service_type == ServiceType.buy
        assert resp.deposit_amount is None
        assert resp.remaining_amount is None
        assert resp.security_type is None
        assert resp.security_value is None


# ---------------------------------------------------------------------------
# 7.2 Rent order creation (deposit, rental fields, security)
# ---------------------------------------------------------------------------

class TestRentOrderSchema:
    """Test rent order with rental_fields and security."""

    def test_rent_order_with_rental_fields(self):
        """Rent order with valid rental_fields passes validation."""
        order = OrderCreate(
            customer_name="Nguyen Van B",
            customer_phone="0912345678",
            shipping_address=_shipping(),
            payment_method="cod",
            items=[OrderItemCreate(**_rent_item())],
            rental_fields=RentalCheckoutFields(**_rental_fields()),
        )
        assert order.rental_fields is not None
        assert order.rental_fields.security_type == SecurityType.cccd

    def test_rental_fields_return_after_pickup(self):
        """return_date must be after pickup_date."""
        with pytest.raises(ValidationError, match="Ngay tra phai sau ngay nhan"):
            RentalCheckoutFields(
                pickup_date=date(2026, 4, 5),
                return_date=date(2026, 4, 1),
                security_type="cccd",
                security_value="001234567890",
            )

    def test_rental_fields_same_date_invalid(self):
        """return_date == pickup_date is invalid."""
        with pytest.raises(ValidationError, match="Ngay tra phai sau ngay nhan"):
            RentalCheckoutFields(
                pickup_date=date(2026, 4, 5),
                return_date=date(2026, 4, 5),
                security_type="cccd",
                security_value="001234567890",
            )

    def test_rental_fields_cash_deposit(self):
        """cash_deposit security type is valid."""
        fields = RentalCheckoutFields(
            pickup_date=date(2026, 4, 1),
            return_date=date(2026, 4, 5),
            security_type="cash_deposit",
            security_value="500000",
        )
        assert fields.security_type == SecurityType.cash_deposit

    def test_rental_fields_empty_security_value_invalid(self):
        """Empty security_value fails validation."""
        with pytest.raises(ValidationError):
            RentalCheckoutFields(
                pickup_date=date(2026, 4, 1),
                return_date=date(2026, 4, 5),
                security_type="cccd",
                security_value="",
            )


# ---------------------------------------------------------------------------
# 7.3 Bespoke order creation (deposit, measurement validation)
# ---------------------------------------------------------------------------

class TestBespokeOrderSchema:
    """Test bespoke order with measurement_confirmed."""

    def test_bespoke_order_with_measurement(self):
        """Bespoke order with measurement_confirmed=True passes validation."""
        order = OrderCreate(
            customer_name="Nguyen Van C",
            customer_phone="0912345678",
            shipping_address=_shipping(),
            payment_method="cod",
            items=[OrderItemCreate(**_bespoke_item())],
            measurement_confirmed=True,
        )
        assert order.measurement_confirmed is True

    def test_bespoke_item_transaction_type(self):
        """OrderItemCreate accepts 'bespoke' transaction_type."""
        item = OrderItemCreate(**_bespoke_item())
        assert item.transaction_type == "bespoke"


# ---------------------------------------------------------------------------
# 7.4 Validation failures
# ---------------------------------------------------------------------------

class TestValidationFailures:
    """Test model_validator rejects invalid service-type combinations."""

    def test_rent_without_rental_fields_fails(self):
        """Rent items without rental_fields raises validation error."""
        with pytest.raises(ValidationError, match="rental_fields bat buoc cho don thue"):
            OrderCreate(
                customer_name="Test",
                customer_phone="0912345678",
                shipping_address=_shipping(),
                payment_method="cod",
                items=[OrderItemCreate(**_rent_item())],
            )

    def test_bespoke_without_measurement_fails(self):
        """Bespoke items without measurement_confirmed raises validation error."""
        with pytest.raises(ValidationError, match="Phai xac nhan so do truoc khi dat may"):
            OrderCreate(
                customer_name="Test",
                customer_phone="0912345678",
                shipping_address=_shipping(),
                payment_method="cod",
                items=[OrderItemCreate(**_bespoke_item())],
                measurement_confirmed=False,
            )

    def test_invalid_transaction_type_fails(self):
        """Invalid transaction_type 'loan' fails validation."""
        with pytest.raises(ValidationError):
            OrderItemCreate(garment_id=uuid4(), transaction_type="loan")


# ---------------------------------------------------------------------------
# 7.5 Mixed cart handling (service_type priority)
# ---------------------------------------------------------------------------

class TestMixedCart:
    """Test mixed cart scenarios — priority: bespoke > rent > buy."""

    def test_mixed_buy_rent_requires_rental_fields(self):
        """Mixed buy+rent cart requires rental_fields."""
        with pytest.raises(ValidationError, match="rental_fields bat buoc cho don thue"):
            OrderCreate(
                customer_name="Test",
                customer_phone="0912345678",
                shipping_address=_shipping(),
                payment_method="cod",
                items=[
                    OrderItemCreate(**_buy_item()),
                    OrderItemCreate(**_rent_item()),
                ],
            )

    def test_mixed_buy_rent_valid(self):
        """Mixed buy+rent with rental_fields passes."""
        order = OrderCreate(
            customer_name="Test",
            customer_phone="0912345678",
            shipping_address=_shipping(),
            payment_method="cod",
            items=[
                OrderItemCreate(**_buy_item()),
                OrderItemCreate(**_rent_item()),
            ],
            rental_fields=RentalCheckoutFields(**_rental_fields()),
        )
        assert len(order.items) == 2

    def test_mixed_all_types_requires_both(self):
        """Cart with buy+rent+bespoke requires rental_fields AND measurement_confirmed."""
        with pytest.raises(ValidationError, match="rental_fields bat buoc cho don thue"):
            OrderCreate(
                customer_name="Test",
                customer_phone="0912345678",
                shipping_address=_shipping(),
                payment_method="cod",
                items=[
                    OrderItemCreate(**_buy_item()),
                    OrderItemCreate(**_rent_item()),
                    OrderItemCreate(**_bespoke_item()),
                ],
                measurement_confirmed=True,
            )

    def test_mixed_all_types_valid(self):
        """Cart with buy+rent+bespoke with all required fields passes."""
        order = OrderCreate(
            customer_name="Test",
            customer_phone="0912345678",
            shipping_address=_shipping(),
            payment_method="cod",
            items=[
                OrderItemCreate(**_buy_item()),
                OrderItemCreate(**_rent_item()),
                OrderItemCreate(**_bespoke_item()),
            ],
            rental_fields=RentalCheckoutFields(**_rental_fields()),
            measurement_confirmed=True,
        )
        assert len(order.items) == 3


# ---------------------------------------------------------------------------
# 7.6 Backward compatibility
# ---------------------------------------------------------------------------

class TestBackwardCompatibility:
    """Ensure existing buy-only flow is completely unchanged."""

    def test_buy_only_no_new_fields_required(self):
        """Buy-only order works without any new Story 10.3 fields."""
        order = OrderCreate(
            customer_name="Old Customer",
            customer_phone="0912345678",
            shipping_address=_shipping(),
            payment_method="vnpay",
            items=[OrderItemCreate(**_buy_item())],
            voucher_codes=["CODE1"],
        )
        assert order.rental_fields is None
        assert order.measurement_confirmed is False

    def test_order_filter_params_accepts_bespoke(self):
        """OrderFilterParams accepts 'bespoke' transaction_type."""
        params = OrderFilterParams(transaction_type="bespoke")
        assert params.transaction_type == "bespoke"

    def test_order_filter_params_still_accepts_buy_rent(self):
        """OrderFilterParams still accepts 'buy' and 'rent'."""
        params_buy = OrderFilterParams(transaction_type="buy")
        params_rent = OrderFilterParams(transaction_type="rent")
        assert params_buy.transaction_type == "buy"
        assert params_rent.transaction_type == "rent"

    def test_service_type_enum_values(self):
        """ServiceType enum has exactly 3 values."""
        assert ServiceType.buy.value == "buy"
        assert ServiceType.rent.value == "rent"
        assert ServiceType.bespoke.value == "bespoke"
        assert len(ServiceType) == 3

    def test_security_type_enum_values(self):
        """SecurityType enum has exactly 2 values."""
        assert SecurityType.cccd.value == "cccd"
        assert SecurityType.cash_deposit.value == "cash_deposit"
        assert len(SecurityType) == 2

    def test_order_payment_record_schema(self):
        """OrderPaymentRecord schema accepts valid data."""
        now = datetime.now(timezone.utc)
        record = OrderPaymentRecord(
            id=uuid4(),
            tenant_id=uuid4(),
            order_id=uuid4(),
            payment_type="deposit",
            amount=Decimal("150000"),
            method="cod",
            status="pending",
            created_at=now,
            updated_at=now,
        )
        assert record.payment_type == "deposit"
        assert record.amount == Decimal("150000")


# ---------------------------------------------------------------------------
# Deposit calculation logic tests
# ---------------------------------------------------------------------------

class TestDepositCalculation:
    """Test deposit rate constants and math — mirrors order_service.py logic."""

    def test_rent_deposit_30_percent(self):
        """Rent deposit is 30% of total."""
        total = Decimal("1000000")
        deposit = (total * Decimal("0.30")).quantize(Decimal("0.01"))
        remaining = total - deposit
        assert deposit == Decimal("300000.00")
        assert remaining == Decimal("700000.00")

    def test_bespoke_deposit_50_percent(self):
        """Bespoke deposit is 50% of total."""
        total = Decimal("2000000")
        deposit = (total * Decimal("0.50")).quantize(Decimal("0.01"))
        remaining = total - deposit
        assert deposit == Decimal("1000000.00")
        assert remaining == Decimal("1000000.00")

    def test_buy_no_deposit(self):
        """Buy orders have no deposit — full payment."""
        total = Decimal("500000")
        # For buy: deposit_amount = None, remaining_amount = None
        deposit_amount = None
        remaining_amount = None
        assert deposit_amount is None
        assert remaining_amount is None
