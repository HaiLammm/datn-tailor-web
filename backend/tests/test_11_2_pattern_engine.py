"""Unit tests for Pattern Engine (Story 11.2/11.3 — corrected SCP 2026-06-08).

The previous suite was CIRCULAR — EXPECTED_* recomputed the same (wrong) formulas,
and arc tests locked in the rx/ry swap. Rewritten to assert:
  - formula values against the ARTISAN notebook formulas (consolidated table),
  - geometric SANITY invariants that fix audit defects G1–G10,
  - engine wiring (3 pieces, raglan).

True <1mm validation against a digitized real artisan paper pattern is Story 11.9 (gated).
"""

from decimal import Decimal

import pytest

from src.patterns.engine import PieceResult, generate_pattern_pieces
from src.patterns.formulas import generate_bodice, generate_sleeve

# Sample measurement set (within schema min/max). Worked values mirror the
# consolidated table's example column.
MEASUREMENTS = {
    "do_dai_ao": Decimal("100.0"),
    "ha_eo": Decimal("36.0"),
    "vong_co": Decimal("36.0"),
    "vong_nach": Decimal("34.0"),
    "vong_nguc": Decimal("84.0"),
    "vong_eo": Decimal("66.0"),
    "vong_mong": Decimal("90.0"),
    "do_dai_tay": Decimal("60.0"),
    "vong_bap_tay": Decimal("32.0"),
    "vong_co_tay": Decimal("15.0"),
}

TOL = 0.1  # 1 mm


# ---------------------------------------------------------------------------
# Bodice formulas — assert against the ARTISAN notebook (not circular)
# ---------------------------------------------------------------------------

class TestBackBodiceFormulas:
    def test_back_values(self):
        p = generate_bodice(MEASUREMENTS, piece="back_bodice")
        assert p["armhole_drop"] == pytest.approx(34 / 2 + 1, abs=TOL)   # 18.0  (NOT vong_nach/12)
        assert p["neck_width"] == pytest.approx(36 / 8 - 1, abs=TOL)     # 3.5
        assert p["bust_width"] == pytest.approx(84 / 4 + 0.5, abs=TOL)   # 21.5
        assert p["waist_width"] == pytest.approx(66 / 4 + 3, abs=TOL)    # 19.5
        assert p["hip_width"] == pytest.approx(90 / 4 + 1, abs=TOL)      # 23.5
        assert p["hem_width"] == pytest.approx(90 / 4 + 2, abs=TOL)      # 24.5
        assert p["length"] == pytest.approx(100.0, abs=TOL)             # do_dai_ao, NOT 60
        assert p["hip_drop"] == pytest.approx(36 + 18, abs=TOL)         # ha_eo + 18

    def test_no_legacy_bad_coefficients(self):
        """Regression: armhole_drop must never again be vong_nach/12 (the audited bug)."""
        p = generate_bodice(MEASUREMENTS, piece="back_bodice")
        assert abs(p["armhole_drop"] - 34 / 12) > 10  # ~3 vs ~18 — far apart


class TestFrontBodiceFormulas:
    def test_front_values(self):
        p = generate_bodice(MEASUREMENTS, piece="front_bodice")
        assert p["armhole_drop"] == pytest.approx(34 / 2, abs=TOL)       # 17.0
        assert p["neck_width"] == pytest.approx(36 / 8 + 0.5, abs=TOL)   # 5.0
        assert p["neck_depth"] == pytest.approx(36 / 8 + 1.5, abs=TOL)   # 6.0
        assert p["bust_width"] == pytest.approx(84 / 4 + 1, abs=TOL)     # 22.0
        assert p["waist_width"] == pytest.approx(66 / 4 + 4, abs=TOL)    # 20.5
        assert p["length"] == pytest.approx(100 + 1, abs=TOL)           # + sa vạt

    def test_front_back_differ_in_multiple_dims(self):
        """Front/back now diverge in >1 dimension (no single-offset DRY)."""
        f = generate_bodice(MEASUREMENTS, piece="front_bodice")
        b = generate_bodice(MEASUREMENTS, piece="back_bodice")
        assert f["armhole_drop"] != b["armhole_drop"]
        assert f["neck_width"] != b["neck_width"]
        assert f["bust_width"] != b["bust_width"]

    def test_invalid_piece_rejected(self):
        with pytest.raises(ValueError):
            generate_bodice(MEASUREMENTS, piece="sleeve")

    def test_missing_measurement_rejected(self):
        bad = {k: v for k, v in MEASUREMENTS.items() if k != "do_dai_ao"}
        with pytest.raises(ValueError):
            generate_bodice(bad, piece="back_bodice")


