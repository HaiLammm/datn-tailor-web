# Story 4.4g: Kho Voucher (Customer Voucher Wallet)

Status: review

## Story

As a Khách hàng (Customer),
I want xem danh sách voucher giảm giá được gán cho tài khoản của mình trong trang Profile,
So that tôi biết mã nào đang có hiệu lực và có thể dùng khi thanh toán.

## Acceptance Criteria

### AC1: Hiển thị danh sách voucher
**Given** Customer đang ở trang `/profile/vouchers`
**When** Trang tải xong
**Then** Hiển thị danh sách voucher được gán cho user theo thứ tự: active trước, expired sau
**And** Mỗi voucher card hiển thị: code (có nút sao chép), loại giảm (% hoặc VND cố định), giá trị, điều kiện áp dụng (đơn tối thiểu), ngày hết hạn, trạng thái

### AC2: Phân biệt trạng thái voucher
**Given** Customer có nhiều loại voucher (active, expired, used)
**When** Xem danh sách
**Then** Voucher active: border indigo-200, badge xanh "Còn hiệu lực"
**And** Voucher expired: opacity-60, badge xám "Đã hết hạn"
**And** Voucher đã dùng: opacity-60, badge amber "Đã sử dụng"

### AC3: Sao chép mã voucher
**Given** Customer muốn dùng voucher
**When** Bấm icon copy hoặc nút "Sao chép" trên voucher card
**Then** Code được copy vào clipboard
**And** Nút đổi thành "Đã sao chép ✓" trong 2 giây, sau đó hồi về trạng thái ban đầu

### AC4: Empty state
**Given** Customer chưa có voucher nào
**When** Mở trang `/profile/vouchers`
**Then** Hiển thị icon voucher lớn + text "Chưa có voucher nào" + mô tả "Voucher giảm giá sẽ được gửi đến bạn qua thông báo hoặc chiến dịch khuyến mãi"

### AC5: Loading & Error states
**Given** Trang đang tải
**When** Fetch API chưa xong
**Then** Hiển thị skeleton loading (3-4 placeholder cards)
**When** Fetch thất bại
**Then** Hiển thị error state với nút "Thử lại"
**And** Layout responsive: single column trên mobile, 2 columns trên desktop (md:grid-cols-2)

### AC6: Backend infrastructure (Foundation for Story 6.3)
**Given** Chưa tồn tại voucher infrastructure
**When** Dev implement story này
**Then** Tạo schema `vouchers` và `user_vouchers` tables trong DB
**And** API GET endpoint `/api/v1/customers/me/vouchers` trả về danh sách voucher của user
**And** Schema phải forward-compatible với Story 6.3 (Owner CRUD voucher creation)

## Tasks / Subtasks

