"""Tests for Hard Constraint implementations - Story 4.1a Task 2."""

import pytest

from src.constraints.base import ConstraintSeverity
from src.constraints.hard_constraints import (
    ArmholeVsBicepConstraint,
    MinimumSeamAllowanceConstraint,
    NeckOpeningConstraint,
    WaistVsHipConstraint,
)


class TestArmholeVsBicepConstraint:
    """FR9: armhole_circumference >= bicep_circumference + min_ease."""

    def setup_method(self):
        self.constraint = ArmholeVsBicepConstraint()

    def test_pass_when_armhole_exceeds_bicep_plus_ease(self):
        measurements = {"vong_nach": 42.0, "vong_bap_tay": 35.0}
        result = self.constraint.check(measurements, {})
        assert result is None

    def test_pass_at_exact_boundary(self):
        """AC#7: boundary-inclusive (>=)."""
        measurements = {"vong_nach": 37.0, "vong_bap_tay": 35.0}  # 37 >= 35+2
        result = self.constraint.check(measurements, {})
        assert result is None

    def test_fail_when_armhole_too_small(self):
        measurements = {"vong_nach": 36.0, "vong_bap_tay": 35.0}  # 36 < 35+2
        result = self.constraint.check(measurements, {})
        assert result is not None
        assert result.severity == ConstraintSeverity.HARD
        assert result.constraint_id == "armhole_vs_bicep"
        assert "vong_nach" in result.violated_values
        assert result.safe_suggestion is not None

    def test_skip_when_missing_measurements(self):
        result = self.constraint.check({}, {})
        assert result is None

    def test_vietnamese_message(self):
        measurements = {"vong_nach": 30.0, "vong_bap_tay": 35.0}
        result = self.constraint.check(measurements, {})
        assert result is not None
        assert "nách" in result.message_vi.lower() or "bắp tay" in result.message_vi.lower()


class TestNeckOpeningConstraint:
    def setup_method(self):
        self.constraint = NeckOpeningConstraint()

    def test_pass_when_neck_opening_sufficient(self):
        measurements = {"vong_co": 50.0, "vong_dau": 56.0}  # 50 >= 56*0.85=47.6
        result = self.constraint.check(measurements, {})
        assert result is None

    def test_pass_at_exact_boundary(self):
        measurements = {"vong_co": 47.6, "vong_dau": 56.0}  # 47.6 >= 56*0.85=47.6
        result = self.constraint.check(measurements, {})
        assert result is None

    def test_fail_when_neck_too_tight(self):
        measurements = {"vong_co": 40.0, "vong_dau": 56.0}  # 40 < 47.6
        result = self.constraint.check(measurements, {})
        assert result is not None
        assert result.severity == ConstraintSeverity.HARD
        assert result.constraint_id == "neck_opening"

    def test_skip_when_missing(self):
        result = self.constraint.check({"vong_co": 40.0}, {})
        assert result is None


class TestWaistVsHipConstraint:
    def setup_method(self):
        self.constraint = WaistVsHipConstraint()

    def test_pass_when_waist_sufficient(self):
        measurements = {"vong_eo": 75.0, "vong_mong": 100.0}  # 75 >= 100*0.7=70
        result = self.constraint.check(measurements, {})
        assert result is None

    def test_pass_at_exact_boundary(self):
        measurements = {"vong_eo": 70.0, "vong_mong": 100.0}  # 70 >= 70
        result = self.constraint.check(measurements, {})
        assert result is None

    def test_fail_when_waist_too_narrow(self):
        measurements = {"vong_eo": 60.0, "vong_mong": 100.0}  # 60 < 70
        result = self.constraint.check(measurements, {})
        assert result is not None
        assert result.severity == ConstraintSeverity.HARD

    def test_skip_when_missing(self):
        result = self.constraint.check({}, {})
        assert result is None


class TestMinimumSeamAllowanceConstraint:
    def setup_method(self):
        self.constraint = MinimumSeamAllowanceConstraint()

    def test_pass_when_seam_sufficient(self):
        deltas = {"du_duong_may": 1.5}
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_pass_at_exact_boundary(self):
        deltas = {"du_duong_may": 1.0}  # exactly at minimum
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_fail_when_seam_too_small(self):
        deltas = {"du_duong_may": 0.5}
        result = self.constraint.check({}, deltas)
        assert result is not None
        assert result.severity == ConstraintSeverity.HARD
        assert result.constraint_id == "minimum_seam_allowance"

    def test_skip_when_not_present(self):
        result = self.constraint.check({}, {})
        assert result is None


class TestMultipleSimultaneousViolations:
    """Multiple hard constraints can fail at the same time."""

    def test_two_hard_constraints_fail_simultaneously(self):
        from src.constraints.registry import ConstraintRegistry

        registry = ConstraintRegistry()
        registry.register(ArmholeVsBicepConstraint())
        registry.register(NeckOpeningConstraint())

        measurements = {
            "vong_nach": 30.0,
            "vong_bap_tay": 35.0,  # armhole fail
            "vong_co": 30.0,
            "vong_dau": 56.0,  # neck fail
        }
        result = registry.run_all(measurements, {})
        assert result["status"] == "rejected"
        assert len(result["violations"]) == 2
