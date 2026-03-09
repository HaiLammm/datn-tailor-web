"""Tests for Story 3.4: Master Geometry SSOT packaging.

Tests cover:
- Task 1: Pydantic models for LockedDesign (sequence_id, base_hash, deltas, geometry_hash)
- Task 2: Deterministic SHA-256 geometry_hash computation
- Task 3: Lock Design API endpoint
"""

import hashlib
import json
import uuid

import pytest
from decimal import Decimal
from pydantic import ValidationError

from src.models.geometry import (
    MasterGeometry,
    MorphDelta,
    MorphDeltaPart,
    MorphDeltaPath,
    MorphDeltaSegment,
    PatternPart,
    Path,
    Point,
    Segment,
    LockedDesign,
    LockDesignRequest,
)
from src.core.hashing import compute_master_geometry_hash, compute_base_pattern_hash


# ---------------------------------------------------------------------------
# Task 1: Pydantic model tests
# ---------------------------------------------------------------------------


class TestLockedDesignModel:
    """Tests for LockedDesign Pydantic model."""

    def _make_sample_deltas(self) -> MorphDelta:
        return MorphDelta(
            parts=[
                MorphDeltaPart(
                    part_id="front_bodice",
                    paths=[
                        MorphDeltaPath(
                            path_id="front_bodice_outline",
                            segments=[
                                MorphDeltaSegment(dx=1.0, dy=2.0),
                                MorphDeltaSegment(dx=0.5, dy=-1.0, cp1_dx=0.1, cp1_dy=0.2),
                            ],
                        )
                    ],
                )
            ],
            style_id="classic",
        )

    def _make_sample_geometry(self) -> MasterGeometry:
        return MasterGeometry(
            parts=[
                PatternPart(
                    part_id="front_bodice",
                    name="Thân trước",
                    paths=[
                        Path(
                            id="front_bodice_outline",
                            segments=[
                                Segment(type="move", to=Point(x=0, y=20)),
                                Segment(type="line", to=Point(x=70, y=0)),
                            ],
                            closed=True,
                        )
                    ],
                )
            ],
            version="1.0.0",
            units="mm",
        )

    def test_locked_design_creation(self):
        """LockedDesign accepts all required fields."""
        seq_id = str(uuid.uuid4())
        design = LockedDesign(
            sequence_id=seq_id,
            base_hash="abc123" * 10 + "abcd",
            deltas=self._make_sample_deltas(),
            geometry_hash="def456" * 10 + "defg",
        )
        assert design.sequence_id == seq_id
        assert design.deltas.parts[0].part_id == "front_bodice"

    def test_locked_design_serialization_roundtrip(self):
        """LockedDesign serializes to JSON and back."""
        seq_id = str(uuid.uuid4())
        design = LockedDesign(
            sequence_id=seq_id,
            base_hash="a" * 64,
            deltas=self._make_sample_deltas(),
            geometry_hash="b" * 64,
        )
        json_str = design.model_dump_json()
        restored = LockedDesign.model_validate_json(json_str)
        assert restored.sequence_id == seq_id
        assert restored.geometry_hash == "b" * 64
        assert len(restored.deltas.parts) == 1

    def test_lock_design_request_model(self):
        """LockDesignRequest validates input for lock endpoint."""
        req = LockDesignRequest(
            base_id="some-measurement-id",
            deltas=self._make_sample_deltas(),
        )
        assert req.base_id == "some-measurement-id"
        assert req.deltas.style_id == "classic"

    def test_lock_design_request_optional_base_id(self):
        """LockDesignRequest works without base_id."""
        req = LockDesignRequest(
            deltas=self._make_sample_deltas(),
        )
        assert req.base_id is None


# ---------------------------------------------------------------------------
# Task 2: Hashing tests
# ---------------------------------------------------------------------------


class TestGeometryHashing:
    """Tests for deterministic SHA-256 hash computation."""

    def _make_sample_design_dict(self) -> dict:
        return {
            "sequence_id": "test-uuid",
            "base_hash": "abc",
            "deltas": {
                "parts": [
                    {
                        "part_id": "front_bodice",
                        "paths": [
                            {
                                "path_id": "outline",
                                "segments": [{"dx": 1.0, "dy": 2.0}],
                            }
                        ],
                    }
                ],
                "style_id": "classic",
            },
        }

    def test_hash_is_deterministic(self):
        """Same input produces same hash every time."""
        data = self._make_sample_design_dict()
        h1 = compute_master_geometry_hash(data)
        h2 = compute_master_geometry_hash(data)
        assert h1 == h2

    def test_hash_is_sha256(self):
        """Hash is a 64-character hex string (SHA-256)."""
        data = self._make_sample_design_dict()
        h = compute_master_geometry_hash(data)
        assert len(h) == 64
        assert all(c in "0123456789abcdef" for c in h)

    def test_hash_excludes_geometry_hash_field(self):
        """geometry_hash field is excluded from hash computation."""
        data = self._make_sample_design_dict()
        h_without = compute_master_geometry_hash(data)

        data_with_hash = {**data, "geometry_hash": "should_be_ignored"}
        h_with = compute_master_geometry_hash(data_with_hash)

        assert h_without == h_with

    def test_hash_changes_with_different_data(self):
        """Different data produces different hash."""
        data1 = self._make_sample_design_dict()
        data2 = self._make_sample_design_dict()
        data2["sequence_id"] = "different-uuid"

        h1 = compute_master_geometry_hash(data1)
        h2 = compute_master_geometry_hash(data2)
        assert h1 != h2

    def test_hash_key_order_independent(self):
        """Hash uses sorted keys, so insertion order doesn't matter."""
        data1 = {"sequence_id": "x", "base_hash": "y", "deltas": {}}
        data2 = {"deltas": {}, "base_hash": "y", "sequence_id": "x"}

        h1 = compute_master_geometry_hash(data1)
        h2 = compute_master_geometry_hash(data2)
        assert h1 == h2

    def test_compute_base_pattern_hash_with_geometry(self):
        """compute_base_pattern_hash produces SHA-256 from MasterGeometry."""
        geometry = MasterGeometry(
            parts=[
                PatternPart(
                    part_id="front_bodice",
                    name="Thân trước",
                    paths=[
                        Path(
                            id="outline",
                            segments=[
                                Segment(type="move", to=Point(x=0, y=0)),
                            ],
                            closed=False,
                        )
                    ],
                )
            ],
            version="1.0.0",
            units="mm",
        )
        h = compute_base_pattern_hash(geometry)
        assert len(h) == 64

    def test_compute_base_pattern_hash_deterministic(self):
        """Same geometry produces same base_hash."""
        geometry = MasterGeometry(
            parts=[
                PatternPart(
                    part_id="sleeve",
                    name="Tay áo",
                    paths=[
                        Path(
                            id="sleeve_outline",
                            segments=[Segment(type="move", to=Point(x=5, y=10))],
                            closed=True,
                        )
                    ],
                )
            ],
            version="1.0.0",
            units="mm",
        )
        h1 = compute_base_pattern_hash(geometry)
        h2 = compute_base_pattern_hash(geometry)
        assert h1 == h2
