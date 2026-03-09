"""Pydantic models for Guardrails API - Story 4.1a Task 4.

Request/Response schemas for the physical constraint checking endpoint.
Uses Vietnamese tailoring terminology (NFR11).
"""

from datetime import datetime, timezone
from typing import Literal, Optional

from pydantic import BaseModel, Field

from src.constraints.base import ConstraintResult
from src.models.inference import DeltaValue


class BaseMeasurements(BaseModel):
    """Typed model for customer body measurements.

    Source: customer measurements from customers table.
    All values in centimeters.
    """

    vong_co: Optional[float] = Field(None, description="Vòng cổ (cm)")
    vong_nguc: Optional[float] = Field(None, description="Vòng ngực (cm)")
    vong_eo: Optional[float] = Field(None, description="Vòng eo (cm)")
    vong_mong: Optional[float] = Field(None, description="Vòng mông (cm)")
    vong_bap_tay: Optional[float] = Field(None, description="Vòng bắp tay (cm)")
    vong_nach: Optional[float] = Field(None, description="Vòng nách (cm)")
    vong_dau: Optional[float] = Field(None, description="Vòng đầu (cm)")
    dai_tay: Optional[float] = Field(None, description="Dài tay (cm)")
    ha_eo: Optional[float] = Field(None, description="Hạ eo (cm)")
    rong_vai: Optional[float] = Field(None, description="Rộng vai (cm)")
    rong_nguc: Optional[float] = Field(None, description="Rộng ngực (cm)")
    rong_lung: Optional[float] = Field(None, description="Rộng lưng (cm)")

    model_config = {"from_attributes": True}

    def to_dict(self) -> dict:
        """Convert to dict, excluding None values."""
        return {k: v for k, v in self.model_dump().items() if v is not None}


class GuardrailCheckRequest(BaseModel):
    """Request body for POST /api/v1/guardrails/check."""

    base_measurements: BaseMeasurements = Field(
        ..., description="Customer body measurements"
    )
    deltas: list[DeltaValue] = Field(
        default_factory=list, description="Computed geometric deltas"
    )
    sequence_id: Optional[int] = Field(
        None, description="Sequence ID for race condition prevention"
    )

    model_config = {"from_attributes": True}


class GuardrailCheckResponse(BaseModel):
    """Response from POST /api/v1/guardrails/check."""

    status: Literal["passed", "warning", "rejected"] = Field(
        ..., description="Overall guardrail check result"
    )
    violations: list[ConstraintResult] = Field(
        default_factory=list, description="Hard constraint violations"
    )
    warnings: list[ConstraintResult] = Field(
        default_factory=list, description="Soft constraint warnings"
    )
    last_valid_sequence_id: Optional[str] = Field(
        None,
        description="Sequence ID (UUID) of last valid snapshot for snap-back (on rejection)",
    )
    checked_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of the check",
    )

    model_config = {"from_attributes": True}


# --- Story 4.2: Sanity Check Dashboard Models ---


class SanityCheckRow(BaseModel):
    """A single row in the Sanity Check Dashboard.

    Represents one measurement dimension with Body/Base/Suggested comparison.
    Story 4.2 AC#1, AC#2.
    """

    key: str = Field(..., description="Measurement key identifier (e.g., 'vong_nguc')")
    label_vi: str = Field(..., description="Vietnamese display label (e.g., 'Vòng ngực')")
    body_value: Optional[float] = Field(
        None, description="Customer body measurement value (from DB)"
    )
    base_value: float = Field(
        ..., description="Base pattern value for this measurement"
    )
    suggested_value: float = Field(
        ..., description="AI-suggested value (Base + Delta)"
    )
    delta: float = Field(
        ..., description="Difference: suggested_value - base_value"
    )
    unit: str = Field("cm", description="Unit of measurement")
    severity: Literal["normal", "warning", "danger"] = Field(
        "normal",
        description="Severity classification based on delta magnitude",
    )

    model_config = {"from_attributes": True}


class SanityCheckRequest(BaseModel):
    """Request body for POST /api/v1/designs/sanity-check.

    Story 4.2 Task 1.1.
    """

    customer_id: Optional[str] = Field(
        None, description="Customer profile UUID to fetch measurements"
    )
    design_sequence_id: Optional[int] = Field(
        None, description="Design sequence ID to fetch computed deltas"
    )

    model_config = {"from_attributes": True}


class SanityCheckResponse(BaseModel):
    """Response from POST /api/v1/designs/sanity-check.

    Story 4.2 AC#1-5: 3-column comparison data for Artisan Dashboard.
    """

    design_id: Optional[str] = Field(
        None, description="Design UUID if found"
    )
    rows: list[SanityCheckRow] = Field(
        default_factory=list, description="Sanity check comparison rows"
    )
    guardrail_status: Optional[str] = Field(
        None, description="Current guardrail status (passed/warning/rejected)"
    )
    is_locked: bool = Field(
        False, description="Whether the design is locked"
    )
    geometry_hash: Optional[str] = Field(
        None, description="Geometry hash if design is locked"
    )

    model_config = {"from_attributes": True}
