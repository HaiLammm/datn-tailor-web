# Story 4.4f: Thông báo (Notifications)

Status: review

## Story

As a Khách hàng (Customer),
I want xem danh sách thông báo về đơn hàng, lịch hẹn và các cập nhật quan trọng trong trang Profile,
So that tôi không bỏ lỡ thông tin quan trọng liên quan đến giao dịch và lịch hẹn của mình.

## Acceptance Criteria (BDD)

### AC1: Hiển thị danh sách thông báo
**Given** Customer đang ở trang `/profile/notifications`
**When** Trang tải xong
**Then** Hiển thị danh sách thông báo theo thứ tự mới nhất trước (DESC by created_at)
**And** Mỗi thông báo hiển thị: icon loại, tiêu đề, nội dung tóm tắt, thời gian (relative), trạng thái đã đọc/chưa đọc
**And** Thông báo chưa đọc có nền khác biệt (indigo-50) so với đã đọc (white)

### AC2: Badge đếm thông báo chưa đọc
**Given** Customer đã đăng nhập và có thông báo chưa đọc
**When** Nhìn ProfileSidebar hoặc navbar
**Then** Icon bell hiển thị badge đỏ với số lượng thông báo chưa đọc
**And** Badge biến mất khi unread_count = 0

### AC3: Đánh dấu đã đọc
**Given** Customer đang xem danh sách thông báo
**When** Bấm vào một thông báo chưa đọc
**Then** Thông báo đó chuyển trạng thái sang "read" (cập nhật UI ngay lập tức - optimistic)
**And** Badge count giảm 1
**When** Bấm "Đánh dấu tất cả đã đọc"
**Then** Tất cả thông báo chuyển sang "read" và badge count = 0

### AC4: Phân loại thông báo theo type
**Given** Customer có nhiều loại thông báo
**When** Xem danh sách
**Then** Mỗi loại thông báo có icon và màu riêng:
- `order_status`: icon package, indigo — Cập nhật đơn hàng
- `appointment`: icon calendar, green — Lịch hẹn
- `return_reminder`: icon clock, amber — Nhắc trả đồ thuê
- `payment`: icon credit-card, emerald — Thanh toán
- `system`: icon info, slate — Hệ thống

### AC5: Empty state
**Given** Customer chưa có thông báo nào
**When** Mở trang notifications
**Then** Hiển thị icon bell lớn + text "Chưa có thông báo nào" + mô tả phụ "Thông báo về đơn hàng, lịch hẹn và ưu đãi sẽ hiển thị tại đây"

### AC6: Xóa thông báo
**Given** Customer đang xem một thông báo
**When** Bấm icon trash trên thông báo đó
**Then** Hiển thị inline confirm "Xóa thông báo này?"
**When** Xác nhận xóa
**Then** Thông báo biến mất khỏi danh sách (soft delete — backend đánh dấu deleted_at)

### AC7: Tự động tạo thông báo từ sự kiện hệ thống
**Given** Một sự kiện quan trọng xảy ra (đơn hàng đổi trạng thái, lịch hẹn được xác nhận, nhắc trả đồ)
**When** Backend xử lý sự kiện đó
**Then** Một bản ghi notification mới được tạo trong DB cho customer liên quan
**And** Thông báo có type, title, message phù hợp bằng tiếng Việt

### AC8: Responsive & Loading states
**Given** Trang đang tải
**When** Fetch API chưa xong
**Then** Hiển thị skeleton loading (3-4 placeholder cards)
**When** Fetch thất bại
**Then** Hiển thị error state với nút "Thử lại"
**And** Layout responsive: single column trên mobile, giữ nguyên trên desktop

## Tasks / Subtasks

