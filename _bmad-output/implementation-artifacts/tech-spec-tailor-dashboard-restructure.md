---
title: 'Tailor Dashboard Restructure & Tasks Page'
slug: 'tailor-dashboard-restructure'
created: '2026-04-02'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16 (App Router)', 'TypeScript', 'TanStack Query', 'Recharts', 'Tailwind CSS', 'FastAPI', 'SQLAlchemy', 'Pydantic v2']
files_to_modify: ['frontend/src/app/(workplace)/tailor/page.tsx', 'frontend/src/components/client/tailor/TailorDashboardClient.tsx', 'frontend/src/components/client/tailor/IncomeWidget.tsx', 'frontend/src/app/actions/tailor-task-actions.ts', 'frontend/src/types/tailor-task.ts', 'frontend/src/components/client/workplace/WorkplaceSidebar.tsx', 'backend/src/api/v1/tailor_tasks.py', 'backend/src/services/tailor_task_service.py', 'backend/src/models/tailor_task.py', 'NEW: frontend/src/app/(workplace)/tailor/tasks/page.tsx', 'NEW: frontend/src/components/client/tailor/TailorTasksClient.tsx', 'NEW: frontend/src/components/client/tailor/TaskFilters.tsx', 'NEW: frontend/src/app/(workplace)/tailor/feedback/page.tsx']
code_patterns: ['Server Action auth pattern (Bearer token forwarding)', 'TanStack Query + useMutation optimistic updates', 'Command Mode layout (dense 8-12px gaps)', 'snake_case JSON fields for SSOT', 'Server Components in app/, Client Components in components/client/']
test_patterns: ['pytest async (backend)', 'test_tailor_task_service.py (unit)', 'test_tailor_task_api.py (integration)']
---

# Tech-Spec: Tailor Dashboard Restructure & Tasks Page

**Created:** 2026-04-02

## Overview

### Problem Statement

Trang `/tailor` hiện tại gộp quá nhiều nội dung (summary cards + task list + income widget) khiến dashboard kém tập trung. Tailor cần một dashboard tổng quan nhanh và một trang tasks riêng với bộ lọc để quản lý công việc hiệu quả hơn.

### Solution

Tái cấu trúc Tailor workspace thành 2 trang: Dashboard tổng quan (`/tailor`) và Tasks page chi tiết (`/tailor/tasks`). Đồng thời nâng cấp Income Widget với bộ lọc thời gian và đổi sidebar link "Lịch hẹn" thành "Phản hồi".

### Scope

**In Scope:**
1. `/tailor` (Dashboard) — Summary Cards + Income Widget nâng cấp (bộ lọc ngày/tuần/tháng/năm) + Quick link tới `/tailor/tasks` + Thông báo task urgent
2. `/tailor/tasks` (Tasks Page) — Task list + Bộ lọc trạng thái (Chờ nhận, Đang làm, Hoàn thành, Hủy) + Bộ lọc ngày (date range picker + chọn tháng/năm)
3. Sidebar — Đổi "Lịch hẹn" `/tailor/appointments` → "Phản hồi" `/tailor/feedback` (placeholder page)
4. Backend — Bổ sung query params cho `GET /my-tasks` (filter status, date range). Trạng thái `cancelled` chỉ Owner set, Tailor xem read-only.

**Out of Scope:**
- Xây dựng nút hủy task cho Tailor (Owner-only feature)
- Nội dung trang `/tailor/feedback` (phát triển sau — chỉ tạo placeholder)
- Thay đổi backend income calculation logic (chỉ thay đổi frontend display/filter)

## Context for Development

### Codebase Patterns

- **Server Action auth pattern:** `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }` — mọi Server Action phải forward token.
- **TanStack Query:** `staleTime: 60_000`, `refetchInterval: 60_000`. `useMutation` + optimistic updates cho status toggle. Income query key: `["tailor-income"]`, tasks query key: `["tailor-tasks"]`.
- **Component separation:** `app/` = Server Components (auth guard, initial fetch), `components/client/` = Client Components (`"use client"`).
- **snake_case JSON fields** cho SSOT sync giữa frontend types và backend Pydantic models.
- **Command Mode layout:** Dense 8-12px gaps, Heritage palette: `#1A2B4C` (Indigo Depth), `#D4AF37` (Heritage Gold), `#1A1A2E` (Deep Charcoal).
- **Status colors:** amber (assigned), indigo (in_progress), emerald (completed), red (overdue). Cần thêm: gray (cancelled).
- **API response wrapper:** `{ "data": {...}, "meta": {} }` format.
- **Error handling:** Vietnamese error messages. AbortController timeout 10s.

