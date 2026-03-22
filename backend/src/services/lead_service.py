"""Lead Service - Story 6.1 & 6.2: CRM Leads Board & Lead Conversion.

Manages lead CRUD operations and lead-to-customer conversion with multi-tenant isolation.
Owner-only access enforced at API layer.
"""

import uuid
from datetime import date, datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import asc, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.db_models import (
    CustomerProfileDB,
    LeadConversionDB,
    LeadDB,
    MeasurementDB,
    UserDB,
)
from src.core.security import hash_password
from src.models.lead import LeadClassificationUpdate, LeadCreate, LeadFilter, LeadUpdate
from src.services.customer_service import link_customer_to_user_by_email

# Default password for accounts created via lead conversion
# Generate a random temporary password; user must reset via OTP/email flow
import secrets
import string

def _generate_temp_password(length: int = 16) -> str:
    """Generate a random temporary password for lead-converted accounts."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return "".join(secrets.choice(alphabet) for _ in range(length))


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


async def convert_lead_to_customer(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    lead_id: uuid.UUID,
    converted_by: uuid.UUID,
    create_account: bool = False,
) -> CustomerProfileDB:
    """Convert a lead to a customer profile in a single transaction.

    Steps:
    1. Lock and fetch lead (SELECT FOR UPDATE prevents race condition)
    2. Check phone duplicate in customer_profiles
    3. Create customer profile with lead's contact data
    4. Link to existing user by email (if applicable)
    5. Optionally create user account
    6. Create default measurement profile
    7. Create audit log (lead_conversions)
    8. Delete lead

    Args:
        db: Database session
        tenant_id: Tenant UUID for multi-tenant isolation
        lead_id: Lead UUID to convert
        converted_by: User UUID of the Owner performing conversion
        create_account: Whether to create a user account for the customer

    Returns:
        Created CustomerProfileDB instance

    Raises:
        HTTPException 404: Lead not found or already converted
    """
    # 1. Lock and fetch lead (SELECT FOR UPDATE prevents race condition)
    result = await db.execute(
        select(LeadDB)
        .where(LeadDB.id == lead_id, LeadDB.tenant_id == tenant_id)
        .with_for_update()
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead không tồn tại hoặc đã được chuyển",
        )

    # 2. Check if customer with same phone already exists → reuse existing profile
    existing_customer: CustomerProfileDB | None = None
    if lead.phone and lead.phone.strip():
        existing_result = await db.execute(
            select(CustomerProfileDB).where(
                CustomerProfileDB.tenant_id == tenant_id,
                CustomerProfileDB.phone == lead.phone,
                CustomerProfileDB.is_deleted == False,  # noqa: E712
            )
        )
        existing_customer = existing_result.scalar_one_or_none()

    if existing_customer:
        # Reuse existing customer profile — just merge lead notes
        customer = existing_customer
        lead_note = f"Chuyển từ Lead (source: {lead.source}). {lead.notes or ''}".strip()
        if customer.notes:
            customer.notes = f"{customer.notes}\n{lead_note}"
        else:
            customer.notes = lead_note
    else:
        # 3. Create new customer profile
        customer = CustomerProfileDB(
            tenant_id=tenant_id,
            full_name=lead.name,
            phone=lead.phone or "",
            email=lead.email.lower() if lead.email else None,
            notes=f"Chuyển từ Lead (source: {lead.source}). {lead.notes or ''}".strip(),
        )

        # 4. Link to existing user by email (if applicable)
        if lead.email:
            user_id = await link_customer_to_user_by_email(db, lead.email)
            if user_id:
                customer.user_id = user_id

        db.add(customer)
        await db.flush()  # Get customer.id

    # 5. Optional: create user account with temporary password
    # Login identifier: email if available, otherwise phone@local
    if create_account and not customer.user_id:
        login_email = (
            lead.email.lower()
            if lead.email
            else f"{lead.phone}@local" if lead.phone and lead.phone.strip() else None
        )
        if not login_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Không thể tạo tài khoản: Lead cần có email hoặc số điện thoại",
            )
        if login_email:
            # Check if user with this email already exists
            existing_user = await db.execute(
                select(UserDB).where(UserDB.email == login_email)
            )
            if existing_user.scalar_one_or_none() is None:
                user = UserDB(
                    email=login_email,
                    hashed_password=hash_password(_generate_temp_password()),
                    must_change_password=True,
                    role="Customer",
                    is_active=True,
                    full_name=lead.name,
                    phone=lead.phone,
                    tenant_id=tenant_id,
                )
                db.add(user)
                await db.flush()
                customer.user_id = user.id
                await db.flush()

    # 6. Create default measurement profile (only for new customers)
    if not existing_customer:
        measurement = MeasurementDB(
            customer_profile_id=customer.id,
            tenant_id=tenant_id,
            is_default=True,
            measured_date=date.today(),
        )
        db.add(measurement)

    # 7. Create audit log
    conversion_log = LeadConversionDB(
        tenant_id=tenant_id,
        lead_id=lead.id,
        lead_name=lead.name,
        lead_phone=lead.phone,
        lead_email=lead.email,
        lead_source=lead.source,
        customer_profile_id=customer.id,
        converted_by=converted_by,
    )
    db.add(conversion_log)

    # 8. Delete lead
    await db.delete(lead)

    await db.commit()
    await db.refresh(customer)

    return customer
