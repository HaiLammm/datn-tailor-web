"""SVG rendering from geometry parameters (Story 11.3, corrected SCP 2026-06-08).

Draws a RAGLAN áo dài half-bodice (cut on fold) and a symmetric raglan sleeve, using
the corrected dimensions from formulas.py. Fixes audit defects G1–G10:
  G1/G2 — vertical positions come from do_dai_ao/ha_eo/hip_drop, no hard-coded 60 cm.
  G3    — raglan seam is a real, non-degenerate curve from neck to underarm.
  G4/G5 — sleeve cap curves bulge outward (no reversed sweep / self-intersection).
  G6    — neck width = vong_co/8±x, decoupled from seam allowance.
  G7    — shoulder has a small rise; raglan replaces the flat absolute shoulder.
  G8    — hem_width (mong/4+2) > hip_width (mong/4+1): side seam never inverts.
  G9    — net pattern line drawn; seam allowance is a separate per-edge offset (TODO param).
  G10   — neckline is a curve (A arc), seams are curves (C), not straight L segments.

Conventions:
  - ViewBox units are centimetres (1:1 scale, FR94).
  - Bodice: centre fold at x=0, widths to +x; y=0 at shoulder line, +y downward.
  - Sleeve: centre axis at x=0, symmetric ±x; y=0 at cap top, +y downward.
  - Coordinates rounded to 0.1 cm (0.1 mm precision is overkill; 1 mm is the tolerance).
"""

from src.patterns.curves import bodice_raglan_seam_controls, setin_cap_controls


def _fmt(v: float) -> str:
    """Format a float coordinate to 1 decimal place."""
    return f"{v:.1f}"


def _svg_document(title: str, piece_id: str, path_d: str,
                  vb_x: float, vb_y: float, vb_w: float, vb_h: float,
                  extra: str = "") -> str:
    """Wrap a path in a standalone SVG document (1:1 scale, cm units)."""
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{_fmt(vb_x)} {_fmt(vb_y)} {_fmt(vb_w)} {_fmt(vb_h)}" '
        f'width="{_fmt(vb_w)}cm" height="{_fmt(vb_h)}cm">\n'
        f'  <title>{title}</title>\n'
        f'  <path id="{piece_id}" d="{path_d}" fill="none" stroke="#000" stroke-width="0.1"/>\n'
        f'{extra}'
        f'</svg>'
    )


def render_bodice_svg(params: dict, piece_type: str) -> str:
    """Render a raglan front/back bodice half-pattern (cut on fold) as SVG.

    Outline (clockwise from centre-neck): centre-neck → neckline arc → neck-shoulder
    point → raglan seam (curve) → underarm/bust point → side seam (waist, hip) →
    flared hem → centre hem → centre fold (Z).
    """
    length = params["length"]
    armhole_drop = params["armhole_drop"]
    waist_drop = params["waist_drop"]
    hip_drop = params["hip_drop"]
    neck_width = params["neck_width"]
    neck_depth = params["neck_depth"]
    shoulder_rise = params["shoulder_rise"]
    bust_width = params["bust_width"]
    waist_width = params["waist_width"]
    hip_width = params["hip_width"]
    hem_width = params["hem_width"]

    # Key points (x from centre fold, y down from shoulder line)
    nc_x, nc_y = 0.0, neck_depth                 # centre-neck
    ns_x, ns_y = neck_width, -shoulder_rise      # neck-shoulder point (raised)
    bu_x, bu_y = bust_width, armhole_drop        # underarm / bust point

    # Neckline scoop as an elliptical arc (G10)
    neck_arc = (
        f"A {_fmt(neck_width)} {_fmt(neck_depth + shoulder_rise)} 0 0 1 "
        f"{_fmt(ns_x)} {_fmt(ns_y)}"
    )

    # Raglan seam: cubic curve scooping inward in 3 segments (cơi 0.2 / 1.5) — G3/G10.
    # Control points come from curves.py so the MEASURED armhole (FR93) matches what we draw.
    _, c1, c2, _ = bodice_raglan_seam_controls(params)
    raglan_seam = (
        f"C {_fmt(c1[0])} {_fmt(c1[1])} {_fmt(c2[0])} {_fmt(c2[1])} "
        f"{_fmt(bu_x)} {_fmt(bu_y)}"
    )

    path_d = (
        f"M {_fmt(nc_x)} {_fmt(nc_y)} "
        f"{neck_arc} "                                   # neckline
        f"{raglan_seam} "                                # raglan seam to underarm
        f"L {_fmt(waist_width)} {_fmt(waist_drop)} "     # side seam → waist
        f"L {_fmt(hip_width)} {_fmt(hip_drop)} "         # → hip
        f"L {_fmt(hem_width)} {_fmt(length)} "           # flared hem corner (hem > hip)
        f"L 0.0 {_fmt(length)} "                         # hem → centre
        "Z"                                              # centre fold up to start
    )

    margin = 2.0
    max_x = max(hem_width, bust_width, waist_width, hip_width, neck_width)
    title = "Front Bodice" if piece_type == "front_bodice" else "Back Bodice"
    return _svg_document(
        f"{title} Pattern Piece (raglan)", piece_type, path_d,
        vb_x=-margin, vb_y=-(shoulder_rise + margin),
        vb_w=max_x + 2 * margin, vb_h=length + shoulder_rise + 2 * margin,
    )


