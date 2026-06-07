"""Integration tests for Pattern Engine API (Story 11.2 — AC #1, #2, #6, #7).

Tests:
  5.1  POST /sessions creates draft session with correct data
  5.2  POST /sessions/{id}/generate produces 3 pieces and status='completed'
  5.3  GET /sessions/{id} returns session with pieces
  5.4  422 response for invalid measurements with Vietnamese error messages
  5.5  Tenant isolation — cannot access other tenant's sessions
  5.6  Auth — Tailor can GET but cannot POST create/generate
"""

import uuid
from decimal import Decimal

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token
from src.main import app
from src.models.db_models import Base, CustomerProfileDB, PatternSessionDB, TenantDB, UserDB

# ---------------------------------------------------------------------------
# Test database + fixtures
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

TENANT_A_ID = uuid.UUID("aa000000-0000-0000-0000-000000000001")
TENANT_B_ID = uuid.UUID("bb000000-0000-0000-0000-000000000002")
OWNER_A_ID = uuid.UUID("aa000000-0000-0000-0000-000000000010")
TAILOR_A_ID = uuid.UUID("aa000000-0000-0000-0000-000000000011")
OWNER_B_ID = uuid.UUID("bb000000-0000-0000-0000-000000000020")
CUSTOMER_A_ID = uuid.UUID("aa000000-0000-0000-0000-000000000030")

SAMPLE_PAYLOAD = {
    "customer_id": str(CUSTOMER_A_ID),
    "garment_type": "ao_dai",
    "notes": "Integration test session",
    "do_dai_ao": "100.0",
    "ha_eo": "36.0",   # realistic shoulder→waist drop (was 18, too short for nach/2 armhole)
    "vong_co": "34.0",
    "vong_nach": "38.0",
    "vong_nguc": "80.0",
    "vong_eo": "64.0",
    "vong_mong": "88.0",
    "do_dai_tay": "58.0",
    "vong_bap_tay": "28.0",
    "vong_co_tay": "16.0",
}


