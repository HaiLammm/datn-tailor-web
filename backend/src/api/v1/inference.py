"""Inference API Endpoints - Story 2.4: Emotional Compiler.

Provides the /translate endpoint that invokes the LangGraph-based
Emotional Compiler to convert style intensities into geometric Deltas.

Uses 100% Vietnamese error messages per NFR11.
"""

import logging

from fastapi import APIRouter, HTTPException

from src.agents.emotional_compiler import run_emotional_compiler
from src.models.inference import TranslateRequest, TranslateResponse
from src.services.smart_rules_service import SmartRulesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/inference", tags=["inference"])


@router.post("/translate", response_model=TranslateResponse)
async def translate_design(request: TranslateRequest) -> TranslateResponse:
    """Translate style intensities into geometric Deltas.

    This is the main endpoint for the Emotional Compiler Engine.
    Takes a style pillar selection and intensity values, then
    computes the Master Geometry Snapshot containing all Deltas
    needed to transform the base pattern.

    Args:
        request: TranslateRequest with pillar_id, intensities, sequence_id.

    Returns:
        TranslateResponse with:
        - success: Whether translation completed
        - snapshot: MasterGeometrySnapshot with deltas (if success)
        - inference_time_ms: Processing time in milliseconds
        - error: Vietnamese error message (if failed)

    Raises:
        HTTPException 404: If pillar_id is not found in Smart Rules.
        HTTPException 400: If request validation fails.

    Performance (NFR1):
        Response time must be < 15 seconds.
        Typical response: < 100ms for rule-based MVP.
    """
    # Validate pillar exists before running full pipeline
    service = SmartRulesService()
    available_pillars = service.get_available_pillar_ids()

    if request.pillar_id not in available_pillars:
        raise HTTPException(
            status_code=404,
            detail=(
                f"Lỗi: Không tìm thấy phong cách '{request.pillar_id}'. "
                f"Các phong cách hợp lệ: {', '.join(available_pillars)}"
            ),
        )

    # Run the Emotional Compiler
    response = run_emotional_compiler(request)

    # Log performance metrics
    if response.inference_time_ms > 10000:
        logger.warning(
            "Inference took %dms (> 10s warning threshold) for pillar=%s",
            response.inference_time_ms,
            request.pillar_id,
        )

    # Return error as response (not HTTPException) for inference failures
    # This allows the client to handle the error gracefully
    return response


@router.get("/pillars")
async def get_available_pillars() -> dict:
    """Get list of pillar IDs with available Smart Rules.

    Utility endpoint for debugging and validation.

    Returns:
        Dict with pillar_ids list.
    """
    service = SmartRulesService()
    return {"pillar_ids": service.get_available_pillar_ids()}
