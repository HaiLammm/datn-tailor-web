"""Service tests for Garment Service - Story 5.1.

Tests garment CRUD operations with multi-tenant isolation.
"""

import uuid
from datetime import date, datetime
from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.models.db_models import Base, GarmentDB, TenantDB
from src.models.garment import GarmentCreate, GarmentFilter, GarmentUpdate
from src.services import garment_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def test_db_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    """Create test database session."""
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_tenants(test_db_session: AsyncSession) -> dict[str, uuid.UUID]:
    """Seed test database with tenants."""
    tenant1_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    tenant2_id = uuid.UUID("00000000-0000-0000-0000-000000000002")
    
    tenant1 = TenantDB(id=tenant1_id, name="Shop 1", slug="shop-1")
    tenant2 = TenantDB(id=tenant2_id, name="Shop 2", slug="shop-2")
    
    test_db_session.add_all([tenant1, tenant2])
    await test_db_session.commit()
    
    return {"tenant1": tenant1_id, "tenant2": tenant2_id}


@pytest_asyncio.fixture
async def seed_garments(test_db_session: AsyncSession, seed_tenants: dict) -> dict:
    """Seed test database with garments."""
    tenant1_id = seed_tenants["tenant1"]
    tenant2_id = seed_tenants["tenant2"]
    
    garment1 = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant1_id,
        name="Áo dài truyền thống đỏ",
        description="Áo dài lụa đỏ sang trọng",
        category="ao_dai_truyen_thong",
        color="Đỏ",
        occasion="le_cuoi",
        size_options=["S", "M", "L"],
        rental_price=Decimal("500000"),
        image_url="https://example.com/ao-dai-do.jpg",
        status="available",
    )
    
    garment2 = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant1_id,
        name="Áo dài cách tân xanh",
        description="Áo dài cách tân hiện đại",
        category="ao_dai_cach_tan",
        color="Xanh",
        occasion="cong_so",
        size_options=["M", "L", "XL"],
        rental_price=Decimal("400000"),
        image_url="https://example.com/ao-dai-xanh.jpg",
        status="rented",
        expected_return_date=date(2026, 3, 15),
    )
    
    # Garment for tenant2 (should be isolated)
    garment3 = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant2_id,
        name="Áo dài tenant 2",
        description="Garment for different tenant",
        category="ao_dai_truyen_thong",
        color="Vàng",
        occasion="tet",
        size_options=["S", "M"],
        rental_price=Decimal("600000"),
        status="available",
    )
    
    test_db_session.add_all([garment1, garment2, garment3])
    await test_db_session.commit()
    
    return {
        "garment1": garment1,
        "garment2": garment2,
        "garment3": garment3,
    }


# ===== Test list_garments =====


