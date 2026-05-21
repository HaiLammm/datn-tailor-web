---
title: 'Bespoke Production Task Workflow — Full State Machine Redesign'
slug: 'bespoke-production-task-workflow'
created: '2026-05-21'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['FastAPI 0.115+', 'SQLAlchemy 2.x async', 'Next.js 15 App Router', 'TypeScript', 'PostgreSQL', 'Pydantic v2', 'TanStack Query']
files_to_modify:
  - 'backend/migrations/034_production_task_state_machine.sql (new tables + columns)'
  - 'backend/src/models/db_models.py (ProductionTaskDB redesign, TaskHistoryDB, TaskStageLogDB new)'
  - 'backend/src/models/tailor_task.py (complete rewrite: new status enum, new schemas)'
  - 'backend/src/services/tailor_task_service.py (complete rewrite: new state machine, matching, TTL)'
  - 'backend/src/api/v1/tailor_tasks.py (new endpoints: accept, reject, start, hold, resume, submit-qc, qc-result)'
  - 'backend/src/services/order_service.py (approve_order: create unassigned task instead of assigned)'
  - 'backend/src/services/notification_creator.py (new templates for all states)'
  - 'frontend/src/types/tailor-task.ts (new status union, stage types, matching types)'
  - 'frontend/src/components/client/production/ (board redesign with new states)'
  - 'frontend/src/components/tailor/ (tailor mobile UI: accept/reject, stages, hold, submit)'
code_patterns:
  - 'Forward-only transition matrix in _VALID_TRANSITIONS dict'
  - 'Server actions pattern: getAuthToken() → fetch with Bearer → { success, data?, error? }'
  - 'TanStack Query with queryKey for cache invalidation (60s stale)'
  - 'Multi-tenant isolation: all queries filtered by tenant_id'
  - 'Best-effort notifications: create after commit, log warning on failure'
  - 'Optimistic locking via version column for concurrent updates'
test_patterns:
  - 'Backend: pytest with async fixtures, httpx AsyncClient'
  - 'Frontend: Jest + React Testing Library'
---

# Tech-Spec: Bespoke Production Task Workflow — Full State Machine Redesign

**Created:** 2026-05-21

## Overview

### Problem Statement

The current tailor task system has a simplistic state machine (`assigned → in_progress → completed`) that doesn't match real-world production workflows. Key gaps:

1. **No tailor acceptance step** — Owner assigns, tailor has no say. No TTL if tailor doesn't respond.
2. **No granular stage tracking** — `production_step` field is a single VARCHAR column with no timestamp logs, no photos, no notes per stage.
3. **No QC workflow** — Task goes directly to `completed` with no owner quality check step.
4. **No hold/pause mechanism** — Tailor can't pause work for material issues, health, or customer questions.
5. **No audit trail** — Status changes overwrite previous state, no history table.
6. **No tailor matching** — Owner manually picks tailor with no system guidance on workload, specialty, or performance.
7. **No deadline management** — Overdue detection exists but no proactive alerts at 70%/90% thresholds.

### Solution

Replace the current flat task model with a comprehensive production workflow state machine:

```
unassigned → assigned → accepted → in_progress → submitted_for_qc → completed
                ↓           ↓            ↓
            rejected    reassigning   on_hold
                                          ↓
                                      in_progress
```

Terminal states: `completed`, `cancelled`, `failed_qc`

Key features:
- Tailor accept/reject with 4-hour TTL auto-revert
- Stage-based progress tracking with `task_stage_logs` table (timestamps, photos, notes)
- Owner QC step with pass/fail/rework flow
- Hold/resume with deadline adjustment
- Immutable audit trail via `task_history` table
- Tailor matching score (workload, specialty, on-time rate)
- Optimistic locking for concurrent updates

### Scope

