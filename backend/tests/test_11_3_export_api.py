"""Integration tests for Export API (Story 11.3 — AC #1-7).

Tests:
  5.1  Single piece SVG export returns correct content-type and attachment header
  5.2  Single piece G-code export with custom speed/power
  5.3  Batch SVG export creates valid ZIP with 3 files
  5.4  Batch G-code export creates valid ZIP with 3 files
  5.5  404 for piece from different tenant
  5.6  404 for draft session (no pieces yet)
  5.7  422 for invalid format parameter
  5.8  422 for invalid speed/power values
  5.9  Auth — Customer cannot access export endpoints
"""

import io
import uuid
import zipfile

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.core.database import get_db
from src.core.security import create_access_token
from src.main import app
from src.models.db_models import Base, CustomerProfileDB, TenantDB, UserDB

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
CUSTOMER_USER_ID = uuid.UUID("aa000000-0000-0000-0000-000000000040")

SAMPLE_PAYLOAD = {
    "customer_id": str(CUSTOMER_A_ID),
    "garment_type": "ao_dai",
    "notes": "Export test session",
    "do_dai_ao": "100.0",
    "ha_eo": "18.0",
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
    """Seed tenant A, tenant B, owner A, tailor A, owner B, customer A, customer_user."""
    tenant_a = TenantDB(id=TENANT_A_ID, name="Shop A", slug="shop-a")
    tenant_b = TenantDB(id=TENANT_B_ID, name="Shop B", slug="shop-b")
    owner_a = UserDB(
        id=OWNER_A_ID,
        email="owner-a-11-3@test.com",
        role="Owner",
        tenant_id=TENANT_A_ID,
        full_name="Owner A",
        is_active=True,
    )
    tailor_a = UserDB(
        id=TAILOR_A_ID,
        email="tailor-a-11-3@test.com",
        role="Tailor",
        tenant_id=TENANT_A_ID,
        full_name="Tailor A",
        is_active=True,
    )
    owner_b = UserDB(
        id=OWNER_B_ID,
        email="owner-b-11-3@test.com",
        role="Owner",
        tenant_id=TENANT_B_ID,
        full_name="Owner B",
        is_active=True,
    )
    customer_user = UserDB(
        id=CUSTOMER_USER_ID,
        email="customer-11-3@test.com",
        role="Customer",
        tenant_id=TENANT_A_ID,
        full_name="Customer User",
        is_active=True,
    )
    customer_a = CustomerProfileDB(
        id=CUSTOMER_A_ID,
        tenant_id=TENANT_A_ID,
        full_name="Customer A",
        phone="0901234567",
    )
    db_session.add_all([tenant_a, tenant_b, owner_a, tailor_a, owner_b, customer_user, customer_a])
    await db_session.commit()
    return {
        "owner_a": owner_a,
        "tailor_a": tailor_a,
        "owner_b": owner_b,
        "customer_user": customer_user,
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
    token = create_access_token({"sub": "owner-a-11-3@test.com"})
    return {"Authorization": f"Bearer {token}"}


def _tailor_a_headers() -> dict:
    token = create_access_token({"sub": "tailor-a-11-3@test.com"})
    return {"Authorization": f"Bearer {token}"}


def _owner_b_headers() -> dict:
    token = create_access_token({"sub": "owner-b-11-3@test.com"})
    return {"Authorization": f"Bearer {token}"}


def _customer_headers() -> dict:
    token = create_access_token({"sub": "customer-11-3@test.com"})
    return {"Authorization": f"Bearer {token}"}


def _create_completed_session(client, headers=None):
    """Helper: create a session and generate patterns."""
    if headers is None:
        headers = _owner_a_headers()

    create_resp = client.post(
        "/api/v1/patterns/sessions",
        json=SAMPLE_PAYLOAD,
        headers=headers,
    )
    session_id = create_resp.json()["data"]["id"]

    gen_resp = client.post(
        f"/api/v1/patterns/sessions/{session_id}/generate",
        headers=headers,
    )
    return gen_resp.json()["data"]


# ---------------------------------------------------------------------------
# 5.1  Single piece SVG export
# ---------------------------------------------------------------------------

class TestSinglePieceSvgExport:
    """AC #1: GET /api/v1/patterns/pieces/{id}/export?format=svg."""

    @pytest.mark.asyncio
    async def test_svg_export_returns_200(self, client, seed_users):
        """Owner can export a piece as SVG; response is 200."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 200, resp.text

    @pytest.mark.asyncio
    async def test_svg_export_content_type(self, client, seed_users):
        """SVG export returns Content-Type: image/svg+xml."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert "image/svg+xml" in resp.headers["content-type"]

    @pytest.mark.asyncio
    async def test_svg_export_content_disposition(self, client, seed_users):
        """SVG export returns Content-Disposition with .svg filename."""
        session_data = _create_completed_session(client)
        piece = session_data["pieces"][0]
        piece_id = piece["id"]
        piece_type = piece["piece_type"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert f'filename="{piece_type}.svg"' in resp.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_svg_export_content_is_valid_svg(self, client, seed_users):
        """SVG export content is valid SVG markup."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        content = resp.content.decode("utf-8")
        assert content.startswith("<svg")
        assert content.endswith("</svg>")

    @pytest.mark.asyncio
    async def test_tailor_can_export_svg(self, client, seed_users):
        """Tailor can export SVG (OwnerOrTailor)."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=svg",
            headers=_tailor_a_headers(),
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 5.2  Single piece G-code export
# ---------------------------------------------------------------------------

class TestSinglePieceGcodeExport:
    """AC #2: GET /api/v1/patterns/pieces/{id}/export?format=gcode."""

    @pytest.mark.asyncio
    async def test_gcode_export_returns_200(self, client, seed_users):
        """Owner can export a piece as G-code; response is 200."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 200, resp.text

    @pytest.mark.asyncio
    async def test_gcode_export_content_type(self, client, seed_users):
        """G-code export returns Content-Type: text/plain."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )
        assert "text/plain" in resp.headers["content-type"]

    @pytest.mark.asyncio
    async def test_gcode_export_content_disposition(self, client, seed_users):
        """G-code export returns Content-Disposition with .gcode filename."""
        session_data = _create_completed_session(client)
        piece = session_data["pieces"][0]
        piece_id = piece["id"]
        piece_type = piece["piece_type"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )
        assert f'filename="{piece_type}.gcode"' in resp.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_gcode_export_with_custom_speed(self, client, seed_users):
        """G-code export with custom speed parameter."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode&speed=2000",
            headers=_owner_a_headers(),
        )
        content = resp.content.decode("utf-8")
        assert "F2000" in content
        assert "Speed: 2000 mm/min" in content

    @pytest.mark.asyncio
    async def test_gcode_export_with_custom_power(self, client, seed_users):
        """G-code export with custom power parameter."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode&power=50",
            headers=_owner_a_headers(),
        )
        content = resp.content.decode("utf-8")
        assert "M3 S127" in content  # 50% → PWM 127
        assert "Power: 50%" in content

    @pytest.mark.asyncio
    async def test_gcode_export_default_speed_power(self, client, seed_users):
        """G-code export uses default speed=1000, power=80 when not specified."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )
        content = resp.content.decode("utf-8")
        assert "F1000" in content
        assert "M3 S204" in content  # 80% → PWM 204


# ---------------------------------------------------------------------------
# 5.3  Batch SVG export
# ---------------------------------------------------------------------------

class TestBatchSvgExport:
    """AC #3: GET /api/v1/patterns/sessions/{id}/export?format=svg."""

    @pytest.mark.asyncio
    async def test_batch_svg_export_returns_200(self, client, seed_users):
        """Batch SVG export returns 200."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 200, resp.text

    @pytest.mark.asyncio
    async def test_batch_svg_export_content_type_zip(self, client, seed_users):
        """Batch SVG export returns Content-Type: application/zip."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert resp.headers["content-type"] == "application/zip"

    @pytest.mark.asyncio
    async def test_batch_svg_export_filename(self, client, seed_users):
        """Batch SVG export filename is session_{id}_svg.zip."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert f'filename="session_{session_id}_svg.zip"' in resp.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_batch_svg_export_contains_3_files(self, client, seed_users):
        """Batch SVG export ZIP contains 3 SVG files."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_a_headers(),
        )

        zip_buffer = io.BytesIO(resp.content)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            names = zf.namelist()
            assert len(names) == 3
            assert "front_bodice.svg" in names
            assert "back_bodice.svg" in names
            assert "sleeve.svg" in names

    @pytest.mark.asyncio
    async def test_batch_svg_export_files_contain_valid_svg(self, client, seed_users):
        """Each file in batch SVG ZIP is valid SVG."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_a_headers(),
        )

        zip_buffer = io.BytesIO(resp.content)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            for name in zf.namelist():
                content = zf.read(name).decode("utf-8")
                assert content.startswith("<svg"), f"{name} is not valid SVG"


# ---------------------------------------------------------------------------
# 5.4  Batch G-code export
# ---------------------------------------------------------------------------

class TestBatchGcodeExport:
    """AC #4: GET /api/v1/patterns/sessions/{id}/export?format=gcode."""

    @pytest.mark.asyncio
    async def test_batch_gcode_export_returns_200(self, client, seed_users):
        """Batch G-code export returns 200."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 200, resp.text

    @pytest.mark.asyncio
    async def test_batch_gcode_export_content_type_zip(self, client, seed_users):
        """Batch G-code export returns Content-Type: application/zip."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )
        assert resp.headers["content-type"] == "application/zip"

    @pytest.mark.asyncio
    async def test_batch_gcode_export_filename(self, client, seed_users):
        """Batch G-code export filename is session_{id}_gcode.zip."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )
        assert f'filename="session_{session_id}_gcode.zip"' in resp.headers["content-disposition"]

    @pytest.mark.asyncio
    async def test_batch_gcode_export_contains_3_files(self, client, seed_users):
        """Batch G-code export ZIP contains 3 G-code files."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=gcode",
            headers=_owner_a_headers(),
        )

        zip_buffer = io.BytesIO(resp.content)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            names = zf.namelist()
            assert len(names) == 3
            assert "front_bodice.gcode" in names
            assert "back_bodice.gcode" in names
            assert "sleeve.gcode" in names

    @pytest.mark.asyncio
    async def test_batch_gcode_export_with_custom_params(self, client, seed_users):
        """Batch G-code export uses custom speed/power params."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=gcode&speed=1500&power=90",
            headers=_owner_a_headers(),
        )

        zip_buffer = io.BytesIO(resp.content)
        with zipfile.ZipFile(zip_buffer, "r") as zf:
            content = zf.read("front_bodice.gcode").decode("utf-8")
            assert "F1500" in content
            assert "M3 S229" in content  # 90% → PWM 229


# ---------------------------------------------------------------------------
# 5.5  Tenant isolation
# ---------------------------------------------------------------------------

class TestExportTenantIsolation:
    """AC #6: Tenant isolation for export endpoints."""

    @pytest.mark.asyncio
    async def test_piece_export_404_for_different_tenant(self, client, seed_users):
        """Owner B cannot export pieces from Owner A's session."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=svg",
            headers=_owner_b_headers(),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_session_export_404_for_different_tenant(self, client, seed_users):
        """Owner B cannot batch export Owner A's session."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_b_headers(),
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# 5.6  Draft session (no pieces)
# ---------------------------------------------------------------------------

