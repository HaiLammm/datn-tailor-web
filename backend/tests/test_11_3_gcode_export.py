"""Unit tests for G-code Export (Story 11.3 — AC #5).

Tests:
  4.1  SVG path parsing extracts correct coordinates
  4.2  G-code output format matches laser cutter requirements
  4.3  Closed path: end coordinate equals start coordinate
  4.4  Speed/power parameter embedding
  4.5  Default values when params not provided
"""

from decimal import Decimal

import pytest

from src.patterns.formulas import generate_bodice, generate_sleeve
from src.patterns.gcode_export import (
    generate_gcode,
    parse_svg_path,
    svg_to_gcode,
)
from src.patterns.svg_export import render_bodice_svg, render_sleeve_svg


# ---------------------------------------------------------------------------
# Reference measurement set (from 11.2 tests)
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


# ---------------------------------------------------------------------------
# 4.1  SVG path parsing
# ---------------------------------------------------------------------------

class TestParseSvgPath:
    """AC #5: parse_svg_path extracts coordinates from SVG path data."""

    def test_parse_simple_path_m_and_l(self):
        """Parse simple M L L Z path."""
        svg = '<svg><path d="M 0.0 0.0 L 10.0 0.0 L 10.0 10.0 Z"/></svg>'
        coords = parse_svg_path(svg)

        # Coordinates should be converted from cm to mm (x10)
        assert len(coords) >= 3
        assert coords[0] == (0.0, 0.0)      # M 0 0 → (0, 0) mm
        assert coords[1] == (100.0, 0.0)    # L 10 0 → (100, 0) mm
        assert coords[2] == (100.0, 100.0)  # L 10 10 → (100, 100) mm

    def test_parse_path_with_close_z(self):
        """Z command closes path back to start point."""
        svg = '<svg><path d="M 5.0 5.0 L 15.0 5.0 L 15.0 15.0 Z"/></svg>'
        coords = parse_svg_path(svg)

        # Last coordinate should be back at start (5*10, 5*10) = (50, 50)
        assert coords[-1] == (50.0, 50.0)

    def test_parse_path_with_arc_command(self):
        """Arc (A) command converted to polyline segments."""
        # A arc command: A rx ry x-rotation large-arc-flag sweep-flag x y
        svg = '<svg><path d="M 0.0 0.0 A 3.2 20.0 0 0 1 21.0 3.2 L 21.0 60.0 Z"/></svg>'
        coords = parse_svg_path(svg)

        # Should have more than 3 points due to arc approximation
        assert len(coords) > 3, "Arc should be approximated with multiple line segments"

        # First point is M 0 0
        assert coords[0] == (0.0, 0.0)

    def test_parse_bodice_svg(self):
        """Parse actual bodice SVG from render_bodice_svg."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="back_bodice")
        coords = parse_svg_path(svg)

        # Should have multiple coordinates
        assert len(coords) > 5, "Bodice should have multiple path points"

        # All coordinates should be positive (cm * 10 = mm)
        for x, y in coords:
            assert x >= -20, f"X coordinate {x} is too negative"  # Allow small margin
            assert y >= -20, f"Y coordinate {y} is too negative"

    def test_parse_sleeve_svg(self):
        """Parse actual sleeve SVG from render_sleeve_svg."""
        params = generate_sleeve(MEASUREMENTS)
        svg = render_sleeve_svg(params)
        coords = parse_svg_path(svg)

        # Should have multiple coordinates (arc is approximated)
        assert len(coords) > 10, "Sleeve arc should produce many segments"

    def test_empty_svg_returns_empty_list(self):
        """SVG without path element returns empty coordinates."""
        svg = '<svg><rect x="0" y="0" width="10" height="10"/></svg>'
        coords = parse_svg_path(svg)
        assert coords == []

    def test_cm_to_mm_conversion(self):
        """SVG cm coordinates are converted to G-code mm (x10)."""
        svg = '<svg><path d="M 1.0 2.0 L 3.0 4.0"/></svg>'
        coords = parse_svg_path(svg)

        assert coords[0] == (10.0, 20.0)  # 1cm = 10mm
        assert coords[1] == (30.0, 40.0)  # 3cm = 30mm


# ---------------------------------------------------------------------------
# 4.2  G-code output format
# ---------------------------------------------------------------------------

class TestGenerateGcode:
    """AC #5: G-code output matches laser cutter requirements (FR95)."""

    def test_gcode_has_header_comments(self):
        """G-code includes header comments with piece_type and timestamp."""
        coords = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="front_bodice")

        assert "; Pattern Piece: front_bodice" in gcode
        assert "; Generated:" in gcode
        assert "; Speed: 1000 mm/min, Power: 80%" in gcode

    def test_gcode_has_setup_commands(self):
        """G-code includes G90 (absolute) and G21 (metric) setup."""
        coords = [(0.0, 0.0), (100.0, 0.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        assert "G90" in gcode  # Absolute positioning
        assert "G21" in gcode  # Metric units

    def test_gcode_has_laser_on_command(self):
        """G-code includes M3 S{pwm} to turn laser on."""
        coords = [(0.0, 0.0), (100.0, 0.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        # Power 80% → PWM 204 (80 * 255 / 100)
        assert "M3 S204" in gcode

    def test_gcode_has_laser_off_command(self):
        """G-code includes M5 to turn laser off."""
        coords = [(0.0, 0.0), (100.0, 0.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        assert "M5" in gcode

    def test_gcode_has_cutting_commands(self):
        """G-code includes G1 cutting commands with speed."""
        coords = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0)]
        gcode = generate_gcode(coords, speed=1500, power=80, piece_type="test")

        assert "G1 X100.0 Y0.0 F1500" in gcode
        assert "G1 X100.0 Y100.0 F1500" in gcode

    def test_gcode_has_rapid_move_to_start(self):
        """G-code starts with G0 rapid move to first coordinate."""
        coords = [(50.0, 50.0), (100.0, 50.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        assert "G0 X50.0 Y50.0" in gcode

    def test_gcode_has_return_home(self):
        """G-code ends with G0 X0 Y0 return to home."""
        coords = [(50.0, 50.0), (100.0, 50.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        # Check for return home at end
        lines = gcode.strip().split("\n")
        home_found = any("G0 X0 Y0" in line for line in lines[-5:])
        assert home_found, "G-code should return to home at end"

    def test_gcode_has_end_comment(self):
        """G-code ends with end-of-piece comment."""
        coords = [(0.0, 0.0), (100.0, 0.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        assert "; End of piece" in gcode


# ---------------------------------------------------------------------------
# 4.3  Closed path test
# ---------------------------------------------------------------------------

class TestClosedPath:
    """AC #5: G-code path must close (end = start coordinate)."""

    def test_gcode_closes_path_if_not_closed(self):
        """If path doesn't close, G-code adds closing line."""
        # Open path (end != start)
        coords = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        # Should have a line returning to start
        assert "G1 X0.0 Y0.0" in gcode

    def test_gcode_does_not_duplicate_close_if_already_closed(self):
        """If path already closes, don't add duplicate point."""
        # Closed path (end == start)
        coords = [(0.0, 0.0), (100.0, 0.0), (100.0, 100.0), (0.0, 0.0)]
        gcode = generate_gcode(coords, speed=1000, power=80, piece_type="test")

        # Count occurrences of G1 X0.0 Y0.0
        # Should only appear once (or maybe a close-path line, but not duplicate)
        cutting_lines = [l for l in gcode.split("\n") if l.startswith("G1")]
        close_lines = [l for l in cutting_lines if "X0.0 Y0.0" in l]
        # Allow 1 (from coordinates) but not 2
        assert len(close_lines) <= 1


# ---------------------------------------------------------------------------
# 4.4  Speed/power parameter embedding
# ---------------------------------------------------------------------------

class TestSpeedPowerParams:
    """AC #5: G-code correctly embeds speed and power parameters."""

    def test_speed_in_feedrate(self):
        """Speed appears as F{speed} in G1 commands."""
        coords = [(0.0, 0.0), (100.0, 0.0)]
        gcode = generate_gcode(coords, speed=2000, power=50, piece_type="test")

        assert "F2000" in gcode

    def test_power_pwm_conversion(self):
        """Power percentage converts to PWM (power * 255 / 100)."""
        coords = [(0.0, 0.0), (100.0, 0.0)]

        # 100% → 255
        gcode = generate_gcode(coords, speed=1000, power=100, piece_type="test")
        assert "M3 S255" in gcode

        # 50% → 127
        gcode = generate_gcode(coords, speed=1000, power=50, piece_type="test")
        assert "M3 S127" in gcode

        # 0% → 0
        gcode = generate_gcode(coords, speed=1000, power=0, piece_type="test")
        assert "M3 S0" in gcode

    def test_power_in_header_comment(self):
        """Power percentage appears in header comment."""
        coords = [(0.0, 0.0), (100.0, 0.0)]
        gcode = generate_gcode(coords, speed=1500, power=75, piece_type="test")

        assert "Power: 75%" in gcode

    def test_speed_in_header_comment(self):
        """Speed appears in header comment."""
        coords = [(0.0, 0.0), (100.0, 0.0)]
        gcode = generate_gcode(coords, speed=1500, power=75, piece_type="test")

        assert "Speed: 1500 mm/min" in gcode


# ---------------------------------------------------------------------------
# 4.5  Default values
# ---------------------------------------------------------------------------

class TestSvgToGcode:
    """AC #5: svg_to_gcode wrapper with default values."""

    def test_default_speed_1000(self):
        """Default speed is 1000 mm/min."""
        svg = '<svg><path d="M 0.0 0.0 L 10.0 0.0"/></svg>'
        gcode = svg_to_gcode(svg)

        assert "Speed: 1000 mm/min" in gcode
        assert "F1000" in gcode

    def test_default_power_80(self):
        """Default power is 80%."""
        svg = '<svg><path d="M 0.0 0.0 L 10.0 0.0"/></svg>'
        gcode = svg_to_gcode(svg)

        assert "Power: 80%" in gcode
        # 80% → PWM 204
        assert "M3 S204" in gcode

    def test_custom_speed_power(self):
        """Custom speed and power override defaults."""
        svg = '<svg><path d="M 0.0 0.0 L 10.0 0.0"/></svg>'
        gcode = svg_to_gcode(svg, speed=500, power=50)

        assert "Speed: 500 mm/min" in gcode
        assert "Power: 50%" in gcode
        assert "F500" in gcode
        assert "M3 S127" in gcode

    def test_piece_type_in_gcode(self):
        """piece_type appears in G-code header."""
        svg = '<svg><path d="M 0.0 0.0 L 10.0 0.0"/></svg>'
        gcode = svg_to_gcode(svg, piece_type="sleeve")

        assert "; Pattern Piece: sleeve" in gcode

    def test_empty_svg_returns_empty_gcode(self):
        """SVG without path returns empty G-code."""
        svg = '<svg><rect/></svg>'
        gcode = svg_to_gcode(svg)

        assert gcode == ""


# ---------------------------------------------------------------------------
# Integration: Full SVG → G-code pipeline
# ---------------------------------------------------------------------------

class TestFullPipeline:
    """Integration tests for complete SVG to G-code conversion."""

    def test_bodice_svg_to_gcode(self):
        """Convert actual bodice SVG to G-code."""
        params = generate_bodice(MEASUREMENTS, offset=0.0)
        svg = render_bodice_svg(params, piece_type="back_bodice")
        gcode = svg_to_gcode(svg, speed=1000, power=80, piece_type="back_bodice")

        # Verify G-code structure
        assert "; Pattern Piece: back_bodice" in gcode
        assert "G90" in gcode
        assert "G21" in gcode
        assert "M3 S204" in gcode
        assert "G1" in gcode  # Has cutting commands
        assert "M5" in gcode
        assert "; End of piece" in gcode

    def test_sleeve_svg_to_gcode(self):
        """Convert actual sleeve SVG to G-code."""
        params = generate_sleeve(MEASUREMENTS)
        svg = render_sleeve_svg(params)
        gcode = svg_to_gcode(svg, speed=1500, power=90, piece_type="sleeve")

        # Verify G-code structure
        assert "; Pattern Piece: sleeve" in gcode
        assert "F1500" in gcode
        # 90% → PWM 229
        assert "M3 S229" in gcode

    def test_gcode_coordinates_are_in_mm(self):
        """G-code coordinates should be in millimeters (10x SVG cm)."""
        # Simple SVG with known coordinates in cm
        svg = '<svg><path d="M 5.0 10.0 L 15.0 20.0"/></svg>'
        gcode = svg_to_gcode(svg)

        # Should have mm coordinates (cm * 10)
        assert "X50.0 Y100.0" in gcode   # Move to start
        assert "X150.0 Y200.0" in gcode  # Cut to end
