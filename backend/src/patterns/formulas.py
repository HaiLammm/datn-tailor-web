"""Deterministic bodice and sleeve formula calculations (Story 11.2, corrected SCP 2026-06-08).

Formulas are transcribed from the artisan's own sewing-school notebook (mẹ của Lem),
cross-confirmed against an instructional video, and consolidated in:
  _bmad-output/planning-artifacts/research/bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md

Confidence tags in comments: [OK]=multi-source confirmed, [1src]=notebook only,
[infer]=derived, [verify]=needs artisan confirmation.

DEFAULT garment style = RAGLAN (tay liền cổ). Set-in (tay tra) sleeve drafting is
armhole-constrained and lands in Story 11.7. New measurements (darts, shoulder slope)
land in Story 11.8 — until then ha_mong defaults to 18 cm.

Input measurements come as Decimal from the DB — convert to float before any arithmetic.
All outputs are float (cm), rounded to 0.1 cm (1 mm) for SVG coordinate math.
"""

from decimal import Decimal
from typing import Any

from src.patterns.curves import setin_cap_perimeter, solve_setin_cap_height

# Default waist→hip drop when ha_mong measurement is absent (notebook: "18 trung bình") [1src]
DEFAULT_HIP_DROP_CM = 18.0
SEAM_ALLOWANCE_CM = 1.0  # kept for response compatibility; real seam is a per-edge offset (Story 11.3)


def _f(value: Decimal | float) -> float:
    """Convert Decimal (from DB Numeric column) to float for formula math."""
    return float(value)


REQUIRED_BODICE_KEYS = ("vong_nguc", "vong_eo", "vong_mong", "vong_nach", "vong_co", "do_dai_ao", "ha_eo")
REQUIRED_SLEEVE_KEYS = ("vong_nguc", "vong_co", "vong_bap_tay", "vong_co_tay", "do_dai_tay")  # raglan
REQUIRED_SETIN_SLEEVE_KEYS = ("vong_bap_tay", "vong_co_tay", "do_dai_tay")  # set-in (cap from armhole)

_VALID_PIECES = ("front_bodice", "back_bodice")


