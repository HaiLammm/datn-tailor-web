"""Tests for Emotional Compiler Agent - Story 2.4.

Tests the LangGraph-based Emotional Compiler that orchestrates
the translation of style intensities to geometric Deltas.
"""

import pytest

from src.agents.emotional_compiler import (
    build_emotional_compiler_graph,
    run_emotional_compiler,
)
from src.models.inference import TranslateRequest
from src.models.style import IntensityValueItem


class TestEmotionalCompilerAgent:
    """Tests for the LangGraph Emotional Compiler."""

    def test_run_compiler_success_basic(self) -> None:
        """Basic translation should succeed with valid input."""
        request = TranslateRequest(
            pillar_id="traditional",
            intensities=[
                IntensityValueItem(key="do_rong_vai", value=60.0),
                IntensityValueItem(key="do_om_than", value=50.0),
            ],
            sequence_id=1,
            base_measurement_id=None,
        )

        response = run_emotional_compiler(request)

        assert response.success is True
        assert response.snapshot is not None
        assert response.error is None
        assert response.inference_time_ms >= 0

    def test_run_compiler_returns_snapshot_with_deltas(self) -> None:
        """Successful translation should return snapshot with deltas."""
        request = TranslateRequest(
            pillar_id="traditional",
            intensities=[
                IntensityValueItem(key="do_rong_vai", value=70.0),
            ],
            sequence_id=1,
        )

        response = run_emotional_compiler(request)

        assert response.success is True
        assert response.snapshot is not None
        assert len(response.snapshot.deltas) > 0

    def test_run_compiler_snapshot_has_required_fields(self) -> None:
        """Snapshot should have all required Master Geometry fields."""
        request = TranslateRequest(
            pillar_id="minimalist",
            intensities=[
                IntensityValueItem(key="do_om_than", value=65.0),
            ],
            sequence_id=42,
        )

        response = run_emotional_compiler(request)

        assert response.success is True
        snapshot = response.snapshot
        assert snapshot is not None

        # Check all required fields per architecture.md
        assert snapshot.sequence_id == 42
        assert len(snapshot.base_hash) == 64  # SHA-256 hex
        assert snapshot.algorithm_version == "1.0.0"
        assert len(snapshot.geometry_hash) == 64  # SHA-256 hex
        assert snapshot.created_at is not None

    def test_run_compiler_geometry_hash_deterministic(self) -> None:
        """Same inputs should produce same geometry hash."""
        request = TranslateRequest(
            pillar_id="traditional",
            intensities=[
                IntensityValueItem(key="do_rong_vai", value=50.0),
                IntensityValueItem(key="do_om_than", value=50.0),
            ],
            sequence_id=1,
        )

        response1 = run_emotional_compiler(request)
        response2 = run_emotional_compiler(request)

        assert response1.success is True
        assert response2.success is True
        assert response1.snapshot is not None
        assert response2.snapshot is not None
        assert response1.snapshot.geometry_hash == response2.snapshot.geometry_hash

    def test_run_compiler_invalid_pillar_fails(self) -> None:
        """Invalid pillar ID should result in error response."""
        request = TranslateRequest(
            pillar_id="nonexistent_pillar",
            intensities=[
                IntensityValueItem(key="do_rong_vai", value=50.0),
            ],
            sequence_id=1,
        )

        response = run_emotional_compiler(request)

        assert response.success is False
        assert response.snapshot is None
        assert response.error is not None
        assert "Không tìm thấy quy tắc" in response.error

    def test_run_compiler_empty_intensities_fails(self) -> None:
        """Empty intensities list should result in error."""
        request = TranslateRequest(
            pillar_id="traditional",
            intensities=[],
            sequence_id=1,
        )

        response = run_emotional_compiler(request)

        assert response.success is False
        assert response.snapshot is None
        assert response.error is not None
        assert "Không có giá trị cường độ" in response.error

    def test_run_compiler_performance_under_threshold(self) -> None:
        """Inference should complete well under 15 second threshold (NFR1)."""
        request = TranslateRequest(
            pillar_id="avant_garde",
            intensities=[
                IntensityValueItem(key="do_rong_vai", value=80.0),
                IntensityValueItem(key="do_om_than", value=70.0),
                IntensityValueItem(key="chieu_dai_ao", value=60.0),
                IntensityValueItem(key="do_rong_tay", value=55.0),
                IntensityValueItem(key="do_bat_doi_xung", value=40.0),
            ],
            sequence_id=1,
        )

        response = run_emotional_compiler(request)

        assert response.success is True
        # Rule-based MVP should be very fast (< 1 second typically)
        assert response.inference_time_ms < 15000  # NFR1 requirement
        # Actually expect < 100ms for deterministic rules
        assert response.inference_time_ms < 1000

    def test_run_compiler_preserves_sequence_id(self) -> None:
        """Snapshot should preserve the input sequence_id."""
        request = TranslateRequest(
            pillar_id="traditional",
            intensities=[
                IntensityValueItem(key="do_rong_vai", value=50.0),
            ],
            sequence_id=12345,
        )

        response = run_emotional_compiler(request)

        assert response.success is True
        assert response.snapshot is not None
        assert response.snapshot.sequence_id == 12345

    def test_run_compiler_all_pillars_work(self) -> None:
        """All three pillars should work correctly."""
        pillars = ["traditional", "minimalist", "avant_garde"]
        intensities = [IntensityValueItem(key="do_om_than", value=60.0)]

        for pillar_id in pillars:
            request = TranslateRequest(
                pillar_id=pillar_id,
                intensities=intensities,
                sequence_id=1,
            )

            response = run_emotional_compiler(request)

            assert response.success is True, f"Failed for pillar: {pillar_id}"
            assert response.snapshot is not None
            assert len(response.snapshot.deltas) > 0


class TestEmotionalCompilerGraph:
    """Tests for the LangGraph StateGraph structure."""

    def test_graph_builds_successfully(self) -> None:
        """StateGraph should build without errors."""
        graph = build_emotional_compiler_graph()

        assert graph is not None

    def test_graph_compiles_successfully(self) -> None:
        """StateGraph should compile without errors."""
        graph = build_emotional_compiler_graph()
        compiled = graph.compile()

        assert compiled is not None


class TestEmotionalCompilerDeltaOutput:
    """Tests for delta value correctness."""

    def test_deltas_have_vietnamese_labels(self) -> None:
        """All deltas should have Vietnamese labels."""
        request = TranslateRequest(
            pillar_id="traditional",
            intensities=[
                IntensityValueItem(key="do_rong_vai", value=60.0),
                IntensityValueItem(key="do_om_than", value=55.0),
            ],
            sequence_id=1,
        )

        response = run_emotional_compiler(request)

        assert response.success is True
        assert response.snapshot is not None

        for delta in response.snapshot.deltas:
            assert len(delta.label_vi) > 0
            assert delta.unit == "cm"

    def test_deltas_sorted_deterministically(self) -> None:
        """Deltas should be sorted by key for consistent output."""
        request = TranslateRequest(
            pillar_id="traditional",
            intensities=[
                IntensityValueItem(key="do_rong_tay", value=60.0),
                IntensityValueItem(key="do_rong_vai", value=55.0),
                IntensityValueItem(key="do_om_than", value=50.0),
            ],
            sequence_id=1,
        )

        response = run_emotional_compiler(request)

        assert response.success is True
        assert response.snapshot is not None

        keys = [d.key for d in response.snapshot.deltas]
        assert keys == sorted(keys)
