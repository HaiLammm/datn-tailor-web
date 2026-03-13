# Story 4.4b: Thông tin cá nhân & Bảo mật

Status: ready-for-dev

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng đã đăng nhập,
I want xem và chỉnh sửa thông tin cá nhân (tên, SĐT, giới tính) và đổi mật khẩu,
So that hồ sơ của tôi luôn cập nhật và bảo mật.

## Acceptance Criteria

1. **AC1 — Personal Info Form Display:** Trang `/profile` hiển thị form "Thông tin cá nhân" với các trường: Họ tên (editable), Email (read-only, hiển thị text không phải input), SĐT (editable, optional), Giới tính (dropdown: Nam/Nữ/Khác, optional). Form được pre-fill dữ liệu hiện tại từ backend.
2. **AC2 — Personal Info Save:** Click "Lưu thay đổi" → gọi `PATCH /api/v1/customers/me/profile` → thành công hiển thị toast "Cập nhật thông tin thành công". Nếu validation fail → hiển thị inline errors.
3. **AC3 — Password Change Section:** Phía dưới form cá nhân, có section collapsible "Đổi mật khẩu" gồm 3 trường: Mật khẩu hiện tại, Mật khẩu mới, Xác nhận mật khẩu mới. Mật khẩu mới yêu cầu: tối thiểu 8 ký tự, có chữ hoa, chữ thường, số. Hiển thị password strength indicator.
4. **AC4 — Password Change Submit:** Click "Cập nhật mật khẩu" → gọi `POST /api/v1/customers/me/change-password` → thành công hiển thị toast "Mật khẩu đã cập nhật". Nếu mật khẩu hiện tại sai → hiển thị error "Mật khẩu hiện tại không đúng". Sau khi đổi thành công, clear form đổi mật khẩu.
5. **AC5 — Backend Endpoints:** Backend cung cấp 2 endpoint mới: `GET /api/v1/customers/me/profile` trả thông tin user hiện tại (full_name, email, phone, gender, date_of_birth); `PATCH /api/v1/customers/me/profile` update các trường cho phép (full_name, phone, gender). Cả 2 yêu cầu Bearer JWT auth. Endpoint `POST /api/v1/customers/me/change-password` yêu cầu old_password + new_password, verify old password trước khi update.
6. **AC6 — Responsive Design:** Desktop (≥768px): form 2-column layout (labels bên trái, inputs bên phải). Mobile (<768px): single-column stacked layout. Tuân thủ Heritage Palette Boutique Mode.
7. **AC7 — OAuth User without Password:** Nếu user đăng nhập qua Google (hashed_password=null), section "Đổi mật khẩu" hiển thị thông báo "Tài khoản của bạn sử dụng đăng nhập Google. Để đặt mật khẩu, sử dụng chức năng 'Quên mật khẩu'." thay vì form đổi mật khẩu.

## Tasks / Subtasks

