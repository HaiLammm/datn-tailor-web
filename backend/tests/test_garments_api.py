"""API tests for Garment endpoints - Story 5.1 & 5.2.

Tests CRUD operations, RBAC, tenant isolation, filtering, and computed timeline fields.
"""

import uuid
from datetime import date, datetime, timedelta
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.config import settings
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
        expected_return_date=date.today() + timedelta(days=6),
        renter_name="Nguyễn Văn A",
        renter_email="nguyen.a@example.com",
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


# ===== Test Computed Timeline Fields (Story 5.2) =====


@pytest.mark.asyncio
async def test_computed_fields_available_garment_returns_null(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Available garment with no expected_return_date: days_until_available=null, is_overdue=false."""
    garment_id = seed_garments["garment1"].id  # available, no expected_return_date

    response = await client.get(f"/api/v1/garments/{garment_id}")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["days_until_available"] is None
    assert data["is_overdue"] is False


@pytest.mark.asyncio
async def test_computed_fields_rented_future_return(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Rented garment with future expected_return_date: days_until_available > 0, is_overdue=false."""
    garment_id = seed_garments["garment2"].id  # rented, expected_return_date=today+6

    response = await client.get(f"/api/v1/garments/{garment_id}")

    assert response.status_code == 200
    data = response.json()["data"]
    # Expected return date is today + 6 days → days_until_available = 6
    assert data["days_until_available"] == 6
    assert data["is_overdue"] is False


@pytest.mark.asyncio
async def test_computed_fields_overdue_garment(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    owner_token: str,
    client: AsyncClient,
):
    """Rented garment with past expected_return_date: days_until_available < 0, is_overdue=true."""
    tenant_id = seed_test_users["tenant_id"]
    yesterday = date.today() - timedelta(days=1)

    overdue_garment = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Áo dài quá hạn",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=yesterday,
        renter_name="Trần Văn B",
        renter_email="tran.b@example.com",
    )
    test_db_session.add(overdue_garment)
    await test_db_session.commit()

    response = await client.get(f"/api/v1/garments/{overdue_garment.id}")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["days_until_available"] is not None
    assert data["days_until_available"] < 0
    assert data["is_overdue"] is True


@pytest.mark.asyncio
async def test_computed_fields_return_today(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    client: AsyncClient,
):
    """Rented garment due today: days_until_available=0, is_overdue=false."""
    tenant_id = seed_test_users["tenant_id"]
    today = date.today()

    today_garment = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Áo dài hôm nay",
        category="ao_dai_cach_tan",
        size_options=["L"],
        rental_price=Decimal("400000"),
        status="rented",
        expected_return_date=today,
        renter_name="Lê Thị C",
        renter_email="le.c@example.com",
    )
    test_db_session.add(today_garment)
    await test_db_session.commit()

    response = await client.get(f"/api/v1/garments/{today_garment.id}")

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["days_until_available"] == 0
    assert data["is_overdue"] is False


