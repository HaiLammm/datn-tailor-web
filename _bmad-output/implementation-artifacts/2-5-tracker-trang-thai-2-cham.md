# Unified Story 2-5: Tracker Trang thai 2 cham

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/5-3-cap-nhat-trang-thai-kho-2-cham.md

### Story

As a **Chu tiem (Co Lan)** (Owner),
I want **cap nhat trang thai do thue chi voi 2 lan cham man hinh**,
So that **tiet kiem thoi gian quan tri va du lieu kho luon chinh xac**.

### Acceptance Criteria

1. **Given** Co Lan dang xem danh sach quan ly kho tren thiet bi di dong
   **When** He thong hien thi danh sach tat ca bo do
   **Then** Moi bo do hien thi: Ten, hinh anh thu nho, trang thai hien tai (Available/Rented/Maintenance), va ngay du kien tra do (neu co)
   **And** Danh sach duoc sap xep theo trang thai: Rented truoc, Maintenance tiep theo, Available cuoi cung

2. **Given** Co Lan dang xem danh sach quan ly kho
   **When** Cham 1: Chon mot bo do (tap vao hang/the san pham)
   **Then** He thong hien thi cac tuy chon trang thai kha dung duoi dang cac nut lon (>= 44x44px):
   - "San sang" (Available) - mau xanh
   - "Dang thue" (Rented) - mau vang ho phach
   - "Bao tri" (Maintenance) - mau xam
   **And** Trang thai hien tai duoc danh dau (highlighted/disabled) de tranh cap nhat trung lap

3. **Given** Co Lan da chon mot bo do va thay cac tuy chon trang thai
   **When** Cham 2: Chon trang thai moi (vd: "Bao tri")
   **Then** He thong ngay lap tuc cap nhat trang thai moi trong database
   **And** Hien thi micro-toast xac nhan: "Da cap nhat: [Ten bo do] -> [Trang thai moi]"
   **And** Danh sach tu dong cap nhat vi tri sap xep moi cua bo do

4. **Given** Co Lan chon trang thai "Dang thue" (Rented)
   **When** He thong cap nhat trang thai
   **Then** Hien thi them truong nhap "Ngay du kien tra do" (date picker)
   **And** Ngay tra do phai la ngay trong tuong lai (validation)
   **And** Luu `expected_return_date` cung voi `status` update

5. **Given** Co Lan chon trang thai "Bao tri" (Maintenance) hoac "San sang" (Available)
   **When** He thong cap nhat trang thai
   **Then** Tu dong xoa `expected_return_date` (set null)
   **And** Cap nhat thanh cong khong can nhap them thong tin

6. **Given** Co Lan dang o trang quan ly kho
   **When** He thong gap loi mang hoac API
   **Then** Hien thi thong bao loi ro rang: "Cap nhat that bai. Vui long thu lai."
   **And** Trang thai hien thi khong bi thay doi (optimistic update bi rollback)

### Tasks / Subtasks

- [x] Task 1: Backend - Dedicated Status Update Endpoint (AC: #2, #3, #4, #5)
- [x] Task 2: Backend - Inventory List Enhancement (AC: #1)
- [x] Task 3: Backend Tests (AC: #1, #2, #3, #4, #5, #6)
- [x] Task 4: Frontend - Server Action for Status Update (AC: #3, #4, #5, #6)
- [x] Task 5: Frontend - InventoryCard Client Component (AC: #1, #2, #3)
- [x] Task 6: Frontend - StatusUpdatePanel Client Component (AC: #2, #3, #4, #5, #6)
- [x] Task 7: Frontend - Inventory Management Page (AC: #1)
- [x] Task 8: Frontend - InventoryList Client Component (AC: #1)
- [x] Task 9: Frontend - Component Barrel & Owner Dashboard Link (AC: all)
- [x] Task 10: Frontend Tests (AC: #1, #2, #3, #4, #5, #6)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 5.3 - Cap nhat trang thai Kho "2 cham" (2-Touch Inventory Update)
- Phase 2 Story: 2-5-tracker-trang-thai-2-cham
- Epic: 2
