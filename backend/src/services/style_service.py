"""Style Service - Story 2.1 & 2.2: Lựa chọn & Tinh chỉnh Phong cách.

Manages style pillars from Local Knowledge Base (LKB).
Backend is authoritative source (SSOT) for style configurations including golden_points.
"""

from src.constraints.registry import ConstraintRegistry
from src.constraints.soft_constraints import (
    AsymmetryWarning,
    HighBodyHugWarning,
    NarrowShoulderWarning,
)
from src.models.style import (
    IntensitySlider,
    IntensitySubmitRequest,
    IntensitySubmitResponse,
    IntensityWarning,
    StylePillarResponse,
)

# Soft constraint registry (Story 4.1a migration)
_soft_registry = ConstraintRegistry()
_soft_registry.register(HighBodyHugWarning())
_soft_registry.register(NarrowShoulderWarning())
_soft_registry.register(AsymmetryWarning())

# In-memory per-pillar sequence tracking (race condition protection, Story 2.2 AC5).
# MVP limitation: Lost on server restart, not shared across workers in multi-process
# deployments (e.g. Gunicorn). For production, migrate to Redis or DB-backed session.
_session_sequences: dict[str, int] = {}


class StyleService:
    """Service for managing style pillars and intensity configurations.

    Style pillars are currently hardcoded in LKB format.
    Future: Can be loaded from database or external config.
    """

    def __init__(self) -> None:
        """Initialize StyleService with LKB data."""
        self._pillars = self._load_lkb_pillars()

    def _load_lkb_pillars(self) -> list[StylePillarResponse]:
        """Load style pillars from Local Knowledge Base.

        Returns hardcoded Vietnamese tailoring styles with golden_points.
        Uses 100% Vietnamese terminology per NFR11.
        Golden points represent artisan golden ratio positions (Story 2.2).
        """
        return [
            StylePillarResponse(
                id="traditional",
                name="Size S",
                description="Phong cách may đo truyền thống Việt Nam, chú trọng đường cắt cổ điển và chi tiết thủ công tinh xảo.",
                image_url="/images/styles/traditional.jpg",
                is_default=True,
                sliders=[
                    IntensitySlider(
                        key="shoulder_width",
                        label="Độ rộng vai",
                        description="Điều chỉnh độ rộng phần vai so với số đo chuẩn",
                        min_value=0,
                        max_value=100,
                        default_value=50,
                        step=5,
                        unit="%",
                        golden_points=[38.2, 61.8],  # Fibonacci golden ratio
                    ),
                    IntensitySlider(
                        key="body_fit",
                        label="Độ ôm thân",
                        description="Mức độ ôm sát của thân áo/quần",
                        min_value=0,
                        max_value=100,
                        default_value=60,
                        step=5,
                        unit="%",
                        golden_points=[50.0, 61.8],  # Chuẩn & phối vải lụa
                    ),
                    IntensitySlider(
                        key="garment_length",
                        label="Chiều dài áo",
                        description="Điều chỉnh độ dài áo so với chuẩn",
                        min_value=0,
                        max_value=100,
                        default_value=50,
                        step=5,
                        unit="%",
                        golden_points=[50.0],  # Chiều dài áo dài cổ điển
                    ),
                    IntensitySlider(
                        key="do_rong_tay",
                        label="Độ rộng tay",
                        description="Điều chỉnh độ rộng của ống tay áo",
                        min_value=0,
                        max_value=100,
                        default_value=55,
                        step=5,
                        unit="%",
                        golden_points=[38.2],  # Tỷ lệ cổ tay - bắp tay
                    ),
                ],
            ),
            StylePillarResponse(
                id="minimalist",
                name="Size M",
                description="Phong cách tối giản, đường cắt sắc nét và silhouette gọn gàng, phù hợp môi trường công sở.",
                image_url="/images/styles/minimalist.jpg",
                is_default=False,
                sliders=[
                    IntensitySlider(
                        key="shoulder_width",
                        label="Độ rộng vai",
                        description="Điều chỉnh độ rộng phần vai so với số đo chuẩn",
                        min_value=0,
                        max_value=100,
                        default_value=45,
                        step=5,
                        unit="%",
                        golden_points=[38.2, 50.0],
                    ),
                    IntensitySlider(
                        key="body_fit",
                        label="Độ ôm thân",
                        description="Mức độ ôm sát của thân áo/quần",
                        min_value=0,
                        max_value=100,
                        default_value=70,
                        step=5,
                        unit="%",
                        golden_points=[61.8, 70.0],  # Tối giản đòi hỏi ôm vừa phải
                    ),
                    IntensitySlider(
                        key="garment_length",
                        label="Chiều dài áo",
                        description="Điều chỉnh độ dài áo so với chuẩn",
                        min_value=0,
                        max_value=100,
                        default_value=45,
                        step=5,
                        unit="%",
                        golden_points=[38.2, 50.0],
                    ),
                    IntensitySlider(
                        key="do_rong_tay",
                        label="Độ rộng tay",
                        description="Điều chỉnh độ rộng của ống tay áo",
                        min_value=0,
                        max_value=100,
                        default_value=40,
                        step=5,
                        unit="%",
                        golden_points=[38.2],
                    ),
                ],
            ),
            StylePillarResponse(
                id="avant-garde",
                name="Size L",
                description="Phong cách táo bạo với đường cắt phá cách, dành cho khách hàng yêu thích sự độc đáo.",
                image_url="/images/styles/avant-garde.jpg",
                is_default=False,
                sliders=[
                    IntensitySlider(
                        key="shoulder_width",
                        label="Độ rộng vai",
                        description="Điều chỉnh độ rộng phần vai so với số đo chuẩn",
                        min_value=0,
                        max_value=100,
                        default_value=65,
                        step=5,
                        unit="%",
                        golden_points=[61.8, 76.4],  # Tiên phong cho phép vai rộng hơn
                    ),
                    IntensitySlider(
                        key="body_fit",
                        label="Độ ôm thân",
                        description="Mức độ ôm sát của thân áo/quần",
                        min_value=0,
                        max_value=100,
                        default_value=40,
                        step=5,
                        unit="%",
                        golden_points=[38.2],
                    ),
                    IntensitySlider(
                        key="do_bat_doi_xung",
                        label="Độ bất đối xứng",
                        description="Mức độ phá cách bất đối xứng trong thiết kế",
                        min_value=0,
                        max_value=100,
                        default_value=30,
                        step=5,
                        unit="%",
                        golden_points=[23.6, 38.2],  # Phá cách nhưng có kiểm soát
                    ),
                    IntensitySlider(
                        key="do_xep_ly",
                        label="Độ xếp ly",
                        description="Mức độ chi tiết xếp ly trên thiết kế",
                        min_value=0,
                        max_value=100,
                        default_value=50,
                        step=5,
                        unit="%",
                        golden_points=[38.2, 61.8],
                    ),
                ],
            ),
        ]

    def get_all_pillars(self) -> list[StylePillarResponse]:
        """Get all available style pillars.

        Returns:
            List of StylePillarResponse with slider configurations and golden_points.
        """
        return self._pillars

    def get_pillar_by_id(self, pillar_id: str) -> StylePillarResponse | None:
        """Get a specific style pillar by ID.

        Args:
            pillar_id: Unique identifier of the style pillar.

        Returns:
            StylePillarResponse if found, None otherwise.
        """
        for pillar in self._pillars:
            if pillar.id == pillar_id:
                return pillar
        return None

    def get_default_pillar(self) -> StylePillarResponse | None:
        """Get the default style pillar.

        Returns:
            The default StylePillarResponse, or None if no default set.
        """
        for pillar in self._pillars:
            if pillar.is_default:
                return pillar
        return self._pillars[0] if self._pillars else None

    def validate_and_submit_intensity(
        self, request: IntensitySubmitRequest
    ) -> tuple[IntensitySubmitResponse, int]:
        """Validate and process intensity submission (Story 2.2).

        Validates intensity values are within slider bounds, then checks
        soft constraints to generate non-blocking warnings.

        Args:
            request: IntensitySubmitRequest with pillar_id, intensities, sequence_id.

        Returns:
            Tuple of (IntensitySubmitResponse, http_status_code).
            - 200 for success (including with soft warnings)
            - 404 if pillar_id not found
            - 422 if any value is out of slider bounds
        """
        pillar = self.get_pillar_by_id(request.pillar_id)
        if pillar is None:
            return (
                IntensitySubmitResponse(
                    success=False,
                    sequence_id=request.sequence_id,
                    error=f"Không tìm thấy phong cách với ID: {request.pillar_id}",
                ),
                404,
            )

        # AC5: Reject stale requests (sequence_id < last seen for this pillar)
        last_seq = _session_sequences.get(request.pillar_id, -1)
        if request.sequence_id < last_seq:
            return (
                IntensitySubmitResponse(
                    success=False,
                    sequence_id=request.sequence_id,
                    error=f"Yêu cầu đã cũ (sequence {request.sequence_id} < {last_seq}). Vui lòng gửi lại.",
                ),
                409,
            )
        _session_sequences[request.pillar_id] = request.sequence_id

        # Build a lookup map from slider key → slider config
        slider_map = {s.key: s for s in pillar.sliders}

        # Validate each submitted intensity value
        for item in request.intensities:
            slider = slider_map.get(item.key)
            if slider is None:
                # Unknown slider keys are ignored gracefully
                continue
            if item.value < slider.min_value or item.value > slider.max_value:
                return (
                    IntensitySubmitResponse(
                        success=False,
                        sequence_id=request.sequence_id,
                        error=(
                            f"Giá trị '{item.key}' = {item.value} "
                            f"vượt ngoài phạm vi cho phép "
                            f"[{slider.min_value}, {slider.max_value}]"
                        ),
                    ),
                    422,
                )

        # Build a value map for soft constraint checks (delegate to Registry)
        submitted_values = {item.key: item.value for item in request.intensities}

        # Run soft constraints via Registry (Story 4.1a migration)
        registry_result = _soft_registry.run_all({}, submitted_values)

        warnings: list[IntensityWarning] = []
        for w in registry_result["warnings"]:
            # Map ConstraintResult to IntensityWarning (preserve existing response format)
            slider_key = next(iter(w.violated_values), "unknown")
            warnings.append(
                IntensityWarning(
                    slider_key=slider_key,
                    message=w.message_vi,
                    severity="soft",
                )
            )

        return (
            IntensitySubmitResponse(
                success=True,
                sequence_id=request.sequence_id,
                warnings=warnings,
            ),
            200,
        )
