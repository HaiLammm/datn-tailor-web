"""Tests for rental service (Story 4.3).

Uses in-memory SQLite with inline fixtures — follows project test patterns.
"""

import uuid
from datetime import date, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.security import create_access_token
from src.main import app
from src.models.db_models import (
    Base,
    GarmentDB,
    OrderDB,
    OrderItemDB,
    RentalReturnDB,
    TenantDB,
    UserDB,
)
from src.models.rental import ProcessReturnInput, RentalListParams, ReturnCondition
from src.services import rental_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_rental_data(test_db_session):
    """Seed tenant, owner, garment, order, and rent order_item for testing."""
    db = test_db_session

    tenant = TenantDB(id=DEFAULT_TENANT_ID, name="Test Shop", slug="test-shop")
    db.add(tenant)

    owner = UserDB(
        email="owner@test.com",
        hashed_password="hashed",
        role="Owner",
        tenant_id=DEFAULT_TENANT_ID,
        full_name="Owner Test",
    )
    db.add(owner)

    garment = GarmentDB(
        tenant_id=DEFAULT_TENANT_ID,
        name="Áo Dài Đỏ Test",
        category="ao_dai",
        rental_price=Decimal("500000"),
        sale_price=Decimal("2000000"),
        status="rented",
        size_options=["S", "M", "L"],
        image_urls=[],
    )
    db.add(garment)
    await db.flush()

    order = OrderDB(
        tenant_id=DEFAULT_TENANT_ID,
        customer_name="Nguyễn Văn A",
        customer_phone="0912345678",
        shipping_address={"province": "HCM", "district": "Q1", "ward": "P1", "address_detail": "123 ABC"},
        payment_method="cod",
        status="confirmed",
        total_amount=Decimal("1500000"),
    )
    db.add(order)
    await db.flush()

    today = date.today()
    order_item = OrderItemDB(
        order_id=order.id,
        garment_id=garment.id,
        transaction_type="rent",
        start_date=today - timedelta(days=5),
        end_date=today + timedelta(days=2),
        rental_days=7,
        rental_status="active",
        deposit_amount=Decimal("150000"),
        unit_price=Decimal("500000"),
        total_price=Decimal("3500000"),
        quantity=1,
    )
    db.add(order_item)
    await db.flush()
    await db.commit()

    return {
        "tenant_id": DEFAULT_TENANT_ID,
        "owner": owner,
        "garment": garment,
        "order": order,
        "order_item": order_item,
    }


@pytest.mark.asyncio
async def test_list_rentals_returns_data(test_db_session, seed_rental_data):
    """list_rentals returns seeded rental item."""
    params = RentalListParams(page=1, page_size=20)
    result = await rental_service.list_rentals(
        test_db_session, seed_rental_data["tenant_id"], params
    )

    assert result is not None
    assert len(result.data) == 1
    assert result.data[0].garment_name == "Áo Dài Đỏ Test"
    assert result.data[0].customer_name == "Nguyễn Văn A"
    assert result.meta["pagination"]["total"] == 1


@pytest.mark.asyncio
async def test_list_rentals_filter_active(test_db_session, seed_rental_data):
    """list_rentals with status=active returns only active items."""
    params = RentalListParams(status="active", page=1, page_size=20)
    result = await rental_service.list_rentals(
        test_db_session, seed_rental_data["tenant_id"], params
    )

    assert len(result.data) == 1
    assert result.data[0].rental_status == "active"


@pytest.mark.asyncio
async def test_list_rentals_filter_returned_empty(test_db_session, seed_rental_data):
    """list_rentals with status=returned is empty when nothing returned."""
    params = RentalListParams(status="returned", page=1, page_size=20)
    result = await rental_service.list_rentals(
        test_db_session, seed_rental_data["tenant_id"], params
    )

    assert len(result.data) == 0


@pytest.mark.asyncio
async def test_list_rentals_search_by_customer(test_db_session, seed_rental_data):
    """list_rentals search by customer name."""
    params = RentalListParams(search="Nguyễn", page=1, page_size=20)
    result = await rental_service.list_rentals(
        test_db_session, seed_rental_data["tenant_id"], params
    )

    assert len(result.data) == 1


@pytest.mark.asyncio
async def test_list_rentals_search_no_match(test_db_session, seed_rental_data):
    """list_rentals search with no match returns empty."""
    params = RentalListParams(search="ZZZZNOTFOUND", page=1, page_size=20)
    result = await rental_service.list_rentals(
        test_db_session, seed_rental_data["tenant_id"], params
    )

    assert len(result.data) == 0


@pytest.mark.asyncio
async def test_get_rental_stats(test_db_session, seed_rental_data):
    """get_rental_stats returns correct counts."""
    stats = await rental_service.get_rental_stats(
        test_db_session, seed_rental_data["tenant_id"]
    )

    assert stats.active_rentals >= 1
    assert stats.overdue_rentals == 0
    assert stats.returned_this_month == 0


@pytest.mark.asyncio
async def test_process_return_good(test_db_session, seed_rental_data):
    """process_return with good condition sets garment to available."""
    data = seed_rental_data
    return_input = ProcessReturnInput(
        return_condition=ReturnCondition.good,
        deposit_deduction=Decimal("0"),
    )

    result = await rental_service.process_return(
        test_db_session,
        data["tenant_id"],
        data["order_item"].id,
        return_input,
        processed_by_id=data["owner"].id,
    )

    assert result.return_condition == "good"
    assert result.order_item_id == data["order_item"].id

    # Verify order_item status updated
    await test_db_session.refresh(data["order_item"])
    assert data["order_item"].rental_status == "returned"

    # Verify garment status reset
    await test_db_session.refresh(data["garment"])
    assert data["garment"].status == "available"


@pytest.mark.asyncio
async def test_process_return_damaged(test_db_session, seed_rental_data):
    """process_return with damaged condition sets garment to maintenance."""
    data = seed_rental_data
    return_input = ProcessReturnInput(
        return_condition=ReturnCondition.damaged,
        damage_notes="Rách tay áo trái",
        deposit_deduction=Decimal("75000"),
    )

    result = await rental_service.process_return(
        test_db_session,
        data["tenant_id"],
        data["order_item"].id,
        return_input,
    )

    assert result.return_condition == "damaged"
    assert result.damage_notes == "Rách tay áo trái"

    await test_db_session.refresh(data["garment"])
    assert data["garment"].status == "maintenance"


@pytest.mark.asyncio
async def test_process_return_already_returned_fails(test_db_session, seed_rental_data):
    """process_return on already returned item raises 422."""
    data = seed_rental_data

    # First return
    await rental_service.process_return(
        test_db_session,
        data["tenant_id"],
        data["order_item"].id,
        ProcessReturnInput(return_condition=ReturnCondition.good, deposit_deduction=Decimal("0")),
    )

    # Second return should fail
    from fastapi import HTTPException

    with pytest.raises(HTTPException) as exc_info:
        await rental_service.process_return(
            test_db_session,
            data["tenant_id"],
            data["order_item"].id,
            ProcessReturnInput(return_condition=ReturnCondition.good, deposit_deduction=Decimal("0")),
        )

    assert exc_info.value.status_code == 422
