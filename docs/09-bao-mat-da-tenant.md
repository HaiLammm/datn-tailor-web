# Chương 09 — Bảo mật & Multi-tenant

## 9.1. Mô hình bảo mật tổng quan

Hệ thống áp dụng **Defense-in-Depth** với 4 lớp:

```
┌────────────────────────────────────────────────────────────────┐
│ Lớp 1 — Browser (Customer / Owner / Tailor)                    │
│   • HTTPS bắt buộc                                             │
│   • Cookie HttpOnly + Secure + SameSite (Auth.js v5)           │
│   • CSP, X-Frame-Options qua Next.js middleware                │
│   • Không lưu JWT trong localStorage/sessionStorage (NFR15)    │
└────────────────────────┬───────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────┐
│ Lớp 2 — Next.js Server (proxy.ts)                              │
│   • Đọc cookie session, verify chữ ký                          │
│   • Đính Authorization: Bearer <jwt> trước khi gọi backend     │
│   • Route guard cho (workplace)/ chỉ cho Owner/Tailor          │
│   • Server Actions với CSRF protection mặc định                │
└────────────────────────┬───────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────┐
│ Lớp 3 — FastAPI Backend                                         │
│   • HTTPBearer dependency verify JWT                           │
│   • require_roles() dependency factory cho RBAC                │
│   • TenantId dependency lọc dữ liệu theo tenant                │
│   • Hash password bằng bcrypt                                  │
│   • CORS allowlist từ env                                      │
│   • Hard Constraints geometry → 422 chặn output sai            │
└────────────────────────┬───────────────────────────────────────┘
                         │
┌────────────────────────▼───────────────────────────────────────┐
│ Lớp 4 — Database                                                │
│   • Connection qua asyncpg + TLS                                │
│   • tenant_id row-level isolation (application-enforced)        │
│   • PII (số đo, CCCD, payment) khuyến nghị mã hoá AES-256      │
│     theo NFR13                                                  │
└────────────────────────────────────────────────────────────────┘
```

## 9.2. Authentication

### 9.2.1 Phương thức

- **Email + password** (chính)
- **OTP** (đăng ký, khôi phục mật khẩu, xác thực email)
- **Multi-factor** cho Owner/Tailor session (NFR11) — khuyến nghị OTP qua email mỗi session

### 9.2.2 Backend stack

| Lib | Vai trò |
|---|---|
| `python-jose[cryptography]` | JWT encode/decode (HS256 default, có thể đổi RS256) |
| `bcrypt` | Hash password, work factor mặc định 12 |
| `aiosmtplib` | Gửi OTP qua SMTP |

### 9.2.3 JWT Token

```python
# backend/src/core/security.py (tóm tắt)
def create_access_token(data: dict, expires_delta: timedelta) -> str:
    to_encode = data.copy()
    to_encode.update({"exp": datetime.utcnow() + expires_delta})
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")

def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        return None
```

Payload chứa: `sub` (email), `role`, `tenant_id`, `exp`.

### 9.2.4 OTP Rate limiting (Migration 004)

- Bảng `otp_codes` có `attempts`, `last_sent_at`
- Backend `otp_service.py` chặn gửi quá 3 lần / 5 phút / email
- Sau 5 lần verify sai → khoá email 15 phút

### 9.2.5 Frontend NextAuth v5

```typescript
// frontend/src/auth.ts (cấu hình tóm tắt)
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      authorize: async (credentials) => {
        const res = await fetch(`${BACKEND_URL}/api/v1/auth/login`, {...});
        if (!res.ok) return null;
        const { user, access_token } = (await res.json()).data;
        return { ...user, accessToken: access_token };
      },
    }),
  ],
  session: { strategy: 'jwt', maxAge: 60 * 60 * 8 }, // 8h session
  cookies: {
    sessionToken: {
      name: '__Secure-next-auth.session-token',
      options: { httpOnly: true, secure: true, sameSite: 'lax' },
    },
  },
});
```

## 9.3. Authorization (RBAC)

### 9.3.1 3 Roles

