"""Pydantic schemas for Smart Rules CRUD - Story 2.5.

Defines models for the Rule Editor that allows artisans (Owner role)
to view and adjust Smart Rules (Style Pillars, Ease Deltas).
Uses 100% Vietnamese tailoring terminology per NFR11.
"""

from datetime import datetime, timezone

from pydantic import BaseModel, Field, field_validator


class DeltaMappingDetail(BaseModel):
    """Detail view of a single delta mapping within a rule.

    Represents the artisan's knowledge for one slider-to-delta mapping.
    """

    slider_key: str = Field(
        ...,
        description="Slider identifier (e.g., 'shoulder_width')",
    )
    delta_key: str = Field(
        ...,
        description="Delta identifier in Vietnamese (e.g., 'rong_vai')",
    )
    delta_label_vi: str = Field(
        ...,
        description="Vietnamese display label (e.g., 'Rộng vai')",
    )
    delta_unit: str = Field(
        "cm",
        description="Unit of measurement",
    )
    slider_range_min: float = Field(
        ...,
        description="Minimum slider value",
    )
    slider_range_max: float = Field(
        ...,
        description="Maximum slider value",
    )
    scale_factor: float = Field(
        ...,
        description="Scale factor for the linear formula component",
    )
    offset: float = Field(
        ...,
        description="Offset value for the formula",
    )
    golden_point: float = Field(
        50.0,
        ge=0.0,
        le=100.0,
        description="Optimal slider position (Điểm Vàng) for this mapping, range [0, 100]",
    )

    model_config = {"from_attributes": True}


class RulePillarSummary(BaseModel):
    """Summary view of a style pillar's Smart Rules.

    Used in the pillar list display (AC1).
    """

    pillar_id: str = Field(
        ...,
        description="Pillar identifier (e.g., 'traditional')",
    )
    pillar_name_vi: str = Field(
        ...,
        description="Vietnamese display name (e.g., 'Truyền thống')",
    )
    delta_mapping_count: int = Field(
        ...,
        ge=0,
        description="Total number of delta mappings in this pillar",
    )
    slider_count: int = Field(
        ...,
        ge=0,
        description="Number of unique sliders in this pillar",
    )
    last_modified: datetime = Field(
        ...,
        description="Last modification timestamp",
    )

    model_config = {"from_attributes": True}


class RulePillarDetail(BaseModel):
    """Full detail view of a style pillar's Smart Rules.

    Used in the rule detail panel (AC2).
    """

    pillar_id: str = Field(
        ...,
        description="Pillar identifier",
    )
    pillar_name_vi: str = Field(
        ...,
        description="Vietnamese display name",
    )
    mappings: list[DeltaMappingDetail] = Field(
        default_factory=list,
        description="All delta mappings for this pillar",
    )
    last_modified: datetime = Field(
        ...,
        description="Last modification timestamp",
    )

    model_config = {"from_attributes": True}


class DeltaMappingUpdateItem(BaseModel):
    """Single delta mapping update in a rule update request.

    Used by the Rule Editor to submit changes (AC3).
    """

    slider_key: str = Field(
        ...,
        min_length=1,
        description="Slider identifier",
    )
    delta_key: str = Field(
        ...,
        min_length=1,
        description="Delta identifier",
    )
    delta_label_vi: str = Field(
        ...,
        min_length=1,
        description="Vietnamese display label",
    )
    delta_unit: str = Field(
        "cm",
        description="Unit of measurement",
    )
    slider_range_min: float = Field(
        ...,
        description="Minimum slider value",
    )
    slider_range_max: float = Field(
        ...,
        description="Maximum slider value",
    )
    scale_factor: float = Field(
        ...,
        description="Scale factor for formula",
    )
    offset: float = Field(
        ...,
        description="Offset value for formula",
    )
    golden_point: float = Field(
        50.0,
        ge=0.0,
        le=100.0,
        description="Optimal slider position (Điểm Vàng), range [0, 100]",
    )

    @field_validator("slider_range_max")
    @classmethod
    def max_must_exceed_min(cls, v: float, info) -> float:
        """Validate slider_range_max > slider_range_min (AC4)."""
        min_val = info.data.get("slider_range_min")
        if min_val is not None and v <= min_val:
            raise ValueError(
                "Giá trị tối đa phải lớn hơn giá trị tối thiểu"
            )
        return v

    @field_validator("scale_factor")
    @classmethod
    def scale_factor_valid(cls, v: float) -> float:
        """Validate scale_factor is not zero and within reasonable bounds (AC4).

        Negative values are valid (inverse relationships like tighter body → less ease).
        Magnitude must be within (0, 1.0] to prevent unreasonable delta swings.
        """
        if v == 0.0:
            raise ValueError(
                "Hệ số tỷ lệ không được bằng 0"
            )
        if abs(v) > 1.0:
            raise ValueError(
                "Hệ số tỷ lệ phải nằm trong khoảng -1.0 đến 1.0"
            )
        return v

    model_config = {"from_attributes": True}


class RuleUpdateRequest(BaseModel):
    """Request body for updating a pillar's Smart Rules (AC3).

    Replaces all delta mappings for the specified pillar.
    """

    mappings: list[DeltaMappingUpdateItem] = Field(
        ...,
        min_length=1,
        description="Complete list of delta mappings for the pillar",
    )

    model_config = {"from_attributes": True}


class RuleUpdateResponse(BaseModel):
    """Response after successfully updating a pillar's Smart Rules (AC3).

    Confirms the update with the new timestamp.
    """

    success: bool = Field(
        True,
        description="Whether update was successful",
    )
    pillar_id: str = Field(
        ...,
        description="Updated pillar identifier",
    )
    pillar_name_vi: str = Field(
        ...,
        description="Vietnamese display name",
    )
    mapping_count: int = Field(
        ...,
        ge=0,
        description="Number of mappings after update",
    )
    last_modified: datetime = Field(
        ...,
        description="Timestamp of the update",
    )
    message: str = Field(
        ...,
        description="Vietnamese confirmation message",
    )

    model_config = {"from_attributes": True}