**In Scope:**
- New state machine with 10 states (replaces current 5)
- New DB tables: `task_stage_logs`, `task_history`
- New columns on `production_tasks`: `version`, `accepted_at`, `started_at`, `submitted_at`, `hold_reason`, `on_hold_at`, `resumed_at`, `assignment_deadline_at`, `expected_finish_at`, `is_rework`, `rework_count`, `qc_issues`
- Tailor accept/reject flow with TTL auto-revert
- Stage-based progress tracking with configurable stages per garment type
- QC workflow: submitted_for_qc → completed or failed_qc → rework/reassign
- Hold/resume mechanism with deadline adjustment
- Reassigning flow with full audit trail
- Tailor matching score API (workload, specialty, on-time rate)
- Notification matrix for all state transitions
- Optimistic locking (version column)
- Frontend: Production board updates for new states
- Frontend: Tailor mobile UI (accept/reject, stage updates, hold, submit for QC)

**Out of Scope:**
- Cron jobs for TTL enforcement and deadline alerts (Phase 2 — documented but not implemented)
- Photo upload on stage completion (Phase 2)
- Tailor skill_level and specialty configuration UI (Phase 2)
- Push notifications / SMS (in-app only for Phase 1)
- Analytics dashboard for tailor performance (Phase 2)
- Automatic tailor assignment (owner always manually selects)
- Buy/rent order integration with production tasks (separate spec)

## Context for Development

### Codebase Patterns

- **Current TailorTaskDB** has 19 columns. Will be extended with ~12 new columns.
- **Current status values:** `assigned`, `in_progress`, `completed`, `cancelled`, `cancellation_requested`
- **Current production_step values:** `pending`, `cutting`, `sewing`, `finishing`, `quality_check`, `done`
- **Status transitions** enforced in `tailor_task_service.py` via `_VALID_TRANSITIONS` dict (currently only `assigned→in_progress→completed`)
- **Production step transitions** enforce forward-only via index comparison in `PRODUCTION_STEPS` list
- **Auto-transitions**: production_step != `pending` → status = `in_progress`; production_step = `done` → status = `completed`
- **1 active task per order** rule in `create_task()` — excludes cancelled/cancellation_requested tasks
- **approve_order()** creates task with status `assigned` directly (bespoke only, line 1180-1251)
- **NotificationDB** links to `users.id`, uses Vietnamese templates, best-effort after commit
- **Frontend ProductionBoardClient** auto-refetches every 60s, has summary cards, filters, table, create dialog, detail drawer

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `backend/src/models/db_models.py` | TailorTaskDB (512-569), NotificationDB (610-637) | All current columns |
| `backend/src/models/tailor_task.py` | All Pydantic schemas, status enums | 15 models total |
| `backend/src/services/tailor_task_service.py` | Service layer: CRUD, transitions, cancellation, income | ~800 lines |
| `backend/src/api/v1/tailor_tasks.py` | 12 API endpoints: OwnerOnly + OwnerOrTailor auth | All routes |
| `backend/src/services/order_service.py` | approve_order (1099-1278), _all_tailor_tasks_completed (532-547) | Order-task interaction |
| `backend/src/services/notification_creator.py` | 6 tailor-related templates | Templates + create_notification |
| `frontend/src/types/tailor-task.ts` | TypeScript types for tasks, status, stages | All types |
| `frontend/src/components/client/production/` | 8 components: Board, Table, Cards, Filters, Dialogs, Drawer | Production UI |
| `backend/migrations/014_create_tailor_tasks.sql` | Original table schema | Base migration |
| `backend/migrations/032_add_tailor_cancellation_fields.sql` | failure_reason, failure_category, cancellation_resolved_at | Recent additions |

### Technical Decisions

- **Rename table?** No — keep `tailor_tasks` table name. Add new columns via ALTER TABLE. Less risk than creating new table + migrating data.
- **Optimistic locking**: Add `version INTEGER NOT NULL DEFAULT 1` column. Every UPDATE increments version and checks `WHERE version = :expected_version`. Raises 409 Conflict on mismatch.
- **task_stage_logs**: Separate table (not JSONB) for proper indexing, querying, and future photo attachment FK.
- **task_history**: Insert-only table for immutable audit trail. No UPDATE/DELETE allowed (enforced by application layer, optionally by DB trigger).
- **Stage configuration**: Hardcoded per garment type for Phase 1. Future: configurable via admin UI.
- **TTL enforcement**: Phase 1 implements the data model and manual check. Phase 2 adds cron job for automatic revert.
- **Matching score**: Simple formula exposed via API — owner sees score but always makes final decision.
- **Deadline adjustment on hold**: `expected_finish_at += (resumed_at - on_hold_at)` — actual time on hold added back.

