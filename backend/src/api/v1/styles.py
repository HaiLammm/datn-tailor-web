"""Style Pillars API Router - Story 2.1 & 2.2.

Endpoints for retrieving style pillar configurations and submitting intensity values.
Backend is authoritative source for style data (SSOT).
"""

from functools import lru_cache

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.dependencies import require_roles
from src.models.db_models import UserDB
from src.models.style import (
    IntensitySubmitRequest,
    IntensitySubmitResponse,
    StylePillarListResponse,
    StylePillarResponse,
)
from src.services.style_service import StyleService

router = APIRouter(prefix="/api/v1/styles", tags=["Styles"])


@lru_cache(maxsize=1)
def get_style_service() -> StyleService:
    """Cached singleton StyleService — avoids re-loading LKB data on every request."""
    return StyleService()


@router.get(
    "/pillars",
    response_model=StylePillarListResponse,
    summary="Lấy danh sách phong cách thiết kế",
    description="Trả về danh sách các Style Pillar có sẵn cùng cấu hình thanh trượt cường độ và Haptic Golden Points.",
)
async def get_style_pillars(
    current_user: UserDB = Depends(require_roles("Owner", "Tailor")),
) -> StylePillarListResponse:
    """Get all available style pillars with their slider configurations.

    Returns:
        StylePillarListResponse containing all style pillars with golden_points.
    """
    service = get_style_service()
    pillars = service.get_all_pillars()

    return StylePillarListResponse(
        pillars=pillars,
        total=len(pillars),
    )


@router.get(
    "/pillars/{pillar_id}",
    response_model=StylePillarResponse,
    summary="Lấy chi tiết phong cách theo ID",
    description="Trả về thông tin chi tiết của một Style Pillar cụ thể.",
)
async def get_style_pillar_by_id(
    pillar_id: str,
    current_user: UserDB = Depends(require_roles("Owner", "Tailor")),
) -> StylePillarResponse:
    """Get a specific style pillar by its ID.

    Args:
        pillar_id: Unique identifier of the style pillar.

    Returns:
        StylePillarResponse with pillar details and sliders.

    Raises:
        HTTPException: 404 if pillar not found.
    """
    service = get_style_service()
    pillar = service.get_pillar_by_id(pillar_id)

    if pillar is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phong cách với ID: {pillar_id}",
        )

    return pillar


@router.post(
    "/submit-intensity",
    response_model=IntensitySubmitResponse,
    summary="Gửi giá trị cường độ phong cách lên Backend",
    description=(
        "Nhận giá trị thanh trượt cường độ từ Frontend, validate phạm vi và "
        "trả về cảnh báo soft constraint nếu có (Story 2.2)."
    ),
)
async def submit_intensity(
    request: IntensitySubmitRequest,
    current_user: UserDB = Depends(require_roles("Owner", "Tailor")),
) -> IntensitySubmitResponse:
    """Submit intensity slider values for validation and soft constraint checking.

    Validates that all submitted values fall within their slider's [min, max] range.
    Returns soft-constraint warnings if values approach extreme positions,
    using 100% Vietnamese tailoring terminology (NFR11).

    Args:
        request: IntensitySubmitRequest with pillar_id, intensities list, and sequence_id.

    Returns:
        IntensitySubmitResponse with success flag, echoed sequence_id, and any warnings.

    Raises:
        HTTPException: 404 if pillar_id not found.
        HTTPException: 422 if any intensity value is out of the slider's valid range.
    """
    service = get_style_service()
    response, http_status = service.validate_and_submit_intensity(request)

    if http_status == 404:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=response.error,
        )

    if http_status == 422:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=response.error,
        )

    if http_status == 409:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=response.error,
        )

    return response
