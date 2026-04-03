"""Pattern Engine Orchestrator (Story 11.2).

Orchestrates formula calculation + SVG rendering for all 3 pattern pieces.
Independent module: no imports from geometry/, agents/, or constraints/.
Target: < 50ms for 3 pieces on standard CPU (deterministic math only).
"""

from dataclasses import dataclass
from typing import Any

from src.patterns.formulas import generate_bodice, generate_sleeve
from src.patterns.svg_export import render_bodice_svg, render_sleeve_svg


@dataclass
class PieceResult:
    """Result for a single generated pattern piece."""

    piece_type: str        # 'front_bodice' | 'back_bodice' | 'sleeve'
    svg_data: str          # SVG markup string
    geometry_params: dict  # Computed geometric parameters (GeometryParams-compatible)


def generate_pattern_pieces(measurements: dict[str, Any]) -> list[PieceResult]:
    """Generate all 3 pattern pieces from a set of 10 body measurements.

    Args:
        measurements: Dict with keys matching PatternSessionDB column names:
            do_dai_ao, ha_eo, vong_co, vong_nach, vong_nguc, vong_eo,
            vong_mong, do_dai_tay, vong_bap_tay, vong_co_tay

    Returns:
        List of exactly 3 PieceResult instances:
            [front_bodice, back_bodice, sleeve]

    Raises:
        KeyError: If any required measurement key is missing.
        ValueError: If measurement values are out of expected range (should be pre-validated by Pydantic).
    """
    # Front bodice: offset = -1 cm (AC #3)
    front_params = generate_bodice(measurements, offset=-1.0)
    front_svg = render_bodice_svg(front_params, piece_type="front_bodice")

    # Back bodice: offset = 0 cm (AC #3)
    back_params = generate_bodice(measurements, offset=0.0)
    back_svg = render_bodice_svg(back_params, piece_type="back_bodice")

    # Sleeve (AC #5)
    sleeve_params = generate_sleeve(measurements)
    sleeve_svg = render_sleeve_svg(sleeve_params)

    return [
        PieceResult(piece_type="front_bodice", svg_data=front_svg, geometry_params=front_params),
        PieceResult(piece_type="back_bodice", svg_data=back_svg, geometry_params=back_params),
        PieceResult(piece_type="sleeve", svg_data=sleeve_svg, geometry_params=sleeve_params),
    ]