def generate_bodice(measurements: dict[str, Any], piece: str = "back_bodice") -> dict[str, float]:
    """Generate front or back RAGLAN bodice geometry parameters.

    Front and back differ in MORE than one offset (armhole drop, neck width/depth,
    bust ease, waist ease, length) — so this is a branching function, not a single
    DRY offset. Reference: consolidated table §1 (back) and §2 (front).

    Args:
        measurements: Dict with PatternSessionDB column names.
        piece: 'front_bodice' or 'back_bodice'.

    Returns:
        Dict of geometry parameters (cm). Vertical positions are measured DOWN from
        the shoulder line (y=0); horizontal widths measured from the centre fold (x=0).

    Raises:
        ValueError: If a required measurement is missing or piece is invalid.
    """
    if piece not in _VALID_PIECES:
        raise ValueError(f"piece must be one of {_VALID_PIECES}, got {piece!r}")
    missing = [k for k in REQUIRED_BODICE_KEYS if k not in measurements]
    if missing:
        raise ValueError(f"Missing required measurements: {', '.join(missing)}")

    vong_nguc = _f(measurements["vong_nguc"])
    vong_eo = _f(measurements["vong_eo"])
    vong_mong = _f(measurements["vong_mong"])
    vong_nach = _f(measurements["vong_nach"])
    vong_co = _f(measurements["vong_co"])
    do_dai_ao = _f(measurements["do_dai_ao"])
    ha_eo = _f(measurements["ha_eo"])
    ha_mong = _f(measurements.get("ha_mong", DEFAULT_HIP_DROP_CM))

    is_front = piece == "front_bodice"

    # --- Vertical positions (down from shoulder line) -------------------------
    if is_front:
        armhole_drop = vong_nach / 2                 # [OK] A'C' = nách/2
        length = do_dai_ao + 1.0                     # [infer] + 1 sa vạt only (ben ngực +3 deferred to 11.8)
        shoulder_rise = 0.0                          # front raglan neckline not raised (source: back only)
    else:
        armhole_drop = vong_nach / 2 + 1             # [OK] AC = nách/2 + 1
        length = do_dai_ao                           # [infer] back = base length
        shoulder_rise = 0.5                          # [1src] lên cổ sau 0,5 (back only)
    waist_drop = ha_eo                               # [OK] shared front/back waist line
    hip_drop = ha_eo + ha_mong                       # [1src] hip 18cm below waist

    # --- Horizontal widths (from centre fold) ---------------------------------
    if is_front:
        neck_width = vong_co / 8 + 0.5               # [OK] ngang cổ trước
        neck_depth = vong_co / 8 + 1.5               # [OK] hạ cổ trước (= vào cổ + 1)
        bust_width = vong_nguc / 4 + 1               # [OK] ngang ngực trước
        waist_width = vong_eo / 4 + 4                # [1src] eo/4 + 1 cử + 3 ben
    else:
        neck_width = vong_co / 8 - 1                 # [OK] ngang cổ sau
        neck_depth = 2.0                             # [verify] back neck scoop (notebook silent; sane default)
        bust_width = vong_nguc / 4 + 0.5             # [OK] ngang ngực sau
        waist_width = vong_eo / 4 + 3                # [OK] eo/4 + 1 cử + 2 ben
    neck_width = max(neck_width, 0.5)                # floor: never collapse across the centre fold (P5)
    hip_width = vong_mong / 4 + 1                    # [1src] ngang mông
    hem_width = vong_mong / 4 + 2                    # [OK] ngang tà (always > hip → fixes inverted side seam G8)

    # P4 (revised): catch only GROSS data-entry errors on raw circumferences. A waist
    # near or above the hip is a normal body (apple shape) and must NOT be rejected — the
    # side seam is a function of y so it never self-intersects. Only flag a waist that is
    # implausibly larger than BOTH bust and hip (e.g. typo eo=160 with nguc=mong=50).
    if vong_eo > vong_nguc + 20 and vong_eo > vong_mong + 20:
        raise ValueError(
            f"Vòng eo quá lớn bất thường so với vòng ngực ({vong_nguc:.0f}cm) và vòng mông "
            f"({vong_mong:.0f}cm): vòng eo = {vong_eo:.0f}cm. Kiểm tra lại số đo."
        )
    _validate_bodice_geometry(piece, armhole_drop, waist_drop, hip_drop, length)

    return {
        "piece": piece,
        "length": round(length, 1),
        "armhole_drop": round(armhole_drop, 1),
        "waist_drop": round(waist_drop, 1),
        "hip_drop": round(hip_drop, 1),
        "neck_width": round(neck_width, 1),
        "neck_depth": round(neck_depth, 1),
        "shoulder_rise": round(shoulder_rise, 1),
        "bust_width": round(bust_width, 1),
        "waist_width": round(waist_width, 1),
        "hip_width": round(hip_width, 1),
        "hem_width": round(hem_width, 1),
        "seam_allowance": SEAM_ALLOWANCE_CM,
    }


SLEEVE_CAP_EASE_CM = 3.5  # FR93: total sleeve-cap ease over the body armhole (3–4 cm band)


