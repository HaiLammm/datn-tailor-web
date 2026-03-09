"""Constraint Registry - Story 4.1a.

Implements the Registry Pattern for running Hard and Soft constraints.
Phase 1: Hard Constraints (reject on violation).
Phase 2: Soft Constraints (warn but allow).
"""

from typing import Union

from src.constraints.base import (
    ConstraintResult,
    HardConstraint,
    SoftConstraint,
)


class ConstraintRegistry:
    """Registry that collects and executes constraints in phase order.

    Usage:
        registry = ConstraintRegistry()
        registry.register(ArmholeVsBicepConstraint())
        registry.register(HighBodyHugWarning())
        result = registry.run_all(measurements, deltas)
    """

    def __init__(self) -> None:
        self._hard: list[HardConstraint] = []
        self._soft: list[SoftConstraint] = []
        self._frozen: bool = False

    def register(self, constraint: Union[HardConstraint, SoftConstraint]) -> None:
        """Register a constraint in the appropriate phase.

        Raises RuntimeError if registry has been frozen.
        """
        if self._frozen:
            raise RuntimeError("Cannot register constraints after registry is frozen")
        if isinstance(constraint, HardConstraint):
            self._hard.append(constraint)
        elif isinstance(constraint, SoftConstraint):
            self._soft.append(constraint)
        else:
            raise TypeError(
                f"Expected HardConstraint or SoftConstraint, got {type(constraint)}"
            )

    def freeze(self) -> None:
        """Freeze the registry to prevent further registration."""
        self._frozen = True

    def run_all(
        self, measurements: dict, deltas: dict
    ) -> dict:
        """Run all registered constraints in phase order.

        Phase 1: All Hard Constraints (collect ALL violations).
        Phase 2: All Soft Constraints (collect ALL warnings).

        Args:
            measurements: Customer body measurements dict.
            deltas: Computed geometric deltas dict.

        Returns:
            Dict with keys: status, violations, warnings.
            status is "rejected" if any hard violation,
            "warning" if soft warnings only, "passed" otherwise.
        """
        violations: list[ConstraintResult] = []
        warnings: list[ConstraintResult] = []

        # Phase 1: Hard Constraints
        for constraint in self._hard:
            result = constraint.check(measurements, deltas)
            if result is not None:
                violations.append(result)

        # Phase 2: Soft Constraints
        for constraint in self._soft:
            result = constraint.check(measurements, deltas)
            if result is not None:
                warnings.append(result)

        # Determine status
        if violations:
            status = "rejected"
        elif warnings:
            status = "warning"
        else:
            status = "passed"

        return {
            "status": status,
            "violations": violations,
            "warnings": warnings,
        }