def render_sleeve_svg(params: dict) -> str:
    """Render a symmetric raglan sleeve as SVG.

    Outline: small neckline at top → left raglan seam (curve) to underarm → left side
    seam (underarm → bicep → wrist) → wrist hem → right side seam (mirror) → right
    raglan seam → close. Front/back neck points differ (neck_front vs neck_back).
    """
    sleeve_length = params["sleeve_length"]
    armhole_drop = params["armhole_drop"]
    bicep_offset = params["bicep_offset"]
    bicep_width = params["bicep_width"]
    underarm_width = params["underarm_width"]
    wrist_width = params["wrist_width"]
    neck_front = params["neck_front"]
    neck_back = params["neck_back"]
    neck_rise = params.get("neck_rise", 0.0)

    bicep_y = armhole_drop + bicep_offset

    # Points — left side is the BACK (neck_back, raised by neck_rise), right is FRONT
    nl_x, nl_y = -neck_back, -neck_rise   # neckline left (back) — raised per "lên cổ sau"
    nr_x, nr_y = neck_front, 0.0          # neckline right (front)
    ul_x, ul_y = -underarm_width, armhole_drop
    ur_x, ur_y = underarm_width, armhole_drop
    bl_x, bl_y = -bicep_width, bicep_y
    br_x, br_y = bicep_width, bicep_y
    wl_x, wl_y = -wrist_width, sleeve_length
    wr_x, wr_y = wrist_width, sleeve_length

    # Path runs: neck-left → (cap) → underarm-left → bicep-left → wrist-left →
    # wrist-right → bicep-right → underarm-right → (cap reversed) → neck-right →
    # neckline → close. Left cap drawn neck→underarm; right cap drawn underarm→neck.
    path_d = (
        f"M {_fmt(nl_x)} {_fmt(nl_y)} "
        f"{_raglan_curve(nl_x, nl_y, ul_x, ul_y)} "     # left raglan cap (neck→underarm)
        f"L {_fmt(bl_x)} {_fmt(bl_y)} "                  # left side: underarm → bicep
        f"L {_fmt(wl_x)} {_fmt(wl_y)} "                  # → wrist
        f"L {_fmt(wr_x)} {_fmt(wr_y)} "                  # wrist hem
        f"L {_fmt(br_x)} {_fmt(br_y)} "                  # right side: wrist → bicep
        f"L {_fmt(ur_x)} {_fmt(ur_y)} "                  # → underarm
        f"{_raglan_curve_rev(nr_x, nr_y, ur_x, ur_y)} "  # right raglan cap (underarm→neck)
        f"L {_fmt(nl_x)} {_fmt(nl_y)} "                  # neckline (front → back)
        "Z"
    )

    margin = 2.0
    half_w = max(underarm_width, bicep_width, wrist_width, neck_front, neck_back)
    return _svg_document(
        "Sleeve Pattern Piece (raglan)", "sleeve", path_d,
        vb_x=-(half_w + margin), vb_y=-(neck_rise + margin),
        vb_w=2 * half_w + 2 * margin, vb_h=sleeve_length + neck_rise + 2 * margin,
    )


