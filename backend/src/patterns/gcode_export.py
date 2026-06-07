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

    # Tokenize path commands. Supported: M (moveto), L (lineto), A (elliptical arc),
    # C (cubic bézier), Z (close). Corrected SCP 2026-06-08 to honour real arc/curve
    # geometry instead of the prior fake-quadratic approximation (audit G-code defect).
    tokens = re.findall(r'([MLACZ])\s*([\d\s.\-,]*)', d_attr, re.IGNORECASE)

    for cmd, params_str in tokens:
        cmd = cmd.upper()
        params = [float(p) for p in re.findall(r'-?\d+\.?\d*', params_str)]

        if cmd == 'M':  # Move to
            if len(params) >= 2:
                current_x, current_y = params[0], params[1]
                start_x, start_y = current_x, current_y
                coordinates.append((current_x * 10, current_y * 10))

        elif cmd == 'L':  # Line to
            if len(params) >= 2:
                current_x, current_y = params[0], params[1]
                coordinates.append((current_x * 10, current_y * 10))

        elif cmd == 'A':  # Elliptical arc → polyline (true W3C parametrization)
            # A rx ry x-axis-rotation large-arc-flag sweep-flag x y
            if len(params) >= 7:
                rx, ry, phi, large_arc, sweep = params[0:5]
                end_x, end_y = params[5], params[6]
                for px, py in _arc_to_polyline(
                    current_x, current_y, end_x, end_y,
                    rx, ry, phi, int(large_arc), int(sweep),
                ):
                    coordinates.append((px * 10, py * 10))
                current_x, current_y = end_x, end_y

        elif cmd == 'C':  # Cubic bézier → polyline
            # C x1 y1 x2 y2 x y
            if len(params) >= 6:
                c1x, c1y, c2x, c2y, end_x, end_y = params[0:6]
                for px, py in _cubic_to_polyline(
                    current_x, current_y, c1x, c1y, c2x, c2y, end_x, end_y,
                ):
                    coordinates.append((px * 10, py * 10))
                current_x, current_y = end_x, end_y

        elif cmd == 'Z':  # Close path - return to start
            if (current_x, current_y) != (start_x, start_y):
                coordinates.append((start_x * 10, start_y * 10))
            current_x, current_y = start_x, start_y

    return coordinates


def _cubic_to_polyline(
    x0: float, y0: float, x1: float, y1: float,
    x2: float, y2: float, x3: float, y3: float,
    num_segments: int = 24,
) -> list[tuple[float, float]]:
    """Flatten a cubic bézier (P0,P1,P2,P3) into line segments."""
    points: list[tuple[float, float]] = []
    for i in range(1, num_segments + 1):
        t = i / num_segments
        mt = 1 - t
        x = mt**3 * x0 + 3 * mt**2 * t * x1 + 3 * mt * t**2 * x2 + t**3 * x3
        y = mt**3 * y0 + 3 * mt**2 * t * y1 + 3 * mt * t**2 * y2 + t**3 * y3
        points.append((x, y))
    return points


def _arc_to_polyline(
    x1: float, y1: float, x2: float, y2: float,
    rx: float, ry: float, phi_deg: float,
    large_arc: int, sweep: int,
    num_segments: int = 24,
) -> list[tuple[float, float]]:
    """Flatten an SVG elliptical arc into line segments.

    Implements the W3C SVG 1.1 endpoint-to-centre parametrization (F.6.5), so rx/ry,
    rotation, large-arc and sweep flags are all honoured — unlike the prior fake
    quadratic approximation that ignored the flags and produced wrong curvature.
    """
    if rx == 0 or ry == 0 or (x1 == x2 and y1 == y2):
        return [(x2, y2)]
    rx, ry = abs(rx), abs(ry)
    phi = math.radians(phi_deg)
    cos_p, sin_p = math.cos(phi), math.sin(phi)

    dx, dy = (x1 - x2) / 2, (y1 - y2) / 2
    x1p = cos_p * dx + sin_p * dy
    y1p = -sin_p * dx + cos_p * dy

    lam = (x1p**2) / (rx**2) + (y1p**2) / (ry**2)
    if lam > 1:
        s = math.sqrt(lam)
        rx *= s
        ry *= s

    num = rx**2 * ry**2 - rx**2 * y1p**2 - ry**2 * x1p**2
    den = rx**2 * y1p**2 + ry**2 * x1p**2
    coef = math.sqrt(max(0.0, num / den)) if den else 0.0
    if large_arc == sweep:
        coef = -coef
    cxp = coef * (rx * y1p / ry)
    cyp = coef * (-ry * x1p / rx)

    cx = cos_p * cxp - sin_p * cyp + (x1 + x2) / 2
    cy = sin_p * cxp + cos_p * cyp + (y1 + y2) / 2

    def _angle(ux: float, uy: float, vx: float, vy: float) -> float:
        dot = ux * vx + uy * vy
        mag = math.hypot(ux, uy) * math.hypot(vx, vy)
        ang = math.acos(max(-1.0, min(1.0, dot / mag))) if mag else 0.0
        return -ang if (ux * vy - uy * vx) < 0 else ang

    ux, uy = (x1p - cxp) / rx, (y1p - cyp) / ry
    vx, vy = (-x1p - cxp) / rx, (-y1p - cyp) / ry
    theta1 = _angle(1.0, 0.0, ux, uy)
    dtheta = _angle(ux, uy, vx, vy)
    if not sweep and dtheta > 0:
        dtheta -= 2 * math.pi
    elif sweep and dtheta < 0:
        dtheta += 2 * math.pi

    points: list[tuple[float, float]] = []
    for i in range(1, num_segments + 1):
        ang = theta1 + dtheta * (i / num_segments)
        x = cos_p * rx * math.cos(ang) - sin_p * ry * math.sin(ang) + cx
        y = sin_p * rx * math.cos(ang) + cos_p * ry * math.sin(ang) + cy
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
