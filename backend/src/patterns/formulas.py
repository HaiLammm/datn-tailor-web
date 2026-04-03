"""Deterministic bodice and sleeve formula calculations (Story 11.2).

All formulas are tailor-validated and produce float outputs for SVG coordinate math.
Input measurements come as Decimal from the DB — convert to float before any arithmetic.

Formula reference (AC #3, #4, #5):
    Front/Back Bodice (DRY — single function, offset parameter):
        bust_width     = vong_nguc / 4
        waist_width    = (vong_eo / 4) + offset    # offset=0 back, -1 front
        hip_width      = vong_mong / 4
        armhole_drop   = vong_nach / 12
        neck_depth     = vong_co / 16
        hem_width      = 37.0  (fixed constant, cm)
        seam_allowance = 1.0   (auto-added, cm)

    Sleeve:
        cap_height  = vong_nach / 2 - 1
        bicep_width = vong_bap_tay / 2 + 2.5
        wrist_width = vong_co_tay / 2 + 1
        length      = do_dai_tay
"""

from decimal import Decimal
from typing import Any


def _f(value: Decimal | float) -> float:
    """Convert Decimal (from DB Numeric column) to float for formula math."""
    return float(value)


REQUIRED_BODICE_KEYS = ("vong_nguc", "vong_eo", "vong_mong", "vong_nach", "vong_co")
REQUIRED_SLEEVE_KEYS = ("vong_nach", "vong_bap_tay", "vong_co_tay", "do_dai_tay")


def generate_bodice(measurements: dict[str, Any], offset: float = 0.0) -> dict[str, float]:
    """Generate front or back bodice geometry parameters.

    Args:
        measurements: Dict with measurement field names matching PatternSessionDB columns.
        offset: -1.0 for front_bodice, 0.0 for back_bodice (DRY architecture per AC #3).

    Returns:
        Dict of geometry parameters matching GeometryParams Pydantic model fields.

    Raises:
        ValueError: If any required measurement key is missing.
    """
    missing = [k for k in REQUIRED_BODICE_KEYS if k not in measurements]
    if missing:
        raise ValueError(f"Missing required measurements: {', '.join(missing)}")

    vong_nguc = _f(measurements["vong_nguc"])
    vong_eo = _f(measurements["vong_eo"])
    vong_mong = _f(measurements["vong_mong"])
    vong_nach = _f(measurements["vong_nach"])
    vong_co = _f(measurements["vong_co"])

    bust_width = vong_nguc / 4
    waist_width = (vong_eo / 4) + offset
    hip_width = vong_mong / 4
    armhole_drop = vong_nach / 12
    neck_depth = vong_co / 16
    hem_width = 37.0          # fixed constant (cm)
    seam_allowance = 1.0      # auto-added, not user-configurable

    return {
        "bust_width": round(bust_width, 1),
        "waist_width": round(waist_width, 1),
        "hip_width": round(hip_width, 1),
        "armhole_drop": round(armhole_drop, 1),
        "neck_depth": round(neck_depth, 1),
        "hem_width": hem_width,
        "seam_allowance": seam_allowance,
    }


def generate_sleeve(measurements: dict[str, Any]) -> dict[str, float]:
    """Generate sleeve geometry parameters.

    Args:
        measurements: Dict with measurement field names matching PatternSessionDB columns.

    Returns:
        Dict of geometry parameters for the sleeve piece (extends GeometryParams).

    Raises:
        ValueError: If any required measurement key is missing.
    """
    missing = [k for k in REQUIRED_SLEEVE_KEYS if k not in measurements]
    if missing:
        raise ValueError(f"Missing required measurements: {', '.join(missing)}")

    vong_nach = _f(measurements["vong_nach"])
    vong_bap_tay = _f(measurements["vong_bap_tay"])
    vong_co_tay = _f(measurements["vong_co_tay"])
    do_dai_tay = _f(measurements["do_dai_tay"])

    cap_height = vong_nach / 2 - 1
    bicep_width = vong_bap_tay / 2 + 2.5
    wrist_width = vong_co_tay / 2 + 1
    sleeve_length = do_dai_tay

    # Bodice fields are not applicable to sleeve piece; fill with 0 placeholders
    # so GeometryParams model validates cleanly (sleeve_specific fields used instead).
    return {
        "bust_width": 0.0,
        "waist_width": 0.0,
        "hip_width": 0.0,
        "armhole_drop": 0.0,
        "neck_depth": 0.0,
        "hem_width": 0.0,
        "seam_allowance": 1.0,
        # Sleeve-specific
        "cap_height": round(cap_height, 1),
        "bicep_width": round(bicep_width, 1),
        "wrist_width": round(wrist_width, 1),
        "sleeve_length": round(sleeve_length, 1),
    }
