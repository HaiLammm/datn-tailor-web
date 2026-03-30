---
title: 'Auto-fill Shipping Info from Customer Profile'
slug: 'auto-fill-shipping-from-profile'
created: '2026-03-30'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16 (App Router)', 'FastAPI', 'SQLAlchemy', 'PostgreSQL', 'react-hook-form', 'Zod', 'Tailwind CSS', 'next-auth']
files_to_modify: ['backend/migrations/027_add_shipping_address_autofill_to_users.sql', 'backend/src/models/db_models.py', 'backend/src/models/customer_profile.py', 'backend/src/api/v1/customer_profile.py', 'frontend/src/types/customer.ts', 'frontend/src/app/actions/profile-actions.ts', 'frontend/src/components/client/profile/PersonalInfoForm.tsx', 'frontend/src/components/client/checkout/ShippingFormClient.tsx', 'backend/tests/test_customer_profile_api.py']
code_patterns: ['Pydantic models for request/response', 'Server Actions pattern (getAuthToken + AbortController)', 'react-hook-form + Zod for profile form', 'Inline validators (no Zod) in ShippingFormClient', 'useSession from next-auth/react', 'Raw SQL migrations with sequential numbering (001-026)']
test_patterns: ['pytest-asyncio with in-memory SQLite', 'httpx AsyncClient + ASGITransport', 'Inline fixtures in test file']
---

# Tech-Spec: Auto-fill Shipping Info from Customer Profile

**Created:** 2026-03-30

## Overview

### Problem Statement

Khách hàng phải nhập lại thông tin shipping (tên, SĐT, địa chỉ) mỗi lần checkout, dù đã có profile với đầy đủ thông tin cá nhân. Hiện tại profile chưa lưu structured address và chưa có cơ chế auto-fill tại checkout.

### Solution

Thêm structured address fields (shipping_province, shipping_district, shipping_ward, shipping_address_detail) và thuộc tính `auto_fill_infor` (boolean, default false) vào customer profile. Tại checkout/shipping form, nếu user đã đăng nhập, hiển thị button "Tự động điền thông tin" ở đầu form — khi bấm sẽ fetch profile data qua `getCustomerProfile()` Server Action và tự động điền vào các trường tương ứng.

### Scope

**In Scope:**
- Thêm address fields + `auto_fill_infor` vào customer profile (backend model, migration, API)
- Cập nhật frontend profile form — cho phép nhập/sửa address + toggle `auto_fill_infor`
- ShippingFormClient — button auto-fill ở đầu form (chỉ khi authenticated), fetch profile và fill form
- Cập nhật types/schemas frontend

**Out of Scope:**
- Thay đổi logic submit order / checkout flow hiện tại
- Guest checkout
- Lưu nhiều địa chỉ (address book)
- Tự động fill khi load page (chỉ fill khi bấm button)

## Context for Development

### Codebase Patterns

