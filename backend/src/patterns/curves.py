"""Shared curve geometry for the pattern engine (Story 11.7).

Single source of truth for the bodice raglan-seam control points, so the RENDERED
curve (svg_export) and the MEASURED curve (FR93 perimeter) never drift apart.
Pure math, no external deps — keeps patterns/ independent of geometry/ and agents/.
"""

import math


def cubic_point(p0, c1, c2, p3, t):
    """Point on a cubic Bézier at parameter t∈[0,1]."""
    mt = 1 - t
    x = mt**3 * p0[0] + 3 * mt**2 * t * c1[0] + 3 * mt * t**2 * c2[0] + t**3 * p3[0]
    y = mt**3 * p0[1] + 3 * mt**2 * t * c1[1] + 3 * mt * t**2 * c2[1] + t**3 * p3[1]
    return (x, y)


def cubic_length(p0, c1, c2, p3, samples: int = 64) -> float:
    """Arc length of a cubic Bézier by polyline sampling."""
    pts = [cubic_point(p0, c1, c2, p3, i / samples) for i in range(samples + 1)]
    return polyline_length(pts)


def polyline_length(points) -> float:
    """Sum of segment lengths along a list of (x, y) points."""
    total = 0.0
    for (x0, y0), (x1, y1) in zip(points, points[1:]):
        total += math.hypot(x1 - x0, y1 - y0)
    return total


def bodice_raglan_seam_controls(params: dict):
    """Control points (p0, c1, c2, p3) of the bodice raglan seam (neck-shoulder → underarm).

    MUST match render_bodice_svg's raglan-seam cubic exactly — both call this.
    p0 = neck-shoulder point; p3 = underarm/bust point; the seam scoops inward
    (cơi 0.2 mid, 1.5 lower-third) per the artisan divided-curve construction.
    """
    ns = (params["neck_width"], -params["shoulder_rise"])
    bu = (params["bust_width"], params["armhole_drop"])
    dx, dy = bu[0] - ns[0], bu[1] - ns[1]
    c1 = (ns[0] + dx * 0.33 - 0.2, ns[1] + dy * 0.33)
    c2 = (ns[0] + dx * 0.66 - 1.5, ns[1] + dy * 0.66)
    return ns, c1, c2, bu


def bodice_armhole_perimeter(params: dict) -> float:
    """Length of the drawn armhole/raglan-seam curve for one bodice piece (cm)."""
    return cubic_length(*bodice_raglan_seam_controls(params))


def quarter_ellipse_length(rx: float, ry: float, samples: int = 64) -> float:
    """Arc length of a quarter ellipse (rx, ry) — the bodice neckline scoop."""
    pts = []
    for i in range(samples + 1):
        theta = (i / samples) * (math.pi / 2)
        pts.append((rx * math.sin(theta), ry * math.cos(theta)))
    return polyline_length(pts)


def bodice_neckline_length(params: dict) -> float:
    """Length of one bodice piece's drawn neckline scoop (half-pattern, cm).

    The neckline is the quarter-ellipse arc rx=neck_width, ry=neck_depth+shoulder_rise
    that render_bodice_svg draws as the `A` command — measured here so the collar matches
    exactly what the bodice neckline is (Story 11.8).
    """
    return quarter_ellipse_length(params["neck_width"], params["neck_depth"] + params["shoulder_rise"])


# --- Set-in sleeve cap (Story 11.7 / FR93) ---------------------------------------

def setin_cap_controls(bicep_width: float, cap_height: float):
    """Two cubic halves of a symmetric set-in sleeve cap.

    Centre axis x=0, cap top at (0,0), underarms at (±bicep_width, cap_height).
    Returns (left_controls, right_controls), each a 4-tuple of (x,y) points.
    The classic cap is convex: it rises steeply at the underarm and flattens at the top.
    """
    bw, ch = bicep_width, cap_height
    left = ((-bw, ch), (-bw, ch * 0.45), (-bw * 0.45, 0.0), (0.0, 0.0))
    right = ((0.0, 0.0), (bw * 0.45, 0.0), (bw, ch * 0.45), (bw, ch))
    return left, right


def setin_cap_perimeter(bicep_width: float, cap_height: float) -> float:
    """Total arc length of both set-in cap halves (cm)."""
    left, right = setin_cap_controls(bicep_width, cap_height)
    return cubic_length(*left) + cubic_length(*right)


def solve_setin_cap_height(bicep_width: float, target_perimeter: float,
                           tol: float = 0.5, max_height: float = 40.0):
    """Binary-search the cap height so the cap perimeter == target (within tol cm).

    This is the FR93 mechanism: the sleeve cap is sized FROM the body armhole
    (target = body armhole perimeter + ease), not from an independent formula.

    Returns the solved cap_height (cm).
    Raises ValueError (Vietnamese, FR99 style) if the target is geometrically infeasible:
      - too small: even a flat cap (the straight chord = 2*bicep_width) is longer than target
        → bicep is too wide for this armhole.
      - too large: even max_height cannot reach the target → armhole far larger than the arm.
    """
    chord = 2 * bicep_width  # perimeter at cap_height → 0 approaches the straight chord
    if target_perimeter < chord - tol:
        raise ValueError(
            "Không dựng được đầu tay tra: vòng nách quá nhỏ so với bắp tay "
            f"(chu vi nách + cử động = {target_perimeter:.1f}cm < bề ngang bắp tay {chord:.1f}cm). "
            "Kiểm tra lại vòng nách / vòng bắp tay."
        )
    if setin_cap_perimeter(bicep_width, max_height) < target_perimeter - tol:
        raise ValueError(
            "Không dựng được đầu tay tra: vòng nách quá lớn so với bắp tay "
            f"(cần chu vi đầu tay {target_perimeter:.1f}cm vượt giới hạn). Kiểm tra lại số đo."
        )
    lo, hi = 0.0, max_height
    for _ in range(40):  # 40 iterations → sub-micron convergence, deterministic
        mid = (lo + hi) / 2
        if setin_cap_perimeter(bicep_width, mid) < target_perimeter:
            lo = mid
        else:
            hi = mid
    return round((lo + hi) / 2, 1)
