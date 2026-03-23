# Unified Story 5.2: Bang Dieu Phoi Khoi San Xuat Gap Viec

Status: review

## Phase 1 — Requirements (Original)
> Khong co story Phase 1 tuong ung — story duoc tao moi trong Phase 2

## Phase 2 — Implementation
> Nguon: _bmad-output/implementation-artifacts/5-2-bang-dieu-phoi-khoi-san-xuat-gap-viec.md

# Story 5.2: Bang Dieu Phoi Khoi San Xuat Gap Viec

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Chu Co So Mua Ban (Owner),
I want giao Cac Don Hang Thanh Cong (`In Production`) Toi Tay Tho May Bang Phan Cong Giao Dich,
so that viec duoc chia ro Nguoi, Chong Thoi Gian Sap Het.

## Acceptance Criteria

1. **Given** Owner dang nhap thanh cong, **When** navigate toi `/owner/production`, **Then** hien thi Bang Dieu Phoi San Xuat (Production Board) voi danh sach tat ca tailor tasks trong tenant, layout Command Mode (dense 8-12px gaps), load < 2s.

2. **Given** Owner dang o Production Board, **When** page load hoan tat, **Then** hien thi Summary Cards o header: Tong tasks, Dang cho (Assigned), Dang lam (In Progress), Hoan thanh (Completed), Qua han (Overdue) — voi so dem tong hop tat ca tho may.

3. **Given** Owner dang o Production Board, **When** bam nut "Giao viec moi" (hoac icon + tren danh sach), **Then** mo form/dialog tao task voi: chon Don hang (dropdown orders `in_production`), chon Tho may (dropdown tu danh sach active staff role=Tailor), dat Deadline, nhap Ghi chu, nhap Tien cong (piece_rate).

4. **Given** Owner da dien form giao viec, **When** bam "Giao viec", **Then** DB luu record `tailor_tasks` moi (assignee_id, deadline, notes, piece_rate), AND tao in-app notification cho Tho may "Co Viec Moi Can Ao Dai", AND hien thi task moi trong danh sach ngay lap tuc (optimistic update).

5. **Given** Owner dang o Production Board, **When** danh sach tasks hien thi, **Then** moi task row hien thi: ten khach hang, ten san pham, ten tho may duoc giao, trang thai (StatusBadge), deadline, countdown con lai, tien cong. Co the sort theo deadline/status/tho may.

6. **Given** Owner dang o Production Board, **When** co task voi deadline da qua hoac < 2 ngay con lai, **Then** hien thi Warning Countdown Badge do pulse + text "Qua han X ngay" hoac "Con X ngay", row duoc highlight.

7. **Given** Owner dang o Production Board, **When** click vao mot task row, **Then** mo detail drawer/modal hien thi: thong tin don hang day du, thong tin tho may, notes, deadline, trang thai hien tai, va nut chinh sua (Edit deadline/notes/reassign).

8. **Given** Owner muon chinh sua task, **When** bam Edit trong detail view, **Then** co the cap nhat deadline, notes, piece_rate, hoac reassign sang tho may khac. Luu thanh cong -> cap nhat UI.

9. **Given** Owner dang o Production Board, **When** su dung bo loc, **Then** co the filter tasks theo: Tho may (dropdown), Trang thai (assigned/in_progress/completed/overdue), Khoang deadline (sap het han/qua han).

## Tasks / Subtasks