def generate_sleeve(measurements: dict[str, Any], sleeve_type: str = "raglan",
                    body_armhole_perimeter: float | None = None) -> dict[str, float]:
    """Generate sleeve geometry parameters.

    Reference: consolidated table §3 (raglan), §4–5 (set-in + FR93). Two styles:
      - 'raglan' (tay liền cổ): armhole drop uses VÒNG NGỰC — armhole_drop = vong_nguc/4 - 1.
      - 'set_in' (tay tra): cap is sized FROM the body armhole (FR93) — pass
        body_armhole_perimeter (front+back drawn armhole length); cap perimeter is solved to
        body_armhole_perimeter + SLEEVE_CAP_EASE_CM. This is the artisan rule
        "đầu tay cắt dựa theo đường cong nách" and the fix for audit gap G5.

    Args:
        measurements: Dict with PatternSessionDB column names.
        sleeve_type: 'raglan' or 'set_in'.
        body_armhole_perimeter: required for set_in (cm) — total drawn body armhole.

    Returns:
        Dict of sleeve geometry parameters (cm).

    Raises:
        ValueError: missing measurement, invalid sleeve_type, missing armhole for set_in,
            or geometrically infeasible cap (Vietnamese message).
    """
    if sleeve_type not in ("raglan", "set_in"):
        raise ValueError(f"sleeve_type must be 'raglan' or 'set_in', got {sleeve_type!r}")
    required = REQUIRED_SETIN_SLEEVE_KEYS if sleeve_type == "set_in" else REQUIRED_SLEEVE_KEYS
    missing = [k for k in required if k not in measurements]
    if missing:
        raise ValueError(f"Missing required measurements: {', '.join(missing)}")

    if sleeve_type == "set_in":
        return _generate_setin_sleeve(measurements, body_armhole_perimeter)

    vong_nguc = _f(measurements["vong_nguc"])
    vong_co = _f(measurements["vong_co"])
    vong_bap_tay = _f(measurements["vong_bap_tay"])
    vong_co_tay = _f(measurements["vong_co_tay"])
    do_dai_tay = _f(measurements["do_dai_tay"])

    sleeve_length = do_dai_tay                        # [OK] AB = số đo
    armhole_drop = vong_nguc / 4 - 1                  # [OK] hạ nách tay = ngực/4 − 1
    bicep_offset = 10.0                               # [OK] bicep line 10cm below armhole line
    bicep_width = vong_bap_tay / 2                    # [OK] DF = bắp tay/2 (half, from centre)
    underarm_width = bicep_width + 1                  # [OK] CE = ngang nách tay = bắp tay/2 + 1
    wrist_width = vong_co_tay / 2                     # [OK] cửa tay, split each side of axis
    # P3: wrist must not exceed bicep (else inverted taper / seam splays past the cap)
    wrist_width = min(wrist_width, bicep_width)
    neck_front = vong_co / 8                          # [OK] ngang cổ phía trước = cổ/8
    neck_back = neck_front / 2                        # [1src] phía sau = ½ phía trước
    neck_rise = 1.5                                   # [1src] lên cổ phía sau 1,5

    # P2: the cap + bicep block must fit above the wrist hem, else the sleeve self-intersects
    if armhole_drop + bicep_offset >= sleeve_length:
        raise ValueError(
            "Dài tay quá ngắn so với vòng ngực: đầu tay (hạ nách + 10cm) vượt quá chiều dài tay. "
            f"Cần dài tay > {armhole_drop + bicep_offset:.0f}cm."
        )

    return {
        "sleeve_type": "raglan",
        "seam_allowance": SEAM_ALLOWANCE_CM,
        "sleeve_length": round(sleeve_length, 1),
        "armhole_drop": round(armhole_drop, 1),
        "bicep_offset": bicep_offset,
        "bicep_width": round(bicep_width, 1),
        "underarm_width": round(underarm_width, 1),
        "wrist_width": round(wrist_width, 1),
        "neck_front": round(neck_front, 1),
        "neck_back": round(neck_back, 1),
        "neck_rise": neck_rise,
    }


COLLAR_EASE_CM = 0.5      # [OK] lá cổ dài hơn vòng cổ trên rập 0,5cm (video)
COLLAR_BAND_CM = 3.0      # [OK] bản cổ trung bình 2,5–3cm (stand collar)


