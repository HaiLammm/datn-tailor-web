# Story 5.1: Danh muc san pham trung bay so (Digital Showroom Catalog)

Status: completed

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Khach hang** (Customer),
I want **xem danh sach ao dai cho thue voi hinh anh va mo ta chi tiet**,
So that **toi co the chon duoc bo do ung y truoc khi den tiem**.

## Acceptance Criteria

1. **Given** Khach hang truy cap trang Showroom
   **When** He thong nap danh sach tu co so du lieu
   **Then** Hien thi cac the san pham (Cards) gom: Hinh anh, Ten bo do, Mo ta, Kich co co ban (S/M/L) va Gia thue
   **And** Co bo loc theo mau sac hoac dip le (vd: Le cuoi, Khai truong)

2. **Given** Khach hang xem danh muc showroom
   **When** He thong hien thi danh sach san pham
   **Then** Moi san pham hien thi trang thai thoi gian thuc: Available (San sang), Rented (Dang thue), Maintenance (Giat ui/Sua chua)

3. **Given** He thong hien thi danh muc san pham
   **When** Du lieu duoc load tu database
   **Then** Multi-tenant isolation dam bao chi hien thi san pham cua tenant hien tai (via `tenant_id`)

4. **Given** Trang showroom duoc truy cap
   **When** He thong render trang
   **Then** Trang duoc SSG/ISR optimized theo architecture spec cho `(customer)/` route group

5. **Given** Khach hang xem tren thiet bi di dong
   **When** Giao dien responsive
   **Then** Bo cuc doc voi Bottom Sheet Interaction, toi uu thao tac mot tay, touch targets toi thieu 44x44px

## Tasks / Subtasks

