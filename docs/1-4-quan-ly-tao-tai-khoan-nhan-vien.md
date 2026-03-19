# Story 1.4: Quản lý & Tạo tài khoản Nhân viên

Status: in-progress

## Story

As a **Chủ tiệm (Cô Lan)**,
I want **thêm email của nhân viên vào danh sách nhân viên hợp lệ (Staff Whitelist)**,
so that **nhân viên có thể đăng nhập và truy cập vào các công cụ sản xuất với đúng quyền hạn (Tailor)**.

## Acceptance Criteria

1.  **Access Control (Owner Only):** Chỉ người dùng có vai trò `Owner` (được định nghĩa trong `config.py`) mới có quyền truy cập trang Quản lý nhân sự và các API liên quan.
2.  **Staff Whitelist Management:**
    *   Hiển thị danh sách email đang nằm trong `staff_whitelist`.
    *   Cho phép thêm email mới vào whitelist cùng với mật khẩu và gán vai trò (`Tailor` hoặc `Owner`).
    *   Khi thêm nhân viên, Owner có thể nhập mật khẩu thủ công hoặc hệ thống tự tạo mật khẩu mặc định (ví dụ: `Tailor@123`). Mật khẩu mặc định được hiển thị cho Owner sau khi tạo thành công để chuyển cho nhân viên.
    *   Cho phép xóa email khỏi whitelist (thu hồi quyền truy cập nhân viên).
3.  **Active Staff Directory:** Hiển thị danh sách các tài khoản nhân viên đã đăng ký chính thức (đã có trong bảng `users` và có quyền staff).
4.  **Role Detection Integration:** Khi một email trong whitelist đăng nhập (qua Google hoặc Email), hệ thống phải tự động cập nhật vai trò của `user` đó dựa trên thông tin trong whitelist (sử dụng logic `determine_role` hiện có).
5.  **Validation:**
    *   Email phải đúng định dạng và duy nhất trong whitelist.
    *   Không được phép xóa email của chính `Owner` hiện tại khỏi whitelist.
6.  **UI/UX:**
    *   Giao diện tối giản, sang trọng theo phong cách Heritage Palette.
    *   Thông báo xác nhận rõ ràng khi thêm/xóa nhân viên.

## Tasks / Subtasks

- [x] **Backend: API Implementation**
    - [x] Tạo Pydantic models cho Staff Whitelist (`StaffWhitelistCreateRequest`, `StaffWhitelistResponse`).
    - [x] Xây dựng `StaffService` để xử lý CRUD trên bảng `staff_whitelist`.
    - [x] Tạo router `api/v1/staff.py` với các endpoint:
        - `GET /`: Liệt kê danh sách whitelist và nhân viên hiện tại.
        - `POST /`: Thêm email vào whitelist (Owner only).
        - `DELETE /{id}`: Xóa khỏi whitelist (Owner only).
    - [x] Đảm bảo `determine_role` trong `auth_service.py` hoạt động chính xác khi nhân viên đăng nhập lần đầu.
- [ ] **Backend: Mật khẩu khi thêm nhân viên**
    - [ ] Thêm trường `password` (optional) vào `StaffWhitelistCreateRequest`.
    - [ ] Nếu không truyền `password`, backend tự sinh mật khẩu mặc định (ví dụ: `Tailor@123`).
    - [ ] Hash mật khẩu trước khi lưu vào bảng `users` (sử dụng bcrypt/passlib).
    - [ ] Tạo tài khoản `users` ngay khi thêm vào whitelist (với email + hashed password + role).
    - [ ] API `POST /staff/` trả về mật khẩu gốc (plain text) trong response để Owner chuyển cho nhân viên.
- [x] **Frontend: Management UI**
    - [x] Xây dựng trang `app/(workplace)/owner/staff/page.tsx`.
    - [x] Component `StaffTable.tsx` hiển thị danh sách và nút xóa.
    - [x] Component `AddStaffForm.tsx` để thêm email mới.
    - [x] Tích hợp TanStack Query để quản lý state và cập nhật UI thời gian thực.
- [ ] **Frontend: Hỗ trợ mật khẩu**
    - [ ] Thêm trường nhập mật khẩu (optional) vào `AddStaffForm.tsx` với placeholder gợi ý "Để trống để dùng mật khẩu mặc định".
    - [ ] Hiển thị mật khẩu (plain text) trong dialog/modal sau khi tạo thành công để Owner copy và gửi cho nhân viên.
- [x] **Validation & Security**
    - [x] Kiểm tra RBAC: Đảm bảo vai trò `Tailor` hoặc `Customer` không thể gọi API quản lý staff.
    - [x] Viết unit test cho `StaffService`.

## Dev Notes

- **Database Table:** Sử dụng bảng `staff_whitelist` (id, email, role, created_at) đã được tạo trong migration 001.
- **Role Priority:** 
    1. `OWNER_EMAIL` trong `config.py` luôn là `Owner`.
    2. Email trong `staff_whitelist` quyết định vai trò nhân viên.
- **Security Dependency:** Sử dụng `OwnerOnly` dependency từ `api/dependencies.py`.
- **Terminology:** Sử dụng thuật ngữ tiếng Việt ("Chủ tiệm", "Thợ may", "Nhân viên") trên UI.

## References