def generate_collar(neck_perimeter: float) -> dict[str, float]:
    """Generate the stand collar (lá cổ) geometry from the drawn neck circumference.

    length = on-pattern neck perimeter + 0.5cm; band = 2.5–3cm; cut on the line
    (no seam offset — the neck is cut sát). Reference: consolidated table §6.
    """
    if neck_perimeter <= 0:
        raise ValueError("Chu vi vòng cổ không hợp lệ để dựng lá cổ.")
    return {
        "piece": "collar",
        "neck_perimeter": round(neck_perimeter, 1),
        "length": round(neck_perimeter + COLLAR_EASE_CM, 1),
        "band": COLLAR_BAND_CM,
        "seam_allowance": 0.0,   # cổ cắt sát
    }


def _generate_setin_sleeve(measurements: dict[str, Any],
                           body_armhole_perimeter: float | None) -> dict[str, float]:
    """Set-in sleeve whose cap is sized FROM the body armhole (FR93, artisan rule).

    bicep/wrist come from the arm (table §4); cap_height is SOLVED so the cap perimeter
    equals body_armhole_perimeter + ease — the three quantities are no longer independent.
    """
    if body_armhole_perimeter is None:
        raise ValueError(
            "Tay tra cần chu vi vòng nách thân (body_armhole_perimeter) để dựng đầu tay "
            "theo đường cong nách. Hãy dựng thân trước khi dựng tay."
        )
    vong_bap_tay = _f(measurements["vong_bap_tay"])
    vong_co_tay = _f(measurements["vong_co_tay"])
    do_dai_tay = _f(measurements["do_dai_tay"])

    bicep_width = vong_bap_tay / 2 + 2.5              # [1src] table §4 (set-in bicep, half + ease)
    wrist_width = vong_co_tay / 2 + 1                 # [1src] table §4
    wrist_width = min(wrist_width, bicep_width)       # never wider than bicep (P3 analogue)
    sleeve_length = do_dai_tay

    target_cap = body_armhole_perimeter + SLEEVE_CAP_EASE_CM  # FR93 constraint
    cap_height = solve_setin_cap_height(bicep_width, target_cap)  # raises if infeasible

    if cap_height >= sleeve_length:
        raise ValueError(
            f"Dài tay quá ngắn cho tay tra: đầu tay cao {cap_height:.1f}cm ≥ dài tay "
            f"{sleeve_length:.1f}cm. Kiểm tra lại dài tay."
        )

    achieved = setin_cap_perimeter(bicep_width, cap_height)
    return {
        "sleeve_type": "set_in",
        "seam_allowance": SEAM_ALLOWANCE_CM,
        "sleeve_length": round(sleeve_length, 1),
        "cap_height": round(cap_height, 1),
        "bicep_width": round(bicep_width, 1),
        "wrist_width": round(wrist_width, 1),
        # FR93 audit fields (so the constraint is inspectable / testable)
        "body_armhole_perimeter": round(body_armhole_perimeter, 1),
        "cap_perimeter": round(achieved, 1),
        "cap_ease": round(achieved - body_armhole_perimeter, 1),
    }


def _validate_bodice_geometry(
    piece: str, armhole_drop: float, waist_drop: float, hip_drop: float, length: float,
) -> None:
    """Guard against measurement combos that yield a self-intersecting / uncuttable outline.

    Raises a Vietnamese ValueError (FR99 style) instead of silently emitting a bow-tie path.
    Vertical lines must run strictly top→bottom: armhole < waist < hip < hem (P1). A waist
    line above the armhole (large vòng nách + tiny hạ eo) folds the side seam back on itself.
    """
    if not (0 < armhole_drop < waist_drop < hip_drop < length):
        raise ValueError(
            f"Số đo dọc không hợp lệ cho {piece}: cần hạ nách < hạ eo < hạ mông < dài áo "
            f"(hiện {armhole_drop:.1f} / {waist_drop:.1f} / {hip_drop:.1f} / {length:.1f}cm). "
            "Kiểm tra lại vòng nách, hạ eo, dài áo."
        )
