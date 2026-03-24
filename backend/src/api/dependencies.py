"""FastAPI dependencies for authentication and authorization."""

import uuid
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import decode_access_token
from src.models.db_models import UserDB
from src.services.auth_service import get_user_by_email

security_scheme = HTTPBearer()
optional_security_scheme = HTTPBearer(auto_error=False)


async def get_current_user_from_token(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserDB:
    """Get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token from request
        db: Database session

    Returns:
        UserDB instance of authenticated user

    Raises:
        HTTPException 401: If token is invalid or user not found
    """
    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )

    email = payload.get("sub")
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin người dùng",
        )

    user = await get_user_by_email(db, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Không tìm thấy người dùng"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Tài khoản đã bị vô hiệu hóa"
        )

    return user


def require_roles(*allowed_roles: str):
    """Dependency factory for role-based authorization.

    Usage:
        @router.get("/owner-only")
        async def owner_route(user: UserDB = Depends(require_roles("Owner"))):
            ...

        @router.get("/staff-only")
        async def staff_route(user: UserDB = Depends(require_roles("Owner", "Tailor"))):
            ...

    Args:
        *allowed_roles: Variable number of role names (e.g., "Owner", "Tailor", "Customer")

    Returns:
        Dependency function that validates user role

    Raises:
        HTTPException 403: If user role is not in allowed_roles
    """

    async def role_checker(user: UserDB = Depends(get_current_user_from_token)) -> UserDB:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bạn không có quyền truy cập chức năng này. Yêu cầu vai trò: {', '.join(allowed_roles)}",
            )
        return user

    return role_checker


async def get_optional_user_from_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(optional_security_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserDB | None:
    """Get current user if authenticated, otherwise return None.

    Used for endpoints that work for both guests and authenticated users.
    """
    if credentials is None:
        return None

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None

    email = payload.get("sub")
    if email is None:
        return None

    user = await get_user_by_email(db, email)
    if user is None or not user.is_active:
        return None

    return user


# Common role dependencies
OptionalCurrentUser = Annotated[UserDB | None, Depends(get_optional_user_from_token)]
CurrentUser = Annotated[UserDB, Depends(get_current_user_from_token)]
OwnerOnly = Annotated[UserDB, Depends(require_roles("Owner"))]
OwnerOrTailor = Annotated[UserDB, Depends(require_roles("Owner", "Tailor"))]


async def get_tenant_id_from_user(user: UserDB = Depends(get_current_user_from_token)) -> uuid.UUID:
    """Get tenant_id from current user.

    Story 1.6: Multi-tenant infrastructure - extract tenant from user.
    For Owner role (system-wide), uses default tenant.
    For other roles, uses user's assigned tenant.

    Args:
        user: Current authenticated user

    Returns:
        UUID of tenant

    Raises:
        HTTPException 403: If user has no tenant assigned and is not Owner
    """
    # Default tenant for backward compatibility and Owner role
    DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # Owner can operate on default tenant (system-wide access)
    if user.role == "Owner":
        return user.tenant_id if user.tenant_id else DEFAULT_TENANT_ID

    # Other roles must have tenant assigned
    if user.tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản chưa được gán vào tiệm nào. Vui lòng liên hệ quản trị viên.",
        )

    return user.tenant_id


TenantId = Annotated[uuid.UUID, Depends(get_tenant_id_from_user)]