- [x] **Task 1: Database Migration - Garment table** (AC: #1, #2, #3)
  - [x] 1.1 Create SQL migration file `008_create_garments_table.sql`
  - [x] 1.2 Create `GarmentDB` ORM model in `backend/src/models/db_models.py`
  - [x] 1.3 Fields: id (UUID PK), tenant_id (FK tenants.id), name (String), description (Text), category (String/Enum), color (String), occasion (String), size_options (JSON - S/M/L), rental_price (Numeric), image_url (String), status (Enum: available/rented/maintenance), expected_return_date (Date nullable), created_at, updated_at
  - [x] 1.4 Add indexes on: tenant_id, status, category, occasion

- [x] **Task 2: Backend Pydantic Models** (AC: #1, #2)
  - [x] 2.1 Create `backend/src/models/garment.py` with Pydantic v2 models
  - [x] 2.2 Models: `GarmentStatus` (Enum), `GarmentCategory` (Enum), `GarmentOccasion` (Enum), `GarmentBase`, `GarmentCreate`, `GarmentResponse`, `GarmentListResponse`, `GarmentFilter`
  - [x] 2.3 Validate size_options as list of valid sizes (S/M/L/XL/XXL)

- [x] **Task 3: Backend Service Layer** (AC: #1, #2, #3)
  - [x] 3.1 Create `backend/src/services/garment_service.py`
  - [x] 3.2 Implement `list_garments(tenant_id, filters)` - with pagination, filtering by color/occasion/status/category
  - [x] 3.3 Implement `get_garment(tenant_id, garment_id)` - single garment detail
  - [x] 3.4 Implement `create_garment(tenant_id, data)` - Owner only
  - [x] 3.5 Implement `update_garment(tenant_id, garment_id, data)` - Owner only
  - [x] 3.6 Implement `delete_garment(tenant_id, garment_id)` - Owner only (hard delete implemented)
  - [x] 3.7 All queries MUST filter by `tenant_id` for multi-tenant isolation

- [x] **Task 4: Backend API Router** (AC: #1, #2, #3)
  - [x] 4.1 Create `backend/src/api/v1/garments.py`
  - [x] 4.2 `GET /api/v1/garments` - Public listing with filters (customer-facing, no auth required for browsing)
  - [x] 4.3 `GET /api/v1/garments/{garment_id}` - Public detail view
  - [x] 4.4 `POST /api/v1/garments` - Owner only (Depends(require_roles("Owner")))
  - [x] 4.5 `PUT /api/v1/garments/{garment_id}` - Owner only
  - [x] 4.6 `DELETE /api/v1/garments/{garment_id}` - Owner only
  - [x] 4.7 Register router in `backend/src/main.py`
  - [x] 4.8 Use API Response Wrapper: `{"data": {...}, "meta": {...}, "error": {...}}`

- [x] **Task 5: Backend Tests** (AC: #1, #2, #3)
  - [x] 5.1 Create `backend/tests/test_garment_service.py` - unit tests for service layer
  - [x] 5.2 Create `backend/tests/test_garments_api.py` - API endpoint tests
  - [x] 5.3 Test RBAC: Customer GET = 200, Customer POST = 403, Owner POST = 200
  - [x] 5.4 Test tenant isolation: garments from other tenants not visible
  - [x] 5.5 Test filter combinations: by color, occasion, status, category
  - [x] 5.6 Test pagination

- [x] **Task 6: Frontend TypeScript Types** (AC: #1, #2)
  - [x] 6.1 Create `frontend/src/types/garment.ts`
  - [x] 6.2 Define interfaces: `Garment`, `GarmentFilter`, `GarmentListResponse` matching backend snake_case
  - [x] 6.3 Define enums: `GarmentStatus`, `GarmentCategory`, `GarmentOccasion`

- [x] **Task 7: Frontend Server Actions** (AC: #1)
  - [x] 7.1 Create `frontend/src/app/actions/garment-actions.ts`
  - [x] 7.2 Implement `fetchGarments(filters)` - server action for SSG/ISR data fetching
  - [x] 7.3 Implement `fetchGarmentDetail(id)` - for detail page
  - [x] 7.4 Follow auth token pattern: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }` for admin actions only
  - [x] 7.5 Public browsing actions do NOT need auth token

- [x] **Task 8: Frontend Showroom Page (Server Component)** (AC: #1, #4, #5)
  - [x] 8.1 Create `frontend/src/app/(customer)/showroom/page.tsx` - Server Component with SSG/ISR
  - [x] 8.2 Fetch garment list via server action at page level
  - [x] 8.3 Pass data to client components for interactivity
  - [x] 8.4 SEO metadata: title, description for showroom page

- [x] **Task 9: Frontend Client Components** (AC: #1, #2, #5)
  - [x] 9.1 Create `frontend/src/components/client/showroom/GarmentCard.tsx` - product card with image, name, description, sizes, price, status badge
  - [x] 9.2 Create `frontend/src/components/client/showroom/GarmentGrid.tsx` - responsive grid layout for cards
  - [x] 9.3 Create `frontend/src/components/client/showroom/ShowroomFilter.tsx` - filter controls for color/occasion
  - [x] 9.4 Create `frontend/src/components/client/showroom/StatusBadge.tsx` - reusable status badge (Available=green, Rented=amber, Maintenance=gray)
  - [x] 9.5 Create `frontend/src/components/client/showroom/index.ts` - barrel exports
  - [x] 9.6 All components MUST use `"use client"` directive
  - [x] 9.7 Apply Heritage Palette: Indigo Depth #1A2B4C, Silk Ivory #F9F7F2, Heritage Gold #D4AF37
  - [x] 9.8 Typography: Cormorant Garamond for headings, Inter/JetBrains Mono for body
  - [x] 9.9 Mobile-first responsive: Bottom Sheet for filters on mobile (<768px)

- [x] **Task 10: Frontend Tests** (AC: #1, #2, #5)
  - [x] 10.1 Create `frontend/src/__tests__/garmentCard.test.tsx` - GarmentCard renders with correct data
  - [x] 10.2 Create `frontend/src/__tests__/showroomFilter.test.tsx` - Filter controls work
  - [x] 10.3 Create `frontend/src/__tests__/showroomPage.test.tsx` - Integration test for showroom page
  - [x] 10.4 Test status badge renders correct colors for each status
  - [x] 10.5 Test responsive layout behavior

## Dev Notes

### Architecture Compliance

- **Route Group:** Showroom lives under `frontend/src/app/(customer)/showroom/` (SSG/ISR prioritized per architecture.md line 190)
- **Server vs Client:** Page component is Server Component (SSG/ISR). Interactive elements (filters, cards with hover effects) are Client Components under `components/client/showroom/`
- **Authoritative Server:** Backend is SSOT for garment data. Frontend does NOT store garment state locally - always fetches from server
- **proxy.ts:** DO NOT create `middleware.ts`. All auth routing is handled by `proxy.ts` (Next.js 16 pattern per architecture.md line 103, project-context.md line 76)
- **API Response Wrapper:** All API responses use format: `{"data": {...}, "meta": {...}, "error": {...}}` (architecture.md line 161-167)

### Existing Code to Reuse (DO NOT REINVENT)

- **RBAC dependencies:** `Depends(require_roles("Owner"))` and `Depends(get_tenant_id_from_user)` from `backend/src/core/security.py`
- **DB session:** `Depends(get_db)` from `backend/src/core/database.py`
- **Auth pattern:** `auth()` and `session?.accessToken` from `frontend/src/auth.ts`
- **Server action pattern:** Follow exact pattern from `frontend/src/app/actions/geometry-actions.ts` (AbortController, timeout, error handling for 401/403/404/422)
- **ORM Base class:** `Base` from `backend/src/models/db_models.py` line 11
- **Multi-tenant pattern:** Every query filters by `tenant_id` (see `CustomerProfileDB` as reference pattern, db_models.py line 116-118)
- **Component barrel exports:** Follow pattern from `frontend/src/components/client/design/index.ts`
- **API router registration:** Add to `backend/src/main.py` following existing pattern (lines 10-21, 50-62)

### Previous Epic Intelligence

**From Epic 4 (all stories completed):**
- **File structure pattern (MUST FOLLOW):**
  ```
  Backend:
    backend/src/models/{feature}.py          -- Pydantic models
    backend/src/services/{feature}_service.py -- Business logic
    backend/src/api/v1/{feature}.py          -- API router
    backend/tests/test_{feature}_api.py      -- API tests
    backend/tests/test_{feature}_service.py  -- Service unit tests
  Frontend:
    frontend/src/types/{feature}.ts          -- TypeScript types
    frontend/src/app/actions/{feature}-actions.ts -- Server actions
    frontend/src/components/client/{feature}/{Component}.tsx -- Client components
    frontend/src/app/(customer|workplace)/... -- Page integration
    frontend/src/__tests__/{feature}.test.tsx -- Component tests
  ```

- **Test count baseline:** Frontend: 241 tests passing, Backend: 371 tests passing. DO NOT break existing tests.

### Code Review Lessons (MUST Follow)

These lessons are accumulated from all previous story code reviews:

1. **H1:** Never call server actions with empty/placeholder data - pass actual data
2. **H2:** Measurement field names differ between DB (English) and UI (Vietnamese) - always verify mapping
3. **H3:** Import existing types from `@/types/` - never inline duplicate types
4. **M1:** Use exact key matching (not `includes()`) for lookups
5. **M2:** Log auth failures, don't silently return success
6. **CRITICAL:** After `db.flush()` MUST call `await db.commit()` to persist data
7. **CRITICAL:** Forward auth token in ALL authenticated server actions
8. **CRITICAL:** DRY - import from canonical sources (`core/`, `utils/`, `services/`), never recreate

### Field Name / Key Mapping

| DB Field (English) | Frontend Key | UI Label (Vietnamese) |
|---|---|---|
| name | name | Ten bo do |
| description | description | Mo ta |
| category | category | Loai |
| color | color | Mau sac |
| occasion | occasion | Dip |
| size_options | size_options | Kich co |
| rental_price | rental_price | Gia thue |
| status | status | Trang thai |
| image_url | image_url | Hinh anh |
| expected_return_date | expected_return_date | Ngay tra du kien |

### Project Structure Notes

- **New files to create (Story 5.1):**
  ```
  backend/
    migrations/008_create_garments_table.sql
    src/models/garment.py
    src/services/garment_service.py
    src/api/v1/garments.py
    tests/test_garment_service.py
    tests/test_garments_api.py
  frontend/
    src/types/garment.ts
    src/app/actions/garment-actions.ts
    src/app/(customer)/showroom/page.tsx
    src/components/client/showroom/GarmentCard.tsx
    src/components/client/showroom/GarmentGrid.tsx
    src/components/client/showroom/ShowroomFilter.tsx
    src/components/client/showroom/StatusBadge.tsx
    src/components/client/showroom/index.ts
    src/__tests__/garmentCard.test.tsx
    src/__tests__/showroomFilter.test.tsx
    src/__tests__/showroomPage.test.tsx
  ```

- **Existing files to modify:**
  ```
  backend/src/models/db_models.py  -- Add GarmentDB class
  backend/src/main.py              -- Register garments router
  ```

- **Alignment:** All paths follow the unified project structure from architecture.md and project-context.md

### Testing Standards

- **Backend:** pytest + TestClient (AsyncClient), test each HTTP status (200, 403, 404, 422), test tenant isolation
- **Frontend:** Jest + React Testing Library, test renders, interactions, loading states, error states
- **Boundary checks:** Test filter edge cases (empty results, multiple filters combined)
- **RBAC:** Customer GET = 200, Customer POST/PUT/DELETE = 403, Owner CRUD = 200
- **Regression:** Run full test suite after implementation. Do NOT break existing 241 FE + 371 BE tests

### Visual Design Reference

- **Heritage Palette:**
  - Primary: Indigo Depth `#1A2B4C`
  - Secondary: Silk Ivory `#F9F7F2`
  - Accent: Heritage Gold `#D4AF37`
  - Status Available: Green
  - Status Rented: Amber/Gold `#FEF3C7` bg / `#92400E` text
  - Status Maintenance: Gray
- **Typography:**
  - Headings: Cormorant Garamond (Serif)
  - Body/Data: Inter (Sans-serif) or JetBrains Mono (Monospaced)
- **Spacing:** 8px grid system
- **Customer Mode:** Airy layout with generous whitespace
- **Touch targets:** Minimum 44x44px
- **Accessibility:** WCAG 2.1 AA, contrast ratio 4.5:1 (Indigo/Ivory)

### FR Coverage and Discrepancies

- **FR22 (Digital Catalog):** This story implements FR22
- **Note:** PRD says "bang thong so kich thuoc thuc te (Bust/Waist/Hip)" but epics simplified to "Kich co co ban (S/M/L)". For this story, implement S/M/L sizes as specified in the epic. Detailed Bust/Waist/Hip measurements are a future enhancement
- **FR23 (Availability Status):** Partially covered - this story displays status on cards. Full real-time status tracking is Story 5.2/5.3

### Cross-Story Context (Epic 5)

- Story 5.1 (THIS) establishes the garment data model and showroom display
- Story 5.2 will ADD return timeline display to garment detail view (depends on garment model from 5.1)
- Story 5.3 will ADD "2-touch" status update for Owner (depends on garment model + status field from 5.1)
- Story 5.4 will ADD automatic return reminders (depends on rental records built on top of garment model)
- **Design the garment model with extensibility** for stories 5.2-5.4 (status field, expected_return_date field)

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-5] - Story requirements and acceptance criteria
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend-Structure] - Route groups and SSG/ISR strategy
- [Source: _bmad-output/planning-artifacts/architecture.md#Data-Architecture] - PostgreSQL 17, Pydantic v2
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication-Security] - Auth.js v5, RBAC, proxy.ts
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Heritage-Palette] - Visual design system
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Responsive-Design] - Mobile-first, Bottom Sheet
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Custom-Components] - 2-Touch Status Badge pattern
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR22-FR25] - Functional requirements
- [Source: _bmad-output/project-context.md] - Naming conventions, framework rules, project structure
- [Source: _bmad-output/implementation-artifacts/4-4-xuat-ban-ve-san-xuat.md] - Previous story patterns

