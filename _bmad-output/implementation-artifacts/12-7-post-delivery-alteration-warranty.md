# Story 12.7: Post-Delivery Alteration Warranty — Bảo hành chỉnh sửa sau giao

Status: done

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

- [x] Task 1: Migration 045 + ORM + schemas (AC: 1, 2)
  - [x] 1.1 tenants.settings JSONB, tailor_tasks.task_type, orders.alteration_requested_at — idempotent SQL + indexes
  - [x] 1.2 ORM + Pydantic sync (Base.metadata check — schema-drift discipline)
- [x] Task 2: Backend service + endpoints (AC: 2, 3, 4)
  - [x] 2.1 `request_alteration()` — window validation (delivery_date fallback chain), duplicate guard, notification to Owner
  - [x] 2.2 `approve_alteration()` — create alteration task (reuse create-task path from approve flow Story 10.4/12.x; stage list ["alteration","finishing"]), notifications
  - [x] 2.3 Exclude alteration tasks in `process_qc_result` order-sync; add `alteration_done` notification on QC pass for alteration tasks
  - [x] 2.4 Routes in `backend/src/api/v1/orders.py`: POST request-alteration (Customer own order), POST approve-alteration (Owner)
  - [x] 2.5 GARMENT_STAGES: add `"alteration": ["alteration", "finishing"]` entry (stage key bypasses garment-name resolution for task_type=alteration); FE STAGE_LABELS add `alteration: "Chỉnh sửa"`
- [x] Task 3: Customer UI (AC: 5)
  - [x] 3.1 Server action `requestAlteration(orderId, description)` — discriminated-result pattern
  - [x] 3.2 Warranty window strip + form + pending state in `OrderDetailModal.tsx`
- [x] Task 4: Owner UI (AC: 6)
  - [x] 4.1 Badge "Yêu cầu chỉnh sửa" in OrderBoardClient rows (data từ order response: alteration_requested_at)
  - [x] 4.2 Approve panel in OrderDetailDrawer (mutation theo pattern refundMutation 10.7b)
  - [x] 4.3 Task badge "Sửa đồ" theo task_type trong owner task views (ProductionTaskTable badge — additive)
- [x] Task 5: Tests (AC: 7) — BE `test_12_7_alteration_warranty.py` + FE tests; full suites + tsc

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

Claude Fable 5 (claude-fable-5)

### Debug Log References