### Files to Reference

| File | Purpose | Action |
| ---- | ------- | ------ |
| `frontend/src/app/(workplace)/tailor/page.tsx` | Dashboard page (Server Component) | **Refactor** — bỏ task list, giữ summary + income + quick links + urgent alerts |
| `frontend/src/components/client/tailor/TailorDashboardClient.tsx` | Dashboard client wrapper (150 lines) | **Refactor** — bỏ TaskList/TaskDetailModal, thêm quick link + urgent section |
| `frontend/src/components/client/tailor/TaskSummaryCards.tsx` | Summary count cards (57 lines) | **Giữ nguyên** — reuse trên cả dashboard và tasks page |
| `frontend/src/components/client/tailor/TaskList.tsx` | Task list active/completed (97 lines) | **Reuse** trên tasks page |
| `frontend/src/components/client/tailor/TaskRow.tsx` | Task row + status toggle (129 lines) | **Modify** — thêm `cancelled` status config (read-only badge) |
| `frontend/src/components/client/tailor/TaskDetailModal.tsx` | Task detail modal (213 lines) | **Reuse** trên tasks page |
| `frontend/src/components/client/tailor/IncomeWidget.tsx` | Income widget (80 lines) | **Modify** — thêm period filter (day/week/month/year) |
| `frontend/src/components/client/tailor/IncomeSummaryCards.tsx` | Income comparison (113 lines) | **Giữ nguyên** |
| `frontend/src/components/client/tailor/IncomeChart.tsx` | Bar chart Recharts (83 lines) | **Giữ nguyên** |
| `frontend/src/app/actions/tailor-task-actions.ts` | Server actions (258 lines) | **Modify** — thêm filter params cho `fetchMyTasks`, period param cho `fetchMyIncome` |
| `frontend/src/types/tailor-task.ts` | TypeScript types (103 lines) | **Modify** — thêm `cancelled` vào TaskStatus, thêm filter interfaces |
| `frontend/src/components/client/workplace/WorkplaceSidebar.tsx` | Sidebar (263 lines) | **Modify** — đổi "Lịch hẹn" → "Phản hồi", href → `/tailor/feedback` |
| `backend/src/api/v1/tailor_tasks.py` | API router (356 lines) | **Modify** — thêm query params `status`, `date_from`, `date_to` cho `GET /my-tasks`; thêm `period` param cho `GET /my-income` |
| `backend/src/services/tailor_task_service.py` | Service layer (720 lines) | **Modify** — thêm filter logic trong `get_my_tasks`, mở rộng `get_tailor_monthly_income` |
| `backend/src/models/tailor_task.py` | Pydantic models (158 lines) | **Modify** — thêm `cancelled` vào status enum, thêm filter request model |
| **NEW:** `frontend/src/app/(workplace)/tailor/tasks/page.tsx` | Tasks page (Server Component) | **Create** — auth guard + render TailorTasksClient |
| **NEW:** `frontend/src/components/client/tailor/TailorTasksClient.tsx` | Tasks page client wrapper | **Create** — TanStack Query, filters, task list, status toggle, detail modal |
| **NEW:** `frontend/src/components/client/tailor/TaskFilters.tsx` | Filter bar component | **Create** — status pills + date range picker + month/year selector |
| **NEW:** `frontend/src/app/(workplace)/tailor/feedback/page.tsx` | Feedback placeholder | **Create** — placeholder page "Coming soon" |

### Technical Decisions

1. **Income Widget period filter:** Backend `GET /my-income` mở rộng nhận `period` param (`day`/`week`/`month`/`year`). Khi `day`: trả chi tiết từng task hoàn thành trong ngày. Khi `week`→`year`: trả tổng quan (total_income + task_count + percentage_change so kỳ trước).
2. **Task status filter:** URL query params (`?status=assigned&date_from=2026-04-01&date_to=2026-04-30`) — shareable/bookmarkable. Frontend `useSearchParams()` để sync.
3. **`cancelled` status:** Tailor xem read-only, badge màu gray (`bg-gray-100 text-gray-800`). Không có nút toggle sang cancelled. Backend đã có owner endpoint để set status — chỉ cần frontend hiển thị.
4. **Date range filter:** Gửi `date_from` + `date_to` ISO strings tới backend `GET /my-tasks`. Backend filter theo `deadline` field.
5. **Reuse components:** `TaskSummaryCards`, `TaskList`, `TaskRow`, `TaskDetailModal` được reuse trên `/tailor/tasks`. Dashboard chỉ giữ `TaskSummaryCards` + `IncomeWidget` + quick links + urgent alerts.
6. **Urgent alerts trên dashboard:** Query tasks rồi filter `is_overdue === true` hoặc `days_until_deadline < 2` — hiển thị top 3 urgent tasks với link tới `/tailor/tasks?status=assigned`.

