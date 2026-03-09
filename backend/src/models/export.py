"""Pydantic models for Blueprint Export - Story 4.4.

Defines the structure for exporting manufacturing blueprints (SVG/DXF).
"""

from enum import Enum
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from pydantic import BaseModel, Field, ConfigDict


class ExportFormat(str, Enum):
    """Supported export formats for manufacturing blueprints."""
    SVG = "svg"
    DXF = "dxf"


class BlueprintMetadata(BaseModel):
    """Metadata included in the exported blueprint file."""
    design_id: UUID = Field(..., description="The design identifier")
    export_timestamp: datetime = Field(default_factory=lambda: datetime.now(datetime.timezone.utc), description="When the export was generated")
    geometry_hash: str = Field(..., description="Integrity checksum of the exported geometry")
    
    model_config = ConfigDict(from_attributes=True)


class ExportRequest(BaseModel):
    """Request body for POST /api/v1/designs/{design_id}/export."""
    format: ExportFormat = Field(default=ExportFormat.SVG, description="Desired export format")
