# Story 15.4: Contact Page and Public Lead Capture

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a visitor ready to reach out,
I want a Contact page with store info and a simple form,
so that I can send my details and have the boutique follow up with me.

## Acceptance Criteria

1. **Contact page split layout at `/contact`.** Opening `/contact` renders a split layout — **info left / form right on desktop, stacked on mobile (≥375px)**. The info side shows a **Google Maps embed (`<iframe>` MUST carry a non-empty `title`)**, store address, opening hours, **tap-to-call phone** (`tel:` link), **Zalo** link, **email** (`mailto:`) link, and social links. This **replaces** the Story 15.1 placeholder `contact/page.tsx`.

2. **Successful lead submission.** Filling the `ContactForm` with a valid **Họ tên** (required, 1–255 chars) and optional **Số điện thoại / Email / Lời nhắn** and submitting creates a Lead through the **public endpoint** with **`source = website`** and **`classification = warm`** (both forced server-side, never chosen by the visitor). On success: a success toast **"Cảm ơn bạn, chúng tôi sẽ liên hệ sớm"** shows and the **form resets**.

3. **Client-side validation (Zod, plain Vietnamese).** Submitting invalid data triggers Zod validation matching the backend `LeadBase` constraints. Vietnamese natural-language errors appear inline (e.g. **"Vui lòng nhập họ tên"**, **"Email không hợp lệ"**) wired with `aria-describedby`. An **empty phone is normalized to `null`** (not `""`) before submission. No technical/raw error strings are shown.

4. **Graceful Recovery on failure.** When submission fails (network/timeout/server error), the form **preserves all entered data** and offers a **"Thử lại"** action — the user does not lose what they typed.

5. **Public, unauthenticated, anti-spam backend endpoint.** A new endpoint accepts the lead **without authentication**, persists it per backend `LeadBase` constraints scoped to the default tenant, and applies **anti-spam protection** (honeypot + lightweight rate-limit). It MUST force `source=website` / `classification=warm` server-side and MUST NOT let the caller inject an arbitrary `source`, `classification`, or `tenant_id`. Owner-only `/api/v1/leads` CRUD endpoints are unchanged.

6. **Shared chrome + Boutique Mode + a11y + no regressions.** The shared `CustomerNavbar` + `SiteFooter` (Story 15.1, in `(customer)/layout.tsx`) wrap the page automatically — do NOT add page-level header/footer. All UI uses the Heritage palette (`#1A2B4C` / `#F9F7F2` / `#D4AF37`, warm gray `#6B7280`), Cormorant headings, body Inter, ≥44×44px touch targets, Heritage Gold focus rings (`focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]`) on every interactive element. Existing pages and tests continue to pass.

## Tasks / Subtasks