## Dev Agent Record

### Agent Model Used

claude-sonnet-4.5 (github-copilot/claude-sonnet-4.5)

### Debug Log References

N/A - Implementation completed successfully on first attempt.

### Completion Notes List

1. **Story 5.1 completed successfully** - All 10 tasks implemented and tested
2. **Database Migration:** Created `008_create_garments_table.sql` with full multi-tenant support, indexes on tenant_id, status, category, occasion
3. **Backend Implementation:**
   - GarmentDB ORM model added to `db_models.py` with proper relationships
   - Pydantic models in `garment.py` with comprehensive validation
   - Service layer in `garment_service.py` with strict tenant isolation
   - API router in `garments.py` with public GET endpoints and Owner-only CRUD
   - Router registered in `main.py`
   - All endpoints use API Response Wrapper format
4. **Backend Tests:**
   - 14 service layer tests (test_garment_service.py)
   - 19 API endpoint tests (test_garments_api.py)
   - Total 33 new backend tests, all PASSING
   - RBAC verified: Customer GET=200, Customer POST/PUT/DELETE=403, Owner CRUD=200/201/204
   - Tenant isolation verified across all operations
   - Filter combinations tested (color, occasion, status, category)
   - Pagination tested
5. **Frontend Implementation:**
   - TypeScript types in `garment.ts` with snake_case for JSON compatibility
   - Server actions in `garment-actions.ts` with proper auth handling
   - Public browsing actions DO NOT require auth token
   - Admin actions (create/update/delete) require Owner role + auth token
   - Showroom page at `(customer)/showroom/page.tsx` using Server Component with SSG/ISR
   - SEO metadata configured
