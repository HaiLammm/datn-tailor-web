"""Customer Profile and Measurements API endpoints.

Story 1.3: Quản lý Hồ sơ & Số đo
Provides CRUD operations for customer profiles and measurements.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, OwnerOrTailor, TenantId
from src.core.database import get_db
from src.models.customer import (
    CustomerProfileCreateRequest,
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
    CustomerWithMeasurementsResponse,
    MeasurementCreateRequest,
    MeasurementResponse,
    MeasurementUpdateRequest,
)
from src.models.db_models import UserDB
from src.services import customer_service, measurement_service

router = APIRouter(prefix="/api/v1/customers", tags=["customers"])


@router.post("", response_model=CustomerProfileResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerProfileCreateRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> CustomerProfileResponse:
    """Create a new customer profile with optional initial measurements.

    AC: 1, 2, 3, 4, 5
    - Requires Owner or Tailor role
    - Validates phone format (VN)
    - Checks phone uniqueness per tenant
    - Auto-links to existing user account if email matches
    - Optionally creates user account if requested

    Args:
        data: Customer profile data with optional measurements
        user: Current authenticated user (Owner or Tailor)
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        Created customer profile response

    Raises:
        HTTPException 409: If phone already exists for tenant
        HTTPException 422: If validation fails
    """
    try:
        customer = await customer_service.create_customer_profile(
            db=db, tenant_id=tenant_id, data=data, created_by_user_id=user.id
        )

        # Create initial measurements if provided
        measurement_count = 0
        if data.initial_measurements:
            await measurement_service.create_measurement(
                db=db,
                customer_id=customer.id,
                tenant_id=tenant_id,
                data=data.initial_measurements,
                measured_by=user.id,
            )
            measurement_count = 1

        return CustomerProfileResponse(
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

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.get("", response_model=dict)
async def list_customers(
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
    search: str | None = Query(None, description="Search by name, phone, or email"),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    limit: int = Query(20, ge=1, le=100, description="Results per page"),
) -> dict:
    """Get paginated list of customers with search capability.

    AC: 7, 8
    - Requires Owner or Tailor role
    - Supports search by name, phone, email
    - Returns pagination metadata

    Args:
        search: Optional search query
        page: Page number (1-indexed)
        limit: Results per page (max 100)
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        Dict with customers list and pagination metadata
    """
    customers, total_count = await customer_service.get_customer_list(
        db=db, tenant_id=tenant_id, search=search, page=page, limit=limit
    )

    return {
        "customers": customers,
        "pagination": {
            "total": total_count,
            "page": page,
            "limit": limit,
            "total_pages": (total_count + limit - 1) // limit,  # Ceiling division
        },
    }


@router.get("/{customer_id}", response_model=CustomerWithMeasurementsResponse)
async def get_customer_detail(
    customer_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> CustomerWithMeasurementsResponse:
    """Get customer profile with all measurements.

    AC: 9
    - Requires Owner or Tailor role
    - Returns customer info + measurements history
    - Highlights default measurement

    Args:
        customer_id: Customer profile ID
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        Customer profile with measurements list

    Raises:
        HTTPException 404: If customer not found
    """
    customer = await customer_service.get_customer_by_id(db, customer_id, tenant_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy khách hàng"
        )

    # Get measurements history
    measurements = await measurement_service.get_measurements_history(
        db, customer_id, tenant_id
    )

    # Find default measurement
    default_measurement = await measurement_service.get_default_measurement(
        db, customer_id, tenant_id
    )

    # Convert to response models
    measurement_responses = [MeasurementResponse.model_validate(m) for m in measurements]
    default_response = (
        MeasurementResponse.model_validate(default_measurement)
        if default_measurement
        else None
    )

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
        measurement_count=len(measurements),
    )

    return CustomerWithMeasurementsResponse(
        customer=customer_response,
        measurements=measurement_responses,
        default_measurement=default_response,
    )


@router.patch("/{customer_id}", response_model=CustomerProfileResponse)
async def update_customer(
    customer_id: uuid.UUID,
    data: CustomerProfileUpdateRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> CustomerProfileResponse:
    """Update customer profile information.

    AC: 10
    - Requires Owner or Tailor role
    - Validates phone uniqueness if changed

    Args:
        customer_id: Customer profile ID
        data: Update data (partial update)
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        Updated customer profile

    Raises:
        HTTPException 404: If customer not found
        HTTPException 409: If phone conflict
    """
    try:
        customer = await customer_service.update_customer_profile(
            db, customer_id, tenant_id, data
        )
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy khách hàng"
            )

        # Count measurements
        measurements = await measurement_service.get_measurements_history(
            db, customer_id, tenant_id
        )

        return CustomerProfileResponse(
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
            measurement_count=len(measurements),
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: uuid.UUID,
    user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft delete customer profile.

    AC: 10
    - Requires Owner role ONLY (security-critical operation)
    - Sets is_deleted=True (soft delete)

    Args:
        customer_id: Customer profile ID
        user: Current authenticated user (Owner role required)
        tenant_id: Tenant ID from user context
        db: Database session

    Raises:
        HTTPException 403: If user is not Owner
        HTTPException 404: If customer not found
    """
    success = await customer_service.soft_delete_customer(db, customer_id, tenant_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy khách hàng"
        )


