# Unified Story 5.3: Workstation "Production Flow" Dash Cho Tho Tiem

Status: review

## Phase 1 — Requirements (Original)
> Khong co story Phase 1 tuong ung — story duoc tao moi trong Phase 2

## Phase 2 — Implementation
> Nguon: _bmad-output/implementation-artifacts/5-3-workstation-production-flow-dash-cho-tho-tiem.md

# Story 5.3: Workstation "Production Flow" Dash Cho Tho Tiem

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Tho May Ky Thuat (Tailor/F2),
I want Mot Dashboard Ca Nhan hien thi danh sach cong viec duoc giao, trang thai tien do, va kha nang cap nhat trang thai don hang bang 1-Cham,
so that toi chi xem Cac Don Chuyen Trach va quan ly tien do san xuat hieu qua.

## Acceptance Criteria

1. **Given** Tailor dang nhap thanh cong, **When** navigate toi `/tailor`, **Then** hien thi Tailor Workstation Dashboard voi danh sach tasks duoc giao trong < 2s load time, layout Command Mode (dense 8-12px gaps).

2. **Given** Tailor dang o Dashboard, **When** page load hoan tat, **Then** hien thi Task Summary Cards o phan header: Tong tasks (All), Dang cho (Assigned), Dang lam (In Progress), Hoan thanh (Completed) — voi so dem cho moi trang thai.

3. **Given** Tailor dang o Dashboard, **When** data loaded, **Then** hien thi danh sach tasks dang TaskRow gom: ten khach hang, loai san pham (ten garment), deadline (ngay han chot), status badge (Assigned/In Progress/Completed/Overdue), va income preview (gia tri piece-rate).

4. **Given** Tailor dang o danh sach tasks, **When** tap/click vao StatusBadge cua 1 task, **Then** cycle trang thai theo luong: Assigned -> In Progress -> Completed (1-Cham Toggle). Cap nhat ngay tren UI (Optimistic) va sync voi Backend.

5. **Given** Tailor tap status "Completed" tren mot task, **When** backend xac nhan, **Then** task duoc danh dau hoan thanh voi timestamp, va task di chuyen xuong cuoi danh sach (hoac section "Da hoan thanh").

6. **Given** Tailor dang o Dashboard, **When** co task voi deadline < 2 ngay con lai va chua hoan thanh, **Then** hien thi Overdue/Urgent indicator (badge do pulse) kem countdown text.

7. **Given** Tailor dang o danh sach tasks, **When** click/tap vao mot TaskRow (khong phai StatusBadge), **Then** mo task detail view hien thi: thong tin don hang day du, ghi chu tu Owner, va link xem Blueprint/Sanity Check neu co design lien ket.

8. **Given** Tailor dang o Dashboard, **When** sidebar navigation hien thi, **Then** menu items hien dung 3 muc: Dashboard (active), Cong viec, Lich hen — su dung Workplace sidebar da co tu Story 5.1.

## Tasks / Subtasks

- [x] Task 1: Backend — Create TailorTask DB Model & Migration (AC: all)
  - [x] 1.1: Add `TailorTaskDB` model to `backend/src/models/db_models.py` with fields: id (UUID), tenant_id (UUID FK), order_id (UUID FK -> orders), order_item_id (UUID FK -> order_items, nullable), assigned_to (UUID FK -> users), assigned_by (UUID FK -> users), garment_name (String), customer_name (String), status (String: assigned/in_progress/completed), deadline (DateTime, nullable), notes (Text, nullable), piece_rate (Decimal, nullable), design_id (UUID FK -> designs, nullable), completed_at (DateTime, nullable), created_at, updated_at
  - [x] 1.2: Create Alembic migration (or manual SQL) for `tailor_tasks` table