## Implementation Plan

### Phase 1: Database & State Machine Foundation

- [ ] **Task 1: DB Migration — Extend tailor_tasks table with new columns**
  - File: `backend/migrations/034_production_task_state_machine.sql`
  - Action: ALTER TABLE `tailor_tasks` ADD COLUMNS:
    ```sql
    ALTER TABLE tailor_tasks
      ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN accepted_at TIMESTAMPTZ,
      ADD COLUMN started_at TIMESTAMPTZ,
      ADD COLUMN submitted_at TIMESTAMPTZ,
      ADD COLUMN hold_reason TEXT,
      ADD COLUMN on_hold_at TIMESTAMPTZ,
      ADD COLUMN resumed_at TIMESTAMPTZ,
      ADD COLUMN assignment_deadline_at TIMESTAMPTZ,
      ADD COLUMN expected_finish_at TIMESTAMPTZ,
      ADD COLUMN is_rework BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN rework_count INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN qc_issues TEXT,
      ADD COLUMN rejection_reason TEXT,
      ADD COLUMN rejection_category VARCHAR(50),
      ADD COLUMN reassignment_reason TEXT,
      ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal',
      ALTER COLUMN assigned_to DROP NOT NULL,
      ALTER COLUMN status SET DEFAULT 'unassigned';
    ```
    - Make `assigned_to` nullable (tasks start as `unassigned` with no tailor)
    - Update default status from `'assigned'` to `'unassigned'`
    - Add CHECK constraint on `priority IN ('normal', 'urgent')`
    - Add CHECK constraint on `rejection_category IN ('overloaded', 'not_specialty', 'personal', 'other') OR rejection_category IS NULL`
  - Notes: Existing tasks with status='assigned' keep their current data. New fields are all nullable except version/is_rework/rework_count/priority.

- [ ] **Task 2: DB Migration — Create task_stage_logs table**
  - File: `backend/migrations/034_production_task_state_machine.sql` (same file)
  - Action: CREATE TABLE `task_stage_logs`:
    ```sql
    CREATE TABLE task_stage_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tailor_tasks(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      stage VARCHAR(50) NOT NULL,
      stage_order INTEGER NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      started_at TIMESTAMPTZ,
      completed_at TIMESTAMPTZ,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_stage_status CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'))
    );
    CREATE INDEX idx_task_stage_logs_task_id ON task_stage_logs(task_id);
    CREATE INDEX idx_task_stage_logs_tenant_id ON task_stage_logs(tenant_id);
    ```
  - Notes: `stage_order` enforces sequential progression. `skipped` status for stages removed by owner config.

- [ ] **Task 3: DB Migration — Create task_history table**
  - File: `backend/migrations/034_production_task_state_machine.sql` (same file)
  - Action: CREATE TABLE `task_history`:
    ```sql
    CREATE TABLE task_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      task_id UUID NOT NULL REFERENCES tailor_tasks(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      actor_id UUID NOT NULL REFERENCES users(id),
      actor_role VARCHAR(20) NOT NULL,
      action VARCHAR(50) NOT NULL,
      from_status VARCHAR(50),
      to_status VARCHAR(50),
      reason TEXT,
      metadata JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX idx_task_history_task_id ON task_history(task_id);
    CREATE INDEX idx_task_history_tenant_id ON task_history(tenant_id);
    ```
  - Notes: Insert-only. Application layer MUST NOT issue UPDATE/DELETE on this table. `metadata` stores context-specific data (e.g., old_tailor_id, new_tailor_id for reassign).

- [ ] **Task 4: Backend — Update TailorTaskDB ORM model**
  - File: `backend/src/models/db_models.py` (TailorTaskDB, ~line 512)
  - Action:
    1. Add all new columns as `Mapped[...]` attributes matching migration
    2. Make `assigned_to: Mapped[UUID | None]` (nullable)
    3. Change default status to `"unassigned"`
    4. Add relationships: `stage_logs = relationship("TaskStageLogDB", back_populates="task")`, `history = relationship("TaskHistoryDB", back_populates="task")`
    5. Create new ORM models `TaskStageLogDB` and `TaskHistoryDB`
  - Notes: Keep existing column names unchanged for backward compatibility.

