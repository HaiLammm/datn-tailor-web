"""Constraint Engine - Story 4.1a.

Physical and advisory constraint checking for garment designs.
Implements Registry Pattern (Hard/Soft phases) per architecture.md.
"""

from src.constraints.base import (
    ConstraintResult,
    ConstraintSeverity,
    HardConstraint,
    SoftConstraint,
)
from src.constraints.registry import ConstraintRegistry

__all__ = [
    "ConstraintRegistry",
    "ConstraintResult",
    "ConstraintSeverity",
    "HardConstraint",
    "SoftConstraint",
]
