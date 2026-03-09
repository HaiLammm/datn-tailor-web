"""Guardrails API endpoint - Story 4.1a Task 5.

POST /api/v1/guardrails/check - Run physical constraint checks.
"""

from fastapi import APIRouter

from src.constraints.hard_constraints import (
    ArmholeVsBicepConstraint,
    MinimumSeamAllowanceConstraint,
    NeckOpeningConstraint,
    WaistVsHipConstraint,
)
from src.constraints.registry import ConstraintRegistry
from src.constraints.soft_constraints import (
    AsymmetryWarning,
    DangerZoneProximityWarning,
    HighBodyHugWarning,
    NarrowShoulderWarning,
)
from src.models.guardrail import (
    GuardrailCheckRequest,
    GuardrailCheckResponse,
)

router = APIRouter(prefix="/api/v1/guardrails", tags=["guardrails"])

# Build the global constraint registry with all constraints
_registry = ConstraintRegistry()

# Phase 1: Hard Constraints
_registry.register(ArmholeVsBicepConstraint())
_registry.register(NeckOpeningConstraint())
_registry.register(WaistVsHipConstraint())
_registry.register(MinimumSeamAllowanceConstraint())

# Phase 2: Soft Constraints
_registry.register(HighBodyHugWarning())
_registry.register(NarrowShoulderWarning())
_registry.register(AsymmetryWarning())
_registry.register(DangerZoneProximityWarning())
_registry.freeze()


def get_registry() -> ConstraintRegistry:
    """Get the global constraint registry (for reuse in designs.py)."""
    return _registry


@router.post("/check", response_model=GuardrailCheckResponse)
async def check_guardrails(request: GuardrailCheckRequest) -> GuardrailCheckResponse:
    """Run all physical and advisory constraints against the given measurements and deltas.

    Returns status: passed | warning | rejected with detailed violation/warning info.
    """
    measurements = request.base_measurements.to_dict()
    deltas = {d.key: d.value for d in request.deltas}

    result = _registry.run_all(measurements, deltas)

    return GuardrailCheckResponse(
        status=result["status"],
        violations=result["violations"],
        warnings=result["warnings"],
        last_valid_sequence_id=None,  # TODO: query from designs table when needed
    )
