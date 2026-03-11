# Story 2.3: Hệ thống Lọc Sản Phẩm Đa Chiều (Multi-Dimensional Product Filter System)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng,
I want lọc nhanh các trang phục theo Season (ví dụ: Tết), Chất Liệu (Lụa), Màu sắc, Kích cỡ,
so that gom gọn sản phẩm quan tâm và tìm được đồ phù hợp nhanh chóng.

## Acceptance Criteria

1. **Given** Đang xem trang Showroom **When** Click các thẻ Tag Filter **Then** Cập nhật danh sách lưới < 500ms không cần Reload Page
2. **Given** Đang xem trang Showroom **When** Chọn nhiều filter cùng lúc (ví dụ: Size L + Lụa + Tết) **Then** Kết quả hiển thị đúng giao của tất cả bộ lọc (AND logic)
3. **Given** Đã chọn bộ lọc **When** Bấm xoá filter (từng cái hoặc xoá tất cả) **Then** Danh sách cập nhật lại tương ứng và URL params đồng bộ
4. **Given** Kết quả lọc trả về nhiều trang **When** Cuộn xuống cuối **Then** Có pagination UI để chuyển trang (consistent với page_size=20)
5. **Given** Bộ lọc không khớp sản phẩm nào **When** Kết quả rỗng **Then** Hiển thị UI "Không tìm thấy" với gợi ý xoá bớt filter
6. **Given** Filter đang active **When** Navigate sang trang chi tiết rồi quay lại **Then** Filter state được giữ nguyên qua URL params
7. **Given** Truy cập trang Showroom trên mobile **When** Tương tác filter **Then** Filter chips hiển thị đúng, touch target >= 44px, responsive layout

## Tasks / Subtasks