@pytest_asyncio.fixture
async def async_engine():
    engine = create_async_engine(TEST_DB_URL, echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session(async_engine):
    async_session = sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        yield session


@pytest_asyncio.fixture
async def seed_users(db_session: AsyncSession):
    """Seed tenant A, tenant B, owner A, tailor A, owner B, customer A."""
    tenant_a = TenantDB(id=TENANT_A_ID, name="Shop A", slug="shop-a")
    tenant_b = TenantDB(id=TENANT_B_ID, name="Shop B", slug="shop-b")
    owner_a = UserDB(
        id=OWNER_A_ID,
        email="owner-a-11-2@test.com",
        role="Owner",
        tenant_id=TENANT_A_ID,
        full_name="Owner A",
        is_active=True,
    )
    tailor_a = UserDB(
        id=TAILOR_A_ID,
        email="tailor-a-11-2@test.com",
        role="Tailor",
        tenant_id=TENANT_A_ID,
        full_name="Tailor A",
        is_active=True,
    )
    owner_b = UserDB(
        id=OWNER_B_ID,
        email="owner-b-11-2@test.com",
        role="Owner",
        tenant_id=TENANT_B_ID,
        full_name="Owner B",
        is_active=True,
    )
    customer_a = CustomerProfileDB(
        id=CUSTOMER_A_ID,
        tenant_id=TENANT_A_ID,
        full_name="Customer A",
        phone="0901234567",
    )
    db_session.add_all([tenant_a, tenant_b, owner_a, tailor_a, owner_b, customer_a])
    await db_session.commit()
    return {
        "owner_a": owner_a,
        "tailor_a": tailor_a,
        "owner_b": owner_b,
        "customer_a": customer_a,
    }


@pytest.fixture
def client(db_session: AsyncSession):
    """TestClient with DB session override."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


def _owner_a_headers() -> dict:
    token = create_access_token({"sub": "owner-a-11-2@test.com"})
    return {"Authorization": f"Bearer {token}"}


def _tailor_a_headers() -> dict:
    token = create_access_token({"sub": "tailor-a-11-2@test.com"})
    return {"Authorization": f"Bearer {token}"}


def _owner_b_headers() -> dict:
    token = create_access_token({"sub": "owner-b-11-2@test.com"})
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# 5.1  POST /sessions — creates draft session
# ---------------------------------------------------------------------------

class TestCreatePatternSession:
    """AC #1: POST /api/v1/patterns/sessions."""

    @pytest.mark.asyncio
    async def test_create_session_returns_201(self, client, seed_users):
        """Owner can create a session; response is 201."""
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 201, resp.text

    @pytest.mark.asyncio
    async def test_create_session_status_is_draft(self, client, seed_users):
        """Created session must have status='draft'."""
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        data = resp.json()["data"]
        assert data["status"] == "draft"

    @pytest.mark.asyncio
    async def test_create_session_pieces_empty(self, client, seed_users):
        """Draft session has no pieces yet."""
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        data = resp.json()["data"]
        assert data["pieces"] == []

    @pytest.mark.asyncio
    async def test_create_session_measurements_stored(self, client, seed_users):
        """All 10 measurements are returned in response."""
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        data = resp.json()["data"]
        assert float(data["vong_nguc"]) == 80.0
        assert float(data["vong_eo"]) == 64.0
        assert float(data["vong_mong"]) == 88.0
        assert float(data["do_dai_tay"]) == 58.0

    @pytest.mark.asyncio
    async def test_create_session_tenant_isolation(self, client, seed_users):
        """Session created has tenant_id from authenticated user."""
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        data = resp.json()["data"]
        assert data["tenant_id"] == str(TENANT_A_ID)

    @pytest.mark.asyncio
    async def test_create_session_created_by_current_user(self, client, seed_users):
        """created_by must be the Owner's user ID."""
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        data = resp.json()["data"]
        assert data["created_by"] == str(OWNER_A_ID)

    @pytest.mark.asyncio
    async def test_create_session_unknown_customer_returns_404(self, client, seed_users):
        """customer_id not belonging to tenant → 404."""
        payload = {**SAMPLE_PAYLOAD, "customer_id": str(uuid.uuid4())}
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=payload,
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 5.2  POST /sessions/{id}/generate — produces 3 pieces and status='completed'
# ---------------------------------------------------------------------------

class TestGeneratePatternPieces:
    """AC #2: POST /api/v1/patterns/sessions/{id}/generate."""

    @pytest.mark.asyncio
    async def test_generate_returns_200(self, client, seed_users):
        """Generate endpoint returns 200."""
        # Create session first
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        resp = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 200, resp.text

    @pytest.mark.asyncio
    async def test_set_in_sleeve_reaches_engine_via_api(self, client, seed_users):
        """Story 11.7 FR91a: sleeve_type='set_in' round-trips create→generate→pieces."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json={**SAMPLE_PAYLOAD, "sleeve_type": "set_in"},
            headers=_owner_a_headers(),
        )
        assert create_resp.status_code == 201, create_resp.text
        assert create_resp.json()["data"]["sleeve_type"] == "set_in"
        session_id = create_resp.json()["data"]["id"]

        gen_resp = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_owner_a_headers(),
        )
        assert gen_resp.status_code == 200, gen_resp.text
        data = gen_resp.json()["data"]
        assert data["sleeve_type"] == "set_in"
        sleeve = next(p for p in data["pieces"] if p["piece_type"] == "sleeve")
        assert sleeve["geometry_params"]["sleeve_type"] == "set_in"
        # FR93 constraint visible end-to-end
        assert 3.0 <= sleeve["geometry_params"]["cap_ease"] <= 4.0

    @pytest.mark.asyncio
    async def test_default_sleeve_type_is_raglan(self, client, seed_users):
        """Omitting sleeve_type defaults to raglan (backward compatible)."""
        create_resp = client.post(
            "/api/v1/patterns/sessions", json=SAMPLE_PAYLOAD, headers=_owner_a_headers(),
        )
        assert create_resp.json()["data"]["sleeve_type"] == "raglan"

    @pytest.mark.asyncio
    async def test_generate_produces_four_pieces(self, client, seed_users):
        """Story 11.8: generated session has 4 pieces (incl. collar)."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        gen_resp = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_owner_a_headers(),
        )
        data = gen_resp.json()["data"]
        assert len(data["pieces"]) == 4
        assert "collar" in [p["piece_type"] for p in data["pieces"]]

    @pytest.mark.asyncio
    async def test_generate_piece_types(self, client, seed_users):
        """Pieces have correct types: front_bodice, back_bodice, sleeve, collar (11.8)."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        gen_resp = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_owner_a_headers(),
        )
        pieces = gen_resp.json()["data"]["pieces"]
        types = {p["piece_type"] for p in pieces}
        assert types == {"front_bodice", "back_bodice", "sleeve", "collar"}

    @pytest.mark.asyncio
    async def test_generate_session_status_completed(self, client, seed_users):
        """After generation, session status transitions to 'completed'."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        gen_resp = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_owner_a_headers(),
        )
        assert gen_resp.json()["data"]["status"] == "completed"

    @pytest.mark.asyncio
    async def test_generate_pieces_have_svg_data(self, client, seed_users):
        """Each piece has non-empty svg_data."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]
        client.post(f"/api/v1/patterns/sessions/{session_id}/generate", headers=_owner_a_headers())

        get_resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}",
            headers=_owner_a_headers(),
        )
        for piece in get_resp.json()["data"]["pieces"]:
            assert piece["svg_data"], f"{piece['piece_type']} has empty svg_data"

    @pytest.mark.asyncio
    async def test_generate_twice_returns_409(self, client, seed_users):
        """Calling generate on a completed session returns 409."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        client.post(f"/api/v1/patterns/sessions/{session_id}/generate", headers=_owner_a_headers())
        resp2 = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_owner_a_headers(),
        )
        assert resp2.status_code == 409


