"""Garment Service - Story 5.1: Digital Showroom Catalog.

Manages garment CRUD operations with multi-tenant isolation.
Backend is SSOT for garment data.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import GarmentDB
from src.models.garment import GarmentCreate, GarmentFilter, GarmentUpdate


async def list_garments(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    filters: GarmentFilter | None = None,
) -> tuple[list[GarmentDB], int]:
    """List garments for a tenant with optional filtering and pagination.
    
    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        filters: Optional filter and pagination parameters
        
    Returns:
        Tuple of (garment_list, total_count)
    """
    # Build base query with tenant isolation
    query = select(GarmentDB).where(GarmentDB.tenant_id == tenant_id)
    
    # Apply filters if provided
    if filters:
        if filters.color:
            query = query.where(GarmentDB.color == filters.color)
        if filters.occasion:
            query = query.where(GarmentDB.occasion == filters.occasion)
        if filters.status:
            query = query.where(GarmentDB.status == filters.status.value)
        if filters.category:
            query = query.where(GarmentDB.category == filters.category.value)
    
    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0
    
    # Apply pagination
    if filters:
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)
    
    # Order by created_at descending (newest first)
    query = query.order_by(GarmentDB.created_at.desc())
    
    result = await db.execute(query)
    garments = result.scalars().all()
    
    return list(garments), total


async def get_garment(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    garment_id: uuid.UUID,
) -> GarmentDB | None:
    """Get a single garment by ID with tenant isolation.
    
    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        garment_id: Garment UUID
        
    Returns:
        GarmentDB instance or None if not found
    """
    query = select(GarmentDB).where(
        GarmentDB.id == garment_id,
        GarmentDB.tenant_id == tenant_id,
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_garment(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: GarmentCreate,
) -> GarmentDB:
    """Create a new garment (Owner only).
    
    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        data: Garment creation data
        
    Returns:
        Created GarmentDB instance
    """
    garment = GarmentDB(
        tenant_id=tenant_id,
        name=data.name,
        description=data.description,
        category=data.category.value,
        color=data.color,
        occasion=data.occasion.value if data.occasion else None,
        size_options=data.size_options,
        rental_price=data.rental_price,
        image_url=data.image_url,
        status="available",  # Default status
    )
    
    db.add(garment)
    await db.flush()
    await db.commit()
    await db.refresh(garment)
    
    return garment


async def update_garment(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    garment_id: uuid.UUID,
    data: GarmentUpdate,
) -> GarmentDB | None:
    """Update a garment (Owner only).
    
    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        garment_id: Garment UUID
        data: Garment update data
        
    Returns:
        Updated GarmentDB instance or None if not found
    """
    garment = await get_garment(db, tenant_id, garment_id)
    if not garment:
        return None
    
    # Update only provided fields
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ["category", "occasion", "status"] and value is not None:
            # Convert enum to value
            value = value.value if hasattr(value, "value") else value
        setattr(garment, key, value)
    
    garment.updated_at = datetime.now(timezone.utc)
    
    await db.flush()
    await db.commit()
    await db.refresh(garment)
    
    return garment


async def delete_garment(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    garment_id: uuid.UUID,
) -> bool:
    """Delete a garment (Owner only) - hard delete.
    
    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        garment_id: Garment UUID
        
    Returns:
        True if deleted, False if not found
    """
    garment = await get_garment(db, tenant_id, garment_id)
    if not garment:
        return False
    
    await db.delete(garment)
    await db.flush()
    await db.commit()
    
    return True
