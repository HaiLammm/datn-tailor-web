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


# Common role dependencies
CurrentUser = Annotated[UserDB, Depends(get_current_user_from_token)]
OwnerOnly = Annotated[UserDB, Depends(require_roles("Owner"))]
OwnerOrTailor = Annotated[UserDB, Depends(require_roles("Owner", "Tailor"))]


async def get_tenant_id_from_user(user: UserDB = Depends(get_current_user_from_token)) -> uuid.UUID:
    """Get tenant_id from current user.

    For MVP with single tenant, this returns a hardcoded UUID.
    Story 1.6 will implement proper multi-tenant infrastructure.

    Args:
        user: Current authenticated user

    Returns:
        UUID of tenant (hardcoded for MVP)
    """
    # MVP: Single tenant hardcoded
    # TODO Story 1.6: Implement proper tenant resolution from user or organization
    return uuid.UUID("00000000-0000-0000-0000-000000000001")


TenantId = Annotated[uuid.UUID, Depends(get_tenant_id_from_user)]
