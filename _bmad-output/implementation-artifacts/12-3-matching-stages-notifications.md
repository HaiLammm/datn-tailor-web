# Story 12.3: Order-Task Lifecycle Integration & Task Info Enrichment

Status: review

## Story

As a Owner (Chu tiem),
I want the production task state machine to properly drive order lifecycle transitions (QC pass → order progresses, task completion checks updated) and enriched task info returned in order views (progress %, stage details, all new status labels),
so that the bespoke order flow is fully integrated with the 11-state task machine and the frontend can display accurate production progress.

## Acceptance Criteria

1. **Given** a `submitted_for_qc` task, **When** the owner posts QC result `pass`, **Then** the order transitions from `in_progress` to the next valid order status (`ready_to_ship` or `ready_for_pickup` depending on fulfillment type), and customer receives notification.

2. **Given** an order with multiple tasks (future: multi-garment), **When** `_all_tailor_tasks_completed()` is called, **Then** it excludes tasks with status `unassigned`, `rejected`, `reassigning`, `failed_qc` (terminal fail), `cancelled`, and `cancellation_requested` from the "active" filter — only checks tasks in forward-progress states.

3. **Given** an order list query, **When** the response includes `tailor_task_info`, **Then** the info contains: `tailor_name`, `task_status` (full 11-state), `garment_name`, `progress_percent` (float 0-100, null if no stages), `current_stage` (string, null if not in_progress), `is_rework` (bool), `rework_count` (int), and `failure_category` (nullable).

4. **Given** an order detail query, **When** the response includes `tailor_task_info`, **Then** it additionally contains `stage_logs` (list of `{stage, stage_order, status, started_at, completed_at}`) and `expected_finish_at` (nullable timestamp).

5. **Given** a task that transitions `completed` via QC pass, **When** the order's bespoke preparation sub-steps are already complete (no `in_production` sub-steps remaining), **Then** the order transitions to `ready_to_ship` and the system does NOT double-transition if the order is already past `in_production`.

6. **Given** a task in `failed_qc` with `action_on_fail="fail"` (terminal), **When** `_all_tailor_tasks_completed()` is called, **Then** the terminal `failed_qc` task is treated as NOT completed, blocking the order from progressing (owner must create a new task or resolve manually).

7. **Given** the frontend `tailor_task_info` type, **When** it receives new fields, **Then** the TypeScript interface in `order.ts` is updated to include `progress_percent`, `current_stage`, `is_rework`, `rework_count`, `expected_finish_at`, and `stage_logs` (for detail view).

8. **Given** an order with status `confirmed` and a task that goes through `assigned→accepted`, **When** `accept_task()` transitions the order to `in_production`, **Then** the order `preparation_step` is set to the first bespoke sub-step (`cutting`) if not already set.

## Tasks / Subtasks

