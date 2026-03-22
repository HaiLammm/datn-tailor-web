"""Message Templates API Router - Story 6.4: Broadcasting & Template SMS/SNS.

Owner-only CRUD for message templates used in broadcast campaigns.
Templates support variable interpolation: {{name}}, {{voucher_code}}, etc.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_id_from_user, require_roles
from src.core.database import get_db
from src.models.campaign import (
    ChannelType,
    TemplateCreateRequest,
    TemplatePreviewRequest,
    TemplatePreviewResponse,
    TemplateResponse,
    TemplateUpdateRequest,
)
from src.services import template_service

router = APIRouter(prefix="/api/v1/templates", tags=["templates"])


@router.get(
    "",
    response_model=dict,
    summary="List message templates (Owner only)",
)
async def list_templates_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
    channel: ChannelType | None = Query(None, description="Filter by channel: email|sms|zalo"),
) -> dict:
    """List all templates for the tenant, optionally filtered by channel."""
    templates = await template_service.list_templates(db, tenant_id, channel=channel.value if channel else None)
    return {
        "data": [TemplateResponse.model_validate(t).model_dump(mode="json") for t in templates],
        "meta": {"total": len(templates), "page": 1, "page_size": len(templates)},
    }


@router.get(
    "/{template_id}",
    response_model=dict,
    summary="Get template detail (Owner only)",
)
async def get_template_endpoint(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get a single template by ID."""
    tpl = await template_service.get_template(db, tenant_id, template_id)
    if not tpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay template",
        )
    return {"data": TemplateResponse.model_validate(tpl).model_dump(mode="json")}


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create message template (Owner only)",
)
async def create_template_endpoint(
    data: TemplateCreateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Create a new message template."""
    tpl = await template_service.create_template(db, tenant_id, data)
    return {"data": TemplateResponse.model_validate(tpl).model_dump(mode="json")}


@router.put(
    "/{template_id}",
    response_model=dict,
    summary="Update message template (Owner only)",
)
async def update_template_endpoint(
    template_id: uuid.UUID,
    data: TemplateUpdateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Update an existing template."""
    tpl = await template_service.update_template(db, tenant_id, template_id, data)
    if not tpl:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay template",
        )
    return {"data": TemplateResponse.model_validate(tpl).model_dump(mode="json")}


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete message template (Owner only)",
)
async def delete_template_endpoint(
    template_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> None:
    """Delete a template — only if not used in any campaign."""
    deleted = await template_service.delete_template(db, tenant_id, template_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay template",
        )


@router.post(
    "/{template_id}/preview",
    response_model=dict,
    summary="Preview template with sample data (Owner only)",
)
async def preview_template_endpoint(
    template_id: uuid.UUID,
    data: TemplatePreviewRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Preview a template rendered with sample variable values."""
    preview = await template_service.preview_template(db, tenant_id, template_id, data)
    if not preview:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay template",
        )
    return {"data": preview.model_dump()}