def render_collar_svg(params: dict) -> str:
    """Render the stand collar (lá cổ) as a strip: length × band (Story 11.8).

    Drawn as a half-strip (cut on fold along the centre back), so width = length/2.
    Cut on the line (no seam offset); a stand collar is a simple rectangle.
    """
    length = params["length"]
    band = params["band"]
    half = length / 2.0   # cut on fold at the centre back

    path_d = (
        f"M 0.0 0.0 "
        f"L {_fmt(half)} 0.0 "
        f"L {_fmt(half)} {_fmt(band)} "
        f"L 0.0 {_fmt(band)} "
        "Z"
    )
    margin = 1.0
    return _svg_document(
        "Collar Pattern Piece (lá cổ)", "collar", path_d,
        vb_x=-margin, vb_y=-margin,
        vb_w=half + 2 * margin, vb_h=band + 2 * margin,
    )


def render_setin_sleeve_svg(params: dict) -> str:
    """Render a symmetric set-in sleeve (Story 11.7). The cap height was solved so the
    cap perimeter matches the body armhole + ease (FR93); here we just draw it.

    Outline: underarm-left → cap (two cubic halves over the top) → underarm-right →
    side seam to wrist-right → wrist hem → (Z closes wrist-left → underarm-left).
    """
    sleeve_length = params["sleeve_length"]
    cap_height = params["cap_height"]
    bicep_width = params["bicep_width"]
    wrist_width = params["wrist_width"]

    (l0, l1, l2, l3), (r0, r1, r2, r3) = setin_cap_controls(bicep_width, cap_height)

    path_d = (
        f"M {_fmt(l0[0])} {_fmt(l0[1])} "                                   # underarm-left
        f"C {_fmt(l1[0])} {_fmt(l1[1])} {_fmt(l2[0])} {_fmt(l2[1])} {_fmt(l3[0])} {_fmt(l3[1])} "  # cap → top
        f"C {_fmt(r1[0])} {_fmt(r1[1])} {_fmt(r2[0])} {_fmt(r2[1])} {_fmt(r3[0])} {_fmt(r3[1])} "  # top → underarm-right
        f"L {_fmt(wrist_width)} {_fmt(sleeve_length)} "                     # right side seam → wrist
        f"L {_fmt(-wrist_width)} {_fmt(sleeve_length)} "                    # wrist hem
        "Z"                                                                 # wrist-left → underarm-left
    )

    margin = 2.0
    half_w = max(bicep_width, wrist_width)
    return _svg_document(
        "Sleeve Pattern Piece (set-in)", "sleeve", path_d,
        vb_x=-(half_w + margin), vb_y=-margin,
        vb_w=2 * half_w + 2 * margin, vb_h=sleeve_length + 2 * margin,
    )


def _raglan_curve(nx: float, ny: float, ux: float, uy: float) -> str:
    """Cubic raglan cap curve from neck point to underarm, bulging outward (G4/G5)."""
    dx, dy = ux - nx, uy - ny
    out = 1.0 if ux >= 0 else -1.0   # pull control points outward so the cap bulges away from body
    cp1_x = nx + dx * 0.33 + out * 1.0
    cp1_y = ny + dy * 0.33
    cp2_x = nx + dx * 0.66 + out * 0.5
    cp2_y = ny + dy * 0.66
    return (
        f"C {_fmt(cp1_x)} {_fmt(cp1_y)} {_fmt(cp2_x)} {_fmt(cp2_y)} "
        f"{_fmt(ux)} {_fmt(uy)}"
    )


def _raglan_curve_rev(nx: float, ny: float, ux: float, uy: float) -> str:
    """Cubic cap curve drawn underarm→neck (reverse of _raglan_curve) for path continuity."""
    dx, dy = nx - ux, ny - uy
    out = 1.0 if ux >= 0 else -1.0
    # control points mirror those of the forward curve so the silhouette matches
    cp1_x = ux + dx * 0.33 + out * 0.5
    cp1_y = uy + dy * 0.33
    cp2_x = ux + dx * 0.66 + out * 1.0
    cp2_y = uy + dy * 0.66
    return (
        f"C {_fmt(cp1_x)} {_fmt(cp1_y)} {_fmt(cp2_x)} {_fmt(cp2_y)} "
        f"{_fmt(nx)} {_fmt(ny)}"
    )
