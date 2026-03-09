# Story 3.3: So sánh thiết kế với Rập chuẩn (Comparison Overlay)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Khách hàng**,
I want **xem lớp phủ bóng mờ của rập chuẩn đè lên rập đang tùy chỉnh**,
so that **tôi nhận ra sự khác biệt và mức độ cá nhân hóa của thiết kế hiện tại**.

## Acceptance Criteria

1. **AC1 - Comparison Mode Toggle:** Given người dùng đã thực hiện các thay đổi về phong cách (slider alpha > 0), When người dùng bật chế độ "Comparison Mode" (toggle button), Then hệ thống hiển thị rập chuẩn (P_base) dưới dạng lớp phủ (Overlay) bóng mờ (semi-transparent) đè lên rập đang tùy chỉnh (P_current).
2. **AC2 - Visual Contrast:** Rập chuẩn phải được hiển thị dưới dạng lớp phủ bóng mờ (Opacity 40-60%) với màu sắc tương phản. Baseline overlay: Heritage Gold (#D4AF37) dạng dashed stroke (`strokeDasharray`). Current pattern: Indigo Depth (#4f46e5) solid stroke (giữ nguyên).
3. **AC3 - Delta Visualization:** Các điểm chênh lệch (Deltas) giữa rập chuẩn và rập hiện tại phải dễ dàng nhận diện bằng mắt thường thông qua sự chồng lớp hình học. Hiển thị Delta statistics (ΔG): tổng điểm thay đổi, delta trung bình (mm), delta lớn nhất (mm).
4. **AC4 - Performance:** Toggle comparison mode ON/OFF phải phản hồi < 200ms (NFR10). Overlay rendering KHÔNG được gây re-render toàn bộ React component tree — sử dụng CSS visibility/opacity toggle. Morphing vẫn đạt ~60fps khi overlay đang bật.
5. **AC5 - Interaction:** Lớp phủ rập chuẩn phải nằm dưới (z-index thấp hơn) hoặc không chặn tương tác với các thành phần điều khiển của rập chính.

## Tasks / Subtasks

- [x] Task 1: Frontend - State & Toggle UI
  - [x] 1.1 Thêm state `is_comparison_mode: boolean` vào `designStore` và type `DesignSessionState`/`DesignSessionActions` trong `types/style.ts`.
  - [x] 1.2 Tạo toggle button "So sánh" trong `AdaptiveCanvas` header area, kết nối với store state.

- [x] Task 2: Frontend - Comparison Overlay Component
  - [x] 2.1 Tạo component `ComparisonOverlay.tsx` render baseline `SvgPattern` với Heritage Gold dashed stroke, opacity 0.5, fill-none. Component nằm trong cùng `<svg>` với pattern chính.
  - [x] 2.2 Tích hợp `ComparisonOverlay` vào `AdaptiveCanvas.tsx` — render `<g>` overlay DƯỚI `<g>` pattern chính (z-order). Sử dụng CSS `visibility: hidden/visible` để toggle (KHÔNG conditional render).

- [x] Task 3: Frontend - Delta Statistics
  - [x] 3.1 Tạo utility `computeDeltaStats` trong `utils/geometry.ts`: tính `totalChangedPoints`, `avgDelta` (mm), `maxDelta` (mm) từ MorphDelta + alpha.
  - [x] 3.2 Tạo component `DeltaStatsPanel.tsx` hiển thị Delta statistics bên dưới canvas khi comparison mode bật.

- [x] Task 4: Testing
  - [x] 4.1 Unit test `computeDeltaStats`: zero delta, uniform delta, mixed delta, partial alpha.
  - [x] 4.2 Component test `ComparisonOverlay`: render overlay paths, correct Heritage Gold color, dashed stroke, opacity.
  - [x] 4.3 Integration test `AdaptiveCanvas`: toggle comparison mode ON/OFF, overlay visible/hidden, delta stats update, backward compatibility khi không có morphDelta.

## Dev Notes

### Architecture Compliance

- **Client-Side Only:** Tính năng này 100% frontend. Không cần API mới. `baseGeometry` (P_base) đã có sẵn trong `designStore.current_pattern`. `MorphDelta` đã loaded từ Story 3.2.
- **Component Reuse:** Tái sử dụng `SvgPattern` component cho overlay rendering — thay đổi chỉ là props (color, stroke style, opacity).
- **Same SVG Coordinate System:** Overlay PHẢI render trong cùng `<svg>` element với pattern chính để đảm bảo coordinate alignment tuyệt đối.
- **CSS Toggle Strategy (Critical for AC4):** Overlay `<g>` element luôn render trong DOM nhưng ẩn bằng `visibility: hidden`. Toggle chỉ flip CSS property → instant response < 200ms, không gây React re-render.
- **Morphing Independence:** `useMorphing` hook (Story 3.2) chỉ tác động lên `<path data-morph-id>` elements. Overlay paths KHÔNG có `data-morph-id` → morphing hook tự động bỏ qua chúng.
- **UX Pattern "Parameterized Truth":** Baseline overlay = visual trust reference. Delta stats = numerical trust. Cả hai kết hợp giúp khách hàng tin tưởng thiết kế.

### Technical Requirements

- **Styling:**
  - Baseline overlay: Heritage Gold `#D4AF37`, `strokeDasharray="8 4"`, `opacity={0.5}`, `fill="none"`, `strokeWidth="1.5"`.
  - Current pattern: Indigo Depth `#4f46e5` solid stroke (unchanged from Story 3.1).
  - Delta stats text: `text-sm text-gray-600` with Heritage Gold accent for delta values.
- **Z-Order:** Inside SVG: overlay `<g>` → background rect → pattern `<g>` (overlay underneath).
- **Delta Distance Formula:**
  ```
  deltaDistance(base, current) = sqrt((Δx)² + (Δy)²) where Δ = alpha * MorphDelta
  avgDelta = sum(all deltaDistances) / totalPoints
  maxDelta = max(all deltaDistances)
  totalChangedPoints = count where deltaDistance > 0.1mm
  ```

### Previous Story Intelligence (from 3.1 & 3.2)

- **SvgPattern.tsx** has `data-morph-id` on `<path>` — overlay must NOT use this attribute to avoid morphing interference.
- **useMorphing** hook queries `path[data-morph-id]` for DOM manipulation — overlay is safe as long as its paths don't have that attribute.
- **utils/geometry.ts** already has `lerpPoint`, `lerpSegments`, `applyMorphDelta` — extend with `computeDeltaStats` here.
- **AdaptiveCanvas.tsx** has `svgContainerRef` on `<svg>` — overlay `<g>` is a sibling group inside same SVG.
- **Performance baseline:** 100 segments × 60 frames < 5ms/frame confirmed in 3.2. Static overlay adds zero frame cost.
- **designStore** pattern: use `set({...}, false, "actionName")` with devtools middleware.
- **Jest config:** `roots: ['<rootDir>/src']` is set. Run `npx jest --clearCache` if Haste issues appear.

### Project Structure Notes

- **New:** `frontend/src/components/client/design/ComparisonOverlay.tsx`
- **New:** `frontend/src/components/client/design/DeltaStatsPanel.tsx`
- **New:** `frontend/src/__tests__/comparisonOverlay.test.tsx`
- **New:** `frontend/src/__tests__/deltaStats.test.ts`
- **Modified:** `frontend/src/components/client/design/AdaptiveCanvas.tsx` (overlay integration + toggle button)
- **Modified:** `frontend/src/store/designStore.ts` (add `is_comparison_mode` + `toggleComparisonMode`)
- **Modified:** `frontend/src/types/style.ts` (add to DesignSessionState + DesignSessionActions)
- **Modified:** `frontend/src/utils/geometry.ts` (add `computeDeltaStats`)

### References

- [Source: _bmad-output/planning-artifacts/epics.md - Story 3.3, Lines 335-346]
- [Source: _bmad-output/planning-artifacts/architecture.md - Geometry & Constraint Architecture, Lines 111-131]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - "Parameterized Truth" Pattern, Lines 47-50]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md - Heritage Palette, Lines 67-89]
- [Source: _bmad-output/planning-artifacts/prd.md - FR13 Comparison Overlay]
- [Source: _bmad-output/implementation-artifacts/3-2-bien-doi-rap-thoi-gian-thuc.md - Dev Agent Record & File List]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

