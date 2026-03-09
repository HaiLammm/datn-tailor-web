"""Tests for Manual Override API - Story 4.3 Task 8.1."""

import uuid
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.main import app
from src.api.dependencies import get_current_user_from_token, get_tenant_id_from_user
from src.core.database import get_db
from src.models.db_models import UserDB

# Test constants
TEST_TENANT_ID = uuid.uuid4()
TEST_USER_ID = uuid.uuid4()
TEST_DESIGN_ID = uuid.uuid4()


class MockDB:
    """Enhanced mock DB session with more realistic behavior."""
    
    def __init__(self, design_data=None, measurement_data=None, override_data=None):
        self._design = design_data
        self._measurement = measurement_data
        self._overrides = override_data or []
        self._commits = []
    
    async def execute(self, stmt):
        class MockResult:
            def __init__(self, outer):
                self.outer = outer
            
            def scalar_one_or_none(self):
                if hasattr(self.outer, '_design') and self.outer._design:
                    # Check if we're querying for a design
                    if hasattr(stmt, 'where_clause'):
                        from sqlalchemy import inspect
                        if hasattr(stmt, 'selects'):
                            # Check what table we're selecting from
                            for elem in inspect(stmt).iterate:
                                if hasattr(elem, 'table') and elem.table:
                                    if elem.table.name == 'designs':
                                        return self.outer._design
                return self.outer._measurement
            
            def scalars(self):
                class MockScalars:
                    def __init__(self, outer):
                        self.outer = outer
                    def all(self):
                        return self.outer._overrides
                return MockScalars(self.outer)
        
        return MockResult(self)
    
    async def commit(self):
        self._commits.append("commit")
    
    async def rollback(self):
        pass
    
    async def flush(self):
        pass
    
    def add(self, obj):
        if hasattr(obj, 'delta_key'):
            self._overrides.append(obj)


async def mock_get_db_with_design():
    """Mock DB with design and measurement data for guardrail tests."""
    from src.models.db_models import DesignDB, MeasurementDB
    from datetime import datetime, timezone
    
    # Create mock design with master_geometry containing AI deltas
    mock_design = MagicMock(spec=DesignDB)
    mock_design.id = TEST_DESIGN_ID
    mock_design.tenant_id = TEST_TENANT_ID
    mock_design.user_id = TEST_USER_ID
    mock_design.master_geometry = {
        "deltas": [
            {"key": "vong_eo", "value": -2.5, "unit": "cm", "label_vi": "Vòng eo"}
        ]
    }
    
    # Create mock measurement
    mock_measurement = MagicMock(spec=MeasurementDB)
    mock_measurement.vong_eo = 68.0
    mock_measurement.vong_nguc = 86.0
    
    db = MockDB(design_data=mock_design, measurement_data=mock_measurement)
    yield db


async def mock_get_db_empty():
    """Mock DB that returns None for design - for 404 tests."""
    yield MockDB()


def mock_get_current_user():
    """Mock a Tailor user."""
    return UserDB(
        id=TEST_USER_ID,
        email="tailor@test.com",
        role="Tailor",
        tenant_id=TEST_TENANT_ID,
        full_name="Minh Thợ May",
        is_active=True
    )


def mock_get_tenant_id():
    return TEST_TENANT_ID


# Default setup: Tailor access
app.dependency_overrides[get_current_user_from_token] = mock_get_current_user
app.dependency_overrides[get_tenant_id_from_user] = mock_get_tenant_id
app.dependency_overrides[get_db] = mock_get_db_empty

client = TestClient(app)


class TestOverrideAPI:
    """Functional tests for overrides API endpoints."""

    def test_rbac_customer_forbidden(self):
        """AC#1: Customer role should get 403 Forbidden."""
        def mock_customer():
            return UserDB(id=uuid.uuid4(), role="Customer", tenant_id=TEST_TENANT_ID, is_active=True)
        
        app.dependency_overrides[get_current_user_from_token] = mock_customer
        
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "vong_eo",
            "overridden_value": 72.0,
            "sequence_id": 1
        })
        
        assert resp.status_code == 403
        
        # Reset auth for other tests
        app.dependency_overrides[get_current_user_from_token] = mock_get_current_user

    def test_submit_override_invalid_key(self):
        """Task 8.1: Invalid delta_key returns 400 or 404."""
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "invalid_key",
            "overridden_value": 72.0,
            "sequence_id": 1
        })
        # Since our mock returns None for design, it should be 404
        assert resp.status_code == 404

    def test_get_history_requires_auth(self):
        """Endpoints require authentication."""
        app.dependency_overrides.pop(get_current_user_from_token, None)
        no_auth_client = TestClient(app)
        
        resp = no_auth_client.get(f"/api/v1/designs/{TEST_DESIGN_ID}/overrides")
        assert resp.status_code == 401
        
        # Restore auth
        app.dependency_overrides[get_current_user_from_token] = mock_get_current_user

    def test_submit_override_schema_validation(self):
        """Verify Pydantic validation works."""
        # Missing required fields
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "vong_eo"
        })
        assert resp.status_code == 422