- [ ] Task 1: Backend — Customer Profile Endpoints (AC: #5)
  - [ ] 1.1: Tạo `backend/src/api/v1/customer_profile.py` — New router cho customer self-service endpoints
  - [ ] 1.2: `GET /api/v1/customers/me/profile` — trả `{ data: { full_name, email, phone, gender, date_of_birth, has_password } }`. Dùng `CurrentUser` dependency. Thêm field `has_password: bool` (= hashed_password is not None) để frontend biết user có password hay không (AC7).
  - [ ] 1.3: `PATCH /api/v1/customers/me/profile` — nhận `{ full_name?, phone?, gender? }`, update user record, trả data updated. Email là read-only, KHÔNG cho update qua endpoint này.
  - [ ] 1.4: Tạo Pydantic models trong `backend/src/models/customer_profile.py`: `CustomerProfileResponse`, `CustomerProfileUpdateRequest`
  - [ ] 1.5: Register router trong `backend/src/main.py`

- [ ] Task 2: Backend — Change Password Endpoint (AC: #5)
  - [ ] 2.1: Thêm `POST /api/v1/customers/me/change-password` trong `customer_profile.py` — nhận `{ old_password, new_password }`
  - [ ] 2.2: Verify old_password bằng `verify_password()` từ `core/security.py`. Nếu sai → 400 "Mật khẩu hiện tại không đúng"
  - [ ] 2.3: Nếu user không có password (OAuth-only, hashed_password=None) → 400 "Tài khoản không có mật khẩu. Sử dụng chức năng 'Quên mật khẩu' để đặt mật khẩu."
  - [ ] 2.4: Hash new_password bằng `hash_password()`, update user record, trả success message
  - [ ] 2.5: Tạo Pydantic model `ChangePasswordRequest` trong `customer_profile.py`

- [ ] Task 3: Backend Tests (AC: #5)
  - [ ] 3.1: `backend/tests/test_customer_profile_api.py` — 8+ tests: GET profile success, GET unauthorized, PATCH profile success, PATCH invalid phone, change password success, change password wrong old password, change password OAuth user (no password), change password weak new password

- [ ] Task 4: Frontend Types & Schemas (AC: #1, #2, #3)
  - [ ] 4.1: Thêm types trong `frontend/src/types/customer.ts`: `CustomerProfileDetail` interface (full_name, email, phone, gender, date_of_birth, has_password)
  - [ ] 4.2: Thêm Zod schemas: `profileUpdateSchema` (full_name: min 2, phone: VN format optional, gender: enum optional), `passwordChangeSchema` (old_password: required, new_password: min 8 + uppercase + lowercase + digit, new_password_confirm: must match)

- [ ] Task 5: Frontend Server Actions (AC: #2, #4)
  - [ ] 5.1: Tạo `frontend/src/app/actions/profile-actions.ts` — 3 Server Actions: `getCustomerProfile()`, `updateCustomerProfile(data)`, `changePassword(data)`
  - [ ] 5.2: Follow pattern từ `garment-actions.ts`: `getAuthToken()` helper, Bearer auth, error handling per HTTP status, timeout 10s
  - [ ] 5.3: Return type: `{ success: boolean, data?: T, error?: string }`

- [ ] Task 6: Frontend — PersonalInfoForm Component (AC: #1, #2, #6)
  - [ ] 6.1: Tạo `frontend/src/components/client/profile/PersonalInfoForm.tsx` — "use client" component
  - [ ] 6.2: Form fields: full_name (text input), email (read-only text display, NOT input), phone (text input with VN format hint), gender (select: "", "Nam", "Nữ", "Khác")
  - [ ] 6.3: Sử dụng `react-hook-form` + `@hookform/resolvers/zod` + `profileUpdateSchema` cho validation
  - [ ] 6.4: Pre-fill form với data từ props (passed from Server Component parent)
  - [ ] 6.5: Submit → gọi `updateCustomerProfile()` Server Action → toast success/error
  - [ ] 6.6: Loading state: submit button disabled + spinner khi đang gửi
  - [ ] 6.7: Toast notification: dùng inline toast pattern (same as ProductForm.tsx) — NOT external library

- [ ] Task 7: Frontend — PasswordChangeForm Component (AC: #3, #4, #7)
  - [ ] 7.1: Tạo `frontend/src/components/client/profile/PasswordChangeForm.tsx` — "use client" component
  - [ ] 7.2: Collapsible section (Disclosure/details element) labeled "Đổi mật khẩu"
  - [ ] 7.3: 3 fields: old_password, new_password, new_password_confirm (all type="password" with show/hide toggle)
  - [ ] 7.4: Password strength indicator: dựa trên regex checks (length, uppercase, lowercase, digit) → hiển thị "Yếu" / "Trung bình" / "Mạnh" với color indicator
  - [ ] 7.5: Sử dụng `react-hook-form` + `passwordChangeSchema` cho validation
  - [ ] 7.6: Submit → gọi `changePassword()` Server Action → toast success/error → clear form on success
  - [ ] 7.7: Nếu `has_password === false` (OAuth user) → render message thay vì form (AC7)
  - [ ] 7.8: Toast notification: inline toast pattern (same as PersonalInfoForm)

- [ ] Task 8: Frontend — Update Profile Page (AC: #1, #6)
  - [ ] 8.1: Rewrite `frontend/src/app/(customer)/profile/page.tsx` — Server Component, gọi `getCustomerProfile()` để fetch data
  - [ ] 8.2: Pass profile data + has_password flag xuống `PersonalInfoForm` và `PasswordChangeForm` components
  - [ ] 8.3: Layout: PersonalInfoForm card trên, PasswordChangeForm card dưới, cả 2 trong `bg-white rounded-xl border` cards
  - [ ] 8.4: Error state: nếu fetch profile fail → hiển thị error message với retry button

- [ ] Task 9: Frontend Tests (AC: ALL)
  - [ ] 9.1: `frontend/src/__tests__/PersonalInfoForm.test.tsx` — 8 tests: renders form fields, email is read-only, pre-fills data, validates phone format, submits successfully, shows error on failure, loading state, responsive classes
  - [ ] 9.2: `frontend/src/__tests__/PasswordChangeForm.test.tsx` — 8 tests: renders form fields, collapsible toggle, password strength indicator, validates password match, submits successfully, shows error for wrong old password, clears form on success, OAuth user sees message instead of form
  - [ ] 9.3: `frontend/src/__tests__/profileActions.test.ts` — 6 tests: getProfile success/unauthorized, updateProfile success/validation error, changePassword success/wrong old password
  - [ ] 9.4: Update `frontend/src/__tests__/ProfilePage.test.tsx` — update existing tests to work with new page structure (fetches profile data, renders forms)

## Dev Notes

### Architecture Pattern: Profile Form Submission

```
User edits form → react-hook-form validates (Zod) → Server Action called →
  → getAuthToken() → fetch BACKEND_URL with Bearer JWT → Backend validates →
  → DB update → Response → Frontend toast notification
```

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | How to Reuse |
|------|-------|--------------:|
| Auth session | `frontend/src/auth.ts` | `await auth()` → `session.accessToken` for Server Actions |
| Server Action pattern | `frontend/src/app/actions/garment-actions.ts` | `getAuthToken()` helper, Bearer auth, timeout, error handling |
| Form pattern | `frontend/src/components/client/products/ProductForm.tsx` | react-hook-form + zodResolver + inline toast pattern |
| CustomerForm pattern | `frontend/src/components/client/CustomerForm.tsx` | react-hook-form + zodResolver example for customer fields |
| Existing Zod schemas | `frontend/src/types/customer.ts` | Phone regex: `/^0[0-9]{9,10}$/`, gender enum: `["Nam", "Nữ", "Khác"]` |
| Password hashing | `backend/src/core/security.py` | `hash_password()`, `verify_password()` for bcrypt |
| Auth dependency | `backend/src/api/dependencies.py` | `CurrentUser` dependency (line 97) — use for all customer endpoints |
| User model | `backend/src/models/db_models.py:41-70` | UserDB has: full_name, phone, gender, date_of_birth, hashed_password (nullable!) |
| Profile layout | `frontend/src/app/(customer)/profile/layout.tsx` | Already has auth guard, user greeting, breadcrumb — DO NOT duplicate |
| Reset password | `backend/src/api/v1/auth.py:377-412` | Pattern for hashing + updating password |
| Toast pattern | `frontend/src/components/client/products/ProductForm.tsx:71-125,416-428` | `useState` toast + `showToast()` + fixed bottom notification |

### Backend API Design

```
# New router: /api/v1/customers/me/*
# File: backend/src/api/v1/customer_profile.py

GET /api/v1/customers/me/profile
  Auth: Bearer JWT (any authenticated user)
  Response 200: {
    "data": {
      "full_name": "Nguyễn Linh",
      "email": "linh@example.com",
      "phone": "0931234567",
      "gender": "Nữ",
      "date_of_birth": "1995-06-15",
      "has_password": true
    },
    "meta": {}
  }

PATCH /api/v1/customers/me/profile
  Auth: Bearer JWT
  Body: { "full_name": "Linh Nguyễn", "phone": "0987654321", "gender": "Nữ" }
  Response 200: { "data": { ...updated fields }, "meta": {} }
  Response 400: { "error": { "code": "VALIDATION_ERROR", "message": "..." } }

POST /api/v1/customers/me/change-password
  Auth: Bearer JWT
  Body: { "old_password": "...", "new_password": "..." }
  Response 200: { "data": { "message": "Mật khẩu đã cập nhật thành công" }, "meta": {} }
  Response 400: { "error": { "code": "WRONG_PASSWORD", "message": "Mật khẩu hiện tại không đúng" } }
  Response 400: { "error": { "code": "NO_PASSWORD", "message": "Tài khoản không có mật khẩu..." } }
```

### Password Validation Rules (Frontend Zod + Backend)

```typescript
// Frontend: passwordChangeSchema
const passwordChangeSchema = z.object({
  old_password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
  new_password: z.string()
    .min(8, "Mật khẩu mới tối thiểu 8 ký tự")
    .regex(/[A-Z]/, "Cần có ít nhất 1 chữ hoa")
    .regex(/[a-z]/, "Cần có ít nhất 1 chữ thường")
    .regex(/[0-9]/, "Cần có ít nhất 1 số"),
  new_password_confirm: z.string(),
}).refine(data => data.new_password === data.new_password_confirm, {
  message: "Mật khẩu xác nhận không khớp",
  path: ["new_password_confirm"],
});
```

### Toast Notification Pattern (Inline — No External Library)

Project does NOT use sonner/react-hot-toast. Toast is implemented inline using useState:

```tsx
// From ProductForm.tsx pattern
const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

function showToast(message: string, type: "success" | "error") {
  if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  setToast({ message, type });
  toastTimerRef.current = setTimeout(() => setToast(null), 3000);
}

// Render at bottom of component:
{toast && (
  <div role="status" aria-live="polite" className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl text-sm font-medium ${
    toast.type === "success" ? "bg-indigo-900 text-white" : "bg-red-700 text-white"
  }`}>
    {toast.message}
  </div>
)}
```

### UserDB Schema Fields (Relevant to 4.4b)

```python
# backend/src/models/db_models.py lines 41-70
class UserDB(Base):
    __tablename__ = "users"
    id: UUID (pk)
    email: str (unique, not null)
    hashed_password: str | None  # ← NULL for OAuth-only users! (AC7)
    role: str (default="Customer")
    is_active: bool
    tenant_id: UUID | None
    full_name: str | None  # ← editable
    phone: str | None       # ← editable
    date_of_birth: date | None
    gender: str | None      # ← editable
    address: str | None
    created_at: datetime
    # NOTE: No updated_at field
```

### Design: Heritage Palette (Boutique Mode)

- **Background:** `bg-gray-50` (page), `bg-white` (cards/forms)
- **Primary accent:** Indigo (`text-indigo-600`, `bg-indigo-600`, `border-indigo-600`)
- **Section title:** `font-serif font-bold text-gray-900` (Cormorant Garamond)
- **Form labels:** `text-sm font-medium text-gray-700` (Inter)
- **Input focus:** `focus:ring-indigo-500 focus:border-indigo-500`
- **Success toast:** `bg-indigo-900 text-white`
- **Error toast:** `bg-red-700 text-white`
- **Error text:** `text-red-600 text-sm`
- **Read-only field:** `text-gray-500 bg-gray-50` (không có border)
- **Button primary:** `bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5`
- **Spacing:** Cards with `p-6` or `p-8`, form gaps `space-y-4` or `space-y-6`
- **Border radius:** `rounded-xl` for cards, `rounded-lg` for inputs/buttons

### Anti-Patterns (DO NOT)

1. **DO NOT** install any new npm packages (sonner, react-hot-toast, etc) — use inline toast pattern from ProductForm
2. **DO NOT** use `useSession()` from next-auth/react — pass data from Server Component via props
3. **DO NOT** make email editable — email is read-only in profile form
4. **DO NOT** allow password change for OAuth-only users (hashed_password=null) — show message instead
5. **DO NOT** create middleware.ts — project uses proxy.ts pattern
6. **DO NOT** add avatar upload — deferred; sprint change proposal mentions it but UserDB has no avatar_url field and no file upload infrastructure exists. Story scope is limited to text fields + password
7. **DO NOT** duplicate auth guard in profile/page.tsx — layout.tsx already handles it. Page.tsx should call `getCustomerProfile()` for data, NOT `auth()` for guard
8. **DO NOT** use Radix UI Disclosure for collapsible — use native HTML `<details>`/`<summary>` or simple state toggle to avoid new dependency
9. **DO NOT** return hashed_password or any sensitive data in API responses
10. **DO NOT** log passwords (old or new) in any backend logs
11. **DO NOT** use `Link` component for form submit buttons
12. **DO NOT** call backend directly from Client Components — always go through Server Actions

### About Avatar Upload (NOT in scope)

Sprint change proposal mentions "avatar upload" but:
- UserDB has NO `avatar_url` column
- No file upload infrastructure exists (no S3, no static file serving for uploads)
- Adding avatar upload requires: DB migration + file storage setup + file validation + upload endpoint

Avatar upload will be handled in a separate quick-spec or future story. This story focuses on **text profile fields + password change** only.

### Previous Story 4.4a Learnings (Apply Here)

| Learning | Application to 4.4b |
|----------|---------------------|
| `userName == null` not `!userName` | Apply same nullish check pattern for optional fields |
| Layout auth guard is sufficient | Do NOT add redundant `auth()` call in page.tsx for auth guarding |
| Heritage Palette active styling | Use `text-indigo-600`, `bg-indigo-50` for active/focus states |
| Inline toast (ProductForm pattern) | Reuse exact same toast pattern, no external library |
| `CurrentUser` dependency exists | `backend/src/api/dependencies.py:97` — use for all new endpoints |
| `verify_password()` exists | `backend/src/core/security.py:25-30` — use for old password check |
| API response wrapper | Always return `{ "data": {...}, "meta": {} }` format |
| Vietnamese error messages | All backend error messages in Vietnamese |

### Testing Standards

- **Backend:** pytest + httpx async client, mock database
- **Frontend:** Jest + React Testing Library
- **Test naming:** Descriptive behavior in Vietnamese context
- **Mock patterns:** Mock `auth()` from `@/auth`, mock `useRouter` from `next/navigation`, mock Server Actions
- **Form testing:** Use `fireEvent.change()` for inputs, `fireEvent.click()` for submit, assert validation errors
- **Assert exact Vietnamese text** for toast messages and error messages

### Project Structure Notes

- Backend new files go in `backend/src/api/v1/` and `backend/src/models/`
- Frontend Client Components go in `frontend/src/components/client/profile/`
- Frontend Server Actions go in `frontend/src/app/actions/`
- Frontend types go in `frontend/src/types/`
- Tests: `backend/tests/` and `frontend/src/__tests__/`

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md#Story 4.4b]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility-First Form Pattern, Heritage Palette v2]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR26-FR28 Authentication]
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements-nfrs.md#NFR11-NFR15 Security]
- [Source: _bmad-output/implementation-artifacts/4-4a-customer-profile-layout-navbar-icon.md — Previous story learnings]
- [Source: backend/src/api/dependencies.py — CurrentUser, require_roles dependencies]
- [Source: backend/src/core/security.py — hash_password(), verify_password()]
- [Source: backend/src/api/v1/auth.py:377-412 — Reset password pattern]
- [Source: backend/src/models/db_models.py:41-70 — UserDB schema]
- [Source: frontend/src/types/customer.ts — Existing Zod schemas and types]
- [Source: frontend/src/app/actions/garment-actions.ts — Server Action pattern]
- [Source: frontend/src/components/client/products/ProductForm.tsx — Form + toast pattern]
- [Source: frontend/src/auth.ts — NextAuth v5 session structure, /login page config]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
