# Sprint Change Proposal — Epic 11 Pattern Engine Formula & Geometry Correction

**Date:** 2026-06-08
**Author:** Bob (Scrum Master) via `bmad-correct-course`
**Trigger story:** 11.2 Pattern Engine Core API
**Change scope:** Moderate (backlog reorganization + FR amendments)
**Mode:** Batch

---

## Section 1 — Issue Summary

An adversarial audit (2026-06-07) of Epic 11's Pattern Engine found that **the generated pattern cannot be used to cut real fabric**. Three layers of defect:

1. **Formula divergence from the artisan's own method.** Story 11.2 spec claims formulas are *"tailor-validated, from brainstorming session"*, but the coefficients do not match the artisan's source. Confirmed against the **artisan's own sewing-school notebook** (mẹ của Lem) — digitized 2026-06-08 — and cross-checked against an independent instructional video (Ngô Gia Hạnh) matching the notebook to within 0.5 cm. Divergent on 5 of 9 parameters; armhole drop off by ~14 cm.
   - Evidence: `formulas.py:62` `armhole_drop = vong_nach / 12` (→3 cm) vs notebook `vong_nach/2 ± 1` (→18–20 cm); `formulas.py:63` `neck_depth = vong_co / 16` vs notebook `vong_co/8 ± x`. Coefficients `/12`, `/16` appear in **no source** (internal or external).

2. **SVG geometry is fundamentally broken** (10 defects G1–G10): bodice length hard-coded 60 cm (ignores `do_dai_ao`/`ha_eo`); armhole arc spans 0.9 cm (should be ~9–10 cm); sleeve cap arc has rx/ry swapped and sweep reversed (curves into the sleeve body); neck width accidentally equals the 1 cm seam allowance; no neck curve, no shoulder slope; hem narrower than hip (inverted side seam).

3. **FR92 "<1mm vs reference" test is circular.** `EXPECTED_*` values are the same formulas recomputed by hand; the "artisan reference" SVG samples are the engine's own output. AC#8 has never been validated against a real artisan pattern.

**Root cause:** defect introduced at **spec authoring** (Story 11.2), then faithfully coded and frozen by a self-referential test. Not a coding error — a requirements error.

**Full evidence:** `research/danh-gia-cong-thuc-ve-rap-ao-dai-2026-06-07.md`, `implementation-artifacts/review-pattern-engine-2026-06-07.md`. **Corrected formulas (clean input for this change):** `research/bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md`.

---

## Section 2 — Impact Analysis

### Epic Impact
Epic 11 cannot deliver its core value (production-ready patterns) as built. All 6 stories are touched:

| Story | Status | Impact |
|---|---|---|
| 11.1 DB model | done | +5 measurement columns, +`sleeve_type` enum, optional collar piece |
| 11.2 Formula engine | done→**reopen** | Rewrite AC#3/#4/#5/#8 formulas |
| 11.3 SVG/G-code export | done→**reopen** | Fix geometry G1–G10; seam as per-edge offset |
| 11.4 Measurement form | done | +5 input fields, sleeve-type selector |
| 11.5 Split-pane preview | done | Render corrected geometry (neck, darts, raglan) |
| 11.6 Dual export | done | Follows corrected path; no AC change |

### Artifact Conflicts
- **FR91** "auto-fills **10** body measurements" → now ~15.
- **FR92** "from 10 measurements... deviation <1mm vs **tailor-validated reference**" — reference was circular; must use a **real artisan paper pattern**. Piece count must allow >3.
- **FR93** "armhole 1/4 ellipse + sleeve cap 1/2 ellipse matching tailor contours" — artisan method uses a **3-segment divided curve** (chia 3, cơi 1.5/0.2), not a pure ellipse, and **requires an armhole↔sleeve-cap circumference constraint** that is entirely absent (current gap: +62 cm).
- **No FR** covers sleeve-type choice (raglan vs set-in) — the shop makes both.
- **architecture.md** states "3 pattern pieces" / "10 measurement columns" — both need updating.

### Technical Impact
`backend/src/patterns/` (formulas.py, svg_export.py, gcode_export.py) rewritten; module independence from `geometry/`/`agents/` preserved. DB migration for new columns. Frontend measurement form + preview updated. Test suite rewritten against real artisan data (gated).

### Out of scope / not impacted
No rollback of other epics. AI geometry module (Epic 13/14, deferred) untouched. Cổ thuyền (boat-neck) variant deferred. Vạt con piece dimensions unknown (needs artisan interview) — backlog note, not a story yet.

