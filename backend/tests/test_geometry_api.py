"""Tests for Geometry API endpoints."""

import pytest
from fastapi.testclient import TestClient
from src.main import app

from src.api.dependencies import get_current_user_from_token
from src.models.db_models import UserDB


async def mock_get_current_user():
    return UserDB(email="test@example.com", role="Owner", is_active=True)


@pytest.fixture
def client():
    """Create test client with mocked authentication."""
    app.dependency_overrides[get_current_user_from_token] = mock_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()


def test_create_baseline_endpoint(client):
    """Test POST /api/v1/geometry/baseline."""
    payload = {
        "neck": 36.0,
        "bust": 86.0,
        "waist": 68.0,
        "hip": 92.0,
        "shoulder_width": 36.0,
        "top_length": 100.0,
        "sleeve_length": 55.0
    }
    
    response = client.post("/api/v1/geometry/baseline", json=payload)
    
    assert response.status_code == 200
    data = response.json()
    assert data["version"] == "1.0.0"
    assert len(data["parts"]) == 3
    assert data["parts"][0]["part_id"] == "front_bodice"
