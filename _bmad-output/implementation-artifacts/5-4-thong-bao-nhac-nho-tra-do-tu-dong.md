# Story 5.4: Thong bao nhac nho tra do tu dong (Automatic Return Reminders)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Chu tiem** (Owner),
I want **he thong tu dong gui thong bao nhac khach tra do truoc 1 ngay**,
So that **quy trinh thu hoi do dien ra dung han ma khong can ton cong lien lac thu cong**.

## Acceptance Criteria

1. **Given** Mot don thue do dang o trang thai `Rented` voi `expected_return_date` da duoc thiet lap
   **When** Den thoi diem 24 gio truoc han tra do (tuc la ngay hien tai = `expected_return_date - 1 ngay`)
   **Then** He thong tu dong gui Email nhac nho cho khach hang duoc lien ket voi don thue
   **And** Thong bao bao gom: ten bo do, thoi han tra do, va dia chi tra do cua tiem

2. **Given** He thong can xac dinh khach hang nhan thong bao
   **When** He thong quet cac garment co trang thai `rented` va `expected_return_date = ngay mai`
   **Then** He thong tra cuu thong tin khach hang (ten, email) thong qua truong `renter_id` moi tren bang `garments`
   **And** Chi gui thong bao cho cac khach hang co email hop le (khong null, khong rong)

3. **Given** He thong da gui thong bao nhac nho cho mot don thue
   **When** He thong chay lai quy trinh quet (lan chay ke tiep)
   **Then** He thong KHONG gui thong bao trung lap cho cung mot don thue (idempotent)
   **And** Su dung truong `reminder_sent_at` (timestamp) tren bang `garments` de danh dau da gui

4. **Given** Chu tiem muon kiem tra trang thai thong bao
   **When** Chu tiem xem danh sach quan ly kho (Inventory Management)
   **Then** Moi garment dang thue hien thi them icon/badge "Da nhac nho" neu `reminder_sent_at` khac null
   **And** Hien thi ngay gui nhac nho ben canh icon

5. **Given** He thong can co co che chay tu dong
   **When** Server backend khoi dong hoac theo lich (scheduled)
   **Then** He thong co endpoint `POST /api/v1/notifications/send-return-reminders` de trigger thu cong (Owner only)
   **And** He thong co background task su dung `asyncio` scheduler chay moi ngay luc 8:00 AM (configurable)

6. **Given** He thong gap loi khi gui email cho mot khach hang
   **When** Email gui that bai (SMTP error, invalid email)
   **Then** He thong ghi log chi tiet loi va khong danh dau `reminder_sent_at` cho garment do
   **And** He thong tiep tuc gui thong bao cho cac don thue con lai (khong dung toan bo quy trinh)

7. **Given** Trang thai garment thay doi sau khi da gui thong bao
   **When** Garment chuyen tu `rented` sang `available` hoac `maintenance` (da tra do truoc han)
   **Then** Truong `reminder_sent_at` tu dong bi xoa (reset ve null) cung voi `expected_return_date`
   **And** Dam bao khong gui thong bao cho garment da tra do

## Tasks / Subtasks

