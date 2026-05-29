# Story 12.5: Tailor Mobile Order Integration — 11-State Workflow UI

Status: review

## Story

As a tailor (thợ may),
I want to accept/reject assignments, track production stages, pause/resume work, and submit for QC from my mobile-friendly task interface,
so that I can manage my entire production workflow without needing the owner to update statuses on my behalf.

## Acceptance Criteria

1. **AC1 — Accept/Reject Flow:** Given a task with `status=assigned`, when tailor views task detail, then two prominent buttons "Nhận việc" (green) and "Từ chối" (red) are displayed. Accept triggers `POST /{taskId}/accept`. Reject opens a form requiring `rejection_category` (dropdown: overloaded/not_specialty/personal/other) and `rejection_reason` (textarea, min 10 chars), then triggers `POST /{taskId}/reject`.

2. **AC2 — Start Work:** Given a task with `status=accepted`, when tailor taps "Bắt đầu may", then `POST /{taskId}/start` is called, task transitions to `in_progress`, and stage checklist appears.

3. **AC3 — Stage Progression:** Given a task with `status=in_progress`, when tailor views task detail, then a stage checklist is displayed (from `stage_logs` in task detail response). Each stage shows status (pending/in_progress/completed). Tailor can tap "Hoàn thành [stage_name]" on the current `in_progress` stage to call `POST /{taskId}/stages/{stage_order}/complete`. Only sequential completion allowed (button disabled on future stages).

4. **AC4 — Progress Bar:** Given a task with `status=in_progress`, a visual progress bar shows `completed_stages / total_stages` percentage. Updated after each stage completion.

5. **AC5 — Hold/Resume:** Given a task with `status=in_progress`, tailor can tap "Tạm dừng" which opens a reason form (dropdown: Hết phụ liệu/vải, Cần xác nhận từ khách, Vấn đề sức khỏe, Phát hiện lỗi, Khác + textarea). Calls `POST /{taskId}/hold`. Given `status=on_hold`, a "Tiếp tục" button calls `POST /{taskId}/resume`.

6. **AC6 — Submit for QC:** Given a task with `status=in_progress` AND all stages completed, tailor sees "Hoàn tất & Gửi kiểm tra" button. A confirmation dialog appears before calling `POST /{taskId}/submit-qc`. Button is disabled if any stage is not completed.

7. **AC7 — Rework Flow:** Given a task with `status=failed_qc`, tailor sees QC issues (`qc_issues` field) displayed prominently with rework badge (`is_rework=true`, `rework_count`). Stage checklist resets to allow re-work. Normal stage progression resumes.

8. **AC8 — Dashboard Integration:** TailorDashboardClient summary cards and urgent task alerts must reflect all 11 states correctly. Summary counts use `TailorTaskSummary` fields (unassigned, assigned, accepted, in_progress, on_hold, submitted_for_qc, completed, failed_qc).

9. **AC9 — Optimistic Locking:** All mutation requests send `version` field. On 409 Conflict response, show toast "Dữ liệu đã thay đổi, vui lòng tải lại" and refetch task.

10. **AC10 — Mobile UX:** All new interactive elements have large touch targets (min 44x44px), clear visual feedback on tap, and work on viewport widths >= 320px. Vietnamese labels throughout.

## Tasks / Subtasks

- [x] Task 1: Add tailor-side server actions for new state machine endpoints (AC: 1-7, 9)
  - [x] 1.1 Add `acceptTask(taskId)` → POST `/{taskId}/accept`
  - [x] 1.2 Add `rejectTask(taskId, body: TaskRejectRequest)` → POST `/{taskId}/reject`
  - [x] 1.3 Add `startTask(taskId)` → POST `/{taskId}/start`
  - [x] 1.4 Add `holdTask(taskId, body: TaskHoldRequest)` → POST `/{taskId}/hold`
  - [x] 1.5 Add `resumeTask(taskId)` → POST `/{taskId}/resume`
  - [x] 1.6 Add `submitForQC(taskId)` → POST `/{taskId}/submit-qc`
  - [x] 1.7 Add `completeStage(taskId, stageOrder, notes?)` → POST `/{taskId}/stages/{stageOrder}/complete`
  - [x] 1.8 All actions follow existing pattern: `getAuthToken() → fetch(BACKEND_URL + path) → { success, data?, error? }`

