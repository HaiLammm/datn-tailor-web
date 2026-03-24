---
title: 'Tailor Assignment Tracking for Customer Order Detail'
slug: 'tailor-assignment-tracking'
created: '2026-03-24'
status: 'done'
baseline_commit: '64dfb181cb8d4c6ca3c1c5f9b2c6a61d90862e6b'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16', 'FastAPI', 'PostgreSQL 17', 'SQLAlchemy', 'Pydantic v2', 'TanStack Query', 'Tailwind CSS v4', 'Radix UI', 'pytest-asyncio']
files_to_modify: ['backend/src/models/db_models.py', 'backend/src/models/tailor_task.py', 'backend/src/models/order_customer.py', 'backend/src/services/order_customer_service.py', 'backend/src/services/tailor_task_service.py', 'backend/src/api/v1/tailor_tasks.py', 'backend/migrations/017_add_avatar_experience_substep.sql', 'frontend/src/types/order.ts', 'frontend/src/components/client/orders/OrderDetailDrawer.tsx', 'frontend/src/components/ui/Avatar.tsx', 'frontend/src/app/actions/order-actions.ts']
code_patterns: ['Authoritative Server Pattern (SSOT)', 'Multi-tenant isolation via tenant_id', 'API response: {"data": ..., "meta": {}}', 'Status transitions enforced server-side', 'Denormalization for query perf', 'TanStack Query + Server Actions for data fetching', 'Custom progress timeline (no library)', 'pytest-asyncio + in-memory SQLite for tests']
test_patterns: ['pytest-asyncio', 'in-memory SQLite (sqlite+aiosqlite)', 'async fixtures with sessionmaker', 'seed data before each test', 'multi-tenant isolation tests']
---

# Tech-Spec: Tailor Assignment Tracking for Customer Order Detail

**Created:** 2026-03-24

## Overview

### Problem Statement

Customers who place custom tailoring orders have no visibility into who is making their garment or how far along production has progressed. This lack of transparency reduces customer confidence and increases support inquiries.

### Solution

- Add `avatar_url` field to all users (Owner, Tailor, Customer)
- Add `experience_years` (optional) field to users table for Owner/Tailor
- Extend `tailor_tasks` with granular production sub-steps (cutting → sewing → finishing → quality_check)
- Add a new section in `OrderDetailDrawer` displaying: tailor avatar, name, role, years of experience, and a visual progress bar of production sub-steps

### Scope

**In Scope:**
- DB migration: add `avatar_url` to `users` table, add `experience_years` (optional) for Owner/Tailor, add `production_step` to `tailor_tasks`
- Backend: extend production sub-step tracking with forward-only transitions
- Backend: enrich customer order detail API response with tailor info and production progress
- Frontend: new "Tailor Info" section in `OrderDetailDrawer` with avatar, name, role, experience, sub-step progress bar

**Out of Scope:**
- Avatar upload functionality (URL-based for now, upload feature separate)
- Direct chat/contact between customer and tailor
- Exposing sensitive tailor info (phone, email, address)

## Context for Development

### Codebase Patterns

