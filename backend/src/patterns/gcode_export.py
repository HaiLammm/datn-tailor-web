"""G-code export from SVG pattern data (Story 11.3).

Converts SVG path data to G-code for laser cutting.
Conventions:
  - SVG units are in cm, G-code uses mm (multiply by 10)
  - Coordinates rounded to 1 decimal (0.1mm precision)
  - Standard laser cutter dialect: G0/G1, M3/M5
  - PWM power: power_percent * 255 / 100
  - Arc commands (A) are converted to polyline segments for compatibility
"""

import math
import re
from datetime import datetime, timezone


def _fmt(v: float) -> str:
    """Format a float coordinate to 1 decimal place."""
    return f"{v:.1f}"


def parse_svg_path(svg_data: str) -> list[tuple[float, float]]:
    """Parse SVG path d attribute into coordinate list.

    Args:
        svg_data: Full SVG markup string containing <path d="..."> element.

    Returns:
        List of (x, y) coordinates in mm (converted from cm).
        Coordinates represent the cutting path for the laser cutter.

    Parsing strategy:
      1. Extract `d` attribute from <path> element
      2. Tokenize: M (moveto), L (lineto), A (arc), Z (close) commands
      3. Convert A (arc) to polyline approximation (G-code compatibility)
      4. Scale: SVG cm → G-code mm (multiply by 10)
    """
    # Extract d attribute from path element
    path_match = re.search(r'<path[^>]+d="([^"]+)"', svg_data)
    if not path_match:
        return []

    d_attr = path_match.group(1)
    coordinates: list[tuple[float, float]] = []
    current_x, current_y = 0.0, 0.0
    start_x, start_y = 0.0, 0.0  # For Z (close path) command

    # Tokenize path commands
    # Pattern matches: command letter followed by numbers (with optional decimals/signs)
    tokens = re.findall(r'([MLAZ])\s*([\d\s.\-,]*)', d_attr, re.IGNORECASE)

    for cmd, params_str in tokens:
        cmd = cmd.upper()
        # Parse numeric parameters
        params = [float(p) for p in re.findall(r'[\d.\-]+', params_str)]

        if cmd == 'M':  # Move to
            if len(params) >= 2:
                current_x, current_y = params[0], params[1]
                start_x, start_y = current_x, current_y
                # Convert cm to mm
                coordinates.append((current_x * 10, current_y * 10))

        elif cmd == 'L':  # Line to
            if len(params) >= 2:
                current_x, current_y = params[0], params[1]
                coordinates.append((current_x * 10, current_y * 10))

        elif cmd == 'A':  # Arc - convert to polyline
            # A rx ry x-rotation large-arc-flag sweep-flag x y
            if len(params) >= 7:
                rx, ry = params[0], params[1]
                # x_rotation = params[2]  # Not used for ellipse approximation
                # large_arc = params[3]
                # sweep = params[4]
                end_x, end_y = params[5], params[6]

                # Convert arc to polyline approximation
                arc_points = _arc_to_polyline(
                    current_x, current_y,
                    end_x, end_y,
                    rx, ry,
                    num_segments=20
                )
                for px, py in arc_points:
                    coordinates.append((px * 10, py * 10))

                current_x, current_y = end_x, end_y

        elif cmd == 'Z':  # Close path - return to start
            if (current_x, current_y) != (start_x, start_y):
                coordinates.append((start_x * 10, start_y * 10))
            current_x, current_y = start_x, start_y

    return coordinates


