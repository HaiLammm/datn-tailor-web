"""Customer Profile self-service endpoints (Story 4.4b, 4.4e, 4.4f, 4.4g).

Endpoints:
  GET  /api/v1/customers/me/profile                          — view own profile
  PATCH /api/v1/customers/me/profile                         — update own profile (no email change)
  POST /api/v1/customers/me/change-password                  — change password (not for OAuth users)
  GET  /api/v1/customers/me/measurements                     — view own measurements (read-only)
  GET  /api/v1/customers/me/appointments                     — view own appointments
  PATCH /api/v1/customers/me/appointments/{id}/cancel        — cancel an appointment
  GET  /api/v1/customers/me/notifications                    — list own notifications
  GET  /api/v1/customers/me/notifications/unread-count       — unread notification count
  PATCH /api/v1/customers/me/notifications/read-all          — mark all notifications as read
  PATCH /api/v1/customers/me/notifications/{id}/read         — mark notification as read
  DELETE /api/v1/customers/me/notifications/{id}             — soft delete a notification
  GET  /api/v1/customers/me/vouchers                         — list assigned vouchers (Story 4.4g)
"""

import logging
import re
import time
from collections import defaultdict
from datetime import date as date_type, datetime, timezone
from decimal import Decimal
from uuid import UUID as PyUUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import case, func, select, update as sa_update

from src.api.dependencies import CurrentUser
from src.core.database import get_db
from src.core.security import hash_password, verify_password
from src.models.appointment import AppointmentResponse
from src.models.customer import MeasurementResponse
from src.models.customer_profile import (
    ChangePasswordRequest,
    CustomerProfileResponse,
    CustomerProfileUpdateRequest,
)
from src.models.db_models import AppointmentDB, CustomerProfileDB, NotificationDB, UserVoucherDB, VoucherDB
from src.models.notification import NotificationResponse
from src.models.voucher import DiscountPreviewRequest, DiscountPreviewResponse, VoucherStatus
from src.services import voucher_service
from src.services.measurement_service import get_default_measurement, get_measurements_history
from src.services.notification_creator import APPOINTMENT_MESSAGES, create_notification

logger = logging.getLogger(__name__)

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


