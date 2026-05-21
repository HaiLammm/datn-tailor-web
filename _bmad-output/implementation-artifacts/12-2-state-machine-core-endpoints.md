# Story 12.2: State Machine Core Endpoints — Full Transition Logic, Stage Lifecycle & Matching

Status: review

## Story

As a Owner (Chu tiem),
I want the production task system to enforce the full 11-state machine with dedicated API endpoints for every transition (accept, reject, start, hold, resume, submit-qc, qc-result, reassign, stage-complete), tailor matching scores, stage lifecycle management, and immutable audit history,
so that the bespoke production workflow is fully functional with proper state enforcement, optimistic locking, and an audit trail for every action.

## Acceptance Criteria

1. **Given** the `_VALID_TRANSITIONS` dict in `tailor_task_service.py`, **When** I inspect it, **Then** it matches the 11-state machine: `unassigned→[assigned,cancelled]`, `assigned→[accepted,rejected,reassigning,cancelled]`, `accepted→[in_progress,cancelled]`, `rejected→[unassigned]` (allows auto-unassign after rejection), `in_progress→[on_hold,submitted_for_qc,reassigning,cancelled]`, `on_hold→[in_progress,reassigning,cancelled]`, `reassigning→[unassigned]`, `submitted_for_qc→[completed,failed_qc]`, `completed→[]`, `cancelled→[]`, `failed_qc→[in_progress,reassigning,cancelled]`. Note: `cancellation_requested` exists as a pre-existing state outside the 11-state machine, handled by legacy cancellation endpoints (deferred to future story).

2. **Given** an assigned task, **When** the assigned tailor POSTs `/{task_id}/accept`, **Then** status transitions to `accepted`, `accepted_at` is set, `expected_finish_at` is calculated, `version` increments, a `task_history` record is inserted, and owner receives a notification.

3. **Given** an assigned task, **When** the assigned tailor POSTs `/{task_id}/reject` with `rejection_category` and `rejection_reason`, **Then** task transitions `assigned→rejected`, then immediately to `unassigned` with `assigned_to=NULL`, both transitions recorded in `task_history`, and owner receives notification with rejection reason.

4. **Given** an accepted task, **When** the tailor POSTs `/{task_id}/start`, **Then** status transitions to `in_progress`, `started_at` is set, `task_stage_logs` records are created for the garment type stages (default: cutting, body_sewing, sleeve_sewing, assembly, finishing), and `task_history` records the transition.

5. **Given** an in_progress task, **When** the tailor POSTs `/{task_id}/hold` with `hold_reason`, **Then** status transitions to `on_hold`, `on_hold_at` and `hold_reason` are set, and owner receives immediate notification.

6. **Given** an on_hold task, **When** the tailor/owner POSTs `/{task_id}/resume`, **Then** status transitions to `in_progress`, `resumed_at` is set, `expected_finish_at` is adjusted by `(resumed_at - on_hold_at)`, and `task_history` records the transition.

7. **Given** an in_progress task with all stages completed, **When** the tailor POSTs `/{task_id}/submit-qc`, **Then** status transitions to `submitted_for_qc`, `submitted_at` is set, and owner receives "Can kiem tra chat luong" notification.

8. **Given** a submitted_for_qc task, **When** the owner POSTs `/{task_id}/qc-result` with `result="pass"`, **Then** task transitions to `completed`, `completed_at` is set, and customer receives "San pham da may xong" notification.

9. **Given** a submitted_for_qc task, **When** the owner POSTs `/{task_id}/qc-result` with `result="fail"` and `action_on_fail="rework"`, **Then** task transitions to `failed_qc` then to `in_progress`, `is_rework=true`, `rework_count` increments, `qc_issues` is stored, existing stage logs are deleted and recreated for the rework cycle, and tailor receives notification with QC issues.

10. **Given** a submitted_for_qc task, **When** the owner POSTs `/{task_id}/qc-result` with `result="fail"` and `action_on_fail="reassign"`, **Then** task transitions to `failed_qc` then `reassigning` then `unassigned` with `assigned_to=NULL`, old tailor notified, and `task_history` records all transitions.

