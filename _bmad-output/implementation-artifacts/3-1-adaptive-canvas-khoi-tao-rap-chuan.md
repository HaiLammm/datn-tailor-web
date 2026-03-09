# Story 3.1: Adaptive Canvas & Khởi tạo Rập chuẩn (Baseline Rendering)

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Khách hàng hoặc Thợ may**,
I want **thấy bản vẽ rập chuẩn (Baseline) hiển thị trên màn hình thiết kế**,
so that **tôi có một điểm tựa trực quan trước khi bắt đầu chỉnh sửa**.

## Acceptance Criteria

1. **AC1 - Canvas Initialization:** Given người dùng bắt đầu một phiên thiết kế (Design Session), When giao diện Adaptive Canvas được tải, Then hệ thống hiển thị bản vẽ Rập chuẩn (Baseline Pattern) dưới dạng SVG nằm chính giữa và được tỷ lệ hóa (scaled) phù hợp với viewport.
2. **AC2 - Measurement Integration:** Given số đo cơ bản của khách hàng (Cổ, Ngực, Eo, Mông...) đã được nạp, When rập chuẩn được sinh ra, Then các điểm nút (nodes) của rập phải phản ánh chính xác các thông số này với sai số tuyệt đối $\Delta G \le 1mm$ (NFR3).
3. **AC3 - Visual Standards:** Bản vẽ phải tuân thủ hệ màu Heritage Palette: Nét vẽ (Stroke) màu Indigo Depth, Nền rập (Fill) trong suốt hoặc Silk Ivory nhạt, Nền Canvas màu Heritage Gold (hoặc texture giấy dó).
4. **AC4 - Performance:** Thời gian từ lúc nhận dữ liệu đến khi hiển thị bản vẽ (First Paint) phải < 200ms để đảm bảo trải nghiệm mượt mà (NFR10).
5. **AC5 - Component Architecture:** Adaptive Canvas phải là một Client Component (`use client`) để hỗ trợ tương tác sau này, nhưng dữ liệu hình học ban đầu (Initial Geometry) phải được fetch từ Server (SSR/Server Action) để đảm bảo SSOT.

## Tasks / Subtasks

- [x] Task 1: Backend - Geometry Engine Foundation (Python)
  - [x] 1.1 Tạo module `backend/src/geometry/` và class `GeometryEngine`.
  - [x] 1.2 Định nghĩa Pydantic Models cho `Point`, `Segment` (Curve/Line), `Path`, và `PatternPart` trong `backend/src/models/geometry.py`.
  - [x] 1.3 Cài đặt logic tính toán tọa độ cơ bản ($P_{base}$) từ số đo khách hàng trong `BasePatternService`.
  - [x] 1.4 Tạo endpoint `POST /api/v1/geometry/baseline` nhận `MeasurementProfile` và trả về `MasterGeometryJSON`.
- [x] Task 2: Frontend - Canvas & SVG Rendering (Next.js/React)
  - [x] 2.1 Tạo `frontend/src/components/client/design/AdaptiveCanvas.tsx` (Client Component).
  - [x] 2.2 Tạo `frontend/src/components/client/design/SvgPattern.tsx` để render các `path` từ dữ liệu JSON.
  - [x] 2.3 Cấu hình Tailwind cho Heritage Palette (`bg-paper-texture`, `stroke-indigo-600`, etc.).
  - [x] 2.4 Implement `useAutoFit` hook để tự động zoom/pan rập vào giữa màn hình.
- [x] Task 3: Integration & Data Flow
  - [x] 3.1 Tạo `frontend/src/app/actions/geometry-actions.ts` để gọi API backend.
  - [x] 3.2 Tích hợp Canvas vào `frontend/src/app/(customer)/design-session/page.tsx`.
  - [x] 3.3 Đảm bảo luồng dữ liệu: Server Page -> Fetch Measurements -> Fetch Baseline Geometry -> Pass to Client Canvas.
- [x] Task 4: Testing & Validation
  - [x] 4.1 Backend Test: Unit test kiểm tra độ chính xác tọa độ ($|Calculated - Expected| \le 1mm$).
  - [x] 4.2 Frontend Test: Component test đảm bảo SVG render đúng số lượng path và attributes.

## Dev Notes

### Architecture Compliance

- **SSOT Principle:** Backend là nguồn chân lý duy nhất về hình học. Frontend KHÔNG được tự tính toán tọa độ rập từ số đo. Frontend chỉ render tọa độ nhận được từ Backend.
- **Geometry Logic:** Sử dụng công thức $P_{final} = P_{base}$ (cho story này, $\alpha = 0$).
- **Data Structure:** Output phải tuân thủ schema `Master Geometry JSON` (được định nghĩa trong Architecture).
- **Libraries:** Sử dụng thư viện chuẩn Python hoặc `numpy` cho tính toán nếu cần (nhưng logic rập cơ bản thường là đại số tuyến tính đơn giản). Frontend dùng SVG thuần hoặc `framer-motion` cho các transition sau này (chuẩn bị sẵn).

### Technical Requirements