- [ ] Task 1: Database migration — tạo bảng `notifications` (AC: #1, #7)
  - [ ] 1.1: Tạo migration file `backend/migrations/0XX_create_notifications_table.sql`
  - [ ] 1.2: Thêm `NotificationDB` ORM model vào `db_models.py`
  - [ ] 1.3: Tạo Pydantic schemas `NotificationResponse`, `NotificationType`, `NotificationStatus` trong `backend/src/models/notification.py`

- [ ] Task 2: Backend notification service (AC: #7)
  - [ ] 2.1: Tạo `backend/src/services/notification_creator.py` — hàm `create_notification(db, user_id, tenant_id, type, title, message, data)`
  - [ ] 2.2: Hook vào order status change flow — gọi `create_notification` khi order đổi status
  - [ ] 2.3: Hook vào appointment confirm/cancel — gọi `create_notification` tương ứng
  - [ ] 2.4: Hook vào return reminder flow — tạo in-app notification kèm email

- [ ] Task 3: Backend API endpoints (AC: #1, #2, #3, #6)
  - [ ] 3.1: `GET /api/v1/customers/me/notifications` — list notifications (exclude deleted), sorted DESC
  - [ ] 3.2: `GET /api/v1/customers/me/notifications/unread-count` — return `{ data: { unread_count: N } }`
  - [ ] 3.3: `PATCH /api/v1/customers/me/notifications/{id}/read` — mark single as read
  - [ ] 3.4: `PATCH /api/v1/customers/me/notifications/read-all` — mark all as read
  - [ ] 3.5: `DELETE /api/v1/customers/me/notifications/{id}` — soft delete (set deleted_at)

- [ ] Task 4: Backend tests (AC: all)
  - [ ] 4.1: Test GET list (success, empty, unauthorized)
  - [ ] 4.2: Test GET unread-count
  - [ ] 4.3: Test PATCH read (success, not-found, already-read, unauthorized)
  - [ ] 4.4: Test PATCH read-all
  - [ ] 4.5: Test DELETE (success, not-found, unauthorized)
  - [ ] 4.6: Test notification creation service

- [ ] Task 5: Frontend Server Actions (AC: #1, #2, #3, #6)
  - [ ] 5.1: Add to `profile-actions.ts`: `getMyNotifications()`, `getUnreadCount()`, `markNotificationRead()`, `markAllNotificationsRead()`, `deleteNotification()`

- [ ] Task 6: Frontend NotificationList component (AC: #1, #3, #4, #5, #6, #8)
  - [ ] 6.1: Create `frontend/src/components/client/profile/NotificationList.tsx`
  - [ ] 6.2: Notification card with type icon, title, message, relative time, read/unread styling
  - [ ] 6.3: Mark as read on click (optimistic UI)
  - [ ] 6.4: "Đánh dấu tất cả đã đọc" button
  - [ ] 6.5: Delete with inline confirm dialog
  - [ ] 6.6: Empty state, skeleton loading, error + retry
  - [ ] 6.7: Responsive layout

- [ ] Task 7: Update ProfileSidebar badge (AC: #2)
  - [ ] 7.1: Add unread count badge to bell icon in ProfileSidebar
  - [ ] 7.2: Fetch unread count via Server Component prop from layout

- [ ] Task 8: Replace placeholder page (AC: all)
  - [ ] 8.1: Update `frontend/src/app/(customer)/profile/notifications/page.tsx` — Server Component fetching notifications + unread count
  - [ ] 8.2: Update `frontend/src/app/(customer)/profile/layout.tsx` — pass unread count to ProfileSidebar

- [ ] Task 9: Frontend tests (AC: all)
  - [ ] 9.1: NotificationList component tests
  - [ ] 9.2: Server Action tests for notification actions

## Dev Notes

### Database Schema

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    user_id UUID NOT NULL REFERENCES users(id),
    type VARCHAR(50) NOT NULL,  -- 'order_status', 'appointment', 'return_reminder', 'payment', 'system'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',    -- Flexible payload: { order_id, appointment_id, etc. }
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,     -- Soft delete
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_notification_type CHECK (type IN ('order_status', 'appointment', 'return_reminder', 'payment', 'system'))
);

CREATE INDEX idx_notifications_user_unread ON notifications (user_id, is_read) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_notifications_tenant ON notifications (tenant_id);
```

### Backend Implementation Pattern

**ORM Model** (add to `db_models.py`):
```python
class NotificationDB(Base):
    __tablename__ = "notifications"
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    data = Column(JSONB, server_default=text("'{}'::jsonb"))
    is_read = Column(Boolean, nullable=False, server_default=text("false"))
    read_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=text("now()"))
```

**Pydantic Schema** (`backend/src/models/notification.py`):
```python
from enum import Enum
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID
from typing import Optional

class NotificationType(str, Enum):
    ORDER_STATUS = "order_status"
    APPOINTMENT = "appointment"
    RETURN_REMINDER = "return_reminder"
    PAYMENT = "payment"
    SYSTEM = "system"

class NotificationResponse(BaseModel):
    id: UUID
    type: NotificationType
    title: str
    message: str
    data: dict = {}
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}
```

**API endpoints** — add to `customer_profile.py` router (same router as 4.4b/4.4d/4.4e, prefix `/api/v1/customers/me`):
```python
@router.get("/notifications", response_model=dict)
async def get_my_notifications(current_user: CurrentUser, db=Depends(get_db)) -> dict:
    # Query WHERE user_id == current_user.id AND deleted_at IS NULL ORDER BY created_at DESC
    ...

@router.get("/notifications/unread-count", response_model=dict)
async def get_unread_count(current_user: CurrentUser, db=Depends(get_db)) -> dict:
    # COUNT WHERE user_id == current_user.id AND is_read == False AND deleted_at IS NULL
    ...

@router.patch("/notifications/{notification_id}/read", response_model=dict)
async def mark_notification_read(notification_id: str, current_user: CurrentUser, db=Depends(get_db)) -> dict:
    # Set is_read = True, read_at = now() WHERE id AND user_id match
    ...

@router.patch("/notifications/read-all", response_model=dict)
async def mark_all_read(current_user: CurrentUser, db=Depends(get_db)) -> dict:
    # UPDATE all unread WHERE user_id match AND deleted_at IS NULL
    ...

@router.delete("/notifications/{notification_id}", response_model=dict)
async def delete_notification(notification_id: str, current_user: CurrentUser, db=Depends(get_db)) -> dict:
    # Soft delete: SET deleted_at = now()
    ...
```

**CRITICAL endpoint ordering:** `GET /notifications/unread-count` and `PATCH /notifications/read-all` MUST be registered BEFORE `GET /notifications/{notification_id}` and `PATCH /notifications/{notification_id}/read` to avoid FastAPI treating "unread-count" / "read-all" as a notification_id parameter.

**Notification Creator Service** (`backend/src/services/notification_creator.py`):
```python
async def create_notification(
    db: AsyncSession,
    user_id: UUID,
    tenant_id: UUID,
    type: str,
    title: str,
    message: str,
    data: dict = {}
) -> NotificationDB:
    notification = NotificationDB(
        user_id=user_id, tenant_id=tenant_id,
        type=type, title=title, message=message, data=data
    )
    db.add(notification)
    await db.flush()
    await db.commit()
    return notification
```

### Notification Event Hooks

**Order status change** — In the order update endpoint/service, after status update:
```python
# Map order status to Vietnamese notification
NOTIFICATION_MESSAGES = {
    "confirmed": ("Đơn hàng đã xác nhận", "Đơn hàng #{order_code} đã được xác nhận thành công."),
    "in_production": ("Đơn hàng đang sản xuất", "Đơn hàng #{order_code} đang được may."),
    "shipped": ("Đơn hàng đã gửi đi", "Đơn hàng #{order_code} đã được gửi đi. Vui lòng kiểm tra email."),
    "delivered": ("Đơn hàng hoàn thành", "Đơn hàng #{order_code} đã giao thành công."),
    "cancelled": ("Đơn hàng đã hủy", "Đơn hàng #{order_code} đã bị hủy."),
}
```

**Appointment events:**
```python
APPOINTMENT_MESSAGES = {
    "confirmed": ("Lịch hẹn đã xác nhận", "Lịch hẹn ngày {date} ({slot}) đã được xác nhận."),
    "cancelled": ("Lịch hẹn đã hủy", "Lịch hẹn ngày {date} đã được hủy."),
    "reminder": ("Nhắc nhở lịch hẹn", "Bạn có lịch hẹn vào ngày mai {date} ({slot})."),
}
```

**Return reminder** — In existing `notification_service.py`, after sending email also create in-app notification.

### Frontend Implementation Pattern

**TypeScript Types** (add to `frontend/src/types/notification.ts`):
```typescript
export type NotificationType = 'order_status' | 'appointment' | 'return_reminder' | 'payment' | 'system';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface NotificationsData {
  notifications: NotificationItem[];
  notification_count: number;
}

export interface UnreadCountData {
  unread_count: number;
}
```

**Server Actions** — add to `profile-actions.ts`, follow exact pattern of `getMyAppointments()`:
```typescript
export async function getMyNotifications(): Promise<{ success: boolean; data?: NotificationsData; error?: string }> {
  // Same pattern: getAuthToken() → fetch with Bearer → AbortController 10s timeout
}

export async function getUnreadNotificationCount(): Promise<{ success: boolean; data?: UnreadCountData; error?: string }> { ... }

export async function markNotificationRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  // PATCH request
}

export async function markAllNotificationsRead(): Promise<{ success: boolean; error?: string }> {
  // PATCH request
}

export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  // DELETE request
}
```

**NotificationList Component Pattern:**
- Receives `initialNotifications: NotificationItem[]` and `initialUnreadCount: number` as props from Server Component
- Local state: `notifications`, `unreadCount` managed via useState
- Optimistic mark-read: update local state immediately, then call Server Action
- Inline confirm for delete (same pattern as AppointmentList cancel confirm)
- Relative time display: use helper function (e.g., "5 phút trước", "2 giờ trước", "Hôm qua", "3 ngày trước")

**Notification Type Icons & Colors:**
```typescript
const NOTIFICATION_CONFIG: Record<NotificationType, { icon: JSX.Element; bgColor: string; iconColor: string }> = {
  order_status: { icon: <PackageIcon />, bgColor: 'bg-indigo-50', iconColor: 'text-indigo-600' },
  appointment: { icon: <CalendarIcon />, bgColor: 'bg-green-50', iconColor: 'text-green-600' },
  return_reminder: { icon: <ClockIcon />, bgColor: 'bg-amber-50', iconColor: 'text-amber-600' },
  payment: { icon: <CreditCardIcon />, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-600' },
  system: { icon: <InfoIcon />, bgColor: 'bg-slate-50', iconColor: 'text-slate-600' },
};
```

**Relative Time Helper** (add to `frontend/src/utils/` or inline):
```typescript
function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Vừa xong';
  if (diffMin < 60) return `${diffMin} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}
```

**ProfileSidebar Badge Update:**
- `profile/layout.tsx` (Server Component) fetches unread count and passes to ProfileSidebar
- ProfileSidebar renders red badge circle next to bell icon when count > 0
- Badge: `bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center`

### Vietnamese UI Labels

| Key | Vietnamese |
|-----|-----------|
| Page title | Thông báo |
| Mark all read | Đánh dấu tất cả đã đọc |
| Delete | Xóa |
| Delete confirm | Xóa thông báo này? |
| Delete confirm yes | Xóa |
| Delete confirm no | Hủy |
| Empty title | Chưa có thông báo nào |
| Empty subtitle | Thông báo về đơn hàng, lịch hẹn và ưu đãi sẽ hiển thị tại đây |
| Loading error | Không thể tải thông báo |
| Retry | Thử lại |
| Just now | Vừa xong |
| X min ago | X phút trước |
| X hours ago | X giờ trước |
| Yesterday | Hôm qua |
| X days ago | X ngày trước |
| order_status label | Đơn hàng |
| appointment label | Lịch hẹn |
| return_reminder label | Nhắc trả đồ |
| payment label | Thanh toán |
| system label | Hệ thống |

### Anti-Pattern Prevention

- **DO NOT** install new npm packages — no sonner, no react-toastify, no external notification libraries
- **DO NOT** use `useSession()` from next-auth/react — pass session data via Server Component props
- **DO NOT** implement WebSocket/SSE real-time push — out of scope for this story; polling or page refresh is sufficient for MVP
- **DO NOT** create notification preferences/settings — out of scope (future story)
- **DO NOT** add pagination — notification counts per customer are typically manageable (<100); load all at once
- **DO NOT** create a separate notification router file — add endpoints to existing `customer_profile.py` router (same as 4.4b/4.4d/4.4e)
- **DO NOT** use `window.confirm()` — use inline confirm dialog with useState (Heritage Palette styled, same as AppointmentList)
- **DO NOT** add Framer Motion animation — keep it simple and consistent with other profile sub-stories
- **DO NOT** duplicate toast patterns — use inline useState toast pattern established in previous stories
- **DO NOT** hard-delete notifications — always soft delete with `deleted_at` timestamp
- **DO NOT** query notifications by email — unlike appointments, notifications link directly to `user_id` (authenticated user)
- **DO NOT** forget `await db.commit()` after `db.flush()` — data will rollback without commit (project-context rule)

### Project Structure Notes

- All profile endpoints live in `customer_profile.py` router with prefix `/api/v1/customers/me` — consistent with stories 4.4b, 4.4d, 4.4e
- All profile client components live in `frontend/src/components/client/profile/` — consistent pattern
- All Server Actions for profile live in `frontend/src/app/actions/profile-actions.ts`
- Frontend types in `frontend/src/types/notification.ts` (new file)
- Tests: backend in `backend/tests/`, frontend in `frontend/src/__tests__/`

### Previous Story Intelligence (4.4d, 4.4e)

**Patterns to follow exactly:**
1. **Server Action pattern:** `getAuthToken()` → Bearer JWT → fetch with AbortController 10s timeout → return `{ success, data?, error? }`
2. **Server Component page pattern:** `auth()` check → call Server Action → pass data as props to Client Component
3. **Client Component pattern:** Receive initial data as props → local useState → optimistic updates → error/loading/empty states
4. **Inline toast pattern:** useState + useRef timer + 3000ms auto-dismiss (if needed for feedback after mark-read or delete)
5. **Route conflict prevention:** Static paths (`/unread-count`, `/read-all`) MUST be registered before parameterized paths (`/{notification_id}`)
6. **Backend commit:** Always `await db.commit()` after `await db.flush()`
7. **Test Vietnamese text:** Assert exact Vietnamese strings in both backend and frontend tests
8. **ProfileSidebar active state:** Already handled by `usePathname()` — `/profile/notifications` will auto-highlight

**Lessons from 4.4d:**
- Route ordering in FastAPI matters — static paths before parameterized paths
- Decimal serialization: backend may return Decimal as string — handle in frontend
- `customer_profile_router` is already registered before `customers_router` in `main.py` (fixed in 4.4d)

**Lessons from 4.4e:**
- Appointments link by `customer_email`, but notifications link by `user_id` — different join strategy
- Cancel pattern (inline confirm dialog with useState) should be reused for delete confirm
- Memory leak prevention: cleanup timers in useEffect return

### Git Intelligence

Recent commits show active work on stories 4.4b-4.4e with consistent patterns:
- Commit message format: `feat(story-4.4X): description` for implementation, `fix(story-4.4X): description` for reviews
- Code review process generates fix commits addressing H/M/L severity items
- Backend tests in `backend/tests/test_*.py`, frontend tests in `frontend/src/__tests__/*.test.tsx` and `*.test.ts`

### Architecture Compliance

- **Authoritative Server Pattern:** Backend is SSOT — frontend displays what backend returns, never creates notifications client-side
- **RBAC:** All endpoints use `CurrentUser` dependency — only authenticated customers can access their own notifications
- **Tenant isolation:** All queries filter by `tenant_id` (from `current_user.tenant_id`, fallback to default tenant for MVP)
- **API response format:** `{ "data": { ... }, "meta": {} }` — consistent with all other endpoints
- **Error response format:** `{ "error": { "code": "ERR_CODE", "message": "Vietnamese message" } }`
- **Database naming:** `snake_case` for table and columns (notifications, user_id, is_read, created_at)
- **Pydantic models:** `PascalCase` class names (NotificationDB, NotificationResponse)
- **Component separation:** Server Components in `app/`, Client Components in `components/client/`
- **JWT Cookie auth:** proxy.ts handles cookie forwarding — Server Actions use `getAuthToken()` helper

### References

- [Source: _bmad-output/planning-artifacts/architecture.md — Webhook & Background Task pattern, API response format]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Notification UI patterns, Heritage Palette 2.0, Dual-Mode]
- [Source: _bmad-output/planning-artifacts/epics.md — Epic 4 Story 4.4 requirements, FR45-FR54]
- [Source: _bmad-output/project-context.md — Critical Implementation Rules, validation strategy, naming conventions]
- [Source: _bmad-output/implementation-artifacts/4-4e-lich-hen-sap-toi.md — Previous story patterns and learnings]
- [Source: _bmad-output/implementation-artifacts/4-4d-so-do-co-the.md — Route conflict resolution, decimal handling]
- [Source: backend/src/services/notification_service.py — Existing return reminder notification pattern]
- [Source: backend/src/services/email_service.py — Existing email infrastructure]
- [Source: frontend/src/components/client/profile/ProfileSidebar.tsx — Bell icon and navigation structure]
- [Source: frontend/src/app/(customer)/profile/notifications/page.tsx — Current placeholder to replace]

### Files to CREATE

| File | Purpose |
|------|---------|
| `backend/migrations/0XX_create_notifications_table.sql` | DB migration |
| `backend/src/models/notification.py` | Pydantic schemas |
| `backend/src/services/notification_creator.py` | Notification creation service |
| `backend/tests/test_customer_notifications_api.py` | Backend endpoint tests |
| `frontend/src/types/notification.ts` | TypeScript types |
| `frontend/src/components/client/profile/NotificationList.tsx` | Main client component |
| `frontend/src/__tests__/NotificationList.test.tsx` | Component tests |
| `frontend/src/__tests__/notificationActions.test.ts` | Server Action tests |

### Files to MODIFY

| File | Change |
|------|--------|
| `backend/src/models/db_models.py` | Add `NotificationDB` ORM model |
| `backend/src/api/v1/customer_profile.py` | Add 5 notification endpoints |
| `frontend/src/app/actions/profile-actions.ts` | Add 5 notification Server Actions |
| `frontend/src/app/(customer)/profile/notifications/page.tsx` | Replace placeholder with Server Component |
| `frontend/src/app/(customer)/profile/layout.tsx` | Pass unread count to ProfileSidebar |
| `frontend/src/components/client/profile/ProfileSidebar.tsx` | Add unread badge to bell icon |

### Files to REUSE (DO NOT MODIFY unless adding notification hooks)

| File | Reason |
|------|--------|
| `backend/src/services/notification_service.py` | Add `create_notification()` call after sending return reminder email |
| `backend/src/core/config.py` | DB config, SMTP config already configured |
| `backend/src/core/auth.py` | `CurrentUser` dependency already defined |
| `frontend/src/components/client/profile/AppointmentList.tsx` | Reference for inline confirm dialog pattern |

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
