"""API tests for Garment endpoints - Story 5.1.

Tests CRUD operations, RBAC, tenant isolation, and filtering.
"""

import uuid
from datetime import date
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, GarmentDB, TenantDB, UserDB

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
async def override_get_db(test_db_session):
    """Override FastAPI dependency to use test database."""
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(override_get_db):
    """Create async HTTP client for testing."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture
async def seed_test_users(test_db_session: AsyncSession) -> dict:
    """Seed test database with users for different roles."""
    # Create default tenant first
    default_tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    tenant = TenantDB(
        id=default_tenant_id,
        name="Test Tailor Shop",
        slug="test-tailor-shop",
    )
    test_db_session.add(tenant)
    await test_db_session.flush()

    owner = UserDB(
        email="owner@test.com",
        hashed_password=hash_password("password"),
        role="Owner",
        is_active=True,
        full_name="Owner User",
        tenant_id=default_tenant_id,
    )
    customer = UserDB(
        email="customer@test.com",
        hashed_password=hash_password("password"),
        role="Customer",
        is_active=True,
        full_name="Customer User",
    )

    test_db_session.add_all([owner, customer])
    await test_db_session.commit()

    return {"owner": owner, "customer": customer, "tenant_id": default_tenant_id}


@pytest_asyncio.fixture
async def seed_garments(test_db_session: AsyncSession, seed_test_users: dict) -> dict:
    """Seed test database with garments."""
    tenant_id = seed_test_users["tenant_id"]
    
    garment1 = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Áo dài đỏ",
        description="Áo dài lụa đỏ",
        category="ao_dai_truyen_thong",
        color="Đỏ",
        occasion="le_cuoi",
        size_options=["S", "M", "L"],
        rental_price=Decimal("500000"),
        image_url="https://example.com/red.jpg",
        status="available",
    )
    
    garment2 = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Áo dài xanh",
        description="Áo dài cách tân",
        category="ao_dai_cach_tan",
        color="Xanh",
        occasion="cong_so",
        size_options=["M", "L"],
        rental_price=Decimal("400000"),
        status="rented",
        expected_return_date=date(2026, 3, 15),
    )
    
    test_db_session.add_all([garment1, garment2])
    await test_db_session.commit()
    
    return {"garment1": garment1, "garment2": garment2}


@pytest.fixture
def owner_token() -> str:
    """Generate JWT token for Owner user."""
    return create_access_token(data={"sub": "owner@test.com", "role": "Owner"})


@pytest.fixture
def customer_token() -> str:
    """Generate JWT token for Customer user."""
    return create_access_token(data={"sub": "customer@test.com", "role": "Customer"})


# ===== Test GET /api/v1/garments (List) =====


@pytest.mark.asyncio
async def test_list_garments_public_success(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Test public listing of garments (no auth required)."""
    response = await client.get("/api/v1/garments")
    
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "meta" in data
    assert data["data"]["total"] == 2
    assert len(data["data"]["items"]) == 2
    assert data["meta"]["page"] == 1


