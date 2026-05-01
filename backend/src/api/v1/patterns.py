"""Pattern Engine API Router (Story 11.2, 11.3).

Endpoints:
  POST /api/v1/patterns/sessions              — Create draft session (Owner only)
  POST /api/v1/patterns/sessions/{id}/generate — Generate 3 pieces (Owner only)
  GET  /api/v1/patterns/sessions/{id}         — Get session detail (Owner or Tailor)
  GET  /api/v1/patterns/pieces/{id}/export    — Export single piece (Owner or Tailor)
  GET  /api/v1/patterns/sessions/{id}/export  — Batch export session (Owner or Tailor)

Response wrapper: {"data": ..., "meta": {}}
Auth: OwnerOnly / OwnerOrTailor from src.api.dependencies
DB: AsyncSession via get_db
"""

import uuid
from enum import Enum
from io import BytesIO

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, OwnerOrTailor, TenantId
from src.core.database import get_db
from src.models.pattern import PatternSessionCreate
from src.patterns.gcode_export import svg_to_gcode
from src.services import pattern_service

router = APIRouter(prefix="/api/v1/patterns", tags=["patterns"])


@router.post(
    "/sessions",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create pattern session (Owner only)",
    description=(
        "Creates a new draft pattern session with 10 body measurements. "
        "Validates customer belongs to tenant. Returns session with status='draft'."
    ),
)
async def create_pattern_session_endpoint(
    data: PatternSessionCreate,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """POST /api/v1/patterns/sessions — Owner only.

    AC #1: Creates pattern_session with status='draft', tenant isolation applied.
    """
    result = await pattern_service.create_session(db, data, user, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/sessions/{session_id}/generate",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Generate pattern pieces (Owner only)",
    description=(
        "Runs the deterministic formula engine on a draft pattern session. "
        "Produces exactly 3 pieces: front_bodice, back_bodice, sleeve. "
        "Transitions session status from 'draft' → 'completed'."
    ),
)
async def generate_pattern_pieces_endpoint(
    session_id: uuid.UUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """POST /api/v1/patterns/sessions/{id}/generate — Owner only.

    AC #2: Generates 3 pattern pieces, updates session status to 'completed'.
    """
    result = await pattern_service.generate_patterns(db, session_id, user, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.get(
    "/sessions/{session_id}",
    response_model=dict,
    summary="Get pattern session detail (Owner or Tailor)",
    description=(
        "Returns a pattern session with all measurements and nested pattern pieces "
        "(if generation has been completed). Returns 404 if session not found or "
        "belongs to a different tenant."
    ),
)
async def get_pattern_session_endpoint(
    session_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """GET /api/v1/patterns/sessions/{id} — Owner or Tailor.

    AC #6: Returns session with pieces; 404 on not found / wrong tenant.
    """
    result = await pattern_service.get_session(db, session_id, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


# =============================================================================
# Export Endpoints (Story 11.3)
# =============================================================================


class ExportFormat(str, Enum):
    """Supported export formats."""

    svg = "svg"
    gcode = "gcode"


def _validate_export_params(
    format: str | None,
    speed: int | None,
    power: int | None
) -> tuple[ExportFormat, int, int]:
    """Validate export query parameters.

    AC #7: Query Parameter Validation
      - format is required, must be 'svg' or 'gcode'
      - speed (gcode only): positive integer, default 1000
      - power (gcode only): 0-100 integer, default 80

    Returns:
        Tuple of (format_enum, speed, power).

    Raises:
        HTTPException 422: invalid params with Vietnamese error message.
    """
    from fastapi import HTTPException

    # Validate format
    if format is None:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ERR_INVALID_FORMAT",
                "message": "Định dạng xuất không hợp lệ. Chọn 'svg' hoặc 'gcode'",
            },
        )

    try:
        format_enum = ExportFormat(format.lower())
    except ValueError:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ERR_INVALID_FORMAT",
                "message": "Định dạng xuất không hợp lệ. Chọn 'svg' hoặc 'gcode'",
            },
        )

    # Validate speed (for gcode)
    if speed is not None and speed <= 0:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ERR_INVALID_SPEED",
                "message": "Tốc độ cắt phải là số dương (mm/phút)",
            },
        )

    # Validate power (for gcode)
    if power is not None and (power < 0 or power > 100):
        raise HTTPException(
            status_code=422,
            detail={
                "code": "ERR_INVALID_POWER",
                "message": "Công suất laser phải từ 0 đến 100 (%)",
            },
        )

    # Apply defaults
    final_speed = speed if speed is not None else 1000
    final_power = power if power is not None else 80

    return format_enum, final_speed, final_power


@router.get(
    "/pieces/{piece_id}/export",
    summary="Export single pattern piece (Owner or Tailor)",
    description=(
        "Exports a single pattern piece as SVG or G-code file. "
        "For G-code, speed and power parameters configure laser settings."
    ),
)
async def export_piece_endpoint(
    piece_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    format: str = Query(..., description="Export format: 'svg' or 'gcode'"),
    speed: int | None = Query(None, ge=1, description="Cutting speed (mm/min, gcode only)"),
    power: int | None = Query(None, ge=0, le=100, description="Laser power % (gcode only)"),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """GET /api/v1/patterns/pieces/{id}/export — Owner or Tailor.

    AC #1: Export single piece as SVG (Content-Type: image/svg+xml)
    AC #2: Export single piece as G-code (Content-Type: text/plain)
    """
    format_enum, final_speed, final_power = _validate_export_params(format, speed, power)

    piece = await pattern_service.get_piece_for_export(db, piece_id, tenant_id)

    if format_enum == ExportFormat.svg:
        return StreamingResponse(
            content=BytesIO(piece.svg_data.encode("utf-8")),
            media_type="image/svg+xml",
            headers={
                "Content-Disposition": f'attachment; filename="{piece.piece_type}.svg"'
            },
        )
    else:  # gcode
        gcode_data = svg_to_gcode(
            svg_data=piece.svg_data,
            speed=final_speed,
            power=final_power,
            piece_type=piece.piece_type,
        )
        return StreamingResponse(
            content=BytesIO(gcode_data.encode("utf-8")),
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{piece.piece_type}.gcode"'
            },
        )


@router.get(
    "/sessions/{session_id}/export",
    summary="Batch export session pieces (Owner or Tailor)",
    description=(
        "Exports all pattern pieces from a completed session as a ZIP archive. "
        "For G-code, speed and power parameters configure laser settings."
    ),
)
async def export_session_endpoint(
    session_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    format: str = Query(..., description="Export format: 'svg' or 'gcode'"),
    speed: int | None = Query(None, ge=1, description="Cutting speed (mm/min, gcode only)"),
    power: int | None = Query(None, ge=0, le=100, description="Laser power % (gcode only)"),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """GET /api/v1/patterns/sessions/{id}/export — Owner or Tailor.

    AC #3: Batch export SVG as ZIP (Content-Type: application/zip)
    AC #4: Batch export G-code as ZIP (Content-Type: application/zip)
    """
    format_enum, final_speed, final_power = _validate_export_params(format, speed, power)

    pieces = await pattern_service.get_session_pieces_for_export(db, session_id, tenant_id)

    if format_enum == ExportFormat.svg:
        zip_bytes = pattern_service.create_svg_zip(pieces)
        filename = f"session_{session_id}_svg.zip"
    else:  # gcode
        zip_bytes = pattern_service.create_gcode_zip(pieces, final_speed, final_power)
        filename = f"session_{session_id}_gcode.zip"

    return StreamingResponse(
        content=BytesIO(zip_bytes),
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        },
    )
