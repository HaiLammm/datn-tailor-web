"""Abstract base classes for the Constraint Engine - Story 4.1a.

Defines the contract for Hard and Soft constraints following
the Registry Pattern from architecture.md.
"""

from abc import ABC, abstractmethod
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ConstraintSeverity(str, Enum):
    """Severity level for constraint results."""

    HARD = "hard"
    SOFT = "soft"


class ConstraintResult(BaseModel):
    """Result from a constraint check that indicates a violation or warning."""

    constraint_id: str = Field(..., description="Unique identifier for the constraint")
    severity: ConstraintSeverity = Field(..., description="hard or soft")
    message_vi: str = Field(
        ..., description="Vietnamese message describing the violation"
    )
    violated_values: dict = Field(
        ..., description="Key-value pairs of the values that triggered the violation"
    )
    safe_suggestion: Optional[dict] = Field(
        None, description="Suggested safe values to resolve the violation"
    )

    model_config = {"from_attributes": True}


class HardConstraint(ABC):
    """Abstract base for Hard Constraints (Phase 1).

    Hard constraint violations lead to immediate Reject Snapshot.
    """

    constraint_id: str = ""
    description_vi: str = ""

    @abstractmethod
    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        """Check this constraint against measurements and deltas.

        Args:
            measurements: Customer body measurements.
            deltas: Computed geometric deltas.

        Returns:
            ConstraintResult if violated, None if passed.
        """
        ...


class SoftConstraint(ABC):
    """Abstract base for Soft Constraints (Phase 2).

    Soft constraint violations return warnings but allow the operation.
    """

    constraint_id: str = ""
    description_vi: str = ""

    @abstractmethod
    def check(
        self, measurements: dict, deltas: dict
    ) -> Optional[ConstraintResult]:
        """Check this constraint against measurements and deltas.

        Args:
            measurements: Customer body measurements.
            deltas: Computed geometric deltas.

        Returns:
            ConstraintResult if triggered, None if no warning.
        """
        ...