@pytest.mark.asyncio
async def test_list_garments_returns_all_for_tenant(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test listing all garments for a tenant."""
    tenant1_id = seed_tenants["tenant1"]
    
    garments, total = await garment_service.list_garments(test_db_session, tenant1_id)
    
    assert total == 2  # Only tenant1's garments
    assert len(garments) == 2
    assert all(g.tenant_id == tenant1_id for g in garments)


@pytest.mark.asyncio
async def test_list_garments_tenant_isolation(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test multi-tenant isolation - tenant2 should not see tenant1 garments."""
    tenant2_id = seed_tenants["tenant2"]
    
    garments, total = await garment_service.list_garments(test_db_session, tenant2_id)
    
    assert total == 1  # Only tenant2's garment
    assert len(garments) == 1
    assert garments[0].tenant_id == tenant2_id
    assert garments[0].name == "Áo dài tenant 2"


@pytest.mark.asyncio
async def test_list_garments_filter_by_color(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test filtering garments by color."""
    tenant1_id = seed_tenants["tenant1"]
    
    filters = GarmentFilter(color="Đỏ", page=1, page_size=20)
    garments, total = await garment_service.list_garments(test_db_session, tenant1_id, filters)
    
    assert total == 1
    assert garments[0].color == "Đỏ"


@pytest.mark.asyncio
async def test_list_garments_filter_by_occasion(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test filtering garments by occasion."""
    from src.models.garment import GarmentOccasion
    
    tenant1_id = seed_tenants["tenant1"]
    
    filters = GarmentFilter(occasion=GarmentOccasion.LE_CUOI, page=1, page_size=20)
    garments, total = await garment_service.list_garments(test_db_session, tenant1_id, filters)
    
    assert total == 1
    assert garments[0].occasion == "le_cuoi"


@pytest.mark.asyncio
async def test_list_garments_filter_by_status(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test filtering garments by status."""
    from src.models.garment import GarmentStatus
    
    tenant1_id = seed_tenants["tenant1"]
    
    filters = GarmentFilter(status=GarmentStatus.RENTED, page=1, page_size=20)
    garments, total = await garment_service.list_garments(test_db_session, tenant1_id, filters)
    
    assert total == 1
    assert garments[0].status == "rented"


@pytest.mark.asyncio
async def test_list_garments_pagination(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test pagination works correctly."""
    tenant1_id = seed_tenants["tenant1"]
    
    filters = GarmentFilter(page=1, page_size=1)
    garments, total = await garment_service.list_garments(test_db_session, tenant1_id, filters)
    
    assert total == 2
    assert len(garments) == 1  # Only 1 per page


# ===== Test get_garment =====


@pytest.mark.asyncio
async def test_get_garment_success(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test getting a garment by ID."""
    tenant1_id = seed_tenants["tenant1"]
    garment1_id = seed_garments["garment1"].id
    
    garment = await garment_service.get_garment(test_db_session, tenant1_id, garment1_id)
    
    assert garment is not None
    assert garment.id == garment1_id
    assert garment.name == "Áo dài truyền thống đỏ"


@pytest.mark.asyncio
async def test_get_garment_not_found(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test getting a non-existent garment returns None."""
    tenant1_id = seed_tenants["tenant1"]
    
    garment = await garment_service.get_garment(test_db_session, tenant1_id, uuid.uuid4())
    
    assert garment is None


@pytest.mark.asyncio
async def test_get_garment_tenant_isolation(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test tenant isolation - cannot get garment from different tenant."""
    tenant1_id = seed_tenants["tenant1"]
    garment3_id = seed_garments["garment3"].id  # Belongs to tenant2
    
    garment = await garment_service.get_garment(test_db_session, tenant1_id, garment3_id)
    
    assert garment is None  # Should not find tenant2's garment


# ===== Test create_garment =====


@pytest.mark.asyncio
async def test_create_garment_success(
    test_db_session: AsyncSession,
    seed_tenants: dict,
):
    """Test creating a new garment."""
    from src.models.garment import GarmentCategory, GarmentOccasion
    
    tenant1_id = seed_tenants["tenant1"]
    
    data = GarmentCreate(
        name="Áo dài mới",
        description="Áo dài đẹp",
        category=GarmentCategory.AO_DAI_CUOI,
        color="Trắng",
        occasion=GarmentOccasion.LE_CUOI,
        size_options=["M", "L"],
        rental_price=Decimal("800000"),
        image_url="https://example.com/new.jpg",
    )
    
    garment = await garment_service.create_garment(test_db_session, tenant1_id, data)
    
    assert garment.id is not None
    assert garment.tenant_id == tenant1_id
    assert garment.name == "Áo dài mới"
    assert garment.status == "available"  # Default status


# ===== Test update_garment =====


@pytest.mark.asyncio
async def test_update_garment_success(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test updating a garment."""
    from src.models.garment import GarmentStatus
    
    tenant1_id = seed_tenants["tenant1"]
    garment1_id = seed_garments["garment1"].id
    
    data = GarmentUpdate(
        name="Áo dài đỏ cập nhật",
        status=GarmentStatus.MAINTENANCE,
    )
    
    garment = await garment_service.update_garment(test_db_session, tenant1_id, garment1_id, data)
    
    assert garment is not None
    assert garment.name == "Áo dài đỏ cập nhật"
    assert garment.status == "maintenance"


@pytest.mark.asyncio
async def test_update_garment_not_found(
    test_db_session: AsyncSession,
    seed_tenants: dict,
):
    """Test updating a non-existent garment returns None."""
    from src.models.garment import GarmentStatus
    
    tenant1_id = seed_tenants["tenant1"]
    
    data = GarmentUpdate(status=GarmentStatus.RENTED)
    
    garment = await garment_service.update_garment(test_db_session, tenant1_id, uuid.uuid4(), data)
    
    assert garment is None


# ===== Test delete_garment =====


@pytest.mark.asyncio
async def test_delete_garment_success(
    test_db_session: AsyncSession,
    seed_tenants: dict,
    seed_garments: dict,
):
    """Test deleting a garment."""
    tenant1_id = seed_tenants["tenant1"]
    garment1_id = seed_garments["garment1"].id
    
    deleted = await garment_service.delete_garment(test_db_session, tenant1_id, garment1_id)
    
    assert deleted is True
    
    # Verify garment is deleted
    garment = await garment_service.get_garment(test_db_session, tenant1_id, garment1_id)
    assert garment is None


@pytest.mark.asyncio
async def test_delete_garment_not_found(
    test_db_session: AsyncSession,
    seed_tenants: dict,
):
    """Test deleting a non-existent garment returns False."""
    tenant1_id = seed_tenants["tenant1"]
    
    deleted = await garment_service.delete_garment(test_db_session, tenant1_id, uuid.uuid4())
    
    assert deleted is False
