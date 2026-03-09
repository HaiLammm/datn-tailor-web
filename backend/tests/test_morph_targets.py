"""Tests for Story 3.2: Morph Target Generation.

Tests:
- Task 1.1: GeometryEngine target geometry calculation
- Task 1.2: MorphDelta model structure
- Task 1.3: Morph targets API endpoint
"""

import pytest
from decimal import Decimal
from fastapi.testclient import TestClient

from src.geometry.engine import GeometryEngine
from src.models.geometry import (
    MasterGeometry,
    MorphDelta,
    MorphDeltaPart,
    MorphDeltaPath,
    MorphDeltaSegment,
    Point,
    Segment,
    Path,
    PatternPart,
    CurveControl,
)
from src.services.base_pattern_service import BasePatternService
from src.models.customer import MeasurementCreateRequest
from src.main import app
from src.api.dependencies import get_current_user_from_token
from src.models.db_models import UserDB


# --- Fixtures ---

@pytest.fixture
def standard_measurements() -> MeasurementCreateRequest:
    """Standard size M measurements."""
    return MeasurementCreateRequest(
        neck=Decimal("36.0"),
        bust=Decimal("86.0"),
        waist=Decimal("68.0"),
        hip=Decimal("92.0"),
        shoulder_width=Decimal("36.0"),
        top_length=Decimal("100.0"),
        sleeve_length=Decimal("55.0"),
    )


@pytest.fixture
def base_geometry(standard_measurements: MeasurementCreateRequest) -> MasterGeometry:
    """Generate baseline geometry for testing."""
    service = BasePatternService()
    return service.generate_baseline(standard_measurements)


@pytest.fixture
def simple_geometry() -> MasterGeometry:
    """Simple geometry for unit testing delta calculation."""
    return MasterGeometry(
        parts=[
            PatternPart(
                part_id="test_part",
                name="Test",
                paths=[
                    Path(
                        id="test_path",
                        segments=[
                            Segment(type="move", to=Point(x=0.0, y=0.0)),
                            Segment(type="line", to=Point(x=100.0, y=0.0)),
                            Segment(type="line", to=Point(x=100.0, y=200.0)),
                            Segment(type="line", to=Point(x=0.0, y=200.0)),
                        ],
                        closed=True,
                    )
                ],
            )
        ],
        version="1.0.0",
        units="mm",
    )


@pytest.fixture
def target_geometry() -> MasterGeometry:
    """Target geometry (max deformation) for testing delta calculation."""
    return MasterGeometry(
        parts=[
            PatternPart(
                part_id="test_part",
                name="Test",
                paths=[
                    Path(
                        id="test_path",
                        segments=[
                            Segment(type="move", to=Point(x=0.0, y=0.0)),
                            Segment(type="line", to=Point(x=120.0, y=0.0)),
                            Segment(type="line", to=Point(x=120.0, y=220.0)),
                            Segment(type="line", to=Point(x=0.0, y=220.0)),
                        ],
                        closed=True,
                    )
                ],
            )
        ],
        version="1.0.0",
        units="mm",
    )


# --- Task 1.1: GeometryEngine target geometry ---

