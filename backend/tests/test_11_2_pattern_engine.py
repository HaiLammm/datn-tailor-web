"""Unit tests for Pattern Engine (Story 11.2 — AC #3, #4, #5, #8).

Tests:
  4.1  formulas.generate_bodice() — known measurement sets
  4.2  formulas.generate_sleeve() — known measurement sets
  4.3  SVG output contains correct `A` arc commands
  4.4  engine.generate_pattern_pieces() returns exactly 3 pieces
  4.5  Geometric precision: calculated coordinates vs reference values (ΔG ≤ 1 mm = ≤ 0.1 cm)
"""

from decimal import Decimal

import pytest

from src.patterns.engine import PieceResult, generate_pattern_pieces
from src.patterns.formulas import generate_bodice, generate_sleeve
from src.patterns.svg_export import render_bodice_svg, render_sleeve_svg


# ---------------------------------------------------------------------------
# Reference measurement set (tailor-validated sample, all within schema min/max)
# ---------------------------------------------------------------------------
MEASUREMENTS = {
    "do_dai_ao": Decimal("100.0"),
    "ha_eo": Decimal("18.0"),
    "vong_co": Decimal("34.0"),
    "vong_nach": Decimal("38.0"),
    "vong_nguc": Decimal("80.0"),
    "vong_eo": Decimal("64.0"),
    "vong_mong": Decimal("88.0"),
    "do_dai_tay": Decimal("58.0"),
    "vong_bap_tay": Decimal("28.0"),
    "vong_co_tay": Decimal("16.0"),
}

# Pre-calculated reference values (from manual formula application)
# Used for geometric precision test (AC #8, ΔG ≤ 1 mm = 0.1 cm)
EXPECTED_BACK = {
    "bust_width": 80.0 / 4,           # 20.0
    "waist_width": 64.0 / 4 + 0.0,   # 16.0
    "hip_width": 88.0 / 4,            # 22.0
    "armhole_drop": 38.0 / 12,        # 3.166... → 3.2
    "neck_depth": 34.0 / 16,          # 2.125 → 2.1
    "hem_width": 37.0,
    "seam_allowance": 1.0,
}

EXPECTED_FRONT = {
    "bust_width": 80.0 / 4,           # 20.0
    "waist_width": 64.0 / 4 + (-1.0), # 15.0
    "hip_width": 88.0 / 4,            # 22.0
    "armhole_drop": 38.0 / 12,        # 3.2
    "neck_depth": 34.0 / 16,          # 2.1
    "hem_width": 37.0,
    "seam_allowance": 1.0,
}

EXPECTED_SLEEVE = {
    "cap_height": 38.0 / 2 - 1,       # 18.0
    "bicep_width": 28.0 / 2 + 2.5,    # 16.5
    "wrist_width": 16.0 / 2 + 1,      # 9.0
    "sleeve_length": 58.0,
}

TOLERANCE_CM = 0.1  # 1 mm = 0.1 cm (AC #8)


# ---------------------------------------------------------------------------
# 4.1  generate_bodice()
# ---------------------------------------------------------------------------

