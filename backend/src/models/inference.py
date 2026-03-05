"""Pydantic schemas for Inference & Translation - Story 2.4.

Defines models for the Emotional Compiler Engine that translates
style intensity values into geometric Deltas (Master Geometry JSON).
Uses 100% Vietnamese tailoring terminology per NFR11.
"""

from datetime import datetime

from pydantic import BaseModel, Field

from src.models.style import IntensityValueItem


class DeltaValue(BaseModel):
    """A single geometric delta value (Story 2.4).

    Represents an adjustment to a specific measurement dimension.
    All labels use Vietnamese tailoring terminology (NFR11).
    """

    key: str = Field(
        ...,
        description="Delta identifier in Vietnamese (e.g., 'do_cu_eo', 'ha_nach')",
    )
    value: float = Field(
        ...,
        description="Delta value - positive for increase, negative for decrease",
    )
    unit: str = Field(
        "cm",
        description="Unit of measurement (typically 'cm' for geometric deltas)",
    )
    label_vi: str = Field(
        ...,
        description="Vietnamese display label for the delta (e.g., 'Độ cử eo')",
    )

    model_config = {"from_attributes": True}


class MasterGeometrySnapshot(BaseModel):
    """Immutable snapshot of geometry state (Story 2.4).

    This is the core output of the Emotional Compiler.
    Contains all Deltas needed to transform the base pattern.
    Follows architecture.md Geometry & Constraint Architecture.
    """

    sequence_id: int = Field(
        ...,
        ge=0,
        description="Sequence ID from the original request for concurrency control",
    )
    base_hash: str = Field(
        ...,
        description="Hash of the base measurement data (placeholder for MVP)",
    )
    algorithm_version: str = Field(
        "1.0.0",
        description="Version of the delta computation algorithm",
    )
    deltas: list[DeltaValue] = Field(
        default_factory=list,
        description="List of computed geometric deltas",
    )
    geometry_hash: str = Field(
        ...,
        description="Deterministic hash of deltas for integrity verification",
    )
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when snapshot was created",
    )

    model_config = {"from_attributes": True}


class TranslateRequest(BaseModel):
    """Request schema for translating style to geometry (Story 2.4).

    Input to the Emotional Compiler Engine.
    Accepts style pillar selection and intensity values.
    """

    pillar_id: str = Field(
        ...,
        description="ID of the selected style pillar (e.g., 'traditional', 'minimalist')",
    )
    intensities: list[IntensityValueItem] = Field(
        default_factory=list,
        description="List of slider key-value pairs representing current intensities",
    )
    sequence_id: int = Field(
        ...,
        ge=0,
        description="Sequence ID for concurrency control",
    )
    base_measurement_id: str | None = Field(
        None,
        description="ID of base measurement profile (optional for MVP)",
    )

    model_config = {"from_attributes": True}


class TranslateResponse(BaseModel):
    """Response schema from the Emotional Compiler (Story 2.4).

    Contains the computed Master Geometry Snapshot or error information.
    Includes inference timing for NFR1 performance monitoring.
    """

    success: bool = Field(
        ...,
        description="Whether the translation was successful",
    )
    snapshot: MasterGeometrySnapshot | None = Field(
        None,
        description="The computed Master Geometry Snapshot (null if error)",
    )
    inference_time_ms: int = Field(
        ...,
        ge=0,
        description="Time taken for inference in milliseconds (NFR1: must be < 15000)",
    )
    error: str | None = Field(
        None,
        description="Vietnamese error message if success=False",
    )

    model_config = {"from_attributes": True}
