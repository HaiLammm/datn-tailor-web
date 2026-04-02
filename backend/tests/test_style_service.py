"""Unit tests for StyleService - Story 2.1: Lựa chọn Phong cách.

Tests for style pillar retrieval and configuration.
"""

import pytest

from src.models.style import (
    IntensitySlider,
    StylePillarResponse,
)
from src.services.style_service import StyleService


class TestStyleService:
    """Test suite for StyleService."""

    def test_get_all_pillars_returns_list(self) -> None:
        """Test that get_all_pillars returns a list of style pillars."""
        service = StyleService()
        pillars = service.get_all_pillars()

        assert isinstance(pillars, list)
        assert len(pillars) > 0

    def test_get_all_pillars_contains_required_styles(self) -> None:
        """Test that required style pillars are present."""
        service = StyleService()
        pillars = service.get_all_pillars()
        pillar_ids = [p.id for p in pillars]

        # Must have at least Traditional and Minimalist styles
        assert "traditional" in pillar_ids
        assert "minimalist" in pillar_ids

    def test_pillar_has_required_fields(self) -> None:
        """Test that each pillar has all required fields."""
        service = StyleService()
        pillars = service.get_all_pillars()

        for pillar in pillars:
            assert isinstance(pillar, StylePillarResponse)
            assert pillar.id is not None
            assert pillar.name is not None
            assert pillar.description is not None
            assert pillar.sliders is not None
            assert len(pillar.sliders) > 0

    def test_pillar_uses_vietnamese_terminology(self) -> None:
        """Test that pillar names and descriptions use Vietnamese terminology (NFR11)."""
        service = StyleService()
        pillars = service.get_all_pillars()

        # At least one pillar should have Vietnamese name
        vietnamese_chars = set("àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ")
        has_vietnamese = any(
            any(c.lower() in vietnamese_chars for c in pillar.name)
            or any(c.lower() in vietnamese_chars for c in pillar.description)
            for pillar in pillars
        )
        assert has_vietnamese, "Pillar names/descriptions should use Vietnamese terminology"

    def test_slider_has_min_max_default(self) -> None:
        """Test that each slider has min, max, and default values (FR2)."""
        service = StyleService()
        pillars = service.get_all_pillars()

        for pillar in pillars:
            for slider in pillar.sliders:
                assert isinstance(slider, IntensitySlider)
                assert slider.min_value is not None
                assert slider.max_value is not None
                assert slider.default_value is not None
                assert slider.min_value <= slider.default_value <= slider.max_value

    def test_get_pillar_by_id_existing(self) -> None:
        """Test getting a specific pillar by ID."""
        service = StyleService()
        pillar = service.get_pillar_by_id("traditional")

        assert pillar is not None
        assert pillar.id == "traditional"

    def test_get_pillar_by_id_not_found(self) -> None:
        """Test getting a non-existent pillar returns None."""
        service = StyleService()
        pillar = service.get_pillar_by_id("nonexistent-style")

        assert pillar is None

    def test_sliders_have_unique_keys(self) -> None:
        """Test that sliders within a pillar have unique keys."""
        service = StyleService()
        pillars = service.get_all_pillars()

        for pillar in pillars:
            slider_keys = [s.key for s in pillar.sliders]
            assert len(slider_keys) == len(set(slider_keys)), (
                f"Pillar {pillar.id} has duplicate slider keys"
            )

    def test_slider_labels_use_vietnamese(self) -> None:
        """Test that slider labels use Vietnamese terminology."""
        service = StyleService()
        pillars = service.get_all_pillars()

        vietnamese_chars = set("àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ")

        for pillar in pillars:
            has_vietnamese_slider = any(
                any(c.lower() in vietnamese_chars for c in slider.label)
                for slider in pillar.sliders
            )
            assert has_vietnamese_slider, (
                f"Pillar {pillar.id} should have Vietnamese slider labels"
            )
