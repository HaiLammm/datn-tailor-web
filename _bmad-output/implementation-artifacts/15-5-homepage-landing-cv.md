# Story 15.5: Homepage Landing "CV"

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a first-time visitor landing on the site,
I want a persuasive homepage that introduces the boutique's value, featured pieces, story, and testimonials,
so that I form a strong first impression and choose to explore, book, or buy.

## Acceptance Criteria

1. **Real homepage replaces the redirect at `/`.** Opening `/` renders a full Boutique-Mode landing page — it MUST NOT `redirect("/showroom")` anymore. The current `frontend/src/app/page.tsx` (a bare `redirect`) is removed and the homepage is served from inside the `(customer)` route group so it inherits the shared `CustomerNavbar` + `SiteFooter` and Boutique Mode chrome (see Dev Notes — "The route-group move" — this is the single most important task).

2. **Full-bleed Hero with dual CTA (`home` variant).** The top of the page uses `HeroBanner variant="home"` (completing the stub left by Stories 15.2/15.3): full-bleed Indigo gradient surface, an eyebrow, a two-line Cormorant Garamond headline, a subline, a **dual CTA** — `[Dạo xem bộ sưu tập]` (Heritage Gold primary → `/showroom`) + `[Hẹn một buổi trò chuyện]` (ivory outline → `/booking`) — and a subtle scroll cue. If a signature hero image asset is supplied, it renders via `next/image` with `priority` (above-the-fold); absent a real photo, a gradient placeholder consistent with the `about` hero is used and the `priority` image wiring is in place for when a real `src` is added.

3. **Scroll-revealed sections in order.** Below the hero, sections reveal on scroll (Framer Motion, respecting `prefers-reduced-motion`) in this exact order: **(2)** Why-Choose-Us 3 pillars via `FeatureTriad`; **(3)** Featured Collection (3–4 `GarmentCard`s reused from Epic 2/5) with a "Xem tất cả →" link to `/showroom`; **(4)** Brand Story teaser editorial block linking to `/about`; **(5)** Testimonials via `TestimonialStrip`; **(6)** closing CTA band (Indigo background, dual CTA). Copy is plain Vietnamese with full diacritics — NO English jargon ("First-Fit", "Bespoke", "AI", "skeleton", "lead").

4. **Featured Collection with graceful fallback.** The Featured Collection fetches available garments server-side and shows 3–4 cards. When the fetch returns **no products**, the section does NOT render a blank/empty area — it is either hidden or shows a gentle fallback, never a broken gap. (There is no `is_featured` field in the data model — "curated" resolves to the newest available garments; see Dev Notes.)

5. **Loading state.** While homepage data has not arrived, a skeleton hero and card skeletons are shown rather than a blank page or spinner (reuse the existing `GarmentGridSkeleton` pattern for the featured cards).

