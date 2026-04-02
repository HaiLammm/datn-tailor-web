"""API integration tests for Tailor Tasks endpoints (Story 5.3).

Tests GET /my-tasks, PATCH /{id}/status, GET /{id}, GET /summary.
"""

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token
from src.main import app
from src.models.db_models import (
    Base,
    OrderDB,
    TailorTaskDB,
    TenantDB,
    UserDB,
)

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
TAILOR_ID = uuid.uuid4()
OWNER_ID = uuid.uuid4()
ORDER_ID = uuid.uuid4()


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(test_db_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def override_get_db(test_db_session):
    async def _get_test_db():
        yield test_db_session
    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def seed_data(test_db_session: AsyncSession):
    now = datetime.now(timezone.utc)

    tenant = TenantDB(id=TENANT_ID, name="Test Shop", slug="test-shop")
    test_db_session.add(tenant)

    owner = UserDB(id=OWNER_ID, email="owner@test.com", role="Owner", tenant_id=TENANT_ID)
    tailor = UserDB(id=TAILOR_ID, email="tailor@test.com", role="Tailor", tenant_id=TENANT_ID)
    test_db_session.add_all([owner, tailor])

    order = OrderDB(
        id=ORDER_ID,
        tenant_id=TENANT_ID,
        customer_name="Nguyễn Văn A",
        customer_phone="0901234567",
        shipping_address={},
        subtotal_amount=Decimal("500000"),
        total_amount=Decimal("500000"),
    )
    test_db_session.add(order)
    await test_db_session.flush()

    task = TailorTaskDB(
        tenant_id=TENANT_ID,
        order_id=ORDER_ID,
        assigned_to=TAILOR_ID,
        assigned_by=OWNER_ID,
        garment_name="Áo dài cưới",
        customer_name="Nguyễn Văn A",
        status="assigned",
        deadline=now + timedelta(days=5),
        piece_rate=Decimal("200000"),
    )
    test_db_session.add(task)
    await test_db_session.flush()
    return task


@pytest_asyncio.fixture
async def tailor_token():
    return create_access_token(data={"sub": "tailor@test.com"})


@pytest_asyncio.fixture
async def client():
    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac


@pytest.mark.asyncio
async def test_get_my_tasks(client, override_get_db, seed_data, tailor_token):
    response = await client.get(
        "/api/v1/tailor-tasks/my-tasks",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "data" in body
    assert "tasks" in body["data"]
    assert "summary" in body["data"]
    assert len(body["data"]["tasks"]) == 1
    assert body["data"]["summary"]["total"] == 1


@pytest.mark.asyncio
async def test_get_task_summary(client, override_get_db, seed_data, tailor_token):
    response = await client.get(
        "/api/v1/tailor-tasks/summary",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["total"] == 1
    assert body["data"]["assigned"] == 1


@pytest.mark.asyncio
async def test_update_status_valid(client, override_get_db, seed_data, tailor_token):
    task_id = str(seed_data.id)
    response = await client.patch(
        f"/api/v1/tailor-tasks/{task_id}/status",
        json={"status": "in_progress"},
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    assert response.json()["data"]["status"] == "in_progress"


@pytest.mark.asyncio
async def test_update_status_invalid_transition(client, override_get_db, seed_data, tailor_token):
    task_id = str(seed_data.id)
    response = await client.patch(
        f"/api/v1/tailor-tasks/{task_id}/status",
        json={"status": "completed"},
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_get_task_detail(client, override_get_db, seed_data, tailor_token):
    task_id = str(seed_data.id)
    response = await client.get(
        f"/api/v1/tailor-tasks/{task_id}",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["data"]["garment_name"] == "Áo dài cưới"
    assert body["data"]["customer_name"] == "Nguyễn Văn A"


@pytest.mark.asyncio
async def test_unauthenticated_request(client, override_get_db):
    response = await client.get("/api/v1/tailor-tasks/my-tasks")
    assert response.status_code in (401, 403)


# ── Tech-Spec: Dashboard Restructure — API Filter Tests ───────────────────────


@pytest.mark.asyncio
async def test_my_tasks_with_status_filter(client, override_get_db, seed_data, tailor_token):
    """Test filtering tasks by status via query param."""
    response = await client.get(
        "/api/v1/tailor-tasks/my-tasks?status=assigned",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    tasks = body["data"]["tasks"]
    # All returned tasks should have status 'assigned'
    for task in tasks:
        assert task["status"] == "assigned"


@pytest.mark.asyncio
async def test_my_tasks_with_date_filter(client, override_get_db, seed_data, tailor_token):
    """Test filtering tasks by date range via query params."""
    from datetime import datetime, timedelta
    
    now = datetime.utcnow()
    date_from = (now + timedelta(days=1)).date().isoformat()
    date_to = (now + timedelta(days=10)).date().isoformat()
    
    response = await client.get(
        f"/api/v1/tailor-tasks/my-tasks?date_from={date_from}&date_to={date_to}",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    # Should return tasks within the date range
    assert "tasks" in body["data"]


@pytest.mark.asyncio
async def test_my_tasks_with_month_year_filter(client, override_get_db, seed_data, tailor_token):
    """Test filtering tasks by month and year."""
    response = await client.get(
        "/api/v1/tailor-tasks/my-tasks?month=4&year=2026",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "tasks" in body["data"]


@pytest.mark.asyncio
async def test_my_income_with_period_day(client, override_get_db, seed_data, tailor_token):
    """Test income endpoint with day period - should return detail response."""
    response = await client.get(
        "/api/v1/tailor-tasks/my-income?period=day",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    data = body["data"]
    # Day period returns detail items
    assert "items" in data or "total_income" in data


@pytest.mark.asyncio
async def test_my_income_with_period_week(client, override_get_db, seed_data, tailor_token):
    """Test income endpoint with week period - should return summary response."""
    response = await client.get(
        "/api/v1/tailor-tasks/my-income?period=week",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    data = body["data"]
    # Week period returns summary with current/previous
    assert "current_month" in data or "total_income" in data


@pytest.mark.asyncio
async def test_my_income_with_period_year(client, override_get_db, seed_data, tailor_token):
    """Test income endpoint with year period."""
    response = await client.get(
        "/api/v1/tailor-tasks/my-income?period=year",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 200
    body = response.json()
    data = body["data"]
    assert "current_month" in data or "total_income" in data


@pytest.mark.asyncio
async def test_my_income_invalid_period(client, override_get_db, seed_data, tailor_token):
    """Test income endpoint with invalid period parameter."""
    response = await client.get(
        "/api/v1/tailor-tasks/my-income?period=invalid",
        headers={"Authorization": f"Bearer {tailor_token}"},
    )
    assert response.status_code == 400