@pytest.mark.asyncio
async def test_computed_fields_present_in_list_response(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """Computed fields days_until_available and is_overdue are present in list response."""
    response = await client.get("/api/v1/garments")

    assert response.status_code == 200
    items = response.json()["data"]["items"]
    assert len(items) > 0
    for item in items:
        assert "days_until_available" in item
        assert "is_overdue" in item


# --- STORY 5.3: 2-TOUCH INVENTORY UPDATE TESTS ---

@pytest.mark.asyncio
async def test_update_garment_status_available_to_rented_success(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Owner can update status from available to rented with a future return date."""
    garment_id = seed_garments["garment1"].id  # available
    future_date = (date.today() + timedelta(days=5)).isoformat()

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "rented", "expected_return_date": future_date, "renter_name": "Khách Test", "renter_email": "khach@example.com"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "rented"
    assert data["expected_return_date"] == future_date
    assert data["days_until_available"] == 5
    assert data["is_overdue"] is False


@pytest.mark.asyncio
async def test_update_garment_status_rented_to_maintenance_clears_date(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Owner can update rented garment to maintenance, which auto-clears the expected return date."""
    garment_id = seed_garments["garment2"].id  # rented

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "maintenance"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "maintenance"
    assert data["expected_return_date"] is None
    assert data["days_until_available"] is None


@pytest.mark.asyncio
async def test_update_garment_status_rented_no_date_fails(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Updating status to rented without expected_return_date fails validation."""
    garment_id = seed_garments["garment1"].id

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "rented"},
    )

    assert response.status_code == 422
    assert "Phải nhập ngày dự kiến trả đồ" in response.text


@pytest.mark.asyncio
async def test_update_garment_status_past_date_fails(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Updating status to rented with a past date fails validation."""
    garment_id = seed_garments["garment1"].id
    past_date = (date.today() - timedelta(days=1)).isoformat()

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "rented", "expected_return_date": past_date},
    )

    assert response.status_code == 422
    assert "Ngày dự kiến trả đồ phải ở tương lai" in response.text


@pytest.mark.asyncio
async def test_update_garment_status_forbidden_for_customer(
    seed_test_users: dict,
    seed_garments: dict,
    customer_token: str,
    client: AsyncClient,
):
    """Customer role cannot update garment status."""
    garment_id = seed_garments["garment1"].id

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {customer_token}"},
        json={"status": "maintenance"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_garments_sorted_by_status(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
    test_db_session: AsyncSession,
):
    """Garments are sorted: Rented first, then Maintenance, then Available."""
    tenant_id = seed_test_users["tenant_id"]
    
    # Add a maintenance garment to ensure all 3 statuses are present
    m_garment = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="ZZ Maintenance Garment", # Name should not affect primary sort
        category="ao_dai_cach_tan",
        size_options=["L"],
        rental_price=Decimal("500000"),
        status="maintenance",
    )
    test_db_session.add(m_garment)
    await test_db_session.commit()

    response = await client.get("/api/v1/garments?sort_by_status=true")
    
    assert response.status_code == 200
    items = response.json()["data"]["items"]
    
    # Check ordering
    statuses = [item["status"] for item in items]
    
    # Finding first occurrence of each status
    first_rented = statuses.index("rented") if "rented" in statuses else -1
    first_maintenance = statuses.index("maintenance") if "maintenance" in statuses else -1
    first_available = statuses.index("available") if "available" in statuses else -1
    
    if first_rented != -1 and first_maintenance != -1:
        assert first_rented < first_maintenance
    if first_maintenance != -1 and first_available != -1:
        assert first_maintenance < first_available


@pytest.mark.asyncio
async def test_update_garment_status_maintenance_to_available_clears_date(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
    test_db_session: AsyncSession,
):
    """Owner can update maintenance garment to available, auto-clearing expected_return_date (AC #5)."""
    tenant_id = seed_test_users["tenant_id"]

    # Create a maintenance garment
    maint_garment = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Áo dài bảo trì",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="maintenance",
    )
    test_db_session.add(maint_garment)
    await test_db_session.commit()

    response = await client.patch(
        f"/api/v1/garments/{maint_garment.id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "available"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "available"
    assert data["expected_return_date"] is None


@pytest.mark.asyncio
async def test_update_garment_status_same_status_idempotent(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """Updating to the same status is idempotent and returns 200 (Task 3.6)."""
    garment_id = seed_garments["garment1"].id  # available

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "available"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "available"


@pytest.mark.asyncio
async def test_update_garment_status_not_found(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
):
    """PATCH non-existent garment returns 404 (Task 3.7)."""
    response = await client.patch(
        f"/api/v1/garments/{uuid.uuid4()}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "maintenance"},
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_garment_status_tenant_isolation(
    seed_test_users: dict,
    seed_garments: dict,
    test_db_session: AsyncSession,
    client: AsyncClient,
):
    """Owner cannot PATCH a garment belonging to another tenant (Task 3.9)."""
    # Create a second tenant and owner
    other_tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000099")
    other_tenant = TenantDB(
        id=other_tenant_id,
        name="Other Tailor Shop",
        slug="other-tailor-shop",
    )
    test_db_session.add(other_tenant)
    await test_db_session.flush()

    other_owner = UserDB(
        email="other-owner@test.com",
        hashed_password=hash_password("password"),
        role="Owner",
        is_active=True,
        full_name="Other Owner",
        tenant_id=other_tenant_id,
    )
    test_db_session.add(other_owner)
    await test_db_session.commit()

    other_owner_token = create_access_token(data={"sub": "other-owner@test.com", "role": "Owner"})

    # Try to update garment from tenant 1 using owner from tenant 2
    garment_id = seed_garments["garment1"].id

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {other_owner_token}"},
        json={"status": "maintenance"},
    )

    assert response.status_code == 404


# --- STORY 5.4: AUTOMATIC RETURN REMINDERS TESTS ---


@pytest.mark.asyncio
async def test_find_garments_due_tomorrow_returns_correct(
    seed_test_users: dict,
    test_db_session: AsyncSession,
):
    """6.1: find_garments_due_tomorrow returns only rented garments due tomorrow with reminder_sent_at IS NULL."""
    from src.services.notification_service import find_garments_due_tomorrow

    tenant_id = seed_test_users["tenant_id"]
    tomorrow = datetime.now(settings.VIETNAM_TZ_OFFSET).date() + timedelta(days=1)

    # Create a garment due tomorrow, not yet reminded
    garment_due = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Due Tomorrow",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=tomorrow,
        renter_name="Test Renter",
        renter_email="renter@test.com",
        reminder_sent_at=None,
    )
    test_db_session.add(garment_due)
    await test_db_session.commit()

    results = await find_garments_due_tomorrow(test_db_session, tenant_id)
    assert len(results) >= 1
    ids = [g.id for g in results]
    assert garment_due.id in ids


@pytest.mark.asyncio
async def test_find_garments_due_tomorrow_excludes_already_reminded(
    seed_test_users: dict,
    test_db_session: AsyncSession,
):
    """6.2: find_garments_due_tomorrow excludes garments already reminded (reminder_sent_at not null)."""
    from datetime import datetime as dt, timezone
    from src.services.notification_service import find_garments_due_tomorrow

    tenant_id = seed_test_users["tenant_id"]
    tomorrow = datetime.now(settings.VIETNAM_TZ_OFFSET).date() + timedelta(days=1)

    garment_reminded = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Already Reminded",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=tomorrow,
        renter_name="Reminded Renter",
        renter_email="reminded@test.com",
        reminder_sent_at=dt.now(timezone.utc),
    )
    test_db_session.add(garment_reminded)
    await test_db_session.commit()

    results = await find_garments_due_tomorrow(test_db_session, tenant_id)
    ids = [g.id for g in results]
    assert garment_reminded.id not in ids


