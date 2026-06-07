# Story 11.9: Ground-Truth Geometric Validation (FR92 <1mm)

Status: blocked

> 🔒 **BLOCKED-BY (external):** a recorded artisan cutting session (interview checklist group G) —
> a digitized real paper pattern (photographed/measured coordinates) for a known measurement set.
> Only Lem + the artisan (mẹ) can produce this. The test harness is scaffolded and skipped until
> the reference dataset lands at `_bmad-output/planning-artifacts/research/artisan-reference/`.

<!-- Created via bmad-create-story 2026-06-08 from SCP 2026-06-08 §4.7. Gated successor to 11.7/11.8. -->

## Story

As the Owner,
I want the pattern engine validated against my mother's real paper pattern,
so that the FR92 "<1mm geometric deviation" claim is proven against ground truth, not assumed — closing the circular-validation defect the audit found.

## Acceptance Criteria

1. **Reference dataset captured**
   - Given a recorded artisan cutting session (a real paper pattern + the measurement set used)
   - When digitized
   - Then a machine-readable reference is stored: per-piece key coordinates (cm) + the input measurements, at `_bmad-output/planning-artifacts/research/artisan-reference/`

2. **<1mm validation test suite**
   - Given the reference dataset
   - When the engine generates pieces from the same measurement set
   - Then a test asserts geometric deviation ΔG ≤ 1mm at key points (FR92/NFR6), and SVG output holds ±0.5mm at 1:1 scale (FR94)

3. **Circular tests removed**
   - The old self-referential `EXPECTED_*` constants and rx/ry-locking arc tests are already deleted (11.2). This story replaces them with the real-reference comparison.

## Tasks / Subtasks

- [ ] **Task 1 (BLOCKED on artisan session):** record + digitize a real paper pattern → `artisan-reference/{set-name}.json` (input measurements + key coordinates per piece).
- [ ] **Task 2:** implement `tests/test_11_9_ground_truth.py` — load the reference JSON, run the engine, compare key coordinates within 1mm. (Harness scaffolded now, `skip` until the JSON exists.)
- [ ] **Task 3:** if deviations > 1mm, feed back into formula/geometry refinement (may reopen 11.2/11.3) — this is the real FR92 acceptance gate.

## Dev Notes

- This is the ONLY story that can confirm FR92's <1mm claim. Until then, 11.2/11.3 tests prove the engine matches the *documented artisan formulas* (non-circular vs the consolidated table), but NOT a physical pattern. [Source: SCP §4.7, review-pattern-engine-2026-06-07.md §3]
- The reference must be a REAL paper pattern, NOT engine output (the audit found the old svg-samples were the engine's own output — circular). [Source: danh-gia-cong-thuc-ve-rap-ao-dai-2026-06-07.md §3]
- Use `curves.polyline_length` / `parse_svg_path` to compare curve lengths and key points.
- Interview/recording guidance: `_bmad-output/planning-artifacts/research/artisan-interview-checklist.md` (group G).

### References
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-08.md#4.7]
- [Source: _bmad-output/planning-artifacts/research/artisan-interview-checklist.md#G]

## Dev Agent Record

### File List

- `backend/tests/test_11_9_ground_truth.py` (scaffolded, skipped pending reference data)
