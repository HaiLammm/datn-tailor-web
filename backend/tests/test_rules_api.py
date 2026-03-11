"""Integration tests for Smart Rules API endpoints - Story 2.5.

Tests Rule Editor CRUD with RBAC enforcement.
AC1: List pillars, AC2: Detail view, AC3: Update, AC4: Validation, AC5: RBAC.
"""

import uuid

import pytest
import pytest_asyncio
from fastapi import status
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token, hash_password
from src.main import app
from src.models.db_models import Base, UserDB

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
async def seed_users(test_db_session: AsyncSession) -> dict:
    """Seed test users for RBAC testing."""
    owner = UserDB(
        email="owner@test.com",
        role="Owner",
        hashed_password=hash_password("ownerpass"),
        is_active=True,
        full_name="Cô Lan",
        tenant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
    )
    tailor = UserDB(
        email="tailor@test.com",
        role="Tailor",
        hashed_password=hash_password("tailorpass"),
        is_active=True,
        full_name="Minh",
        tenant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
    )
    customer = UserDB(
        email="customer@test.com",
        role="Customer",
        hashed_password=hash_password("custpass"),
        is_active=True,
        full_name="Linh",
        tenant_id=uuid.UUID("00000000-0000-0000-0000-000000000001"),
    )

    test_db_session.add_all([owner, tailor, customer])
    await test_db_session.commit()

    yield {
        "owner_token": create_access_token({"sub": "owner@test.com"}),
        "tailor_token": create_access_token({"sub": "tailor@test.com"}),
        "customer_token": create_access_token({"sub": "customer@test.com"}),
    }
    
    # Cleanup if needed (app.dependency_overrides is already cleared in override_get_db)