## Implementation Plan

### Tasks

- [ ] Task 1: Backend — Add filter params to `GET /my-tasks` endpoint
  - File: `backend/src/models/tailor_task.py`
  - Action: Add `TaskFilterParams` model with optional fields: `status: Optional[str]` (comma-separated: "assigned,in_progress,completed,cancelled"), `date_from: Optional[datetime]`, `date_to: Optional[datetime]`, `month: Optional[int]`, `year: Optional[int]`.
  - File: `backend/src/services/tailor_task_service.py`
  - Action: Modify `get_my_tasks(db, tailor_id, tenant_id, filters: TaskFilterParams = None)` to apply WHERE clauses: filter by `status IN (...)`, filter by `deadline >= date_from AND deadline <= date_to`. When `month`/`year` provided, filter by `EXTRACT(month FROM deadline)` and `EXTRACT(year FROM deadline)`.
  - File: `backend/src/api/v1/tailor_tasks.py`
  - Action: Add Query params to `GET /my-tasks`: `status: Optional[str] = None`, `date_from: Optional[str] = None`, `date_to: Optional[str] = None`, `month: Optional[int] = None`, `year: Optional[int] = None`. Parse and pass to service.
  - Notes: `cancelled` status tasks should be returned when filtered explicitly. Default (no status filter) returns all statuses. Maintain existing sort order (status priority, then deadline ASC).

- [ ] Task 2: Backend — Extend `GET /my-income` with period filter
  - File: `backend/src/models/tailor_task.py`
  - Action: Add `IncomePeriod` literal type: `Literal["day", "week", "month", "year"]`. Add `IncomeDetailItem` model (for daily view): `task_id, garment_name, customer_name, piece_rate, completed_at`. Add `TailorIncomeDetailResponse` with `items: list[IncomeDetailItem]` + `total_income` + `task_count`.
  - File: `backend/src/services/tailor_task_service.py`
  - Action: Add `get_tailor_income_by_period(db, tailor_id, tenant_id, period, reference_date)`. For `day`: return list of completed tasks on that date with individual piece_rate. For `week`: aggregate Mon-Sun of reference_date's week vs previous week. For `month`: existing logic (current vs previous). For `year`: aggregate Jan-Dec of reference_date's year vs previous year.
  - File: `backend/src/api/v1/tailor_tasks.py`
  - Action: Add Query params to `GET /my-income`: `period: str = "month"`, `reference_date: Optional[str] = None` (ISO date, defaults to today). Route to new service method.
  - Notes: `day` period returns `TailorIncomeDetailResponse` (item-level). `week`/`month`/`year` return existing `TailorIncomeResponse` (summary-level). Backend decides response shape by period.

- [ ] Task 3: Frontend — Update types and server actions
  - File: `frontend/src/types/tailor-task.ts`
  - Action: (a) Add `"cancelled"` to `TaskStatus` union type. (b) Add `TaskFilters` interface: `{ status?: string; date_from?: string; date_to?: string; month?: number; year?: number }`. (c) Add `IncomePeriod` type: `"day" | "week" | "month" | "year"`. (d) Add `IncomeDetailItem` interface: `{ task_id: string; garment_name: string; customer_name: string; piece_rate: number; completed_at: string }`. (e) Add `TailorIncomeDetailResponse` interface: `{ items: IncomeDetailItem[]; total_income: number; task_count: number; date: string }`. (f) Update `NEXT_STATUS` map: add `cancelled: null`.
  - File: `frontend/src/app/actions/tailor-task-actions.ts`
  - Action: (a) Modify `fetchMyTasks(filters?: TaskFilters)` — build URL query string from filters, append to `/my-tasks`. (b) Modify `fetchMyIncome(period?: IncomePeriod, referenceDate?: string)` — add `period` and `reference_date` query params to `/my-income`.
  - Notes: Both functions keep existing signature as default (no params = current behavior).