---

## Section 3 — Recommended Approach

**Hybrid: Direct Adjustment + gated test story.** Chosen over rollback (code is correct per spec — only the spec is wrong; reverting gains nothing) and over MVP-cut (the feature is core, and corrected formulas are high-confidence from the notebook).

- Reopen 11.2 / 11.3 and correct their ACs in place (preserves traceability; the original AC numbers map 1:1 to the fixes).
- Add successor stories 11.7–11.9 for net-new capability (sleeve types + FR93 constraint; new measurements/data-model; gated ground-truth test).
- Split the FR92 <1mm validation into a **gated** story (11.9) blocked by the recorded artisan cutting session — code is fixed now; true-tolerance validation follows when the physical reference exists.

**Effort:** Medium-High. **Risk:** Low-Medium (formulas high-confidence ✅; a few set-in ease values are inferred 🔵 and flagged in code). **Timeline:** unblocks immediately; only 11.9's *validation* waits on the artisan session.

---

## Section 4 — Detailed Change Proposals

### 4.1 FR Amendments (epics.md)

**FR91 — OLD:** "...auto-fills **10 body measurements** from the customer's measurement record."
**FR91 — NEW:** "...auto-fills **all required body measurements** (currently 15: the base 10 plus hạ ben ngực, dang ngực, hạ mông, xuôi vai, rộng vai) from the customer's measurement record. Measurements not required by the selected sleeve type may be left empty."

**FR92 — OLD:** "...generates **3 technical pattern pieces** (front bodice, back bodice, sleeve) from 10 body measurements using deterministic formulas. Geometric deviation from **tailor-validated reference patterns** < 1mm."
**FR92 — NEW:** "...generates technical pattern pieces (front bodice, back bodice, sleeve, and optional collar) from body measurements using deterministic formulas **derived from the artisan's documented method** (Thanh Lộc sewing-school notebook). Geometric deviation from a **digitized real artisan paper pattern** (not engine output) < 1mm, validated per Story 11.9."

**FR93 — OLD:** "...generates armhole curves (1/4 ellipse arc) and sleeve cap curves (1/2 ellipse arc) matching tailor-validated contours."
**FR93 — NEW:** "...generates armhole and sleeve-cap curves using the artisan's 3-segment divided-curve construction (chia 3 đoạn, cơi điểm). **The sleeve-cap perimeter is constrained to the body armhole perimeter + 3–4 cm ease** (front = front-armhole + 1 cm; back = back-armhole + 1–1.5 cm), so cap height / bicep are derived from the armhole, not specified independently. For set-in sleeves the cap is drafted **from** the body armhole curve per the artisan rule."

**FR-NEW (FR91a, sleeve type):** "System supports two sleeve construction types per pattern session: **raglan** (tay liền cổ — sleeve drafted to the neckline) and **set-in** (tay tra thẳng — shoulder seam + armhole, cap drafted from the body armhole curve). Owner selects the type at session creation."

### 4.2 Architecture Amendments (architecture.md)

- "Pattern Engine tables: pattern_sessions (**10** measurement columns)" → "(**15** measurement columns + `sleeve_type` enum)".
- "3 pattern pieces: front bodice, back bodice, sleeve" → "3–4 pattern pieces: front bodice, back bodice, sleeve, **optional collar (lá cổ)**".
- Add note: "Sleeve drafting is **armhole-constrained** (FR93) — sleeve geometry depends on computed body armhole perimeter."

### 4.3 Story 11.2 — Reopen, correct formula ACs

**Status:** done → in-progress. Replace AC#3/#4/#5/#8. Full formulas: `bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md` §1–3.

