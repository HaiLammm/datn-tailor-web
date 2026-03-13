# Story 4.4a: Customer Profile Layout + Navbar Icon

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng đã đăng nhập,
I want thấy icon Profile trên navbar và truy cập trang hồ sơ cá nhân tổng hợp `/profile`,
So that tôi quản lý tất cả thông tin tài khoản (đơn hàng, số đo, lịch hẹn, voucher) từ một nơi duy nhất.

## Acceptance Criteria

1. **AC1 — Navbar Profile Icon:** Customer đã đăng nhập → navbar hiển thị icon Profile (user icon) bên phải Cart icon. Click icon → navigate đến `/profile`. Chưa đăng nhập → icon hiển thị "Đăng nhập" link tới `/login`.
2. **AC2 — Profile Layout Route:** Route `/profile` tồn tại trong route group `(customer)` với layout riêng chứa sidebar navigation (desktop) hoặc tab bar (mobile).
3. **AC3 — Sidebar/Tab Navigation:** Navigation gồm 6 mục: Thông tin cá nhân (default active), Đơn hàng, Số đo, Lịch hẹn, Thông báo, Voucher. Mỗi mục có icon + label. Active item highlighted.
4. **AC4 — Default Landing:** Truy cập `/profile` → redirect hoặc render default tab "Thông tin cá nhân" với placeholder content "Sắp ra mắt".
5. **AC5 — Responsive Design:** Desktop (≥768px): sidebar cố định bên trái + content area bên phải. Mobile (<768px): horizontal scrollable tab bar phía trên + content area bên dưới.
6. **AC6 — Active Session Required:** Truy cập `/profile` khi chưa đăng nhập → redirect về `/signin`.
7. **AC7 — Breadcrumb Navigation:** Profile page header hiển thị tên user (từ session) và breadcrumb "Trang chủ > Hồ sơ".

## Tasks / Subtasks

