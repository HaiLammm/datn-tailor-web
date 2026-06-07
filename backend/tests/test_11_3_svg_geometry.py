"""SVG geometry-correctness tests (Story 11.3 — ACs 11.3.8–11.3.13, SCP 2026-06-08).

Asserts the rendered SVG actually fixes the audited defects G1–G10, rather than just
'contains an A command'. Parses coordinates back out of the path and checks invariants.
"""

import re
from decimal import Decimal

import pytest

from src.patterns.formulas import generate_bodice, generate_sleeve
from src.patterns.svg_export import render_bodice_svg, render_sleeve_svg
from src.patterns.gcode_export import parse_svg_path

MEASUREMENTS = {
    "do_dai_ao": Decimal("100.0"),
    "ha_eo": Decimal("36.0"),
    "vong_co": Decimal("36.0"),
    "vong_nach": Decimal("34.0"),
    "vong_nguc": Decimal("84.0"),
    "vong_eo": Decimal("66.0"),
    "vong_mong": Decimal("90.0"),
    "do_dai_tay": Decimal("60.0"),
    "vong_bap_tay": Decimal("32.0"),
    "vong_co_tay": Decimal("15.0"),
}


def _path_d(svg: str) -> str:
    return re.search(r'<path[^>]+\bd="([^"]+)"', svg).group(1)


def _viewbox_h(svg: str) -> float:
    vb = re.search(r'viewBox="[^"]*?([\d.\-]+) ([\d.\-]+) ([\d.\-]+) ([\d.\-]+)"', svg).groups()
    return float(vb[3])


class TestBodiceSvgGeometry:
    def test_length_from_measurement_not_60_fixes_g1(self):
        """ViewBox height tracks do_dai_ao (=100+margins), never the old hard-coded 60."""
        svg = render_bodice_svg(generate_bodice(MEASUREMENTS, piece="back_bodice"), "back_bodice")
        assert _viewbox_h(svg) > 90, "bodice length must come from do_dai_ao, not 60 cm"

    def test_uses_curve_commands_fixes_g10(self):
        """Neckline arc (A) + raglan seam curve (C), not all-straight L segments."""
        d = _path_d(render_bodice_svg(generate_bodice(MEASUREMENTS, piece="back_bodice"), "back_bodice"))
        assert " A " in d and " C " in d

    def test_hem_wider_than_hip_in_svg_fixes_g8(self):
        """Hem corner x-coordinate exceeds hip x-coordinate (no inverted side seam)."""
        p = generate_bodice(MEASUREMENTS, piece="back_bodice")
        svg = render_bodice_svg(p, "back_bodice")
        coords = parse_svg_path(svg)  # mm
        max_x = max(x for x, _ in coords)
        # hem_width (mong/4+2) should be the widest point
        assert max_x == pytest.approx(p["hem_width"] * 10, abs=5)

    def test_armhole_curve_non_degenerate_fixes_g3(self):
        """The RENDERED raglan seam (parsed from the path) spans a real vertical
        distance with many intermediate points — the old armhole arc was ~0.9 cm."""
        p = generate_bodice(MEASUREMENTS, piece="back_bodice")
        coords = parse_svg_path(render_bodice_svg(p, "back_bodice"))  # mm
        # Points along the seam: y between neck (~ -shoulder_rise) and underarm (armhole_drop)
        seam_band = [y for _, y in coords if -50 < y < p["armhole_drop"] * 10 + 1]
        assert len(seam_band) >= 10, "raglan seam must flatten to many points (real curve)"
        assert max(seam_band) - min(seam_band) > 100, "seam must span >10 cm vertically"


class TestSleeveSvgGeometry:
    def test_cap_uses_curves_fixes_g4(self):
        d = _path_d(render_sleeve_svg(generate_sleeve(MEASUREMENTS)))
        assert d.count(" C ") >= 2  # two raglan cap curves

    def test_underarm_wider_than_bicep_in_coords(self):
        p = generate_sleeve(MEASUREMENTS)
        coords = parse_svg_path(render_sleeve_svg(p))
        max_abs_x = max(abs(x) for x, _ in coords)
        assert max_abs_x == pytest.approx(p["underarm_width"] * 10, abs=5)

    def test_sleeve_height_tracks_length(self):
        p = generate_sleeve(MEASUREMENTS)
        coords = parse_svg_path(render_sleeve_svg(p))
        max_y = max(y for _, y in coords)
        assert max_y == pytest.approx(p["sleeve_length"] * 10, abs=5)


class TestPipelineProducesClosedCuttablePath:
    @pytest.mark.parametrize("piece", ["front_bodice", "back_bodice"])
    def test_bodice_path_closes(self, piece):
        coords = parse_svg_path(render_bodice_svg(generate_bodice(MEASUREMENTS, piece=piece), piece))
        assert coords[0] == coords[-1], "path must close for laser cutting"

    def test_sleeve_path_closes(self):
        coords = parse_svg_path(render_sleeve_svg(generate_sleeve(MEASUREMENTS)))
        assert coords[0] == coords[-1]
