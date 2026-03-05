"""API tests for Customer Profile and Measurements endpoints.

Story 1.3: Quản lý Hồ sơ & Số đo
Tests CRUD operations, RBAC, validation, and edge cases.
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
from src.models.db_models import Base, CustomerProfileDB, MeasurementDB, TenantDB, UserDB

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
    # Create default tenant first (required for multi-tenant support)
    default_tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
    tenant = TenantDB(
        id=default_tenant_id,
        name="Test Tailor Shop",
        slug="test-tailor-shop",
    )
    test_db_session.add(tenant)
    await test_db_session.flush()  # Ensure tenant exists before creating users with FK

    owner = UserDB(
        email="owner@test.com",
        hashed_password=hash_password("password"),
        role="Owner",
        is_active=True,
        full_name="Owner User",
        tenant_id=default_tenant_id,  # Assign tenant for multi-tenant support
    )
    tailor = UserDB(
        email="tailor@test.com",
        hashed_password=hash_password("password"),
        role="Tailor",
        is_active=True,
        full_name="Tailor User",
        tenant_id=default_tenant_id,  # Assign tenant for multi-tenant support
    )
    customer = UserDB(
        email="customer@test.com",
        hashed_password=hash_password("password"),
        role="Customer",
        is_active=True,
        full_name="Customer User",
    )

    test_db_session.add_all([owner, tailor, customer])
    await test_db_session.commit()

    return {"owner": owner, "tailor": tailor, "customer": customer}


@pytest.fixture
def owner_token() -> str:
    """Generate JWT token for Owner user."""
    return create_access_token(data={"sub": "owner@test.com", "role": "Owner"})


@pytest.fixture
def tailor_token() -> str:
    """Generate JWT token for Tailor user."""
    return create_access_token(data={"sub": "tailor@test.com", "role": "Tailor"})


@pytest.fixture
def customer_token() -> str:
    """Generate JWT token for Customer user."""
    return create_access_token(data={"sub": "customer@test.com", "role": "Customer"})


# ===== Test Customer Profile CRUD =====


@pytest.mark.asyncio
async def test_create_customer_success(
    seed_test_users: dict, owner_token: str, client: AsyncClient
):
    """AC1, AC2: Create customer profile successfully with Owner role."""
    response = await client.post(
        "/api/v1/customers",
        json={
            "full_name": "Nguyễn Văn A",
            "phone": "0901234567",
            "email": "nguyenvana@example.com",
            "gender": "Nam",
            "address": "123 Đường ABC, TP.HCM",
            "notes": "Khách hàng VIP",
        },
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Nguyễn Văn A"
    assert data["phone"] == "0901234567"
    assert data["has_account"] is False
    assert data["measurement_count"] == 0


@pytest.mark.asyncio
async def test_create_customer_with_measurements(
    seed_test_users: dict, tailor_token: str, client: AsyncClient
):
    """AC3: Create customer with initial measurements."""
    response = await client.post(
        "/api/v1/customers",
        json={
            "full_name": "Trần Thị B",
            "phone": "0987654321",
            "initial_measurements": {
                "neck": 38.5,
                "bust": 90.0,
                "waist": 70.0,
                "hip": 95.0,
                "height": 165.0,
            },
        },
        headers={"Authorization": f"Bearer {tailor_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["measurement_count"] == 1


@pytest.mark.asyncio
async def test_create_customer_duplicate_phone(
    test_db_session: AsyncSession, seed_test_users: dict, owner_token: str, client: AsyncClient
):
    """AC6: Prevent duplicate phone within tenant."""
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Create first customer
    customer1 = CustomerProfileDB(
        tenant_id=tenant_id,
        full_name="First Customer",
        phone="0901111111",
    )
    test_db_session.add(customer1)
    await test_db_session.commit()

    # Try to create second customer with same phone
    response = await client.post(
        "/api/v1/customers",
        json={"full_name": "Second Customer", "phone": "0901111111"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 409
    assert "đã được sử dụng" in response.json()["detail"]


@pytest.mark.asyncio
async def test_create_customer_invalid_phone_format(seed_test_users: dict, owner_token: str, client: AsyncClient):
    """AC6: Validate Vietnamese phone format."""
    response = await client.post(
        "/api/v1/customers",
        json={"full_name": "Test User", "phone": "12345"},  # Invalid format
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_create_customer_unauthorized(seed_test_users: dict, customer_token: str, client: AsyncClient):
    """AC1: Customer role cannot create customer profiles."""
    response = await client.post(
        "/api/v1/customers",
        json={"full_name": "Test", "phone": "0901234567"},
        headers={"Authorization": f"Bearer {customer_token}"},
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_customers_with_search(
    test_db_session: AsyncSession, seed_test_users: dict, owner_token: str, client: AsyncClient
):
    """AC7, AC8: List customers with search functionality."""
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Seed customers
    customers = [
        CustomerProfileDB(
            tenant_id=tenant_id, full_name="Nguyễn Văn A", phone="0901111111"
        ),
        CustomerProfileDB(
            tenant_id=tenant_id, full_name="Trần Thị B", phone="0902222222"
        ),
        CustomerProfileDB(
            tenant_id=tenant_id, full_name="Lê Văn C", phone="0903333333"
        ),
    ]
    test_db_session.add_all(customers)
    await test_db_session.commit()

    # Search by name
    response = await client.get(
        "/api/v1/customers?search=Nguyễn",
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["pagination"]["total"] == 1
    assert data["customers"][0]["full_name"] == "Nguyễn Văn A"


@pytest.mark.asyncio
async def test_get_customer_detail(
    test_db_session: AsyncSession, seed_test_users: dict, owner_token: str, client: AsyncClient
):
    """AC9: Get customer with measurements history."""
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Create customer
    customer = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Test Customer", phone="0901234567"
    )
    test_db_session.add(customer)
    await test_db_session.flush()

    # Create measurements
    measurements = [
        MeasurementDB(
            customer_profile_id=customer.id,
            tenant_id=tenant_id,
            bust=Decimal("90.0"),
            waist=Decimal("70.0"),
            is_default=True,
            measured_date=date(2026, 1, 1),
        ),
        MeasurementDB(
            customer_profile_id=customer.id,
            tenant_id=tenant_id,
            bust=Decimal("92.0"),
            waist=Decimal("72.0"),
            is_default=False,
            measured_date=date(2026, 2, 1),
        ),
    ]
    test_db_session.add_all(measurements)
    await test_db_session.commit()

    response = await client.get(
        f"/api/v1/customers/{customer.id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["measurements"]) == 2
    assert data["default_measurement"]["bust"] == "90.0"


# ===== Test Measurement Operations =====


@pytest.mark.asyncio
async def test_create_measurement_auto_default(
    test_db_session: AsyncSession, seed_test_users: dict, tailor_token: str, client: AsyncClient
):
    """AC3: First measurement auto set as default."""
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    customer = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Test", phone="0901234567"
    )
    test_db_session.add(customer)
    await test_db_session.commit()

    response = await client.post(
        f"/api/v1/customers/{customer.id}/measurements",
        json={"neck": 38.0, "bust": 90.0, "waist": 70.0},
        headers={"Authorization": f"Bearer {tailor_token}"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["is_default"] is True


@pytest.mark.asyncio
async def test_set_default_measurement(
    test_db_session: AsyncSession, seed_test_users: dict, owner_token: str, client: AsyncClient
):
    """AC9: Set measurement as default, unset previous."""
    tenant_id = uuid.UUID("00000000-0000-0000-0000-000000000001")

    customer = CustomerProfileDB(
        tenant_id=tenant_id, full_name="Test", phone="0901234567"
    )
    test_db_session.add(customer)
    await test_db_session.flush()

    # Create two measurements
    m1 = MeasurementDB(
        customer_profile_id=customer.id,
        tenant_id=tenant_id,
        bust=Decimal("90.0"),
        is_default=True,
    )
    m2 = MeasurementDB(
        customer_profile_id=customer.id,
        tenant_id=tenant_id,
        bust=Decimal("92.0"),
        is_default=False,
    )
    test_db_session.add_all([m1, m2])
    await test_db_session.commit()

    # Set m2 as default
    response = await client.patch(
        f"/api/v1/customers/measurements/{m2.id}/set-default",
        params={"customer_id": str(customer.id)},
        headers={"Authorization": f"Bearer {owner_token}"},
    )

    assert response.status_code == 200

    # Verify m1 is no longer default
    await test_db_session.refresh(m1)
    await test_db_session.refresh(m2)
    assert m1.is_default is False
    assert m2.is_default is True


@pytest.mark.asyncio
async def test_measurement_validation_ranges(
    seed_test_users: dict, owner_token: str, client: AsyncClient
):
    """AC6: Validate measurement value ranges.
    
    Review Fix: Create customer first to ensure 422 validation error, not 404 customer not found.
    """
    # Create customer first
    create_response = await client.post(
        "/api/v1/customers",
        json={"full_name": "Test Customer", "phone": "0909999999"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert create_response.status_code == 201
    customer_id = create_response.json()["id"]

    # Test 1: Invalid bust value (too small - below minimum 60)
    response = await client.post(
        f"/api/v1/customers/{customer_id}/measurements",
        json={"bust": 30.0},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 422
    detail = str(response.json()["detail"])
    assert "bust" in detail.lower()

    # Test 2: Invalid waist value (too large - above maximum 150)
    response = await client.post(
        f"/api/v1/customers/{customer_id}/measurements",
        json={"waist": 200.0},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 422
    detail = str(response.json()["detail"])
    assert "waist" in detail.lower()

    # Test 3: Valid measurement should succeed
    response = await client.post(
        f"/api/v1/customers/{customer_id}/measurements",
        json={"bust": 90.0, "waist": 70.0, "hip": 95.0},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert response.status_code == 201


@pytest.mark.asyncio
async def test_delete_customer_owner_only(
    seed_test_users: dict,
    owner_token: str,
    tailor_token: str,
    customer_token: str,
    test_db_session: AsyncSession,
    client: AsyncClient,
):
    """AC10: DELETE endpoint requires Owner role ONLY (RBAC violation fix).
    
    Review Finding: [High] Restrict DELETE /api/v1/customers/{customer_id} to Owner role only.
    """
    # Test 1: Create customer and verify Owner can delete (204)
    create_response = await client.post(
        "/api/v1/customers",
        json={"full_name": "Test Customer", "phone": "0901234567"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert create_response.status_code == 201
    customer_id = create_response.json()["id"]
    
    delete_response = await client.delete(
        f"/api/v1/customers/{customer_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert delete_response.status_code == 204
    
    # Verify customer is soft-deleted (GET returns 404)
    get_response = await client.get(
        f"/api/v1/customers/{customer_id}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert get_response.status_code == 404
    
    # Test 2: Tailor cannot delete - should fail (403 Forbidden)
    create_response2 = await client.post(
        "/api/v1/customers",
        json={"full_name": "Test Customer 2", "phone": "0902345678"},
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert create_response2.status_code == 201
    customer_id2 = create_response2.json()["id"]
    
    delete_response2 = await client.delete(
        f"/api/v1/customers/{customer_id2}",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert delete_response2.status_code == 403
    assert "không có quyền" in delete_response2.json()["detail"].lower()
    
    # Verify customer NOT deleted (GET still works)
    get_response2 = await client.get(
        f"/api/v1/customers/{customer_id2}",
        headers={"Authorization": f"Bearer {owner_token}"},
    )
    assert get_response2.status_code == 200
    
    # Test 3: Customer role cannot delete - should fail (403)
    delete_response3 = await client.delete(
        f"/api/v1/customers/{customer_id2}",
        headers={"Authorization": f"Bearer {customer_token}"},
    )
    assert delete_response3.status_code == 403

