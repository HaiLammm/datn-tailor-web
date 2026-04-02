"""Geometry Engine for Nhà May Thanh Lộc.

Handles geometric calculations and primitives for pattern generation.
Story 3.2: Added morph delta computation and target geometry generation.
"""

import math
from typing import Dict, List, Optional, Tuple

from src.models.geometry import (
    Point,
    Segment,
    Path,
    PatternPart,
    CurveControl,
    MasterGeometry,
    MorphDelta,
    MorphDeltaPart,
    MorphDeltaPath,
    MorphDeltaSegment,
)


class GeometryEngine:
    """Core geometry calculation engine."""

    @staticmethod
    def create_point(x: float, y: float) -> Point:
        """Create a point with given coordinates."""
        return Point(x=x, y=y)

    @staticmethod
    def create_line(to: Point) -> Segment:
        """Create a line segment to a point."""
        return Segment(type="line", to=to)

    @staticmethod
    def create_curve(to: Point, cp1: Point, cp2: Optional[Point] = None) -> Segment:
        """Create a bezier curve segment."""
        control = CurveControl(cp1=cp1, cp2=cp2)
        return Segment(type="curve", to=to, control=control)

    @staticmethod
    def create_move(to: Point) -> Segment:
        """Create a move segment (start of path)."""
        return Segment(type="move", to=to)

    @staticmethod
    def mirror_point_x(p: Point, axis_x: float = 0) -> Point:
        """Mirror a point across a vertical axis."""
        return Point(x=axis_x - (p.x - axis_x), y=p.y)

    @staticmethod
    def mirror_path_x(path: Path, axis_x: float = 0, suffix: str = "_mirrored") -> Path:
        """Mirror a path across a vertical axis."""
        new_segments = []
        for seg in path.segments:
            new_to = GeometryEngine.mirror_point_x(seg.to, axis_x)
            new_control = None
            if seg.control:
                new_cp1 = GeometryEngine.mirror_point_x(seg.control.cp1, axis_x)
                new_cp2 = None
                if seg.control.cp2:
                    new_cp2 = GeometryEngine.mirror_point_x(seg.control.cp2, axis_x)
                new_control = CurveControl(cp1=new_cp1, cp2=new_cp2)
            
            new_segments.append(Segment(type=seg.type, to=new_to, control=new_control))
            
        return Path(
            id=f"{path.id}{suffix}",
            segments=new_segments,
            closed=path.closed,
            fill=path.fill,
            stroke=path.stroke
        )

    # --- Story 3.2: Morph Target Generation ---

    # Style deformation presets: maps style_id -> per-part scale factors.
    # Each factor adjusts specific geometric aspects at max intensity (alpha=1.0).
    STYLE_PRESETS: Dict[str, Dict[str, Dict[str, float]]] = {
        "classic": {
            "front_bodice": {
                "shoulder_extend": 0.02,   # Slight shoulder widening
                "waist_taper": -0.03,      # Tighter waist
                "hip_flare": 0.01,         # Subtle hip flare
                "hem_flare": 0.02,         # A-line hem extension
                "armhole_depth": 0.015,    # Slightly deeper armhole
            },
            "back_bodice": {
                "shoulder_extend": 0.02,
                "waist_taper": -0.025,
                "hip_flare": 0.01,
                "hem_flare": 0.02,
                "armhole_depth": 0.01,
            },
            "sleeve": {
                "cap_height": 0.03,        # Higher sleeve cap
                "bicep_width": -0.02,      # Slimmer bicep
                "wrist_taper": -0.015,     # Tighter wrist
            },
        },
        "modern": {
            "front_bodice": {
                "shoulder_extend": 0.04,
                "waist_taper": -0.01,
                "hip_flare": -0.01,
                "hem_flare": -0.02,
                "armhole_depth": 0.02,
            },
            "back_bodice": {
                "shoulder_extend": 0.04,
                "waist_taper": -0.01,
                "hip_flare": -0.01,
                "hem_flare": -0.02,
                "armhole_depth": 0.015,
            },
            "sleeve": {
                "cap_height": -0.02,
                "bicep_width": 0.03,
                "wrist_taper": 0.02,
            },
        },
        "elegant": {
            "front_bodice": {
                "shoulder_extend": 0.01,
                "waist_taper": -0.05,
                "hip_flare": 0.03,
                "hem_flare": 0.04,
                "armhole_depth": 0.01,
            },
            "back_bodice": {
                "shoulder_extend": 0.01,
                "waist_taper": -0.04,
                "hip_flare": 0.03,
                "hem_flare": 0.04,
                "armhole_depth": 0.01,
            },
            "sleeve": {
                "cap_height": 0.02,
                "bicep_width": -0.01,
                "wrist_taper": -0.03,
            },
        },
    }

    @staticmethod
    def compute_morph_delta(
        base: MasterGeometry, target: MasterGeometry
    ) -> MorphDelta:
        """Compute MorphDelta = Target - Base for every point.

        Args:
            base: Baseline geometry (P_base)
            target: Target geometry at max deformation

        Returns:
            MorphDelta with dx/dy vectors for each segment
        """
        delta_parts: List[MorphDeltaPart] = []

        for b_part, t_part in zip(base.parts, target.parts):
            delta_paths: List[MorphDeltaPath] = []

            for b_path, t_path in zip(b_part.paths, t_part.paths):
                delta_segments: List[MorphDeltaSegment] = []

                for b_seg, t_seg in zip(b_path.segments, t_path.segments):
                    dx = t_seg.to.x - b_seg.to.x
                    dy = t_seg.to.y - b_seg.to.y

                    cp1_dx: Optional[float] = None
                    cp1_dy: Optional[float] = None
                    cp2_dx: Optional[float] = None
                    cp2_dy: Optional[float] = None

                    if b_seg.control and t_seg.control:
                        cp1_dx = t_seg.control.cp1.x - b_seg.control.cp1.x
                        cp1_dy = t_seg.control.cp1.y - b_seg.control.cp1.y
                        if b_seg.control.cp2 and t_seg.control.cp2:
                            cp2_dx = t_seg.control.cp2.x - b_seg.control.cp2.x
                            cp2_dy = t_seg.control.cp2.y - b_seg.control.cp2.y

                    delta_segments.append(
                        MorphDeltaSegment(
                            dx=dx,
                            dy=dy,
                            cp1_dx=cp1_dx,
                            cp1_dy=cp1_dy,
                            cp2_dx=cp2_dx,
                            cp2_dy=cp2_dy,
                        )
                    )

                delta_paths.append(
                    MorphDeltaPath(path_id=b_path.id, segments=delta_segments)
                )

            delta_parts.append(
                MorphDeltaPart(part_id=b_part.part_id, paths=delta_paths)
            )

        return MorphDelta(parts=delta_parts, style_id="")

    @staticmethod
    def compute_target_geometry(
        base: MasterGeometry, style_id: str
    ) -> Optional[MasterGeometry]:
        """Compute target geometry for a style at max intensity.

        Applies style-specific scale factors to base geometry points.
        Each point is offset by a proportion of its distance from the center.

        Args:
            base: Baseline geometry
            style_id: Style preset identifier

        Returns:
            MasterGeometry with deformed points, or None if style unknown
        """
        preset = GeometryEngine.STYLE_PRESETS.get(style_id)
        if preset is None:
            return None

        new_parts: List[PatternPart] = []

        for part in base.parts:
            factors = preset.get(part.part_id, {})
            if not factors:
                # No deformation for this part; copy as-is
                new_parts.append(part.model_copy(deep=True))
                continue

            new_paths: List[Path] = []
            for path in part.paths:
                new_segments = GeometryEngine._apply_style_to_segments_heuristic(
                    path.segments, factors, part.part_id
                )
                new_paths.append(
                    Path(
                        id=path.id,
                        segments=new_segments,
                        closed=path.closed,
                        fill=path.fill,
                        stroke=path.stroke,
                    )
                )

            new_parts.append(
                PatternPart(
                    part_id=part.part_id,
                    name=part.name,
                    paths=new_paths,
                )
            )

        return MasterGeometry(
            parts=new_parts,
            version=base.version,
            units=base.units,
        )

    @staticmethod
    def _apply_style_to_segments_heuristic(
        segments: List[Segment], factors: Dict[str, float], part_id: str
    ) -> List[Segment]:
        """Apply style deformation using a heuristic based on bounding box.

        Identify body zones (shoulder, waist, hem) by vertical position relative
        to the bounding box of the part.
        """
        # 1. Compute bounding box to normalize coordinates
        min_y = float("inf")
        max_y = float("-inf")
        min_x = float("inf")
        max_x = float("-inf")

        all_points: List[Point] = []
        for seg in segments:
            all_points.append(seg.to)
            if seg.control:
                all_points.append(seg.control.cp1)
                if seg.control.cp2:
                    all_points.append(seg.control.cp2)

        if not all_points:
            return segments

        for p in all_points:
            min_y = min(min_y, p.y)
            max_y = max(max_y, p.y)
            min_x = min(min_x, p.x)
            max_x = max(max_x, p.x)

        height = max_y - min_y
        if height <= 0:
            return segments
        
        center_x = (min_x + max_x) / 2.0

        # Factors
        f_shoulder = factors.get("shoulder_extend", 0.0)
        f_waist = factors.get("waist_taper", 0.0)
        f_hip = factors.get("hip_flare", 0.0)
        f_hem = factors.get("hem_flare", 0.0)
        f_armhole = factors.get("armhole_depth", 0.0)

        def deform_point(p: Point) -> Point:
            # Normalize Y (0.0 at top/min_y, 1.0 at bottom/max_y)
            # Assuming Y increases downwards in SVG/Canvas coordinate system?
            # Usually yes. Let's assume standard screen coords.
            # 0.0 = top (shoulder), 1.0 = bottom (hem)
            ny = (p.y - min_y) / height
            
            dx_factor = 0.0
            dy_factor = 0.0

            # Heuristic Zones
            # Shoulder: Top 15%
            if ny < 0.15:
                dx_factor += f_shoulder
            
            # Armhole: 15% - 35%
            if 0.15 <= ny < 0.35:
                # Deepen armhole (push down/out)
                dy_factor += f_armhole 
                dx_factor += f_shoulder * 0.5 # Taper off shoulder

            # Waist: 40% - 60%
            # Peak effect at 50%
            if 0.30 <= ny < 0.70:
                # Gaussian-like distribution for waist
                w_influence = math.exp(-20 * (ny - 0.5)**2) 
                dx_factor += f_waist * w_influence

            # Hip: 60% - 80%
            if 0.60 <= ny < 0.85:
                dx_factor += f_hip

            # Hem: Bottom 15%
            if ny > 0.85:
                dx_factor += f_hem

            # Apply X deformation relative to center axis
            # If point is left of center, move left (subtract). 
            # If right, move right (add).
            # This works for dx_factor > 0 (widening).
            # For waist_taper (negative factor), it pulls inward.
            direction = 1.0 if p.x > center_x else -1.0
            
            # Scale displacement by width to keep it proportional? 
            # Or just raw units? The factors are small (0.02 etc), likely percentage of width.
            width = max_x - min_x
            actual_dx = direction * (width * dx_factor)
            actual_dy = height * dy_factor

            return Point(x=p.x + actual_dx, y=p.y + actual_dy)

        new_segments: List[Segment] = []
        for seg in segments:
            new_to = deform_point(seg.to)
            new_control = None
            if seg.control:
                new_cp1 = deform_point(seg.control.cp1)
                new_cp2 = None
                if seg.control.cp2:
                    new_cp2 = deform_point(seg.control.cp2)
                new_control = CurveControl(cp1=new_cp1, cp2=new_cp2)
            
            new_segments.append(
                Segment(type=seg.type, to=new_to, control=new_control)
            )

        return new_segments