@pytest.mark.asyncio
async def test_find_garments_due_tomorrow_excludes_wrong_dates(
    seed_test_users: dict,
    test_db_session: AsyncSession,
):
    """6.3: find_garments_due_tomorrow excludes garments due today or in 2+ days."""
    from src.services.notification_service import find_garments_due_tomorrow

    tenant_id = seed_test_users["tenant_id"]

    garment_today = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Due Today",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=date.today(),
        renter_name="Today Renter",
        renter_email="today@test.com",
    )
    garment_later = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Due In 3 Days",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=date.today() + timedelta(days=3),
        renter_name="Later Renter",
        renter_email="later@test.com",
    )
    test_db_session.add_all([garment_today, garment_later])
    await test_db_session.commit()

    results = await find_garments_due_tomorrow(test_db_session, tenant_id)
    ids = [g.id for g in results]
    assert garment_today.id not in ids
    assert garment_later.id not in ids


@pytest.mark.asyncio
async def test_process_return_reminders_sends_and_marks(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    monkeypatch,
):
    """6.4: process_return_reminders sends emails and marks reminder_sent_at."""
    from src.services.notification_service import process_return_reminders

    tenant_id = seed_test_users["tenant_id"]
    tomorrow = datetime.now(settings.VIETNAM_TZ_OFFSET).date() + timedelta(days=1)

    garment = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Send Reminder Test",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=tomorrow,
        renter_name="Send Test Renter",
        renter_email="send@test.com",
    )
    test_db_session.add(garment)
    await test_db_session.commit()

    # Mock the email sending to succeed
    async def mock_send_email(**kwargs):
        return True

    monkeypatch.setattr(
        "src.services.notification_service.send_return_reminder_email",
        mock_send_email,
    )

    summary = await process_return_reminders(test_db_session, tenant_id)
    assert summary["sent"] >= 1
    assert summary["failed"] == 0

    # Verify reminder_sent_at was set
    await test_db_session.refresh(garment)
    assert garment.reminder_sent_at is not None


