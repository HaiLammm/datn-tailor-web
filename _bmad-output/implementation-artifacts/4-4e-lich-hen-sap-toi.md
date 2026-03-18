# Story 4.4e: Lịch hẹn sắp tới

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng,
I want xem danh sách lịch hẹn đã đặt và hủy lịch hẹn nếu còn đủ thời gian,
so that tôi không quên lịch tư vấn tại tiệm và có thể quản lý lịch hẹn của mình.

## Acceptance Criteria

1. **AC1 — Appointments List Display:** Given Customer đang ở Profile → tab "Lịch hẹn", When load appointments, Then hiển thị danh sách lịch hẹn sắp xếp: upcoming (sắp tới) trước, past (đã qua) sau. Mỗi appointment card hiển thị: Ngày hẹn, Buổi (Sáng/Chiều), Trạng thái (badge), Yêu cầu đặc biệt (nếu có).
2. **AC2 — Status Badges:** Hiển thị badge với màu sắc: `pending` (Vàng - "Chờ xác nhận"), `confirmed` (Xanh dương - "Đã xác nhận"), `cancelled` (Đỏ - "Đã hủy"). Lịch hẹn quá ngày hiện tại hiển thị thêm label "Đã qua".
3. **AC3 — Countdown Display:** Given appointment sắp tới (ngày >= hôm nay), Then hiển thị countdown: "Còn X ngày" (hoặc "Hôm nay" nếu ngày hẹn = hôm nay).
4. **AC4 — Cancel Appointment:** Given appointment có status != "cancelled" AND ngày hẹn > 24h từ bây giờ, Then hiển thị nút "Hủy lịch hẹn". When click hủy, Then hiện confirm dialog. When xác nhận, Then call API PATCH cancel → cập nhật status → hiển thị toast thành công. Given appointment trong vòng 24h, Then nút hủy disabled với tooltip "Không thể hủy trong vòng 24h trước giờ hẹn".
5. **AC5 — Empty State:** Given Customer chưa có lịch hẹn nào, When load page, Then hiển thị empty state với icon calendar, message "Chưa có lịch hẹn nào", và CTA "Đặt lịch tư vấn" link đến `/booking`.
6. **AC6 — Loading & Error States:** Given API đang load, Then hiển thị skeleton placeholder. Given API lỗi, Then hiển thị error message với nút retry.
7. **AC7 — Responsive Layout:** Mobile (<768px): Card list 1 cột. Desktop (>=768px): Card grid 2 cột. Tuân thủ Heritage Palette Boutique Mode.

## Tasks / Subtasks