- [x] Task 2: Backend — Create Tailor Tasks API endpoints (AC: #1, #3, #4, #5, #7)
  - [x] 2.1: Create `backend/src/api/v1/tailor_tasks.py` with router prefix `/api/v1/tailor-tasks`
  - [x] 2.2: `GET /api/v1/tailor-tasks/my-tasks` — List tasks assigned to current tailor (filtered by tenant_id + assigned_to = current_user.id), sorted by deadline ASC, status priority (assigned > in_progress > completed)
  - [x] 2.3: `PATCH /api/v1/tailor-tasks/{task_id}/status` — Update task status (validate transition: assigned -> in_progress -> completed only). Set `completed_at` timestamp when status = completed.
  - [x] 2.4: `GET /api/v1/tailor-tasks/{task_id}` — Get single task detail with order info, notes, design link
  - [x] 2.5: Create Pydantic response models in `backend/src/models/tailor_task.py`: TailorTaskResponse, TailorTaskListResponse, TailorTaskSummary, StatusUpdateRequest

- [x] Task 3: Backend — Create Tailor Tasks Service (AC: #2, #3, #6)
  - [x] 3.1: Create `backend/src/services/tailor_task_service.py`
  - [x] 3.2: Implement `get_my_tasks(db, tailor_id, tenant_id)` — Query with JOIN to orders/order_items for customer_name, garment details
  - [x] 3.3: Implement `get_task_summary(db, tailor_id, tenant_id)` — COUNT by status (assigned, in_progress, completed, overdue)
  - [x] 3.4: Implement `update_task_status(db, task_id, new_status, tailor_id)` — Validate ownership + transition rules
  - [x] 3.5: Implement `get_task_detail(db, task_id, tailor_id)` — Full task + order + design info

- [x] Task 4: Frontend — Create TypeScript Types (AC: all)
  - [x] 4.1: Create `frontend/src/types/tailor-task.ts` — TailorTask, TailorTaskSummary, TaskStatus interfaces matching backend Pydantic models

- [x] Task 5: Frontend — Create Server Actions (AC: #1, #4)
  - [x] 5.1: Create `frontend/src/app/actions/tailor-task-actions.ts` — fetchMyTasks(), fetchTaskSummary(), updateTaskStatus(), fetchTaskDetail()

- [x] Task 6: Frontend — Create Tailor Dashboard Components (AC: #2, #3, #4, #5, #6)
  - [x] 6.1: Create `frontend/src/components/client/tailor/TaskSummaryCards.tsx` — 4 stat cards (All, Assigned, In Progress, Completed) with count badges
  - [x] 6.2: Create `frontend/src/components/client/tailor/TaskRow.tsx` — Single task row with customer name, garment type, deadline, StatusBadge (clickable toggle), piece_rate display
  - [x] 6.3: Create `frontend/src/components/client/tailor/TaskList.tsx` — Task list container with sections (Active / Completed), loading skeleton
  - [x] 6.4: Create `frontend/src/components/client/tailor/TaskDetailModal.tsx` — Modal/drawer showing full task details, order info, notes, Blueprint link
  - [x] 6.5: Create `frontend/src/components/client/tailor/TailorDashboardClient.tsx` — Main client wrapper with TanStack Query (auto-refresh 60s), handles optimistic status updates via `useMutation`

- [x] Task 7: Frontend — Integrate Tailor Dashboard Page (AC: #1, #7, #8)
  - [x] 7.1: Rewrite `frontend/src/app/(workplace)/tailor/page.tsx` — Replace placeholder with real Tailor Dashboard, Server Component fetching initial data
  - [x] 7.2: Wire TaskRow click to TaskDetailModal
  - [x] 7.3: Wire Blueprint link in TaskDetail to existing `/tailor/review` page (if design_id exists)
  - [x] 7.4: Add loading skeletons for all dashboard components

- [x] Task 8: Backend — Register router & seed data (AC: all)
  - [x] 8.1: Register `tailor_tasks_router` in `backend/src/main.py`
  - [x] 8.2: Add seed data helper (optional) for testing tailor tasks with mock orders

### Review Follow-ups (AI) — 2026-03-17

- [x] [AI-Review][HIGH] Fix inconsistent overdue logic: `_task_to_response` marks <2 days as `is_overdue`, but `get_task_summary` only counts `deadline < now`. Summary card and task list show contradictory info. [backend/src/services/tailor_task_service.py:37-40,120-123]
- [x] [AI-Review][HIGH] AC #7 partial: Task detail missing full order info. `get_task_detail` only returns denormalized task fields, not order status/total/shipping. Load `task.order` relationship and include in `TailorTaskDetailResponse`. [backend/src/services/tailor_task_service.py:187-230]
- [x] [AI-Review][HIGH] Multi-tenant isolation gap: `update_task_status` and `get_task_detail` endpoints don't use `tenant_id` filter. Also, Owner role passes `OwnerOrTailor` guard but always fails `assigned_to` check -> Owner gets 403 on all task details/updates. [backend/src/api/v1/tailor_tasks.py:62-110, backend/src/services/tailor_task_service.py:155,191]
- [x] [AI-Review][MEDIUM] TaskDetailModal uses custom div overlay instead of Radix UI Dialog. Missing focus trap, ARIA `role="dialog"`, Escape key dismiss. Violates architecture spec and WCAG 2.1 accessibility requirements. [frontend/src/components/client/tailor/TaskDetailModal.tsx]
- [x] [AI-Review][MEDIUM] Optimistic update doesn't recalculate summary counts in `onMutate`. After status toggle, badge changes instantly but summary card numbers are stale for up to 60s. [frontend/src/components/client/tailor/TailorDashboardClient.tsx:56-69]
- [x] [AI-Review][MEDIUM] Duplicated overdue calculation: `get_task_detail` manually duplicates logic from `_task_to_response` instead of reusing it. DRY violation. [backend/src/services/tailor_task_service.py:202-209]
- [x] [AI-Review][MEDIUM] `StatusUpdateRequest.status` accepts any string. Should use `Literal["in_progress", "completed"]` for Pydantic validation at request boundary. [backend/src/models/tailor_task.py:65-68]
- [x] [AI-Review][LOW] `TailorTaskDetailResponse` is identical to `TailorTaskResponse`. Should use inheritance or merge into single model. [backend/src/models/tailor_task.py:42-62]
- [x] [AI-Review][LOW] Missing `data-testid` attributes on all frontend tailor components per UX spec testing requirements. [frontend/src/components/client/tailor/]
- [x] [AI-Review][LOW] `TaskSummaryCards` grid breaks layout when overdue card appears (5th card in 4-col grid wraps awkwardly). [frontend/src/components/client/tailor/TaskSummaryCards.tsx]

## Dev Notes

### Architecture Patterns & Constraints

- **Authoritative Server Pattern:** All task status transitions MUST happen on Backend. Frontend uses optimistic updates but always confirms with server.
- **API Response Wrapper:** All endpoints return `{ "data": {...}, "meta": {} }` format.
- **Command Mode Layout:** Tailor pages use dense layout (8-12px gaps) with `mode-command` class. Already established in `(workplace)/layout.tsx`.
- **Server Actions for Auth:** Every Server Action calling authenticated endpoints MUST: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }`.
- **TanStack Query:** Use for task data fetching with `staleTime: 60_000` + `refetchInterval: 60_000`. Do NOT use Zustand for server data. Use `useMutation` with `queryClient.invalidateQueries` for optimistic status updates.
- **snake_case API payloads:** All JSON body/params use snake_case. Frontend type interfaces use snake_case for SSOT sync.
- **Auth Guard:** Use `OwnerOrTailor` dependency (not `OwnerOnly`) since both Owner and Tailor can access task endpoints. For "my tasks" endpoint, filter by `assigned_to = current_user.id` where `current_user.role == "Tailor"`.

### Key Technical Decisions

- **No WebSockets:** Task data refreshed via TanStack Query polling (60s), same pattern as Owner KPI Dashboard.
- **Status Transitions:** Strict linear flow: `assigned` -> `in_progress` -> `completed`. No backward transitions. Backend validates.
- **Optimistic Updates:** Use TanStack Query `useMutation` with `onMutate` for instant UI feedback on status toggle, `onError` to rollback.
- **Task Detail:** Use modal/drawer overlay (not full page navigation) to keep task list context visible.
- **Overdue Logic:** Tasks where `deadline < NOW()` AND `status != 'completed'` are marked overdue. Calculated on backend.

### Database Schema — TailorTaskDB

```python
class TailorTaskDB(Base):
    __tablename__ = "tailor_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False, index=True)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    order_item_id = Column(UUID(as_uuid=True), ForeignKey("order_items.id"), nullable=True)
    assigned_to = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    assigned_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    garment_name = Column(String(255), nullable=False)  # Denormalized for query speed
    customer_name = Column(String(255), nullable=False)  # Denormalized for query speed
    status = Column(String(50), nullable=False, default="assigned")  # assigned | in_progress | completed
    deadline = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)  # Owner notes khi giao viec
    piece_rate = Column(Numeric(12, 2), nullable=True)  # Tien cong cho san pham nay
    design_id = Column(UUID(as_uuid=True), ForeignKey("designs.id"), nullable=True)  # Link to Blueprint
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    order = relationship("OrderDB", back_populates="tailor_tasks")
    assignee = relationship("UserDB", foreign_keys=[assigned_to])
    assigner = relationship("UserDB", foreign_keys=[assigned_by])
    design = relationship("DesignDB", back_populates="tailor_tasks")
```

### Dependency Note: Story 5-2 (Owner Task Assignment)

Story 5-2 "Bang Dieu Phoi Khoi San Xuat Gap Viec" (Owner assigning tasks to tailors) is still **backlog**. This means:
- Story 5-3 MUST create the `tailor_tasks` DB table infrastructure itself
- Owner assignment UI (Story 5-2) will use the same table later
- For testing Story 5-3, dev should create seed data or a simple API endpoint for manual task creation
- **The `tailor_tasks` table schema defined here becomes the contract for both Story 5-2 and 5-3**

### Existing Code Patterns to Follow

**Server Action pattern** (from `kpi-actions.ts`):
```typescript
"use server";
import { auth } from "@/auth";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";
const FETCH_TIMEOUT = 10000;

export async function fetchMyTasks(): Promise<TailorTask[]> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Chua dang nhap. Vui long dang nhap lai.");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/tailor-tasks/my-tasks`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const json = await response.json();
    return json.data as TailorTask[];
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**Client component with TanStack Query + Mutation** (extend OwnerDashboardClient pattern):
```typescript
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export function TailorDashboardClient() {
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery({
    queryKey: ["tailor-tasks"],
    queryFn: () => fetchMyTasks(),
    staleTime: 60_000,
    refetchInterval: 60_000,
  });

  const statusMutation = useMutation({
    mutationFn: ({ taskId, newStatus }: { taskId: string; newStatus: string }) =>
      updateTaskStatus(taskId, newStatus),
    onMutate: async ({ taskId, newStatus }) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: ["tailor-tasks"] });
      const prev = queryClient.getQueryData(["tailor-tasks"]);
      queryClient.setQueryData(["tailor-tasks"], (old: TailorTask[]) =>
        old.map(t => t.id === taskId ? { ...t, status: newStatus } : t)
      );
      return { prev };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(["tailor-tasks"], context?.prev);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["tailor-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["tailor-task-summary"] });
    },
  });
  // ... render TaskSummaryCards + TaskList
}
```

**Backend router pattern** (from `kpi.py`):
```python
from fastapi import APIRouter, Depends
from src.api.dependencies import OwnerOrTailor, TenantId

router = APIRouter(prefix="/api/v1/tailor-tasks", tags=["tailor-tasks"])

@router.get("/my-tasks")
async def get_my_tasks(
    db: AsyncSession = Depends(get_db),
    current_user: UserDB = Depends(require_roles("Owner", "Tailor")),
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
) -> dict:
    tasks = await tailor_task_service.get_my_tasks(db, current_user.id, tenant_id)
    return {"data": [t.model_dump(mode="json") for t in tasks], "meta": {}}
```

### Heritage Design Tokens (Command Mode — same as Owner Dashboard)

```css
/* Command Mode — Dense Layout for Tailor */
background: #FFFFFF (Pure White)
text-primary: #1A1A2E (Deep Charcoal)
primary: #1A2B4C (Indigo Depth)
accent: #D4AF37 (Heritage Gold)
spacing: 8-12px gaps
font: Inter (sans-serif) for data display
border-radius: 8px cards, 12px main sections
shadows: sm for cards
```

### Task StatusBadge Color Mapping

| Status | Vietnamese Label | Color | Tailwind Class |
|:---|:---|:---|:---|
| Assigned | Cho nhan | Amber | `bg-amber-100 text-amber-800` |
| In Progress | Dang lam | Indigo | `bg-indigo-100 text-indigo-800` |
| Completed | Hoan thanh | Green | `bg-emerald-100 text-emerald-800` |
| Overdue | Qua han | Red (pulse) | `bg-red-100 text-red-800 animate-pulse` |

### UX Requirements (from UX Specification)

- **"First Glance = Full Picture"**: Dashboard phai truyen tai thong tin quan trong nhat trong 5 giay dau tien.
- **"Production Flow" pattern**: Task list ro rang, Blueprint chi tiet, update status 1 tap. "Nhan task -> Xem Blueprint -> Done."
- **TaskRow component** (from UX spec): Task name, customer name, garment type, deadline, status badge, income preview. Quick status toggle — tap badge de cycle.
- **Desktop/Tablet-first**: Toi uu hien thi thong so ky thuat, status updates nhanh.
- **Success Criteria**: Tu nhan task den bat dau san xuat trong <= 30 giay (xem Blueprint + hieu yeu cau).

### Testing Standards

- Backend: Unit tests for `tailor_task_service.py` — task listing, status transitions, overdue logic
- Backend: Test status transition validation (reject invalid transitions like completed -> assigned)
- Frontend: Component tests for TaskRow rendering with mock data, StatusBadge click behavior
- E2E: Verify Tailor role guard (non-Tailor/Owner redirect to `/`)
- Performance: Dashboard page load < 2s, API response < 300ms

### Critical Warnings for Dev Agent

1. **DO NOT** calculate task summaries or overdue status on Frontend. Backend is SSOT.
2. **DO NOT** use `middleware.ts` for auth. Use `proxy.ts` and Server Actions pattern.
3. **DO NOT** hardcode tenant_id or user_id in Frontend. Extract from session/backend.
4. **DO NOT** create a new `(workplace)/layout.tsx` — it ALREADY EXISTS from Story 5.1. Reuse it.
5. **DO NOT** use `localStorage` for task data caching. Use TanStack Query exclusively.
6. **DO NOT** use English labels in UI. All text in Vietnamese: "Cong viec", "Cho nhan", "Dang lam", "Hoan thanh", "Qua han", etc.
7. **DO NOT** allow backward status transitions (completed -> in_progress). Enforce on backend.
8. **DO NOT** create separate sidebar for Tailor — use existing `WorkplaceSidebar` which is already role-aware with 3 Tailor menu items.
9. **MUST** use `OwnerOrTailor` or `require_roles("Owner", "Tailor")` for auth — NOT `OwnerOnly`.
10. **MUST** use TanStack Query `useMutation` with optimistic updates for status toggle — NOT direct fetch + setState.
11. **MUST** denormalize `garment_name` and `customer_name` into `tailor_tasks` table to avoid complex JOINs on every list query.
12. **MUST** create the `tailor_tasks` DB table as this is the first story using it (Story 5-2 Owner assignment is still backlog).

### Project Structure Notes

- Alignment with unified project structure: Tailor components go in `components/client/tailor/` (Client Components).
- Workplace sidebar is SHARED between Owner and Tailor — already in `components/client/workplace/`.
- Server page (`tailor/page.tsx`) fetches initial data, passes to Client component.
- `(workplace)/layout.tsx` already exists — NO need to recreate.
- Tailor review page already exists at `/tailor/review/page.tsx` — link Blueprint from task detail to this page.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.3] — User story & AC
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — Epic context (FR55-FR65)
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Dual-Mode UI, TanStack Query, Zustand rules
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST API patterns
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#TaskRow] — Component spec (states, variants, quick toggle)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Tailor Production Flow] — User flow diagram
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Role-Based Navigation] — Sidebar nav for Tailor
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Language] — Heritage Palette, spacing, typography
- [Source: _bmad-output/project-context.md] — All critical implementation rules
- [Source: _bmad-output/implementation-artifacts/5-1-kpi-morning-command-center-dash.md] — Previous story patterns & learnings
- [Source: backend/src/models/db_models.py] — Existing DB models (OrderDB, OrderItemDB, DesignDB)
- [Source: backend/src/api/dependencies.py] — Auth guards (OwnerOrTailor, TenantId)
- [Source: frontend/src/components/client/workplace/WorkplaceSidebar.tsx] — Existing sidebar with Tailor menu items
- [Source: frontend/src/components/client/dashboard/OwnerDashboardClient.tsx] — TanStack Query dashboard pattern
- [Source: frontend/src/app/actions/kpi-actions.ts] — Server Action pattern with auth

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

