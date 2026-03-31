# Deferred Work

## From: Tailor Assignment Tracking (2026-03-24)

### 1. Race condition: No SELECT FOR UPDATE on task updates
- **Severity:** High
- **Scope:** `update_production_step()` and `update_task_status()` in `tailor_task_service.py`
- **Description:** Concurrent requests can both read the same state and both pass validation. Needs `select(...).with_for_update()` or optimistic locking (version column).

### 2. Status/step desynchronization
- **Severity:** Medium
- **Scope:** `update_task_status()` can set `status=completed` while `production_step` remains at "sewing"
- **Description:** The old `update_task_status` endpoint doesn't cross-validate with `production_step`. Consider: (a) prevent completing unless step="done", (b) auto-set step="done" on status completion, or (c) deprecate status endpoint.

### 3. No URL validation on avatar_url
- **Severity:** Medium
- **Scope:** `UserDB.avatar_url` field, `Avatar.tsx` component
- **Description:** No validation that URL starts with `https://`. Potential XSS/SSRF when avatar upload is implemented. Should validate on write.

### 4. No bounds check on experience_years
- **Severity:** Low
- **Scope:** `UserDB.experience_years`, migration
- **Description:** INTEGER with no CHECK constraint. Negative or absurd values possible. Add `CHECK (experience_years >= 0 AND experience_years <= 100)`.

### 5. No CHECK constraint on production_step in DB
- **Severity:** Low
- **Scope:** `tailor_tasks.production_step` column
- **Description:** VARCHAR with no CHECK constraint. Direct DB edits could insert invalid values. Add `CHECK (production_step IN ('pending','cutting','sewing','finishing','quality_check','done'))`.

## From: Showroom Detail Fixes (2026-03-31)

### 1. formatPrice crashes on non-numeric rentalPrice
- **Severity:** Medium
- **Scope:** `BuyRentToggle.tsx` — `formatPrice()` returns "NaN" if input is empty or non-numeric string.

### 2. canBuy flip with stale mode state
- **Severity:** Medium
- **Scope:** `BuyRentToggle.tsx` — If `salePrice` changes to null while mode=mua, mode stays stuck. Needs useEffect to reset.

### 3. SizeChartAccordion hardcoded size chart
- **Severity:** Low
- **Scope:** `SizeChartAccordion.tsx` — Static chart only has S-XXL. Non-standard sizes won't match. Already noted as "phase sau fetch từ backend".