@pytest.mark.asyncio
async def test_list_garments_with_color_filter(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Test filtering garments by color."""
    response = await client.get("/api/v1/garments", params={"color": "Đỏ"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 1
    assert data["data"]["items"][0]["color"] == "Đỏ"


@pytest.mark.asyncio
async def test_list_garments_with_status_filter(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Test filtering garments by status."""
    response = await client.get("/api/v1/garments", params={"status": "available"})
    
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 1
    assert data["data"]["items"][0]["status"] == "available"


@pytest.mark.asyncio
async def test_list_garments_with_pagination(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Test pagination works correctly."""
    response = await client.get("/api/v1/garments", params={"page": 1, "page_size": 1})
    
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["total"] == 2
    assert len(data["data"]["items"]) == 1
    assert data["meta"]["page"] == 1
    assert data["meta"]["page_size"] == 1
    assert data["meta"]["total_pages"] == 2


# ===== Test GET /api/v1/garments/{id} (Detail) =====


@pytest.mark.asyncio
async def test_get_garment_detail_success(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Test getting garment detail (public endpoint)."""
    garment_id = seed_garments["garment1"].id
    
    response = await client.get(f"/api/v1/garments/{garment_id}")
    
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert data["data"]["id"] == str(garment_id)
    assert data["data"]["name"] == "Áo dài đỏ"


@pytest.mark.asyncio
async def test_get_garment_detail_not_found(
    seed_test_users: dict,
    client: AsyncClient,
):
    """Test getting non-existent garment returns 404."""
    response = await client.get(f"/api/v1/garments/{uuid.uuid4()}")
    
    assert response.status_code == 404
    assert "detail" in response.json()


# ===== Test POST /api/v1/garments (Create - Owner only) =====


@pytest.mark.asyncio
async def test_create_garment_success_owner(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test creating garment with Owner role."""
    response = await client.post(
        "/api/v1/garments",
        json={
            "name": "Áo dài mới",
            "description": "Áo dài đẹp",
            "category": "ao_dai_cuoi",
            "color": "Trắng",
            "occasion": "le_cuoi",
            "size_options": ["M", "L", "XL"],
            "rental_price": "800000",
            "image_url": "https://example.com/new.jpg",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    
    assert response.status_code == 201
    data = response.json()
    assert "data" in data
    assert data["data"]["name"] == "Áo dài mới"
    assert data["data"]["status"] == "available"


@pytest.mark.asyncio
async def test_create_garment_forbidden_customer(
    seed_test_users: dict,
    customer_token: str,
    client: AsyncClient,
):
    """Test creating garment with Customer role returns 403."""
    response = await client.post(
        "/api/v1/garments",
        json={
            "name": "Áo dài mới",
            "category": "ao_dai_cuoi",
            "size_options": ["M", "L"],
            "rental_price": "500000",
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_create_garment_validation_error(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test creating garment with invalid data returns 422."""
    response = await client.post(
        "/api/v1/garments",
        json={
            "name": "Test",
            "category": "invalid_category",
            "size_options": ["M"],
            "rental_price": "500000",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_garment_invalid_size_options(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test creating garment with invalid size options returns 422."""
    response = await client.post(
        "/api/v1/garments",
        json={
            "name": "Test",
            "category": "ao_dai_cuoi",
            "size_options": ["XXXL"],  # Invalid size
            "rental_price": "500000",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    
    assert response.status_code == 422


# ===== Test PUT /api/v1/garments/{id} (Update - Owner only) =====


@pytest.mark.asyncio
async def test_update_garment_success_owner(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test updating garment with Owner role."""
    garment_id = seed_garments["garment1"].id
    
    response = await client.put(
        f"/api/v1/garments/{garment_id}",
        json={
            "name": "Áo dài đỏ cập nhật",
            "status": "maintenance",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["data"]["name"] == "Áo dài đỏ cập nhật"
    assert data["data"]["status"] == "maintenance"


@pytest.mark.asyncio
async def test_update_garment_forbidden_customer(
    seed_test_users: dict,
    seed_garments: dict,
    customer_token: str,
    client: AsyncClient,
):
    """Test updating garment with Customer role returns 403."""
    garment_id = seed_garments["garment1"].id
    
    response = await client.put(
        f"/api/v1/garments/{garment_id}",
        json={"status": "rented"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_update_garment_not_found(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test updating non-existent garment returns 404."""
    response = await client.put(
        f"/api/v1/garments/{uuid.uuid4()}",
        json={"name": "Updated"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    
    assert response.status_code == 404


# ===== Test DELETE /api/v1/garments/{id} (Delete - Owner only) =====


@pytest.mark.asyncio
async def test_delete_garment_success_owner(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test deleting garment with Owner role."""
    garment_id = seed_garments["garment1"].id
    
    response = await client.delete(
        f"/api/v1/garments/{garment_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_delete_garment_forbidden_customer(
    seed_test_users: dict,
    seed_garments: dict,
    customer_token: str,
    client: AsyncClient,
):
    """Test deleting garment with Customer role returns 403."""
    garment_id = seed_garments["garment1"].id
    
    response = await client.delete(
        f"/api/v1/garments/{garment_id}",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_delete_garment_not_found(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test deleting non-existent garment returns 404."""
    response = await client.delete(
        f"/api/v1/garments/{uuid.uuid4()}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    
    assert response.status_code == 404


# ===== Test RBAC and Tenant Isolation =====


@pytest.mark.asyncio
async def test_rbac_customer_get_allowed(
    seed_test_users: dict,
    seed_garments: dict,
    customer_token: str,
    client: AsyncClient,
):
    """Test Customer can GET garments (public browsing)."""
    response = await client.get("/api/v1/garments")
    
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_rbac_customer_post_forbidden(
    seed_test_users: dict,
    customer_token: str,
    client: AsyncClient,
):
    """Test Customer POST is forbidden."""
    response = await client.post(
        "/api/v1/garments",
        json={
            "name": "Test",
            "category": "ao_dai_cuoi",
            "size_options": ["M"],
            "rental_price": "500000",
        },
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_rbac_owner_crud_allowed(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Test Owner can perform all CRUD operations."""
    # Create
    create_response = await client.post(
        "/api/v1/garments",
        json={
            "name": "Test CRUD",
            "category": "ao_dai_cuoi",
            "size_options": ["M", "L"],
            "rental_price": "500000",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert create_response.status_code == 201
    
    garment_id = create_response.json()["data"]["id"]
    
    # Update
    update_response = await client.put(
        f"/api/v1/garments/{garment_id}",
        json={"name": "Updated"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert update_response.status_code == 200
    
    # Delete
    delete_response = await client.delete(
        f"/api/v1/garments/{garment_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert delete_response.status_code == 204
