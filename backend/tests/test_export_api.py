"""Tests for Export API endpoint - Story 4.4.

Tests the POST /api/v1/designs/{id}/export endpoint with RBAC,
tenant isolation, and format selection.
"""

import uuid
from datetime import datetime
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

from src.main import app
from src.api.dependencies import get_current_user_from_token, get_tenant_id_from_user, get_db
from src.models.db_models import UserDB, DesignDB, CustomerProfileDB, MeasurementDB
from src.core.hashing import compute_master_geometry_hash

MOCK_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
MOCK_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000099")
MOCK_DESIGN_ID = uuid.uuid4()

async def mock_get_current_tailor():
    user = UserDB(email="tailor@example.com", role="Tailor", is_active=True)
    user.id = MOCK_USER_ID
    user.tenant_id = MOCK_TENANT_ID
    return user

async def mock_get_current_customer():
    user = UserDB(email="customer@example.com", role="Customer", is_active=True)
    user.id = MOCK_USER_ID
    user.tenant_id = MOCK_TENANT_ID
    return user

async def mock_get_tenant_id():
    return MOCK_TENANT_ID

@pytest.fixture
def mock_design():
    # Valid master_geometry structure
    master_geo = {
        "sequence_id": str(uuid.uuid4()),
        "base_hash": "base-hash",
        "deltas": {"parts": [], "style_id": "classic"},
        "measurement_deltas": []
    }
    geo_hash = compute_master_geometry_hash(master_geo)
    master_geo["geometry_hash"] = geo_hash
    
    design = MagicMock(spec=DesignDB)
    design.id = MOCK_DESIGN_ID
    design.user_id = MOCK_USER_ID
    design.tenant_id = MOCK_TENANT_ID
    design.status = "locked"
    design.master_geometry = master_geo
    design.geometry_hash = geo_hash
    return design

@pytest.fixture
def mock_measurement():
    m = MagicMock()
    m.id = uuid.uuid4()
    m.neck = 38.0
    m.shoulder_width = 40.0
    m.bust = 88.0
    m.waist = 70.0
    m.hip = 94.0
    m.top_length = 65.0
    m.sleeve_length = 58.0
    m.wrist = 16.0
    return m

class MockResult:
    def __init__(self, value=None):
        self._value = value
    def scalar_one_or_none(self):
        return self._value

@pytest.fixture
def client():
    # Default to Tailor role
    app.dependency_overrides[get_current_user_from_token] = mock_get_current_tailor
    app.dependency_overrides[get_tenant_id_from_user] = mock_get_tenant_id
    yield TestClient(app)
    app.dependency_overrides.clear()