- [x] Task 1: Backend — Owner Task Management Endpoints (AC: #3, #4, #7, #8)
  - [x] 1.1: Add Pydantic models to `backend/src/models/tailor_task.py`: `TaskCreateRequest` (order_id, order_item_id?, assigned_to, deadline?, notes?, piece_rate?, garment_name?, customer_name?), `TaskUpdateRequest` (deadline?, notes?, piece_rate?, assigned_to?), `OwnerTaskListResponse` (tasks + summary + assignee names)
  - [x] 1.2: Add to `backend/src/services/tailor_task_service.py`: `create_task(db, request, owner_id, tenant_id)` — validate order exists and is `in_production`, validate assignee is Tailor in same tenant, create TailorTaskDB record, auto-populate garment_name/customer_name from order/order_items if not provided
  - [x] 1.3: Add to `backend/src/services/tailor_task_service.py`: `list_all_tasks(db, tenant_id, filters)` — list ALL tasks for tenant (not just one tailor), with optional filters: assigned_to, status, deadline_range. Include assignee name (JOIN users). Return summary counts across all tailors.
  - [x] 1.4: Add to `backend/src/services/tailor_task_service.py`: `update_task(db, task_id, request, owner_id, tenant_id)` — Owner can update deadline, notes, piece_rate, and reassign (change assigned_to). If reassigned, create notification for new assignee.
  - [x] 1.5: Add to `backend/src/services/tailor_task_service.py`: `delete_task(db, task_id, tenant_id)` — Only allow deletion of tasks in `assigned` status (not started yet).
  - [x] 1.6: Add endpoints to `backend/src/api/v1/tailor_tasks.py`:
    - `POST /api/v1/tailor-tasks` (OwnerOnly) — Create/assign task
    - `GET /api/v1/tailor-tasks` (OwnerOnly) — List all tasks with filters
    - `PATCH /api/v1/tailor-tasks/{task_id}` (OwnerOnly) — Update task
    - `DELETE /api/v1/tailor-tasks/{task_id}` (OwnerOnly) — Delete assigned task

- [x] Task 2: Backend — Notification on Task Assignment (AC: #4)
  - [x] 2.1: Add task assignment notification template to `backend/src/services/notification_creator.py`: `TASK_ASSIGNMENT_MESSAGE = ("Cong viec moi duoc giao", "Ban duoc giao cong viec moi: {garment_name} - Han chot: {deadline}.")`
  - [x] 2.2: In `create_task()`, after creating TailorTaskDB record, call `create_notification()` with type `"task_assigned"`, targeting the assigned tailor (user_id=assigned_to)

- [x] Task 3: Frontend — TypeScript Types & Server Actions (AC: all)
  - [x] 3.1: Add to `frontend/src/types/tailor-task.ts`: `TaskCreateRequest`, `TaskUpdateRequest`, `OwnerTaskListItem` (extends TailorTask with `assignee_name: string`), `OwnerTaskListResponse`
  - [x] 3.2: Create `frontend/src/app/actions/owner-task-actions.ts`: `fetchAllTasks(filters?)`, `createTask(request)`, `updateTask(taskId, request)`, `deleteTask(taskId)`, `fetchOrdersForAssignment()` (orders with status `in_production`)

- [x] Task 4: Frontend — Production Board Page & Components (AC: #1, #2, #5, #6, #9)
  - [x] 4.1: Create `frontend/src/app/(workplace)/owner/production/page.tsx` — Server component with OwnerOnly auth guard, renders ProductionBoardClient
  - [x] 4.2: Create `frontend/src/components/client/production/ProductionBoardClient.tsx` — Main client wrapper with TanStack Query (60s auto-refresh), holds filter state, renders summary + filters + task list
  - [x] 4.3: Create `frontend/src/components/client/production/ProductionSummaryCards.tsx` — 5 stat cards (Total, Assigned, In Progress, Completed, Overdue) for ALL tailors combined
  - [x] 4.4: Create `frontend/src/components/client/production/ProductionTaskTable.tsx` — Sortable table of all tasks with columns: Khach hang, San pham, Tho may, Trang thai, Han chot (countdown), Tien cong. Clickable rows open detail.
  - [x] 4.5: Create `frontend/src/components/client/production/ProductionFilters.tsx` — Filter bar: dropdown Tho may (from staff list), dropdown Trang thai, toggle Qua han/Sap het han
  - [x] 4.6: Create `frontend/src/components/client/production/DeadlineCountdown.tsx` — Reusable countdown display: green (>7 days), amber (2-7 days), red pulse (<2 days or overdue)

- [x] Task 5: Frontend — Task Create Dialog (AC: #3, #4)
  - [x] 5.1: Create `frontend/src/components/client/production/TaskCreateDialog.tsx` — Radix UI Dialog with form fields: Order selector (dropdown of in_production orders), Tailor selector (dropdown of active Tailor staff), Deadline (date picker), Notes (textarea), Piece rate (number input). Submit creates task via mutation.
  - [x] 5.2: Wire dialog to TanStack Query mutation with optimistic update + invalidation of task list and summary

- [x] Task 6: Frontend — Task Detail & Edit (AC: #7, #8)
  - [x] 6.1: Create `frontend/src/components/client/production/TaskDetailDrawer.tsx` — Right-side drawer (like OrderDetailDrawer pattern) showing: full task info, order details, assignee info, status timeline, deadline countdown, Edit/Delete buttons
  - [x] 6.2: Create `frontend/src/components/client/production/TaskEditDialog.tsx` — Radix UI Dialog for editing deadline, notes, piece_rate, reassign tailor. Uses mutation with optimistic update.

- [x] Task 7: Frontend — Add sidebar menu item & tests (AC: #1)
  - [x] 7.1: Add "San xuat" menu item to `WorkplaceSidebar.tsx` Owner section linking to `/owner/production` (with factory/wrench icon)
  - [x] 7.2: Write component tests for ProductionBoardClient rendering with mock data
  - [x] 7.3: Write backend unit tests for create_task, list_all_tasks, update_task, delete_task service functions

- [ ] Review Follow-ups (AI)
  - [ ] [AI-Review][High] Fix transaction split in `create_task`: remove `db.commit()` from service, commit in endpoint after notification — `tailor_task_service.py:363`, `tailor_tasks.py:128-136`
  - [ ] [AI-Review][High] Fix transaction split in `update_task`: same pattern, defer commit to endpoint — `tailor_task_service.py:504`, `tailor_tasks.py:207-215`
  - [ ] [AI-Review][High] Fix `update_task` return type: change annotation to `-> tuple[OwnerTaskItem, bool]` — `tailor_task_service.py:454`
  - [ ] [AI-Review][High] Fix `TaskUpdateRequest` null vs not-provided: use `model_fields_set` to distinguish explicitly-sent null from omitted fields — `tailor_task.py:104-113`, `tailor_task_service.py:492-499`
  - [ ] [AI-Review][High] Add optimistic update (`onMutate`) to `TaskCreateDialog` mutation per AC #4 — `TaskCreateDialog.tsx:41-50`
  - [ ] [AI-Review][Med] Validate `order_item_id` belongs to `order_id` in `create_task` — `tailor_task_service.py:310-319`
  - [ ] [AI-Review][Med] Fix `TaskEditDialog` deadline comparison: compare date portions only (first 10 chars) to avoid false dirty detection — `TaskEditDialog.tsx:64-68`
  - [ ] [AI-Review][Med] Fix `GET /{task_id}` detail: add Owner bypass so Owners can view any task in their tenant — `tailor_task_service.py:224-225`, `tailor_tasks.py:270`
  - [ ] [AI-Review][Med] Add URL search params sync for filter/sort state per Dev Notes pattern — `ProductionBoardClient.tsx:16-18`
  - [ ] [AI-Review][Med] Replace custom drawer div with Radix UI Dialog/Sheet for accessibility (focus trap, Escape dismiss) per Warning #16 — `TaskDetailDrawer.tsx:80-86`
  - [ ] [AI-Review][Med] Add "sap het han" filter option to ProductionFilters per AC #9 — `ProductionFilters.tsx`
  - [ ] [AI-Review][Med] Add optimistic update (`onMutate`) to edit and delete mutations — `TaskEditDialog.tsx:39-48`, `TaskDetailDrawer.tsx:58-64`
  - [ ] [AI-Review][Med] Add `parseFloat` NaN guard for pieceRate field — `TaskCreateDialog.tsx:81-83`
  - [ ] [AI-Review][Med] Validate `status_filter` against known set, return 400 for unknown — `tailor_task_service.py:399-406`
  - [ ] [AI-Review][Low] Make `overdue_only` and `status_filter="overdue"` mutually exclusive — `tailor_task_service.py:400-413`

## Senior Developer Review (AI)

- **Review Date:** 2026-03-19
- **Reviewer:** Claude Opus 4.6 (Code Review Workflow)
- **Review Outcome:** Changes Requested
- **Layers:** Blind Hunter + Edge Case Hunter + Acceptance Auditor (all completed)

### Action Items

- [ ] [High] Transaction split: `create_task` commits before notification — task persisted without notification on failure
- [ ] [High] Transaction split: `update_task` commits before notification — same issue on reassignment
- [ ] [High] `update_task` return type annotation wrong: declares `OwnerTaskItem`, returns `tuple[OwnerTaskItem, bool]`
- [ ] [High] `TaskUpdateRequest` cannot distinguish "set to null" from "not provided" — owner cannot clear deadline/notes/piece_rate
- [ ] [High] Missing optimistic update on task creation — AC #4 explicitly requires immediate UI display
- [ ] [Med] `order_item_id` not validated against `order_id` — can link wrong garment to task
- [ ] [Med] `TaskEditDialog` deadline comparison always detects change — time component zeroed out on every edit
- [ ] [Med] `GET /{task_id}` detail endpoint blocks Owner access — `assigned_to` check fails for Owner role
- [ ] [Med] No URL state sync for filters — violates Dev Notes pattern requirement
- [ ] [Med] `TaskDetailDrawer` uses custom div instead of Radix UI — no focus trap, no Escape dismiss (Warning #16)
- [ ] [Med] Missing "sap het han" deadline filter in UI — AC #9 partial gap
- [ ] [Med] No optimistic update on edit/delete mutations — Dev Notes requirement
- [ ] [Med] `parseFloat` NaN risk on cleared piece_rate field
- [ ] [Med] `status_filter` accepts arbitrary strings without validation
- [ ] [Low] `overdue_only` and `status_filter="overdue"` duplicate logic

### Deferred Items (Not Caused by This Story)

- Timezone-stripping hack in `_task_to_response` (pre-existing from Story 5.3)
- No pagination on `list_all_tasks` (MVP limitation)
- Stale closure data in TaskDetailDrawer (standard TanStack Query pattern)
- `fetchOrdersForAssignment` hardcodes page_size=100 (MVP limitation)

## Dev Notes

### Architecture Patterns & Constraints

- **Authoritative Server Pattern:** All task creation, assignment validation, overdue calculations, and summary counts MUST happen on Backend. Frontend only renders pre-calculated data.
- **API Response Wrapper:** All endpoints return `{ "data": {...}, "meta": {} }` format.
- **Command Mode Layout:** Owner pages use dense layout (8-12px gaps). Already established in `(workplace)/layout.tsx`.
- **Server Actions for Auth:** Every Server Action calling authenticated endpoints MUST: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }`.
- **TanStack Query:** Use for task data fetching with `staleTime: 60_000` + `refetchInterval: 60_000`. Use `useMutation` with `queryClient.invalidateQueries` for optimistic create/update/delete.
- **snake_case API payloads:** All JSON body/params use snake_case.
- **Auth Guard for new endpoints:** Use `OwnerOnly` dependency for all new endpoints (create, list-all, update, delete). Existing tailor-facing endpoints (my-tasks, summary, status) use `OwnerOrTailor`.

### Critical: DO NOT Duplicate — Reuse Existing Infrastructure

The following already exist from Story 5.3 and MUST be reused:

| Existing Asset | Location | Reuse Strategy |
|:---|:---|:---|
| `tailor_tasks` DB table | `backend/migrations/014_create_tailor_tasks.sql` | Use as-is. NO new migration needed. |
| `TailorTaskDB` model | `backend/src/models/db_models.py:434-487` | Use as-is. All columns present. |
| `tailor_task_service.py` | `backend/src/services/tailor_task_service.py` | ADD new functions (create_task, list_all_tasks, update_task, delete_task). Do NOT duplicate `_task_to_response()`. |
| `tailor_tasks.py` router | `backend/src/api/v1/tailor_tasks.py` | ADD new endpoints to existing router. Do NOT create new router file. |
| Pydantic models | `backend/src/models/tailor_task.py` | ADD new request/response models. Reuse `TailorTaskResponse`, `TailorTaskSummary`. |
| `notification_creator.py` | `backend/src/services/notification_creator.py` | Use `create_notification()` for task assignment alerts. ADD template constant. |
| `tailor-task.ts` types | `frontend/src/types/tailor-task.ts` | ADD new types for owner. Reuse existing `TailorTask`, `TailorTaskSummary`. |
| `WorkplaceSidebar.tsx` | `frontend/src/components/client/workplace/WorkplaceSidebar.tsx` | ADD "San xuat" menu item to Owner section. |
| Staff API | `GET /api/v1/staff/` -> `active_staff` list | Use to populate tailor dropdown. Reuse `fetchStaffData()` action if exists, else create. |
| Order listing | `GET /api/v1/orders?status=in_production` | Use to populate order dropdown in task create form. Reuse `fetchOrders()` from `order-actions.ts`. |
| `OrderDetailDrawer` pattern | `frontend/src/components/client/orders/OrderDetailDrawer.tsx` | Follow same drawer pattern for TaskDetailDrawer. |

### Key Technical Decisions

- **No new DB migration:** `tailor_tasks` table already has all needed columns (assigned_to, assigned_by, deadline, notes, piece_rate, garment_name, customer_name, design_id, etc.).
- **Auto-populate denormalized fields:** When creating a task, service should auto-fetch `garment_name` from order_items and `customer_name` from order to populate denormalized fields. Owner should not need to type these manually.
- **Notification on assignment:** Use existing `notification_creator.create_notification()` — type `"task_assigned"`, target user = assigned tailor.
- **No email on assignment (MVP):** Email notification for task assignment is nice-to-have. In-app notification is sufficient for MVP.
- **Task deletion:** Only allow deletion of tasks in `assigned` status (tailor hasn't started). Tasks `in_progress` or `completed` cannot be deleted.
- **Reassignment:** When reassigning, update `assigned_to` field + create notification for new tailor. Do not change status.
- **URL state for filters:** Sync filter state to URL search params (same pattern as OrderBoardClient).
- **No WebSockets:** Use TanStack Query 60s polling, same as KPI Dashboard.

### Database Schema — Already Exists

`tailor_tasks` table is fully created (migration 014). Key columns for this story:

| Column | Type | Purpose in Story 5.2 |
|:---|:---|:---|
| `assigned_to` | UUID FK -> users | Owner selects which Tailor to assign |
| `assigned_by` | UUID FK -> users | Auto-set to current Owner's user_id |
| `order_id` | UUID FK -> orders | Owner selects which order to assign |
| `order_item_id` | UUID FK -> order_items | Optional: specific garment in order |
| `garment_name` | String | Auto-populated from order_items |
| `customer_name` | String | Auto-populated from order |
| `deadline` | DateTime(tz) | Owner sets deadline for completion |
| `notes` | Text | Owner's instructions to tailor |
| `piece_rate` | Numeric(12,2) | Payment amount for this task |
| `status` | String | Starts as "assigned" on creation |

### Backend Service Design — New Functions

```python
# Add to tailor_task_service.py

async def create_task(
    db: AsyncSession,
    request: TaskCreateRequest,
    owner_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> TailorTaskResponse:
    """Create a new tailor task (Owner assigns work).

    Validates:
    - Order exists and belongs to tenant
    - Order status is 'in_production'
    - Assigned tailor exists, is active, role=Tailor, same tenant
    Auto-populates garment_name and customer_name from order.
    Creates in-app notification for assigned tailor.
    """

async def list_all_tasks(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    assigned_to: uuid.UUID | None = None,
    status_filter: str | None = None,
    overdue_only: bool = False,
) -> OwnerTaskListResponse:
    """List ALL tasks for tenant (Owner view).

    Unlike get_my_tasks() which filters by tailor, this returns
    all tasks across all tailors with optional filters.
    Includes assignee_name via JOIN on users table.
    """

async def update_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    request: TaskUpdateRequest,
    owner_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> TailorTaskResponse:
    """Owner updates task fields (deadline, notes, piece_rate, reassign).

    If assigned_to changes, send notification to new tailor.
    """

async def delete_task(
    db: AsyncSession,
    task_id: uuid.UUID,
    tenant_id: uuid.UUID,
) -> bool:
    """Delete task only if status is 'assigned' (not started).

    Raises ValueError if task is in_progress or completed.
    """
```

### API Endpoints — Add to Existing Router

```python
# Add to tailor_tasks.py (existing router at /api/v1/tailor-tasks)

@router.post("/", response_model=dict)  # OwnerOnly
async def create_task(body: TaskCreateRequest, user: OwnerOnly, ...)

@router.get("/", response_model=dict)   # OwnerOnly
async def list_all_tasks(
    assigned_to: uuid.UUID | None = None,
    status: str | None = None,
    overdue_only: bool = False,
    user: OwnerOnly, ...
)

@router.patch("/{task_id}", response_model=dict)  # OwnerOnly
async def update_task(task_id: uuid.UUID, body: TaskUpdateRequest, user: OwnerOnly, ...)

@router.delete("/{task_id}", status_code=204)  # OwnerOnly
async def delete_task(task_id: uuid.UUID, user: OwnerOnly, ...)
```

**IMPORTANT:** These new OwnerOnly endpoints coexist with existing OwnerOrTailor endpoints (my-tasks, summary, status, detail). FastAPI will route correctly based on path matching. Place `GET /` BEFORE `GET /my-tasks` may cause conflicts — ensure `GET /my-tasks` is defined FIRST in the router file so it matches before the catch-all `GET /`.

### Frontend Component Architecture

```
/owner/production/page.tsx (Server Component — auth guard)
  +-- ProductionBoardClient.tsx (Client — TanStack Query + filter state)
        |-- ProductionSummaryCards.tsx (5 stat cards)
        |-- ProductionFilters.tsx (tailor dropdown, status dropdown, overdue toggle)
        |-- ProductionTaskTable.tsx (sortable table with all tasks)
        |     +-- DeadlineCountdown.tsx (reusable countdown badge)
        |-- TaskCreateDialog.tsx (Radix Dialog — create new task)
        |-- TaskDetailDrawer.tsx (right-side drawer — task detail + edit/delete)
        +-- TaskEditDialog.tsx (Radix Dialog — edit task fields)
```

### Existing Code Patterns to Follow

**Server Action pattern** (from `order-actions.ts`):
```typescript
"use server";
import { auth } from "@/auth";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function createTask(request: TaskCreateRequest) {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Chua dang nhap");
  const res = await fetch(`${BACKEND_URL}/api/v1/tailor-tasks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Giao viec that bai");
  const json = await res.json();
  return json.data;
}
```

**Sortable table pattern** (from `OrderTable.tsx` in orders page):
- Use `<table>` with clickable `<th>` headers for sort
- Active sort column highlighted
- URL params sync for persistence

**Drawer pattern** (from `OrderDetailDrawer.tsx`):
- Right-side sliding panel
- Shows full detail without navigating away from list
- Close button + click outside to dismiss

**Mutation with optimistic update** (from `TailorDashboardClient.tsx`):
```typescript
const createMutation = useMutation({
  mutationFn: (req: TaskCreateRequest) => createTask(req),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["owner-tasks"] });
    queryClient.invalidateQueries({ queryKey: ["owner-task-summary"] });
  },
});
```

### Heritage Design Tokens (Command Mode — same as Owner Dashboard)

```css
background: #FFFFFF
text-primary: #1A1A2E (Deep Charcoal)
primary: #1A2B4C (Indigo Depth)
accent: #D4AF37 (Heritage Gold)
spacing: 8-12px gaps
font: Inter (sans-serif) for data display
border-radius: 8px cards, 12px main sections
shadows: sm for cards
```

### StatusBadge Color Mapping (reuse from Story 5.3)

| Status | Vietnamese Label | Color | Tailwind Class |
|:---|:---|:---|:---|
| Assigned | Cho nhan | Amber | `bg-amber-100 text-amber-800` |
| In Progress | Dang lam | Indigo | `bg-indigo-100 text-indigo-800` |
| Completed | Hoan thanh | Green | `bg-emerald-100 text-emerald-800` |
| Overdue | Qua han | Red (pulse) | `bg-red-100 text-red-800 animate-pulse` |

### DeadlineCountdown Color Logic

| Condition | Color | Display |
|:---|:---|:---|
| > 7 days remaining | Green | "Con X ngay" |
| 2-7 days remaining | Amber | "Con X ngay" |
| < 2 days remaining | Red | "Con X ngay" |
| Overdue | Red pulse | "Qua han X ngay" |
| No deadline | Gray | "Khong co han" |

### Testing Standards

- Backend: Unit tests for `create_task`, `list_all_tasks`, `update_task`, `delete_task` in tailor_task_service
- Backend: Test validation — reject assignment to non-Tailor users, reject orders not `in_production`, reject deletion of started tasks
- Backend: Test notification creation on task assignment
- Frontend: Component tests for ProductionBoardClient rendering with mock data
- Frontend: Test TaskCreateDialog form validation (required fields)
- E2E: Verify OwnerOnly guard (non-Owner gets redirected)
- Performance: Page load < 2s, API response < 300ms

### Critical Warnings for Dev Agent

1. **DO NOT** create a new router file for owner task endpoints. ADD to existing `tailor_tasks.py` router.
2. **DO NOT** create a new DB migration. `tailor_tasks` table already has all needed columns.
3. **DO NOT** create duplicate `_task_to_response()` helper. Reuse the existing one and extend for owner-specific fields (assignee_name).
4. **DO NOT** calculate overdue/summary on Frontend. Backend is SSOT.
5. **DO NOT** use `middleware.ts` for auth. Use Server Actions pattern.
6. **DO NOT** hardcode tenant_id. Extract from session/backend dependencies.
7. **DO NOT** use English labels in UI. All text in Vietnamese: "Giao viec", "San xuat", "Tho may", "Han chot", "Tien cong", etc.
8. **DO NOT** use localStorage for any data. TanStack Query exclusively.
9. **DO NOT** create a new `(workplace)/layout.tsx` — it already exists.
10. **DO NOT** use `OwnerOrTailor` for the new endpoints — use `OwnerOnly` since only Owner can create/list-all/update/delete tasks.
11. **MUST** auto-populate `garment_name` and `customer_name` from order data when creating tasks.
12. **MUST** validate order status is `in_production` before allowing task creation.
13. **MUST** validate assigned_to is an active Tailor in the same tenant.
14. **MUST** create in-app notification for tailor when task is assigned or reassigned.
15. **MUST** ensure `GET /my-tasks` endpoint (existing) is defined BEFORE `GET /` (new) in router to avoid path conflicts.
16. **MUST** use Radix UI Dialog for create/edit forms (accessibility: focus trap, Escape dismiss, aria attributes).

### Project Structure Notes

- Production board components go in `components/client/production/` (NEW directory).
- Page at `app/(workplace)/owner/production/page.tsx` (NEW page).
- Backend changes are all in EXISTING files: `tailor_tasks.py`, `tailor_task_service.py`, `tailor_task.py` (models), `notification_creator.py`.
- No new backend files needed.
- Frontend server action goes in new file: `app/actions/owner-task-actions.ts`.
- Add "San xuat" to WorkplaceSidebar.tsx Owner menu items (between "Don hang" and "Cho thue" or at appropriate position).

### Previous Story Intelligence (Story 5.1 & 5.3)

**From Story 5.1 (KPI Dashboard):**
- Code review found: error state must throw from server action (not return null), revenue query boundary must use >= and < (not between), sidebar must be role-aware, shop name must be dynamic (not hardcoded).
- Pattern: Server component page -> Client component wrapper with TanStack Query -> Individual card/chart components.

**From Story 5.3 (Tailor Dashboard):**
- Code review found: overdue logic must be consistent (use `deadline < now`), multi-tenant isolation must include tenant_id in ALL queries, optimistic update must recalculate summary counts in onMutate, StatusUpdateRequest must use Literal types, use Radix UI Dialog for modals (WCAG accessibility).
- Pattern: Task service uses `_task_to_response()` shared helper for consistent overdue calculation.
- The `assigned_to != tailor_id` check in existing endpoints means Owner currently gets 403 on task detail/status update. **The new Owner endpoints bypass this check using OwnerOnly guard** — Owner can view/edit any task in their tenant.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.2] — User story & AC
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — Epic context (FR55-FR65)
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR61] — Task Assignment requirement
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Dual-Mode UI, TanStack Query, Zustand rules
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST API patterns, Response wrapper
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#TaskRow] — Component spec for task display
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#StatusBadge] — Status chip states and colors
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#OrderTimeline] — Visual pipeline for order flow
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Role-Based Navigation] — Owner sidebar nav
- [Source: _bmad-output/project-context.md] — All critical implementation rules
- [Source: _bmad-output/implementation-artifacts/5-1-kpi-morning-command-center-dash.md] — Previous story patterns & code review learnings
- [Source: _bmad-output/implementation-artifacts/5-3-workstation-production-flow-dash-cho-tho-tiem.md] — Tailor task infrastructure already built, code review learnings
- [Source: backend/src/models/db_models.py#TailorTaskDB] — Existing DB model
- [Source: backend/src/services/tailor_task_service.py] — Existing service to extend
- [Source: backend/src/api/v1/tailor_tasks.py] — Existing router to extend
- [Source: backend/src/models/tailor_task.py] — Existing Pydantic models to extend
- [Source: backend/src/services/notification_creator.py] — Notification helper to use
- [Source: backend/src/api/v1/staff.py] — Staff listing API for tailor dropdown
- [Source: backend/src/api/v1/orders.py] — Order listing API for order dropdown
- [Source: frontend/src/components/client/orders/OrderDetailDrawer.tsx] — Drawer UI pattern to follow
- [Source: frontend/src/components/client/orders/OrderBoardClient.tsx] — Board + filter + table pattern to follow
- [Source: frontend/src/components/client/tailor/TailorDashboardClient.tsx] — TanStack Query + mutation pattern
- [Source: frontend/src/app/actions/order-actions.ts] — Server action pattern
- [Source: frontend/src/types/tailor-task.ts] — Existing types to extend
- [Source: frontend/src/types/staff.ts] — ActiveStaffUser type for tailor dropdown

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

No debug issues encountered. All code was pre-implemented; session focused on validation and test creation.

### Completion Notes List

- All backend service functions (create_task, list_all_tasks, update_task, delete_task) fully implemented in tailor_task_service.py
- All 4 Owner-only API endpoints implemented in tailor_tasks.py (POST /, GET /, PATCH /{id}, DELETE /{id})
- TASK_ASSIGNMENT_MESSAGE template added to notification_creator.py; notification sent on task create and reassign
- All Frontend TypeScript types added to tailor-task.ts (TaskCreateRequest, TaskUpdateRequest, OwnerTaskItem, OwnerTaskListResponse, OwnerTaskFilters)
- All 5 server actions implemented in owner-task-actions.ts (fetchAllTasks, createTask, updateTask, deleteTask, fetchOrdersForAssignment, fetchStaffData)
- Production Board page at /owner/production with OwnerOnly auth guard
- 8 frontend components created: ProductionBoardClient, ProductionSummaryCards, ProductionTaskTable, ProductionFilters, DeadlineCountdown, TaskCreateDialog, TaskDetailDrawer, TaskEditDialog
- "San xuat" menu item added to WorkplaceSidebar.tsx Owner section
- 15 backend unit tests: 15/15 passed (create_task, list_all_tasks, update_task, delete_task validations)
- 20 frontend component tests: 20/20 passed (ProductionSummaryCards, DeadlineCountdown, ProductionTaskTable)
- No ESLint or TypeScript errors in production source files

### File List

backend/src/models/tailor_task.py
backend/src/services/tailor_task_service.py
backend/src/api/v1/tailor_tasks.py
backend/src/services/notification_creator.py
backend/tests/test_owner_task_service.py
frontend/src/types/tailor-task.ts
frontend/src/app/actions/owner-task-actions.ts
frontend/src/app/(workplace)/owner/production/page.tsx
frontend/src/components/client/production/ProductionBoardClient.tsx
frontend/src/components/client/production/ProductionSummaryCards.tsx
frontend/src/components/client/production/ProductionTaskTable.tsx
frontend/src/components/client/production/ProductionFilters.tsx
frontend/src/components/client/production/DeadlineCountdown.tsx
frontend/src/components/client/production/TaskCreateDialog.tsx
frontend/src/components/client/production/TaskDetailDrawer.tsx
frontend/src/components/client/production/TaskEditDialog.tsx
frontend/src/components/client/workplace/WorkplaceSidebar.tsx
frontend/src/__tests__/ProductionBoard.test.tsx

## Change Log

- Story 5.2 implemented: Owner Production Board — backend endpoints, frontend components, tests (Date: 2026-03-19)

## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: 5.2 Bang Dieu Phoi Khoi San Xuat Gap Viec
- Epic: 5