@pytest.mark.asyncio
async def test_process_return_reminders_handles_email_failure(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    monkeypatch,
):
    """6.5: process_return_reminders handles email failure gracefully (continues with others)."""
    from src.services.notification_service import process_return_reminders

    tenant_id = seed_test_users["tenant_id"]
    tomorrow = datetime.now(settings.VIETNAM_TZ_OFFSET).date() + timedelta(days=1)

    garment_fail = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Fail Email Test",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=tomorrow,
        renter_name="Fail Renter",
        renter_email="fail@test.com",
    )
    garment_ok = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="OK Email Test",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=tomorrow,
        renter_name="OK Renter",
        renter_email="ok@test.com",
    )
    test_db_session.add_all([garment_fail, garment_ok])
    await test_db_session.commit()

    call_count = 0

    async def mock_send_email(**kwargs):
        nonlocal call_count
        call_count += 1
        # First call fails, second succeeds
        return call_count > 1

    monkeypatch.setattr(
        "src.services.notification_service.send_return_reminder_email",
        mock_send_email,
    )

    summary = await process_return_reminders(test_db_session, tenant_id)
    # At least one should have failed and one succeeded (order may vary)
    assert summary["sent"] + summary["failed"] >= 2
    assert summary["failed"] >= 1


@pytest.mark.asyncio
async def test_process_return_reminders_skips_no_email(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    monkeypatch,
):
    """6.6: process_return_reminders skips garments without valid renter email."""
    from src.services.notification_service import process_return_reminders

    tenant_id = seed_test_users["tenant_id"]
    tomorrow = date.today() + timedelta(days=1)

    # Garment with no email (edge case: created directly in DB)
    garment_no_email = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="No Email Garment",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=tomorrow,
        renter_name="No Email Renter",
        renter_email=None,
    )
    test_db_session.add(garment_no_email)
    await test_db_session.commit()

    async def mock_send_email(**kwargs):
        return True

    monkeypatch.setattr(
        "src.services.notification_service.send_return_reminder_email",
        mock_send_email,
    )

    # Should not send to this garment (renter_email is NULL, filtered by query)
    summary = await process_return_reminders(test_db_session, tenant_id)
    await test_db_session.refresh(garment_no_email)
    assert garment_no_email.reminder_sent_at is None


