"""API endpoints for Manual Override operations (Story 4.3)."""

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.dependencies import OwnerOrTailor, TenantId, get_db
from src.api.v1.guardrails import get_registry
from src.models.db_models import CustomerProfileDB, DesignDB, DesignOverrideDB, MeasurementDB, UserDB
from src.models.guardrail import GuardrailCheckResponse
from src.models.override import OverrideHistoryItem, OverrideHistoryResponse, OverrideRequest, OverrideResponse

router = APIRouter(prefix="/api/v1/designs", tags=["overrides"])


@router.post("/{design_id}/override", response_model=OverrideResponse)
async def submit_override(
    design_id: uuid.UUID,
    request: OverrideRequest,
    current_user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> OverrideResponse:
    """Submit a single manual override for a design.

    Story 4.3 AC#1, AC#2, AC#4.
    RBAC: Only Tailors and Owners can perform overrides.
    """
    # 1. Fetch design and verify ownership/tenant
    stmt = select(DesignDB).where(
        DesignDB.id == design_id,
        DesignDB.tenant_id == tenant_id
    )
    result = await db.execute(stmt)
    design = result.scalar_one_or_none()

    if not design:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Không tìm thấy thiết kế hoặc bạn không có quyền ghi đè thiết kế này."
        )

    # 2. Extract original AI value from master_geometry
    # We need to map English keys to Vietnamese labels/keys
    from src.api.v1.designs import BASE_PATTERN_VALUES, MEASUREMENT_MAPPING
    
    eng_key = None
    label_vi = "Thông số"
    for k, (vi_key, v_label) in MEASUREMENT_MAPPING.items():
        if vi_key == request.delta_key:
            eng_key = k
            label_vi = v_label
            break
            
    if not eng_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Key thông số không hợp lệ: {request.delta_key}"
        )

    base_val = BASE_PATTERN_VALUES.get(eng_key, 0.0)
    original_ai_delta = 0.0
    
    master_geo = design.master_geometry
    if isinstance(master_geo, dict) and "deltas" in master_geo:
        deltas = master_geo.get("deltas", {})
        if isinstance(deltas, dict) and "parts" in deltas:
            # MorphDelta format - difficult to map directly to measurements
            # For now we assume AI delta was 0 if not found in list format
            pass
        elif isinstance(deltas, list):
            # List of DeltaValue format
            for d in deltas:
                if isinstance(d, dict) and d.get("key") == request.delta_key:
                    original_ai_delta = float(d.get("value", 0.0))
                    break
    
    original_ai_value = base_val + original_ai_delta

    # 3. Run Guardrail check on overridden value
    # Fetch customer measurements for the user associated with the design
    stmt = (
        select(MeasurementDB)
        .join(CustomerProfileDB, MeasurementDB.customer_profile_id == CustomerProfileDB.id)
        .where(
            CustomerProfileDB.user_id == design.user_id,
            CustomerProfileDB.tenant_id == tenant_id,
            MeasurementDB.is_default == True
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    measurement = result.scalar_one_or_none()

    body_measurements = {}
    if measurement:
        for e_key, (v_key, _) in MEASUREMENT_MAPPING.items():
            val = getattr(measurement, e_key, None)
            if val is not None:
                body_measurements[v_key] = float(val)

    # Prepare final deltas (existing AI deltas + this specific override)
    check_deltas = []
    override_delta_val = request.overridden_value - base_val
    
    found_in_ai = False
    if isinstance(master_geo, dict) and "deltas" in master_geo:
        deltas_list = master_geo.get("deltas")
        if isinstance(deltas_list, list):
            for d in deltas_list:
                if isinstance(d, dict) and d.get("key") == request.delta_key:
                    check_deltas.append({
                        "key": d["key"],
                        "value": override_delta_val,
                        "unit": d.get("unit", "cm"),
                        "label_vi": d.get("label_vi", label_vi)
                    })
                    found_in_ai = True
                else:
                    check_deltas.append(d)
    
    if not found_in_ai:
        check_deltas.append({
            "key": request.delta_key,
            "value": override_delta_val,
            "unit": "cm",
            "label_vi": label_vi
        })

    # Run the check
    registry = get_registry()
    guardrail_result_dict = registry.run_all(body_measurements, check_deltas)
    guardrail_result = GuardrailCheckResponse(**guardrail_result_dict)

    if guardrail_result.status == "rejected":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "message": "Giá trị ghi đè vi phạm ràng buộc vật lý (Hard Constraint).",
                "violations": [v.model_dump() for v in guardrail_result.violations]
            }
        )

    # 4. Persist override record
    flagged = bool(request.reason_vi and request.reason_vi.strip())
    
    override_db = DesignOverrideDB(
        design_id=design_id,
        tenant_id=tenant_id,
        tailor_id=current_user.id,
        delta_key=request.delta_key,
        original_value=original_ai_value,
        overridden_value=request.overridden_value,
        label_vi=label_vi,
        reason_vi=request.reason_vi,
        flagged_for_learning=flagged,
        sequence_id=request.sequence_id
    )
    db.add(override_db)
    await db.flush()
    await db.commit()

    return OverrideResponse(
        id=override_db.id,
        delta_key=override_db.delta_key,
        label_vi=override_db.label_vi,
        original_value=float(override_db.original_value),
        overridden_value=float(override_db.overridden_value),
        reason_vi=override_db.reason_vi,
        flagged_for_learning=override_db.flagged_for_learning,
        guardrail_result=guardrail_result,
        created_at=override_db.created_at
    )


@router.get("/{design_id}/overrides", response_model=OverrideHistoryResponse)
async def get_override_history(
    design_id: uuid.UUID,
    current_user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> OverrideHistoryResponse:
    """Get override history for a design.

    Story 4.3 AC#6.
    """
    stmt = (
        select(DesignOverrideDB)
        .options(selectinload(DesignOverrideDB.tailor))
        .where(
            DesignOverrideDB.design_id == design_id,
            DesignOverrideDB.tenant_id == tenant_id
        )
        .order_by(DesignOverrideDB.created_at.desc())
    )
    result = await db.execute(stmt)
    overrides = result.scalars().all()

    history_items = []
    for o in overrides:
        tailor_name = o.tailor.full_name if o.tailor and o.tailor.full_name else "Thợ may"
        history_items.append(
            OverrideHistoryItem(
                id=o.id,
                delta_key=o.delta_key,
                label_vi=o.label_vi,
                original_value=float(o.original_value),
                overridden_value=float(o.overridden_value),
                reason_vi=o.reason_vi,
                tailor_name=tailor_name,
                created_at=o.created_at
            )
        )

    return OverrideHistoryResponse(
        overrides=history_items,
        total=len(history_items)
    )
