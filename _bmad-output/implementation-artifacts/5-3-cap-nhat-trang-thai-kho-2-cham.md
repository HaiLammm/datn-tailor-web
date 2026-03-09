# Story 5.3: Cap nhat trang thai Kho "2 cham" (2-Touch Inventory Update)

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Chu tiem (Co Lan)** (Owner),
I want **cap nhat trang thai do thue chi voi 2 lan cham man hinh**,
So that **tiet kiem thoi gian quan tri va du lieu kho luon chinh xac**.

## Acceptance Criteria

1. **Given** Co Lan dang xem danh sach quan ly kho tren thiet bi di dong
   **When** He thong hien thi danh sach tat ca bo do
   **Then** Moi bo do hien thi: Ten, hinh anh thu nho, trang thai hien tai (Available/Rented/Maintenance), va ngay du kien tra do (neu co)
   **And** Danh sach duoc sap xep theo trang thai: Rented truoc, Maintenance tiep theo, Available cuoi cung

2. **Given** Co Lan dang xem danh sach quan ly kho
   **When** Cham 1: Chon mot bo do (tap vao hang/the san pham)
   **Then** He thong hien thi cac tuy chon trang thai kha dung duoi dang cac nut lon (>= 44x44px):
   - "San sang" (Available) - mau xanh
   - "Dang thue" (Rented) - mau vang ho phach
   - "Bao tri" (Maintenance) - mau xam
   **And** Trang thai hien tai duoc danh dau (highlighted/disabled) de tranh cap nhat trung lap

3. **Given** Co Lan da chon mot bo do va thay cac tuy chon trang thai
   **When** Cham 2: Chon trang thai moi (vd: "Bao tri")
   **Then** He thong ngay lap tuc cap nhat trang thai moi trong database
   **And** Hien thi micro-toast xac nhan: "Da cap nhat: [Ten bo do] -> [Trang thai moi]"
   **And** Danh sach tu dong cap nhat vi tri sap xep moi cua bo do

4. **Given** Co Lan chon trang thai "Dang thue" (Rented)
   **When** He thong cap nhat trang thai
   **Then** Hien thi them truong nhap "Ngay du kien tra do" (date picker)
   **And** Ngay tra do phai la ngay trong tuong lai (validation)
   **And** Luu `expected_return_date` cung voi `status` update

5. **Given** Co Lan chon trang thai "Bao tri" (Maintenance) hoac "San sang" (Available)
   **When** He thong cap nhat trang thai
   **Then** Tu dong xoa `expected_return_date` (set null)
   **And** Cap nhat thanh cong khong can nhap them thong tin

6. **Given** Co Lan dang o trang quan ly kho
   **When** He thong gap loi mang hoac API
   **Then** Hien thi thong bao loi ro rang: "Cap nhat that bai. Vui long thu lai."
   **And** Trang thai hien thi khong bi thay doi (optimistic update bi rollback)

## Tasks / Subtasks