- [ ] **Task 5: Backend — Rewrite Pydantic schemas for new state machine**
  - File: `backend/src/models/tailor_task.py`
  - Action:
    1. Update TaskStatus literal: `"unassigned" | "assigned" | "accepted" | "rejected" | "in_progress" | "on_hold" | "reassigning" | "submitted_for_qc" | "completed" | "cancelled" | "failed_qc"`
    2. New schemas:
       - `TaskAcceptRequest(BaseModel)` — empty body (just POST to endpoint)
       - `TaskRejectRequest(BaseModel)`: `rejection_category: Literal["overloaded", "not_specialty", "personal", "other"]`, `rejection_reason: str` (min 10 chars)
       - `TaskStartRequest(BaseModel)` — empty body
       - `TaskHoldRequest(BaseModel)`: `hold_reason: str` (min 10 chars)
       - `TaskResumeRequest(BaseModel)` — empty body
       - `TaskSubmitForQCRequest(BaseModel)` — empty body
       - `QCResultRequest(BaseModel)`: `result: Literal["pass", "fail"]`, `qc_issues: str | None = None`, `action_on_fail: Literal["rework", "reassign", "fail"] | None = None`, `new_tailor_id: UUID | None = None`
       - `TaskReassignRequest(BaseModel)`: `new_tailor_id: UUID`, `reassignment_reason: str` (min 10 chars), `continue_from_current_stage: bool = True`
       - `StageUpdateRequest(BaseModel)`: `notes: str | None = None`
       - `TaskStageLogResponse(BaseModel)`: all fields from DB
       - `TaskHistoryResponse(BaseModel)`: all fields from DB
       - `TailorMatchingScore(BaseModel)`: `tailor_id: UUID`, `tailor_name: str`, `workload_score: float`, `specialty_match: bool`, `on_time_rate: float`, `overall_score: float`
    3. Update `TailorTaskResponse` to include all new fields
    4. Update `TailorTaskDetailResponse` to include `stage_logs: list[TaskStageLogResponse]` and `history: list[TaskHistoryResponse]`
    5. Update `TailorTaskSummary` to include counts for new statuses
    6. Keep existing income schemas unchanged

- [ ] **Task 6: Backend — Rewrite state machine transitions in service layer**
  - File: `backend/src/services/tailor_task_service.py`
  - Action: Replace `_VALID_TRANSITIONS` with comprehensive transition matrix:
    ```python
    _VALID_TRANSITIONS: dict[str, list[str]] = {
        "unassigned": ["assigned", "cancelled"],
        "assigned": ["accepted", "rejected", "reassigning", "cancelled"],
        "accepted": ["in_progress", "cancelled"],
        "rejected": [],  # terminal for this assignment, task goes to unassigned
        "in_progress": ["on_hold", "submitted_for_qc", "reassigning", "cancelled"],
        "on_hold": ["in_progress", "reassigning", "cancelled"],
        "reassigning": ["unassigned"],  # intermediate → always resolves to unassigned
        "submitted_for_qc": ["completed", "failed_qc"],
        "completed": [],  # terminal
        "cancelled": [],  # terminal
        "failed_qc": ["in_progress", "reassigning", "cancelled"],  # rework or reassign
    }
    ```
  - Add internal `_transition_task(db, task, to_status, actor_id, actor_role, reason=None, metadata=None)`:
    1. Validate transition is allowed
    2. Check optimistic lock: `WHERE version = task.version`
    3. Increment version
    4. Update status + relevant timestamp fields
    5. Insert record into `task_history`
    6. Return updated task
  - Notes: All status changes MUST go through `_transition_task()`. No direct status field updates.

