# Unified Story 1.5: Khởi tạo Tài khoản Chủ tiệm

Status: Phase 1 only — not implemented in Phase 2

## Phase 1 — Requirements (Original)
> Nguồn: docs/1-5-khoi-tao-tai-khoan-chu-tiem.md

## Story

As a **Quản trị viên hệ thống**,
I want **tài khoản chủ tiệm được cấu hình cứng trong file backend**,
so that **hệ thống luôn có một tài khoản quản trị tối cao (Owner) ngay khi khởi tạo**.

## Acceptance Criteria

1.  **Configuration Source:** Hệ thống phải lấy `OWNER_EMAIL` từ file cấu hình backend (`config.py` hoặc biến môi trường).
2.  **Startup Enforcement:** Khi Backend khởi động, hệ thống phải tự động kiểm tra xem Email này đã tồn tại trong bảng `users` chưa.
3.  **Role Elevation:** Nếu đã tồn tại, đảm bảo vai trò (role) của user này là `Owner`. Nếu chưa tồn tại, tạo mới một bản ghi user ở trạng thái `Active` với vai trò `Owner`.
4.  **Static Logic Integration:** Logic `determine_role` trong `auth_service.py` phải ưu tiên kiểm tra `OWNER_EMAIL` trước khi kiểm tra `staff_whitelist` hoặc các nguồn khác.
5.  **Knowledge Protection:** Chỉ tài khoản có vai trò `Owner` mới được phép truy cập và chỉnh sửa các bí kíp "Golden Rules" (Hầm chứa tri thức).

## Phase 2 — Implementation
> Không có story Phase 2 tương ứng

## Traceability
- Phase 1 Story: 1.5 — Khởi tạo Tài khoản Chủ tiệm (System Seed)
- Phase 2 Story: N/A
- Epic: 1