# ---------------------------------------------------------------------------
# 5.3  GET /sessions/{id} returns session with pieces
# ---------------------------------------------------------------------------

class TestGetPatternSession:
    """AC #6: GET /api/v1/patterns/sessions/{id}."""

    @pytest.mark.asyncio
    async def test_get_session_returns_200(self, client, seed_users):
        """Owner can GET an existing session."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        get_resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}",
            headers=_owner_a_headers(),
        )
        assert get_resp.status_code == 200

    @pytest.mark.asyncio
    async def test_get_session_returns_measurements(self, client, seed_users):
        """GET response includes all 10 measurements."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        get_resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}",
            headers=_owner_a_headers(),
        )
        data = get_resp.json()["data"]
        assert float(data["vong_nguc"]) == 80.0

    @pytest.mark.asyncio
    async def test_get_session_404_invalid_id(self, client, seed_users):
        """GET with non-existent session_id → 404."""
        resp = client.get(
            f"/api/v1/patterns/sessions/{uuid.uuid4()}",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_get_session_after_generate_returns_pieces(self, client, seed_users):
        """GET after generate returns session with nested pieces."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]
        client.post(f"/api/v1/patterns/sessions/{session_id}/generate", headers=_owner_a_headers())

        get_resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}",
            headers=_owner_a_headers(),
        )
        data = get_resp.json()["data"]
        assert len(data["pieces"]) == 4


# ---------------------------------------------------------------------------
# 5.4  422 for invalid measurements with Vietnamese error messages
# ---------------------------------------------------------------------------

class TestMeasurementValidation:
    """AC #7: 422 with Vietnamese error messages for out-of-range measurements."""

    @pytest.mark.asyncio
    async def test_vong_nguc_below_min_returns_422(self, client, seed_users):
        """vong_nguc < 50 → 422 with Vietnamese error message (FR99)."""
        payload = {**SAMPLE_PAYLOAD, "vong_nguc": "10.0"}  # min is 50
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=payload,
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422
        body = resp.json()
        detail = body.get("detail", {})
        assert detail.get("code") == "ERR_INVALID_MEASUREMENTS"
        assert "Vòng ngực" in detail.get("message", "")
        assert "50" in detail.get("message", "") and "180" in detail.get("message", "")

    @pytest.mark.asyncio
    async def test_new_measurement_out_of_range_returns_vietnamese_422(self, client, seed_users):
        """Story 11.8: the 5 new fields get the same Vietnamese ERR_INVALID_MEASUREMENTS shape."""
        payload = {**SAMPLE_PAYLOAD, "xuoi_vai": "20.0"}  # max is 8
        resp = client.post(
            "/api/v1/patterns/sessions", json=payload, headers=_owner_a_headers(),
        )
        assert resp.status_code == 422
        detail = resp.json().get("detail", {})
        assert detail.get("code") == "ERR_INVALID_MEASUREMENTS"
        assert "Xuôi vai" in detail.get("message", "")
        assert "1" in detail.get("message", "") and "8" in detail.get("message", "")

    @pytest.mark.asyncio
    async def test_vong_nguc_above_max_returns_422(self, client, seed_users):
        """vong_nguc > 180 → 422."""
        payload = {**SAMPLE_PAYLOAD, "vong_nguc": "200.0"}  # max is 180
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=payload,
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_vong_eo_below_min_returns_422(self, client, seed_users):
        """vong_eo < 40 → 422."""
        payload = {**SAMPLE_PAYLOAD, "vong_eo": "10.0"}  # min is 40
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=payload,
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_do_dai_ao_below_min_returns_422(self, client, seed_users):
        """do_dai_ao < 30 → 422."""
        payload = {**SAMPLE_PAYLOAD, "do_dai_ao": "5.0"}  # min is 30
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=payload,
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 5.5  Tenant isolation
# ---------------------------------------------------------------------------

class TestTenantIsolation:
    """AC #1, #6: Multi-tenant isolation for sessions."""

    @pytest.mark.asyncio
    async def test_owner_b_cannot_access_owner_a_session(self, client, seed_users):
        """Owner B cannot GET the session created by Owner A (different tenant)."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        # Owner B tries to access
        get_resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}",
            headers=_owner_b_headers(),
        )
        assert get_resp.status_code == 404

    @pytest.mark.asyncio
    async def test_owner_b_cannot_generate_owner_a_session(self, client, seed_users):
        """Owner B cannot generate patterns for Owner A's session."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        gen_resp = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_owner_b_headers(),
        )
        assert gen_resp.status_code == 404


# ---------------------------------------------------------------------------
# 5.6  Auth — role-based access
# ---------------------------------------------------------------------------

class TestAuthRoles:
    """AC #1, #2, #6: Role-based access control."""

    @pytest.mark.asyncio
    async def test_tailor_can_get_session(self, client, seed_users):
        """Tailor can GET a session (OwnerOrTailor on GET endpoint)."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        get_resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}",
            headers=_tailor_a_headers(),
        )
        assert get_resp.status_code == 200

    @pytest.mark.asyncio
    async def test_tailor_cannot_create_session(self, client, seed_users):
        """Tailor cannot POST to create a session (OwnerOnly)."""
        resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_tailor_a_headers(),
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_tailor_cannot_generate_session(self, client, seed_users):
        """Tailor cannot POST to generate patterns (OwnerOnly)."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        resp = client.post(
            f"/api/v1/patterns/sessions/{session_id}/generate",
            headers=_tailor_a_headers(),
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_unauthenticated_returns_403_or_401(self, client, seed_users):
        """Unauthenticated request should fail (401/403)."""
        resp = client.post("/api/v1/patterns/sessions", json=SAMPLE_PAYLOAD)
        assert resp.status_code in (401, 403)
