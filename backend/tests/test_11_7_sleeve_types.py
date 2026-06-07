"""Story 11.7 — Sleeve types (raglan/set-in) + FR93 armhole circumference constraint.

The headline fix: the set-in sleeve cap is sized FROM the body armhole (artisan rule
"đầu tay cắt theo đường cong nách"), so cap perimeter = body armhole + 3–4 cm ease,
eliminating the audited +62 cm gap (defect G5).
"""

from decimal import Decimal

import pytest

from src.patterns.engine import generate_pattern_pieces
from src.patterns.formulas import generate_bodice, generate_sleeve
from src.patterns.curves import (
    bodice_armhole_perimeter,
    setin_cap_perimeter,
    solve_setin_cap_height,
)

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


def _body_armhole(m) -> float:
    return (bodice_armhole_perimeter(generate_bodice(m, piece="front_bodice"))
            + bodice_armhole_perimeter(generate_bodice(m, piece="back_bodice")))


class TestRaglanUnchanged:
    def test_raglan_still_default(self):
        p = generate_sleeve(MEASUREMENTS)
        assert p["sleeve_type"] == "raglan"

    def test_engine_raglan_pieces(self):
        pieces = generate_pattern_pieces(MEASUREMENTS, sleeve_type="raglan")
        assert pieces[2].geometry_params["sleeve_type"] == "raglan"


class TestSetInFR93Constraint:
    def test_set_in_cap_matches_armhole_plus_ease(self):
        """FR93: cap perimeter = body armhole + ease, ease within the 3–4 cm band."""
        armhole = _body_armhole(MEASUREMENTS)
        p = generate_sleeve(MEASUREMENTS, sleeve_type="set_in", body_armhole_perimeter=armhole)
        assert p["sleeve_type"] == "set_in"
        assert p["body_armhole_perimeter"] == pytest.approx(armhole, abs=0.1)
        assert 3.0 <= p["cap_ease"] <= 4.0
        # the achieved cap perimeter really is armhole + ~3.5 (the audited +62cm gap is gone)
        assert p["cap_perimeter"] == pytest.approx(armhole + 3.5, abs=0.6)

    @pytest.mark.parametrize("nguc,nach,bap", [
        ("80", "32", "28"), ("90", "38", "32"), ("100", "42", "36"), ("78", "30", "26"),
    ])
    def test_fr93_holds_across_realistic_sets(self, nguc, nach, bap):
        m = {**MEASUREMENTS, "vong_nguc": Decimal(nguc), "vong_nach": Decimal(nach),
             "vong_bap_tay": Decimal(bap)}
        armhole = _body_armhole(m)
        p = generate_sleeve(m, sleeve_type="set_in", body_armhole_perimeter=armhole)
        assert 3.0 <= p["cap_ease"] <= 4.0

    def test_engine_set_in_wires_armhole(self):
        pieces = generate_pattern_pieces(MEASUREMENTS, sleeve_type="set_in")
        sp = pieces[2].geometry_params
        assert sp["sleeve_type"] == "set_in"
        # engine measured the real bodice armholes and fed them to the solver
        assert sp["body_armhole_perimeter"] == pytest.approx(_body_armhole(MEASUREMENTS), abs=0.1)
        assert pieces[2].svg_data.startswith("<svg")

    def test_set_in_requires_armhole(self):
        with pytest.raises(ValueError, match="chu vi vòng nách"):
            generate_sleeve(MEASUREMENTS, sleeve_type="set_in")


class TestSolverDirectly:
    def test_solver_hits_target(self):
        h = solve_setin_cap_height(bicep_width=18.0, target_perimeter=50.0)
        assert setin_cap_perimeter(18.0, h) == pytest.approx(50.0, abs=0.5)

    def test_solver_infeasible_bicep_too_wide(self):
        # target smaller than the flat chord (2*bicep=40) → bicep too wide for armhole
        with pytest.raises(ValueError, match="bắp tay"):
            solve_setin_cap_height(bicep_width=20.0, target_perimeter=30.0)

    def test_cap_perimeter_grows_with_height(self):
        assert setin_cap_perimeter(18.0, 20.0) > setin_cap_perimeter(18.0, 5.0)


class TestSleeveTypeValidation:
    def test_invalid_sleeve_type_rejected(self):
        with pytest.raises(ValueError, match="sleeve_type"):
            generate_sleeve(MEASUREMENTS, sleeve_type="kimono")
