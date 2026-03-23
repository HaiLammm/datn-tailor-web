# Unified Story 3.4: Đóng gói dữ liệu SSOT (Master Geometry JSON Generation)

Status: done

## Phase 1 — Requirements (Original)
> Nguồn: docs/3-4-dong-goi-du-lieu-ssot.md

### Story

As a **Hệ thống**,
I want **đóng gói toàn bộ thông số hình học sau biến đổi vào một file JSON duy nhất**,
So that **dữ liệu được truyền tải và lưu trữ đồng nhất (Single Source of Truth)**.

### Acceptance Criteria

- [x] **Given** Người dùng nhấn "Lock Design" để hoàn tất thiết kế
- [x] **When** Hệ thống gửi yêu cầu lưu trữ
- [x] **Then** Một file Master Geometry JSON được tạo ra chứa: sequence_id, base_hash, deltas, và geometry_hash
- [x] **And** Hệ thống kiểm tra tính toàn vẹn (Checksum) trước khi lưu vào Database (NFR5)

## Phase 2 — Implementation
> Không có story Phase 2 tương ứng — story chỉ tồn tại trong Phase 1

## Traceability
- Phase 1 Story: 3.4 - Đóng gói dữ liệu SSOT
- Phase 2 Story: N/A
- Epic: 8
