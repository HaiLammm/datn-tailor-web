# Story 15.1: Shared SiteFooter and Customer Navigation Refactor

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer browsing the website,
I want a consistent navigation bar and footer across every customer-facing page,
so that I can move freely between Home, Showroom, About, Contact, and Booking instead of being trapped in a redirect loop.

## Acceptance Criteria

1. **Real top navigation (no redirect loop).** On any customer-facing page, the top nav shows real links — `Trang chủ` (`/`), `Showroom` (`/showroom`), `Giới thiệu` (`/about`), `Liên hệ` (`/contact`), `Đặt lịch` (`/booking`) — plus the existing Cart, Notification, and Profile entries. The `Trang chủ` link points to `/` (NOT `/showroom`), and the logo must also point to `/` (currently `/showroom`), so the old loop is fully removed.

2. **Mobile navigation (≥375px).** On mobile viewports the nav collapses into a hamburger drawer (or bottom tab bar with Home · Shop · Book · Profile) following the Role-Based Navigation pattern. All touch targets are ≥44×44px.

3. **Shared SiteFooter on every Boutique Mode page.** A new shared `SiteFooter` component renders at the bottom of all `(customer)` pages with 3 columns — `Về chúng tôi` (About, Story) · `Liên hệ` (address, phone, Zalo, opening hours) · `Khám phá` (Showroom, Booking) — plus a copyright line and social icons.

4. **Hardcoded footers removed.** The two existing hardcoded `<footer>` blocks (in `showroom/page.tsx` and `showroom/[id]/page.tsx`) are deleted and replaced by the shared `SiteFooter` (rendered once via the layout). No duplicate footer appears.

5. **Keyboard + a11y.** Tabbing through nav and footer links shows a Heritage Gold focus ring (2px solid). All icon-only and link elements expose proper `aria-label` / accessible names. Active route is visually indicated in the nav.

6. **No regressions.** Cart drawer, NotificationBell, ProfileIcon, LogoutButton, and the showroom `order_success` banner all continue to work exactly as before. Existing customer pages (`/checkout`, `/profile/*`, `/booking`, `/measurement-gate`) still render correctly with the new shared chrome.

## Tasks / Subtasks

