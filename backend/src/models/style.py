"""Pydantic schemas for Style Pillars - Story 2.1 & 2.2.

Defines models for style pillar selection, intensity sliders,
and intensity submission with soft constraint warnings.
Uses 100% Vietnamese tailoring terminology per NFR11.
"""

from pydantic import BaseModel, Field


class IntensitySlider(BaseModel):
    """Configuration for a style intensity slider (FR2).

    Represents a configurable parameter within a style pillar.
    Backend is authoritative for min/max/default values and golden_points.
    """

    key: str = Field(..., description="Unique identifier for slider")
    label: str = Field(..., description="Display label in Vietnamese")
    description: str | None = Field(None, description="Tooltip/help text in Vietnamese")
    min_value: float = Field(0.0, description="Minimum slider value")
    max_value: float = Field(100.0, description="Maximum slider value")
    default_value: float = Field(50.0, description="Default slider position")
    step: float = Field(1.0, description="Slider increment step")
    unit: str | None = Field(None, description="Unit label (e.g., '%', 'cm')")
    golden_points: list[float] = Field(
        default_factory=list,
        description="Artisan golden ratio positions for Haptic Golden Points UI (Story 2.2)",
    )

    model_config = {"from_attributes": True}


class StylePillarResponse(BaseModel):
    """Response schema for a Style Pillar (FR1).

    Represents a design style (e.g., Truyền thống, Tối giản).
    Contains associated intensity sliders for fine-tuning.
    """

    id: str = Field(..., description="Unique style pillar identifier")
    name: str = Field(..., description="Display name in Vietnamese")
    description: str = Field(..., description="Style description in Vietnamese")
    image_url: str | None = Field(None, description="Preview image URL")
    sliders: list[IntensitySlider] = Field(
        default_factory=list,
        description="Intensity sliders for this style"
    )
    is_default: bool = Field(False, description="Whether this is the default style")

    model_config = {"from_attributes": True}


class StylePillarListResponse(BaseModel):
    """Response schema for list of style pillars."""

    pillars: list[StylePillarResponse] = Field(
        default_factory=list,
        description="Available style pillars"
    )
    total: int = Field(0, description="Total number of pillars")

    model_config = {"from_attributes": True}


class StyleSelectionRequest(BaseModel):
    """Request schema for selecting a style pillar."""

    pillar_id: str = Field(..., description="ID of selected style pillar")


class IntensityUpdateRequest(BaseModel):
    """Request schema for updating intensity values."""

    slider_key: str = Field(..., description="Key of the slider to update")
    value: float = Field(..., description="New slider value")


# ===== Story 2.2: Intensity Submission Models =====


class IntensityValueItem(BaseModel):
    """A single slider key-value pair for intensity submission (Story 2.2)."""

    key: str = Field(..., description="Slider key identifier")
    value: float = Field(..., description="Current slider value")


class IntensitySubmitRequest(BaseModel):
    """Request schema for submitting intensity values to backend (Story 2.2).

    Implements sequence-based validation for race condition protection.
    """

    pillar_id: str = Field(..., description="ID of the selected style pillar")
    intensities: list[IntensityValueItem] = Field(
        default_factory=list,
        description="List of slider key-value pairs to submit",
    )
    sequence_id: int = Field(
        ...,
        ge=0,
        description="Monotonically increasing sequence ID for concurrency control",
    )


class IntensityWarning(BaseModel):
    """A soft constraint warning returned by the backend (Story 2.2).

    Soft warnings allow the submission to succeed but alert the user
    about potential issues using Vietnamese tailoring terminology.
    """

    slider_key: str = Field(..., description="The slider key that triggered the warning")
    message: str = Field(..., description="Vietnamese warning message for the user")
    severity: str = Field(
        "soft",
        description="Warning severity: 'soft' allows submission, 'hard' would block (future)",
    )


class IntensitySubmitResponse(BaseModel):
    """Response schema for intensity submission (Story 2.2)."""

    success: bool = Field(..., description="Whether the submission was accepted")
    sequence_id: int = Field(..., description="Echo of the submitted sequence_id")
    warnings: list[IntensityWarning] = Field(
        default_factory=list,
        description="Soft constraint warnings (submission still accepted)",
    )
    error: str | None = Field(
        None,
        description="Error message if success=False (hard constraint violation)",
    )
