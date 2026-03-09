# Story 4.1b: Hiển thị Cảnh báo Kỹ thuật Trực tiếp (Inline Guardrails UI)

Status: done

## Story

As a **Khách hàng hoặc Thợ may**,
I want **thấy các cảnh báo kỹ thuật ngay khi đang điều chỉnh thiết kế**,
so that **tôi hiểu được lý do tại sao một số tùy chỉnh bị hạn chế**.

## Acceptance Criteria

1. **Given** Người dùng đang thay đổi thiết kế trên Adaptive Canvas
   **When** Backend trả về kết quả Guardrail Check với `status: "warning"` (Soft Constraints)
   **Then** Hệ thống hiển thị các cảnh báo nhẹ dưới dạng **Inline Hint** cạnh thanh trượt liên quan (vd: "Hạ nách hơi cao, có thể gây cấn tay") (FR11)
   **And** Cảnh báo sử dụng 100% thuật ngữ chuyên ngành may Việt Nam (NFR11)

2. **Given** Người dùng điều chỉnh slider gây ra vi phạm Hard Constraint
   **When** Backend trả về `status: "rejected"` với `last_valid_sequence_id`
   **Then** Thanh trượt Sliders tự động **snap-back** về vị trí an toàn gần nhất với hiệu ứng mượt mà
   **And** Hiển thị thông báo lỗi chi tiết giải thích ràng buộc vật lý bị vi phạm

3. **Given** Guardrail check trả về `status: "rejected"`
   **When** Người dùng nhấn "Lock Design"
   **Then** Lock bị từ chối với mã 422 và hiển thị danh sách violations cụ thể
   **And** Mỗi violation hiển thị: tên ràng buộc, giá trị vi phạm, và gợi ý an toàn

4. **Given** Guardrail check trả về `status: "warning"` (Soft Constraints only)
   **When** Người dùng nhấn "Lock Design"
   **Then** Lock thành công nhưng hiển thị cảnh báo phụ kèm theo kết quả

5. **Given** Tất cả constraints pass
   **When** Không có warnings hoặc violations
   **Then** Không hiển thị gì thêm — trải nghiệm người dùng không bị gián đoạn

## Tasks / Subtasks

