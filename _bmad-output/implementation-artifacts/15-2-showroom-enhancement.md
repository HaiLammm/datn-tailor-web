# Story 15.2: Showroom Enhancement

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a customer visiting the showroom,
I want a boutique-style showroom with a hero, storytelling, trust signals, and graceful empty/loading states,
so that I feel I am in a heritage boutique rather than a generic marketplace.

## Acceptance Criteria

1. **Compact hero replaces the flat header.** On `/showroom`, a compact `HeroBanner` (variant `showroom-compact`, Indigo→Ivory background, Cormorant Garamond title "Bộ sưu tập áo dài" + a short subline) renders above the existing filter + grid + pagination, replacing the current flat `<header>` block. The existing `order_success` banner continues to display (unchanged logic) directly below the hero when `params.order_success === "true"`.

2. **Editorial storytelling block.** An editorial block (gold left-border accent, Cormorant italic line e.g. "Mỗi tà áo là một câu chuyện — chọn câu chuyện của riêng bạn.") appears above the product grid / filter area, giving a boutique feel instead of a bare grid.

3. **Trust-signals strip.** A trust strip shows 3–4 concise commitments — đổi/trả, chất lượng vải, may đo chuẩn dáng (and optionally tư vấn/hỗ trợ) — each as icon + short Vietnamese text. It renders on the showroom page regardless of grid result count (still visible when the grid is empty).

4. **Purposeful empty state.** When applied filters match no products, the showroom shows a purposeful empty state: an illustration (inline SVG), the message **"Không tìm thấy áo dài phù hợp"**, a short helper line, and a **"Xóa bộ lọc"** button that resets filters (navigates to `/showroom`). The page never shows a blank/empty area.

5. **Skeleton grid on load.** While the product grid is loading (initial load / `isLoading`, before data arrives), a skeleton grid of card placeholders is shown instead of a text/spinner fallback, preserving spatial context. The skeleton grid mirrors the real grid layout (1 / 2 / 3 columns at mobile / tablet / desktop).

6. **Shared SiteFooter (verification).** The shared `SiteFooter` from Story 15.1 (rendered once in `(customer)/layout.tsx`) is the only footer on `/showroom`. No hardcoded footer is reintroduced and no duplicate footer appears.

7. **A11y + Boutique Mode + no regressions.** All new UI uses the Heritage palette (`#1A2B4C` / `#F9F7F2` / `#D4AF37`), Cormorant headings, ≥44×44px touch targets, and Heritage Gold focus rings on interactive elements. Existing filter, grid, pagination, voucher-discount preview, re-fetch behavior, and the product-detail page continue to work exactly as before. Respects `prefers-reduced-motion` for any hero reveal animation.

## Tasks / Subtasks

