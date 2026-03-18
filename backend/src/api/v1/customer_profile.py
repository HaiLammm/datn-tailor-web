"""Customer Profile self-service endpoints (Story 4.4b).

Endpoints:
  GET  /api/v1/customers/me/profile         — view own profile
  PATCH /api/v1/customers/me/profile        — update own profile (no email change)
  POST /api/v1/customers/me/change-password — change password (not for OAuth users)
"""

import re
import time
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, status

from src.api.dependencies import CurrentUser
from src.core.database import get_db
from src.core.security import hash_password, verify_password
from src.models.customer_profile import (
    ChangePasswordRequest,
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)

router = APIRouter(prefix="/api/v1/customers/me", tags=["customer-profile"])

# Minimum password strength: 8 chars, uppercase, lowercase, digit
_PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8,}$")

# Simple in-memory rate limiter for password change attempts
_password_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 5
_WINDOW_SECONDS = 900  # 15 minutes


def _check_rate_limit(user_email: str) -> None:
    """Raise 429 if user exceeded password change attempt limit."""
    now = time.monotonic()
    attempts = _password_attempts[user_email]
    # Prune old entries outside window
    _password_attempts[user_email] = [t for t in attempts if now - t < _WINDOW_SECONDS]
    if len(_password_attempts[user_email]) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail={
                "code": "RATE_LIMITED",
                "message": "Quá nhiều lần thử. Vui lòng đợi 15 phút.",
            },
        )


@router.get("/profile", response_model=dict)
async def get_my_profile(
    current_user: CurrentUser,
) -> dict:
    """Return the authenticated customer's own profile data.

    AC5: Returns full_name, email, phone, gender, date_of_birth, has_password.
    has_password=True iff hashed_password is not None (AC7).
    """
    return {
        "data": CustomerProfileResponse(
            full_name=current_user.full_name,
            email=current_user.email,
            phone=current_user.phone,
            gender=current_user.gender,
            date_of_birth=current_user.date_of_birth,
            has_password=current_user.hashed_password is not None,
        ).model_dump(mode="json"),
        "meta": {},
    }


@router.patch("/profile", response_model=dict)
async def update_my_profile(
    body: CustomerProfileUpdateRequest,
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Update the authenticated customer's own profile.

    AC5: Allows updating full_name, phone, gender. Email is read-only.
    """
    if body.full_name is not None:
        current_user.full_name = body.full_name.strip()
    if body.phone is not None:
        current_user.phone = body.phone if body.phone != "" else None
    if body.gender is not None:
        current_user.gender = body.gender if body.gender != "" else None

    await db.commit()
    await db.refresh(current_user)

    return {
        "data": CustomerProfileResponse(
            full_name=current_user.full_name,
            email=current_user.email,
            phone=current_user.phone,
            gender=current_user.gender,
            date_of_birth=current_user.date_of_birth,
            has_password=current_user.hashed_password is not None,
        ).model_dump(mode="json"),
        "meta": {},
    }


@router.post("/change-password", response_model=dict)
async def change_my_password(
    body: ChangePasswordRequest,
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Change the authenticated customer's password.

    AC5:
    - 400 NO_PASSWORD  — if OAuth-only account (hashed_password is None)
    - 400 WRONG_PASSWORD — if old_password does not match
    - 400 WEAK_PASSWORD  — if new_password fails strength rules
    - 200 on success
    """
    # Rate limit password change attempts
    _check_rate_limit(current_user.email)
    _password_attempts[current_user.email].append(time.monotonic())

    # AC7: OAuth-only user has no password
    if current_user.hashed_password is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "NO_PASSWORD",
                "message": "Tài khoản không có mật khẩu. Sử dụng chức năng 'Quên mật khẩu' để đặt mật khẩu.",
            },
        )

    # Verify old password
    if not verify_password(body.old_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "WRONG_PASSWORD",
                "message": "Mật khẩu hiện tại không đúng",
            },
        )

    # Validate new password strength
    if not _PASSWORD_RE.match(body.new_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "WEAK_PASSWORD",
                "message": "Mật khẩu mới phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số",
            },
        )

    current_user.hashed_password = hash_password(body.new_password)
    await db.commit()

    return {
        "data": {"message": "Mật khẩu đã cập nhật thành công"},
        "meta": {},
    }
