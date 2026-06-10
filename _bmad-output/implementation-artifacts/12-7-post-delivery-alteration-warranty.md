# Story 12.7: Post-Delivery Alteration Warranty — Bảo hành chỉnh sửa sau giao

Status: ready-for-dev

<!-- Source: SCP 2026-06-10 (domain research gap #2 — FR101). Depends on Story 12.6 (task_type mechanics introduced here, fitting service patterns). -->

## Story

As a Customer (Khách hàng),
I want to request a free fit alteration within the warranty window after receiving my bespoke áo dài,
so that I get the fit promise that reputable tailor shops provide.

## Acceptance Criteria

1. **AC1 — Migration & Settings:** Migration `045_alteration_warranty.sql` (idempotent): (a) `ALTER TABLE tenants ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT '{}'`; (b) `ALTER TABLE tailor_tasks ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) NOT NULL DEFAULT 'production'` + CHECK in ('production','alteration') + index. ORM (`TenantDB.settings`, `TailorTaskDB.task_type`) + Pydantic updated; `TailorTaskResponse` exposes `task_type`. Warranty days resolved via `tenant.settings.get("alteration_warranty_days", 30)`.

2. **AC2 — Alteration Request Endpoint:** Given a bespoke order with status `delivered` or `completed` and `delivery_date` (fallback `updated_at` of delivered transition) within the warranty window, when the order's Customer POSTs `/api/v1/orders/{order_id}/request-alteration` with `{description}` (min 10 chars — mô tả chỗ chưa vừa), then an `alteration_requests` record is NOT created (no new table) — instead a `task_history`-auditable **alteration task** request is stored as a notification to Owner (`notification_type="alteration_requested"`, data: order_id, description) and the order gains a pending marker via `orders.alteration_requested_at` (TIMESTAMPTZ nullable, same migration). Outside the window → 422 với thông báo tiếng Việt rõ ràng ("Đã quá thời hạn chỉnh sửa miễn phí (X ngày). Vui lòng liên hệ tiệm."). Non-bespoke or wrong status → 400. Duplicate open request → 409.

3. **AC3 — Owner Approval Creates Alteration Task:** Given a pending alteration request, when Owner POSTs `/api/v1/orders/{order_id}/approve-alteration` with `{tailor_id?, deadline?, notes?}`, then a new TailorTask is created with `task_type='alteration'`, status `unassigned` (or `assigned` if tailor_id given), stage logs created from reduced stage list `["alteration", "finishing"]`, `orders.alteration_requested_at` cleared, customer notified ("Yêu cầu chỉnh sửa đã được tiếp nhận"), assigned tailor notified. Alteration tasks flow through the existing 11-state machine unchanged (accept → start → stages → submit-qc → qc-result).

4. **AC4 — Completion & Re-handover:** Given the alteration task passes QC (`process_qc_result` pass), then the order does NOT re-enter the production pipeline: order status stays `completed` (or `delivered`), and the customer receives "Áo đã chỉnh xong — mời bạn tới nhận" (`notification_type="alteration_done"`). The existing QC-pass order-sync logic must EXCLUDE `task_type='alteration'` tasks from the in_production → ready_* transition check.

5. **AC5 — Customer UI:** Given a bespoke order `delivered`/`completed` within the warranty window, the customer order detail shows remaining window ("Còn X ngày để yêu cầu chỉnh sửa miễn phí") and button "Yêu cầu chỉnh sửa" opening a simple form (textarea mô tả chỗ chưa vừa, min 10 chars, Zod). Outside window: contact CTA ("Liên hệ tiệm") instead — no button. Pending request → trạng thái "Đã gửi yêu cầu — chờ tiệm xác nhận". Plain Vietnamese only.

6. **AC6 — Owner Order Board:** Orders with pending alteration request show badge "Yêu cầu chỉnh sửa" on the Order Board; OrderDetailDrawer gains an approve panel (assign tailor select + deadline + approve button, following 10.7b control patterns). Alteration tasks display a distinguishing badge ("Sửa đồ" — amber) in owner task views via `task_type`.

7. **AC7 — Tests:** BE: window math (inside/outside/boundary day), duplicate request 409, approve creates task with reduced stages, QC-pass exclusion (AC4), settings default fallback. FE: window rendering states, request form validation, owner approve flow. Full suites green; tsc clean.

## Tasks / Subtasks

- [ ] Task 1: Migration 045 + ORM + schemas (AC: 1, 2)
  - [ ] 1.1 tenants.settings JSONB, tailor_tasks.task_type, orders.alteration_requested_at — idempotent SQL + indexes
  - [ ] 1.2 ORM + Pydantic sync (Base.metadata check — schema-drift discipline)
- [ ] Task 2: Backend service + endpoints (AC: 2, 3, 4)
  - [ ] 2.1 `request_alteration()` — window validation (delivery_date fallback chain), duplicate guard, notification to Owner
  - [ ] 2.2 `approve_alteration()` — create alteration task (reuse create-task path from approve flow Story 10.4/12.x; stage list ["alteration","finishing"]), notifications
  - [ ] 2.3 Exclude alteration tasks in `process_qc_result` order-sync; add `alteration_done` notification on QC pass for alteration tasks
  - [ ] 2.4 Routes in `backend/src/api/v1/orders.py`: POST request-alteration (Customer own order), POST approve-alteration (Owner)
  - [ ] 2.5 GARMENT_STAGES: add `"alteration": ["alteration", "finishing"]` entry (stage key bypasses garment-name resolution for task_type=alteration); FE STAGE_LABELS add `alteration: "Chỉnh sửa"`
- [ ] Task 3: Customer UI (AC: 5)
  - [ ] 3.1 Server action `requestAlteration(orderId, description)` — discriminated-result pattern
  - [ ] 3.2 Warranty window strip + form + pending state in `OrderDetailModal.tsx`
- [ ] Task 4: Owner UI (AC: 6)
  - [ ] 4.1 Badge "Yêu cầu chỉnh sửa" in OrderBoardClient rows (data từ order response: alteration_requested_at)
  - [ ] 4.2 Approve panel in OrderDetailDrawer (mutation theo pattern refundMutation 10.7b)
  - [ ] 4.3 Task badge "Sửa đồ" theo task_type trong owner task views (ProductionTaskTable badge — additive)
- [ ] Task 5: Tests (AC: 7) — BE `test_12_7_alteration_warranty.py` + FE tests; full suites + tsc

## Dev Notes

### Architecture Compliance

- **Lightweight by design (FR101):** KHÔNG tái nhập pipeline sản xuất; KHÔNG thêm trạng thái mới trên orders.status. Marker duy nhất: `alteration_requested_at` + alteration task.
- **Event tracking:** request/approve/complete đều có notification + task_history (task lifecycle tự sinh qua state machine).
- **Settings:** JSONB trên tenants (Option A — đơn giản, khớp pattern geometry_params JSONB). Đọc qua helper `get_tenant_setting(tenant, key, default)` để tái dùng cho setting tương lai.
- **12.5/12.6 patterns:** discriminated-result server actions; optimistic locking version optional; plain Vietnamese Boutique Mode.

### Existing Code to Reuse — DO NOT Reinvent

- Task creation path từ owner approve (Story 10.4 auto-routing / 12.x create_task with unassigned default) — alteration task đi cùng đường, chỉ khác `task_type` + stage list.
- `_create_stage_logs(db, task_id, tenant_id, stage_key)` — truyền key `"alteration"`.
- `process_qc_result` (`tailor_task_service.py:438-460`) — chỗ DUY NHẤT cần sửa cho AC4 (exclude alteration khỏi order-sync + notification riêng).
- 10.7b mutation/control pattern trong `OrderBoardClient.tsx` (~265-290) + `OrderDetailDrawer.tsx`.
- `create_notification` templates (notification_creator.py) — thêm `alteration_requested`, `alteration_approved`, `alteration_done`.

### Key Facts (verified 2026-06-10)

- `TenantDB` chưa có settings (db_models.py:29-52) — AC1 thêm.
- `orders.delivery_date` tồn tại (db_models.py:308-406) nhưng có thể null → fallback: thời điểm transition sang delivered trong lịch sử, cuối cùng `updated_at`. Ghi rõ chain trong code.
- Migration kế tiếp sau 12.6 (044) là **045**.
- `process_qc_result` hiện check "ALL tailor tasks for order completed" → alteration task của đơn completed sẽ làm logic này chạy lại — phải exclude theo task_type để không transition đơn đã completed.

### Anti-Patterns to Avoid

1. DO NOT tạo bảng alteration_requests riêng — yêu cầu sống trong notification + marker + task (đủ audit, ít schema).
2. DO NOT cho phép request trên đơn buy/rent — bespoke only (400).
3. DO NOT tự động tạo task khi khách request — Owner approve là gate (đúng thông lệ tiệm).
4. DO NOT đổi hành vi QC/order-sync cho production tasks — chỉ THÊM nhánh exclude.

### Previous Story Intelligence

- 12.6 introduces fitting service patterns + notification templates style — đặt code alteration cạnh đó cho gọn.
- 12.5 review: mọi mutation FE phải refetch (loadDetail/invalидate), conflict → toast + refetch + invalidate list.
- Dự án hay lệch model↔migration — chạy đối chiếu Base.metadata vs DB reflect trước khi kết thúc Task 1.

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-10.md — Proposal 2B, 3 (Story 12.7), 4B]
- [Source: _bmad-output/planning-artifacts/research/domain-quy-trinh-tiem-may-ao-dai-research-2026-06-10.md — warranty windows 7d–6mo, no industry standard]
- [Source: backend/src/services/tailor_task_service.py — process_qc_result:438-460, _create_stage_logs:204]
- [Source: backend/src/services/notification_creator.py:216-252]
- [Source: frontend/src/components/client/orders/OrderBoardClient.tsx — refundMutation ~265-290 (10.7b pattern)]
- [Source: frontend/src/components/client/orders/OrderDetailModal.tsx]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### Change Log

### File List
