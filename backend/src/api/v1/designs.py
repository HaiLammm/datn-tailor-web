"""API endpoints for Design lock operations (Story 3.4, 4.1a, 4.2)."""

import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_from_token, get_tenant_id_from_user, require_roles
from src.api.v1.guardrails import get_registry
from src.core.database import get_db
from src.core.hashing import compute_base_hash, compute_base_pattern_hash, compute_master_geometry_hash
from src.models.db_models import CustomerProfileDB, DesignDB, MeasurementDB, UserDB
from src.models.geometry import LockDesignRequest, LockedDesign
from src.models.guardrail import SanityCheckRequest, SanityCheckResponse, SanityCheckRow
from src.services.base_pattern_service import BasePatternService

router = APIRouter(prefix="/api/v1/designs", tags=["designs"])


# --- Story 4.2: Measurement field mapping ---
# Maps English DB field names to Vietnamese keys and labels
MEASUREMENT_MAPPING = {
    "neck": ("vong_co", "Vòng cổ"),
    "shoulder_width": ("rong_vai", "Rộng vai"),
    "bust": ("vong_nguc", "Vòng ngực"),
    "waist": ("vong_eo", "Vòng eo"),
    "hip": ("vong_mong", "Vòng mông"),
    "top_length": ("dai_ao", "Dài áo"),
    "sleeve_length": ("dai_tay", "Dài tay"),
    "wrist": ("vong_co_tay", "Vòng cổ tay"),
}

# Base pattern standard values (from STYLE_PRESETS in geometry engine)
# These represent standard pattern measurements for a "medium" size
BASE_PATTERN_VALUES = {
    "neck": 38.0,
    "shoulder_width": 40.0,
    "bust": 88.0,
    "waist": 70.0,
    "hip": 94.0,
    "top_length": 65.0,
    "sleeve_length": 58.0,
    "wrist": 16.0,
}


def _classify_severity(delta: float) -> Literal["normal", "warning", "danger"]:
    """Classify delta magnitude into severity level.

    Story 4.2 Task 1.3:
    - "normal": |delta| < 2cm
    - "warning": 2cm <= |delta| < 5cm
    - "danger": |delta| >= 5cm
    """
    abs_delta = abs(delta)
    if abs_delta >= 5.0:
        return "danger"
    elif abs_delta >= 2.0:
        return "warning"
    return "normal"