- [ ] **Task 7: Backend — Implement new endpoint handlers**
  - File: `backend/src/api/v1/tailor_tasks.py` + `backend/src/services/tailor_task_service.py`
  - Action: New endpoints (all under `/api/v1/tailor-tasks`):
    | Method | Route | Auth | Handler |
    |---|---|---|---|
    | POST | `/{task_id}/accept` | OwnerOrTailor | `accept_task()` — transition assigned→accepted, set accepted_at, calc expected_finish_at |
    | POST | `/{task_id}/reject` | OwnerOrTailor | `reject_task()` — transition assigned→rejected, set rejection fields, transition to unassigned, notify owner |
    | POST | `/{task_id}/start` | OwnerOrTailor | `start_task()` — transition accepted→in_progress, set started_at, create initial stage_logs |
    | POST | `/{task_id}/hold` | OwnerOrTailor | `hold_task()` — transition in_progress→on_hold, set hold_reason + on_hold_at, notify owner |
    | POST | `/{task_id}/resume` | OwnerOrTailor | `resume_task()` — transition on_hold→in_progress, set resumed_at, adjust expected_finish_at |
    | POST | `/{task_id}/submit-qc` | OwnerOrTailor | `submit_for_qc()` — transition in_progress→submitted_for_qc, set submitted_at, notify owner |
    | POST | `/{task_id}/qc-result` | OwnerOnly | `process_qc_result()` — pass→completed, fail→failed_qc or rework or reassign |
    | POST | `/{task_id}/reassign` | OwnerOnly | `reassign_task()` — transition to reassigning→unassigned, set new tailor, notify both tailors |
    | POST | `/{task_id}/stages/{stage_order}/complete` | OwnerOrTailor | `complete_stage()` — mark stage done, advance to next, calc progress % |
    | GET | `/{task_id}/history` | OwnerOnly | `get_task_history()` — return immutable audit trail |
    | GET | `/matching-scores/{order_id}` | OwnerOnly | `get_matching_scores()` — return ranked tailor list |
  - Notes: Keep existing endpoints for backward compatibility but update internal logic.

- [ ] **Task 8: Backend — Update approve_order() to create unassigned task**
  - File: `backend/src/services/order_service.py` (~line 1180-1251)
  - Action: For bespoke orders, change task creation:
    1. Create task with `status='unassigned'` and `assigned_to=None` (instead of assigned with tailor)
    2. Do NOT auto-transition order to `in_progress` — order stays at `confirmed` until task is assigned and accepted
    3. Calculate `deadline_at` from `order.delivery_date - 3 days buffer`
    4. Calculate `estimated_duration_days` based on garment type (hardcoded mapping for Phase 1)
    5. Send notification to owner: "Có đơn mới cần giao việc: #{order_code} - {customer_name} - {garment_name}"
  - Notes: This changes the bespoke approve flow. Order transitions to `in_progress` only when tailor accepts (handled in `accept_task()`).

- [ ] **Task 9: Backend — Tailor matching score API**
  - File: `backend/src/services/tailor_task_service.py`
  - Action: New function `async def get_matching_scores(db, order_id, tenant_id) -> list[TailorMatchingScore]`:
    1. Get all active tailors for tenant
    2. For each tailor, calculate:
       - `workload_score` = 1 - (active_tasks / max_concurrent_tasks). Default max = 5.
       - `specialty_match` = True/False (Phase 1: always True, no specialty data yet)
       - `on_time_rate` = completed_on_time / total_completed (last 90 days). Default 1.0 if no history.
       - `overall_score` = workload_score * 0.5 + on_time_rate * 0.3 + (1.0 if specialty_match else 0.0) * 0.2
    3. Sort by `overall_score` DESC
    4. Return list
  - Notes: Simple formula for Phase 1. Can be refined later with actual specialty data.

- [ ] **Task 10: Backend — Stage lifecycle management**
  - File: `backend/src/services/tailor_task_service.py`
  - Action:
    1. Define stage configs per garment type:
       ```python
       GARMENT_STAGES = {
           "default": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "finishing"],
           "ao_dai": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "finishing"],
           "wedding": ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "beading", "finishing"],
       }
       ```
    2. `create_stage_logs(db, task_id, tenant_id, garment_type)` — creates stage_log records for each stage in order
    3. `complete_stage(db, task_id, stage_order, actor_id, notes=None)` — validates sequential order, marks stage completed, starts next stage
    4. `get_progress(task)` — returns `completed_stages / total_stages` as percentage
  - Notes: Stage logs are created when tailor starts task (POST /start), not when task is created.