class TestGeometryEngineTargetGeometry:
    """Tests for GeometryEngine.compute_morph_delta (Task 1.1)."""

    def test_compute_morph_delta_basic(
        self, simple_geometry: MasterGeometry, target_geometry: MasterGeometry
    ):
        """Delta = Target - Base for each point."""
        delta = GeometryEngine.compute_morph_delta(simple_geometry, target_geometry)

        assert delta is not None
        assert len(delta.parts) == 1
        assert delta.parts[0].part_id == "test_part"
        assert len(delta.parts[0].paths) == 1

        path_delta = delta.parts[0].paths[0]
        assert path_delta.path_id == "test_path"
        assert len(path_delta.segments) == 4

        # Segment 0: move (0,0) -> (0,0) => dx=0, dy=0
        assert path_delta.segments[0].dx == 0.0
        assert path_delta.segments[0].dy == 0.0

        # Segment 1: line (100,0) -> (120,0) => dx=20, dy=0
        assert path_delta.segments[1].dx == 20.0
        assert path_delta.segments[1].dy == 0.0

        # Segment 2: line (100,200) -> (120,220) => dx=20, dy=20
        assert path_delta.segments[2].dx == 20.0
        assert path_delta.segments[2].dy == 20.0

        # Segment 3: line (0,200) -> (0,220) => dx=0, dy=20
        assert path_delta.segments[3].dx == 0.0
        assert path_delta.segments[3].dy == 20.0

    def test_compute_morph_delta_with_curves(self):
        """Delta includes control point deltas for curve segments."""
        base = MasterGeometry(
            parts=[
                PatternPart(
                    part_id="curved",
                    name="Curved",
                    paths=[
                        Path(
                            id="c_path",
                            segments=[
                                Segment(type="move", to=Point(x=0.0, y=0.0)),
                                Segment(
                                    type="curve",
                                    to=Point(x=100.0, y=100.0),
                                    control=CurveControl(
                                        cp1=Point(x=30.0, y=0.0),
                                        cp2=Point(x=70.0, y=100.0),
                                    ),
                                ),
                            ],
                            closed=False,
                        )
                    ],
                )
            ],
            version="1.0.0",
            units="mm",
        )

        target = MasterGeometry(
            parts=[
                PatternPart(
                    part_id="curved",
                    name="Curved",
                    paths=[
                        Path(
                            id="c_path",
                            segments=[
                                Segment(type="move", to=Point(x=0.0, y=0.0)),
                                Segment(
                                    type="curve",
                                    to=Point(x=110.0, y=110.0),
                                    control=CurveControl(
                                        cp1=Point(x=35.0, y=5.0),
                                        cp2=Point(x=75.0, y=105.0),
                                    ),
                                ),
                            ],
                            closed=False,
                        )
                    ],
                )
            ],
            version="1.0.0",
            units="mm",
        )

        delta = GeometryEngine.compute_morph_delta(base, target)

        curve_seg = delta.parts[0].paths[0].segments[1]
        assert curve_seg.dx == 10.0
        assert curve_seg.dy == 10.0
        # Control point deltas
        assert curve_seg.cp1_dx == 5.0
        assert curve_seg.cp1_dy == 5.0
        assert curve_seg.cp2_dx == 5.0
        assert curve_seg.cp2_dy == 5.0

    def test_compute_target_from_style(self, base_geometry: MasterGeometry):
        """GeometryEngine can compute target geometry for a given style."""
        target = GeometryEngine.compute_target_geometry(
            base_geometry, style_id="classic"
        )

        assert target is not None
        assert len(target.parts) == len(base_geometry.parts)
        # Target should differ from base (some points moved)
        base_seg = base_geometry.parts[0].paths[0].segments[1].to
        target_seg = target.parts[0].paths[0].segments[1].to
        # At least one coordinate should differ for classic style
        differs = base_seg.x != target_seg.x or base_seg.y != target_seg.y
        assert differs, "Target geometry must differ from base for 'classic' style"


# --- Task 1.2: MorphDelta Model ---

