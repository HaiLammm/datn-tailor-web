# Story 12.4: Frontend Types & Production Board — 11-State Machine UI

Status: review

## Story

As a Owner (Chu tiem),
I want the production board UI to reflect the full 11-state task machine (unassigned, assigned, accepted, rejected, in_progress, on_hold, reassigning, submitted_for_qc, completed, cancelled, failed_qc) with updated TypeScript types, summary cards, status badges, filters, task creation with optional tailor + matching scores, and task detail drawer with stage progress + history timeline + owner action buttons,
so that I can manage the entire bespoke production workflow from a single board with full visibility into task states, tailor performance, and QC results.

## Acceptance Criteria

1. **TypeScript types aligned with backend 11-state machine:**
   - `TaskStatus` union includes all 11 states: `unassigned | assigned | accepted | rejected | in_progress | on_hold | reassigning | submitted_for_qc | completed | cancelled | failed_qc`
   - `TaskPriority` type: `normal | urgent`
   - `RejectionCategory` type: `overloaded | not_specialty | personal | other`
   - `TailorTask` interface extended with: `version`, `accepted_at`, `started_at`, `submitted_at`, `hold_reason`, `on_hold_at`, `resumed_at`, `assignment_deadline_at`, `expected_finish_at`, `is_rework`, `rework_count`, `qc_issues`, `rejection_reason`, `rejection_category`, `reassignment_reason`, `priority`
   - `assigned_to` changed from `string` to `string | null` (tasks can be unassigned)
   - New interfaces: `TaskStageLog`, `TaskHistory`, `TailorMatchingScore`
   - New request types: `TaskRejectRequest`, `TaskHoldRequest`, `QCResultRequest`, `TaskReassignRequest`
   - `TailorTaskSummary` updated with counts for all 11 states + `overdue`
   - `TailorTaskDetailResponse` interface with `stage_logs` and `history` arrays

2. **Production summary cards show all relevant states:**
   - Cards: Tổng, Chờ giao việc (unassigned/orange), Chờ nhận (assigned/amber), Đang may (in_progress/indigo), Tạm dừng (on_hold/yellow), Chờ kiểm tra (submitted_for_qc/purple), Hoàn thành (completed/green), Không đạt QC (failed_qc/red), Quá hạn (overdue/red-pulse)
   - Grid responsive: 3 cols on mobile, 5 cols on lg+

3. **Production task table status badges updated for all 11 states:**
   - `unassigned`: "Chờ giao việc" (orange)
   - `assigned`: "Chờ nhận" (amber)
   - `accepted`: "Đã nhận" (blue)
   - `in_progress`: "Đang may" (indigo)
   - `on_hold`: "Tạm dừng" (yellow)
   - `reassigning`: "Đang chuyển" (gray)
   - `submitted_for_qc`: "Chờ kiểm tra" (purple)
   - `completed`: "Hoàn thành" (green)
   - `failed_qc`: "Không đạt QC" (red)
   - `cancelled`: "Đã huỷ" (gray)
   - `rejected`: "Từ chối" (rose)
   - Table shows `progress_percent` column for in_progress tasks (from `task_stage_logs`)
   - Table shows `priority` badge for urgent tasks

4. **Production filters updated with new status options:**
   - Filter dropdown includes all active statuses: unassigned, assigned, accepted, in_progress, on_hold, submitted_for_qc, completed, failed_qc, overdue
   - Vietnamese labels matching badge labels

5. **TaskCreateDialog updated for unassigned flow:**
   - Tailor selection is OPTIONAL (not required). If omitted → task created as `unassigned`
   - When order is selected, fetch matching scores from `GET /api/v1/tailor-tasks/matching-scores/{order_id}`
   - Display matching scores as sortable list: name, workload score, on-time rate, overall score
   - If tailor selected from list → task created as `assigned`
   - New server action: `fetchMatchingScores(orderId: string)`

