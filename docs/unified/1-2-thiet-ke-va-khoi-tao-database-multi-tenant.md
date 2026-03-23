# Unified Story 1.2: Thiết kế và khởi tạo Database Multi-tenant

Status: done

## Phase 1 — Requirements (Original)
> Nguồn: docs/1-6-thiet-lap-ha-tang-multi-tenant-local-first.md

# Story 1.6: Thiết lập hạ tầng Multi-tenant & Local-first (Infrastructure Foundation)

Status: done

## Story

As a **Kiến trúc sư hệ thống**,
I want **thiết lập cấu trúc Database hỗ trợ đa tiệm (Multi-tenant) và cơ chế Local-first**,
so that **hệ thống có thể vận hành ổn định tại một tiệm di sản và sẵn sàng mở rộng trong tương lai**.

## Acceptance Criteria

1.  **Tenant Isolation (FR20):** Mọi bảng dữ liệu liên quan đến nghiệp vụ (vd: `customers`, `measurements`, `designs`) phải chứa cột `tenant_id` (UUID).
2.  **Row-Level Security (RLS):** Thiết lập chính sách RLS trên PostgreSQL để đảm bảo thợ tiệm này không thể xem/sửa dữ liệu của tiệm khác, dựa trên `tenant_id` trong session/token.
3.  **Local-first Ready (FR19):** Database Schema phải hỗ trợ các trường cần thiết cho đồng bộ hóa (vd: `updated_at`, `version`, `is_deleted` cho soft delete).
4.  **Schema Migration:** Tạo các bản cập nhật migration để thêm `tenant_id` và RLS vào các bảng hiện có (nếu có).
5.  **Multi-tenant Middleware/Dependency:** Backend phải có cơ chế tự động trích xuất `tenant_id` từ JWT và áp dụng vào các truy vấn Database.

## Tasks / Subtasks

- [x] **Database: Schema & RLS**
    - [x] Tạo migration cập nhật các bảng `users`, `staff_whitelist` (nếu cần) và chuẩn bị bảng `tenants`.
    - [x] Thêm cột `tenant_id` vào tất cả các bảng nghiệp vụ.
    - [x] Viết các lệnh SQL để kích hoạt RLS và tạo Policy cho từng bảng.
- [x] **Backend: Multi-tenant Logic**
    - [x] Viết FastAPI dependency `get_current_tenant` để lấy `tenant_id` từ Auth token.
    - [x] Cập nhật `BaseService` hoặc logic truy vấn để luôn lọc theo `tenant_id`.
- [x] **Infrastructure: Sync Support**
    - [x] Thêm các trường `version` (integer/timestamp) và `is_deleted` (boolean) để phục vụ logic đồng bộ hóa Local-first sau này.
- [x] **Validation & Testing**
    - [x] Viết test đảm bảo User A của Tenant 1 không thể truy cập dữ liệu của Tenant 2 ngay cả khi biết ID.
    - [x] Kiểm tra tính toàn vẹn của dữ liệu khi thực hiện Soft Delete.

## Dev Notes

- **PostgreSQL 17:** Tận dụng tính năng RLS mạnh mẽ.
- **SSOT:** `tenant_id` là khóa ngoại bắt buộc cho mọi dữ liệu nghiệp vụ.
- **Performance:** Đảm bảo đánh index cho `tenant_id` trên tất cả các bảng để tối ưu hóa truy vấn RLS.

### Project Structure Notes

- **Migrations:** `backend/migrations/`
- **Dependencies:** `backend/src/api/dependencies.py`
- **Models:** `backend/src/models/`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#story-16]
- [Source: _bmad-output/planning-artifacts/architecture.md#data-architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#decision-priority-analysis (Auth Strategy)]

## Dev Agent Record

### Implementation Plan
1. Thiết kế Schema bảng `tenants`.
2. Áp dụng RLS Policy cấp database.
3. Tích hợp tenant filter vào tầng Service của FastAPI.

### Completion Notes List

1. **Database Schema Changes:**
   - Created `TenantDB` model with `id`, `name`, `slug`, `created_at` fields
   - Added `tenant_id` FK to `UserDB` model (nullable for Customer role)
   - Added `version` column to `CustomerProfileDB` and `MeasurementDB` for sync support
   - Updated FK constraints on `tenant_id` in business tables to reference `tenants` table

2. **Migration 006_multi_tenant_infrastructure.sql:**
   - Creates `tenants` table with proper indexes
   - Enables RLS on `customer_profiles` and `measurements` tables
   - Creates policies: tenant_isolation_select, tenant_isolation_insert, tenant_isolation_update, tenant_isolation_delete
   - Adds `version` columns with default value 1
   - Seeds default tenant with UUID `00000000-0000-0000-0000-000000000001`

3. **Multi-tenant Dependency:**
   - Updated `get_tenant_id_from_user()` in `dependencies.py` to extract `tenant_id` from authenticated user
   - Owner role uses `tenant_id` from user record (must be assigned)
   - Tailor role requires `tenant_id` assigned, returns 403 if missing
   - Customer role not required to have `tenant_id` (they belong to no specific tenant)

4. **Testing:**
   - Created `test_multi_tenant.py` with 14 unit tests covering:
     - Tenant isolation in queries (TenantDB, CustomerProfileDB, MeasurementDB)
     - Cross-tenant access prevention
     - Sync fields validation (version, is_deleted, updated_at)
     - Soft delete integrity
     - Tenant dependency logic for different user roles
   - Updated `test_customers_api.py` fixture to seed default tenant and assign `tenant_id` to tailor/owner users
   - **Full test suite: 156 tests passed**

5. **Discoveries/Breaking Changes:**
   - Non-Owner staff users (Tailor) now MUST have `tenant_id` assigned to access tenant-scoped resources
   - This is intentional for multi-tenant security but requires updating user provisioning workflows

### File List
- `backend/migrations/006_multi_tenant_infrastructure.sql` (NEW)
- `backend/src/models/db_models.py` (MODIFIED - added TenantDB, tenant_id to UserDB, version columns)
- `backend/src/api/dependencies.py` (MODIFIED - updated get_tenant_id_from_user)
- `backend/tests/test_multi_tenant.py` (NEW - 14 tests)
- `backend/tests/test_customers_api.py` (MODIFIED - added tenant seeding to fixture)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 1.6 Thiết lập hạ tầng Multi-tenant & Local-first
- Phase 2 Story: 1.2 Thiết kế và khởi tạo Database Multi-tenant
- Epic: 1
