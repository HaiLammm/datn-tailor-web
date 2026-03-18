# Story 4.4d: Số đo cơ thể

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng,
I want xem và cập nhật số đo cơ thể đã lưu trong trang Profile cá nhân,
so that tiệm may có thông tin chính xác khi may đo, và tôi kiểm soát được dữ liệu số đo của mình.

## Acceptance Criteria

1. **AC1 — Hiển thị số đo mặc định:** Given Customer đang ở Profile → tab "Số đo", When load measurements, Then hiển thị bảng số đo mặc định nổi bật (highlight card) gồm: Vòng cổ, Rộng vai, Vòng ngực, Vòng eo, Vòng mông, Dài áo, Dài tay, Vòng cổ tay, Chiều cao, Cân nặng — với đơn vị cm/kg, ngày đo, người đo.
2. **AC2 — Lịch sử số đo (version history):** Given Customer có >= 2 bộ số đo, When load page, Then hiển thị danh sách tất cả bộ số đo sắp xếp theo ngày đo (mới nhất trước), với badge "Mặc định" cho bộ đang active.
3. **AC3 — Chỉnh sửa số đo (read-only for customer):** Given Customer đang xem số đo, Then customer chỉ có quyền **xem** số đo (KHÔNG có quyền chỉnh sửa/thêm/xóa — chỉ thợ may/chủ tiệm mới được phép). Hiển thị message: "Số đo được cập nhật bởi thợ may tại tiệm".
4. **AC4 — Empty state:** Given Customer chưa có số đo nào, When load page, Then hiển thị friendly empty state với icon, message "Chưa có số đo nào", và hướng dẫn "Đặt lịch hẹn tại tiệm để được đo".
5. **AC5 — Responsive layout:** Given Customer truy cập trên mobile (<768px), Then số đo hiển thị dạng card grid 1 cột. Given desktop (>=768px), Then hiển thị dạng grid 2-4 cột.
6. **AC6 — Loading & Error states:** Given API đang load, Then hiển thị skeleton placeholder. Given API lỗi, Then hiển thị error message với nút retry.

## Tasks / Subtasks