No debug issues encountered.

### Completion Notes List

- Task 1 (1.1, 1.2): `is_comparison_mode` state and `toggleComparisonMode` action already existed in store/types from prior story prep. Toggle button "So sánh" already in AdaptiveCanvas header. Verified with existing tests (3/3 pass).
- Task 2 (2.1): Created `ComparisonOverlay.tsx` — renders baseline paths with Heritage Gold (#D4AF37) dashed stroke (8 4), opacity 0.5, fill none. No `data-morph-id` on paths for morphing isolation. Uses CSS `visibility` toggle instead of conditional rendering for AC4 performance.
- Task 2 (2.2): Integrated ComparisonOverlay into AdaptiveCanvas SVG — overlay `<g>` renders BEFORE main pattern `<g>` (z-order underneath). Replaced previous conditional rendering with always-in-DOM CSS visibility approach.
- Task 3 (3.1): Added `computeDeltaStats()` to `utils/geometry.ts` — computes totalChangedPoints (>0.1mm threshold), avgDelta, maxDelta from MorphDelta + alpha. Exported `DeltaStats` interface.
- Task 3 (3.2): Created `DeltaStatsPanel.tsx` — shows ΔG stats (changed points, avg delta mm, max delta mm) with Heritage Gold accent. Integrated below canvas, visible only in comparison mode.
- Task 4 (4.1): 7 unit tests for computeDeltaStats: zero alpha, zero deltas, uniform, mixed, partial alpha, empty parts, below-threshold.
- Task 4 (4.2): 9 component tests for ComparisonOverlay: Heritage Gold color, dashed stroke, fill none, opacity, visibility toggle, no data-morph-id, closed/curve paths.
- Task 4 (4.3): 8 integration tests for AdaptiveCanvas comparison mode: toggle button render, CSS visibility, toggle callback, delta stats panel show/hide, backward compatibility without morphDelta.
- All 193 tests pass. Zero regressions.

### Change Log

- 2026-03-05: Implemented Story 3.3 — Comparison Overlay with CSS visibility toggle, Heritage Gold dashed stroke overlay, delta statistics panel. All 4 tasks complete, 24 new tests added, 193/193 total pass.

### File List

- frontend/src/components/client/design/ComparisonOverlay.tsx (new)
- frontend/src/components/client/design/DeltaStatsPanel.tsx (new)
- frontend/src/__tests__/deltaStats.test.ts (new)
- frontend/src/__tests__/comparisonOverlayComponent.test.tsx (new)
- frontend/src/components/client/design/AdaptiveCanvas.tsx (modified)
- frontend/src/utils/geometry.ts (modified)
- frontend/src/__tests__/adaptiveCanvas.test.tsx (modified)
- _bmad-output/implementation-artifacts/sprint-status.yaml (modified)
- _bmad-output/implementation-artifacts/3-3-so-sanh-thiet-ke-voi-rap-chuan.md (modified)
