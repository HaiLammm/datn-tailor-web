"""Tests for Guardrails API endpoint - Story 4.1a Task 5 & 7."""

import time

import pytest
from fastapi.testclient import TestClient

from src.main import app

client = TestClient(app)

ENDPOINT = "/api/v1/guardrails/check"


class TestGuardrailsEndpoint:
    def _make_request(self, measurements: dict, deltas: list | None = None):
        body = {
            "base_measurements": measurements,
            "deltas": deltas or [],
        }
        return client.post(ENDPOINT, json=body)

    def test_all_pass_returns_passed(self):
        resp = self._make_request(
            {"vong_nach": 45.0, "vong_bap_tay": 30.0, "vong_co": 50.0, "vong_dau": 56.0}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "passed"
        assert data["violations"] == []
        assert data["warnings"] == []

    def test_hard_violation_returns_rejected(self):
        resp = self._make_request(
            {"vong_nach": 30.0, "vong_bap_tay": 35.0}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "rejected"
        assert len(data["violations"]) >= 1
        assert data["violations"][0]["constraint_id"] == "armhole_vs_bicep"

    def test_soft_warning_returns_warning(self):
        resp = self._make_request(
            {"vong_nach": 45.0, "vong_bap_tay": 30.0},
            deltas=[
                {"key": "body_fit", "value": 90.0, "unit": "%", "label_vi": "Độ ôm thân"}
            ],
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "warning"
        assert len(data["warnings"]) >= 1

    def test_empty_deltas_returns_passed(self):
        """AC#6: empty deltas always pass."""
        resp = self._make_request(
            {"vong_nach": 45.0, "vong_bap_tay": 30.0},
            deltas=[],
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "passed"

    def test_empty_measurements_returns_passed(self):
        """No measurements means constraints skip (nothing to check)."""
        resp = self._make_request({})
        assert resp.status_code == 200
        assert resp.json()["status"] == "passed"

    def test_multiple_violations_all_returned(self):
        resp = self._make_request({
            "vong_nach": 30.0,
            "vong_bap_tay": 35.0,
            "vong_co": 30.0,
            "vong_dau": 56.0,
        })
        data = resp.json()
        assert data["status"] == "rejected"
        assert len(data["violations"]) == 2  # armhole + neck

    def test_response_includes_checked_at(self):
        resp = self._make_request({})
        data = resp.json()
        assert "checked_at" in data

    def test_danger_zone_proximity_warning(self):
        """Close to armhole limit triggers soft warning."""
        resp = self._make_request(
            {"vong_nach": 37.5, "vong_bap_tay": 35.0}
        )
        data = resp.json()
        assert data["status"] == "warning"
        warning_ids = [w["constraint_id"] for w in data["warnings"]]
        assert "danger_zone_proximity" in warning_ids

    def test_rejected_with_both_violations_and_warnings(self):
        """Hard fail + soft warning: status is rejected, both lists populated."""
        resp = self._make_request(
            {"vong_nach": 30.0, "vong_bap_tay": 35.0},
            deltas=[
                {"key": "body_fit", "value": 90.0, "unit": "%", "label_vi": "Độ ôm thân"}
            ],
        )
        data = resp.json()
        assert data["status"] == "rejected"
        assert len(data["violations"]) >= 1
        assert len(data["warnings"]) >= 1

    def test_performance_under_50ms(self):
        """Task 7.7: guardrail check completes in < 50ms."""
        body = {
            "base_measurements": {
                "vong_nach": 45.0,
                "vong_bap_tay": 30.0,
                "vong_co": 50.0,
                "vong_dau": 56.0,
                "vong_eo": 75.0,
                "vong_mong": 100.0,
            },
            "deltas": [
                {"key": "body_fit", "value": 60.0, "unit": "%", "label_vi": "Độ ôm thân"},
                {"key": "shoulder_width", "value": 50.0, "unit": "%", "label_vi": "Độ rộng vai"},
            ],
        }
        start = time.perf_counter()
        resp = client.post(ENDPOINT, json=body)
        elapsed_ms = (time.perf_counter() - start) * 1000
        assert resp.status_code == 200
        assert elapsed_ms < 50, f"Guardrail check took {elapsed_ms:.1f}ms (> 50ms limit)"