- **Backend Models:** Pydantic models define request/response schemas (`CustomerProfileResponse`, `CustomerProfileUpdateRequest`). ORM model is `UserDB` in `db_models.py`.
- **Backend API:** FastAPI router at `/api/v1/customers/me/profile` (GET/PATCH). Uses `CurrentUser` dependency for auth. Returns `{"data": ..., "meta": {}}` envelope.
- **Migrations:** Raw SQL files in `backend/migrations/`, sequential numbering (current latest: 026). Next: 027.
- **Frontend Actions:** Server Actions in `profile-actions.ts` follow pattern: `getAuthToken()` → `fetch()` with 10s timeout → structured `{success, data?, error?}` return.
- **Profile Form:** `PersonalInfoForm.tsx` uses `react-hook-form` + `zodResolver(profileUpdateSchema)`. Grid layout (label col-1, input col-2). Inline toast for feedback.
- **Shipping Form:** `ShippingFormClient.tsx` uses `useState` + inline validators (no Zod). Has `handleChange`, `handleBlur`, `validateForm` pattern.
- **Auth in Client Components:** `useSession()` from `next-auth/react` to detect authenticated user.
- **Existing `address` field:** `UserDB` has an `address` (Text) column — single unstructured string used elsewhere. The new structured fields are SEPARATE additions with `shipping_` prefix.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/src/models/db_models.py:41-74` | `UserDB` ORM model — add new columns here |
| `backend/src/models/customer_profile.py:1-48` | Pydantic `CustomerProfileResponse` + `CustomerProfileUpdateRequest` — add new fields |
| `backend/src/api/v1/customer_profile.py:77-128` | GET/PATCH profile endpoints — return/accept new fields |
| `frontend/src/types/customer.ts:174-199` | `CustomerProfileDetail` interface + `profileUpdateSchema` — add new fields |
| `frontend/src/app/actions/profile-actions.ts:30-125` | `getCustomerProfile()` + `updateCustomerProfile()` — handle new fields in body |
| `frontend/src/components/client/profile/PersonalInfoForm.tsx` | Profile edit form — add address section + auto_fill toggle |
| `frontend/src/components/client/checkout/ShippingFormClient.tsx:114-320` | Shipping form component — add auto-fill button at top |
| `backend/tests/test_customer_profile_api.py` | Existing profile API tests — extend for new fields |

### Technical Decisions

- `auto_fill_infor` is a boolean persisted in backend `UserDB` (default: false)
- New structured address columns: `shipping_province`, `shipping_district`, `shipping_ward`, `shipping_address_detail` — all nullable String/Text
- Button only renders for authenticated users (check via `useSession()`)
- Button placed at top of "Địa Chỉ Giao Hàng" card, before input fields
- Auto-fill populates: fullName, phone, province, district, ward, addressDetail from profile
- If profile fields are empty/null, those form fields remain empty (no partial fill errors)
- Reuse existing `getCustomerProfile()` Server Action in ShippingFormClient — no new API endpoint needed

## Implementation Plan

### Tasks

- [ ] **Task 1: DB Migration — Add columns to users table**
  - File: `backend/migrations/027_add_shipping_address_autofill_to_users.sql`
  - Action: Create new migration adding 5 nullable columns to `users` table:
    - `shipping_province VARCHAR(100) DEFAULT NULL`
    - `shipping_district VARCHAR(100) DEFAULT NULL`
    - `shipping_ward VARCHAR(100) DEFAULT NULL`
    - `shipping_address_detail TEXT DEFAULT NULL`
    - `auto_fill_infor BOOLEAN DEFAULT FALSE NOT NULL`
  - Notes: Follow existing migration pattern (raw SQL, header comment with story reference)

- [ ] **Task 2: Backend ORM — Add columns to UserDB model**
  - File: `backend/src/models/db_models.py`
  - Action: Add 5 new `Mapped` columns to `UserDB` class after existing `address` field (line 64):
    - `shipping_province: Mapped[str | None] = mapped_column(String(100), nullable=True)`
    - `shipping_district: Mapped[str | None] = mapped_column(String(100), nullable=True)`
    - `shipping_ward: Mapped[str | None] = mapped_column(String(100), nullable=True)`
    - `shipping_address_detail: Mapped[str | None] = mapped_column(Text, nullable=True)`
    - `auto_fill_infor: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)`
  - Notes: Place after `address` field, before `avatar_url`

- [ ] **Task 3: Backend Pydantic — Add fields to response/request models**
  - File: `backend/src/models/customer_profile.py`
  - Action:
    1. Add to `CustomerProfileResponse`: `shipping_province: str | None`, `shipping_district: str | None`, `shipping_ward: str | None`, `shipping_address_detail: str | None`, `auto_fill_infor: bool`
    2. Add to `CustomerProfileUpdateRequest`: `shipping_province: str | None = None`, `shipping_district: str | None = None`, `shipping_ward: str | None = None`, `shipping_address_detail: str | None = None`, `auto_fill_infor: bool | None = None`
  - Notes: No special validation needed for address string fields. `auto_fill_infor` defaults to `None` in update request (only update if provided).

- [ ] **Task 4: Backend API — Update GET/PATCH endpoints**
  - File: `backend/src/api/v1/customer_profile.py`
  - Action:
    1. `get_my_profile()` (line 77): Add new fields to `CustomerProfileResponse(...)` constructor — read from `current_user.shipping_province`, etc.
    2. `update_my_profile()` (line 98): Add handling for new fields in PATCH body — apply `body.shipping_province`, `body.shipping_district`, `body.shipping_ward`, `body.shipping_address_detail`, `body.auto_fill_infor` to `current_user` (same pattern as existing `full_name`/`phone`/`gender`). Update response constructor to include new fields.
  - Notes: Follow existing pattern: `if body.field is not None: current_user.field = body.field`

- [ ] **Task 5: Frontend Types — Update CustomerProfileDetail + profileUpdateSchema**
  - File: `frontend/src/types/customer.ts`
  - Action:
    1. Add to `CustomerProfileDetail` interface (line 174): `shipping_province: string | null`, `shipping_district: string | null`, `shipping_ward: string | null`, `shipping_address_detail: string | null`, `auto_fill_infor: boolean`
    2. Add to `profileUpdateSchema` Zod schema (line 186): `shipping_province: z.string().optional().or(z.literal(""))`, `shipping_district: z.string().optional().or(z.literal(""))`, `shipping_ward: z.string().optional().or(z.literal(""))`, `shipping_address_detail: z.string().optional().or(z.literal(""))`, `auto_fill_infor: z.boolean().optional()`
  - Notes: `ProfileUpdateInput` type auto-infers from Zod schema. No changes needed in `CustomerProfileResponse` (that's the admin/tenant-facing type).

- [ ] **Task 6: Frontend Actions — Handle new fields in updateCustomerProfile**
  - File: `frontend/src/app/actions/profile-actions.ts`
  - Action: In `updateCustomerProfile()` function (line 75), extend the `body` object construction to include new fields:
    - `if (data.shipping_province !== undefined) body.shipping_province = data.shipping_province`
    - Same for `shipping_district`, `shipping_ward`, `shipping_address_detail`
    - `if (data.auto_fill_infor !== undefined) body.auto_fill_infor = data.auto_fill_infor`
  - Notes: `getCustomerProfile()` needs NO changes — it already returns `json.data` cast to `CustomerProfileDetail`, and the new fields will be included automatically from the backend response.

- [ ] **Task 7: Frontend Profile Form — Add address fields + auto_fill toggle**
  - File: `frontend/src/components/client/profile/PersonalInfoForm.tsx`
  - Action:
    1. Add `defaultValues` for new fields: `shipping_province`, `shipping_district`, `shipping_ward`, `shipping_address_detail`, `auto_fill_infor`
    2. Add address section after Gender field — follow existing grid layout pattern (`md:grid md:grid-cols-3 md:gap-4`):
       - Section header: "Địa chỉ giao hàng"
       - Row: Tỉnh/Thành phố input (`shipping_province`)
       - Row: Quận/Huyện input (`shipping_district`)
       - Row: Phường/Xã input (`shipping_ward`)
       - Row: Địa chỉ chi tiết input (`shipping_address_detail`)
    3. Add toggle for "Tự động điền thông tin khi checkout" (`auto_fill_infor`) — use a checkbox or toggle switch, placed after address fields
    4. Register all new fields with `react-hook-form`
  - Notes: Follow existing form field pattern. Use same Tailwind classes. Toggle is a simple checkbox with label.

- [ ] **Task 8: Frontend Shipping Form — Add auto-fill button**
  - File: `frontend/src/components/client/checkout/ShippingFormClient.tsx`
  - Action:
    1. Import `useSession` from `next-auth/react`
    2. Import `getCustomerProfile` from `@/app/actions/profile-actions`
    3. Add state: `const [isAutoFilling, setIsAutoFilling] = useState(false)`
    4. Get session: `const { data: session } = useSession()`
    5. Create `handleAutoFill` async function:
       - Set `isAutoFilling(true)`
       - Call `getCustomerProfile()`
       - If success and `data.auto_fill_infor === true`:
         - Set form fields from profile: `fullName = data.full_name`, `phone = data.phone`, `province = data.shipping_province`, `district = data.shipping_district`, `ward = data.shipping_ward`, `addressDetail = data.shipping_address_detail`
         - Only set non-null values (skip null fields)
         - Clear any existing validation errors for filled fields
       - If `data.auto_fill_infor === false`: show message "Tính năng tự động điền chưa được bật. Vui lòng bật trong Hồ sơ cá nhân."
       - Handle errors gracefully
       - Set `isAutoFilling(false)`
    6. Render button at top of "Địa Chỉ Giao Hàng" card (after `<h2>` heading, before first input):
       - Only render if `session` exists (authenticated)
       - Button text: "Tự động điền thông tin"
       - Disabled state while `isAutoFilling`
       - Style: outline/secondary button (border style, not primary gold)
       - `data-testid="auto-fill-button"`
  - Notes: Button is `type="button"` (not submit). Use `setFormData()` to update all fields at once. Clear errors with `setErrors({})` after auto-fill.

- [ ] **Task 9: Backend Tests — Add tests for new fields**
  - File: `backend/tests/test_customer_profile_api.py`
  - Action:
    1. Update `seed_user_data` fixture: add `shipping_province`, `shipping_district`, `shipping_ward`, `shipping_address_detail`, `auto_fill_infor` to the seeded customer
    2. Add test: `test_get_profile_includes_shipping_address` — GET profile returns all new fields
    3. Add test: `test_update_shipping_address` — PATCH with address fields updates and returns correctly
    4. Add test: `test_update_auto_fill_infor_toggle` — PATCH with `auto_fill_infor: true` persists and returns
    5. Add test: `test_partial_update_preserves_address` — PATCH with only `full_name` does not clear address fields
  - Notes: Follow existing test pattern (httpx AsyncClient, auth via Bearer token, assert response structure)

### Acceptance Criteria

- [ ] **AC1:** Given a logged-in customer, when they visit their profile page, then they see address fields (Tỉnh/Thành phố, Quận/Huyện, Phường/Xã, Địa chỉ chi tiết) and a "Tự động điền khi checkout" toggle.

- [ ] **AC2:** Given a customer updates their profile with address info and enables `auto_fill_infor`, when they save, then the data is persisted to the backend and reflected on reload.

- [ ] **AC3:** Given a logged-in customer at checkout/shipping with `auto_fill_infor = true` and saved address in profile, when they click "Tự động điền thông tin", then fullName, phone, province, district, ward, and addressDetail fields are populated from their profile.

- [ ] **AC4:** Given a logged-in customer with `auto_fill_infor = false`, when they click "Tự động điền thông tin", then a message informs them to enable the feature in their profile settings.

- [ ] **AC5:** Given a guest (not logged-in) user at checkout/shipping, when the shipping form renders, then the "Tự động điền thông tin" button is NOT visible.

- [ ] **AC6:** Given a logged-in customer with some profile fields empty (e.g., no phone), when they click auto-fill, then only non-null fields are filled and empty fields remain empty (no errors thrown).

- [ ] **AC7:** Given the backend API, when PATCH `/api/v1/customers/me/profile` is called with only `full_name`, then address fields and `auto_fill_infor` are NOT overwritten (partial update behavior preserved).

## Additional Context

### Dependencies

- No new packages required. All libraries already present in project.
- `getCustomerProfile()` Server Action already handles auth + error cases — reused in ShippingFormClient.
- `useSession()` from `next-auth/react` already used across project.
- Migration 027 must run before backend code changes take effect.

### Testing Strategy

- **Backend unit tests:** Extend `test_customer_profile_api.py` with 4 new test cases (Task 9) covering GET/PATCH for new fields + partial update preservation.
- **Frontend manual testing:**
  1. Profile page: verify address fields render, save, persist on reload
  2. Profile page: verify auto_fill toggle saves correctly
  3. Checkout (logged in, auto_fill ON, address saved): verify button visible, click fills form correctly
  4. Checkout (logged in, auto_fill OFF): verify button shows info message
  5. Checkout (guest): verify button not visible
  6. Checkout (logged in, partial profile): verify partial fill works without errors

### Notes

- The existing `address` field in `UserDB` (Text column) is unrelated to the new structured shipping address fields. Do not remove or modify it.
- Field name mapping between backend and frontend shipping form:
  - `shipping_province` → form `province`
  - `shipping_district` → form `district`
  - `shipping_ward` → form `ward`
  - `shipping_address_detail` → form `addressDetail`
  - `full_name` → form `fullName`
  - `phone` → form `phone`
- If the user later wants auto-fill on page load (not just button click), this can be added by checking `auto_fill_infor` in a `useEffect` — but that is out of scope for now.