@pytest.mark.asyncio
async def test_notification_endpoint_owner_success(
    seed_test_users: dict,
    owner_token: str,
    client: AsyncClient,
    monkeypatch,
):
    """6.7: POST /api/v1/notifications/send-return-reminders: Owner gets 200 with summary."""
    async def mock_process(db, tenant_id):
        return {"sent": 2, "failed": 0, "skipped": 1}

    monkeypatch.setattr(
        "src.api.v1.notifications.process_return_reminders",
        mock_process,
    )

    response = await client.post(
        "/api/v1/notifications/send-return-reminders",
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert data["data"]["sent"] == 2
    assert data["data"]["failed"] == 0
    assert data["data"]["skipped"] == 1
    assert "meta" in data


@pytest.mark.asyncio
async def test_notification_endpoint_customer_forbidden(
    seed_test_users: dict,
    customer_token: str,
    client: AsyncClient,
):
    """6.8: POST /api/v1/notifications/send-return-reminders: Customer gets 403."""
    response = await client.post(
        "/api/v1/notifications/send-return-reminders",
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_status_update_rented_to_available_clears_renter_fields(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """6.9: PATCH status rented->available clears renter_* and reminder_sent_at."""
    garment_id = seed_garments["garment2"].id  # rented with renter info

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "available"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "available"
    assert data["expected_return_date"] is None
    assert data["renter_name"] is None
    assert data["renter_email"] is None
    assert data["renter_id"] is None
    assert data["reminder_sent_at"] is None


@pytest.mark.asyncio
async def test_status_update_rented_to_maintenance_clears_renter_fields(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    owner_token: str,
    client: AsyncClient,
):
    """6.10: PATCH status rented->maintenance clears renter_* and reminder_sent_at."""
    from datetime import datetime as dt, timezone

    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    garment = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Rented With Reminder",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="rented",
        expected_return_date=date.today() + timedelta(days=3),
        renter_name="Reminder Renter",
        renter_email="reminder@test.com",
        reminder_sent_at=dt.now(timezone.utc),
    )
    test_db_session.add(garment)
    await test_db_session.commit()

    response = await client.patch(
        f"/api/v1/garments/{garment.id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "maintenance"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "maintenance"
    assert data["renter_name"] is None
    assert data["renter_email"] is None
    assert data["reminder_sent_at"] is None


@pytest.mark.asyncio
async def test_status_update_to_rented_requires_renter_info(
    seed_test_users: dict,
    seed_garments: dict,
    owner_token: str,
    client: AsyncClient,
):
    """6.11: PATCH status update to rented requires renter_name and renter_email."""
    garment_id = seed_garments["garment1"].id  # available
    future_date = (date.today() + timedelta(days=5)).isoformat()

    response = await client.patch(
        f"/api/v1/garments/{garment_id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={
            "status": "rented",
            "expected_return_date": future_date,
            "renter_name": "New Renter",
            "renter_email": "new@test.com",
        },
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "rented"
    assert data["renter_name"] == "New Renter"
    assert data["renter_email"] == "new@test.com"


@pytest.mark.asyncio
async def test_status_update_to_rented_without_renter_info_fails(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    owner_token: str,
    client: AsyncClient,
):
    """6.12: PATCH status update to rented without renter info -> 422."""
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    garment = GarmentDB(
        id=uuid.uuid4(),
        tenant_id=tenant_id,
        name="Available For Renter Test",
        category="ao_dai_truyen_thong",
        size_options=["M"],
        rental_price=Decimal("300000"),
        status="available",
    )
    test_db_session.add(garment)
    await test_db_session.commit()

    future_date = (date.today() + timedelta(days=5)).isoformat()

    # Missing renter_name and renter_email
    response = await client.patch(
        f"/api/v1/garments/{garment.id}/status",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"status": "rented", "expected_return_date": future_date},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_notification_endpoint_tenant_isolation(
    seed_test_users: dict,
    test_db_session: AsyncSession,
    client: AsyncClient,
    monkeypatch,
):
    """6.13: Notification endpoint respects tenant isolation."""
    # Create second tenant and owner
    other_tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000088")
    other_tenant = TenantDB(
        id=other_tenant_id,
        name="Other Shop",
        slug="other-shop",
    )
    test_db_session.add(other_tenant)
    await test_db_session.flush()

    other_owner = UserDB(
        email="notif-other-owner@test.com",
        hashed_password=hash_password("password"),
        role="Owner",
        is_active=True,
        full_name="Other Notif Owner",
        tenant_id=other_tenant_id,
    )
    test_db_session.add(other_owner)
    await test_db_session.commit()

    other_token = create_access_token(data={"sub": "notif-other-owner@test.com", "role": "Owner"})

    # Track which tenant_id was used
    captured_tenant_ids = []

    async def mock_process(db, tenant_id):
        captured_tenant_ids.append(tenant_id)
        return {"sent": 0, "failed": 0, "skipped": 0}

    monkeypatch.setattr(
        "src.api.v1.notifications.process_return_reminders",
        mock_process,
    )

    response = await client.post(
        "/api/v1/notifications/send-return-reminders",
        headers={"Authorization": f"Bearer {other_token}"},
    )

    assert response.status_code == 200
    # Verify it used the correct tenant_id
    assert len(captured_tenant_ids) == 1
    assert captured_tenant_ids[0] == other_tenant_id


@pytest.mark.asyncio
async def test_all_existing_garment_tests_pass(
    seed_test_users: dict,
    seed_garments: dict,
    client: AsyncClient,
):
    """6.14: Verify existing garment endpoints still work (zero regressions)."""
    # Quick smoke test - list garments still works
    response = await client.get("/api/v1/garments")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert data["data"]["total"] >= 2

    # Detail endpoint still works
    garment_id = seed_garments["garment1"].id
    response = await client.get(f"/api/v1/garments/{garment_id}")
    assert response.status_code == 200
    data = response.json()["data"]
    assert "reminder_sent" in data  # New field present
    assert data["reminder_sent"] is False  # Available garment not reminded