- [ ] Task 4: Frontend — Add `cancelled` status to TaskRow
  - File: `frontend/src/components/client/tailor/TaskRow.tsx`
  - Action: Add to `STATUS_CONFIG` object: `cancelled: { label: "Đã hủy", className: "bg-gray-100 text-gray-800" }`. Status badge for cancelled is NOT clickable (no next status). Cancelled row should have reduced opacity (`opacity-60`).
  - Notes: No toggle behavior — `NEXT_STATUS.cancelled = null` already handles this.

- [ ] Task 5: Frontend — Create TaskFilters component
  - File: **NEW** `frontend/src/components/client/tailor/TaskFilters.tsx`
  - Action: Create `"use client"` component with:
    - **Status filter pills:** Horizontal row of toggle buttons: "Tất cả", "Chờ nhận", "Đang làm", "Hoàn thành", "Đã hủy". Active pill highlighted with status color. Multiple selection allowed.
    - **Date range picker:** Two `<input type="date">` fields (Từ ngày / Đến ngày). Clear button to reset.
    - **Month/Year selector:** `<select>` for month (1-12) + `<input type="number">` for year. Quick buttons: "Tháng này", "Tháng trước".
    - Props: `filters: TaskFilters`, `onFiltersChange: (filters: TaskFilters) => void`.
    - Layout: Horizontal on desktop (flex-wrap), stacked on mobile.
  - Notes: Command Mode styling (dense, 8px gaps). Status pills use same colors as TaskRow badges.

- [ ] Task 6: Frontend — Create TailorTasksClient (tasks page wrapper)
  - File: **NEW** `frontend/src/components/client/tailor/TailorTasksClient.tsx`
  - Action: Create `"use client"` component that:
    - Uses `useSearchParams()` to read/write URL query params for filters.
    - Initializes `TaskFilters` state from URL params.
    - Uses `useQuery({ queryKey: ["tailor-tasks-filtered", filters], queryFn: () => fetchMyTasks(filters) })` with `staleTime: 60_000`.
    - Renders: `TaskFilters` → `TaskSummaryCards` (from filtered response summary) → `TaskList` → `TaskDetailModal`.
    - Implements `useMutation` for status toggle (same pattern as `TailorDashboardClient`).
    - On filter change: update URL params via `router.replace()` and update query key.
  - Notes: Separate query key `["tailor-tasks-filtered", filters]` to not conflict with dashboard's `["tailor-tasks"]` cache.

- [ ] Task 7: Frontend — Create `/tailor/tasks` page
  - File: **NEW** `frontend/src/app/(workplace)/tailor/tasks/page.tsx`
  - Action: Server Component with auth guard (same pattern as `tailor/page.tsx`). Render heading "Công việc" + `<TailorTasksClient />`. Requires "Tailor" or "Owner" role.
  - Notes: Auth is also enforced at `(workplace)/layout.tsx` level. Page title: "Công việc".

- [ ] Task 8: Frontend — Refactor TailorDashboardClient (dashboard page)
  - File: `frontend/src/components/client/tailor/TailorDashboardClient.tsx`
  - Action: Remove `TaskList`, `TaskDetailModal`, `TaskListSkeleton` imports and rendering. Keep `TaskSummaryCards` + `IncomeWidget`. Add:
    - **Quick link section:** A card/button "Xem tất cả công việc →" linking to `/tailor/tasks`. Use `next/link`.
    - **Urgent alerts section:** Filter tasks from query where `is_overdue === true` or `days_until_deadline !== null && days_until_deadline <= 2 && status !== "completed"`. Show top 3 as compact alert rows (customer name, garment, deadline, status badge). Each row links to `/tailor/tasks?status=assigned`. If no urgent tasks, show "Không có công việc gấp" message.
    - Remove `selectedTask`, `updatingTaskId` state (no longer needed on dashboard).
    - Remove `statusMutation` (status toggle only on tasks page now).
  - Notes: Dashboard becomes read-only overview. All task management moves to `/tailor/tasks`.

