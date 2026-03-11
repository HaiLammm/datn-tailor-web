"""Tests for Story 2.2: Intensity Submission API endpoint.

Tests POST /api/v1/styles/submit-intensity including:
- Valid submission success
- Out-of-range value validation
- Unknown pillar handling
- Soft constraint warnings
- Multiple intensity values
"""

import pytest
from fastapi.testclient import TestClient

import src.services.style_service as _style_module
from src.main import app

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_session_sequences():
    _style_module._session_sequences.clear()
    yield
    _style_module._session_sequences.clear()


class TestSubmitIntensity:
    """Tests for POST /api/v1/styles/submit-intensity."""

    def test_submit_valid_intensity_returns_success(self) -> None:
        """AC1: Valid intensity submission returns success response."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [
                {"key": "shoulder_width", "value": 50.0},
                {"key": "body_fit", "value": 60.0},
            ],
            "sequence_id": 1,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["sequence_id"] == 1
        assert data["warnings"] == []

    def test_submit_intensity_returns_all_sliders(self) -> None:
        """AC1: Can submit all sliders for a pillar."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [
                {"key": "shoulder_width", "value": 38.2},
                {"key": "body_fit", "value": 61.8},
                {"key": "garment_length", "value": 50.0},
                {"key": "do_rong_tay", "value": 55.0},
            ],
            "sequence_id": 5,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["sequence_id"] == 5

    def test_submit_invalid_pillar_returns_404(self) -> None:
        """AC3: Unknown pillar_id returns 404 error."""
        payload = {
            "pillar_id": "nonexistent-pillar",
            "intensities": [{"key": "shoulder_width", "value": 50.0}],
            "sequence_id": 1,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 404

    def test_submit_value_above_max_returns_validation_error(self) -> None:
        """AC3: Value exceeding max_value returns error."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "shoulder_width", "value": 150.0}],  # max is 100
            "sequence_id": 1,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 422
        data = response.json()
        assert "shoulder_width" in str(data)

    def test_submit_value_below_min_returns_validation_error(self) -> None:
        """AC3: Value below min_value returns error."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "shoulder_width", "value": -5.0}],  # min is 0
            "sequence_id": 1,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 422

    def test_submit_high_body_fit_returns_soft_warning(self) -> None:
        """AC3: body_fit > 85 triggers soft constraint warning."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "body_fit", "value": 90.0}],
            "sequence_id": 3,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True  # soft warning, not an error
        warnings = data["warnings"]
        assert len(warnings) == 1
        assert warnings[0]["slider_key"] == "body_fit"
        assert warnings[0]["severity"] == "soft"
        assert "ôm" in warnings[0]["message"].lower() or "vận động" in warnings[0]["message"].lower()

    def test_submit_body_fit_at_threshold_no_warning(self) -> None:
        """AC3: body_fit at exactly 85 does NOT trigger warning."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "body_fit", "value": 85.0}],
            "sequence_id": 2,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["warnings"] == []

    def test_submit_low_shoulder_width_returns_soft_warning(self) -> None:
        """AC3: shoulder_width < 30 triggers soft constraint warning."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "shoulder_width", "value": 20.0}],
            "sequence_id": 4,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        warnings = data["warnings"]
        assert len(warnings) == 1
        assert warnings[0]["slider_key"] == "shoulder_width"
        assert warnings[0]["severity"] == "soft"

    def test_submit_unknown_slider_key_is_ignored(self) -> None:
        """AC3: Unknown slider keys in intensities are ignored gracefully."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "unknown_key", "value": 50.0}],
            "sequence_id": 1,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        # Unknown keys should be ignored, not fail the whole request
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

    def test_submit_minimalist_pillar(self) -> None:
        """AC1: Can submit intensity for non-default pillar."""
        payload = {
            "pillar_id": "minimalist",
            "intensities": [
                {"key": "shoulder_width", "value": 45.0},
                {"key": "body_fit", "value": 70.0},
            ],
            "sequence_id": 10,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["sequence_id"] == 10

    def test_submit_avant_garde_high_bat_doi_xung_warning(self) -> None:
        """AC3: do_bat_doi_xung > 70 in avant-garde returns soft warning."""
        payload = {
            "pillar_id": "avant-garde",
            "intensities": [{"key": "do_bat_doi_xung", "value": 80.0}],
            "sequence_id": 7,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["warnings"]) == 1
        assert data["warnings"][0]["slider_key"] == "do_bat_doi_xung"

    def test_submit_empty_intensities_is_valid(self) -> None:
        """AC1: Empty intensities list is valid (no changes submitted)."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [],
            "sequence_id": 1,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True


class TestGoldenPointsInPillars:
    """Tests for golden_points in StylePillar response (AC4)."""

    def test_get_pillars_includes_golden_points(self) -> None:
        """AC4: GET /pillars returns sliders with golden_points field."""
        response = client.get("/api/v1/styles/pillars")
        assert response.status_code == 200
        data = response.json()
        pillars = data["pillars"]
        assert len(pillars) > 0
        for pillar in pillars:
            for slider in pillar["sliders"]:
                assert "golden_points" in slider
                # golden_points must be a list (can be empty)
                assert isinstance(slider["golden_points"], list)

    def test_traditional_pillar_has_golden_points(self) -> None:
        """AC4: Traditional pillar sliders have non-empty golden_points."""
        response = client.get("/api/v1/styles/pillars/traditional")
        assert response.status_code == 200
        pillar = response.json()
        for slider in pillar["sliders"]:
            assert len(slider["golden_points"]) > 0, (
                f"Slider '{slider['key']}' should have golden_points"
            )

    def test_golden_points_within_valid_range(self) -> None:
        """AC4: All golden_points values within [min_value, max_value]."""
        response = client.get("/api/v1/styles/pillars")
        assert response.status_code == 200
        pillars = response.json()["pillars"]
        for pillar in pillars:
            for slider in pillar["sliders"]:
                for gp in slider["golden_points"]:
                    assert slider["min_value"] <= gp <= slider["max_value"], (
                        f"Golden point {gp} out of range for slider '{slider['key']}'"
                    )


class TestSequenceValidation:
    """Tests for AC5: Sequence-based race condition protection."""

    def test_stale_sequence_returns_409(self) -> None:
        """AC5: Submitting sequence_id lower than last seen returns 409."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "shoulder_width", "value": 50.0}],
            "sequence_id": 5,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200

        # Submit with stale seq=3
        payload["sequence_id"] = 3
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 409
        data = response.json()
        assert "3" in data["detail"]
        assert "5" in data["detail"]

    def test_equal_sequence_is_accepted(self) -> None:
        """AC5: Submitting the same sequence_id as last seen is accepted (idempotent)."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "shoulder_width", "value": 50.0}],
            "sequence_id": 5,
        }
        client.post("/api/v1/styles/submit-intensity", json=payload)

        # Same sequence is not stale
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200

    def test_higher_sequence_is_accepted(self) -> None:
        """AC5: Submitting a higher sequence_id than last seen is accepted."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "shoulder_width", "value": 50.0}],
            "sequence_id": 3,
        }
        client.post("/api/v1/styles/submit-intensity", json=payload)

        payload["sequence_id"] = 7
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        assert response.json()["sequence_id"] == 7

    def test_first_sequence_any_value_accepted(self) -> None:
        """AC5: First submission for a pillar always accepted regardless of sequence_id."""
        payload = {
            "pillar_id": "traditional",
            "intensities": [{"key": "shoulder_width", "value": 50.0}],
            "sequence_id": 999,
        }
        response = client.post("/api/v1/styles/submit-intensity", json=payload)
        assert response.status_code == 200
        assert response.json()["success"] is True
