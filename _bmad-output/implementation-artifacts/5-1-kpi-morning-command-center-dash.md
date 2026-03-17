# Story 5.1: KPI "Morning Command Center" Dash (Doanh Thu)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Quản lý Tiệm / Chủ (Owner),
I want thấy ngay Bảng Dashboard mở Sáng (Trang Chủ Ops): Biểu Đồ Doanh Thu, Báo Cáo Xu Hướng, và Liệt Kê Nhanh (5 Giây) Số lượng Orders Đang Khóa Hướng Tới (Pending), Đơn Hôm Nay,
so that không mất công Dò Tìm.

## Acceptance Criteria

1. **Given** Owner đăng nhập thành công, **When** navigate tới `/owner`, **Then** hiển thị Dashboard Command Mode layout với collapsible sidebar navigation và KPI overview area trong < 2s load time.

2. **Given** Owner đang ở Dashboard, **When** page load hoàn tất, **Then** hiển thị Revenue Metric Cards gồm 3 cards: Doanh thu Ngày / Tuần / Tháng với trend arrows (↑ xanh lá / ↓ đỏ) so sánh với kỳ trước.

3. **Given** Owner đang ở Dashboard, **When** data loaded, **Then** hiển thị Bar Chart trực quan hóa doanh thu theo ngày trong tuần hiện tại (7 ngày), với date range selector cho phép chọn Tuần/Tháng.

4. **Given** Owner đang ở Dashboard, **When** data loaded, **Then** hiển thị Order Statistics card: tổng số đơn (Buy vs Rent breakdown), phân theo trạng thái (Pending, Confirmed, In Production, Shipped, Delivered).

5. **Given** Owner đang ở Dashboard, **When** có đơn hàng đang sản xuất với deadline < 7 ngày, **Then** hiển thị Production Alerts section với danh sách garments cần chú ý kèm countdown badge.

6. **Given** Owner đang ở Dashboard, **When** data loaded, **Then** hiển thị Appointments Today list: danh sách lịch hẹn hôm nay với tên khách, slot (Sáng/Chiều), trạng thái.

7. **Given** Owner đang ở Dashboard, **When** click vào bất kỳ KPI card nào, **Then** có thể deep-dive (navigate) tới trang chi tiết tương ứng (Orders, Appointments, etc.).

8. **Given** Owner đang ở Dashboard, **When** sidebar navigation hiển thị, **Then** có đầy đủ menu items: Dashboard (active), Sản phẩm, Kho hàng, Đơn hàng, Lịch hẹn, Khách hàng, Nhân viên, Quy tắc, với collapsible behavior trên mobile/tablet.

## Tasks / Subtasks