- [x] **Task 1: Backend — public lead-capture schema + endpoint** (AC: #2, #5)
  - [x] In `backend/src/models/lead.py`, add a **`PublicLeadCreate`** Pydantic schema that accepts ONLY `name` (str, min 1 / max 255), `phone` (str | None, max 20, reuse the existing whitespace-normalizing validator), `email` (str | None, max 255, reuse the existing regex validator → "Email không hợp lệ"), and `notes` (str | None). **Do NOT include `source`, `classification`, or `tenant_id`** — these must not be settable by an anonymous caller. (Keep `LeadBase`/`LeadCreate` untouched so Owner CRUD is unaffected.)
  - [x] In `backend/src/api/v1/leads.py`, add a `get_default_tenant_id()` helper **identical to the one in `appointments.py`** (returns `uuid.UUID("00000000-0000-0000-0000-000000000001")`) — or import the shared constant if one exists. Then add endpoint **`POST /api/v1/leads/public`** with **NO auth dependency** (no `require_roles`, no `get_tenant_id_from_user`). It accepts `PublicLeadCreate`, builds a `LeadCreate(name=..., phone=..., email=..., notes=..., source=LeadSource.WEBSITE, classification=LeadClassification.WARM)`, calls `lead_service.create_lead(db, get_default_tenant_id(), data)`, and returns `{"data": LeadResponse.model_validate(lead).model_dump()}` with `status_code=201`. Mirror the response-wrapper shape used by the Owner create endpoint.
  - [x] **Route ordering:** declare `/public` so it does NOT collide with `GET /{lead_id}` (a literal static path `POST /public` cannot be captured by the `GET /{lead_id}` route since methods differ — but keep the declaration grouped clearly and add a docstring noting it is the only public route).
  - [x] **Anti-spam (AC#5):** implement BOTH, kept lightweight (no new dependency):
    - **Honeypot:** add an optional field to `PublicLeadCreate` (e.g. `company: str | None = None`). If it is non-empty/truthy, the endpoint returns a **200/201 success-shaped response WITHOUT persisting** (silently drop — do not reveal the trap to bots). Document this clearly in the endpoint docstring.
    - **Rate-limit:** add a DB-window check mirroring the OTP pattern in `backend/src/services/otp_service.py` (`check_rate_limit`, count rows in a recent time window). Add `count_recent_website_leads(db, window_minutes, ...)` to `lead_service.py` (count `LeadDB` rows where `source == "website"` AND `created_at >= now - window`, scoped to default tenant; if `email`/`phone` is provided, scope the count to that contact to avoid a global lockout). If the count exceeds a small threshold (e.g. **>5 per 10 minutes**), raise `HTTPException(status_code=429, detail="Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.")`. Keep thresholds as module constants.

  - [x] **Backend tests** in `backend/tests/test_lead_service.py` (extend) and/or a new `backend/tests/test_public_lead_api.py`: (a) POST `/api/v1/leads/public` with valid name → 201, persisted lead has `source=website` + `classification=warm` + default tenant; (b) caller-supplied `source`/`classification` in the body is ignored/rejected (schema has no such field); (c) NO auth header still succeeds; (d) honeypot field filled → no row created; (e) empty phone → stored as null; (f) rate-limit returns 429 after exceeding threshold. Run `pytest backend/tests/test_public_lead_api.py` (and the leads suite) — green; confirm Owner-only `/api/v1/leads` tests still pass.

- [x] **Task 2: Frontend — public submit Server Action** (AC: #2, #4)
  - [x] In `frontend/src/app/actions/lead-actions.ts`, add a NEW exported `"use server"` action **`submitContactLead(input)`** that calls **`fetch(\`${BACKEND_URL}/api/v1/leads/public\`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })` directly — NO `Authorization` header, NO `getAuthToken()`**. This MUST mirror the public pattern in `app/actions/booking-actions.ts` (`createAppointment`), NOT the authenticated `createLead` pattern. Reason: the Next.js proxy (`frontend/src/proxy.ts`) returns **401 for any client-side `/api/v1/*` request without a session**, so a guest contact form cannot route through it — server actions hit `BACKEND_URL` server-side and bypass the proxy entirely.
  - [x] Use the same shape as `booking-actions`: 10s `AbortController` timeout, return `{ success: boolean; error?: string }`. Map non-OK responses to Vietnamese messages: **429 → "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."**, timeout/`AbortError` → **"Yêu cầu hết thời gian. Vui lòng thử lại."**, other → **"Không gửi được. Vui lòng thử lại."** Do NOT `revalidatePath` (public page, nothing to revalidate).
  - [x] Do NOT touch the existing Owner actions (`createLead`, `fetchLeads`, etc.) — `submitContactLead` is additive.

- [x] **Task 3: Frontend — Zod schema + types** (AC: #2, #3)
  - [x] In `frontend/src/types/lead.ts`, add a `publicLeadSchema` (Zod) matching backend `LeadBase`: `name` required (`.min(1, "Vui lòng nhập họ tên").max(255, ...)`); `phone` optional, normalize empty→undefined via the `z.preprocess(emptyStringToUndefined, ...)` pattern used in `types/customer.ts`, max 20; `email` optional, empty→undefined then `.email("Email không hợp lệ")`, max 255; `notes` optional empty→undefined. Export `PublicLeadFormInput = z.input<...>` and `PublicLeadInput = z.infer<...>`. Reuse the `emptyStringToUndefined` preprocess helper convention from `types/customer.ts` (copy the small helper locally if not exported).
  - [x] On submit, build the payload so an empty phone/email becomes **`null`** (backend stores null) — Zod gives `undefined`; convert `undefined → null` when constructing the server-action input (or send `undefined` and let the omitted-field default to null — but AC#3 explicitly requires empty-phone-normalized-to-null, so be explicit: `phone: values.phone ?? null`).

- [x] **Task 4: Frontend — `ContactForm` component** (AC: #2, #3, #4, #6)
  - [x] Create `frontend/src/components/client/brand/ContactForm.tsx` (`"use client"`). Use **`react-hook-form` + `zodResolver(publicLeadSchema)`** exactly as `components/client/CustomerForm.tsx` does (import `useForm`, `zodResolver`). Fields: Họ tên (required), Số điện thoại, Email, Lời nhắn (textarea). Plus a **visually-hidden honeypot input** named `company` (e.g. wrapper `className="hidden"` / `aria-hidden` / `tabIndex={-1}` / `autoComplete="off"`) — include its value in the submit payload so the backend honeypot can act.
  - [x] **Error display:** inline red text under each field bound via `aria-describedby={errors.x ? "x-error" : undefined}` and the error node `id="x-error"`, mirroring `CustomerForm`. Red border on invalid (`border-red-300`/`border-red-500`).
  - [x] **States (UX-DR25):** Idle; Submitting (button disabled + in-button spinner, `disabled={isSubmitting}`); Success (toast "Cảm ơn bạn, chúng tôi sẽ liên hệ sớm" + `reset()`); Error (Graceful Recovery — keep entered values, show a "Thử lại" affordance/inline error + allow re-submit).
  - [x] **Toast:** there is **NO toast library installed** — reuse the **custom toast pattern** from `components/client/profile/PasswordChangeForm.tsx` (`useState` toast + `useRef` timer + `showToast(message, type)`, ~3s auto-dismiss). Do NOT add `sonner`/`react-hot-toast`.
  - [x] On submit → call `submitContactLead({ name, phone: phone ?? null, email: email ?? null, notes: notes ?? null, company })`. On `success` → `reset()` + success toast. On failure → keep values + error toast/inline + "Thử lại".
  - [x] **Boutique Mode styling:** Heritage palette, Cormorant section heading, Inter inputs, ≥44px touch targets, gold focus ring on inputs + submit. Gold primary submit button.

- [x] **Task 5: Frontend — assemble the Contact page** (AC: #1, #6)
  - [x] Replace `frontend/src/app/(customer)/contact/page.tsx` (currently the 15.1 placeholder) with the real page. Keep `export const metadata` (title "Liên hệ - Nhà May Thanh Lộc", description). It is a **Server Component** that renders the static info side + the `"use client"` `ContactForm`. Do NOT add a header/footer (layout provides them).
  - [x] **Hero:** top `<HeroBanner variant="showroom-compact" eyebrow="Liên hệ" title="Gặp gỡ & trò chuyện cùng chúng tôi" subline="Hẹn một buổi trò chuyện, hay chỉ đơn giản là nhắn cho chúng tôi đôi dòng — chúng tôi luôn sẵn lòng." />` (reuse the existing variant; do not invent a new one).
  - [x] **Split layout:** `grid md:grid-cols-2 gap-10 lg:gap-16 items-start`, stacks to single column on mobile. **Left (info):** Google Maps `<iframe title="Bản đồ tới Nhà May Thanh Lộc" ... loading="lazy" referrerPolicy="no-referrer-when-downgrade" />` in a rounded container (use a generic Maps embed URL for the store address; a placeholder address embed is acceptable — see Dev Notes), then an info card: address, opening hours, tap-to-call (`tel:`), Zalo, email (`mailto:`), social icons. **Right (form):** `<ContactForm />` in a white card.
  - [x] **Reuse store info — DRY:** the store name/address/phone/zalo/email/hours + `telHref`/`zaloHref` helpers currently live **hardcoded inside `components/client/navigation/SiteFooter.tsx`**. To avoid duplicating them on the Contact page, **extract them into a shared module** (e.g. `frontend/src/lib/store-info.ts` exporting `STORE` and `telHref`/`zaloHref`) and **import it in BOTH `SiteFooter.tsx` and the Contact page**. Keep the exact same values. (This is a small refactor of SiteFooter to import instead of inline-declare — verify the 15.1 SiteFooter test still passes after.)

- [x] **Task 6: Tests** (AC: #1–#4, #6)
  - [x] `frontend/src/__tests__/ContactForm.test.tsx`: (a) renders Họ tên/SĐT/Email/Lời nhắn + submit; (b) submitting empty name shows "Vui lòng nhập họ tên" (no submit); (c) invalid email shows "Email không hợp lệ"; (d) valid submit calls a mocked `submitContactLead` with `source` NOT in payload, `phone: null` when empty, and shows success toast + resets; (e) when the mocked action returns `{ success:false }`, entered values are preserved and an error/"Thử lại" is shown. Mock `@/app/actions/lead-actions` (`submitContactLead`).
  - [x] (Optional) `frontend/src/__tests__/ContactPage.test.tsx`: smoke-render asserting the Maps `<iframe>` has a non-empty `title`, the info side shows phone (`tel:`) + email (`mailto:`) links, and `ContactForm` is present. Mock `next/link` and the server action.
  - [x] Run `npx jest` (frontend) — new suites green; **no regressions** (note the known pre-existing `TaskDetailPatternSection.test.tsx` failure is unrelated). Run `npx eslint` on changed files (clean).
  - [x] Run `pytest` for the backend lead suites (Task 1) — green.

## Dev Notes

### Scope boundary (read first)

- This story builds **only** the Contact page (`/contact`), the `ContactForm` component, the public submit Server Action, and the **public backend lead endpoint** with anti-spam. It does NOT build the Homepage Landing (`/` — Story 15.5). The Owner-side CRM Leads board (Epic 6) already exists and is **out of scope** — do not modify Owner CRUD or the `/owner/crm` UI beyond the optional `STORE` extraction noted in Task 5.
- `HeroBanner`, `CustomerNavbar`, `SiteFooter` already exist (Stories 15.1–15.3). The `/contact` link is already wired in the navbar and the 15.3 closing CTA — this story makes it resolve to a real page.

### Architecture & pattern constraints (MUST follow)

- **Public write = Server Action → `BACKEND_URL` directly (NOT through the proxy).** The proxy (`frontend/src/proxy.ts:45–51`) **401s every client-side `/api/v1/*` request without a session**. The established public-write pattern is `app/actions/booking-actions.ts` → `fetch(\`${BACKEND_URL}/api/v1/appointments\`)` server-side with no token. Mirror it exactly. [Source: frontend/src/proxy.ts; frontend/src/app/actions/booking-actions.ts]
- **Public backend endpoint = no auth dependency + default tenant.** Mirror `backend/src/api/v1/appointments.py`: a `get_default_tenant_id()` helper returning `00000000-0000-0000-0000-000000000001`, and an endpoint with NO `require_roles`/`get_tenant_id_from_user`. [Source: backend/src/api/v1/appointments.py:17–47, 91–104; backend/src/api/dependencies.py:130–163]
- **Server vs Client boundary:** `contact/page.tsx` (static info + Maps iframe) = **Server Component**; `ContactForm` (form state, toast, react-hook-form) = `"use client"`. [Source: architecture.md#Component Boundaries; existing CustomerForm.tsx is a client component]
- **SSOT field naming:** Lead fields are **snake_case** end-to-end (`name`, `phone`, `email`, `source`, `classification`, `notes`) to match backend Pydantic. [Source: frontend/src/types/lead.ts header]
- **No new dependencies.** `react-hook-form` + `@hookform/resolvers/zod` + `zod` already used by `CustomerForm`. NO toast library — use the custom toast pattern. NO icon library — social/contact icons are inline SVG. [Source: frontend/package.json; CustomerForm.tsx; PasswordChangeForm.tsx]

### Backend: exact Lead contract (match precisely)

- **Model file:** `backend/src/models/lead.py`. **`LeadBase`** fields: `name: str` (min_length=1, max_length=255), `phone: str | None` (max_length=20, whitespace-normalizing validator), `email: str | None` (max_length=255, regex `^[^\s@]+@[^\s@]+\.[^\s@]+$`, error "Email không hợp lệ"), `source: LeadSource` (default MANUAL), `classification: LeadClassification` (default WARM), `notes: str | None`.
- **Enums:** `LeadSource` = manual | **website** | booking_abandoned | cart_abandoned | signup. `LeadClassification` = hot | **warm** | cold. The public endpoint forces `LeadSource.WEBSITE` + `LeadClassification.WARM`.
- **Service:** `lead_service.create_lead(db, tenant_id, data: LeadCreate) → LeadDB` persists `source.value`/`classification.value` as strings. [Source: backend/src/services/lead_service.py:121–151]
- **DB:** `LeadDB` table `leads` — `tenant_id` (FK, NOT NULL), `name` String(255), `phone` String(20) nullable, `email` String(255) nullable, `source` String(50) default "manual", `classification` String(10) default "warm", `notes` Text nullable. [Source: backend/src/models/db_models.py:973–1007]
- **Router registration:** `leads_router` is `include_router`-ed in `backend/src/main.py` without an extra prefix (prefix is on the router: `/api/v1/leads`). Adding `POST /api/v1/leads/public` to the same router needs no main.py change. [Source: backend/src/main.py:178; backend/src/api/v1/leads.py:28]
- **Rate-limit reference:** `backend/src/services/otp_service.py:138–166` `check_rate_limit` counts rows in a time window (3/hour). Mirror this counting approach for `count_recent_website_leads`. There is **no slowapi/middleware** rate limiter in the project — keep it DB-window-based. [Source: backend/src/services/otp_service.py]

### Existing code to REUSE / NOT rebuild

| Item | Path | Use |
|---|---|---|
| `HeroBanner` (`showroom-compact`/`eyebrow`) | `components/client/brand/HeroBanner.tsx` | Reuse `showroom-compact` variant for the contact hero. Do NOT add a new variant. |
| `CustomerNavbar` / `SiteFooter` | `components/client/navigation/` | Already in `(customer)/layout.tsx` (15.1). Extract `STORE` + `telHref`/`zaloHref` to a shared module (Task 5) and import in both. |
| Public-write Server Action pattern | `app/actions/booking-actions.ts` (`createAppointment`) | Copy the structure for `submitContactLead` (direct `BACKEND_URL` fetch, no token, 10s timeout). |
| react-hook-form + Zod form pattern | `components/client/CustomerForm.tsx` | Form wiring, `zodResolver`, inline `aria-describedby` errors, disabled-on-submit. |
| Custom toast | `components/client/profile/PasswordChangeForm.tsx` | `useState`+`useRef` toast, ~3s auto-dismiss. No toast lib. |
| Zod `emptyStringToUndefined` preprocess | `types/customer.ts` (lines ~11, 29–30, 136–138) | Reuse for optional phone/email/notes; convert `undefined → null` at payload build. |
| Public default-tenant helper | `api/v1/appointments.py` `get_default_tenant_id()` | Replicate (or share) in `leads.py`. |
| `lead_service.create_lead` | `services/lead_service.py:121` | Reuse to persist — do NOT write a second insert path. |
| Owner Lead types | `types/lead.ts` (`LeadSource`, `LeadClassification`) | Reuse the existing union types; add `publicLeadSchema` here. |

### Anti-spam decision (AC#5) — be pragmatic, no new infra

1. **Honeypot** (primary, zero-infra): hidden `company` field in `ContactForm`; backend silently drops (success-shaped response, no DB row) when it's filled. Bots auto-fill it; humans never see it.
2. **DB-window rate-limit** (secondary): `count_recent_website_leads` (mirror OTP pattern) → 429 when **>5 website leads in 10 minutes** (scope by email/phone when supplied, else default-tenant global). Constants at module top.
- Do NOT attempt IP-based limiting — requests arrive via the Next server action / backend, so client IP is not reliably available. Contact-level + honeypot is sufficient for this story.

### Google Maps embed

- Use a standard `https://www.google.com/maps/embed?...` `<iframe>` for the store address (`123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh` per the SiteFooter `STORE`). A generic embed pointing at that address is acceptable — real coordinates can be tuned later. The `<iframe>` MUST have a non-empty `title` (AC#1 + a11y), `loading="lazy"`, and a fixed aspect-ratio container. Do NOT load any Maps JS SDK (just the embed iframe → no API key, no new dependency).

### Content (plain Vietnamese — full diacritics, NO English jargon)

**CRITICAL copy rule:** All customer-facing copy MUST be plain Vietnamese with full diacritics. Do NOT use English/jargon ("First-Fit", "Bespoke", "AI", "skeleton", "lead", "submit"). [Source: auto-memory feedback_customer_copy_plain_vietnamese]

- **Hero:** eyebrow "Liên hệ"; title "Gặp gỡ & trò chuyện cùng chúng tôi"; subline "Hẹn một buổi trò chuyện, hay chỉ đơn giản là nhắn cho chúng tôi đôi dòng — chúng tôi luôn sẵn lòng."
- **Form labels:** "Họ tên" (placeholder "Nguyễn Thị A"), "Số điện thoại" (placeholder "0901 234 567"), "Email" (placeholder "ban@email.com"), "Lời nhắn" (placeholder "Bạn muốn may áo dài cho dịp gì? Hãy kể cho chúng tôi nghe..."). Submit button "Gửi lời nhắn".
- **Validation:** "Vui lòng nhập họ tên" · "Email không hợp lệ".
- **Success toast:** "Cảm ơn bạn, chúng tôi sẽ liên hệ sớm".
- **Error / Graceful Recovery:** "Không gửi được. Vui lòng thử lại." + a "Thử lại" affordance. Rate-limit: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút."
- **Info side headings:** "Ghé tiệm" (address + map), "Giờ mở cửa", "Gọi / nhắn cho chúng tôi" (phone/Zalo/email), social.

### Visual reference (preview rev4)

`_bmad-output/planning-artifacts/ux-preview-rev4.html` → the Contact section (`#page-contact` or the contact tab) is the canonical layout: hero → split (info left / form right) → stacked on mobile. Reuse its spacing rhythm and the plain-Vietnamese copy above. [Source: epics.md UX-DR30, UX-DR25]

### Accessibility (AC#6)

- WCAG 2.1 Level A; touch targets ≥44×44px; Heritage Gold focus ring `2px solid` via `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D4AF37]` on inputs, links, and submit. [Source: ux-design-specification.md UX-DR17; 15.1–15.3]
- Each form error is wired with `aria-describedby` to its field; the error node has a matching `id`. Decorative SVG icons → `aria-hidden="true"`. Maps `<iframe>` has a descriptive `title`. The honeypot input is `aria-hidden`, `tabIndex={-1}`, off-screen/hidden — keyboard/AT users never reach it. [Source: epics.md Story 15.4 AC; UX-DR19/UX-DR25]

### Project Structure Notes

- Brand-presence components → `frontend/src/components/client/brand/` (existing: `HeroBanner`, `FeatureTriad`, `TestimonialStrip`; add `ContactForm`).
- Page: `frontend/src/app/(customer)/contact/page.tsx` (replace 15.1 placeholder). Server Action: extend `frontend/src/app/actions/lead-actions.ts`. Zod: extend `frontend/src/types/lead.ts`. Shared store info: new `frontend/src/lib/store-info.ts`. Backend: `models/lead.py` (+`PublicLeadCreate`), `api/v1/leads.py` (+public endpoint), `services/lead_service.py` (+rate-limit counter). Tests → `frontend/src/__tests__/*.test.tsx`, `backend/tests/test_*.py`.

### Testing Standards

- **Frontend:** Jest + React Testing Library + `@testing-library/user-event`; config `frontend/jest.config.js`; tests in `frontend/src/__tests__/*.test.tsx`. Mock `next/link`, `next/navigation`, and the server action (`@/app/actions/lead-actions`). New suites are additive. [Source: package.json; existing tests; 15.3 Dev Notes]
- **Backend:** pytest; tests in `backend/tests/test_*.py`; async test client pattern as in `test_appointment_api.py` / `test_lead_service.py`. Cover the public endpoint (no-auth success, forced source/classification, honeypot drop, null phone, 429 rate-limit). [Source: backend/tests/]

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 15.4 (lines 581–609); UX-DR25 ContactForm (line 301), UX-DR30 Contact page (line 311), UX-DR31 nav (line 313); Coverage map lines 419, 424; backend addendum lines 245–246, 477]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR25 ContactForm, UX-DR30 Contact page, UX-DR19 error-handling UX]
- [Source: _bmad-output/planning-artifacts/ux-preview-rev4.html — Contact tab (split info/form layout)]
- [Source: backend/src/models/lead.py — LeadBase/LeadCreate, LeadSource.WEBSITE, LeadClassification.WARM; add PublicLeadCreate]
- [Source: backend/src/api/v1/leads.py — Owner-only router (prefix /api/v1/leads); add public endpoint]
- [Source: backend/src/api/v1/appointments.py — canonical public no-auth + get_default_tenant_id() pattern]
- [Source: backend/src/services/lead_service.py — create_lead; add count_recent_website_leads]
- [Source: backend/src/services/otp_service.py:138–166 — check_rate_limit window-count pattern]
- [Source: backend/src/api/dependencies.py:130–163 — DEFAULT_TENANT_ID]
- [Source: frontend/src/proxy.ts:45–51 — proxy 401s /api/v1/* without session → public form must use server action to BACKEND_URL]
- [Source: frontend/src/app/actions/booking-actions.ts — public-write server action pattern to mirror]
- [Source: frontend/src/app/actions/lead-actions.ts — add submitContactLead; do not touch Owner actions]
- [Source: frontend/src/types/lead.ts — LeadSource/LeadClassification unions; add publicLeadSchema]
- [Source: frontend/src/types/customer.ts — Zod emptyStringToUndefined / phone / email patterns]
- [Source: frontend/src/components/client/CustomerForm.tsx — react-hook-form + zodResolver + aria-describedby error pattern]
- [Source: frontend/src/components/client/profile/PasswordChangeForm.tsx — custom toast pattern (no toast lib)]
- [Source: frontend/src/components/client/navigation/SiteFooter.tsx — STORE constants + telHref/zaloHref to extract & reuse]
- [Source: frontend/src/components/client/brand/HeroBanner.tsx — reuse showroom-compact variant + eyebrow]
- [Source: frontend/src/app/(customer)/contact/page.tsx — 15.1 placeholder to replace]
- [Source: frontend/src/app/(customer)/layout.tsx — shared CustomerNavbar + SiteFooter chrome]
- [Source: auto-memory feedback_customer_copy_plain_vietnamese — customer copy must be plain Vietnamese, no English/jargon]

## Dev Agent Record

### Agent Model Used

claude-opus-4-7

### Debug Log References

- `pytest tests/test_public_lead_api.py tests/test_lead_service.py` → 39 passed (7 new public-endpoint tests + 32 existing lead-service).
- `ruff check` on changed backend files → clean.
- `npx jest ContactForm ContactPage SiteFooter AboutPage` → 4 suites / 18 tests passed.
- `npx eslint` on all changed frontend files → clean (after refactoring the toast auto-dismiss from `useRef`+`setTimeout` to a `useEffect`, which the `react-hooks/refs` rule required).
- `npx jest` (full frontend) → 103 suites / 979 tests passed; 1 pre-existing unrelated failure `TaskDetailPatternSection.test.tsx` (tailor/design domain — fails on a clean tree too).
- `test_lead_conversion_service.py` collection error (`ImportError: DEFAULT_CONVERSION_PASSWORD`) is **pre-existing** — confirmed by stashing all story changes and re-running; the constant does not exist in `src/` and was not touched by this story.

### Completion Notes List

- **Task 1 — Backend public endpoint:** Added `PublicLeadCreate` schema in `models/lead.py` (name/phone/email/notes + honeypot `company` only — no `source`/`classification`/`tenant_id`, so an anonymous caller cannot inject them; reuses the shared email/phone validators). Added `POST /api/v1/leads/public` in `api/v1/leads.py` with NO auth dependency, a local `get_default_tenant_id()` (mirrors `appointments.py`), forcing `source=website` + `classification=warm`. Anti-spam: honeypot silently drops bot submissions (returns `{"data": null}`, no row); DB-window rate-limit via `lead_service.count_recent_website_leads` (>5 website leads / 10 min, scoped to the contact email/phone → 429). Owner CRUD untouched.
- **Task 2 — Server Action:** Added public `submitContactLead` to `lead-actions.ts` calling `${BACKEND_URL}/api/v1/leads/public` directly (no token, 10s timeout) — mirrors `booking-actions.ts`, bypassing the proxy's `/api/v1/*` 401 gate. Owner actions untouched.
- **Task 3 — Zod:** Added `publicLeadSchema` (+ `PublicLeadFormInput`/`PublicLeadInput`) in `types/lead.ts` matching `LeadBase`, with plain-Vietnamese messages and `empty→undefined` preprocess.
- **Task 4 — ContactForm:** New `brand/ContactForm.tsx` (client) — react-hook-form + `zodResolver`, inline `aria-describedby` errors, hidden honeypot, in-button spinner, custom toast (no toast lib; auto-dismiss via `useEffect`). On failure preserves entered values + shows an `alert` retry hint (Graceful Recovery). Builds payload with `?? null` so empty phone/email → null.
- **Task 5 — Contact page + DRY:** Replaced the 15.1 placeholder `contact/page.tsx` with the real Server Component: `showroom-compact` hero → split layout (info + titled Google Maps iframe / form). Extracted store info to `lib/store-info.ts` (`STORE`, `telHref`, `zaloHref`, `STORE_MAP_EMBED_URL`) and refactored `SiteFooter.tsx` to import it (no duplicated constants; 15.1 SiteFooter test still green).
- **Copy:** All plain Vietnamese with full diacritics.

### File List

- `backend/src/models/lead.py` (modified — added `PublicLeadCreate`)
- `backend/src/api/v1/leads.py` (modified — `get_default_tenant_id()` + `POST /api/v1/leads/public`)
- `backend/src/services/lead_service.py` (modified — `count_recent_website_leads` + rate-limit constants; `timedelta` import)
- `backend/tests/test_public_lead_api.py` (new)
- `frontend/src/app/actions/lead-actions.ts` (modified — added public `submitContactLead`)
- `frontend/src/types/lead.ts` (modified — `publicLeadSchema` + types + zod import)
- `frontend/src/components/client/brand/ContactForm.tsx` (new)
- `frontend/src/lib/store-info.ts` (new)
- `frontend/src/components/client/navigation/SiteFooter.tsx` (modified — import shared store-info)
- `frontend/src/app/(customer)/contact/page.tsx` (modified — replaced placeholder with real Contact page)
- `frontend/src/__tests__/ContactForm.test.tsx` (new)
- `frontend/src/__tests__/ContactPage.test.tsx` (new)

## Change Log

| Date | Change |
|---|---|
| 2026-05-29 | Implemented Story 15.4: Contact page (`/contact`) + public lead capture. Backend public `POST /api/v1/leads/public` (no auth, forced website/warm, honeypot + rate-limit). Frontend `submitContactLead` server action, `publicLeadSchema`, `ContactForm`, real Contact page (hero + split info/map/form), shared `lib/store-info.ts`. Added 12 tests (7 backend + 5 ContactForm) + 1 page smoke test. Status → review. |