| Role | Mô tả | Quyền chính |
|---|---|---|
| **Owner** | Chủ tiệm | Toàn quyền: orders, inventory, staff, reports, vouchers, leads, campaigns, patterns |
| **Tailor** | Thợ may | Tasks (assigned only), Pattern Preview, status update, income view |
| **Customer** | Khách hàng | Showroom, cart, checkout, profile, orders/me, notifications, vouchers/me |

### 9.3.2 Backend dependencies

`backend/src/api/dependencies.py:64`:

```python
def require_roles(*allowed_roles: str):
    async def role_checker(user: UserDB = Depends(get_current_user_from_token)) -> UserDB:
        if user.role not in allowed_roles:
            raise HTTPException(403, f"Yêu cầu vai trò: {', '.join(allowed_roles)}")
        return user
    return role_checker

OwnerOnly      = Annotated[UserDB, Depends(require_roles("Owner"))]
OwnerOrTailor  = Annotated[UserDB, Depends(require_roles("Owner", "Tailor"))]
```

→ Mọi endpoint nhạy cảm khai báo `user: OwnerOnly` hoặc `user: OwnerOrTailor` để FastAPI auto-inject + validate.

Ví dụ Pattern Engine:
- `POST /api/v1/patterns/sessions` → `OwnerOnly`
- `POST /api/v1/patterns/sessions/{id}/generate` → `OwnerOnly`
- `GET /api/v1/patterns/sessions/{id}` → `OwnerOrTailor` (Tailor cần xem rập)
- `GET /api/v1/patterns/pieces/{id}/export` → `OwnerOrTailor`

### 9.3.3 Frontend route guards

```typescript
// (workplace)/layout.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function WorkplaceLayout({ children }) {
  const session = await auth();
  if (!session) redirect('/login');
  if (!['Owner', 'Tailor'].includes(session.user.role)) redirect('/');
  return <>{children}</>;
}
```

## 9.4. Multi-Tenant Isolation

### 9.4.1 Schema strategy: shared schema + tenant_id

Mọi bảng nhạy cảm (orders, customers, garments, designs, vouchers, leads, …) đều có cột `tenant_id UUID` FK → `tenants(id)`.

### 9.4.2 Tenant extraction (`TenantId` dependency)

```python
# backend/src/api/dependencies.py:130
async def get_tenant_id_from_user(user: UserDB = Depends(get_current_user_from_token)) -> uuid.UUID:
    DEFAULT_TENANT_ID = uuid.UUID("00000000-0000-0000-0000-000000000001")

    if user.role == "Owner":
        return user.tenant_id if user.tenant_id else DEFAULT_TENANT_ID

    if user.tenant_id is None:
        raise HTTPException(403, "Tài khoản chưa được gán vào tiệm nào.")

    return user.tenant_id

TenantId = Annotated[uuid.UUID, Depends(get_tenant_id_from_user)]
```

### 9.4.3 Service layer enforcement

Tất cả service truy vấn DB phải `WHERE tenant_id = :tenant_id`. Ví dụ:

```python
async def get_session(db: AsyncSession, session_id: UUID, tenant_id: UUID):
    stmt = select(PatternSessionDB).where(
        PatternSessionDB.id == session_id,
        PatternSessionDB.tenant_id == tenant_id,  # ← BẮT BUỘC
    )
    result = await db.execute(stmt)
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(404, "Không tìm thấy pattern session")  # 404 thay vì 403 → không leak existence
    return session
```

> **Convention quan trọng:** Trả `404` chứ không phải `403` khi resource thuộc tenant khác — tránh leak thông tin (không tiết lộ "có tồn tại resource đó nhưng bạn không có quyền").

### 9.4.4 Backward compatibility

- Default tenant `00000000-0000-0000-0000-000000000001` cho phép Owner role hoạt động không cần migrate dữ liệu cũ.
- Các tenant mới thêm qua `tenants` table; user assignment qua `users.tenant_id`.

## 9.5. Geometry Hard Constraints (NFR12 + Epic 14)

> Áp dụng cho AI Bespoke Engine (Epic 12-14, hoãn) và một phần Pattern Engine (Epic 11).

