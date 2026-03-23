# Unified Story 9-4: Manual Override

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/4-3-ghi-de-phan-hoi-tu-nghe-nhan.md

### Story

As a **Tho may (Minh)**,
I want **ghi de (Override) cac thong so do AI de xuat dua tren kinh nghiem thuc te**,
so that **quyet dinh cuoi cung luon thuoc ve chuyen mon con nguoi (Human-in-the-loop)**.

### Acceptance Criteria

1. **Given** Minh dang xem Sanity Check Dashboard va phat hien mot thong so AI de xuat chua toi uu
   **When** Minh nhan vao gia tri "De xuat AI" tren mot hang trong bang doi soat
   **Then** He thong hien thi inline edit mode cho phep nhap gia tri moi
   **And** Hien thi gia tri goc (AI suggestion) de tham chieu
   **And** Khong dung Modal — chi inline edit truc tiep tren bang (UX spec)

2. **Given** Minh nhap gia tri ghi de moi
   **When** Gia tri duoc submit
   **Then** Backend chay Guardrail check tren gia tri moi (reuse tu Story 4.1a)
   **And** Neu vi pham Hard Constraint -> Hien thi loi inline, khong cho luu
   **And** Neu Soft Constraint warning -> Hien thi canh bao nhung cho phep tiep tuc
   **And** Neu pass -> Luu override record vao DB

3. **Given** Override duoc luu thanh cong
   **When** Bang doi soat cap nhat
   **Then** Hang bi ghi de hien thi gia tri moi voi badge "Ghi de" (Heritage Gold `#D4AF37`)
   **And** Gia tri goc AI hien thi dang gach ngang ben canh
   **And** Cot "De xuat AI" cua hang do cap nhat thanh gia tri override

4. **Given** Minh muon ghi lai ly do ghi de
   **When** Minh nhap ly do vao truong "Ly do ghi de" (optional)
   **Then** He thong luu ly do bang tieng Viet (NFR11)
   **And** Override record duoc danh dau `flagged_for_learning = true` neu co ly do
   **And** Ghi log chi tiet vao bang `design_overrides` (NFR9)

5. **Given** Minh da thuc hien mot hoac nhieu overrides
   **When** Minh nhan "Khoa thiet ke" (Lock Design)
   **Then** Backend tao Master Geometry JSON bao gom CA AI deltas VA override deltas
   **And** Guardrail check chay lan cuoi tren toan bo geometry da override
   **And** Override history duoc luu tru de truy xuat sau

6. **Given** Minh hoac Co Lan muon xem lich su ghi de
   **When** Truy cap override history cho mot design
   **Then** Hien thi danh sach cac override: thong so, gia tri goc, gia tri moi, ly do, tho may, thoi gian

### Tasks / Subtasks

- [x] Task 1: Backend — Override Data Models (AC: #3, #4, #6)
- [x] Task 2: Backend — Override API Endpoints (AC: #1, #2, #5, #6)
- [x] Task 3: Frontend — Override TypeScript Types (AC: #1)
- [x] Task 4: Frontend — Override Server Actions (AC: #2)
- [x] Task 5: Frontend — Inline Override UI in SanityCheckDashboard (AC: #1, #2, #3, #4)
- [x] Task 6: Frontend — Override Integration in DesignSessionClient (AC: #5, #6)
- [x] Task 7: Frontend — Override History Panel (AC: #6)
- [x] Task 8: Tests (AC: #1-#6)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 4.3 - Ghi de & Phan hoi tu Nghe nhan (Manual Override & Feedback Loop)
- Phase 2 Story: 9-4-manual-override
- Epic: 9
