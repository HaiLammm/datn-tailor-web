"""Service for generating baseline patterns.

Handles the translation of customer measurements into initial geometry (P_base).
Follows Story 3.1 requirements.
"""

from decimal import Decimal
from typing import Dict, List, Optional

from src.models.geometry import (
    MasterGeometry,
    PatternPart,
    Path,
    Point,
    Segment,
    CurveControl,
)
from src.models.customer import MeasurementCreateRequest


class BasePatternService:
    """Service to generate base pattern geometry from measurements."""

    def generate_baseline(self, measurements: MeasurementCreateRequest) -> MasterGeometry:
        """
        Generate the complete master geometry for a baseline pattern.
        
        Args:
            measurements: Customer measurements (neck, bust, waist, etc.)
            
        Returns:
            MasterGeometry: The complete geometric definition (SSOT)
        """
        # Convert Decimals to float for calculation, defaulting to standard sizes if None
        # Standard size M roughly: Bust 86, Waist 68, Hip 92
        neck = float(measurements.neck or 36.0)
        bust = float(measurements.bust or 86.0)
        waist = float(measurements.waist or 68.0)
        hip = float(measurements.hip or 92.0)
        shoulder = float(measurements.shoulder_width or 36.0)
        top_length = float(measurements.top_length or 100.0) # Ao Dai length usually long
        sleeve_length = float(measurements.sleeve_length or 55.0)
        
        # Basic Ease allowances (cm) -> converted to mm for geometry
        # Geometry Engine works in mm
        scale = 10.0 
        
        # Calculate parts
        front_bodice = self._calculate_front_bodice(neck, bust, waist, hip, shoulder, top_length, scale)
        back_bodice = self._calculate_back_bodice(neck, bust, waist, hip, shoulder, top_length, scale)
        sleeve = self._calculate_sleeve(bust, sleeve_length, scale)
        
        return MasterGeometry(
            parts=[front_bodice, back_bodice, sleeve],
            version="1.0.0",
            units="mm"
        )

    def _calculate_front_bodice(
        self, neck: float, bust: float, waist: float, hip: float, 
        shoulder: float, length: float, scale: float
    ) -> PatternPart:
        """Calculate front bodice geometry."""
        
        # Measurements in mm
        N = neck * scale
        B = bust * scale
        W = waist * scale
        H = hip * scale
        S = shoulder * scale
        L = length * scale
        
        # Vertical reference lines
        # A: Top Neck Point (HPS - High Point Shoulder approx)
        # B: Bust Line (approx 24cm down)
        # C: Waist Line (approx 38cm down)
        # D: Hip Line (approx 58cm down)
        # E: Hem Line (Length)
        
        y_neck = 0.0
        y_bust = 240.0  # 24cm
        y_waist = 380.0 # 38cm
        y_hip = 580.0   # 58cm
        y_hem = L
        
        # Horizontal calculations (Quarter measurements + ease)
        # Ease: 2cm total -> 0.5cm per quarter -> 5mm
        ease = 5.0
        
        x_center = 0.0
        x_neck = N / 6.0 + 10.0 # Standard neck width formula
        x_shoulder = S / 2.0
        x_bust = B / 4.0 + ease + 20.0 # Dart allowance/Chest width
        x_waist = W / 4.0 + ease + 30.0 # Dart allowance
        x_hip = H / 4.0 + ease
        x_hem = x_hip + 50.0 # A-line flare
        
        # Shoulder slope approx 4cm
        y_shoulder = 40.0 
        
        # Points
        p_neck_center = Point(x=x_center, y=y_neck + 20.0) # Front neck drop
        p_neck_shoulder = Point(x=x_neck, y=y_neck)
        p_shoulder_tip = Point(x=x_shoulder, y=y_shoulder)
        p_armpit = Point(x=x_bust, y=y_bust)
        p_waist_side = Point(x=x_waist, y=y_waist)
        p_hip_side = Point(x=x_hip, y=y_hip)
        p_hem_side = Point(x=x_hem, y=y_hem)
        p_hem_center = Point(x=x_center, y=y_hem)
        
        # Path
        segments = [
            # Start at center neck
            Segment(type="move", to=p_neck_center),
            
            # Neck curve
            Segment(
                type="curve", 
                to=p_neck_shoulder, 
                control=CurveControl(
                    cp1=Point(x=x_center + (x_neck * 0.5), y=y_neck + 20.0), # Bottom heavy curve
                    cp2=Point(x=x_neck, y=y_neck + 5.0)
                )
            ),
            
            # Shoulder seam
            Segment(type="line", to=p_shoulder_tip),
            
            # Armhole curve
            Segment(
                type="curve", 
                to=p_armpit, 
                control=CurveControl(
                    cp1=Point(x=x_shoulder, y=y_bust - 60.0), # Vertical down from shoulder
                    cp2=Point(x=x_bust - 20.0, y=y_bust)      # Horizontal into armpit
                )
            ),
            
            # Side seam (Bust to Waist)
            Segment(type="curve", to=p_waist_side, control=CurveControl(cp1=Point(x=x_bust, y=(y_bust+y_waist)/2), cp2=None)),
            
            # Side seam (Waist to Hip)
            Segment(type="curve", to=p_hip_side, control=CurveControl(cp1=Point(x=x_waist, y=(y_waist+y_hip)/2), cp2=None)),
            
            # Side seam (Hip to Hem) - A-line
            Segment(type="line", to=p_hem_side),
            
            # Hem
            Segment(type="curve", to=p_hem_center, control=CurveControl(cp1=Point(x=x_hem/2, y=y_hem + 10.0), cp2=None)),
            
            # Center Front (Closing the loop)
            Segment(type="line", to=p_neck_center)
        ]
        
        path = Path(
            id="front_bodice_outline",
            segments=segments,
            closed=True,
            fill="#FDFCF5", # Silk Ivory
            stroke="#4f46e5" # Indigo Depth
        )
        
        return PatternPart(
            part_id="front_bodice",
            name="Thân trước",
            paths=[path]
        )

    def _calculate_back_bodice(
        self, neck: float, bust: float, waist: float, hip: float, 
        shoulder: float, length: float, scale: float
    ) -> PatternPart:
        """Calculate back bodice geometry."""
        # Similar to front but different neck and armhole
        
        N = neck * scale
        B = bust * scale
        W = waist * scale
        H = hip * scale
        S = shoulder * scale
        L = length * scale
        
        y_neck = 0.0
        y_bust = 240.0
        y_waist = 380.0
        y_hip = 580.0
        y_hem = L
        
        ease = 5.0
        
        x_center = 0.0
        x_neck = N / 6.0 + 15.0 # Back neck slightly wider
        x_shoulder = S / 2.0
        x_bust = B / 4.0 + ease
        x_waist = W / 4.0 + ease + 20.0 # Less dart
        x_hip = H / 4.0 + ease
        x_hem = x_hip + 50.0
        
        y_shoulder = 40.0
        
        p_neck_center = Point(x=x_center, y=y_neck + 5.0) # Shallow back neck
        p_neck_shoulder = Point(x=x_neck, y=y_neck)
        p_shoulder_tip = Point(x=x_shoulder, y=y_shoulder)
        p_armpit = Point(x=x_bust, y=y_bust)
        p_waist_side = Point(x=x_waist, y=y_waist)
        p_hip_side = Point(x=x_hip, y=y_hip)
        p_hem_side = Point(x=x_hem, y=y_hem)
        p_hem_center = Point(x=x_center, y=y_hem)
        
        segments = [
            Segment(type="move", to=p_neck_center),
            Segment(type="curve", to=p_neck_shoulder, control=CurveControl(cp1=Point(x=x_neck/2, y=y_neck + 5.0))),
            Segment(type="line", to=p_shoulder_tip),
            Segment(type="curve", to=p_armpit, control=CurveControl(cp1=Point(x=x_shoulder, y=y_bust - 50.0), cp2=Point(x=x_bust - 10.0, y=y_bust))),
            Segment(type="curve", to=p_waist_side, control=CurveControl(cp1=Point(x=x_bust, y=(y_bust+y_waist)/2))),
            Segment(type="curve", to=p_hip_side, control=CurveControl(cp1=Point(x=x_waist, y=(y_waist+y_hip)/2))),
            Segment(type="line", to=p_hem_side),
            Segment(type="curve", to=p_hem_center, control=CurveControl(cp1=Point(x=x_hem/2, y=y_hem + 10.0))),
            Segment(type="line", to=p_neck_center)
        ]
        
        path = Path(
            id="back_bodice_outline",
            segments=segments,
            closed=True,
            fill="#FDFCF5",
            stroke="#4f46e5"
        )
        
        return PatternPart(
            part_id="back_bodice",
            name="Thân sau",
            paths=[path]
        )

    def _calculate_sleeve(self, bust: float, length: float, scale: float) -> PatternPart:
        """Calculate sleeve geometry."""
        
        B = bust * scale
        L = length * scale
        
        # Sleeve cap height approx B/4
        cap_height = B / 4.0
        # Bicep width approx B/3 + ease
        bicep = B / 3.0 + 30.0
        wrist = 240.0 # 24cm wrist approx
        
        p_top = Point(x=bicep/2, y=0.0)
        p_bicep_left = Point(x=0.0, y=cap_height)
        p_bicep_right = Point(x=bicep, y=cap_height)
        p_wrist_left = Point(x=(bicep - wrist)/2, y=L)
        p_wrist_right = Point(x=bicep - (bicep - wrist)/2, y=L)
        
        segments = [
            Segment(type="move", to=p_top),
            # Cap curve right
            Segment(type="curve", to=p_bicep_right, control=CurveControl(cp1=Point(x=bicep*0.75, y=0), cp2=Point(x=bicep, y=cap_height*0.5))),
            # Underarm seam right
            Segment(type="line", to=p_wrist_right),
            # Wrist
            Segment(type="line", to=p_wrist_left),
            # Underarm seam left
            Segment(type="line", to=p_bicep_left),
            # Cap curve left
            Segment(type="curve", to=p_top, control=CurveControl(cp1=Point(x=0, y=cap_height*0.5), cp2=Point(x=bicep*0.25, y=0)))
        ]
        
        path = Path(
            id="sleeve_outline",
            segments=segments,
            closed=True,
            fill="#FDFCF5",
            stroke="#4f46e5"
        )
        
        return PatternPart(
            part_id="sleeve",
            name="Tay áo",
            paths=[path]
        )