- Hard Constraints lưu trong `constraints/registry.py` + `hard_constraints.py`.
- Vi phạm → HTTP 422 với message tiếng Việt:

  ```json
  {
    "error": {
      "code": "ERR_HARD_CONSTRAINT_VIOLATION",
      "message": "Vòng nách (35cm) nhỏ hơn 1.2× vòng bắp tay (28cm)."
    }
  }
  ```

- Soft Constraints (±5% theo FR11): warning, không chặn export.

> Pattern Engine (Epic 11) chỉ áp basic min/max validation (FR99) — trust nghệ nhân.

## 9.6. Payment Security (NFR14)

- **PCI DSS compliance**: hệ thống KHÔNG lưu raw card data — chỉ lưu `gateway_ref` (token) trong `payment_transactions.gateway_ref`.
- Mọi thanh toán đi qua VNPay/MoMo/Stripe gateway → user nhập card tại trang gateway HTTPS.
- Webhook callback dùng signature verification (HMAC) trước khi update DB.
- Idempotency: webhook có thể bị retry → backend kiểm `gateway_ref` đã xử lý chưa.

## 9.7. Data at rest encryption (NFR13)

> Khuyến nghị (chưa enforce trong code):

- Cột nhạy cảm: `measurements.*`, `customer_profiles.cccd`, `design_overrides.*`
- Có thể bật **Transparent Data Encryption (TDE)** ở Postgres level
- Hoặc dùng `pgcrypto` cho cột-level encryption
- Quản lý key qua AWS KMS / Hashicorp Vault

## 9.8. CORS & CSRF

### 9.8.1 CORS (backend)

```python
allowed_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

→ Production: `CORS_ORIGINS=https://app.thanhloc.com`

### 9.8.2 CSRF (frontend)

- Next.js Server Actions có CSRF protection mặc định (token gắn vào form).
- NextAuth cookie với `SameSite=Lax` → chống CSRF cơ bản.
- Khuyến nghị: thêm CSRF token cho các form mutation lớn (vd: thanh toán).

## 9.9. Logging & audit (NFR16)

- Logger Python stdlib (Backend) ghi mọi:
  - Login attempt (success/fail)
  - Role check failure (403)
  - Tenant mismatch (404 ẩn)
  - Override decision của Tailor (cho Atelier Academy training)
  - Payment webhook
  - Critical state transition (order approve, refund security)

- Production khuyến nghị:
  - Forward log → ELK / CloudWatch / Datadog
  - Langfuse cho LangGraph trace (Epic 12+)
  - Prometheus + Grafana cho API metrics

## 9.10. Threat model (tóm tắt)

| Mối đe doạ | Mitigation |
|---|---|
| **JWT theft (XSS)** | HttpOnly cookie + CSP header + NextAuth |
| **CSRF** | SameSite cookie + Server Action CSRF token |
| **SQL Injection** | SQLAlchemy parameterized queries (KHÔNG dùng raw SQL với f-string) |
| **Tenant data leak** | TenantId dependency bắt buộc, 404 ẩn |
| **Brute force login** | Rate limit OTP + cảnh báo email khi nhiều attempts |
| **Payment double-charge** | Idempotency key + gateway_ref unique |
| **Geometry violation production** | Hard Constraints chặn 422 trước export |
| **Data exfiltration via export** | Export endpoints có RBAC; rate limit batch export |
| **Privilege escalation** | RBAC dependencies + Frontend route guards |
| **Insecure deserialization** | Pydantic V2 strict mode (default) |

## 9.11. Compliance checklist (cho deploy production)

- [ ] HTTPS bắt buộc (HSTS preload)
- [ ] WAF (Cloudflare / AWS WAF) trước Next.js
- [ ] DB backup automated daily + point-in-time recovery
- [ ] Secrets trong Vault/Secrets Manager (KHÔNG trong env file commit)
- [ ] Audit log retention ≥ 90 ngày
- [ ] Penetration test trước launch
- [ ] PCI DSS attestation (qua gateway provider)
- [ ] WCAG 2.1 Level A audit (axe-core / WAVE) — NFR20
- [ ] Privacy policy + ToS published (theo luật BVDLCN VN)