- [ ] Task 9: Frontend — Upgrade IncomeWidget with period filter
  - File: `frontend/src/components/client/tailor/IncomeWidget.tsx`
  - Action: Add period selector tabs at top: "Ngày" | "Tuần" | "Tháng" | "Năm". Default: "Tháng" (current behavior). On tab change, call `fetchMyIncome(period, referenceDate)` via TanStack Query with query key `["tailor-income", period, referenceDate]`.
    - **Day view:** Show `IncomeDetailItem` list — table with columns: Sản phẩm, Khách hàng, Tiền công, Ngày hoàn thành. Add date picker for `referenceDate`.
    - **Week/Month/Year view:** Show existing `IncomeSummaryCards` + `IncomeChart` (summary comparison with previous period).
    - Add navigation arrows (< >) to move reference date: prev/next day, prev/next week, prev/next month, prev/next year.
  - Notes: Default view (month) should render identically to current behavior — no visual regression.

- [ ] Task 10: Frontend — Refactor Dashboard page.tsx
  - File: `frontend/src/app/(workplace)/tailor/page.tsx`
  - Action: Update heading from "Công việc" to "Tổng quan" (Dashboard is now overview, not task-focused). Keep auth guard and session greeting as-is.

- [ ] Task 11: Frontend — Update WorkplaceSidebar
  - File: `frontend/src/components/client/workplace/WorkplaceSidebar.tsx`
  - Action: In `tailorMenuItems` array, change third item: `label: "Lịch hẹn"` → `label: "Phản hồi"`, `href: "/tailor/appointments"` → `href: "/tailor/feedback"`. Change icon to a chat/feedback icon (speech bubble SVG).

- [ ] Task 12: Frontend — Create `/tailor/feedback` placeholder page
  - File: **NEW** `frontend/src/app/(workplace)/tailor/feedback/page.tsx`
  - Action: Server Component with auth guard. Render centered placeholder: icon + "Tính năng phản hồi đang được phát triển" + "Chức năng nhận phản hồi từ chủ tiệm và khách hàng sẽ sớm ra mắt." Simple, clean layout matching Command Mode.

- [ ] Task 13: Backend — Update tests for new filter params
  - File: `backend/tests/test_tailor_task_service.py`
  - Action: Add tests: (a) `test_get_my_tasks_filter_by_status` — filter assigned only, filter completed only, filter cancelled only, filter multiple statuses. (b) `test_get_my_tasks_filter_by_date_range` — tasks within range returned, tasks outside excluded. (c) `test_get_my_tasks_filter_by_month_year` — correct month filtering.
  - File: `backend/tests/test_tailor_task_api.py`
  - Action: Add tests: (a) `test_my_tasks_with_status_filter` — query param `?status=assigned`. (b) `test_my_tasks_with_date_filter` — query params `?date_from=...&date_to=...`. (c) `test_my_income_with_period` — query param `?period=day`, `?period=year`.

### Acceptance Criteria

- [ ] AC 1: Given Tailor đăng nhập, When navigate tới `/tailor`, Then hiển thị Dashboard với: Summary Cards (Tổng, Chờ nhận, Đang làm, Hoàn thành), Income Widget (mặc định view Tháng), Quick link "Xem tất cả công việc", Urgent alerts (nếu có). KHÔNG hiển thị task list đầy đủ.

- [ ] AC 2: Given Tailor ở Dashboard, When có task với deadline < 2 ngày hoặc is_overdue, Then hiển thị tối đa 3 urgent alert rows với thông tin task + link tới `/tailor/tasks`.

- [ ] AC 3: Given Tailor ở Dashboard, When không có task urgent, Then hiển thị message "Không có công việc gấp".

- [ ] AC 4: Given Tailor ở Dashboard, When click tab "Ngày" trên Income Widget, Then hiển thị danh sách chi tiết từng task hoàn thành trong ngày với: tên sản phẩm, tên khách, tiền công, ngày hoàn thành.

- [ ] AC 5: Given Tailor ở Dashboard, When click tab "Tuần"/"Tháng"/"Năm" trên Income Widget, Then hiển thị tổng quan: IncomeSummaryCards (so kỳ trước) + IncomeChart.

- [ ] AC 6: Given Tailor ở Dashboard, When click mũi tên < > trên Income Widget, Then navigate tới kỳ trước/sau (ngày trước/sau, tuần trước/sau, tháng trước/sau, năm trước/sau) và refresh dữ liệu.

- [ ] AC 7: Given Tailor click "Xem tất cả công việc" hoặc sidebar "Công việc", When trang `/tailor/tasks` load, Then hiển thị: TaskFilters + TaskSummaryCards + TaskList đầy đủ với tất cả tasks. Load time < 2s.

- [ ] AC 8: Given Tailor ở `/tailor/tasks`, When click pill "Đang làm" trong bộ lọc trạng thái, Then task list chỉ hiển thị tasks có status `in_progress`. URL cập nhật thành `?status=in_progress`.