- [x] **Task 1: Create the `CustomerNavbar` client component** (AC: #1, #2, #5)
  - [x] Create `frontend/src/components/client/navigation/CustomerNavbar.tsx` (`"use client"`). Accept `userName: string | null` prop (resolved server-side in the layout, same pattern as `ProfileIcon`).
  - [x] Desktop: render the brand logo (`Link href="/"`, label "Nhà May Thanh Lộc" / "Tailor Design") + the 5 real links via `next/link`. Use `usePathname()` to apply an active-link style (Heritage Gold underline/text on the matching route; treat `/` exact, others by prefix).
  - [x] Keep the existing action cluster on the right: `<CartBadge />`, `{userName && <NotificationBell />}`, `<ProfileIcon userName={userName} />`, `{userName && <LogoutButton />}` — import from their current paths, do NOT rewrite them.
  - [x] Mobile (`< md`): hide the inline link row, show a hamburger button (≥44×44px, `aria-label="Mở menu"`, `aria-expanded`) that opens a drawer. Use the already-installed `@radix-ui/react-dialog` for the drawer (no new dependency). Drawer lists the same 5 links, closes on link click / Escape / backdrop. Keep Cart + Profile reachable on mobile.
  - [x] Focus ring: apply `focus-visible:outline-2 focus-visible:outline-[#D4AF37]` (or `focus-visible:ring-2 focus-visible:ring-[#D4AF37]`) to every focusable nav element.

- [x] **Task 2: Create the shared `SiteFooter` component** (AC: #3, #5)
  - [x] Create `frontend/src/components/client/navigation/SiteFooter.tsx`. It can be a Server Component (no interactivity needed) — only mark `"use client"` if you add interactive social buttons; prefer plain `<a>`/`Link`.
  - [x] 3-column responsive grid (`grid-cols-1 md:grid-cols-3`, gap 16–24px):
    - **Về chúng tôi:** links to `/about` ("Giới thiệu"), `/about` ("Câu chuyện thương hiệu").
    - **Liên hệ:** store address, phone (tap-to-call `href="tel:..."`), Zalo, email (`href="mailto:..."`), opening hours. Use plain-text placeholder constants defined at the top of the file (see Dev Notes — Content).
    - **Khám phá:** links to `/showroom` ("Showroom"), `/booking` ("Đặt lịch").
  - [x] Copyright line: `© 2026 Nhà May Thanh Lộc` (keep the existing Heritage tone). Social icons row (Facebook, Instagram, Zalo) as inline SVG `<a>` with `aria-label` each — no icon library is installed.
  - [x] Styling: Boutique Mode — `bg-[#1A2B4C] text-[#F9F7F2]`, headings in Cormorant (inherits `--font-cormorant` from body / use `font-serif`). Match the indigo/ivory palette already used by the showroom header.
  - [x] All links ≥44px tap height; Heritage Gold focus ring on every link.

- [x] **Task 3: Wire navbar + footer into the customer layout** (AC: #1, #3, #4, #6)
  - [x] Edit `frontend/src/app/(customer)/layout.tsx`: replace the inline `<header>` block with `<CustomerNavbar userName={userName} />` (keep the existing `const session = await auth(); const userName = session?.user?.name ?? null;`).
  - [x] Add `<SiteFooter />` after `<main>{children}</main>` so it renders once for ALL customer pages. Wrap in a flex column (`min-h-screen flex flex-col`, `<main className="flex-1">`) so the footer sits at the bottom on short pages.
  - [x] This makes the footer shared across showroom, product detail, checkout, profile, booking, and measurement-gate — satisfying "any Boutique Mode page".

- [x] **Task 4: Remove the two hardcoded footers** (AC: #4)
  - [x] `frontend/src/app/(customer)/showroom/page.tsx`: delete the `<footer>…© 2026 Showroom Áo Dài…</footer>` block (lines ~94–99). Keep the page header + `order_success` banner + `<main>` untouched.
  - [x] `frontend/src/app/(customer)/showroom/[id]/page.tsx`: delete the `<footer>…</footer>` block (lines ~78–85).
  - [x] Verify no other `(customer)` page renders its own footer (grep confirmed only these two).

- [x] **Task 5: Tests** (AC: #1, #4, #5, #6)
  - [x] Add `frontend/src/__tests__/CustomerNavbar.test.tsx`: renders the 5 real links with correct `href`s; asserts `Trang chủ` → `/` (NOT `/showroom`) and logo → `/`; renders `NotificationBell`/`LogoutButton` only when `userName` is set; hamburger opens the drawer on mobile. Mock `next/navigation` `usePathname` and the Zustand cart store as existing tests do (see `CartDrawer.test.tsx`).
  - [x] Add `frontend/src/__tests__/SiteFooter.test.tsx`: asserts the 3 column headings, the `/about`, `/showroom`, `/booking` links, `tel:`/`mailto:` links, copyright text, and social `aria-label`s.
  - [x] Run `npm test` — all suites green (no regressions in existing showroom/cart/profile tests).

## Dev Notes

### Architecture & pattern constraints (MUST follow)

- **Dual-Mode UI is route-based, NOT context-based.** Customer = `(customer)` route group (Boutique Mode), Owner/Tailor = `(workplace)` (Command Mode). This story touches ONLY `(customer)`. Do not introduce a mode React Context. [Source: architecture.md#Cross-Cutting Concerns; Frontend Architecture]
- **Component naming:** `PascalCase.tsx`. Local vars/functions `camelCase`. [Source: architecture.md#Code Naming Conventions]
- **Server vs Client:** Layout stays a Server Component (it calls `await auth()`). Interactive nav (hamburger drawer, `usePathname` active state) must live in a `"use client"` child that receives `userName` as a prop — exactly the pattern `ProfileIcon`/`CartBadge` already use. [Source: architecture.md#Component Boundaries]
- **No new dependencies.** Drawer = `@radix-ui/react-dialog` (already in package.json). Animations (optional) = `framer-motion` (already present). Icons = inline SVG (no icon library installed — Lucide/Heroicons are NOT available). [Source: package.json]

### Existing components to REUSE (do not rebuild)

| Component | Path | Notes |
|---|---|---|
| `CartBadge` | `frontend/src/components/client/cart/CartBadge.tsx` | `"use client"`, reads Zustand, opens `CartDrawer`. Already 44px, palette-correct. |
| `NotificationBell` | `frontend/src/components/client/profile/NotificationBell.tsx` | Render only when authenticated (`userName != null`). |
| `ProfileIcon` | `frontend/src/components/client/profile/ProfileIcon.tsx` | Takes `userName` prop; shows "Đăng nhập" when null, profile icon when set. |
| `LogoutButton` | `frontend/src/components/client/profile/LogoutButton.tsx` | Render only when authenticated. |

These four already implement `min-h-[44px] min-w-[44px]`, `text-[#1A2B4C] hover:text-[#D4AF37]`, and `aria-label`. Import and compose them — do not change their internals.

### Current state being changed

- `frontend/src/app/page.tsx` is `redirect("/showroom")`. **Leave it as-is in this story** — the real Homepage Landing is Story 15.5. Removing the redirect loop here means only fixing the NAV/logo links so they point to `/` (which still redirects to `/showroom` until 15.5 ships). That is acceptable and expected; do not build the homepage here.
- `(customer)/layout.tsx` currently renders the inline navbar with `<a href="/">Trang chủ</a>` (full reload) and logo `Link href="/showroom"` — both are the loop and must change. It renders NO footer today.
- Hardcoded footers exist ONLY in `showroom/page.tsx` (lines ~94–99) and `showroom/[id]/page.tsx` (lines ~78–85). Markup: `<footer className="bg-[#1A2B4C] text-[#F9F7F2] py-6 mt-16">… © 2026 Showroom Áo Dài - Heritage Collection …</footer>`.

### Design tokens & palette (use existing hardcoded hex for consistency)

- Indigo (dark surface): `#1A2B4C` · Silk Ivory (text on dark / bg): `#F9F7F2` · Heritage Gold (accent/focus): `#D4AF37`.
- These exact hexes are used throughout existing customer pages. `globals.css` defines `--heritage-gold: #D4AF37` and `--silk-ivory: #FDFCF5` (note: the token value `#FDFCF5` differs slightly from the `#F9F7F2` used in pages). **Stay consistent with the pages — use the literal `#F9F7F2` / `#1A2B4C` / `#D4AF37`.** Do NOT refactor the design tokens in this story. [Source: globals.css; ux-design-specification.md UX-DR1]
- Fonts: Cormorant Garamond is the body default (`--font-cormorant` set on `<body>` in root `layout.tsx`); use `font-serif` for footer/headings, Inter/sans for dense link text if desired. [Source: app/layout.tsx]

### Content — footer placeholder constants

No centralized store-info constant exists in the codebase. Define placeholders at the top of `SiteFooter.tsx` (Owner can edit later):

```ts
const STORE = {
  name: "Nhà May Thanh Lộc",
  address: "187b/1 Mai Hắc Đế , phường Tân Thành , Tp Buôn Ma Thuột", // placeholder
  phone: "0947 516 881",                                  // placeholder
  zalo: "0947 516 881",                                   // placeholder
  email: "lienhe@nhamaythanhloc.vn",                      // placeholder
  hours: "Thứ 2–CN: 8:00 – 20:00",                        // placeholder
};
```

All customer-facing copy MUST be plain Vietnamese with full diacritics — no English jargon (per project copy guideline). Keep labels: `Về chúng tôi`, `Liên hệ`, `Khám phá`, `Giới thiệu`, `Đặt lịch`, `Showroom`.

### Accessibility (AC #5)

- WCAG 2.1 Level A; touch targets ≥44×44px; Heritage Gold focus ring `2px solid` via `focus-visible:outline-2 focus-visible:outline-[#D4AF37]`. [Source: ux-design-specification.md UX-DR17, lines 453/788/986]
- Icon-only controls need `aria-label`. Hamburger button: `aria-label` + `aria-expanded`. Active nav link: add `aria-current="page"` in addition to the visual style.

### Project Structure Notes

- New components go under `frontend/src/components/client/navigation/` (new folder, consistent with feature-folded `components/client/<feature>/` convention already used for `cart/`, `profile/`, `showroom/`, `workplace/`).
- Layout flex-column wrapper ensures sticky-to-bottom footer; verify it does not break the existing `min-h-screen bg-gray-50` background on profile/checkout (those sub-layouts set their own bg — the outer layout bg shows through padding only; keep `bg-gray-50` or switch outer to neutral, but do NOT alter profile sub-layout).
- **Decision (flagged):** Putting `SiteFooter` in `(customer)/layout.tsx` means it also appears on `/checkout/*`, `/profile/*`, `/measurement-gate`. The AC ("any Boutique Mode page") explicitly wants this, so it is correct. If the team later decides checkout should be footer-free, that is a follow-up — do not branch on route here.

### Testing Standards

- Framework: Jest + React Testing Library + `@testing-library/user-event`. Config: `frontend/jest.config.js`. Tests live in `frontend/src/__tests__/*.test.tsx`. [Source: package.json scripts; existing tests]
- Mock patterns: `next/navigation` (`usePathname`, `useRouter`), `next-auth/react` (`signOut`), and the Zustand `useCartStore` are mocked in existing suites — mirror `CartDrawer.test.tsx` / `MeasurementForm.test.tsx`.
- No existing layout/nav/footer test exists — these are new, additive suites.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 15.1 (lines 497–522)]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR26, UX-DR31 (lines 303, 313, 420–425)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Navigation & Footer (lines 879–881, 909, 956)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Accessibility (lines 453, 788–790, 986)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Dual-Mode UI / Frontend Architecture (lines 70, 307–311)]
- [Source: frontend/src/app/(customer)/layout.tsx — current navbar to replace]
- [Source: frontend/src/app/(customer)/showroom/page.tsx (footer ~94–99); showroom/[id]/page.tsx (footer ~78–85)]
- [Source: frontend/src/app/globals.css — palette tokens; frontend/src/app/layout.tsx — Cormorant font]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

- `npx jest src/__tests__/SiteFooter.test.tsx src/__tests__/CustomerNavbar.test.tsx` → 2 suites / 15 tests passed.
- `npx eslint` on all changed files → clean (exit 0).
- `npx jest` (full suite) → 94 suites / 943 tests passed; 1 pre-existing failure in `TaskDetailPatternSection.test.tsx` (tailor/design domain — outside this story's import graph; caused by the uncommitted `design/index.ts` change present at session start, NOT by this story).

### Completion Notes List

- **Task 1 — CustomerNavbar:** New `"use client"` component at `components/client/navigation/CustomerNavbar.tsx`. Desktop nav renders the 5 real links via `next/link` with `usePathname()`-based active state (`aria-current="page"` + Heritage Gold underline). Reuses `CartBadge`/`NotificationBell`/`ProfileIcon`/`LogoutButton` unchanged (`NotificationBell`+`LogoutButton` gated on `userName`). Mobile hamburger (`aria-label="Mở menu"`, ≥44px) opens a `@radix-ui/react-dialog` drawer (closes on link click / Escape / backdrop via Radix). Heritage Gold focus ring on every focusable element.
- **Task 2 — SiteFooter:** New Server Component at `components/client/navigation/SiteFooter.tsx`. 3-column responsive grid (Về chúng tôi · Liên hệ · Khám phá), placeholder `STORE` constants, `tel:`/`mailto:` links, copyright `© 2026 Nhà May Thanh Lộc`, Facebook/Instagram/Zalo social links with `aria-label`. Boutique palette `bg-[#1A2B4C] text-[#F9F7F2]`, gold headings.
- **Task 3 — Layout wiring:** `(customer)/layout.tsx` now renders `<CustomerNavbar>` + a single `<main className="flex-1">` + `<SiteFooter>` inside a `min-h-screen flex flex-col` wrapper, so the footer is shared across all customer pages and sticks to the bottom.
- **Task 4 — Hardcoded footers removed:** Deleted the `<footer>` blocks from `showroom/page.tsx` and `showroom/[id]/page.tsx`. Changed the showroom page's inner `<main>` to a `<div>` to avoid a nested/duplicate `<main>` landmark (the layout now owns `<main>`). Header + `order_success` banner + `ShowroomContent` untouched.
- **Task 5 — Tests:** Added `SiteFooter.test.tsx` (7 tests) and `CustomerNavbar.test.tsx` (8 tests). Navbar test mocks `next/navigation`, the 4 reused child components, and `@radix-ui/react-dialog` (compact controllable stub) for deterministic drawer assertions.
- **Decision honored from story:** SiteFooter lives in the layout, so it also renders on `/checkout/*`, `/profile/*`, `/measurement-gate` — exactly per AC #3 ("any Boutique Mode page"). No route-based branching added.
- **Out of scope (as specified):** `app/page.tsx` redirect left as-is; real Homepage Landing is Story 15.5. Nav/logo now point to `/`, which still redirects to `/showroom` until 15.5 ships — expected.

### File List

- `frontend/src/components/client/navigation/CustomerNavbar.tsx` (new)
- `frontend/src/components/client/navigation/SiteFooter.tsx` (new)
- `frontend/src/app/(customer)/layout.tsx` (modified)
- `frontend/src/app/(customer)/showroom/page.tsx` (modified — footer removed, `<main>`→`<div>`)
- `frontend/src/app/(customer)/showroom/[id]/page.tsx` (modified — footer removed)
- `frontend/src/__tests__/CustomerNavbar.test.tsx` (new)
- `frontend/src/__tests__/SiteFooter.test.tsx` (new)
- `frontend/src/app/(customer)/about/page.tsx` (new — placeholder, real page in Story 15.3)
- `frontend/src/app/(customer)/contact/page.tsx` (new — placeholder, real page in Story 15.4)

## Senior Developer Review (AI)

**Date:** 2026-05-29 · **Outcome:** Changes Requested → Resolved · 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor), all 6 ACs met.

### Action Items
- [x] [Med] Zalo links used `tel:` instead of a Zalo deep link → now `https://zalo.me/<number>` with `target="_blank" rel="noopener noreferrer"` (`SiteFooter.tsx`).
- [x] [Low] Redundant `min-h-screen` on showroom page roots fought the layout's sticky-footer wrapper → removed from `showroom/page.tsx` and `showroom/[id]/page.tsx`.
- [x] [Low] Fragile `getByRole(link, /@/)` email selector in `SiteFooter.test.tsx` → switched to `a[href^="mailto:"]`; added a Zalo deep-link assertion.
- [x] [Intent gap] Nav/footer `Giới thiệu`→`/about` and `Liên hệ`→`/contact` 404'd (pages ship in 15.3/15.4) → added lightweight placeholder pages with CTA to Showroom/Booking.

### Rejected (verified non-issues)
- `aria-expanded` on hamburger: injected at runtime by Radix `Dialog.Trigger` via `asChild`.
- Duplicate `/about` links, `outline`-based focus ring, mocked Radix focus-trap, active-link `/` exact-match: intentional / valid / acceptable unit-test scope.

## Change Log

| Date | Change |
|---|---|
| 2026-05-29 | Implemented Story 15.1: shared `CustomerNavbar` (real links + mobile drawer) and `SiteFooter`, wired into `(customer)` layout, removed two hardcoded showroom footers. Added 15 tests. Status → review. |
| 2026-05-29 | Addressed code review findings — 4 items resolved (1 intent-gap + 3 patch): Zalo deep links, removed redundant `min-h-screen`, robust email test + Zalo assertion, added `/about` + `/contact` placeholder pages. 16 component tests green; full suite 944 pass (1 pre-existing unrelated failure). |
