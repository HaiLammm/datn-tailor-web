"""Tests for Geometry Engine and BasePatternService."""

import pytest
from decimal import Decimal
from src.models.customer import MeasurementCreateRequest
from src.services.base_pattern_service import BasePatternService
from src.geometry.engine import GeometryEngine
from src.models.geometry import Point

def test_geometry_engine_basic():
    """Test basic geometry engine functions."""
    p1 = GeometryEngine.create_point(10, 10)
    assert p1.x == 10
    assert p1.y == 10
    
    p2 = GeometryEngine.mirror_point_x(p1, axis_x=0)
    assert p2.x == -10
    assert p2.y == 10

def test_generate_baseline_structure():
    """Test that generate_baseline returns valid MasterGeometry."""
    service = BasePatternService()
    measurements = MeasurementCreateRequest(
        neck=Decimal("36.0"),
        bust=Decimal("86.0"),
        waist=Decimal("68.0"),
        hip=Decimal("92.0"),
        shoulder_width=Decimal("36.0"),
        top_length=Decimal("100.0"),
        sleeve_length=Decimal("55.0")
    )
    
    geometry = service.generate_baseline(measurements)
    
    assert geometry.version == "1.0.0"
    assert geometry.units == "mm"
    assert len(geometry.parts) == 3
    
    part_ids = [p.part_id for p in geometry.parts]
    assert "front_bodice" in part_ids
    assert "back_bodice" in part_ids
    assert "sleeve" in part_ids

def test_generate_baseline_accuracy():
    """Test calculation accuracy ($|Calculated - Expected| <= 1mm)."""
    service = BasePatternService()
    # Measurements in cm
    neck_cm = 36.0
    bust_cm = 86.0
    scale = 10.0 # to mm
    
    measurements = MeasurementCreateRequest(
        neck=Decimal(str(neck_cm)),
        bust=Decimal(str(bust_cm)),
        waist=Decimal("68.0"),
        hip=Decimal("92.0"),
        shoulder_width=Decimal("36.0"),
        top_length=Decimal("100.0"),
        sleeve_length=Decimal("55.0")
    )
    
    geometry = service.generate_baseline(measurements)
    front = next(p for p in geometry.parts if p.part_id == "front_bodice")
    
    # Check Neck width (x_neck)
    # Formula: N / 6.0 + 10.0 (mm) (Note: + 10.0 was in mm in service logic?)
    # Wait, in service: N = neck * scale = 360
    # x_neck = N / 6.0 + 10.0 = 360 / 6 + 10 = 70.0
    
    # Find point at end of first curve (neck_shoulder)
    # Segments: 0=Move(neck_center), 1=Curve(neck_shoulder)
    p_neck_shoulder = front.paths[0].segments[1].to
    
    expected_x_neck = (neck_cm * scale) / 6.0 + 10.0
    assert abs(p_neck_shoulder.x - expected_x_neck) <= 1.0
    
    # Check Bust point (p_armpit x)
    # Formula: B / 4.0 + ease + 20.0
    # B = 860
    # x_bust = 860 / 4 + 5 + 20 = 215 + 25 = 240.0
    
    # Armpit is end of segment 3
    p_armpit = front.paths[0].segments[3].to
    
    expected_x_bust = (bust_cm * scale) / 4.0 + 5.0 + 20.0
    assert abs(p_armpit.x - expected_x_bust) <= 1.0