- **Authoritative Server Pattern**: Backend is SSOT — overdue calculations, status transitions, income calc all server-side
- **Multi-tenant isolation**: All queries filter by `tenant_id`
- **API response format**: `{"data": {...}, "meta": {...}}`
- **Status transitions**: Enforced server-side, no backward transitions. `tailor_tasks`: assigned → in_progress → completed
- **Denormalization**: `garment_name`, `customer_name` on `tailor_tasks` for query performance
- **Frontend data fetching**: TanStack Query v5 + Server Actions (Next.js) + AbortController timeout
- **UI components**: Custom-built progress timeline (no library), Radix UI for Dialog
- **Auth dependencies**: `OwnerOnly`, `OwnerOrTailor`, `CurrentUser` (JWT-based)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/src/models/db_models.py` | UserDB (L41-71), TailorTaskDB (L435-488), OrderDB (L258-300) |
| `backend/src/models/tailor_task.py` | Pydantic models: TailorTaskResponse, StatusUpdateRequest, TaskCreateRequest |
| `backend/src/models/order_customer.py` | CustomerOrderDetail, CustomerOrderSummary, OrderTimelineEntry |
| `backend/src/services/tailor_task_service.py` | Task CRUD, status transitions, VALID_TRANSITIONS dict |
| `backend/src/services/order_customer_service.py` | get_order_detail(), _build_timeline(), ownership validation |
| `backend/src/api/v1/tailor_tasks.py` | 11 endpoints, auth patterns (OwnerOnly, OwnerOrTailor) |
| `backend/src/api/v1/order_customer.py` | 3 customer endpoints, CurrentUser auth |
| `backend/migrations/014_create_tailor_tasks.sql` | Migration convention example |
| `frontend/src/components/client/orders/OrderDetailDrawer.tsx` | Custom 6-step progress, order detail UI (305 lines) |
| `frontend/src/types/order.ts` | CustomerOrderDetail, OrderResponse interfaces (216 lines) |
| `frontend/src/app/actions/order-actions.ts` | fetchOrderDetail() Server Action (571 lines) |
| `frontend/src/components/client/checkout/CheckoutProgress.tsx` | Existing stepper pattern reference |

### Technical Decisions

- **Avatar**: `avatar_url` (VARCHAR 500, nullable) on `users` table — all roles. URL-based, no upload
- **Experience**: `experience_years` (INTEGER, nullable) on `users` table — only meaningful for Owner/Tailor
- **Production sub-steps**: New `production_step` column (VARCHAR 50, default 'pending') on `tailor_tasks`. Values: `pending → cutting → sewing → finishing → quality_check → done`
- **Sub-step ↔ status relationship**: `production_step` provides granularity within `status=in_progress`. When step transitions to 'done', task status auto-completes to 'completed'
- **Customer API**: Extend existing `get_order_detail()` in `order_customer_service.py` to LEFT JOIN `tailor_tasks` + `users`, return tailor info embedded in response
- **Privacy**: Only expose: `full_name`, `avatar_url`, `role`, `experience_years`, `production_step` — NEVER expose email, phone, address
- **No new endpoint**: Embed tailor info into existing `GET /api/v1/customer/orders/{order_id}` response

## Implementation Plan

### Tasks

- [ ] **Task 1: Database Migration**
  - File: `backend/migrations/017_add_avatar_experience_substep.sql`
  - Action: Create migration SQL file with:
    ```sql
    ALTER TABLE users ADD COLUMN avatar_url VARCHAR(500);
    ALTER TABLE users ADD COLUMN experience_years INTEGER;
    ALTER TABLE tailor_tasks ADD COLUMN production_step VARCHAR(50) NOT NULL DEFAULT 'pending';
    CREATE INDEX idx_tailor_tasks_production_step ON tailor_tasks(production_step);
    ```
  - Notes: Follow existing convention (numbered SQL files with story comments). `avatar_url` and `experience_years` are nullable for all users. `production_step` defaults to 'pending'.

- [ ] **Task 2: Update UserDB ORM Model**
  - File: `backend/src/models/db_models.py`
  - Action: Add to `UserDB` class (after `address` field, ~line 68):
    ```python
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ```
  - Notes: Both fields nullable. `experience_years` is semantically for Owner/Tailor but stored on all users for schema simplicity.

- [ ] **Task 3: Update TailorTaskDB ORM Model**
  - File: `backend/src/models/db_models.py`
  - Action: Add to `TailorTaskDB` class (after `status` field, ~line 466):
    ```python
    production_step: Mapped[str] = mapped_column(String(50), nullable=False, default="pending")
    ```
  - Notes: Valid values: pending, cutting, sewing, finishing, quality_check, done.

- [ ] **Task 4: Update Tailor Task Pydantic Models**
  - File: `backend/src/models/tailor_task.py`
  - Action:
    1. Add `production_step: str` to `TailorTaskResponse` model
    2. Create `ProductionStepUpdateRequest` model:
       ```python
       class ProductionStepUpdateRequest(BaseModel):
           production_step: Literal["cutting", "sewing", "finishing", "quality_check", "done"]
       ```
    3. Add `production_step: str` to `OwnerTaskItem` (inherited from TailorTaskResponse, should auto-include)
  - Notes: Forward-only transitions enforced in service layer, not Pydantic.

- [ ] **Task 5: Update Tailor Task Service — Sub-step Logic**
  - File: `backend/src/services/tailor_task_service.py`
  - Action:
    1. Add production step constants:
       ```python
       PRODUCTION_STEPS = ["pending", "cutting", "sewing", "finishing", "quality_check", "done"]
       ```
    2. Add `update_production_step()` function:
       - Validate task belongs to tenant and assigned tailor
       - Validate forward-only transition (new step index > current step index in PRODUCTION_STEPS)
       - If task status is 'assigned', auto-transition to 'in_progress' when step moves past 'pending'
       - If step becomes 'done', auto-set `status='completed'` and `completed_at=now()`
       - Update `updated_at` timestamp
    3. Update `_task_to_response()` to include `production_step` field
  - Notes: SSOT pattern — all transition logic server-side. No backward step transitions allowed.

- [ ] **Task 6: Add Production Step API Endpoint**
  - File: `backend/src/api/v1/tailor_tasks.py`
  - Action: Add new endpoint:
    ```python
    @router.patch("/{task_id}/production-step")
    async def update_production_step(
        task_id: uuid.UUID,
        body: ProductionStepUpdateRequest,
        user_id: uuid.UUID = Depends(OwnerOrTailor),
        tenant_id: uuid.UUID = Depends(TenantId),
        db: AsyncSession = Depends(get_db),
    ):
    ```
  - Notes: Both Owner and Tailor can update production step. Return updated task response wrapped in `{"data": ...}`.

- [ ] **Task 7: Create Customer-facing Tailor Info Pydantic Model**
  - File: `backend/src/models/order_customer.py`
  - Action:
    1. Add new model:
       ```python
       class TailorInfoForCustomer(BaseModel):
           full_name: str
           avatar_url: str | None = None
           role: str
           experience_years: int | None = None
           production_step: str
           garment_name: str
       ```
    2. Add `tailor_info: list[TailorInfoForCustomer] | None = None` field to `CustomerOrderDetail` model
  - Notes: List because an order may have multiple items assigned to different tailors. Returns `None` if no tasks assigned yet.

- [ ] **Task 8: Extend Customer Order Detail Service**
  - File: `backend/src/services/order_customer_service.py`
  - Action: In `get_order_detail()` function:
    1. Add import for `TailorTaskDB`, `UserDB`, `TailorInfoForCustomer`
    2. After fetching order, query tailor tasks:
       ```python
       task_query = (
           select(TailorTaskDB, UserDB)
           .join(UserDB, TailorTaskDB.assigned_to == UserDB.id)
           .where(TailorTaskDB.order_id == order.id)
       )
       task_results = (await db.execute(task_query)).all()
       ```
    3. Build `tailor_info` list from results, mapping only safe fields (full_name, avatar_url, role, experience_years, production_step, garment_name)
    4. Attach to `CustomerOrderDetail` response
  - Notes: LEFT JOIN not needed — only return tailor info when tasks exist. Privacy: never include email/phone/address.

- [ ] **Task 9: Add TypeScript Interfaces**
  - File: `frontend/src/types/order.ts`
  - Action: Add new interfaces:
    ```typescript
    export interface TailorInfoForCustomer {
      full_name: string;
      avatar_url: string | null;
      role: string;
      experience_years: number | null;
      production_step: string;
      garment_name: string;
    }
    ```
    Update `CustomerOrderDetail` interface to add:
    ```typescript
    tailor_info: TailorInfoForCustomer[] | null;
    ```
  - Notes: Match backend Pydantic model exactly (snake_case fields from JSON).

- [ ] **Task 10: Create Reusable Avatar Component**
  - File: `frontend/src/components/ui/Avatar.tsx`
  - Action: Create component:
    ```typescript
    interface AvatarProps {
      src: string | null;
      name: string;
      size?: "sm" | "md" | "lg";
      className?: string;
    }
    ```
    - Display image if `src` provided, otherwise show initials (first letter of name) with colored background
    - Sizes: sm=32px, md=40px, lg=56px
    - Use `rounded-full` for circular shape
    - Handle image load error → fallback to initials
  - Notes: Reusable across the app. Keep it simple — Tailwind only, no external avatar library.

- [ ] **Task 11: Add Tailor Info Section to OrderDetailDrawer**
  - File: `frontend/src/components/client/orders/OrderDetailDrawer.tsx`
  - Action: Add new section between order status pipeline and order items:
    1. **Section header**: "Thợ may phụ trách" (Assigned Tailor)
    2. **For each tailor in `tailor_info`**:
       - Avatar component (Task 10) with tailor's avatar_url and name
       - Tailor name (bold) + role badge ("Thợ may")
       - Experience: "{N} năm kinh nghiệm" (hide if null)
       - Garment name being worked on
       - **Production sub-step progress bar**: 5-step horizontal stepper
         - Steps: Cắt vải → May → Hoàn thiện → Kiểm tra → Hoàn tất
         - Active step highlighted (indigo), completed steps filled, pending steps gray
         - Follow existing progress timeline pattern in the same file (lines 108-167)
    3. **If `tailor_info` is null or empty**: Show nothing (section hidden)
  - Notes: Follow existing component pattern — custom Tailwind, no external stepper library. Use same indigo color scheme as existing progress timeline. Dense workplace spacing (8-12px padding).

### Acceptance Criteria

- [ ] **AC 1**: Given a user table, when migration 017 runs, then `avatar_url` (VARCHAR 500, nullable), `experience_years` (INTEGER, nullable) columns exist on `users` table and `production_step` (VARCHAR 50, NOT NULL, default 'pending') exists on `tailor_tasks` table.

- [ ] **AC 2**: Given a tailor with an assigned task, when the tailor updates production_step from 'pending' to 'cutting', then the task's `production_step` is updated to 'cutting' AND `status` auto-transitions from 'assigned' to 'in_progress'.

- [ ] **AC 3**: Given a tailor task with `production_step='finishing'`, when the tailor attempts to update to 'cutting' (backward), then the API returns HTTP 400 with an error message.

- [ ] **AC 4**: Given a tailor task, when production_step is updated to 'done', then task `status` auto-transitions to 'completed' AND `completed_at` is set to current UTC timestamp.

- [ ] **AC 5**: Given a customer with an order that has assigned tailor tasks, when the customer fetches order detail via `GET /api/v1/customer/orders/{order_id}`, then the response includes `tailor_info` array with each tailor's `full_name`, `avatar_url`, `role`, `experience_years`, `production_step`, and `garment_name`.

- [ ] **AC 6**: Given a customer viewing order detail, when `tailor_info` is present in response, then the response does NOT contain tailor's email, phone, or address fields.

- [ ] **AC 7**: Given a customer with an order that has NO assigned tailor tasks, when the customer fetches order detail, then `tailor_info` is `null` in the response.

- [ ] **AC 8**: Given a customer viewing OrderDetailDrawer for an order with assigned tailors, when the drawer opens, then a "Thợ may phụ trách" section displays each tailor's avatar (or initials fallback), name, role badge, experience years (if available), garment name, and a 5-step production progress bar.

- [ ] **AC 9**: Given a customer viewing OrderDetailDrawer for an order with NO assigned tailors, when the drawer opens, then no tailor section is shown (graceful absence, not an error).

- [ ] **AC 10**: Given a user with `avatar_url=null`, when their avatar is rendered, then the Avatar component displays the first letter of their name as initials with a colored circular background.

## Additional Context

### Dependencies

- No new external libraries required
- Depends on existing `tailor_tasks` table (migration 014) and `users` table
- Depends on existing auth dependencies (`CurrentUser`, `OwnerOrTailor`, `TenantId`)

### Testing Strategy

**Backend Unit Tests** (new file: `backend/tests/test_production_step.py`):
- Test forward-only production step transitions (pending→cutting→sewing→finishing→quality_check→done)
- Test backward transition rejection (e.g., sewing→cutting returns error)
- Test auto-status transition: step past 'pending' → status becomes 'in_progress'
- Test auto-completion: step='done' → status='completed', completed_at set
- Test tenant isolation: tailor from tenant A cannot update task from tenant B

**Backend Integration Tests** (extend `backend/tests/test_order_customer_api.py`):
- Test customer order detail includes `tailor_info` when tasks exist
- Test customer order detail has `tailor_info=null` when no tasks
- Test privacy: `tailor_info` does NOT contain email/phone/address

**Frontend Manual Testing**:
- Verify OrderDetailDrawer displays tailor section when tailor_info present
- Verify tailor section hidden when tailor_info is null
- Verify Avatar shows image when URL provided, initials when null
- Verify production progress bar highlights correct active step
- Verify responsive layout on mobile

### Notes

- **Risk: Production step granularity** — The 5-step model (cutting→sewing→finishing→quality_check→done) is a simplification. Real production may have more steps. This can be extended later by adding values to PRODUCTION_STEPS constant without schema changes.
- **Future consideration**: Avatar upload functionality should be a separate feature with image storage (S3/Cloudinary) and resize/crop logic.
- **Future consideration**: Real-time progress updates via WebSocket could replace polling, but TanStack Query's staleTime-based refetching is sufficient for now.
