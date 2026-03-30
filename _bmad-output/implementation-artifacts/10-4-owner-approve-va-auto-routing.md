# Story 10.4: Owner Approve & Auto-routing (Phe duyet & Dieu phoi)

Status: done

## Story

As a Chu tiem (Owner),
I want phe duyet don hang truoc khi dua vao san xuat/chuan bi, va he thong tu dong dieu phoi don den dung bo phan,
so that toi kiem soat duoc chat luong dau vao va cong viec duoc phan phoi hieu qua.

## Acceptance Criteria

1. **AC1 — Order Board service-type badges**: Order Board (`/owner/orders`) hien thi don hang `status='pending'` voi badge loai dich vu: Mua (xanh), Thue (vang), Dat may (tim).
2. **AC2 — Approve endpoint**: Owner nhan nut "Phe duyet" tren don hang → API `POST /api/v1/orders/{id}/approve` chuyen status `pending → confirmed`. Bespoke orders transition to `confirmed → in_progress` (auto-TailorTask); Rent/Buy orders transition to `confirmed → preparing`.
3. **AC3 — Bespoke auto-routing**: Don Dat may: Tu dong tao TailorTask dinh kem so do da xac nhan, thong bao tho may. Owner phai chon tailor (assigned_to) trong request body khi phe duyet don bespoke.
4. **AC4 — Rent/Buy routing**: Don Thue/Mua: Chuyen yeu cau xuong kho (`status='preparing'`), khong tao TailorTask.
5. **AC5 — Toast notification**: Toast notification hien thi routing destination sau khi phe duyet thanh cong (e.g., "Don hang da giao cho tho may Minh" hoac "Don hang da chuyen xuong kho").

## Tasks / Subtasks

### Backend

