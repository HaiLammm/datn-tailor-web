"""Fabric Recommendation Service - Story 2.3: Gợi ý Chất liệu Vải.

Manages fabric catalog from Local Knowledge Base (LKB) and computes
compatibility scores based on selected pillar and intensity values.
Backend is SSOT for fabric data.
Uses 100% Vietnamese terminology per NFR11.
"""

from src.models.fabric import FabricProperty, FabricRecommendationResponse, FabricResponse

# ===== Level mappings for numeric scoring =====
_LEVEL_SCORES = {"none": 0.0, "low": 1.0, "medium": 2.0, "high": 3.0}
_THICKNESS_SCORES = {"light": 1.0, "medium": 2.0, "heavy": 3.0}

# ===== Pillar → preferred fabric property weights =====
# Each pillar defines ideal property values (0-3 scale) and which properties matter most.
_PILLAR_PREFERENCES: dict[str, dict[str, dict[str, float]]] = {
    "traditional": {
        # Size S: ưu tiên độ rủ cao, bóng, giữ phom trung bình
        "ideal": {"do_ru": 3.0, "do_day": 2.0, "do_co_dan": 0.0, "do_bong": 3.0, "kha_nang_giu_phom": 2.0},
        "weight": {"do_ru": 1.5, "do_day": 1.0, "do_co_dan": 0.5, "do_bong": 1.2, "kha_nang_giu_phom": 1.0},
    },
    "minimalist": {
        # Tối giản: ưu tiên vải nhẹ, ít bóng, giữ phom tốt
        "ideal": {"do_ru": 2.0, "do_day": 1.0, "do_co_dan": 1.0, "do_bong": 1.0, "kha_nang_giu_phom": 3.0},
        "weight": {"do_ru": 1.0, "do_day": 1.2, "do_co_dan": 0.8, "do_bong": 0.5, "kha_nang_giu_phom": 1.5},
    },
    "avant-garde": {
        # Tiên phong: đa dạng, ưu tiên vải đặc biệt
        "ideal": {"do_ru": 2.0, "do_day": 2.0, "do_co_dan": 2.0, "do_bong": 2.0, "kha_nang_giu_phom": 2.0},
        "weight": {"do_ru": 1.0, "do_day": 1.0, "do_co_dan": 1.2, "do_bong": 1.0, "kha_nang_giu_phom": 1.0},
    },
}

# ===== Intensity influence on fabric scoring =====
# Maps slider keys to fabric property adjustments
_INTENSITY_ADJUSTMENTS: dict[str, dict[str, float]] = {
    # body_fit > 70 → ưu tiên vải có stretch
    "body_fit": {"do_co_dan": 0.02},
    # shoulder_width > 60 → ưu tiên vải giữ phom tốt
    "shoulder_width": {"kha_nang_giu_phom": 0.015},
    # garment_length < 50 → vải nhẹ phù hợp hơn (negative means prefer lower thickness)
    "garment_length": {"do_day": -0.01},
}


def _property_to_scores(prop: FabricProperty) -> dict[str, float]:
    """Convert FabricProperty string values to numeric scores."""
    return {
        "do_ru": _LEVEL_SCORES.get(prop.do_ru, 1.0),
        "do_day": _THICKNESS_SCORES.get(prop.do_day, 2.0),
        "do_co_dan": _LEVEL_SCORES.get(prop.do_co_dan, 1.0),
        "do_bong": _LEVEL_SCORES.get(prop.do_bong, 1.0),
        "kha_nang_giu_phom": _LEVEL_SCORES.get(prop.kha_nang_giu_phom, 2.0),
    }


