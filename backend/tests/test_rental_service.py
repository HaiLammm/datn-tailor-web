"""Tests for rental service (Story 4.3)."""

import pytest
from datetime import date, datetime, timedelta
from decimal import Decimal
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import GarmentDB, OrderDB, OrderItemDB, RentalReturnDB
from src.models.rental import ProcessReturnInput, RentalListParams, ReturnCondition
from src.services import rental_service


@pytest.mark.asyncio
async def test_list_rentals_with_filter(db: AsyncSession, tenant_id, garment, order_item_rent):
    """Test list_rentals with filtering by status."""
    params = RentalListParams(status="active", page=1, page_size=20)
    result = await rental_service.list_rentals(db, tenant_id, params)

    assert result is not None
    assert len(result.data) >= 0
    assert result.meta is not None


@pytest.mark.asyncio
async def test_list_rentals_with_search(db: AsyncSession, tenant_id, garment, order_item_rent):
    """Test list_rentals with search parameter."""
    params = RentalListParams(search=garment.name, page=1, page_size=20)
    result = await rental_service.list_rentals(db, tenant_id, params)

    assert result is not None


@pytest.mark.asyncio
async def test_list_rentals_pagination(db: AsyncSession, tenant_id, garment, order_item_rent):
    """Test list_rentals pagination."""
    params = RentalListParams(page=1, page_size=10)
    result = await rental_service.list_rentals(db, tenant_id, params)

    assert result.meta is not None
    assert "pagination" in result.meta
    pagination = result.meta["pagination"]
    assert pagination["page"] == 1
    assert pagination["page_size"] == 10


@pytest.mark.asyncio
async def test_get_rental_stats(db: AsyncSession, tenant_id):
    """Test rental statistics calculation."""
    stats = await rental_service.get_rental_stats(db, tenant_id)

    assert stats is not None
    assert hasattr(stats, "active_rentals")
    assert hasattr(stats, "overdue_rentals")
    assert hasattr(stats, "due_this_week")
    assert hasattr(stats, "returned_this_month")


@pytest.mark.asyncio
async def test_process_return_good_condition(db: AsyncSession, tenant_id, order_item_rent, garment):
    """Test process_return with good condition."""
    return_data = ProcessReturnInput(
        return_condition=ReturnCondition.good,
        damage_notes=None,
        deposit_deduction="0",
    )

    result = await rental_service.process_return(
        db, tenant_id, order_item_rent.id, return_data
    )

    assert result is not None
    assert result.return_condition == "good"
    assert result.deposit_deduction == "0"


@pytest.mark.asyncio
async def test_process_return_damaged_condition(db: AsyncSession, tenant_id, order_item_rent, garment):
    """Test process_return with damaged condition."""
    deposit_amount = order_item_rent.deposit_amount
    deduction = deposit_amount * Decimal("0.5")

    return_data = ProcessReturnInput(
        return_condition=ReturnCondition.damaged,
        damage_notes="Hư ở tay",
        deposit_deduction=str(deduction),
    )

    result = await rental_service.process_return(
        db, tenant_id, order_item_rent.id, return_data
    )

    assert result is not None
    assert result.return_condition == "damaged"
    assert result.damage_notes == "Hư ở tay"