- [x] Task 1: Database migration — tạo `vouchers` và `user_vouchers` tables (AC: #6)
  - [x] 1.1: Tạo `backend/migrations/017_create_vouchers_tables.sql`
  - [x] 1.2: Thêm `VoucherDB` ORM model vào `db_models.py`
  - [x] 1.3: Thêm `UserVoucherDB` ORM model vào `db_models.py`
  - [x] 1.4: Tạo Pydantic schemas `VoucherResponse`, `VoucherType`, `VoucherStatus` trong `backend/src/models/voucher.py`

- [x] Task 2: Backend API endpoint (AC: #1, #6)
  - [x] 2.1: Add `GET /api/v1/customers/me/vouchers` to `customer_profile.py` — list user's assigned vouchers (join user_vouchers → vouchers), exclude soft-deleted, sort active first then by expiry_date ASC

- [x] Task 3: Backend tests (AC: #1, #2, #5, #6)
  - [x] 3.1: Test GET vouchers — success with active/expired/used mix
  - [x] 3.2: Test GET vouchers — empty list (no assignments)
  - [x] 3.3: Test GET vouchers — unauthorized (no token)
  - [x] 3.4: Test GET vouchers — expired and used vouchers included with correct status

- [x] Task 4: Frontend Server Action (AC: #1)
  - [x] 4.1: Add `getMyVouchers()` to `profile-actions.ts` — same pattern as `getMyNotifications()`

- [x] Task 5: Frontend VoucherList component (AC: #1, #2, #3, #4, #5)
  - [x] 5.1: Create `frontend/src/components/client/profile/VoucherList.tsx`
  - [x] 5.2: Voucher card with code display, copy button (clipboard API), type/value badge, conditions, expiry date
  - [x] 5.3: Status badges (active / expired / used) with correct colors
  - [x] 5.4: Copy-to-clipboard with 2s feedback using useState + useRef timer (NO external toast library)
  - [x] 5.5: Empty state, skeleton loading (3-4 cards), error + retry
  - [x] 5.6: 2-column grid on md+, single column mobile

- [x] Task 6: Frontend types (AC: #1)
  - [x] 6.1: Create `frontend/src/types/voucher.ts` with `VoucherItem`, `VoucherType`, `VoucherStatus`, `VouchersData`

- [x] Task 7: Replace placeholder page (AC: all)
  - [x] 7.1: Update `frontend/src/app/(customer)/profile/vouchers/page.tsx` — Server Component fetching vouchers, passing to VoucherList
  - [x] 7.2: Apply `auth()` guard pattern (same as notifications/appointments pages)

- [x] Task 8: Frontend tests (AC: all)
  - [x] 8.1: Create `frontend/src/__tests__/VoucherList.test.tsx` — component tests
  - [x] 8.2: Create `frontend/src/__tests__/voucherActions.test.ts` — Server Action tests

## Dev Notes

### Database Schema

```sql
-- Migration 017: Create vouchers infrastructure (Story 4.4g)
-- vouchers: master voucher definitions (will be managed by Owner via Story 6.3)
-- user_vouchers: assignment of vouchers to specific customers

CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,          -- 'percent' | 'fixed'
    value NUMERIC(10, 2) NOT NULL,      -- percent (0-100) or fixed VND amount
    min_order_value NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- minimum order total to apply
    max_discount_value NUMERIC(12, 2),  -- cap for percent vouchers (NULL = no cap)
    description TEXT,
    expiry_date DATE NOT NULL,
    total_uses INT NOT NULL DEFAULT 1,  -- how many times this voucher can be used globally
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_voucher_type CHECK (type IN ('percent', 'fixed')),
    CONSTRAINT chk_voucher_value_positive CHECK (value > 0),
    CONSTRAINT chk_percent_range CHECK (type != 'percent' OR value <= 100),
    UNIQUE (tenant_id, code)
);

CREATE INDEX idx_vouchers_tenant ON vouchers (tenant_id);
CREATE INDEX idx_vouchers_active ON vouchers (tenant_id, is_active, expiry_date);

-- user_vouchers: individual assignment of a voucher to a user
CREATE TABLE user_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_in_order_id UUID,              -- NULL until applied in checkout (FK to orders added in Epic 6)
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, voucher_id)        -- one assignment per user per voucher
);

CREATE INDEX idx_user_vouchers_user ON user_vouchers (user_id, tenant_id);
CREATE INDEX idx_user_vouchers_voucher ON user_vouchers (voucher_id);
```

### ORM Models (add to `db_models.py`)

```python
class VoucherDB(Base):
    """Master voucher definitions — managed by Owner (Story 6.3)."""
    __tablename__ = "vouchers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    type: Mapped[str] = mapped_column(String(20), nullable=False)        # 'percent' | 'fixed'
    value: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    min_order_value: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, server_default=text("0"))
    max_discount_value: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    total_uses: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    used_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))


class UserVoucherDB(Base):
    """Assignment of vouchers to individual customers."""
    __tablename__ = "user_vouchers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    voucher_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("vouchers.id", ondelete="CASCADE"), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    used_in_order_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=text("now()"))
```

### Pydantic Schema (`backend/src/models/voucher.py`)

```python
from enum import Enum
from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID
from typing import Optional
from decimal import Decimal

class VoucherType(str, Enum):
    PERCENT = "percent"
    FIXED = "fixed"

class VoucherStatus(str, Enum):
    ACTIVE = "active"       # assigned, not used, not expired
    EXPIRED = "expired"     # past expiry_date
    USED = "used"           # is_used = True

class VoucherResponse(BaseModel):
    id: UUID
    voucher_id: UUID
    code: str
    type: VoucherType
    value: Decimal
    min_order_value: Decimal
    max_discount_value: Optional[Decimal] = None
    description: Optional[str] = None
    expiry_date: date
    status: VoucherStatus
    assigned_at: datetime

    model_config = {"from_attributes": True}
```

### Backend API (add to `customer_profile.py`)

```python
from src.models.db_models import VoucherDB, UserVoucherDB
from src.models.voucher import VoucherResponse, VoucherStatus
from datetime import date as date_type

@router.get("/vouchers", response_model=dict)
async def get_my_vouchers(current_user: CurrentUser, db=Depends(get_db)) -> dict:
    """List vouchers assigned to the authenticated customer.

    Joins user_vouchers → vouchers. Excludes global vouchers not assigned.
    Sort: active first (expiry_date ASC), then expired, then used.
    Status computed in Python: used → is_used=True, expired → expiry_date < today, else active.
    """
    stmt = (
        select(UserVoucherDB, VoucherDB)
        .join(VoucherDB, UserVoucherDB.voucher_id == VoucherDB.id)
        .where(UserVoucherDB.user_id == current_user.id)
        .where(VoucherDB.is_active == True)
        .order_by(UserVoucherDB.is_used.asc(), VoucherDB.expiry_date.asc())
    )
    rows = (await db.execute(stmt)).all()
    today = date_type.today()

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
            "value": str(v.value),          # Decimal → str to avoid JSON serialization issues
            "min_order_value": str(v.min_order_value),
            "max_discount_value": str(v.max_discount_value) if v.max_discount_value else None,
            "description": v.description,
            "expiry_date": v.expiry_date.isoformat(),
            "status": status.value,
            "assigned_at": uv.assigned_at.isoformat(),
        })

    return {"data": {"vouchers": vouchers, "voucher_count": len(vouchers)}, "meta": {}}
```

**NO routing conflict risk** — `/vouchers` is a simple static path with no sub-routes for this story.

### Frontend TypeScript Types (`frontend/src/types/voucher.ts`)

```typescript
export type VoucherType = 'percent' | 'fixed';
export type VoucherStatus = 'active' | 'expired' | 'used';

export interface VoucherItem {
  id: string;
  voucher_id: string;
  code: string;
  type: VoucherType;
  value: string;            // Decimal serialized as string from backend
  min_order_value: string;  // Decimal serialized as string from backend
  max_discount_value: string | null;
  description: string | null;
  expiry_date: string;      // ISO date string "YYYY-MM-DD"
  status: VoucherStatus;
  assigned_at: string;
}

export interface VouchersData {
  vouchers: VoucherItem[];
  voucher_count: number;
}
```

### Frontend Server Action (add to `profile-actions.ts`)

```typescript
import type { VouchersData } from "@/types/voucher";

export async function getMyVouchers(): Promise<{
  success: boolean;
  data?: VouchersData;
  error?: string;
}> {
  // Same pattern as getMyNotifications():
  // getAuthToken() → fetch with Bearer → AbortController 10s timeout
  // return { success: true, data: json.data } on success
  // return { success: false, error: "..." } on failure
}
```

### Frontend VoucherList Component Pattern

```typescript
"use client";
// Receives initialVouchers: VoucherItem[] from Server Component
// Local state: vouchers (useState)
// copiedId: string | null — tracks which voucher code was just copied
// Copy: navigator.clipboard.writeText(code), setCopiedId(id), clearTimeout after 2000ms
// DO NOT use external clipboard library — navigator.clipboard.writeText is sufficient

// Value formatting helper:
function formatDiscount(item: VoucherItem): string {
  const value = parseFloat(item.value);
  if (item.type === 'percent') return `Giảm ${value}%`;
  return `Giảm ${value.toLocaleString('vi-VN')}đ`;
}

// Min order formatting:
function formatMinOrder(minOrderValue: string): string {
  const val = parseFloat(minOrderValue);
  if (val === 0) return 'Không giới hạn';
  return `Đơn tối thiểu ${val.toLocaleString('vi-VN')}đ`;
}

// Expiry date formatting (vi-VN locale):
function formatExpiryDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
```

**Status badge colors:**
```typescript
const STATUS_CONFIG = {
  active:  { label: 'Còn hiệu lực', className: 'bg-green-100 text-green-700' },
  expired: { label: 'Đã hết hạn',   className: 'bg-gray-100 text-gray-500'  },
  used:    { label: 'Đã sử dụng',   className: 'bg-amber-100 text-amber-700' },
};
```

**Voucher card layout:**
- Active: `border border-indigo-200 bg-white`
- Expired/Used: `border border-gray-200 bg-white opacity-60`
- Left accent bar: `w-2 bg-indigo-600` (active) | `bg-gray-300` (inactive)
- Code display: `font-mono text-lg font-bold tracking-widest text-indigo-700`

### Voucher Page (Server Component Pattern)

```typescript
// frontend/src/app/(customer)/profile/vouchers/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMyVouchers } from "@/app/actions/profile-actions";
import { VoucherList } from "@/components/client/profile/VoucherList";

export default async function ProfileVouchersPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const result = await getMyVouchers();
  const vouchers = result.success ? (result.data?.vouchers ?? []) : [];
  const fetchError = result.success ? undefined : result.error;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <VoucherList initialVouchers={vouchers} initialError={fetchError} />
    </div>
  );
}
```

### Vietnamese UI Labels

| Key | Vietnamese |
|-----|-----------|
| Page title | Kho Voucher |
| Copy button | Sao chép |
| Copied state | Đã sao chép ✓ |
| Status active | Còn hiệu lực |
| Status expired | Đã hết hạn |
| Status used | Đã sử dụng |
| Type percent | Giảm X% |
| Type fixed | Giảm Xđ |
| Min order label | Đơn tối thiểu: |
| Min order none | Không giới hạn |
| Max discount label | Giảm tối đa: |
| Expiry label | Hạn dùng: |
| Empty title | Chưa có voucher nào |
| Empty subtitle | Voucher giảm giá sẽ được gửi đến bạn qua thông báo hoặc chiến dịch khuyến mãi |
| Loading error | Không thể tải danh sách voucher |
| Retry | Thử lại |

### Anti-Pattern Prevention

- **DO NOT** install new npm packages for clipboard — use native `navigator.clipboard.writeText()`
- **DO NOT** use `useSession()` from next-auth/react — pass session data via Server Component auth()
- **DO NOT** implement voucher application at checkout — out of scope (requires Epic 3 checkout flow changes)
- **DO NOT** create Owner CRUD for vouchers — out of scope (Story 6.3 in Epic 6)
- **DO NOT** create a separate voucher router file — add endpoint to existing `customer_profile.py` (prefix `/api/v1/customers/me`)
- **DO NOT** hard-code tenant_id — always derive from `current_user.tenant_id` (same fallback pattern as notifications)
- **DO NOT** use Framer Motion — keep consistent with other P2 sub-stories (notifications, appointments)
- **DO NOT** use `window.confirm()` — not applicable here (no destructive action for vouchers)
- **DO NOT** create `user_vouchers` with a per-user global voucher (one entry per user) — the `UNIQUE(user_id, voucher_id)` constraint in schema handles this
- **DO NOT** forget `Decimal → str` serialization: `value`, `min_order_value`, `max_discount_value` are Numeric in Postgres — serialize as string in API response and parse with `parseFloat()` on frontend (lesson from 4.4d)
- **DO NOT** add pagination — vouchers per customer are small in number; load all at once
- **DO NOT** query `used_count` on `vouchers` to determine `status` — use `user_vouchers.is_used` field for per-user status
- **DO NOT** filter out expired or used vouchers — show all assigned vouchers with their correct status; customers want to see history

### Project Structure Notes

- **Migration**: `backend/migrations/017_create_vouchers_tables.sql` (next after 016_create_notifications_table.sql)
- **ORM models**: Add `VoucherDB` and `UserVoucherDB` to existing `backend/src/models/db_models.py`
- **Pydantic schemas**: New file `backend/src/models/voucher.py` (same pattern as `notification.py`)
- **Backend endpoint**: Add to `customer_profile.py` (prefix `/api/v1/customers/me`)
- **Frontend types**: New file `frontend/src/types/voucher.ts`
- **Client component**: `frontend/src/components/client/profile/VoucherList.tsx`
- **Server Action**: Add `getMyVouchers()` to `frontend/src/app/actions/profile-actions.ts`
- **Page**: Replace placeholder `frontend/src/app/(customer)/profile/vouchers/page.tsx`
- **Tests**: `backend/tests/test_customer_vouchers_api.py`, `frontend/src/__tests__/VoucherList.test.tsx`, `frontend/src/__tests__/voucherActions.test.ts`
- **ProfileSidebar**: Already has "Voucher" nav item — NO modification needed (usePathname auto-highlights `/profile/vouchers`)

### Previous Story Intelligence (4.4f Notifications — Immediate Previous)

**Patterns to follow exactly:**
1. **Server Action pattern:** `getAuthToken()` → Bearer JWT → `fetch()` with `AbortController` 10s timeout → return `{ success, data?, error? }`
2. **Server Component page pattern:** `auth()` check → redirect if no session → call Server Action → pass data as `initialX` props to Client Component
3. **Client Component pattern:** receive `initialVouchers: VoucherItem[]` + `initialError?: string` as props → `useState` locally → no TanStack Query (simple profile sub-story)
4. **Decimal serialization:** Backend returns Numeric as string → frontend parses with `parseFloat()` (from 4.4d lesson)
5. **Backend commit pattern:** If write operations existed, `await db.flush()` + `await db.commit()` — for this story only READ, no write needed
6. **Test Vietnamese text:** Assert exact Vietnamese strings in both backend and frontend tests

**Lessons from 4.4d (Số đo):**
- Decimal/Numeric type from PostgreSQL may serialize as string — always handle with `parseFloat()` or `str()` in Python
- `customer_profile_router` is registered before `customers_router` in `main.py` — already correct

**Lessons from 4.4f (Notifications):**
- Static paths before parameterized paths in FastAPI registration — not applicable here (only 1 endpoint, no path params)
- Memory leak prevention: clear setTimeout in useEffect return if using timers (clipboard feedback timer uses useRef + clearTimeout)
- ProfileSidebar `usePathname()` handles active state — no additional work needed

### Git Intelligence

- Recent commit style: `feat(story-4.4X): description` for implementation, `fix(story-4.4X): description` for reviews
- Backend tests: `backend/tests/test_*.py` (flat, no subfolder)
- Frontend tests: `frontend/src/__tests__/*.test.tsx` and `*.test.ts`
- Last 8 commits focus on 4.4b-4.4f profile sub-stories — consistent incremental pattern

### Architecture Compliance

- **Authoritative Server Pattern:** Backend computes `status` (active/expired/used) — frontend just renders, never recomputes business logic
- **RBAC:** Endpoint uses `CurrentUser` dependency — customers can only see their own vouchers
- **Tenant isolation:** All queries filter by `user_id`; `tenant_id` stored for future multi-tenant queries
- **API response format:** `{ "data": { "vouchers": [...], "voucher_count": N }, "meta": {} }`
- **Error response format:** `{ "error": { "code": "ERR_CODE", "message": "Vietnamese message" } }`
- **Database naming:** `snake_case` for tables/columns (vouchers, user_vouchers, user_id, voucher_id, min_order_value)
- **Pydantic models:** `PascalCase` (VoucherDB, UserVoucherDB, VoucherResponse)
- **Component separation:** Server Component in `app/`, Client Component in `components/client/`
- **Forward compatibility:** Schema designed so Story 6.3 (Owner CRUD) can add vouchers via same `vouchers` table without schema changes; `user_vouchers.used_in_order_id` can be linked to `orders.id` via FK later

### Files to CREATE

| File | Purpose |
|------|---------|
| `backend/migrations/017_create_vouchers_tables.sql` | DB migration |
| `backend/src/models/voucher.py` | Pydantic schemas |
| `backend/tests/test_customer_vouchers_api.py` | Backend endpoint tests |
| `frontend/src/types/voucher.ts` | TypeScript types |
| `frontend/src/components/client/profile/VoucherList.tsx` | Main client component |
| `frontend/src/__tests__/VoucherList.test.tsx` | Component tests |
| `frontend/src/__tests__/voucherActions.test.ts` | Server Action tests |

### Files to MODIFY

| File | Change |
|------|--------|
| `backend/src/models/db_models.py` | Add `VoucherDB` and `UserVoucherDB` ORM models |
| `backend/src/api/v1/customer_profile.py` | Add `GET /api/v1/customers/me/vouchers` endpoint |
| `frontend/src/app/actions/profile-actions.ts` | Add `getMyVouchers()` Server Action |
| `frontend/src/app/(customer)/profile/vouchers/page.tsx` | Replace placeholder with real Server Component |

### Files to REUSE (DO NOT MODIFY)

| File | Reason |
|------|--------|
| `frontend/src/components/client/profile/ProfileSidebar.tsx` | Already has Voucher nav item at `/profile/vouchers` — no changes needed |
| `frontend/src/app/(customer)/profile/layout.tsx` | No changes needed (vouchers don't need badge count like notifications) |
| `backend/src/core/auth.py` | `CurrentUser` dependency already defined |
| `backend/src/core/config.py` | DB config already configured |
| `frontend/src/components/client/profile/NotificationList.tsx` | Reference for empty state, skeleton, error + retry pattern |

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4 Story 4.4 requirements, Epic 6 Story 6.3 Voucher Creator]
- [Source: _bmad-output/planning-artifacts/architecture.md — API response format, naming conventions, Authoritative Server Pattern]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Heritage Palette 2.0, Boutique Mode layout]
- [Source: _bmad-output/implementation-artifacts/4-4f-thong-bao-notifications.md — Previous story patterns and all learnings]
- [Source: frontend/src/components/client/profile/ProfileSidebar.tsx — Already has Voucher nav item]
- [Source: frontend/src/app/(customer)/profile/vouchers/page.tsx — Current placeholder to replace]
- [Source: backend/src/api/v1/customer_profile.py — Existing endpoint patterns and router prefix]
- [Source: backend/src/models/db_models.py — ORM model patterns (Mapped, mapped_column style)]
- [Source: backend/migrations/016_create_notifications_table.sql — Latest migration style reference]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

### Completion Notes List

### File List
