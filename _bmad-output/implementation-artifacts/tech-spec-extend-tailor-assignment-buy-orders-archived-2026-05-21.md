---
title: 'Extend Tailor Assignment Flow to Buy Orders & Show Tailor Name on All Order Types'
slug: 'extend-tailor-assignment-buy-orders'
created: '2026-05-21'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['FastAPI 0.115+', 'SQLAlchemy 2.x async', 'Next.js 15 App Router', 'TypeScript', 'PostgreSQL', 'TanStack Query']
files_to_modify:
  - 'frontend/src/components/client/orders/OrderTable.tsx (button + badges for buy orders)'
  - 'backend/src/services/order_service.py (tailor_task_info for all service types)'
code_patterns:
  - 'Tailor task badges pattern from bespoke flow (OrderTable.tsx:258-278)'
  - 'Backend batch-load tailor_task_info (order_service.py:636-654)'
  - 'Navigation via router.push for production assignment (OrderTable.tsx:330-342)'
test_patterns:
  - 'Backend: pytest with async fixtures, httpx AsyncClient'
  - 'Frontend: Jest + React Testing Library'
---

# Tech-Spec: Extend Tailor Assignment Flow to Buy Orders & Show Tailor Name on All Order Types

**Created:** 2026-05-21

## Overview

### Problem Statement

Currently, the "Bàn giao cho thợ" (assign work to tailor) button and tailor name badges only appear for bespoke orders. Buy orders at `in_progress` status show a generic "Kiểm tra" (Check) button that transitions the order directly — bypassing tailor assignment. This means buy orders cannot be assigned to tailors via the production page, and the owner has no visibility into which tailor is handling a buy order.

### Solution

1. For buy orders at `in_progress` status: Replace the "Kiểm tra" button with "Giao việc" (Assign work) that navigates to `/owner/production` — same pattern as bespoke "Bàn giao cho thợ".
2. After tailor task is created at `/owner/production`, the order at `/owner/orders` auto-displays the assigned tailor's name via tailor task badges.
3. Backend: Extend tailor_task_info loading from bespoke-only to ALL order types that have tailor tasks.

### Scope

**In Scope:**
- Frontend: Add "Giao việc" button for buy orders at `in_progress` → navigates to `/owner/production`
- Frontend: Show tailor task badges (Đang may, tên thợ, completion status) for ALL order types with active tailor tasks
- Backend: Remove `service_type == "bespoke"` filter from tailor_task_info batch-loading in `list_orders()`
- Backend: Ensure `_next_status()` returns `None` for buy `in_progress` orders until tailor task is completed (same guard as bespoke)

**Out of Scope:**
- Tailor cancellation request flow for buy orders (existing tech spec covers bespoke only)
- Changes to order status transition matrix
- Changes to production page / TaskCreateDialog
- Any changes to rent order flow

## Context for Development

### Codebase Patterns

- Bespoke "Bàn giao cho thợ" button: `OrderTable.tsx:330-342` — checks `order.status === "in_progress" && order.service_type === "bespoke"`, navigates via `router.push("/owner/production")`
- Tailor task badges: `OrderTable.tsx:258-278` — checks `order.service_type === "bespoke" && order.tailor_task_info`
- Backend tailor_task_info loading: `order_service.py:636-654` — filters `bespoke_order_ids` only
- Generic next-status button: `OrderTable.tsx:344-345` — explicitly skips bespoke `in_progress` but NOT buy `in_progress`
- `_next_status()` at `order_service.py:667-690`: For `in_progress` orders, returns `"checked"` only if `_all_tailor_tasks_completed()` returns True — this guard already works for any service_type

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `frontend/src/components/client/orders/OrderTable.tsx` | Button rendering (330-342 bespoke button, 344-345 generic button, 258-278 badges) |
| `backend/src/services/order_service.py` | `list_orders()` tailor_task_info loading (636-654), `_next_status()` (667-690) |
| `frontend/src/types/order.ts` | `OrderListItem.tailor_task_info` type (148-153) — already supports any order type |

### Technical Decisions

- Reuse exact same badge UI pattern from bespoke — no new components needed
- Button label "Giao việc" (shorter than "Bàn giao cho thợ") to differentiate buy vs bespoke visually, though both navigate to same page
- Backend guard `_all_tailor_tasks_completed()` already works for any service_type — no change needed there
- `_next_status()` for `in_progress` already checks tailor task completion before returning `"checked"` — this naturally blocks buy orders from advancing until tailor completes

## Implementation Plan

### Tasks

- [ ] **Task 1: Backend — Remove bespoke-only filter for tailor_task_info in list_orders()**
  - File: `backend/src/services/order_service.py` (~line 635-654)
  - Action:
    1. Change line 636 from:
       ```python
       bespoke_order_ids = [o.id for o in orders if o.service_type == "bespoke"]
       ```
       to:
       ```python
       task_eligible_order_ids = [o.id for o in orders]
       ```
    2. Rename all references from `bespoke_order_ids` → `task_eligible_order_ids` in lines 638-654
    3. Update the guard `if bespoke_order_ids:` → `if task_eligible_order_ids:`
    4. Update comment at line 635 from `# Batch-load tailor task info for bespoke orders` → `# Batch-load tailor task info for all orders with tailor tasks`
  - Notes: This loads tailor_task_info for ALL orders. Orders without tailor tasks simply won't have entries in `tailor_task_map`, so `tailor_task_map.get(o.id)` returns `None` — no extra filtering needed.