- [x] Task 1: Backend — Customer self-service measurement endpoints (AC: #1, #2, #3, #4, #6)
  - [x] 1.1 Add `GET /api/v1/customers/me/measurements` endpoint in `customer_profile.py`
  - [x] 1.2 Inline SQLAlchemy query: `select(CustomerProfileDB).where(CustomerProfileDB.user_id == current_user.id, CustomerProfileDB.tenant_id == current_user.tenant_id)` — see `export.py:87-100` for reference pattern
  - [x] 1.3 Return `{ data: { default_measurement, measurements, measurement_count }, meta: {} }`
  - [x] 1.4 Handle case: no customer_profile found → return empty measurements
  - [x] 1.5 Write backend tests (pytest): success, no profile, no measurements, unauthorized
- [x] Task 2: Frontend — Server Action for measurements (AC: #1, #2, #6)
  - [x] 2.1 Add `getMyMeasurements()` Server Action in `profile-actions.ts`
  - [x] 2.2 Follow exact pattern from `getCustomerProfile()`: Bearer auth, 10s timeout, error per HTTP status
  - [x] 2.3 Return typed `{ success, data?, error? }` response
- [x] Task 3: Frontend — MeasurementDisplay client component (AC: #1, #2, #3, #4, #5)
  - [x] 3.1 Create `components/client/profile/MeasurementDisplay.tsx` — client component
  - [x] 3.2 Default measurement highlight card (amber-50 bg, amber-200 border — match MeasurementHistory.tsx pattern)
  - [x] 3.3 Measurement fields grid: 2 cols mobile, 4 cols desktop
  - [x] 3.4 Vietnamese labels: Vòng cổ, Rộng vai, Vòng ngực, Vòng eo, Vòng mông, Dài áo, Dài tay, Vòng cổ tay, Chiều cao, Cân nặng
  - [x] 3.5 Unit display: cm for all except weight (kg)
  - [x] 3.6 Read-only notice banner: "Số đo được cập nhật bởi thợ may tại tiệm"
  - [x] 3.7 Empty state with icon + message + CTA guide to booking appointment
  - [x] 3.8 Loading skeleton state
  - [x] 3.9 Error state with retry button
- [x] Task 4: Frontend — Measurement history list (AC: #2)
  - [x] 4.1 History section below default card: list all measurement sets sorted by measured_date DESC
  - [x] 4.2 Each history item: collapsible card showing date + summary (3-4 key fields) → expand for full details
  - [x] 4.3 Badge "Mặc định" on active set
- [x] Task 5: Frontend — Replace placeholder page (AC: all)
  - [x] 5.1 Update `app/(customer)/profile/measurements/page.tsx` — Server Component
  - [x] 5.2 Fetch measurements via Server Action
  - [x] 5.3 Pass data to MeasurementDisplay client component
  - [x] 5.4 Heritage Palette styling (Silk Ivory bg, Indigo accents, serif headings)
- [x] Task 6: Frontend tests (AC: all)
  - [x] 6.1 MeasurementDisplay tests: render default, render history, empty state, loading, error, responsive
  - [x] 6.2 Server Action tests: success, unauthorized, no profile, network error
  - [x] 6.3 Page integration test: renders with data, renders empty state

## Dev Notes

### Critical Architecture Decisions

- **READ-ONLY for customers:** Unlike the owner's MeasurementHistory.tsx which has add/edit/delete/set-default, the customer view is READ-ONLY. Only owner/tailor can modify measurements. This is an intentional RBAC decision — customers should not self-report measurements (accuracy concern for tailoring).
- **Reuse existing backend infrastructure:** The `measurements` table, `MeasurementDB` ORM model, `measurement_service.py`, and `MeasurementResponse` Pydantic schema already exist from Story 1.3. Do NOT create new tables or models.
- **New endpoint needed:** The existing `/api/v1/customers/{customer_id}/measurements` requires Owner/Tailor role. Story 4.4d needs a self-service endpoint `/api/v1/customers/me/measurements` using `CurrentUser` dependency (same pattern as Story 4.4b's `/api/v1/customers/me/profile`).
- **Customer → CustomerProfile mapping (CRITICAL):** The `CurrentUser` is a `UserDB` (auth user). To fetch measurements:
  1. Query `CustomerProfileDB` WHERE `user_id == current_user.id` AND `tenant_id == current_user.tenant_id`
  2. Extract `customer_profile.id` (for `customer_id` param) and `customer_profile.tenant_id`
  3. Pass both to `measurement_service.get_measurements_history(db, customer_id, tenant_id)` and `get_default_measurement(db, customer_id, tenant_id)` — these functions REQUIRE `tenant_id`
  4. Handle `current_user.tenant_id is None` → return empty measurements (customer not yet linked to a tenant)
  5. Handle no `CustomerProfileDB` found → return empty measurements (new account, no profile created by owner yet)
  6. **Reference pattern:** See `backend/src/api/v1/export.py` lines 87-100 for the exact `user_id → CustomerProfileDB` lookup query

### Backend Import Guidance

The new endpoint in `customer_profile.py` requires these imports:
```python
from sqlalchemy import select
from src.models.db_models import CustomerProfileDB
from src.models.customer import MeasurementResponse  # NOTE: from customer.py, NOT customer_profile.py
from src.services.measurement_service import get_measurements_history, get_default_measurement
```
**CRITICAL:** `MeasurementResponse` Pydantic schema lives in `src.models.customer` (Story 1.3), NOT `src.models.customer_profile` (Story 4.4b). The existing `customer_profile.py` router currently only imports from `src.models.customer_profile` — do not confuse the two model files.

### Authoritative Server Pattern

- Backend is SSOT for all measurement data
- Frontend is read-only display layer — NO mutations from customer side
- All measurement values validated by Pydantic on backend (Story 1.3 already handles this)

### API Response Format

Follow established wrapper pattern:
```json
{
  "data": {
    "default_measurement": { ... } | null,
    "measurements": [ ... ],
    "measurement_count": 0
  },
  "meta": {}
}
```

### Session & Auth Pattern (from Story 4.4b)

- Server Component: `auth()` from `@/auth` for session check
- Server Action: `getAuthToken()` → Bearer JWT → fetch backend
- Client Component: receives data via props from Server Component (NOT useSession)
- Auth guard: parent `profile/layout.tsx` already handles redirect to `/signin`

### Toast & UI Patterns (from Story 4.4a/4.4b/4.4c)

- Inline toast with useState + useRef timer, 3000ms auto-dismiss (only if needed for error retry)
- Heritage Palette: Indigo-600 primary, gray-50 page bg, white cards, serif fonts for headings
- Touch targets: minimum 44x44px
- Active navigation: `border-l-2 border-indigo-600` desktop, `border-b-2` mobile (already in ProfileSidebar)

### Vietnamese Terminology for Measurements

| DB Field | Vietnamese Label | Unit |
|---|---|---|
| neck | Vòng cổ | cm |
| shoulder_width | Rộng vai | cm |
| bust | Vòng ngực | cm |
| waist | Vòng eo | cm |
| hip | Vòng mông | cm |
| top_length | Dài áo | cm |
| sleeve_length | Dài tay áo | cm |
| wrist | Vòng cổ tay | cm |
| height | Chiều cao | cm |
| weight | Cân nặng | kg |

### Project Structure Notes

#### Files to CREATE:
- `frontend/src/components/client/profile/MeasurementDisplay.tsx` — Main client component
- `frontend/src/__tests__/MeasurementDisplay.test.tsx` — Component tests (flat in __tests__/, matches existing convention)
- `frontend/src/__tests__/measurementActions.test.ts` — Server Action tests (.ts not .tsx — no JSX, matches profileActions.test.ts)
- `backend/tests/test_customer_profile_measurements_api.py` — Backend endpoint tests (name shows connection to customer_profile router)

#### Files to MODIFY:
- `frontend/src/app/(customer)/profile/measurements/page.tsx` — Replace placeholder with Server Component
- `frontend/src/app/actions/profile-actions.ts` — Add `getMyMeasurements()` Server Action
- `backend/src/api/v1/customer_profile.py` — Add GET measurements endpoint
- `backend/src/main.py` — Verify customer_profile router is already included (it is from 4.4b)

#### Files to REUSE (DO NOT MODIFY):
- `frontend/src/types/customer.ts` — `MeasurementResponse` interface already defined
- `backend/src/models/db_models.py` — `MeasurementDB`, `CustomerProfileDB` already exist
- `backend/src/models/customer.py` — `MeasurementResponse` Pydantic schema exists; also `CustomerWithMeasurementsResponse` model available (but using custom response shape for self-service endpoint)
- `backend/src/models/customer_profile.py` — Separate Pydantic models for self-service profile (DO NOT confuse with `customer.py`)
- `backend/src/services/measurement_service.py` — Reuse `get_measurements_history(db, customer_id, tenant_id)`, `get_default_measurement(db, customer_id, tenant_id)` — both require `tenant_id` param
- `backend/src/api/v1/export.py` lines 87-100 — Reference pattern for `user_id → CustomerProfileDB` lookup query
- `frontend/src/components/client/MeasurementHistory.tsx` — Reference for UI patterns, but DO NOT import (owner-specific component)

### Anti-Pattern Prevention

- **DO NOT** create a new measurement form/editor — customer is READ-ONLY
- **DO NOT** add react-hook-form or Zod validation for this story — no forms needed
- **DO NOT** install new npm packages — everything needed exists
- **DO NOT** create new database migrations — `measurements` table already exists
- **DO NOT** duplicate the MeasurementHistory component — create a new read-only display component
- **DO NOT** use `useSession()` from next-auth/react — pass session data via Server Component props
- **DO NOT** use sonner or other toast libraries — use inline useState pattern if needed
- **DO NOT** call `/api/v1/customers/{id}/measurements` — that's the owner endpoint; use `/api/v1/customers/me/measurements`

### Previous Story Learnings (from 4.4a, 4.4b, 4.4c)

1. **Memory leak prevention:** Always cleanup timers in useEffect return (4.4b lesson)
2. **Empty string handling:** Use `!== undefined` check, not truthy check — empty strings are valid clear signals (4.4b lesson)
3. **HTML escaping:** If rendering any user-provided text in HTML, use `html.escape()` on backend (4.4c lesson)
4. **SQLAlchemy cast:** Use `cast(String)` not `cast(type_=None)` for PostgreSQL compatibility (4.4c lesson)
5. **Test Vietnamese text exactly:** Assert exact Vietnamese strings in tests (all stories)
6. **Server Action error pattern:** Return `{ success: false, error: "message" }` — never throw from Server Actions (4.4b/4.4c pattern)
7. **Responsive breakpoint:** 768px (md:) for mobile/desktop switch (4.4a pattern)
8. **ProfileSidebar active state:** Already handled by `usePathname()` — measurements page will auto-highlight when URL is `/profile/measurements`

### Git Intelligence

Recent commits show pattern of: `feat(story-X.Y)` for implementation, `fix(story-X.Y)` for code review fixes. All stories go through code review after implementation. Recent work has been on customer profile stories (4.4a, 4.4b, 4.4c) — code patterns are fresh and consistent.

### References

- [Source: backend/src/api/v1/customer_profile.py] — Self-service endpoint pattern (4.4b)
- [Source: backend/src/services/measurement_service.py] — Measurement CRUD service
- [Source: backend/src/models/db_models.py#MeasurementDB] — ORM model
- [Source: frontend/src/types/customer.ts#MeasurementResponse] — TypeScript interface
- [Source: frontend/src/components/client/MeasurementHistory.tsx] — UI reference for measurement display
- [Source: frontend/src/app/actions/profile-actions.ts] — Server Action pattern
- [Source: frontend/src/app/(customer)/profile/measurements/page.tsx] — Current placeholder
- [Source: backend/src/api/v1/export.py#L87-100] — user_id → CustomerProfileDB lookup pattern (CRITICAL reference)
- [Source: backend/src/models/customer_profile.py] — Separate Pydantic models for self-service (DO NOT confuse with customer.py)
- [Source: frontend/src/components/client/profile/PersonalInfoForm.tsx] — Form component pattern reference
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md#Story4.4d] — Story definition
- [Source: _bmad-output/planning-artifacts/architecture.md] — Authoritative Server pattern, RBAC
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Boutique Mode, Heritage Palette, Zero-Thought Commerce

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- **Route conflict discovered:** `GET /api/v1/customers/{customer_id}/measurements` in `customers_router` (OwnerOrTailor-only) was intercepting `GET /api/v1/customers/me/measurements` because `customers_router` was registered before `customer_profile_router` in `main.py`. Fix: moved `customer_profile_router` registration to come BEFORE `customers_router` in `main.py`. The existing `GET /me/profile` worked fine because no `/{customer_id}/profile` route existed in `customers_router`.
- **Decimal serialization:** Backend returns Decimal values as `"34.00"` strings via Pydantic `model_dump(mode="json")`. Tests updated to use `float()` cast for assertions.

### Completion Notes List

- AC1: Default measurement shown with highlight card (amber-50/amber-200) + all 10 fields with Vietnamese labels
- AC2: Measurement history list sorted DESC, collapsible cards with date + key fields summary + expand for full details
- AC3: Read-only enforced — customer-facing page is VIEW only, no edit/add/delete UI. Notice banner displayed.
- AC4: Empty state rendered when no measurements, with CTA to book appointment at shop
- AC5: Responsive grid — 2 cols mobile, 4 cols desktop (`grid-cols-2 md:grid-cols-4`)
- AC6: Loading skeleton and error state with retry button implemented
- Backend: `GET /api/v1/customers/me/measurements` → returns `{ data: { default_measurement, measurements, measurement_count }, meta: {} }`. Handles no-tenant, no-profile gracefully (empty response, not error).
- Frontend: Server Component page fetches data, passes to MeasurementDisplay client component
- Tests: 6 backend pytest tests all pass, 13 frontend component tests pass, 7 server action tests pass

### File List

- `backend/src/api/v1/customer_profile.py` — Added `GET /measurements` endpoint + imports (sqlalchemy select, CustomerProfileDB, MeasurementResponse, measurement_service)
- `backend/src/main.py` — Moved `customer_profile_router` before `customers_router` to fix route conflict
- `backend/tests/test_customer_profile_measurements_api.py` — NEW: 6 backend tests
- `frontend/src/app/actions/profile-actions.ts` — Added `getMyMeasurements()` Server Action and `MeasurementsData` interface
- `frontend/src/components/client/profile/MeasurementDisplay.tsx` — NEW: Client component with default card, history list, empty/loading/error states
- `frontend/src/app/(customer)/profile/measurements/page.tsx` — Replaced placeholder with Server Component
- `frontend/src/__tests__/measurementActions.test.ts` — NEW: 7 server action tests
- `frontend/src/__tests__/MeasurementDisplay.test.tsx` — NEW: 13 component tests

## Change Log

- 2026-03-18: Story 4.4d implemented — Customer self-service measurements view. Added backend `GET /api/v1/customers/me/measurements` endpoint, `MeasurementDisplay` client component, `getMyMeasurements()` server action, and updated measurements page from placeholder to full implementation. Fixed route conflict in main.py by reordering router registration. All 26 tests pass.