- [x] **Task 1: Create the reusable `HeroBanner` component (showroom-compact variant)** (AC: #1, #7)
  - [x] Create `frontend/src/components/client/brand/HeroBanner.tsx` (`"use client"` only if you add a Framer Motion reveal; otherwise a Server Component is fine). New `brand/` folder for Phase 5 brand-presence components (HeroBanner, later FeatureTriad/TestimonialStrip in 15.3/15.5).
  - [x] Props: `variant: "home" | "about" | "showroom-compact"`, `title: string`, `subline?: string`, `children?: ReactNode` (for CTA cluster). Fully implement **only** the `showroom-compact` variant in this story; leave `home`/`about` branches as minimal/extendable stubs so 15.3 & 15.5 complete them (do NOT over-build them now).
  - [x] `showroom-compact` styling: Indigo→Ivory gradient surface (`bg-gradient-to-b from-[#1A2B4C] to-[#22335A]` with ivory text), compact height (`py-10 md:py-14`, NOT the full-bleed home hero), centered Cormorant title (`font-serif` + `style={{ fontFamily: "Cormorant Garamond, serif" }}`), subline below.
  - [x] Implemented as a pure Server Component (no Framer Motion). Decision: the hero is above-the-fold (no scroll trigger), so a reveal animation adds no value and would force `"use client"` + extra test mocking. Skipped per the story's "optional" note; `prefers-reduced-motion` is therefore trivially satisfied.

- [x] **Task 2: Create the editorial storytelling block** (AC: #2, #7)
  - [x] Created `frontend/src/components/client/showroom/ShowroomEditorial.tsx` (Server Component, static). Gold left-border accent (`border-l-[3px] border-[#D4AF37]`), white card, eyebrow "Giữ nếp Việt" + Cormorant italic line "Mỗi tà áo là một câu chuyện — chọn câu chuyện của riêng bạn."

- [x] **Task 3: Create the trust-signals strip** (AC: #3, #7)
  - [x] Created `frontend/src/components/client/showroom/ShowroomTrustStrip.tsx` (Server Component, static). Responsive grid `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, each item = inline SVG check (Jade `#059669`) + bold label + subtext. 4 items rendered (May vừa in dáng bạn / Yên tâm đổi trả / Vải đẹp tuyển chọn / Luôn bên cạnh bạn). `aria-label="Cam kết của chúng tôi"` on the section.
  - [x] Inline SVG only (no icon library).

- [x] **Task 4: Create the skeleton grid** (AC: #5)
  - [x] Created `frontend/src/components/client/showroom/GarmentGridSkeleton.tsx`. Renders `count` (default 6) card placeholders with `animate-pulse`, in the SAME grid layout as `GarmentGrid` (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`). Each card: `aspect-[3/4]` image block + 3 text bars. `role="status"` + `aria-busy` + testids for assertions.

- [x] **Task 5: Wire hero + editorial + trust into the showroom page** (AC: #1, #2, #3, #6)
  - [x] Edited `frontend/src/app/(customer)/showroom/page.tsx`:
    - Replaced the flat `<header>…Showroom Áo Dài…</header>` block with `<HeroBanner variant="showroom-compact" title="Bộ sưu tập áo dài" subline="Những tà áo cho mọi dịp vui — để bạn luôn rạng rỡ trong từng khoảnh khắc đáng nhớ." />`.
    - Kept the `order_success` banner block exactly as-is, directly below the hero.
    - Content container now `space-y-8` with `<ShowroomEditorial />` ABOVE `<ShowroomContent />` and `<ShowroomTrustStrip />` BELOW it (trust visible even on empty results).
    - No `<footer>` added — shared `SiteFooter` is rendered by the layout (Story 15.1).

- [x] **Task 6: Skeleton loading + refined empty state in `ShowroomContent`** (AC: #4, #5, #7)
  - [x] Edited `frontend/src/components/client/showroom/ShowroomContent.tsx`:
    - **Skeleton:** Added `{!isError && isLoading && garments.length === 0 && <GarmentGridSkeleton />}` for initial load, and replaced the outer `Suspense` fallback `<div>Đang tải...</div>` with `<GarmentGridSkeleton />`. The existing `isFetching && garments.length > 0` re-fetch overlay is left intact (preserves the visible grid).
    - **Empty state:** Updated heading → **"Không tìm thấy áo dài phù hợp"**, helper → "Thử bỏ bớt bộ lọc để xem thêm nhiều mẫu hơn nhé.", button → **"Xóa bộ lọc"** (same `handleClearFilters` → `/showroom`). Illustration recolored to Heritage Gold; added gold focus ring; ≥44px button kept.
  - [x] `useGarments`, filter, pagination, voucher logic unchanged.

- [x] **Task 7: Tests** (AC: #1–#7)
  - [x] `frontend/src/__tests__/HeroBanner.test.tsx`: title + subline, Cormorant font, Indigo surface classes, CTA children (4 tests).
  - [x] `frontend/src/__tests__/ShowroomTrustStrip.test.tsx`: 4 trust labels + accessible region; also covers `ShowroomEditorial` storytelling line (3 tests).
  - [x] `frontend/src/__tests__/GarmentGridSkeleton.test.tsx`: default/custom placeholder count + grid layout + aria-busy (3 tests).
  - [x] `frontend/src/__tests__/ShowroomContentStates.test.tsx`: empty-state copy "Không tìm thấy áo dài phù hợp" + "Xóa bộ lọc"; skeleton renders on `isLoading`. Mocks `useGarments` + child components + `next/navigation` + `getMyVouchers` (2 tests).
  - [x] `npx jest` full suite: 98/99 suites pass, 956/957 tests pass. The single failure (`TaskDetailPatternSection.test.tsx`) is the pre-existing failure documented in Story 15.1 (design domain, caused by the uncommitted `design/index.ts` change present at session start — outside this story's import graph). `npx eslint` on all changed files: clean (exit 0).

## Dev Notes

### Scope boundary (read first — prevents over-build)

- This story upgrades **only** `/showroom` chrome (hero + editorial + trust + empty/loading) and creates the **reusable `HeroBanner`** (showroom-compact variant only). It does NOT build the Homepage Landing (`/` stays `redirect("/showroom")` — Story 15.5), About (15.3), or Contact (15.4). Do NOT implement `home`/`about` hero variants, `FeatureTriad`, or `TestimonialStrip` here — those belong to 15.3/15.5. Design the `HeroBanner` API to accommodate them, but only ship `showroom-compact`.
- The shared `SiteFooter` and `CustomerNavbar` already exist and are wired into `(customer)/layout.tsx` by **Story 15.1** (status: review). The showroom page already had its hardcoded footer removed. AC #6 is therefore a **verification** task — just confirm no footer is reintroduced.

### Architecture & pattern constraints (MUST follow)

- **Dual-Mode UI is route-based.** Customer = `(customer)` group (Boutique Mode). This story touches only `(customer)`. No mode React Context. [Source: architecture.md#Frontend Architecture; ux-design-specification.md#Dual-Mode]
- **Server vs Client boundary:** `showroom/page.tsx` is a Server Component (calls `await auth()`, `fetchGarments`). `HeroBanner` (gradient, static) and `ShowroomEditorial`/`ShowroomTrustStrip` (static) should be Server Components — only add `"use client"` if you include a Framer Motion reveal in `HeroBanner`. `ShowroomContent`/`GarmentGrid`/`useGarments` stay client. [Source: architecture.md#Component Boundaries; existing showroom/page.tsx]
- **Component naming:** `PascalCase.tsx`; vars/functions `camelCase`. [Source: architecture.md#Code Naming Conventions]
- **No new dependencies.** `framer-motion@^12` and `@radix-ui/react-dialog@^1` are already in `package.json`. Icons = inline SVG (NO icon library installed). [Source: frontend/package.json]

### Existing code to REUSE / NOT rebuild

| Item | Path | Use |
|---|---|---|
| `ShowroomContent` | `components/client/showroom/ShowroomContent.tsx` | Wrap, don't rewrite. Add skeleton-on-`isLoading` + refine empty-state copy only. |
| `GarmentGrid` | `components/client/showroom/GarmentGrid.tsx` | Layout source of truth: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` — mirror it in the skeleton. |
| `useGarments` | `components/client/showroom/useGarments.ts` | Exposes `isLoading`, `isFetching`, `isError`, `garments`, `refetch`. Do NOT change. |
| `ProductDetailSkeleton` | `components/client/showroom/ProductDetailSkeleton.tsx` | Reference for skeleton/`animate-pulse` style. |
| `SiteFooter` / `CustomerNavbar` | `components/client/navigation/` | Already in layout (15.1). Do not touch. |
| `index.ts` (showroom barrel) | `components/client/showroom/index.ts` | If you export new components, add them here following existing pattern. |

- The **empty state already exists** in `ShowroomContent.tsx` (lines ~131–153) with heading "Không tìm thấy sản phẩm" + button "Xoá tất cả bộ lọc" and a search SVG. **Refine in place** — change copy to AC ("Không tìm thấy áo dài phù hợp" / "Xóa bộ lọc"); do NOT add a second/duplicate empty state.
- The **`order_success` banner** lives in `showroom/page.tsx` (lines ~77–87). Preserve it verbatim; just move it to sit below the new `<HeroBanner>` (same position relative to content).

### Design tokens & palette (use literal hexes for consistency)

- Indigo `#1A2B4C` · Silk Ivory `#F9F7F2` · Heritage Gold `#D4AF37` · Jade (success/trust check) `#059669`. These literals are used across existing customer pages — match them; do NOT refactor `globals.css` tokens. [Source: 15.1 Dev Notes; globals.css; ux-design-specification.md UX-DR1]
- Cormorant Garamond for headings via `font-serif` and/or `style={{ fontFamily: "Cormorant Garamond, serif" }}` (the existing flat header used the inline style — match it). Body font (Inter) for trust subtext/labels is fine. [Source: showroom/page.tsx; app/layout.tsx]

### Visual reference (preview rev4)

`_bmad-output/planning-artifacts/ux-preview-rev4.html` (Showroom tab) shows the intended layout: compact Indigo hero → editorial gold-border line → filter chips + product grid → demo of loading(skeleton)/empty states → trust strip (`.trust`, 4 commitments) → shared footer. Empty state copy in the preview: "Không tìm thấy áo dài phù hợp" + "Xóa bộ lọc" (matches AC). Trust labels above are taken from this preview. Note the preview's filter is a horizontal chip row; the real app keeps its existing `ShowroomFilter` (sidebar on desktop, horizontal on mobile) — do NOT replace the real filter with chips.

### Accessibility (AC #7)

- WCAG 2.1 Level A; touch targets ≥44×44px; Heritage Gold focus ring `2px solid` via `focus-visible:outline-2 focus-visible:outline-[#D4AF37]` (pattern established in 15.1). Empty-state button keeps ≥44px height. [Source: ux-design-specification.md UX-DR17; 15.1]
- Any hero reveal animation must respect `prefers-reduced-motion` (framer-motion `useReducedMotion()` or a CSS guard). Trust strip is non-interactive content — no animation dependency for meaning.

### Project Structure Notes

- New brand-presence components → `frontend/src/components/client/brand/` (new folder; Phase 5 home for `HeroBanner`, future `FeatureTriad`, `TestimonialStrip`). Consistent with feature-folded `components/client/<feature>/` convention.
- Showroom-specific presentational blocks (`ShowroomEditorial`, `ShowroomTrustStrip`, `GarmentGridSkeleton`) → `frontend/src/components/client/showroom/` alongside existing showroom components.
- Tests → `frontend/src/__tests__/*.test.tsx` (flat dir, per existing convention).

### Copy guideline (project rule)

All customer-facing copy MUST be plain Vietnamese with full diacritics — NO English jargon (no "First-Fit", "Bespoke", "AI", "skeleton" in UI text). Keep labels: "Bộ sưu tập áo dài", "Xóa bộ lọc", "Không tìm thấy áo dài phù hợp", trust labels above. [Source: auto-memory feedback_customer_copy_plain_vietnamese]

### Testing Standards

- Jest + React Testing Library + `@testing-library/user-event`; config `frontend/jest.config.js`; tests in `frontend/src/__tests__/*.test.tsx`. Mock `next/navigation` (`usePathname`/`useRouter`/`useSearchParams`) and TanStack Query as existing showroom tests do. New suites are additive. [Source: package.json scripts; existing tests; 15.1 Dev Notes]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 15.2 (lines 524–553)]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR22, UX-DR28 (lines 295, 307); Coverage map lines 416, 422]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Showroom nâng cấp (lines 898–909); HeroBanner component (line 952); Phase 5 (line 992)]
- [Source: _bmad-output/planning-artifacts/ux-preview-rev4.html — Showroom tab (hero, editorial, trust strip, empty/loading states)]
- [Source: _bmad-output/implementation-artifacts/15-1-shared-sitefooter-and-customer-navigation-refactor.md — shared chrome already wired; palette/a11y conventions]
- [Source: frontend/src/app/(customer)/showroom/page.tsx — flat header to replace; order_success banner to preserve]
- [Source: frontend/src/components/client/showroom/ShowroomContent.tsx — empty state + loading to refine]
- [Source: frontend/src/components/client/showroom/GarmentGrid.tsx — grid layout to mirror in skeleton]
- [Source: frontend/src/components/client/showroom/ProductDetailSkeleton.tsx — skeleton style reference]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

- `npx jest src/__tests__/HeroBanner.test.tsx src/__tests__/ShowroomTrustStrip.test.tsx src/__tests__/GarmentGridSkeleton.test.tsx src/__tests__/ShowroomContentStates.test.tsx` → 4 suites / 12 tests passed.
- `npx eslint` on all 10 changed files → clean (exit 0).
- `npx jest` (full suite) → 98 suites / 956 tests passed; 1 pre-existing failure in `TaskDetailPatternSection.test.tsx` (design domain — outside this story's import graph; caused by the uncommitted `design/index.ts` change present at session start, NOT by this story; same failure documented in Story 15.1).

### Completion Notes List

- **Task 1 — HeroBanner:** New reusable Phase 5 component at `components/client/brand/HeroBanner.tsx` (Server Component). `variant` prop with `showroom-compact` fully implemented (Indigo→Ivory gradient, Cormorant title + subline, compact `py-10 md:py-14`); `home`/`about` left as minimal extendable fallback for Stories 15.5/15.3. **Decision:** skipped the optional Framer Motion reveal — the hero is above-the-fold so a scroll reveal adds no value and would force `"use client"`; this keeps it a Server Component and trivially satisfies `prefers-reduced-motion`.
- **Task 2 — ShowroomEditorial:** New static block with gold left-border + Cormorant italic storytelling line.
- **Task 3 — ShowroomTrustStrip:** New static 4-item trust strip (inline SVG Jade check, responsive 1→2→4 cols, `aria-label`).
- **Task 4 — GarmentGridSkeleton:** New skeleton mirroring `GarmentGrid` layout (default 6 cards, `animate-pulse`, `role="status"`/`aria-busy`).
- **Task 5 — Showroom page wiring:** `showroom/page.tsx` now renders `<HeroBanner>` (replacing the flat header), preserves the `order_success` banner, and wraps `<ShowroomContent>` with `<ShowroomEditorial>` above and `<ShowroomTrustStrip>` below (trust visible even when grid is empty). No footer added — shared `SiteFooter` comes from the layout (15.1).
- **Task 6 — ShowroomContent:** Initial-load now renders `<GarmentGridSkeleton>` (and the Suspense fallback uses it too) instead of a text/spinner fallback. Empty-state copy updated to AC ("Không tìm thấy áo dài phù hợp" / "Xóa bộ lọc") with Heritage-Gold illustration + focus ring. `useGarments`/filter/pagination/voucher logic untouched.
- **Task 7 — Tests:** 4 new suites / 12 tests, all green. No regressions (the lone full-suite failure is pre-existing and unrelated — see Debug Log).
- **AC #6 (SiteFooter):** verification only — confirmed `showroom/page.tsx` adds no footer; the shared `SiteFooter` from the `(customer)` layout is the sole footer.
- **Out of scope (as specified):** No `home`/`about` hero variants, `FeatureTriad`, `TestimonialStrip`, or Homepage/About/Contact work — those are Stories 15.3/15.4/15.5.

**Code Review follow-up (2026-05-29) — 3 patch findings resolved:**
- ✅ [High] Blank area on empty→empty re-fetch: skeleton condition broadened to `!isError && (isLoading || isFetching) && garments.length === 0` so the catalog never collapses to a blank gap during a filter change with no cached rows to overlay (AC #4). Added a regression test in `ShowroomContentStates.test.tsx`.
- ✅ [Med] Palette typo: `ShowroomTrustStrip` item titles `text-[#1A1A2E]` → Heritage Indigo `text-[#1A2B4C]` (AC #7).
- ✅ [Low] Skeleton a11y: replaced the `aria-label` live region with the canonical pattern — a single `role="status"` + visually-hidden "Đang tải sản phẩm…" text and `aria-hidden` decorative cards, avoiding duplicate/competing live regions.
- Deferred (not in scope): pre-existing behavior where an `isError` during a background re-fetch replaces the visible grid with a full-page error block — the error-branch logic predates this story and a graceful-recovery fix is a larger UX change.

### File List

- `frontend/src/components/client/brand/HeroBanner.tsx` (new)
- `frontend/src/components/client/showroom/ShowroomEditorial.tsx` (new)
- `frontend/src/components/client/showroom/ShowroomTrustStrip.tsx` (new)
- `frontend/src/components/client/showroom/GarmentGridSkeleton.tsx` (new)
- `frontend/src/components/client/showroom/ShowroomContent.tsx` (modified — skeleton on load + refined empty state)
- `frontend/src/components/client/showroom/index.ts` (modified — barrel exports for the 3 new showroom components)
- `frontend/src/app/(customer)/showroom/page.tsx` (modified — HeroBanner + editorial + trust wiring)
- `frontend/src/__tests__/HeroBanner.test.tsx` (new)
- `frontend/src/__tests__/ShowroomTrustStrip.test.tsx` (new)
- `frontend/src/__tests__/GarmentGridSkeleton.test.tsx` (new)
- `frontend/src/__tests__/ShowroomContentStates.test.tsx` (new)

## Change Log

| Date | Change |
|---|---|
| 2026-05-29 | Implemented Story 15.2: reusable `HeroBanner` (showroom-compact), `ShowroomEditorial`, `ShowroomTrustStrip`, `GarmentGridSkeleton`; wired into `/showroom` (hero replaces flat header, editorial above grid, trust below, skeleton loading + refined empty state). Added 4 test suites / 12 tests. Status → review. |
| 2026-05-29 | Code review (3-layer adversarial): all 7 ACs PASS. Applied 3 patch fixes (1 High blank-area re-fetch, 1 Med palette typo, 1 Low skeleton a11y); 1 Med deferred (pre-existing error-branch UX). Added 1 regression test (16 tests total for this story). Full suite 971/972 (lone failure pre-existing, unrelated). |
