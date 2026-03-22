# Code Review Report — Story 6.3: Voucher Creator UI

- **Commit:** `4048b1e`
- **Date:** 2026-03-23
- **Review Mode:** Full (spec loaded)
- **Spec File:** `6-3-voucher-creator-ui.md`
- **Scope:** Full commit diff (includes story 6.2 + 6.3 changes)
- **Reviewer:** Claude Opus 4.6 (3-layer adversarial review)

## Review Layers

| Layer | Status | Findings |
|-------|--------|----------|
| Blind Hunter (adversarial, no context) | Completed | 13 raw findings |
| Edge Case Hunter (with project access) | Completed | 12 raw findings |
| Acceptance Auditor (spec + context) | Completed | 6 raw findings |

## Triage Summary

| Category | Count |
|----------|-------|
| **Patch** (code fixable) | 18 (3 HIGH, 10 MEDIUM, 5 LOW) |
| **Defer** (pre-existing) | 3 |
| **Rejected** (noise) | 2 |
| **Total** | 23 |

---

## PATCH — Code Issues to Fix

### HIGH Priority

#### P1. Hardcoded default password for lead conversion accounts
- **Source:** blind
- **Location:** `backend/src/services/lead_service.py:14`
- **Detail:** Every customer account created via lead conversion gets the same password `"camonquykhach"`. Combined with the guessable `{phone}@local` email pattern, any attacker who knows this password can log in as any converted customer. No forced password change on first login (`is_active=True` set immediately).
- **Action:** Generate a random temporary password or send a password-reset link via email/SMS on account creation. At minimum, set a flag requiring password change on first login.

#### P2. `converted_by NOT NULL` contradicts `ON DELETE SET NULL` in migration
- **Source:** blind+edge
- **Location:** `backend/migrations/020_create_lead_conversions_table.sql:13`, `backend/src/models/db_models.py:688`
- **Detail:** Column declared `NOT NULL` but FK uses `ON DELETE SET NULL`. When a user who performed a lead conversion is deleted, PostgreSQL attempts to SET NULL on a NOT NULL column → DB error blocks user deletion.
- **Action:** Either change to `nullable=True` (allow NULL for deleted users) or change FK to `ON DELETE RESTRICT` (prevent deletion of users with conversions).

#### P3. Voucher update allows `total_uses` below current `used_count`
- **Source:** blind+edge
- **Location:** `backend/src/services/voucher_service.py:172-223`
- **Detail:** No validation that `total_uses >= used_count` during update. Owner can set `total_uses=1` when `used_count=5`, creating inconsistent state. Any logic checking `total_uses - used_count` for remaining uses will produce negative numbers.
- **Action:** Add validation in `update_voucher()`: if `total_uses` is being updated, verify `new_total_uses >= voucher.used_count`.

### MEDIUM Priority

#### P4. `sort_by`/`sort_order` not validated against whitelist
- **Source:** blind+edge
- **Location:** `backend/src/api/v1/vouchers.py:39`, `backend/src/services/voucher_service.py:67-75`
- **Detail:** `sort_by` accepts any string, silently falls back to `created_at`. `sort_order` is case-sensitive — `"ASC"` or `"Asc"` silently becomes `desc`. Should use `Enum` or `Literal` type for explicit validation (cf. `LeadFilter` pattern in `lead.py:135-142`).
- **Action:** Use `Literal["created_at", "code", "expiry_date", "value", "used_count"]` for `sort_by` and `Literal["asc", "desc"]` for `sort_order`.

#### P5. Voucher code uniqueness race condition (TOCTOU)
- **Source:** blind
- **Location:** `backend/src/services/voucher_service.py:126-148`
- **Detail:** Check-then-insert pattern without `SELECT ... FOR UPDATE`. Two concurrent requests can both pass the uniqueness check before either commits, creating duplicate codes. If the DB has a unique constraint on `(tenant_id, code)`, the second request will get an unhandled `IntegrityError` (500) instead of a clean 409.
- **Action:** Verify that migration 017 has a unique constraint on `(tenant_id, code)`. If yes, wrap the IntegrityError in a proper 409 response. If no, add the constraint.

#### P6. Stale `convertTarget` in onSuccess callback
- **Source:** blind
- **Location:** `frontend/src/components/client/crm/LeadsBoardClient.tsx:3518-3524`
- **Detail:** `onSuccess` callback captures `convertTarget` from closure at creation time. If `convertTarget` changes between `mutate()` call and resolution, `lead` may be null, falling back to generic "lead" string.
- **Action:** Pass lead name via mutation variables or `onMutate` context object.