- [ ] **Task 2: Frontend — Extend "Bàn giao cho thợ" button to cover buy orders with "Giao việc" label**
  - File: `frontend/src/components/client/orders/OrderTable.tsx` (~line 329-354)
  - Action:
    1. At line 330, change condition from:
       ```tsx
       {order.status === "in_progress" && order.service_type === "bespoke" && (
       ```
       to:
       ```tsx
       {order.status === "in_progress" && (order.service_type === "bespoke" || order.service_type === "buy") && (
       ```
    2. At line 340, change static label to dynamic:
       ```tsx
       {order.service_type === "bespoke" ? "Bàn giao cho thợ" : "Giao việc"}
       ```
    3. At line 345, extend skip condition from:
       ```tsx
       !(order.status === "in_progress" && order.service_type === "bespoke") && (
       ```
       to:
       ```tsx
       !(order.status === "in_progress" && (order.service_type === "bespoke" || order.service_type === "buy")) && (
       ```
  - Notes: Both labels navigate to `/owner/production`. The `router.push` call at line 334 stays unchanged.

- [ ] **Task 3: Frontend — Remove bespoke-only filter on tailor task badges**
  - File: `frontend/src/components/client/orders/OrderTable.tsx` (~line 257-258)
  - Action: Change line 258 from:
    ```tsx
    {order.service_type === "bespoke" && order.tailor_task_info && (
    ```
    to:
    ```tsx
    {order.tailor_task_info && (
    ```
  - Notes: Badge rendering logic (lines 259-278) stays identical. The badge content already uses `order.tailor_task_info.tailor_name` / `garment_name` generically — no service_type-specific text.

### Acceptance Criteria

- [ ] AC1: Given a buy order at `in_progress` status WITHOUT a tailor task assigned, when the owner views OrderTable, then a "Giao việc" button is shown (not "Kiểm tra"), and clicking it navigates to `/owner/production`.
- [ ] AC2: Given a buy order at `in_progress` status WITH an assigned tailor task (`status = "assigned"` or `"in_progress"`), when the owner views OrderTable, then the tailor's name and "Đang may" badge are displayed below the order status.
- [ ] AC3: Given a buy order where the tailor has completed the task (`status = "completed"`), when the owner views OrderTable, then the badge shows "✓ {tailor_name} đã hoàn thành {garment_name}" in green, and the "Kiểm tra" next-status button becomes available (returned by `_next_status()`).
- [ ] AC4: Given a bespoke order at `in_progress` with an assigned tailor, when the owner views OrderTable, then the "Bàn giao cho thợ" button label is shown (not "Giao việc"), and tailor name badges are still displayed correctly (no regression).
- [ ] AC5: Given a rent order at `in_progress`, when the owner views OrderTable, then no "Giao việc"/"Bàn giao cho thợ" button appears (rent flow unchanged), but if a tailor task exists, the tailor name badge IS shown.
- [ ] AC6: Given a buy order at `in_progress` with an uncompleted tailor task, when the owner views OrderTable, then NO "Kiểm tra" button appears (order cannot advance until tailor completes — enforced by `_next_status()` returning `None`).

## Additional Context

### Dependencies

- Existing TailorTask model and `create_task()` flow — no changes needed, already supports any order_id
- Production page TaskCreateDialog already supports creating tasks for any order type
- `_all_tailor_tasks_completed()` guard at `order_service.py:532-547` already works for all service types
- `_next_status()` at `order_service.py:671-672` already blocks `in_progress` → `checked` until all tailor tasks completed

### Testing Strategy

- **Backend unit test**: Call `list_orders()` with a buy order that has an active tailor task → verify `tailor_task_info` is populated in response
- **Backend unit test**: Call `list_orders()` with a buy order at `in_progress` with uncompleted task → verify `next_valid_status` is `None`
- **Frontend component test**: Render OrderTable with a buy `in_progress` order → verify "Giao việc" button renders, verify click navigates to `/owner/production`
- **Frontend component test**: Render OrderTable with a buy order + `tailor_task_info` → verify badge renders with tailor name
- **Manual E2E**: Create buy order → approve → navigate to production → assign tailor via "Giao việc mới" → return to orders page → verify tailor name badge appears → tailor completes task → verify completion badge + "Kiểm tra" button appears

### Notes

- `_next_status()` at `order_service.py:671` already handles the guard correctly: for ANY `in_progress` order, it only returns `"checked"` if `_all_tailor_tasks_completed()` is True. Buy orders with uncompleted tailor tasks naturally won't show the advance button.
- No migration needed — `tailor_tasks` table FK is `order_id` with no service_type constraint.
- The owner is non-technical — "Giao việc" is clearer than "Kiểm tra" for the action of assigning work to a tailor.
- Risk: Buy orders that currently don't have tailor tasks and are at `in_progress` will now show "Giao việc" instead of "Kiểm tra". This is the INTENDED behavior — owner must assign work before advancing. However, if there are existing `in_progress` buy orders without tailor tasks, they will be "stuck" until a tailor is assigned. This is acceptable because `_next_status()` already returns `None` when no tasks exist (0 total = 0 completed, `_all_tailor_tasks_completed` returns False when `total_tasks == 0`).