class TestGenerateBodice:
    """AC #3: Front/Back Bodice using DRY offset architecture."""

    def test_back_bodice_formula_values(self):
        """Back bodice: offset=0, all formula values match reference."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)

        assert abs(params["bust_width"] - EXPECTED_BACK["bust_width"]) <= TOLERANCE_CM
        assert abs(params["waist_width"] - EXPECTED_BACK["waist_width"]) <= TOLERANCE_CM
        assert abs(params["hip_width"] - EXPECTED_BACK["hip_width"]) <= TOLERANCE_CM
        assert abs(params["armhole_drop"] - EXPECTED_BACK["armhole_drop"]) <= TOLERANCE_CM
        assert abs(params["neck_depth"] - EXPECTED_BACK["neck_depth"]) <= TOLERANCE_CM
        assert params["hem_width"] == 37.0
        assert params["seam_allowance"] == 1.0

    def test_front_bodice_offset_minus_one(self):
        """Front bodice: offset=-1, waist_width is 1cm less than back."""
        back = generate_bodice(MEASUREMENTS, offset=0.0)
        front = generate_bodice(MEASUREMENTS, offset=-1.0)

        assert abs(front["waist_width"] - EXPECTED_FRONT["waist_width"]) <= TOLERANCE_CM
        # All other keys identical between front and back
        assert back["bust_width"] == front["bust_width"]
        assert back["hip_width"] == front["hip_width"]
        assert back["armhole_drop"] == front["armhole_drop"]

    def test_waist_width_delta_is_one_cm(self):
        """DRY architecture: back.waist_width - front.waist_width == 1 cm exactly."""
        back = generate_bodice(MEASUREMENTS, offset=0.0)
        front = generate_bodice(MEASUREMENTS, offset=-1.0)
        delta = back["waist_width"] - front["waist_width"]
        assert abs(delta - 1.0) <= TOLERANCE_CM

    def test_hem_width_fixed_constant(self):
        """Hem width is always 37 cm regardless of measurements."""
        for measurements in [MEASUREMENTS, {k: Decimal("100.0") for k in MEASUREMENTS}]:
            params = generate_bodice(measurements, offset=0.0)
            assert params["hem_width"] == 37.0

    def test_seam_allowance_fixed(self):
        """Seam allowance is always 1 cm (not user-configurable)."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        assert params["seam_allowance"] == 1.0

    def test_bodice_with_decimal_inputs(self):
        """Decimal values from DB Numeric columns are handled correctly."""
        measurements = {k: Decimal(str(80.0)) for k in MEASUREMENTS}
        measurements.update(MEASUREMENTS)  # use real values
        params = generate_bodice(measurements, offset=0.0)
        assert isinstance(params["bust_width"], float)


# ---------------------------------------------------------------------------
# 4.2  generate_sleeve()
# ---------------------------------------------------------------------------

class TestGenerateSleeve:
    """AC #5: Sleeve generation formulas."""

    def test_cap_height(self):
        """cap_height = vong_nach / 2 - 1."""
        params = generate_sleeve(MEASUREMENTS)
        assert abs(params["cap_height"] - EXPECTED_SLEEVE["cap_height"]) <= TOLERANCE_CM

    def test_bicep_width(self):
        """bicep_width = vong_bap_tay / 2 + 2.5."""
        params = generate_sleeve(MEASUREMENTS)
        assert abs(params["bicep_width"] - EXPECTED_SLEEVE["bicep_width"]) <= TOLERANCE_CM

    def test_wrist_width(self):
        """wrist_width = vong_co_tay / 2 + 1."""
        params = generate_sleeve(MEASUREMENTS)
        assert abs(params["wrist_width"] - EXPECTED_SLEEVE["wrist_width"]) <= TOLERANCE_CM

    def test_sleeve_length(self):
        """length = do_dai_tay."""
        params = generate_sleeve(MEASUREMENTS)
        assert abs(params["sleeve_length"] - float(MEASUREMENTS["do_dai_tay"])) <= TOLERANCE_CM

    def test_sleeve_params_are_floats(self):
        """All returned values must be float (not Decimal)."""
        params = generate_sleeve(MEASUREMENTS)
        for key in ("cap_height", "bicep_width", "wrist_width", "sleeve_length"):
            assert isinstance(params[key], float), f"{key} should be float"


# ---------------------------------------------------------------------------
# 4.3  SVG output — arc commands
# ---------------------------------------------------------------------------

