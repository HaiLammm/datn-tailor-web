"""API endpoints for Geometry operations."""

from fastapi import APIRouter, Depends, HTTPException
from src.services.base_pattern_service import BasePatternService
from src.geometry.engine import GeometryEngine
from src.models.geometry import MasterGeometry, MorphDelta
from src.models.customer import MeasurementCreateRequest
from src.api.dependencies import get_current_user_from_token

router = APIRouter(prefix="/api/v1/geometry", tags=["geometry"])


@router.post("/baseline", response_model=MasterGeometry)
async def create_baseline_pattern(
    measurements: MeasurementCreateRequest,
    service: BasePatternService = Depends(BasePatternService),
    current_user = Depends(get_current_user_from_token)
) -> MasterGeometry:
    """
    Generate baseline pattern geometry from customer measurements.

    Args:
        measurements: Customer measurement profile

    Returns:
        MasterGeometry: The generated pattern geometry (SSOT)
    """
    return service.generate_baseline(measurements)


@router.post("/morph-targets/{style_id}", response_model=MorphDelta)
async def get_morph_targets(
    style_id: str,
    measurements: MeasurementCreateRequest,
    service: BasePatternService = Depends(BasePatternService),
    current_user = Depends(get_current_user_from_token),
) -> MorphDelta:
    """
    Generate morph delta vectors for a given style.

    Computes: MorphDelta = TargetGeometry(style, max_intensity) - BaseGeometry
    Client uses: P_final = P_base + alpha * MorphDelta

    Args:
        style_id: Style preset identifier (e.g., 'classic', 'modern', 'elegant')
        measurements: Customer measurement profile

    Returns:
        MorphDelta: Delta vectors for each point in the pattern
    """
    base = service.generate_baseline(measurements)

    target = GeometryEngine.compute_target_geometry(base, style_id)
    if target is None:
        raise HTTPException(
            status_code=404,
            detail=f"Style '{style_id}' not found. Available: {list(GeometryEngine.STYLE_PRESETS.keys())}",
        )

    delta = GeometryEngine.compute_morph_delta(base, target)
    delta.style_id = style_id
    return delta
