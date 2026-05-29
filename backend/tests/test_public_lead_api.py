"""API tests for the public website lead-capture endpoint - Story 15.4.

Tests POST /api/v1/leads/public — unauthenticated contact form submission.
Validates forced source/classification, honeypot drop, null phone, and rate-limit.
"""

import uuid

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.main import app
from src.models.db_models import Base, LeadDB, TenantDB
from src.services import lead_service

TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"
TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")


@pytest_asyncio.fixture
async def test_db_engine():
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def test_db_session(test_db_engine):
    async_session = sessionmaker(
        test_db_engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        tenant = TenantDB(id=TENANT_ID, name="Test Tiệm", slug="test-tiem")
        session.add(tenant)
        await session.commit()
        yield session


@pytest_asyncio.fixture
async def override_get_db(test_db_session):
    async def _get_test_db():
        yield test_db_session

    app.dependency_overrides[get_db] = _get_test_db
    yield
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(override_get_db):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


async def _count_leads(session: AsyncSession) -> int:
    result = await session.execute(select(func.count(LeadDB.id)))
    return result.scalar() or 0


@pytest.mark.asyncio
async def test_public_lead_create_success_no_auth(client, test_db_session):
    """Valid submission with NO auth header → 201, source=website, classification=warm."""
    resp = await client.post(
        "/api/v1/leads/public",
        json={"name": "Nguyễn Thị Lan", "phone": "0912345678", "email": "lan@test.com"},
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["name"] == "Nguyễn Thị Lan"
    assert data["source"] == "website"
    assert data["classification"] == "warm"
    assert data["tenant_id"] == str(TENANT_ID)


@pytest.mark.asyncio
async def test_public_lead_ignores_injected_source_classification(client, test_db_session):
    """Caller-supplied source/classification are not in the schema → ignored, stays website/warm."""
    resp = await client.post(
        "/api/v1/leads/public",
        json={
            "name": "Spammy McSpam",
            "source": "manual",
            "classification": "hot",
            "tenant_id": str(uuid.uuid4()),
        },
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["source"] == "website"
    assert data["classification"] == "warm"
    assert data["tenant_id"] == str(TENANT_ID)


@pytest.mark.asyncio
async def test_public_lead_honeypot_drops_silently(client, test_db_session):
    """Filled honeypot (`company`) → success-shaped response but NO row persisted."""
    resp = await client.post(
        "/api/v1/leads/public",
        json={"name": "Bot", "company": "Acme Bots Inc"},
    )
    assert resp.status_code == 201
    assert resp.json()["data"] is None
    assert await _count_leads(test_db_session) == 0


@pytest.mark.asyncio
async def test_public_lead_empty_phone_stored_as_null(client, test_db_session):
    """Empty/whitespace phone is normalized to null."""
    resp = await client.post(
        "/api/v1/leads/public",
        json={"name": "Chị Hoa", "phone": "   ", "email": ""},
    )
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert data["phone"] is None
    assert data["email"] is None


@pytest.mark.asyncio
async def test_public_lead_invalid_email_rejected(client, test_db_session):
    """Invalid email → 422 validation error."""
    resp = await client.post(
        "/api/v1/leads/public",
        json={"name": "Chị Mai", "email": "not-an-email"},
    )
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_public_lead_missing_name_rejected(client, test_db_session):
    """Missing name → 422 validation error."""
    resp = await client.post("/api/v1/leads/public", json={"phone": "0912345678"})
    assert resp.status_code == 422


@pytest.mark.asyncio
async def test_public_lead_rate_limit_returns_429(client, test_db_session):
    """Exceeding the per-contact window threshold → 429."""
    payload = {"name": "Khách", "email": "burst@test.com"}
    for _ in range(lead_service.PUBLIC_LEAD_RATE_LIMIT):
        ok = await client.post("/api/v1/leads/public", json=payload)
        assert ok.status_code == 201

    blocked = await client.post("/api/v1/leads/public", json=payload)
    assert blocked.status_code == 429