- [ ] **Task 11: Backend — New notification templates**
  - File: `backend/src/services/notification_creator.py`
  - Action: Add templates:
    ```python
    TASK_CREATED_OWNER = ("Đơn mới cần giao việc", "Có đơn mới cần giao việc: #{order_code} - {customer_name} - {garment_name}")
    TASK_ASSIGNED_TAILOR = ("Công việc mới", "Bạn được giao công việc: {garment_name} - {customer_name}. Hạn phản hồi: {deadline}")
    TAILOR_ACCEPTED = ("Thợ đã nhận việc", "{tailor_name} đã nhận đơn #{order_code}")
    TAILOR_REJECTED = ("Thợ từ chối", "{tailor_name} từ chối đơn #{order_code}. Lý do: {reason}")
    TAILOR_NO_RESPONSE = ("Thợ chưa phản hồi", "{tailor_name} chưa phản hồi đơn #{order_code}, cần giao lại")
    TASK_ON_HOLD = ("Tạm dừng công việc", "{tailor_name} tạm dừng đơn #{order_code}. Lý do: {reason}")
    TASK_RESUMED = ("Tiếp tục công việc", "{tailor_name} tiếp tục đơn #{order_code}")
    TASK_SUBMITTED_QC = ("Cần kiểm tra chất lượng", "{tailor_name} đã hoàn thành đơn #{order_code}, cần kiểm tra")
    QC_PASSED = ("Đạt kiểm tra", "Đơn #{order_code} đã đạt kiểm tra chất lượng, chuyển đóng gói")
    QC_FAILED_REWORK = ("Cần sửa lại", "Đơn #{order_code} cần sửa lại. Chi tiết: {issues}")
    TASK_REASSIGNED_OLD = ("Chuyển công việc", "Công việc #{order_code} đã được chuyển cho thợ khác")
    TASK_REASSIGNED_NEW = ("Công việc mới (chuyển tiếp)", "Bạn được giao tiếp công việc #{order_code} từ {old_tailor_name}")
    DEADLINE_70 = ("Nhắc hạn chót", "Đơn #{order_code} còn ít thời gian, hãy ưu tiên")
    DEADLINE_90 = ("Cảnh báo hạn chót", "Đơn #{order_code} sắp hết hạn!")
    DEADLINE_OVERDUE = ("Quá hạn", "Đơn #{order_code} đã quá hạn!")
    CUSTOMER_QC_PASSED = ("Sản phẩm đã may xong", "Sản phẩm đơn #{order_code} đã may xong, đang đóng gói")
    ```

### Phase 2: Frontend Updates

- [ ] **Task 12: Frontend — Update TypeScript types**
  - File: `frontend/src/types/tailor-task.ts`
  - Action:
    1. Update `TaskStatus` union to include all new states: `"unassigned" | "assigned" | "accepted" | "rejected" | "in_progress" | "on_hold" | "reassigning" | "submitted_for_qc" | "completed" | "cancelled" | "failed_qc"`
    2. Add `RejectionCategory = "overloaded" | "not_specialty" | "personal" | "other"`
    3. Add `TaskStageLog` interface: `id, task_id, stage, stage_order, status, started_at, completed_at, notes`
    4. Add `TaskHistory` interface: `id, task_id, actor_id, actor_role, action, from_status, to_status, reason, metadata, created_at`
    5. Add `TailorMatchingScore` interface
    6. Update `TailorTask` interface with all new fields (version, accepted_at, started_at, etc.)
    7. Add request types: `TaskRejectRequest`, `TaskHoldRequest`, `QCResultRequest`, `TaskReassignRequest`

- [ ] **Task 13: Frontend — Update Production Board for new states**
  - File: `frontend/src/components/client/production/ProductionBoardClient.tsx`
  - Action:
    1. Update summary cards: add Unassigned (orange), Submitted for QC (purple), On Hold (yellow), Failed QC (red) cards
    2. Update filter dropdown with new status options
  - File: `frontend/src/components/client/production/ProductionSummaryCards.tsx`
  - Action: Add new card variants for new statuses
  - File: `frontend/src/components/client/production/ProductionTaskTable.tsx`
  - Action: Update status badges with new colors/labels:
    - unassigned: "Chờ giao việc" (orange)
    - assigned: "Chờ nhận" (amber)
    - accepted: "Đã nhận" (blue)
    - in_progress: "Đang may" (indigo)
    - on_hold: "Tạm dừng" (yellow)
    - submitted_for_qc: "Chờ kiểm tra" (purple)
    - completed: "Hoàn thành" (green)
    - failed_qc: "Không đạt QC" (red)
    - cancelled: "Đã huỷ" (gray)