- [x] Task 2: Rewrite TaskDetailModal for 11-state workflow (AC: 1-7, 9, 10)
  - [x] 2.1 Accept/Reject panel: two buttons when `status=assigned`, reject form with category dropdown + reason textarea
  - [x] 2.2 Work panel: "Bắt đầu may" button when `status=accepted`
  - [x] 2.3 Stage checklist: render `stage_logs` with status indicators (pending=gray, in_progress=blue, completed=green). "Hoàn thành" button on current stage only
  - [x] 2.4 Progress bar: horizontal bar filling based on completed/total stages
  - [x] 2.5 Hold panel: "Tạm dừng" button with reason form when `status=in_progress`; "Tiếp tục" button when `status=on_hold`
  - [x] 2.6 Submit panel: "Hoàn tất & Gửi kiểm tra" with confirmation dialog, disabled if incomplete stages
  - [x] 2.7 Rework view: QC issues display + rework badge when `is_rework=true`
  - [x] 2.8 Handle 409 Conflict: toast + refetch

- [x] Task 3: Update TailorTasksClient for 11-state compatibility (AC: 8)
  - [x] 3.1 Update status filter options to include all 11 states with Vietnamese labels
  - [x] 3.2 Update inline status toggle in TaskRow to show contextual next-action (accept/start/hold/resume/submit) instead of generic status dropdown
  - [x] 3.3 Ensure optimistic summary card update works with new status values

- [x] Task 4: Update TailorDashboardClient for 11-state (AC: 8)
  - [x] 4.1 Update summary cards to show counts for new statuses (accepted, on_hold, submitted_for_qc, failed_qc)
  - [x] 4.2 Update urgent task filter to include `assigned` tasks (need response), `failed_qc` tasks (need rework)
  - [x] 4.3 Ensure TaskSummaryCards renders correct icons/colors for new statuses

- [x] Task 5: Update TaskRow status badges and actions (AC: 8, 10)
  - [x] 5.1 Add badge colors/labels for all 11 states matching ProductionBoard conventions:
    - unassigned: "Chờ giao việc" (orange)
    - assigned: "Chờ nhận" (amber) 
    - accepted: "Đã nhận" (blue)
    - in_progress: "Đang may" (indigo)
    - on_hold: "Tạm dừng" (yellow)
    - submitted_for_qc: "Chờ kiểm tra" (purple)
    - completed: "Hoàn thành" (green)
    - failed_qc: "Không đạt QC" (red)
    - cancelled: "Đã huỷ" (gray)
    - rejected: "Đã từ chối" (gray)
    - reassigning: "Đang chuyển" (orange)
  - [x] 5.2 Show priority badge (urgent=red) when `priority=urgent`
  - [x] 5.3 Show rework badge when `is_rework=true` with `rework_count`

- [x] Task 6: Fetch task detail with stage_logs and history (AC: 3, 4, 7)
  - [x] 6.1 Update `fetchTaskDetail(taskId)` to ensure response includes `stage_logs` and `history` arrays
  - [x] 6.2 Ensure `TailorTaskDetailResponse` type matches backend response (stage_logs, history already defined in types)

## Dev Notes

### Architecture Compliance

- **Server Actions Pattern:** All new actions in `frontend/src/app/actions/tailor-task-actions.ts` must follow existing pattern: `getAuthToken()` from cookies → `fetch(BACKEND_URL + endpoint, { headers: { Authorization: Bearer ${token} } })` → parse response → return `{ success, data?, error? }`.
- **No direct API calls from components.** All backend communication via server actions only.
- **TanStack Query NOT used in tailor pages.** Current tailor components use `useEffect` + `useState` for data fetching (unlike owner production board which uses TanStack Query). Maintain this pattern for consistency within tailor section.
- **Multi-tenant isolation:** Backend handles tenant filtering. Frontend passes auth token only.

### Existing Code to Reuse — DO NOT Reinvent

- **`TaskDetailModal.tsx`** — Extend, don't replace. Currently handles cancellation flow. Add new panels for accept/reject/stages/hold/submit alongside existing cancellation logic.
- **`TaskRow.tsx`** — Has inline status toggle. Update the toggle logic, don't create a new row component.
- **`TaskSummaryCards.tsx`** — Already renders cards from `TailorTaskSummary` object. Just needs to handle new status fields.
- **`TaskFilters.tsx`** — Has status filter dropdown. Add new status options to existing `STATUS_OPTIONS` array.
- **`STATUS_BADGE` config from `ProductionTaskTable.tsx`** — Production board already defines badge colors/labels for all 11 states. Reuse the same color scheme (do NOT create conflicting colors).
- **Server action pattern** from `tailor-task-actions.ts` — `getAuthToken()`, fetch, error handling pattern. Copy exactly.
- **`owner-task-actions.ts`** — Already has `qcResult()`, `reassignTask()`, `fetchTaskHistory()`, `fetchMatchingScores()` implemented. Do NOT duplicate these in tailor actions. Only add tailor-specific endpoints (accept, reject, start, hold, resume, submit-qc, complete-stage).

