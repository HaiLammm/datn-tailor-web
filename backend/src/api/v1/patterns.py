"""Pattern Engine API Router (Story 11.2).

Endpoints:
  POST /api/v1/patterns/sessions              — Create draft session (Owner only)
  POST /api/v1/patterns/sessions/{id}/generate — Generate 3 pieces (Owner only)
  GET  /api/v1/patterns/sessions/{id}         — Get session detail (Owner or Tailor)

Response wrapper: {"data": ..., "meta": {}}
Auth: OwnerOnly / OwnerOrTailor from src.api.dependencies
DB: AsyncSession via get_db
"""

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, OwnerOrTailor, TenantId
from src.core.database import get_db
from src.models.pattern import PatternSessionCreate
from src.services import pattern_service

router = APIRouter(prefix="/api/v1/patterns", tags=["patterns"])


@router.post(
    "/sessions",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create pattern session (Owner only)",
    description=(
        "Creates a new draft pattern session with 10 body measurements. "
        "Validates customer belongs to tenant. Returns session with status='draft'."
    ),
)
async def create_pattern_session_endpoint(
    data: PatternSessionCreate,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """POST /api/v1/patterns/sessions — Owner only.

    AC #1: Creates pattern_session with status='draft', tenant isolation applied.
    """
    result = await pattern_service.create_session(db, data, user, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.post(
    "/sessions/{session_id}/generate",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Generate pattern pieces (Owner only)",
    description=(
        "Runs the deterministic formula engine on a draft pattern session. "
        "Produces exactly 3 pieces: front_bodice, back_bodice, sleeve. "
        "Transitions session status from 'draft' → 'completed'."
    ),
)
async def generate_pattern_pieces_endpoint(
    session_id: uuid.UUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """POST /api/v1/patterns/sessions/{id}/generate — Owner only.

    AC #2: Generates 3 pattern pieces, updates session status to 'completed'.
    """
    result = await pattern_service.generate_patterns(db, session_id, user, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}


@router.get(
    "/sessions/{session_id}",
    response_model=dict,
    summary="Get pattern session detail (Owner or Tailor)",
    description=(
        "Returns a pattern session with all measurements and nested pattern pieces "
        "(if generation has been completed). Returns 404 if session not found or "
        "belongs to a different tenant."
    ),
)
async def get_pattern_session_endpoint(
    session_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """GET /api/v1/patterns/sessions/{id} — Owner or Tailor.

    AC #6: Returns session with pieces; 404 on not found / wrong tenant.
    """
    result = await pattern_service.get_session(db, session_id, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}
