"""Tests for SmartRulesService - Story 2.4.

Tests the Local Knowledge Base (LKB) Smart Rules that map
style intensities to geometric Deltas.
"""

import pytest

from src.services.smart_rules_service import SmartRulesService


class TestSmartRulesServiceGetRules:
    """Tests for get_rules_for_pillar method."""

    def test_get_rules_traditional_returns_rules(self) -> None:
        """Traditional pillar should have Smart Rules."""
        service = SmartRulesService()
        rules = service.get_rules_for_pillar("traditional")

        assert len(rules) > 0
        assert all(r.pillar_id == "traditional" for r in rules)

    def test_get_rules_minimalist_returns_rules(self) -> None:
        """Minimalist pillar should have Smart Rules."""
        service = SmartRulesService()
        rules = service.get_rules_for_pillar("minimalist")

        assert len(rules) > 0
        assert all(r.pillar_id == "minimalist" for r in rules)

    def test_get_rules_avant_garde_returns_rules(self) -> None:
        """Avant-garde pillar should have Smart Rules."""
        service = SmartRulesService()
        rules = service.get_rules_for_pillar("avant_garde")

        assert len(rules) > 0
        assert all(r.pillar_id == "avant_garde" for r in rules)

    def test_get_rules_unknown_pillar_returns_empty(self) -> None:
        """Unknown pillar should return empty list."""
        service = SmartRulesService()
        rules = service.get_rules_for_pillar("unknown_pillar")

        assert rules == []

    def test_get_available_pillar_ids(self) -> None:
        """Should return all available pillar IDs."""
        service = SmartRulesService()
        pillar_ids = service.get_available_pillar_ids()

        assert "traditional" in pillar_ids
        assert "minimalist" in pillar_ids
        assert "avant_garde" in pillar_ids
        assert len(pillar_ids) == 3