- [x] Task 1: ProfileIcon Client Component (AC: #1)
  - [x] 1.1: Tạo `frontend/src/components/client/profile/ProfileIcon.tsx` — `"use client"` component hiển thị user icon trên navbar
  - [x] 1.2: Sử dụng session state để hiện avatar/icon nếu đã đăng nhập, hoặc "Đăng nhập" link nếu chưa
  - [x] 1.3: Click icon → `router.push('/profile')` (đã đăng nhập) hoặc `/login` (chưa đăng nhập)
  - [x] 1.4: Accessibility: min 44x44px touch target, `aria-label="Hồ sơ cá nhân"`

- [x] Task 2: Update Customer Layout Navbar (AC: #1)
  - [x] 2.1: Thêm `<ProfileIcon />` vào `frontend/src/app/(customer)/layout.tsx` navbar, đặt bên phải `<CartBadge />`
  - [x] 2.2: Maintain existing layout structure (Logo | Trang chủ | CartBadge | **ProfileIcon**)

- [x] Task 3: Profile Route Group + Layout (AC: #2, #3, #5)
  - [x] 3.1: Tạo `frontend/src/app/(customer)/profile/layout.tsx` — Server Component layout với sidebar/tabs
  - [x] 3.2: Sidebar navigation (desktop ≥768px): vertical list 6 items với icon + label, fixed left
  - [x] 3.3: Tab bar (mobile <768px): horizontal scrollable tabs phía trên content area
  - [x] 3.4: Navigation items: Thông tin cá nhân, Đơn hàng, Số đo, Lịch hẹn, Thông báo, Voucher với SVG icons + href
  - [x] 3.5: Active item detection via `usePathname()` — highlight current tab (ProfileSidebar.tsx)

- [x] Task 4: Profile Default Page (AC: #4, #6, #7)
  - [x] 4.1: Tạo `frontend/src/app/(customer)/profile/page.tsx` — Server Component
  - [x] 4.2: Auth guard: `const session = await auth(); if (!session) redirect('/login');`
  - [x] 4.3: Header: Tên user từ session + breadcrumb "Trang chủ > Hồ sơ" (trong layout.tsx)
  - [x] 4.4: Default content: placeholder card "Thông tin cá nhân — Sắp ra mắt"

- [x] Task 5: Placeholder Sub-Pages (AC: #3, #4)
  - [x] 5.1: Tạo placeholder pages: `profile/orders/page.tsx`, `profile/measurements/page.tsx`, `profile/appointments/page.tsx`, `profile/notifications/page.tsx`, `profile/vouchers/page.tsx`
  - [x] 5.2: Mỗi page: Server Component với auth guard + placeholder content "Sắp ra mắt"

- [x] Task 6: Testing (AC: ALL)
  - [x] 6.1: `ProfileIcon.test.tsx` — 8 tests: renders icon khi đăng nhập, renders "Đăng nhập" khi chưa, click navigates correctly, touch targets
  - [x] 6.2: `ProfileSidebar.test.tsx` — 5 tests: 6 nav items render, active state highlights, href đúng
  - [x] 6.3: `ProfilePage.test.tsx` — 5 tests: auth guard redirects, layout renders, breadcrumb, placeholder content

- [x] Review Follow-ups (AI Code Review — 2026-03-13)
  - [x] [AI-Review][HIGH] ProfileIcon treats empty string userName="" as unauthenticated — use `userName == null` instead of `!userName` [frontend/src/components/client/profile/ProfileIcon.tsx:18]
  - [x] [AI-Review][MEDIUM] Redundant auth() calls in page.tsx when layout.tsx already guards — consider removing per-page auth() for placeholder pages [frontend/src/app/(customer)/profile/page.tsx:12]
  - [x] [AI-Review][MEDIUM] Duplicate `<nav aria-label="Điều hướng hồ sơ">` creates confusing screen reader landmarks — differentiate aria-labels [frontend/src/components/client/profile/ProfileSidebar.tsx:81,106]
  - [x] [AI-Review][MEDIUM] AC1 text says `/signin` but implementation correctly uses `/login` — update AC text to match [story file AC1]
  - [x] [AI-Review][LOW] Breadcrumb uses raw `<a href="/">` instead of Next.js Link — causes full page reload [frontend/src/app/(customer)/profile/layout.tsx:35]
  - [x] [AI-Review][LOW] Desktop active item combines `rounded-lg` + `border-l-2` — potential visual clipping [frontend/src/components/client/profile/ProfileSidebar.tsx:89-91]
  - [x] [AI-Review][LOW] No loading.tsx for profile route group [frontend/src/app/(customer)/profile/]
  - [x] [AI-Review][LOW] Missing test edge cases for userName="" and userName={null} [frontend/src/__tests__/ProfileIcon.test.tsx]

## Dev Notes

### Architecture Pattern: Profile Hub Shell

```
Story 4.4a (này) → Layout shell + Navbar icon + Placeholder pages
Story 4.4b → Thông tin cá nhân & Bảo mật (replaces placeholder)
Story 4.4c → Lịch sử mua hàng (replaces placeholder)
Story 4.4d → Số đo cơ thể (replaces placeholder)
Story 4.4e → Lịch hẹn sắp tới (replaces placeholder)
Story 4.4f → Thông báo (replaces placeholder)
Story 4.4g → Kho Voucher (replaces placeholder)
```

**CRITICAL:** Story này CHỈ tạo shell/layout. Không implement logic CRUD cho bất kỳ module nào. Các placeholder page chỉ hiển thị "Sắp ra mắt".

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | How to Reuse |
|------|-------|--------------|
| Auth session | `frontend/src/auth.ts` | `await auth()` → `session.user.role`, `session.user.name`, `session.accessToken` |
| CartBadge pattern | `frontend/src/components/client/cart/CartBadge.tsx` | Follow same `"use client"` + icon + click handler pattern for ProfileIcon |
| Customer layout | `frontend/src/app/(customer)/layout.tsx` | ADD ProfileIcon to existing navbar, do NOT restructure |
| Auth redirect | `frontend/src/app/(workplace)/layout.tsx` | Follow same `redirect('/signin')` pattern for auth guard |
| Customer types | `frontend/src/types/customer.ts` | Already has Zod schemas + types for customer profile |
| Server Actions pattern | `frontend/src/app/actions/garment-actions.ts` | `getAuthToken()` helper pattern for future API calls |

### Auth Session Structure (NextAuth v5)

```typescript
// from frontend/src/auth.ts
session.user.id     // email address
session.user.name   // full_name (nullable)
session.user.role   // "Owner" | "Tailor" | "Customer"
session.accessToken // backend JWT token
```

### Customer Layout Current Structure

```tsx
// frontend/src/app/(customer)/layout.tsx — line 41-49
<nav className="flex items-center gap-4">
  <a href="/" className="text-gray-600 hover:text-indigo-600 transition-colors">
    Trang chủ
  </a>
  <CartBadge />
  {/* ADD: <ProfileIcon /> HERE */}
</nav>
```

### CartBadge Pattern to Follow

```tsx
// frontend/src/components/client/cart/CartBadge.tsx
"use client";
// Uses: useState, Zustand store, SVG icon
// Touch target: min-h-[44px] min-w-[44px]
// Renders: icon button + count badge overlay
```

ProfileIcon should follow this EXACT same pattern:
- `"use client"` directive
- SVG user icon (similar Heroicons style)
- Min 44x44px touch target
- Session-aware rendering (logged in vs anonymous)

### Profile Route Structure (New Files)

```
frontend/src/app/(customer)/profile/
├── layout.tsx           # Sidebar/tab navigation (Server Component)
├── page.tsx             # Default: "Thông tin cá nhân" placeholder
├── orders/
│   └── page.tsx         # Placeholder (Story 4.4c)
├── measurements/
│   └── page.tsx         # Placeholder (Story 4.4d)
├── appointments/
│   └── page.tsx         # Placeholder (Story 4.4e)
├── notifications/
│   └── page.tsx         # Placeholder (Story 4.4f)
└── vouchers/
    └── page.tsx         # Placeholder (Story 4.4g)

frontend/src/components/client/profile/
└── ProfileIcon.tsx      # Navbar icon (Client Component)
```

### ProfileIcon — Session Detection

ProfileIcon cần biết user đã đăng nhập hay chưa. Hai approaches:

**Approach A (Recommended): Pass session from Server parent**
```tsx
// layout.tsx (Server Component)
const session = await auth();
<ProfileIcon userName={session?.user?.name} />
// ProfileIcon chỉ nhận props, không gọi auth()
```

**Approach B: Client-side session check**
```tsx
// ProfileIcon.tsx
import { useSession } from "next-auth/react";
const { data: session } = useSession();
```

**Use Approach A** — consistent with project pattern (Server Components handle auth, pass data down to Client Components).

### Sidebar Navigation Component

Profile layout sidebar nên là **Client Component** để handle active state via `usePathname()`:

```tsx
// Trong profile/layout.tsx:
// - Server Component wrapper xử lý auth guard
// - Import <ProfileSidebar /> Client Component cho navigation
// - Children render trong content area
```

Cân nhắc tạo `frontend/src/components/client/profile/ProfileSidebar.tsx` nếu logic active state phức tạp. Hoặc inline trong layout nếu đơn giản.

### Design: Heritage Palette & Boutique Mode

Tuân thủ Boutique Mode design cho Customer-facing pages:
- **Background:** `bg-gray-50` (existing pattern)
- **Accent:** Indigo (`text-indigo-600`, `bg-indigo-600`)
- **Typography:** Font serif cho headings (Cormorant Garamond fallback)
- **Spacing:** 16-24px gap (Boutique spacious mode)
- **Active nav item:** `bg-indigo-50 text-indigo-700 border-l-2 border-indigo-600` (desktop sidebar)
- **Mobile tabs:** horizontal scroll, `border-b-2 border-indigo-600` for active

### Anti-Patterns (DO NOT)

1. **DO NOT** create `middleware.ts` — project uses `proxy.ts`
2. **DO NOT** put Client Components directly in `app/` folder — use `components/client/profile/`
3. **DO NOT** implement any CRUD logic — this story is layout/shell only
4. **DO NOT** install new npm packages — use existing Tailwind + inline SVG icons
5. **DO NOT** use `useSession()` from next-auth/react — pass session data from Server Component parent via props
6. **DO NOT** use Link from next/link for profile icon click — use `useRouter().push()` pattern consistent with CartBadge
7. **DO NOT** create API endpoints — no backend changes needed for this story
8. **DO NOT** restructure existing customer layout — only ADD ProfileIcon to existing nav
9. **DO NOT** add Framer Motion animations — not required for this story (UX spec only requires it for specific modules like Booking Calendar, ProductCard)
10. **DO NOT** create a separate auth guard utility — inline `redirect('/signin')` in each page (same pattern as workplace layout)

### Testing Standards

- Frontend: Jest + React Testing Library
- Test naming: `it("descriptive behavior in Vietnamese context")`
- Mock `auth()` from `@/auth` for session testing
- Mock `useRouter` from `next/navigation` for navigation testing
- Mock `usePathname` for active state testing
- Assert exact rendered text and navigation targets

### Previous Story 4.1 Learnings (Apply Here)

| Learning | Application to 4.4a |
|----------|---------------------|
| Server Action auth pattern | Use `await auth()` in Server Components for auth guard |
| `"meta": {}` in every response | N/A (no API calls in this story) |
| Client/Server component separation | ProfileIcon in `components/client/`, pages in `app/` |
| Loading/error states | Add `loading.tsx` for profile route if needed |
| Reuse format utilities | Reuse from `frontend/src/utils/format.ts` if formatting needed |

### Project Structure Notes

- Follows `(customer)` route group pattern — profile is customer-facing Boutique Mode
- Client Components MUST be in `components/client/profile/` NOT in `app/` folder
- Server Components (pages, layout) in `app/(customer)/profile/`
- This story creates the profile folder structure that stories 4.4b-4.4g will populate

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-12.md#Story 4.4a]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture — Route Groups (customer)/(workplace)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Platform Strategy — Mobile-first E-commerce]
- [Source: _bmad-output/project-context.md#Project Structure, Component Separation Rules]
- [Source: frontend/src/app/(customer)/layout.tsx — Current navbar structure]
- [Source: frontend/src/components/client/cart/CartBadge.tsx — Icon component pattern]
- [Source: frontend/src/auth.ts — NextAuth v5 session structure]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (initial) / Claude Opus 4.6 (review fixes — 2026-03-13)

### Debug Log References

- Frontend tests (initial): 18 passed (8 ProfileIcon + 5 ProfileSidebar + 5 ProfilePage)
- Full regression (initial): Frontend 635/635 passed — zero regressions
- Frontend tests (after review fixes): 21 passed (+3 edge case tests for ProfileIcon)
- Full regression (after review fixes): Frontend 638/638 passed — zero regressions

### Completion Notes List

- Task 1: Created `ProfileIcon.tsx` — "use client" component, session-aware (icon button when logged in, "Đăng nhập" link when anonymous), min-h/w 44px touch targets, aria-label, router.push pattern matching CartBadge
- Task 2: Updated `(customer)/layout.tsx` — added `async`, `auth()` call, `ProfileIcon` import and render after CartBadge. Auth redirect is `/login` (confirmed from auth.ts pages config)
- Task 3: Created `ProfileSidebar.tsx` Client Component — dual render (hidden desktop sidebar + hidden mobile tab bar), 6 nav items with inline SVG icons, usePathname() active detection, Heritage Palette active styling
- Task 3: Created `profile/layout.tsx` — Server Component, auth guard → `/login`, user greeting, breadcrumb, ProfileSidebar integration (desktop sticky card + mobile tab bar)
- Task 4: Created `profile/page.tsx` — Server Component, auth guard, placeholder "Thông tin cá nhân — Sắp ra mắt"
- Task 5: Created 5 placeholder sub-pages: orders, measurements, appointments, notifications, vouchers — all with auth guard and "Sắp ra mắt" placeholder
- ✅ Resolved review finding [HIGH]: ProfileIcon.tsx — fixed `!userName` → `userName == null` to correctly treat empty string as authenticated
- ✅ Resolved review finding [MEDIUM]: Removed redundant auth() calls from 4 placeholder pages (orders, measurements, appointments, notifications, vouchers) — layout guard is sufficient
- ✅ Resolved review finding [MEDIUM]: ProfileSidebar.tsx — differentiated aria-labels: "Điều hướng hồ sơ — Máy tính" vs "Điều hướng hồ sơ — Di động"
- ✅ Resolved review finding [MEDIUM]: Updated AC1 text from `/signin` → `/login` to match auth.ts config
- ✅ Resolved review finding [LOW]: profile/layout.tsx breadcrumb — replaced `<a href="/">` with Next.js `<Link href="/">`
- ✅ Resolved review finding [LOW]: ProfileSidebar.tsx — fixed active state visual conflict: removed `rounded-lg` for active, use `rounded-r-lg rounded-l-none` with `border-l-4` for clean left-border accent
- ✅ Resolved review finding [LOW]: Created `profile/loading.tsx` — skeleton UI for profile route group
- ✅ Resolved review finding [LOW]: Added 3 edge case tests to ProfileIcon.test.tsx — userName=null, userName="" both handled correctly

### File List

- frontend/src/components/client/profile/ProfileIcon.tsx (new, modified — review fix H1)
- frontend/src/components/client/profile/ProfileSidebar.tsx (new, modified — review fix M2, L2)
- frontend/src/app/(customer)/layout.tsx (modified — added async, auth(), ProfileIcon)
- frontend/src/app/(customer)/profile/layout.tsx (new, modified — review fix L1)
- frontend/src/app/(customer)/profile/loading.tsx (new — review fix L3)
- frontend/src/app/(customer)/profile/page.tsx (new)
- frontend/src/app/(customer)/profile/orders/page.tsx (new, modified — review fix M1)
- frontend/src/app/(customer)/profile/measurements/page.tsx (new, modified — review fix M1)
- frontend/src/app/(customer)/profile/appointments/page.tsx (new, modified — review fix M1)
- frontend/src/app/(customer)/profile/notifications/page.tsx (new, modified — review fix M1)
- frontend/src/app/(customer)/profile/vouchers/page.tsx (new, modified — review fix M1)
- frontend/src/__tests__/ProfileIcon.test.tsx (new, modified — review fix L4 — 11 tests)
- frontend/src/__tests__/ProfileSidebar.test.tsx (new, modified — minor test label update)
- frontend/src/__tests__/ProfilePage.test.tsx (new)
