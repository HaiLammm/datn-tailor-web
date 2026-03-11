# Story 4.3: Ghi đè & Phản hồi từ Nghệ nhân (Manual Override & Feedback Loop)

Status: done

## Story

As a **Thợ may (Minh)**,
I want **ghi đè (Override) các thông số do AI đề xuất dựa trên kinh nghiệm thực tế**,
so that **quyết định cuối cùng luôn thuộc về chuyên môn con người (Human-in-the-loop)**.

## Acceptance Criteria

1. **Given** Minh đang xem Sanity Check Dashboard và phát hiện một thông số AI đề xuất chưa tối ưu
   **When** Minh nhấn vào giá trị "Đề xuất AI" trên một hàng trong bảng đối soát
   **Then** Hệ thống hiển thị inline edit mode cho phép nhập giá trị mới
   **And** Hiển thị giá trị gốc (AI suggestion) để tham chiếu
   **And** Không dùng Modal — chỉ inline edit trực tiếp trên bảng (UX spec)

2. **Given** Minh nhập giá trị ghi đè mới
   **When** Giá trị được submit
   **Then** Backend chạy Guardrail check trên giá trị mới (reuse từ Story 4.1a)
   **And** Nếu vi phạm Hard Constraint → Hiển thị lỗi inline, không cho lưu
   **And** Nếu Soft Constraint warning → Hiển thị cảnh báo nhưng cho phép tiếp tục
   **And** Nếu pass → Lưu override record vào DB

3. **Given** Override được lưu thành công
   **When** Bảng đối soát cập nhật
   **Then** Hàng bị ghi đè hiển thị giá trị mới với badge "Ghi đè" (Heritage Gold `#D4AF37`)
   **And** Giá trị gốc AI hiển thị dạng gạch ngang bên cạnh
   **And** Cột "Đề xuất AI" của hàng đó cập nhật thành giá trị override

4. **Given** Minh muốn ghi lại lý do ghi đè
   **When** Minh nhập lý do vào trường "Lý do ghi đè" (optional)
   **Then** Hệ thống lưu lý do bằng tiếng Việt (NFR11)
   **And** Override record được đánh dấu `flagged_for_learning = true` nếu có lý do
   **And** Ghi log chi tiết vào bảng `design_overrides` (NFR9)

5. **Given** Minh đã thực hiện một hoặc nhiều overrides
   **When** Minh nhấn "Khóa thiết kế" (Lock Design)
   **Then** Backend tạo Master Geometry JSON bao gồm CẢ AI deltas VÀ override deltas
   **And** Guardrail check chạy lần cuối trên toàn bộ geometry đã override
   **And** Override history được lưu trữ để truy xuất sau

6. **Given** Minh hoặc Cô Lan muốn xem lịch sử ghi đè
   **When** Truy cập override history cho một design
   **Then** Hiển thị danh sách các override: thông số, giá trị gốc, giá trị mới, lý do, thợ may, thời gian

## Tasks / Subtasks