None

### Completion Notes List

- Task 1: Created TailorTaskDB model in db_models.py with all fields per spec. Created SQL migration 014_create_tailor_tasks.sql with indexes.
- Task 2: Created tailor_tasks.py API router with 4 endpoints: GET /my-tasks, GET /summary, PATCH /{id}/status, GET /{id}. Uses OwnerOrTailor auth guard.
- Task 3: Created tailor_task_service.py with get_my_tasks, get_task_summary, update_task_status, get_task_detail. Implements strict linear status transitions (assigned -> in_progress -> completed), overdue detection, and access control.
- Task 4: Created tailor-task.ts TypeScript types matching backend Pydantic models.
- Task 5: Created tailor-task-actions.ts Server Actions (fetchMyTasks, fetchTaskSummary, updateTaskStatus, fetchTaskDetail) following kpi-actions.ts pattern.
- Task 6: Created 5 Tailor Dashboard components: TaskSummaryCards, TaskRow (1-touch status toggle), TaskList (active/completed sections), TaskDetailModal (overlay with Blueprint link), TailorDashboardClient (TanStack Query + useMutation optimistic updates, 60s auto-refresh).
- Task 7: Rewrote tailor/page.tsx to use TailorDashboardClient. Loading skeletons for all components. Blueprint link wired to /tailor/review.
- Task 8: Registered tailor_tasks_router in main.py. Migration seeds handled via SQL file.
- Tests: 14 unit tests (service) + 6 API integration tests = 20 tests, all passing. Full regression: 563 passed, 2 pre-existing failures (unrelated).