6. **Shared SiteFooter + a11y + Boutique Mode + no regressions.** The shared `CustomerNavbar` + `SiteFooter` (Story 15.1) wrap the page automatically via `(customer)/layout.tsx` — do NOT add a page-level header/footer. All UI uses the Heritage palette (`#1A2B4C` / `#F9F7F2` / `#D4AF37`, warm gray `#6B7280`), Cormorant headings, body Inter, ≥44×44px touch targets, Heritage Gold focus rings (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]`) on every interactive element. Existing pages, the `/showroom` redirect removal aside, and all existing tests continue to pass.

## Tasks / Subtasks

- [x] **Task 1: The route-group move — serve the homepage from `(customer)`** (AC: #1, #6)
  - [x] **DELETE** `frontend/src/app/page.tsx` (the `redirect("/showroom")`). **CREATE** `frontend/src/app/(customer)/page.tsx` as the homepage. Route groups do not change the URL, so `(customer)/page.tsx` maps to `/` AND inherits `(customer)/layout.tsx` (the shared `CustomerNavbar` + `SiteFooter` + Boutique flex column). **CRITICAL:** keeping BOTH `app/page.tsx` and `app/(customer)/page.tsx` makes Next.js throw *"You cannot have two parallel pages that resolve to the same path"* — the delete is mandatory, not optional.
  - [x] Confirm no other route resolves to `/` (only the root `app/page.tsx` does today; `(auth)`/`(workplace)` groups have no `/` index). After the move, `/` → `(customer)/page.tsx`.
  - [x] `(customer)/page.tsx` is a **Server Component** (it `await`s the featured-garments fetch). Add `export const metadata` (title e.g. `"Nhà May Thanh Lộc — May áo dài riêng, giữ trọn nét Việt"`, a description). Do NOT add a page-level `<header>`/`<footer>` (the layout provides them). The `CustomerNavbar` already links "Trang chủ" → `/` (wired in Story 15.1), so this page makes that link resolve to a real page; do NOT modify nav/footer.

- [x] **Task 2: Complete the `home` (full-bleed) variant of `HeroBanner`** (AC: #2, #6)
  - [x] Edit `frontend/src/components/client/brand/HeroBanner.tsx`. Replace the generic `home` fallback branch (currently `<header className="bg-[#1A2B4C] ... py-16">`) with the real full-bleed home hero: taller than `about` (e.g. `min-h-[78vh] md:min-h-[86vh]`, flex-centered), layered Indigo gradient (reuse the `about` gradient `from-[#101b33] via-[#1A2B4C] to-[#22335A]` + a gold radial glow), ivory text. Render `eyebrow` (gold uppercase), the two-line Cormorant headline (`title: ReactNode` already supports `<br/>`), `subline`, then `children` (the dual-CTA cluster) centered.
  - [x] **Optional hero image:** add an optional `imageSrc?: string` prop. When provided, render it as a full-bleed background via `next/image` with `fill`, `priority`, `sizes="100vw"`, and an Indigo gradient overlay on top for text contrast. When omitted, the gradient surface alone is the background. (No real signature photo exists in `/public` yet — ship with the gradient; the `imageSrc` wiring satisfies AC#2's `next/image priority` requirement for when photography lands. `next.config.ts` already allows `https://**` and `localhost:8000/uploads/**` remote patterns.)
  - [x] **Scroll cue:** add a subtle scroll indicator at the bottom of the home hero (small "Cuộn xuống" text + an animated dot/chevron). Decorative motion only — guard any animation so it's inert under `prefers-reduced-motion`; the cue must not be the sole conveyor of meaning (it's purely decorative, so `aria-hidden="true"`).
  - [x] Keep `showroom-compact` and `about` branches **exactly as-is** (do not regress 15.2/15.3 tests). HeroBanner stays a Server Component (above-the-fold; no scroll trigger) — the scroll cue's tiny CSS animation does not require `"use client"`.

- [x] **Task 3: Create the section-reveal wrapper (Framer Motion)** (AC: #3, #6)
  - [x] There is **no existing reveal/scroll-animation component to reuse** (grep confirms `motion.` is only used inline in unrelated client components). Create a small reusable client wrapper, e.g. `frontend/src/components/client/brand/RevealOnScroll.tsx` (`"use client"`). Props: `children: ReactNode`, optional `delay?: number`, `className?: string`. Use `framer-motion` (`motion.div`, `initial={{opacity:0, y:24}}`, `whileInView={{opacity:1, y:0}}`, `viewport={{ once: true, amount: 0.2 }}`, short ease). Call `useReducedMotion()` — when reduced, render a plain `<div>` (no transform/opacity animation) so motion-averse users see content immediately.
  - [x] `framer-motion@^12` is already in `package.json` — do NOT add a dependency. In jsdom tests `useReducedMotion()` returns `false` and `whileInView` renders children, so wrapped content is assertable.

- [x] **Task 4: Assemble the homepage sections** (AC: #2, #3, #4, #5, #6)
  - [x] In `(customer)/page.tsx`, fetch the featured garments server-side: `const res = await fetchGarments({ status: GarmentStatus.AVAILABLE, page_size: 4 });` then `const featured = res?.data?.items ?? [];` (the response shape is `{ data: { items: Garment[], total, ... }, meta }` — see `types/garment.ts`). This is the same public, no-auth, ISR (`revalidate: 60`) action the showroom uses. `GarmentStatus.AVAILABLE` = `"available"`.
  - [x] **Hero (AC#2):** `<HeroBanner variant="home" eyebrow="Áo dài may riêng · Giữ trọn nét Việt" title={<>Một tà áo,<br/>vẹn cả dáng hình.</>} subline="Nơi mỗi đường kim kể một câu chuyện riêng — để tà áo không chỉ ôm trọn dáng người, mà còn chạm khẽ vào lòng bạn ngay từ cái nhìn đầu tiên."><Link href="/showroom" className="[gold primary btn]">Dạo xem bộ sưu tập</Link><Link href="/booking" className="[ivory outline btn]">Hẹn một buổi trò chuyện</Link></HeroBanner>`. CTAs use `next/link`, ≥44px, gold focus ring.
  - [x] **Section 2 — Why-Choose-Us:** `<RevealOnScroll><FeatureTriad eyebrow="Lời chúng tôi gửi bạn" heading="Vì sao chọn chúng tôi" items={...} /></RevealOnScroll>` with the 3 differentiators below (Dev Notes — Content). Reuse the **existing** `FeatureTriad` (do NOT rebuild). Supply inline-SVG icons (no icon library).
  - [x] **Section 3 — Featured Collection:** an `<RevealOnScroll>` section with a header row (eyebrow "Tuyển chọn" + Cormorant `h2` "Bộ sưu tập nổi bật" on the left, `<Link href="/showroom">Xem tất cả →</Link>` on the right) and a grid of `featured` cards. Reuse `GarmentCard` (`@/components/client/showroom`) — it is self-contained (its `AddToCartButton` uses local state + modals, **no cart Provider needed**, so it renders safely here). Grid: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6` (or reuse `GarmentGrid` if you prefer its 3-col layout — your call, but 4 featured cards read best in 4 columns). **Fallback (AC#4):** if `featured.length === 0`, render nothing for the grid (skip the section or show a single gentle line) — never a blank gap. There is **no `is_featured` field** on `Garment`; "curated" = newest available garments returned by the fetch.
  - [x] **Section 4 — Brand Story teaser:** an `<RevealOnScroll>` 2-column split (text + gradient image placeholder, `aspect-[4/5]`, `grid md:grid-cols-2 gap-12 items-center`, stacks on mobile) — eyebrow "Câu chuyện của chúng tôi" + Cormorant `h2` + 2 short paragraphs + `<Link href="/about">Nghe trọn câu chuyện →</Link>`. Inline in the page (homepage-specific). Copy per Dev Notes.
  - [x] **Section 5 — Testimonials:** `<RevealOnScroll><TestimonialStrip eyebrow="Lời thương từ khách" heading="Niềm tin được dệt nên" items={...} /></RevealOnScroll>`. Reuse the **existing** `TestimonialStrip` (mobile carousel / desktop grid, already a11y-hardened in 15.3). Items per Dev Notes.
  - [x] **Section 6 — Closing CTA band:** Indigo band (`bg-gradient-to-br from-[#1A2B4C] to-[#0f1b33] text-[#F9F7F2] text-center py-20`), Cormorant headline + line, dual CTA: `<Link href="/booking">Hẹn một buổi trò chuyện</Link>` (gold) + `<Link href="/showroom">Dạo xem bộ sưu tập</Link>` (ivory outline). Inline in the page. ≥44px, gold focus ring. (Mirror the About page closing band from 15.3 for visual consistency.)
  - [x] Alternate section backgrounds (ivory page bg vs `bg-white` sections) for editorial rhythm, matching the preview and the About page.

- [x] **Task 5: Loading skeleton** (AC: #5)
  - [x] Because `(customer)/page.tsx` is a Server Component that `await`s the fetch, add `frontend/src/app/(customer)/loading.tsx` — Next.js renders it as the route's Suspense fallback during navigation/data fetch. It shows a skeleton hero block (full-bleed Indigo gradient placeholder) + the featured-row skeleton (reuse `GarmentGridSkeleton` with `count={4}`). Keep it lightweight; reuse the existing `animate-pulse` skeleton style. **Note:** a `(customer)/loading.tsx` becomes the fallback for ALL pages in the group during navigation — keep it generic enough that it reads acceptably for the homepage and other `(customer)` routes, OR scope the skeleton to a co-located component the homepage wraps in its own `<Suspense>`. Prefer the route-level `loading.tsx` for simplicity unless it visibly degrades other pages. Confirm `/showroom`, `/about`, `/contact` still look acceptable during their loads after adding it.

- [x] **Task 6: Tests** (AC: #1–#6)
  - [x] `frontend/src/__tests__/HeroBanner.test.tsx`: EXTEND the existing suite — add `home` variant cases: renders eyebrow + (two-line) title + subline + CTA children; applies full-bleed/gradient classes; `showroom-compact` and `about` still render unchanged (no regression).
  - [x] `frontend/src/__tests__/RevealOnScroll.test.tsx`: renders its children (in jsdom `whileInView`/`useReducedMotion` resolve so children are present).
  - [x] `frontend/src/__tests__/HomePage.test.tsx`: smoke-render `(customer)/page.tsx`. Mock `@/app/actions/garment-actions` (`fetchGarments`) to return 3–4 garments → assert hero headline, the section headings, the "Xem tất cả →" link to `/showroom`, the brand-story `/about` link, the closing-band CTAs (`/booking`, `/showroom`), and that `GarmentCard`s render. Add a second case: `fetchGarments` returns `{ data: { items: [] } }` (or `null`) → the featured grid renders no cards and no blank/broken area (assert the rest of the page still renders). Mock `next/link`, `next/navigation`, `next/image`, and child components as existing suites do.
  - [x] Run `npx jest` — new/extended suites green; **no regressions** (the known pre-existing `TaskDetailPatternSection.test.tsx` failure is unrelated). Run `npx eslint` on all changed files (clean).
  - [x] **Manual verification (UI):** run the frontend dev server, open `/`, confirm: no redirect; hero + dual CTA; sections reveal on scroll; featured cards link to `/showroom/{id}`; nav "Trang chủ" highlights/links to `/`; footer present once; mobile (≥375px) stacks correctly. Confirm `/showroom`, `/about`, `/contact`, `/booking` still load (no parallel-route / build error from the page move).

## Dev Notes

### Scope boundary (read first)

- This story builds **only** the Homepage Landing at `/`: it completes the `home` `HeroBanner` variant, adds a `RevealOnScroll` wrapper, assembles the homepage sections, and adds a loading skeleton. It is the **last** story of Epic 15.
- **Reuse, do not rebuild:** `FeatureTriad` + `TestimonialStrip` (Story 15.3), `HeroBanner` (Stories 15.2/15.3 — only the `home` branch is unfinished), `GarmentCard`/`GarmentGrid`/`GarmentGridSkeleton` (Epics 2/5 + 15.2), `CustomerNavbar` + `SiteFooter` (Story 15.1, already wired into `(customer)/layout.tsx`), `fetchGarments` (Story 5.1). Do NOT touch nav/footer, the showroom, the about/contact pages, or any Owner/Tailor surface.
- Do NOT introduce a curation/`is_featured` backend field, a CMS, or new product endpoints. Featured = newest available garments via the existing `fetchGarments`.

### The route-group move (the crux — get this right first)

- **Today:** `frontend/src/app/page.tsx` = `export default function Home() { redirect("/showroom"); }`. It lives at the app root, **outside** `(customer)`, so it does NOT get the shared chrome.
- **Target:** delete `app/page.tsx`; create `app/(customer)/page.tsx`. Route groups (`(customer)`) are path-transparent, so `(customer)/page.tsx` resolves to `/` and is wrapped by `(customer)/layout.tsx` (which renders `<CustomerNavbar/>` + `{children}` + `<SiteFooter/>` and `await auth()`s the session). This gives the homepage the navbar + footer + Boutique Mode flex-column for free — the same chrome `/showroom`, `/about`, `/contact` already use.
- **Hard failure to avoid:** if both files exist, Next.js build throws *"two parallel pages resolve to the same path `/`"*. The delete is mandatory.
- **Root layout** (`app/layout.tsx`) wraps everything in `SessionProvider` + `ReactQueryProvider` and sets `<html lang="vi">` + Cormorant font — it has **no** navbar/footer, so there is no double-chrome risk. [Source: frontend/src/app/layout.tsx; frontend/src/app/(customer)/layout.tsx]
- No existing test asserts the `/`→`/showroom` redirect (grep clean), so removing it breaks no test.

### Architecture & pattern constraints (MUST follow)

- **Dual-Mode UI is route-based.** Customer = `(customer)` group (Boutique Mode). Putting the homepage in `(customer)` is what makes it Boutique Mode. No mode React Context. [Source: architecture.md#Frontend Architecture; ux-design-specification.md UX-DR3]
- **Server vs Client boundary:** `(customer)/page.tsx`, `HeroBanner`, `FeatureTriad`, the inline brand-story/closing-band blocks = **Server Components** (static / `await` fetch). `RevealOnScroll` (Framer Motion `whileInView`) and `TestimonialStrip` (carousel state) = `"use client"`. `GarmentCard` is already `"use client"`. [Source: architecture.md#Component Boundaries; existing brand/HeroBanner.tsx is a Server Component]
- **Public data fetch = Server Action → `BACKEND_URL`, ISR.** `fetchGarments` is `"use server"`, no auth, `next: { revalidate: 60 }`. Call it directly from the page; do NOT add client-side TanStack Query for the featured row (the homepage is statically/ISR rendered). [Source: frontend/src/app/actions/garment-actions.ts:30–77]
- **Component naming:** `PascalCase.tsx`; vars/functions `camelCase`. [Source: architecture.md#Code Naming Conventions]
- **No new dependencies.** `framer-motion@^12` already present. Icons = inline SVG (NO icon library — Lucide/Heroicons NOT installed). [Source: frontend/package.json; 15.2/15.3 Dev Notes]

### Existing code to REUSE / NOT rebuild

| Item | Path | Use |
|---|---|---|
| `HeroBanner` | `components/client/brand/HeroBanner.tsx` | Complete the `home` variant + optional `imageSrc`. Keep `showroom-compact`/`about` intact. `title` is already `ReactNode` (two-line headline OK). |
| `FeatureTriad` | `components/client/brand/FeatureTriad.tsx` | Reuse for Section 2. Props: `items:{icon,title,description}[]`, optional `eyebrow`/`heading`/`variant`. Pass inline-SVG icons. |
| `TestimonialStrip` | `components/client/brand/TestimonialStrip.tsx` | Reuse for Section 5. Props: `items:{quote,name,context?,avatarInitial?}[]`, optional `eyebrow`/`heading`. Already a11y-hardened + empty-safe (15.3). |
| `GarmentCard` | `components/client/showroom/GarmentCard.tsx` | Reuse for Featured cards. Self-contained (`AddToCartButton` = local state + modals, no Provider). Props: `{ garment, bestVouchers? }`. Renders image (`next/image`), price, "Xem" → `/showroom/{id}`. |
| `GarmentGrid` | `components/client/showroom/GarmentGrid.tsx` | Optional: reuse for the featured grid (3-col). Or build a 4-col grid with `GarmentCard` directly. |
| `GarmentGridSkeleton` | `components/client/showroom/GarmentGridSkeleton.tsx` | Reuse in `loading.tsx` (`count={4}`). `animate-pulse`, mirrors grid layout. |
| `fetchGarments` | `app/actions/garment-actions.ts` | Reuse to fetch featured. `fetchGarments({ status: GarmentStatus.AVAILABLE, page_size: 4 })` → `res.data.items`. |
| `CustomerNavbar` / `SiteFooter` | `components/client/navigation/` | Already in `(customer)/layout.tsx` (15.1). Do NOT touch; do NOT add page-level chrome. Navbar already links "Trang chủ" → `/`. |
| Closing-CTA band + brand-story split | `app/(customer)/about/page.tsx` (15.3) | Style/markup reference for Sections 4 & 6 — mirror for visual consistency. |
| Focus-ring + a11y pattern | (15.1–15.4 components) | `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]`; ≥44px targets. Reuse verbatim. |

### Data shape (Featured Collection)

- `fetchGarments(filters?) → GarmentApiResponse | null`. `GarmentApiResponse = { data: GarmentListResponse, meta }`; `GarmentListResponse = { items: Garment[]; total; page; page_size; total_pages }`. So: `const featured = (await fetchGarments({ status: GarmentStatus.AVAILABLE, page_size: 4 }))?.data?.items ?? [];`. [Source: frontend/src/types/garment.ts:89–105; app/(customer)/showroom/page.tsx:59–61]
- `Garment` has no `is_featured`/`featured` field (confirmed in `types/garment.ts` and backend `db_models.py`). "Curated" therefore = the newest available garments the catalog returns. If you want strict "newest", the list endpoint already returns rows; do not add sorting params that don't exist — `page_size: 4` of available garments is sufficient and matches the AC intent. [Source: backend/src/models/db_models.py garments table — no featured column]
- `GarmentCard` expects `rental_price` (string), optional `sale_price`, `image_url`, `status`, `size_options`, etc. Pass the `Garment` objects straight through. `bestVouchers` is optional — omit it on the homepage (no voucher preview needed). [Source: GarmentCard.tsx:17–20, 63–74]

### Content (plain Vietnamese — full diacritics, NO English jargon)

**CRITICAL copy rule:** All customer-facing copy MUST be plain Vietnamese with full diacritics. Do NOT use "First-Fit", "Bespoke", "AI", "skeleton", "lead", "submit". The epics phrase Section-2 pillars in English ("First-Fit Perfection >90%", "Di sản thủ công", "AI Bespoke") — **override** to the plain-Vietnamese phrasings below (consistent with the 15.3 About page). [Source: auto-memory feedback_customer_copy_plain_vietnamese; ux-preview-rev4.html home tab]

Recommended copy (from the rev4 preview "Trang chủ" tab `#page-home` — use as-is or close):

- **Hero (AC#2):** eyebrow "Áo dài may riêng · Giữ trọn nét Việt"; headline "Một tà áo, / vẹn cả dáng hình."; subline "Nơi mỗi đường kim kể một câu chuyện riêng — để tà áo không chỉ ôm trọn dáng người, mà còn chạm khẽ vào lòng bạn ngay từ cái nhìn đầu tiên."; CTAs "Dạo xem bộ sưu tập" → `/showroom`, "Hẹn một buổi trò chuyện" → `/booking`. Scroll cue "Cuộn xuống".
- **Section 2 (FeatureTriad):** eyebrow "Lời chúng tôi gửi bạn"; heading "Vì sao chọn chúng tôi"; items: (1) "Yêu ngay lần thử đầu" — "Vừa vặn cả dáng hình lẫn nét duyên ngay lần đầu khoác lên — chẳng phải sửa tới sửa lui, chẳng phải chờ mong." (2) "Đường kim có hồn" — "Mỗi mũi chỉ là một chút tâm tình người thợ gửi vào — để hồn áo dài Việt sống mãi trong từng tà áo." (3) "Riêng một mình bạn" — "Đồng điệu từ dáng hình đến tâm hồn — để bạn yêu tà áo ngay từ cái nhìn đầu tiên."
- **Section 3 (Featured):** eyebrow "Tuyển chọn"; heading "Bộ sưu tập nổi bật"; link "Xem tất cả →" → `/showroom`.
- **Section 4 (Brand story teaser):** eyebrow "Câu chuyện của chúng tôi"; h2 "Hơn một tà áo — / là cả một tấm lòng."; p1 "Từ một tiệm may nhỏ, chúng tôi lớn lên cùng tình yêu dành cho áo dài Việt — mong giữ lại nét duyên ấy cho mọi người, qua bao mùa."; p2 "Không vội vàng, không đại trà. Chỉ có những tà áo được may bằng cả sự nâng niu, cho riêng một người."; link "Nghe trọn câu chuyện →" → `/about`.
- **Section 5 (Testimonials):** eyebrow "Lời thương từ khách"; heading "Niềm tin được dệt nên"; items: ("Lần đầu đặt áo dài trên mạng mà vừa in như may sẵn cho mình, chẳng phải sửa một chỗ nào." — Chị Linh, "Quận 1, TP.HCM", avatarInitial "L") · ("Đẹp và sang, bước vào như lạc giữa một tiệm may riêng, ấm áp chứ không lạnh lùng kiểu mua bán." — Chị Hương, "Hà Nội", "H") · ("Hẹn xong ghé tiệm, mọi thứ đã chờ sẵn. Cảm giác được nâng niu, chu đáo đến từng chút." — Chị Mai, "Đà Nẵng", "M").
- **Section 6 (Closing CTA band):** headline "Tà áo của riêng bạn đang chờ được may."; line "Hẹn một buổi trò chuyện cùng chúng tôi, hoặc thong thả dạo xem bộ sưu tập ngay hôm nay."; CTAs "Hẹn một buổi trò chuyện" → `/booking`, "Dạo xem bộ sưu tập" → `/showroom`.

### Visual reference (preview rev4)

`_bmad-output/planning-artifacts/ux-preview-rev4.html` → **"Trang chủ" tab (`#page-home`, lines 249–335)** is the canonical layout: full-bleed hero (eyebrow + two-line headline + subline + dual CTA + `.scrollcue`) → Why-Choose-Us `.triad` (3 `.feat`) → Featured `.pgrid` (4 `.pcard` + "Xem tất cả →") → brand-story `.split` (image + text → /about) → testimonials `.tgrid` (3 `.tcard`) → Indigo closing `.band` (dual CTA). Reuse its order, spacing rhythm (alternating ivory / white sections), and the plain-Vietnamese copy above. Mobile: triad/pgrid/tgrid collapse to 1 column. [Source: ux-preview-rev4.html lines 249–335; epics.md UX-DR27]

### Accessibility (AC#6)

- WCAG 2.1 Level A; touch targets ≥44×44px; Heritage Gold focus ring `2px solid` via `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]` on every CTA/link. Decorative SVG / scroll cue / gradient placeholders → `aria-hidden="true"`. [Source: ux-design-specification.md UX-DR17; 15.1–15.4]
- `RevealOnScroll` must disable its transform/opacity animation under `prefers-reduced-motion` (render plain `<div>`), so content is visible and not motion-dependent. The hero scroll cue's CSS animation must also be inert under reduced motion. [Source: ux-design-specification.md UX-DR18; epics.md Story 15.5 AC]
- Section order is conveyed by DOM order + headings (`h1` hero, `h2` per section) — not by animation. Featured cards' "Xem" links already carry `aria-label`. [Source: GarmentCard.tsx:205]

### Project Structure Notes

- Page: `frontend/src/app/(customer)/page.tsx` (new; replaces deleted `app/page.tsx`). Route-level loading: `frontend/src/app/(customer)/loading.tsx` (new — see Task 5 caveat about group-wide scope). Reveal wrapper: `frontend/src/components/client/brand/RevealOnScroll.tsx` (new). HeroBanner edit: `frontend/src/components/client/brand/HeroBanner.tsx`. Homepage-specific blocks (brand-story split, closing band) inline in the page or a small co-located component — keep homepage-only blocks out of `brand/` unless genuinely reused. Tests → `frontend/src/__tests__/*.test.tsx`.
- Brand-presence reusable components live in `frontend/src/components/client/brand/` (`HeroBanner`, `FeatureTriad`, `TestimonialStrip`, `ContactForm`; add `RevealOnScroll`).

### Testing Standards

- Jest + React Testing Library + `@testing-library/user-event`; config `frontend/jest.config.js`; tests in `frontend/src/__tests__/*.test.tsx`. Mock `next/link` (plain anchor), `next/image`, `next/navigation`, and the server action (`@/app/actions/garment-actions`) as existing suites do. `framer-motion` works in jsdom; `useReducedMotion()` returns `false` in tests and `whileInView` renders children. New suites are additive. [Source: package.json; existing tests; 15.2/15.3 Dev Notes]
- For the Server Component page test, mock `fetchGarments` and render the awaited component (the existing `AboutPage.test.tsx` / `ContactPage.test.tsx` smoke-render pattern from 15.3/15.4 is the reference). [Source: 15-3-about-page.md Task 5; 15-4 ContactPage.test.tsx]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 15.5 (lines 611–638); UX-DR22 HeroBanner (line 295), UX-DR23 FeatureTriad (297), UX-DR24 TestimonialStrip (299), UX-DR27 Homepage (305), UX-DR31 nav (313); Coverage map lines 416, 417, 418, 421]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR27 Homepage Landing, UX-DR18 micro-animations, UX-DR3 Dual-Mode]
- [Source: _bmad-output/planning-artifacts/ux-preview-rev4.html — "Trang chủ" tab (#page-home, lines 249–335)]
- [Source: frontend/src/app/page.tsx — the redirect to DELETE]
- [Source: frontend/src/app/(customer)/layout.tsx — shared CustomerNavbar + SiteFooter chrome the homepage will inherit]
- [Source: frontend/src/app/layout.tsx — root layout (SessionProvider + ReactQueryProvider, no chrome)]
- [Source: frontend/src/components/client/brand/HeroBanner.tsx — complete the `home` variant; `home` branch is the stub at lines 77–93]
- [Source: frontend/src/components/client/brand/FeatureTriad.tsx — reuse (Story 15.3)]
- [Source: frontend/src/components/client/brand/TestimonialStrip.tsx — reuse (Story 15.3, a11y-hardened)]
- [Source: frontend/src/components/client/showroom/GarmentCard.tsx — reuse for Featured cards (self-contained, no cart Provider)]
- [Source: frontend/src/components/client/showroom/GarmentGrid.tsx — optional reuse for featured grid]
- [Source: frontend/src/components/client/showroom/GarmentGridSkeleton.tsx — reuse in loading.tsx (count=4)]
- [Source: frontend/src/app/actions/garment-actions.ts:30–77 — fetchGarments (public, ISR)]
- [Source: frontend/src/types/garment.ts:39–105 — Garment + GarmentApiResponse/GarmentListResponse shapes; GarmentStatus.AVAILABLE]
- [Source: frontend/src/app/(customer)/showroom/page.tsx — server fetch + HeroBanner usage reference]
- [Source: frontend/src/app/(customer)/about/page.tsx — closing CTA band + brand-story split style reference (Story 15.3)]
- [Source: frontend/next.config.ts — images.remotePatterns (https://**, localhost:8000/uploads/**)]
- [Source: _bmad-output/implementation-artifacts/15-3-about-page.md — FeatureTriad/TestimonialStrip APIs, HeroBanner `about` variant, copy guideline]
- [Source: _bmad-output/implementation-artifacts/15-2-showroom-enhancement.md — HeroBanner origin, brand/ folder, skeleton]
- [Source: _bmad-output/implementation-artifacts/15-1-shared-sitefooter-and-customer-navigation-refactor.md — shared chrome, nav "Trang chủ"→/, focus-ring/a11y conventions]
- [Source: auto-memory feedback_customer_copy_plain_vietnamese — customer copy must be plain Vietnamese, no English/jargon]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

- `npx jest src/__tests__/HeroBanner.test.tsx src/__tests__/RevealOnScroll.test.tsx src/__tests__/HomePage.test.tsx` → 3 suites / 17 tests passed.
- `npx eslint` on all changed files → clean (0 errors, 0 warnings; suppressed the deliberate `<img>` next/image test stub via `eslint-disable-next-line @next/next/no-img-element`).
- `npx jest` (full suite) → 105 suites / 989 tests passed; 1 pre-existing unrelated failure `TaskDetailPatternSection.test.tsx` (tailor/design domain — fails on a clean tree too, documented in Stories 15.1–15.4).
- Route-conflict check: `find src/app -maxdepth 2 -name page.tsx` → only `(customer)/page.tsx` resolves to `/` (old `app/page.tsx` deleted) — no "two parallel pages resolve to `/`" build error.

### Completion Notes List

- **Task 1 — Route-group move:** Deleted `app/page.tsx` (the `redirect("/showroom")`) and created `app/(customer)/page.tsx`. The homepage now lives inside the `(customer)` group, so it inherits the shared `CustomerNavbar` + `SiteFooter` + Boutique flex-column from `(customer)/layout.tsx`. Confirmed structurally that no other route resolves to `/`.
- **Task 2 — HeroBanner `home` variant:** Replaced the generic `home` fallback with a full-bleed hero (`min-h-[78vh] md:min-h-[86vh]`, layered Indigo gradient + gold radial glow, ivory text), eyebrow + two-line Cormorant headline + subline + centered dual-CTA `children`, and a decorative scroll cue (`Cuộn xuống` + bouncing dot, `motion-reduce:animate-none`, `aria-hidden`). Added optional `imageSrc` prop → `next/image` with `fill`/`priority`/`sizes="100vw"` + Indigo overlay (satisfies AC#2's priority-image wiring; ships with gradient since no signature photo exists yet). `showroom-compact`/`about` branches untouched (15.2/15.3 tests still green).
- **Task 3 — RevealOnScroll:** New client wrapper `brand/RevealOnScroll.tsx` using framer-motion `whileInView` (`opacity/y`, `viewport once`). Under `useReducedMotion()` it renders a plain `<div>` (no animation) so content is immediately visible and not motion-dependent. No new dependency.
- **Task 4 — Homepage sections:** `(customer)/page.tsx` (async Server Component) fetches `fetchGarments({ status: AVAILABLE, page_size: 4 })` → `res.data.items`. Assembled: full-bleed hero (dual CTA → /showroom + /booking) → `FeatureTriad` (reused) → Featured Collection (reused `GarmentCard` in a `grid sm:2/lg:4`, "Xem tất cả →" → /showroom) → brand-story split (gradient placeholder, "Nghe trọn câu chuyện →" → /about) → `TestimonialStrip` (reused) → Indigo closing CTA band. Sections 2–5 wrapped in `RevealOnScroll`; alternating ivory/white backgrounds mirror the About page. **Graceful fallback (AC#4):** the Featured section is hidden entirely when `featured.length === 0` (no curation/`is_featured` field exists — featured = newest available). All copy is plain Vietnamese with full diacritics.
- **Task 5 — Loading skeleton:** Added `(customer)/loading.tsx` — full-bleed Indigo gradient hero placeholder + a heading bar + reused `GarmentGridSkeleton count={4}` (which carries the single `role="status"` live region, avoiding nested live regions).
- **Task 6 — Tests:** Extended `HeroBanner.test.tsx` with a `home`-variant block (eyebrow/two-line title/subline/dual-CTA, gradient classes, scroll cue, `imageSrc` image). New `RevealOnScroll.test.tsx` (renders children + className passthrough). New `HomePage.test.tsx` — async-RSC pattern (`render(await HomePage())`) with mocked `fetchGarments`/`framer-motion`/`next/link`/`next/image`/`GarmentCard`: asserts hero, all section headings, featured cards, the /showroom + /about + /booking links, AND the empty/null-fetch graceful fallback (no cards, no Featured heading, rest of page intact), plus no page-level footer.
- **Verification note:** Validated via the unit/integration suite + lint + structural route-conflict check. A live `npm run dev` browser smoke (scroll reveals, responsive ≥375px, real featured images) was NOT run in this non-interactive environment — recommended as a quick reviewer check. This matches the automated-evidence bar used by Stories 15.1–15.4.

### File List

- `frontend/src/app/page.tsx` (deleted — removed the `redirect("/showroom")`)
- `frontend/src/app/(customer)/(home)/page.tsx` (new — Homepage Landing, Server Component; nested in a `(home)` route group so the loading fallback scopes to `/` only)
- `frontend/src/app/(customer)/(home)/loading.tsx` (new — homepage loading skeleton, scoped to the `(home)` segment)
- `frontend/src/components/client/brand/HeroBanner.tsx` (modified — full-bleed `home` variant + optional `imageSrc` + scroll cue; `next/image` import)
- `frontend/src/components/client/brand/RevealOnScroll.tsx` (new — scroll-reveal wrapper)
- `frontend/src/__tests__/HeroBanner.test.tsx` (modified — added `home` variant cases + next/image mock)
- `frontend/src/__tests__/RevealOnScroll.test.tsx` (new)
- `frontend/src/__tests__/HomePage.test.tsx` (new)

## Senior Developer Review (AI)

**Date:** 2026-05-30 · **Outcome:** Approved with patches · 3 adversarial layers (Blind Hunter, Edge Case Hunter, Acceptance Auditor). Acceptance Auditor confirmed AC1–AC5 met and AC6 met after the loading-scope fix. 2 patches applied, 1 deferred, 7 findings rejected as noise (mostly artifacts of the abbreviated diff handed to the context-free Blind Hunter).

### Action Items
- [x] [High] `(customer)/loading.tsx` was group-scoped → its homepage-styled hero+grid skeleton would flash on every async sibling page (`/showroom`, `/booking`, …) that lacks its own `loading.tsx` (AC6 regression). **Fix:** moved the homepage + loading into a nested `(home)` route group (`app/(customer)/(home)/page.tsx` + `(home)/loading.tsx`) so the fallback scopes to `/` only; still inherits `(customer)/layout.tsx` and resolves to `/`. Verified only one page resolves to `/`. (source: edge+auditor)
- [x] [Low] `featured` did not guard a non-array `items` (`res?.data?.items ?? []` lets `items: null` through to `.map`). **Fix:** `const featured = Array.isArray(res?.data?.items) ? res.data.items : [];` (source: edge)

### Deferred
- [Low] Framer Motion SSR renders `opacity:0` for `RevealOnScroll`-wrapped below-the-fold sections until JS hydrates (invisible with JS disabled). Inherent to the spec-mandated scroll-reveal (UX-DR18); the `prefers-reduced-motion` path is already safe (plain `<div>`), and the hero is not wrapped. Not fixing without changing the reveal strategy.

### Rejected (verified non-issues)
- "Missing `use client` in RevealOnScroll" (present at line 1), "`CORMORANT` unused" (used via `style={CORMORANT}`), "metadata placeholder" (real title/description shipped), "`page_size` wrong casing" (snake_case matches `GarmentFilter`), "fetch throws → 500" (`fetchGarments` try/catches → returns `null`), "closing-band gold CTA reversed" (AC2 only constrains the hero — Auditor confirmed compliant), "CTA missing explicit `min-w` 44px" (long Vietnamese labels make width ≫ 44px). The first four stemmed from the abbreviated diff paste given to the context-free Blind Hunter.

## Change Log

| Date | Change |
|---|---|
| 2026-05-30 | Implemented Story 15.5: Homepage Landing "CV". Moved homepage into the `(customer)` route group (deleted root `redirect`), completed the full-bleed `home` `HeroBanner` variant (+ optional `imageSrc`, scroll cue), added `RevealOnScroll` (framer-motion, reduced-motion safe), assembled 6 scroll-revealed sections (hero · FeatureTriad · Featured Collection · brand-story teaser · TestimonialStrip · closing CTA band) reusing existing brand/showroom components, and added a route-level loading skeleton. Plain-Vietnamese copy. Added 3 test suites (17 tests). Full suite 989 pass (1 pre-existing unrelated failure); lint clean. Status → review. |
| 2026-05-30 | Code review (3-layer adversarial): AC1–AC5 pass, AC6 pass after fix. Applied 2 patches — (High) scoped homepage loading by nesting in a `(home)` route group so the skeleton no longer flashes on sibling pages; (Low) `Array.isArray` guard on featured items. 1 Low deferred (framer SSR opacity), 7 rejected as noise. Full suite 989 pass (1 pre-existing unrelated failure); lint clean. |
