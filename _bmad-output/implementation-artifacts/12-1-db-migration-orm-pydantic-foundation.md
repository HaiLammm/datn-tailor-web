# Story 12.1: DB Migration + ORM + Pydantic Schemas — Production Task State Machine Foundation

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Owner (Chu tiem),
I want the production task system to have a comprehensive data model supporting the full state machine workflow (unassigned, assigned, accepted, rejected, in_progress, on_hold, reassigning, submitted_for_qc, completed, cancelled, failed_qc),
so that the system can track every stage of bespoke garment production with audit trails and optimistic locking.

## Acceptance Criteria

1. **Given** the database migration runs, **When** I inspect `tailor_tasks` table, **Then** all new columns exist: `version`, `accepted_at`, `started_at`, `submitted_at`, `hold_reason`, `on_hold_at`, `resumed_at`, `assignment_deadline_at`, `expected_finish_at`, `is_rework`, `rework_count`, `qc_issues`, `rejection_reason`, `rejection_category`, `reassignment_reason`, `priority`, and `assigned_to` is nullable with default status `'unassigned'`.

2. **Given** the migration runs, **When** I inspect `task_stage_logs` table, **Then** it exists with columns: `id`, `task_id`, `tenant_id`, `stage`, `stage_order`, `status`, `started_at`, `completed_at`, `notes`, `created_at`, `updated_at`, with proper FK to `tailor_tasks` and `tenants`, CHECK constraint on status, and indexes on `task_id` and `tenant_id`.

3. **Given** the migration runs, **When** I inspect `task_history` table, **Then** it exists with columns: `id`, `task_id`, `tenant_id`, `actor_id`, `actor_role`, `action`, `from_status`, `to_status`, `reason`, `metadata` (JSONB), `created_at`, with proper FKs and indexes.

4. **Given** the ORM models are updated, **When** I import `TailorTaskDB`, `TaskStageLogDB`, `TaskHistoryDB` from `db_models.py`, **Then** all columns match the migration, relationships are defined (`stage_logs`, `history` on TailorTaskDB), and `assigned_to` is `Mapped[uuid.UUID | None]`.

5. **Given** the Pydantic schemas are updated, **When** I import from `tailor_task.py`, **Then** `TaskStatus` includes all 11 states, new request schemas exist (`TaskAcceptRequest`, `TaskRejectRequest`, `TaskStartRequest`, `TaskHoldRequest`, `TaskResumeRequest`, `TaskSubmitForQCRequest`, `QCResultRequest`, `TaskReassignRequest`, `StageUpdateRequest`), response schemas include new fields, and `TailorTaskSummary` counts all new statuses.

6. **Given** existing tasks in DB with `status='assigned'`, **When** migration runs, **Then** existing data is preserved — no data loss, existing tasks keep their current status and `assigned_to` values.

7. **Given** the `priority` column, **When** inserting a row, **Then** CHECK constraint enforces value must be `'normal'` or `'urgent'`, default is `'normal'`.

8. **Given** the `rejection_category` column, **When** inserting a row, **Then** CHECK constraint enforces value must be one of `'overloaded'`, `'not_specialty'`, `'personal'`, `'other'`, or NULL.

## Tasks / Subtasks

