"""Fabric Recommendations API Router - Story 2.3.

Endpoint for retrieving fabric recommendations based on selected style pillar
and current intensity values. Backend is SSOT for fabric data.
"""

import json
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Query, status

from src.models.fabric import FabricRecommendationResponse
from src.services.fabric_service import FabricService

router = APIRouter(prefix="/api/v1/fabrics", tags=["Fabrics"])


@lru_cache(maxsize=1)
def get_fabric_service() -> FabricService:
    """Cached singleton FabricService — avoids re-loading LKB data on every request."""
    return FabricService()


@router.get(
    "/recommendations",
    response_model=FabricRecommendationResponse,
    summary="Gợi ý chất liệu vải dựa trên phong cách",
    description=(
        "Trả về danh sách vải phù hợp, sắp xếp theo mức độ tương thích "
        "với phong cách đã chọn và các giá trị cường độ hiện tại (Story 2.3)."
    ),
)
async def get_fabric_recommendations(
    pillar_id: str = Query(..., description="ID phong cách đã chọn"),
    intensities: str | None = Query(
        None,
        description='JSON-encoded intensity values, e.g. {"do_rong_vai": 50, "do_om_than": 60}',
    ),
) -> FabricRecommendationResponse:
    """Get fabric recommendations based on style pillar and intensity values.

    Args:
        pillar_id: Selected style pillar ID.
        intensities: Optional JSON-encoded dict of slider_key → value.

    Returns:
        FabricRecommendationResponse with sorted fabric list.

    Raises:
        HTTPException: 404 if pillar_id not found.
        HTTPException: 422 if intensities JSON is malformed.
    """
    parsed_intensities: dict[str, float] | None = None

    if intensities:
        try:
            parsed_intensities = json.loads(intensities)
            if not isinstance(parsed_intensities, dict):
                raise ValueError("intensities must be a JSON object")
        except (json.JSONDecodeError, ValueError) as e:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"Dữ liệu cường độ không hợp lệ: {e}",
            )

    service = get_fabric_service()
    result = service.get_recommendations(pillar_id, parsed_intensities)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy phong cách với ID: {pillar_id}",
        )

    return result