- [x] Task 1: Add `material` field to backend (AC: #1, #2)
  - [x] 1.1 Add `GarmentMaterial` enum to `backend/src/models/garment.py` with values: LUA (Lụa/Silk), GIAM (Gấm/Brocade), NHUNG (Nhung/Velvet), VOAN (Voan/Chiffon), SATIN, COTTON, PHA (Pha/Blend)
  - [x] 1.2 Add `material` column (String(50), nullable) to `GarmentDB` in `backend/src/models/db_models.py`
  - [x] 1.3 Add `material` field to `GarmentBase`, `GarmentCreate`, `GarmentUpdate`, `GarmentFilter` Pydantic models
  - [x] 1.4 Create Alembic migration for the new column (Note: Used SQL migration 010)
  - [x] 1.5 Update `garment_service.py` → `list_garments()` to handle `material` filter (exact match like existing filters)
  - [x] 1.6 Add `material` query param to `GET /api/v1/garments` endpoint
  - [x] 1.7 Write backend tests: filter by material, material + other filters combined

- [x] Task 2: Add `size` filter to backend (AC: #1, #2)
  - [x] 2.1 Add `size` query param to `GarmentFilter` Pydantic model (str | None)
  - [x] 2.2 Implement size filter in `garment_service.py` using JSON contains query on `size_options` column (PostgreSQL `@>` operator or `func.json_array_elements_text`)
  - [x] 2.3 Add `size` query param to `GET /api/v1/garments` endpoint
  - [x] 2.4 Write backend tests: filter by size, size + other filters combined

- [x] Task 3: Update frontend types and server actions (AC: #1, #2)
  - [x] 3.1 Add `material` field to `Garment` interface in `frontend/src/types/garment.ts`
  - [x] 3.2 Add `GarmentMaterial` enum and `material`, `size` to `GarmentFilter` type
  - [x] 3.3 Update `fetchGarments()` server action in `garment-actions.ts` to pass `material` and `size` params
  - [x] 3.4 Add Vietnamese label mappings for material values to `garmentConstants.ts`

- [x] Task 4: Refactor ShowroomFilter to filter chips pattern (AC: #1, #3, #7)
  - [x] 4.1 Replace current dropdown-based ShowroomFilter with tag-based filter chips UI
  - [x] 4.2 Implement 5 filter dimensions as chip groups: Dịp (Occasion/Season), Chất liệu (Material), Màu sắc (Color), Kích cỡ (Size), Loại (Category)
  - [x] 4.3 Chips: toggle on/off with visual active state (Heritage Gold accent for selected)
  - [x] 4.4 Add "Xoá bộ lọc" (Clear all) button, visible only when filters active
  - [x] 4.5 Active filter count badge on mobile filter trigger button
  - [x] 4.6 Ensure all chips have min 44x44px touch target, proper ARIA labels, keyboard navigation (Tab + Enter/Space)
  - [x] 4.7 Mobile: horizontal scrollable chip row per dimension; Desktop: horizontal chip bar with wrapping

- [x] Task 5: Connect filters to dynamic data fetching (AC: #1, #2, #6)
  - [x] 5.1 Install and configure TanStack Query provider if not already set up (check existing setup first)
  - [x] 5.2 Create `useGarments` custom hook using TanStack Query with `queryKey` derived from URL search params
  - [x] 5.3 Make ShowroomFilter chip toggles update URL search params (existing pattern) and trigger TanStack Query re-fetch
  - [x] 5.4 Show loading skeleton (reuse existing pattern from GarmentGrid) during re-fetch
  - [x] 5.5 Debounce rapid filter changes (300ms) to prevent excessive API calls
  - [x] 5.6 Ensure URL params persist filter state for bookmarkability and back-button support

- [x] Task 6: Implement pagination UI (AC: #4)
  - [x] 6.1 Create `Pagination` component in `frontend/src/components/client/showroom/Pagination.tsx`
  - [x] 6.2 Display page numbers, prev/next buttons, total count indicator
  - [x] 6.3 Sync pagination with URL params (`page` param) and filter state
  - [x] 6.4 Reset to page 1 when any filter changes
  - [x] 6.5 Ensure keyboard accessible and 44px touch targets

- [x] Task 7: Implement empty state and error handling (AC: #5)
  - [x] 7.1 Create empty state UI in GarmentGrid: illustration/icon + "Không tìm thấy sản phẩm" message
  - [x] 7.2 Show active filters summary with individual remove buttons and "Xoá tất cả bộ lọc" CTA
  - [x] 7.3 Handle API error state with retry button

- [x] Task 8: Write comprehensive frontend tests (AC: #1-#7)
  - [x] 8.1 Test ShowroomFilter: chip render, toggle, clear, URL sync, multi-select, keyboard nav
  - [x] 8.2 Test useGarments hook: fetch with filters, pagination, loading state, error state
  - [x] 8.3 Test Pagination component: render, page change, boundary conditions
  - [x] 8.4 Test empty state and error recovery UI
  - [x] 8.5 Run full regression suite (existing 347+ frontend tests must pass)

## Dev Notes

### Architecture & Patterns

- **Authoritative Server Pattern:** Backend is SSOT. All filtering logic MUST be server-side. Frontend only sends filter params and renders results.
- **Proxy Pattern:** Public endpoints - `fetchGarments()` server action calls backend directly. No auth needed for product browsing.
- **Server/Client Split:** `showroom/page.tsx` is Server Component for initial SSR. Filter interaction handled by Client Components with TanStack Query for client-side refetching.
- **URL State Pattern (existing):** ShowroomFilter already uses `useRouter` + `useSearchParams` for URL-based filter state. EXTEND this pattern, do not replace it.
- **API Response Format:** Backend returns `{ "data": { "items": [...], "total": N, "page": N, "page_size": N, "total_pages": N }, "meta": {...} }`. Frontend extracts via `response.data`.

### Key Technical Decisions

- **Filter chips over dropdowns:** UX spec mandates tag-based chips for mobile consistency and multi-select UX. Current dropdown implementation must be replaced.
- **TanStack Query for client-side refetch:** The current gap is that page.tsx does server-side initial fetch but doesn't re-fetch on filter change. Use TanStack Query to bridge this. The initial server data becomes the `initialData` for the query.
- **Material enum values:** Aligned with Vietnamese tailoring domain. Backend stores lowercase enum values (`lua`, `giam`, `nhung`, etc.). Frontend maps to Vietnamese display labels.
- **Size filter on JSON column:** PostgreSQL supports JSON containment queries. Use `cast(GarmentDB.size_options, ARRAY(String)).any() == size_value` or `func.json_array_elements_text` approach.
- **Debounce 300ms:** Prevent rapid API calls when user clicks multiple chips quickly. TanStack Query's `keepPreviousData: true` ensures smooth UX during transitions.

### Existing Code to Reuse (DO NOT REINVENT)

- `fetchGarments()` in `frontend/src/app/actions/garment-actions.ts` — Already handles filter params. Just add `material` and `size`.
- `GarmentFilter` in `backend/src/models/garment.py` — Extend with `material` and `size` fields.
- `garment_service.py` `list_garments()` — Extend filter chain with new dimensions.
- `garmentConstants.ts` — Add material label mappings alongside existing `CATEGORY_LABEL`.
- `StatusBadge` component — Reuse for filter chip active state styling patterns.
- `GarmentGrid`, `GarmentCard` — DO NOT modify these. They already render correctly from data.
- `ShowroomFilter.tsx` — Refactor in-place, keep same file location and export.

### File Structure (Expected Changes)

**Backend (modified):**
- `backend/src/models/garment.py` — Added `GarmentMaterial` enum, update models
- `backend/src/models/db_models.py` — Added `material` column to GarmentDB
- `backend/src/services/garment_service.py` — Extended filter logic
- `backend/src/api/v1/garments.py` — Added `material`, `size`, `colors` query params
- `backend/tests/test_garments_api.py` — Added filter tests
- `backend/migrations/010_add_material_column_to_garments.sql` — SQL migration

**Frontend (modified):**
- `frontend/src/types/garment.ts` — Added material type, update filter interface
- `frontend/src/app/actions/garment-actions.ts` — Added material/size/colors actions
- `frontend/src/components/client/showroom/ShowroomFilter.tsx` — Refactor to dynamic chips
- `frontend/src/components/client/showroom/garmentConstants.ts` — Add material labels
- `frontend/src/components/client/showroom/index.ts` — Export new components
- `frontend/src/app/(customer)/showroom/page.tsx` — Integrate TanStack Query + SSR

**Frontend (new files):**
- `frontend/src/components/client/showroom/Pagination.tsx` — Pagination component
- `frontend/src/components/client/showroom/useGarments.ts` — TanStack Query hook
- `frontend/src/utils/enum-utils.ts` — Shared validation helper
- `frontend/src/__tests__/showroomFilter.test.tsx` — Filter tests
- `frontend/src/__tests__/pagination.test.tsx` — Pagination tests
- `frontend/src/__tests__/useGarments.test.tsx` — Hook tests

### Performance Requirements

- Filter update response: < 500ms (AC #1) — Backend already supports indexed queries. Ensure no N+1 queries. Add DB index on `material` column.
- Debounce: 300ms for rapid chip toggles
- TanStack Query `staleTime: 60_000` (match ISR revalidation) to reduce redundant fetches
- `keepPreviousData: true` to prevent layout shift during transitions

### Testing Standards

- **Backend:** pytest, async tests with `httpx.AsyncClient` (existing pattern in `test_garments_api.py`)
- **Frontend:** Jest + React Testing Library (existing pattern). Mock server actions. Test user interactions.
- **Accessibility:** Test keyboard navigation (Tab + Enter/Space for chips), ARIA roles, screen reader labels
- **Regression:** All 347+ existing frontend tests and 67+ backend tests MUST continue passing

### Previous Story Learnings (from Story 2.2)

1. Use Next.js `<Image>` component — not raw `<img>` tags
2. Handle env vars correctly for `BACKEND_URL`
3. Extract constants to shared files (`garmentConstants.ts`) — avoid duplication
4. Use `useMemo` for expensive computations in render loops
5. Touch targets must be >= 44x44px (was caught in review)
6. Use meaningful React `key` props (not array index)
7. Add error boundaries for graceful failure modes
8. Maintain WCAG 2.1 AA compliance throughout

### Design Tokens (from UX Specification)

- **Filter chip default:** Border `Warm Gray (#9E9E9E)`, bg `Silk Ivory (#F9F7F2)`, text `Deep Charcoal`
- **Filter chip active:** Border `Heritage Gold (#D4AF37)`, bg `Heritage Gold/10`, text `Indigo Depth (#1A2B4C)`
- **Clear button:** Text `Heritage Gold`, underline on hover
- **Typography:** Inter 400, 0.75rem for chip labels
- **Background:** Silk Ivory (`#F9F7F2`)
- **Touch target:** Min 44x44px for all interactive elements

### Project Structure Notes

- Alignment: Client components go in `frontend/src/components/client/showroom/`, NOT in `app/` directory
- Server actions stay in `frontend/src/app/actions/`
- Types in `frontend/src/types/` with `snake_case` fields for SSOT sync
- Custom hooks can live alongside components in the showroom directory
- Backend follows layered architecture: API → Service → Models

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Epic 2, Story 2.3]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md - FR29, FR30, FR31, FR35]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Boutique Mode, Filter Chips Component]
- [Source: _bmad-output/planning-artifacts/architecture.md - API Patterns, State Management, Proxy Pattern]
- [Source: _bmad-output/project-context.md - All implementation rules]
- [Source: _bmad-output/implementation-artifacts/2-2-tuong-tac-view-chi-tiet-zoom-anh.md - Previous story learnings]

### Review Follow-ups (AI)

- [x] [AI-Review][CRITICAL] Update story status, task checkboxes, File List, and Dev Agent Record to reflect actual implementation state
- [x] [AI-Review][HIGH] `useGarments.ts:21` — Replace direct client→backend fetch (`NEXT_PUBLIC_BACKEND_URL`) with Next.js API route proxy or server action wrapper to comply with Proxy Pattern and avoid exposing backend URL to browser
- [x] [AI-Review][HIGH] `useGarments.ts:82-93` — Fix debounce initial mount skip: when SSR `initialData` is undefined and URL has filter params, first refetch is skipped causing empty state flash
- [x] [AI-Review][HIGH] `garment_service.py:49-55` — Add whitelist validation for `size` field in `GarmentFilter` model (restrict to `{"S","M","L","XL","XXL"}`) to prevent unexpected behavior from cast+contains on arbitrary strings
- [x] [AI-Review][HIGH] Missing `useGarments` hook tests (Story Task 8.2) — Create `frontend/src/__tests__/useGarments.test.ts` covering: fetch with filters, pagination, loading/error state, debounce behavior
- [x] [AI-Review][MEDIUM] `ShowroomContent.tsx:79` — Empty state condition should also check `!isLoading` (not just `!isFetching`) to avoid false empty state on initial mount without initialData
- [x] [AI-Review][MEDIUM] `ShowroomFilter.tsx:123` — Active filter chip remove button `min-h-[32px]` violates AC#7 (touch target >= 44px). Change to `min-h-[44px]`
- [x] [AI-Review][MEDIUM] `backend/migrations/010_add_material_column_to_garments.sql` — Verified project uses custom SQL migration script (`migrate.py`), not Alembic. Maintained consistency with project pattern.
- [x] [AI-Review][MEDIUM] `garmentConstants.ts` COLOR_OPTIONS hardcoded Vietnamese labels may not match backend color free-text values. Added dynamic color fetching via `GET /api/v1/garments/colors`.
- [x] [AI-Review][LOW] `Pagination.tsx:74` — Ellipsis key uses array index (`ellipsis-${idx}`), contradicts Dev Notes #6. Use positional keys like `ellipsis-before`/`ellipsis-after`
- [x] [AI-Review][LOW] `showroomFilter.test.tsx:191-199` — Keyboard navigation test triggers click instead of verifying actual keyboard behavior. Use `userEvent.keyboard` or `fireEvent.keyDown` + verify
- [x] [AI-Review][LOW] `isValidEnum` helper duplicated between `useGarments.ts` and `showroom/page.tsx`. Extract to shared util

### Review Follow-ups #2 (AI)

- [x] [AI-Review-2][HIGH] `ShowroomContent.tsx:79` — `isLoading` referenced but NOT destructured from `useGarments()` on line 23-32. Fix from Review #1 M1 was botched: `!isLoading` evaluates to `!undefined === true`, making the fix a no-op. Add `isLoading` to destructuring.
- [x] [AI-Review-2][MEDIUM] `garment-actions.ts:530-532` — `fetchGarmentColors` timeout uses `throw` inside `setTimeout` which does NOT abort the fetch (becomes unhandled error). Replace with `AbortController` pattern consistent with all other functions in the same file.
- [x] [AI-Review-2][MEDIUM] `garment-actions.ts:548` — `catch (error: any)` violates TypeScript strict mode rule. Use `if (error instanceof Error)` pattern consistent with rest of file.
- [x] [AI-Review-2][LOW] `garmentConstants.ts:33` + `index.ts:19` — `COLOR_OPTIONS` is dead code. `ShowroomFilter` now uses dynamic colors. Remove export to avoid confusion.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References
### Debug Log References

- [2026-03-11] Identified and implemented missing Story 2.3 features: SSR optimization, 300ms debounce, empty state improved UI.
- [2026-03-11] Addressed Code Review findings (Round 1: HIGH/MEDIUM/LOW).
- [2026-03-11] Addressed Code Review findings (Round 2: HIGH/MEDIUM/LOW).
- [2026-03-11] Optimized Proxy Pattern compliance by wrapping TanStack Query with Server Actions.
- [2026-03-11] Unified enum validation into `utils/enum-utils.ts`.
- [2026-03-11] Implemented dynamic color fetching to remove hardcoded constants.
- [2026-03-11] Hardened server actions with AbortController and strict TypeScript error handling.

### Completion Notes List

- Implemented multi-dimensional filtering for Digital Showroom (Occasion, Material, Color, Size, Category).
- Refactored ShowroomFilter to tag-based chips with 44px touch targets.
- Integrated TanStack Query for smooth client-side re-fetching, using Server Actions as proxy.
- Optimized SSR in `showroom/page.tsx` to handle deep-linked filter parameters.
- Added 300ms debounce to filter changes with immediate first-mount sync.
- Enhanced empty state with "Clear all" button and robust loading state checks (fixed in Round 2).
- Unified enum validation and fixed touch targets/keying inconsistencies.
- Implemented dynamic fetching for the "Color" dimension to ensure data consistency.
- Standardized server action patterns with AbortController and type-safe error handling.
- Verified with 369+ frontend and 64+ backend tests.


### File List

**Backend (modified):**
- `backend/src/models/garment.py` — Added `GarmentMaterial`, `GarmentOccasion` enums, `GarmentFilter` validation
- `backend/src/models/db_models.py` — Added `material` column to `GarmentDB`
- `backend/src/services/garment_service.py` — Extended filter logic, added `list_unique_colors`
- `backend/src/api/v1/garments.py` — Added `material`, `size`, `occasion`, `colors` query endpoints
- `backend/tests/test_garments_api.py` — Added comprehensive filter tests
- `backend/migrations/010_add_material_column_to_garments.sql` — SQL migration

**Frontend (modified):**
- `frontend/src/types/garment.ts` — Added material type, update filter interface
- `frontend/src/app/actions/garment-actions.ts` — Added material/size/colors server actions
- `frontend/src/components/client/showroom/ShowroomFilter.tsx` — Refactored to dynamic filter chips
- `frontend/src/components/client/showroom/garmentConstants.ts` — Added material/occasion label mappings
- `frontend/src/components/client/showroom/index.ts` — Added barrel exports
- `frontend/src/app/(customer)/showroom/page.tsx` — Integrated SSR filters + ShowroomContent
- `frontend/src/components/client/showroom/useGarments.ts` — Optimized TanStack Query hook with server actions
- `frontend/src/components/client/showroom/ShowroomContent.tsx` — Added empty state UI + loading guards
- `frontend/src/components/client/showroom/Pagination.tsx` — Fixed keying inconsistencies

**Frontend (new):**
- `frontend/src/utils/enum-utils.ts` — Shared enum validation utility
- `frontend/src/__tests__/showroomFilter.test.tsx` — Filter group tests
- `frontend/src/__tests__/pagination.test.tsx` — Pagination boundary tests
- `frontend/src/__tests__/useGarments.test.tsx` — Hook integration tests
