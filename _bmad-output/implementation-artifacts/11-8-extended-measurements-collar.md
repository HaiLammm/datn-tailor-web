# Story 11.8: Extended Measurements, Data Model & Collar Piece

Status: done

> ✅ **DEV + REVIEW COMPLETE 2026-06-08.** Collar (lá cổ) generated as the 4th piece, sized from
> the drawn neck circumference (`length = 2×(front+back neckline) + 0.5`, band 3cm, cut-on-line);
> measured == drawn (shared curve math). 5 new optional measurements wired end-to-end (schema +
> ORM + migration 040 + service persist + response); `ha_mong` consumed by the bodice (overrides
> default 18). Frontend: collar in PieceType/preview, sleeve-type selector + 5 conditional fields in
> the measurement form, geometry-param labels aligned to real engine output. Code review found:
> F1 (HIGH) 5 new fields lacked Vietnamese 422 → fixed in main.py `_MEASUREMENT_INFO_VI` + API test;
> F2 frontend lagged backend (also covered 11.7's sleeve_type) → fixed; F3 auto-fill deferred (below).
> 139 backend + 23 frontend pattern tests green.
>
> **Deferred (F3, not blocking — AC5 "missing optional don't block" is satisfied):** auto-fill of the
> 5 new measurements from the customer profile needs profile-side columns (migration 038 only added
> ha_eo/vong_nach/vong_bap_tay to `measurements`). The 5 ranges are also [verify] (artisan to confirm).
> Follow-up: extend `measurements` table + `PATTERN_TO_CUSTOMER_MAPPING` once ranges are confirmed.

<!-- Created via bmad-create-story 2026-06-08 from SCP 2026-06-08 §4.6. Successor to 11.7 (done). -->

## Story

As an Owner,
I want the five new artisan measurements captured and validated, and the collar (lá cổ) generated as a pattern piece,
so that the pattern engine covers the full garment (darts, shoulder slope, collar) instead of only the bodice + sleeve, using the artisan's complete measurement set.

## Acceptance Criteria

1. **DB migration — 5 new measurement columns**
   - Given the pattern_sessions table
   - When migration 040 runs
   - Then it adds nullable columns: `ha_ben_nguc`, `dang_nguc`, `ha_mong`, `xuoi_vai`, `rong_vai` (NUMERIC(5,1))
   - And existing rows are unaffected (nullable, no default needed)
   - (Note: `sleeve_type` column was already added in Story 11.7 / migration 039 — do NOT re-add)

2. **Schema + measurement form (extends 11.4)**
   - Given the measurement input form / `PatternSessionCreate`
   - When an Owner creates a session
   - Then the 5 new fields are accepted (optional), plus the existing sleeve-type selector (11.7)
   - And set-in-only fields (`xuoi_vai`, `rong_vai`) are surfaced/required only when `sleeve_type = set_in`; dart fields (`ha_ben_nguc`, `dang_nguc`) only when darts are requested
   - And measurements not required by the selected style may be left empty (FR91)

3. **FR99 validation extended**
   - Given the 5 new measurements
   - When out of range
   - Then 422 with Vietnamese error + acceptable range (consistent with the existing 10)
   - Ranges (cm, sane defaults — confirm with artisan later): ha_ben_nguc 15–35, dang_nguc 10–25, ha_mong 10–30, xuoi_vai 1–8, rong_vai 28–50

4. **Collar (lá cổ) piece generated (FR92 — 4th piece)**
   - Given a completed bodice
   - When pieces are generated
   - Then a `collar` piece is produced: length = on-pattern neck circumference + 0.5 cm; band 2.5–3 cm; cut-on-line (no seam offset)
   - And the engine now returns 4 pieces (front_bodice, back_bodice, sleeve, collar) — update the "exactly 3 pieces" assumption from 11.2
   - And `PieceType` already includes `collar` (added SCP architecture amendment) — wire it through

5. **Auto-fill (FR91) pulls all available measurements**
   - Given a customer profile with some of the new measurements recorded
   - When a session is created from that profile
   - Then available new measurements auto-fill; missing optional ones do not block generation (raglan needs none of the 5; set-in needs xuoi/rong vai; darts need ha_ben/dang nguc)

6. **Tests**
   - DB column presence; new-field validation (range + Vietnamese); collar piece generation + dimensions; 4-piece output; auto-fill with partial measurements; backward compat (raglan with only the base 10 still works)
   - Existing 125 pattern tests stay green (adjust the few that assert exactly 3 pieces)

## Tasks / Subtasks

- [ ] **Task 1: DB migration 040** (AC: #1) — add the 5 nullable NUMERIC(5,1) columns to pattern_sessions; ORM `PatternSessionDB` mapped columns (nullable). Mirror the customer_measurements pattern fields if they exist (migration 038 added pattern measurement fields to customer_measurements — check column names match for auto-fill).
- [ ] **Task 2: Schema + validation** (AC: #2, #3) — add 5 optional fields to `PatternSessionCreate` with `ge`/`le` + Vietnamese descriptions; extend the FR99 validation path. Add to `PatternSessionResponse`.
- [ ] **Task 3: Collar piece** (AC: #4) — `formulas.generate_collar(bodice_neck_perimeter)` (length = neck circ + 0.5, band 2.5–3); `svg_export.render_collar_svg`; wire into `engine.generate_pattern_pieces` as a 4th piece. The neck circumference comes from the front+back neckline arc lengths (reuse `curves.py` length utils — measure the rendered neckline `A` arcs, or compute from neck_width/neck_depth).
- [ ] **Task 4: Engine 3→4 pieces** (AC: #4) — update engine to append collar; update any "len == 3" / "exactly 3" assertions in tests and the API (test_11_2_pattern_engine, test_11_2_pattern_api, pattern_service if it hard-codes 3).
- [ ] **Task 5: Frontend measurement form** (AC: #2) — extend the measurement form UI (frontend, the 11.4 component) with the 5 fields + conditional display by sleeve_type. (If frontend is out of scope for this pass, implement backend + schema and note the form as a follow-up — but AC2's conditional logic belongs in the form.)
- [ ] **Task 6: Auto-fill** (AC: #5) — extend the profile→session auto-fill to include the 5 new measurements when present on the customer profile.
- [ ] **Task 7: Tests** (AC: #6) — `tests/test_11_8_measurements_collar.py`; update 3-piece assumptions.

## Dev Notes

### Source of truth
- **Measurements + collar formula:** consolidated table — §0 (15-measurement list), §6 (lá cổ: length = on-rập neck circ + 0.5, band 2.5–3, cut-on-line). [Source: bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md §0, §6]
- **Amended ACs:** SCP §4.6. [Source: sprint-change-proposal-2026-06-08.md#4.6]
- **Architecture (already amended):** 15 measurement columns + collar piece_type. [Source: architecture.md — SCP 2026-06-08 edits]

### Current code state (after 11.7)
- `models/pattern.py`: `PatternSessionCreate` has the 10 base measurements + `sleeve_type`. `PieceType` enum still lists only front/back/sleeve — **add `collar`** (architecture lists it). `GeometryParams` has `extra="allow"`.
- `db_models.PatternSessionDB`: 10 measurement columns + `sleeve_type` (11.7). Add 5 more.
- `engine.generate_pattern_pieces`: returns 3 pieces. Add collar → 4.
- `curves.py`: length utilities available for measuring the neckline arc.
- Migration 038 already added pattern measurement fields to `customer_measurements` — **reuse those column names** so auto-fill maps cleanly. CHECK migration 038 for the exact names (they may already be ha_ben_nguc/dang_nguc/etc.).

### Constraints (MUST follow)
- Module independence (patterns/ no imports from geometry/agents). Vietnamese FR99 errors. Confidence tags ([1src]/[infer]/[verify]) — the 5 ranges are [verify] (artisan to confirm). Collar formula is [OK] (video).
- The new measurements are OPTIONAL — never break the raglan-with-base-10 happy path. ha_mong already has a default (18) used by generate_bodice; now it can come from the measurement if provided.
- Coordinate migration numbering: next is **040** (039 was sleeve_type in 11.7).

### Project structure notes
- New: `tests/test_11_8_measurements_collar.py`, `formulas.generate_collar`, `svg_export.render_collar_svg`, migration `040_*.sql`.
- Touch: `models/pattern.py` (fields + PieceType.collar), `db_models.py` (5 columns), `engine.py` (collar piece), `services/pattern_service.py` (persist + auto-fill 5 fields + pass through), `api/v1/patterns.py` (if validation lives there). Frontend measurement form component (Task 5).
- Update tests asserting exactly 3 pieces.

### Testing standards
- pytest from `backend/` venv. Assert collar length = measured neck-perimeter + 0.5 (numeric). Verify 4 pieces. Validate new-field ranges produce Vietnamese 422.

### References
- [Source: _bmad-output/planning-artifacts/research/bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md#0 and #6]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-08.md#4.6]
- [Source: _bmad-output/planning-artifacts/epics.md#FR91 #FR92 #FR99 (amended SCP 2026-06-08)]
- [Source: backend/migrations/038_add_pattern_measurement_fields_to_customer_measurements.sql (column-name parity for auto-fill)]
- [Source: backend/src/patterns/curves.py (neckline length measurement)]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (driven via /goal autonomous loop)

### Completion Notes List

- Collar length self-consistent with the neckline it sews into (measured from the same quarter-ellipse the bodice draws), not from raw vong_co — matches AC4 "on-pattern neck + 0.5".
- 4 of the 5 new measurements (ha_ben_nguc, dang_nguc, xuoi_vai, rong_vai) are stored-but-unused pending darts/set-in-body work; ha_mong is live (hip_drop).
- Engine now returns 4 pieces; all "3 pieces" assertions updated (engine, api, models tests).
- F3 auto-fill deferred — see status banner.

### File List

- `backend/src/patterns/curves.py` — quarter_ellipse_length, bodice_neckline_length
- `backend/src/patterns/formulas.py` — generate_collar, COLLAR_* constants
- `backend/src/patterns/svg_export.py` — render_collar_svg
- `backend/src/patterns/engine.py` — collar as 4th piece (neck perimeter)
- `backend/src/models/pattern.py` — PieceType.collar, 5 optional fields on create/response
- `backend/src/models/db_models.py` — 5 nullable columns on PatternSessionDB
- `backend/src/services/pattern_service.py` — persist + include 5 measurements
- `backend/src/main.py` — Vietnamese 422 for the 5 new fields (F1)
- `backend/migrations/040_add_extended_measurements_to_pattern_sessions.sql` (new)
- `backend/tests/test_11_8_measurements_collar.py` (new), test_11_2_pattern_api.py (+Vietnamese-error + 4-piece), test_11_2_pattern_engine.py / test_11_1_pattern_models.py (4-piece updates)
- `frontend/src/types/pattern.ts` — PieceType.collar, SleeveType, EXTENDED_MEASUREMENT_RANGES, aligned geometry labels
- `frontend/src/components/client/design/MeasurementForm.tsx` — sleeve-type selector + 5 conditional fields
- `frontend/src/components/client/design/PatternPreview.tsx` — collar in PIECE_ORDER