**AC#3 — OLD:** `bust_width = vong_nguc/4`, `waist_width = vong_eo/4 + offset`, `hip_width = vong_mong/4`, `armhole_drop = vong_nach/12`, `neck_depth = vong_co/16`, `hem_width = 37`, `seam_allowance = 1` (auto-added).
**AC#3 — NEW (raglan bodice, front/back differ by more than one offset):**
- Back: `armhole_drop = vong_nach/2 + 1`; `neck_width = vong_co/8 - 1`; `back_neck_rise = 0.5`; `bust_width = vong_nguc/4 + 0.5`; `waist_width = vong_eo/4 + 3`; `hip_width = vong_mong/4 + 1`; `hem_width = vong_mong/4 + 2`; `length = do_dai_ao`; `hip_drop = ha_eo + 18`.
- Front: `length = do_dai_ao + 1 (sa vạt) + 3 (ben)`; `armhole_drop = vong_nach/2`; `neck_width = vong_co/8 + 0.5`; `neck_depth = vong_co/8 + 1.5`; `bust_width = vong_nguc/4 + 1`; `waist_width = vong_eo/4 + 4`; `hip_width = vong_mong/4 + 1`; `hem_width = vong_mong/4 + 2`.
- Seam allowance is **NOT** baked into widths — applied as a per-edge offset path (see AC-NEW in 11.3): thân/nách/tay 2 cm, lai 2–3 cm, cổ cut-on-line (0), center fold 0.
- `hem_width` is computed (≥ hip), not the fixed 37 cm constant.

**AC#4 — OLD:** "armhole curve: semi_major = armhole_drop, semi_minor = bust_width; `A semi_major semi_minor 0 0 1 end_x end_y`."
**AC#4 — NEW:** "Armhole/raglan-rã curve built as a **3-segment divided curve** between the neck-entry point and the bust-out point: divide into 3 equal segments; back cơi-in 1.5 cm + 0.2; front cơi-in 2 cm + 0.2; smooth through control points. Real arc length must be non-degenerate (≥ ~⅓ of body armhole). No pure-ellipse single-arc."

**AC#5 — OLD:** `cap_height = vong_nach/2 - 1`, `bicep_width = vong_bap_tay/2 + 2.5`, `wrist_width` from `vong_co_tay`, half-ellipse cap.
**AC#5 — NEW (raglan sleeve):** `armhole_drop_sleeve = vong_nguc/4 - 1`; bicep line 10 cm below; `bicep_width = vong_bap_tay/2`; `sleeve_armhole_width = bicep_width + 1`; `wrist_width = vong_co_tay` (split both sides of axis); front neck point `= vong_co/8`, back `= ½` of front, raised 1.5 cm. Sleeve-cap perimeter constrained per FR93 (moves to 11.7). Set-in sleeve formulas: see 11.7.

**AC#8 — OLD:** "geometric deviation < 1mm vs tailor-validated reference patterns" (validated by `test_11_2_pattern_engine.py` EXPECTED_* constants).
**AC#8 — NEW:** "Formula outputs match the documented artisan formulas exactly (unit tests assert against `bang-cong-thuc-hop-nhat...` values, with confidence tags). **<1mm geometric validation against a real artisan paper pattern is deferred to Story 11.9** (requires digitized physical reference). The circular `test_armhole_arc_uses_correct_radii` / `test_sleeve_arc_uses_correct_radii` tests are removed/replaced."

### 4.4 Story 11.3 — Reopen, correct geometry ACs

