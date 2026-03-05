"""Hashing utilities for geometry integrity verification - Story 2.4.

Provides deterministic hashing for Master Geometry Snapshots.
Ensures geometry_hash is consistent for same delta inputs.
"""

import hashlib
import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from src.models.inference import DeltaValue


def compute_geometry_hash(deltas: list["DeltaValue"]) -> str:
    """Compute deterministic SHA-256 hash of delta values.

    The hash is computed from sorted deltas to ensure consistency
    regardless of the order deltas are computed or stored.

    Args:
        deltas: List of DeltaValue objects to hash.

    Returns:
        Hexadecimal SHA-256 hash string (64 characters).

    Example:
        >>> deltas = [DeltaValue(key="do_cu_eo", value=1.5, unit="cm", label_vi="Độ cử eo")]
        >>> hash1 = compute_geometry_hash(deltas)
        >>> hash2 = compute_geometry_hash(deltas)
        >>> assert hash1 == hash2  # Deterministic
    """
    # Sort by key for deterministic ordering
    sorted_deltas = sorted(
        [{"key": d.key, "value": d.value, "unit": d.unit} for d in deltas],
        key=lambda x: x["key"],
    )

    # Use separators without spaces for compact, consistent JSON
    json_str = json.dumps(sorted_deltas, separators=(",", ":"), sort_keys=True)

    return hashlib.sha256(json_str.encode("utf-8")).hexdigest()


def compute_base_hash(measurement_id: str | None) -> str:
    """Compute hash for base measurement reference.

    For MVP, this returns a placeholder hash since the Base Geometry
    engine is not yet implemented (Story 3.x).

    Args:
        measurement_id: Optional ID of the measurement profile.

    Returns:
        Hexadecimal SHA-256 hash string.
    """
    if measurement_id is None:
        # Default placeholder for no measurement specified
        content = "base:default:v1.0.0"
    else:
        content = f"base:{measurement_id}:v1.0.0"

    return hashlib.sha256(content.encode("utf-8")).hexdigest()
