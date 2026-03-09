"""Tests for Constraint Registry Framework - Story 4.1a Task 1."""

import pytest

from src.constraints.base import (
    ConstraintResult,
    ConstraintSeverity,
    HardConstraint,
    SoftConstraint,
)
from src.constraints.registry import ConstraintRegistry


# --- Test Fixtures: Concrete constraint implementations for testing ---


class AlwaysPassHard(HardConstraint):
    constraint_id = "test_pass_hard"
    description_vi = "Luôn đạt (kiểm tra)"

    def check(self, measurements: dict, deltas: dict) -> ConstraintResult | None:
        return None  # None means pass


class AlwaysFailHard(HardConstraint):
    constraint_id = "test_fail_hard"
    description_vi = "Luôn vi phạm (kiểm tra)"

    def check(self, measurements: dict, deltas: dict) -> ConstraintResult | None:
        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.HARD,
            message_vi="Vi phạm cứng giả lập",
            violated_values={"test_key": 999},
            safe_suggestion={"test_key": 50},
        )


class AlwaysWarnSoft(SoftConstraint):
    constraint_id = "test_warn_soft"
    description_vi = "Luôn cảnh báo (kiểm tra)"

    def check(self, measurements: dict, deltas: dict) -> ConstraintResult | None:
        return ConstraintResult(
            constraint_id=self.constraint_id,
            severity=ConstraintSeverity.SOFT,
            message_vi="Cảnh báo mềm giả lập",
            violated_values={"test_key": 80},
            safe_suggestion=None,
        )


class AlwaysPassSoft(SoftConstraint):
    constraint_id = "test_pass_soft"
    description_vi = "Luôn đạt mềm (kiểm tra)"

    def check(self, measurements: dict, deltas: dict) -> ConstraintResult | None:
        return None


# --- Tests ---


class TestConstraintResult:
    def test_constraint_result_creation(self):
        result = ConstraintResult(
            constraint_id="test",
            severity=ConstraintSeverity.HARD,
            message_vi="Lỗi kiểm tra",
            violated_values={"a": 1},
            safe_suggestion={"a": 0.5},
        )
        assert result.constraint_id == "test"
        assert result.severity == ConstraintSeverity.HARD
        assert result.message_vi == "Lỗi kiểm tra"

    def test_severity_enum_values(self):
        assert ConstraintSeverity.HARD == "hard"
        assert ConstraintSeverity.SOFT == "soft"


class TestConstraintRegistry:
    def test_empty_registry_returns_passed(self):
        registry = ConstraintRegistry()
        result = registry.run_all({}, {})
        assert result["status"] == "passed"
        assert result["violations"] == []
        assert result["warnings"] == []

    def test_register_and_run_hard_constraint_pass(self):
        registry = ConstraintRegistry()
        registry.register(AlwaysPassHard())
        result = registry.run_all({}, {})
        assert result["status"] == "passed"
        assert result["violations"] == []

    def test_register_and_run_hard_constraint_fail(self):
        registry = ConstraintRegistry()
        registry.register(AlwaysFailHard())
        result = registry.run_all({}, {})
        assert result["status"] == "rejected"
        assert len(result["violations"]) == 1
        assert result["violations"][0].constraint_id == "test_fail_hard"

    def test_register_and_run_soft_constraint_warn(self):
        registry = ConstraintRegistry()
        registry.register(AlwaysWarnSoft())
        result = registry.run_all({}, {})
        assert result["status"] == "warning"
        assert len(result["warnings"]) == 1
        assert result["warnings"][0].constraint_id == "test_warn_soft"

    def test_hard_constraints_run_before_soft(self):
        """Hard constraints execute in Phase 1, soft in Phase 2."""
        registry = ConstraintRegistry()
        registry.register(AlwaysWarnSoft())
        registry.register(AlwaysFailHard())
        result = registry.run_all({}, {})
        # Hard failure takes precedence
        assert result["status"] == "rejected"
        assert len(result["violations"]) == 1
        # Soft warnings should still be collected
        assert len(result["warnings"]) == 1

    def test_multiple_hard_violations_all_returned(self):
        """ALL violations returned, not just the first one."""
        registry = ConstraintRegistry()
        registry.register(AlwaysFailHard())
        fail2 = AlwaysFailHard()
        fail2.constraint_id = "test_fail_hard_2"
        registry.register(fail2)
        result = registry.run_all({}, {})
        assert result["status"] == "rejected"
        assert len(result["violations"]) == 2

    def test_soft_only_returns_warning_status(self):
        registry = ConstraintRegistry()
        registry.register(AlwaysPassHard())
        registry.register(AlwaysWarnSoft())
        result = registry.run_all({}, {})
        assert result["status"] == "warning"

    def test_all_pass_returns_passed(self):
        registry = ConstraintRegistry()
        registry.register(AlwaysPassHard())
        registry.register(AlwaysPassSoft())
        result = registry.run_all({}, {})
        assert result["status"] == "passed"
        assert result["violations"] == []
        assert result["warnings"] == []

    def test_measurements_and_deltas_passed_to_constraints(self):
        """Verify that measurements and deltas are forwarded to constraint check."""
        received = {}

        class CapturingConstraint(HardConstraint):
            constraint_id = "capture"
            description_vi = "Bắt giá trị"

            def check(self, measurements: dict, deltas: dict) -> ConstraintResult | None:
                received["measurements"] = measurements
                received["deltas"] = deltas
                return None

        registry = ConstraintRegistry()
        registry.register(CapturingConstraint())
        registry.run_all({"vong_nguc": 90}, {"rong_vai": 2.0})
        assert received["measurements"] == {"vong_nguc": 90}
        assert received["deltas"] == {"rong_vai": 2.0}

    def test_freeze_prevents_further_registration(self):
        """Frozen registry rejects new registrations."""
        registry = ConstraintRegistry()
        registry.register(AlwaysPassHard())
        registry.freeze()
        with pytest.raises(RuntimeError, match="frozen"):
            registry.register(AlwaysWarnSoft())
