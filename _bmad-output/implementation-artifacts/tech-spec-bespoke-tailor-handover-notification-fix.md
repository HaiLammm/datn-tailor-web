---
title: 'Bespoke Tailor Handover Workflow & Customer Notification Fix'
slug: 'bespoke-tailor-handover-notification-fix'
created: '2026-05-20'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['FastAPI 0.115+', 'SQLAlchemy 2.x async', 'Next.js 15 App Router', 'TypeScript', 'PostgreSQL', 'Pydantic v2', 'TanStack Query']
files_to_modify:
  - 'backend/src/models/db_models.py (TailorTaskDB: add failure_reason, failure_category)'
  - 'backend/src/models/tailor_task.py (add cancellation_requested status, failure schemas)'
  - 'backend/src/services/tailor_task_service.py (update_task_status: cancellation_requested flow)'
  - 'backend/src/api/v1/tailor_tasks.py (new endpoint: request-cancellation)'
  - 'backend/src/services/order_service.py (_all_tailor_tasks_completed filter fix, cancel with reason)'
  - 'backend/src/models/order.py (OrderStatusUpdate: add cancellation_reason)'
  - 'backend/src/services/notification_creator.py (new templates: cancellation request, tailor decision)'
  - 'backend/src/services/tailor_task_service.py (create_task: fix one-task-per-order to exclude cancelled)'
  - 'backend/src/services/customer_service.py (create_customer_profile_from_user helper)'
  - 'backend/migrations/032_add_tailor_cancellation_fields.sql'
  - 'backend/migrations/033_add_order_cancellation_reason.sql'
  - 'frontend/src/components/client/orders/OrderTable.tsx (badge + label changes)'
  - 'frontend/src/components/client/orders/OrderDetailDrawer.tsx (inline cancel approval UI)'
  - 'frontend/src/components/client/orders/OrderStatusBadge.tsx (new badge variants)'
  - 'frontend/src/types/order.ts (cancellation_reason field)'
  - 'frontend/src/types/tailor-task.ts (cancellation_requested status, failure fields)'
  - 'frontend/src/app/(customer)/profile/orders/OrderDetailModal.tsx (show tailor name, cancel reason)'
code_patterns:
  - 'Forward-only transition matrix in _VALID_TRANSITIONS dict'
  - 'Server actions pattern: getAuthToken() → fetch with Bearer → { success, data?, error? }'
  - 'TanStack Query with queryKey for cache invalidation'
  - 'Optimistic UI updates in notification components'
  - 'Multi-tenant isolation: all queries filtered by tenant_id'
  - 'Best-effort notifications: create after commit, log warning on failure'
test_patterns:
  - 'Backend: pytest with async fixtures, httpx AsyncClient'
  - 'Frontend: Jest + React Testing Library (existing tests in __tests__/)'
---

# Tech-Spec: Bespoke Tailor Handover Workflow & Customer Notification Fix

**Created:** 2026-05-20

## Overview

### Problem Statement

The bespoke order workflow is missing a clear tailor handover step. The current "Tiếp" (Next) button is confusing for non-technical shop owners. When a tailor completes or fails a task, there is no visible badge showing the result. Order cancellations do not store reasons, and tailor-initiated cancellations bypass owner approval. Additionally, customers who sign in via Google OAuth are not registered as CustomerProfiles, potentially causing them to be invisible in the owner's customer management and affecting notification delivery.

### Solution