#### P7. Lead conversion: duplicate phone handling — silent merge vs expected error
- **Source:** blind+edge
- **Location:** `backend/src/services/lead_service.py:287-350`
- **Detail:** Implementation silently reuses existing customer with same phone instead of raising 409 as originally expected. Frontend 409 handling becomes dead code. Additionally, empty-string phone (`""`) bypasses the duplicate check entirely (Python falsy), allowing multiple customers with `phone=""`.
- **Action:** Decide on behavior: (a) raise 409 with clear message, or (b) keep silent merge but inform Owner in response. Fix empty-string bypass: `if lead.phone and lead.phone.strip():`.

#### P8. Voucher update allows past `expiry_date` + Zod missing future-date validation
- **Source:** edge+auditor
- **Location:** `backend/src/services/voucher_service.py:172`, `frontend/src/components/client/vouchers/VoucherForm.tsx`
- **Detail:** `create_voucher()` validates `expiry_date > today()` but `update_voucher()` does not. Owner can set expiry to past → voucher shows "Active" in backend but "Het han" in frontend. Frontend Zod only checks non-empty string, not future date.
- **Action:** Add past-date validation in `update_voucher()`. Add Zod `.refine()` to check `new Date(val) > new Date()` on client side.

#### P9. Lead conversion silently skips account creation when no email/phone
- **Source:** edge
- **Location:** `backend/src/services/lead_service.py:326-350`
- **Detail:** When `create_account=True` but lead has neither email nor phone, `login_email=None` → entire account creation block is skipped. Response still shows "success" with no warning that account was not created.
- **Action:** Return an error or warning when `create_account=True` but insufficient contact info exists. At minimum, include a `warnings` field in the response.

#### P10. `Math.max(1, NaN)` returns NaN for invalid page parameter
- **Source:** edge
- **Location:** `frontend/src/app/(workplace)/owner/vouchers/page.tsx:28`
- **Detail:** `parseInt("abc")` = NaN, `Math.max(1, NaN)` = NaN (not 1). NaN page → backend 422 error.
- **Action:** Fix: `Math.max(1, parseInt(params.page ?? "1", 10) || 1)`.

#### P11. AC3 Violation: Code field editable in Edit form
- **Source:** auditor
- **Location:** `frontend/src/components/client/vouchers/VoucherForm.tsx:127-136`
- **Detail:** AC3 states "Owner can update any field except code if already assigned." Backend correctly omits `code` from `VoucherUpdateRequest`, but frontend never disables the code input in edit mode. User can modify code → change silently ignored. UX is misleading.
- **Action:** Disable code input when `isEditing=true`: `disabled={isEditing}` on the input element, with visual indication (grayed out, helper text).

#### P12. AC7 Violation: `total_redemptions` not displayed in Analytics Summary
- **Source:** auditor
- **Location:** `frontend/src/app/(workplace)/owner/vouchers/page.tsx:80-105`
- **Detail:** AC7 requires 4 metrics: total vouchers, active count, total redemptions, redemption rate. UI only renders 3 cards — `total_redemptions` is fetched but not displayed.
- **Action:** Add a 4th stat card for "Tong luot su dung" showing `stats.total_redemptions`.

#### P13. VoucherManagementClient does not use TanStack Query
- **Source:** auditor
- **Location:** `frontend/src/components/client/vouchers/VoucherManagementClient.tsx`
- **Detail:** Dev Notes specify "TanStack Query for server state" but component uses raw `useState` + direct Server Action calls. Misses cache invalidation, background refetch, deduplication, and optimistic UI that TanStack Query provides (cf. `LeadsBoardClient.tsx` pattern).
- **Action:** Refactor to use `useQuery` for data fetching and `useMutation` for toggle/delete operations.

### LOW Priority

#### P14. Delete error uses `alert()` instead of toast notification
- **Source:** auditor
- **Location:** `frontend/src/components/client/vouchers/VoucherManagementClient.tsx`
- **Detail:** Dev Notes require toast notifications for all feedback. Delete error uses browser `alert()`. Toggle/delete success have no feedback at all.
- **Action:** Replace `alert()` with toast pattern. Add success toast for toggle and delete operations.