- [x] Task 1: Backend — Create KPI aggregation API endpoint (AC: #1, #2, #3, #4, #5, #6)
  - [x] 1.1: Create `/api/v1/kpi/quick-glance` endpoint in `backend/src/api/v1/kpi.py`
  - [x] 1.2: Create `kpi_service.py` with aggregation queries (revenue daily/weekly/monthly, order counts by status, production alerts, today's appointments)
  - [x] 1.3: Create Pydantic response models in `backend/src/models/kpi.py` (KPIQuickGlanceResponse)
  - [x] 1.4: Register kpi router in `backend/src/main.py`
  - [x] 1.5: Add authentication guard — require Owner role (uses OwnerOnly + TenantId dependencies)

- [x] Task 2: Frontend — Create Workplace Sidebar Layout (AC: #8)
  - [x] 2.1: Create `frontend/src/app/(workplace)/layout.tsx` with collapsible sidebar + main content area
  - [x] 2.2: Create `frontend/src/components/client/workplace/WorkplaceSidebar.tsx` client component
  - [x] 2.3: Implement sidebar menu items with active state detection via `usePathname()`
  - [x] 2.4: Implement responsive behavior: persistent sidebar on desktop (≥1024px), collapsible overlay on tablet/mobile
  - [x] 2.5: Apply Command Mode styling (dense layout, Indigo Depth sidebar, white content area)

- [x] Task 3: Frontend — Create KPI Dashboard Components (AC: #2, #3, #4, #5, #6)
  - [x] 3.1: Create `frontend/src/components/client/dashboard/KPICard.tsx` — Revenue metric card with trend arrow
  - [x] 3.2: Create `frontend/src/components/client/dashboard/RevenueChart.tsx` — Bar chart using recharts
  - [x] 3.3: Create `frontend/src/components/client/dashboard/OrderStatsCard.tsx` — Order count breakdown with StatusBadge
  - [x] 3.4: Create `frontend/src/components/client/dashboard/ProductionAlerts.tsx` — Alert list with countdown badges
  - [x] 3.5: Create `frontend/src/components/client/dashboard/AppointmentsTodayCard.tsx` — Today's appointment list

- [x] Task 4: Frontend — Integrate Dashboard Page (AC: #1, #7)
  - [x] 4.1: Create Server Action `frontend/src/app/actions/kpi-actions.ts` to fetch KPI data
  - [x] 4.2: Rewrite `frontend/src/app/(workplace)/owner/page.tsx` — Replace placeholder with KPI dashboard layout
  - [x] 4.3: Create `frontend/src/components/client/dashboard/OwnerDashboardClient.tsx` — Client wrapper with TanStack Query for auto-refresh (60s staleTime + refetchInterval)
  - [x] 4.4: Wire KPICard click handlers to navigate to respective detail pages (Orders, Appointments)
  - [x] 4.5: Add loading skeletons for all dashboard cards

- [x] Task 5: Frontend — Create TypeScript types (AC: all)
  - [x] 5.1: Create `frontend/src/types/kpi.ts` — KPI response interfaces matching backend Pydantic models

## Dev Notes

### Architecture Patterns & Constraints

- **Authoritative Server Pattern:** All KPI calculations MUST happen on Backend. Frontend only renders pre-calculated data.
- **API Response Wrapper:** All endpoints return `{ "data": {...}, "meta": {} }` format.
- **Command Mode Layout:** Owner/Tailor pages use dense layout (8-12px gaps) with `mode-command` class. NOT Boutique Mode.
- **Server Actions for Auth:** Every Server Action calling authenticated endpoints MUST: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }`.
- **TanStack Query:** Use for KPI data fetching with `staleTime: 60_000` (auto-refresh every 60s). Do NOT use Zustand for server data.
- **snake_case API payloads:** All JSON body/params use snake_case. Frontend remaps to camelCase locally.

### Key Technical Decisions

- **Chart Library:** Use `recharts` (React-native, composable, works well with Next.js SSR). Already no charting library in project — will be first addition.
- **Sidebar Pattern:** Follows UX spec "Collapsible left sidebar (Dashboard, Orders, Production, CRM)" from Role-Based Navigation section.
- **No WebSockets:** KPI data refreshed via TanStack Query polling, not real-time push.

### Database Queries Required (KPI Service)

Revenue aggregation queries against `orders` table:
- Daily revenue: `SUM(total_amount) WHERE DATE(created_at) = today AND status != 'cancelled'`
- Weekly revenue: `SUM(total_amount) WHERE created_at >= start_of_week`
- Monthly revenue: `SUM(total_amount) WHERE created_at >= start_of_month`
- Trend calculation: Compare current period vs previous period, return percentage change

Order stats queries:
- Count by status: `GROUP BY status WHERE tenant_id = ?`
- Buy vs Rent breakdown: `GROUP BY transaction_type` from `order_items`

Production alerts:
- Query `order_items` WHERE `transaction_type = 'buy'` AND parent order `status = 'in_production'` AND deadline within 7 days
- Note: Current DB schema has no explicit `deadline` column on orders. **Dev must add `production_deadline` column to `orders` table** or calculate from `created_at + estimated_days`.

Appointments today:
- Query `appointments` WHERE `appointment_date = today` AND `tenant_id = ?`

### Source Tree Components to Touch

**New files:**
- `backend/src/api/v1/kpi.py` — KPI router
- `backend/src/services/kpi_service.py` — Aggregation logic
- `backend/src/models/kpi.py` — Pydantic response models
- `frontend/src/app/(workplace)/layout.tsx` — Workplace layout with sidebar
- `frontend/src/components/client/workplace/WorkplaceSidebar.tsx` — Sidebar component
- `frontend/src/components/client/dashboard/KPICard.tsx`
- `frontend/src/components/client/dashboard/RevenueChart.tsx`
- `frontend/src/components/client/dashboard/OrderStatsCard.tsx`
- `frontend/src/components/client/dashboard/ProductionAlerts.tsx`
- `frontend/src/components/client/dashboard/AppointmentsTodayCard.tsx`
- `frontend/src/components/client/dashboard/OwnerDashboardClient.tsx`
- `frontend/src/app/actions/kpi-actions.ts`
- `frontend/src/types/kpi.ts`

**Modified files:**
- `frontend/src/app/(workplace)/owner/page.tsx` — Replace placeholder with real dashboard
- `backend/src/main.py` — Register KPI router
- `backend/src/models/db_models.py` — Add `production_deadline` to OrderDB (if needed)

### Existing Code Patterns to Follow

**Server Action pattern** (from `garment-actions.ts`):
```typescript
"use server";
import { auth } from "@/auth";
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

export async function fetchKPIQuickGlance() {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");

  const res = await fetch(`${BACKEND_URL}/api/v1/kpi/quick-glance`, {
    headers: { Authorization: `Bearer ${session.accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Failed to fetch KPI data");
  const json = await res.json();
  return json.data;
}
```

**Client component with TanStack Query** (from existing patterns):
```typescript
"use client";
import { useQuery } from "@tanstack/react-query";

export function OwnerDashboardClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["kpi-quick-glance"],
    queryFn: () => fetchKPIQuickGlance(),
    staleTime: 60_000,
  });
  // ... render KPI cards
}
```

**Backend router pattern** (from `orders.py`):
```python
router = APIRouter(prefix="/api/v1/kpi", tags=["kpi"])

@router.get("/quick-glance", response_model=dict)
async def get_quick_glance(
    db: AsyncSession = Depends(get_db),
    current_user: UserDB = Depends(get_current_owner),  # Auth guard
) -> dict:
    result = await kpi_service.get_quick_glance(db, tenant_id)
    return {"data": result.model_dump(mode="json"), "meta": {}}
```

### Heritage Design Tokens (Command Mode)

```css
/* Command Mode — Dense Layout for Owner/Tailor */
background: #FFFFFF (Pure White)
text-primary: #1A1A2E (Deep Charcoal)
primary: #1A2B4C (Indigo Depth)
accent: #D4AF37 (Heritage Gold)
spacing: 8-12px gaps
font: Inter (sans-serif) for data display
border-radius: 8px cards, 12px main sections
shadows: sm for cards, md for sidebar
```

### StatusBadge Color Mapping

| Status | Color | Tailwind Class |
|:---|:---|:---|
| Pending | Amber | `bg-amber-100 text-amber-800` |
| Confirmed | Blue | `bg-blue-100 text-blue-800` |
| In Production | Indigo | `bg-indigo-100 text-indigo-800` |
| Shipped | Purple | `bg-purple-100 text-purple-800` |
| Delivered | Green | `bg-emerald-100 text-emerald-800` |
| Cancelled | Red | `bg-red-100 text-red-800` |

### Testing Standards

- Backend: Unit tests for `kpi_service.py` aggregation logic with mock DB data
- Frontend: Component tests for KPICard rendering with mock data
- E2E: Verify Owner role guard (non-Owner redirect to `/`)
- Performance: Dashboard page load < 2s, API response < 300ms

### ⚠️ Critical Warnings for Dev Agent

1. **DO NOT** calculate revenue or order stats on Frontend. Backend is SSOT.
2. **DO NOT** use `middleware.ts` for auth. Use `proxy.ts` and Server Actions pattern.
3. **DO NOT** hardcode tenant_id in Frontend. Extract from session/backend.
4. **DO NOT** skip the `(workplace)/layout.tsx` creation — it's shared between Owner AND Tailor dashboards.
5. **DO NOT** use `localStorage` for any data caching. Use TanStack Query.
6. **DO NOT** use English labels in UI. All text in Vietnamese: "Doanh thu", "Đơn hàng", "Lịch hẹn", etc.
7. **MUST** install `recharts` as new dependency for chart rendering.
8. **MUST** reuse existing `StatusBadge` patterns if they exist, or create a shared component.

### Project Structure Notes

- Alignment with unified project structure: Dashboard components go in `components/client/dashboard/` (Client Components).
- Workplace sidebar is shared between Owner and Tailor — placed in `components/client/workplace/`.
- Server page (`owner/page.tsx`) fetches initial data, passes to Client component.
- Detected: No `(workplace)/layout.tsx` exists — MUST be created as shared layout for all workplace routes.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 5.1] — User story & AC
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR55-FR61] — Operations Dashboard FRs
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture] — Dual-Mode UI, TanStack Query, Zustand rules
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#KPICard] — Component spec (states, variants)
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Role-Based Navigation] — Collapsible sidebar for Owner/Tailor
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Language] — Heritage Palette, spacing, typography
- [Source: _bmad-output/project-context.md] — All critical implementation rules
- [Source: backend/src/models/db_models.py] — OrderDB, AppointmentDB, GarmentDB schemas
- [Source: backend/src/api/v1/orders.py] — Existing API pattern
- [Source: frontend/src/app/(workplace)/owner/page.tsx] — Current placeholder to replace

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Pre-existing `proxy.ts` TypeScript error confirmed (not introduced by this story)
- recharts Tooltip formatter type fixed (ValueType → Number cast)

### Completion Notes List

- Backend: Created KPI aggregation API with single optimized SQL query for revenue (daily/weekly/monthly with trend %), order stats (by status + buy/rent), production alerts (>7 days in_production), and today's appointments
- Backend: Used existing `OwnerOnly` and `TenantId` dependencies for auth guard
- Backend: Added `chart_range` query param (week/month) for revenue chart flexibility
- Frontend: Created shared `(workplace)/layout.tsx` with collapsible sidebar for Owner/Tailor
- Frontend: WorkplaceSidebar with role-aware navigation (Owner 8 items, Tailor 3 items), mobile overlay, Indigo Depth color scheme
- Frontend: 5 dashboard components (KPICard, RevenueChart with date range selector, OrderStatsCard, ProductionAlerts, AppointmentsTodayCard)
- Frontend: OwnerDashboardClient with TanStack Query (60s auto-refresh), loading skeletons, proper error state
- Frontend: recharts installed as new dependency for bar chart visualization
- All UI text in Vietnamese as required (including appointment status labels)

### Change Log

- 2026-03-14: Story 5.1 implementation complete — Owner KPI Dashboard with sidebar layout
- 2026-03-14: Code review fixes — 8 issues resolved (3 HIGH, 4 MEDIUM, 1 LOW):
  - [H1] Added date range selector (Tuần/Tháng) to RevenueChart (AC#3)
  - [H2] Fixed error state: server action throws on error instead of returning null
  - [H3] Made sidebar role-aware with Owner/Tailor menu separation
  - [M1] Fixed revenue query boundary (>= and < instead of between)
  - [M2] Fixed signout to use signOut() POST instead of GET anchor
  - [M3] Replaced hardcoded shop name with dynamic prop
  - [M4] Added package-lock.json to File List
  - [L1] Added Vietnamese labels for appointment status display

### File List

**New files:**
- `backend/src/api/v1/kpi.py`
- `backend/src/models/kpi.py`
- `backend/src/services/kpi_service.py`
- `frontend/src/app/(workplace)/layout.tsx`
- `frontend/src/app/actions/kpi-actions.ts`
- `frontend/src/components/client/dashboard/KPICard.tsx`
- `frontend/src/components/client/dashboard/RevenueChart.tsx`
- `frontend/src/components/client/dashboard/OrderStatsCard.tsx`
- `frontend/src/components/client/dashboard/ProductionAlerts.tsx`
- `frontend/src/components/client/dashboard/AppointmentsTodayCard.tsx`
- `frontend/src/components/client/dashboard/OwnerDashboardClient.tsx`
- `frontend/src/components/client/workplace/WorkplaceSidebar.tsx`
- `frontend/src/types/kpi.ts`
- `_bmad-output/implementation-artifacts/5-1-kpi-morning-command-center-dash.md`

**Modified files:**
- `backend/src/main.py` — Added KPI router registration
- `frontend/src/app/(workplace)/owner/page.tsx` — Replaced placeholder with real dashboard
- `frontend/package.json` — Added recharts dependency
- `frontend/package-lock.json` — Updated lock file for recharts
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated epic-5 and story status
