# Unified Story 2-6: Timeline Tracking & Automated Email Reminders

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/5-4-thong-bao-nhac-nho-tra-do-tu-dong.md + docs/5-2-theo-doi-lich-trinh-trang-thai-do-thue.md (merged)

### Story A: Thong bao nhac nho tra do tu dong (Automatic Return Reminders)

As a **Chu tiem** (Owner),
I want **he thong tu dong gui thong bao nhac khach tra do truoc 1 ngay**,
So that **quy trinh thu hoi do dien ra dung han ma khong can ton cong lien lac thu cong**.

### Story B: Theo doi Lich trinh & Trang thai do thue (Return Timeline & Status)

As a **Khach hang** (Customer),
I want **biet chinh xac bo do toi thich khi nao se san sang de thue**,
So that **toi co the sap xep lich trinh ca nhan phu hop**.

### Acceptance Criteria — Story A (Automatic Return Reminders)

1. **Given** Mot don thue do dang o trang thai `Rented` voi `expected_return_date` da duoc thiet lap
   **When** Den thoi diem 24 gio truoc han tra do (tuc la ngay hien tai = `expected_return_date - 1 ngay`)
   **Then** He thong tu dong gui Email nhac nho cho khach hang duoc lien ket voi don thue
   **And** Thong bao bao gom: ten bo do, thoi han tra do, va dia chi tra do cua tiem

2. **Given** He thong can xac dinh khach hang nhan thong bao
   **When** He thong quet cac garment co trang thai `rented` va `expected_return_date = ngay mai`
   **Then** He thong tra cuu thong tin khach hang (ten, email) thong qua truong `renter_id` moi tren bang `garments`
   **And** Chi gui thong bao cho cac khach hang co email hop le (khong null, khong rong)

3. **Given** He thong da gui thong bao nhac nho cho mot don thue
   **When** He thong chay lai quy trinh quet (lan chay ke tiep)
   **Then** He thong KHONG gui thong bao trung lap cho cung mot don thue (idempotent)
   **And** Su dung truong `reminder_sent_at` (timestamp) tren bang `garments` de danh dau da gui

4. **Given** Chu tiem muon kiem tra trang thai thong bao
   **When** Chu tiem xem danh sach quan ly kho (Inventory Management)
   **Then** Moi garment dang thue hien thi them icon/badge "Da nhac nho" neu `reminder_sent_at` khac null
   **And** Hien thi ngay gui nhac nho ben canh icon

5. **Given** He thong can co co che chay tu dong
   **When** Server backend khoi dong hoac theo lich (scheduled)
   **Then** He thong co endpoint `POST /api/v1/notifications/send-return-reminders` de trigger thu cong (Owner only)
   **And** He thong co background task su dung `asyncio` scheduler chay moi ngay luc 8:00 AM (configurable)

6. **Given** He thong gap loi khi gui email cho mot khach hang
   **When** Email gui that bai (SMTP error, invalid email)
   **Then** He thong ghi log chi tiet loi va khong danh dau `reminder_sent_at` cho garment do
   **And** He thong tiep tuc gui thong bao cho cac don thue con lai (khong dung toan bo quy trinh)

7. **Given** Trang thai garment thay doi sau khi da gui thong bao
   **When** Garment chuyen tu `rented` sang `available` hoac `maintenance` (da tra do truoc han)
   **Then** Truong `reminder_sent_at` tu dong bi xoa (reset ve null) cung voi `expected_return_date`
   **And** Dam bao khong gui thong bao cho garment da tra do

### Acceptance Criteria — Story B (Return Timeline & Status)

1. **Given** Khach hang dang xem chi tiet mot bo do dang duoc thue (`Rented`)
   **When** He thong kiem tra lich trinh tra do
   **Then** Hien thi dong trang thai: "Du kien san sang vao: [Ngay/Thang]"
   **And** Trang thai phai duoc cap nhat thoi gian thuc dua tren du lieu kho

2. **Given** Khach hang xem chi tiet mot bo do o trang thai `Available`
   **When** He thong hien thi trang thai
   **Then** Hien thi ky hieu "San sang cho thue ngay" voi badge mau xanh

3. **Given** Khach hang xem chi tiet mot bo do o trang thai `Maintenance`
   **When** He thong hien thi trang thai
   **Then** Hien thi "Dang bao tri" voi badge mau xam va ngay du kien san sang (neu co)

4. **Given** Khach hang xem danh sach showroom
   **When** He thong hien thi danh sach san pham
   **Then** Moi GarmentCard hien thi ngay du kien tra do (neu trang thai la `Rented` va co `expected_return_date`)

5. **Given** Khach hang nhan vao nut "Xem" tren GarmentCard
   **When** He thong dieu huong den trang chi tiet
   **Then** Hien thi trang chi tiet day du: hinh anh lon, mo ta chi tiet, kich co, gia thue, trang thai, lich trinh tra do, va countdown (so ngay con lai)

### Tasks / Subtasks — Story A

- [x] Task 1: Database Migration - Add rental tracking fields (AC: #2, #3, #7)
- [x] Task 2: Backend - Notification Service (AC: #1, #2, #3, #6)
- [x] Task 3: Backend - Notification API Endpoint (AC: #5)
- [x] Task 4: Backend - Background Scheduler (AC: #5)
- [x] Task 5: Backend - Update Status Update Flow (AC: #7)
- [x] Task 6: Backend Tests (AC: #1, #2, #3, #5, #6, #7)
- [x] Task 7: Frontend - Update StatusUpdatePanel for Renter Info (AC: #2, #4)
- [x] Task 8: Frontend - Reminder Status Badge (AC: #4)
- [x] Task 9: Frontend - Manual Trigger Button (AC: #5)
- [x] Task 10: Frontend Tests (AC: #2, #4, #5)

### Tasks / Subtasks — Story B

- [x] Task 1: Garment Detail API Enhancement (AC: #1, #2, #3)
- [x] Task 2: Backend Tests for Timeline Fields (AC: #1, #2, #3)
- [x] Task 3: Frontend TypeScript Types Update (AC: #1, #4, #5)
- [x] Task 4: Garment Detail Page (Server Component) (AC: #1, #2, #3, #5)
- [x] Task 5: ReturnTimeline Client Component (AC: #1, #2, #3, #5)
- [x] Task 6: Update GarmentCard with Return Date & Navigation (AC: #4, #5)
- [x] Task 7: Export ReturnTimeline from Barrel (AC: #5)
- [x] Task 8: Frontend Tests (AC: #1, #4, #5)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story A: 5.4 - Thong bao nhac nho tra do tu dong (Automatic Return Reminders)
- Phase 1 Story B: 5.2 - Theo doi Lich trinh & Trang thai do thue (Return Timeline & Status)
- Phase 2 Story: 2-6-timeline-tracking-automated-email-reminders
- Epic: 2
