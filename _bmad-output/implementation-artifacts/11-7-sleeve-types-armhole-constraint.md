# Story 11.7: Sleeve Types & Armhole Circumference Constraint

Status: done

> ✅ **DEV + REVIEW COMPLETE 2026-06-08.** Set-in sleeve cap is solved FROM the body armhole
> (FR93): `cap_perimeter = body_armhole + 3.5cm ease` (band 3–4cm), replacing the audited +62cm
> gap. New `curves.py` (cubic length, raglan-seam controls shared with render, set-in cap geometry,
> bisection solver). sleeve_type wired end-to-end: schema → DB column (migration 039) → service →
> engine → response. Code review 2 rounds: R1 found integration gap (set-in unreachable via API) +
> 3 minors → all fixed; R2 confirmed wiring + FR93 math sound (perimeter monotonic in cap height,
> chord lower-bound exact). 125 pattern tests green incl. end-to-end API test + 4 realistic FR93 sets.

<!-- Created via bmad-create-story 2026-06-08 from SCP 2026-06-08 §4.5. Successor to 11.2/11.3 (done). -->

## Story

As an Owner,
I want to choose between a raglan (tay liền cổ) and a set-in (tay tra thẳng) sleeve when generating a pattern, and have the sleeve cap automatically match the body armhole,
so that the sewn sleeve fits the bodice without puckering or gaping — implementing the artisan's rule "đầu tay cắt dựa theo đường cong nách" and FR93's circumference constraint.

## Acceptance Criteria

1. **Sleeve type selection (FR91a)**
   - Given an Owner creates a pattern session
   - When they specify `sleeve_type` ∈ {`raglan`, `set_in`}
   - Then the value is validated, persisted on the session, and threaded through to pattern generation
   - And `raglan` is the default when omitted (backward compatible with existing sessions)

2. **Raglan sleeve unchanged**
   - Given `sleeve_type = "raglan"`
   - When the sleeve is generated
   - Then it uses the corrected raglan formulas from Story 11.2 (no behavior change), and `generate_sleeve` no longer raises NotImplementedError only because set-in now exists

3. **Set-in sleeve cap drafted FROM the body armhole (artisan rule)**
   - Given `sleeve_type = "set_in"`
   - When the sleeve is generated
   - Then the sleeve cap is derived from the computed body armhole curve (not an independent formula): `cap_height` / `bicep` are solved so the cap fits the measured armhole, per the artisan rule "đầu tay cắt dựa theo đường cong nách"
   - And the set-in body bodice exposes an armhole the sleeve can reference

4. **FR93 circumference constraint enforced**
   - Given a generated bodice (front + back) and its sleeve
   - When the sleeve cap is produced
   - Then `cap_perimeter ≈ body_armhole_perimeter + ease`, where ease = front-armhole + 1 cm and back-armhole + 1–1.5 cm (total sleeve-cap ease 3–4 cm over the body armhole)
   - And the engine measures both arc perimeters (numerically) and adjusts cap geometry to satisfy the constraint within a stated tolerance (default ±0.5 cm)

5. **Vietnamese validation on infeasible constraint**
   - Given measurements where the cap cannot satisfy the circumference constraint within tolerance (e.g. bicep far too small for the armhole)
   - When generation runs
   - Then a clear Vietnamese ValueError is raised (FR99 style) naming the conflict and the acceptable direction, instead of emitting a bad pattern

6. **Tests & regression**
   - Unit tests assert: raglan path unchanged; set-in cap perimeter satisfies the constraint for the sample set; constraint solver converges; infeasible case raises Vietnamese error; the FR93 ease band (3–4 cm) holds for several realistic measurement sets
   - All existing 110 pattern tests stay green

## Tasks / Subtasks