class TestExportApi:
    """Test suite for POST /api/v1/designs/{id}/export."""

    def _setup_mock_db(self, mock_design, mock_measurement=None):
        mock_db = MagicMock()
        def side_effect(stmt):
            stmt_str = str(stmt).lower()
            if "from designs" in stmt_str:
                return MockResult(mock_design)
            elif "from customer_profiles" in stmt_str:
                customer = MagicMock()
                customer.id = uuid.uuid4()
                return MockResult(customer)
            elif "from measurements" in stmt_str:
                return MockResult(mock_measurement or MagicMock())
            return MockResult(None)
        mock_db.execute = AsyncMock(side_effect=side_effect)
        app.dependency_overrides[get_db] = lambda: mock_db
        return mock_db

    def test_export_svg_success(self, client, mock_design, mock_measurement):
        """AC#1, #5: Successful SVG export returns 200 and correct content type."""
        self._setup_mock_db(mock_design, mock_measurement)
        
        # Mock ExportService.generate_svg to avoid full geometry engine dependency in API test
        with patch("src.api.v1.export.ExportService.generate_svg", return_value="<svg>test</svg>"):
            resp = client.post(f"/api/v1/designs/{MOCK_DESIGN_ID}/export?format=svg")
            
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "image/svg+xml"
        assert f"attachment; filename=blueprint-{MOCK_DESIGN_ID}.svg" in resp.headers["content-disposition"]
        assert resp.text == "<svg>test</svg>"

    def test_export_dxf_success(self, client, mock_design, mock_measurement):
        """AC#1, #6: Successful DXF export returns 200 and correct content type."""
        self._setup_mock_db(mock_design, mock_measurement)
        
        with patch("src.api.v1.export.ExportService.generate_dxf", return_value=b"dxfdata"):
            resp = client.post(f"/api/v1/designs/{MOCK_DESIGN_ID}/export?format=dxf")
            
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/dxf"
        assert f"attachment; filename=blueprint-{MOCK_DESIGN_ID}.dxf" in resp.headers["content-disposition"]
        assert resp.content == b"dxfdata"

    def test_export_unlocked_design_fails(self, client, mock_design):
        """AC#1: Only locked designs can be exported."""
        mock_design.status = "draft"
        self._setup_mock_db(mock_design)
        
        resp = client.post(f"/api/v1/designs/{MOCK_DESIGN_ID}/export")
        assert resp.status_code == 422
        assert "Chỉ có thể xuất bản vẽ cho thiết kế đã khóa" in resp.json()["detail"]

    def test_export_customer_role_forbidden(self, client):
        """AC#4: Customer role is forbidden from exporting blueprints."""
        app.dependency_overrides[get_current_user_from_token] = mock_get_current_customer
        
        resp = client.post(f"/api/v1/designs/{MOCK_DESIGN_ID}/export")
        assert resp.status_code == 403
        assert "không có quyền truy cập" in resp.json()["detail"]

    def test_export_integrity_failure(self, client, mock_design):
        """FR10: Detect geometry hash mismatch."""
        mock_design.geometry_hash = "tampered-hash"
        self._setup_mock_db(mock_design)
        
        resp = client.post(f"/api/v1/designs/{MOCK_DESIGN_ID}/export")
        assert resp.status_code == 422
        assert "Phát hiện sai lệch dữ liệu" in resp.json()["detail"]

    @patch("src.api.v1.export.get_registry")
    def test_export_guardrail_failure(self, mock_get_registry, client, mock_design):
        """AC#3: Hard constraint violation blocks export."""
        self._setup_mock_db(mock_design)
        
        # Mock registry to return rejection
        mock_registry = MagicMock()
        mock_registry.run_all.return_value = {
            "status": "rejected",
            "violations": [MagicMock(model_dump=lambda: {"message": "Lỗi"})]
        }
        mock_get_registry.return_value = mock_registry
        
        resp = client.post(f"/api/v1/designs/{MOCK_DESIGN_ID}/export")
        assert resp.status_code == 422
        assert "vi phạm các quy tắc vàng" in resp.json()["detail"]["message"]

    def test_export_design_not_found(self, client):
        """AC#1: Design not found returns 404."""
        mock_db = MagicMock()
        mock_db.execute = AsyncMock(return_value=MockResult(None))
        app.dependency_overrides[get_db] = lambda: mock_db
        
        random_id = uuid.uuid4()
        resp = client.post(f"/api/v1/designs/{random_id}/export")
        assert resp.status_code == 404
        assert "Không tìm thấy thiết kế" in resp.json()["detail"]

    def test_export_tenant_isolation(self, client, mock_design):
        """RBAC: Cannot export another tenant's design (tenant_id mismatch returns 404)."""
        # The design exists but belongs to a different tenant.
        # Since the query filters by tenant_id, it returns None -> 404.
        mock_db = MagicMock()
        # Simulate tenant_id mismatch: query returns no design
        mock_db.execute = AsyncMock(return_value=MockResult(None))
        app.dependency_overrides[get_db] = lambda: mock_db
        
        resp = client.post(f"/api/v1/designs/{MOCK_DESIGN_ID}/export")
        assert resp.status_code == 404
        assert "Không tìm thấy thiết kế" in resp.json()["detail"]
