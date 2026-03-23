# Unified Story 9-2: Hints/UI Truc tiep Nhay Vi pham Kheo nho Cui Soft

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/4-1b-hien-thi-canh-bao-ky-thuat-truc-tiep.md

### Story

As a **Khach hang hoac Tho may**,
I want **thay cac canh bao ky thuat ngay khi dang dieu chinh thiet ke**,
so that **toi hieu duoc ly do tai sao mot so tuy chinh bi han che**.

### Acceptance Criteria

1. **Given** Nguoi dung dang thay doi thiet ke tren Adaptive Canvas
   **When** Backend tra ve ket qua Guardrail Check voi `status: "warning"` (Soft Constraints)
   **Then** He thong hien thi cac canh bao nhe duoi dang **Inline Hint** canh thanh truot lien quan (vd: "Ha nach hoi cao, co the gay can tay") (FR11)
   **And** Canh bao su dung 100% thuat ngu chuyen nganh may Viet Nam (NFR11)

2. **Given** Nguoi dung dieu chinh slider gay ra vi pham Hard Constraint
   **When** Backend tra ve `status: "rejected"` voi `last_valid_sequence_id`
   **Then** Thanh truot Sliders tu dong **snap-back** ve vi tri an toan gan nhat voi hieu ung muot ma
   **And** Hien thi thong bao loi chi tiet giai thich rang buoc vat ly bi vi pham

3. **Given** Guardrail check tra ve `status: "rejected"`
   **When** Nguoi dung nhan "Lock Design"
   **Then** Lock bi tu choi voi ma 422 va hien thi danh sach violations cu the
   **And** Moi violation hien thi: ten rang buoc, gia tri vi pham, va goi y an toan

4. **Given** Guardrail check tra ve `status: "warning"` (Soft Constraints only)
   **When** Nguoi dung nhan "Lock Design"
   **Then** Lock thanh cong nhung hien thi canh bao phu kem theo ket qua

5. **Given** Tat ca constraints pass
   **When** Khong co warnings hoac violations
   **Then** Khong hien thi gi them — trai nghiem nguoi dung khong bi gian doan

### Tasks / Subtasks

- [x] Task 1: Server Action for Guardrail Check (AC: #1, #2)
- [x] Task 2: Design Store — Guardrail State & Snap-back (AC: #2, #3)
- [x] Task 3: Integrate Guardrail Check into Slider Submit Flow (AC: #1, #2, #5)
- [x] Task 4: Inline Warning Display in IntensitySliders (AC: #1)
- [x] Task 5: Hard Violation Banner in Design Session (AC: #2, #3)
- [x] Task 6: Lock Design Enhanced Error Display (AC: #3, #4)
- [x] Task 7: Tests (AC: #1-#5)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 4.1b - Hien thi Canh bao Ky thuat Truc tiep (Inline Guardrails UI)
- Phase 2 Story: 9-2-hintsui-truc-tiep-nhay-vi-pham-kheo-nho-cui-soft
- Epic: 9