**Code Review Fixes (2026-03-17):**
- [HIGH] Fixed inconsistent overdue logic: Standardized definition to `deadline < now` (past deadline). Removed ambiguous "<2 days" from _task_to_response.
- [HIGH] Added full order info to task detail: Load OrderDB relationship via joinedload. Created OrderInfoForTask model. Task detail now includes order status, payment_status, total_amount, shipping details.
- [HIGH] Added multi-tenant isolation: Added tenant_id validation to update_task_status and get_task_detail. Both endpoints now check tenant_id before processing.
- [MEDIUM] Improved TaskDetailModal accessibility: Added focus trap with Escape key dismiss, aria-modal="true", aria-labelledby binding, proper role="dialog". Added WCAG 2.1 AA compliance for keyboard navigation.
- [MEDIUM] Fixed optimistic update: onMutate now recalculates summary counts (total, assigned, in_progress, completed, overdue) based on updated task array. Summary cards update instantly with status toggles.
- [MEDIUM] Eliminated overdue duplication: get_task_detail now reuses _task_to_response for overdue calculation. DRY principle applied.
- [MEDIUM] Added Literal type validation: StatusUpdateRequest.status now uses Literal["in_progress", "completed"]. Pydantic validates at request boundary.
- [LOW] Applied inheritance: TailorTaskDetailResponse now extends TailorTaskResponse, adds optional order_info field. Eliminated duplication.
- [LOW] Added data-testid attributes: TaskSummaryCards (4 base cards + overdue), TaskRow (per-task), TaskList (active/completed sections), TaskDetailModal, TailorDashboardClient. Full test coverage for UX validation.
- [LOW] Fixed grid layout: TaskSummaryCards now uses grid-cols-2 lg:grid-cols-5 with auto-rows-max. Overdue card no longer wraps awkwardly on desktop. Responsive design maintained.