- [x] Task 1: DB Migration — Extend tailor_tasks table with new columns (AC: #1, #6, #7, #8)
  - [x] 1.1: Create `backend/migrations/034_production_task_state_machine.sql`
  - [x] 1.2: ALTER TABLE `tailor_tasks` — add 16 new columns (version, accepted_at, started_at, submitted_at, hold_reason, on_hold_at, resumed_at, assignment_deadline_at, expected_finish_at, is_rework, rework_count, qc_issues, rejection_reason, rejection_category, reassignment_reason, priority)
  - [x] 1.3: ALTER `assigned_to` DROP NOT NULL
  - [x] 1.4: ALTER `status` SET DEFAULT 'unassigned'
  - [x] 1.5: ADD CHECK constraints on `priority` and `rejection_category`

- [x] Task 2: DB Migration — Create task_stage_logs table (AC: #2)
  - [x] 2.1: CREATE TABLE `task_stage_logs` with all columns, FK, CHECK, indexes (same migration file)

- [x] Task 3: DB Migration — Create task_history table (AC: #3)
  - [x] 3.1: CREATE TABLE `task_history` with all columns, FK, indexes (same migration file)

- [x] Task 4: Backend — Update TailorTaskDB ORM model + create new ORM models (AC: #4)
  - [x] 4.1: Add all new columns to `TailorTaskDB` as `Mapped[...]` attributes
  - [x] 4.2: Make `assigned_to: Mapped[uuid.UUID | None]` (nullable)
  - [x] 4.3: Change default status to `"unassigned"`
  - [x] 4.4: Add relationships `stage_logs` and `history` to TailorTaskDB
  - [x] 4.5: Create `TaskStageLogDB` ORM model with relationship back to TailorTaskDB
  - [x] 4.6: Create `TaskHistoryDB` ORM model with relationship back to TailorTaskDB

- [x] Task 5: Backend — Rewrite Pydantic schemas for new state machine (AC: #5)
  - [x] 5.1: Update `TaskStatus` type to 11-state union
  - [x] 5.2: Create new request schemas: `TaskAcceptRequest`, `TaskRejectRequest`, `TaskStartRequest`, `TaskHoldRequest`, `TaskResumeRequest`, `TaskSubmitForQCRequest`, `QCResultRequest`, `TaskReassignRequest`, `StageUpdateRequest`
  - [x] 5.3: Create new response schemas: `TaskStageLogResponse`, `TaskHistoryResponse`, `TailorMatchingScore`
  - [x] 5.4: Update `TailorTaskResponse` with all new fields
  - [x] 5.5: Update `TailorTaskDetailResponse` to include `stage_logs` and `history`
  - [x] 5.6: Update `TailorTaskSummary` with counts for all new statuses
  - [x] 5.7: Keep existing income schemas unchanged

## Dev Notes

### Architecture Patterns & Constraints

- **Authoritative Server Pattern:** Backend is SSOT. All validation and state logic on backend.
- **Async SQLAlchemy 2.x:** All ORM models use `Mapped[...]` type annotations. Relationships use `relationship()`.
- **Multi-tenant isolation:** All tables include `tenant_id` FK to `tenants(id)` with CASCADE delete.
- **snake_case everywhere:** DB columns, API fields, Pydantic model fields all snake_case.
- **Pydantic v2:** Use `BaseModel` with `Field()` for validation. Literal types for enums.
- **DB Commit Rule:** After `db.flush()` MUST call `await db.commit()`.

### Key Technical Decisions

- **No table rename:** Keep `tailor_tasks` table name. Extend with ALTER TABLE.
- **Optimistic locking:** `version INTEGER NOT NULL DEFAULT 1` — every UPDATE increments and checks `WHERE version = :expected_version`.
- **task_stage_logs as separate table:** Not JSONB — enables proper indexing, querying, future photo FK.
- **task_history as insert-only:** Application layer MUST NOT issue UPDATE/DELETE. Immutable audit trail.
- **assigned_to nullable:** Tasks start as `unassigned` with `assigned_to = NULL`.
- **production_step DEPRECATED:** Column kept for backward compat but replaced by `task_stage_logs` in new flow.
- **Existing cancellation_requested status:** Will be mapped to new flow in future migration. No data migration in this story.

### Source Tree Components to Touch

**New files:**
- `backend/migrations/034_production_task_state_machine.sql` — Migration for all schema changes

**Modified files:**
- `backend/src/models/db_models.py` — TailorTaskDB extension + TaskStageLogDB + TaskHistoryDB
- `backend/src/models/tailor_task.py` — Complete Pydantic schema rewrite

### Current TailorTaskDB Location

- File: `backend/src/models/db_models.py`, lines 514-577
- 19 existing columns, relationships to OrderDB, UserDB (assignee/assigner), DesignDB
- Current status values: assigned, in_progress, completed, cancelled, cancellation_requested
- Current production_step values: pending, cutting, sewing, finishing, quality_check, done

### Current Pydantic Schemas Location

- File: `backend/src/models/tailor_task.py`, 241 lines
- 15 models: TailorTaskResponse, TailorTaskSummary, TailorTaskDetailResponse, StatusUpdateRequest, CancellationRequestInput, ResolveCancellationInput, ProductionStepUpdateRequest, TaskCreateRequest, TaskUpdateRequest, OwnerTaskItem, OwnerTaskListResponse, TailorMonthlyIncome, TailorIncomeResponse, TaskFilterParams, IncomeDetailItem, TailorIncomeDetailResponse

### Existing Migration Files

- `backend/migrations/014_create_tailor_tasks.sql` — Original table
- `backend/migrations/032_add_tailor_cancellation_fields.sql` — failure_reason, failure_category, cancellation_resolved_at

### Testing Standards

- Backend: pytest with async fixtures, httpx AsyncClient
- Test migration runs without errors on existing data
- Test ORM model instantiation with new fields
- Test Pydantic schema validation for all new request/response types
- Test CHECK constraints reject invalid values

### Critical Warnings

1. **DO NOT** delete or rename existing columns — backward compatibility required
2. **DO NOT** change existing Pydantic schema names — other services depend on them
3. **DO NOT** remove existing status values from TaskStatus — add new ones alongside
4. **DO NOT** add NOT NULL columns without defaults — existing rows would fail
5. **MUST** keep income schemas unchanged (TailorMonthlyIncome, TailorIncomeResponse, etc.)
6. **MUST** preserve existing TaskCreateRequest and TaskUpdateRequest for backward compat

### References

- [Source: _bmad-output/implementation-artifacts/tech-spec-bespoke-production-task-workflow.md — Tasks 1-5]
- [Source: backend/src/models/db_models.py#TailorTaskDB (lines 514-577)]
- [Source: backend/src/models/tailor_task.py — All current schemas]
- [Source: backend/migrations/014_create_tailor_tasks.sql]
- [Source: backend/migrations/032_add_tailor_cancellation_fields.sql]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- SQLAlchemy `metadata` reserved name conflict resolved by using `extra_metadata` with explicit column name mapping `mapped_column("metadata", JSON)`

### Completion Notes List

- Migration 034 created: 16 new columns on tailor_tasks, assigned_to nullable, status default 'unassigned', CHECK constraints on priority and rejection_category, task_stage_logs table, task_history table
- TailorTaskDB extended with 16 new Mapped attributes, nullable assigned_to, default unassigned, stage_logs/history relationships
- TaskStageLogDB and TaskHistoryDB ORM models created with back_populates relationships
- TaskStatus Literal updated to 11 states, 9 new request schemas, 3 new response schemas created
- TailorTaskResponse updated with all new fields, TailorTaskDetailResponse includes stage_logs/history
- TailorTaskSummary updated with counts for all 11+1 statuses
- Income schemas kept unchanged (TailorMonthlyIncome, TailorIncomeResponse, etc.)
- All 13 existing tailor task tests pass (no regressions)
- Pre-existing test failures in test_production_step, test_rental_service, test_10_7, test_11_2, test_11_3 are unrelated to this story

### Change Log

- 2026-05-21: Story 12.1 implementation complete — DB migration, ORM models, Pydantic schemas for production task state machine foundation

### File List

- backend/migrations/034_production_task_state_machine.sql (NEW)
- backend/src/models/db_models.py (MODIFIED)
- backend/src/models/tailor_task.py (MODIFIED)