11. **Given** any active task, **When** the owner POSTs `/{task_id}/reassign` with `new_tailor_id` and `reassignment_reason`, **Then** task transitions through `reassigning→unassigned→assigned` to the new tailor, both old and new tailor receive notifications, `assigned_to` is updated, and all transitions are recorded in `task_history`.

12. **Given** an in_progress task, **When** the tailor POSTs `/{task_id}/stages/{stage_order}/complete`, **Then** the corresponding `task_stage_log` is marked `completed` with `completed_at`, the next stage transitions to `in_progress`, and the response includes `progress_percent`.

13. **Given** two concurrent updates on the same task with the same version, **When** the second request arrives, **Then** it returns HTTP 409 Conflict with a clear error message.

14. **Given** any status change, **Then** a `task_history` record is inserted with `actor_id`, `actor_role`, `action`, `from_status`, `to_status`, `reason`, and optional `metadata` (JSONB).

15. **Given** an order with multiple active tailors in the tenant, **When** the owner GETs `/matching-scores/{order_id}`, **Then** the response returns a ranked list of `TailorMatchingScore` sorted by `overall_score` DESC, with `workload_score`, `specialty_match`, `on_time_rate`, `score`, and `reasons` for each tailor. Tailors with no completion history get a neutral `on_time_rate` of 0.5.

16. **Given** a bespoke order being approved via `approve_order()`, **When** the order transitions to confirmed, **Then** the system creates a task with `status='unassigned'` and `assigned_to=NULL` when no tailor is specified, or `status='assigned'` and `assigned_to=tailor_id` when a tailor is provided. The owner receives "Co don moi can giao viec" notification. Order stays at `confirmed` (NOT auto-transition to `in_progress`).

## Tasks / Subtasks

