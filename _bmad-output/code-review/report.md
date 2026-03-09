# Code Review Report: Story 4.4

**Story:** `_bmad-output/implementation-artifacts/4-4-xuat-ban-ve-san-xuat.md`
**Reviewer Agent:** claude-opus-4.6 (adversarial code review)
**Dev Agent:** gemini-2.0-flash-thinking-exp
**Date:** 2026-03-09
**Git vs Story Discrepancies:** 0 (all 13 claimed files verified in git)
**Issues Found:** 3 High, 4 Medium, 2 Low — **ALL FIXED**

## HIGH Issues (Fixed)

### H1: Task checkboxes all unchecked despite status = "done"
- **File:** `_bmad-output/implementation-artifacts/4-4-xuat-ban-ve-san-xuat.md`
- **Problem:** All 8 task groups with subtasks marked `[ ]` while story status was `done`.
- **Fix:** Checked all task boxes `[x]` to reflect actual completion.

### H2: ExportResponse type mismatch with server action
- **File:** `frontend/src/types/geometry.ts:141-147`
- **Problem:** `ExportResponse.blob?: Blob` defined but server action returns `data?: string` (base64). Type never actually used.
- **Fix:** Changed `blob?: Blob` to `data?: string` to match the actual server action return type.

### H3: Missing redirect to Sanity Check on guardrail failure (AC3)
- **File:** `frontend/src/components/client/design/ExportBlueprintButton.tsx`
- **Problem:** AC3 requires redirect to Sanity Check Dashboard when guardrails fail. Component only showed error text.
- **Fix:** Added `scrollIntoView` to Sanity Check Dashboard on guardrail violation, added `id="sanity-check-dashboard"` to dashboard component, and added contextual guidance text.

## MEDIUM Issues (Fixed)

### M1: Missing test cases required by story
- **Files:** `backend/tests/test_export_api.py`, `backend/tests/test_export_service.py`
- **Problem:** Missing tests for: design 404, tenant isolation, coordinate precision (NFR3).
- **Fix:** Added `test_export_design_not_found`, `test_export_tenant_isolation`, and `test_svg_coordinate_precision` tests.

### M2: Unused import BASE_PATTERN_VALUES
- **File:** `backend/src/services/export_service.py:22`
- **Fix:** Removed unused import.

### M3: index.ts comment missing Story 4.4
- **File:** `frontend/src/components/client/design/index.ts:2`
- **Fix:** Updated comment to `"4.2, 4.3 & 4.4"`.

### M4: Deprecated datetime.utcnow
- **File:** `backend/src/models/export.py:22`
- **Fix:** Replaced with `datetime.now(datetime.timezone.utc)`.

## LOW Issues (Fixed)

### L1: Unnecessary from_attributes in ExportRequest
- **File:** `backend/src/models/export.py:31`
- **Fix:** Removed `model_config = ConfigDict(from_attributes=True)` from request-only model.

### L2: DXF stream output documentation
- **File:** `backend/src/services/export_service.py:297`
- **Fix:** Added clarifying comment about ezdxf.Drawing.write accepting TextIO.

## Sprint Status Updates

- Epic 3: `in-progress` -> `done` (all stories completed)
- Epic 4: `in-progress` -> `done` (all stories completed, 4.4 was the last)

## Lessons Learned (for _bmad/_memory/code-review-lessons.md)

- H1: Dev agents must check task boxes when marking story as done
- H2: TypeScript types must match actual runtime return shapes — dead types cause confusion
- H3: AC requirements like "redirect" must be implemented, not just error display
- M1: Story task lists define minimum test coverage — all listed tests must exist