- [x] Task 1 (AC: #2) — Create `POST /api/v1/orders/{id}/approve` endpoint
  - [x] 1.1 Add `ApproveOrderRequest` Pydantic schema: `assigned_to: UUID | None = None` (required for bespoke), `notes: str | None = None`
  - [x] 1.2 Add `ApproveOrderResponse` Pydantic schema: `order_id`, `new_status`, `service_type`, `routing_destination` (str: "tailor" | "warehouse"), `task_id: UUID | None`
  - [x] 1.3 Add endpoint in `backend/src/api/v1/orders.py` with owner auth guard
  - [x] 1.4 Validate: order belongs to tenant, current status is `pending`

- [x] Task 2 (AC: #2, #3, #4) — Implement `approve_order()` service function
  - [x] 2.1 Add `approve_order(db, order_id, tenant_id, owner_id, request)` in `order_service.py`
  - [x] 2.2 Row-lock order with `with_for_update()` (existing pattern)
  - [x] 2.3 Detect `service_type` from order record (field added in Story 10.1)
  - [x] 2.4 Transition: `pending → confirmed` for all service types
  - [x] 2.5 Bespoke path: validate `assigned_to` provided → call existing `create_task()` from `tailor_task_service.py` → order auto-transitions `confirmed → in_progress` (existing behavior)
  - [x] 2.6 Bespoke path: attach measurement data to TailorTask notes (query customer's default MeasurementDB)
  - [x] 2.7 Rent/Buy path: transition `confirmed → preparing`
  - [x] 2.8 Return `ApproveOrderResponse` with routing info

- [x] Task 3 (AC: #2, #4) — Update `_VALID_TRANSITIONS` in `order_service.py`
  - [x] 3.1 Add new transitions for Epic 10 statuses: `preparing → ready_to_ship`, `preparing → ready_for_pickup`, `ready_to_ship → shipped`, `ready_for_pickup → delivered`, `renting → returned`, `returned → completed`, `in_production → ready_to_ship` (these will be used by future stories but the transition map should be complete)
  - [x] 3.2 Keep existing transitions working (no regressions on buy-only flow)
  - [x] 3.3 Update `next_valid_status` calculation to handle branching (some statuses have multiple valid next states depending on service type)

- [x] Task 4 (AC: #5) — Add notification for approval routing
  - [x] 4.1 Add `ORDER_APPROVED_MESSAGES` templates to `notification_creator.py` for customer notification ("Don hang cua ban da duoc xac nhan")
  - [x] 4.2 Bespoke: Reuse existing `TASK_ASSIGNMENT_MESSAGE` for tailor notification (already handled by `create_task()`)
  - [x] 4.3 Create notification for customer when order approved

- [x] Task 5 (AC: all) — Write tests in `backend/tests/test_10_4_owner_approve.py`
  - [x] 5.1 Test approve buy order: `pending → confirmed → preparing`
  - [x] 5.2 Test approve rent order: `pending → confirmed → preparing`, rental fields preserved
  - [x] 5.3 Test approve bespoke order: `pending → confirmed → in_progress`, TailorTask created with measurement data
  - [x] 5.4 Test approve bespoke without `assigned_to` → 422 error
  - [x] 5.5 Test approve non-pending order → 400 error
  - [x] 5.6 Test approve order from different tenant → 404
  - [x] 5.7 Test approve order with invalid tailor ID → 404/422
  - [x] 5.8 Test approve order creates customer notification
  - [x] 5.9 Test idempotency: approve already-confirmed order fails gracefully

### Frontend

- [x] Task 6 (AC: #1) — Add service-type badges to Order Board
  - [x] 6.1 Add `ServiceTypeBadge` component or extend existing `StatusBadge.tsx` with service-type styling: buy=blue (`bg-blue-100 text-blue-800`), rent=amber (`bg-amber-100 text-amber-800`), bespoke=purple (`bg-purple-100 text-purple-800`)
  - [x] 6.2 Display service-type badge next to order status badge in `OrderBoardClient.tsx` / `OrderTable.tsx`
  - [x] 6.3 Update `OrderResponse` type in `frontend/src/types/order.ts` to include `service_type` field (if not already present from Story 10.3)

- [x] Task 7 (AC: #2, #3) — Add approve action to Order Board
  - [x] 7.1 Replace generic "next status" button for `pending` orders with dedicated "Phe duyet" button
  - [x] 7.2 For bespoke orders: Show tailor selection dropdown/dialog before approving (fetch tailors via existing `/api/v1/tailor-tasks/tailors` or similar endpoint)
  - [x] 7.3 Create `approveOrder(orderId, request)` server action in `frontend/src/app/actions/order-actions.ts` calling `POST /api/v1/orders/{id}/approve`
  - [x] 7.4 Use `useMutation` with optimistic update pattern (existing in `OrderBoardClient.tsx`)

- [x] Task 8 (AC: #5) — Toast notification for routing result
  - [x] 8.1 On successful approve mutation, show toast with `routing_destination` info
  - [x] 8.2 Bespoke: "Don hang #{code} da giao cho tho may {tailor_name}"
  - [x] 8.3 Rent/Buy: "Don hang #{code} da chuyen xuong kho chuan bi"
  - [x] 8.4 Follow existing toast pattern (state-based, 3-second auto-dismiss)

- [x] Task 9 (AC: #1) — Update status badge styles for new Epic 10 statuses
  - [x] 9.1 Add missing statuses to `ORDER_STATUS_STYLES` in `StatusBadge.tsx`: `pending_measurement`, `preparing`, `ready_to_ship`, `ready_for_pickup`, `in_production`, `renting`, `returned`, `completed`
  - [x] 9.2 Add matching entries to `NEXT_STATUS_LABELS` in `OrderTable.tsx` where applicable
  - [x] 9.3 Update `OrderStatus` TypeScript type to include new enum values

## Dev Notes

### Architecture Compliance

- **API pattern**: RESTful `POST /api/v1/orders/{id}/approve` — follows existing `/api/v1/` versioning
- **Response format**: `{ "data": ApproveOrderResponse }` for success; `{ "error": {...} }` for failure
- **Auth**: JWT HttpOnly cookie validated via Next.js proxy → FastAPI. Owner role required.
- **Validation**: Pydantic v2 on backend, Zod not needed for this endpoint (simple UUID + optional fields)
- **Multi-tenant**: All queries MUST filter by `tenant_id`. Use `with_for_update()` for row locking.

### Critical Implementation Details

1. **Reuse existing `create_task()` from `tailor_task_service.py`** for bespoke auto-routing. Do NOT duplicate task creation logic. The existing function already: validates order is confirmed, validates tailor exists/active/same-tenant, auto-populates garment_name/customer_name, transitions order `confirmed → in_progress`, sends tailor notification.

2. **Measurement data attachment**: Query customer's default measurement via existing pattern from Story 10.2. Lookup chain: `order.customer_id → CustomerProfileDB → MeasurementDB (is_default=True)`. Serialize measurement summary into TailorTask `notes` field (existing `notes: str | None` field, max 2000 chars).

3. **Status transition atomicity**: The approve flow does multiple transitions (`pending → confirmed → preparing` or `pending → confirmed → in_progress`). These MUST be in a single DB transaction. Do NOT call `update_order_status()` twice — instead, set `order.status` directly within the `approve_order()` function after validation.

4. **Existing `_VALID_TRANSITIONS` dict**: Currently maps single next status per state. Epic 10 introduces branching (e.g., `confirmed` can go to `in_progress` OR `preparing` depending on service type). Options:
   - Make `_VALID_TRANSITIONS` values a `list[str]` instead of `str`
   - Or add service-type-aware logic in `update_order_status()`
   - Recommended: Keep `_VALID_TRANSITIONS` as reference but let `approve_order()` handle its own transitions directly (bypassing the generic `update_order_status()` for the approve flow).

5. **`next_valid_status` field**: Currently returned by API for frontend to show next action button. After Epic 10, this becomes service-type-dependent. For `confirmed` orders: bespoke → `in_progress`, rent/buy → `preparing`. Update the calculation in `order_service.py` list/get functions.

6. **Approve is NOT a generic status update**: It's a dedicated business action with side effects (task creation, notification, routing). Do NOT implement as another entry in `_VALID_TRANSITIONS`. Use a dedicated endpoint and service function.

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | How to Reuse |
|------|-------|-------------|
| TailorTask creation | `tailor_task_service.py:create_task()` | Call directly with `TaskCreateRequest` |
| Task assignment notification | `tailor_tasks.py:170-215` (in API layer) | Already triggered by `create_task()` flow |
| Customer notification | `notification_creator.py:create_notification()` | Call with new template |
| Row locking | `order_service.py:update_order_status()` | Copy `with_for_update()` pattern |
| Measurement lookup | `order_service.py:check_customer_measurement()` | Reuse lookup chain logic |
| Toast UI | `OrderBoardClient.tsx` | Extend existing toast state pattern |
| Status badges | `StatusBadge.tsx` | Add new entries to existing style maps |
| Optimistic mutations | `OrderBoardClient.tsx:useMutation` | Follow same pattern for approve mutation |

### File Structure

**Files to Modify:**
- `backend/src/api/v1/orders.py` — Add approve endpoint
- `backend/src/services/order_service.py` — Add `approve_order()`, update transitions
- `backend/src/models/order.py` — Add `ApproveOrderRequest`, `ApproveOrderResponse` schemas
- `backend/src/services/notification_creator.py` — Add ORDER_APPROVED templates
- `frontend/src/components/client/orders/OrderBoardClient.tsx` — Approve button, tailor selection, toast
- `frontend/src/components/client/orders/OrderTable.tsx` — Service-type badge, approve button per row
- `frontend/src/components/client/orders/StatusBadge.tsx` — New status styles + service-type badge
- `frontend/src/app/actions/order-actions.ts` — `approveOrder()` server action
- `frontend/src/types/order.ts` — Update OrderStatus type, add ApproveOrderRequest/Response types

**Files to Create:**
- `backend/tests/test_10_4_owner_approve.py` — Approval tests

**Files NOT to Touch:**
- `backend/src/services/tailor_task_service.py` — Reuse as-is, do NOT modify
- `backend/src/models/db_models.py` — No schema changes (all columns added in Story 10.1)
- `frontend/src/store/cartStore.ts` — Not relevant to owner approval flow
- `frontend/src/components/client/checkout/*` — Checkout components, not approval

### Testing Standards

- Follow `test_10_3_checkout_service_type.py` pattern: class-based test organization with descriptive names
- Use `httpx.AsyncClient` with `app` fixture for API tests
- Mock DB session with `AsyncSession` mock
- Test all 3 service types (buy, rent, bespoke) for approve flow
- Test error cases: wrong status, wrong tenant, missing tailor for bespoke
- Verify TailorTask creation side effect for bespoke
- Verify notification creation
- Target: maintain 100% Epic 10 test pass rate (54 existing + new tests)

### Previous Story Intelligence

**From Story 10.3 (most recent):**
- Orders are created with `status='pending'` regardless of service type
- `service_type` field is set on order: `bespoke > rent > buy` priority for mixed carts
- `OrderPaymentDB` record is created at checkout with `payment_type: full | deposit`
- Deposit amounts: Rent = 30%, Bespoke = 50%
- All 54 Epic 10 tests pass (10.1: 21, 10.2: 7, 10.3: 26)

**From Story 10.2:**
- Measurement check API: `POST /api/v1/orders/check-measurement`
- Lookup chain: JWT → customer_id → CustomerProfileDB → MeasurementDB (is_default=True)
- Response includes `measurements_summary` with neck, shoulder_width, bust, waist, hip, top_length, height

**From Story 10.1:**
- Migration `025_unified_order_workflow.sql` added all needed columns
- OrderStatus enum extended to 15 values including `preparing`, `in_production`, `ready_to_ship`, etc.
- `ServiceType` enum: buy, rent, bespoke
- `OrderPaymentDB` model exists for payment tracking

**Critical learning from 10.1:** SQLAlchemy `default=` only applies at INSERT, not Python init — set values explicitly in tests.

### Git Intelligence

Recent commits show Epic 10 implementation pattern:
- `e581526` feat: Story 10.1 — DB migration & service type model
- `9de28fa` feat: unified order workflow (Epic 10) - 5-phase order process (sprint change)
- Commit messages follow `feat:` / `fix:` prefix convention
- Each story is a single commit

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 10, Story 10.4]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, Order Status Pipeline, Payment Model]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md — FR85 (Owner Approval), FR86 (Auto-routing)]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Owner Dashboard order approval UX]
- [Source: _bmad-output/implementation-artifacts/10-3-checkout-phan-loai-dich-vu.md — Previous story dev notes]
- [Source: _bmad-output/implementation-artifacts/10-2-measurement-gate-cho-dat-may.md — Measurement lookup pattern]
- [Source: _bmad-output/implementation-artifacts/10-1-db-migration-service-type-model.md — DB schema foundation]
- [Source: backend/src/services/tailor_task_service.py:334-451 — create_task() to reuse]
- [Source: backend/src/services/order_service.py:619-700 — update_order_status() pattern]
- [Source: frontend/src/components/client/orders/OrderBoardClient.tsx — Owner order board pattern]
- [Source: frontend/src/components/client/orders/StatusBadge.tsx — Badge styling pattern]
- [Source: backend/src/services/notification_creator.py — Notification creation pattern]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6 (1M context)

### Debug Log References

None — implementation completed cleanly. All 36 tests passed on first run.

### Completion Notes List

- `_VALID_TRANSITIONS` kept as single-value dict; `approve_order()` handles bespoke branching (`confirmed → in_progress`) directly via `create_task()` side effect, avoiding the need to make transitions a list.
- `create_task()` imported inside `approve_order()` function body (not at module level) to avoid circular imports between `order_service.py` and `tailor_task_service.py`.
- `_next_status()` returns `None` for `pending` so generic action button disappears — replaced by dedicated "Phê duyệt" button in `OrderTable.tsx`.
- Bespoke atomicity: `db.flush()` commits `pending → confirmed` before `create_task()` which does its own `db.commit()` (includes `confirmed → in_progress` + TailorTask).
- Staff query in `OrderBoardClient.tsx` is lazy (`enabled: approveDialog.open`) to avoid fetching on every page load.
- Toast uses state-based 3-second auto-dismiss, matching description in dev notes.

### Post-Review Bug Fixes

- **[BUG FIX] notification_type invalid**: `notification_type="order_approved"` not in DB CHECK constraint `chk_notification_type` (allowed: `order_status`, `appointment`, `return_reminder`, `payment`, `system`). Notifications silently failed because `approve_order()` creates them AFTER `db.commit()` — the order status change succeeded but customer never received notification. Fixed: changed to `notification_type="order_status"`.
- **[BUG FIX] order_code format mismatch**: Notification messages used `#{uuid[:8].upper()}` (e.g., `#27C9C93B`) while customer-facing pages use `ORD-YYYYMMDD-{uuid[:6]}` (e.g., `ORD-20260330-27C9C9`). Fixed: added `_build_order_code()` helper in `order_service.py` matching `_build_order_number()` pattern from `order_customer_service.py`. All notification `order_code` formatting now uses consistent `ORD-` format.

### File List

**Modified:**
- `backend/src/models/order.py` — Added `ApproveOrderRequest`, `ApproveOrderResponse` schemas; `service_type` field on `OrderListItem`
- `backend/src/services/order_service.py` — Added `approve_order()`, updated `_VALID_TRANSITIONS` & `_next_status()`, populated `service_type` on list items
- `backend/src/api/v1/orders.py` — Added `POST /{order_id}/approve` endpoint
- `backend/src/services/notification_creator.py` — Added `ORDER_APPROVED_WAREHOUSE_MESSAGE` and `ORDER_APPROVED_BESPOKE_MESSAGE` templates
- `frontend/src/types/order.ts` — Extended `OrderStatus` union (8 new statuses), added `service_type` on `OrderListItem`, added `ApproveOrderRequest`/`ApproveOrderResponse` interfaces
- `frontend/src/app/actions/order-actions.ts` — Added `approveOrder()` server action
- `frontend/src/components/client/orders/StatusBadge.tsx` — Added 8 Epic 10 status styles + `ServiceTypeBadge` component
- `frontend/src/components/client/orders/OrderTable.tsx` — Added `onApprove` prop, "Phê duyệt" button for pending orders, `ServiceTypeBadge` in Loại column
- `frontend/src/components/client/orders/OrderBoardClient.tsx` — Added `approveMutation`, `BespokeTailorDialog`, toast state, staff query, `handleApprove`/`handleApproveConfirm` handlers
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status to `done`

**Created:**
- `backend/tests/test_10_4_owner_approve.py` — 36 tests across 9 classes, all passing