class TestGuardrailReValidation:
    """Task 8.1: Test guardrail re-validation on override values.
    
    AC#2: If override violates hard constraint → 422 error returned
    """

    @patch('src.api.v1.overrides.get_registry')
    def test_override_violating_hard_constraint_returns_422(self, mock_get_registry):
        """AC#2: Override that violates hard constraint returns 422 with violations."""
        # Setup mock to return rejected status
        mock_registry = MagicMock()
        mock_registry.run_all.return_value = {
            "status": "rejected",
            "violations": [
                {
                    "constraint_type": "hard",
                    "message_vi": "Vòng eo không thể nhỏ hơn 50cm",
                    "violated_values": {"vong_eo": 45.0}
                }
            ],
            "warnings": []
        }
        mock_get_registry.return_value = mock_registry

        # Use mock DB with design data
        app.dependency_overrides[get_db] = mock_get_db_with_design
        
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "vong_eo",
            "overridden_value": 45.0,  # Too small - violates constraint
            "sequence_id": 1
        })
        
        assert resp.status_code == 422
        data = resp.json()
        assert "detail" in data
        assert "vi phạm" in data["detail"]["message"].lower() or "constraint" in data["detail"]["message"].lower()
        assert len(data["detail"]["violations"]) > 0

    @patch('src.api.v1.overrides.get_registry')
    def test_override_with_soft_constraint_warning_allows_save(self, mock_get_registry):
        """AC#2: Override with soft constraint warning allows save (returns 200)."""
        # Setup mock to return warning status (not rejected)
        mock_registry = MagicMock()
        mock_registry.run_all.return_value = {
            "status": "warning",
            "violations": [],
            "warnings": [
                {
                    "constraint_type": "soft",
                    "message_vi": "Khuyến nghị tăng thêm 0.5cm",
                    "violated_values": {"vong_eo": 68.5}
                }
            ]
        }
        mock_get_registry.return_value = mock_registry

        app.dependency_overrides[get_db] = mock_get_db_with_design
        
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "vong_eo",
            "overridden_value": 68.5,
            "sequence_id": 1
        })
        
        # Should succeed (warning doesn't block)
        assert resp.status_code == 200


class TestFlaggedForLearning:
    """Task 8.1: Test flagged_for_learning logic.
    
    AC#4: With reason → flagged_for_learning = true
    AC#4: Without reason → flagged_for_learning = false
    """

    @patch('src.api.v1.overrides.get_registry')
    def test_override_with_reason_flags_for_learning(self, mock_get_registry):
        """AC#4: Override WITH reason sets flagged_for_learning = true."""
        mock_registry = MagicMock()
        mock_registry.run_all.return_value = {
            "status": "passed",
            "violations": [],
            "warnings": []
        }
        mock_get_registry.return_value = mock_registry

        app.dependency_overrides[get_db] = mock_get_db_with_design
        
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "vong_eo",
            "overridden_value": 69.0,
            "reason_vi": "Khách thích mặc rộng hơn",
            "sequence_id": 1
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["flagged_for_learning"] is True

    @patch('src.api.v1.overrides.get_registry')
    def test_override_without_reason_not_flagged(self, mock_get_registry):
        """AC#4: Override WITHOUT reason sets flagged_for_learning = false."""
        mock_registry = MagicMock()
        mock_registry.run_all.return_value = {
            "status": "passed",
            "violations": [],
            "warnings": []
        }
        mock_get_registry.return_value = mock_registry

        app.dependency_overrides[get_db] = mock_get_db_with_design
        
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "vong_eo",
            "overridden_value": 69.0,
            "sequence_id": 1
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["flagged_for_learning"] is False

    @patch('src.api.v1.overrides.get_registry')
    def test_override_with_empty_reason_not_flagged(self, mock_get_registry):
        """AC#4: Override with empty string reason sets flagged_for_learning = false."""
        mock_registry = MagicMock()
        mock_registry.run_all.return_value = {
            "status": "passed",
            "violations": [],
            "warnings": []
        }
        mock_get_registry.return_value = mock_registry

        app.dependency_overrides[get_db] = mock_get_db_with_design
        
        resp = client.post(f"/api/v1/designs/{TEST_DESIGN_ID}/override", json={
            "delta_key": "vong_eo",
            "overridden_value": 69.0,
            "reason_vi": "",
            "sequence_id": 1
        })
        
        assert resp.status_code == 200
        data = resp.json()
        assert data["flagged_for_learning"] is False