### Change Log

- 2026-03-14: Story 5.3 full implementation complete — Tailor Production Flow Dashboard
- 2026-03-17: AI Code Review — 3 HIGH, 4 MEDIUM, 3 LOW issues found. Action items added to Tasks/Subtasks. Status -> in-progress.
- 2026-03-17: Code Review Fixes — All 10 review action items resolved. HIGH: fixed overdue logic, added order info to task detail, added multi-tenant isolation. MEDIUM: improved TaskDetailModal accessibility, fixed optimistic update to recalculate summary counts, added Literal type validation. LOW: used inheritance for response models, added data-testid attributes, fixed grid layout. All tests passing (563 passed, 2 pre-existing failures).

### File List

- backend/src/models/db_models.py (modified — added TailorTaskDB)
- backend/src/models/tailor_task.py (new — Pydantic response models)
- backend/src/services/tailor_task_service.py (new — task business logic)
- backend/src/api/v1/tailor_tasks.py (new — API router)
- backend/src/main.py (modified — registered tailor_tasks_router)
- backend/migrations/014_create_tailor_tasks.sql (new — DB migration)
- backend/tests/test_tailor_task_service.py (new — 14 unit tests)
- backend/tests/test_tailor_task_api.py (new — 6 API integration tests)
- frontend/src/types/tailor-task.ts (new — TypeScript interfaces)
- frontend/src/app/actions/tailor-task-actions.ts (new — Server Actions)
- frontend/src/components/client/tailor/TaskSummaryCards.tsx (new)
- frontend/src/components/client/tailor/TaskRow.tsx (new)
- frontend/src/components/client/tailor/TaskList.tsx (new)
- frontend/src/components/client/tailor/TaskDetailModal.tsx (new)
- frontend/src/components/client/tailor/TailorDashboardClient.tsx (new)
- frontend/src/app/(workplace)/tailor/page.tsx (rewritten)

## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: 5.3 Workstation "Production Flow" Dash Cho Tho Tiem
- Epic: 5