- [x] Task 1: Backend — Customer self-service appointments endpoint (AC: #1, #2, #3, #6)
  - [x] 1.1 Add `GET /api/v1/customers/me/appointments` endpoint in `customer_profile.py`
  - [x] 1.2 Query `AppointmentDB` where `customer_email == current_user.email` AND `tenant_id == current_user.tenant_id` (or default tenant), sorted by `appointment_date DESC`
  - [x] 1.3 Return `{ data: { appointments: [...], appointment_count: N }, meta: {} }`
  - [x] 1.4 Handle case: no tenant_id → return empty. Handle no appointments → return empty array.
- [x] Task 2: Backend — Cancel appointment endpoint (AC: #4)
  - [x] 2.1 Add `PATCH /api/v1/customers/me/appointments/{appointment_id}/cancel` in `customer_profile.py`
  - [x] 2.2 Validate: appointment belongs to current_user (match email + tenant), status is not already "cancelled"
  - [x] 2.3 Validate: appointment_date is > 24h from now (compare with datetime.now(UTC))
  - [x] 2.4 Update status to "cancelled" → commit → return updated appointment
  - [x] 2.5 Return 400 if within 24h window, 404 if not found/not owned, 409 if already cancelled
- [x] Task 3: Backend Tests (AC: #1, #4)
  - [x] 3.1 Write `backend/tests/test_customer_appointments_api.py`
  - [x] 3.2 Tests: GET success, GET empty, GET unauthorized; CANCEL success, CANCEL within 24h (400), CANCEL not found, CANCEL already cancelled (409), CANCEL unauthorized
- [x] Task 4: Frontend — Server Action for appointments (AC: #1, #4, #6)
  - [x] 4.1 Add `getMyAppointments()` Server Action in `profile-actions.ts`
  - [x] 4.2 Add `cancelMyAppointment(appointmentId)` Server Action in `profile-actions.ts`
  - [x] 4.3 Follow exact pattern from `getMyMeasurements()`: Bearer auth, 10s timeout, error per HTTP status
  - [x] 4.4 Return typed `{ success, data?, error? }` response
- [x] Task 5: Frontend — AppointmentList client component (AC: #1, #2, #3, #4, #5, #7)
  - [x] 5.1 Create `components/client/profile/AppointmentList.tsx` — client component ("use client")
  - [x] 5.2 Props: `appointments: AppointmentResponse[]`, `appointmentCount: number`
  - [x] 5.3 Separate upcoming (date >= today, not cancelled) vs past (date < today OR cancelled)
  - [x] 5.4 Appointment card: date (formatted Vietnamese), slot (Sáng/Chiều), status badge, special_requests
  - [x] 5.5 Countdown: "Hôm nay", "Ngày mai", "Còn X ngày" for upcoming
  - [x] 5.6 Cancel button with confirm dialog (inline, no external modal lib)
  - [x] 5.7 Cancel button disabled + tooltip if appointment within 24h
  - [x] 5.8 Empty state with calendar icon + CTA "Đặt lịch tư vấn" → `/booking`
  - [x] 5.9 Loading skeleton state (passed via props or internal)
  - [x] 5.10 Error state with retry button
  - [x] 5.11 Responsive: 1 col mobile, 2 cols desktop (`grid-cols-1 md:grid-cols-2`)
- [x] Task 6: Frontend — Replace placeholder page (AC: all)
  - [x] 6.1 Update `app/(customer)/profile/appointments/page.tsx` — Server Component
  - [x] 6.2 Fetch appointments via `getMyAppointments()` Server Action
  - [x] 6.3 Pass data to AppointmentList client component
  - [x] 6.4 Heritage Palette styling (Silk Ivory bg, Indigo accents, serif headings)
- [x] Task 7: Frontend Tests (AC: all)
  - [x] 7.1 `frontend/src/__tests__/AppointmentList.test.tsx` — Component tests: render upcoming, render past, empty state, loading, error, cancel flow, countdown display, responsive
  - [x] 7.2 `frontend/src/__tests__/appointmentActions.test.ts` — Server Action tests: getMyAppointments success/unauthorized/error, cancelMyAppointment success/within-24h/not-found/error

## Dev Notes

### Critical Architecture Decisions

- **Appointment lookup by email:** The `appointments` table stores `customer_email` (not `user_id` or `customer_id`) because bookings are created via the public booking flow (Story 3.4) without authentication. To find "my appointments", query WHERE `customer_email == current_user.email`. This is the correct link between auth user and appointments.
- **Tenant ID handling:** Current booking endpoints use a hardcoded default tenant `00000000-0000-0000-0000-000000000001` (see `appointments.py:get_default_tenant_id()`). The self-service endpoint should use `current_user.tenant_id` if available, falling back to the same default tenant for MVP.
- **Cancel is a PATCH, not DELETE:** Appointments are not deleted — status is updated to "cancelled". This preserves history and audit trail. Use PATCH not DELETE.
- **24h cancellation rule:** The AC specifies > 24h before appointment. Since appointments only have a date (no time), interpret as: `appointment_date > today` is cancellable (i.e., you cannot cancel same-day appointments). More precisely: use `appointment_date > date.today()` as the simple rule. If `appointment_date == date.today()`, it's within 24h.
- **No new DB model changes:** Reuse existing `AppointmentDB`, `AppointmentResponse`, `AppointmentStatus` from Story 3.4 — do NOT create new tables or models.

### Backend Implementation Pattern

```python
# In customer_profile.py — add these endpoints:

@router.get("/appointments", response_model=dict)
async def get_my_appointments(
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    # Query by customer_email (appointments are created via public form with email)
    # Use current_user.tenant_id or default tenant
    ...

@router.patch("/appointments/{appointment_id}/cancel", response_model=dict)
async def cancel_my_appointment(
    appointment_id: str,  # UUID
    current_user: CurrentUser,
    db=Depends(get_db),
) -> dict:
    # Validate ownership (email match), status not cancelled, date > today
    ...
```

### Backend Import Guidance

The new endpoints in `customer_profile.py` require these additional imports:
```python
from uuid import UUID as PyUUID
from datetime import date as date_type
from src.models.db_models import AppointmentDB
from src.models.appointment import AppointmentResponse
```
**CRITICAL:** `AppointmentResponse` Pydantic schema lives in `src.models.appointment` (Story 3.4). Do NOT create a new response model — reuse the existing one.

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | How |
|------|-------|-----|
| AppointmentDB ORM model | `backend/src/models/db_models.py:364` | Query appointments table directly |
| AppointmentResponse schema | `backend/src/models/appointment.py` | Return response with `model_validate()` |
| AppointmentStatus type | `backend/src/models/appointment.py` | "pending", "confirmed", "cancelled" |
| CurrentUser dependency | `backend/src/api/dependencies.py` | Auth user injection |
| Booking types (frontend) | `frontend/src/types/booking.ts` | `AppointmentResponse`, `AppointmentStatus`, `AppointmentSlot` |
| Server Action pattern | `frontend/src/app/actions/profile-actions.ts` | `getAuthToken()`, Bearer auth, timeout, error handling |
| Profile page pattern | `frontend/src/app/(customer)/profile/measurements/page.tsx` | Server Component → fetch → pass to client |
| Heritage Palette colors | Stories 4.4a-4.4d | Indigo-600 primary, gray-50 bg, white cards, serif headings |
| Skeleton pattern | `MeasurementDisplay.tsx` | Loading skeleton component |
| ProfileSidebar nav | Story 4.4a | Already includes "Lịch hẹn" link with auto-highlight via usePathname() |

### API Response Format

Follow established wrapper pattern:
```json
{
  "data": {
    "appointments": [
      {
        "id": "uuid",
        "customer_name": "Nguyễn Linh",
        "customer_phone": "0931234567",
        "customer_email": "linh@example.com",
        "appointment_date": "2026-03-25",
        "slot": "morning",
        "status": "confirmed",
        "special_requests": "Tư vấn áo dài cưới",
        "created_at": "2026-03-18T10:00:00Z"
      }
    ],
    "appointment_count": 5
  },
  "meta": {}
}
```

### Session & Auth Pattern (from Stories 4.4b/4.4d)

- Server Component: `auth()` from `@/auth` for session check
- Server Action: `getAuthToken()` → Bearer JWT → fetch backend
- Client Component: receives data via props from Server Component (NOT useSession)
- Auth guard: parent `profile/layout.tsx` already handles redirect to `/signin`

### Vietnamese UI Labels

| English | Vietnamese |
|---------|-----------|
| Upcoming Appointments | Lịch hẹn sắp tới |
| Past Appointments | Lịch hẹn đã qua |
| morning | Buổi Sáng |
| afternoon | Buổi Chiều |
| pending | Chờ xác nhận |
| confirmed | Đã xác nhận |
| cancelled | Đã hủy |
| Today | Hôm nay |
| Tomorrow | Ngày mai |
| X days left | Còn X ngày |
| Cancel | Hủy lịch hẹn |
| Cancel confirm | Bạn có chắc muốn hủy lịch hẹn này? |
| Cannot cancel | Không thể hủy trong vòng 24h trước giờ hẹn |
| No appointments | Chưa có lịch hẹn nào |
| Book CTA | Đặt lịch tư vấn |
| Special requests | Yêu cầu đặc biệt |

### Design: Heritage Palette (Boutique Mode)

- **Background:** `bg-gray-50` (page), `bg-white` (cards)
- **Primary accent:** Indigo (`text-indigo-600`, `border-indigo-600`)
- **Section title:** `font-serif font-bold text-gray-900`
- **Status badges:**
  - Pending: `bg-yellow-50 text-yellow-700 border border-yellow-200`
  - Confirmed: `bg-blue-50 text-blue-700 border border-blue-200`
  - Cancelled: `bg-red-50 text-red-700 border border-red-200`
- **Countdown pill:** `bg-indigo-50 text-indigo-700 text-sm font-medium px-2 py-0.5 rounded-full`
- **Past appointment:** `opacity-60` to visually distinguish from upcoming
- **Cancel button:** `text-red-600 hover:text-red-700 border border-red-200 hover:bg-red-50 rounded-lg px-4 py-2`
- **Cancel disabled:** `text-gray-400 border-gray-200 cursor-not-allowed`
- **CTA button:** `bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5`
- **Touch targets:** minimum 44x44px

### Anti-Pattern Prevention

- **DO NOT** create new database tables or migration — `appointments` table already exists
- **DO NOT** create new Pydantic response models — reuse `AppointmentResponse` from `src.models.appointment`
- **DO NOT** install new npm packages — everything needed exists
- **DO NOT** use `useSession()` from next-auth/react — pass session data via Server Component props
- **DO NOT** use sonner or other toast libraries — use inline useState pattern (same as 4.4b)
- **DO NOT** create a booking form here — this story is VIEW + CANCEL only; booking form is Story 3.4
- **DO NOT** query by `customer_id` — appointments store `customer_email`, not `customer_id`. Query by email.
- **DO NOT** add react-hook-form or Zod validation — no forms needed (cancel is a button action, not a form)
- **DO NOT** use window.confirm() — use inline confirm dialog with useState (Heritage Palette styled)
- **DO NOT** add Framer Motion animation — not required for this story, keep it simple
- **DO NOT** add pagination — appointment counts are typically low (<20), load all at once

### Previous Story Learnings (from 4.4a, 4.4b, 4.4c, 4.4d)

1. **Memory leak prevention:** Always cleanup timers in useEffect return (4.4b lesson)
2. **Empty string handling:** Use `!== undefined` check, not truthy check (4.4b lesson)
3. **HTML escaping:** Use `html.escape()` on backend for any user-supplied text rendered in HTML (4.4c lesson)
4. **SQLAlchemy cast:** Use `cast(String)` not `cast(type_=None)` for PostgreSQL compatibility (4.4c lesson)
5. **Test Vietnamese text exactly:** Assert exact Vietnamese strings in tests (all stories)
6. **Server Action error pattern:** Return `{ success: false, error: "message" }` — never throw from Server Actions (4.4b/4.4c pattern)
7. **Responsive breakpoint:** 768px (md:) for mobile/desktop switch (4.4a pattern)
8. **Route conflict prevention:** `customer_profile_router` must be registered BEFORE `customers_router` in `main.py` (4.4d lesson — already fixed)
9. **Decimal serialization:** Backend may return Decimal as string — handle in frontend (4.4d lesson)
10. **ProfileSidebar active state:** Already handled by `usePathname()` — appointments page will auto-highlight when URL is `/profile/appointments`

### Git Intelligence

Recent commits show pattern of: `feat(story-X.Y)` for implementation, `fix(story-X.Y)` for code review fixes. All stories go through code review after implementation. Recent work has been on customer profile stories (4.4a through 4.4d) — code patterns are fresh and consistent. The `customer_profile.py` router already has 4 endpoints (`GET /profile`, `PATCH /profile`, `POST /change-password`, `GET /measurements`). Adding 2 more endpoints to this router keeps it cohesive.

### Project Structure Notes

#### Files to CREATE:
- `frontend/src/components/client/profile/AppointmentList.tsx` — Main client component
- `frontend/src/__tests__/AppointmentList.test.tsx` — Component tests
- `frontend/src/__tests__/appointmentActions.test.ts` — Server Action tests (.ts not .tsx — no JSX)
- `backend/tests/test_customer_appointments_api.py` — Backend endpoint tests

#### Files to MODIFY:
- `frontend/src/app/(customer)/profile/appointments/page.tsx` — Replace placeholder with Server Component
- `frontend/src/app/actions/profile-actions.ts` — Add `getMyAppointments()` and `cancelMyAppointment()` Server Actions
- `backend/src/api/v1/customer_profile.py` — Add GET appointments and PATCH cancel endpoints

#### Files to REUSE (DO NOT MODIFY):
- `frontend/src/types/booking.ts` — `AppointmentResponse`, `AppointmentStatus`, `AppointmentSlot` interfaces already defined
- `backend/src/models/db_models.py` — `AppointmentDB` already exists
- `backend/src/models/appointment.py` — `AppointmentResponse` Pydantic schema exists
- `backend/src/api/v1/appointments.py` — Public booking endpoints (DO NOT modify — this is the guest booking router)
- `backend/src/services/appointment_service.py` — Booking service (DO NOT import for self-service; write inline queries in endpoint)

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md#Story4.4e] — Story definition: "Lịch hẹn sắp tới"
- [Source: _bmad-output/planning-artifacts/epics.md#Epic4-Story4.4] — Original story scope
- [Source: _bmad-output/planning-artifacts/architecture.md] — Authoritative Server pattern, RBAC, API wrapper format
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md] — Boutique Mode, Heritage Palette
- [Source: backend/src/api/v1/customer_profile.py] — Self-service endpoint pattern (4.4b/4.4d)
- [Source: backend/src/api/v1/appointments.py] — Public booking endpoints (reference for tenant_id handling)
- [Source: backend/src/models/db_models.py#AppointmentDB] — ORM model (columns, indexes)
- [Source: backend/src/models/appointment.py] — Pydantic schemas (AppointmentResponse, AppointmentStatus)
- [Source: backend/src/services/appointment_service.py] — Business logic reference (slot availability, MAX_SLOTS)
- [Source: frontend/src/types/booking.ts] — TypeScript interfaces
- [Source: frontend/src/app/actions/profile-actions.ts] — Server Action pattern (getAuthToken, timeout, error handling)
- [Source: frontend/src/app/actions/booking-actions.ts] — Booking actions (reference only, DO NOT reuse — public endpoints)
- [Source: frontend/src/app/(customer)/profile/appointments/page.tsx] — Current placeholder to replace
- [Source: frontend/src/components/client/profile/MeasurementDisplay.tsx] — Client component pattern reference
- [Source: _bmad-output/implementation-artifacts/4-4d-so-do-co-the.md] — Previous story patterns and learnings

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6 (2026-03-18)

### Debug Log References

- Backend test pattern fix: JWT `sub` must contain **email**, not user UUID (matches `get_user_by_email()` lookup). Also `get_db` override requires async generator, not lambda.

### Completion Notes List

- ✅ Task 1-2: Added `GET /appointments` and `PATCH /appointments/{id}/cancel` endpoints to `customer_profile.py`. Reused `AppointmentDB` and `AppointmentResponse` from Story 3.4. 24h rule implemented as `appointment_date <= date.today()`.
- ✅ Task 3: 9 backend tests all pass. Tests cover GET success, empty, unauthorized; CANCEL success, within-24h (400), not-found (404), already-cancelled (409), unauthorized, other-user (404).
- ✅ Task 4: `getMyAppointments()` and `cancelMyAppointment()` Server Actions added to `profile-actions.ts`. Follow exact pattern from `getMyMeasurements()`.
- ✅ Task 5: `AppointmentList.tsx` client component with full feature set: upcoming/past separation, status badges, countdown, cancel with inline confirm dialog, disabled cancel with tooltip, empty state, skeleton, error+retry, responsive grid.
- ✅ Task 6: `appointments/page.tsx` replaced placeholder with Server Component fetching via `getMyAppointments()`.
- ✅ Task 7: 17 component tests + 15 Server Action tests all pass. No regressions (1 pre-existing `OrderBoard` failure unrelated to this story).

### File List

**Created:**
- `backend/tests/test_customer_appointments_api.py`
- `frontend/src/components/client/profile/AppointmentList.tsx`
- `frontend/src/__tests__/AppointmentList.test.tsx`
- `frontend/src/__tests__/appointmentActions.test.ts`

**Modified:**
- `backend/src/api/v1/customer_profile.py` — added GET /appointments and PATCH /appointments/{id}/cancel endpoints
- `frontend/src/app/actions/profile-actions.ts` — added `getMyAppointments()`, `cancelMyAppointment()`, `AppointmentsData` type
- `frontend/src/app/(customer)/profile/appointments/page.tsx` — replaced placeholder with full Server Component

**Change Log:**
- 2026-03-18: Implemented Story 4.4e — Lịch hẹn sắp tới. Backend endpoints, frontend component, full test coverage.
