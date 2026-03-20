# Story 5.4: Tính Lương/Thu Nhập Thợ (Costing Calculations)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Thợ Nghề (Tailor),
I want Hiển Thị Gầm Góc Màn Hình Biểu Đồ Doanh Thu Tính Công / Định Mức Áo Dài Tôi Thực Hiện Tháng Này vs Tháng Trước,
So that tôi yên tâm mức Lương + Đạt Động Lực "Thành Tựu".

## Acceptance Criteria

1. **Given** Tailor đang ở Dashboard (`/tailor`), **When** page load hoàn tất, **Then** hiển thị Income Summary Widget ở dưới task list, gồm: Tổng Thu Nhập Tháng Này, Tổng Thu Nhập Tháng Trước, và Tỷ lệ tăng/giảm (% change), trong < 2s load time.

2. **Given** Tailor đang ở Dashboard, **When** income data loaded, **Then** hiển thị Column Chart (Bar chart dọc) so sánh thu nhập tháng hiện tại vs tháng trước, với mỗi cột đại diện cho tổng piece-rate hoàn thành trong tháng đó.

3. **Given** Tailor hoàn thành một task (chuyển status → `completed`), **When** TanStack Query invalidates, **Then** Income Summary Widget + Chart tự động cập nhật phản ánh piece-rate mới cộng dồn, không cần page reload.

4. **Given** Backend nhận request tính thu nhập, **When** API `/api/v1/tailor-tasks/my-income` được gọi, **Then** trả về tổng piece_rate của tất cả completed tasks grouped by month (current + previous), cùng task count và percentage change.

5. **Given** Tailor không có completed tasks trong tháng, **When** income data loaded, **Then** hiển thị 0₫ với chart column rỗng/minimal, kèm message khuyến khích "Chưa có công việc hoàn thành tháng này".

6. **Given** Income Widget hiển thị, **When** thu nhập tháng này > tháng trước, **Then** hiển thị indicator xanh (Jade Green) mũi tên lên với % tăng. Ngược lại, indicator đỏ mũi tên xuống với % giảm.

## Tasks / Subtasks

