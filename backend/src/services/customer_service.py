"""Customer profile service for CRUD operations and account linking."""

import uuid
from datetime import datetime, timezone

from sqlalchemy import and_, desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.customer import (
    CustomerProfileCreateRequest,
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)
from src.models.db_models import CustomerProfileDB, MeasurementDB, UserDB
from src.services.email_service import send_account_invitation_email


async def create_customer_profile(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    data: CustomerProfileCreateRequest,
    created_by_user_id: uuid.UUID | None = None,
) -> CustomerProfileDB:
    """Create a new customer profile.

    Args:
        db: Database session
        tenant_id: Tenant ID for multi-tenant isolation
        data: Customer profile data from request
        created_by_user_id: ID of user creating this profile (for audit)

    Returns:
        Created CustomerProfileDB instance

    Raises:
        ValueError: If phone already exists for this tenant
    """
    # Check if phone already exists for this tenant
    existing = await db.execute(
        select(CustomerProfileDB).where(
            and_(
                CustomerProfileDB.tenant_id == tenant_id,
                CustomerProfileDB.phone == data.phone,
                CustomerProfileDB.is_deleted == False,  # noqa: E712
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ValueError("Số điện thoại này đã được sử dụng trong hệ thống")

    # Create customer profile
    customer = CustomerProfileDB(
        tenant_id=tenant_id,
        full_name=data.full_name.strip(),
        phone=data.phone.strip(),
        email=data.email.lower() if data.email else None,
        date_of_birth=data.date_of_birth,
        gender=data.gender,
        address=data.address.strip() if data.address else None,
        notes=data.notes,
    )

    # Try to link to existing user account if email provided
    if data.email:
        user_id = await link_customer_to_user_by_email(db, data.email)
        if user_id:
            customer.user_id = user_id

    db.add(customer)
    await db.flush()

    # Create account if requested and email provided
    if data.create_account and data.email and not customer.user_id:
        # Create inactive user account
        await create_customer_with_account(
            db=db, email=data.email, full_name=data.full_name, phone=data.phone
        )
        # Link to new account
        user_id = await link_customer_to_user_by_email(db, data.email)
        if user_id:
            customer.user_id = user_id

    await db.commit()
    await db.refresh(customer)

    return customer


async def link_customer_to_user_by_email(
    db: AsyncSession, email: str
) -> uuid.UUID | None:
    """Find user by email and return user_id for linking.

    Args:
        db: Database session
        email: Email address to search

    Returns:
        user_id if user exists, None otherwise
    """
    result = await db.execute(select(UserDB.id).where(UserDB.email == email.lower()))
    user_id = result.scalar_one_or_none()
    return user_id


async def create_customer_with_account(
    db: AsyncSession, email: str, full_name: str, phone: str
) -> UserDB:
    """Create inactive user account for customer and send invitation email.

    Args:
        db: Database session
        email: Customer email
        full_name: Customer full name
        phone: Customer phone

    Returns:
        Created UserDB instance
    """
    # Create inactive user
    user = UserDB(
        email=email.lower(),
        hashed_password=None,  # Will be set when user activates account
        role="Customer",
        is_active=False,
        full_name=full_name,
        phone=phone,
    )
    db.add(user)
    await db.flush()

    # Send invitation email (async, don't wait for completion)
    try:
        await send_account_invitation_email(email=email, customer_name=full_name)
    except Exception as e:
        # Log error but don't fail the transaction
        print(f"Failed to send invitation email to {email}: {e}")

    await db.commit()
    await db.refresh(user)

    return user


async def get_customer_list(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    search: str | None = None,
    page: int = 1,
    limit: int = 20,
) -> tuple[list[CustomerProfileResponse], int]:
    """Get paginated list of customers with search capability.

    Args:
        db: Database session
        tenant_id: Tenant ID for filtering
        search: Search query for name, phone, or email
        page: Page number (1-indexed)
        limit: Results per page

    Returns:
        Tuple of (customer_list, total_count)
    """
    # Base query
    query = select(CustomerProfileDB).where(
        and_(
            CustomerProfileDB.tenant_id == tenant_id,
            CustomerProfileDB.is_deleted == False,  # noqa: E712
        )
    )

    # Add search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.where(
            or_(
                CustomerProfileDB.full_name.ilike(search_pattern),
                CustomerProfileDB.phone.ilike(search_pattern),
                CustomerProfileDB.email.ilike(search_pattern),
            )
        )

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total_count = total_result.scalar_one()

    # Paginate
    offset = (page - 1) * limit
    query = query.order_by(desc(CustomerProfileDB.created_at)).offset(offset).limit(limit)

    result = await db.execute(query)
    customers = result.scalars().all()

    # Convert to response models with additional fields
    customer_responses = []
    for customer in customers:
        # Count measurements
        measurement_count_query = select(func.count()).where(
            MeasurementDB.customer_profile_id == customer.id
        )
        count_result = await db.execute(measurement_count_query)
        measurement_count = count_result.scalar_one()

        customer_response = CustomerProfileResponse(
            id=customer.id,
            tenant_id=customer.tenant_id,
            user_id=customer.user_id,
            full_name=customer.full_name,
            phone=customer.phone,
            email=customer.email,
            date_of_birth=customer.date_of_birth,
            gender=customer.gender,
            address=customer.address,
            notes=customer.notes,
            is_deleted=customer.is_deleted,
            created_at=customer.created_at,
            updated_at=customer.updated_at,
            has_account=customer.user_id is not None,
            measurement_count=measurement_count,
        )
        customer_responses.append(customer_response)

    return customer_responses, total_count


async def get_customer_by_id(
    db: AsyncSession, customer_id: uuid.UUID, tenant_id: uuid.UUID
) -> CustomerProfileDB | None:
    """Get customer profile by ID with tenant verification.

    Args:
        db: Database session
        customer_id: Customer profile ID
        tenant_id: Tenant ID for authorization

    Returns:
        CustomerProfileDB if found and belongs to tenant, None otherwise
    """
    result = await db.execute(
        select(CustomerProfileDB).where(
            and_(
                CustomerProfileDB.id == customer_id,
                CustomerProfileDB.tenant_id == tenant_id,
                CustomerProfileDB.is_deleted == False,  # noqa: E712
            )
        )
    )
    return result.scalar_one_or_none()


async def update_customer_profile(
    db: AsyncSession,
    customer_id: uuid.UUID,
    tenant_id: uuid.UUID,
    data: CustomerProfileUpdateRequest,
) -> CustomerProfileDB | None:
    """Update customer profile information.

    Args:
        db: Database session
        customer_id: Customer profile ID
        tenant_id: Tenant ID for authorization
        data: Update data

    Returns:
        Updated CustomerProfileDB instance or None if not found

    Raises:
        ValueError: If phone already exists for another customer in tenant
    """
    customer = await get_customer_by_id(db, customer_id, tenant_id)
    if not customer:
        return None

    # Check phone uniqueness if being updated
    if data.phone and data.phone != customer.phone:
        existing = await db.execute(
            select(CustomerProfileDB).where(
                and_(
                    CustomerProfileDB.tenant_id == tenant_id,
                    CustomerProfileDB.phone == data.phone,
                    CustomerProfileDB.id != customer_id,
                    CustomerProfileDB.is_deleted == False,  # noqa: E712
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Số điện thoại này đã được sử dụng bởi khách hàng khác")

    # Update fields
    if data.full_name is not None:
        customer.full_name = data.full_name.strip()
    if data.phone is not None:
        customer.phone = data.phone.strip()
    if data.email is not None:
        customer.email = data.email.lower() if data.email else None
        # Try to link to user account if email changed
        if data.email:
            user_id = await link_customer_to_user_by_email(db, data.email)
            if user_id:
                customer.user_id = user_id
    if data.date_of_birth is not None:
        customer.date_of_birth = data.date_of_birth
    if data.gender is not None:
        customer.gender = data.gender
    if data.address is not None:
        customer.address = data.address.strip() if data.address else None
    if data.notes is not None:
        customer.notes = data.notes

    customer.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(customer)

    return customer


async def soft_delete_customer(
    db: AsyncSession, customer_id: uuid.UUID, tenant_id: uuid.UUID
) -> bool:
    """Soft delete customer profile by setting is_deleted=True.

    Args:
        db: Database session
        customer_id: Customer profile ID
        tenant_id: Tenant ID for authorization

    Returns:
        True if deleted, False if not found
    """
    customer = await get_customer_by_id(db, customer_id, tenant_id)
    if not customer:
        return False

    customer.is_deleted = True
    customer.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return True