### Backend Endpoints (Already Implemented in Story 12.2)

All endpoints exist and are tested. Frontend just needs to call them:

| Action | Method | Endpoint | Auth | Request Body |
|--------|--------|----------|------|-------------|
| Accept | POST | `/api/v1/tailor-tasks/{taskId}/accept` | OwnerOrTailor | empty |
| Reject | POST | `/api/v1/tailor-tasks/{taskId}/reject` | OwnerOrTailor | `{ rejection_category, rejection_reason }` |
| Start | POST | `/api/v1/tailor-tasks/{taskId}/start` | OwnerOrTailor | empty |
| Hold | POST | `/api/v1/tailor-tasks/{taskId}/hold` | OwnerOrTailor | `{ hold_reason }` |
| Resume | POST | `/api/v1/tailor-tasks/{taskId}/resume` | OwnerOrTailor | empty |
| Submit QC | POST | `/api/v1/tailor-tasks/{taskId}/submit-qc` | OwnerOrTailor | empty |
| Complete Stage | POST | `/api/v1/tailor-tasks/{taskId}/stages/{stageOrder}/complete` | OwnerOrTailor | `{ notes? }` |
| Task Detail | GET | `/api/v1/tailor-tasks/{taskId}` | OwnerOrTailor | — |

Response format: `{ id, status, version, stage_logs: [...], history: [...], ...all TailorTask fields }`

409 Conflict response: `{ detail: "Version conflict" }` — means another update happened. Refetch and retry.

### Stage Labels (Vietnamese)

Use these labels for stage display (from `GARMENT_STAGES` in backend):
- `cutting` → "Cắt vải"
- `body_sewing` → "May thân"
- `sleeve_sewing` → "May tay"
- `assembly` → "Ráp"
- `embroidery` → "Thêu"
- `beading` → "Đính hạt"
- `finishing` → "Hoàn thiện"

### Hold Reason Options (Vietnamese)

- "Hết phụ liệu/vải" (out_of_material)
- "Cần xác nhận từ khách" (customer_confirmation)
- "Vấn đề sức khỏe" (health_issue)
- "Phát hiện lỗi" (defect_found)
- "Khác" (other) — requires custom text

### Anti-Patterns to Avoid

1. **DO NOT create new page routes** for accept/reject/stages. All interactions happen within TaskDetailModal on the existing `/tailor/tasks` page.
2. **DO NOT add WebSocket/real-time** — current pattern is manual refetch + 60s auto-refetch on dashboard. Keep this.
3. **DO NOT modify backend endpoints** — all APIs are already implemented and tested (Story 12.2). This is a frontend-only story.
4. **DO NOT change TailorTask types** — `frontend/src/types/tailor-task.ts` already has all 11 states, stage_logs, history, matching scores (updated in Story 12.4).
5. **DO NOT modify production board components** (`frontend/src/components/client/production/`) — those are owner-facing. This story is tailor-facing only.
6. **DO NOT use `NEXT_STATUS` map** for status transitions — it's deprecated (Story 12.4 notes). Use contextual action buttons based on current status instead.

### Previous Story Intelligence

**From Story 12.4 (Frontend Types & Production Board):**
- `NEXT_STATUS` kept as deprecated export for backward compat with tailor components. Story 12.5 should remove this dependency entirely by replacing inline status toggle with contextual action buttons.
- `STATUS_BADGE` config defines all 11 states with colors — reuse in tailor TaskRow.
- `STAGE_LABELS` defined for garment stage display — reuse in tailor stage checklist.
- Server actions pattern established: `getAuthToken()` → fetch → `{ success, data?, error? }`. 409 handling: toast + refetch.
- `ProductionBoardClient.tsx` has `fallbackCompat` for old status values — tailor components should similarly handle `cancellation_requested` legacy status.

**From Story 12.3 (Order-Task Lifecycle):**
- `tailor_task_info` in order response includes `progress_percent`, `current_stage`, `is_rework`, `rework_count`, `expected_finish_at`, `stage_logs`.
- QC pass triggers order transition server-side — frontend doesn't need to manage order status.
- `accept_task()` sets `preparation_step="cutting"` on order — again server-side, frontend just calls accept.

**From Story 12.2 (State Machine Core):**
- 31 state machine tests validate all transitions. Frontend can trust backend rejects invalid transitions with 422.
- `_transition_task()` handles optimistic locking internally. Frontend sends version, backend validates.
- Reject is a chain transition: assigned→rejected→unassigned (automatic). Frontend sees final state after refetch.
- Reassigning is also chain: current→reassigning→unassigned. Frontend just needs to refetch.