- [ ] AC 9: Given Tailor ở `/tailor/tasks`, When chọn date range (từ ngày X đến ngày Y), Then task list chỉ hiển thị tasks có deadline trong khoảng X-Y. URL cập nhật thêm `date_from=X&date_to=Y`.

- [ ] AC 10: Given Tailor ở `/tailor/tasks`, When chọn bộ lọc tháng/năm, Then task list hiển thị tasks có deadline trong tháng/năm đó.

- [ ] AC 11: Given Tailor ở `/tailor/tasks`, When có tasks với status `cancelled`, Then hiển thị badge "Đã hủy" màu gray, không có nút toggle status. Row hiển thị mờ hơn (opacity).

- [ ] AC 12: Given Tailor ở `/tailor/tasks`, When click StatusBadge trên task (không phải cancelled), Then cycle status giống hiện tại: assigned → in_progress → completed. Optimistic update.

- [ ] AC 13: Given Tailor ở `/tailor/tasks`, When click vào TaskRow, Then mở TaskDetailModal hiển thị chi tiết task.

- [ ] AC 14: Given Tailor click sidebar "Phản hồi", When trang `/tailor/feedback` load, Then hiển thị placeholder "Tính năng phản hồi đang được phát triển".

- [ ] AC 15: Given backend `GET /my-tasks?status=assigned`, When request executed, Then chỉ trả về tasks có status "assigned". Tương tự cho mỗi status filter.

- [ ] AC 16: Given backend `GET /my-tasks?date_from=2026-04-01&date_to=2026-04-30`, When request executed, Then chỉ trả về tasks có deadline trong khoảng ngày đó.

- [ ] AC 17: Given backend `GET /my-income?period=day&reference_date=2026-04-02`, When request executed, Then trả về danh sách chi tiết từng task hoàn thành ngày 2026-04-02.

- [ ] AC 18: Given backend `GET /my-income?period=year`, When request executed, Then trả về tổng thu nhập năm nay vs năm trước + percentage_change.

## Additional Context

### Dependencies

- **Story 5.3** (Tailor Production Flow Dashboard) — đã hoàn thành, là base code cho toàn bộ component reuse.
- **Story 5.4** (Income Widget) — đã hoàn thành, IncomeWidget/IncomeSummaryCards/IncomeChart là base.
- **Story 5.2** (Owner Task Assignment) — Owner dùng `PATCH /{task_id}` hoặc `DELETE` để set cancelled. Spec này chỉ hiển thị cancelled tasks, không tạo flow hủy mới.
- **No new npm packages needed.** Date inputs dùng native HTML `<input type="date">`. Select dùng native `<select>`.

### Testing Strategy

**Backend (pytest async):**
- Unit tests: `test_tailor_task_service.py` — thêm 6+ tests cho filter logic (status filter, date range, month/year) + income period logic (day detail, week/year aggregation).
- API integration tests: `test_tailor_task_api.py` — thêm 4+ tests cho query params validation + response shape.

**Frontend (manual):**
- Verify dashboard (`/tailor`): Summary + Income + Quick links + Urgent alerts render correctly.
- Verify tasks page (`/tailor/tasks`): Filters work, URL params sync, status toggle works.
- Verify income period tabs: Day shows detail list, Week/Month/Year shows summary + chart.
- Verify sidebar: "Phản hồi" link navigates to `/tailor/feedback` placeholder.
- Verify cancelled tasks: Gray badge, no toggle, reduced opacity.
- Verify responsive: Mobile/tablet/desktop layouts.

**Regression:**
- Existing task status toggle still works on `/tailor/tasks`.
- Existing income data still shows correctly on default (month) view.
- Owner dashboard unaffected.

### Notes

- **Risk: Income daily detail query performance.** If a tailor has many completed tasks, daily detail query should be fast since it's filtered by date + tailor_id + tenant_id. Add index on `(tenant_id, assigned_to, completed_at)` if needed.
- **Risk: URL params serialization.** Date strings must be ISO format. Invalid dates from URL should be handled gracefully (ignore invalid, use defaults).
- **Future consideration:** The `/tailor/feedback` page is a placeholder. Story for full feedback feature (Owner + Customer feedback to Tailor) should be created separately.
- **Sidebar:** "Công việc" already points to `/tailor/tasks` in existing sidebar code. No change needed for that item — only the third item ("Lịch hẹn" → "Phản hồi") needs modification.