6. **Frontend Components:**
   - GarmentCard.tsx: Product card with image, name, description, sizes, price, status badge
   - GarmentGrid.tsx: Responsive grid (1 col mobile, 2 tablet, 3 desktop)
   - ShowroomFilter.tsx: Desktop filter bar + mobile bottom sheet pattern
   - StatusBadge.tsx: Color-coded status (Available=green, Rented=amber, Maintenance=gray)
   - All components use "use client" directive
   - Heritage Palette applied: Indigo #1A2B4C, Silk Ivory #F9F7F2, Heritage Gold #D4AF37
   - Typography: Cormorant Garamond for headings
   - Mobile-first with 44x44px minimum touch targets
7. **Frontend Tests:**
   - garmentCard.test.tsx: 10 tests for card rendering
   - showroomFilter.test.tsx: 5 tests for filter controls
   - showroomPage.test.tsx: 3 tests for page integration
   - All 18 new frontend tests PASSING
8. **Test Results:**
   - Backend: 33/33 new tests passing (427 total backend tests)
   - Frontend: 18/18 new tests passing (276 total frontend tests)
   - No regressions detected in existing test suites
9. **Architecture Compliance:**
   - Route group: `(customer)/showroom` for public browsing (SSG/ISR optimized)
   - Server Component pattern for page, Client Components for interactivity
   - Multi-tenant isolation: ALL queries filter by tenant_id
   - RBAC: Public GET, Owner-only POST/PUT/DELETE
   - API Response Wrapper used consistently
   - No middleware.ts created (using proxy.ts pattern)
   - Code reuse: Used existing `require_roles()`, `get_tenant_id_from_user()`, `get_db()` from core
