"""Pydantic schemas for Pattern Engine (Story 11.1).

Defines request/response schemas for pattern sessions and pieces.
"""

from decimal import Decimal
from datetime import datetime
from enum import Enum
from uuid import UUID

from typing import Optional

from pydantic import BaseModel, Field


class PatternSessionStatus(str, Enum):
    """Pattern session lifecycle statuses."""

    draft = "draft"
    completed = "completed"
    exported = "exported"


class PieceType(str, Enum):
    """Pattern piece types (collar added Story 11.8)."""

    front_bodice = "front_bodice"
    back_bodice = "back_bodice"
    sleeve = "sleeve"
    collar = "collar"


class SleeveType(str, Enum):
    """Sleeve construction style (FR91a, Story 11.7)."""

    raglan = "raglan"     # tay liền cổ — sleeve drafted to the neckline
    set_in = "set_in"     # tay tra — cap drafted from the body armhole (FR93)


class PatternSessionCreate(BaseModel):
    """Request schema for creating a pattern session.

    10 measurements are auto-filled from customer profile, editable by Owner.
    Validation ranges based on Vietnamese tailoring standards (FR99).
    """

    customer_id: UUID
    garment_type: str = Field(default="ao_dai", max_length=50)
    sleeve_type: SleeveType = Field(default=SleeveType.raglan, description="raglan | set_in (FR91a)")
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

    # 5 extended measurements (Story 11.8) — optional; required by style (set-in: vai; darts: nguc)
    ha_ben_nguc: Decimal | None = Field(None, ge=15, le=35, description="Ha ben nguc (cm)")
    dang_nguc: Decimal | None = Field(None, ge=10, le=25, description="Dang nguc (cm)")
    ha_mong: Decimal | None = Field(None, ge=10, le=30, description="Ha mong — eo→mong (cm)")
    xuoi_vai: Decimal | None = Field(None, ge=1, le=8, description="Xuoi vai (cm)")
    rong_vai: Decimal | None = Field(None, ge=28, le=50, description="Rong vai (cm)")


class GeometryParams(BaseModel):
    """Structure for pattern_pieces.geometry_params JSONB.

    Computed geometric parameters from the deterministic formula engine.
    Corrected per SCP 2026-06-08 — front/back bodice now diverge in multiple
    dimensions; sleeve uses raglan drafting. Stored as a free dict in the DB, so
    this model documents the shape but is not strictly enforced on read.
    """

    model_config = {"extra": "allow"}

    piece: Optional[str] = None
    # Bodice-specific (None for sleeve pieces)
    length: Optional[float] = None
    armhole_drop: Optional[float] = None
    waist_drop: Optional[float] = None
    hip_drop: Optional[float] = None
    neck_width: Optional[float] = None
    neck_depth: Optional[float] = None
    shoulder_rise: Optional[float] = None
    bust_width: Optional[float] = None
    waist_width: Optional[float] = None
    hip_width: Optional[float] = None
    hem_width: Optional[float] = None
    seam_allowance: float = 1.0
    # Sleeve-specific (None for bodice pieces) — raglan
    sleeve_type: Optional[str] = None
    sleeve_length: Optional[float] = None
    bicep_offset: Optional[float] = None
    bicep_width: Optional[float] = None
    underarm_width: Optional[float] = None
    wrist_width: Optional[float] = None
    neck_front: Optional[float] = None
    neck_back: Optional[float] = None
    neck_rise: Optional[float] = None


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
    ha_ben_nguc: Decimal | None = None
    dang_nguc: Decimal | None = None
    ha_mong: Decimal | None = None
    xuoi_vai: Decimal | None = None
    rong_vai: Decimal | None = None
    garment_type: str
    sleeve_type: SleeveType = SleeveType.raglan  # default for pre-11.7 rows without the column
    notes: str | None
    status: PatternSessionStatus
    pieces: list[PatternPieceResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
