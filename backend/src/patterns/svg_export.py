"""SVG rendering from geometry parameters (Story 11.2).

Generates standalone SVG markup for pattern pieces.
Conventions:
  - ViewBox units are in centimeters (1:1 scale)
  - Uses <path> elements with M (moveto), L (lineto), A (arc), Z (close)
  - Armhole: 1/4 ellipse arc  →  A {armhole_drop} {bust_width} 0 0 1 ex ey  (AC #4)
  - Sleeve cap: 1/2 ellipse arc → A {cap_height} {bicep_width} 0 1 0 ex ey  (AC #5)
  - Coordinates rounded to 1 decimal (0.1 mm precision)
  - Each SVG is self-contained (standalone document with xmlns)
  - Target: < 50 KB per piece
"""


def _fmt(v: float) -> str:
    """Format a float coordinate to 1 decimal place."""
    return f"{v:.1f}"


def render_bodice_svg(params: dict, piece_type: str) -> str:
    """Render front or back bodice as SVG markup.

    Args:
        params: Geometry params dict from formulas.generate_bodice().
        piece_type: 'front_bodice' or 'back_bodice' (for SVG id / title).

    Returns:
        SVG markup string (standalone, < 50KB).

    Shape (simplified Áo dài bodice outline):
      - Starts at top-left (neck point)
      - Draws neckline arc inward
      - Draws shoulder line to armhole
      - Drops armhole curve (1/4 ellipse)
      - Draws side seam down to hip
      - Draws hem line (fixed width 37cm)
      - Closes path
    """
    bust_width = params["bust_width"]
    waist_width = params["waist_width"]
    hip_width = params["hip_width"]
    armhole_drop = params["armhole_drop"]
    neck_depth = params["neck_depth"]
    hem_width = params["hem_width"]
    seam_allowance = params["seam_allowance"]

    # Derived layout coordinates (origin = top-left of SVG)
    # All in cm with seam allowance added to outer edges
    neck_x = 0.0
    neck_y = 0.0
    shoulder_x = bust_width + seam_allowance
    shoulder_y = 0.0
    armhole_end_x = shoulder_x
    armhole_end_y = armhole_drop
    # Side seam follows bust → waist → hip
    hip_end_x = hip_width + seam_allowance
    # Approximated total length from measurements (use 60cm default for bodice)
    bodice_length = 60.0
    hem_y = bodice_length
    hem_end_x = hem_width / 2 + seam_allowance

    # Armhole arc: 1/4 ellipse (AC #4)
    # A {rx} {ry} x-rotation large-arc-flag sweep-flag x y
    # semi_major_axis = armhole_drop, semi_minor_axis = bust_width
    armhole_arc = (
        f"A {_fmt(armhole_drop)} {_fmt(bust_width)} 0 0 1 "
        f"{_fmt(armhole_end_x)} {_fmt(armhole_end_y)}"
    )

    # Build path: simplified outline of bodice shape
    # neck point → shoulder → armhole (arc) → side seam → hem → centre fold → neck depth → close
    path_d = (
        f"M {_fmt(neck_x)} {_fmt(neck_y)} "
        f"L {_fmt(shoulder_x - bust_width)} {_fmt(neck_depth)} "   # neck curve down
        f"L {_fmt(shoulder_x)} {_fmt(neck_depth)} "                 # shoulder point
        f"{armhole_arc} "                                           # armhole curve
        f"L {_fmt(waist_width + seam_allowance)} {_fmt(bodice_length * 0.45)} "  # waist
        f"L {_fmt(hip_end_x)} {_fmt(bodice_length * 0.65)} "       # hip
        f"L {_fmt(hem_end_x)} {_fmt(hem_y)} "                       # hem corner
        f"L {_fmt(0.0)} {_fmt(hem_y)} "                             # hem-centre
        f"L {_fmt(neck_x)} {_fmt(neck_depth)} "                     # centre front/back up
        "Z"
    )

    # Compute viewBox with small margin — use max of all X coordinates to avoid clipping
    margin = 2.0
    vb_x = -margin
    vb_y = -margin
    max_x = max(hem_end_x, shoulder_x, hip_end_x)
    vb_w = max_x + 2 * margin
    vb_h = hem_y + 2 * margin

    title = "Front Bodice" if piece_type == "front_bodice" else "Back Bodice"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{_fmt(vb_x)} {_fmt(vb_y)} {_fmt(vb_w)} {_fmt(vb_h)}" '
        f'width="{_fmt(vb_w)}cm" height="{_fmt(vb_h)}cm">\n'
        f'  <title>{title} Pattern Piece</title>\n'
        f'  <path id="{piece_type}" d="{path_d}" '
        f'fill="none" stroke="#000" stroke-width="0.1"/>\n'
        f'</svg>'
    )
    return svg


def render_sleeve_svg(params: dict) -> str:
    """Render sleeve pattern piece as SVG markup.

    Args:
        params: Geometry params dict from formulas.generate_sleeve().

    Returns:
        SVG markup string (standalone, < 50KB).

    Shape:
      - Sleeve cap: 1/2 ellipse arc (AC #5)
        A {cap_height} {bicep_width} 0 1 0 end_x end_y
      - Side seams taper from bicep to wrist
      - Wrist hem closes the bottom
    """
    cap_height = params["cap_height"]
    bicep_width = params["bicep_width"]
    wrist_width = params["wrist_width"]
    sleeve_length = params["sleeve_length"]

    # Layout: cap centred on x-axis
    cap_start_x = 0.0
    cap_start_y = cap_height
    cap_end_x = bicep_width * 2
    cap_end_y = cap_height

    # Sleeve cap: half-ellipse arc (AC #5)
    # A {rx=cap_height} {ry=bicep_width} x-rotation large-arc-flag sweep-flag ex ey
    sleeve_cap_arc = (
        f"A {_fmt(cap_height)} {_fmt(bicep_width)} 0 1 0 "
        f"{_fmt(cap_end_x)} {_fmt(cap_end_y)}"
    )

    # Taper from bicep to wrist over sleeve length
    wrist_offset = (bicep_width - wrist_width)
    wrist_left_x = wrist_offset
    wrist_right_x = cap_end_x - wrist_offset
    hem_y = cap_height + sleeve_length

    path_d = (
        f"M {_fmt(cap_start_x)} {_fmt(cap_start_y)} "
        f"{sleeve_cap_arc} "                                          # cap arc
        f"L {_fmt(wrist_right_x)} {_fmt(hem_y)} "                    # right seam to wrist
        f"L {_fmt(wrist_left_x)} {_fmt(hem_y)} "                     # wrist hem
        f"L {_fmt(cap_start_x)} {_fmt(cap_start_y)} "                # left seam back up
        "Z"
    )

    margin = 2.0
    vb_x = -margin
    vb_y = -margin
    vb_w = cap_end_x + 2 * margin
    vb_h = hem_y + 2 * margin

    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{_fmt(vb_x)} {_fmt(vb_y)} {_fmt(vb_w)} {_fmt(vb_h)}" '
        f'width="{_fmt(vb_w)}cm" height="{_fmt(vb_h)}cm">\n'
        f'  <title>Sleeve Pattern Piece</title>\n'
        f'  <path id="sleeve" d="{path_d}" '
        f'fill="none" stroke="#000" stroke-width="0.1"/>\n'
        f'</svg>'
    )
    return svg
