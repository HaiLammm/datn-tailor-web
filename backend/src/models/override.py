"""Pydantic models for Manual Override API - Story 4.3.

Request/Response schemas for manual overrides from tailors.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, Field

from src.models.guardrail import GuardrailCheckResponse


class OverrideRequest(BaseModel):
    """Request body for POST /api/v1/designs/{design_id}/override.

    Story 4.3 Task 1.2.
    """

    delta_key: str = Field(..., description="Measurement key to override (e.g., 'vong_eo')")
    overridden_value: float = Field(..., description="New value chosen by the tailor (cm)")
    reason_vi: Optional[str] = Field(None, description="Vietnamese reason for override (optional)")
    sequence_id: int = Field(..., description="Current sequence ID of the design")

    model_config = {"from_attributes": True}


class OverrideResponse(BaseModel):
    """Response from POST /api/v1/designs/{design_id}/override.

    Story 4.3 Task 1.2.
    """

    id: uuid.UUID = Field(..., description="Override record UUID")
    delta_key: str = Field(..., description="Overridden measurement key")
    label_vi: str = Field(..., description="Vietnamese display label")
    original_value: float = Field(..., description="AI-suggested value (before override)")
    overridden_value: float = Field(..., description="New manual value")
    reason_vi: Optional[str] = Field(None, description="Vietnamese reason for override")
    flagged_for_learning: bool = Field(False, description="Whether this is flagged for AI training")
    guardrail_result: GuardrailCheckResponse = Field(..., description="Guardrail results for this override")
    created_at: datetime = Field(..., description="Timestamp of the override")

    model_config = {"from_attributes": True}


class OverrideHistoryItem(BaseModel):
    """A single item in the override history list.

    Story 4.3 Task 1.2.
    """

    id: uuid.UUID = Field(..., description="Override record UUID")
    delta_key: str = Field(..., description="Overridden measurement key")
    label_vi: str = Field(..., description="Vietnamese display label")
    original_value: float = Field(..., description="AI-suggested value")
    overridden_value: float = Field(..., description="New manual value")
    reason_vi: Optional[str] = Field(None, description="Vietnamese reason")
    tailor_name: str = Field(..., description="Name of the tailor who performed the override")
    created_at: datetime = Field(..., description="Timestamp of the override")

    model_config = {"from_attributes": True}


class OverrideHistoryResponse(BaseModel):
    """Response from GET /api/v1/designs/{design_id}/overrides.

    Story 4.3 Task 1.2.
    """

    overrides: List[OverrideHistoryItem] = Field(default_factory=list, description="List of overrides")
    total: int = Field(..., description="Total number of overrides for this design")

    model_config = {"from_attributes": True}