def _compute_compatibility(
    fabric_scores: dict[str, float],
    ideal: dict[str, float],
    weights: dict[str, float],
) -> float:
    """Compute weighted compatibility score (0-100) between fabric and ideal.

    Uses weighted Manhattan distance, inverted to percentage.
    """
    max_distance = 0.0
    actual_distance = 0.0
    for key in ideal:
        w = weights.get(key, 1.0)
        max_distance += w * 3.0  # Max possible difference on 0-3 scale
        actual_distance += w * abs(fabric_scores.get(key, 0.0) - ideal[key])

    if max_distance == 0:
        return 50.0

    return round((1.0 - actual_distance / max_distance) * 100, 1)


def _label_from_score(score: float) -> str:
    """Map compatibility score to Vietnamese label."""
    if score >= 75.0:
        return "Rất phù hợp"
    elif score >= 50.0:
        return "Phù hợp"
    else:
        return "Có thể dùng"


class FabricService:
    """Service for fabric recommendations based on style pillar and intensity values.

    Fabric catalog is hardcoded in LKB format (SSOT at backend).
    """

    def __init__(self) -> None:
        self._fabrics = self._load_lkb_fabrics()

    def _load_lkb_fabrics(self) -> list[dict]:
        """Load fabric catalog from Local Knowledge Base.

        10 Vietnamese fabric types with physical properties.
        """
        return [
            {
                "id": "lua-ha-dong",
                "name": "Lụa Hà Đông",
                "description": "Lụa tơ tằm truyền thống, độ bóng cao, mềm mại và mát khi mặc. Biểu tượng dệt may Việt Nam.",
                "image_url": "/images/fabrics/lua-ha-dong.jpg",
                "properties": FabricProperty(
                    do_ru="high", do_day="light", do_co_dan="none",
                    do_bong="high", kha_nang_giu_phom="low",
                ),
            },
            {
                "id": "gam-thai-tuan",
                "name": "Gấm Thái Tuấn",
                "description": "Vải gấm dệt hoa văn truyền thống, sang trọng, phù hợp áo dài lễ và sự kiện trang trọng.",
                "image_url": "/images/fabrics/gam-thai-tuan.jpg",
                "properties": FabricProperty(
                    do_ru="medium", do_day="medium", do_co_dan="none",
                    do_bong="high", kha_nang_giu_phom="high",
                ),
            },
            {
                "id": "voan-phap",
                "name": "Voan Pháp",
                "description": "Vải voan mỏng nhẹ, bay bổng, thường dùng làm lớp phủ ngoài áo dài hoặc váy dạ hội.",
                "image_url": "/images/fabrics/voan-phap.jpg",
                "properties": FabricProperty(
                    do_ru="high", do_day="light", do_co_dan="low",
                    do_bong="low", kha_nang_giu_phom="low",
                ),
            },
            {
                "id": "dui-nam-dinh",
                "name": "Đũi Nam Định",
                "description": "Vải đũi thô mộc, chất liệu tự nhiên, thoáng mát, mang đậm nét truyền thống dân dã.",
                "image_url": "/images/fabrics/dui-nam-dinh.jpg",
                "properties": FabricProperty(
                    do_ru="medium", do_day="medium", do_co_dan="none",
                    do_bong="none", kha_nang_giu_phom="medium",
                ),
            },
            {
                "id": "lanh-bac",
                "name": "Lanh Bắc",
                "description": "Vải lanh cao cấp, thoáng khí, thấm hút tốt, phù hợp trang phục mùa hè và smart-casual.",
                "image_url": "/images/fabrics/lanh-bac.jpg",
                "properties": FabricProperty(
                    do_ru="low", do_day="medium", do_co_dan="none",
                    do_bong="none", kha_nang_giu_phom="high",
                ),
            },
            {
                "id": "nhung-tham",
                "name": "Nhung Thấm",
                "description": "Vải nhung mềm mịn, ấm áp, sang trọng, thích hợp cho trang phục mùa lạnh và sự kiện.",
                "image_url": "/images/fabrics/nhung-tham.jpg",
                "properties": FabricProperty(
                    do_ru="medium", do_day="heavy", do_co_dan="low",
                    do_bong="medium", kha_nang_giu_phom="high",
                ),
            },
            {
                "id": "kate-silk",
                "name": "Kate Lụa",
                "description": "Vải kate pha lụa, vừa mềm mại vừa giữ phom tốt, phù hợp đa dạng kiểu dáng.",
                "image_url": "/images/fabrics/kate-silk.jpg",
                "properties": FabricProperty(
                    do_ru="medium", do_day="medium", do_co_dan="low",
                    do_bong="medium", kha_nang_giu_phom="high",
                ),
            },
            {
                "id": "taffeta",
                "name": "Taffeta",
                "description": "Vải taffeta cứng cáp, bóng bẩy, tạo hiệu ứng xòe đẹp cho váy và áo cách điệu.",
                "image_url": "/images/fabrics/taffeta.jpg",
                "properties": FabricProperty(
                    do_ru="low", do_day="medium", do_co_dan="none",
                    do_bong="high", kha_nang_giu_phom="high",
                ),
            },
            {
                "id": "thun-co-gian",
                "name": "Thun co giãn",
                "description": "Vải thun bốn chiều, co giãn tốt, ôm sát cơ thể, phù hợp trang phục hiện đại và thể thao.",
                "image_url": "/images/fabrics/thun-co-gian.jpg",
                "properties": FabricProperty(
                    do_ru="medium", do_day="light", do_co_dan="high",
                    do_bong="low", kha_nang_giu_phom="low",
                ),
            },
            {
                "id": "organza",
                "name": "Organza",
                "description": "Vải organza trong suốt, cứng nhẹ, tạo hiệu ứng phồng và lớp xếp độc đáo cho thiết kế tiên phong.",
                "image_url": "/images/fabrics/organza.jpg",
                "properties": FabricProperty(
                    do_ru="low", do_day="light", do_co_dan="none",
                    do_bong="medium", kha_nang_giu_phom="medium",
                ),
            },
        ]

    def get_recommendations(
        self,
        pillar_id: str,
        intensities: dict[str, float] | None = None,
    ) -> FabricRecommendationResponse | None:
        """Compute fabric recommendations based on pillar and intensity values.

        Args:
            pillar_id: Selected style pillar ID.
            intensities: Optional dict of slider_key → value.

        Returns:
            FabricRecommendationResponse sorted by compatibility, or None if pillar_id unknown.
        """
        prefs = _PILLAR_PREFERENCES.get(pillar_id)
        if prefs is None:
            return None

        ideal = dict(prefs["ideal"])  # copy so we can modify
        weights = dict(prefs["weight"])

        # Apply intensity-based adjustments to ideal values
        if intensities:
            for slider_key, adjustments in _INTENSITY_ADJUSTMENTS.items():
                slider_val = intensities.get(slider_key)
                if slider_val is None:
                    continue
                for prop_key, factor in adjustments.items():
                    # Positive factor: higher slider → higher ideal
                    # Negative factor: higher slider → lower ideal
                    shift = factor * slider_val
                    ideal[prop_key] = max(0.0, min(3.0, ideal[prop_key] + shift))

        # Score each fabric
        results: list[FabricResponse] = []
        for fabric_data in self._fabrics:
            scores = _property_to_scores(fabric_data["properties"])
            compat = _compute_compatibility(scores, ideal, weights)
            label = _label_from_score(compat)

            results.append(
                FabricResponse(
                    id=fabric_data["id"],
                    name=fabric_data["name"],
                    description=fabric_data["description"],
                    image_url=fabric_data["image_url"],
                    properties=fabric_data["properties"],
                    compatibility_score=compat,
                    compatibility_label=label,
                )
            )

        # Sort descending by compatibility score
        results.sort(key=lambda f: f.compatibility_score, reverse=True)

        return FabricRecommendationResponse(
            pillar_id=pillar_id,
            fabrics=results,
            total=len(results),
        )