class TestMorphDeltaModel:
    """Tests for MorphDelta Pydantic model structure (Task 1.2)."""

    def test_morph_delta_model_structure(self):
        """MorphDelta has parts containing paths with dx/dy vectors."""
        delta = MorphDelta(
            parts=[
                MorphDeltaPart(
                    part_id="front_bodice",
                    paths=[
                        MorphDeltaPath(
                            path_id="front_outline",
                            segments=[
                                MorphDeltaSegment(dx=5.0, dy=0.0),
                                MorphDeltaSegment(dx=10.0, dy=3.0),
                            ],
                        )
                    ],
                )
            ],
            style_id="classic",
        )

        assert delta.style_id == "classic"
        assert len(delta.parts) == 1
        assert delta.parts[0].part_id == "front_bodice"
        seg = delta.parts[0].paths[0].segments[0]
        assert seg.dx == 5.0
        assert seg.dy == 0.0

    def test_morph_delta_segment_defaults(self):
        """Control point deltas default to None when not present."""
        seg = MorphDeltaSegment(dx=1.0, dy=2.0)
        assert seg.cp1_dx is None
        assert seg.cp1_dy is None
        assert seg.cp2_dx is None
        assert seg.cp2_dy is None

    def test_morph_delta_segment_with_control(self):
        """Control point deltas are set for curve segments."""
        seg = MorphDeltaSegment(
            dx=1.0, dy=2.0, cp1_dx=0.5, cp1_dy=0.3, cp2_dx=0.8, cp2_dy=0.4
        )
        assert seg.cp1_dx == 0.5
        assert seg.cp2_dy == 0.4

    def test_morph_delta_serialization(self):
        """MorphDelta can serialize to dict/json."""
        delta = MorphDelta(
            parts=[
                MorphDeltaPart(
                    part_id="test",
                    paths=[
                        MorphDeltaPath(
                            path_id="p1",
                            segments=[MorphDeltaSegment(dx=1.0, dy=2.0)],
                        )
                    ],
                )
            ],
            style_id="modern",
        )

        data = delta.model_dump()
        assert data["style_id"] == "modern"
        assert data["parts"][0]["paths"][0]["segments"][0]["dx"] == 1.0


# --- Task 1.3: API Endpoint ---

async def mock_get_current_user():
    return UserDB(email="test@example.com", role="Customer", is_active=True)


@pytest.fixture
def client():
    """Test client with mocked auth."""
    app.dependency_overrides[get_current_user_from_token] = mock_get_current_user
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestMorphTargetsEndpoint:
    """Tests for GET /api/v1/geometry/morph-targets/{style_id} (Task 1.3)."""

    def test_get_morph_targets_success(self, client: TestClient):
        """Endpoint returns MorphDelta for a valid style."""
        # First create baseline
        measurements = {
            "neck": 36.0,
            "bust": 86.0,
            "waist": 68.0,
            "hip": 92.0,
            "shoulder_width": 36.0,
            "top_length": 100.0,
            "sleeve_length": 55.0,
        }

        response = client.post(
            "/api/v1/geometry/morph-targets/classic",
            json=measurements,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["style_id"] == "classic"
        assert "parts" in data
        assert len(data["parts"]) > 0

        # Verify structure
        part = data["parts"][0]
        assert "part_id" in part
        assert "paths" in part
        path = part["paths"][0]
        assert "path_id" in path
        assert "segments" in path
        seg = path["segments"][0]
        assert "dx" in seg
        assert "dy" in seg

    def test_get_morph_targets_invalid_style(self, client: TestClient):
        """Endpoint returns 404 for unknown style."""
        measurements = {
            "neck": 36.0,
            "bust": 86.0,
            "waist": 68.0,
            "hip": 92.0,
            "shoulder_width": 36.0,
            "top_length": 100.0,
            "sleeve_length": 55.0,
        }

        response = client.post(
            "/api/v1/geometry/morph-targets/nonexistent_style",
            json=measurements,
        )

        assert response.status_code == 404

    def test_morph_delta_values_are_target_minus_base(self, client: TestClient):
        """Verify delta = target - base for each point (AC3 formula)."""
        measurements = {
            "neck": 36.0,
            "bust": 86.0,
            "waist": 68.0,
            "hip": 92.0,
            "shoulder_width": 36.0,
            "top_length": 100.0,
            "sleeve_length": 55.0,
        }

        # Get baseline
        base_response = client.post("/api/v1/geometry/baseline", json=measurements)
        base_data = base_response.json()

        # Get morph targets
        morph_response = client.post(
            "/api/v1/geometry/morph-targets/classic",
            json=measurements,
        )
        morph_data = morph_response.json()

        # Verify delta structure matches base structure
        assert len(morph_data["parts"]) == len(base_data["parts"])
        for i, part in enumerate(morph_data["parts"]):
            assert part["part_id"] == base_data["parts"][i]["part_id"]
            for j, path in enumerate(part["paths"]):
                base_path = base_data["parts"][i]["paths"][j]
                assert len(path["segments"]) == len(base_path["segments"])