- [x] Task 1: Update `process_qc_result()` to transition order on QC pass (AC: #1, #5)
  - [x] 1.1: In `tailor_task_service.py` `process_qc_result()`, after QC pass and task → `completed`:
    - Load the parent order via `task.order_id`
    - Check if `_all_tailor_tasks_completed(db, order_id)` returns True
    - If yes AND order status is `in_production`: transition order to `ready_to_ship` (or `ready_for_pickup` if `order.fulfillment_type == 'pickup'`)
    - Use existing `_next_bespoke_status()` or manual transition — check `BESPOKE_STATUS_FLOW` dict
    - Guard: do NOT transition if order is already `ready_to_ship` or later
  - [x] 1.2: Import necessary order models and helper functions from `order_service.py`

- [x] Task 2: Update `_all_tailor_tasks_completed()` for new states (AC: #2, #6)
  - [x] 2.1: In `order_service.py`, update the exclusion filter:
    ```python
    _non_blocking = ["cancelled", "cancellation_requested", "unassigned", "rejected", "reassigning"]
    ```
    - Active tasks = those NOT in `_non_blocking`
    - Completed tasks = those with `status == "completed"`
    - `failed_qc` tasks are active (blocking) — owner must resolve them
  - [x] 2.2: Add comment explaining the logic for future maintainers

- [x] Task 3: Enrich `tailor_task_info` in order list response (AC: #3)
  - [x] 3.1: In `order_service.py`, where `tailor_task_map` is built (around line 680-690):
    - Query task with eager-loaded `stage_logs` relationship
    - Calculate `progress_percent`: count completed stages / total stages * 100
    - Determine `current_stage`: first stage_log with status `in_progress`
    - Include `is_rework`, `rework_count`, `task_status` with full 11-state value
  - [x] 3.2: Update `TailorTaskInfoBrief` Pydantic model (or create new) in `order.py`:
    - Add fields: `progress_percent: float | None`, `current_stage: str | None`, `is_rework: bool`, `rework_count: int`, `expected_finish_at: datetime | None`

- [x] Task 4: Enrich `tailor_task_info` in order detail response (AC: #4)
  - [x] 4.1: In order detail query/response, include `stage_logs` list and `expected_finish_at`
  - [x] 4.2: Reuse `TaskStageLogResponse` schema or create lightweight `StageLogBrief`

- [x] Task 5: Update `accept_task()` order integration (AC: #8)
  - [x] 5.1: In `tailor_task_service.py` `accept_task()`, after transitioning order `confirmed→in_production`:
    - Set `order.preparation_step = "cutting"` if currently NULL
    - This ensures the bespoke preparation sub-step flow starts correctly

- [x] Task 6: Update frontend TypeScript types (AC: #7)
  - [x] 6.1: In `frontend/src/types/order.ts`, update `tailor_task_info` interface:
    ```typescript
    tailor_task_info?: {
      tailor_name: string;
      task_status: string;
      garment_name: string;
      progress_percent: number | null;
      current_stage: string | null;
      is_rework: boolean;
      rework_count: number;
      expected_finish_at: string | null;
      failure_category?: string | null;
      // Detail-only fields (null in list view)
      stage_logs?: Array<{
        stage: string;
        stage_order: number;
        status: string;
        started_at: string | null;
        completed_at: string | null;
      }> | null;
    } | null;
    ```

- [x] Task 7: Tests (AC: #1-#6)
  - [x] 7.1: Test QC pass → order transitions to `ready_to_ship`
  - [x] 7.2: Test QC pass but order already past `in_production` → no double-transition
  - [x] 7.3: Test `_all_tailor_tasks_completed()` with new statuses: unassigned, rejected, reassigning excluded; failed_qc blocks
  - [x] 7.4: Test `tailor_task_info` enrichment in order list response includes progress_percent and current_stage
  - [x] 7.5: Test `accept_task()` sets `preparation_step = "cutting"` on order

## Dev Notes

### Architecture Patterns & Constraints

- **Authoritative Server Pattern:** Backend is SSOT. ALL state transitions happen server-side.
- **Async SQLAlchemy 2.x:** All queries use `async def` + `AsyncSession`. Relationships use `selectinload` for eager loading.
- **Multi-tenant isolation:** ALL queries MUST filter by `tenant_id`.
- **snake_case everywhere:** DB columns, API fields, Pydantic model fields all snake_case.
- **DB Commit Rule:** After `db.flush()` MUST call `await db.commit()`. Notifications after commit (best-effort).
- **Video Not Snapshot Principle:** DB must track status transitions as business events, not just current state — this is already handled by `task_history` table from Story 12.2.

### Key Technical Decisions

- **QC pass → order transition:** This is the critical integration point. `process_qc_result()` currently notifies customer but does NOT advance the order. This story adds that.
- **`_all_tailor_tasks_completed()` logic:** The current filter excludes `cancelled` and `cancellation_requested`. Must also exclude `unassigned`, `rejected`, `reassigning` (non-blocking intermediate states). `failed_qc` (terminal) BLOCKS progression — intentional.
- **`tailor_task_info` is a denormalized summary:** It's embedded in order list/detail responses for frontend convenience. Keep it lightweight — no full task_history in list view.
- **Order `preparation_step`:** Bespoke orders use `in_production` with sub-steps (cutting → sewing → etc.). The `preparation_step` field tracks the current sub-step. `accept_task()` should initialize it.

### Source Tree Components to Touch

**Modified files:**
- `backend/src/services/tailor_task_service.py` — `process_qc_result()`: add order transition on QC pass. `accept_task()`: set `preparation_step`.
- `backend/src/services/order_service.py` — `_all_tailor_tasks_completed()`: update exclusion filter. `tailor_task_info` builder: add progress_percent, current_stage, is_rework, rework_count, expected_finish_at.
- `backend/src/models/order.py` — Update `TailorTaskInfo` Pydantic model with new fields.
- `frontend/src/types/order.ts` — Update `tailor_task_info` TypeScript interface.

### Current State After Story 12.2

- Full 11-state machine implemented and tested (73 tests pass)
- `_transition_task()` handles all status changes with audit trail
- `process_qc_result()` handles pass/fail/rework/reassign but does NOT transition order
- `accept_task()` transitions order `confirmed→in_progress` but does NOT set `preparation_step`
- `_all_tailor_tasks_completed()` only excludes `cancelled` and `cancellation_requested`
- `tailor_task_info` in order response is basic: `{tailor_name, task_status, garment_name, failure_category}`
- 12 notification templates exist and are used in all transitions
- GARMENT_STAGES, `_create_stage_logs()`, `complete_stage()` all work

### Existing Code References

| File | Key Location | What |
|------|-------------|------|
| `backend/src/services/tailor_task_service.py:482` | `process_qc_result()` | QC pass currently only notifies customer, no order transition |
| `backend/src/services/tailor_task_service.py:230` | `accept_task()` | Order confirmed→in_progress, does not set preparation_step |
| `backend/src/services/order_service.py:532` | `_all_tailor_tasks_completed()` | Current filter: excludes cancelled + cancellation_requested |
| `backend/src/services/order_service.py:680-714` | Order list builder | Where `tailor_task_map` is used |
| `backend/src/models/order.py` | `TailorTaskInfo` or inline dict | Current tailor_task_info shape |
| `frontend/src/types/order.ts:148` | `tailor_task_info` interface | Current TypeScript type |
| `backend/src/services/order_service.py:520-528` | `BESPOKE_STATUS_FLOW` | Order status flow for bespoke |

### Order Status Flow Reference (Bespoke)

```
pending_measurement → pending → confirmed → in_production → ready_to_ship | ready_for_pickup → shipped → delivered → completed
```

- `confirmed → in_production`: Triggered by `accept_task()` (Story 12.2)
- `in_production → ready_to_ship`: Should be triggered by QC pass (THIS STORY)

### Auth Pattern Reference

Same as Story 12.2 — no new endpoints needed, only modifications to existing service functions.

### Testing Standards

- Backend: pytest with async fixtures, httpx AsyncClient
- Test order transition on QC pass (happy path)
- Test order NOT transitioning when tasks still active
- Test `_all_tailor_tasks_completed()` with all 11 states
- Test `tailor_task_info` enrichment in order list/detail
- Pre-existing test failures in `test_production_step`, `test_rental_service`, `test_10_7`, `test_11_2`, `test_11_3` are UNRELATED — do not fix them

### Critical Warnings

1. **DO NOT** change the `_transition_task()` function — it's Story 12.2's responsibility
2. **DO NOT** add new API endpoints — this story only modifies behavior of existing endpoints
3. **DO NOT** break `tailor_task_info` backward compatibility — add new fields, don't remove existing ones
4. **DO NOT** import circular dependencies between `order_service.py` and `tailor_task_service.py` — use lazy imports or shared utilities if needed
5. **MUST** handle the case where order has no tasks (non-bespoke orders)
6. **MUST** guard against double-transition: check order status before transitioning

### Previous Story Intelligence (12.2)

- SQLAlchemy `metadata` is a reserved attribute — `task_history.metadata` column mapped as `extra_metadata`
- `assigned_to` is nullable — all queries must handle NULL
- Default task status is `"unassigned"`
- 73 tests pass after 12.2 — run them after changes to verify no regressions
- `_resolve_stage_key()` maps garment_name to GARMENT_STAGES key
- `_task_to_response()` builds `TailorTaskResponse` from DB model — reuse for consistency

### Project Structure Notes

- Backend service pattern: `api/v1/*.py` → `services/*_service.py` → `models/db_models.py`
- Order models: `backend/src/models/order.py`
- DB models: `backend/src/models/db_models.py`
- Router prefix: `/api/v1/orders` (order endpoints), `/api/v1/tailor-tasks` (task endpoints)

### References

- [Source: _bmad-output/implementation-artifacts/tech-spec-bespoke-production-task-workflow.md — Task 17: Order status transitions]
- [Source: _bmad-output/implementation-artifacts/12-2-state-machine-core-endpoints.md — Previous story implementation]
- [Source: backend/src/services/tailor_task_service.py — process_qc_result() at line 482, accept_task() at line 230]
- [Source: backend/src/services/order_service.py — _all_tailor_tasks_completed() at line 532, order list builder at line 680]
- [Source: backend/src/models/order.py — TailorTaskInfo Pydantic model]
- [Source: frontend/src/types/order.ts — tailor_task_info interface at line 148]
- [Source: _bmad-output/planning-artifacts/architecture.md — Order Status Pipeline, Bespoke flow]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6

### Debug Log References
- All 5 new tests pass, 42 existing tests pass (no regressions)

### Completion Notes List
- Task 1: QC pass now transitions order `in_production → ready_to_ship` when all tasks completed. Guards against double-transition.
- Task 2: `_all_tailor_tasks_completed()` now excludes `unassigned`, `rejected`, `reassigning` (non-blocking). `failed_qc` intentionally blocks.
- Task 3: `tailor_task_info` in order list enriched with `progress_percent`, `current_stage`, `is_rework`, `rework_count`, `expected_finish_at`.
- Task 4: Order detail includes `stage_logs` array and full enriched `tailor_task_info` via 3-tuple return from `get_order_with_transactions()`.
- Task 5: `accept_task()` now transitions order to `in_production` (was `in_progress`) and sets `preparation_step = "cutting"`.
- Task 6: Frontend TypeScript `tailor_task_info` interface updated with all new fields including `stage_logs` for detail view.
- Task 7: 5 tests covering QC pass transitions, double-transition guard, non-blocking/blocking status exclusion, and accept_task preparation_step.
- Note on Task 3.2: Used inline dict approach (matching existing pattern) instead of creating new Pydantic model — `tailor_task_info` is already typed as `dict | None` in `OrderListItem`.

### File List
- `backend/src/services/tailor_task_service.py` — Modified: QC pass order transition (Task 1), accept_task sets preparation_step (Task 5)
- `backend/src/services/order_service.py` — Modified: _all_tailor_tasks_completed exclusion filter (Task 2), enriched tailor_task_info in list (Task 3) and detail (Task 4)
- `backend/src/api/v1/orders.py` — Modified: Unpack 3-tuple from get_order_with_transactions (Task 4)
- `frontend/src/types/order.ts` — Modified: Updated tailor_task_info interface (Task 6)
- `backend/tests/test_12_3_order_task_lifecycle.py` — New: 5 tests for story 12.3 (Task 7)