# ===== Measurement Endpoints =====


@router.post(
    "/{customer_id}/measurements",
    response_model=MeasurementResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_measurement(
    customer_id: uuid.UUID,
    data: MeasurementCreateRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> MeasurementResponse:
    """Create a new measurement set for customer.

    AC: 3
    - Requires Owner or Tailor role
    - Auto sets is_default=True if first measurement
    - Records measured_by user

    Args:
        customer_id: Customer profile ID
        data: Measurement data
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        Created measurement response

    Raises:
        HTTPException 404: If customer not found
        HTTPException 422: If validation fails
    """
    # Verify customer exists
    customer = await customer_service.get_customer_by_id(db, customer_id, tenant_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy khách hàng"
        )

    measurement = await measurement_service.create_measurement(
        db=db,
        customer_id=customer_id,
        tenant_id=tenant_id,
        data=data,
        measured_by=user.id,
    )

    return MeasurementResponse.model_validate(measurement)


@router.get("/{customer_id}/measurements", response_model=list[MeasurementResponse])
async def list_measurements(
    customer_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> list[MeasurementResponse]:
    """Get all measurements for a customer.

    AC: 9
    - Requires Owner or Tailor role
    - Sorted by date (newest first)

    Args:
        customer_id: Customer profile ID
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        List of measurements sorted by date DESC
    """
    measurements = await measurement_service.get_measurements_history(
        db, customer_id, tenant_id
    )
    return [MeasurementResponse.model_validate(m) for m in measurements]


@router.patch("/measurements/{measurement_id}/set-default", response_model=dict)
async def set_default_measurement(
    measurement_id: uuid.UUID,
    customer_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Set measurement as default for customer.

    AC: 9
    - Requires Owner or Tailor role
    - Unsets previous default automatically

    Args:
        measurement_id: Measurement ID to set as default
        customer_id: Customer profile ID (query param for validation)
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If measurement not found
    """
    success = await measurement_service.set_default_measurement(
        db, measurement_id, customer_id, tenant_id
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy số đo"
        )

    return {"message": "Đã đặt số đo làm mặc định"}


@router.patch("/measurements/{measurement_id}", response_model=MeasurementResponse)
async def update_measurement(
    measurement_id: uuid.UUID,
    data: MeasurementUpdateRequest,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> MeasurementResponse:
    """Update measurement data.

    AC: 10
    - Requires Owner or Tailor role

    Args:
        measurement_id: Measurement ID
        data: Update data (partial update)
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Returns:
        Updated measurement

    Raises:
        HTTPException 404: If measurement not found
    """
    measurement = await measurement_service.update_measurement(
        db, measurement_id, tenant_id, data
    )
    if not measurement:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy số đo"
        )

    return MeasurementResponse.model_validate(measurement)


@router.delete("/measurements/{measurement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_measurement(
    measurement_id: uuid.UUID,
    user: OwnerOrTailor,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete measurement record (hard delete).

    AC: 10
    - Requires Owner or Tailor role
    - Hard delete (unlike customers which are soft deleted)

    Args:
        measurement_id: Measurement ID
        user: Current authenticated user
        tenant_id: Tenant ID from user context
        db: Database session

    Raises:
        HTTPException 404: If measurement not found
    """
    success = await measurement_service.delete_measurement(db, measurement_id, tenant_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy số đo"
        )