class TestGeometryValidationGuards:
    """Guards added in code-review fix pass (P1–P4): reject measurement combos that
    would produce a self-intersecting / uncuttable outline, with Vietnamese errors."""

    def test_p1_armhole_below_waist_rejected(self):
        """Large vong_nach + tiny ha_eo → armhole_drop > waist_drop → reject."""
        bad = {**MEASUREMENTS, "vong_nach": Decimal("70"), "ha_eo": Decimal("5"),
               "do_dai_ao": Decimal("40")}
        with pytest.raises(ValueError, match="dọc không hợp lệ"):
            generate_bodice(bad, piece="back_bodice")

    def test_p4_gross_data_error_rejected(self):
        """Only GROSS errors rejected: vong_eo implausibly larger than BOTH bust and hip."""
        bad = {**MEASUREMENTS, "vong_eo": Decimal("160"), "vong_nguc": Decimal("50"),
               "vong_mong": Decimal("50")}
        with pytest.raises(ValueError, match="eo quá lớn"):
            generate_bodice(bad, piece="back_bodice")

    @pytest.mark.parametrize("eo,nguc,mong", [
        ("84", "88", "86"),   # waist < hip (normal) — must NOT be rejected
        ("90", "92", "88"),   # apple shape, waist slightly > hip — must NOT be rejected
        ("88", "88", "88"),   # waist == bust == hip — must NOT be rejected
    ])
    def test_p4_normal_full_waist_accepted(self, eo, nguc, mong):
        """Regression: realistic full/apple-shaped bodies must still generate (no false reject)."""
        ok = {**MEASUREMENTS, "vong_eo": Decimal(eo), "vong_nguc": Decimal(nguc),
              "vong_mong": Decimal(mong)}
        generate_bodice(ok, piece="front_bodice")
        generate_bodice(ok, piece="back_bodice")

    def test_p2_sleeve_cap_exceeds_length_rejected(self):
        """Large vong_nguc + short do_dai_tay → cap+bicep below wrist → reject."""
        bad = {**MEASUREMENTS, "vong_nguc": Decimal("180"), "do_dai_tay": Decimal("30")}
        with pytest.raises(ValueError, match="Dài tay quá ngắn"):
            generate_sleeve(bad)

    def test_p3_wrist_clamped_to_bicep(self):
        """co_tay > bap_tay must not produce an inverted taper (wrist ≤ bicep)."""
        bad = {**MEASUREMENTS, "vong_co_tay": Decimal("35"), "vong_bap_tay": Decimal("15")}
        p = generate_sleeve(bad)
        assert p["wrist_width"] <= p["bicep_width"]

    def test_valid_measurements_still_pass(self):
        """The happy-path sample must not trip any new guard."""
        generate_bodice(MEASUREMENTS, piece="front_bodice")
        generate_bodice(MEASUREMENTS, piece="back_bodice")
        generate_sleeve(MEASUREMENTS)


class TestBodiceGeometryInvariants:
    """Geometric sanity that fixes audit defects G1, G2, G8."""

    @pytest.mark.parametrize("piece", ["front_bodice", "back_bodice"])
    def test_hem_wider_than_hip_fixes_g8(self, piece):
        p = generate_bodice(MEASUREMENTS, piece=piece)
        assert p["hem_width"] > p["hip_width"]  # no inverted side seam

    @pytest.mark.parametrize("piece", ["front_bodice", "back_bodice"])
    def test_vertical_order_fixes_g1_g2(self, piece):
        p = generate_bodice(MEASUREMENTS, piece=piece)
        assert 0 < p["armhole_drop"] < p["waist_drop"] < p["hip_drop"] < p["length"]

    def test_neck_width_decoupled_from_seam_fixes_g6(self):
        p = generate_bodice(MEASUREMENTS, piece="back_bodice")
        assert p["neck_width"] != p["seam_allowance"]  # not accidentally 1 cm


# ---------------------------------------------------------------------------
# Sleeve formulas (raglan)
# ---------------------------------------------------------------------------

class TestSleeveFormulas:
    def test_raglan_values(self):
        p = generate_sleeve(MEASUREMENTS)
        assert p["sleeve_type"] == "raglan"
        assert p["armhole_drop"] == pytest.approx(84 / 4 - 1, abs=TOL)   # 20.0 (vong_nguc/4 - 1)
        assert p["bicep_width"] == pytest.approx(32 / 2, abs=TOL)        # 16.0
        assert p["underarm_width"] == pytest.approx(32 / 2 + 1, abs=TOL)  # 17.0
        assert p["wrist_width"] == pytest.approx(15 / 2, abs=TOL)        # 7.5
        assert p["neck_front"] == pytest.approx(36 / 8, abs=TOL)         # 4.5
        assert p["neck_back"] == pytest.approx(36 / 16, abs=TOL)         # 2.25
        assert p["sleeve_length"] == pytest.approx(60.0, abs=TOL)

    def test_underarm_wider_than_bicep(self):
        p = generate_sleeve(MEASUREMENTS)
        assert p["underarm_width"] > p["bicep_width"]

    def test_set_in_now_implemented_needs_armhole(self):
        """Story 11.7: set_in is implemented; it requires the body armhole perimeter."""
        with pytest.raises(ValueError, match="vòng nách"):
            generate_sleeve(MEASUREMENTS, sleeve_type="set_in")  # no armhole → clear error

    def test_all_floats(self):
        p = generate_sleeve(MEASUREMENTS)
        for k in ("armhole_drop", "bicep_width", "wrist_width", "sleeve_length"):
            assert isinstance(p[k], float)


# ---------------------------------------------------------------------------
# Engine wiring
# ---------------------------------------------------------------------------

class TestEngine:
    def test_returns_four_pieces_with_collar(self):
        """Story 11.8: engine now also produces the collar (4 pieces)."""
        pieces = generate_pattern_pieces(MEASUREMENTS)
        assert len(pieces) == 4
        assert [p.piece_type for p in pieces] == [
            "front_bodice", "back_bodice", "sleeve", "collar",
        ]

    def test_all_pieces_have_svg_and_params(self):
        for p in generate_pattern_pieces(MEASUREMENTS):
            assert isinstance(p, PieceResult)
            assert p.svg_data and p.geometry_params

    def test_set_in_produces_pieces(self):
        """Story 11.7: engine builds a set-in sleeve (cap sized from the armhole)."""
        pieces = generate_pattern_pieces(MEASUREMENTS, sleeve_type="set_in")
        assert [p.piece_type for p in pieces] == [
            "front_bodice", "back_bodice", "sleeve", "collar",
        ]
        assert pieces[2].geometry_params["sleeve_type"] == "set_in"