- [ ] **Task 14: Frontend — Update TaskCreateDialog for unassigned flow**
  - File: `frontend/src/components/client/production/TaskCreateDialog.tsx`
  - Action:
    1. Task creation no longer requires tailor selection (starts as `unassigned`)
    2. Add optional tailor selection with matching scores displayed
    3. If tailor selected → task starts as `assigned`; if not → `unassigned`
    4. Fetch matching scores from `GET /matching-scores/{order_id}` when order is selected
    5. Display scores as sortable list: name, workload, on-time rate, overall score

- [ ] **Task 15: Frontend — Update TaskDetailDrawer for new workflow**
  - File: `frontend/src/components/client/production/TaskDetailDrawer.tsx`
  - Action:
    1. Show stage progress bar (visual stages with completed/current/pending indicators)
    2. Show task history timeline (from `GET /{task_id}/history`)
    3. Owner actions based on current task status:
       - `unassigned`: "Giao việc" button → assign tailor (with matching scores)
       - `assigned`: "Chờ thợ phản hồi" info + deadline countdown
       - `submitted_for_qc`: "Đạt" / "Cần sửa" / "Chuyển thợ" buttons
       - `on_hold`: Show hold_reason + "Chuyển thợ khác" option
       - `failed_qc`: "Giao sửa lại" / "Chuyển thợ khác" / "Đánh dấu hỏng" buttons
    4. Show version number for debug (small text)

- [ ] **Task 16: Frontend — Tailor mobile view: accept/reject, stages, hold, submit**
  - File: `frontend/src/components/tailor/` (check existing tailor components)
  - Action:
    1. **Accept/Reject view** (status=assigned): Two large buttons "Nhận việc" (green) / "Từ chối" (red). Reject requires category dropdown + reason textarea.
    2. **Work view** (status=accepted/in_progress): "Bắt đầu may" button (accepted→in_progress). Stage checklist with "Hoàn thành [stage]" buttons. Progress bar.
    3. **Hold view**: "Tạm dừng" button with reason dropdown (Hết phụ liệu/vải, Cần xác nhận từ khách, Vấn đề sức khỏe, Phát hiện lỗi, Khác). "Tiếp tục" button when on_hold.
    4. **Submit view**: "Hoàn tất" button (all stages must be complete). Confirmation dialog before submit.
  - Notes: All views mobile-responsive. Large touch targets. Vietnamese labels.

### Phase 3: Order Integration & Polish

- [ ] **Task 17: Backend — Update order status transitions for new task workflow**
  - File: `backend/src/services/order_service.py`
  - Action:
    1. Order stays at `confirmed` after approve (not `in_progress`)
    2. Order transitions to `in_progress` when task is accepted (not assigned)
    3. `_all_tailor_tasks_completed()` update: check for `submitted_for_qc` or `completed` (not just `completed`)
    4. When QC passes → order transitions from `in_progress` to next step (packaging/ready_to_ship)
  - Notes: Order-task coupling tightened. Task lifecycle drives order lifecycle for bespoke.

- [ ] **Task 18: Frontend — Update OrderTable badges for new task states**
  - File: `frontend/src/components/client/orders/OrderTable.tsx`
  - Action:
    1. Update tailor_task_info badges for all new states:
       - unassigned: "Chờ giao việc" (orange)
       - assigned: "Chờ {tailor_name} nhận" (amber)
       - accepted: "{tailor_name} đã nhận" (blue)
       - in_progress: "Đang may - {tailor_name}" (indigo) + progress %
       - on_hold: "Tạm dừng - {tailor_name}" (yellow)
       - submitted_for_qc: "Chờ kiểm tra" (purple)
       - completed: "✓ {tailor_name} hoàn thành" (green)
       - failed_qc: "Không đạt QC" (red)
    2. Update backend `tailor_task_info` response to include `progress_percent` field

### Acceptance Criteria