class TestDraftSessionExport:
    """AC #6: 404 for draft session with no pieces."""

    @pytest.mark.asyncio
    async def test_batch_export_draft_session_returns_404(self, client, seed_users):
        """Cannot batch export a draft session (no pieces generated yet)."""
        # Create session but don't generate
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_draft_session_error_message(self, client, seed_users):
        """Draft session export returns Vietnamese error message."""
        create_resp = client.post(
            "/api/v1/patterns/sessions",
            json=SAMPLE_PAYLOAD,
            headers=_owner_a_headers(),
        )
        session_id = create_resp.json()["data"]["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        detail = resp.json()["detail"]
        assert detail["code"] == "ERR_SESSION_DRAFT"
        assert "chưa hoàn thành" in detail["message"]


# ---------------------------------------------------------------------------
# 5.7  Invalid format parameter
# ---------------------------------------------------------------------------

class TestInvalidFormatParam:
    """AC #7: 422 for invalid format parameter."""

    @pytest.mark.asyncio
    async def test_piece_export_invalid_format_returns_422(self, client, seed_users):
        """Invalid format parameter returns 422."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=pdf",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_session_export_invalid_format_returns_422(self, client, seed_users):
        """Invalid format on batch export returns 422."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=dxf",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_format_vietnamese_message(self, client, seed_users):
        """Invalid format returns Vietnamese error message."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=invalid",
            headers=_owner_a_headers(),
        )
        detail = resp.json()["detail"]
        assert "Định dạng xuất không hợp lệ" in detail["message"]


# ---------------------------------------------------------------------------
# 5.8  Invalid speed/power values
# ---------------------------------------------------------------------------

class TestInvalidSpeedPower:
    """AC #7: 422 for invalid speed/power values."""

    @pytest.mark.asyncio
    async def test_negative_speed_returns_422(self, client, seed_users):
        """Negative speed returns 422."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode&speed=-100",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_zero_speed_returns_422(self, client, seed_users):
        """Zero speed returns 422."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode&speed=0",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_power_above_100_returns_422(self, client, seed_users):
        """Power > 100 returns 422."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode&power=150",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_negative_power_returns_422(self, client, seed_users):
        """Negative power returns 422."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=gcode&power=-10",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# 5.9  Auth — Customer cannot access
# ---------------------------------------------------------------------------

class TestCustomerAuth:
    """AC #6: Customer role cannot access export endpoints."""

    @pytest.mark.asyncio
    async def test_customer_cannot_export_piece(self, client, seed_users):
        """Customer cannot export pieces (OwnerOrTailor only)."""
        session_data = _create_completed_session(client)
        piece_id = session_data["pieces"][0]["id"]

        resp = client.get(
            f"/api/v1/patterns/pieces/{piece_id}/export?format=svg",
            headers=_customer_headers(),
        )
        assert resp.status_code == 403

    @pytest.mark.asyncio
    async def test_customer_cannot_batch_export(self, client, seed_users):
        """Customer cannot batch export (OwnerOrTailor only)."""
        session_data = _create_completed_session(client)
        session_id = session_data["id"]

        resp = client.get(
            f"/api/v1/patterns/sessions/{session_id}/export?format=svg",
            headers=_customer_headers(),
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Additional tests
# ---------------------------------------------------------------------------

class TestNonExistentResources:
    """404 for non-existent piece/session IDs."""

    @pytest.mark.asyncio
    async def test_export_nonexistent_piece_returns_404(self, client, seed_users):
        """Export non-existent piece returns 404."""
        fake_id = uuid.uuid4()
        resp = client.get(
            f"/api/v1/patterns/pieces/{fake_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_batch_export_nonexistent_session_returns_404(self, client, seed_users):
        """Batch export non-existent session returns 404."""
        fake_id = uuid.uuid4()
        resp = client.get(
            f"/api/v1/patterns/sessions/{fake_id}/export?format=svg",
            headers=_owner_a_headers(),
        )
        assert resp.status_code == 404
