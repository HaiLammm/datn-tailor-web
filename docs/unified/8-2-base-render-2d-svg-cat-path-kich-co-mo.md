# Unified Story 8-2: Base Render 2D SVG Cat Path Kich co Mo

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/3-1-adaptive-canvas-khoi-tao-rap-chuan.md (tach ra tu cung P1 voi Story 8-1)

### Story

As a **Khach hang hoac Tho may**,
I want **thay ban ve rap chuan (Baseline) hien thi tren man hinh thiet ke**,
so that **toi co mot diem tua truc quan truoc khi bat dau chinh sua**.

### Acceptance Criteria

1. **AC1 - Canvas Initialization:** Given nguoi dung bat dau mot phien thiet ke (Design Session), When giao dien Adaptive Canvas duoc tai, Then he thong hien thi ban ve Rap chuan (Baseline Pattern) duoi dang SVG nam chinh giua va duoc ty le hoa (scaled) phu hop voi viewport.
2. **AC2 - Measurement Integration:** Given so do co ban cua khach hang (Co, Nguc, Eo, Mong...) da duoc nap, When rap chuan duoc sinh ra, Then cac diem nut (nodes) cua rap phai phan anh chinh xac cac thong so nay voi sai so tuyet doi <= 1mm (NFR3).
3. **AC3 - Visual Standards:** Ban ve phai tuan thu he mau Heritage Palette: Net ve (Stroke) mau Indigo Depth, Nen rap (Fill) trong suot hoac Silk Ivory nhat, Nen Canvas mau Heritage Gold (hoac texture giay do).
4. **AC4 - Performance:** Thoi gian tu luc nhan du lieu den khi hien thi ban ve (First Paint) phai < 200ms de dam bao trai nghiem muot ma (NFR10).
5. **AC5 - Component Architecture:** Adaptive Canvas phai la mot Client Component (`use client`) de ho tro tuong tac sau nay, nhung du lieu hinh hoc ban dau (Initial Geometry) phai duoc fetch tu Server (SSR/Server Action) de dam bao SSOT.

### Tasks / Subtasks

- [x] Task 2: Frontend - Canvas & SVG Rendering (Next.js/React)
  - [x] 2.1 Tao `frontend/src/components/client/design/AdaptiveCanvas.tsx` (Client Component).
  - [x] 2.2 Tao `frontend/src/components/client/design/SvgPattern.tsx` de render cac `path` tu du lieu JSON.
  - [x] 2.3 Cau hinh Tailwind cho Heritage Palette (`bg-paper-texture`, `stroke-indigo-600`, etc.).
  - [x] 2.4 Implement `useAutoFit` hook de tu dong zoom/pan rap vao giua man hinh.
- [x] Task 3: Integration & Data Flow
  - [x] 3.1 Tao `frontend/src/app/actions/geometry-actions.ts` de goi API backend.
  - [x] 3.2 Tich hop Canvas vao `frontend/src/app/(customer)/design-session/page.tsx`.
  - [x] 3.3 Dam bao luong du lieu: Server Page -> Fetch Measurements -> Fetch Baseline Geometry -> Pass to Client Canvas.
- [x] Task 4: Testing & Validation
  - [x] 4.1 Backend Test: Unit test kiem tra do chinh xac toa do (|Calculated - Expected| <= 1mm).
  - [x] 4.2 Frontend Test: Component test dam bao SVG render dung so luong path va attributes.

Note: This P1 story (3.1) was split into two P2 stories. Story 8-2 covers the frontend rendering and integration (Tasks 2, 3, 4), while Story 8-1 covers the backend API and geometry engine (Task 1).

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 3.1 - Adaptive Canvas & Khoi tao Rap chuan (Baseline Rendering)
- Phase 2 Story: 8-2-base-render-2d-svg-cat-path-kich-co-mo
- Epic: 8
