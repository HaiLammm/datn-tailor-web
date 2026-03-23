# Unified Story 9-3: Chuc nang Bang Sanity Check 3 cot Khao sat Tho

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/4-2-bang-doi-soat-ky-thuat-cho-tho-may.md

### Story

As a **Tho may (Minh)**,
I want **xem bang doi soat 3 cot (So do khach - Mau chuan - De xuat AI)**,
so that **toi co cai nhin toan dien ve su khac biet truoc khi cat rap**.

### Acceptance Criteria

1. **Given** Minh dang xem xet thiet ke cua khach hang (design da duoc dich thuat qua Emotional Compiler)
   **When** Anh truy cap vao Sanity Check Dashboard
   **Then** He thong hien thi bang 3 cot:
   - Cot 1: **So do co the (Body)** — Du lieu tu ho so khach hang
   - Cot 2: **Mau chuan (Base)** — Gia tri rap chuan cho kich thuoc tuong ung
   - Cot 3: **De xuat AI (Suggested)** — Base + Deltas sau bien doi
   **And** Cac con so sai lech (Deltas) duoc boi mau noi bat de de dang nhan dien (FR14)

2. **Given** Bang doi soat dang hien thi
   **When** Co su chenh lech lon giua cot Body va cot Suggested
   **Then** Hang tuong ung duoc boi mau canh bao (Amber cho chenh lech vua, Red cho chenh lech lon)
   **And** Hien thi gia tri delta (+/- cm) canh moi o Suggested (FR15)

3. **Given** Bang doi soat dang hien thi
   **When** Thiet ke co cac guardrail warnings hoac violations (tu Story 4.1b)
   **Then** Cac hang lien quan den violations/warnings duoc danh dau rieng biet
   **And** Message canh bao tu guardrail hien thi inline canh hang

4. **Given** Minh xem bang doi soat
   **When** Thiet ke da duoc Lock (is_design_locked === true)
   **Then** Hien thi trang thai "Da khoa" voi geometry_hash de xac minh tinh toan ven

5. **Given** Minh truy cap dashboard nhung chua co thiet ke nao duoc dich thuat
   **When** masterGeometry === null
   **Then** Hien thi thong bao "Chua co thiet ke de doi soat"

### Tasks / Subtasks

- [x] Task 1: Backend — Sanity Check Data Endpoint (AC: #1, #2)
- [x] Task 2: Frontend — Server Action for Sanity Check (AC: #1)
- [x] Task 3: Frontend — SanityCheckDashboard Component (AC: #1, #2, #3, #4, #5)
- [x] Task 4: Frontend — Integrate into Design Session (AC: #1)
- [x] Task 5: Tests (AC: #1-#5)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 4.2 - Bang doi soat Ky thuat cho Tho may (Artisan Sanity Check Dashboard)
- Phase 2 Story: 9-3-chuc-nang-bang-sanity-check-3-cot-khao-sat-tho
- Epic: 9
