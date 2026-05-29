# Story 15.3: About Page

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a prospective customer evaluating the boutique,
I want an editorial About page that tells the brand story, craft process, differentiators, and customer testimonials,
so that I trust this is a genuine artisan who understands the craft before I commit.

## Acceptance Criteria

1. **Editorial 4-pillar layout at `/about`.** Opening `/about` renders an editorial page (Cormorant Garamond dominant, generous whitespace, large images/placeholders) with 4 pillars IN ORDER: (1) Brand story, (2) Craft & process timeline/stepper, (3) Why-Choose-Us differentiators via `FeatureTriad`, (4) Customer testimonials via `TestimonialStrip`. A closing CTA band links to `/booking` ("Đặt lịch tư vấn") and `/contact` ("Liên hệ"). This **replaces** the Story 15.1 placeholder `about/page.tsx`.

2. **About hero (full-bleed `about` variant).** The top of the page uses `HeroBanner variant="about"` with an eyebrow ("Về chúng tôi"), a two-line Cormorant headline, and a subline — full-bleed Indigo gradient surface, ivory text (more editorial / taller than the `showroom-compact` variant). Completes the `about` branch that Story 15.2 left as a stub.

3. **Craft & process timeline (Pillar 2).** A 5-step horizontal stepper (desktop) / stacked (mobile): **Tư vấn → Đo → Lên mẫu → May tay → Vừa lần đầu**, each with a number badge, short title, and one-line description. Connector line between steps on desktop; stacks to single column on mobile.

4. **`FeatureTriad` (Pillar 3).** A reusable 3-pillar block (icon + title + short description) renders the Why-Choose-Us differentiators. Heritage Gold icons, equal-height cards, responsive **1 → 3 columns**. Copy is plain Vietnamese (e.g. "Yêu ngay lần thử đầu", "Đường kim có hồn / Nâng niu đến từng chút", "Riêng một mình bạn") — NO English jargon ("First-Fit", "Bespoke", "AI").

5. **`TestimonialStrip` (Pillar 4).** A reusable testimonials block: **carousel on mobile (auto-advance) / grid on desktop**, Cormorant italic quotes, optional avatar (initial circle). Carousel prev/next controls expose `aria-label` and do **not** rely on color/animation alone to convey function.

6. **Static SSG + lazy images.** The page is statically rendered (no request-time data fetching). Below-the-fold images lazy-load; any hero/large image uses appropriate loading hints. (Real photography does not exist yet — use gradient placeholders consistent with the showroom; wire `next/image` lazy-loading only where a real `src` is introduced.)

7. **Shared chrome + Boutique Mode + a11y + no regressions.** The shared `CustomerNavbar` + `SiteFooter` (Story 15.1, in `(customer)/layout.tsx`) wrap the page automatically — do NOT add a page-level header/footer. All UI uses the Heritage palette (`#1A2B4C` / `#F9F7F2` / `#D4AF37`, Jade `#059669` for check accents), Cormorant headings, ≥44×44px touch targets, Heritage Gold focus rings on interactive elements. Any reveal/carousel animation respects `prefers-reduced-motion`. Existing pages and tests continue to pass.

## Tasks / Subtasks

