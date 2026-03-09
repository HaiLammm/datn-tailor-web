"""Tests for Soft Constraint implementations - Story 4.1a Task 3."""

import pytest

from src.constraints.base import ConstraintSeverity
from src.constraints.soft_constraints import (
    AsymmetryWarning,
    DangerZoneProximityWarning,
    HighBodyHugWarning,
    NarrowShoulderWarning,
)


class TestHighBodyHugWarning:
    """Migrated from style_service.py: do_om_than > 85."""

    def setup_method(self):
        self.constraint = HighBodyHugWarning()

    def test_no_warning_below_threshold(self):
        deltas = {"do_om_than": 80.0}
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_no_warning_at_threshold(self):
        """At exactly 85, no warning (> not >=)."""
        deltas = {"do_om_than": 85.0}
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_warning_above_threshold(self):
        deltas = {"do_om_than": 90.0}
        result = self.constraint.check({}, deltas)
        assert result is not None
        assert result.severity == ConstraintSeverity.SOFT
        assert result.constraint_id == "high_body_hug"

    def test_skip_when_missing(self):
        result = self.constraint.check({}, {})
        assert result is None


class TestNarrowShoulderWarning:
    """Migrated from style_service.py: do_rong_vai < 30."""

    def setup_method(self):
        self.constraint = NarrowShoulderWarning()

    def test_no_warning_above_threshold(self):
        deltas = {"do_rong_vai": 50.0}
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_no_warning_at_threshold(self):
        deltas = {"do_rong_vai": 30.0}
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_warning_below_threshold(self):
        deltas = {"do_rong_vai": 25.0}
        result = self.constraint.check({}, deltas)
        assert result is not None
        assert result.severity == ConstraintSeverity.SOFT

    def test_skip_when_missing(self):
        result = self.constraint.check({}, {})
        assert result is None


class TestAsymmetryWarning:
    """Migrated from style_service.py: do_bat_doi_xung > 70."""

    def setup_method(self):
        self.constraint = AsymmetryWarning()

    def test_no_warning_below_threshold(self):
        deltas = {"do_bat_doi_xung": 50.0}
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_no_warning_at_threshold(self):
        """At exactly 70, no warning (> not >=)."""
        deltas = {"do_bat_doi_xung": 70.0}
        result = self.constraint.check({}, deltas)
        assert result is None

    def test_warning_above_threshold(self):
        deltas = {"do_bat_doi_xung": 80.0}
        result = self.constraint.check({}, deltas)
        assert result is not None
        assert result.severity == ConstraintSeverity.SOFT

    def test_skip_when_missing(self):
        result = self.constraint.check({}, {})
        assert result is None


class TestDangerZoneProximityWarning:
    """Values within X% of hard constraint limits."""

    def setup_method(self):
        self.constraint = DangerZoneProximityWarning()

    def test_warning_when_armhole_near_limit(self):
        # Armhole limit: bicep + 2cm. If armhole is 37.5 and bicep is 35, that's 2.5cm ease (close to 2cm min)
        measurements = {"vong_nach": 37.5, "vong_bap_tay": 35.0}
        result = self.constraint.check(measurements, {})
        assert result is not None
        assert result.severity == ConstraintSeverity.SOFT

    def test_no_warning_when_far_from_limit(self):
        measurements = {"vong_nach": 45.0, "vong_bap_tay": 35.0}
        result = self.constraint.check(measurements, {})
        assert result is None

    def test_no_warning_when_already_violated(self):
        """If already below limit, the hard constraint handles it."""
        measurements = {"vong_nach": 36.0, "vong_bap_tay": 35.0}
        result = self.constraint.check(measurements, {})
        assert result is None  # Hard constraint handles this case

    def test_skip_when_missing(self):
        result = self.constraint.check({}, {})
        assert result is None
