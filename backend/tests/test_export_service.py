"""Unit tests for ExportService - Story 4.4.

Verifies SVG/DXF generation, geometry reconstruction, and delta annotations.
"""

import pytest
from src.services.export_service import ExportService
from src.services.base_pattern_service import BasePatternService
from src.models.customer import MeasurementCreateRequest
from src.models.geometry import MorphDelta, MorphDeltaPart, MorphDeltaPath, MorphDeltaSegment, Point
from decimal import Decimal
import ezdxf

def test_reconstruct_geometry():
    """Test applying MorphDelta to MasterGeometry."""
    service = BasePatternService()
    base = service.generate_baseline(MeasurementCreateRequest())
    
    # Create a simple delta for front_bodice_outline (first path of first part)
    # We'll just move the first segment (move) by 10mm
    delta_segment = MorphDeltaSegment(dx=10.0, dy=5.0)
    delta_path = MorphDeltaPath(path_id="front_bodice_outline", segments=[delta_segment])
    delta_part = MorphDeltaPart(part_id="front_bodice", paths=[delta_path])
    deltas = MorphDelta(parts=[delta_part], style_id="test")
    
    reconstructed = ExportService.reconstruct_geometry(base, deltas)
    
    # Check if front_bodice first point moved
    orig_point = base.parts[0].paths[0].segments[0].to
    new_point = reconstructed.parts[0].paths[0].segments[0].to
    
    assert new_point.x == orig_point.x + 10.0
    assert new_point.y == orig_point.y + 5.0
    
    # Check if other parts remain unchanged
    assert reconstructed.parts[1].paths[0].segments[0].to.x == base.parts[1].paths[0].segments[0].to.x

def test_calculate_delta_annotations():
    """Test formatting of Vietnamese annotations."""
    measurement_deltas = [
        {"key": "vong_nguc", "value": 2.5, "unit": "cm", "label_vi": "Vòng ngực"},
        {"key": "vong_eo", "value": -1.2, "unit": "cm"}
    ]
    
    annotations = ExportService.calculate_delta_annotations(measurement_deltas)
    
    assert "Vòng ngực: +2.5 cm" in annotations
    assert "Vòng eo: -1.2 cm" in annotations

def test_generate_svg():
    """Test SVG generation produces valid-looking XML."""
    service = BasePatternService()
    geometry = service.generate_baseline(MeasurementCreateRequest())
    annotations = ["Vòng ngực: +2.0 cm"]
    
    svg = ExportService.generate_svg(geometry, annotations, "test-id", "test-hash")
    
    assert svg.startswith('<?xml version="1.0"')
    assert '<svg xmlns="http://www.w3.org/2000/svg"' in svg
    assert 'id="front_bodice"' in svg
    assert 'Vòng ngực: +2.0 cm' in svg
    assert 'test-hash' in svg

def test_generate_dxf():
    """Test DXF generation produces parseable DXF data."""
    service = BasePatternService()
    geometry = service.generate_baseline(MeasurementCreateRequest())
    annotations = ["Vòng ngực: +2.0 cm"]
    
    dxf_bytes = ExportService.generate_dxf(geometry, annotations, "test-id", "test-hash")
    
    assert isinstance(dxf_bytes, bytes)
    assert len(dxf_bytes) > 0
    
    # Verify it's a valid DXF by parsing it back
    import io
    dxf_stream = io.StringIO(dxf_bytes.decode("utf-8", errors="ignore"))
    # ezdxf.read can take a stream
    # Actually ezdxf.readstr might be easier but it needs string
    try:
        doc = ezdxf.read(io.StringIO(dxf_bytes.decode("ascii", errors="ignore")))
        assert doc.header["$INSUNITS"] == 4
        assert "OUTLINE" in doc.layers
        assert "ANNOTATION" in doc.layers
    except Exception as e:
        pytest.fail(f"DXF generation produced invalid data: {e}")

def test_svg_coordinate_precision():
    """NFR3: Verify SVG coordinate precision <= 1mm.
    
    The SVG format string uses .3f (3 decimal places) for coordinates,
    ensuring sub-millimeter precision. This test verifies that the
    reconstructed geometry coordinates do not drift more than 1mm
    from expected values.
    """
    service = BasePatternService()
    base = service.generate_baseline(MeasurementCreateRequest())
    
    # Apply known deltas and verify coordinates are preserved with <=1mm error
    delta_segment = MorphDeltaSegment(dx=5.123, dy=3.456)
    delta_path = MorphDeltaPath(path_id="front_bodice_outline", segments=[delta_segment])
    delta_part = MorphDeltaPart(part_id="front_bodice", paths=[delta_path])
    deltas = MorphDelta(parts=[delta_part], style_id="test")
    
    reconstructed = ExportService.reconstruct_geometry(base, deltas)
    
    # Generate SVG and verify coordinate precision
    svg = ExportService.generate_svg(reconstructed, [], "test-id", "test-hash")
    
    # Expected coordinates
    expected_x = base.parts[0].paths[0].segments[0].to.x + 5.123
    expected_y = base.parts[0].paths[0].segments[0].to.y + 3.456
    
    # Check that the SVG contains coordinates with .3f precision
    # The format is "M x.xxx y.yyy" or "L x.xxx y.yyy"
    expected_str = f"{expected_x:.3f} {expected_y:.3f}"
    assert expected_str in svg, f"Expected coordinate string '{expected_str}' not found in SVG output"
    
    # Verify actual vs reconstructed difference is within 1mm (NFR3)
    actual = reconstructed.parts[0].paths[0].segments[0].to
    assert abs(actual.x - expected_x) <= 1.0, f"X coordinate drift {abs(actual.x - expected_x)} exceeds 1mm"
    assert abs(actual.y - expected_y) <= 1.0, f"Y coordinate drift {abs(actual.y - expected_y)} exceeds 1mm"