@pytest_asyncio.fixture
async def client(override_get_db) -> AsyncClient:
    """Create async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


# ===== AC1: List Pillars =====


@pytest.mark.asyncio
async def test_list_pillars_as_owner(client: AsyncClient, seed_users: dict):
    """AC1: Owner can list all rule pillars with summaries."""
    response = await client.get(
        "/api/v1/rules/pillars",
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 3  # traditional, minimalist, avant_garde

    pillar_ids = {p["pillar_id"] for p in data}
    assert pillar_ids == {"traditional", "minimalist", "avant_garde"}

    # Check summary fields
    for pillar in data:
        assert "pillar_name_vi" in pillar
        assert "delta_mapping_count" in pillar
        assert "slider_count" in pillar
        assert "last_modified" in pillar
        assert pillar["delta_mapping_count"] > 0
        assert pillar["slider_count"] > 0


# ===== AC2: Pillar Detail =====


@pytest.mark.asyncio
async def test_get_pillar_detail_traditional(client: AsyncClient, seed_users: dict):
    """AC2: Owner can view detailed rules for a pillar."""
    response = await client.get(
        "/api/v1/rules/pillars/traditional",
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["pillar_id"] == "traditional"
    assert data["pillar_name_vi"] == "Truyền thống"
    assert isinstance(data["mappings"], list)
    assert len(data["mappings"]) > 0

    # Check mapping fields (AC2: table format)
    for mapping in data["mappings"]:
        assert "slider_key" in mapping
        assert "delta_key" in mapping
        assert "delta_label_vi" in mapping
        assert "delta_unit" in mapping
        assert "slider_range_min" in mapping
        assert "slider_range_max" in mapping
        assert "scale_factor" in mapping
        assert "offset" in mapping
        assert "golden_point" in mapping
        assert 0 <= mapping["golden_point"] <= 100


@pytest.mark.asyncio
async def test_get_pillar_detail_not_found(client: AsyncClient, seed_users: dict):
    """AC2: 404 for non-existent pillar."""
    response = await client.get(
        "/api/v1/rules/pillars/nonexistent",
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND
    assert "Không tìm thấy" in response.json()["detail"]


# ===== AC3: Update Rules =====


@pytest.mark.asyncio
async def test_update_pillar_rules(client: AsyncClient, seed_users: dict):
    """AC3: Owner can update rules and get confirmation with timestamp."""
    update_body = {
        "mappings": [
            {
                "slider_key": "shoulder_width",
                "delta_key": "rong_vai",
                "delta_label_vi": "Rộng vai",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": 0.05,
                "offset": -2.5,
            },
            {
                "slider_key": "body_fit",
                "delta_key": "do_cu_eo",
                "delta_label_vi": "Độ cử eo",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": -0.04,
                "offset": 3.0,
            },
        ]
    }

    response = await client.put(
        "/api/v1/rules/pillars/traditional",
        json=update_body,
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_200_OK

    data = response.json()
    assert data["success"] is True
    assert data["pillar_id"] == "traditional"
    assert data["mapping_count"] == 2
    assert "last_modified" in data
    assert "Đã cập nhật thành công" in data["message"]


@pytest.mark.asyncio
async def test_update_pillar_not_found(client: AsyncClient, seed_users: dict):
    """AC3: 404 for updating non-existent pillar."""
    update_body = {
        "mappings": [
            {
                "slider_key": "test",
                "delta_key": "test",
                "delta_label_vi": "Test",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": 0.1,
                "offset": 0.0,
            }
        ]
    }

    response = await client.put(
        "/api/v1/rules/pillars/nonexistent",
        json=update_body,
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_404_NOT_FOUND


# ===== AC4: Input Validation =====


@pytest.mark.asyncio
async def test_validation_min_exceeds_max(client: AsyncClient, seed_users: dict):
    """AC4: Reject when slider_range_min > slider_range_max."""
    update_body = {
        "mappings": [
            {
                "slider_key": "test",
                "delta_key": "test",
                "delta_label_vi": "Test",
                "delta_unit": "cm",
                "slider_range_min": 100.0,
                "slider_range_max": 0.0,  # Invalid: max < min
                "scale_factor": 0.1,
                "offset": 0.0,
            }
        ]
    }

    response = await client.put(
        "/api/v1/rules/pillars/traditional",
        json=update_body,
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_validation_zero_scale_factor(client: AsyncClient, seed_users: dict):
    """AC4: Reject zero scale_factor."""
    update_body = {
        "mappings": [
            {
                "slider_key": "test",
                "delta_key": "test",
                "delta_label_vi": "Test",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": 0.0,  # Invalid: zero
                "offset": 0.0,
            }
        ]
    }

    response = await client.put(
        "/api/v1/rules/pillars/traditional",
        json=update_body,
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_validation_empty_mappings(client: AsyncClient, seed_users: dict):
    """AC4: Reject empty mappings list."""
    response = await client.put(
        "/api/v1/rules/pillars/traditional",
        json={"mappings": []},
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_validation_scale_factor_magnitude(client: AsyncClient, seed_users: dict):
    """AC4: Reject scale_factor with |value| > 1.0."""
    update_body = {
        "mappings": [
            {
                "slider_key": "test",
                "delta_key": "test",
                "delta_label_vi": "Test",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": 1.5,  # Invalid: |1.5| > 1.0
                "offset": 0.0,
            }
        ]
    }

    response = await client.put(
        "/api/v1/rules/pillars/traditional",
        json=update_body,
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


@pytest.mark.asyncio
async def test_validation_golden_point_out_of_range(client: AsyncClient, seed_users: dict):
    """AC4: Reject golden_point outside [0, 100]."""
    update_body = {
        "mappings": [
            {
                "slider_key": "test",
                "delta_key": "test",
                "delta_label_vi": "Test",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": 0.1,
                "offset": 0.0,
                "golden_point": 150.0,  # Invalid: > 100
            }
        ]
    }

    response = await client.put(
        "/api/v1/rules/pillars/traditional",
        json=update_body,
        headers={"Authorization": f"Bearer {seed_users['owner_token']}"},
    )
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


# ===== AC5: RBAC Protection =====


@pytest.mark.asyncio
async def test_rbac_tailor_denied_list(client: AsyncClient, seed_users: dict):
    """AC5: Tailor gets 403 on list pillars."""
    response = await client.get(
        "/api/v1/rules/pillars",
        headers={"Authorization": f"Bearer {seed_users['tailor_token']}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_rbac_customer_denied_list(client: AsyncClient, seed_users: dict):
    """AC5: Customer gets 403 on list pillars."""
    response = await client.get(
        "/api/v1/rules/pillars",
        headers={"Authorization": f"Bearer {seed_users['customer_token']}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_rbac_tailor_denied_detail(client: AsyncClient, seed_users: dict):
    """AC5: Tailor gets 403 on pillar detail."""
    response = await client.get(
        "/api/v1/rules/pillars/traditional",
        headers={"Authorization": f"Bearer {seed_users['tailor_token']}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_rbac_customer_denied_update(client: AsyncClient, seed_users: dict):
    """AC5: Customer gets 403 on update."""
    update_body = {
        "mappings": [
            {
                "slider_key": "test",
                "delta_key": "test",
                "delta_label_vi": "Test",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": 0.1,
                "offset": 0.0,
            }
        ]
    }
    response = await client.put(
        "/api/v1/rules/pillars/traditional",
        json=update_body,
        headers={"Authorization": f"Bearer {seed_users['customer_token']}"},
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.asyncio
async def test_rbac_no_auth_denied(client: AsyncClient, seed_users: dict):
    """AC5: No auth token gets 401 (unauthenticated)."""
    response = await client.get("/api/v1/rules/pillars")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


# ===== Update persists and is reflected in detail =====


@pytest.mark.asyncio
async def test_update_reflected_in_detail(client: AsyncClient, seed_users: dict):
    """AC3: After update, detail endpoint returns updated data."""
    headers = {"Authorization": f"Bearer {seed_users['owner_token']}"}

    # Update minimalist with new mappings
    update_body = {
        "mappings": [
            {
                "slider_key": "shoulder_width",
                "delta_key": "rong_vai",
                "delta_label_vi": "Rộng vai",
                "delta_unit": "cm",
                "slider_range_min": 0.0,
                "slider_range_max": 100.0,
                "scale_factor": 0.06,
                "offset": -3.0,
            }
        ]
    }

    update_response = await client.put(
        "/api/v1/rules/pillars/minimalist",
        json=update_body,
        headers=headers,
    )
    assert update_response.status_code == status.HTTP_200_OK

    # Verify detail reflects update
    detail_response = await client.get(
        "/api/v1/rules/pillars/minimalist",
        headers=headers,
    )
    assert detail_response.status_code == status.HTTP_200_OK

    detail = detail_response.json()
    assert len(detail["mappings"]) == 1
    assert detail["mappings"][0]["slider_key"] == "shoulder_width"
    assert detail["mappings"][0]["scale_factor"] == 0.06
    assert detail["mappings"][0]["offset"] == -3.0
