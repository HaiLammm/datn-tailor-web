"""Pydantic schemas for Fabric Recommendations - Story 2.3.

Defines models for fabric properties, individual fabric details,
and recommendation response with compatibility scores.
Uses 100% Vietnamese tailoring terminology per NFR11.
"""

from pydantic import BaseModel, Field


class FabricProperty(BaseModel):
    """Physical and aesthetic properties of a fabric type.

    Properties are expressed as Vietnamese textile terminology
    with values: "none", "low", "medium", "high".
    """

    do_ru: str = Field(..., description="Độ rủ — drape quality (none/low/medium/high)")
    do_day: str = Field(..., description="Độ dày — thickness (light/medium/heavy)")
    do_co_dan: str = Field(..., description="Độ co dãn — stretch (none/low/medium/high)")
    do_bong: str = Field(..., description="Độ bóng — shine/sheen (none/low/medium/high)")
    kha_nang_giu_phom: str = Field(
        ..., description="Khả năng giữ phom — shape retention (low/medium/high)"
    )

    model_config = {"from_attributes": True}


class FabricResponse(BaseModel):
    """Response schema for a single fabric recommendation (Story 2.3).

    Represents a fabric type with its properties and compatibility score.
    """

    id: str = Field(..., description="Unique fabric identifier")
    name: str = Field(..., description="Tên vải bằng tiếng Việt")
    description: str = Field(..., description="Mô tả đặc tính vải")
    image_url: str | None = Field(None, description="URL hình ảnh texture")
    properties: FabricProperty = Field(..., description="Đặc tính vật lý của vải")
    compatibility_score: float = Field(
        ..., ge=0.0, le=100.0, description="Mức độ phù hợp (0-100)"
    )
    compatibility_label: str = Field(
        ..., description="Nhãn phù hợp: Rất phù hợp / Phù hợp / Có thể dùng"
    )

    model_config = {"from_attributes": True}


class FabricRecommendationResponse(BaseModel):
    """Response schema for fabric recommendation list (Story 2.3)."""

    pillar_id: str = Field(..., description="ID phong cách đã chọn")
    fabrics: list[FabricResponse] = Field(
        default_factory=list, description="Danh sách vải gợi ý, sắp xếp theo compatibility"
    )
    total: int = Field(0, description="Tổng số loại vải gợi ý")

    model_config = {"from_attributes": True}
