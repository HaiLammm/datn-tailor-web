# Story 2.1: Lựa chọn Trụ cột Phong cách (Style Pillars)

Status: done

## Story

As a **Khách hàng**,
I want **chọn một phong cách thiết kế định sẵn (vd: Minimalist, Traditional)**,
so that **hệ thống có thể nạp các quy tắc thẩm mỹ tương ứng**.

## Acceptance Criteria

1.  **Style Pillar Display:** Trang Design Session hiển thị danh sách các "Style Pillar" có sẵn (vd: Truyền thống, Tối giản hiện đại). (FR1)
2.  **Selection Logic:** Khi người dùng chọn một phong cách, hệ thống ghi nhận lựa chọn và cập nhật trạng thái phiên làm việc (Design Session).
3.  **UI Feedback:** Giao diện hiển thị mô tả phong cách và cập nhật các thanh trượt cường độ (Sliders) liên quan đến phong cách đó. (FR2)
4.  **Backend Integration:** Hệ thống nạp bộ quy tắc (Rules) từ Local Knowledge Base cho phong cách đã chọn.
5.  **Terminology:** Sử dụng 100% thuật ngữ chuyên môn ngành may Việt Nam cho các nhãn và mô tả. (NFR11)

## Tasks / Subtasks

- [x] **Backend: Style Definition & API**
    - [x] Định nghĩa Pydantic models cho Style Pillar (`StylePillarResponse`).
    - [x] Xây dựng `StyleService` để quản lý danh sách phong cách (Hardcoded ban đầu trong LKB).
    - [x] Tạo router `api/v1/styles.py` với endpoint `GET /pillars`.
- [x] **Frontend: Design Session UI**
    - [x] Xây dựng trang `app/(customer)/design-session/page.tsx`.
    - [x] Tạo component `StylePillarSelector.tsx` để hiển thị và chọn phong cách.
    - [x] Thiết lập Zustand store `useDesignStore` để quản lý `selectedPillar` và `intensityValues`.
- [x] **Frontend: SVG Integration Foundation**
    - [x] Chuẩn bị component `AdaptiveCanvas.tsx` để hiển thị bản vẽ SVG (Placeholder cho Story 3.1).
- [x] **Validation & Testing**
    - [x] Viết unit test cho `StyleService`.
    - [x] Kiểm tra việc cập nhật store khi chọn phong cách khác nhau.

## Dev Notes

- **Authoritative Server:** Danh sách phong cách và cấu hình Sliders (min/max/default) phải do Backend cung cấp.
- **Performance:** Sử dụng Refs và `requestAnimationFrame` cho bất kỳ logic biến đổi SVG nào trong tương lai.
- **Zustand Store:** Đảm bảo Store có thể được đồng bộ với Backend qua TanStack Query nếu cần.

### Project Structure Notes

- **Backend Logic:** `backend/src/services/style_service.py`
- **Backend API:** `backend/src/api/v1/styles.py`
- **Frontend Components:** `frontend/src/components/client/design/`
- **Frontend Store:** `frontend/src/store/designStore.ts`

### Review Follow-ups (AI - 2026-03-04)

- [x] [AI-Review][LOW] No image optimization — `<img>` used instead of Next.js `<Image>` for `pillar.image_url` [`frontend/src/components/client/design/StylePillarSelector.tsx:74`]
- [x] [AI-Review][LOW] Hardcoded BACKEND_URL fallback — should warn if env var missing in production [`frontend/src/app/(customer)/design-session/page.tsx:19`]
- [x] [AI-Review][LOW] Missing error boundary — API failures in client components could crash UI [`frontend/src/app/(customer)/design-session/DesignSessionClient.tsx`]

**Review Notes:** All 3 issues are LOW severity and acceptable technical debt for MVP. No blockers found.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.1]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (via OpenCode)

### Debug Log References

None - Implementation completed without errors.

### Completion Notes List

1. **Backend Implementation:**
   - Created `IntensitySlider` and `StylePillarResponse` Pydantic models with Vietnamese terminology
   - Implemented `StyleService` with hardcoded LKB data (3 style pillars: Truyền thống, Tối giản hiện đại, Tiên phong nghệ thuật)
   - Created `/api/v1/styles/pillars` GET endpoint returning all pillars with slider configurations
   - Created `/api/v1/styles/pillars/{id}` GET endpoint for single pillar retrieval

2. **Frontend Implementation:**
   - Created `useDesignStore` Zustand store managing:
     - `selected_pillar`: Currently selected style pillar
     - `intensity_values`: Current slider values
     - Actions: selectPillar, updateIntensity, resetToDefaults, clearSession
   - Created `StylePillarSelector` component with pillar cards showing name, description, slider count
   - Created `IntensitySliders` component with range inputs and value clamping
   - Created `AdaptiveCanvas` placeholder component for Story 3.1

3. **Design Session Page:**
   - Server Component fetches pillars from Backend API
   - Client Component renders pillar selector, sliders panel, and canvas
   - Two-column responsive layout

4. **Testing:**
   - Backend: 15 tests (9 StyleService + 6 API) - all passing
   - Frontend: 17 tests for useDesignStore - all passing
   - Full regression: 171 backend tests passing

5. **Vietnamese Terminology (NFR11):**
   - All pillar names and descriptions in Vietnamese
   - Slider labels: Độ rộng vai, Độ ôm thân, Chiều dài áo, Độ rộng tay, etc.

### File List

**Backend (New):**
- `backend/src/models/style.py` - Pydantic models for style pillars
- `backend/src/services/style_service.py` - Style pillar management service
- `backend/src/api/v1/styles.py` - API router for style endpoints
- `backend/tests/test_style_service.py` - Unit tests for StyleService
- `backend/tests/test_styles_api.py` - API integration tests

**Backend (Modified):**
- `backend/src/main.py` - Registered styles router

**Frontend (New):**
- `frontend/src/types/style.ts` - TypeScript interfaces for style pillars
- `frontend/src/store/designStore.ts` - Zustand store for design session
- `frontend/src/components/client/design/StylePillarSelector.tsx` - Pillar selection component
- `frontend/src/components/client/design/IntensitySliders.tsx` - Slider controls component
- `frontend/src/components/client/design/AdaptiveCanvas.tsx` - Canvas placeholder
- `frontend/src/components/client/design/index.ts` - Component exports
- `frontend/src/app/(customer)/layout.tsx` - Customer route layout
- `frontend/src/app/(customer)/design-session/page.tsx` - Design session page
- `frontend/src/app/(customer)/design-session/DesignSessionClient.tsx` - Client component
- `frontend/src/__tests__/designStore.test.ts` - Store unit tests

**Dependencies Added:**
- `zustand` - State management library
