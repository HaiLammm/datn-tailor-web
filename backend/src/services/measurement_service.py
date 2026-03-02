"""Measurement service for managing customer body measurements with versioning."""

import uuid
from datetime import date, datetime, timezone

from sqlalchemy import and_, desc, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.customer import MeasurementCreateRequest, MeasurementUpdateRequest
from src.models.db_models import MeasurementDB


async def create_measurement(
    db: AsyncSession,
    customer_id: uuid.UUID,
    tenant_id: uuid.UUID,
    data: MeasurementCreateRequest,
    measured_by: uuid.UUID,
) -> MeasurementDB:
    """Create a new measurement set for customer.

    Args:
        db: Database session
        customer_id: Customer profile ID
        tenant_id: Tenant ID for multi-tenant isolation
        data: Measurement data from request
        measured_by: ID of user who took measurements

    Returns:
        Created MeasurementDB instance

    Notes:
        - Auto sets is_default=True if this is the first measurement for customer
        - Uses measured_date from request or defaults to today
    """
    # Check if this is first measurement for customer
    existing_count_query = select(MeasurementDB).where(
        MeasurementDB.customer_profile_id == customer_id
    )
    existing_result = await db.execute(existing_count_query)
    existing_measurements = existing_result.scalars().all()

    is_first = len(existing_measurements) == 0

    # Create measurement
    measurement = MeasurementDB(
        customer_profile_id=customer_id,
        tenant_id=tenant_id,
        neck=data.neck,
        shoulder_width=data.shoulder_width,
        bust=data.bust,
        waist=data.waist,
        hip=data.hip,
        top_length=data.top_length,
        sleeve_length=data.sleeve_length,
        wrist=data.wrist,
        height=data.height,
        weight=data.weight,
        measurement_notes=data.measurement_notes,
        is_default=is_first,  # Auto set default if first measurement
        measured_date=data.measured_date or date.today(),
        measured_by=measured_by,
    )

    db.add(measurement)
    await db.commit()
    await db.refresh(measurement)

    return measurement


async def get_measurements_history(
    db: AsyncSession, customer_id: uuid.UUID, tenant_id: uuid.UUID
) -> list[MeasurementDB]:
    """Get all measurements for a customer, ordered by date (newest first).

    Args:
        db: Database session
        customer_id: Customer profile ID
        tenant_id: Tenant ID for authorization

    Returns:
        List of MeasurementDB instances sorted by measured_date DESC
    """
    result = await db.execute(
        select(MeasurementDB)
        .where(
            and_(
                MeasurementDB.customer_profile_id == customer_id,
                MeasurementDB.tenant_id == tenant_id,
            )
        )
        .order_by(desc(MeasurementDB.measured_date), desc(MeasurementDB.created_at))
    )
    return list(result.scalars().all())


async def get_default_measurement(
    db: AsyncSession, customer_id: uuid.UUID, tenant_id: uuid.UUID
) -> MeasurementDB | None:
    """Get the default measurement set for a customer.

    Args:
        db: Database session
        customer_id: Customer profile ID
        tenant_id: Tenant ID for authorization

    Returns:
        MeasurementDB marked as default, or None if no measurements exist
    """
    result = await db.execute(
        select(MeasurementDB).where(
            and_(
                MeasurementDB.customer_profile_id == customer_id,
                MeasurementDB.tenant_id == tenant_id,
                MeasurementDB.is_default == True,  # noqa: E712
            )
        )
    )
    return result.scalar_one_or_none()


async def set_default_measurement(
    db: AsyncSession,
    measurement_id: uuid.UUID,
    customer_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> bool:
    """Set a measurement as default, unsetting all others for this customer.

    Args:
        db: Database session
        measurement_id: Measurement ID to set as default
        customer_id: Customer profile ID
        tenant_id: Tenant ID for authorization

    Returns:
        True if successful, False if measurement not found

    Notes:
        - Only one measurement can be default per customer
        - Automatically unsets previous default
    """
    # Verify measurement exists and belongs to customer/tenant
    result = await db.execute(
        select(MeasurementDB).where(
            and_(
                MeasurementDB.id == measurement_id,
                MeasurementDB.customer_profile_id == customer_id,
                MeasurementDB.tenant_id == tenant_id,
            )
        )
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        return False

    # Unset all defaults for this customer
    await db.execute(
        update(MeasurementDB)
        .where(MeasurementDB.customer_profile_id == customer_id)
        .values(is_default=False, updated_at=datetime.now(timezone.utc))
    )

    # Set new default
    measurement.is_default = True
    measurement.updated_at = datetime.now(timezone.utc)

    await db.commit()

    return True


async def update_measurement(
    db: AsyncSession,
    measurement_id: uuid.UUID,
    tenant_id: uuid.UUID,
    data: MeasurementUpdateRequest,
) -> MeasurementDB | None:
    """Update measurement data.

    Args:
        db: Database session
        measurement_id: Measurement ID
        tenant_id: Tenant ID for authorization
        data: Update data

    Returns:
        Updated MeasurementDB instance or None if not found
    """
    result = await db.execute(
        select(MeasurementDB).where(
            and_(
                MeasurementDB.id == measurement_id,
                MeasurementDB.tenant_id == tenant_id,
            )
        )
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        return None

    # Update fields (only update if provided)
    if data.neck is not None:
        measurement.neck = data.neck
    if data.shoulder_width is not None:
        measurement.shoulder_width = data.shoulder_width
    if data.bust is not None:
        measurement.bust = data.bust
    if data.waist is not None:
        measurement.waist = data.waist
    if data.hip is not None:
        measurement.hip = data.hip
    if data.top_length is not None:
        measurement.top_length = data.top_length
    if data.sleeve_length is not None:
        measurement.sleeve_length = data.sleeve_length
    if data.wrist is not None:
        measurement.wrist = data.wrist
    if data.height is not None:
        measurement.height = data.height
    if data.weight is not None:
        measurement.weight = data.weight
    if data.measurement_notes is not None:
        measurement.measurement_notes = data.measurement_notes

    measurement.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(measurement)

    return measurement


async def delete_measurement(
    db: AsyncSession, measurement_id: uuid.UUID, tenant_id: uuid.UUID
) -> bool:
    """Hard delete a measurement record.

    Args:
        db: Database session
        measurement_id: Measurement ID
        tenant_id: Tenant ID for authorization

    Returns:
        True if deleted, False if not found

    Notes:
        - Measurements can be hard deleted (unlike customers which are soft deleted)
        - If deleting default measurement, no new default is automatically set
    """
    result = await db.execute(
        select(MeasurementDB).where(
            and_(
                MeasurementDB.id == measurement_id,
                MeasurementDB.tenant_id == tenant_id,
            )
        )
    )
    measurement = result.scalar_one_or_none()
    if not measurement:
        return False

    await db.delete(measurement)
    await db.commit()

    return True