6. **TaskDetailDrawer updated for full workflow:**
   - Show stage progress bar (visual stages: completed=green, current=indigo-pulse, pending=gray)
   - Show task history timeline from `GET /api/v1/tailor-tasks/{task_id}/history`
   - Owner action buttons based on task status:
     - `unassigned`: "Giao việc" button → show tailor list with matching scores
     - `assigned`: "Chờ thợ phản hồi" label + assignment deadline countdown
     - `submitted_for_qc`: "Đạt" (green) / "Cần sửa lại" (amber) / "Chuyển thợ khác" (gray) buttons
     - `on_hold`: Show `hold_reason` + "Chuyển thợ khác" option
     - `failed_qc`: "Giao sửa lại" / "Chuyển thợ khác" / "Đánh dấu hỏng" buttons
   - New server actions: `fetchTaskHistory(taskId)`, `qcResult(taskId, body)`, `reassignTask(taskId, body)`, `assignTask(taskId, tailorId)`
   - Show `is_rework` badge and `rework_count` if applicable
   - Show `version` number in small text (debug aid)

7. **Server actions layer updated for new endpoints:**
   - `owner-task-actions.ts` gains: `fetchMatchingScores()`, `fetchTaskHistory()`, `qcResult()`, `reassignTask()`, `assignTask()` (POST `/{task_id}/reassign` for unassigned→assigned flow)
   - All new actions follow existing pattern: `getAuthToken() → fetch with Bearer → { success, data?, error? }`
   - Error handling: 409 Conflict → "Dữ liệu đã thay đổi, vui lòng tải lại"

8. **No regressions in existing functionality:**
   - Existing task CRUD (create, update, delete) still works
   - Income endpoints and tailor dashboard unaffected
   - TanStack Query cache invalidation on all new mutations

## Tasks / Subtasks