- [x] **Task 1: Complete the `about` (full-bleed) variant of `HeroBanner`** (AC: #2, #7)
  - [x] Edit `frontend/src/components/client/brand/HeroBanner.tsx` (created in 15.2). Add an optional `eyebrow?: string` prop to `HeroBannerProps` (also useful for the home variant in 15.5).
  - [x] Implement the `about` branch: full-bleed Indigo gradient surface (`bg-gradient-to-br from-[#101b33] via-[#1A2B4C] to-[#22335A]` or layered gradient matching the preview hero), ivory text, taller than `showroom-compact` (~`py-20 md:py-28`, min-height ~420px). Render eyebrow (small uppercase gold `tracking-wider text-[#D4AF37]`), then the Cormorant headline (`title`, supports `\n`/`<br/>` two-line — accept `title: ReactNode` OR keep `string` and let the page pass a node; simplest: keep `title` as `ReactNode`), then subline.
  - [x] Keep `showroom-compact` exactly as-is (do not regress 15.2). The generic fallback can remain for `home` (15.5 completes it).
  - [x] Stays a Server Component unless you add a Framer Motion reveal; if you do, guard with `useReducedMotion()` and `"use client"`. Hero is above-the-fold — do not delay paint.

- [x] **Task 2: Create the reusable `FeatureTriad` component** (AC: #4, #7)
  - [x] Create `frontend/src/components/client/brand/FeatureTriad.tsx` (Server Component, static). Props: `items: { icon: ReactNode; title: string; description: string }[]`, optional `variant?: "home" | "about"` (variant may only tweak spacing — keep minimal), optional `eyebrow?: string` + `heading?: string` for the section header.
  - [x] Layout: responsive grid `grid-cols-1 md:grid-cols-3`, gap 24–32px, equal-height cards (`h-full` + flex). Card: white surface, subtle border (`border border-[#ece7da]`), rounded, padding ~28–34px; gold icon chip (`bg-[#D4AF37]/14 text-[#D4AF37]` rounded square ~54px); Cormorant `h3` title; gray description. Hover lift optional (`hover:-translate-y-1 hover:shadow-md`).
  - [x] Icons = inline SVG passed in by the caller (NO icon library installed). The About page supplies 3 items (see Dev Notes — Content).

- [x] **Task 3: Create the reusable `TestimonialStrip` (+ `TestimonialCard`)** (AC: #5, #7)
  - [x] Create `frontend/src/components/client/brand/TestimonialStrip.tsx` (`"use client"` — needs carousel state + auto-advance). Props: `items: { quote: string; name: string; context?: string; avatarInitial?: string }[]`, optional `eyebrow?`/`heading?`.
  - [x] Desktop (`md+`): static grid `md:grid-cols-3`, gap ~26px — all cards visible (no carousel chrome).
  - [x] Mobile (`< md`): single-card carousel that auto-advances (e.g. every ~5s via `setInterval` in `useEffect`, cleared on unmount) with **prev/next buttons** (`aria-label="Đánh giá trước"` / `"Đánh giá sau"`, ≥44×44px) and dot indicators (`aria-label` per dot, `aria-current` on active). Pause auto-advance on interaction is nice-to-have, not required. Respect `prefers-reduced-motion` (disable auto-advance when reduced).
  - [x] Card (`TestimonialCard`, can live in the same file): white surface, rounded, border; Cormorant **italic** quote (`font-serif italic text-[#1A2B4C]`); footer row = gold avatar circle with `avatarInitial` (decorative, `aria-hidden`) + bold name + small gray context.
  - [x] Do NOT rely on color/animation alone — the prev/next buttons have text/aria labels; active dot has `aria-current`.

- [x] **Task 4: Assemble the About page** (AC: #1, #2, #3, #6, #7)
  - [x] Replace `frontend/src/app/(customer)/about/page.tsx` (currently the 15.1 placeholder) with the real editorial page. Keep `export const metadata` (title "Giới thiệu - Nhà May Thanh Lộc", description). Server Component, static (no `await` data fetch). Do NOT add a header/footer (layout provides them).
  - [x] **Hero (AC#2):** `<HeroBanner variant="about" eyebrow="Về chúng tôi" title={<>Giữ hồn áo dài,<br/>qua bao mùa thương.</>} subline="Một tiệm may nặng lòng với áo dài — nơi mỗi tà áo lớn lên từ đôi tay người thợ và sự nâng niu trong từng số đo." />`.
  - [x] **Pillar 1 — Brand story split:** a 2-column split (`grid md:grid-cols-2 gap-12 items-center`), text + image placeholder (gradient block, `aspect-[4/5]`, rounded). Eyebrow "Điều chúng tôi tin" + Cormorant `h2` + 2 paragraphs (origin/heritage/mission). Stacks on mobile. Copy per Dev Notes / preview.
  - [x] **Pillar 2 — Process timeline (AC#3):** build a `CraftTimeline` block (inline in the page OR a small `components/client/brand/CraftTimeline.tsx` — your call; if reused only here, inline is fine). 5 steps: Tư vấn / Đo / Lên mẫu / May tay / Vừa lần đầu. Desktop `grid grid-cols-5` with number badges + dashed/gold connector between steps; mobile single column (hide connector).
  - [x] **Pillar 3 — FeatureTriad:** `<FeatureTriad eyebrow="Vì sao khách thương" heading="Điều khiến bạn muốn quay lại" items={...} />` with the 3 differentiators (Dev Notes — Content).
  - [x] **Pillar 4 — TestimonialStrip:** `<TestimonialStrip eyebrow="Khách thương" heading="Được hàng trăm khách thương gửi trọn niềm tin" items={...} />`.
  - [x] **Closing CTA band:** Indigo band (`bg-gradient-to-br from-[#1A2B4C] to-[#0f1b33] text-[#F9F7F2] text-center py-20`), Cormorant headline + line, two CTAs: `Link href="/booking"` (gold) "Đặt lịch tư vấn" + `Link href="/contact"` (outline ivory) "Liên hệ". Inline in the page (About-specific). ≥44px, gold focus ring.
  - [x] Alternate section backgrounds (ivory page bg vs `bg-white` sections) like the preview for editorial rhythm.

- [x] **Task 5: Tests** (AC: #1–#5, #7)
  - [x] `frontend/src/__tests__/FeatureTriad.test.tsx`: renders 3 items (titles + descriptions); renders the section heading; cards present. Mock `next/link` if used.
  - [x] `frontend/src/__tests__/TestimonialStrip.test.tsx`: renders all quotes + names; prev/next buttons expose `aria-label` ("Đánh giá trước"/"Đánh giá sau"); clicking next advances the active item (assert via `aria-current` dot or visible card). Mock `next/navigation`'s `useReducedMotion` is from framer-motion — if `useReducedMotion` is used, it works in jsdom (returns false); if `setInterval` is used, wrap state updates so tests are deterministic (you may assert initial render + manual next-click rather than waiting on the timer).
  - [x] `frontend/src/__tests__/HeroBanner.test.tsx`: EXTEND the existing 15.2 suite (or add cases) — `about` variant renders eyebrow + title + subline and applies full-bleed/gradient classes; `showroom-compact` still renders unchanged.
  - [x] (Optional) `frontend/src/__tests__/AboutPage.test.tsx`: smoke-render the page asserting the 4 pillar headings + closing CTA links (`/booking`, `/contact`). Mock `next/link`.
  - [x] Run `npx jest` — all suites green; no regressions (note the known pre-existing `TaskDetailPatternSection.test.tsx` failure is unrelated). Run `npx eslint` on changed files (clean).

## Dev Notes

### Scope boundary (read first)

- This story builds **only** the About page (`/about`) and the reusable `FeatureTriad` + `TestimonialStrip` brand components, and completes the `about` HeroBanner variant. It does NOT build the Homepage Landing (`/` — Story 15.5) or the Contact page/lead endpoint (`/contact` — Story 15.4). The `/contact` link in the closing CTA already resolves to the 15.1 placeholder until 15.4 ships.
- `HeroBanner` (showroom-compact) already exists from **Story 15.2** — extend it, do not recreate. The shared `CustomerNavbar` + `SiteFooter` already wrap all `(customer)` pages from **Story 15.1** — do NOT add page-level chrome.

### Architecture & pattern constraints (MUST follow)

- **Dual-Mode UI is route-based.** Customer = `(customer)` group (Boutique Mode). This story touches only `(customer)`. No mode React Context. [Source: architecture.md#Frontend Architecture]
- **Server vs Client boundary:** `about/page.tsx`, `HeroBanner`, `FeatureTriad`, and the inline brand-story/timeline/CTA blocks are static → **Server Components**. `TestimonialStrip` needs carousel state/auto-advance → `"use client"`. [Source: architecture.md#Component Boundaries; existing brand/HeroBanner.tsx is a Server Component]
- **Component naming:** `PascalCase.tsx`; vars/functions `camelCase`. [Source: architecture.md#Code Naming Conventions]
- **No new dependencies.** `framer-motion@^12` and `@radix-ui/react-dialog@^1` already in `package.json`. Icons = inline SVG (NO icon library — Lucide/Heroicons NOT available). [Source: frontend/package.json]

### Existing code to REUSE / NOT rebuild

| Item | Path | Use |
|---|---|---|
| `HeroBanner` | `components/client/brand/HeroBanner.tsx` | Extend with `about` variant + `eyebrow` prop. Keep `showroom-compact` intact. |
| `CustomerNavbar` / `SiteFooter` | `components/client/navigation/` | Already in `(customer)/layout.tsx` (15.1). Do not touch. |
| `about/page.tsx` placeholder | `app/(customer)/about/page.tsx` | REPLACE with the real page (15.1 created the stub specifically to be replaced here). |
| Focus-ring + a11y pattern | (15.1 components) | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]`; ≥44px targets. Reuse verbatim. |
| `GarmentCard` skeleton/style refs | `components/client/showroom/` | Only if you need a placeholder style reference. Not required. |

### Design tokens & palette (use literal hexes)

- Indigo `#1A2B4C` · Silk Ivory `#F9F7F2` · Heritage Gold `#D4AF37` · Jade `#059669` · warm gray text `#6B7280`. Match existing customer pages; do NOT refactor `globals.css`. [Source: 15.1/15.2 Dev Notes; ux-design-specification.md UX-DR1]
- Cormorant Garamond for headings via `font-serif` and/or `style={{ fontFamily: "Cormorant Garamond, serif" }}` (the convention `HeroBanner` uses a `CORMORANT` const — reuse that pattern). Body = Inter for descriptions/labels. [Source: brand/HeroBanner.tsx; app/layout.tsx]

### Content (plain Vietnamese — full diacritics, NO English jargon)

**CRITICAL copy rule:** All customer-facing copy MUST be plain Vietnamese with full diacritics. Do NOT use "First-Fit", "Bespoke", "AI", "skeleton", etc. The epics phrase differentiators in English ("First-Fit Perfection >90%", "AI Bespoke") — **override these** to the plain-Vietnamese phrasings used in the preview. [Source: auto-memory feedback_customer_copy_plain_vietnamese; ux-preview-rev4.html About tab]

Recommended copy (from the rev4 preview About tab — use as-is or close):

- **Hero:** eyebrow "Về chúng tôi"; headline "Giữ hồn áo dài, / qua bao mùa thương."; subline "Một tiệm may nặng lòng với áo dài — nơi mỗi tà áo lớn lên từ đôi tay người thợ và sự nâng niu trong từng số đo."
- **Pillar 1 (Brand story):** eyebrow "Điều chúng tôi tin"; h2 "Khởi đầu từ một điều giản dị."; p1 "Chúng tôi tin mỗi người phụ nữ Việt xứng đáng có một tà áo của riêng mình — vừa vóc dáng, vừa nết duyên, chứ không phải một chiếc áo may sẵn giống hệt trăm người."; p2 "Vì lẽ đó, chúng tôi vừa giữ lấy nghề may thủ công của cha ông, vừa đo may thật tỉ mỉ — để cái hồn xưa vẫn còn, mà tà áo thì vừa in từng đường nét."
- **Pillar 2 (Process, 5 steps):** 01 Tư vấn — "Lắng nghe phong cách & mong muốn của bạn." · 02 Đo — "Số đo cá nhân hoá, lưu vào hồ sơ." · 03 Lên mẫu — "Tạo mẫu áo chính xác theo số đo của bạn." · 04 May tay — "Thợ may lành nghề chăm chút từng đường kim." · 05 Vừa lần đầu — "Vừa vặn ngay lần thử đầu tiên."
- **Pillar 3 (FeatureTriad):** eyebrow "Vì sao khách thương"; heading "Điều khiến bạn muốn quay lại"; items: (1) "Yêu ngay lần thử đầu" — "Hơn 9 trên 10 người vừa in ngay lần đầu — đỡ mất công đi lại, chỉ còn lại niềm vui trọn vẹn." (2) "Riêng một mình bạn" — "Từ dáng hình đến sở thích, bạn được cùng chúng tôi chọn từng chi tiết — để tà áo thật sự là của bạn." (3) "Nâng niu đến từng chút" — "Lụa, gấm tuyển chọn cùng lời tư vấn dành riêng cho bạn — chu đáo, ấm áp từ đầu đến cuối."
- **Pillar 4 (Testimonials):** eyebrow "Khách thương"; heading "Được hàng trăm khách thương gửi trọn niềm tin"; items: ("Tà áo như được sinh ra cho riêng mình vậy." — Chị Phương, "Khách may áo riêng") · ("Người thợ tận tâm, từng bước đều chỉn chu, tà áo nhận về còn đẹp hơn mình mơ." — Chị Trang, "Áo dài cưới") · ("Hiện đại mà vẫn ấm cái tình xưa — tà áo có hồn, có cả câu chuyện." — Chị Ngọc, "Áo dài Tết").
- **Closing CTA band:** headline "Hãy để chúng tôi kể câu chuyện của bạn, bằng một tà áo."; line "Hẹn một buổi trò chuyện, hay chỉ đơn giản là nhắn cho chúng tôi đôi dòng."; CTAs "Đặt lịch tư vấn" → `/booking`, "Liên hệ" → `/contact`.

### Visual reference (preview rev4)

`_bmad-output/planning-artifacts/ux-preview-rev4.html` → **"Giới thiệu" tab** (`#page-about`) is the canonical layout: full-bleed About hero → brand-story split (text + image) → 5-step process timeline (`.steps`/`.step` with number badges + dashed gold connector) → Why-Choose-Us `FeatureTriad` (`.triad`/`.feat`) → testimonials grid (`.tgrid`/`.tcard`, Cormorant italic + avatar initial) → Indigo closing band (`.band`). Reuse its structure, spacing rhythm (alternating ivory / white sections), and the plain-Vietnamese copy above. Mobile: triad/steps/tgrid collapse to 1 column; connector hidden (`.steps` `grid-template-columns:1fr`).

### Accessibility (AC #7)

- WCAG 2.1 Level A; touch targets ≥44×44px; Heritage Gold focus ring `2px solid` via `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]`. Decorative SVG icons / avatar initials → `aria-hidden="true"`. [Source: ux-design-specification.md UX-DR17; 15.1/15.2]
- Testimonial carousel: prev/next buttons carry `aria-label`; dots carry `aria-label` + `aria-current`; do not convey function by color/animation alone. Auto-advance disabled under `prefers-reduced-motion`. [Source: ux-design-specification.md line 988; epics.md Story 15.3 AC]
- Process timeline: use an ordered structure (`<ol>` or numbered headings) so the sequence is conveyed without relying on the visual connector.

### Project Structure Notes

- Reusable brand-presence components → `frontend/src/components/client/brand/` (existing folder: `HeroBanner`; add `FeatureTriad`, `TestimonialStrip`). About-only blocks (brand-story split, process timeline, closing CTA) may be inline in `about/page.tsx` or a small co-located component — keep About-specific blocks out of `brand/` unless genuinely reused.
- Page: `frontend/src/app/(customer)/about/page.tsx` (replace placeholder). Tests → `frontend/src/__tests__/*.test.tsx`.

### Testing Standards

- Jest + React Testing Library + `@testing-library/user-event`; config `frontend/jest.config.js`; tests in `frontend/src/__tests__/*.test.tsx`. Mock `next/link` (plain anchor) and `next/navigation` as existing suites do. `framer-motion` works in jsdom; `useReducedMotion()` returns false in tests. New suites are additive. [Source: package.json; existing tests; 15.1/15.2 Dev Notes]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 15.3 (lines 555–579)]
- [Source: _bmad-output/planning-artifacts/epics.md#UX-DR23 FeatureTriad, UX-DR24 TestimonialStrip, UX-DR29 About (lines 297, 299, 309); Coverage map lines 417, 418, 423]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Trang 3 — About (lines 911–921); Phase 5 components (lines 952–956, 990–994)]
- [Source: _bmad-output/planning-artifacts/ux-preview-rev4.html — "Giới thiệu" tab (#page-about): hero, brand-story split, process timeline, FeatureTriad, testimonials grid, closing band]
- [Source: frontend/src/components/client/brand/HeroBanner.tsx — extend `about` variant + `eyebrow`]
- [Source: frontend/src/app/(customer)/about/page.tsx — 15.1 placeholder to replace]
- [Source: _bmad-output/implementation-artifacts/15-1-shared-sitefooter-and-customer-navigation-refactor.md — shared chrome, palette/a11y/focus-ring conventions]
- [Source: _bmad-output/implementation-artifacts/15-2-showroom-enhancement.md — HeroBanner origin, brand/ folder, copy guideline]
- [Source: auto-memory feedback_customer_copy_plain_vietnamese — customer copy must be plain Vietnamese, no English/jargon]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

- `npx jest` (new/extended suites: FeatureTriad, TestimonialStrip, HeroBanner, AboutPage) → 4 suites / 18 tests passed.
- `npx eslint` on all changed files → clean (exit 0).
- `npx jest` (full) → 101 suites / 970 tests passed; 1 pre-existing failure `TaskDetailPatternSection.test.tsx` (tailor/design domain — unrelated to this story, present before these changes).

### Completion Notes List

- **Task 1 — HeroBanner `about` variant:** Extended `brand/HeroBanner.tsx` (from 15.2): `title` widened to `ReactNode` (two-line headline support), added optional `eyebrow` prop, implemented the full-bleed `about` branch (layered Indigo gradient `from-[#101b33] via-[#1A2B4C] to-[#22335A]`, gold radial glow, `py-20 md:py-28`, ivory text). `showroom-compact` unchanged (15.2 tests still green).
- **Task 2 — FeatureTriad:** New Server Component `brand/FeatureTriad.tsx`. `grid-cols-1 md:grid-cols-3`, equal-height (`h-full` flex) cards, gold icon chip, Cormorant titles. Caller passes inline-SVG icons. Renders as `<ul>`/`<li>` for semantics.
- **Task 3 — TestimonialStrip:** New client component `brand/TestimonialStrip.tsx` (+ inline `TestimonialCard`). Desktop static 3-up grid; mobile single-card carousel with `setInterval` auto-advance (cleared on unmount, disabled under `useReducedMotion`), accessible prev/next buttons (`aria-label`), dot indicators (`aria-label` + `aria-current`). Cormorant italic quotes, gold avatar initials (`aria-hidden`).
- **Task 4 — About page:** Replaced the 15.1 placeholder `about/page.tsx` with the editorial page: `about` hero → brand-story split (text + gradient image placeholder) → 5-step craft timeline (`<ol>`, dashed gold connector on desktop, stacks on mobile) → FeatureTriad → TestimonialStrip → Indigo closing CTA band → `/booking` + `/contact`. Static SSG, alternating ivory/white sections. No page-level chrome (layout provides navbar/footer).
- **Copy:** All plain Vietnamese with full diacritics — overrode the epics' English-jargon differentiators ("First-Fit", "AI Bespoke") per the preview + project copy guideline. Process step 3 = "Lên mẫu" (not "Dựng rập AI").
- **Out of scope (as specified):** Homepage `/` (15.5) and real Contact page/lead endpoint (15.4) not built; `/contact` CTA resolves to the 15.1 placeholder until 15.4.

### File List

- `frontend/src/components/client/brand/HeroBanner.tsx` (modified — `about` variant + `eyebrow` + `ReactNode` title)
- `frontend/src/components/client/brand/FeatureTriad.tsx` (new)
- `frontend/src/components/client/brand/TestimonialStrip.tsx` (new)
- `frontend/src/app/(customer)/about/page.tsx` (modified — replaced 15.1 placeholder with editorial page)
- `frontend/src/__tests__/FeatureTriad.test.tsx` (new)
- `frontend/src/__tests__/TestimonialStrip.test.tsx` (new)
- `frontend/src/__tests__/AboutPage.test.tsx` (new)
- `frontend/src/__tests__/HeroBanner.test.tsx` (modified — added `about` variant cases)

## Senior Developer Review (AI)

**Date:** 2026-05-29 · **Outcome:** Approved with patches · 3 layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). All 7 ACs satisfied; copy rule PASS. Findings were reuse-robustness hardening for the documented 15.5 reuse (no live impact on the 3-item About page).

### Action Items
- [x] [High] `TestimonialStrip` crashed on empty `items` (mobile branch rendered `items[active]` unconditionally) → added `if (count === 0) return null;`.
- [x] [Med] Stale `active` index when `items` shrinks between renders → derived `safeActive = Math.min(active, count - 1)` used for the mobile card + dot state.
- [x] [Med] React keys used non-unique fields (`item.name` / `item.title` / `step.title`) → switched to composite `${field}-${index}` keys in `TestimonialStrip` (grid + dots), `FeatureTriad`, and the About timeline.
- [x] Added regression tests: empty-items renders null; single-item hides carousel controls.

### Rejected (verified non-issues)
- "Active testimonial rendered twice (desktop + mobile)": Tailwind `hidden` = `display:none` → removed from the a11y tree, so only the visible breakpoint is announced; tests already account for the jsdom double-render.
- `aria-current="true"` token valid; process-step copy rewording within the spec's "as-is or close" allowance; "01–05" badge style matches the preview; missing `export const dynamic = "force-static"` (page is static de facto).
- Auto-advance interval has no dedicated test (mocked reduced-motion) — left as-is per scope choice (option 1; #4 declined).

## Change Log

| Date | Change |
|---|---|
| 2026-05-29 | Implemented Story 15.3: editorial About page (`/about`) with `about` HeroBanner variant, reusable `FeatureTriad` + `TestimonialStrip` brand components, 5-step craft timeline, and closing CTA. Replaced the 15.1 placeholder. Added 18 tests. Status → review. |
| 2026-05-29 | Addressed code review findings — 3 items fixed (1H/2M): empty-items guard + stale-index clamp in `TestimonialStrip`, composite React keys across brand components/timeline. Added 2 regression tests (20 total). Full suite 973 pass (1 pre-existing unrelated failure); lint clean. |