@router.get("/measurements", response_model=dict)
async def get_my_measurements(
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Return the authenticated customer's own measurements (read-only).

    AC1, AC2, AC4: Returns default_measurement, all measurements sorted DESC,
    and measurement_count. Customers cannot modify measurements.

    Empty response (not error) when:
    - current_user has no tenant_id (not yet linked to a tenant)
    - no CustomerProfileDB found for this user (new account)
    """
    # Handle customer not yet linked to a tenant
    if current_user.tenant_id is None:
        return {
            "data": {
                "default_measurement": None,
                "measurements": [],
                "measurement_count": 0,
            },
            "meta": {},
        }

    # Look up CustomerProfileDB for this user (user_id + tenant_id)
    stmt = (
        select(CustomerProfileDB)
        .where(
            CustomerProfileDB.user_id == current_user.id,
            CustomerProfileDB.tenant_id == current_user.tenant_id,
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    customer_profile = result.scalar_one_or_none()

    # No profile created yet → return empty (not an error)
    if customer_profile is None:
        return {
            "data": {
                "default_measurement": None,
                "measurements": [],
                "measurement_count": 0,
            },
            "meta": {},
        }

    # Fetch measurements from service layer
    measurements = await get_measurements_history(
        db, customer_profile.id, customer_profile.tenant_id
    )
    default_measurement = await get_default_measurement(
        db, customer_profile.id, customer_profile.tenant_id
    )

    return {
        "data": {
            "default_measurement": (
                MeasurementResponse.model_validate(default_measurement).model_dump(mode="json")
                if default_measurement
                else None
            ),
            "measurements": [
                MeasurementResponse.model_validate(m).model_dump(mode="json")
                for m in measurements
            ],
            "measurement_count": len(measurements),
        },
        "meta": {},
    }


# ─── Default tenant (same as public booking endpoints) ───────────────────────
_DEFAULT_TENANT_ID = PyUUID("00000000-0000-0000-0000-000000000001")


@router.get("/appointments", response_model=dict)
async def get_my_appointments(
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Return the authenticated customer's appointments (read-only).

    AC1, AC2, AC3, AC6:
    - Queries by customer_email (case-insensitive) since appointments are created via public
      booking form with email (may differ in case from account email)
    - Always includes DEFAULT_TENANT_ID results since the public booking form always uses it
    - Returns sorted by appointment_date DESC (newest first)
    - Empty array when no appointments found (not an error)
    """
    # Collect tenant IDs to search: always include default + user's own tenant (if different)
    tenant_ids = {_DEFAULT_TENANT_ID}
    if current_user.tenant_id is not None:
        tenant_ids.add(current_user.tenant_id)

    stmt = (
        select(AppointmentDB)
        .where(
            func.lower(AppointmentDB.customer_email) == current_user.email.lower(),
            AppointmentDB.tenant_id.in_(tenant_ids),
        )
        .order_by(AppointmentDB.appointment_date.desc())
    )
    result = await db.execute(stmt)
    appointments = result.scalars().all()

    return {
        "data": {
            "appointments": [
                AppointmentResponse.model_validate(a).model_dump(mode="json")
                for a in appointments
            ],
            "appointment_count": len(appointments),
        },
        "meta": {},
    }


@router.patch("/appointments/{appointment_id}/cancel", response_model=dict)
async def cancel_my_appointment(
    appointment_id: PyUUID,
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Cancel an appointment owned by the current user.

    AC4:
    - 404 if appointment not found or does not belong to current user (email + tenant)
    - 409 if appointment already cancelled
    - 400 if appointment_date <= today (within 24h window — same-day or past)
    - 200 with updated appointment on success
    """
    tenant_ids = {_DEFAULT_TENANT_ID}
    if current_user.tenant_id is not None:
        tenant_ids.add(current_user.tenant_id)

    stmt = (
        select(AppointmentDB)
        .where(
            AppointmentDB.id == appointment_id,
            func.lower(AppointmentDB.customer_email) == current_user.email.lower(),
            AppointmentDB.tenant_id.in_(tenant_ids),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    appointment = result.scalar_one_or_none()

    if appointment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": "Lịch hẹn không tồn tại hoặc không thuộc về bạn",
            },
        )

    if appointment.status == "cancelled":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "code": "ALREADY_CANCELLED",
                "message": "Lịch hẹn đã được hủy trước đó",
            },
        )

    # 24h rule: cannot cancel same-day or past appointments
    if appointment.appointment_date <= date_type.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "code": "WITHIN_24H",
                "message": "Không thể hủy trong vòng 24h trước giờ hẹn",
            },
        )

    appointment.status = "cancelled"
    # Capture for notification before commit
    _appt_date = str(appointment.appointment_date)
    _appt_slot = "Buổi Sáng" if appointment.slot == "morning" else "Buổi Chiều"
    await db.commit()
    await db.refresh(appointment)

    # Story 4.4f: In-app notification for appointment cancellation
    _tenant_id = current_user.tenant_id or _DEFAULT_TENANT_ID
    try:
        title, msg_template = APPOINTMENT_MESSAGES["cancelled"]
        message = msg_template.format(date=_appt_date)
        await create_notification(
            db=db,
            user_id=current_user.id,
            tenant_id=_tenant_id,
            notification_type="appointment",
            title=title,
            message=message,
            data={"appointment_id": str(appointment.id), "appointment_date": _appt_date},
        )
    except Exception:
        logger.warning(
            "Failed to create cancellation notification for appointment %s", appointment.id
        )

    return {
        "data": AppointmentResponse.model_validate(appointment).model_dump(mode="json"),
        "meta": {},
    }


# ─── Notification endpoints (Story 4.4f) ─────────────────────────────────────
# IMPORTANT: Static paths (/notifications/unread-count, /notifications/read-all)
# MUST come before parameterized paths (/notifications/{id}) to prevent FastAPI
# treating the literal strings as notification_id values.


@router.get("/notifications", response_model=dict)
async def get_my_notifications(
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Return the authenticated customer's notifications, newest first.

    AC1: Sorted DESC by created_at. Excludes soft-deleted records.
    """
    stmt = (
        select(NotificationDB)
        .where(
            NotificationDB.user_id == current_user.id,
            NotificationDB.deleted_at.is_(None),
        )
        .order_by(NotificationDB.created_at.desc())
    )
    result = await db.execute(stmt)
    notifications = result.scalars().all()

    return {
        "data": {
            "notifications": [
                NotificationResponse.model_validate(n).model_dump(mode="json")
                for n in notifications
            ],
            "notification_count": len(notifications),
        },
        "meta": {},
    }


@router.get("/notifications/unread-count", response_model=dict)
async def get_unread_notification_count(
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Return count of unread (not deleted) notifications.

    AC2: Used by ProfileSidebar badge.
    """
    from sqlalchemy import func as sa_func

    stmt = (
        select(sa_func.count())
        .select_from(NotificationDB)
        .where(
            NotificationDB.user_id == current_user.id,
            NotificationDB.is_read.is_(False),
            NotificationDB.deleted_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    count = result.scalar_one()

    return {"data": {"unread_count": count}, "meta": {}}


@router.patch("/notifications/read-all", response_model=dict)
async def mark_all_notifications_read(
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Mark all unread notifications as read.

    AC3: Bulk mark-read, badge count becomes 0.
    """
    now = datetime.now(timezone.utc)
    stmt = (
        sa_update(NotificationDB)
        .where(
            NotificationDB.user_id == current_user.id,
            NotificationDB.is_read.is_(False),
            NotificationDB.deleted_at.is_(None),
        )
        .values(is_read=True, read_at=now)
    )
    await db.execute(stmt)
    await db.commit()

    return {"data": {"message": "Đã đánh dấu tất cả thông báo là đã đọc"}, "meta": {}}


@router.patch("/notifications/{notification_id}/read", response_model=dict)
async def mark_notification_read(
    notification_id: PyUUID,
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Mark a single notification as read.

    AC3: Optimistic UI counterpart. 404 if not found / not owned.
    """
    stmt = (
        select(NotificationDB)
        .where(
            NotificationDB.id == notification_id,
            NotificationDB.user_id == current_user.id,
            NotificationDB.deleted_at.is_(None),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": "Thông báo không tồn tại hoặc không thuộc về bạn",
            },
        )

    if not notification.is_read:
        notification.is_read = True
        notification.read_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(notification)

    return {
        "data": NotificationResponse.model_validate(notification).model_dump(mode="json"),
        "meta": {},
    }


@router.delete("/notifications/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: PyUUID,
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Soft delete a notification (sets deleted_at).

    AC6: Notification disappears from list but is NOT hard deleted.
    404 if not found or not owned.
    """
    stmt = (
        select(NotificationDB)
        .where(
            NotificationDB.id == notification_id,
            NotificationDB.user_id == current_user.id,
            NotificationDB.deleted_at.is_(None),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    notification = result.scalar_one_or_none()

    if notification is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "code": "NOT_FOUND",
                "message": "Thông báo không tồn tại hoặc không thuộc về bạn",
            },
        )

    notification.deleted_at = datetime.now(timezone.utc)
    await db.commit()

    return {"data": {"message": "Thông báo đã được xóa"}, "meta": {}}


# ─── Voucher endpoints (Story 4.4g) ──────────────────────────────────────────


@router.get("/vouchers", response_model=dict)
async def get_my_vouchers(
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """List vouchers assigned to the authenticated customer.

    Joins user_vouchers → vouchers (active vouchers only, is_active=True).
    Sort: active first, expired second, used last (AC1).
    Status computed server-side:
      - is_used=True → 'used'
      - expiry_date < today → 'expired'
      - else → 'active'
    Returns all assigned vouchers (active, expired, used) for history visibility.
    AC1, AC2, AC6.
    """
    today = date_type.today()

    # Computed sort key: 0=active, 1=expired, 2=used (AC1: active first, expired second, used last)
    status_sort = case(
        (UserVoucherDB.is_used.is_(True), 2),
        (VoucherDB.expiry_date < today, 1),
        else_=0,
    )

    stmt = (
        select(UserVoucherDB, VoucherDB)
        .join(VoucherDB, UserVoucherDB.voucher_id == VoucherDB.id)
        .where(
            UserVoucherDB.user_id == current_user.id,
            VoucherDB.is_active.is_(True),
        )
        .order_by(status_sort.asc(), VoucherDB.expiry_date.asc())
    )
    rows = (await db.execute(stmt)).all()

    vouchers = []
    for uv, v in rows:
        if uv.is_used:
            status = VoucherStatus.USED
        elif v.expiry_date < today:
            status = VoucherStatus.EXPIRED
        else:
            status = VoucherStatus.ACTIVE

        vouchers.append({
            "id": str(uv.id),
            "voucher_id": str(v.id),
            "code": v.code,
            "type": v.type,
            "value": str(v.value),
            "min_order_value": str(v.min_order_value),
            "max_discount_value": str(v.max_discount_value) if v.max_discount_value is not None else None,
            "description": v.description,
            "expiry_date": v.expiry_date.isoformat(),
            "visibility": v.visibility,
            "status": status.value,
            "assigned_at": uv.assigned_at.isoformat(),
        })

    return {"data": {"vouchers": vouchers, "voucher_count": len(vouchers)}, "meta": {}}


@router.post("/vouchers/preview-discount", response_model=dict)
async def preview_voucher_discount(
    request: DiscountPreviewRequest,
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    """Preview discount calculation for selected vouchers.

    Validates vouchers and returns calculated discount amounts
    without actually applying them. Used for checkout preview.
    """
    tenant_id = current_user.tenant_id

    voucher_data, total_discount = await voucher_service.validate_and_calculate_multi_discount(
        db, tenant_id, current_user.id, request.voucher_codes, request.order_subtotal
    )

    details = voucher_service.get_discount_details(voucher_data)
    final_total = max(request.order_subtotal - total_discount, Decimal("0"))

    response = DiscountPreviewResponse(
        vouchers=details,
        total_discount=total_discount,
        final_total=final_total,
    )

    return {"data": response.model_dump(mode="json"), "meta": {}}