- [x] **Task 1: Server Action for Guardrail Check** (AC: #1, #2)
  - [x] 1.1 Create `checkGuardrails` server action in `frontend/src/app/actions/geometry-actions.ts`
    - Input: `base_measurements` (from customer profile), `deltas` (current DeltaValues), optional `sequence_id`
    - Output: Typed `GuardrailCheckResult` matching backend `GuardrailCheckResponse`
    - MUST include auth token (lesson from code review)
    - Handle 422 and parse violation details
  - [x] 1.2 Add TypeScript types for guardrail response in `frontend/src/types/geometry.ts`:
    - `ConstraintViolation { constraint_id, severity, message, violated_values, safe_suggestion }`
    - `GuardrailCheckResult { status: "passed" | "warning" | "rejected", violations, warnings, last_valid_sequence_id }`

- [x] **Task 2: Design Store — Guardrail State & Snap-back** (AC: #2, #3)
  - [x] 2.1 Add to `DesignSessionState` in `frontend/src/types/style.ts`:
    - `guardrail_status: "passed" | "warning" | "rejected" | null`
    - `guardrail_warnings: ConstraintViolation[]`
    - `guardrail_violations: ConstraintViolation[]`
    - `last_valid_sequence_id: string | null`
    - `last_valid_intensity_values: IntensityValues | null` (snapshot for snap-back)
  - [x] 2.2 Add to `DesignSessionActions` in `frontend/src/types/style.ts`:
    - `setGuardrailResult: (result: GuardrailCheckResult) => void`
    - `snapBackToSafe: () => void`
    - `clearGuardrailState: () => void`
  - [x] 2.3 Implement actions in `frontend/src/store/designStore.ts`:
    - `setGuardrailResult`: Store result, if `status === "passed"` → snapshot current `intensity_values` as `last_valid_intensity_values`
    - `snapBackToSafe`: Restore `intensity_values` from `last_valid_intensity_values`, clear violations
    - `clearGuardrailState`: Reset all guardrail state (called on pillar change, session clear)
  - [x] 2.4 Update `clearSession` to include guardrail state reset

- [x] **Task 3: Integrate Guardrail Check into Slider Submit Flow** (AC: #1, #2, #5)
  - [x] 3.1 Modify `submitIntensity` flow in `DesignSessionClient.tsx` or `design-actions.ts`:
    - After intensity submit, IF `base_measurements` available → call `checkGuardrails`
    - Store result in Zustand via `setGuardrailResult`
  - [x] 3.2 On `status: "rejected"`:
    - Auto-call `snapBackToSafe()` to revert sliders
    - Display hard violation error inline (NOT modal)
  - [x] 3.3 On `status: "warning"`:
    - Store warnings → IntensitySliders shows inline hints
  - [x] 3.4 On `status: "passed"`:
    - Clear any previous warnings/violations

- [x] **Task 4: Inline Warning Display in IntensitySliders** (AC: #1)
  - [x] 4.1 Extend `IntensitySliders.tsx` to also display `guardrail_warnings` from store:
    - Map each `ConstraintViolation` to the relevant slider by matching `constraint_id` patterns to slider keys
    - Use existing warning display pattern (Amber background #FEF3C7, dark amber text #92400E)
    - Show `safe_suggestion` as actionable hint
  - [x] 4.2 Add visual distinction between soft warnings (amber) and hard violations (red border):
    - Soft: existing amber pattern
    - Hard: Red background (#FEF2F2), red text (#991B1B), bold border

- [x] **Task 5: Hard Violation Banner in Design Session** (AC: #2, #3)
  - [x] 5.1 Create inline violation banner component in `DesignSessionClient.tsx` (NOT separate file):
    - Show when `guardrail_status === "rejected"`
    - Display all violations with Vietnamese messages
    - Include "Khôi phục" (Restore) button → calls `snapBackToSafe()`
    - Use red/error styling consistent with Heritage Palette
  - [x] 5.2 When snap-back occurs:
    - Animate slider transition (CSS `transition-all duration-300`)
    - Clear violation banner after snap-back completes
    - Allow user to continue editing

- [x] **Task 6: Lock Design Enhanced Error Display** (AC: #3, #4)
  - [x] 6.1 Modify `handleLockDesign` in `DesignSessionClient.tsx`:
    - Check `guardrail_status` before attempting lock
    - If `rejected` → show message and prevent lock (no API call needed)
    - Parse 422 response to display constraint-specific messages (already done in code review fix M3)
  - [x] 6.2 On successful lock with warnings:
    - Show warnings alongside success message
    - Differentiate "locked with warnings" vs "locked cleanly"

- [x] **Task 7: Tests** (AC: #1-#5)
  - [x] 7.1 `frontend/src/__tests__/guardrailsUI.test.ts` — Unit tests:
    - Store actions: setGuardrailResult, snapBackToSafe, clearGuardrailState
    - Snap-back restores last_valid_intensity_values
    - guardrail_status transitions
  - [x] 7.2 `frontend/src/__tests__/guardrailsIntegration.test.tsx` — Integration tests:
    - Slider change → guardrail check → warning display
    - Hard violation → auto snap-back → slider values restored
    - Lock Design blocked when violations present
  - [x] 7.3 Verify existing `lockDesign.test.ts` and `sliderIntegration.test.tsx` still pass

## Dev Notes

### Architecture Compliance

**Authoritative Server Pattern (CRITICAL):**
- Backend is the SOLE authority for constraint validation
- Frontend MUST NOT replicate any constraint logic (no threshold checks on frontend)
- Frontend only renders results from backend guardrail check
- Always use backend response to determine pass/warning/rejected status

**UX Pattern — Inline Hints (from ux-design-specification.md):**
- Cảnh báo dưới dạng **Inline Hint** hoặc **Contextual Tooltip** cạnh Slider
- **TUYỆT ĐỐI KHÔNG dùng Modal** — không phá vỡ flow sáng tạo
- Performance: < 200ms UI response (NFR10)
- 100% thuật ngữ chuyên ngành may Việt Nam (NFR11)

**Snap-back Mechanism (from architecture.md):**
- When hard constraints fail, Frontend automatically reverts sliders to last valid state
- Uses `last_valid_sequence_id` from guardrail response
- Snapshot `intensity_values` on every successful guardrail pass for instant recovery
- Smooth CSS transition for visual feedback (not jarring jump)

### Existing Code to Reuse (DO NOT Reinvent)

1. **`frontend/src/components/client/design/IntensitySliders.tsx` (lines 138-160):**
   Already displays soft constraint warnings inline with amber styling:
   ```typescript
   {warning && (
     <div role="alert" style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}>
       <svg ... /> <span>{warning.message}</span>
     </div>
   )}
   ```
   EXTEND this pattern for guardrail warnings — do NOT create a separate warning component.

2. **`frontend/src/app/actions/design-actions.ts` (`submitIntensity` lines 45-107):**
   Reference implementation for server actions with auth, timeout, error handling, and Zod validation.
   Follow this EXACT pattern for `checkGuardrails` server action.

3. **`frontend/src/store/designStore.ts`:**
   Existing pattern for state + actions. Add guardrail state alongside existing `submission_warnings`.

4. **`frontend/src/types/style.ts` (`IntensityWarning` type):**
   Existing warning type used by IntensitySliders. `ConstraintViolation` should be a superset with additional fields.

5. **`backend/src/models/guardrail.py`:**
   Backend response models — TypeScript interfaces MUST match these exactly:
   - `GuardrailCheckResponse.status` → `"passed" | "warning" | "rejected"`
   - `GuardrailCheckResponse.violations` → `ConstraintViolation[]`
   - `GuardrailCheckResponse.warnings` → `ConstraintViolation[]`
   - `GuardrailCheckResponse.last_valid_sequence_id` → `string | null`

6. **`backend/src/api/v1/guardrails.py`:**
   Endpoint: `POST /api/v1/guardrails/check`
   Accept: `GuardrailCheckRequest { base_measurements, deltas, sequence_id }`
   Return: `GuardrailCheckResponse`

### Previous Story Intelligence (Story 4.1a)

**Key Learnings from 4.1a Implementation:**
- Constraint Registry uses Phase 1 (Hard) → Phase 2 (Soft) execution order
- 4 Hard constraints: ArmholeVsBicep, NeckOpening, WaistVsHip, MinimumSeamAllowance
- 4 Soft constraints: HighBodyHug, NarrowShoulder, Asymmetry, DangerZoneProximity
- Boundary-inclusive checks (>= not >)
- All messages in Vietnamese tailoring terminology
- Lock Design endpoint already integrated with guardrail pre-check (designs.py)
- `ConstraintResult` includes: `constraint_id`, `violated_values` dict, `safe_suggestion`

**Code Review Findings Applied to 4.1a:**
- Added snap-back query (`_get_last_valid_sequence_id`) in designs.py
- Registry frozen after init (no runtime modification)
- Soft constraint migration from style_service.py preserved backward compatibility

### Code Review Lessons (MUST Follow)

**From `_bmad/_memory/code-review-lessons.md`:**
1. **Server Actions MUST include auth token** — `import { auth } from "@/auth"; const session = await auth(); Authorization: Bearer ${session?.accessToken}`
2. **TypeScript interfaces MUST match Python Pydantic models** — field-by-field verification
3. **Parse 422 responses for user-facing messages** — extract violation details from structured error body
4. **Store typed backend data in Zustand** — don't construct ad-hoc at call time
5. **No duplicate utility functions** — search existing code first

### Project Structure Notes

**Files to create:**
```
frontend/src/__tests__/guardrailsUI.test.ts         — Store action tests
frontend/src/__tests__/guardrailsIntegration.test.tsx — Integration tests
```

**Files to modify:**
```
frontend/src/types/geometry.ts                       — Add ConstraintViolation, GuardrailCheckResult types
frontend/src/types/style.ts                          — Add guardrail state fields + actions
frontend/src/store/designStore.ts                    — Add guardrail state + snapBackToSafe action
frontend/src/app/actions/geometry-actions.ts          — Add checkGuardrails server action
frontend/src/components/client/design/IntensitySliders.tsx — Extend warning display for guardrail results
frontend/src/app/(customer)/design-session/DesignSessionClient.tsx — Add violation banner, modify lock flow
```

**Files NOT to modify (backend complete from 4.1a):**
- `backend/src/api/v1/guardrails.py` — Already complete
- `backend/src/constraints/*` — Already complete
- `backend/src/models/guardrail.py` — Already complete

### Testing Standards

- Use Jest + React Testing Library for component tests
- Follow existing patterns from `lockDesign.test.ts` and `sliderIntegration.test.tsx`
- Test store actions independently (no component rendering needed for state logic)
- Test component rendering with mocked store state for UI verification
- Verify snap-back: mock guardrail rejection → verify slider values restored to last valid

### Visual Design Reference

**Warning (Soft Constraint) — Amber/Gold:**
- Background: `#FEF3C7`
- Text: `#92400E`
- Icon: Warning triangle (existing SVG in IntensitySliders)

**Error (Hard Constraint Violation) — Red:**
- Background: `#FEF2F2`
- Text: `#991B1B`
- Border: `border-red-300`
- Icon: Shield/block icon

**Snap-back Animation:**
- CSS: `transition-all duration-300 ease-in-out`
- Apply to slider value changes during snap-back

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.1b]
- [Source: _bmad-output/planning-artifacts/architecture.md#Geometry & Constraint Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Non-intrusive Guardrails]
- [Source: _bmad-output/implementation-artifacts/4-1a-loi-kiem-tra-rang-buoc-vat-ly.md (previous story)]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad/_memory/code-review-lessons.md]
- [Source: frontend/src/components/client/design/IntensitySliders.tsx#lines 138-160 (existing warning pattern)]
- [Source: frontend/src/app/actions/design-actions.ts#lines 45-107 (server action pattern)]
- [Source: backend/src/models/guardrail.py (backend response models)]
- [Source: backend/src/api/v1/guardrails.py (guardrails endpoint)]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

N/A

### Completion Notes List

- All 7 tasks implemented with full test coverage
- Task 1: `checkGuardrails` server action with auth token forwarding, calling `POST /api/v1/guardrails/check`
- Task 2: Added 5 guardrail state fields + 3 actions (`setGuardrailResult`, `snapBackToSafe`, `clearGuardrailState`) to designStore
- Task 3: Integrated guardrail check into `handleTranslate` flow with auto snap-back on rejection
- Task 4: Extended `IntensitySliders` with inline amber (soft) and red (hard) constraint display per slider
- Task 5: Hard violation banner in `DesignSessionClient` with "Khôi phục giá trị an toàn" button
- Task 6: Lock Design guard blocks lock when `guardrail_status === "rejected"`
- Task 7: 17 tests passing (8 unit + 9 integration), 0 regressions (lockDesign 7/7, sliderIntegration 3/3)
- Backend NOT modified (guardrails engine complete from Story 4.1a)
- 100% Vietnamese terminology in all user-facing messages (NFR11)
- No modals used — all warnings are inline hints (UX spec compliance)

### File List

- `frontend/src/types/geometry.ts` — Added `ConstraintViolation`, `GuardrailCheckResult` interfaces
- `frontend/src/types/style.ts` — Added guardrail state fields + actions to `DesignSessionState`/`DesignSessionActions`
- `frontend/src/store/designStore.ts` — Added guardrail state + 3 actions + clearSession update
- `frontend/src/app/actions/geometry-actions.ts` — Added `checkGuardrails` server action
- `frontend/src/components/client/design/IntensitySliders.tsx` — Extended with guardrail warning/violation display
- `frontend/src/app/(customer)/design-session/DesignSessionClient.tsx` — Added violation banner, guardrail check integration, lock guard
- `frontend/src/__tests__/guardrailsUI.test.ts` — 8 unit tests for store actions
- `frontend/src/__tests__/guardrailsIntegration.test.tsx` — 9 integration tests for UI + snap-back + lock guard

## Change Log

- 2026-03-09: Story 4.1b implemented — all 7 tasks complete with inline guardrail UI, snap-back mechanism, and lock protection
- 2026-03-09: Code Review — 3 HIGH, 3 MEDIUM, 1 LOW issues found and fixed:
  - H1: Fixed checkGuardrails called with empty data — now passes actual baseMeasurements and deltas from translation result
  - H2: Fixed measurement field name mismatch — page.tsx now maps English keys to Vietnamese keys for backend BaseMeasurements
  - H3: Replaced inline return type with GuardrailCheckResult import (DRY)
  - M1: Improved slider guardrail filter logic — bidirectional key matching instead of one-way includes()
  - M2: Added error logging on auth failure in checkGuardrails (was silently returning passed)
  - M3: Added response validation for guardrail API response (status, arrays checks)
  - L1: Deferred — checked_at field missing from frontend type (non-blocking)