- **Backend:** FastAPI, Pydantic v2.
- **Frontend:** Next.js 16, React 19, Tailwind CSS.
- **Visuals:**
  - **Indigo Depth:** `#4f46e5` (Tailwind `indigo-600`) - dùng cho nét chính.
  - **Heritage Gold:** `#D4AF37` (hoặc `amber-50` cho nền nhẹ).
  - **Silk Ivory:** `#FDFCF5` (hoặc `stone-50`).
- **Performance:** Sử dụng `React.memo` cho các component SVG path để tránh re-render không cần thiết.

### Project Structure Notes

- **Backend:** `backend/src/geometry/` là nơi chứa logic lõi. `backend/src/api/v1/geometry.py` là interface.
- **Frontend:** `components/client/design/` chứa các UI components. `types/geometry.ts` phải đồng bộ với backend models.

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Story 3.1]
- [Source: _bmad-output/planning-artifacts/architecture.md - Geometry & Constraint Architecture]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Adaptive Canvas Visualization]

## Dev Agent Record

### Agent Model Used

claude-opus-4.5 (github-copilot/claude-opus-4.5)

### Debug Log References

N/A

### Completion Notes List

1. **Backend Implementation:**
   - Created `backend/src/geometry/engine.py` with `GeometryEngine` class for basic geometry operations
   - Created `backend/src/models/geometry.py` with Pydantic models: `Point`, `CurveControl`, `Segment`, `Path`, `PatternPart`, `MasterGeometry`
   - Created `backend/src/services/base_pattern_service.py` with `BasePatternService` class to generate baseline patterns from measurements
   - Created `backend/src/api/v1/geometry.py` with `POST /api/v1/geometry/baseline` endpoint
   - Registered geometry router in `backend/src/main.py`

2. **Frontend Implementation:**
   - Updated `frontend/src/types/geometry.ts` with TypeScript types matching backend models
   - Created `frontend/src/components/client/design/SvgPattern.tsx` for rendering SVG paths from geometry data
   - Created `frontend/src/hooks/useAutoFit.ts` hook for auto-calculating viewBox from geometry bounds
   - Updated `frontend/src/components/client/design/AdaptiveCanvas.tsx` to render actual baseline patterns with Heritage Palette styling
   - Created `frontend/src/app/actions/geometry-actions.ts` Server Action for fetching baseline geometry
   - Updated `frontend/src/app/(customer)/design-session/page.tsx` for server-side geometry fetching
   - Updated `frontend/src/app/(customer)/design-session/DesignSessionClient.tsx` to pass geometry to canvas

3. **Store Updates (Type Resolution):**
   - Updated `frontend/src/types/style.ts` to add `current_pattern: MasterGeometry | null` state and `setCurrentPattern` action
   - Updated `frontend/src/store/designStore.ts` to implement `current_pattern` state and `setCurrentPattern` action
   - This resolved the type mismatch between `MasterGeometrySnapshot` (Story 2.4 inference deltas) and `MasterGeometry` (Story 3.1 visual pattern)

4. **Testing:**
   - Backend: 4 tests in `test_geometry.py` and `test_geometry_api.py` - all pass
   - Frontend: 14 new tests in `adaptiveCanvas.test.tsx` covering SvgPattern, useAutoFit, and AdaptiveCanvas components - all pass
   - Full regression: 271 backend tests pass, 142 frontend tests pass

5. **Acceptance Criteria Verification:**
   - AC1: Canvas displays centered, scaled SVG pattern using `useAutoFit` hook
   - AC2: Backend calculates coordinates from measurements; tests verify ≤1mm accuracy
   - AC3: Heritage Palette applied - Indigo Depth stroke, Silk Ivory background, Heritage Gold canvas
   - AC4: Performance optimized with React.memo, SSR data fetching
   - AC5: AdaptiveCanvas is Client Component, initial data fetched via Server Action (SSOT)

### File List

**Backend - New Files:**
- backend/src/geometry/__init__.py
- backend/src/geometry/engine.py
- backend/src/models/geometry.py
- backend/src/services/base_pattern_service.py
- backend/src/api/v1/geometry.py
- backend/tests/test_geometry.py
- backend/tests/test_geometry_api.py

**Backend - Modified Files:**
- backend/src/main.py (router registration)

**Frontend - New Files:**
- frontend/src/types/geometry.ts
- frontend/src/components/client/design/SvgPattern.tsx
- frontend/src/hooks/useAutoFit.ts
- frontend/src/app/actions/geometry-actions.ts
- frontend/src/__tests__/adaptiveCanvas.test.tsx

**Frontend - Modified Files:**
- frontend/src/types/style.ts (added current_pattern state type)
- frontend/src/store/designStore.ts (added current_pattern state and setCurrentPattern action)
- frontend/src/components/client/design/AdaptiveCanvas.tsx (full implementation)
- frontend/src/app/(customer)/design-session/page.tsx (geometry fetching)
- frontend/src/app/(customer)/design-session/DesignSessionClient.tsx (geometry props and store integration)

### Change Log

- 2026-03-05: Story 3.1 implementation complete. All tasks and subtasks finished. Backend geometry engine and API created. Frontend AdaptiveCanvas renders baseline SVG patterns from backend. Full test coverage added. All 271 backend tests and 142 frontend tests pass.
