"""Story 11.8 — Extended measurements + collar piece.

Covers: collar (lá cổ) generation sized from the drawn neck circumference, the 4-piece
output, the 5 new optional measurements (schema + range validation), and backward
compatibility (raglan with only the base 10 still generates).
"""

from decimal import Decimal

import pytest

from src.patterns.engine import generate_pattern_pieces
from src.patterns.formulas import generate_collar
from src.patterns.curves import bodice_neckline_length
from src.patterns.formulas import generate_bodice
from src.models.pattern import PatternSessionCreate, PieceType

BASE = {
    "do_dai_ao": Decimal("100.0"), "ha_eo": Decimal("36.0"), "vong_co": Decimal("36.0"),
    "vong_nach": Decimal("34.0"), "vong_nguc": Decimal("84.0"), "vong_eo": Decimal("66.0"),
    "vong_mong": Decimal("90.0"), "do_dai_tay": Decimal("60.0"),
    "vong_bap_tay": Decimal("32.0"), "vong_co_tay": Decimal("15.0"),
}


class TestCollarPiece:
    def test_collar_in_piece_type_enum(self):
        assert PieceType.collar.value == "collar"

    def test_engine_produces_collar_as_4th_piece(self):
        pieces = generate_pattern_pieces(BASE)
        assert len(pieces) == 4
        assert pieces[3].piece_type == "collar"
        assert pieces[3].svg_data.startswith("<svg")

    def test_collar_length_is_neck_perimeter_plus_half(self):
        front = generate_bodice(BASE, piece="front_bodice")
        back = generate_bodice(BASE, piece="back_bodice")
        neck = 2 * (bodice_neckline_length(front) + bodice_neckline_length(back))
        collar = generate_collar(neck)
        assert collar["length"] == pytest.approx(neck + 0.5, abs=0.1)
        assert 2.5 <= collar["band"] <= 3.0
        assert collar["seam_allowance"] == 0.0  # cổ cắt sát

    def test_collar_rejects_nonpositive_neck(self):
        with pytest.raises(ValueError, match="vòng cổ"):
            generate_collar(0.0)

    def test_collar_present_for_both_sleeve_types(self):
        for st in ("raglan", "set_in"):
            pieces = generate_pattern_pieces(BASE, sleeve_type=st)
            assert pieces[3].piece_type == "collar"


class TestExtendedMeasurementsSchema:
    def test_new_fields_optional(self):
        """Base 10 alone is valid — the 5 new fields default to None."""
        m = PatternSessionCreate(customer_id=_uuid(), **_str(BASE))
        assert m.ha_ben_nguc is None and m.xuoi_vai is None

    def test_new_fields_accepted(self):
        m = PatternSessionCreate(
            customer_id=_uuid(),
            **_str(BASE),
            ha_ben_nguc="23", dang_nguc="17", ha_mong="18", xuoi_vai="4", rong_vai="36",
        )
        assert m.xuoi_vai == Decimal("4")

    @pytest.mark.parametrize("field,bad", [
        ("xuoi_vai", "0"),      # < 1
        ("xuoi_vai", "9"),      # > 8
        ("rong_vai", "20"),     # < 28
        ("dang_nguc", "30"),    # > 25
    ])
    def test_out_of_range_rejected(self, field, bad):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            PatternSessionCreate(customer_id=_uuid(), **_str(BASE), **{field: bad})

    def test_ha_mong_flows_into_bodice_hip_drop(self):
        """When ha_mong is provided it overrides the default 18 in the bodice."""
        m = {**BASE, "ha_mong": Decimal("22")}
        p = generate_bodice(m, piece="back_bodice")
        assert p["hip_drop"] == pytest.approx(36 + 22, abs=0.1)


class TestBackwardCompatibility:
    def test_raglan_base10_still_generates(self):
        pieces = generate_pattern_pieces(BASE, sleeve_type="raglan")
        assert [p.piece_type for p in pieces] == [
            "front_bodice", "back_bodice", "sleeve", "collar",
        ]


# --- helpers ---------------------------------------------------------------

def _uuid():
    import uuid
    return uuid.uuid4()


def _str(d):
    return {k: str(v) for k, v in d.items()}