1. **Bespoke workflow clarification**: After owner approves order, owner navigates to `/owner/production` → clicks "Giao việc mới" → selects tailor → status becomes "Đang may" with badge `|Đang may|Huỷ|Tên thợ may`. Owner can only proceed to next status AFTER tailor completes handover or cancels.
2. Replace "Tiếp" button label with "Bàn giao cho thợ" (assign work to tailor) — this navigates owner to production page to create tailor task
3. Add tailor task result badges: `|Đang may|Huỷ|Tên thợ may` during production; `"<tailor name> đã hoàn thành <garment name>"` or `"<tailor name> đã huỷ <garment name>"` after completion/cancellation
4. Add `cancellation_reason` field to orders; require reason on all cancellations; tailor cancellation requires owner approval
5. Auto-create CustomerProfile when customer places first order (using order's tenant_id for correct tenant linkage)
6. Tailor UI: Add "Hoàn thành" / "Báo lỗi" buttons on TailorTask for tailor to report completion or request cancellation with structured reason (dropdown category in Vietnamese + free text)
7. Owner approval UI: Inline action in OrderDetailDrawer (not modal-on-modal) for owner to review tailor's cancellation request — approve (cancel order), reject, or reassign to another tailor from tenant's tailor list
8. Customer visibility: Show tailor name in customer's order detail; show cancellation reason when order is cancelled
9. Notification for tailor: Notify tailor when owner approves/rejects cancellation request or reassigns task
10. Notification for customer: Send "Đơn hàng đang được xem xét" when tailor requests cancellation

### Scope

**In Scope:**
- Backend: Add `cancellation_reason` column to orders table
- Backend: Add `failure_reason` column and `cancellation_requested` status to TailorTask
- Backend: Update cancel flow — tailor requests cancellation (with structured reason: dropdown category + free text), owner approves/rejects/reassigns
- Backend: Reassign flow — owner can assign a different tailor instead of cancelling; old TailorTask → status `cancelled`, new TailorTask created for new tailor
- Backend: Notification for tailor when owner decides on cancellation request (approved/rejected/reassigned)
- Backend: Notification for customer "Đơn hàng đang được xem xét" when tailor requests cancellation
- Backend: Auto-create CustomerProfile at first order placement (NOT at OAuth login — tenant_id unavailable at login)
- Backend: Handle deposit refund tracking when bespoke order is cancelled (50% cọc)
- Frontend owner: Replace "Tiếp" with "Bàn giao cho thợ" — navigates to `/owner/production` to assign tailor
- Frontend owner: Show tailor task badges: `|Đang may|Huỷ|Tên thợ|` during production; result badge after completion/cancel
- Frontend owner: Require cancellation reason input on cancel action
- Frontend owner: Inline approval UI in OrderDetailDrawer for tailor cancellation requests (approve/reject/reassign — no modal-on-modal)
- Frontend tailor: "Hoàn thành" / "Báo lỗi" buttons on TailorTask (mobile responsive)
- Frontend customer: Display cancellation reason when order is cancelled
- Frontend customer: Show assigned tailor name in order detail
- Verify and fix notification delivery for Google OAuth customers

**Out of Scope:**
- Changing the preparing step flow for bespoke orders (not needed — bespoke uses appointment scheduling)
- Push notifications / SMS (in-app only)
- Changes to buy/rent order workflows
- Photo upload on tailor task completion (keep simple for mobile)
- Reassign history UI (data preserved in DB but no dedicated view yet)

## Context for Development

### Codebase Patterns

- Orders follow a forward-only transition matrix in `_VALID_TRANSITIONS` dict (`order_service.py:493-510`)
- Status changes go through `update_order_status()` which enforces guards and creates best-effort notifications
- Notifications link to `users.id` (NOT `customer_profiles.id`) — `NotificationDB.user_id` → `UserDB.id`
- `OrderDB.customer_id` also FK → `users.id` — so notification works IF user exists, regardless of CustomerProfile
- TailorTask status flow: `assigned` → `in_progress` → `completed` (+ `cancelled`). Production steps: `pending` → `cutting` → `sewing` → `finishing` → `quality_check` → `done`
- `create_task()` in `tailor_task_service.py:369` enforces one-task-per-order rule and auto-transitions order `confirmed` → `in_progress`
- Frontend uses server actions pattern: `getAuthToken()` → `fetch` with Bearer JWT → `{ success, data?, error? }`
- TanStack Query for data fetching with 60s stale/refetch on production board
- "Tiếp" button only appears when `status === "preparing"` (OrderTable.tsx:277) — NOT for `in_progress` bespoke orders

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `backend/src/services/order_service.py` | Transition matrix, approve_order, update_order_status | 493-510 (transitions), 681-927 (update), 1012-1161 (approve) |
| `backend/src/services/tailor_task_service.py` | TailorTask CRUD, status updates, income | 199-246 (status update), 369-486 (create_task) |
| `backend/src/services/notification_creator.py` | Notification templates and creation | 32-126 (templates), 130-166 (create_notification) |
| `backend/src/models/db_models.py` | TailorTaskDB (512-569), OrderDB (269-337), CustomerProfileDB (122-156), NotificationDB (610-637) | FK: OrderDB.customer_id → users.id |
| `backend/src/models/tailor_task.py` | Pydantic schemas: StatusUpdateRequest, TaskCreateRequest, etc. | 64-72 (status update), 93-111 (task create) |
| `backend/src/models/order.py` | OrderStatus enum, OrderStatusUpdate schema | 23-42 (enum) |
| `backend/src/api/v1/tailor_tasks.py` | 10 API endpoints: OwnerOnly + OwnerOrTailor auth | 105-135 (status PATCH), 227-279 (create POST) |
| `backend/src/api/v1/orders.py` | Owner order API routes | 90-107 (create), status update endpoint |
| `backend/src/api/v1/auth.py` | Google OAuth social_login — creates UserDB only | 140-175 (gap: no CustomerProfile) |
| `backend/src/services/customer_service.py` | create_customer_profile requires tenant_id + explicit data | 18-86 |
| `backend/src/api/v1/customer_profile.py` | Notification read endpoints for customer | 496-663 |
| `backend/migrations/014_create_tailor_tasks.sql` | TailorTask table schema | |
| `frontend/src/components/client/orders/OrderTable.tsx` | "Tiếp" button (preparing only), next_valid_status | 277-290 ("Tiếp"), 9-16 (NEXT_STATUS_LABELS) |
| `frontend/src/components/client/orders/OrderDetailDrawer.tsx` | Order pipeline + tailor info section | 122-180 (pipeline), 182-283 (tailor) |
| `frontend/src/components/client/orders/StatusBadge.tsx` | Status/payment/service badges in Vietnamese | 9-27, 76-80 |
| `frontend/src/components/client/production/TaskCreateDialog.tsx` | "Giao việc mới" dialog with tailor select | 97 (title), 106-141 (fields) |
| `frontend/src/components/client/production/ProductionBoardClient.tsx` | Main production board | 22-33 (queries) |
| `frontend/src/types/order.ts` | OrderListItem with next_valid_status | 117-137 |
| `frontend/src/types/tailor-task.ts` | TailorTask interface, TaskStatus union | 8-27 |
| `frontend/src/app/(customer)/profile/orders/OrderDetailModal.tsx` | Customer order detail | |
| `frontend/src/components/client/profile/NotificationBell.tsx` | Notification dropdown + unread badge | 157-189 (fetch) |

### Technical Decisions

- Cancellation reason stored as `TEXT` column on orders table (nullable — only set on cancel)
- Tailor cancellation uses a two-step flow: tailor sets TailorTask status to `cancellation_requested` with `failure_reason` → owner sees reason and decides to cancel order, reject request, or reassign to another tailor
- TailorTask gets new status `cancellation_requested` and new fields: `failure_reason` (TEXT, nullable), `failure_category` (VARCHAR, nullable — enum: `fabric_defect`, `measurement_error`, `customer_changed_mind`, `overloaded`, `other`)
- Reassign creates a NEW TailorTask for the new tailor; old task status → `cancelled` with failure_reason preserved (audit trail)
- CustomerProfile auto-creation happens at first order placement (NOT at OAuth login) — uses order's tenant_id for correct multi-tenant linkage
- Tailor notifications: owner decision on cancellation request triggers notification to tailor (approved/rejected/reassigned)
- Customer notification: "Đơn hàng đang được xem xét" sent when tailor requests cancellation — keeps customer informed without alarming them
- "Hoàn thành" button on tailor UI is simple tap — no photo upload required (keep it simple for mobile)
- "Bàn giao cho thợ" button = owner navigates to /owner/production to assign tailor via "Giao việc mới". This is ASSIGNING work, not receiving finished garment.
- Deposit refund on bespoke cancellation: system records refund_needed status; actual refund processing is manual (owner handles offline) but tracked in order payments
- Notification delivery is best-effort: if notification creation fails after order status commit, the status change is NOT rolled back (logged as warning)
- `_all_tailor_tasks_completed()` must filter out cancelled tasks (`WHERE status != 'cancelled'`) to correctly handle reassign scenarios
- Failure categories displayed in Vietnamese on frontend: Vải bị lỗi, Số đo sai, Khách đổi ý, Quá tải, Khác
- Owner can only advance bespoke order past `in_progress` when tailor has completed handover (existing guard works correctly with cancelled-task filter fix)

### Phased Implementation (recommended by PM)

- **Phase 1 (Critical):** Fix notification (CustomerProfile auto-create at order), add `cancellation_reason`, rename "Tiếp" → "Bàn giao cho thợ"
- **Phase 2 (Core flow):** Tailor cancellation request + owner approval/reject/reassign, tailor task badges, tailor "Hoàn thành"/"Báo lỗi" UI
- **Phase 3 (Polish):** Structured failure categories, customer "đang xem xét" notification, customer sees tailor name

## Implementation Plan

### Phase 1: Critical Fixes (Foundation)

- [ ] **Task 1: DB Migration — Add cancellation fields to tailor_tasks**
  - File: `backend/migrations/032_add_tailor_cancellation_fields.sql`
  - Action: Add columns to `tailor_tasks` table:
    - `failure_reason TEXT` (nullable)
    - `failure_category VARCHAR(50)` (nullable) with `CHECK (failure_category IN ('fabric_defect', 'measurement_error', 'customer_changed_mind', 'overloaded', 'other') OR failure_category IS NULL)`
    - `cancellation_resolved_at TIMESTAMPTZ` (nullable) — marks when owner resolved a cancellation request (for audit trail)
  - Notes: CHECK constraint enforces valid categories at DB level, not just Pydantic.

- [ ] **Task 2: DB Migration — Add cancellation_reason to orders**
  - File: `backend/migrations/033_add_order_cancellation_reason.sql`
  - Action: Add `cancellation_reason TEXT` column to `orders` table (nullable)
  - Notes: Simple ALTER TABLE, no default needed — only set on cancel

- [ ] **Task 3: Backend — Update OrderDB model + OrderStatusUpdate schema**
  - File: `backend/src/models/db_models.py` (OrderDB class, ~line 269)
  - Action: Add `cancellation_reason: Mapped[str | None]` column
  - File: `backend/src/models/order.py` (OrderStatusUpdate schema)
  - Action: Add optional `cancellation_reason: str | None = None` field
  - File: `backend/src/models/order.py` (OrderResponse schema)
  - Action: Add `cancellation_reason: str | None = None` field to response

- [ ] **Task 4: Backend — Update cancel flow to require reason**
  - File: `backend/src/services/order_service.py` (update_order_status, ~line 845-848)
  - Action: When `new_status == "cancelled"`:
    1. Require `update.cancellation_reason` is not None/empty — raise 422 if missing
    2. Set `order.cancellation_reason = update.cancellation_reason` before commit
  - Notes: Applies to ALL cancellation sources (owner direct cancel, owner approving tailor cancel request)

- [ ] **Task 5: Backend — Fix `_all_tailor_tasks_completed()` filter**
  - File: `backend/src/services/order_service.py` (~line 513-522)
  - Action: Change query to exclude cancelled/cancellation_requested tasks:
    ```python
    func.count(TailorTaskDB.id).filter(
        TailorTaskDB.status.not_in(["cancelled", "cancellation_requested"])
    )
    ```
    Apply same filter to both total and completed counts
  - Notes: Critical for reassign to work — without this, cancelled tasks block the order

- [ ] **Task 6: Backend — Auto-create CustomerProfile on first order**
  - File: `backend/src/services/order_service.py` (create_order, ~line 178-310)
  - Action: After order creation, if `customer_id is not None`:
    1. Check if CustomerProfileDB exists with `user_id == customer_id` AND `tenant_id == tenant_id`
    2. If not, create one using `order.customer_name` (full_name), `order.customer_phone` (phone, NOT NULL on OrderDB), user's email
    3. Link via `user_id = customer_id`
  - File: `backend/src/services/customer_service.py`
  - Action: Add helper `async def ensure_customer_profile_for_user(db, user_id, tenant_id, name, phone, email)` that creates CustomerProfile if not exists
  - Notes: MUST use `order.customer_phone` (NOT NULL on OrderDB) — NOT `user.phone` which is nullable for OAuth users. Uses order's tenant_id for correct multi-tenant linkage. Idempotent — no-op if profile already exists.

- [ ] **Task 7: Frontend — Change button to "Bàn giao cho thợ" with navigation for bespoke orders**
  - File: `frontend/src/components/client/orders/OrderTable.tsx` (~line 292-301)
  - Action: In the next-status button render logic, when `order.service_type === "bespoke"` AND `order.next_valid_status === "checked"`:
    1. Change label from "Kiểm tra" to "Bàn giao cho thợ"
    2. **CRITICAL: Change onClick behavior** — instead of calling `handleNextStatus()` (which transitions to `checked`), navigate to `/owner/production` page using `router.push("/owner/production")`. The owner assigns tailor there via "Giao việc mới" dialog.
    3. Do NOT call status update API — the status transition happens automatically when tailor task is created via `create_task()` side-effect.
  - Notes: Only affects bespoke orders. Must change BOTH label AND behavior — label-only change would transition order to `checked` bypassing tailor assignment.

- [ ] **Task 8: Frontend — Add cancellation_reason to order types + display**
  - File: `frontend/src/types/order.ts` (OrderListItem, ~line 117)
  - Action: Add `cancellation_reason?: string | null` field
  - File: `frontend/src/components/client/orders/OrderDetailDrawer.tsx`
  - Action: When `order.status === "cancelled"` AND `order.cancellation_reason`, display reason in a red alert box below status pipeline
  - File: `frontend/src/app/(customer)/profile/orders/OrderDetailModal.tsx`
  - Action: Same — show cancellation reason to customer when order is cancelled

- [ ] **Task 9: Frontend — Require reason on cancel action**
  - File: `frontend/src/components/client/orders/OrderDetailDrawer.tsx` (or wherever cancel button triggers)
  - Action: When owner clicks cancel, show inline textarea requiring reason before confirming. Pass `cancellation_reason` in status update API call.
  - Notes: Textarea with placeholder "Nhập lý do huỷ đơn..." — minimum 10 characters

- [ ] **Task 9b: Frontend — Fix canCancel to exclude completed status (existing bug)**
  - File: `frontend/src/components/client/orders/OrderTable.tsx` (~line 198)
  - Action: Change `const canCancel = !["delivered", "cancelled"].includes(order.status)` to also exclude `"completed"`: `!["delivered", "cancelled", "completed"].includes(order.status)`
  - Notes: Existing bug — cancel button currently shows on completed orders. Low priority but trivial to fix alongside cancel flow changes.

### Phase 2: Tailor Cancellation Flow

- [ ] **Task 10: Backend — Fix create_task() one-task-per-order query**
  - File: `backend/src/services/tailor_task_service.py` (~line 399-406)
  - Action: Update the existing task count query to exclude cancelled/cancellation_requested tasks:
    ```python
    existing_task_result = await db.execute(
        select(func.count(TailorTaskDB.id)).where(
            TailorTaskDB.order_id == request.order_id,
            TailorTaskDB.tenant_id == tenant_id,
            TailorTaskDB.status.not_in(["cancelled", "cancellation_requested"]),
        )
    )
    ```
  - Notes: Without this fix, reassign is IMPOSSIBLE — cancelled tasks would still block new task creation. Also create `_create_task_no_commit(db, ...)` internal helper that flushes but does not commit, for use by `resolve_cancellation_request`.

- [ ] **Task 11: Backend — Update TailorTaskDB ORM model + Pydantic schemas**
  - File: `backend/src/models/db_models.py` (TailorTaskDB, ~line 512)
  - Action: Add columns: `failure_reason: Mapped[str | None]`, `failure_category: Mapped[str | None]`, `cancellation_resolved_at: Mapped[datetime | None]`
  - File: `backend/src/models/tailor_task.py`
  - Action:
    1. Do NOT add `cancellation_requested` to `StatusUpdateRequest` — tailor uses dedicated endpoint, not generic status update
    2. Create new schema `CancellationRequestInput(BaseModel)`: `failure_category: Literal["fabric_defect", "measurement_error", "customer_changed_mind", "overloaded", "other"]`, `failure_reason: str` (min 10 chars)
    3. Create new schema `ResolveCancellationInput(BaseModel)`: `decision: Literal["approve", "reject", "reassign"]`, `new_tailor_id: UUID | None = None`, `cancellation_reason: str | None = None` (owner override reason)
    4. Add `failure_reason`, `failure_category`, `cancellation_resolved_at` to TailorTaskResponse
  - File: `frontend/src/types/tailor-task.ts`
  - Action: Add `"cancellation_requested"` to TaskStatus union, add `failure_reason?`, `failure_category?`, `cancellation_resolved_at?` fields

- [ ] **Task 12: Backend — Tailor cancellation request endpoint**
  - File: `backend/src/api/v1/tailor_tasks.py`
  - Action: Add new endpoint `POST /{task_id}/request-cancellation` (OwnerOrTailor auth)
  - File: `backend/src/services/tailor_task_service.py`
  - Action: Add `async def request_task_cancellation(db, task_id, user_id, tenant_id, input: CancellationRequestInput)`:
    1. Validate task exists, belongs to tenant, assigned to user
    2. Validate status is `assigned` or `in_progress` (can't cancel completed task)
    3. Set `status = "cancellation_requested"`, `failure_reason = input.failure_reason`, `failure_category = input.failure_category`
    4. Send notification to owner: "Thợ may {name} yêu cầu huỷ công việc: {garment_name}"
    5. Send notification to customer (if order.customer_id): "Đơn hàng đang được xem xét"
  - Notes: Does NOT cancel the order — just flags the task for owner review

- [ ] **Task 13: Backend — Owner approve/reject/reassign cancellation**
  - File: `backend/src/api/v1/tailor_tasks.py`
  - Action: Add new endpoint `POST /{task_id}/resolve-cancellation` (OwnerOnly auth)
  - File: `backend/src/services/tailor_task_service.py`
  - Action: Add `async def resolve_cancellation_request(db, task_id, owner_id, tenant_id, decision, new_tailor_id=None, cancellation_reason=None)`:
    - **decision = "approve"**: Set task status → `cancelled`. Call `order_service.update_order_status()` to cancel order with `cancellation_reason` (from tailor's failure_reason or owner's override). Send notification to tailor "Yêu cầu huỷ đã được chấp nhận" + customer gets normal cancel notification.
    - **decision = "reject"**: Set task status back to previous (`in_progress` or `assigned`). **KEEP failure_reason/category** (do NOT clear — preserve audit trail of the attempt). Add `cancellation_resolved_at = now()` to mark the request as resolved. Send notification to tailor "Yêu cầu huỷ bị từ chối, vui lòng tiếp tục".
    - **decision = "reassign"**: Requires `new_tailor_id`. Set old task → `cancelled`. Create new TailorTask for new tailor. Send notification to old tailor "Công việc đã được giao cho thợ khác" + new tailor gets assignment notification.
  - Notes:
    - **One-task-per-order fix required**: `create_task()` at `tailor_task_service.py:399-406` checks `count(TailorTaskDB.id) > 0` including cancelled tasks. MUST update this query to filter: `WHERE status NOT IN ('cancelled', 'cancellation_requested')`. Without this fix, reassign is impossible.
    - **Transaction atomicity**: `create_task()` calls `db.commit()` internally. For reassign, create a new internal helper `_create_task_no_commit(db, ...)` that flushes but does NOT commit — let `resolve_cancellation_request` handle the single commit for both cancel + create.
    - `resolve_cancellation_request` must NOT use `update_task_status()` for status changes — that function enforces the transition dict at `tailor_task_service.py:37-40` which doesn't include `cancellation_requested`. Instead, directly set status on the ORM model since it's an owner-privileged operation bypassing the tailor transition flow.

- [ ] **Task 14: Backend — New notification templates**
  - File: `backend/src/services/notification_creator.py`
  - Action: Add templates:
    ```python
    TAILOR_CANCEL_REQUEST_TO_OWNER = ("Yêu cầu huỷ từ thợ may", "Thợ may {tailor_name} yêu cầu huỷ công việc '{garment_name}'. Lý do: {reason}")
    TAILOR_CANCEL_APPROVED = ("Yêu cầu huỷ đã chấp nhận", "Yêu cầu huỷ công việc '{garment_name}' đã được chủ tiệm chấp nhận.")
    TAILOR_CANCEL_REJECTED = ("Tiếp tục công việc", "Yêu cầu huỷ công việc '{garment_name}' bị từ chối. Vui lòng tiếp tục thực hiện.")
    TAILOR_REASSIGNED = ("Công việc đã chuyển", "Công việc '{garment_name}' đã được giao cho thợ may khác.")
    ORDER_UNDER_REVIEW = ("Đơn hàng đang được xem xét", "Đơn hàng {order_code} đang được xem xét. Chúng tôi sẽ thông báo kết quả sớm nhất.")
    ```

- [ ] **Task 15: Frontend — Tailor task badges on OrderTable**
  - File: `frontend/src/components/client/orders/OrderTable.tsx`
  - Action: For bespoke orders with `status === "in_progress"`:
    1. Fetch or use existing tailor task data (from order response — may need to extend OrderListItem with `tailor_task_summary` field)
    2. Show inline badges: `|Đang may|` (indigo) + `|Huỷ|` (red button) + `Tên thợ may` (text)
    3. When task completed: `|✓ Tên thợ đã hoàn thành Áo dài|` (green)
    4. When task cancellation_requested: `|⚠ Tên thợ yêu cầu huỷ Áo dài|` (amber)
  - File: `backend/src/services/order_service.py` (list_orders response)
  - Action: Extend order list response to include `tailor_info: { tailor_name, task_status, garment_name }` for bespoke orders with active tasks
  - Notes: Badge must be responsive — truncate garment name on mobile

- [ ] **Task 16: Frontend — Inline cancellation approval UI in OrderDetailDrawer**
  - File: `frontend/src/components/client/orders/OrderDetailDrawer.tsx`
  - Action: When order has a TailorTask with `status === "cancellation_requested"`:
    1. Show alert section: "⚠ Thợ may {name} yêu cầu huỷ" + failure_category (Vietnamese) + failure_reason text
    2. Three inline action buttons:
       - "Đồng ý huỷ" (red) → calls resolve-cancellation with decision=approve
       - "Từ chối" (gray) → calls resolve-cancellation with decision=reject
       - "Giao thợ khác" (blue) → expands tailor select dropdown → calls resolve-cancellation with decision=reassign + new_tailor_id
    3. Tailor select reuses staff list from existing production page query
  - Notes: Inline in drawer, NOT a separate modal. Collapse after action completes.

- [ ] **Task 17: Frontend — Tailor "Báo lỗi" UI**
  - File: `frontend/src/components/client/production/TaskDetailDrawer.tsx` (or new component)
  - Action: Add "Báo lỗi" button next to existing status update buttons for tailor:
    1. Expands inline form: dropdown for `failure_category` (Vietnamese labels: Vải bị lỗi, Số đo sai, Khách đổi ý, Quá tải, Khác) + textarea for `failure_reason`
    2. Submit calls `POST /tailor-tasks/{id}/request-cancellation`
    3. After submit, task status badge changes to "Chờ xác nhận huỷ" (amber)
  - Notes: Mobile responsive — dropdown + textarea stack vertically on small screens

### Phase 3: Polish

- [ ] **Task 18: Frontend — Customer order detail: tailor name + cancel reason**
  - File: `frontend/src/app/(customer)/profile/orders/OrderDetailModal.tsx`
  - Action:
    1. Show assigned tailor name when order is bespoke and has active task (already partially exists in drawer — replicate for customer modal)
    2. Show `cancellation_reason` in red alert when order is cancelled
  - File: Backend may need to include tailor name in customer order detail response (`order_customer_service.py`)

- [ ] **Task 19: Backend — Extend customer order response with tailor info**
  - File: `backend/src/services/order_customer_service.py`
  - Action: For bespoke orders, join TailorTask to get `assignee.full_name` and include in response as `tailor_name`
  - Notes: Only expose tailor name, not internal task details

### Acceptance Criteria

**Phase 1:**

- [ ] AC1: Given an owner cancelling any order, when they click cancel, then a textarea requiring reason (min 10 chars) is shown; the order is cancelled with `cancellation_reason` stored in DB; customer notification includes the reason.
- [ ] AC2: Given a bespoke order at `in_progress` status, when the owner views OrderTable, then the next-status button shows "Bàn giao cho thợ" (not "Kiểm tra").
- [ ] AC3: Given a Google OAuth customer placing their first order, when the order is created, then a CustomerProfile is auto-created with matching `tenant_id`, `user_id`, `full_name`, `email`, and `phone`; the customer appears in `/owner/customers` list.
- [ ] AC4: Given a Google OAuth customer with an existing order, when order status changes, then an in-app notification is created and visible in the customer's NotificationBell.
- [ ] AC5: Given a bespoke order with one cancelled TailorTask and one completed TailorTask (reassign scenario), when `_all_tailor_tasks_completed()` runs, then it returns `True` (ignoring cancelled task).
- [ ] AC6: Given a cancelled order, when customer views order detail, then `cancellation_reason` is displayed in a visible alert.

**Phase 2:**

- [ ] AC7: Given a tailor with an `in_progress` task, when they tap "Báo lỗi" and submit category + reason, then TailorTask status becomes `cancellation_requested`; owner receives notification; customer receives "đang được xem xét" notification.
- [ ] AC8: Given an owner viewing an order with `cancellation_requested` task, when they see the inline approval UI, then they can choose "Đồng ý huỷ" (cancels order with reason), "Từ chối" (resets task to in_progress), or "Giao thợ khác" (cancels old task + creates new task for selected tailor).
- [ ] AC9: Given an owner choosing "Giao thợ khác", when they select a new tailor and confirm, then old TailorTask → `cancelled` (failure_reason preserved), new TailorTask → `assigned` for new tailor, order remains `in_progress`, both tailors receive notifications.
- [ ] AC10: Given a tailor whose cancellation request was rejected, when they view their task, then the task status is back to `in_progress` and they receive a notification "Vui lòng tiếp tục".
- [ ] AC11: Given a bespoke order at `in_progress` with active TailorTask, when owner views OrderTable, then badges show `|Đang may|Huỷ|Tên thợ|`. When task is completed, badge shows `|✓ Tên thợ đã hoàn thành Áo dài|`.

**Phase 3:**

- [ ] AC12: Given a customer viewing their bespoke order detail, when the order has an assigned tailor, then the tailor's name is visible in the order detail.
- [ ] AC13: Given a customer whose bespoke order was cancelled, when they view order detail, then both the cancellation reason and tailor name are displayed.

## Additional Context

### Dependencies

- Existing TailorTask model (14 columns, 4 indexes) and 10 API endpoints
- Google OAuth `social_login` in auth.py:140 — creates UserDB with role=Customer, no password, is_active=True
- CustomerProfile service — requires explicit tenant_id + data; has `link_customer_to_user_by_email()` helper
- Production page already has "Giao việc mới" dialog (TaskCreateDialog.tsx) with tailor selector
- OrderDetailDrawer already renders tailor info section (lines 182-283) with production step progress

### Critical Investigation Findings

1. **"Tiếp" button is for `preparing` status ONLY** (OrderTable.tsx:277) — bespoke `in_progress` orders use `next_valid_status` generic button instead. The label for `in_progress` → `checked` is "Kiểm tra" (NEXT_STATUS_LABELS). Need to change this to "Bàn giao cho thợ" specifically for bespoke orders.
2. **OrderDB.customer_id → users.id** (NOT customer_profiles.id). Notifications work via user_id. The real gap is CustomerProfile missing → owner can't see customer in `/owner/customers`.
3. **One-task-per-order rule** in `create_task()` (tailor_task_service.py:369). Reassign must cancel old task BEFORE creating new one to avoid duplicate check failure.
4. **`_all_tailor_tasks_completed()`** (order_service.py:513-522) counts ALL tasks including cancelled. Filter fix needed: `WHERE status NOT IN ('cancelled', 'cancellation_requested')`.
5. **TailorTask currently lacks**: `failure_reason`, `failure_category`, `cancellation_requested` status. Need migration + model update.
6. **Notification for order status** only fires in `update_order_status()` (line 862). Other flows like `approve_order()` have their own notification calls (lines 1168-1202). New flows need explicit notification calls.

### Testing Strategy

- **Backend unit**: Test new TailorTask status transitions (cancellation_requested flow), test `_all_tailor_tasks_completed` with cancelled tasks, test cancel with reason
- **Backend integration**: Test full flow: approve → assign → tailor cancellation_requested → owner approve/reject/reassign
- **Frontend**: Test badge rendering for new states, test inline approval UI in drawer
- **E2E manual**: Google OAuth login → place order → verify CustomerProfile created → verify notification received

### Notes

- The owner is non-technical — all UI labels must be in clear Vietnamese
- Memory note: DB must track status transitions as business events, not just current state
- Notification is best-effort — failure does not rollback order status change
- TailorTask `production_step` auto-transitions status: past 'pending' → 'in_progress', 'done' → 'completed'
