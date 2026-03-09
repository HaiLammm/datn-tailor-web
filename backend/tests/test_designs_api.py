"""Tests for Design Lock API endpoints (Story 3.4 - Task 3)."""

import uuid

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock

from src.main import app
from src.api.dependencies import get_current_user_from_token, get_tenant_id_from_user
from src.core.database import get_db
from src.models.db_models import UserDB


MOCK_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")
MOCK_USER_ID = uuid.UUID("00000000-0000-0000-0000-000000000099")


async def mock_get_current_user():
    user = UserDB(email="test@example.com", role="Customer", is_active=True)
    user.id = MOCK_USER_ID
    user.tenant_id = MOCK_TENANT_ID
    return user


async def mock_get_tenant_id():
    return MOCK_TENANT_ID


class MockResult:
    """Mock SQLAlchemy result."""

    def __init__(self, value=None):
        self._value = value

    def scalar_one_or_none(self):
        return self._value


class MockSession:
    """Mock async database session."""

    def __init__(self):
        self.added = []

    def add(self, obj):
        self.added.append(obj)
        obj.id = uuid.uuid4()

    async def execute(self, stmt):
        return MockResult(None)

    async def flush(self):
        pass

    async def commit(self):
        pass

    async def rollback(self):
        pass

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        pass


@pytest.fixture
def client():
    """Create test client with mocked auth and DB."""
    mock_db = MockSession()

    async def mock_get_db():
        yield mock_db

    app.dependency_overrides[get_current_user_from_token] = mock_get_current_user
    app.dependency_overrides[get_tenant_id_from_user] = mock_get_tenant_id
    app.dependency_overrides[get_db] = mock_get_db
    yield TestClient(app)
    app.dependency_overrides.clear()


def _make_lock_payload(base_id: str | None = None) -> dict:
    return {
        "base_id": base_id,
        "deltas": {
            "parts": [
                {
                    "part_id": "front_bodice",
                    "paths": [
                        {
                            "path_id": "front_bodice_outline",
                            "segments": [
                                {"dx": 1.0, "dy": 2.0},
                                {"dx": 0.5, "dy": -1.0, "cp1_dx": 0.1, "cp1_dy": 0.2},
                            ],
                        }
                    ],
                }
            ],
            "style_id": "classic",
        },
    }


class TestLockDesignEndpoint:
    """Tests for POST /api/v1/designs/lock."""

    def test_lock_design_success(self, client):
        """Lock design returns design_id and geometry_hash."""
        payload = _make_lock_payload("measurement-123")
        response = client.post("/api/v1/designs/lock", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "design_id" in data
        assert "sequence_id" in data
        assert "geometry_hash" in data
        assert data["status"] == "locked"
        assert len(data["geometry_hash"]) == 64

    def test_lock_design_without_base_id(self, client):
        """Lock design works without base_id (optional)."""
        payload = _make_lock_payload(None)
        response = client.post("/api/v1/designs/lock", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "locked"

    def test_lock_design_invalid_payload(self, client):
        """Lock design rejects invalid payload."""
        response = client.post("/api/v1/designs/lock", json={"invalid": "data"})
        assert response.status_code == 422

    def test_lock_design_returns_valid_geometry_hash(self, client):
        """Lock design returns valid 64-char SHA-256 hash."""
        payload = _make_lock_payload("measurement-abc")
        r1 = client.post("/api/v1/designs/lock", json=payload)
        r2 = client.post("/api/v1/designs/lock", json=payload)

        # geometry_hash should be different because sequence_id is a new UUID each time
        # But the hash algorithm itself is deterministic for same inputs
        assert r1.status_code == 200
        assert r2.status_code == 200
        # Both should have valid hashes
        assert len(r1.json()["geometry_hash"]) == 64
        assert len(r2.json()["geometry_hash"]) == 64

    def test_lock_design_empty_deltas(self, client):
        """Lock design with empty parts list."""
        payload = {
            "deltas": {
                "parts": [],
                "style_id": "classic",
            }
        }
        response = client.post("/api/v1/designs/lock", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "locked"

    def test_lock_design_requires_auth(self):
        """Lock design requires authentication (no override)."""
        # Create client WITHOUT auth override
        clean_client = TestClient(app)
        payload = _make_lock_payload()
        response = clean_client.post("/api/v1/designs/lock", json=payload)
        assert response.status_code in (401, 403)

    # Story 4.1a: Guardrail integration tests

    def test_lock_with_hard_constraint_violation_returns_422(self, client):
        """AC#5: Hard constraint failure rejects lock with 422."""
        payload = _make_lock_payload()
        payload["base_measurements"] = {
            "vong_nach": 30.0,
            "vong_bap_tay": 35.0,  # armhole < bicep + 2cm → violation
        }
        response = client.post("/api/v1/designs/lock", json=payload)
        assert response.status_code == 422
        detail = response.json()["detail"]
        assert "violations" in detail
        assert len(detail["violations"]) >= 1
        # AC#2: snap-back sequence_id included
        assert "last_valid_sequence_id" in detail

    def test_lock_with_soft_warning_succeeds_with_warnings(self, client):
        """AC#5: Soft constraint warnings included in successful lock response."""
        payload = _make_lock_payload()
        payload["base_measurements"] = {
            "vong_nach": 37.5,
            "vong_bap_tay": 35.0,  # Close to limit → danger zone warning
        }
        response = client.post("/api/v1/designs/lock", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "locked"
        assert "warnings" in data
        assert len(data["warnings"]) >= 1

    def test_lock_without_measurements_passes_guardrails(self, client):
        """No measurements provided → guardrails skip → lock proceeds."""
        payload = _make_lock_payload()
        # No base_measurements field
        response = client.post("/api/v1/designs/lock", json=payload)
        assert response.status_code == 200
        assert response.json()["status"] == "locked"