- [Source: _bmad-output/planning-artifacts/epics.md#story-14]
- [Source: backend/src/services/auth_service.py#determine_role]
- [Source: backend/migrations/001_create_users_tables.sql]

## Dev Agent Record

### Implementation Plan
1. Backend: Pydantic models, StaffService, and API routes already existed but had critical bug in dependency injection
2. Fixed `OwnerOnly` dependency usage - removed double `Depends()` wrapping
3. Fixed test suite - added ASGITransport and override_get_db fixture for proper integration testing
4. Frontend: Created staff management UI with StaffTable and AddStaffForm components
5. Integrated TanStack Query for real-time data fetching and mutations

### Completion Notes
- ✅ All backend functionality implemented and tested (135 tests passing)
- ✅ Fixed critical bug in `backend/src/api/v1/staff.py`: Changed from `Depends(OwnerOnly)` to direct `OwnerOnly` annotation usage
- ✅ Fixed `backend/tests/test_staff_api.py`: Added ASGITransport import and override_get_db fixture
- ✅ Frontend staff management page fully functional with Heritage Palette styling
- ✅ RBAC properly enforced - only Owner can access staff management endpoints
- ✅ All acceptance criteria satisfied

## File List

### Backend
- `backend/src/models/staff.py` - Pydantic models (already existed)
- `backend/src/services/staff_service.py` - CRUD service layer (already existed)
- `backend/src/api/v1/staff.py` - API endpoints (MODIFIED - fixed dependency injection bug)
- `backend/tests/test_staff_service.py` - Service layer tests (already existed)
- `backend/tests/test_staff_api.py` - API integration tests (MODIFIED - fixed AsyncClient usage and added fixtures)

### Frontend
- `frontend/src/types/staff.ts` - TypeScript types (NEW)
- `frontend/src/app/(workplace)/owner/staff/page.tsx` - Staff management page (NEW)
- `frontend/src/components/client/StaffTable.tsx` - Staff table component (NEW)
- `frontend/src/components/client/AddStaffForm.tsx` - Add staff form component (NEW)

## QA Review

**Reviewed by:** QA Agent  
**Date:** 2026-03-03  
**Overall Status:** ✅ **PASS - APPROVED FOR MERGE**

### Summary
- ✅ **Code Quality:** 5/5 ⭐⭐⭐⭐⭐ - Clean, well-documented, follows project standards
- ✅ **Security:** 5/5 ⭐⭐⭐⭐⭐ - Excellent RBAC, validation, XSS/SQL injection prevention
- ✅ **Testing:** 5/5 ⭐⭐⭐⭐⭐ - Comprehensive coverage (135/135 tests passing, 100%)
- ✅ **Architecture:** 5/5 ⭐⭐⭐⭐⭐ - Perfect SSOT adherence, layered design
- ✅ **Documentation:** 4/5 ⭐⭐⭐⭐ - Well documented, minor suggestions for API docs

### Test Results
- ✅ Backend: **135/135 tests PASSED** (100%)
- ✅ Service Layer: 10/10 tests passing (CRUD, edge cases, security)
- ✅ API Layer: 10/10 tests passing (endpoints, RBAC, error handling)
- ✅ Frontend TypeScript: No production code errors

### Acceptance Criteria Verification
- ✅ AC1: Access Control (Owner Only) - `OwnerOnly` dependency enforced + tests
- ✅ AC2: Staff Whitelist Management - Full CRUD implemented
- ✅ AC3: Active Staff Directory - `get_active_staff_users()` working
- ✅ AC4: Role Detection Integration - Uses existing `determine_role`
- ✅ AC5: Validation - Pydantic validators + business logic checks
- ✅ AC6: UI/UX - Heritage Palette styling, clear notifications

### Issues Found
- ❌ **Critical:** NONE
- ⚠️ **Major:** NONE
- 🟡 **Minor:** 1 deprecation warning (HTTP_422_UNPROCESSABLE_ENTITY) - non-blocking

### Security Highlights
- ✅ RBAC enforcement: OwnerOnly dependency on all staff endpoints
- ✅ Input validation: Pydantic EmailStr, role whitelist, email normalization
- ✅ Business logic security: Cannot add OWNER_EMAIL, cannot remove self
- ✅ SQL injection prevention: SQLAlchemy ORM with parameterized queries
- ✅ XSS prevention: React JSX auto-escaping, no dangerouslySetInnerHTML
- ✅ API security: CORS configured, credentials included, HttpOnly cookies

### Recommendations
**Immediate (Before Merge):**
- NONE - Code is ready to merge! ✅

**Short-term (Next Sprint):**
- Consider adding rate limiting to prevent abuse
- Add audit logging for compliance tracking
- Enhance API documentation with more examples

**Long-term (Future Stories):**
- Bulk import staff via CSV upload
- Staff activity history tracking
- Email notifications when added to whitelist

### Decision
✅ **APPROVED - READY FOR MERGE**

All acceptance criteria satisfied, no blocking issues, excellent code quality and security implementation. Story 1.4 is production-ready!

## Change Log

- 2026-03-19: **Bổ sung yêu cầu:** Thêm mật khẩu (thủ công hoặc mặc định) khi tạo tài khoản nhân viên. Status chuyển về in-progress.
- 2026-03-03: **QA Review completed** - APPROVED with 5/5 ratings, all 135 tests passing
- 2026-03-02: Fixed critical dependency injection bug in staff API (removed double Depends wrapping)
- 2026-03-02: Fixed test_staff_api.py to use ASGITransport and proper database override
- 2026-03-02: Implemented complete frontend staff management UI with TanStack Query integration
- 2026-03-02: All 135 backend tests passing, frontend build successful