**Phase 1 (Backend):**
- [ ] AC1: Given a bespoke order being approved, when `approve_order()` runs, then a production_task is created with `status='unassigned'` and `assigned_to=NULL`, and owner receives "Có đơn mới cần giao việc" notification.
- [ ] AC2: Given an unassigned task, when owner assigns a tailor, then task transitions to `assigned` with `assignment_deadline_at = now + 4 working hours`, tailor receives notification, and task_history records the assignment.
- [ ] AC3: Given an assigned task, when tailor taps "Nhận việc", then task transitions to `accepted`, `accepted_at` is set, `expected_finish_at` is calculated, owner receives notification, and order transitions to `in_progress`.
- [ ] AC4: Given an assigned task, when tailor taps "Từ chối" with category + reason, then task transitions to `rejected` then to `unassigned`, owner receives notification with reason, and task_history preserves the rejection record.
- [ ] AC5: Given an accepted task, when tailor taps "Bắt đầu may", then task transitions to `in_progress`, `started_at` is set, and stage_logs are created for the garment type stages.
- [ ] AC6: Given an in_progress task, when tailor completes a stage, then `task_stage_logs` is updated, next stage starts, and progress % is recalculated.
- [ ] AC7: Given an in_progress task, when tailor taps "Tạm dừng" with reason, then task transitions to `on_hold`, `on_hold_at` and `hold_reason` are set, and owner receives immediate notification.
- [ ] AC8: Given an on_hold task, when tailor/owner taps "Tiếp tục", then task transitions to `in_progress`, `resumed_at` is set, and `expected_finish_at` is adjusted by hold duration.
- [ ] AC9: Given all stages completed, when tailor taps "Hoàn tất", then task transitions to `submitted_for_qc`, `submitted_at` is set, and owner receives "Cần kiểm tra" notification.
- [ ] AC10: Given a submitted_for_qc task, when owner taps "Đạt", then task transitions to `completed`, order transitions to next step, and customer receives "Sản phẩm đã may xong" notification.
- [ ] AC11: Given a submitted_for_qc task, when owner taps "Cần sửa", then task transitions to `failed_qc` then to `in_progress` with `is_rework=true` and `rework_count++`, and tailor receives notification with QC issues.
- [ ] AC12: Given any status change, then a `task_history` record is inserted with actor, action, from/to status, reason, and timestamp.
- [ ] AC13: Given two concurrent updates on the same task, when both send the same version number, then the second request returns 409 Conflict.

**Phase 2 (Frontend):**
- [ ] AC14: Given the production board, when owner views it, then summary cards show counts for all new statuses (unassigned, assigned, accepted, in_progress, on_hold, submitted_for_qc, completed, failed_qc).
- [ ] AC15: Given a tailor viewing assigned task on mobile, when they tap "Nhận việc"/"Từ chối", then the appropriate action is triggered with mobile-friendly UI.
- [ ] AC16: Given an in_progress task, when owner views task detail drawer, then stage progress bar and task history timeline are displayed.

## Additional Context

### Dependencies

- Existing TailorTaskDB model — extended, not replaced
- approve_order() — behavior change for bespoke (creates unassigned task)
- NotificationDB — no schema changes, new templates only
- Frontend ProductionBoard — UI updates for new states
- Tailor mobile UI — may need new page/route if not existing

### Testing Strategy

- **Backend unit**: Test all state transitions (valid + invalid), test optimistic locking conflict, test stage progression, test matching score calculation
- **Backend integration**: Full flow: approve → assign → accept → start → stages → submit QC → pass/fail → complete
- **Frontend component**: Test badge rendering for all 11 states, test tailor accept/reject UI, test QC result UI
- **Manual E2E**: Complete bespoke workflow end-to-end with multiple tailors, holds, and QC failures

### Notes

- Phase 1 focuses on backend + state machine. Phase 2 focuses on frontend. Phase 3 integrates with order flow.
- Cron jobs for TTL auto-revert and deadline alerts are Phase 2 — data model supports them but implementation deferred.
- The `production_step` column on tailor_tasks is DEPRECATED by this spec — replaced by `task_stage_logs` table. Column kept for backward compatibility but not used in new flow.
- Existing `cancellation_requested` status is replaced by the reject/reassign flow. Migration should map: `cancellation_requested` → `on_hold` for any active tasks.
- Matching score is a simple read-only API — does NOT auto-assign. Owner always makes final decision.