- Targeted suites (state_machine, tailor_task_service, tailor_task_api, 12.3, 12.6, 12.7): 183 passed.
- Full backend suite (`--ignore=tests/test_lead_conversion_service.py`): 1263 passed, 15 failed / 39 errors — identical to the documented pre-existing baseline (payment/rental/order_customer/staff/export modules). No new failures.
- Frontend: `npx jest --silent` → 1031 passed, 1 failed (`BookingCalendar.test.tsx` — pre-existing date-rot). `npx tsc --noEmit` → 582 repo-wide errors = pre-existing baseline; zero errors in any touched file (the single grep hit on "OrderDetailModal" is the untouched legacy `OrderDetailModal.test.tsx`).
- One deliberate test update in `test_12_6_fitting_rounds.py`: the 044 notification-CHECK coverage test now asserts against the LATEST migration that rebuilds `chk_notification_type` (045 supersedes 044's constraint), so every future notification type forces a new rebuild instead of silently breaking the test.

### Completion Notes List

- **AC1:** Migration `045_alteration_warranty.sql` (idempotent: IF NOT EXISTS + DO $$ guard for the CHECK, 043/044 style): `tenants.settings JSONB NOT NULL DEFAULT '{}'::jsonb`, `tailor_tasks.task_type VARCHAR(20) NOT NULL DEFAULT 'production'` + `chk_tailor_task_type` CHECK + `idx_tailor_tasks_task_type`, `orders.alteration_requested_at TIMESTAMPTZ NULL`, and the `chk_notification_type` rebuild (044's 20 types + `alteration_requested`/`alteration_approved`/`alteration_done` = 23). ORM mirrors all of it (`TenantDB.settings`, `TailorTaskDB.task_type` + `__table_args__` CheckConstraint, `OrderDB.alteration_requested_at`); `TailorTaskResponse.task_type` exposed via `_task_to_response` (so OwnerTaskItem/detail responses carry it too). Warranty days via new `get_tenant_setting(tenant, key, default)` helper (`tenant_settings.py`) — defensive against NULL settings on pre-migration rows; default 30. Migration↔ORM consistency asserted in tests (Base.metadata vs 045 SQL).
- **AC2:** `alteration_service.request_alteration()` — tenant + customer-own scoped lookup (404, no existence oracle, matches the customer order detail endpoint), bespoke-only 400, delivered/completed-only 400, duplicate guards 409 (pending marker OR open alteration task; a completed/cancelled alteration task does NOT block a new request), window 422 with the exact message "Đã quá thời hạn chỉnh sửa miễn phí (X ngày). Vui lòng liên hệ tiệm." Window anchor `resolve_window_anchor()`: `delivery_date` → `updated_at` (documented in code: there is NO order status history table — the customer timeline is synthetic interpolation — so the delivered-transition timestamp is not persisted; to keep the proxy stable, request/approve deliberately do NOT bump `order.updated_at`). Boundary day inclusive (`now <= anchor + days`); `remaining_days` rounded up. On success: marker set + owner notification `alteration_requested` (description in message + data — no new table by design). Min-10-chars enforced by Pydantic (`AlterationRequestCreate`).
- **AC3:** `alteration_service.approve_alteration()` (Owner, FOR UPDATE) — 400 without pending marker, 409 if an alteration task is already open, tailor validation identical to the create-task path (role/active/tenant). Creates `TailorTaskDB(task_type='alteration', status='assigned'|'unassigned')` with garment_name from the first order item (create_task fallback) and stage logs from the reduced `GARMENT_STAGES["alteration"] = ["alteration","finishing"]` list (consecutive stage_order, first in_progress). Marker cleared; customer notified "Yêu cầu chỉnh sửa đã được tiếp nhận" (`alteration_approved`), assigned tailor notified (`task_assigned`). The task flows through the existing 11-state machine untouched: `start_task` and the QC-rework reset now derive the stage key via `_resolve_stage_key_for_task()` (task_type wins over garment-name resolution), so both recreate the same reduced list.
- **AC4:** `process_qc_result` pass branch gained an ADD-only exclusion: `task_type='alteration'` tasks skip the order-sync entirely (no FOR UPDATE on the order, no `in_production → ready_*` check, the delivered/completed order is never re-transitioned) and the customer gets `alteration_done` "Áo đã chỉnh xong — mời bạn tới nhận" instead of the production `qc_passed`/ready notifications. Production-task behavior byte-for-byte unchanged (regression-tested: in_production order still syncs to ready_to_ship with both notifications). QC-rework on an alteration task resets stage logs to the alteration list, not the garment list.
- **AC5:** Server-authoritative window: `compute_alteration_info()` returns `AlterationInfo {state: available|pending|in_alteration|expired, warranty_days, remaining_days, requested_at}` additively on the customer order detail (`CustomerOrderDetail.alteration`, bespoke delivered/completed only). `OrderDetailModal` renders it verbatim: available → emerald strip "Còn X ngày để yêu cầu chỉnh sửa miễn phí" + button "Yêu cầu chỉnh sửa" → textarea form (Zod min 10, message "Vui lòng mô tả chỗ chưa vừa (ít nhất 10 ký tự)"); pending → "Đã gửi yêu cầu — chờ tiệm xác nhận"; in_alteration → "Tiệm đang chỉnh sửa áo cho bạn — sẽ báo khi xong"; expired → explanation + "Liên hệ tiệm" CTA → `/contact` (no request button). Successful submit flips locally to pending. All copy plain Vietnamese; backend errors surfaced verbatim.
- **AC6:** `alteration_requested_at` added additively to `OrderListItem` + `OrderResponse` (set in `list_orders` / `get_order_with_transactions`). Order Board row badge "Yêu cầu chỉnh sửa" (amber, OrderTable status cell). `OrderDetailDrawer` approve panel (10.7b control pattern): tailor select ("Chưa giao thợ (giao sau)" option), deadline date input, "Tiếp nhận chỉnh sửa" button → `approveAlteration()` server action (postMutation, 12.6 generalization); success/conflict → `onRefresh()`, failure → inline error. `ProductionTaskTable` amber badge "Sửa đồ" by `task_type` (additive; FE `TaskType` optional on `TailorTask` for old fixtures). FE `STAGE_LABELS.alteration = "Chỉnh sửa"`.
- **AC7:** 46 new backend tests (`test_12_7_alteration_warranty.py`: migration↔ORM consistency incl. notification CHECK enum coverage, settings helper, window inside/outside/boundary-day ±2min, tenant override + default fallback, delivery_date→updated_at fallback, duplicate 409 ×2, non-bespoke/wrong-status 400, ownership 404, approve happy paths ×2 + guards, start_task/QC-pass/QC-rework alteration lifecycle, production QC-pass regression, compute_alteration_info state matrix, 3-type notification serialization, task_type in response) + 15 new FE tests (`AlterationWarranty.test.tsx`: 4 window states + no-section, Zod validation block, submit→pending flip, server-error verbatim, drawer panel render/approve-with-tailor/approve-unassigned/error, task badge ±). Full suites green vs documented baselines; tsc clean on touched files.
- Server-action split (deliberate): `requestAlteration` lives in `order-actions.ts` hand-rolled on the ActionResult pattern (the customer must see the backend's exact Vietnamese 409/422 copy — `postMutation` swallows the 409 detail behind the generic optimistic-lock message); `approveAlteration` reuses `postMutation` (owner flow, fits the 12.5/12.6 helper exactly).
- Anti-patterns honored: no alteration_requests table; no new orders.status value; buy/rent orders 400 on request; customer request never auto-creates a task (owner approval is the gate); production QC/order-sync behavior unchanged (exclusion branch only); AC5 fitting gate untouched (alteration stage list has no fitting stage).

### Change Log

- 2026-06-11: Story 12.7 implemented (migration 045 — tenants.settings / tailor_tasks.task_type / orders.alteration_requested_at / chk_notification_type rebuild; alteration_service with server-authoritative warranty window + request/approve flows; GARMENT_STAGES alteration entry + task_type-derived stage-key resolution in start/rework; process_qc_result alteration exclusion + alteration_done notification; POST request-alteration / approve-alteration endpoints; customer warranty section in OrderDetailModal; owner board badge + drawer approve panel + "Sửa đồ" task badge; 46 BE + 15 FE tests). Status → review. Migration 045 NOT applied to any live DB.
- 2026-06-11: Code review round 1 (3-layer adversarial) — 8 findings fixed, 1 deferred (see below). Migration 045 applied to dev DB (:5433, backfilled delivery_date for 3 orders). Status → done.

## Code Review Round 1 (2026-06-11)

3-layer adversarial review (Blind Hunter / Edge Case Hunter / Acceptance Auditor). 9 deduped findings → 8 patched, 1 deferred.

**Patched:**
1. **[Critical]** `resolve_cancellation_request(approve)` unconditionally set `order.status = "cancelled"` — approving a tailor's cancellation on an alteration task cancelled the delivered/paid order. Fix: alteration branch cancels the task only, order untouched, pending marker + note restored so Owner can re-approve. Bonus find during the sweep: the reassign path (`_create_task_no_commit`) dropped `task_type`, silently converting reassigned alteration tasks into production tasks — fixed.
2. **[High]** Warranty anchor was effectively `order.updated_at` (no write path for `delivery_date` existed) → window re-armed on every owner mutation (delivered→completed = +30 ngày). Fix: `update_order_status` stamps `delivery_date` once on entering delivered/completed; migration 045 backfills legacy rows; `updated_at` demoted to documented legacy fallback.
3. **[Medium]** `get_tenant_setting` crashed (AttributeError → 500 on every customer order detail) when `tenants.settings` is a JSONB scalar/array. Fix: isinstance dict guard → default.
4. **[Medium]** Customer's alteration description lived only in a best-effort notification (swallowed on inactive owner / insert failure) → Owner approved blind. Fix: new `orders.alteration_request_note` column persists it transactionally; copied into the alteration task's notes on approve; shown directly in the drawer approve panel and the customer pending strip.
5. **[Low]** Whitespace-only description passed server validation. Fix: Pydantic strip + min 10 post-strip.
6. **[Low]** Drawer approve panel kept tailor/deadline/error state across different orders. Fix: reset effect keyed on order id.
7. **[Low]** Docstring promised "one free alteration" while behavior (deliberate, owner-gated) allows repeats within the window. Fix: docstrings corrected; grep confirmed no customer copy says "một lần".
8. **[Low]** Approve-conflict 409 silently swallowed + generic copy. Fix: `postMutation` opt-in `verbatim409` (other callers byte-identical); drawer shows the backend's exact message and refreshes.

**Deferred:** `approve_alteration` mirrors (not reuses) `create_task`'s tailor-validation block — structurally defensible (different status preconditions, HTTPException vs ValueError), noted as refactor debt.

**Post-fix verification:** targeted BE suites 207 passed; full BE suite 1287 passed / 15 failed / 39 errors (= baseline); FE jest 1035 passed / 1 pre-existing failure; tsc clean on touched files. Migration 045 applied to dev DB — 4 columns + rebuilt `chk_notification_type` verified, delivery_date backfill = 3 rows, 0 delivered/completed orders left without anchor.

### File List

**Backend (new):**
- `backend/migrations/045_alteration_warranty.sql`
- `backend/src/models/alteration.py`
- `backend/src/services/alteration_service.py`
- `backend/src/services/tenant_settings.py`
- `backend/tests/test_12_7_alteration_warranty.py`

**Backend (modified):**
- `backend/src/models/db_models.py` — `TenantDB.settings`, `TailorTaskDB.task_type` + `chk_tailor_task_type`, `OrderDB.alteration_requested_at`
- `backend/src/models/notification.py` — 3 new `NotificationType` values
- `backend/src/models/tailor_task.py` — `TailorTaskResponse.task_type`
- `backend/src/models/order.py` — `alteration_requested_at` on `OrderResponse` + `OrderListItem`
- `backend/src/models/order_customer.py` — `CustomerOrderDetail.alteration`
- `backend/src/services/tailor_task_service.py` — GARMENT_STAGES `alteration`, `_resolve_stage_key_for_task()`, start/rework stage-key derivation, AC4 QC-pass exclusion + `alteration_done`, `task_type` in `_task_to_response`
- `backend/src/services/notification_creator.py` — `ALTERATION_REQUESTED_OWNER`, `ALTERATION_APPROVED_CUSTOMER`, `ALTERATION_DONE_CUSTOMER`
- `backend/src/services/order_service.py` — `alteration_requested_at` in list/detail responses
- `backend/src/services/order_customer_service.py` — `compute_alteration_info` wired into customer detail
- `backend/src/api/v1/orders.py` — POST `/{order_id}/request-alteration`, POST `/{order_id}/approve-alteration`
- `backend/tests/test_12_6_fitting_rounds.py` — notification-CHECK test now targets the latest constraint rebuild (045)

**Frontend (new):**
- `frontend/src/__tests__/AlterationWarranty.test.tsx`

**Frontend (modified):**
- `frontend/src/types/tailor-task.ts` — `STAGE_LABELS.alteration`, `TaskType`, `TailorTask.task_type?`
- `frontend/src/types/order.ts` — `AlterationState`/`AlterationInfo`/`AlterationRequestResult`, `CustomerOrderDetail.alteration`, `alteration_requested_at` on `OrderResponse` + `OrderListItem`
- `frontend/src/app/actions/order-actions.ts` — `requestAlteration()` (ActionResult, verbatim backend errors)
- `frontend/src/app/actions/tailor-task-actions.ts` — `approveAlteration()` via `postMutation`
- `frontend/src/components/client/orders/OrderDetailModal.tsx` — warranty section (strip/form/pending/in-alteration/expired + `/contact` CTA)
- `frontend/src/components/client/orders/OrderTable.tsx` — board badge "Yêu cầu chỉnh sửa"
- `frontend/src/components/client/orders/OrderDetailDrawer.tsx` — approve panel
- `frontend/src/components/client/production/ProductionTaskTable.tsx` — badge "Sửa đồ"