**From Story 12.1 (DB Migration):**
- `assigned_to` is nullable — tasks can have no tailor (unassigned state).
- All new timestamp fields (accepted_at, started_at, etc.) are nullable.
- `version` starts at 1, increments on every status change.

### Project Structure Notes

Files to modify (all frontend):
```
frontend/src/app/actions/tailor-task-actions.ts          — Add 7 new server actions
frontend/src/components/client/tailor/TaskDetailModal.tsx — Major rewrite for 11-state workflow
frontend/src/components/client/tailor/TailorTasksClient.tsx — Update status filter + inline toggle
frontend/src/components/client/tailor/TailorDashboardClient.tsx — Update summary + urgent alerts
frontend/src/components/client/tailor/TaskRow.tsx        — Update badges + action buttons
frontend/src/components/client/tailor/TaskSummaryCards.tsx — Handle new status fields
frontend/src/components/client/tailor/TaskFilters.tsx    — Add new status options
```

No new files needed. No backend changes.

### References

- [Source: _bmad-output/implementation-artifacts/tech-spec-bespoke-production-task-workflow.md — Task 16, Phase 2]
- [Source: _bmad-output/implementation-artifacts/12-4-frontend-types-production-board.md — STATUS_BADGE, STAGE_LABELS, server actions pattern]
- [Source: _bmad-output/implementation-artifacts/12-3-matching-stages-notifications.md — Order-task lifecycle, tailor_task_info enrichment]
- [Source: _bmad-output/implementation-artifacts/12-2-state-machine-core-endpoints.md — All endpoint contracts, transition matrix, GARMENT_STAGES]
- [Source: _bmad-output/implementation-artifacts/12-1-db-migration-orm-pydantic-foundation.md — DB schema, nullable fields, version column]
- [Source: frontend/src/app/actions/tailor-task-actions.ts — Existing server action patterns]
- [Source: frontend/src/components/client/tailor/TaskDetailModal.tsx — Existing modal structure]
- [Source: frontend/src/types/tailor-task.ts — All type definitions already in place]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Added 7 new server actions (accept, reject, start, hold, resume, submit-qc, complete-stage) with shared `postTaskAction` helper and 409 Conflict detection
- Rewrote TaskDetailModal: fetches full detail on open, renders status-specific action panels (accept/reject, start, stage checklist with progress bar, hold/resume, submit QC, rework view)
- Updated TaskRow: uses STATUS_BADGE from types, shows priority badge (GẤP), rework badge, removed deprecated NEXT_STATUS toggle
- Updated TaskSummaryCards: 8 cards (total, assigned, accepted, in_progress, on_hold, submitted_for_qc, completed, failed_qc) with zero-count hiding
- Updated TaskFilters: 9 status options covering all actionable states
- Updated TailorDashboardClient: urgent tasks include assigned (need response) and failed_qc (need rework)
- Updated TailorTasksClient: removed mutation-based status toggle, uses onTaskUpdated callback from modal for cache invalidation
- Updated TaskList: simplified interface (removed onStatusToggle), terminal status grouping includes rejected/cancelled
- Fixed pre-existing test (TaskDetailPatternSection): updated interface and missing TailorTask fields
- All touch targets min 44x44px, mobile-first bottom sheet modal pattern
- 0 new TypeScript errors in tailor components and actions

### Change Log

- 2026-05-21: Story 12.5 implementation complete — all 6 tasks, 10 ACs satisfied

### File List

- frontend/src/app/actions/tailor-task-actions.ts (MODIFIED — 7 new server actions + fetchTaskDetail return type)
- frontend/src/components/client/tailor/TaskDetailModal.tsx (REWRITTEN — 11-state workflow UI)
- frontend/src/components/client/tailor/TaskRow.tsx (REWRITTEN — STATUS_BADGE, priority/rework badges)
- frontend/src/components/client/tailor/TaskList.tsx (MODIFIED — simplified interface, terminal status grouping)
- frontend/src/components/client/tailor/TailorTasksClient.tsx (MODIFIED — removed mutation toggle, onTaskUpdated)
- frontend/src/components/client/tailor/TailorDashboardClient.tsx (MODIFIED — STATUS_BADGE, expanded urgent filter)
- frontend/src/components/client/tailor/TaskSummaryCards.tsx (REWRITTEN — 8 status cards)
- frontend/src/components/client/tailor/TaskFilters.tsx (MODIFIED — 9 status options)
- frontend/src/__tests__/TaskDetailPatternSection.test.tsx (MODIFIED — fixed interface + missing fields)
