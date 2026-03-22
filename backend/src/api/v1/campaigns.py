"""Campaigns API Router - Story 6.4: Broadcasting & Template SMS/SNS.

Owner-only CRUD for broadcast campaigns to customer segments.
Supports Email channel (functional) with SMS/Zalo stubs.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_current_user_from_token, get_tenant_id_from_user, require_roles
from src.core.database import get_db
from src.models.campaign import (
    CampaignCreateRequest,
    CampaignRecipientResponse,
    CampaignResponse,
    CampaignStatus,
    CampaignUpdateRequest,
)
from src.services import campaign_service
from src.models.db_models import TenantDB
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/campaigns", tags=["campaigns"])


async def _get_shop_name(db: AsyncSession, tenant_id: uuid.UUID) -> str:
    """Get shop name for email branding."""
    result = await db.execute(select(TenantDB).where(TenantDB.id == tenant_id))
    tenant = result.scalar_one_or_none()
    return tenant.name if tenant else "Tailor Project"


@router.get(
    "",
    response_model=dict,
    summary="List campaigns (Owner only)",
)
async def list_campaigns_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
    status_filter: CampaignStatus | None = Query(None, description="Filter by status: draft|scheduled|sending|sent|failed"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> dict:
    """List campaigns with optional status filter and pagination."""
    campaigns, total = await campaign_service.list_campaigns(
        db, tenant_id,
        status_filter=status_filter.value if status_filter else None,
        page=page,
        page_size=page_size,
    )
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "data": [c.model_dump(mode="json") for c in campaigns],
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    }


@router.get(
    "/summary",
    response_model=dict,
    summary="Campaign analytics summary (Owner only)",
)
async def get_campaigns_summary_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get aggregate campaign stats for the tenant."""
    summary = await campaign_service.get_campaigns_summary(db, tenant_id)
    return {"data": summary.model_dump()}


@router.get(
    "/segments",
    response_model=dict,
    summary="List available segments with recipient counts (Owner only)",
)
async def get_segments_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get all audience segments with current recipient counts."""
    segments = await campaign_service.get_segment_infos(db, tenant_id)
    return {
        "data": [s.model_dump() for s in segments],
        "meta": {"total": len(segments)},
    }


@router.get(
    "/{campaign_id}",
    response_model=dict,
    summary="Get campaign detail (Owner only)",
)
async def get_campaign_endpoint(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get campaign detail with enriched data."""
    campaign = await campaign_service.get_campaign_response(db, tenant_id, campaign_id)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chien dich")
    analytics = await campaign_service.get_campaign_analytics(db, tenant_id, campaign_id)
    return {
        "data": campaign.model_dump(mode="json"),
        "analytics": analytics.model_dump() if analytics else None,
    }


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create campaign (Owner only)",
)
async def create_campaign_endpoint(
    data: CampaignCreateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Create a new campaign in draft status."""
    campaign = await campaign_service.create_campaign(db, tenant_id, data)
    response = await campaign_service.get_campaign_response(db, tenant_id, campaign.id)
    return {"data": response.model_dump(mode="json")}


@router.put(
    "/{campaign_id}",
    response_model=dict,
    summary="Update draft campaign (Owner only)",
)
async def update_campaign_endpoint(
    campaign_id: uuid.UUID,
    data: CampaignUpdateRequest,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Update a draft campaign."""
    campaign = await campaign_service.update_campaign(db, tenant_id, campaign_id, data)
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chien dich")
    response = await campaign_service.get_campaign_response(db, tenant_id, campaign.id)
    return {"data": response.model_dump(mode="json")}


@router.delete(
    "/{campaign_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete campaign (Owner only)",
)
async def delete_campaign_endpoint(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> None:
    """Delete a campaign — only draft or failed campaigns."""
    deleted = await campaign_service.delete_campaign(db, tenant_id, campaign_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chien dich")


@router.post(
    "/{campaign_id}/send",
    response_model=dict,
    summary="Send campaign to segment recipients (Owner only)",
)
async def send_campaign_endpoint(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Trigger campaign dispatch to all segment recipients."""
    shop_name = await _get_shop_name(db, tenant_id)
    campaign = await campaign_service.send_campaign(db, tenant_id, campaign_id, shop_name=shop_name)
    response = await campaign_service.get_campaign_response(db, tenant_id, campaign.id)
    return {"data": response.model_dump(mode="json")}


@router.get(
    "/{campaign_id}/analytics",
    response_model=dict,
    summary="Get campaign analytics (Owner only)",
)
async def get_campaign_analytics_endpoint(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get delivery and engagement analytics for a campaign."""
    analytics = await campaign_service.get_campaign_analytics(db, tenant_id, campaign_id)
    if not analytics:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chien dich")
    return {"data": analytics.model_dump()}


@router.get(
    "/{campaign_id}/recipients",
    response_model=dict,
    summary="Get campaign recipients log (Owner only)",
)
async def get_campaign_recipients_endpoint(
    campaign_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
) -> dict:
    """Get paginated recipient send log for a campaign."""
    recipients, total = await campaign_service.get_campaign_recipients(
        db, tenant_id, campaign_id, page=page, page_size=page_size
    )
    if total == 0:
        # Check if campaign exists
        c = await campaign_service.get_campaign(db, tenant_id, campaign_id)
        if not c:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Khong tim thay chien dich")

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    return {
        "data": [CampaignRecipientResponse.model_validate(r).model_dump(mode="json") for r in recipients],
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    }
