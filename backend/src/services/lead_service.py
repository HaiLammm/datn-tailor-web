"""Lead Service - Story 6.1: CRM Leads Board.

Manages lead CRUD operations with multi-tenant isolation.
Owner-only access enforced at API layer.
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import LeadDB
from src.models.lead import LeadClassificationUpdate, LeadCreate, LeadFilter, LeadUpdate


async def list_leads(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    filters: LeadFilter | None = None,
) -> tuple[list[LeadDB], int]:
    """List leads for a tenant with optional filtering, searching, sorting, and pagination.

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        filters: Optional filter/search/sort/pagination parameters

    Returns:
        Tuple of (lead_list, total_count)
    """
    query = select(LeadDB).where(LeadDB.tenant_id == tenant_id)

    if filters:
        if filters.classification:
            query = query.where(LeadDB.classification == filters.classification.value)
        if filters.source:
            query = query.where(LeadDB.source == filters.source.value)
        if filters.search:
            # Escape SQL LIKE wildcards to prevent pattern injection
            escaped = filters.search.replace("%", r"\%").replace("_", r"\_")
            search_term = f"%{escaped}%"
            query = query.where(
                or_(
                    LeadDB.name.ilike(search_term),
                    LeadDB.phone.ilike(search_term),
                )
            )

    # Count total before pagination
    count_query = select(func.count()).select_from(query.subquery())
    count_result = await db.execute(count_query)
    total = count_result.scalar() or 0

    # Apply sorting
    if filters:
        sort_col = {
            "created_at": LeadDB.created_at,
            "name": LeadDB.name,
            "classification": LeadDB.classification,
            "source": LeadDB.source,
        }.get(filters.sort_by, LeadDB.created_at)

        order_fn = asc if filters.sort_order == "asc" else desc
        query = query.order_by(order_fn(sort_col))

        # Apply pagination
        offset = (filters.page - 1) * filters.page_size
        query = query.offset(offset).limit(filters.page_size)
    else:
        query = query.order_by(desc(LeadDB.created_at))

    result = await db.execute(query)
    leads = result.scalars().all()

    return list(leads), total


async def get_lead(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    lead_id: uuid.UUID,
) -> LeadDB | None:
    """Get a single lead by ID with tenant isolation.

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        lead_id: Lead UUID

    Returns:
        LeadDB instance or None if not found
    """
    query = select(LeadDB).where(
        LeadDB.id == lead_id,
        LeadDB.tenant_id == tenant_id,
    )
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def create_lead(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: LeadCreate,
) -> LeadDB:
    """Create a new lead (Owner only).

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        data: Lead creation data

    Returns:
        Created LeadDB instance
    """
    lead = LeadDB(
        tenant_id=tenant_id,
        name=data.name,
        phone=data.phone,
        email=data.email,
        source=data.source.value,
        classification=data.classification.value,
        notes=data.notes,
    )

    db.add(lead)
    await db.flush()
    await db.commit()
    await db.refresh(lead)

    return lead


async def update_lead(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    lead_id: uuid.UUID,
    data: LeadUpdate,
) -> LeadDB | None:
    """Update a lead (Owner only).

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        lead_id: Lead UUID
        data: Lead update data (only provided fields are updated)

    Returns:
        Updated LeadDB instance or None if not found
    """
    lead = await get_lead(db, tenant_id, lead_id)
    if not lead:
        return None

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        if key in ["source", "classification"] and value is not None:
            value = value.value if hasattr(value, "value") else value
        setattr(lead, key, value)

    lead.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(lead)

    return lead


async def delete_lead(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    lead_id: uuid.UUID,
) -> bool:
    """Delete a lead (Owner only) - hard delete.

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        lead_id: Lead UUID

    Returns:
        True if deleted, False if not found
    """
    lead = await get_lead(db, tenant_id, lead_id)
    if not lead:
        return False

    await db.delete(lead)
    await db.flush()
    await db.commit()

    return True


async def update_classification(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    lead_id: uuid.UUID,
    data: LeadClassificationUpdate,
) -> LeadDB | None:
    """Update only the classification of a lead (PATCH endpoint for optimistic UI).

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        lead_id: Lead UUID
        data: Classification update data

    Returns:
        Updated LeadDB instance or None if not found
    """
    lead = await get_lead(db, tenant_id, lead_id)
    if not lead:
        return None

    lead.classification = data.classification.value
    lead.updated_at = datetime.now(timezone.utc)

    await db.flush()
    await db.commit()
    await db.refresh(lead)

    return lead
