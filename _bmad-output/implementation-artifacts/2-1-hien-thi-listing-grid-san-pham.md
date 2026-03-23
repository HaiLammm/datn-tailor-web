# Unified Story 2-1: Hien thi Listing Grid San pham

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/5-1-danh-muc-san-pham-trung-bay-so.md

### Story

As a **Khach hang** (Customer),
I want **xem danh sach ao dai cho thue voi hinh anh va mo ta chi tiet**,
So that **toi co the chon duoc bo do ung y truoc khi den tiem**.

### Acceptance Criteria

1. **Given** Khach hang truy cap trang Showroom
   **When** He thong nap danh sach tu co so du lieu
   **Then** Hien thi cac the san pham (Cards) gom: Hinh anh, Ten bo do, Mo ta, Kich co co ban (S/M/L) va Gia thue
   **And** Co bo loc theo mau sac hoac dip le (vd: Le cuoi, Khai truong)

2. **Given** Khach hang xem danh muc showroom
   **When** He thong hien thi danh sach san pham
   **Then** Moi san pham hien thi trang thai thoi gian thuc: Available (San sang), Rented (Dang thue), Maintenance (Giat ui/Sua chua)

3. **Given** He thong hien thi danh muc san pham
   **When** Du lieu duoc load tu database
   **Then** Multi-tenant isolation dam bao chi hien thi san pham cua tenant hien tai (via `tenant_id`)

4. **Given** Trang showroom duoc truy cap
   **When** He thong render trang
   **Then** Trang duoc SSG/ISR optimized theo architecture spec cho `(customer)/` route group

5. **Given** Khach hang xem tren thiet bi di dong
   **When** Giao dien responsive
   **Then** Bo cuc doc voi Bottom Sheet Interaction, toi uu thao tac mot tay, touch targets toi thieu 44x44px

### Tasks / Subtasks

- [x] Task 1: Database Migration - Garment table (AC: #1, #2, #3)
- [x] Task 2: Backend Pydantic Models (AC: #1, #2)
- [x] Task 3: Backend Service Layer (AC: #1, #2, #3)
- [x] Task 4: Backend API Router (AC: #1, #2, #3)
- [x] Task 5: Backend Tests (AC: #1, #2, #3)
- [x] Task 6: Frontend TypeScript Types (AC: #1, #2)
- [x] Task 7: Frontend Server Actions (AC: #1)
- [x] Task 8: Frontend Showroom Page (Server Component) (AC: #1, #4, #5)
- [x] Task 9: Frontend Client Components (AC: #1, #2, #5)
- [x] Task 10: Frontend Tests (AC: #1, #2, #5)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 5.1 - Danh muc san pham trung bay so (Digital Showroom Catalog)
- Phase 2 Story: 2-1-hien-thi-listing-grid-san-pham
- Epic: 2
