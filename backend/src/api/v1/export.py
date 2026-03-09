"""API router for Manufacturing Blueprint Export - Story 4.4.

Provides endpoints for exporting locked designs as SVG or DXF files.
Includes RBAC (Owner/Tailor only), tenant isolation, and guardrail validation.
"""

import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
import io
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import require_roles, get_tenant_id_from_user
from src.api.v1.guardrails import get_registry
from src.core.database import get_db
from src.core.hashing import compute_master_geometry_hash
from src.models.db_models import DesignDB, UserDB, CustomerProfileDB, MeasurementDB
from src.models.geometry import LockedDesign, MasterGeometry
from src.models.export import ExportFormat
from src.services.export_service import ExportService
from src.services.base_pattern_service import BasePatternService
from src.api.v1.designs import MEASUREMENT_MAPPING

router = APIRouter(prefix="/api/v1/designs", tags=["export"])


@router.post("/{design_id}/export")
async def export_design(
    design_id: uuid.UUID,
    format: ExportFormat = Query(ExportFormat.SVG),
    current_user: UserDB = Depends(require_roles("Owner", "Tailor")),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    db: AsyncSession = Depends(get_db),
):
    """Export a locked design for production.
    
    Story 4.4:
    - Auth: Owner or Tailor only
    - Tenant isolation: Filter by tenant_id
    - Guardrails: Run check on locked geometry before export
    - Returns: StreamingResponse (SVG or DXF)
    """
    # 1. Load Design
    stmt = select(DesignDB).where(
        DesignDB.id == design_id, 
        DesignDB.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    design = result.scalar_one_or_none()
    
    if not design:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy thiết kế hoặc bạn không có quyền truy cập."
        )
    
    if design.status != "locked":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="Chỉ có thể xuất bản vẽ cho thiết kế đã khóa (locked)."
        )
    
    # 2. Integrity Check
    master_geo_data = design.master_geometry
    if not master_geo_data or "geometry_hash" not in master_geo_data:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="Dữ liệu thiết kế không hợp lệ hoặc bị hỏng."
        )
    
    # Verify geometry_hash
    computed_hash = compute_master_geometry_hash(master_geo_data)
    if computed_hash != design.geometry_hash:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail="Phát hiện sai lệch dữ liệu (Geometry Integrity Failure). Không thể xuất bản vẽ."
        )
        
    # 3. Guardrail Check
    # Need customer measurements and suggested deltas
    locked_design = LockedDesign.model_validate(master_geo_data)
    
    # Load customer measurements
    body_measurements = {}
    stmt_customer = select(CustomerProfileDB).where(
        CustomerProfileDB.user_id == design.user_id,
        CustomerProfileDB.tenant_id == tenant_id
    ).limit(1)
    res_customer = await db.execute(stmt_customer)
    customer = res_customer.scalar_one_or_none()
    
    if customer:
        stmt_measure = select(MeasurementDB).where(
            MeasurementDB.customer_profile_id == customer.id,
            MeasurementDB.is_default == True
        ).limit(1)
        res_measure = await db.execute(stmt_measure)
        measurement = res_measure.scalar_one_or_none()
        if measurement:
            for eng_field, (vi_key, _) in MEASUREMENT_MAPPING.items():
                val = getattr(measurement, eng_field, None)
                if val is not None:
                    body_measurements[vi_key] = float(val)

    # Convert deltas list for guardrail check
    suggested_deltas = {}
    if locked_design.measurement_deltas:
        for d in locked_design.measurement_deltas:
            suggested_deltas[d["key"]] = d["value"]

    registry = get_registry()
    guardrail_result = registry.run_all(body_measurements, suggested_deltas)
    
    if guardrail_result["status"] == "rejected":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, 
            detail={
                "message": "Thiết kế vi phạm các quy tắc vàng kỹ thuật. Vui lòng kiểm tra lại tại Sanity Check.",
                "violations": [v.model_dump() for v in guardrail_result["violations"]]
            }
        )

    # 4. Generate Export
    # Reconstruct MasterGeometry from base + deltas
    # For now, we need to load the base geometry. 
    # BasePatternService.generate_baseline needs measurement profile.
    base_pattern_service = BasePatternService()
    # If customer profile found, use it; otherwise use defaults
    measurement_request = None
    if measurement:
        from src.models.customer import MeasurementCreateRequest
        measurement_request = MeasurementCreateRequest(
            neck=measurement.neck,
            shoulder_width=measurement.shoulder_width,
            bust=measurement.bust,
            waist=measurement.waist,
            hip=measurement.hip,
            top_length=measurement.top_length,
            sleeve_length=measurement.sleeve_length,
            wrist=measurement.wrist
        )
    else:
        # Defaults if no profile linked
        from src.models.customer import MeasurementCreateRequest
        measurement_request = MeasurementCreateRequest()

    base_geometry = base_pattern_service.generate_baseline(measurement_request)
    
    # Final geometry reconstruction
    final_geometry = ExportService.reconstruct_geometry(base_geometry, locked_design.deltas)
    
    # Format annotations
    annotations = ExportService.calculate_delta_annotations(locked_design.measurement_deltas or [])

    if format == ExportFormat.SVG:
        svg_content = ExportService.generate_svg(
            final_geometry, 
            annotations, 
            str(design.id), 
            design.geometry_hash
        )
        return StreamingResponse(
            io.BytesIO(svg_content.encode("utf-8")),
            media_type="image/svg+xml",
            headers={"Content-Disposition": f"attachment; filename=blueprint-{design_id}.svg"}
        )
    else:
        dxf_bytes = ExportService.generate_dxf(
            final_geometry, 
            annotations, 
            str(design.id), 
            design.geometry_hash
        )
        return StreamingResponse(
            io.BytesIO(dxf_bytes),
            media_type="application/dxf",
            headers={"Content-Disposition": f"attachment; filename=blueprint-{design_id}.dxf"}
        )