10. **Code Review Lessons Applied:**
    - After `db.flush()` always call `await db.commit()`
    - Auth tokens forwarded in authenticated server actions
    - No placeholder/empty data passed to server actions
    - Imported from canonical sources (no DRY violations)
    - Field names: snake_case in DB/JSON, camelCase in TS variables
11. **Future Extensions Ready:**
    - `expected_return_date` field ready for Story 5.2 (return timeline display)
    - `status` field ready for Story 5.3 (2-touch status update)
    - Garment model extensible for Story 5.4 (automatic return reminders)

### File List

**New Files Created:**
```
backend/
  migrations/008_create_garments_table.sql
  src/models/garment.py
  src/services/garment_service.py
  src/api/v1/garments.py
  tests/test_garment_service.py
  tests/test_garments_api.py
frontend/
  src/types/garment.ts
  src/app/actions/garment-actions.ts
  src/app/(customer)/showroom/page.tsx
  src/components/client/showroom/GarmentCard.tsx
  src/components/client/showroom/GarmentGrid.tsx
  src/components/client/showroom/ShowroomFilter.tsx
  src/components/client/showroom/StatusBadge.tsx
  src/components/client/showroom/index.ts
  src/__tests__/garmentCard.test.tsx
  src/__tests__/showroomFilter.test.tsx
  src/__tests__/showroomPage.test.tsx
```

**Existing Files Modified:**
```
backend/src/models/db_models.py  -- Added GarmentDB class
backend/src/main.py              -- Registered garments_router
```