- [x] **Task 1: Backend — Override Data Models** (AC: #3, #4, #6)
  - [x] 1.1 Create `DesignOverrideDB` model in `backend/src/models/db_models.py`
  - [x] 1.2 Create Pydantic request/response models in `backend/src/models/override.py`
  - [x] 1.3 Run Alembic migration to create `design_overrides` table (or add model to existing init)

- [x] **Task 2: Backend — Override API Endpoints** (AC: #1, #2, #5, #6)
  - [x] 2.1 Create `backend/src/api/v1/overrides.py` router
  - [x] 2.2 Register router in `backend/src/main.py`
  - [x] 2.3 Update `POST /api/v1/designs/lock` to include override deltas

- [x] **Task 3: Frontend — Override TypeScript Types** (AC: #1)
  - [x] 3.1 Create `frontend/src/types/override.ts`

- [x] **Task 4: Frontend — Override Server Actions** (AC: #2)
  - [x] 4.1 Create `frontend/src/app/actions/override-actions.ts`

- [x] **Task 5: Frontend — Inline Override UI in SanityCheckDashboard** (AC: #1, #2, #3, #4)
  - [x] 5.1 Add override state to `SanityCheckDashboard` component
  - [x] 5.2 Inline edit mode for "Đề xuất AI" column
  - [x] 5.3 Override badge display
  - [x] 5.4 Error handling

- [x] **Task 6: Frontend — Override Integration in DesignSessionClient** (AC: #5, #6)
  - [x] 6.1 Add override handler in `DesignSessionClient.tsx`
  - [x] 6.2 Pass override props to `SanityCheckDashboard`
  - [x] 6.3 Update Lock Design flow

- [x] **Task 7: Frontend — Override History Panel** (AC: #6)
  - [x] 7.1 Create `frontend/src/components/client/design/OverrideHistoryPanel.tsx`
  - [x] 7.2 Integrate in `DesignSessionClient.tsx` and Tailor review page
  - [x] 7.3 Fetch history on lock and override
Status: done

## Story
...
- [x] **Task 8: Tests** (AC: #1-#6)
  - [x] 8.1 `backend/tests/test_overrides_api.py` — API tests
  - [x] 8.2 `frontend/src/__tests__/overrideUI.test.tsx` — Component tests
  - [x] 8.3 `frontend/src/__tests__/overrideHistory.test.tsx` — History panel tests
  - [x] 8.4 Verify existing tests still pass

### Architecture Compliance

**Authoritative Server Pattern (CRITICAL):**
- Backend validates ALL override values against guardrails (SSOT)
- Frontend MUST NOT validate constraint logic locally
- Backend owns the override persistence and flagging logic
- Override values are applied to Master Geometry JSON only on backend

**Human-in-the-Loop Pattern (FR12):**
- Tailor's override decision is SUPREME — system must respect it after guardrail check passes
- Override data feeds into Atelier Academy for future AI learning (flagged_for_learning)
- NFR9: Every override is logged with: who, what, when, why (if provided)

**UX Pattern — Inline Edit (from ux-design-specification.md):**
- "TUYỆT ĐỐI KHÔNG dùng Modal" — all override editing happens inline
- Part of Artisan Flow Step 2b (after Sanity Check review)
- Dense information layout for technical data
- 100% thuật ngữ chuyên ngành may Việt Nam (NFR11)

### Existing Code to Reuse (DO NOT Reinvent)

1. **`backend/src/api/v1/guardrails.py` (`get_registry`):**
   Reuse constraint registry for re-validating overridden values. Call `registry.run_all(measurements, deltas)` with modified delta values.

2. **`backend/src/api/dependencies.py` (`OwnerOrTailor`):**
   Pre-built RBAC dependency for Tailor + Owner authorization. Use directly on override endpoints.

3. **`backend/src/models/guardrail.py` (`GuardrailCheckResponse`):**
   Existing response model for guardrail check results. Include in OverrideResponse.

4. **`frontend/src/app/actions/geometry-actions.ts` (`checkGuardrails` pattern):**
   Follow exact same auth token + error handling pattern for override server actions.

5. **`frontend/src/components/client/design/SanityCheckDashboard.tsx`:**
   Extend existing component with override capabilities. DO NOT create separate component.

6. **`frontend/src/store/designStore.ts`:**
   Existing state: `master_geometry`, `guardrail_status`, `guardrail_violations`, `guardrail_warnings`, `is_design_locked`. Use for context but DO NOT add new store state for overrides — manage locally in component.

7. **`backend/src/api/v1/designs.py` (`lock_design` endpoint):**
   Modify to include override logic when locking. Fetch overrides from `design_overrides` table and merge with AI deltas.

8. **`backend/src/models/db_models.py` (existing table patterns):**
   Follow same UUID PK, tenant_id FK, created_at pattern from DesignDB and MeasurementDB.

### Previous Story Intelligence

**From Story 4.2 (Sanity Check Dashboard):**
- SanityCheckDashboard component is the base UI that override builds upon
- 3-column table with `data-testid="sanity-row-{key}"` for each measurement row
- Severity styling (normal/warning/danger) with Heritage Palette colors
- Guardrail inline message display via `guardrailMessagesByKey` lookup
- `SanityCheckRow.key` maps directly to `delta_key` for overrides

**From Story 4.1b (Inline Guardrails UI):**
- Guardrail state already in store (guardrail_status, violations, warnings)
- Snap-back mechanism exists for rejected states
- Vietnamese messages in all guardrail results
- Inline warning display pattern (amber/red)

**Code Review Lessons (MUST Follow):**
- H1: Never call server actions with empty/placeholder data
- H2: Measurement field names differ between DB (English) and guardrails (Vietnamese) — always verify mapping
- H3: Import existing types from `@/types/` — never inline duplicate types
- M1: Use exact key matching for row→constraint mapping (not `includes()`)
- M2: Log auth failures, don't silently return success

### Field Name Mapping (CRITICAL)

The `delta_key` in overrides uses Vietnamese keys (same as SanityCheckRow.key):
```
vong_co, rong_vai, vong_nguc, vong_eo, vong_mong, dai_ao, dai_tay, vong_co_tay
```

These map to `MEASUREMENT_MAPPING` in `backend/src/api/v1/designs.py`:
```python
MEASUREMENT_MAPPING = {
    "neck": ("vong_co", "Vòng cổ"),
    "shoulder_width": ("rong_vai", "Rộng vai"),
    "bust": ("vong_nguc", "Vòng ngực"),
    "waist": ("vong_eo", "Vòng eo"),
    "hip": ("vong_mong", "Vòng mông"),
    "top_length": ("dai_ao", "Dài áo"),
    "sleeve_length": ("dai_tay", "Dài tay"),
    "wrist": ("vong_co_tay", "Vòng cổ tay"),
}
```

### Project Structure Notes

**Files to create:**
```
backend/src/models/override.py                                — Override Pydantic models
backend/src/api/v1/overrides.py                               — Override API endpoints
backend/migrations/007_create_design_overrides_table.sql     — Migration for overrides table
backend/tests/test_overrides_api.py                           — API tests (including guardrail & flagged tests)
frontend/src/types/override.ts                                — TypeScript override types
frontend/src/app/actions/override-actions.ts                   — Override server actions (with error handling)
frontend/src/components/client/design/OverrideHistoryPanel.tsx — Override history component
frontend/src/__tests__/overrideUI.test.tsx                     — Override UI tests
frontend/src/__tests__/overrideHistory.test.tsx                — History panel tests
frontend/src/components/providers/SessionProvider.tsx           — NextAuth session provider (required for override)
```

**Files to modify:**
```
backend/src/models/db_models.py                               — Add DesignOverrideDB model
backend/src/models/geometry.py                                 — Add measurement_deltas field to LockedDesign
backend/src/models/guardrail.py                                — Add design_id to SanityCheckResponse
backend/src/main.py                                           — Register overrides router
backend/src/api/v1/designs.py                                 — Update lock_design with overrides merge
frontend/src/types/geometry.ts                                — Add design_id to SanityCheckResponse
frontend/src/app/actions/geometry-actions.ts                  — Update lockDesign to support designId & measurementDeltas
frontend/src/app/layout.tsx                                    — Add SessionProvider wrapper
frontend/src/app/(customer)/design-session/DesignSessionClient.tsx — Add override handler & history
frontend/src/app/(workplace)/tailor/review/page.tsx            — Add override history
frontend/src/components/client/design/SanityCheckDashboard.tsx — Add inline override UI
frontend/src/components/client/design/index.ts                — Export OverrideHistoryPanel
```

**Files NOT to modify:**
- `backend/src/constraints/*` — Constraint engine complete from 4.1a
- `frontend/src/store/designStore.ts` — No new store state needed (overrides managed locally)

### Testing Standards

- Frontend: Jest + React Testing Library for component rendering tests
- Backend: pytest + TestClient for API endpoint tests
- Follow existing patterns from `sanityCheckDashboard.test.tsx` (component props), `test_sanity_check_api.py` (API tests)
- Test RBAC: Customer role should get 403 on override endpoints
- Test guardrail re-validation: override that violates hard constraint → 422
- Test `flagged_for_learning` logic: with reason → true, without reason → false

### Visual Design Reference

**Inline Override Edit Mode:**
```
┌──────────────┬──────────────┬──────────────┬──────────────────────────┐
│ Thông số     │ Số đo khách  │ Mẫu chuẩn   │ Đề xuất AI               │
├──────────────┼──────────────┼──────────────┼──────────────────────────┤
│ Vòng ngực    │ 86.0 cm      │ 88.0 cm      │ 90.0 cm  +2.0            │
│ Vòng eo      │ 68.0 cm      │ 70.0 cm      │ ┌─[69.0]─┐ Ghi đè       │
│              │              │              │ │ ~67.5~  │ #D4AF37      │
│              │              │              │ │ Lý do: __________ │     │
│              │              │              │ │ [Lưu] [Hủy]      │     │
│              │              │              │ └──────────────────┘     │
│ Rộng vai     │ 36.0 cm      │ 38.0 cm      │ 42.0 cm  +4.0 ⚠️       │
└──────────────┴──────────────┴──────────────┴──────────────────────────┘
```

**After Override Applied:**
```
│ Vòng eo      │ 68.0 cm      │ 70.0 cm      │ 69.0 cm  ~67.5~  [Ghi đè] │
```

**Colors (Heritage Palette):**
- Override badge: Heritage Gold `#D4AF37` bg, white text
- Original value (strikethrough): Gray `text-gray-400 line-through`
- Override value: Bold, default text color
- Edit mode border: Heritage Gold `border-2 border-[#D4AF37]`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authoritative Server Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#RBAC]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Artisan Flow]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Non-intrusive Guardrails]
- [Source: _bmad-output/implementation-artifacts/4-2-bang-doi-soat-ky-thuat-cho-tho-may.md (previous story)]
- [Source: _bmad-output/implementation-artifacts/4-1a-loi-kiem-tra-rang-buoc-vat-ly.md (constraint engine)]
- [Source: _bmad-output/implementation-artifacts/4-1b-hien-thi-canh-bao-ky-thuat-truc-tiep.md (guardrail UI)]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad/_memory/code-review-lessons.md]
- [Source: backend/src/api/dependencies.py#OwnerOrTailor (RBAC dependency)]
- [Source: backend/src/api/v1/designs.py#MEASUREMENT_MAPPING (field mapping)]
- [Source: backend/src/api/v1/designs.py#lock_design (lock endpoint to modify)]
- [Source: backend/src/models/db_models.py#DesignDB (table pattern)]
- [Source: frontend/src/components/client/design/SanityCheckDashboard.tsx (base UI)]
- [Source: frontend/src/app/actions/geometry-actions.ts#checkGuardrails (server action pattern)]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

---

## Senior Developer Review (AI)

**Reviewer:** Lem  
**Date:** 2026-03-09

### Issues Found & Fixed

1. **HIGH: Missing guardrail re-validation tests** - Added `TestGuardrailReValidation` class with tests for:
   - Override violating hard constraint returns 422
   - Override with soft constraint warning allows save

2. **HIGH: Missing flagged_for_learning tests** - Added `TestFlaggedForLearning` class with tests for:
   - Override WITH reason → flagged_for_learning = true
   - Override WITHOUT reason → flagged_for_learning = false
   - Override with empty reason → flagged_for_learning = false

3. **MEDIUM: Error handling incomplete** - Updated `override-actions.ts` to:
   - Throw `OverrideError` with proper error details instead of returning null
   - Include violation messages in error for inline display
   - Handle 401, 403, 404, 422 status codes with appropriate messages

4. **MEDIUM: File List incomplete** - Updated story File List to include all actual changes:
   - Added `backend/migrations/007_create_design_overrides_table.sql`
   - Added `backend/src/models/geometry.py` (measurement_deltas)
   - Added `backend/src/models/guardrail.py` (design_id)
   - Added `frontend/src/types/geometry.ts` (design_id)
   - Added `frontend/src/app/actions/geometry-actions.ts` (lockDesign updates)
   - Added `frontend/src/app/layout.tsx` (SessionProvider)
   - Added `frontend/src/components/client/design/index.ts` (exports)
   - Updated "Files NOT to modify" to remove items that were actually modified

### Outcome

All HIGH and MEDIUM issues resolved. Story ready for approval.
