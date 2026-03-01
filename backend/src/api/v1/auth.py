"""Auth API endpoints: login, registration, OTP verification, and user info."""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db
from src.core.security import create_access_token, decode_access_token, hash_password
from src.models.user import (
    LoginRequest,
    OTPVerifyRequest,
    RegisterRequest,
    ResendOTPRequest,
    TokenResponse,
    UserResponse,
    VerifyTokenRequest,
)
from src.services.auth_service import authenticate_user, determine_role, get_user_by_email
from src.services.email_service import send_otp_email
from src.services.otp_service import (
    check_rate_limit,
    create_otp_record,
    generate_otp,
    invalidate_old_otps,
    verify_otp,
)
from src.models.db_models import UserDB

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

security_scheme = HTTPBearer()


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate user with email/password and return JWT token."""
    user = await authenticate_user(db, request.email, request.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email hoặc mật khẩu không đúng",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản đã bị vô hiệu hóa",
        )
    
    # AC3: Determine role dynamically using determine_role() function
    detected_role = await determine_role(db, user.email)
    
    # Update user's role if it differs from detected role
    if user.role != detected_role:
        user.role = detected_role
        await db.commit()
        await db.refresh(user)
    
    access_token = create_access_token(data={"sub": user.email, "role": detected_role})
    return TokenResponse(access_token=access_token)


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Return current authenticated user info + role from JWT."""
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
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )
    return UserResponse.model_validate(user)


@router.post("/verify-token", response_model=UserResponse)
async def verify_token(
    request: VerifyTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Verify JWT token and return user info (for auto-login after OTP verification).
    
    Story 1.2: Critical Fix - Auto-login flow
    This endpoint allows Auth.js to verify a JWT token without password validation.
    """
    payload = decode_access_token(request.token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
        )
    
    email = payload.get("sub")
    role = payload.get("role")
    
    if email is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không chứa thông tin người dùng",
        )
    
    user = await get_user_by_email(db, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy người dùng",
        )
    
    # Return user info with role from token (already validated)
    return UserResponse(
        id=user.id,
        email=user.email,
        role=role or user.role,
        is_active=user.is_active,
        created_at=user.created_at,
    )


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Register a new customer account with OTP email verification.
    
    Story 1.2: AC1, AC2, AC3, AC4
    - Creates user with is_active=False, role=Customer
    - Generates 6-digit OTP with 10-minute expiry
    - Sends OTP email to user
    - HIGH Priority Fix: Rate limiting (max 3 OTP requests/hour)
    """
    # Check rate limit (HIGH Priority Fix)
    is_allowed, remaining = await check_rate_limit(db, request.email)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Bạn đã gửi quá nhiều yêu cầu OTP. Vui lòng thử lại sau 1 giờ.",
        )
    
    # Check if email already exists
    existing_user = await get_user_by_email(db, request.email)
    if existing_user is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email này đã được đăng ký. Vui lòng đăng nhập hoặc dùng email khác.",
        )
    
    # Hash password
    hashed_pw = hash_password(request.password)
    
    # Create inactive user with Customer role
    new_user = UserDB(
        email=request.email.lower(),
        hashed_password=hashed_pw,
        role="Customer",
        is_active=False,  # AC2: Inactive until OTP verified
        full_name=request.full_name,
        phone=request.phone,
        date_of_birth=request.date_of_birth,
        gender=request.gender,
        address=request.address,
    )
    
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Generate OTP and create record
    otp_code = generate_otp()  # AC3: 6-digit OTP
    await create_otp_record(db, new_user.email, otp_code)
    
    # Send OTP email
    email_sent = await send_otp_email(
        email=new_user.email,
        full_name=request.full_name,
        otp_code=otp_code,
    )
    
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể gửi email xác thực. Vui lòng thử lại sau.",
        )
    
    return {
        "message": "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.",
        "email": new_user.email,
    }


@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp_endpoint(
    request: OTPVerifyRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Verify OTP code and activate user account.
    
    Story 1.2: AC6, AC7, AC9
    - Validates OTP (correct, not expired, not used)
    - Activates user account (is_active=True)
    - Returns JWT token for auto-login
    """
    # Get user
    user = await get_user_by_email(db, request.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản với email này.",
        )
    
    # Check if already active
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản đã được kích hoạt. Vui lòng đăng nhập.",
        )
    
    # Verify OTP
    is_valid = await verify_otp(db, request.email, request.code)
    
    if not is_valid:
        # AC7: Specific error messages
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mã OTP không đúng hoặc đã hết hạn. Vui lòng kiểm tra lại hoặc yêu cầu mã mới.",
        )
    
    # AC6: Activate user account
    user.is_active = True
    await db.commit()
    await db.refresh(user)
    
    # AC9: Auto-login - Return JWT token
    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return TokenResponse(access_token=access_token)


@router.post("/resend-otp")
async def resend_otp(
    request: ResendOTPRequest,
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    """Resend OTP verification email.
    
    Story 1.2: AC8
    - Invalidates old OTPs for this email
    - Generates new OTP
    - Sends new email
    - HIGH Priority Fix: Rate limiting (max 3 OTP requests/hour)
    """
    # Check rate limit (HIGH Priority Fix)
    is_allowed, remaining = await check_rate_limit(db, request.email)
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Bạn đã gửi quá nhiều yêu cầu OTP. Vui lòng thử lại sau 1 giờ.",
        )
    
    # Get user
    user = await get_user_by_email(db, request.email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy tài khoản với email này.",
        )
    
    # Check if already active
    if user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tài khoản đã được kích hoạt. Không cần xác thực lại.",
        )
    
    # AC8: Invalidate old OTPs
    await invalidate_old_otps(db, user.email)
    
    # Generate new OTP
    otp_code = generate_otp()
    await create_otp_record(db, user.email, otp_code)
    
    # Send email
    email_sent = await send_otp_email(
        email=user.email,
        full_name=user.full_name or "Khách hàng",
        otp_code=otp_code,
    )
    
    if not email_sent:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Không thể gửi email. Vui lòng thử lại sau.",
        )
    
    return {
        "message": "Mã OTP mới đã được gửi đến email của bạn.",
        "email": user.email,
    }
