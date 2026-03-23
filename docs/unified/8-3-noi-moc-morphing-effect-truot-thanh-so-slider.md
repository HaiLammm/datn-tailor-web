# Unified Story 8-3: Noi moc Morphing Effect Truot thanh so Slider

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/3-2-bien-doi-rap-thoi-gian-thuc.md

### Story

As a **Khach hang**,
I want **thay ban ve rap bien doi muot ma khi toi keo thanh truot phong cach**,
so that **toi co the cam nhan truc quan su thay doi cua thiet ke ngay lap tuc**.

### Acceptance Criteria

1. **AC1 - Real-time Interpolation:** Given nguoi dung dang dieu chinh cuong do phong cach qua Sliders (0% - 100%), When gia tri thay doi, Then Frontend su dung thuat toan noi suy tuyen tinh (Linear Interpolation - Lerp) de tinh toan lai toa do (x, y) cua tat ca cac diem tren SVG Path.
2. **AC2 - Visual Fluidity:** Hieu ung bien doi (Morphing) phai dat do tre phan hoi UI < 200ms (NFR10) va duy tri toc do khung hinh 60fps bang cach su dung `requestAnimationFrame`.
3. **AC3 - Geometric Formula:** Cac diem bien doi phai tuan thu dung cong thuc: P_final = P_base + alpha * Delta_preset, trong do alpha la gia tri slider (0.0 - 1.0) va Delta_preset la vector bien doi toi da duoc tinh toan truoc tu Backend.
4. **AC4 - Independent State:** Viec morphing rap khong duoc gay ra re-render toan bo React Component tree; chi cap nhat thuoc tinh DOM cua the `<path>` hoac su dung thu vien animation toi uu (nhu Framer Motion hoac GSAP).
5. **AC5 - Data Sync:** Khi nguoi dung tha tay khoi slider (onPointerUp), gia tri alpha cuoi cung moi duoc dong bo ve React State/Store de chuan bi cho cac buoc tiep theo (nhu luu tru).

### Tasks / Subtasks

- [x] Task 1: Backend - Morph Target Generation (Python)
  - [x] 1.1 Cap nhat `GeometryEngine` de ho tro tinh toan `TargetGeometry` dua tren `StyleParameters` (max intensity).
  - [x] 1.2 Tao model `MorphDelta` trong `backend/src/models/geometry.py` (cau truc tuong tu `MasterGeometry` nhung chua vector `dx, dy`).
  - [x] 1.3 Tao endpoint `GET /api/v1/geometry/morph-targets/{style_id}` tra ve `MorphDelta` cho phong cach da chon.
- [x] Task 2: Frontend - Morphing Engine (Client)
  - [x] 2.1 Tao hook `useMorphing.ts` su dung `requestAnimationFrame` de xu ly vong lap noi suy.
  - [x] 2.2 Cap nhat `SvgPattern.tsx` de chap nhan `ref` cho phep truy cap truc tiep vao cac phan tu DOM `<path>`.
  - [x] 2.3 Tao utility `geometryUtils.ts` de thuc hien phep toan vector P + alpha * Delta.
- [x] Task 3: Frontend - Slider Integration
  - [x] 3.1 Cap nhat `HeritageSlider.tsx` de expose su kien `onValueChange` (real-time) va `onValueCommit` (final).
  - [x] 3.2 Tich hop `useMorphing` vao `AdaptiveCanvas.tsx`, ket noi voi state tu `HeritageSlider`.
- [x] Task 4: Testing & Optimization
  - [x] 4.1 Unit Test Backend: Kiem tra tinh toan `MorphDelta` chinh xac (Target - Base).
  - [x] 4.2 Performance Test Frontend: Dam bao FPS on dinh khi keo slider lien tuc tren thiet bi di dong.

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 3.2 - Bien doi Rap thoi gian thuc (Geometric Elasticity)
- Phase 2 Story: 8-3-noi-moc-morphing-effect-truot-thanh-so-slider
- Epic: 8