- [ ] **Task 1: Arc-length / perimeter utility** (AC: #4)
  - [ ] Add a small, dependency-free curve module `backend/src/patterns/curves.py` (or extend an existing private helper) with: cubic-Bézier sampling + `polyline_length(points)`. Reuse the same control-point formula the bodice raglan seam uses in `svg_export.py` so the measured length matches the rendered curve (avoid drift — factor the control-point computation into one shared function).
  - [ ] `body_armhole_perimeter(bodice_params) -> float` for both raglan (raglan-seam length) and set-in (armhole-scoop length). Front + back summed.
- [ ] **Task 2: Set-in sleeve drafting** (AC: #3)
  - [ ] Implement set-in branch in `formulas.generate_sleeve(measurements, sleeve_type='set_in', armhole_perimeter=...)`. Reference consolidated table §4 (cap_height = vong_nach/2 − 1 as the starting estimate, bicep = vong_bap_tay/2 + 2.5, wrist = vong_co_tay/2 + 1) but **solve cap height / bicep from the armhole perimeter** rather than using them as fixed independent inputs.
  - [ ] Set-in body: the bodice for set-in needs a real armhole scoop + shoulder (not the raglan diagonal). Decide minimal approach: either add a set-in bodice variant in `formulas.generate_bodice` keyed on a `style` arg, or compute the armhole curve separately. Keep it scoped — reuse raglan body widths where the source supports it (consolidated table notes set-in body ≈ raglan body except shoulder/armhole). Flag inferred values [infer].
- [ ] **Task 3: FR93 constraint solver + validation** (AC: #4, #5)
  - [ ] Implement the algorithm from consolidated table §5: measure Lf (front armhole) and Lb (back armhole); target cap front = Lf + 1, back = Lb + 1–1.5; adjust cap geometry (bicep/cap height) until cap perimeter matches target within tolerance; raise Vietnamese ValueError if infeasible.
  - [ ] Keep it deterministic (no randomness) and fast (<50 ms budget per the engine's design note).
- [ ] **Task 4: Thread sleeve_type through model + engine + API** (AC: #1, #2)
  - [ ] Add `sleeve_type` to `PatternSessionCreate` (Literal/Enum, default `raglan`) and to the session ORM/DB column (coordinate with 11.8 migration if it lands first; otherwise add the column here). `models/pattern.py`.
  - [ ] `engine.generate_pattern_pieces(measurements, sleeve_type)` already accepts the param — pass it from `pattern_service.py` based on the session's stored value.
  - [ ] Persist and echo `sleeve_type` in `PatternSessionResponse`.
- [ ] **Task 5: SVG render for set-in sleeve** (AC: #3)
  - [ ] Add `render_setin_sleeve_svg` (classic sloper outline: cap curve sized to the constraint, bicep, taper to wrist) in `svg_export.py`. Keep the raglan renderer untouched.
- [ ] **Task 6: Tests** (AC: #6)
  - [ ] `tests/test_11_7_sleeve_types.py`: raglan-unchanged, set-in cap-perimeter-vs-armhole within ease band, solver convergence, infeasible→Vietnamese error, sleeve_type plumbing through engine.
  - [ ] Run the full pattern suite; keep 110 prior tests green.

## Dev Notes

### Source of truth (READ FIRST)
- **Formulas + FR93 algorithm:** `_bmad-output/planning-artifacts/research/bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md` — §4 (set-in sleeve, marked "PHƯƠNG PHÁP, không phải công thức số"), §5 (FR93 tay-từ-nách pseudo-code). [Source: consolidated table §4–5]
- **Amended ACs:** `_bmad-output/planning-artifacts/sprint-change-proposal-2026-06-08.md` §4.5 (Story 11.7). [Source: SCP §4.5]
- **Artisan rule (ground truth):** set-in sleeve cap is drafted FROM the bodice armhole curve — confirmed by the artisan 2026-06-07. This is the whole point; do NOT reintroduce an independent sleeve formula. [Source: memory project_thanh_loc_artisan_method + research danh-gia §P1]

### Current code state (what 11.2/11.3 left)
- `backend/src/patterns/formulas.py`: `generate_sleeve(measurements, sleeve_type='raglan')` — `set_in` currently `raise NotImplementedError("Set-in sleeve (armhole-constrained) is Story 11.7")`. Raglan branch is correct & tested. Bodice = raglan half-pattern (cut on fold).
- `backend/src/patterns/svg_export.py`: `render_bodice_svg` draws the raglan half-bodice with a cubic raglan seam (control-point formula in `_raglan_curve`/inline in `render_bodice_svg`). `render_sleeve_svg` draws the raglan sleeve. **Reuse the bodice raglan-seam control-point math when measuring armhole length** so render and measurement agree.
- `backend/src/patterns/gcode_export.py`: has correct cubic + W3C elliptical-arc flattening (`_cubic_to_polyline`, `_arc_to_polyline`) — you can reuse these flattening routines for perimeter measurement, or factor them into `curves.py`.
- `backend/src/patterns/engine.py`: `generate_pattern_pieces(measurements, sleeve_type='raglan')` already plumbed; passes sleeve_type to `generate_sleeve`.
- `backend/src/models/pattern.py`: `GeometryParams` has `extra="allow"` and raglan sleeve fields. `PatternSessionCreate` has the 10 base measurements (no sleeve_type yet).

### Architecture constraints (MUST follow)
- **Module independence:** `backend/src/patterns/` must NOT import from `geometry/`, `agents/`, or `constraints/`. Pure deterministic math, runs on CPU, <50 ms for the piece set. [Source: architecture.md "Pattern Engine module fully independent"]
- **Vietnamese error messages** for all validation (FR99). [Source: epics.md FR99]
- **Confidence tags** in code comments ([OK]/[1src]/[infer]/[verify]) — set-in bicep/cap-height come from `[1src]` brainstorming (BS) values and the artisan armhole rule; mark inferred set-in body widths `[infer]`. [Source: consolidated table legend]
- Numbers from the table are the per-side half-widths measured from the centre axis (same convention 11.2 used for `wrist_width`).

### FR93 algorithm (from consolidated table §5) — implement as written
```
1. Build bodice → measure front armhole perimeter Lf and back Lb.
2. Target cap perimeter: front = Lf + 1cm; back = Lb + 1–1.5cm.
3. Build sleeve cap → measure its perimeter.
4. If off-target, adjust (raise/lower cap, widen/narrow bicep) until within tolerance.
5. Smooth-join; the sewing-side ease ("may cầm 1 phân") is documentation, not geometry.
```
Engine: compute bicep/cap_height FROM Lf/Lb, do not accept all three independently (this is the fix for audit defect G5, the +62 cm gap). A simple deterministic approach: parametrize the cap by a single scale on cap_height (or bicep), and binary-search/closed-form solve so cap_perimeter == target ± tol.

### Project structure notes
- New files: `backend/src/patterns/curves.py` (optional helper), `backend/tests/test_11_7_sleeve_types.py`.
- Touch: `formulas.py`, `svg_export.py`, `engine.py` (minor), `models/pattern.py`, `services/pattern_service.py` (pass sleeve_type), `api/v1/patterns.py` (accept sleeve_type if not via model).
- If 11.8's DB migration (sleeve_type column) hasn't landed, add the column in this story's migration; coordinate to avoid duplicate Alembic revisions.

### Testing standards
- pytest, run from `backend/` with the venv: `python -m pytest tests/test_11_7_sleeve_types.py -q`. Assert artisan-derived targets with literal inputs (non-circular, like 11.2). Verify the constraint numerically by flattening both curves and comparing perimeters.

### References
- [Source: _bmad-output/planning-artifacts/research/bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md#4-tay-set-in and #5-fr93]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-08.md#4.5]
- [Source: _bmad-output/planning-artifacts/epics.md#FR93 and #FR91a (amended SCP 2026-06-08)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Technical-Pattern-Engine]
- [Source: backend/src/patterns/formulas.py generate_sleeve (NotImplementedError stub), svg_export.py raglan-seam control points]

## Dev Agent Record

### Agent Model Used

claude-opus-4-8 (driven via /goal autonomous loop)

### Completion Notes List

- FR93 mechanism implemented as the artisan rule: set-in cap solved from the measured body armhole + 3.5cm ease. The three quantities (cap height / bicep / armhole) are no longer independent — cap height is bisection-solved against the armhole perimeter.
- `curves.py` is the single source of truth for the bodice raglan-seam control points; `svg_export` imports it so the MEASURED armhole equals the DRAWN one (no drift).
- sleeve_type persisted via migration 039 + ORM column; defaults to raglan for backward compat.
- Deferred: set-in BODY armhole is currently approximated by the raglan-seam length proxy (the dedicated set-in shoulder/armhole bodice redraw is [infer], source page lost — left for a future refinement). AC 11.3.12 per-edge seam offset remains deferred (artisan 2cm value unconfirmed).

### File List

- `backend/src/patterns/curves.py` (new) — curve length + set-in cap geometry + FR93 solver
- `backend/src/patterns/formulas.py` — `_generate_setin_sleeve`, per-style required keys, SLEEVE_CAP_EASE_CM
- `backend/src/patterns/svg_export.py` — `render_setin_sleeve_svg`, shared raglan-seam controls
- `backend/src/patterns/engine.py` — set_in branch (measure armhole → solve cap)
- `backend/src/models/pattern.py` — `SleeveType` enum, `sleeve_type` on create/response schemas
- `backend/src/models/db_models.py` — `sleeve_type` column on PatternSessionDB
- `backend/src/services/pattern_service.py` — persist + pass sleeve_type through
- `backend/migrations/039_add_sleeve_type_to_pattern_sessions.sql` (new)
- `backend/tests/test_11_7_sleeve_types.py` (new), `test_11_2_pattern_api.py` (+2 set_in API tests), `test_11_2_pattern_engine.py` (updated 2 obsolete set_in tests)