#### P15. Sidebar icon uses inline SVG instead of `TicketPercent` from lucide-react
- **Source:** auditor
- **Location:** `frontend/src/components/client/workplace/WorkplaceSidebar.tsx`
- **Detail:** Dev Notes specify `TicketPercent` from lucide-react. Current code uses a generic Heroicons tag SVG path.
- **Action:** Replace inline SVG with `import { TicketPercent } from "lucide-react"`.

#### P16. Double-submit after timeout shows confusing 409 error
- **Source:** edge
- **Location:** `frontend/src/components/client/vouchers/VoucherForm.tsx:83-111`
- **Detail:** 10s timeout → button re-enables → user retries → "Ma voucher da ton tai" (first request actually succeeded). No idempotency key.
- **Action:** On 409 during create, check if voucher exists with same code and redirect to edit page, or add a more descriptive error message.

#### P17. ConvertConfirmDialog does not reset `createAccount` checkbox state
- **Source:** blind
- **Location:** `frontend/src/components/client/crm/LeadsBoardClient.tsx:3339-3350`
- **Detail:** `useState(false)` for `createAccount` not reset when switching leads. If user checks for lead A → cancels → opens for lead B, checkbox stays checked.
- **Action:** Add `key={lead?.id}` to the dialog component, or use `useEffect` to reset state when `lead` prop changes.

#### P18. Timer leak on component unmount
- **Source:** blind
- **Location:** `frontend/src/components/client/crm/LeadsBoardClient.tsx:3474-3480`
- **Detail:** `toastTimerRef` and `searchTimerRef` not cleared in useEffect cleanup. If component unmounts before timer fires → setState on unmounted component.
- **Action:** Add `useEffect(() => () => { clearTimeout(toastTimerRef.current); clearTimeout(searchTimerRef.current); }, [])`.

---

## DEFER — Pre-existing Issues (Not Caused by This Change)

#### D1. Service layer calls `db.commit()` directly
- **Source:** blind
- **Detail:** Service functions commit transactions directly, preventing composable transaction boundaries. Architectural pattern already established across the codebase. Consider middleware/dependency-based commit management in a future refactor.

#### D2. Service layer raises `HTTPException`
- **Source:** blind
- **Detail:** Services import and raise `HTTPException` from FastAPI, coupling business logic to the HTTP transport layer. Makes services unusable from CLI/workers. Pre-existing pattern.

#### D3. `date.today()` uses server timezone instead of tenant timezone
- **Source:** edge
- **Location:** `backend/src/services/voucher_service.py:126`
- **Detail:** `date.today()` returns server-local date. Server in UTC vs tenant in UTC+7 → off-by-one acceptance/rejection at timezone boundaries. Affects all date comparisons project-wide.

---

## Rejected Findings (2)

1. **Float precision for VND amounts in frontend** — `parseFloat` on Decimal strings is adequate for display-and-resubmit flow. Backend `Numeric(10,2)` handles rounding.
2. **Frontend `getVoucherById` no UUID validation** — Backend FastAPI validates UUID and returns 422. Defense-in-depth but not actionable risk.

---

## Action Items Checklist

- [x] **P1** — Replace hardcoded password with random temp password + must_change_password flag
- [x] **P2** — Fix migration: `nullable=True` for `converted_by` (compatible with ON DELETE SET NULL)
- [x] **P3** — Add `total_uses >= used_count` validation in `update_voucher()`
- [x] **P4** — Use `Literal` types for `sort_by` and `sort_order`
- [x] **P5** — Handle `IntegrityError` as 409 (unique constraint on `(tenant_id, code)` confirmed)
- [x] **P6** — Fix stale convertTarget closure in `onSuccess`
- [x] **P7** — Fix empty-string phone bypass in duplicate check
- [x] **P8** — Add past-date validation in `update_voucher()` + Zod `.refine()` for future date
- [x] **P9** — Return error when `create_account=True` but no email/phone
- [x] **P10** — Fix NaN fallback: `parseInt(...) || 1`
- [x] **P11** — Disable code input in edit mode with visual indication
- [x] **P12** — Add 4th stat card for `total_redemptions`
- [ ] **P13** — Refactor to TanStack Query *(deferred — significant refactor)*
- [x] **P14** — Replace `alert()` with toast, add success feedback for toggle/delete
- [ ] **P15** — Replace inline SVG with `TicketPercent` *(skipped — lucide-react not in dependencies)*
- [x] **P16** — IntegrityError now returns clean 409 instead of 500
- [x] **P17** — Reset `createAccount` state on lead change via `useEffect`
- [x] **P18** — Add `useEffect` cleanup for timer refs on unmount
