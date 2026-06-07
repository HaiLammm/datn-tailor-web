"""Pattern Engine Orchestrator (Story 11.2).

Orchestrates formula calculation + SVG rendering for all pattern pieces
(front/back bodice, sleeve, collar).
Independent module: no imports from geometry/, agents/, or constraints/.
Target: < 50ms for 3 pieces on standard CPU (deterministic math only).
"""

from dataclasses import dataclass
from typing import Any

from src.patterns.curves import bodice_armhole_perimeter, bodice_neckline_length
from src.patterns.formulas import generate_bodice, generate_collar, generate_sleeve
from src.patterns.svg_export import (
    render_bodice_svg,
    render_collar_svg,
    render_setin_sleeve_svg,
    render_sleeve_svg,
)


@dataclass
class PieceResult:
    """Result for a single generated pattern piece."""

    piece_type: str        # 'front_bodice' | 'back_bodice' | 'sleeve'
    svg_data: str          # SVG markup string
    geometry_params: dict  # Computed geometric parameters (GeometryParams-compatible)


def generate_pattern_pieces(
    measurements: dict[str, Any], sleeve_type: str = "raglan"
) -> list[PieceResult]:
    """Generate the pattern pieces from a set of body measurements (SCP 2026-06-08).

    Produces a RAGLAN áo dài by default (front bodice, back bodice, sleeve). Front and
    back bodice now diverge in more than one dimension (see formulas.generate_bodice).

    Args:
        measurements: Dict with keys matching PatternSessionDB column names:
            do_dai_ao, ha_eo, vong_co, vong_nach, vong_nguc, vong_eo,
            vong_mong, do_dai_tay, vong_bap_tay, vong_co_tay (+ optional new fields).
        sleeve_type: 'raglan' (default, tay liền cổ) or 'set_in' (tay tra). For set_in the
            sleeve cap is sized from the front+back body armhole perimeter (FR93, Story 11.7).

    Returns:
        List of PieceResult instances: [front_bodice, back_bodice, sleeve, collar].

    Raises:
        ValueError: If a required measurement key is missing, sleeve_type is invalid, or the
            measurements are geometrically infeasible (Vietnamese message).
    """
    front_params = generate_bodice(measurements, piece="front_bodice")
    front_svg = render_bodice_svg(front_params, piece_type="front_bodice")

    back_params = generate_bodice(measurements, piece="back_bodice")
    back_svg = render_bodice_svg(back_params, piece_type="back_bodice")

    if sleeve_type == "set_in":
        # FR93: size the set-in cap FROM the drawn body armhole (front + back).
        armhole = bodice_armhole_perimeter(front_params) + bodice_armhole_perimeter(back_params)
        sleeve_params = generate_sleeve(
            measurements, sleeve_type="set_in", body_armhole_perimeter=armhole
        )
        sleeve_svg = render_setin_sleeve_svg(sleeve_params)
    else:
        sleeve_params = generate_sleeve(measurements, sleeve_type="raglan")
        sleeve_svg = render_sleeve_svg(sleeve_params)

    # Collar (lá cổ) sized from the drawn neck circumference (Story 11.8).
    # Full neck = both halves of front + both halves of back (pieces are cut on fold).
    neck_perimeter = 2 * (bodice_neckline_length(front_params) + bodice_neckline_length(back_params))
    collar_params = generate_collar(neck_perimeter)
    collar_svg = render_collar_svg(collar_params)

    return [
        PieceResult(piece_type="front_bodice", svg_data=front_svg, geometry_params=front_params),
        PieceResult(piece_type="back_bodice", svg_data=back_svg, geometry_params=back_params),
        PieceResult(piece_type="sleeve", svg_data=sleeve_svg, geometry_params=sleeve_params),
        PieceResult(piece_type="collar", svg_data=collar_svg, geometry_params=collar_params),
    ]