class TestSVGOutput:
    """AC #4, #5: SVG contains correct A arc commands."""

    def test_bodice_svg_contains_armhole_arc_command(self):
        """Bodice SVG must contain 'A' arc command for armhole curve (AC #4)."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="back_bodice")
        assert " A " in svg, "SVG must use A (arc) command for armhole"

    def test_sleeve_svg_contains_cap_arc_command(self):
        """Sleeve SVG must contain 'A' arc command for half-ellipse cap (AC #5)."""
        params = generate_sleeve(MEASUREMENTS)
        svg = render_sleeve_svg(params)
        assert " A " in svg, "Sleeve SVG must use A (arc) command for cap"

    def test_bodice_svg_is_valid_xml_structure(self):
        """Bodice SVG starts with <svg and closes with </svg>."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="front_bodice")
        assert svg.strip().startswith("<svg")
        assert svg.strip().endswith("</svg>")

    def test_sleeve_svg_is_valid_xml_structure(self):
        """Sleeve SVG starts with <svg and closes with </svg>."""
        params = generate_sleeve(MEASUREMENTS)
        svg = render_sleeve_svg(params)
        assert svg.strip().startswith("<svg")
        assert svg.strip().endswith("</svg>")

    def test_bodice_svg_has_path_element(self):
        """Bodice SVG contains a <path> element."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="back_bodice")
        assert "<path" in svg

    def test_sleeve_svg_closes_path_with_z(self):
        """Sleeve SVG path closes with Z command."""
        params = generate_sleeve(MEASUREMENTS)
        svg = render_sleeve_svg(params)
        assert "Z" in svg

    def test_bodice_svg_under_50kb(self):
        """Each bodice SVG must be < 50 KB (NFR6 / AC #4)."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="front_bodice")
        assert len(svg.encode("utf-8")) < 50_000

    def test_sleeve_svg_under_50kb(self):
        """Sleeve SVG must be < 50 KB (NFR6 / AC #5)."""
        params = generate_sleeve(MEASUREMENTS)
        svg = render_sleeve_svg(params)
        assert len(svg.encode("utf-8")) < 50_000

    def test_bodice_svg_has_xmlns(self):
        """Bodice SVG is standalone (contains xmlns declaration)."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="back_bodice")
        assert 'xmlns="http://www.w3.org/2000/svg"' in svg

    def test_armhole_arc_uses_correct_radii(self):
        """Armhole arc: A {armhole_drop} {bust_width} (AC #4 exact format)."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="back_bodice")
        arm_drop = params["armhole_drop"]   # 3.2
        bust_w = params["bust_width"]        # 20.0
        expected_arc_prefix = f"A {arm_drop:.1f} {bust_w:.1f}"
        assert expected_arc_prefix in svg, f"Expected '{expected_arc_prefix}' in SVG"

    def test_sleeve_arc_uses_correct_radii(self):
        """Sleeve cap arc: A {cap_height} {bicep_width} (AC #5 exact format)."""
        params = generate_sleeve(MEASUREMENTS)
        svg = render_sleeve_svg(params)
        cap_h = params["cap_height"]        # 18.0
        bic_w = params["bicep_width"]       # 16.5
        expected_arc_prefix = f"A {cap_h:.1f} {bic_w:.1f}"
        assert expected_arc_prefix in svg, f"Expected '{expected_arc_prefix}' in SVG"


# ---------------------------------------------------------------------------
# 4.4  engine.generate_pattern_pieces()
# ---------------------------------------------------------------------------

class TestGeneratePatternPieces:
    """AC #2: Engine returns exactly 3 pieces."""

    def test_returns_exactly_three_pieces(self):
        """generate_pattern_pieces() must return exactly 3 PieceResult objects."""
        pieces = generate_pattern_pieces(MEASUREMENTS)
        assert len(pieces) == 3

    def test_piece_types_are_correct(self):
        """Pieces must be front_bodice, back_bodice, sleeve in that order."""
        pieces = generate_pattern_pieces(MEASUREMENTS)
        piece_types = [p.piece_type for p in pieces]
        assert piece_types == ["front_bodice", "back_bodice", "sleeve"]

    def test_all_pieces_have_svg_data(self):
        """Every piece must have non-empty svg_data."""
        pieces = generate_pattern_pieces(MEASUREMENTS)
        for piece in pieces:
            assert piece.svg_data, f"{piece.piece_type} has empty svg_data"

    def test_all_pieces_have_geometry_params(self):
        """Every piece must have non-empty geometry_params dict."""
        pieces = generate_pattern_pieces(MEASUREMENTS)
        for piece in pieces:
            assert piece.geometry_params, f"{piece.piece_type} has empty geometry_params"

    def test_pieces_are_pieceresult_instances(self):
        """Each returned object must be a PieceResult dataclass."""
        pieces = generate_pattern_pieces(MEASUREMENTS)
        for p in pieces:
            assert isinstance(p, PieceResult)

    def test_front_and_back_differ_by_waist_offset(self):
        """Front bodice waist_width is 1cm less than back bodice waist_width."""
        pieces = generate_pattern_pieces(MEASUREMENTS)
        front = next(p for p in pieces if p.piece_type == "front_bodice")
        back = next(p for p in pieces if p.piece_type == "back_bodice")
        delta = back.geometry_params["waist_width"] - front.geometry_params["waist_width"]
        assert abs(delta - 1.0) <= TOLERANCE_CM


# ---------------------------------------------------------------------------
# 4.5  Geometric precision (AC #8, NFR6: ΔG ≤ 1 mm = 0.1 cm)
# ---------------------------------------------------------------------------

class TestGeometricPrecision:
    """AC #8: All formula outputs within 1mm of tailor-validated reference values."""

    @pytest.mark.parametrize("key,expected", [
        ("bust_width", EXPECTED_BACK["bust_width"]),
        ("hip_width", EXPECTED_BACK["hip_width"]),
        ("armhole_drop", EXPECTED_BACK["armhole_drop"]),
        ("neck_depth", EXPECTED_BACK["neck_depth"]),
        ("hem_width", EXPECTED_BACK["hem_width"]),
        ("seam_allowance", EXPECTED_BACK["seam_allowance"]),
    ])
    def test_back_bodice_precision(self, key: str, expected: float):
        """Back bodice key coordinate within ±0.1 cm of reference."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        assert abs(params[key] - expected) <= TOLERANCE_CM, (
            f"Back {key}: got {params[key]:.3f}, expected {expected:.3f}, "
            f"Δ = {abs(params[key] - expected):.3f} cm"
        )

    @pytest.mark.parametrize("key,expected", [
        ("waist_width", EXPECTED_FRONT["waist_width"]),
    ])
    def test_front_bodice_precision(self, key: str, expected: float):
        """Front bodice waist_width within ±0.1 cm of reference."""
        params = generate_bodice(MEASUREMENTS, offset=-1.0)
        assert abs(params[key] - expected) <= TOLERANCE_CM, (
            f"Front {key}: got {params[key]:.3f}, expected {expected:.3f}, "
            f"Δ = {abs(params[key] - expected):.3f} cm"
        )

    @pytest.mark.parametrize("key,expected", [
        ("cap_height", EXPECTED_SLEEVE["cap_height"]),
        ("bicep_width", EXPECTED_SLEEVE["bicep_width"]),
        ("wrist_width", EXPECTED_SLEEVE["wrist_width"]),
        ("sleeve_length", EXPECTED_SLEEVE["sleeve_length"]),
    ])
    def test_sleeve_precision(self, key: str, expected: float):
        """Sleeve key coordinates within ±0.1 cm of reference."""
        params = generate_sleeve(MEASUREMENTS)
        assert abs(params[key] - expected) <= TOLERANCE_CM, (
            f"Sleeve {key}: got {params[key]:.3f}, expected {expected:.3f}, "
            f"Δ = {abs(params[key] - expected):.3f} cm"
        )