- [ ] **Task 1: Backend - Dedicated Status Update Endpoint** (AC: #2, #3, #4, #5)
  - [ ] 1.1 Create `GarmentStatusUpdate` Pydantic model in `backend/src/models/garment.py`: `status: GarmentStatus` (required), `expected_return_date: date | None = None`
  - [ ] 1.2 Add validation: if `status == "rented"`, `expected_return_date` must be provided and in the future; if `status != "rented"`, `expected_return_date` must be None (auto-clear)
  - [ ] 1.3 Add `update_garment_status()` function in `backend/src/services/garment_service.py` - focused status update with date logic
  - [ ] 1.4 Add `PATCH /api/v1/garments/{garment_id}/status` endpoint in `backend/src/api/v1/garments.py` - Owner only (`OwnerOnly` dependency)
  - [ ] 1.5 Endpoint returns updated `GarmentResponse` (with computed `days_until_available` and `is_overdue`)

- [ ] **Task 2: Backend - Inventory List Enhancement** (AC: #1)
  - [ ] 2.1 Add `sort_by_status: bool = False` parameter to `list_garments()` in `garment_service.py`
  - [ ] 2.2 When `sort_by_status=True`, order: rented first, maintenance second, available last (use SQL CASE expression)
  - [ ] 2.3 Add `sort_by_status` query param to `GET /api/v1/garments` endpoint

- [ ] **Task 3: Backend Tests** (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 3.1 Test PATCH status update: available -> rented (with expected_return_date) -> 200
  - [ ] 3.2 Test PATCH status update: rented -> maintenance (auto-clear expected_return_date) -> 200
  - [ ] 3.3 Test PATCH status update: maintenance -> available (auto-clear expected_return_date) -> 200
  - [ ] 3.4 Test PATCH rented without expected_return_date -> 422 validation error
  - [ ] 3.5 Test PATCH rented with past expected_return_date -> 422 validation error
  - [ ] 3.6 Test PATCH same status (no-op) -> 200 (idempotent)
  - [ ] 3.7 Test PATCH non-existent garment -> 404
  - [ ] 3.8 Test PATCH by non-Owner (Customer/Tailor) -> 403
  - [ ] 3.9 Test PATCH tenant isolation (cannot update other tenant's garment) -> 404
  - [ ] 3.10 Test sort_by_status ordering in GET /garments
  - [ ] 3.11 Verify all existing garment tests still pass (zero regressions)

- [ ] **Task 4: Frontend - Server Action for Status Update** (AC: #3, #4, #5, #6)
  - [ ] 4.1 Add `updateGarmentStatus(id: string, status: GarmentStatus, expectedReturnDate?: string)` server action in `frontend/src/app/actions/garment-actions.ts`
  - [ ] 4.2 Use `PATCH /api/v1/garments/{id}/status` with auth token (`Bearer ${session?.accessToken}`)
  - [ ] 4.3 Handle error responses (401, 403, 404, 422) with proper error messages
  - [ ] 4.4 Add `fetchInventoryList(sortByStatus?: boolean)` server action - calls existing GET endpoint with `sort_by_status=true`

- [ ] **Task 5: Frontend - InventoryCard Client Component** (AC: #1, #2, #3)
  - [ ] 5.1 Create `frontend/src/components/client/inventory/InventoryCard.tsx` ("use client")
  - [ ] 5.2 Display: thumbnail image, garment name (Cormorant Garamond), current status badge, expected_return_date if rented
  - [ ] 5.3 On tap (Touch 1): expand inline status options panel below the card
  - [ ] 5.4 Status option buttons: large touch targets (min 48x48px), color-coded per Heritage Palette
  - [ ] 5.5 Current status button is visually disabled/highlighted (cannot re-select same status)
  - [ ] 5.6 Apply Heritage Palette: Indigo Depth `#1A2B4C`, Silk Ivory `#F9F7F2`, Heritage Gold `#D4AF37`

- [ ] **Task 6: Frontend - StatusUpdatePanel Client Component** (AC: #2, #3, #4, #5, #6)
  - [ ] 6.1 Create `frontend/src/components/client/inventory/StatusUpdatePanel.tsx` ("use client")
  - [ ] 6.2 Render 3 status buttons: "San sang" (green), "Dang thue" (amber), "Bao tri" (gray)
  - [ ] 6.3 On "Dang thue" selection: show inline date picker for `expected_return_date` (min date = tomorrow)
  - [ ] 6.4 On Touch 2 (status button click): call `updateGarmentStatus()` server action
  - [ ] 6.5 Show loading spinner on the tapped button during API call
  - [ ] 6.6 On success: show micro-toast "Da cap nhat: [name] -> [status]", collapse panel, update card status
  - [ ] 6.7 On error: show error toast "Cap nhat that bai. Vui long thu lai.", revert optimistic state
  - [ ] 6.8 Use `useTransition` or `useState` for optimistic UI updates

- [ ] **Task 7: Frontend - Inventory Management Page** (AC: #1)
  - [ ] 7.1 Create `frontend/src/app/(workplace)/owner/inventory/page.tsx` as async Server Component
  - [ ] 7.2 Auth-gate: check `session.user?.role === "Owner"`, redirect to `/login` if not authenticated, redirect to `/` if wrong role
  - [ ] 7.3 Fetch garment list via `fetchInventoryList(true)` (sorted by status)
  - [ ] 7.4 Render page title "Quan ly Kho do thue" (Cormorant Garamond serif)
  - [ ] 7.5 Render `<InventoryList />` client component with garment data
  - [ ] 7.6 Add back navigation link to `/owner` dashboard
  - [ ] 7.7 Mobile-first layout: single column, generous touch spacing

- [ ] **Task 8: Frontend - InventoryList Client Component** (AC: #1)
  - [ ] 8.1 Create `frontend/src/components/client/inventory/InventoryList.tsx` ("use client")
  - [ ] 8.2 Render list of `<InventoryCard />` components
  - [ ] 8.3 Group by status section headers: "Dang thue", "Bao tri", "San sang"
  - [ ] 8.4 Re-sort list after status update (move card to correct group)

- [ ] **Task 9: Frontend - Component Barrel & Owner Dashboard Link** (AC: all)
  - [ ] 9.1 Create `frontend/src/components/client/inventory/index.ts` barrel with exports: InventoryCard, StatusUpdatePanel, InventoryList
  - [ ] 9.2 Update `frontend/src/app/(workplace)/owner/page.tsx` - add navigation link to `/owner/inventory` ("Quan ly Kho")

- [ ] **Task 10: Frontend Tests** (AC: #1, #2, #3, #4, #5, #6)
  - [ ] 10.1 Create `frontend/src/__tests__/inventoryCard.test.tsx` - test render, tap to expand, status display (6+ tests)
  - [ ] 10.2 Create `frontend/src/__tests__/statusUpdatePanel.test.tsx` - test status buttons, date picker for rented, loading state, success toast, error handling (8+ tests)
  - [ ] 10.3 Create `frontend/src/__tests__/inventoryList.test.tsx` - test grouping, re-sorting after update (4+ tests)
  - [ ] 10.4 All existing frontend tests must still pass (289 baseline from Story 5.2)
  - [ ] 10.5 All existing backend tests must still pass

## Dev Notes

### Architecture Compliance

- **Route Group:** Inventory page at `frontend/src/app/(workplace)/owner/inventory/page.tsx` (CSR/Private prioritized per architecture.md, under Owner route group)
- **Server vs Client:** Page is Server Component (auth check + data fetch). Interactive inventory cards and status panels are Client Components in `components/client/inventory/`
- **Authoritative Server:** Backend validates all status transitions and date logic. Frontend sends status change, backend validates and returns updated data
- **proxy.ts:** DO NOT create `middleware.ts`. Auth routing handled by `proxy.ts` (Next.js 16 pattern per architecture.md line 103, project-context.md line 78)
- **API Response Wrapper:** All responses use format: `{"data": {...}, "meta": {...}, "error": {...}}` (architecture.md line 161-167)
- **RBAC:** PATCH endpoint requires `OwnerOnly` dependency. Frontend server action must forward auth token

### Existing Code to Reuse (DO NOT REINVENT)

- **Garment DB model:** `GarmentDB` in `backend/src/models/db_models.py:257-285` - has `status` (String 20, indexed), `expected_return_date` (Date nullable)
- **Garment Pydantic models:** `backend/src/models/garment.py` - `GarmentStatus` enum (available/rented/maintenance), `GarmentUpdate`, `GarmentResponse` with computed fields
- **Garment service:** `backend/src/services/garment_service.py` - `update_garment()` already handles partial updates with enum-to-value conversion, flush + commit + refresh
- **Garment API router:** `backend/src/api/v1/garments.py` - PUT already uses `OwnerOnly` pattern; follow same dependency injection
- **Server actions:** `frontend/src/app/actions/garment-actions.ts` - `updateGarment()` already implements auth token forwarding pattern with AbortController timeout
- **Auth dependencies:** `OwnerOnly`, `TenantId` from `backend/src/api/dependencies.py`
- **DB session:** `Depends(get_db)` from `backend/src/core/database.py`
- **StatusBadge component:** `frontend/src/components/client/showroom/StatusBadge.tsx` - reference for status color mapping (reuse colors, do NOT duplicate component logic)
- **ReturnTimeline component:** `frontend/src/components/client/showroom/ReturnTimeline.tsx` - reference for date formatting and status display patterns
- **GarmentStatus enum (frontend):** `frontend/src/types/garment.ts` - import from here, do NOT redefine
- **Heritage Palette colors:** Indigo `#1A2B4C`, Silk Ivory `#F9F7F2`, Heritage Gold `#D4AF37`, Status colors: Available green `#059669`, Rented amber `#FEF3C7`/`#92400E`, Maintenance gray `#F3F4F6`/`#374151`
- **Owner page auth pattern:** `frontend/src/app/(workplace)/owner/page.tsx` - follow same `session.user?.role` check pattern

### Previous Story Intelligence (Story 5.2)

**From Story 5.2 implementation:**
- All 8 tasks completed, backend tests 24 total, frontend tests 289 total
- Pydantic v2 `@computed_field` + `@property` pattern established for `days_until_available` and `is_overdue`
- Date formatting in Vietnamese locale: `date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })`
- Server Component + Client Component split: page fetches data server-side, interactive components are "use client"
- `GarmentCard` uses `<Link>` for navigation (accessible `<a>` tag)
- `ReturnTimeline` displays 4 status variants with distinct colors
- `notFound()` from `next/navigation` for 404 handling
- Next.js 16: `params` is a `Promise` that must be awaited

**Code Review Issues from Story 5.1 (still open - do NOT repeat):**
- M1: Hardcoded tenant ID in public API - be aware but do not fix here
- M3: `cache: "no-store"` defeats ISR - consider `next: { revalidate: 60 }` for GET requests
- M4: Filter component URL changes but page doesn't refetch

**Code Review Lessons (accumulated, MUST follow):**
1. Never call server actions with empty/placeholder data - pass actual data
2. Import existing types from `@/types/` - never inline duplicate types
3. Use exact key matching (not `includes()`) for lookups
4. Log auth failures, don't silently return success
5. After `db.flush()` MUST call `await db.commit()` to persist data
6. Forward auth token in ALL authenticated server actions: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }`
7. DRY - import from canonical sources (`core/`, `utils/`, `services/`), never recreate

### Technical Implementation Details

**PATCH Status Update Endpoint:**
```python
# backend/src/api/v1/garments.py
from backend.src.models.garment import GarmentStatusUpdate

@router.patch("/{garment_id}/status", response_model=GarmentResponse)
async def update_garment_status(
    garment_id: uuid.UUID,
    status_update: GarmentStatusUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: UserDB = OwnerOnly,
    tenant_id: uuid.UUID = Depends(get_tenant_id_from_user),
):
    garment = await garment_service.update_garment_status(
        db, tenant_id, garment_id, status_update
    )
    if not garment:
        raise HTTPException(status_code=404, detail="Garment not found")
    return {"data": GarmentResponse.model_validate(garment)}
```

**GarmentStatusUpdate Pydantic Model:**
```python
# Add to backend/src/models/garment.py
from pydantic import model_validator

class GarmentStatusUpdate(BaseModel):
    status: GarmentStatus
    expected_return_date: date | None = None

    @model_validator(mode='after')
    def validate_date_for_rented(self) -> 'GarmentStatusUpdate':
        if self.status == GarmentStatus.RENTED:
            if self.expected_return_date is None:
                raise ValueError("expected_return_date is required when status is 'rented'")
            if self.expected_return_date <= date.today():
                raise ValueError("expected_return_date must be in the future")
        else:
            # Auto-clear date for non-rented statuses
            self.expected_return_date = None
        return self
```

**Service Function:**
```python
# Add to backend/src/services/garment_service.py
async def update_garment_status(
    db: AsyncSession,
    tenant_id: uuid.UUID,
    garment_id: uuid.UUID,
    status_update: GarmentStatusUpdate,
) -> GarmentDB | None:
    garment = await get_garment(db, tenant_id, garment_id)
    if not garment:
        return None
    garment.status = status_update.status.value
    garment.expected_return_date = status_update.expected_return_date
    db.add(garment)
    await db.flush()
    await db.commit()
    await db.refresh(garment)
    return garment
```

**Sort by Status SQL Pattern:**
```python
from sqlalchemy import case

status_order = case(
    (GarmentDB.status == "rented", 1),
    (GarmentDB.status == "maintenance", 2),
    (GarmentDB.status == "available", 3),
    else_=4
)
query = query.order_by(status_order, GarmentDB.name)
```

**Frontend Server Action Pattern:**
```typescript
// Add to frontend/src/app/actions/garment-actions.ts
export async function updateGarmentStatus(
  id: string,
  status: string,
  expectedReturnDate?: string
): Promise<Garment> {
  const session = await auth();
  const token = session?.accessToken;
  if (!token) throw new Error("Authentication required");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const body: Record<string, unknown> = { status };
    if (expectedReturnDate) {
      body.expected_return_date = expectedReturnDate;
    }

    const res = await fetch(
      `${API_BASE}/api/v1/garments/${id}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        cache: "no-store",
      }
    );

    if (!res.ok) { /* handle 401, 403, 404, 422 */ }
    const json = await res.json();
    return json.data;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

**2-Touch Interaction Pattern (Client Component):**
```typescript
// Touch 1: Tap card to expand status panel
const [expandedId, setExpandedId] = useState<string | null>(null);
const handleCardTap = (garmentId: string) => {
  setExpandedId(expandedId === garmentId ? null : garmentId);
};

// Touch 2: Tap status button to update
const handleStatusUpdate = async (garmentId: string, newStatus: GarmentStatus) => {
  // If rented, show date picker first (extra step before API call)
  // Otherwise, call updateGarmentStatus immediately
};
```

### Field Name / Key Mapping

| DB Field (English) | API Request Key | UI Label (Vietnamese) |
|---|---|---|
| status | status | Trang thai |
| expected_return_date | expected_return_date | Ngay du kien tra do |
| "available" | "available" | San sang |
| "rented" | "rented" | Dang thue |
| "maintenance" | "maintenance" | Bao tri |

### Project Structure Notes

- **New files to create (Story 5.3):**
  ```
  frontend/
    src/app/(workplace)/owner/inventory/page.tsx          -- Inventory management page (Server Component)
    src/components/client/inventory/InventoryCard.tsx      -- Garment card with tap-to-expand (Client Component)
    src/components/client/inventory/StatusUpdatePanel.tsx  -- Status button panel with date picker (Client Component)
    src/components/client/inventory/InventoryList.tsx      -- Grouped inventory list (Client Component)
    src/components/client/inventory/index.ts              -- Barrel exports
    src/__tests__/inventoryCard.test.tsx                   -- InventoryCard tests
    src/__tests__/statusUpdatePanel.test.tsx               -- StatusUpdatePanel tests
    src/__tests__/inventoryList.test.tsx                   -- InventoryList tests
  ```

- **Existing files to modify:**
  ```
  backend/
    src/models/garment.py                                 -- Add GarmentStatusUpdate model
    src/services/garment_service.py                       -- Add update_garment_status(), sort_by_status logic
    src/api/v1/garments.py                                -- Add PATCH /{garment_id}/status endpoint, sort_by_status param
    tests/test_garments_api.py                            -- Add PATCH status tests (9+ new tests)
  frontend/
    src/app/actions/garment-actions.ts                    -- Add updateGarmentStatus(), fetchInventoryList()
    src/app/(workplace)/owner/page.tsx                    -- Add inventory link
  ```

- **Alignment:** All paths follow the unified project structure from architecture.md and project-context.md
- **Detected conflicts:** None. Owner inventory page fits within existing `(workplace)/owner/` route group. New `inventory/` component directory parallels existing `showroom/` pattern

### Testing Standards

- **Backend:** pytest + TestClient (AsyncClient). Test PATCH for each status transition, validation errors, RBAC, tenant isolation
- **Frontend:** Jest + React Testing Library. Test component renders, tap interactions, loading states, success/error flows
- **Regression:** Run full test suite after implementation. Do NOT break existing tests (backend baseline TBD from 5.2, frontend baseline 289)
- **RBAC:** PATCH by Customer -> 403, PATCH by Tailor -> 403, PATCH by Owner -> 200
- **Edge cases:** Test same-status update (idempotent), past date validation, null date auto-clear, network error handling

### Visual Design Reference

- **Heritage Palette:**
  - Primary: Indigo Depth `#1A2B4C`
  - Secondary: Silk Ivory `#F9F7F2`
  - Accent: Heritage Gold `#D4AF37`
  - Status Available: Green bg `#DCFCE7` / text `#065F46` (button: `#059669` bg, white text)
  - Status Rented: Amber bg `#FEF3C7` / text `#92400E` (button: `#F59E0B` bg, white text)
  - Status Maintenance: Gray bg `#F3F4F6` / text `#374151` (button: `#6B7280` bg, white text)
- **Typography:**
  - Page title & garment names: Cormorant Garamond (Serif)
  - Status labels & data: Inter (Sans-serif)
  - Prices: JetBrains Mono (Monospaced)
- **Layout:** Mobile-first, single column, 8px grid system
- **Touch targets:** Minimum 48x48px for status buttons (exceeds WCAG 44px minimum for easier mobile operation)
- **Feedback:** Micro-toasts for status update confirmations (not modals)
- **Accessibility:** WCAG 2.1 AA, contrast ratio 4.5:1, `aria-label` on status buttons
- **UX Flow (per UX spec):**
  ```
  Co Lan opens Inventory -> See garment list sorted by status
  -> Tap garment (Touch 1) -> Status options expand inline
  -> Tap new status (Touch 2) -> Immediate update + toast confirmation
  ```

### FR Coverage

- **FR25 (Inventory Admin):** This story fully implements FR25 - Owner can add/edit/delete garment info and update status quickly (2-3 touches)
- **FR23 (Availability Status):** This story enhances FR23 by providing the Owner mechanism to keep status data accurate in real-time
- **Dependency on Story 5.1:** Garment data model, API endpoints, and CRUD operations
- **Dependency on Story 5.2:** Return timeline display patterns, computed fields, TypeScript types
- **Sets up for Story 5.4:** Accurate `expected_return_date` from 2-touch updates enables automatic return reminders

### Cross-Story Context (Epic 5)

- Story 5.1 (DONE) established garment data model, CRUD API, showroom catalog
- Story 5.2 (REVIEW) added return timeline display, garment detail page, computed fields
- **Story 5.3 (THIS)** adds "2-touch" status update for Owner, inventory management page
- Story 5.4 will add automatic return reminders (depends on `expected_return_date` being set properly via 5.3)

### Git Intelligence

**Recent commit patterns:**
- Commit messages use `feat(epic-N):` prefix for new features
- Each story implementation is a single commit with detailed description
- Tests are included in the same commit as implementation
- Story file is committed together with the code changes
- Pattern: `feat(epic-5): implement Story 5.3 - 2-Touch Inventory Update`

**Recent file patterns from epic 5 commits:**
- Backend models in `backend/src/models/garment.py`
- Backend service in `backend/src/services/garment_service.py`
- Backend API in `backend/src/api/v1/garments.py`
- Frontend components in `frontend/src/components/client/{feature}/`
- Frontend tests in `frontend/src/__tests__/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story-5.3] - Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Structure] - Route groups, Owner routes at `(workplace)/owner/`
- [Source: _bmad-output/planning-artifacts/architecture.md#API-Communication] - REST API, response wrapper format
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture] - PostgreSQL 17, Pydantic v2
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#2-Touch-Status-Badge] - Custom component pattern
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Heritage-Admin-Flow] - Co Lan's admin workflow diagram
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Heritage-Palette] - Visual design system
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Dual-Device-Synergy] - Mobile-first, touch targets
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Consultative-Alerts] - Micro-toasts feedback pattern
- [Source: _bmad-output/implementation-artifacts/5-1-danh-muc-san-pham-trung-bay-so.md] - File patterns, RBAC, code review lessons
- [Source: _bmad-output/implementation-artifacts/5-2-theo-doi-lich-trinh-trang-thai-do-thue.md] - Computed fields, ReturnTimeline, previous story intelligence
- [Source: _bmad-output/project-context.md] - Naming conventions, framework rules, project structure, auth rules

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
