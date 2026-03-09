"""Smart Rules CRUD API Endpoints - Story 2.5: Rule Editor.

Provides endpoints for the Owner (Cô Lan) to view and edit Smart Rules
that drive the AI inference engine.

RBAC: Owner-only access (AC5).
Uses 100% Vietnamese error messages per NFR11.
"""

import logging

from fastapi import APIRouter, HTTPException, status

from src.api.dependencies import OwnerOnly
from src.models.rule import (
    RulePillarDetail,
    RulePillarSummary,
    RuleUpdateRequest,
    RuleUpdateResponse,
)
from src.services.smart_rules_service import SmartRulesService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rules", tags=["rules"])

# Singleton service instance (in-memory LKB for MVP)
_smart_rules_service = SmartRulesService()


def get_smart_rules_service() -> SmartRulesService:
    """Get the singleton SmartRulesService instance."""
    return _smart_rules_service


@router.get("/pillars", response_model=list[RulePillarSummary])
async def list_rule_pillars(
    current_user: OwnerOnly,
) -> list[RulePillarSummary]:
    """List all style pillars with rule summaries (AC1).

    Returns pillar name, delta mapping count, and last modified timestamp.

    Requires: Owner role (AC5).
    """
    service = get_smart_rules_service()
    return service.get_all_pillar_summaries()


@router.get("/pillars/{pillar_id}", response_model=RulePillarDetail)
async def get_rule_pillar_detail(
    pillar_id: str,
    current_user: OwnerOnly,
) -> RulePillarDetail:
    """Get full detail of a pillar's Smart Rules (AC2).

    Returns all delta mappings with slider_key, delta_key, scale_factor,
    golden_points range, etc.

    Requires: Owner role (AC5).

    Raises:
        HTTPException 404: If pillar_id is not found.
    """
    service = get_smart_rules_service()
    detail = service.get_pillar_detail(pillar_id)

    if detail is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy trụ cột phong cách '{pillar_id}'",
        )

    return detail


@router.put("/pillars/{pillar_id}", response_model=RuleUpdateResponse)
async def update_rule_pillar(
    pillar_id: str,
    request: RuleUpdateRequest,
    current_user: OwnerOnly,
) -> RuleUpdateResponse:
    """Update a pillar's Smart Rules (AC3).

    Replaces all delta mappings for the specified pillar.
    Validates input via Pydantic (AC4).

    Requires: Owner role (AC5).

    Raises:
        HTTPException 404: If pillar_id is not found.
        HTTPException 422: If validation fails (Pydantic handles this).
    """
    service = get_smart_rules_service()
    result = service.update_pillar_rules(pillar_id, request.mappings)

    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Không tìm thấy trụ cột phong cách '{pillar_id}'",
        )

    logger.info(
        "Owner %s updated rules for pillar '%s': %d mappings",
        current_user.email,
        pillar_id,
        result.mapping_count,
    )

    return result