- [x] Task 1: Update TypeScript types in `tailor-task.ts` (AC: #1)
  - [x] 1.1 Replace `TaskStatus` union with 11 states (+cancellation_requested for compat)
  - [x] 1.2 Add `TaskPriority`, `RejectionCategory`, `StageLogStatus` types
  - [x] 1.3 Extend `TailorTask` interface with all 16 new state machine fields
  - [x] 1.4 Update `TailorTaskSummary` with all 11+2 status counts
  - [x] 1.5 Add `TaskStageLog`, `TaskHistory`, `TailorMatchingScore` interfaces
  - [x] 1.6 Add request types: `TaskRejectRequest`, `TaskHoldRequest`, `QCResultRequest`, `TaskReassignRequest`
  - [x] 1.7 Add `TailorTaskDetailResponse`, `OrderInfoForTask` interfaces
  - [x] 1.8 Keep `NEXT_STATUS` as deprecated export for backward compat with tailor components (Story 12.5 scope)
  - [x] 1.9 Add `STATUS_BADGE` and `STAGE_LABELS` shared constants

- [x] Task 2: Update `ProductionSummaryCards.tsx` (AC: #2)
  - [x] 2.1 Update `cards` array with 9 entries (total, unassigned, assigned, in_progress, on_hold, submitted_for_qc, completed, failed_qc, overdue)
  - [x] 2.2 Adjust grid layout: 3 cols mobile, 5 cols lg

- [x] Task 3: Update `ProductionTaskTable.tsx` (AC: #3)
  - [x] 3.1 Import `STATUS_BADGE` from shared types (11-state badge config)
  - [x] 3.2 Add `progress` column with `ProgressCell` component
  - [x] 3.3 Add `priority` badge ("Gấp" tag) and `is_rework` badge
  - [x] 3.4 Handle null `assignee_name` (show "Chưa giao")

- [x] Task 4: Update `ProductionFilters.tsx` (AC: #4)
  - [x] 4.1 Replace status dropdown with 9 active status options + Vietnamese labels

- [x] Task 5: Update `TaskCreateDialog.tsx` for unassigned flow (AC: #5)
  - [x] 5.1 Make tailor selection optional (default = "Chưa giao (unassigned)")
  - [x] 5.2 Fetch matching scores when order selected via TanStack Query
  - [x] 5.3 Display matching scores as clickable table (tailor name, workload, on-time, score)
  - [x] 5.4 `assigned_to` now `string | null` in `TaskCreateRequest`
  - [x] 5.5 Button text changes: "Giao việc" vs "Tạo việc" based on tailor selection

- [x] Task 6: Update `TaskDetailDrawer.tsx` for full workflow (AC: #6)
  - [x] 6.1 Show all new task info fields (accepted_at, started_at, expected_finish_at, hold_reason, qc_issues, etc.)
  - [x] 6.2 Add task history timeline via `fetchTaskHistory()` API
  - [x] 6.3 Owner action buttons: QC pass/fail (submitted_for_qc), reassign (on_hold), assign (unassigned), rework/reassign/fail (failed_qc)
  - [x] 6.4 QCFailPanel: textarea for issues + action dropdown (rework/reassign/fail)
  - [x] 6.5 ReassignPanel: tailor selector + reason textarea (min 5 chars)
  - [x] 6.6 AssignPanel: matching scores table + tailor selector for unassigned tasks
  - [x] 6.7 Show priority badge, rework badge, version number, assignment deadline countdown

- [x] Task 7: Add new server actions in `owner-task-actions.ts` (AC: #7)
  - [x] 7.1 `fetchMatchingScores(orderId)` — GET `/matching-scores/{order_id}`
  - [x] 7.2 `fetchTaskHistory(taskId)` — GET `/{task_id}/history`
  - [x] 7.3 `qcResult(taskId, body)` — POST `/{task_id}/qc-result`
  - [x] 7.4 `reassignTask(taskId, body)` — POST `/{task_id}/reassign`
  - [x] 7.5 Shared `apiCall<T>()` helper to reduce duplication
  - [x] 7.6 Handle 409 Conflict → "Dữ liệu đã thay đổi, vui lòng tải lại."

- [x] Task 8: Verify no regressions (AC: #8)
  - [x] 8.1 Existing CRUD functions preserved (create, update, delete unchanged)
  - [x] 8.2 TanStack Query invalidation on all new mutations (qcResult, reassignTask)
  - [x] 8.3 TypeScript check passes for all modified files (0 new errors)
  - [x] 8.4 Fixed ProductionBoardClient fallback summary with all new fields
  - [x] 8.5 Fixed TailorTasksClient optimistic summary with all new fields

## Dev Notes

### Architecture & Patterns

- **Server Actions pattern** (existing): All API calls go through Next.js server actions in `frontend/src/app/actions/`. Each action: `auth() → token → fetch(BACKEND_URL + path, { Authorization: Bearer })`. Response shape: `{ tasks, summary }` or thrown Error.
- **TanStack Query**: `queryKey: ["owner-tasks", filters]` with `staleTime: 60_000`. Mutations call `queryClient.invalidateQueries({ queryKey: ["owner-tasks"] })`.
- **Radix UI**: `TaskCreateDialog` uses `@radix-ui/react-dialog`. Follow same pattern for any new dialogs.
- **Styling**: Tailwind CSS v4. Color palette: `[#1A1A2E]` primary text, `[#1A2B4C]` accent. Status colors: amber (waiting), indigo (active), emerald (done), red (error/overdue).
- **Vietnamese labels**: All user-facing text MUST be Vietnamese. Technical terms in code stay English.

### Backend API Endpoints (Already Implemented in Stories 12.1-12.3)

All these endpoints are live and ready to consume:

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/v1/tailor-tasks/{task_id}/accept` | OwnerOrTailor | Accept task |
| POST | `/api/v1/tailor-tasks/{task_id}/reject` | OwnerOrTailor | Reject task |
| POST | `/api/v1/tailor-tasks/{task_id}/start` | OwnerOrTailor | Start work |
| POST | `/api/v1/tailor-tasks/{task_id}/hold` | OwnerOrTailor | Pause work |
| POST | `/api/v1/tailor-tasks/{task_id}/resume` | OwnerOrTailor | Resume work |
| POST | `/api/v1/tailor-tasks/{task_id}/submit-qc` | OwnerOrTailor | Submit for QC |
| POST | `/api/v1/tailor-tasks/{task_id}/qc-result` | OwnerOnly | Pass/fail QC |
| POST | `/api/v1/tailor-tasks/{task_id}/reassign` | OwnerOnly | Reassign to new tailor |
| POST | `/api/v1/tailor-tasks/{task_id}/stages/{stage_order}/complete` | OwnerOrTailor | Complete stage |
| GET | `/api/v1/tailor-tasks/{task_id}/history` | OwnerOnly | Audit trail |
| GET | `/api/v1/tailor-tasks/matching-scores/{order_id}` | OwnerOnly | Ranked tailor list |

### Backend Response Schemas (from `backend/src/models/tailor_task.py`)

**TailorTaskResponse** includes all new fields:
- `version`, `accepted_at`, `started_at`, `submitted_at`, `hold_reason`, `on_hold_at`, `resumed_at`
- `assignment_deadline_at`, `expected_finish_at`, `is_rework`, `rework_count`, `qc_issues`
- `rejection_reason`, `rejection_category`, `reassignment_reason`, `priority`

**TailorTaskSummary** counts:
- `total`, `unassigned`, `assigned`, `accepted`, `in_progress`, `on_hold`, `reassigning`
- `submitted_for_qc`, `completed`, `cancelled`, `failed_qc`, `cancellation_requested`, `overdue`

**TaskStageLogResponse**: `id`, `task_id`, `stage`, `stage_order`, `status`, `started_at`, `completed_at`, `notes`

**TaskHistoryResponse**: `id`, `task_id`, `actor_id`, `actor_role`, `action`, `from_status`, `to_status`, `reason`, `metadata`, `created_at`

**TailorMatchingScore**: `tailor_id`, `tailor_name`, `workload_score`, `specialty_match`, `on_time_rate`, `overall_score`

**QCResultRequest**: `result: "pass" | "fail"`, `qc_issues: string | null`, `action_on_fail: "rework" | "reassign" | "fail" | null`, `new_tailor_id: UUID | null`

**TaskReassignRequest**: `new_tailor_id: UUID`, `reassignment_reason: string` (min 10 chars)

### 11-State Machine Reference

```
unassigned → [assigned, cancelled]
assigned → [accepted, rejected, reassigning, cancelled]
accepted → [in_progress, cancelled]
rejected → [unassigned] (auto-chain)
in_progress → [on_hold, submitted_for_qc, reassigning, cancelled]
on_hold → [in_progress, reassigning, cancelled]
reassigning → [unassigned]
submitted_for_qc → [completed, failed_qc]
completed → [] (terminal)
cancelled → [] (terminal)
failed_qc → [in_progress, reassigning, cancelled]
```

### Status Badge Config (Copy-paste ready)

```typescript
export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  unassigned: { label: "Chờ giao việc", className: "bg-orange-100 text-orange-800" },
  assigned: { label: "Chờ nhận", className: "bg-amber-100 text-amber-800" },
  accepted: { label: "Đã nhận", className: "bg-blue-100 text-blue-800" },
  in_progress: { label: "Đang may", className: "bg-indigo-100 text-indigo-800" },
  on_hold: { label: "Tạm dừng", className: "bg-yellow-100 text-yellow-800" },
  reassigning: { label: "Đang chuyển", className: "bg-gray-100 text-gray-800" },
  submitted_for_qc: { label: "Chờ kiểm tra", className: "bg-purple-100 text-purple-800" },
  completed: { label: "Hoàn thành", className: "bg-emerald-100 text-emerald-800" },
  failed_qc: { label: "Không đạt QC", className: "bg-red-100 text-red-800" },
  cancelled: { label: "Đã huỷ", className: "bg-gray-100 text-gray-500" },
  rejected: { label: "Từ chối", className: "bg-rose-100 text-rose-800" },
};
```

### Garment Stage Configuration (for progress bar)

```typescript
const GARMENT_STAGES: Record<string, string[]> = {
  default: ["cutting", "body_sewing", "sleeve_sewing", "assembly", "finishing"],
  ao_dai: ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "finishing"],
  wedding: ["cutting", "body_sewing", "sleeve_sewing", "assembly", "embroidery", "beading", "finishing"],
};

const STAGE_LABELS: Record<string, string> = {
  cutting: "Cắt",
  body_sewing: "May thân",
  sleeve_sewing: "May tay",
  assembly: "Ráp",
  embroidery: "Thêu",
  beading: "Đính hạt",
  finishing: "Hoàn thiện",
};
```

### Previous Story Learnings (from 12.1-12.3)

- **Optimistic locking**: Backend returns 409 on version mismatch. Frontend MUST handle this gracefully — show toast "Dữ liệu đã thay đổi" and refetch.
- **Chain transitions**: `reject` triggers `assigned→rejected→unassigned` (two history entries). Frontend doesn't need to know about intermediate states.
- **Stage logs created on `start`**: Don't fetch stage logs for tasks in `unassigned/assigned/accepted` — they won't have any.
- **`assigned_to` nullable**: Backend returns `null` for unassigned tasks. Frontend must handle null assignee gracefully (show "Chưa giao" instead of name).
- **`progress_percent`**: Calculated server-side from `completed_stages / total_stages`. Null if no stages (task not yet started).
- **Order integration**: `accept_task()` transitions order to `in_production`. QC pass transitions order to `ready_to_ship`. Frontend doesn't need to trigger these — they happen server-side.
- **DB Commit Rule**: After `db.flush()` MUST call `await db.commit()` — this is backend-only, just FYI for understanding error messages.

### Project Structure Notes

Files to modify:
- `frontend/src/types/tailor-task.ts` — Type definitions (primary, modify first)
- `frontend/src/components/client/production/ProductionSummaryCards.tsx` — Summary cards
- `frontend/src/components/client/production/ProductionTaskTable.tsx` — Task table + badges
- `frontend/src/components/client/production/ProductionFilters.tsx` — Status filter dropdown
- `frontend/src/components/client/production/TaskCreateDialog.tsx` — Create dialog + matching scores
- `frontend/src/components/client/production/TaskDetailDrawer.tsx` — Detail drawer + actions + history
- `frontend/src/app/actions/owner-task-actions.ts` — New server actions

Files NOT to modify (out of scope):
- `frontend/src/components/client/tailor/` — Tailor mobile UI is Story 12.5
- `backend/` — All backend work done in 12.1-12.3
- `frontend/src/types/order.ts` — Already updated in Story 12.3

### References

- [Source: _bmad-output/implementation-artifacts/tech-spec-bespoke-production-task-workflow.md — Phase 2: Tasks 12-16]
- [Source: _bmad-output/implementation-artifacts/12-3-matching-stages-notifications.md — Frontend TypeScript interface update]
- [Source: _bmad-output/implementation-artifacts/12-2-state-machine-core-endpoints.md — 11 API endpoints, GARMENT_STAGES, matching formula]
- [Source: _bmad-output/implementation-artifacts/12-1-db-migration-orm-pydantic-foundation.md — DB schema, Pydantic schemas]
- [Source: _bmad-output/planning-artifacts/architecture.md — Tech stack, folder structure, API patterns]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- All 8 tasks completed with 0 new TypeScript errors introduced
- `tailor-task.ts` fully rewritten: 11-state TaskStatus, 16 new TailorTask fields, 4 new interfaces (TaskStageLog, TaskHistory, TailorMatchingScore, TailorTaskDetailResponse), 4 request types, STATUS_BADGE + STAGE_LABELS shared constants
- `ProductionSummaryCards` expanded from 5 to 9 cards with responsive grid
- `ProductionTaskTable` now shows all 11 status badges + progress column + priority/rework badges + handles null assignee
- `ProductionFilters` updated with 9 status filter options
- `TaskCreateDialog` supports unassigned flow: tailor optional, matching scores fetched and displayed as clickable table
- `TaskDetailDrawer` fully redesigned: history timeline, owner action buttons (QC pass/fail, reassign, assign), sub-panels for QC fail details and reassign, assignment deadline countdown, rework/priority/version badges
- `owner-task-actions.ts` gains 4 new server actions + shared `apiCall<T>()` helper with 409 Conflict handling
- Fixed ProductionBoardClient + TailorTasksClient fallback summaries for new TailorTaskSummary shape
- NEXT_STATUS kept as deprecated export for backward compat (tailor components = Story 12.5 scope)
- Completed 2026-05-21

### File List

- `frontend/src/types/tailor-task.ts` (MODIFIED — complete rewrite for 11-state machine)
- `frontend/src/components/client/production/ProductionSummaryCards.tsx` (MODIFIED — 9 cards)
- `frontend/src/components/client/production/ProductionTaskTable.tsx` (MODIFIED — 11 badges + progress + priority)
- `frontend/src/components/client/production/ProductionFilters.tsx` (MODIFIED — 9 status options)
- `frontend/src/components/client/production/TaskCreateDialog.tsx` (MODIFIED — unassigned flow + matching scores)
- `frontend/src/components/client/production/TaskDetailDrawer.tsx` (MODIFIED — major rewrite: history, actions, sub-panels)
- `frontend/src/components/client/production/ProductionBoardClient.tsx` (MODIFIED — fallback summary fields)
- `frontend/src/app/actions/owner-task-actions.ts` (MODIFIED — 4 new actions + apiCall helper)
- `frontend/src/components/client/tailor/TailorTasksClient.tsx` (MODIFIED — optimistic summary compat fix)
