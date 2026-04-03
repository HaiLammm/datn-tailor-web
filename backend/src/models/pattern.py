"""Pydantic schemas for Pattern Engine (Story 11.1).

Defines request/response schemas for pattern sessions and pieces.
"""

from decimal import Decimal
from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class PatternSessionStatus(str, Enum):
    """Pattern session lifecycle statuses."""

    draft = "draft"
    completed = "completed"
    exported = "exported"


class PieceType(str, Enum):
    """Pattern piece types — 3 fixed types in MVP."""

    front_bodice = "front_bodice"
    back_bodice = "back_bodice"
    sleeve = "sleeve"


class PatternSessionCreate(BaseModel):
    """Request schema for creating a pattern session.

    10 measurements are auto-filled from customer profile, editable by Owner.
    Validation ranges based on Vietnamese tailoring standards (FR99).
    """

    customer_id: UUID
    garment_type: str = Field(default="ao_dai", max_length=50)
    notes: str | None = Field(None, max_length=2000)

    # 10 body measurements (cm) with min/max validation
    do_dai_ao: Decimal = Field(..., ge=30, le=200, description="Do dai ao (cm)")
    ha_eo: Decimal = Field(..., ge=5, le=50, description="Ha eo (cm)")
    vong_co: Decimal = Field(..., ge=20, le=60, description="Vong co (cm)")
    vong_nach: Decimal = Field(..., ge=25, le=70, description="Vong nach (cm)")
    vong_nguc: Decimal = Field(..., ge=50, le=180, description="Vong nguc (cm)")
    vong_eo: Decimal = Field(..., ge=40, le=160, description="Vong eo (cm)")
    vong_mong: Decimal = Field(..., ge=50, le=180, description="Vong mong (cm)")
    do_dai_tay: Decimal = Field(..., ge=30, le=100, description="Do dai tay (cm)")
    vong_bap_tay: Decimal = Field(..., ge=15, le=60, description="Vong bap tay (cm)")
    vong_co_tay: Decimal = Field(..., ge=10, le=35, description="Vong co tay (cm)")


class GeometryParams(BaseModel):
    """Structure for pattern_pieces.geometry_params JSONB.

    Computed geometric parameters from deterministic formula engine.
    """

    bust_width: float
    waist_width: float
    hip_width: float
    armhole_drop: float
    neck_depth: float
    hem_width: float = 37.0
    seam_allowance: float = 1.0
    # Sleeve-specific (only for sleeve piece)
    cap_height: float | None = None
    bicep_width: float | None = None
    wrist_width: float | None = None


class PatternPieceResponse(BaseModel):
    """Response schema for a single pattern piece."""

    id: UUID
    session_id: UUID
    piece_type: PieceType
    svg_data: str
    geometry_params: dict
    created_at: datetime

    model_config = {"from_attributes": True}


class PatternSessionResponse(BaseModel):
    """Response schema for a pattern session with pieces."""

    id: UUID
    tenant_id: UUID
    customer_id: UUID
    created_by: UUID
    do_dai_ao: Decimal
    ha_eo: Decimal
    vong_co: Decimal
    vong_nach: Decimal
    vong_nguc: Decimal
    vong_eo: Decimal
    vong_mong: Decimal
    do_dai_tay: Decimal
    vong_bap_tay: Decimal
    vong_co_tay: Decimal
    garment_type: str
    notes: str | None
    status: PatternSessionStatus
    pieces: list[PatternPieceResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