def _arc_to_polyline(
    x_start: float, y_start: float,
    x_end: float, y_end: float,
    rx: float, ry: float,
    num_segments: int = 20
) -> list[tuple[float, float]]:
    """Convert elliptical arc to line segments for G-code compatibility.

    Uses parametric interpolation for simplified arc approximation.
    Most laser cutters don't support G2/G3 arc commands reliably,
    so we approximate with straight line segments.

    Args:
        x_start, y_start: Start point (cm)
        x_end, y_end: End point (cm)
        rx, ry: Ellipse radii (cm)
        num_segments: Number of line segments to approximate arc

    Returns:
        List of (x, y) coordinates representing the arc as line segments.
    """
    points: list[tuple[float, float]] = []

    # Use parametric interpolation along the arc
    # This is a simplified approximation that works well for quarter/half ellipses
    for i in range(1, num_segments + 1):
        t = i / num_segments

        # Bezier-like interpolation for smoother arcs
        # Mid-point control for elliptical shape
        mid_x = (x_start + x_end) / 2
        mid_y = (y_start + y_end) / 2

        # Calculate arc deviation based on radii
        # The arc bulges perpendicular to the chord
        chord_len = math.sqrt((x_end - x_start) ** 2 + (y_end - y_start) ** 2)
        if chord_len > 0:
            # Direction perpendicular to chord
            perp_x = -(y_end - y_start) / chord_len
            perp_y = (x_end - x_start) / chord_len

            # Arc height at midpoint (approximation using average radius)
            avg_radius = (rx + ry) / 2
            arc_height = avg_radius * 0.5  # Simplified arc height factor

            # Quadratic bezier interpolation
            # P = (1-t)^2 * P0 + 2(1-t)t * Pmid + t^2 * P1
            ctrl_x = mid_x + perp_x * arc_height
            ctrl_y = mid_y + perp_y * arc_height

            x = (1 - t) ** 2 * x_start + 2 * (1 - t) * t * ctrl_x + t ** 2 * x_end
            y = (1 - t) ** 2 * y_start + 2 * (1 - t) * t * ctrl_y + t ** 2 * y_end
        else:
            x = x_end
            y = y_end

        points.append((x, y))

    return points


def generate_gcode(
    coordinates: list[tuple[float, float]],
    speed: int,
    power: int,
    piece_type: str
) -> str:
    """Generate G-code from coordinate list.

    Args:
        coordinates: List of (x, y) coordinates in mm.
        speed: Cutting speed in mm/min.
        power: Laser power as percentage (0-100).
        piece_type: Pattern piece name for comments.

    Returns:
        G-code string ready for laser cutter.

    G-code structure (FR95 compliance):
      - Header comments (piece_type, timestamp, params)
      - G90 absolute positioning
      - G21 metric units (mm)
      - Move to start (G0 X Y)
      - Laser on (M3 S{pwm})
      - Cutting passes (G1 X Y F{speed})
      - Close path (return to start coordinate)
      - Laser off (M5)
      - Return home (G0 X0 Y0)
    """
    if not coordinates:
        return ""

    # PWM conversion: power_percent * 255 / 100
    power_pwm = int(power * 255 / 100)
    timestamp = datetime.now(timezone.utc).isoformat()

    lines: list[str] = []

    # Header comments
    lines.append(f"; Pattern Piece: {piece_type}")
    lines.append(f"; Generated: {timestamp}")
    lines.append(f"; Speed: {speed} mm/min, Power: {power}%")
    lines.append("")

    # Setup commands
    lines.append("G90          ; Absolute positioning")
    lines.append("G21          ; Metric units (mm)")
    lines.append("")

    # Move to start position (no cutting)
    start_x, start_y = coordinates[0]
    lines.append(f"G0 X{_fmt(start_x)} Y{_fmt(start_y)}     ; Move to start")
    lines.append("")

    # Laser on with power
    lines.append(f"M3 S{power_pwm}      ; Laser on ({power}% = {power_pwm}/255 PWM)")
    lines.append("")

    # Cutting path - start from second coordinate since we moved to first
    lines.append("; Begin cutting path")
    for i, (x, y) in enumerate(coordinates[1:], start=1):
        lines.append(f"G1 X{_fmt(x)} Y{_fmt(y)} F{speed}")

    # Ensure closed path - check if last coord equals first
    last_x, last_y = coordinates[-1]
    if (abs(last_x - start_x) > 0.1) or (abs(last_y - start_y) > 0.1):
        lines.append(f"G1 X{_fmt(start_x)} Y{_fmt(start_y)} F{speed}   ; Close path")

    lines.append("")

    # End sequence
    lines.append("M5           ; Laser off")
    lines.append("G0 X0 Y0     ; Return home")
    lines.append("")
    lines.append("; End of piece")

    return "\n".join(lines)


def svg_to_gcode(
    svg_data: str,
    speed: int = 1000,
    power: int = 80,
    piece_type: str = ""
) -> str:
    """Convert SVG pattern data to G-code.

    Wrapper function that combines parsing and generation.

    Args:
        svg_data: Full SVG markup string.
        speed: Cutting speed in mm/min (default: 1000).
        power: Laser power percentage 0-100 (default: 80).
        piece_type: Pattern piece name for G-code comments.

    Returns:
        G-code string ready for laser cutter.
    """
    coordinates = parse_svg_path(svg_data)
    return generate_gcode(coordinates, speed, power, piece_type)
