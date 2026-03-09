"""Pydantic models for Geometry Engine - Story 3.1.

Defines the structure for 2D geometry primitives used in the Pattern Generation.
Follows the Architecture SSOT principle where Backend is the source of truth.
"""

from typing import List, Literal, Optional, Union
from pydantic import BaseModel, Field, ConfigDict
import uuid


class Point(BaseModel):
    """A 2D point in the pattern coordinate system."""
    x: float = Field(..., description="X coordinate in mm")
    y: float = Field(..., description="Y coordinate in mm")
    
    model_config = ConfigDict(from_attributes=True)


class CurveControl(BaseModel):
    """Control points for Bezier curves."""
    cp1: Point = Field(..., description="First control point")
    cp2: Optional[Point] = Field(None, description="Second control point (for cubic bezier)")
    
    model_config = ConfigDict(from_attributes=True)


class Segment(BaseModel):
    """A segment of a path (Line or Curve)."""
    type: Literal["line", "curve", "move"] = Field(..., description="Type of segment")
    to: Point = Field(..., description="End point of the segment")
    control: Optional[CurveControl] = Field(None, description="Control points for curves")
    
    model_config = ConfigDict(from_attributes=True)


class Path(BaseModel):
    """A continuous path composed of segments."""
    id: str = Field(..., description="Unique identifier for the path")
    segments: List[Segment] = Field(..., description="List of segments forming the path")
    closed: bool = Field(False, description="Whether the path is closed")
    fill: Optional[str] = Field(None, description="Fill color (optional)")
    stroke: Optional[str] = Field(None, description="Stroke color (optional)")
    
    model_config = ConfigDict(from_attributes=True)


class PatternPart(BaseModel):
    """A distinct part of the pattern (e.g., Front Bodice, Sleeve)."""
    part_id: str = Field(..., description="Identifier for the part (e.g., 'front_bodice')")
    name: str = Field(..., description="Display name (e.g., 'Thân trước')")
    paths: List[Path] = Field(..., description="Geometric paths defining the part")
    
    model_config = ConfigDict(from_attributes=True)


class MasterGeometry(BaseModel):
    """The complete geometric definition of a pattern (Master Geometry JSON)."""
    parts: List[PatternPart] = Field(..., description="List of pattern parts")
    version: str = Field("1.0.0", description="Schema version")
    units: str = Field("mm", description="Coordinate units")

    model_config = ConfigDict(from_attributes=True)


# --- Story 3.2: Morph Delta Models ---

class MorphDeltaSegment(BaseModel):
    """Delta vector (dx, dy) for a single segment's endpoint and control points."""
    dx: float = Field(..., description="Delta X for segment endpoint")
    dy: float = Field(..., description="Delta Y for segment endpoint")
    cp1_dx: Optional[float] = Field(None, description="Delta X for control point 1")
    cp1_dy: Optional[float] = Field(None, description="Delta Y for control point 1")
    cp2_dx: Optional[float] = Field(None, description="Delta X for control point 2")
    cp2_dy: Optional[float] = Field(None, description="Delta Y for control point 2")

    model_config = ConfigDict(from_attributes=True)


class MorphDeltaPath(BaseModel):
    """Delta vectors for all segments in a path."""
    path_id: str = Field(..., description="Matching path ID from MasterGeometry")
    segments: List[MorphDeltaSegment] = Field(..., description="Delta vectors per segment")

    model_config = ConfigDict(from_attributes=True)


class MorphDeltaPart(BaseModel):
    """Delta vectors for all paths in a pattern part."""
    part_id: str = Field(..., description="Matching part ID from MasterGeometry")
    paths: List[MorphDeltaPath] = Field(..., description="Delta vectors per path")

    model_config = ConfigDict(from_attributes=True)


class MorphDelta(BaseModel):
    """Complete morph delta for a style — contains dx/dy vectors for every point.

    Formula: P_final = P_base + alpha * MorphDelta
    where alpha is slider value (0.0 - 1.0).
    """
    parts: List[MorphDeltaPart] = Field(..., description="Delta vectors per pattern part")
    style_id: str = Field(..., description="Style identifier this delta applies to")

    model_config = ConfigDict(from_attributes=True)


# --- Story 3.4: SSOT Packaging Models ---

class LockedDesign(BaseModel):
    """Master Geometry JSON — Single Source of Truth for a locked design.

    Contains the complete snapshot of a design iteration including
    integrity checksum for verification (NFR5).
    """
    sequence_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="UUID for this design iteration",
    )
    base_hash: str = Field(..., description="SHA-256 of the base pattern geometry")
    deltas: MorphDelta = Field(..., description="Morph deltas applied to the base pattern")
    measurement_deltas: Optional[List[dict]] = Field(
        None, description="Optional measurement deltas for sanity check (Story 4.3)"
    )
    geometry_hash: str = Field(..., description="SHA-256 checksum of this object (excluding itself)")

    model_config = ConfigDict(from_attributes=True)


class LockDesignRequest(BaseModel):
    """Request body for POST /api/v1/designs/lock."""
    design_id: Optional[uuid.UUID] = Field(None, description="Optional existing design ID to update")
    base_id: Optional[str] = Field(None, description="ID of the base measurement profile")
    deltas: MorphDelta = Field(..., description="Morph deltas to lock")
    measurement_deltas: Optional[List[dict]] = Field(
        None, description="Optional measurement deltas for sanity check (Story 4.3)"
    )
    base_measurements: Optional[dict] = Field(
        None, description="Customer body measurements for guardrail checks (Story 4.1a)"
    )

    model_config = ConfigDict(from_attributes=True)