- [x] Task 1: Rewrite state machine transitions in service layer (AC: #1, #13, #14)
  - [x] 1.1: Replace `VALID_TRANSITIONS` dict in `tailor_task_service.py` with full 11-state matrix
  - [x] 1.2: Create internal `_transition_task(db, task, to_status, actor_id, actor_role, reason=None, metadata=None)` function:
    - Validate transition against `_VALID_TRANSITIONS`
    - Check optimistic lock: `WHERE version = task.version` (raise 409 on mismatch)
    - Increment `version`
    - Update `status` and relevant timestamp fields
    - Insert `TaskHistoryDB` record with all fields
    - Return updated task
  - [x] 1.3: All status changes MUST go through `_transition_task()` — no direct `.status =` assignments

- [x] Task 2: Implement accept/reject endpoint handlers (AC: #2, #3)
  - [x] 2.1: Service function `accept_task(db, task_id, actor_id, tenant_id, request: TaskAcceptRequest)`:
    - Validate task exists, belongs to tenant, status is `assigned`, actor is `assigned_to`
    - Transition `assigned→accepted` via `_transition_task()`
    - Set `accepted_at = now()`, calculate `expected_finish_at` from garment type
    - Send notification to owner: TAILOR_ACCEPTED template
  - [x] 2.2: Service function `reject_task(db, task_id, actor_id, tenant_id, request: TaskRejectRequest)`:
    - Validate task exists, belongs to tenant, status is `assigned`, actor is `assigned_to`
    - Transition `assigned→rejected` via `_transition_task()` with rejection_reason
    - Set `rejection_reason`, `rejection_category`
    - Immediately transition `rejected→unassigned` (auto-chain): set `assigned_to=NULL`
    - Send notification to owner: TAILOR_REJECTED template with reason
  - [x] 2.3: API endpoints `POST /{task_id}/accept` (OwnerOrTailor) and `POST /{task_id}/reject` (OwnerOrTailor)

- [x] Task 3: Implement start/hold/resume endpoint handlers (AC: #4, #5, #6)
  - [x] 3.1: Service function `start_task(db, task_id, actor_id, tenant_id, request: TaskStartRequest)`:
    - Validate status is `accepted`
    - Transition `accepted→in_progress` via `_transition_task()`
    - Set `started_at = now()`
    - Create stage_log records via `_create_stage_logs()`
  - [x] 3.2: Service function `hold_task(db, task_id, actor_id, tenant_id, request: TaskHoldRequest)`:
    - Validate status is `in_progress`
    - Transition `in_progress→on_hold` via `_transition_task()`
    - Set `hold_reason`, `on_hold_at = now()`
    - Notify owner: TASK_ON_HOLD template
  - [x] 3.3: Service function `resume_task(db, task_id, actor_id, tenant_id, request: TaskResumeRequest)`:
    - Validate status is `on_hold`
    - Transition `on_hold→in_progress` via `_transition_task()`
    - Set `resumed_at = now()`
    - Adjust `expected_finish_at += (resumed_at - on_hold_at)`
    - Notify owner: TASK_RESUMED template
  - [x] 3.4: API endpoints: `POST /{task_id}/start`, `POST /{task_id}/hold`, `POST /{task_id}/resume` (all OwnerOrTailor)

- [x] Task 4: Implement QC workflow endpoints (AC: #7, #8, #9, #10)
  - [x] 4.1: Service function `submit_for_qc(db, task_id, actor_id, tenant_id)`:
    - Validate status is `in_progress`
    - Validate ALL stage_logs are `completed` (reject if any pending/in_progress)
    - Transition `in_progress→submitted_for_qc` via `_transition_task()`
    - Set `submitted_at = now()`
    - Notify owner: TASK_SUBMITTED_QC template
  - [x] 4.2: Service function `process_qc_result(db, task_id, actor_id, tenant_id, request: QCResultRequest)`:
    - Validate status is `submitted_for_qc`
    - **If result="pass"**: transition `submitted_for_qc→completed`, set `completed_at`, notify customer CUSTOMER_QC_PASSED
    - **If result="fail" + action_on_fail="rework"**: transition `submitted_for_qc→failed_qc` then `failed_qc→in_progress`, set `is_rework=true`, increment `rework_count`, set `qc_issues`, notify tailor QC_FAILED_REWORK
    - **If result="fail" + action_on_fail="reassign"**: transition `submitted_for_qc→failed_qc` then `failed_qc→reassigning→unassigned`, set `assigned_to=NULL`, notify both tailors
    - **If result="fail" + action_on_fail="fail"**: transition `submitted_for_qc→failed_qc` (terminal), set `qc_issues`
  - [x] 4.3: API endpoints: `POST /{task_id}/submit-qc` (OwnerOrTailor), `POST /{task_id}/qc-result` (OwnerOnly)

- [x] Task 5: Implement reassign endpoint (AC: #11)
  - [x] 5.1: Service function `reassign_task(db, task_id, actor_id, tenant_id, request: TaskReassignRequest)`:
    - Validate task is in a reassignable status (assigned, in_progress, on_hold, failed_qc)
    - Validate `new_tailor_id` is active, role="Tailor", same tenant, different from current
    - Chain transitions: current_status → `reassigning` → `unassigned` → `assigned`
    - Set `assigned_to = new_tailor_id`, `reassignment_reason`
    - Set `assignment_deadline_at = now + 4h`
    - If `continue_from_current_stage=True`: keep existing stage_logs
    - If `continue_from_current_stage=False`: reset stage_logs (delete + recreate)
    - Record `metadata={old_tailor_id, new_tailor_id}` in task_history
    - Notify old tailor: TASK_REASSIGNED_OLD, notify new tailor: TASK_REASSIGNED_NEW
  - [x] 5.2: API endpoint: `POST /{task_id}/reassign` (OwnerOnly)

- [x] Task 6: Implement stage lifecycle management (AC: #12)
  - [x] 6.1: Define `GARMENT_STAGES` config dict in service:
    ```python
    GARMENT_STAGES = {
        "default": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "finishing"],
        "ao_dai": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "finishing"],
        "wedding": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "beading", "finishing"],
    }
    ```
  - [x] 6.2: `_create_stage_logs(db, task_id, tenant_id, garment_type)` — creates `TaskStageLogDB` records for each stage in order, first stage starts as `in_progress`
  - [x] 6.3: Service function `complete_stage(db, task_id, stage_order, actor_id, tenant_id, request: StageUpdateRequest)`:
    - Validate task status is `in_progress`
    - Validate stage_order matches current in_progress stage (sequential enforcement)
    - Mark current stage `completed` + `completed_at = now()`
    - Start next stage (`status = in_progress`, `started_at = now()`)
    - Return `progress_percent = completed_stages / total_stages`
  - [x] 6.4: API endpoint: `POST /{task_id}/stages/{stage_order}/complete` (OwnerOrTailor)

- [x] Task 7: Implement tailor matching score API (AC: #15)
  - [x] 7.1: Service function `get_matching_scores(db, order_id, tenant_id) -> list[TailorMatchingScore]`:
    - Get all active tailors for tenant (role="Tailor", is_active=True)
    - For each tailor calculate:
      - `workload_score = 1 - (active_task_count / 5)` (clamp to 0)
      - `specialty_match = True` (Phase 1: always True, no specialty data)
      - `on_time_rate = completed_on_time / total_completed` (last 90 days, default 1.0)
      - `overall_score = workload_score * 0.5 + on_time_rate * 0.3 + (1.0 if specialty_match else 0.0) * 0.2`
    - Sort by `overall_score` DESC
  - [x] 7.2: API endpoint: `GET /matching-scores/{order_id}` (OwnerOnly)

- [x] Task 8: Implement task history endpoint (AC: #14)
  - [x] 8.1: Service function `get_task_history(db, task_id, tenant_id) -> list[TaskHistoryResponse]`:
    - Query `task_history` table ordered by `created_at ASC`
    - Return list of `TaskHistoryResponse`
  - [x] 8.2: API endpoint: `GET /{task_id}/history` (OwnerOnly)

- [x] Task 9: Update approve_order() for unassigned task creation (AC: #16)
  - [x] 9.1: In `order_service.py` `approve_order()` for bespoke orders (~line 1180-1252):
    - Change task creation: `status='unassigned'`, `assigned_to=None`
    - Do NOT auto-transition order to `in_progress` — order stays at `confirmed`
    - Calculate `deadline_at` from `order.delivery_date - 3 days buffer` (if available)
    - Send notification to owner: TASK_CREATED_OWNER template
  - [x] 9.2: Update `accept_task()` to transition order `confirmed→in_progress` when tailor accepts

- [x] Task 10: Add new notification templates (AC: #2-#11)
  - [x] 10.1: Add all new notification templates to `notification_creator.py`:
    - TASK_CREATED_OWNER, TASK_ASSIGNED_TAILOR
    - TAILOR_ACCEPTED, TAILOR_REJECTED
    - TASK_ON_HOLD, TASK_RESUMED
    - TASK_SUBMITTED_QC, QC_PASSED, QC_FAILED_REWORK
    - TASK_REASSIGNED_OLD, TASK_REASSIGNED_NEW
    - CUSTOMER_QC_PASSED
  - [x] 10.2: Use existing `create_notification()` function pattern — best-effort after commit

- [x] Task 11: Update existing endpoints for backward compatibility
  - [x] 11.1: Refactor `update_task_status()` to use `_transition_task()` internally
  - [x] 11.2: Keep `PATCH /{task_id}/status` working for `in_progress` and `completed` transitions (backward compat)
  - [x] 11.3: Keep `create_task()` working for manual task creation by owner (but use new state machine)
  - [x] 11.4: Keep `update_production_step()` for backward compat — deprecated but functional

## Dev Notes

### Architecture Patterns & Constraints

- **Authoritative Server Pattern:** Backend is SSOT. ALL validation, state transitions, and business logic on backend. Frontend only renders.
- **Async SQLAlchemy 2.x:** All ORM models use `Mapped[...]` type annotations. Relationships use `relationship()` with `back_populates`.
- **Multi-tenant isolation:** ALL queries MUST filter by `tenant_id`. New tables already have `tenant_id` FK.
- **snake_case everywhere:** DB columns, API fields, Pydantic model fields all snake_case.
- **Pydantic v2:** Use `BaseModel` with `Field()` for validation. `Literal` types for enums.
- **DB Commit Rule:** After `db.flush()` MUST call `await db.commit()`. Notifications after commit (best-effort).
- **Optimistic locking:** `_transition_task()` MUST check `WHERE version = :expected` and increment. Return 409 on mismatch.

### Key Technical Decisions

- **All transitions through `_transition_task()`:** No direct `.status = "new_value"` anywhere. This ensures every change is audited in `task_history`.
- **Chain transitions:** Some flows involve multiple transitions (e.g., reject: `assigned→rejected→unassigned`). Each transition MUST be a separate `task_history` record.
- **Stage logs created on start:** `_create_stage_logs()` is called in `start_task()`, NOT in `create_task()` or `accept_task()`.
- **Stage sequential enforcement:** `complete_stage()` MUST validate that `stage_order` matches the current in_progress stage. Cannot skip stages.
- **Reject flow clears assignment:** After reject, `assigned_to` becomes NULL and status goes to `unassigned`. Task is ready for re-assignment.
- **QC fail actions:** Three options — `rework` (same tailor retries), `reassign` (different tailor), `fail` (terminal — task marked failed_qc permanently).
- **Order status coupling:** Order transitions `confirmed→in_progress` only when tailor ACCEPTS (not when assigned). On QC pass, order transitions to next step.

### Source Tree Components to Touch

**Modified files:**
- `backend/src/services/tailor_task_service.py` — Major rewrite: new transition matrix, `_transition_task()`, all new service functions (accept, reject, start, hold, resume, submit_qc, process_qc_result, reassign, complete_stage, matching_scores, get_history)
- `backend/src/api/v1/tailor_tasks.py` — 11 new endpoints: accept, reject, start, hold, resume, submit-qc, qc-result, reassign, stages/{stage_order}/complete, history, matching-scores/{order_id}
- `backend/src/services/order_service.py` — `approve_order()` change: create unassigned task, no auto-transition to in_progress
- `backend/src/services/notification_creator.py` — 12 new notification templates

### Current State After Story 12.1

- `TailorTaskDB` has ALL 16 new columns (version, accepted_at, started_at, etc.)
- `TaskStageLogDB` and `TaskHistoryDB` ORM models EXIST and are ready
- All 9 new request schemas EXIST in `tailor_task.py` (TaskAcceptRequest, TaskRejectRequest, etc.)
- All response schemas updated (TaskStageLogResponse, TaskHistoryResponse, TailorMatchingScore)
- `TaskStatus` Literal includes all 11 states
- DB migration 034 is applied with all tables and constraints
- **BUT**: Service layer still uses OLD 2-transition `VALID_TRANSITIONS` dict
- **BUT**: No new API endpoints exist yet
- **BUT**: `create_task()` still creates with `status='assigned'`

### Existing Service Functions to Keep (Backward Compat)

These functions MUST continue to work (other parts of the system depend on them):
- `get_my_tasks()` — Tailor task list with filters (line 108-178)
- `get_task_summary()` — Status count summary (line 181-217)
- `create_task()` — Manual task creation by owner (line 390-508)
- `list_all_tasks()` — Owner task list (line 777-853)
- `update_task()` — Owner update fields (line 856-925)
- `delete_task()` — Delete assigned-only task (line 928-953)
- `get_tailor_monthly_income()` — Income calculation (line 959-1042)
- `get_tailor_income_by_period()` — Income by period (line 1048-1249)

### Existing API Endpoints to Keep

| Method | Route | Auth | Keep? |
|--------|-------|------|-------|
| GET | `/my-tasks` | OwnerOrTailor | YES — unchanged |
| GET | `/summary` | OwnerOrTailor | YES — update to count new statuses |
| PATCH | `/{task_id}/status` | OwnerOrTailor | YES — refactor to use _transition_task() |
| PATCH | `/{task_id}/production-step` | OwnerOrTailor | YES — deprecated but keep working |
| POST | `/` | OwnerOnly | YES — update to use new state machine |
| GET | `/` | OwnerOnly | YES — unchanged |
| PATCH | `/{task_id}` | OwnerOnly | YES — unchanged |
| DELETE | `/{task_id}` | OwnerOnly | YES — unchanged |
| GET | `/{task_id}` | OwnerOrTailor | YES — unchanged |
| POST | `/{task_id}/request-cancellation` | OwnerOrTailor | YES — keep for backward compat |
| POST | `/{task_id}/resolve-cancellation` | OwnerOnly | YES — keep for backward compat |
| GET | `/my-income` | OwnerOrTailor | YES — unchanged |

### Auth Pattern Reference

```python
from src.api.dependencies import OwnerOnly, OwnerOrTailor, TenantId

# Endpoint signature pattern:
@router.post("/{task_id}/accept")
async def accept_task(
    task_id: uuid.UUID,
    request: TaskAcceptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: UserDB = Depends(OwnerOrTailor),
    tenant_id: uuid.UUID = Depends(TenantId),
):
```

### Notification Pattern Reference

```python
# Best-effort after commit pattern:
await db.commit()
try:
    await create_notification(
        db=db,
        user_id=owner.id,
        tenant_id=tenant_id,
        notification_type="task_accepted",
        title="Tho da nhan viec",
        message=f"{tailor_name} da nhan don #{order_code}",
    )
    await db.commit()
except Exception:
    logger.warning("Failed to create notification for task acceptance")
```

### Optimistic Locking Pattern

```python
# In _transition_task():
from sqlalchemy import update
result = await db.execute(
    update(TailorTaskDB)
    .where(TailorTaskDB.id == task.id, TailorTaskDB.version == task.version)
    .values(status=to_status, version=task.version + 1, ...)
)
if result.rowcount == 0:
    raise HTTPException(status_code=409, detail="Task was modified by another request. Please refresh and try again.")
```

### GARMENT_STAGES Configuration

```python
GARMENT_STAGES: dict[str, list[str]] = {
    "default": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "finishing"],
    "ao_dai": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "finishing"],
    "wedding": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "beading", "finishing"],
}
```

### Matching Score Formula

```
workload_score = max(0, 1 - (active_tasks / 5))
specialty_match = True  # Phase 1: always True
on_time_rate = completed_on_time / total_completed (last 90 days, default 1.0)
overall_score = workload_score * 0.5 + on_time_rate * 0.3 + (1.0 if specialty_match else 0.0) * 0.2
```

### Testing Standards

- Backend: pytest with async fixtures, httpx AsyncClient
- Test ALL valid transitions (happy paths)
- Test ALL invalid transitions (expect 400/422)
- Test optimistic locking conflict (expect 409)
- Test stage sequential enforcement (can't skip stages)
- Test matching score calculation with edge cases (no history, all busy, etc.)
- Test approve_order creates unassigned task
- Test notification creation after each transition (mock or verify DB)

### Critical Warnings

1. **DO NOT** change TailorTaskDB column names or types — Story 12.1 migration is authoritative
2. **DO NOT** remove or rename existing Pydantic schemas — other modules import them
3. **DO NOT** break `create_task()` — it's called from `approve_order()` and manual task creation
4. **DO NOT** use `db.refresh()` after optimistic locking update — re-query instead
5. **MUST** use `_transition_task()` for ALL status changes — no exceptions
6. **MUST** preserve existing cancellation flow (request_task_cancellation, resolve_cancellation_request)
7. **MUST** handle `assigned_to=None` gracefully in all queries (unassigned tasks have no tailor)
8. **MUST** set `assignment_deadline_at = now + 4h` when assigning/reassigning to a tailor

### Previous Story Intelligence (12.1)

- SQLAlchemy `metadata` is a reserved attribute name — the `task_history.metadata` column is mapped as `extra_metadata = mapped_column("metadata", JSON)` in `TaskHistoryDB`
- `assigned_to` is now nullable (`Mapped[uuid.UUID | None]`) — all queries filtering by `assigned_to` must handle NULL
- Default status is now `"unassigned"` — `create_task()` may need to explicitly set `"assigned"` when a tailor is selected
- 13 existing tailor task tests pass — run them after changes to verify no regressions
- Pre-existing test failures in `test_production_step`, `test_rental_service`, `test_10_7`, `test_11_2`, `test_11_3` are UNRELATED — do not fix them

### Project Structure Notes

- Backend service pattern: `api/v1/tailor_tasks.py` → `services/tailor_task_service.py` → `models/db_models.py`
- All imports from `src.models.db_models` and `src.models.tailor_task`
- Router prefix: `/api/v1/tailor-tasks`
- Existing router uses `APIRouter(prefix="/tailor-tasks", tags=["tailor-tasks"])`

### References

- [Source: _bmad-output/implementation-artifacts/tech-spec-bespoke-production-task-workflow.md — Tasks 6-11]
- [Source: _bmad-output/implementation-artifacts/12-1-db-migration-orm-pydantic-foundation.md — Previous story]
- [Source: backend/src/services/tailor_task_service.py — Current service layer, VALID_TRANSITIONS at line 52]
- [Source: backend/src/api/v1/tailor_tasks.py — Current endpoints]
- [Source: backend/src/services/order_service.py — approve_order() at line 1099]
- [Source: backend/src/services/notification_creator.py — Notification templates and create_notification()]
- [Source: backend/src/models/db_models.py — TailorTaskDB (515-613), TaskStageLogDB (616-643), TaskHistoryDB (646-669)]
- [Source: backend/src/models/tailor_task.py — All Pydantic schemas including 9 new request schemas]

## Dev Agent Record

### Agent Model Used
Claude Opus 4.6 (1M context)

### Debug Log References
- JSONB→JSON SQLite compat fix needed for tests (conftest.py)
- `rejected` state needed `unassigned` transition for reject→auto-unassign flow
- `update_task_status()` backward compat: chains assigned→accepted→in_progress and in_progress→submitted_for_qc→completed via legacy endpoint
- SQLAlchemy identity map prevents clean optimistic locking simulation in unit tests with single session

### Completion Notes List
- ✅ Full 11-state machine implemented in `_VALID_TRANSITIONS` dict
- ✅ `_transition_task()` core function with optimistic locking (WHERE version=) and audit trail
- ✅ 10 new service functions: accept, reject, start, hold, resume, submit_for_qc, process_qc_result, reassign, complete_stage, get_matching_scores, get_task_history
- ✅ 11 new API endpoints added to tailor_tasks router
- ✅ 12 new notification templates in notification_creator.py
- ✅ `approve_order()` creates unassigned tasks, order stays at confirmed
- ✅ `accept_task()` transitions order confirmed→in_progress
- ✅ GARMENT_STAGES config with default/ao_dai/wedding stage sets
- ✅ Stage sequential enforcement — cannot skip stages
- ✅ QC workflow: pass, fail-rework, fail-reassign, fail-terminal
- ✅ Reassign chain: current→reassigning→unassigned→assigned with 4h deadline
- ✅ Backward compat: PATCH /{task_id}/status, create_task(), update_production_step() all work
- ✅ 73 tests pass (29 existing + 13 API + 31 new) — zero regressions
- ✅ Updated QCResultRequest schema to support result/action_on_fail fields
- ✅ _task_to_response updated with all new state machine fields

### Change Log
- 2026-05-21: Story 12.2 implementation complete — full 11-state machine with all endpoints, notifications, and tests

### File List
- backend/src/services/tailor_task_service.py (MODIFIED — major rewrite: _VALID_TRANSITIONS, _transition_task(), 10 new service functions)
- backend/src/api/v1/tailor_tasks.py (MODIFIED — 11 new endpoints)
- backend/src/services/notification_creator.py (MODIFIED — 12 new notification templates)
- backend/src/services/order_service.py (MODIFIED — approve_order creates unassigned tasks)
- backend/src/models/tailor_task.py (MODIFIED — QCResultRequest updated with result/action_on_fail)
- backend/tests/test_state_machine.py (NEW — 31 tests for state machine)
- backend/tests/conftest.py (NEW — JSONB→JSON SQLite compat)