**Status:** done → in-progress. The export *plumbing* ACs (#1,#2,#3,#4,#6,#7 — endpoints, ZIP, auth, params) are unaffected. Add geometry-correctness ACs:

**AC-NEW 11.3.8 — Vertical construction from measurements:** bodice length and waist/hip lines derived from `do_dai_ao`, `ha_eo`, `hip_drop = ha_eo + 18` — **no hard-coded 60 cm** (fixes G1/G2).
**AC-NEW 11.3.9 — Real armhole arc:** drawn from shoulder point to armhole point with non-degenerate length (fixes G3).
**AC-NEW 11.3.10 — Sleeve cap direction:** correct rx/ry order and sweep so the cap bulges away from the sleeve body; drawn cap height matches the design parameter (fixes G4).
**AC-NEW 11.3.11 — Neck & shoulder:** neck width from `vong_co/8±x` (decoupled from seam allowance); neck curve drawn (not straight `L`); shoulder slope applied (set-in: `xuôi vai`; raglan: 0.5 cm rise) (fixes G6/G7/G10).
**AC-NEW 11.3.12 — Seam as offset path, per edge:** thân/nách/tay 2 cm, lai 2–3 cm, cổ cut-on-line, center fold 0 — not a uniform +x add (fixes G9).
**AC-NEW 11.3.13 — Hem ≥ hip:** flare hem from hip down when `mong/4 + 2 > 37/2` rule conflicts (fixes G8).
**AC-NEW 11.3.14 — G-code arc fidelity:** `_arc_to_polyline` honours real arc sweep (no fake quadratic bezier); kerf/offset documented.

### 4.5 Story 11.7 (NEW) — Sleeve Types & Armhole Circumference Constraint (FR93/FR91a)

As an Owner, I want to choose raglan or set-in sleeve and have the sleeve cap match the body armhole, so the sewn sleeve fits without puckering.
- AC1: `sleeve_type` ∈ {raglan, set_in} selectable at session creation; persisted.
- AC2: Raglan sleeve per corrected 11.2 AC#5.
- AC3: Set-in sleeve cap **derived from the computed body armhole perimeter** (artisan rule "đầu tay cắt theo đường cong nách"); `cap_height`/`bicep` solved from the constraint, not independent inputs.
- AC4: **FR93 circumference constraint** enforced: sleeve-cap perimeter = body-armhole perimeter + ease (front +1, back +1–1.5 cm); engine measures both arcs and adjusts.
- AC5: Validation error (Vietnamese) if constraint cannot be satisfied within tolerance.

### 4.6 Story 11.8 (NEW) — Extended Measurements, Data Model & Collar Piece (FR91/FR92)

As an Owner, I want the new artisan measurements captured and the collar generated, so patterns cover the full garment.
- AC1: DB migration adds columns: `ha_ben_nguc`, `dang_nguc`, `ha_mong`, `xuoi_vai`, `rong_vai`, `sleeve_type`.
- AC2: Measurement form (11.4 extension) adds the 5 fields + sleeve-type selector; conditional (set-in only needs xuôi/rộng vai).
- AC3: FR99 validation extended with min/max + Vietnamese messages for new fields.
- AC4: Collar (lá cổ) piece generated: length = on-pattern neck circumference + 0.5; band 2.5–3 cm; cut-on-line.
- AC5: Auto-fill (FR91) pulls all available measurements; missing optional ones don't block generation.
- *(Deferred backlog note: vạt con piece — dimensions unknown, pending artisan interview checklist 16b.)*

### 4.7 Story 11.9 (NEW, GATED) — Ground-Truth Geometric Validation (FR92/AC#8)

As the Owner, I want the engine validated against my mother's real paper pattern, so <1mm precision is proven, not assumed.
- **Blocked-by:** recorded artisan cutting session (interview checklist group G) — digitized coordinates of a real paper pattern for a known measurement set.
- AC1: Reference dataset captured (photographed/measured paper pattern + the measurement set used).
- AC2: New test suite asserts engine output vs reference coordinates, ΔG ≤ 1mm (FR92/NFR6), at 1:1 scale ±0.5mm (FR94).
- AC3: Old circular tests fully removed.

---

## Section 5 — Implementation Handoff

**Scope classification: Moderate** — backlog reorganization + FR/architecture amendments.

**sprint-status.yaml updates (epic-11 block):**
```
11-2-pattern-engine-core-api: in-progress   # reopened — formula correction (SCP 2026-06-08)
11-3-svg-gcode-export-api: in-progress       # reopened — geometry correction (SCP 2026-06-08)
11-7-sleeve-types-armhole-constraint: backlog
11-8-extended-measurements-collar: backlog
11-9-ground-truth-geometric-validation: blocked   # gated on artisan cutting session
```
(epic-11 stays `in-progress`; epic-11-retrospective remains optional, run after 11.9.)

**Routing & responsibilities:**
- **PM (John):** apply FR91/FR92/FR93 + new FR91a amendments to `epics.md`; architecture note. *(strategic — FR-level)*
- **SM (Bob):** update sprint-status.yaml; create story files 11.7/11.8/11.9 via `bmad-create-story`; amend 11.2/11.3 AC sections.
- **Dev (Amelia):** implement reopened 11.2 (formulas.py) → 11.3 (svg_export.py/gcode_export.py) → 11.7 → 11.8, each via `bmad-dev-story` then `bmad-code-review`. Use `bang-cong-thuc-hop-nhat-...md` as the formula source of truth; flag 🟡/🔵 values in code comments.
- **Owner (Lem) + Artisan (mẹ):** complete interview checklist + recorded cutting session to unblock 11.9; resolve ⚠️ items (ngang cổ /6 vs /8, seam 2 cm, vạt con dims, front/back offset direction).

**Success criteria:** engine produces a cuttable pattern using the real artisan vertical measurements; raglan + set-in supported; sleeve cap matches armhole within ease; 11.9 proves <1mm against a real reference.

**Build order:** 11.2 → 11.3 → 11.7 → 11.8 → (11.9 when unblocked).
