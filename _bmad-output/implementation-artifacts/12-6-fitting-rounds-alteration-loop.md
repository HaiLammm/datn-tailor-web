# Story 12.6: Fitting Rounds & Alteration Loop — Vòng thử đồ và chỉnh sửa

Status: done

<!-- Source: SCP 2026-06-10 (domain research gap #1 — FR87 amended, FR100). -->

## Story

As a Owner (Chủ tiệm),
I want the bespoke production flow to support repeatable fitting rounds — inviting the customer to a fitting appointment, recording each round's outcome and adjustment notes, and looping back to alteration when needed,
so that the shop's digital workflow matches the real tailoring practice of 1–2 fitting rounds before finishing.

## Acceptance Criteria

1. **AC1 — Migration & Data Model:** Given migration `044_add_fitting_rounds.sql` runs, then table `fitting_rounds` exists with columns: `id` (UUID PK), `tenant_id` (FK → tenants), `order_id` (FK → orders), `task_id` (FK → tailor_tasks), `round_number` (INT NOT NULL), `appointment_id` (UUID nullable, no FK constraint — appointments are guest-booked and unlinked), `outcome` (VARCHAR(20) CHECK in ('passed','needs_alteration')), `notes` (TEXT nullable), `fitted_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ default now), with indexes on `order_id`, `task_id`, `tenant_id`. ORM model `FittingRoundDB` + Pydantic schemas (`FittingRoundCreate`, `FittingRoundResponse`) exist and match (no model↔migration drift — verify with Base.metadata).

2. **AC2 — Fitting Stage in GARMENT_STAGES:** `GARMENT_STAGES` inserts `fitting` after `assembly` in all 3 stage sets (default, ao_dai, wedding). Frontend `STAGE_LABELS` gains `fitting: "Thử đồ"`. Tasks already in_progress before this change keep their old stage list (stage logs are snapshotted at start) — no backfill.

3. **AC3 — Customer Invitation Notification:** Given a bespoke task's `fitting` stage transitions to `in_progress` (via `complete_stage` of the previous stage), when the order has a linked customer (`orders.customer_id` not null), then `create_notification` is called with `notification_type="fitting_ready"`, title "Mời bạn tới thử đồ", message chứa tên sản phẩm và hướng dẫn đặt lịch, `data={"order_id": ..., "booking_url": "/booking"}`. No customer linked → skip silently.

4. **AC4 — Record Fitting Round:** Given an Owner or the assigned Tailor POSTs `/api/v1/orders/{order_id}/fitting-rounds` with `{outcome: "needs_alteration", notes, appointment_id?, version?}`, then a `fitting_rounds` row is created with auto-incremented `round_number` (per order), the task's `fitting` stage log stays `in_progress`, a `task_history` event `fitting_round_recorded` is written (metadata: round_number, outcome), and the customer receives notification "Đang chỉnh sửa theo góp ý của bạn" (`notification_type="fitting_alteration"`). With `{outcome: "passed"}`, additionally the `fitting` stage log is marked `completed` and the next stage starts (same mechanics as `complete_stage`), and customer receives "Thử đạt — đang hoàn thiện" (`notification_type="fitting_passed"`). Endpoint requires the order to be bespoke, in_production, with a task whose current in_progress stage is `fitting`; otherwise 400 with specific Vietnamese message.

5. **AC5 — Fitting Stage Gate:** Given the task's current in_progress stage is `fitting`, when `POST /tailor-tasks/{id}/stages/{order}/complete` is called directly, then it returns 400 "Cần ghi nhận kết quả thử đồ đạt (qua Vòng thử) trước khi hoàn thành bước Thử đồ" unless a `fitting_rounds` row with `outcome='passed'` exists for the task. (Recording a passed round via AC4 is the normal path and already advances the stage.)

6. **AC6 — Round History:** `GET /api/v1/orders/{order_id}/fitting-rounds` returns rounds ordered by `round_number` asc. Accessible to Owner, the assigned Tailor, and the order's own Customer (403 for others' orders; tenant-scoped).

7. **AC7 — Customer Order Detail (Boutique Mode, plain Vietnamese):** Given a bespoke order `in_production` whose task fitting stage is active or has rounds, when the customer opens order detail, then a fitting progress strip shows: "Chờ bạn tới thử" (fitting in_progress, no round or last round passed not yet recorded), "Đang chỉnh sửa theo góp ý của bạn" (last outcome needs_alteration), "Thử đạt — đang hoàn thiện" (last outcome passed). Round list renders "Vòng thử 1, Vòng thử 2…" with notes. CTA "Đặt lịch thử đồ" links to `/booking`. NO English/technical terms (no "Fitting"/"Alteration").

8. **AC8 — Tailor/Owner Recorder UI:** In tailor TaskDetailModal, when the current stage is `fitting`, the stage row shows a recorder: outcome toggle "Đạt" / "Cần chỉnh sửa" + notes textarea + confirm button (min-h 44px), calling the AC4 endpoint via a server action following the 12.5 discriminated-result pattern (`{success}|{success:false, conflict?, error}`); 409 → toast + refetch. After recording, modal refetches detail (stage list + rounds reflect new state).

9. **AC9 — Tests:** Backend: migration/ORM consistency, AC4 happy paths (both outcomes), AC5 gate, AC6 authorization matrix, notification calls (mock), round_number auto-increment. Frontend: progress strip state mapping (3 states), recorder interaction + conflict path. Full BE + FE suites green; tsc clean.

## Tasks / Subtasks

- [x] Task 1: Migration 044 + ORM + schemas (AC: 1)
  - [x] 1.1 `backend/migrations/044_add_fitting_rounds.sql` — idempotent (IF NOT EXISTS), indexes, CHECK constraint on outcome
  - [x] 1.2 `FittingRoundDB` in `backend/src/models/db_models.py` (follow TaskStageLogDB style ~line 720)
  - [x] 1.3 Pydantic: `FittingRoundCreate` (outcome, notes?, appointment_id?, version?), `FittingRoundResponse` in `backend/src/models/order.py` or new `fitting.py`
- [x] Task 2: GARMENT_STAGES + labels (AC: 2)
  - [x] 2.1 Insert `fitting` after `assembly` in all sets (`tailor_task_service.py:105-109`)
  - [x] 2.2 FE `STAGE_LABELS` add `fitting: "Thử đồ"` (`frontend/src/types/tailor-task.ts`)
- [x] Task 3: Service + endpoints (AC: 3, 4, 5, 6)
  - [x] 3.1 `fitting_service.py` (or extend order_service): `record_fitting_round()`, `list_fitting_rounds()` — tenant-scoped, role checks
  - [x] 3.2 Hook in `complete_stage` (`tailor_task_service.py`): when next stage starting is `fitting` → AC3 notification; when stage being completed is `fitting` → AC5 gate (require passed round)
  - [x] 3.3 `record_fitting_round` passed-outcome path reuses the stage-advance mechanics (call/share complete_stage logic, do NOT duplicate)
  - [x] 3.4 Routes: `POST/GET /api/v1/orders/{order_id}/fitting-rounds` in `backend/src/api/v1/orders.py` (follow existing order endpoint auth patterns)
  - [x] 3.5 Notification templates in `notification_creator.py` (fitting_ready, fitting_alteration, fitting_passed) — plain Vietnamese
  - [x] 3.6 `task_history` events (action: `fitting_round_recorded`)
- [x] Task 4: Customer order detail UI (AC: 7)
  - [x] 4.1 Server action `fetchFittingRounds(orderId)` (customer-scoped)
  - [x] 4.2 Fitting progress strip + round list in `OrderDetailModal.tsx` (Boutique Mode, plain Vietnamese), CTA `/booking`
- [x] Task 5: Tailor recorder UI (AC: 8)
  - [x] 5.1 Server action `recordFittingRound(orderId, body)` — discriminated-result pattern (12.5)
  - [x] 5.2 Recorder block in `TaskDetailModal.tsx` fitting stage row (toggle + notes + confirm, 44px targets)
- [x] Task 6: Tests (AC: 9)
  - [x] 6.1 BE: `test_12_6_fitting_rounds.py` — follow `test_tailor_task_service.py` fixture pattern (sqlite in-memory)
  - [x] 6.2 FE: strip state mapping + recorder tests
  - [x] 6.3 Full suites: `cd backend && python -m pytest`, `cd frontend && npx tsc --noEmit && npx jest --silent`

## Dev Notes

### Architecture Compliance

- **Event-tracking principle (SCP 2026-05-01):** every round = one immutable `fitting_rounds` row + `task_history` event. Never overwrite outcome.
- **Authoritative Server:** round_number computed server-side (count per order, under the task FOR UPDATE lock); FE never sends it.
- **12.5 result pattern:** all new server actions return `{success, data?} | {success:false, conflict?, error}` — no throwing across the server-action boundary.
- **Optimistic locking:** `version` optional in body; stale → 409 (same as 12.5 fixes).
- **Plain Vietnamese (Boutique Mode):** customer copy exactly as in AC7; Command Mode (tailor) may use "Vòng thử".

### Existing Code to Reuse — DO NOT Reinvent

- `create_notification()` — `backend/src/services/notification_creator.py:216-252`; template dicts at top of that file (follow TASK_* message style).
- Stage mechanics: `complete_stage()` + `_create_stage_logs()` in `tailor_task_service.py` — share the advance logic for passed-outcome.
- `_get_task_for_transition` (FOR UPDATE) + `_transition_task` audit pattern.
- Auth dependencies in `backend/src/api/v1/tailor_tasks.py` (OwnerOrTailor) and customer-own-order checks in existing order detail endpoints.
- FE: `postTaskAction` helper (12.5, post-fix), `STAGE_LABELS`, toast pattern in `TaskDetailModal.tsx`; `OrderDetailModal.tsx` PIPELINE_STEPS area for the strip placement.

### Key Facts (verified 2026-06-10)

- `appointments` has NO FK to orders/customers and no purpose field (`db_models.py:528-562`); booking is public (`api/v1/appointments.py`). → `appointment_id` stays nullable, informational only. CTA links `/booking`; do NOT add appointment↔order FK in this story.
- `orders.customer_id` nullable — guard notification (AC3).
- Latest migration: 043 → this story creates **044**.
- QC-pass → order `ready_*` sync lives in `process_qc_result` (`tailor_task_service.py:438-460`) — fitting loop happens BEFORE submit-qc, no change to that sync.
- 12.5 review fixes (parallel work) changed: task detail now returns `stage_logs`/`history`; mutations accept `{version, notes}`; FE actions use discriminated results. Build on the post-fix state.

### Anti-Patterns to Avoid

1. DO NOT modify `process_qc_result`/rework mechanics — the fitting loop is pre-QC, the rework loop is post-QC. Separate concerns.
2. DO NOT create a new state on `orders.status` — the loop lives at stage-log + fitting_rounds level.
3. DO NOT add TanStack Query to tailor modal (keep useEffect+useState per 12.5).
4. DO NOT touch `frontend/src/components/client/production/` (owner production board) except if a badge is strictly needed — out of scope here (12.7 covers Order Board badge).
5. DO NOT hardcode customer copy in English or mixed terms.

### Previous Story Intelligence

- 12.5 review (2026-06-10): mutations must refetch detail (`loadDetail()`) — never `setDetail(actionResponse)`. Conflict branch must also invalidate parent list (`onTaskUpdated()`).
- 12.2: stage sequential enforcement — fitting stage participates in the same `stage_order` sequence; AC5 gate is an additional check inside `complete_stage` for the fitting stage only.
- Migration discipline: schema drift là rủi ro đã biết của dự án — đối chiếu `Base.metadata` với migration trước khi xong (Story 12.1 style).

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-06-10.md — Proposals 1–4]
- [Source: _bmad-output/planning-artifacts/research/domain-quy-trinh-tiem-may-ao-dai-research-2026-06-10.md — fitting practices, 1–2 rounds]
- [Source: backend/src/services/tailor_task_service.py — GARMENT_STAGES:105, complete_stage:~715, _transition_task:~123]
- [Source: backend/src/services/notification_creator.py:216-252]
- [Source: backend/src/models/db_models.py — TaskStageLogDB:720-757, AppointmentDB:528-562, OrderDB:308-406]
- [Source: frontend/src/components/client/orders/OrderDetailModal.tsx — PIPELINE_STEPS:15-22]
- [Source: frontend/src/components/client/tailor/TaskDetailModal.tsx — stage checklist]

## Dev Agent Record

### Agent Model Used

Claude Fable 5 (claude-fable-5)

### Debug Log References

- Baseline tailor suites before change: 87 passed. After stage-set change, 3 deliberate test updates in `test_state_machine.py` (6→7 ao_dai stages ×2, seeded passed round in full-happy-path for the AC5 gate).
- Full backend suite: 1193 passed, 15 failed / 39 errors — identical to the documented pre-existing baseline (payment/rental/order_customer/staff/export modules + `test_lead_conversion_service` collection error). No new failures.
- Frontend: `npx jest --silent` → 1013 passed, 1 failed (`BookingCalendar.test.tsx` — pre-existing date-rot, verified failing on clean tree via git stash; test clicks 2026-06-10 which is now in the past). `npx tsc --noEmit` → 582 errors vs 583 on clean tree — no new errors introduced.

### Completion Notes List

- **AC1:** Migration `044_add_fitting_rounds.sql` (idempotent, 034 table style) + `FittingRoundDB` ORM + `FittingRoundCreate`/`FittingRoundResponse` in new `backend/src/models/fitting.py`. `appointment_id` is a plain UUID column with NO FK (appointments are guest-booked/unlinked) — asserted in tests. Model↔migration consistency covered by tests comparing `FittingRoundDB.__table__` columns against the 044 SQL text.
- **AC2:** `fitting` inserted after `assembly` in all 3 GARMENT_STAGES sets; FE `STAGE_LABELS.fitting = "Thử đồ"`. No backfill — in-flight tasks keep their snapshotted stage logs.
- **AC3/AC5 (shared mechanics):** `complete_stage` body extracted into `_advance_current_stage()` (no flush/commit) which also enforces the AC5 fitting gate (exact Vietnamese 400 message). `complete_stage` calls it, commits, then fires `notify_fitting_stage_started()` (AC3, `fitting_ready`, data includes `booking_url: "/booking"`, silently skipped when `order.customer_id` is null). `record_fitting_round` passed-path reuses the same `_advance_current_stage` — zero duplication; the gate passes because the new round row is flushed first within the same transaction.
- **AC4:** `fitting_service.record_fitting_round()` validates bespoke + in_production + active in_progress task (FOR UPDATE) + current stage is `fitting`; Tailor must be the assignee (Owner always allowed); optional `version` → 409 via `_check_client_version`. `round_number = count(order rounds)+1` computed server-side under the task lock. Writes one immutable `fitting_rounds` row + `task_history` event `fitting_round_recorded` (metadata: round_number, outcome). Notifications: `fitting_alteration` ("Đang chỉnh sửa theo góp ý của bạn") / `fitting_passed` ("Thử đạt — đang hoàn thiện") per templates in `notification_creator.py`.
- **AC6:** `GET /orders/{id}/fitting-rounds` (CurrentUser) — Owner (tenant match incl. default-tenant rule), assigned Tailor, or order's own Customer; 403 otherwise; rounds ordered by round_number asc. Response `meta.fitting_stage_status` carries the fitting stage-log status of the latest active task so the customer strip can render the "waiting" state before any round exists (authoritative server — FE derives nothing from stage internals).
- **AC7:** Fitting section in customer `OrderDetailModal` (bespoke + in_production only): strip with exactly the 3 plain-Vietnamese states, round list "Vòng thử N" + notes + date, CTA "Đặt lịch thử đồ" → `/booking` (hidden once passed). No English/technical terms in customer copy.
- **AC8:** Recorder in `TaskDetailModal` fitting stage row: "Đạt"/"Cần chỉnh sửa" toggle + notes + confirm (all min-h-[44px]), prior rounds listed inline. The generic "Hoàn thành" button is hidden for the fitting stage (completion goes through the recorder; AC5 gate stays server-side). Mutation goes through `handleAction` → success/conflict both `loadDetail()` + `onTaskUpdated()`; rounds auto-refetch via a `detail`-keyed effect. `postTaskAction` was generalized into `postMutation(path,…)` so `recordFittingRound` (orders URL) shares the exact 12.5 discriminated-result/409 handling.
- **AC9:** 26 new backend tests (`test_12_6_fitting_rounds.py`: consistency, both outcomes, gate matrix, authz matrix, notification spies, round_number increment) + 8 new FE tests (`FittingRounds.test.tsx`: 3 strip states + non-bespoke skip, recorder render/record/conflict/prior-rounds).
- Anti-patterns honored: `process_qc_result` untouched; no new `orders.status` values; no TanStack Query in the tailor modal; owner production board untouched.

### Change Log

- 2026-06-10: Story 12.6 implemented (migration 044, fitting_rounds ORM/schemas, fitting stage in GARMENT_STAGES, fitting_service + POST/GET fitting-rounds endpoints, AC3 invite notification + AC5 gate via shared `_advance_current_stage`, 3 notification templates, customer fitting strip + rounds list + booking CTA, tailor fitting recorder, BE+FE tests). Status → review.
- 2026-06-11: Code review round 1 (3-layer adversarial) — 8 findings fixed, 1 deferred, 1 rejected (see below). Migration 044 applied to dev DB (:5433). Status → done.

## Code Review Round 1 (2026-06-11)

3-layer adversarial review (Blind Hunter / Edge Case Hunter / Acceptance Auditor). 10 deduped findings → 8 patched, 1 deferred, 1 rejected.

**Patched:**
1. **[Critical]** Fitting stage was materialized for ALL service types — tasks on buy/rent orders would deadlock at fitting (round recording 400s for non-bespoke; gate blocks completion). Fix: `_create_stage_logs` takes `service_type` and filters `fitting` for non-bespoke; both materialization sites (start_task, QC-rework reset) pass it; stage_order stays consecutive.
2. **[High]** `chk_notification_type` CHECK (migration 016) rejected every notification type added since — all fitting (and prior epic-12) notifications were silently swallowed via the bare-except in `create_notification`. Fix: migration 044 drops + re-adds the constraint with the full 20-type union.
3. **[High]** Pydantic `NotificationType` enum missing the same 15 types → `GET /customers/me/notifications` would 500 after the first fitting notification. Fix: enum extended; parametrized serialization test for every sent type.
4. **[High]** `record_fitting_round` required `order.status == "in_production"`, but the live Owner create-task flow leaves orders at `in_progress` → unrecoverable task. Fix: both statuses accepted (BE + FE strip condition).
5. **[Medium]** AC5 gate satisfied by a passed round from a pre-rework cycle (stage logs are recreated on rework, rounds persist). Fix: gate scoped to rounds with `created_at >= current fitting stage log.created_at`; FE `deriveFittingStripState` rewritten stage-status-primary so the rework cycle shows "Chờ bạn tới thử" + booking CTA instead of stale "Thử đạt".
6. **[Medium]** Recording a round never bumped `task.version` → optimistic locking dead; two devices could double-record one fitting. Fix: version bump inside the FOR UPDATE transaction; stale-version test → 409.
7. **[Low]** `list_fitting_rounds` leaked cross-tenant order existence (403 vs 404 oracle, inconsistent with POST). Fix: tenant-scoped lookup → 404.
8. **[Low]** No UNIQUE on round numbering. Fix: `uq_fitting_round_order_number UNIQUE (order_id, round_number)` in migration 044 + ORM `__table_args__`.

**Deferred:** in-flight bespoke tasks started before this deploy keep their old stage list (no fitting stage, no gate) — grandfathering accepted; no such task exists in dev DB today (all 4 active tasks are buy orders, which now correctly get no fitting stage).
**Rejected:** "full suites green" read literally — pre-existing baseline (BE 15 failed/39 errors in payment/rental/order_customer/staff/export + lead_conversion collection error; FE 1 BookingCalendar date-rot failure; 582 repo-wide tsc errors) is documented and unchanged; 12.6 adds no new failures.

**Post-fix verification:** targeted BE suites 137 passed; full BE suite 1217 passed / 15 failed / 39 errors (= baseline); FE jest 1016 passed / 1 pre-existing failure; tsc clean on touched files. Migration 044 applied to dev DB — `fitting_rounds`, `uq_fitting_round_order_number`, rebuilt `chk_notification_type` verified; 0 orphaned fitting stage logs.

### File List

**Backend (new):**
- `backend/migrations/044_add_fitting_rounds.sql`
- `backend/src/models/fitting.py`
- `backend/src/services/fitting_service.py`
- `backend/tests/test_12_6_fitting_rounds.py`

**Backend (modified):**
- `backend/src/models/db_models.py` — `FittingRoundDB` + `CheckConstraint` import
- `backend/src/services/tailor_task_service.py` — GARMENT_STAGES `fitting`, `_advance_current_stage()` extraction, AC5 gate, `notify_fitting_stage_started()` (AC3), imports
- `backend/src/services/notification_creator.py` — `FITTING_READY`, `FITTING_ALTERATION`, `FITTING_PASSED`
- `backend/src/api/v1/orders.py` — POST/GET `/{order_id}/fitting-rounds`
- `backend/tests/test_state_machine.py` — deliberate updates for the 7-stage ao_dai set + AC5 gate in full happy path

**Frontend (new):**
- `frontend/src/__tests__/FittingRounds.test.tsx`

**Frontend (modified):**
- `frontend/src/types/tailor-task.ts` — `STAGE_LABELS.fitting`
- `frontend/src/types/order.ts` — `FittingOutcome`, `FittingRound`, `FittingRoundsData`
- `frontend/src/app/actions/order-actions.ts` — `fetchFittingRounds()` (ActionResult pattern)
- `frontend/src/app/actions/tailor-task-actions.ts` — `postMutation()` generalization + `recordFittingRound()`
- `frontend/src/components/client/orders/OrderDetailModal.tsx` — fitting strip + round list + `/booking` CTA (AC7)
- `frontend/src/components/client/tailor/TaskDetailModal.tsx` — fitting round recorder (AC8)
