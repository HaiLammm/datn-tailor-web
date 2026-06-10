# Story 12.6: Fitting Rounds & Alteration Loop — Vòng thử đồ và chỉnh sửa

Status: ready-for-dev

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

- [ ] Task 1: Migration 044 + ORM + schemas (AC: 1)
  - [ ] 1.1 `backend/migrations/044_add_fitting_rounds.sql` — idempotent (IF NOT EXISTS), indexes, CHECK constraint on outcome
  - [ ] 1.2 `FittingRoundDB` in `backend/src/models/db_models.py` (follow TaskStageLogDB style ~line 720)
  - [ ] 1.3 Pydantic: `FittingRoundCreate` (outcome, notes?, appointment_id?, version?), `FittingRoundResponse` in `backend/src/models/order.py` or new `fitting.py`
- [ ] Task 2: GARMENT_STAGES + labels (AC: 2)
  - [ ] 2.1 Insert `fitting` after `assembly` in all sets (`tailor_task_service.py:105-109`)
  - [ ] 2.2 FE `STAGE_LABELS` add `fitting: "Thử đồ"` (`frontend/src/types/tailor-task.ts`)
- [ ] Task 3: Service + endpoints (AC: 3, 4, 5, 6)
  - [ ] 3.1 `fitting_service.py` (or extend order_service): `record_fitting_round()`, `list_fitting_rounds()` — tenant-scoped, role checks
  - [ ] 3.2 Hook in `complete_stage` (`tailor_task_service.py`): when next stage starting is `fitting` → AC3 notification; when stage being completed is `fitting` → AC5 gate (require passed round)
  - [ ] 3.3 `record_fitting_round` passed-outcome path reuses the stage-advance mechanics (call/share complete_stage logic, do NOT duplicate)
  - [ ] 3.4 Routes: `POST/GET /api/v1/orders/{order_id}/fitting-rounds` in `backend/src/api/v1/orders.py` (follow existing order endpoint auth patterns)
  - [ ] 3.5 Notification templates in `notification_creator.py` (fitting_ready, fitting_alteration, fitting_passed) — plain Vietnamese
  - [ ] 3.6 `task_history` events (action: `fitting_round_recorded`)
- [ ] Task 4: Customer order detail UI (AC: 7)
  - [ ] 4.1 Server action `fetchFittingRounds(orderId)` (customer-scoped)
  - [ ] 4.2 Fitting progress strip + round list in `OrderDetailModal.tsx` (Boutique Mode, plain Vietnamese), CTA `/booking`
- [ ] Task 5: Tailor recorder UI (AC: 8)
  - [ ] 5.1 Server action `recordFittingRound(orderId, body)` — discriminated-result pattern (12.5)
  - [ ] 5.2 Recorder block in `TaskDetailModal.tsx` fitting stage row (toggle + notes + confirm, 44px targets)
- [ ] Task 6: Tests (AC: 9)
  - [ ] 6.1 BE: `test_12_6_fitting_rounds.py` — follow `test_tailor_task_service.py` fixture pattern (sqlite in-memory)
  - [ ] 6.2 FE: strip state mapping + recorder tests
  - [ ] 6.3 Full suites: `cd backend && python -m pytest`, `cd frontend && npx tsc --noEmit && npx jest --silent`

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

### Debug Log References

### Completion Notes List

### Change Log

### File List