class TestSmartRulesServiceComputeDeltas:
    """Tests for compute_deltas method."""

    def test_compute_deltas_traditional_basic(self) -> None:
        """Traditional pillar with basic intensities should return deltas."""
        service = SmartRulesService()
        intensities = {
            "do_rong_vai": 50.0,
            "do_om_than": 50.0,
            "chieu_dai_ao": 50.0,
            "do_rong_tay": 50.0,
        }

        deltas = service.compute_deltas("traditional", intensities)

        assert len(deltas) > 0
        delta_keys = [d.key for d in deltas]
        # Should include these Vietnamese delta keys
        assert "rong_vai" in delta_keys
        assert "do_cu_eo" in delta_keys

    def test_compute_deltas_returns_vietnamese_labels(self) -> None:
        """All delta labels should be in Vietnamese."""
        service = SmartRulesService()
        intensities = {"do_om_than": 60.0}

        deltas = service.compute_deltas("traditional", intensities)

        assert len(deltas) > 0
        for delta in deltas:
            # Vietnamese labels should have Vietnamese characters or be meaningful
            assert len(delta.label_vi) > 0
            assert delta.unit == "cm"

    def test_compute_deltas_at_50_percent_neutral(self) -> None:
        """At 50% intensity, most deltas should be near zero."""
        service = SmartRulesService()
        intensities = {"do_rong_vai": 50.0}

        deltas = service.compute_deltas("traditional", intensities)

        # rong_vai formula: (v - 50) * 0.04 = 0 at 50%
        rong_vai = next((d for d in deltas if d.key == "rong_vai"), None)
        assert rong_vai is not None
        assert rong_vai.value == 0.0

    def test_compute_deltas_high_intensity_positive(self) -> None:
        """High intensity should produce positive deltas for expansion sliders."""
        service = SmartRulesService()
        intensities = {"do_rong_vai": 100.0}

        deltas = service.compute_deltas("traditional", intensities)

        rong_vai = next((d for d in deltas if d.key == "rong_vai"), None)
        assert rong_vai is not None
        # (100 - 50) * 0.04 = 2.0
        assert rong_vai.value == 2.0

    def test_compute_deltas_low_intensity_negative(self) -> None:
        """Low intensity should produce negative deltas for expansion sliders."""
        service = SmartRulesService()
        intensities = {"do_rong_vai": 0.0}

        deltas = service.compute_deltas("traditional", intensities)

        rong_vai = next((d for d in deltas if d.key == "rong_vai"), None)
        assert rong_vai is not None
        # (0 - 50) * 0.04 = -2.0
        assert rong_vai.value == -2.0

    def test_compute_deltas_empty_intensities_returns_empty(self) -> None:
        """Empty intensities should return empty deltas."""
        service = SmartRulesService()

        deltas = service.compute_deltas("traditional", {})

        assert deltas == []

    def test_compute_deltas_unknown_pillar_returns_empty(self) -> None:
        """Unknown pillar should return empty deltas."""
        service = SmartRulesService()
        intensities = {"do_rong_vai": 50.0}

        deltas = service.compute_deltas("unknown", intensities)

        assert deltas == []

    def test_compute_deltas_unknown_slider_ignored(self) -> None:
        """Unknown slider keys should be ignored."""
        service = SmartRulesService()
        intensities = {"unknown_slider": 50.0}

        deltas = service.compute_deltas("traditional", intensities)

        assert deltas == []

    def test_compute_deltas_sorted_by_key(self) -> None:
        """Deltas should be sorted by key for deterministic output."""
        service = SmartRulesService()
        intensities = {
            "do_rong_vai": 60.0,
            "do_om_than": 70.0,
            "do_rong_tay": 55.0,
        }

        deltas = service.compute_deltas("traditional", intensities)

        keys = [d.key for d in deltas]
        assert keys == sorted(keys)

    def test_compute_deltas_reasonable_range(self) -> None:
        """Delta values should be within reasonable tailoring ranges."""
        service = SmartRulesService()
        # Test extreme values
        intensities = {
            "do_rong_vai": 100.0,
            "do_om_than": 0.0,
            "chieu_dai_ao": 100.0,
            "do_rong_tay": 100.0,
        }

        deltas = service.compute_deltas("traditional", intensities)

        for delta in deltas:
            # No delta should exceed ±10cm for reasonable tailoring
            assert -10.0 <= delta.value <= 10.0, (
                f"Delta {delta.key}={delta.value}cm out of reasonable range"
            )

    def test_compute_deltas_avant_garde_asymmetry(self) -> None:
        """Avant-garde pillar should compute asymmetry deltas."""
        service = SmartRulesService()
        intensities = {"do_bat_doi_xung": 80.0}

        deltas = service.compute_deltas("avant_garde", intensities)

        delta_keys = [d.key for d in deltas]
        assert "lech_vai" in delta_keys or "do_xoe_ta" in delta_keys


class TestSmartRulesServiceFormulas:
    """Tests for specific formula correctness."""

    def test_traditional_waist_ease_formula(self) -> None:
        """Test traditional waist ease calculation."""
        service = SmartRulesService()

        # At 0%: should be +3cm ease (loose)
        deltas_loose = service.compute_deltas("traditional", {"do_om_than": 0.0})
        do_cu_eo = next((d for d in deltas_loose if d.key == "do_cu_eo"), None)
        assert do_cu_eo is not None
        assert do_cu_eo.value == 3.0

        # At 100%: should be -1.5cm (tight)
        deltas_tight = service.compute_deltas("traditional", {"do_om_than": 100.0})
        do_cu_eo = next((d for d in deltas_tight if d.key == "do_cu_eo"), None)
        assert do_cu_eo is not None
        assert do_cu_eo.value == pytest.approx(-1.5, abs=0.1)

    def test_minimalist_tighter_range_than_traditional(self) -> None:
        """Minimalist should have tighter delta ranges than traditional."""
        service = SmartRulesService()
        intensities = {"do_rong_vai": 100.0}

        trad_deltas = service.compute_deltas("traditional", intensities)
        mini_deltas = service.compute_deltas("minimalist", intensities)

        trad_rong_vai = next((d for d in trad_deltas if d.key == "rong_vai"), None)
        mini_rong_vai = next((d for d in mini_deltas if d.key == "rong_vai"), None)

        assert trad_rong_vai is not None
        assert mini_rong_vai is not None
        # Traditional: (100-50)*0.04 = 2.0, Minimalist: (100-50)*0.03 = 1.5
        assert abs(trad_rong_vai.value) > abs(mini_rong_vai.value)
