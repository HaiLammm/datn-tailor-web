"""Garment API Router - Story 5.1: Digital Showroom Catalog.

Public GET endpoints for customer browsing.
Owner-only POST/PUT/DELETE for garment management.
Multi-tenant isolated by tenant_id.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import get_tenant_id_from_user, require_roles
from src.core.database import get_db
from src.models.garment import (
    GarmentCategory,
    GarmentCreate,
    GarmentFilter,
    GarmentListResponse,
    GarmentMaterial,
    GarmentOccasion,
    GarmentResponse,
    GarmentStatus,
    GarmentStatusUpdate,
    GarmentUpdate,
)
from src.services import garment_service

router = APIRouter(prefix="/api/v1/garments", tags=["garments"])


# Helper to get tenant_id for public endpoints (use default tenant for now)
def get_default_tenant_id() -> uuid.UUID:
    """Return default tenant ID for public browsing.
    
    TODO: In production, extract from subdomain or request context.
    For now, use default tenant.
    """
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


@router.get(
    "",
    response_model=dict,
    summary="List garments (Public)",
    description="Get paginated list of garments with optional filters. Public endpoint for customer browsing.",
)
async def list_garments_endpoint(
    db: AsyncSession = Depends(get_db),
    color: str | None = Query(None, description="Filter by color"),
    occasion: GarmentOccasion | None = Query(None, description="Filter by occasion"),
    status: GarmentStatus | None = Query(None, description="Filter by status"),
    category: GarmentCategory | None = Query(None, description="Filter by category"),
    material: GarmentMaterial | None = Query(None, description="Filter by material"),
    size: str | None = Query(None, description="Filter by size (matches within size_options)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by_status: bool = Query(False, description="Sort by status: Rented -> Maintenance -> Available"),
) -> dict:
    """List garments with filters and pagination.
    
    Public endpoint - no authentication required for browsing.
    Uses default tenant for now.
    
    Returns:
        API Response Wrapper: {"data": {...}, "meta": {...}}
    """
    tenant_id = get_default_tenant_id()
    
    filters = GarmentFilter(
        color=color,
        occasion=occasion,
        status=status,
        category=category,
        material=material,
        size=size,
        page=page,
        page_size=page_size,
    )
    
    garments, total = await garment_service.list_garments(
        db, tenant_id, filters, sort_by_status=sort_by_status
    )
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    list_response = GarmentListResponse(
        items=[GarmentResponse.model_validate(g) for g in garments],
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
    "/colors",
    response_model=dict,
    summary="Get unique colors (Public)",
    description="Get a list of all unique color values present in the showroom. Public endpoint.",
)
async def list_garment_colors_endpoint(
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get unique garment colors.
    
    Returns:
        API Response Wrapper: {"data": [...]}
    """
    tenant_id = get_default_tenant_id()
    colors = await garment_service.list_unique_colors(db, tenant_id)
    
    return {
        "data": colors,
    }


@router.get(
    "/{garment_id}",
    response_model=dict,
    summary="Get garment detail (Public)",
    description="Get detailed information for a single garment. Public endpoint.",
)
async def get_garment_endpoint(
    garment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Get garment detail by ID.
    
    Public endpoint - no authentication required.
    
    Returns:
        API Response Wrapper: {"data": {...}}
    """
    tenant_id = get_default_tenant_id()
    
    garment = await garment_service.get_garment(db, tenant_id, garment_id)
    if not garment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay san pham",
        )
    
    return {
        "data": GarmentResponse.model_validate(garment).model_dump(),
    }


@router.post(
    "",
    response_model=dict,
    status_code=status.HTTP_201_CREATED,
    summary="Create garment (Owner only)",
    description="Create a new garment in the showroom. Owner role required.",
)
async def create_garment_endpoint(
    data: GarmentCreate,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Create a new garment (Owner only).
    
    Returns:
        API Response Wrapper: {"data": {...}}
    """
    garment = await garment_service.create_garment(db, tenant_id, data)
    
    return {
        "data": GarmentResponse.model_validate(garment).model_dump(),
    }


@router.put(
    "/{garment_id}",
    response_model=dict,
    summary="Update garment (Owner only)",
    description="Update an existing garment. Owner role required.",
)
async def update_garment_endpoint(
    garment_id: uuid.UUID,
    data: GarmentUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Update a garment (Owner only).
    
    Returns:
        API Response Wrapper: {"data": {...}}
    """
    garment = await garment_service.update_garment(db, tenant_id, garment_id, data)
    if not garment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay san pham",
        )
    
    return {
        "data": GarmentResponse.model_validate(garment).model_dump(),
    }


@router.delete(
    "/{garment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete garment (Owner only)",
    description="Delete a garment from the showroom. Owner role required.",
)
async def delete_garment_endpoint(
    garment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> None:
    """Delete a garment (Owner only)."""
    deleted = await garment_service.delete_garment(db, tenant_id, garment_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay san pham",
        )


@router.patch(
    "/{garment_id}/status",
    response_model=dict,
    summary="Update garment status (Owner only)",
    description="Focused status update for inventory management. Owner role required.",
)
async def update_status_endpoint(
    garment_id: uuid.UUID,
    status_update: GarmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
    current_user=Depends(require_roles("Owner")),
) -> dict:
    """Update garment status (Owner only).
    
    Returns:
        API Response Wrapper: {"data": {...}}
    """
    garment = await garment_service.update_garment_status(
        db, tenant_id, garment_id, status_update
    )
    if not garment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Khong tim thay san pham",
        )

    return {
        "data": GarmentResponse.model_validate(garment).model_dump(),
    }