- [x] Task 1: Backend — Create Income Calculation Service (AC: #4, #5)
  - [x] 1.1: Add method `get_tailor_monthly_income(db, tailor_id, tenant_id)` to `backend/src/services/tailor_task_service.py` — Query `tailor_tasks` WHERE `assigned_to = tailor_id` AND `status = 'completed'` AND `tenant_id = tenant_id`, GROUP BY `EXTRACT(YEAR FROM completed_at)`, `EXTRACT(MONTH FROM completed_at)`, SUM `piece_rate`. Return current month + previous month totals.
  - [x] 1.2: Add Pydantic response models to `backend/src/models/tailor_task.py`: `TailorMonthlyIncome` (month, year, total_income, task_count), `TailorIncomeResponse` (current_month: TailorMonthlyIncome, previous_month: TailorMonthlyIncome, percentage_change: float | None)

- [x] Task 2: Backend — Create Income API Endpoint (AC: #4)
  - [x] 2.1: Add `GET /api/v1/tailor-tasks/my-income` endpoint to `backend/src/api/v1/tailor_tasks.py` — Uses `require_roles("Owner", "Tailor")` auth guard + `tenant_id` isolation. Returns `{ "data": TailorIncomeResponse, "meta": {} }`.
  - [x] 2.2: Handle edge cases: no completed tasks (return 0 values), NULL piece_rate tasks (exclude from sum or treat as 0).

- [x] Task 3: Frontend — Create TypeScript Types (AC: all)
  - [x] 3.1: Add `TailorMonthlyIncome` and `TailorIncomeResponse` interfaces to `frontend/src/types/tailor-task.ts` matching backend Pydantic models.

- [x] Task 4: Frontend — Create Server Action (AC: #3, #4)
  - [x] 4.1: Add `fetchMyIncome()` to `frontend/src/app/actions/tailor-task-actions.ts` — Follow existing pattern: `auth()` → Bearer token → `fetch(BACKEND_URL + "/api/v1/tailor-tasks/my-income")` → return `TailorIncomeResponse`.

- [x] Task 5: Frontend — Create Income Widget Components (AC: #1, #2, #5, #6)
  - [x] 5.1: Create `frontend/src/components/client/tailor/IncomeWidget.tsx` — Container component with TanStack Query for income data. Uses `useQuery({ queryKey: ["tailor-income"], queryFn: fetchMyIncome, staleTime: 60_000 })`.
  - [x] 5.2: Create `frontend/src/components/client/tailor/IncomeSummaryCards.tsx` — 3 metric cards: "Thu Nhập Tháng Này" (Heritage Gold accent), "Tháng Trước" (muted), "Tăng Trưởng %" (Jade Green ↑ or Red ↓). Format: `formatVND()`. Use JetBrains Mono for numbers.
  - [x] 5.3: Create `frontend/src/components/client/tailor/IncomeChart.tsx` — Recharts BarChart (same library as Owner RevenueChart). Two columns: "Tháng trước" (muted gray `#E5E7EB`) and "Tháng này" (Heritage Gold `#D4AF37`). Y-axis: formatVND. Tooltip shows exact VND value.
  - [x] 5.4: Handle empty state (AC #5): When both months = 0, show centered message "Chưa có công việc hoàn thành tháng này" with icon.

- [x] Task 6: Frontend — Integrate Income Widget into Tailor Dashboard (AC: #1, #3)
  - [x] 6.1: Add `<IncomeWidget />` to `TailorDashboardClient.tsx` — Place below TaskList section. Wire TanStack Query invalidation: when task status mutation succeeds (`onSettled`), also invalidate `["tailor-income"]` queryKey.
  - [x] 6.2: Add loading skeleton for IncomeWidget matching Command Mode density.
  - [x] 6.3: Add `data-testid` attributes to all income components per project testing standard.

- [x] Task 7: Backend — Unit Tests (AC: #4, #5)
  - [x] 7.1: Add tests to `backend/tests/test_tailor_task_service.py`:
    - Test income calculation with multiple completed tasks (correct sum)
    - Test income calculation with no completed tasks (returns 0)
    - Test income calculation excludes non-completed tasks
    - Test income calculation excludes NULL piece_rate tasks
    - Test percentage change calculation (positive, negative, zero denominator)
    - Test tenant isolation (tailor A cannot see tailor B's income)

## Dev Notes

### Architecture Patterns & Constraints

- **Authoritative Server Pattern:** ALL income calculations MUST happen on Backend. Frontend ONLY displays data from API. DO NOT sum piece_rate on client side.
- **API Response Wrapper:** All endpoints return `{ "data": {...}, "meta": {} }` format.
- **Command Mode Layout:** Income widget uses dense layout (8-12px gaps) matching existing Tailor Dashboard.
- **TanStack Query:** Use for income data fetching with `staleTime: 60_000`. Invalidate `["tailor-income"]` when task status changes via `queryClient.invalidateQueries` in existing `statusMutation.onSettled`.
- **snake_case API payloads:** All JSON fields use snake_case. TypeScript interfaces match snake_case for SSOT sync.

### Key Technical Decisions

- **Recharts (NOT a new library):** Use Recharts `BarChart` already installed and used by `RevenueChart.tsx` in Owner Dashboard. DO NOT install a new charting library.
- **Income endpoint as extension:** Add to existing `tailor_tasks.py` router (NOT a new router). The income is derived from `tailor_tasks` data.
- **Monthly grouping:** Use `completed_at` field (already in TailorTaskDB) for month extraction, NOT `created_at` or `updated_at`.
- **Percentage change formula:** `((current - previous) / previous) * 100`. Handle `previous = 0` → show `null` or "N/A" instead of infinity.
- **No pagination needed:** Income summary is always 2 months (current + previous). Simple aggregation query.

### Database Schema — Existing (from Story 5.3)

```python
class TailorTaskDB(Base):
    __tablename__ = "tailor_tasks"
    # ... existing fields ...
    piece_rate: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="assigned")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    assigned_to: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
```

**No new migration needed.** All required fields (`piece_rate`, `completed_at`, `assigned_to`, `tenant_id`) already exist.

### SQL Query Pattern for Income Calculation

```sql
SELECT
  EXTRACT(YEAR FROM completed_at) AS year,
  EXTRACT(MONTH FROM completed_at) AS month,
  COALESCE(SUM(piece_rate), 0) AS total_income,
  COUNT(*) AS task_count
FROM tailor_tasks
WHERE assigned_to = :tailor_id
  AND tenant_id = :tenant_id
  AND status = 'completed'
  AND piece_rate IS NOT NULL
  AND completed_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
GROUP BY EXTRACT(YEAR FROM completed_at), EXTRACT(MONTH FROM completed_at)
ORDER BY year DESC, month DESC
LIMIT 2;
```

### Previous Story Intelligence (Story 5.3)

**Patterns established:**
- Server Actions in `tailor-task-actions.ts` follow `kpi-actions.ts` pattern: `auth()` → Bearer token → `fetch` with AbortController timeout
- TailorDashboardClient uses `useQuery` + `useMutation` with optimistic updates
- Task status mutation already invalidates `["tailor-tasks"]` and `["tailor-task-summary"]` → add `["tailor-income"]` to `onSettled`
- TaskRow already shows `piece_rate` per task (formatPieceRate function exists)
- Command Mode layout with 8-12px gaps, Heritage tokens already applied

**Code Review lessons to apply:**
- Always use `data-testid` attributes on new components
- Use Pydantic `Literal` types for constrained string fields
- Ensure multi-tenant isolation on ALL endpoints (filter by tenant_id)
- Use `joinedload` for relationships if needed (probably not for aggregation query)
- DRY: reuse existing format functions like `formatVND` / `formatPieceRate` from TaskRow

### Existing Code to Reuse

| What | Where | Usage |
|:---|:---|:---|
| Recharts BarChart | `frontend/src/components/client/dashboard/RevenueChart.tsx` | Copy chart pattern — BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer |
| `formatVND()` function | `RevenueChart.tsx:12-16` | VND formatting (1tr, 500k, etc.) — extract to shared util or copy |
| Server Action pattern | `frontend/src/app/actions/tailor-task-actions.ts` | Auth + fetch pattern for new `fetchMyIncome()` |
| TanStack Query setup | `frontend/src/components/client/tailor/TailorDashboardClient.tsx` | Add income query alongside existing task queries |
| Query invalidation | `TailorDashboardClient.tsx` statusMutation `onSettled` | Add `["tailor-income"]` invalidation |
| Heritage Design Tokens | `TaskSummaryCards.tsx`, `TaskRow.tsx` | Color palette, spacing, typography |
| Auth guard pattern | `backend/src/api/v1/tailor_tasks.py` | `require_roles("Owner", "Tailor")` + `get_tenant_id_from_user` |
| Service method pattern | `backend/src/services/tailor_task_service.py` | Add new method to existing service |

### Heritage Design Tokens (Command Mode)

```
background: #FFFFFF (Pure White)
text-primary: #1A1A2E (Deep Charcoal)
primary: #1A2B4C (Indigo Depth)
accent/chart-current: #D4AF37 (Heritage Gold) — "Tháng này" column
chart-previous: #E5E7EB (Gray 200) — "Tháng trước" column
success: #059669 (Jade Green) — positive change indicator
danger: #DC2626 (Red 600) — negative change indicator
numeric-font: JetBrains Mono (if loaded) or monospace fallback
spacing: 8-12px gaps
border-radius: 8px cards
```

### UX Requirements

- **"First Glance = Full Picture"**: Income widget phải truyền tải thông tin thu nhập chính trong 5 giây.
- **Income Preview pattern**: Summary cards (số lớn, đơn vị nhỏ) + Chart (visual comparison).
- **Achievement feel**: Khi tháng này > tháng trước → Jade Green accent, mũi tên lên, cảm giác tích cực.
- **Desktop/Tablet-first**: Dense layout, số liệu rõ ràng.
- **Vietnamese labels**: "Thu Nhập Tháng Này", "Tháng Trước", "Tăng Trưởng", "Tổng Tiền Công", "sản phẩm".

### Critical Warnings for Dev Agent

1. **DO NOT** calculate income totals on Frontend. Backend is SSOT — only display API response.
2. **DO NOT** install a new charting library. Use Recharts already in `package.json` (used by RevenueChart).
3. **DO NOT** create a new API router file. Add endpoint to existing `tailor_tasks.py`.
4. **DO NOT** create a new service file. Add method to existing `tailor_task_service.py`.
5. **DO NOT** use `localStorage` or Zustand for income data. Use TanStack Query exclusively.
6. **DO NOT** forget to add `["tailor-income"]` invalidation to existing `statusMutation.onSettled` in TailorDashboardClient.
7. **DO NOT** use English labels in UI. All text in Vietnamese.
8. **DO NOT** include tasks with `piece_rate IS NULL` in the sum — these are unpriced tasks.
9. **DO NOT** create a new DB migration — all required columns already exist.
10. **MUST** use `completed_at` (NOT `updated_at`) for monthly grouping — this is the accurate completion timestamp.
11. **MUST** handle division by zero for percentage change when previous month = 0.
12. **MUST** add `data-testid` attributes to ALL new components.
13. **MUST** ensure multi-tenant isolation with `tenant_id` filter on the income query.

### Project Structure Notes

- Income components go in `frontend/src/components/client/tailor/` (alongside existing Tailor components).
- IncomeWidget integrates into existing `TailorDashboardClient.tsx` — not a separate page.
- Backend endpoint added to existing `backend/src/api/v1/tailor_tasks.py` router.
- Backend service method added to existing `backend/src/services/tailor_task_service.py`.
- No new files needed for types — extend existing `tailor-task.ts` and `tailor_task.py`.
- New files: `IncomeWidget.tsx`, `IncomeSummaryCards.tsx`, `IncomeChart.tsx` (3 frontend components only).

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.4] — User story & AC
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 5] — Epic context (FR55-FR65)
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Dual-Mode UI, TanStack Query, Zustand rules
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns] — REST API response wrapper
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Tailor Production Flow] — Achievement feeling, income preview
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Language] — Heritage Palette, Command Mode density
- [Source: _bmad-output/project-context.md] — Authoritative Server Pattern, Vietnamese terminology, No middleware.ts
- [Source: _bmad-output/implementation-artifacts/5-3-workstation-production-flow-dash-cho-tho-tiem.md] — Previous story patterns, TailorTaskDB schema, code review learnings
- [Source: frontend/src/components/client/dashboard/RevenueChart.tsx] — Recharts BarChart pattern to reuse
- [Source: frontend/src/components/client/tailor/TailorDashboardClient.tsx] — TanStack Query + mutation pattern, query invalidation
- [Source: frontend/src/app/actions/tailor-task-actions.ts] — Server Action auth pattern
- [Source: backend/src/services/tailor_task_service.py] — Existing service to extend
- [Source: backend/src/api/v1/tailor_tasks.py] — Existing router to extend

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

None.

### Completion Notes List

- Task 1: Added `TailorMonthlyIncome` + `TailorIncomeResponse` Pydantic models to `tailor_task.py`. Added `get_tailor_monthly_income()` service method using SQLAlchemy aggregate query (func.sum, func.extract) grouped by year/month of `completed_at`. Handles NULL piece_rate exclusion, empty months (returns 0), and percentage_change=None when previous=0 (division by zero guard).
- Task 2: Added `GET /api/v1/tailor-tasks/my-income` endpoint to existing `tailor_tasks.py` router. Placed before the `/{task_id}` catch-all path to avoid routing conflicts. Uses `OwnerOrTailor` auth guard + `TenantId` dependency for multi-tenant isolation.
- Task 3: Added `TailorMonthlyIncome` + `TailorIncomeResponse` TypeScript interfaces to `tailor-task.ts`, matching backend Pydantic models with snake_case fields.
- Task 4: Added `fetchMyIncome()` Server Action to `tailor-task-actions.ts` following existing auth pattern (`getAuthToken()` + `createAbortController()`).
- Task 5: Created 3 new frontend components: `IncomeWidget.tsx` (container with TanStack Query + loading skeleton + empty state), `IncomeSummaryCards.tsx` (3 metric cards: current month Heritage Gold, previous month muted, percentage change green/red), `IncomeChart.tsx` (Recharts BarChart with Cell-based coloring: gray for previous, Heritage Gold for current).
- Task 6: Integrated `<IncomeWidget />` into `TailorDashboardClient.tsx` below TaskList. Added `["tailor-income"]` invalidation to `statusMutation.onSettled` so income updates when tasks are completed.
- Task 7: Added 7 income unit tests to `test_tailor_task_service.py`. All 21 tests pass (7 new + 14 pre-existing). Full regression: 673 passed, 9 pre-existing failures (test_rental_service, test_sanity_check, test_staff — unrelated to this story).
- TypeScript: Zero errors in new Story 5.4 files. Pre-existing TS errors in test files and other components unchanged.

### File List

- backend/src/models/tailor_task.py (modified — added TailorMonthlyIncome, TailorIncomeResponse Pydantic models)
- backend/src/services/tailor_task_service.py (modified — added get_tailor_monthly_income() method + updated imports)
- backend/src/api/v1/tailor_tasks.py (modified — added GET /my-income endpoint)
- backend/tests/test_tailor_task_service.py (modified — added 7 income unit tests)
- frontend/src/types/tailor-task.ts (modified — added TailorMonthlyIncome, TailorIncomeResponse interfaces)
- frontend/src/app/actions/tailor-task-actions.ts (modified — added fetchMyIncome() Server Action)
- frontend/src/components/client/tailor/IncomeWidget.tsx (new)
- frontend/src/components/client/tailor/IncomeSummaryCards.tsx (new)
- frontend/src/components/client/tailor/IncomeChart.tsx (new)
- frontend/src/components/client/tailor/TailorDashboardClient.tsx (modified — added IncomeWidget + ["tailor-income"] invalidation)
