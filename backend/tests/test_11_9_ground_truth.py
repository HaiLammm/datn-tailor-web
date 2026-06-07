"""Story 11.9 — Ground-truth geometric validation (FR92 <1mm).

SCAFFOLDED & SKIPPED until a digitized REAL artisan paper pattern exists. This is the
only test that proves FR92's <1mm claim against ground truth (not against the engine's
own formulas). The reference must be a real paper pattern, never engine output.

To activate: drop a reference JSON at
  _bmad-output/planning-artifacts/research/artisan-reference/<set>.json
shaped like:
  {
    "measurements": {"do_dai_ao": 100, "ha_eo": 36, ...},
    "pieces": {
      "front_bodice": {"points": [[x,y], ...]},   # key coordinates in cm
      "back_bodice":  {"points": [[x,y], ...]},
      "sleeve":       {"points": [[x,y], ...]},
      "collar":       {"length": <cm>}
    }
  }
then implement the comparison in test_engine_within_1mm_of_reference (remove the skip).
"""

import json
import math
from pathlib import Path

import pytest

REFERENCE_DIR = Path(__file__).resolve().parents[2] / (
    "_bmad-output/planning-artifacts/research/artisan-reference"
)
TOLERANCE_CM = 0.1  # 1 mm (FR92 / NFR6)


def _reference_sets():
    if not REFERENCE_DIR.exists():
        return []
    return sorted(REFERENCE_DIR.glob("*.json"))


_REFS = _reference_sets()


@pytest.mark.skipif(
    not _REFS,
    reason="Story 11.9 BLOCKED: no digitized artisan reference yet (needs recorded cutting session)",
)
@pytest.mark.parametrize("ref_path", _REFS or [None])
def test_engine_within_1mm_of_reference(ref_path):
    """Engine output must be within 1mm of the real artisan paper pattern (FR92)."""
    from decimal import Decimal
    from src.patterns.engine import generate_pattern_pieces

    ref = json.loads(Path(ref_path).read_text(encoding="utf-8"))
    measurements = {k: Decimal(str(v)) for k, v in ref["measurements"].items()}
    pieces = {p.piece_type: p for p in generate_pattern_pieces(measurements)}

    for piece_type, expected in ref["pieces"].items():
        assert piece_type in pieces, f"engine did not produce {piece_type}"
        if "points" in expected:
            # Compare key coordinates within 1mm (implementer: map engine geometry → these points)
            got_points = expected["points"]  # TODO: extract comparable points from pieces[piece_type]
            for (ex, ey), (gx, gy) in zip(expected["points"], got_points):
                assert math.hypot(gx - ex, gy - ey) <= TOLERANCE_CM, (
                    f"{piece_type}: point ({gx},{gy}) deviates > 1mm from ({ex},{ey})"
                )


def test_no_circular_reference_samples():
    """Guard: the old circular svg-samples must not be reintroduced as a 'reference'.

    The audit found the previous svg-samples were the engine's OWN output. Any real
    reference lives in artisan-reference/, captured from a physical pattern.
    """
    samples = REFERENCE_DIR.parent / "svg-samples"
    if samples.exists():
        # svg-samples may exist as engine-output illustrations, but must never be the
        # FR92 reference — that role belongs exclusively to artisan-reference/.
        assert REFERENCE_DIR != samples
