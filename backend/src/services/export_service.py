"""Service for exporting manufacturing blueprints (SVG/DXF).

Handles the generation of technical drawings from Master Geometry JSON (SSOT).
Follows Story 4.4 requirements for Vietnamese terminology and geometric precision.
"""

import io
import datetime
from typing import Dict, List, Optional, Tuple, Any
import ezdxf
from ezdxf.enums import TextEntityAlignment

from src.models.geometry import (
    MasterGeometry,
    PatternPart,
    Path,
    Point,
    Segment,
    LockedDesign,
    MorphDelta,
)
from src.api.v1.designs import MEASUREMENT_MAPPING


class ExportService:
    """Service to generate SVG and DXF exports for production."""

    @staticmethod
    def reconstruct_geometry(base: MasterGeometry, deltas: MorphDelta) -> MasterGeometry:
        """Reconstruct the final geometry by applying deltas to base.
        
        Formula: P_final = P_base + MorphDelta
        """
        new_parts = []
        
        # Create map for fast lookup of delta parts
        delta_parts_map = {p.part_id: p for p in deltas.parts}
        
        for base_part in base.parts:
            delta_part = delta_parts_map.get(base_part.part_id)
            if not delta_part:
                new_parts.append(base_part.model_copy(deep=True))
                continue
            
            new_paths = []
            delta_paths_map = {p.path_id: p for p in delta_part.paths}
            
            for base_path in base_part.paths:
                delta_path = delta_paths_map.get(base_path.id)
                if not delta_path:
                    new_paths.append(base_path.model_copy(deep=True))
                    continue
                
                new_segments = []
                for b_seg, d_seg in zip(base_path.segments, delta_path.segments):
                    # Apply delta to 'to' point
                    new_to = Point(
                        x=b_seg.to.x + d_seg.dx,
                        y=b_seg.to.y + d_seg.dy
                    )
                    
                    new_control = None
                    if b_seg.control and d_seg:
                        # Apply deltas to control points if they exist
                        new_cp1 = Point(
                            x=b_seg.control.cp1.x + (d_seg.cp1_dx or 0),
                            y=b_seg.control.cp1.y + (d_seg.cp1_dy or 0)
                        )
                        new_cp2 = None
                        if b_seg.control.cp2:
                             new_cp2 = Point(
                                x=b_seg.control.cp2.x + (d_seg.cp2_dx or 0),
                                y=b_seg.control.cp2.y + (d_seg.cp2_dy or 0)
                            )
                        from src.models.geometry import CurveControl
                        new_control = CurveControl(cp1=new_cp1, cp2=new_cp2)
                    
                    new_segments.append(Segment(
                        type=b_seg.type,
                        to=new_to,
                        control=new_control
                    ))
                
                new_paths.append(Path(
                    id=base_path.id,
                    segments=new_segments,
                    closed=base_path.closed,
                    fill=base_path.fill,
                    stroke=base_path.stroke
                ))
            
            new_parts.append(PatternPart(
                part_id=base_part.part_id,
                name=base_part.name,
                paths=new_paths
            ))
            
        return MasterGeometry(
            parts=new_parts,
            version=base.version,
            units=base.units
        )

    @staticmethod
    def calculate_delta_annotations(measurement_deltas: List[Dict[str, Any]]) -> List[str]:
        """Format +/- cm annotations for the blueprint using Vietnamese labels."""
        annotations = []
        for delta in measurement_deltas:
            key = delta.get("key")
            value = delta.get("value", 0.0) # in cm
            
            # Find Vietnamese label
            label_vi = delta.get("label_vi")
            if not label_vi:
                # Fallback to mapping
                _, label_vi = next(((v_key, lab) for k, (v_key, lab) in MEASUREMENT_MAPPING.items() if v_key == key), (None, key))
            
            sign = "+" if value >= 0 else ""
            annotations.append(f"{label_vi}: {sign}{value:.1f} cm")
        return annotations

    @staticmethod
    def generate_svg(
        geometry: MasterGeometry, 
        annotations: List[str], 
        design_id: str,
        geometry_hash: str
    ) -> str:
        """Generate a standalone SVG file for manufacturing."""
        # 1. Calculate bounding box
        min_x, min_y, max_x, max_y = float('inf'), float('inf'), float('-inf'), float('-inf')
        for part in geometry.parts:
            for path in part.paths:
                for seg in path.segments:
                    min_x = min(min_x, seg.to.x)
                    min_y = min(min_y, seg.to.y)
                    max_x = max(max_x, seg.to.x)
                    max_y = max(max_y, seg.to.y)
                    if seg.control:
                        min_x = min(min_x, seg.control.cp1.x)
                        min_y = min(min_y, seg.control.cp1.y)
                        max_x = max(max_x, seg.control.cp1.x)
                        max_y = max(max_y, seg.control.cp1.y)
                        if seg.control.cp2:
                            min_x = min(min_x, seg.control.cp2.x)
                            min_y = min(min_y, seg.control.cp2.y)
                            max_x = max(max_x, seg.control.cp2.x)
                            max_y = max(max_y, seg.control.cp2.y)

        # Padding
        padding = 50 
        width = max_x - min_x + 2 * padding
        height = max_y - min_y + 2 * padding
        view_box = f"{min_x - padding} {min_y - padding} {width} {height}"

        svg_lines = [
            '<?xml version="1.0" encoding="UTF-8" standalone="no"?>',
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}mm" height="{height}mm" viewBox="{view_box}">',
            f'  <metadata>',
            f'    <design_id>{design_id}</design_id>',
            f'    <export_timestamp>{datetime.datetime.now(datetime.timezone.utc).isoformat()}</export_timestamp>',
            f'    <geometry_hash>{geometry_hash}</geometry_hash>',
            f'  </metadata>',
            f'  <rect x="{min_x - padding}" y="{min_y - padding}" width="{width}" height="{height}" fill="white" />'
        ]

        # 2. Render parts
        for part in geometry.parts:
            svg_lines.append(f'  <g id="{part.part_id}" title="{part.name}">')
            for path in part.paths:
                d_elements = []
                for seg in path.segments:
                    if seg.type == "move":
                        d_elements.append(f"M {seg.to.x:.3f} {seg.to.y:.3f}")
                    elif seg.type == "line":
                        d_elements.append(f"L {seg.to.x:.3f} {seg.to.y:.3f}")
                    elif seg.type == "curve":
                        if seg.control:
                            if seg.control.cp2:
                                d_elements.append(f"C {seg.control.cp1.x:.3f} {seg.control.cp1.y:.3f}, {seg.control.cp2.x:.3f} {seg.control.cp2.y:.3f}, {seg.to.x:.3f} {seg.to.y:.3f}")
                            else:
                                d_elements.append(f"Q {seg.control.cp1.x:.3f} {seg.control.cp1.y:.3f}, {seg.to.x:.3f} {seg.to.y:.3f}")
                
                if path.closed:
                    d_elements.append("Z")
                
                d = " ".join(d_elements)
                stroke = path.stroke or "#000000"
                fill = path.fill or "none"
                svg_lines.append(f'    <path id="{path.id}" d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="1" />')
            svg_lines.append('  </g>')

        # 3. Render annotations
        # Position annotations in the top-left corner of the viewbox
        text_x = min_x - padding + 20
        text_y = min_y - padding + 40
        svg_lines.append(f'  <g id="annotations" font-family="Arial, sans-serif" font-size="14" fill="#85754E">')
        svg_lines.append(f'    <text x="{text_x}" y="{text_y}" font-weight="bold">BẢN VẼ SẢN XUẤT (Blueprint)</text>')
        for i, ann in enumerate(annotations):
            svg_lines.append(f'    <text x="{text_x}" y="{text_y + 25 + i*20}">{ann}</text>')
        svg_lines.append('  </g>')

        svg_lines.append('</svg>')
        return "\n".join(svg_lines)

    @staticmethod
    def generate_dxf(
        geometry: MasterGeometry, 
        annotations: List[str], 
        design_id: str,
        geometry_hash: str
    ) -> bytes:
        """Generate a DXF file for manufacturing (AutoCAD R2010)."""
        doc = ezdxf.new("R2010")
        doc.header["$INSUNITS"] = 4 # mm
        
        # Create layers
        doc.layers.add("OUTLINE", color=7) # White/Black
        doc.layers.add("ANNOTATION", color=2) # Yellow
        doc.layers.add("METADATA", color=5) # Blue

        msp = doc.modelspace()

        # 1. Render geometry
        for part in geometry.parts:
            for path in part.paths:
                current_pos = (0, 0)
                points = []
                for seg in path.segments:
                    if seg.type == "move":
                        current_pos = (seg.to.x, -seg.to.y) # Y is inverted in CAD vs SVG
                        points = [current_pos]
                    elif seg.type == "line":
                        to_pos = (seg.to.x, -seg.to.y)
                        msp.add_line(current_pos, to_pos, dxfattribs={"layer": "OUTLINE"})
                        current_pos = to_pos
                        points.append(current_pos)
                    elif seg.type == "curve":
                        if seg.control:
                            # ezdxf SPLINE requires fit points or control points
                            # For cubic bezier: start, cp1, cp2, end
                            to_pos = (seg.to.x, -seg.to.y)
                            cp1 = (seg.control.cp1.x, -seg.control.cp1.y)
                            if seg.control.cp2:
                                cp2 = (seg.control.cp2.x, -seg.control.cp2.y)
                                # Cubic Bezier
                                msp.add_spline(dxfattribs={"layer": "OUTLINE"}).set_open_uniform(
                                    [current_pos, cp1, cp2, to_pos],
                                    degree=3
                                )
                            else:
                                # Quadratic Bezier
                                msp.add_spline(dxfattribs={"layer": "OUTLINE"}).set_open_uniform(
                                    [current_pos, cp1, to_pos],
                                    degree=2
                                )
                            current_pos = to_pos
                            points.append(current_pos)
                
                if path.closed and points:
                    msp.add_line(current_pos, points[0], dxfattribs={"layer": "OUTLINE"})

        # 2. Render annotations
        # Find min/max to position text
        min_x = min(p.x for part in geometry.parts for path in part.paths for seg in path.segments for p in [seg.to])
        max_y = max(-p.y for part in geometry.parts for path in part.paths for seg in path.segments for p in [seg.to])
        
        text_x = min_x - 50
        text_y = max_y + 100
        
        msp.add_text(
            "BẢN VẼ SẢN XUẤT (Blueprint)",
            dxfattribs={"layer": "ANNOTATION", "height": 10}
        ).set_placement((text_x, text_y))
        
        for i, ann in enumerate(annotations):
            msp.add_text(
                ann,
                dxfattribs={"layer": "ANNOTATION", "height": 7}
            ).set_placement((text_x, text_y - 20 - i*15))

        # 3. Metadata
        msp.add_text(
            f"ID: {design_id}",
            dxfattribs={"layer": "METADATA", "height": 5}
        ).set_placement((text_x, text_y - 150))
        msp.add_text(
            f"Hash: {geometry_hash[:16]}...",
            dxfattribs={"layer": "METADATA", "height": 5}
        ).set_placement((text_x, text_y - 165))
        msp.add_text(
            f"Generated: {datetime.datetime.now(datetime.timezone.utc).isoformat()}",
            dxfattribs={"layer": "METADATA", "height": 5}
        ).set_placement((text_x, text_y - 180))

        # Output to stream (DXF is text-based, ezdxf.Drawing.write accepts TextIO)
        out = io.StringIO()
        doc.write(out)
        return out.getvalue().encode("utf-8")
