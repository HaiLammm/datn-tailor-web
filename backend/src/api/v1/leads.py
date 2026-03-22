"""Leads API Router - Story 6.1: CRM Leads Board.

Owner-only CRUD for managing potential customers (leads).
Multi-tenant isolated by tenant_id.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_id_from_user, require_roles
from src.core.database import get_db
from src.models.lead import (
    LeadClassification,
    LeadClassificationUpdate,
    LeadConvertRequest,
    LeadConvertResponse,
    LeadCreate,
    LeadFilter,
    LeadListResponse,
    LeadResponse,
    LeadSource,
    LeadUpdate,
)
from src.services import lead_service

router = APIRouter(prefix="/api/v1/leads", tags=["leads"])


@router.get(
    "",
    response_model=dict,
    summary="List leads (Owner only)",
    description="Get paginated list of leads with optional filters, search, and sorting. Owner role required.",
)
async def list_leads_endpoint(
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
    classification: LeadClassification | None = Query(None, description="Filter by classification"),
    source: LeadSource | None = Query(None, description="Filter by source"),
    search: str | None = Query(None, max_length=255, description="Search by name or phone"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("created_at", description="Sort field: created_at|name|classification|source"),
    sort_order: str = Query("desc", description="Sort order: asc|desc"),
) -> dict:
    """List leads with filters, search, sorting and pagination (Owner only).

    Returns:
        API Response Wrapper: {"data": {...}, "meta": {...}}
    """
    filters = LeadFilter(
        classification=classification,
        source=source,
        search=search,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )

    leads, total = await lead_service.list_leads(db, tenant_id, filters)

    total_pages = (total + page_size - 1) // page_size if total > 0 else 0

    list_response = LeadListResponse(
        items=[LeadResponse.model_validate(lead) for lead in leads],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )

    return {
        "data": list_response.model_dump(),
        "meta": {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
        },
    }


@router.get(
    "/{lead_id}",
    response_model=dict,
    summary="Get lead detail (Owner only)",
    description="Get detailed information for a single lead. Owner role required.",
)
async def get_lead_endpoint(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Get lead detail by ID (Owner only).

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    lead = await lead_service.get_lead(db, tenant_id, lead_id)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin lead",
        )

    return {
        "data": LeadResponse.model_validate(lead).model_dump(),
    }


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create lead (Owner only)",
    description="Create a new lead manually. Owner role required.",
)
async def create_lead_endpoint(
    data: LeadCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Create a new lead (Owner only).

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    lead = await lead_service.create_lead(db, tenant_id, data)

    return {
        "data": LeadResponse.model_validate(lead).model_dump(),
    }


@router.put(
    "/{lead_id}",
    response_model=dict,
    summary="Update lead (Owner only)",
    description="Update an existing lead. Owner role required.",
)
async def update_lead_endpoint(
    lead_id: uuid.UUID,
    data: LeadUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Update a lead (Owner only).

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    lead = await lead_service.update_lead(db, tenant_id, lead_id, data)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin lead",
        )

    return {
        "data": LeadResponse.model_validate(lead).model_dump(),
    }


@router.delete(
    "/{lead_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete lead (Owner only)",
    description="Delete a lead. Owner role required.",
)
async def delete_lead_endpoint(
    lead_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> None:
    """Delete a lead (Owner only)."""
    deleted = await lead_service.delete_lead(db, tenant_id, lead_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin lead",
        )


@router.post(
    "/{lead_id}/convert",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Convert lead to customer (Owner only)",
    description="Convert a lead to a customer profile with default measurement. Owner role required.",
)
async def convert_lead_endpoint(
    lead_id: uuid.UUID,
    data: LeadConvertRequest = LeadConvertRequest(),
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Convert lead to customer (Owner only).

    Creates customer profile, default measurement, audit log, and deletes the lead.
    Uses SELECT FOR UPDATE to prevent race conditions.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    customer = await lead_service.convert_lead_to_customer(
        db=db,
        tenant_id=tenant_id,
        lead_id=lead_id,
        converted_by=current_user.id,
        create_account=data.create_account,
    )

    response = LeadConvertResponse(
        customer_profile_id=customer.id,
        customer_name=customer.full_name,
        message="Đã chuyển Lead thành khách hàng thành công",
    )

    return {
        "data": response.model_dump(mode="json"),
    }


@router.patch(
    "/{lead_id}/classification",
    response_model=dict,
    summary="Update lead classification (Owner only)",
    description="Focused classification update for optimistic UI. Owner role required.",
)
async def update_classification_endpoint(
    lead_id: uuid.UUID,
    data: LeadClassificationUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Update lead classification (hot/warm/cold) - Owner only.

    Returns:
        API Response Wrapper: {"data": {...}}
    """
    lead = await lead_service.update_classification(db, tenant_id, lead_id, data)
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy thông tin lead",
        )

    return {
        "data": LeadResponse.model_validate(lead).model_dump(),
    }
