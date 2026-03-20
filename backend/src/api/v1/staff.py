"""Staff management API endpoints.

Provides CRUD operations for staff whitelist and active staff directory.
Story 1.4: Owner-only staff management
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.dependencies import OwnerOnly, TenantId
from src.core.database import get_db
from src.models.db_models import UserDB
from src.models.staff import (
    ActiveStaffResponse,
    StaffCreateResponse,
    StaffManagementResponse,
    StaffWhitelistCreateRequest,
    StaffWhitelistResponse,
)
from src.services.staff_service import (
    add_staff_to_whitelist,
    get_active_staff_users,
    get_all_whitelist_entries,
    remove_staff_from_whitelist,
)

router = APIRouter(prefix="/api/v1/staff", tags=["staff"])


@router.get("/", response_model=StaffManagementResponse)
async def get_staff_management_data(
    current_user: OwnerOnly,
    db: AsyncSession = Depends(get_db),
) -> StaffManagementResponse:
    """Get all staff whitelist entries and active staff users.

    Requires: Owner role

    Returns:
        StaffManagementResponse with whitelist and active_staff lists
    """
    # Get whitelist entries
    whitelist_entries = await get_all_whitelist_entries(db)
    whitelist_responses = [
        StaffWhitelistResponse.model_validate(entry) for entry in whitelist_entries
    ]

    # Get active staff users (Owner and Tailor roles)
    active_staff = await get_active_staff_users(db)
    active_staff_responses = [ActiveStaffResponse.model_validate(user) for user in active_staff]

    return StaffManagementResponse(
        whitelist=whitelist_responses, active_staff=active_staff_responses
    )


@router.post("/", response_model=StaffCreateResponse, status_code=status.HTTP_201_CREATED)
async def add_staff_member(
    request: StaffWhitelistCreateRequest,
    current_user: OwnerOnly,
    tenant_id: TenantId,
    db: AsyncSession = Depends(get_db),
) -> StaffCreateResponse:
    """Add a new staff member to the whitelist and create user account.

    Requires: Owner role

    Args:
        request: Email, role, and optional password for new staff member

    Returns:
        StaffCreateResponse with whitelist entry and plain password

    Raises:
        HTTPException 400: If email already exists in whitelist or invalid
        HTTPException 409: If attempting to add Owner email
    """
    try:
        result = await add_staff_to_whitelist(
            db,
            email=request.email,
            role=request.role,
            created_by_email=current_user.email,
            password=request.password,
            tenant_id=tenant_id,
        )

        if result is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email đã tồn tại trong danh sách nhân viên",
            )

        whitelist_entry, plain_password = result
        return StaffCreateResponse(
            whitelist_entry=StaffWhitelistResponse.model_validate(whitelist_entry),
            plain_password=plain_password,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))


@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_staff_member(
    entry_id: uuid.UUID,
    current_user: OwnerOnly,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Remove a staff member from the whitelist.

    Requires: Owner role

    Args:
        entry_id: UUID of the whitelist entry to remove

    Raises:
        HTTPException 404: If entry not found
        HTTPException 403: If attempting to remove Owner's own email
    """
    try:
        success = await remove_staff_from_whitelist(db, entry_id, current_user.email)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Không tìm thấy nhân viên trong whitelist",
            )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
