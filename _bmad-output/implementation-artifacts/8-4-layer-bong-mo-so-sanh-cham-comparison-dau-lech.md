# Unified Story 8-4: Layer Bong mo So sanh Cham Comparison Dau lech

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/3-3-so-sanh-thiet-ke-voi-rap-chuan.md

### Story

As a **Khach hang**,
I want **xem lop phu bong mo cua rap chuan de len rap dang tuy chinh**,
so that **toi nhan ra su khac biet va muc do ca nhan hoa cua thiet ke hien tai**.

### Acceptance Criteria

1. **AC1 - Comparison Mode Toggle:** Given nguoi dung da thuc hien cac thay doi ve phong cach (slider alpha > 0), When nguoi dung bat che do "Comparison Mode" (toggle button), Then he thong hien thi rap chuan (P_base) duoi dang lop phu (Overlay) bong mo (semi-transparent) de len rap dang tuy chinh (P_current).
2. **AC2 - Visual Contrast:** Rap chuan phai duoc hien thi duoi dang lop phu bong mo (Opacity 40-60%) voi mau sac tuong phan. Baseline overlay: Heritage Gold (#D4AF37) dang dashed stroke (`strokeDasharray`). Current pattern: Indigo Depth (#4f46e5) solid stroke (giu nguyen).
3. **AC3 - Delta Visualization:** Cac diem chenh lech (Deltas) giua rap chuan va rap hien tai phai de dang nhan dien bang mat thuong thong qua su chong lop hinh hoc. Hien thi Delta statistics (DeltaG): tong diem thay doi, delta trung binh (mm), delta lon nhat (mm).
4. **AC4 - Performance:** Toggle comparison mode ON/OFF phai phan hoi < 200ms (NFR10). Overlay rendering KHONG duoc gay re-render toan bo React component tree — su dung CSS visibility/opacity toggle. Morphing van dat ~60fps khi overlay dang bat.
5. **AC5 - Interaction:** Lop phu rap chuan phai nam duoi (z-index thap hon) hoac khong chan tuong tac voi cac thanh phan dieu khien cua rap chinh.

### Tasks / Subtasks

- [x] Task 1: Frontend - State & Toggle UI
  - [x] 1.1 Them state `is_comparison_mode: boolean` vao `designStore` va type `DesignSessionState`/`DesignSessionActions` trong `types/style.ts`.
  - [x] 1.2 Tao toggle button "So sanh" trong `AdaptiveCanvas` header area, ket noi voi store state.
- [x] Task 2: Frontend - Comparison Overlay Component
  - [x] 2.1 Tao component `ComparisonOverlay.tsx` render baseline `SvgPattern` voi Heritage Gold dashed stroke, opacity 0.5, fill-none.
  - [x] 2.2 Tich hop `ComparisonOverlay` vao `AdaptiveCanvas.tsx` — render `<g>` overlay DUOI `<g>` pattern chinh (z-order). Su dung CSS `visibility: hidden/visible` de toggle.
- [x] Task 3: Frontend - Delta Statistics
  - [x] 3.1 Tao utility `computeDeltaStats` trong `utils/geometry.ts`.
  - [x] 3.2 Tao component `DeltaStatsPanel.tsx` hien thi Delta statistics ben duoi canvas khi comparison mode bat.
- [x] Task 4: Testing
  - [x] 4.1 Unit test `computeDeltaStats`: zero delta, uniform delta, mixed delta, partial alpha.
  - [x] 4.2 Component test `ComparisonOverlay`: render overlay paths, correct Heritage Gold color, dashed stroke, opacity.
  - [x] 4.3 Integration test `AdaptiveCanvas`: toggle comparison mode ON/OFF, overlay visible/hidden, delta stats update, backward compatibility.

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 3.3 - So sanh thiet ke voi Rap chuan (Comparison Overlay)
- Phase 2 Story: 8-4-layer-bong-mo-so-sanh-cham-comparison-dau-lech
- Epic: 8