@router.post("/lock")
async def lock_design(
    request: LockDesignRequest,
    current_user: UserDB = Depends(require_roles("Owner", "Tailor")),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Lock a design, generating the Master Geometry JSON (SSOT).

    Story 4.1a: Guardrail check runs BEFORE persisting.
    Story 4.3: Merge overrides if updating an existing design.

    Returns:
        design_id, success status, and optional warnings.
    """
    # 1. Merge Measurement Deltas and Overrides
    final_measurement_deltas = []
    if request.measurement_deltas:
        final_measurement_deltas = request.measurement_deltas

    if request.design_id:
        # Fetch existing overrides for this design
        from src.models.db_models import DesignOverrideDB
        stmt = select(DesignOverrideDB).where(
            DesignOverrideDB.design_id == request.design_id,
            DesignOverrideDB.tenant_id == tenant_id
        )
        result = await db.execute(stmt)
        overrides = result.scalars().all()

        if overrides:
            for o in overrides:
                eng_key = next((k for k, (v_key, _) in MEASUREMENT_MAPPING.items() if v_key == o.delta_key), None)
                base_val = BASE_PATTERN_VALUES.get(eng_key, 0.0) if eng_key else 0.0
                overridden_delta = float(o.overridden_value) - base_val

                # Update or append to measurement_deltas
                found = False
                for d in final_measurement_deltas:
                    if d.get("key") == o.delta_key:
                        d["value"] = overridden_delta
                        found = True
                        break
                if not found:
                    final_measurement_deltas.append({
                        "key": o.delta_key,
                        "value": overridden_delta,
                        "unit": o.delta_unit,
                        "label_vi": o.label_vi
                    })

    # 2. Story 4.1a: Run guardrail check before locking
    measurements = {}
    if request.base_measurements:
        measurements = {
            k: v
            for k, v in request.base_measurements.items()
            if v is not None
        }

    # Pass final merged deltas to guardrail check
    registry = get_registry()
    guardrail_result = registry.run_all(measurements, final_measurement_deltas)

    if guardrail_result["status"] == "rejected":
        # AC#2: Query last valid sequence_id for snap-back
        last_valid_id = await _get_last_valid_sequence_id(db, current_user.id, tenant_id)
        raise HTTPException(
            status_code=422,
            detail={
                "message": "Thiết kế vi phạm ràng buộc vật lý, không thể khóa.",
                "violations": [v.model_dump() for v in guardrail_result["violations"]],
                "warnings": [w.model_dump() for w in guardrail_result["warnings"]],
                "last_valid_sequence_id": last_valid_id,
            },
        )

    sequence_id = str(uuid.uuid4())

    # Compute base_hash from base_id reference
    base_hash = compute_base_hash(request.base_id)

    # Build the LockedDesign without geometry_hash first
    design_data = {
        "sequence_id": sequence_id,
        "base_hash": base_hash,
        "deltas": request.deltas.model_dump(),
        "measurement_deltas": final_measurement_deltas,
    }

    # Compute geometry_hash over the canonical representation
    geometry_hash = compute_master_geometry_hash(design_data)

    # Create the full LockedDesign
    locked = LockedDesign(
        sequence_id=sequence_id,
        base_hash=base_hash,
        deltas=request.deltas,
        measurement_deltas=final_measurement_deltas,
        geometry_hash=geometry_hash,
    )

    # Persist to database
    if request.design_id:
        stmt = select(DesignDB).where(DesignDB.id == request.design_id, DesignDB.tenant_id == tenant_id)
        result = await db.execute(stmt)
        design_record = result.scalar_one_or_none()
        if design_record:
            design_record.master_geometry = locked.model_dump()
            design_record.geometry_hash = geometry_hash
            design_record.status = "locked"
        else:
            raise HTTPException(status_code=404, detail="Không tìm thấy thiết kế để cập nhật")
    else:
        design_record = DesignDB(
            user_id=current_user.id,
            tenant_id=tenant_id,
            master_geometry=locked.model_dump(),
            geometry_hash=geometry_hash,
            status="locked",
        )
        db.add(design_record)
    
    await db.flush()
    await db.commit()

    # Include warnings in response if any soft constraints triggered
    response = {
        "design_id": str(design_record.id),
        "sequence_id": sequence_id,
        "geometry_hash": geometry_hash,
        "status": "locked",
    }
    if guardrail_result["warnings"]:
        response["warnings"] = [
            w.model_dump() for w in guardrail_result["warnings"]
        ]

    return response


async def _get_last_valid_sequence_id(
    db: AsyncSession, user_id: uuid.UUID, tenant_id: uuid.UUID
) -> str | None:
    """Query the most recent locked design's sequence_id for snap-back (AC#2).

    Returns None if no previous valid snapshot exists.
    """
    stmt = (
        select(DesignDB.master_geometry)
        .where(
            DesignDB.user_id == user_id,
            DesignDB.tenant_id == tenant_id,
            DesignDB.status == "locked",
        )
        .order_by(DesignDB.created_at.desc())
        .limit(1)
    )
    result = await db.execute(stmt)
    row = result.scalar_one_or_none()
    if row and isinstance(row, dict):
        return row.get("sequence_id")
    return None


@router.post("/sanity-check", response_model=SanityCheckResponse)
async def sanity_check(
    request: SanityCheckRequest,
    current_user: UserDB = Depends(require_roles("Owner", "Tailor")),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    db: AsyncSession = Depends(get_db),
) -> SanityCheckResponse:
    """Get 3-column sanity check data for Artisan Dashboard.

    Story 4.2 AC#1-5: Returns comparison data (Body, Base, Suggested)
    for each measurement dimension with severity classification.

    RBAC: Requires authentication - only authenticated users can access.
    """
    # Ensure tenant isolation - filter queries by tenant_id
    rows: list[SanityCheckRow] = []
    guardrail_status: str | None = None
    is_locked: bool = False
    geometry_hash: str | None = None
    design_id: str | None = None

    # Fetch customer measurements if customer_id provided
    body_measurements: dict[str, float] = {}
    if request.customer_id:
        try:
            customer_uuid = uuid.UUID(request.customer_id)
            # Get the default measurement for this customer (with tenant isolation)
            stmt = (
                select(MeasurementDB)
                .join(CustomerProfileDB)
                .where(
                    CustomerProfileDB.id == customer_uuid,
                    CustomerProfileDB.tenant_id == tenant_id,
                    MeasurementDB.is_default == True,
                )
                .limit(1)
            )
            result = await db.execute(stmt)
            measurement = result.scalar_one_or_none()

            if measurement:
                # Map English DB fields to Vietnamese keys
                for eng_field, (vi_key, _) in MEASUREMENT_MAPPING.items():
                    value = getattr(measurement, eng_field, None)
                    if value is not None:
                        body_measurements[vi_key] = float(value)
        except (ValueError, TypeError):
            # Invalid UUID format - ignore and use empty measurements
            pass

    # Fetch design data if design_sequence_id provided
    suggested_deltas: dict[str, float] = {}
    if request.design_sequence_id:
        # Look up design by sequence_id in master_geometry JSON (with tenant isolation)
        stmt = select(DesignDB).where(
            DesignDB.master_geometry["sequence_id"].astext == str(request.design_sequence_id),
            DesignDB.tenant_id == tenant_id,
        ).limit(1)
        result = await db.execute(stmt)
        design = result.scalar_one_or_none()

        if design:
            design_id = str(design.id)
            is_locked = design.status == "locked"
            geometry_hash = design.geometry_hash
            
            # Extract deltas from master_geometry
            master_geo = design.master_geometry
            if isinstance(master_geo, dict) and "measurement_deltas" in master_geo:
                m_deltas = master_geo.get("measurement_deltas")
                if isinstance(m_deltas, list):
                    for d in m_deltas:
                        if isinstance(d, dict) and "key" in d and "value" in d:
                            suggested_deltas[d["key"]] = d["value"]
            
            # Fallback to deltas list if measurement_deltas not found
            if not suggested_deltas and isinstance(master_geo, dict) and "deltas" in master_geo:
                deltas_data = master_geo.get("deltas", {})
                if isinstance(deltas_data, list):
                    for delta in deltas_data:
                        if isinstance(delta, dict) and "key" in delta and "value" in delta:
                            suggested_deltas[delta["key"]] = delta["value"]

    # Build sanity check rows for each measurement dimension
    for eng_field, (vi_key, label_vi) in MEASUREMENT_MAPPING.items():
        base_value = BASE_PATTERN_VALUES.get(eng_field, 0.0)
        body_value = body_measurements.get(vi_key)
        
        # Suggested = Base + Delta (if delta exists)
        delta_value = suggested_deltas.get(vi_key, 0.0)
        suggested_value = base_value + delta_value

        # Compute delta for display (suggested - base)
        delta = suggested_value - base_value

        # Classify severity
        severity = _classify_severity(delta)

        rows.append(
            SanityCheckRow(
                key=vi_key,
                label_vi=label_vi,
                body_value=body_value,
                base_value=base_value,
                suggested_value=suggested_value,
                overridden_value=None,  # Not overridden initially
                delta=delta,
                unit="cm",
                severity=severity,
            )
        )

    # Default guardrail status
    guardrail_status = "passed"

    # Run guardrail check if we have measurements
    if body_measurements:
        registry = get_registry()
        guardrail_result = registry.run_all(body_measurements, suggested_deltas)
        guardrail_status = guardrail_result["status"]

    return SanityCheckResponse(
        design_id=design_id,
        rows=rows,
        guardrail_status=guardrail_status,
        is_locked=is_locked,
        geometry_hash=geometry_hash,
    )
