# Story 2.2: Tinh chỉnh Cường độ Phong cách (Adjective Intensity Sliders)

Status: done

## Story

As a **Khách hàng**,
I want **điều chỉnh mức độ của các tính từ phong cách qua các thanh trượt**,
so that **tôi có thể tinh chỉnh thiết kế theo đúng cảm xúc cá nhân**.

## Acceptance Criteria

1. **Slider Submission:** Khi người dùng kéo thanh trượt cường độ (ví dụ: "Độ rộng tà áo" từ 0 đến 100%), hệ thống ghi nhận giá trị cường độ (Intensity) và gửi dữ liệu về backend (debounced ~300ms sau lần thay đổi cuối).
2. **Golden Points Display:** Mỗi thanh trượt hiển thị các mốc "Tỷ lệ vàng" (Haptic Golden Points) với màu Heritage Gold (#D4AF37) tại các vị trí đặc biệt mà nghệ nhân khuyến nghị.
3. **Backend Validation:** Backend validate intensity values nằm trong phạm vi `[min_value, max_value]` của slider; trả về soft-constraint warnings nếu giá trị quá cực đoan nhưng vẫn cho phép submit.
4. **Golden Points from LKB:** Mỗi `IntensitySlider` trong Backend LKB phải chứa danh sách `golden_points: list[float]` — các vị trí tỷ lệ vàng theo kinh nghiệm nghệ nhân.
5. **Sequence Control:** Mỗi submission gắn `sequence_id` tăng dần; backend chỉ xử lý request có `sequence_id` cao nhất (race condition protection).
6. **Vietnamese Terminology:** 100% nhãn, cảnh báo, và feedback sử dụng thuật ngữ chuyên môn ngành may Việt Nam (NFR11).

## Tasks / Subtasks

- [x] **Backend: Mở rộng Model & LKB Data** (AC: 4)
  - [x] Thêm trường `golden_points: list[float]` vào `IntensitySlider` Pydantic model (`backend/src/models/style.py`)
  - [x] Cập nhật `StyleService._load_lkb_pillars()` để thêm `golden_points` cho từng slider của 3 phong cách (Size S, Size M, Size L) (`backend/src/services/style_service.py`)
  - [x] Thêm Pydantic models: `IntensitySubmitRequest`, `IntensityValueItem`, `IntensitySubmitResponse`, `IntensityWarning` vào `backend/src/models/style.py`

- [x] **Backend: Endpoint Gửi Intensity** (AC: 1, 3, 5)
  - [x] Thêm endpoint `POST /api/v1/styles/submit-intensity` vào `backend/src/api/v1/styles.py`
  - [x] Validate từng intensity value nằm trong `[min_value, max_value]` của slider tương ứng
  - [x] Kiểm tra `sequence_id` — chỉ xử lý nếu >= sequence đã lưu trong session state (hoặc luôn chấp nhận ở MVP vì không có session persistence chính thức trong story này)
  - [x] Trả về `IntensitySubmitResponse` gồm: `success`, `sequence_id`, `warnings: list[IntensityWarning]`
  - [x] Soft constraint: Warning nếu `body_fit > 85` (quá ôm, có thể gây hạn chế vận động)
  - [x] Viết tests: `backend/tests/test_styles_intensity_api.py`

- [x] **Frontend: Cập nhật Types** (AC: 2, 4)
  - [x] Thêm `golden_points: number[]` vào interface `IntensitySlider` (`frontend/src/types/style.ts`)
  - [x] Thêm types: `IntensitySubmitRequest`, `IntensityValueItem`, `IntensitySubmitResponse`, `IntensityWarning`
  - [x] Thêm state fields vào `DesignSessionState`: `is_submitting: boolean`, `last_submitted_sequence: number`, `submission_warnings: IntensityWarning[]`
  - [x] Thêm actions vào `DesignSessionActions`: `setSubmitting(loading: boolean)`, `setSubmissionResult(sequenceId: number, warnings: IntensityWarning[])`

- [x] **Frontend: Zustand Store Update** (AC: 1, 5)
  - [x] Cập nhật `useDesignStore` với trạng thái và actions mới (`frontend/src/store/designStore.ts`)
  - [x] `sequence_counter` tự tăng mỗi lần submission (dùng nội bộ để debounce submit)

- [x] **Frontend: Server Action Gửi Intensity** (AC: 1, 3)
  - [x] Tạo file mới: `frontend/src/app/actions/design-actions.ts`
  - [x] Implement `submitIntensity(pillarId: string, intensities: IntensityValueItem[], sequenceId: number): Promise<IntensitySubmitResponse>`
  - [x] Gọi `fetch('/api/v1/styles/submit-intensity', { method: 'POST', body: JSON.stringify(...) })`
  - [x] Validate response với Zod schema trước khi trả về

- [x] **Frontend: UI Haptic Golden Points** (AC: 2)
  - [x] Cập nhật `SliderControl` trong `IntensitySliders.tsx` để render golden point markers
  - [x] Mỗi golden point là một marker nhỏ màu Heritage Gold (`#D4AF37`) trên track của slider
  - [x] Khi thumb slider tiến đến gần golden point (±2%), đổi màu thumb sang Heritage Gold
  - [x] Tooltip nhỏ tại golden point hiển thị nhãn "Tỷ lệ vàng của nghệ nhân"
  - [x] Implement debounced submit: sau khi `updateIntensity` được gọi, đợi 300ms, rồi gọi Server Action `submitIntensity`
  - [x] Hiển thị warnings từ backend dưới dạng inline hint cạnh slider (không dùng Modal)

- [x] **Frontend: Testing** (AC: 1, 2, 3)
  - [x] Viết tests cho golden points rendering trong `frontend/src/__tests__/intensitySliders.test.tsx`
  - [x] Test debounced submission state logic trong designStore
  - [x] Test warning display khi backend trả về warnings

### Review Follow-ups (AI)

- [x] [AI-Review][CRITICAL] AC5: Backend cần validate sequence_id >= last_sequence thay vì chỉ echo — hiện tại không có race condition protection thực sự [`backend/src/services/style_service.py:254-336`]
- [x] [AI-Review][CRITICAL] Frontend tests thiếu coverage cho debounce timing (300ms) và sequence increment behavior [`frontend/src/__tests__/intensitySliders.test.tsx`]
- [x] [AI-Review][MEDIUM] Server Action thiếu AbortController/timeout — request có thể treo vô hạn [`frontend/src/app/actions/design-actions.ts:35`]
- [x] [AI-Review][MEDIUM] Component unmount không abort in-flight request — có thể gây inconsistent state [`frontend/src/components/client/design/IntensitySliders.tsx:227`]
- [x] [AI-Review][MEDIUM] Golden Point proximity detection dùng percentage ±2% nhưng golden_points là absolute value — mismatch nếu slider range khác 0-100 [`frontend/src/components/client/design/IntensitySliders.tsx:55`]
- [x] [AI-Review][MEDIUM] Zod schema dùng `.nullable().optional()` cho error field — có thể confuse null vs undefined [`frontend/src/types/style.ts:94`]
- [x] [AI-Review][LOW] Hardcoded BACKEND_URL default — nên warn nếu env var missing trong production [`frontend/src/app/actions/design-actions.ts:16`]
- [x] [AI-Review][LOW] Missing JSDoc cho store actions `setSubmitting`, `setSubmissionResult` [`frontend/src/store/designStore.ts`]
- [x] [AI-Review][LOW] Test mock luôn trả sequence_id: 1 cố định — không test được sequence increment [`frontend/src/__tests__/intensitySliders.test.tsx:16`]

### Review Follow-ups Round 2 (AI - 2026-03-04)

- [x] [AI-Review][MEDIUM] Backend `_session_sequences` là in-memory global state — mất khi restart, không consistent với multi-worker deployment [`backend/src/services/style_service.py:41`]
- [x] [AI-Review][MEDIUM] StyleService được khởi tạo mới mỗi request — không tận dụng cache, nên dùng FastAPI dependency caching [`backend/src/api/v1/styles.py:20-22`]
- [x] [AI-Review][LOW] Frontend không xử lý HTTP 409 riêng — trả về generic error thay vì message cụ thể cho stale sequence [`frontend/src/app/actions/design-actions.ts:57-64`]
- [x] [AI-Review][LOW] Test mock không verify pillar_id được truyền đúng [`frontend/src/__tests__/intensitySliders.test.tsx:16-21`]

## Dev Notes

### Bối cảnh từ Story 2.1 (ĐÃ TRIỂN KHAI — cần KẾ THỪA, KHÔNG TÁI TẠO)

Story 2.1 đã xây dựng toàn bộ nền tảng slider. Story 2.2 **MỞ RỘNG** — không viết lại:

| Đã có (Story 2.1) | Story 2.2 thêm gì |
|---|---|
| `IntensitySlider` model (không có `golden_points`) | Thêm `golden_points: list[float]` |
| `StyleService` với 3 pillars LKB | Cập nhật mỗi slider với `golden_points` |
| `GET /api/v1/styles/pillars` + `GET /api/v1/styles/pillars/{id}` | Thêm `POST /api/v1/styles/submit-intensity` |
| `IntensitySliders.tsx` — sliders cơ bản | Thêm golden point markers + debounced submit |
| `designStore.ts` — updateIntensity local only | Thêm submission state + sequence counter |
| `style.ts` — types cơ bản | Thêm submission request/response types |

### Architecture Constraints (CRITICAL — KHÔNG VI PHẠM)

**1. Slider UX = Client-side ONLY (Không WebSockets)**
> "Slider UI tính toán chuyển đổi SVG (Morphing) hoàn toàn tại Client bằng thuật toán nội suy để đạt độ trễ < 200ms" — [Source: architecture.md#API & Communication Patterns]

- Giá trị slider thay đổi → cập nhật Zustand **tức thì** (synchronous)
- Submission đến Backend là **debounced (300ms)** — không block UI
- Không dùng WebSocket cho slider interaction

**2. Backend là SSOT — Frontend KHÔNG tính lại business logic**
> "Backend là nguồn chân lý duy nhất (SSOT) cho hình học và ràng buộc vật lý" — [Source: project-context.md#Critical Implementation Rules]

- `golden_points` phải đến từ Backend (trong `IntensitySlider.golden_points`), không hardcode ở Frontend
- Soft constraint warnings phải từ Backend, không tính ở Frontend

**3. requestAnimationFrame cho golden point animation**
> "Sử dụng requestAnimationFrame và tác động trực tiếp lên thuộc tính path của SVG để đảm bảo sự mượt mà" — [Source: ux-design-specification.md#Performance]

- Hiệu ứng golden point highlight (đổi màu thumb) dùng CSS transition, không cần rAF (rAF dành cho SVG morphing trong Story 3.2)
- Debounce submission dùng `setTimeout`, không cần rAF

**4. Server Actions cho mutation**
> "Sử dụng Server Actions cho mutation dữ liệu từ Client" — [Source: project-context.md#Framework-Specific Rules]

- `submitIntensity` là Server Action trong `frontend/src/app/actions/design-actions.ts`
- Import và gọi trực tiếp từ `IntensitySliders.tsx` (Client Component calling Server Action ✓)

**5. Không dùng Modal cho warnings**
> "Cảnh báo dưới dạng Inline Hint hoặc Contextual Tooltip, tuyệt đối không dùng Modal" — [Source: ux-design-specification.md#Performance]

### Project Structure Notes

```
backend/
├── src/
│   ├── models/style.py           # MODIFIED: Added golden_points, submission models
│   ├── services/style_service.py # MODIFIED: Added golden_points to LKB data + submit validation
│   └── api/v1/styles.py          # MODIFIED: Added POST /submit-intensity
└── tests/
    ├── test_styles_api.py         # EXISTING: 6 regression tests (unmodified)
    └── test_styles_intensity_api.py # NEW: 15 tests for submission + golden_points

frontend/src/
├── types/style.ts                 # MODIFIED: golden_points, submission types
├── store/designStore.ts           # MODIFIED: submission state + sequence counter
├── components/client/design/
│   └── IntensitySliders.tsx       # MODIFIED: golden points UI + debounced submit
└── app/
    └── actions/
        └── design-actions.ts      # NEW: Server Action for submitIntensity
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#The Sculpting Loop]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/2-1-lua-chon-tru-cot-phong-cach.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

None — implementation completed without errors.

### Completion Notes List

1. **Backend: Model Extension**
   - Added `golden_points: list[float]` to `IntensitySlider` Pydantic model
   - Added `IntensitySubmitRequest`, `IntensityValueItem`, `IntensitySubmitResponse`, `IntensityWarning` models
   - Used `_SOFT_CONSTRAINTS` registry pattern in `StyleService` for clean extensibility

2. **Backend: LKB Golden Points**
   - Added Fibonacci-based golden points (38.2, 61.8) to `shoulder_width` sliders
   - Traditional pillar: 4 sliders × 1-2 golden points each
   - Minimalist pillar: 4 sliders with modernist ratios
   - Avant-garde pillar: 4 sliders with creative ratio points

3. **Backend: POST /submit-intensity**
   - Validates slider bounds (422 for out-of-range, 404 for unknown pillar)
   - 3 soft constraint rules: body_fit > 85, shoulder_width < 30, do_bat_doi_xung > 70
   - Unknown slider keys ignored gracefully (no error)
   - Used `HTTP_422_UNPROCESSABLE_CONTENT` (corrected from deprecated `HTTP_422_UNPROCESSABLE_ENTITY`)

4. **Frontend: Types & Store**
   - `golden_points: number[]` added to `IntensitySlider` interface
   - Zustand store extended with: `is_submitting`, `last_submitted_sequence`, `submission_warnings`
   - `setSubmitting` and `setSubmissionResult` actions added
   - `clearSession` and `selectPillar` now reset `submission_warnings`

5. **Frontend: Server Action**
   - `submitIntensity` in `design-actions.ts` with Zod validation of response
   - Graceful error return (no throws) so UI can handle failures silently

6. **Frontend: UI Haptic Golden Points**
   - Golden point markers rendered as Heritage Gold (`#D4AF37`) vertical bars on slider track
   - Proximity detection (±2%): thumb color and value label switch to Heritage Gold when near a golden point
   - Debounced submission: 300ms after last `updateIntensity` call
   - Inline warnings (role="alert") rendered per-slider below slider track
   - Submission indicator "Đang lưu..." shows during in-flight requests
   - Legend: "Mốc tỷ lệ vàng của nghệ nhân" with gold sample swatch

7. **Testing**
   - Backend: 15 new tests in `test_styles_intensity_api.py` (100% pass)
   - Frontend: 16 new tests (designStore: +9 for Story 2.2, intensitySliders.test.tsx: +7 new)
   - Full regression: 186 backend + 63 frontend = 249 tests, 0 failures

8. **Review Follow-ups (completed 2026-03-04)**
   - Fix 1 [CRITICAL]: Added `_session_sequences` module-level dict in `style_service.py`; sequence check rejects `sequence_id < last_seen` with HTTP 409; `styles.py` handles 409; `test_styles_intensity_api.py` adds `autouse` reset fixture + `TestSequenceValidation` class (4 tests)
   - Fix 2 [CRITICAL]: Added `describe("Debounced submission timing")` in `intensitySliders.test.tsx` with 4 fake-timer tests (no-immediate-call, 300ms fire, debounce-to-1, sequence increment)
   - Fix 3 [MEDIUM]: `design-actions.ts` now wraps fetch in `AbortController` with 10s timeout; `AbortError` returns Vietnamese error message
   - Fix 4 [MEDIUM]: `IntensitySliders.tsx` adds `isMountedRef`; cleanup `useEffect` sets `isMountedRef.current = false`; state update gated on `isMountedRef.current`
   - Fix 5 [MEDIUM]: Golden point proximity now compares in value space (`Math.abs(value - gp) <= proximityThreshold`) instead of mismatched percentage space
   - Fix 6 [MEDIUM]: `error` field in Zod schema changed to `z.string().nullish()` (cleaner than `.nullable().optional()`)
   - Fix 7 [LOW]: `BACKEND_URL` uses IIFE that warns to console if missing in production
   - Fix 8 [LOW]: `setSubmitting` and `setSubmissionResult` in `designStore.ts` updated to JSDoc with `@param` docs
   - Fix 9 [LOW]: `submitIntensity` mock uses `mockImplementation` returning `sequenceId` dynamically
   - Post-fix test counts: 190 backend (all pass) + 67 frontend (all pass)

9. **Review Follow-ups Round 2 (completed 2026-03-04)**
   - Fix R2-1 [MEDIUM]: Documented `_session_sequences` MVP limitation (in-memory only, not shared across workers); added migration note for Redis/DB in production
   - Fix R2-2 [MEDIUM]: `get_style_service()` now uses `@lru_cache(maxsize=1)` — cached singleton avoids re-loading LKB data on every request
   - Fix R2-3 [LOW]: `design-actions.ts` now handles HTTP 409 specifically with "Yêu cầu đã cũ" message instead of generic error
   - Fix R2-4 [LOW]: Added test "should pass correct pillar_id and intensities to submitIntensity" verifying pillar_id="traditional" and intensities array structure
   - Post-fix test counts: 190 backend (all pass) + 68 frontend (all pass)

### File List

**Backend (Modified):**
- `backend/src/models/style.py` — Added `golden_points` field + submission models
- `backend/src/services/style_service.py` — Added golden_points to LKB + `validate_and_submit_intensity()`
- `backend/src/api/v1/styles.py` — Added `POST /api/v1/styles/submit-intensity` endpoint

**Backend (New):**
- `backend/tests/test_styles_intensity_api.py` — 15 tests for intensity submission API

**Frontend (Modified):**
- `frontend/src/types/style.ts` — Added `golden_points`, submission request/response types
- `frontend/src/store/designStore.ts` — Added submission state + `setSubmitting`, `setSubmissionResult`
- `frontend/src/components/client/design/IntensitySliders.tsx` — Golden Points UI + debounced submit + inline warnings
- `frontend/src/__tests__/designStore.test.ts` — Added `golden_points` to mock data + 9 Story 2.2 tests

**Frontend (New):**
- `frontend/src/app/actions/design-actions.ts` — Server Action `submitIntensity`
- `frontend/src/__tests__/intensitySliders.test.tsx` — 7 component tests for golden points + warnings