- [x] **Task 1: Database Migration - Add rental tracking fields** (AC: #2, #3, #7)
  - [x] 1.1 Create migration `009_add_rental_tracking_to_garments.sql`:
    - Add `renter_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL` (nullable)
    - Add `reminder_sent_at TIMESTAMPTZ` (nullable) - tracks when reminder was sent
    - Add `renter_name VARCHAR(255)` (nullable) - cached renter name for quick display
    - Add `renter_email VARCHAR(255)` (nullable) - cached renter email for notification
    - Add index on `(status, expected_return_date)` for efficient reminder queries
  - [x] 1.2 Update `GarmentDB` in `backend/src/models/db_models.py`:
    - Add `renter_id: Mapped[uuid.UUID | None]` with ForeignKey to `customer_profiles.id`
    - Add `reminder_sent_at: Mapped[datetime | None]`
    - Add `renter_name: Mapped[str | None]` (String 255)
    - Add `renter_email: Mapped[str | None]` (String 255)
  - [x] 1.3 Update `GarmentResponse` in `backend/src/models/garment.py`:
    - Add `renter_id: uuid.UUID | None`
    - Add `reminder_sent_at: datetime | None`
    - Add `renter_name: str | None`
    - Add `renter_email: str | None`
    - Add `@computed_field reminder_sent: bool` (True if `reminder_sent_at` is not None)
  - [x] 1.4 Update `GarmentStatusUpdate` model validator in `backend/src/models/garment.py`:
    - Add `renter_id: uuid.UUID | None = None`, `renter_name: str | None = None`, `renter_email: str | None = None`
    - When `status == "rented"`: require `renter_name` and `renter_email` (or `renter_id` to look up)
    - When `status != "rented"`: auto-clear `renter_id`, `renter_name`, `renter_email`, `reminder_sent_at`

- [x] **Task 2: Backend - Notification Service** (AC: #1, #2, #3, #6)
  - [x] 2.1 Create `backend/src/services/notification_service.py`:
    - `async def find_garments_due_tomorrow(db, tenant_id) -> list[GarmentDB]`: query `status="rented"` AND `expected_return_date = date.today() + 1 day` AND `reminder_sent_at IS NULL`
    - `async def send_return_reminder(db, garment: GarmentDB) -> bool`: compose and send email, mark `reminder_sent_at` on success
    - `async def process_return_reminders(db, tenant_id) -> dict`: orchestrate finding and sending, return summary `{"sent": N, "failed": N, "skipped": N}`
  - [x] 2.2 Create email template function `create_return_reminder_email_html(renter_name, garment_name, return_date, shop_address)` in `email_service.py`:
    - Heritage branding (reuse existing email template pattern from `create_otp_email_html`)
    - Include: garment name, return date formatted in Vietnamese locale, shop address
    - Plain text fallback + HTML version
  - [x] 2.3 Add `send_return_reminder_email(email, renter_name, garment_name, return_date, shop_address) -> bool` in `email_service.py`:
    - Reuse existing SMTP sending pattern from `send_otp_email`
    - Use `aiosmtplib.send()` with same SMTP config from `settings`

- [x] **Task 3: Backend - Notification API Endpoint** (AC: #5)
  - [x] 3.1 Create `backend/src/api/v1/notifications.py`:
    - `POST /api/v1/notifications/send-return-reminders` - Owner only (`OwnerOnly` dependency)
    - Returns `{"data": {"sent": N, "failed": N, "skipped": N}, "meta": {}}`
    - Uses standard API response wrapper format
  - [x] 3.2 Register `notifications_router` in `backend/src/main.py`

- [x] **Task 4: Backend - Background Scheduler** (AC: #5)
  - [x] 4.1 Create `backend/src/services/scheduler_service.py`:
    - Use `asyncio` + `datetime` to schedule daily task (NOT Celery - keep it simple for MVP single-instance)
    - `REMINDER_HOUR: int` configurable via `settings` (default 8 = 8:00 AM)
    - `async def start_reminder_scheduler()`: background task that runs `process_return_reminders` daily
    - Handle graceful shutdown
  - [x] 4.2 Add `REMINDER_HOUR: int = int(os.getenv("REMINDER_HOUR", "8"))` and `SHOP_ADDRESS: str = os.getenv("SHOP_ADDRESS", "")` to `backend/src/core/config.py`
  - [x] 4.3 Integrate scheduler into FastAPI lifespan in `backend/src/main.py`:
    - Start scheduler on app startup
    - Cancel scheduler task on app shutdown

- [x] **Task 5: Backend - Update Status Update Flow** (AC: #7)
  - [x] 5.1 Update `update_garment_status()` in `garment_service.py`:
    - When status changes FROM `rented` to any other status: auto-clear `renter_id`, `renter_name`, `renter_email`, `reminder_sent_at`
    - When status changes TO `rented`: require and set `renter_name`, `renter_email` (and optionally `renter_id`)
  - [x] 5.2 Update `GarmentStatusUpdate` Pydantic model to include renter fields
  - [x] 5.3 Update PATCH endpoint to pass new fields through

- [x] **Task 6: Backend Tests** (AC: #1, #2, #3, #5, #6, #7)
  - [x] 6.1 Test `find_garments_due_tomorrow()`: returns only rented garments due tomorrow with `reminder_sent_at IS NULL`
  - [x] 6.2 Test `find_garments_due_tomorrow()`: excludes garments already reminded (`reminder_sent_at` not null)
  - [x] 6.3 Test `find_garments_due_tomorrow()`: excludes garments due today or in 2+ days
  - [x] 6.4 Test `process_return_reminders()`: sends emails and marks `reminder_sent_at`
  - [x] 6.5 Test `process_return_reminders()`: handles email failure gracefully (continues with others)
  - [x] 6.6 Test `process_return_reminders()`: skips garments without valid renter email
  - [x] 6.7 Test POST `/api/v1/notifications/send-return-reminders`: Owner gets 200 with summary
  - [x] 6.8 Test POST `/api/v1/notifications/send-return-reminders`: Customer/Tailor gets 403
  - [x] 6.9 Test PATCH status update: rented->available clears `renter_*` and `reminder_sent_at`
  - [x] 6.10 Test PATCH status update: rented->maintenance clears `renter_*` and `reminder_sent_at`
  - [x] 6.11 Test PATCH status update to `rented` requires `renter_name` and `renter_email`
  - [x] 6.12 Test PATCH status update to `rented` without renter info -> 422
  - [x] 6.13 Test tenant isolation for notification endpoint
  - [x] 6.14 All existing garment tests still pass (zero regressions from Stories 5.1, 5.2, 5.3)

- [x] **Task 7: Frontend - Update StatusUpdatePanel for Renter Info** (AC: #2, #4)
  - [x] 7.1 Update `frontend/src/components/client/inventory/StatusUpdatePanel.tsx`:
    - When "Dang thue" is selected: show additional fields for `renter_name` (text input) and `renter_email` (email input) alongside existing date picker
    - Both fields required before confirming status change to "rented"
    - Validate email format on client side (Zod)
  - [x] 7.2 Update `frontend/src/app/actions/garment-actions.ts`:
    - Extend `updateGarmentStatus()` to accept `renterName?: string` and `renterEmail?: string`
    - Pass `renter_name` and `renter_email` in PATCH request body
  - [x] 7.3 Update `frontend/src/types/garment.ts`:
    - Add `renter_id`, `renter_name`, `renter_email`, `reminder_sent_at`, `reminder_sent` fields to `Garment` interface

- [x] **Task 8: Frontend - Reminder Status Badge** (AC: #4)
  - [x] 8.1 Update `frontend/src/components/client/inventory/InventoryCard.tsx`:
    - Show "Da nhac nho" badge (Heritage Gold accent) when `reminder_sent === true`
    - Display `reminder_sent_at` formatted date next to badge
    - Show renter name on rented garments for quick reference

- [x] **Task 9: Frontend - Manual Trigger Button** (AC: #5)
  - [x] 9.1 Update `frontend/src/app/(workplace)/owner/inventory/page.tsx`:
    - Add "Gui nhac nho tra do" button at top of inventory page (Heritage Gold, Owner only)
    - On click: call server action that triggers `POST /api/v1/notifications/send-return-reminders`
    - Show result summary toast: "Da gui N thong bao, N that bai"
  - [x] 9.2 Add `sendReturnReminders()` server action in `garment-actions.ts`:
    - `POST /api/v1/notifications/send-return-reminders` with auth token forwarding

- [x] **Task 10: Frontend Tests** (AC: #2, #4, #5)
  - [x] 10.1 Update `statusUpdatePanel.test.tsx`: test renter name/email fields appear for "rented" status, required validation
  - [x] 10.2 Update `inventoryCard.test.tsx`: test "Da nhac nho" badge display, renter name display
  - [x] 10.3 Create `frontend/src/__tests__/sendReminders.test.tsx`: test manual trigger button, loading state, result toast
  - [x] 10.4 All existing frontend tests must still pass (303+ baseline from Story 5.3)
  - [x] 10.5 All existing backend tests must still pass (30+ baseline from Story 5.3)

## Dev Notes

### Architecture Compliance

- **Route Group:** Notification endpoint at `POST /api/v1/notifications/send-return-reminders` (RESTful pattern per architecture.md)
- **Server vs Client:** Manual trigger button is part of existing Server Component page. StatusUpdatePanel updates are Client Component changes
- **Authoritative Server:** Backend determines which garments need reminders, sends emails, and tracks `reminder_sent_at`. Frontend NEVER decides when to send notifications
- **proxy.ts:** DO NOT create `middleware.ts`. Auth routing handled by `proxy.ts` (Next.js 16 pattern per architecture.md line 103, project-context.md line 78)
- **API Response Wrapper:** All responses use format: `{"data": {...}, "meta": {...}, "error": {...}}` (architecture.md line 161-167)
- **RBAC:** POST notification endpoint requires `OwnerOnly` dependency. Frontend server action must forward auth token
- **Async Pattern:** All I/O operations use `async def` (project-context.md line 88)

### Existing Code to Reuse (DO NOT REINVENT)

- **Email service (CRITICAL):** `backend/src/services/email_service.py` - reuse SMTP sending pattern from `send_otp_email()` and `send_account_invitation_email()`. Same `aiosmtplib.send()` with `settings.SMTP_HOST/PORT/USER/PASSWORD`. Reuse HTML template structure with Heritage branding
- **SMTP config:** `backend/src/core/config.py` - `settings.SMTP_HOST`, `settings.SMTP_PORT`, `settings.SMTP_USER`, `settings.SMTP_PASSWORD`, `settings.FROM_EMAIL` already configured
- **Garment DB model:** `GarmentDB` in `backend/src/models/db_models.py:257-286` - has `status`, `expected_return_date` fields. Add new fields here
- **Garment Pydantic models:** `backend/src/models/garment.py` - `GarmentStatus` enum, `GarmentStatusUpdate`, `GarmentResponse` with computed fields. Extend these
- **Garment service:** `backend/src/services/garment_service.py` - `update_garment_status()` handles status transitions with auto-clear logic. Update to handle new fields
- **Server actions:** `frontend/src/app/actions/garment-actions.ts` - `updateGarmentStatus()` with auth token forwarding pattern via `Bearer ${session?.accessToken}`
- **Auth dependencies:** `OwnerOnly`, `TenantId` from `backend/src/api/dependencies.py`
- **DB session:** `Depends(get_db)` from `backend/src/core/database.py`
- **StatusBadge component:** `frontend/src/components/client/showroom/StatusBadge.tsx` - reference for badge styling
- **InventoryCard component:** `frontend/src/components/client/inventory/InventoryCard.tsx` - extend with reminder badge
- **StatusUpdatePanel component:** `frontend/src/components/client/inventory/StatusUpdatePanel.tsx` - extend with renter info fields
- **GarmentStatus enum (frontend):** `frontend/src/types/garment.ts` - import from here, do NOT redefine
- **Heritage Palette colors:** Indigo `#1A2B4C`, Silk Ivory `#F9F7F2`, Heritage Gold `#D4AF37`
- **Owner page auth pattern:** `frontend/src/app/(workplace)/owner/inventory/page.tsx` - follow same `session.user?.role` check
- **Micro-toast pattern:** Used in InventoryList.tsx from Story 5.3 - reuse for reminder result feedback

### CRITICAL Design Decisions

**1. Renter Tracking - Denormalized on Garments Table:**
- There is NO separate `rentals` or `rental_orders` table. Rental state is tracked directly on `garments` via `status` + `expected_return_date`
- Adding `renter_id`, `renter_name`, `renter_email` directly to `garments` table as denormalized cache fields
- When status changes FROM `rented`, ALL renter fields are auto-cleared (same pattern as `expected_return_date` auto-clear in Story 5.3)
- `renter_name` and `renter_email` are cached strings (NOT solely FK lookup) because: a) quick display without JOINs, b) customer might not have a system account

**2. Scheduler - Simple asyncio (NOT Celery):**
- MVP single-instance deployment. No need for distributed task queue
- Use `asyncio.create_task()` with a sleep loop in FastAPI lifespan
- Daily at configurable hour (default 8 AM, Vietnam timezone UTC+7)
- Graceful shutdown: cancel task on app shutdown via lifespan context manager

**3. Idempotency via `reminder_sent_at`:**
- Each garment tracks when its reminder was last sent
- Query filter: `reminder_sent_at IS NULL` ensures no duplicate sends
- Reset when garment returns to non-rented status

**4. No WebSocket/Push - Email Only (MVP):**
- Per architecture.md: "Khong su dung WebSockets" for real-time interaction
- Email notification is sufficient for MVP (one-heritage-shop context)
- Future enhancement: add in-app notifications if needed

### Previous Story Intelligence (Story 5.3)

**From Story 5.3 implementation:**
- All 10 tasks completed, backend tests 30 total, frontend tests 303 total
- `GarmentStatusUpdate` model with `@model_validator(mode='after')` for cross-field validation
- Auto-clear pattern: when `status != "rented"`, auto-set `expected_return_date = None` - EXTEND this to also clear `renter_*` and `reminder_sent_at`
- PATCH endpoint at `/api/v1/garments/{garment_id}/status` uses `OwnerOnly` dependency
- `update_garment_status()` in service does `await db.flush()`, `await db.commit()`, `await db.refresh(garment)` (no `db.add()` needed for updates - SQLAlchemy auto-tracks dirty objects)
- StatusUpdatePanel shows date picker for "rented" status - EXTEND to also show renter name/email inputs
- InventoryCard displays status badge and expected return date - EXTEND to show reminder badge
- Micro-toast confirmation pattern established in InventoryList.tsx

**Code Review Issues from Story 5.3 (do NOT repeat):**
- H1: Missing micro-toast (was added as fix) - already in codebase
- M2: fetchInventoryList must forward auth token for multi-tenant correctness
- M3: Use `next: { revalidate: 60 }` instead of `cache: "no-store"` for GET requests

**Code Review Lessons (accumulated, MUST follow):**
1. Never call server actions with empty/placeholder data - pass actual data
2. Import existing types from `@/types/` - never inline duplicate types
3. Use exact key matching (not `includes()`) for lookups
4. Log auth failures, don't silently return success
5. After `db.flush()` MUST call `await db.commit()` to persist data
6. Forward auth token in ALL authenticated server actions: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }`
7. DRY - import from canonical sources (`core/`, `utils/`, `services/`), never recreate
8. Spinner should only show on the tapped button, not all buttons
9. Error messages must include "Vui long thu lai" per UX convention

### Technical Implementation Details

**Migration SQL:**
```sql
-- 009_add_rental_tracking_to_garments.sql
-- Story 5.4: Add renter tracking and reminder fields for automatic return reminders

ALTER TABLE garments ADD COLUMN renter_id UUID REFERENCES customer_profiles(id) ON DELETE SET NULL;
ALTER TABLE garments ADD COLUMN renter_name VARCHAR(255);
ALTER TABLE garments ADD COLUMN renter_email VARCHAR(255);
ALTER TABLE garments ADD COLUMN reminder_sent_at TIMESTAMPTZ;

-- Composite index for efficient reminder queries
CREATE INDEX idx_garments_rental_reminder ON garments (status, expected_return_date) WHERE status = 'rented';

COMMENT ON COLUMN garments.renter_id IS 'Story 5.4: FK to customer who rented this garment';
COMMENT ON COLUMN garments.renter_name IS 'Story 5.4: Cached renter name for display';
COMMENT ON COLUMN garments.renter_email IS 'Story 5.4: Cached renter email for notifications';
COMMENT ON COLUMN garments.reminder_sent_at IS 'Story 5.4: When return reminder was sent (null = not sent)';
```

**Notification Service Core Logic:**
```python
# backend/src/services/notification_service.py
from datetime import date, timedelta, datetime, timezone
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from src.models.db_models import GarmentDB
from src.services.email_service import send_return_reminder_email
from src.core.config import settings
import logging

logger = logging.getLogger(__name__)

async def find_garments_due_tomorrow(
    db: AsyncSession, tenant_id: uuid.UUID
) -> list[GarmentDB]:
    tomorrow = date.today() + timedelta(days=1)
    query = select(GarmentDB).where(
        and_(
            GarmentDB.tenant_id == tenant_id,
            GarmentDB.status == "rented",
            GarmentDB.expected_return_date == tomorrow,
            GarmentDB.reminder_sent_at.is_(None),
            GarmentDB.renter_email.isnot(None),
        )
    )
    result = await db.execute(query)
    return list(result.scalars().all())

async def process_return_reminders(
    db: AsyncSession, tenant_id: uuid.UUID
) -> dict[str, int]:
    garments = await find_garments_due_tomorrow(db, tenant_id)
    sent, failed, skipped = 0, 0, 0

    for garment in garments:
        if not garment.renter_email or not garment.renter_name:
            skipped += 1
            continue
        success = await send_return_reminder_email(
            email=garment.renter_email,
            renter_name=garment.renter_name,
            garment_name=garment.name,
            return_date=garment.expected_return_date,
            shop_address=settings.SHOP_ADDRESS,
        )
        if success:
            garment.reminder_sent_at = datetime.now(timezone.utc)
            await db.flush()
            await db.commit()
            await db.refresh(garment)
            sent += 1
        else:
            failed += 1
            logger.error(f"Failed to send reminder for garment {garment.id}")

    return {"sent": sent, "failed": failed, "skipped": skipped}
```

**Scheduler Service:**
```python
# backend/src/services/scheduler_service.py
import asyncio
import logging
from datetime import datetime, time, timedelta, timezone

from src.core.config import settings
from src.core.database import async_session_factory

logger = logging.getLogger(__name__)
VIETNAM_TZ_OFFSET = timezone(timedelta(hours=7))

async def _run_daily_reminders() -> None:
    """Run reminder process for all tenants."""
    from src.services.notification_service import process_return_reminders
    async with async_session_factory() as db:
        # Query all active tenants and process each
        from src.models.db_models import TenantDB
        from sqlalchemy import select
        result = await db.execute(select(TenantDB))
        tenants = result.scalars().all()
        for tenant in tenants:
            try:
                summary = await process_return_reminders(db, tenant.id)
                logger.info(f"Tenant {tenant.id}: Reminders sent={summary['sent']}, failed={summary['failed']}")
            except Exception as e:
                logger.error(f"Reminder error for tenant {tenant.id}: {e}")

async def start_reminder_scheduler() -> asyncio.Task:
    """Start background scheduler for daily return reminders."""
    async def scheduler_loop():
        while True:
            now = datetime.now(VIETNAM_TZ_OFFSET)
            target = now.replace(hour=settings.REMINDER_HOUR, minute=0, second=0, microsecond=0)
            if now >= target:
                target += timedelta(days=1)
            sleep_seconds = (target - now).total_seconds()
            logger.info(f"Next reminder run at {target}, sleeping {sleep_seconds:.0f}s")
            await asyncio.sleep(sleep_seconds)
            await _run_daily_reminders()

    return asyncio.create_task(scheduler_loop())
```

**Frontend Renter Input Pattern:**
```typescript
// StatusUpdatePanel.tsx - Add renter info fields for "rented" status
// Touch 2 flow when "Dang thue" is selected:
// 1. Show date picker (existing)
// 2. Show renter name input (new)
// 3. Show renter email input (new)
// 4. All three required before confirming

const [renterName, setRenterName] = useState("");
const [renterEmail, setRenterEmail] = useState("");

// Validation before submit:
if (selectedStatus === "rented") {
  if (!expectedReturnDate || !renterName.trim() || !renterEmail.trim()) {
    return; // Disable submit button
  }
  // Basic email validation (Zod or regex)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(renterEmail)) {
    return; // Show inline error
  }
}
```

### Field Name / Key Mapping

| DB Field (English) | API Request Key | UI Label (Vietnamese) |
|---|---|---|
| renter_id | renter_id | Ma khach thue |
| renter_name | renter_name | Ten khach thue |
| renter_email | renter_email | Email khach thue |
| reminder_sent_at | reminder_sent_at | Ngay gui nhac nho |
| reminder_sent | reminder_sent | Da nhac nho |

### Project Structure Notes

- **New files to create (Story 5.4):**
  ```
  backend/
    migrations/009_add_rental_tracking_to_garments.sql  -- DB migration for renter fields
    src/services/notification_service.py                -- Core reminder logic
    src/services/scheduler_service.py                   -- Daily background scheduler
    src/api/v1/notifications.py                         -- Manual trigger endpoint
  frontend/
    src/__tests__/sendReminders.test.tsx                 -- Manual trigger tests
  ```

- **Existing files to modify:**
  ```
  backend/
    src/models/db_models.py                             -- Add renter_* and reminder_sent_at to GarmentDB
    src/models/garment.py                               -- Extend GarmentStatusUpdate, GarmentResponse
    src/services/garment_service.py                     -- Update status transition auto-clear logic
    src/services/email_service.py                       -- Add return reminder email template + sender
    src/api/v1/garments.py                              -- Update PATCH to handle renter fields
    src/core/config.py                                  -- Add REMINDER_HOUR, SHOP_ADDRESS settings
    src/main.py                                         -- Register notifications router + scheduler
    tests/test_garments_api.py                          -- Extend with notification + renter tests
  frontend/
    src/types/garment.ts                                -- Add renter_*, reminder_* fields to Garment interface
    src/app/actions/garment-actions.ts                   -- Extend updateGarmentStatus, add sendReturnReminders
    src/components/client/inventory/StatusUpdatePanel.tsx -- Add renter name/email inputs
    src/components/client/inventory/InventoryCard.tsx    -- Add reminder badge + renter name
    src/app/(workplace)/owner/inventory/page.tsx         -- Add manual trigger button
    src/__tests__/statusUpdatePanel.test.tsx             -- Extend with renter field tests
    src/__tests__/inventoryCard.test.tsx                 -- Extend with reminder badge tests
  ```

- **Alignment:** All paths follow the unified project structure from architecture.md and project-context.md
- **Detected conflicts:** None. New `notifications.py` router follows existing pattern. Scheduler integrates into FastAPI lifespan. All modifications extend existing files from Story 5.3

### Testing Standards

- **Backend:** pytest + AsyncClient. Test notification service functions, API endpoint RBAC, status update extensions, email failure handling
- **Frontend:** Jest + React Testing Library. Test renter input fields, reminder badge, manual trigger button
- **Regression:** Run full test suite after implementation. Do NOT break existing tests (backend 30+, frontend 303+)
- **RBAC:** POST notifications by Customer -> 403, POST by Tailor -> 403, POST by Owner -> 200
- **Email mocking:** Mock `aiosmtplib.send()` in tests. Do NOT send real emails during tests
- **Idempotency:** Test that running reminders twice does NOT send duplicate emails
- **Edge cases:** garment with no renter email (skip), email failure (log + continue), garment returned before reminder (no send)

### Visual Design Reference

- **Heritage Palette:**
  - Primary: Indigo Depth `#1A2B4C`
  - Secondary: Silk Ivory `#F9F7F2`
  - Accent: Heritage Gold `#D4AF37`
  - Reminder badge: Heritage Gold bg `#FEF3C7` / text `#92400E` with bell icon
- **Typography:**
  - Page title & garment names: Cormorant Garamond (Serif)
  - Status labels & data: Inter (Sans-serif)
  - Renter info inputs: Inter (Sans-serif)
- **Layout:** Mobile-first, single column, 8px grid system
- **Touch targets:** Minimum 48x48px for buttons
- **Feedback:** Micro-toasts for reminder send results (not modals)
- **Accessibility:** WCAG 2.1 AA, contrast ratio 4.5:1, `aria-label` on trigger button

### FR Coverage

- **FR25 (Inventory Admin):** This story extends FR25 with automated rental tracking and notifications
- **Dependency on Story 5.1:** Garment data model, base CRUD API
- **Dependency on Story 5.2:** Return timeline display, computed fields (`days_until_available`, `is_overdue`)
- **Dependency on Story 5.3:** 2-Touch status update, PATCH endpoint, StatusUpdatePanel, InventoryCard
- **Completes Epic 5:** This is the final story in Epic 5 (Rental & Inventory Management)

### Cross-Story Context (Epic 5)

- Story 5.1 (DONE): Garment data model, CRUD API, showroom catalog
- Story 5.2 (DONE): Return timeline display, garment detail page, computed fields
- Story 5.3 (DONE): 2-Touch status update for Owner, inventory management page
- **Story 5.4 (THIS)**: Automatic return reminders - renter tracking, email notifications, background scheduler
- After this story, Epic 5 is complete. Run retrospective next

### Git Intelligence

**Recent commit patterns (from Epic 5):**
- Commit messages use `feat(epic-5):` prefix
- Each story implementation is a single commit with detailed description
- Tests are included in the same commit as implementation
- Pattern: `feat(epic-5): implement Story 5.4 - Automatic Return Reminders`

**Recent file patterns:**
- Backend models in `backend/src/models/garment.py` and `backend/src/models/db_models.py`
- Backend services in `backend/src/services/garment_service.py`
- Backend API in `backend/src/api/v1/garments.py`
- Frontend components in `frontend/src/components/client/inventory/`
- Frontend tests in `frontend/src/__tests__/`
- Migrations in `backend/migrations/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.4] - Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#API-Communication] - REST API, no WebSockets, response wrapper format
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture] - PostgreSQL 17, Pydantic v2 validation
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security] - RBAC, OwnerOnly pattern
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Heritage-Palette] - Visual design system, Heritage branding
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Heritage-Admin-Flow] - Co Lan's admin workflow
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Consultative-Alerts] - Micro-toasts, non-modal feedback
- [Source: _bmad-output/project-context.md] - Naming conventions, framework rules, auth rules, DRY principles
- [Source: backend/src/services/email_service.py] - Existing email infrastructure with aiosmtplib and Heritage templates
- [Source: backend/src/core/config.py] - SMTP configuration settings
- [Source: backend/src/models/garment.py] - GarmentStatusUpdate model validator pattern
- [Source: backend/src/services/garment_service.py] - Status transition auto-clear pattern
- [Source: _bmad-output/implementation-artifacts/5-3-cap-nhat-trang-thai-kho-2-cham.md] - Previous story intelligence, code patterns, file structure

## Dev Agent Record

### Agent Model Used

claude-opus-4.6 (via OpenCode)

### Debug Log References

### Completion Notes List

- Task 1 completed: Migration, DB model, Pydantic models all updated. Existing garment tests updated to include renter_name/renter_email for rented status. 34/34 garment tests passing.
- Task 2 completed: Created notification_service.py with find_garments_due_tomorrow, send_return_reminder, process_return_reminders. Added Heritage-branded return reminder email template and sender to email_service.py.
- Task 3 completed: Created notifications.py router with POST /api/v1/notifications/send-return-reminders (Owner only). Registered in main.py.
- Task 4 completed: Created scheduler_service.py with asyncio-based daily scheduler. Added REMINDER_HOUR and SHOP_ADDRESS to config.py. Integrated into FastAPI lifespan with graceful shutdown.
- Task 5 completed: Updated garment_service.py update_garment_status to pass through renter fields and auto-clear reminder_sent_at when status != rented.
- Task 6 completed: Added 14 new backend tests (6.1-6.14). All 48/48 backend tests pass.
- Task 7 completed: Updated garment.ts with 5 new fields (renter_id, renter_name, renter_email, reminder_sent_at, reminder_sent). Extended updateGarmentStatus() to accept renterName/renterEmail. Updated StatusUpdatePanel with renter name/email inputs + email validation when "Dang thue" selected.
- Task 8 completed: Updated InventoryCard with renter name display ("Khach: ..."), "Da nhac nho" badge with Heritage Gold styling and bell icon, reminder_sent_at date display.
- Task 9 completed: Created SendRemindersButton client component with Heritage Gold styling, loading state, micro-toast results. Added sendReturnReminders() server action. Integrated button into owner inventory page.
- Task 10 completed: Updated statusUpdatePanel.test.tsx (added 4 new tests for renter fields), inventoryCard.test.tsx (added 3 new tests for badge/renter), created sendReminders.test.tsx (5 tests). All 314 frontend tests pass (303 baseline + 11 new). All 48 backend tests pass.

### File List

- `backend/migrations/009_add_rental_tracking_to_garments.sql` (CREATED) - Migration adding renter_id, renter_name, renter_email, reminder_sent_at columns + partial index
- `backend/src/models/db_models.py` (MODIFIED) - Added 4 new columns to GarmentDB: renter_id (FK), renter_name, renter_email, reminder_sent_at
- `backend/src/models/garment.py` (MODIFIED) - Extended GarmentResponse with renter fields + reminder_sent computed field; Extended GarmentStatusUpdate with renter validation
- `backend/tests/test_garments_api.py` (MODIFIED) - Updated rented seed data and PATCH tests to include renter_name/renter_email; Added 14 new Story 5.4 tests (48 total)
- `backend/src/services/notification_service.py` (CREATED) - Core reminder logic: find due garments, send reminders, process orchestration
- `backend/src/services/email_service.py` (MODIFIED) - Added return reminder email template (Heritage branding) and sender function
- `backend/src/api/v1/notifications.py` (CREATED) - POST /api/v1/notifications/send-return-reminders endpoint (Owner only)
- `backend/src/services/scheduler_service.py` (CREATED) - asyncio daily scheduler for automatic reminders
- `backend/src/core/config.py` (MODIFIED) - Added REMINDER_HOUR and SHOP_ADDRESS settings
- `backend/src/main.py` (MODIFIED) - Registered notifications router, integrated scheduler into lifespan
- `backend/src/services/garment_service.py` (MODIFIED) - Updated update_garment_status to handle renter fields and auto-clear reminder_sent_at
- `frontend/src/types/garment.ts` (MODIFIED) - Added renter_id, renter_name, renter_email, reminder_sent_at, reminder_sent to Garment interface
- `frontend/src/app/actions/garment-actions.ts` (MODIFIED) - Extended updateGarmentStatus with renterName/renterEmail params; Added sendReturnReminders() server action
- `frontend/src/components/client/inventory/StatusUpdatePanel.tsx` (MODIFIED) - Added renter name/email inputs with validation when "Dang thue" selected
- `frontend/src/components/client/inventory/InventoryCard.tsx` (MODIFIED) - Added renter name display, "Da nhac nho" badge with Heritage Gold styling
- `frontend/src/components/client/inventory/SendRemindersButton.tsx` (CREATED) - Manual trigger button with Heritage Gold styling, loading state, micro-toast
- `frontend/src/components/client/inventory/index.ts` (MODIFIED) - Exported SendRemindersButton
- `frontend/src/app/(workplace)/owner/inventory/page.tsx` (MODIFIED) - Added SendRemindersButton to inventory page header
- `frontend/src/__tests__/statusUpdatePanel.test.tsx` (MODIFIED) - Added 4 new tests for renter field display, validation, submission
- `frontend/src/__tests__/inventoryCard.test.tsx` (MODIFIED) - Added 3 new tests for renter name display, reminder badge
- `frontend/src/__tests__/sendReminders.test.tsx` (CREATED) - 5 tests for manual trigger button, success/error toasts

### Change Log

- Task 1: Added rental tracking fields (renter_id, renter_name, renter_email, reminder_sent_at) to DB migration, GarmentDB model, GarmentResponse, and GarmentStatusUpdate with validation. Updated existing tests for compatibility.
- Tasks 2-5: Created notification service, email template, API endpoint, background scheduler, updated garment status flow. All 34 existing garment tests still passing.
- Task 6: Added 14 new backend tests covering notification service, API endpoint RBAC, status update extensions, tenant isolation. All 48/48 backend tests pass.
- Task 7: Extended Garment TS interface with 5 new fields. Extended updateGarmentStatus() server action with renterName/renterEmail params. Updated StatusUpdatePanel with renter name/email inputs + client-side email regex validation.
- Task 8: Updated InventoryCard with renter name display and "Da nhac nho" Heritage Gold badge with bell icon and formatted reminder date.
- Task 9: Created SendRemindersButton client component. Added sendReturnReminders() server action. Integrated button into owner inventory page with Heritage Gold styling.
- Task 10: Updated statusUpdatePanel.test.tsx (+4 tests), inventoryCard.test.tsx (+3 tests), created sendReminders.test.tsx (5 tests). Final: 314/314 frontend tests pass, 48/48 backend tests pass. Zero regressions.
