# Story 10.5: Sub-steps Chuẩn bị Thuê & Mua (Preparation Tracking)

Status: review

## Story

As a Chủ tiệm / Nhân viên kho,
I want theo dõi tiến trình chuẩn bị đơn Thuê và Mua qua các bước cụ thể,
So that biết chính xác mỗi đơn đang ở công đoạn nào trước khi giao cho khách.

## Acceptance Criteria

1. **Given** Đơn hàng Thuê hoặc Mua đã được Owner phê duyệt (status='preparing')
   **When** Nhân viên cập nhật sub-step trên Production Board
   **Then** Đơn Thuê: Hiển thị sub-steps Cleaning (Giặt/Là) → Altering (Chỉnh sửa nhẹ) → Ready
   **And** Đơn Mua: Hiển thị sub-steps QC (Kiểm tra chất lượng) → Packaging (Đóng gói)

2. **Given** Sub-step cuối cùng của đơn hàng hoàn thành
   **When** Hệ thống xử lý transition
   **Then** Status chuyển thành ready_to_ship hoặc ready_for_pickup (Owner chọn)
   **And** Hệ thống gửi thông báo cho khách "Đơn hàng sẵn sàng"

3. **Given** Đơn hàng ở status != 'preparing'
   **When** API update-preparation-step được gọi
   **Then** Trả về 422 ERR_INVALID_STATUS

4. **Given** Nhân viên cố gắng chuyển step về phía sau
   **When** API nhận backward transition (e.g., altering → cleaning)
   **Then** Trả về 422 ERR_BACKWARD_STEP (forward-only pattern)

## Tasks / Subtasks

- [x] Task 1: DB migration — add `preparation_step` column to `orders` (AC: #1)
  - [x] 1.1 Create migration `026_order_preparation_step.sql`: `ALTER TABLE orders ADD COLUMN preparation_step VARCHAR(20) DEFAULT NULL`
  - [x] 1.2 Add `preparation_step` to `OrderDB` mapped column in `db_models.py`
- [x] Task 2: Backend schemas — add preparation step types (AC: #1)
  - [x] 2.1 Add `PreparationStep` Literal types and `RENT_PREP_STEPS` / `BUY_PREP_STEPS` lists in `order.py`
  - [x] 2.2 Add `UpdatePreparationStepRequest` and `UpdatePreparationStepResponse` Pydantic models
  - [x] 2.3 Add `preparation_step` to `OrderResponse` and `OrderListItem`
- [x] Task 3: Backend service — `update_preparation_step()` function (AC: #1, #2, #3, #4)
  - [x] 3.1 Implement `update_preparation_step()` in `order_service.py`
  - [x] 3.2 Auto-transition to ready_to_ship/ready_for_pickup when last step completes
  - [x] 3.3 Set preparation_step to first step when `approve_order()` transitions to `preparing`
  - [x] 3.4 Add notification templates for "Đơn hàng sẵn sàng"
- [x] Task 4: API endpoint — `POST /api/v1/orders/{id}/update-preparation` (AC: #1, #3, #4)
  - [x] 4.1 Add endpoint in `orders.py` router (OwnerOnly auth)
- [x] Task 5: Frontend types & server action (AC: #1)
  - [x] 5.1 Add TypeScript types for preparation step request/response
  - [x] 5.2 Add `updatePreparationStep()` server action in `order-actions.ts`
- [x] Task 6: Frontend UI — preparation sub-step tracking on Order Board (AC: #1, #2)
  - [x] 6.1 Add preparation step progress indicator in OrderTable row
  - [x] 6.2 Add step advance button/dropdown on Order Board for `preparing` orders
  - [x] 6.3 Add delivery mode dialog (ship/pickup) when last step triggers completion
  - [x] 6.4 Toast notification on step advancement
- [x] Task 7: Tests (AC: #1, #2, #3, #4)
  - [x] 7.1 Unit tests for `update_preparation_step()` — all service types, forward-only, error cases
  - [x] 7.2 Integration test for auto-transition preparing → ready_to_ship/ready_for_pickup
  - [x] 7.3 Test notification creation on order ready

## Dev Notes

### Architecture Pattern: Reuse TailorTask production_step approach

The existing `tailor_task_service.py` has an identical forward-only step pattern:
```python
PRODUCTION_STEPS = ["pending", "cutting", "sewing", "finishing", "quality_check", "done"]
```
Follow this exact pattern for preparation steps. Define step lists per service_type:
```python
RENT_PREP_STEPS = ["cleaning", "altering", "ready"]
BUY_PREP_STEPS = ["qc", "packaging"]
```

### Key Implementation Details

**1. Database Change:**
- Add `preparation_step VARCHAR(20) DEFAULT NULL` to `orders` table
- Add to `OrderDB` in `db_models.py` (line ~301, after `remaining_amount`)
- NULL = not in preparation phase; set on approve_order transition to `preparing`

**2. Auto-initialize on approve:**
- In `approve_order()` (`order_service.py` ~line 897+), when rent/buy orders transition to `preparing`, also set:
  - Rent: `order.preparation_step = "cleaning"` (first step)
  - Buy: `order.preparation_step = "qc"` (first step)

**3. Service function `update_preparation_step()`:**
- Validate order status == `preparing` (else 422)
- Validate tenant_id match (multi-tenant isolation — `with_for_update()` pattern)
- Get correct step list based on `order.service_type` (rent → RENT_PREP_STEPS, buy → BUY_PREP_STEPS)
- Forward-only validation: new_index > current_index (else 422)
- On last step completion (rent=`ready`, buy=`packaging`):
  - Require `delivery_mode` parameter: `"ship"` or `"pickup"`
  - If `ship`: transition to `ready_to_ship`
  - If `pickup`: transition to `ready_for_pickup`
  - Set `preparation_step = NULL` (no longer in preparation)
  - Send customer notification

**4. Response schema:**
```python
class UpdatePreparationStepResponse(BaseModel):
    order_id: UUID
    preparation_step: str | None      # current step after update (None if completed)
    status: str                        # order status after update
    service_type: str
    is_completed: bool                 # True if moved out of preparing
```

**5. Notification templates** — add to `notification_creator.py`:
```python
ORDER_READY_SHIP_MESSAGE = (
    "Đơn hàng sẵn sàng giao",
    "Đơn hàng {order_code} đã chuẩn bị xong và sẵn sàng giao hàng.",
)
ORDER_READY_PICKUP_MESSAGE = (
    "Đơn hàng sẵn sàng nhận",
    "Đơn hàng {order_code} đã chuẩn bị xong. Vui lòng đến tiệm nhận hàng.",
)
```

**6. `_VALID_TRANSITIONS` update:**
Current: `"preparing": None` (comment says branching for Story 10.5).
Do NOT change this — `update_preparation_step()` handles its own transition directly (like `approve_order()` handles pending→confirmed→preparing/in_progress). The generic `update_order_status()` should NOT be used for `preparing` → `ready_*` transitions.

**7. `_next_status()` update:**
Currently `preparing` returns None (no generic button). After Story 10.5, this stays None — preparation advancement uses its own UI, not the generic status button.

### Frontend Implementation

**OrderTable.tsx changes:**
- For orders with `status === "preparing"`, show a preparation progress indicator:
  - Use a segmented progress bar (like PRODUCTION_STEPS in OrderDetailDrawer.tsx lines 19-25)
  - Rent: 3 segments (Giặt/Là, Chỉnh sửa, Sẵn sàng)
  - Buy: 2 segments (Kiểm tra CL, Đóng gói)
- Add "Tiếp" (Next) button to advance to next step

**Step advance interaction:**
- Click "Tiếp" → calls `updatePreparationStep()` mutation
- On last step → show dialog asking `ship` or `pickup`
- Toast notification: "Đã chuyển bước: {step_label}" or "Đơn hàng sẵn sàng giao/nhận"

**Use existing patterns from:**
- `OrderBoardClient.tsx`: `approveMutation` pattern for mutation + toast
- `StatusBadge.tsx`: `ServiceTypeBadge` for visual indicators
- `OrderDetailDrawer.tsx` lines 19-25: `PRODUCTION_STEPS` progress display pattern

### Files to Modify

**Backend:**
- `backend/migrations/026_order_preparation_step.sql` — NEW: migration
- `backend/src/models/db_models.py` — Add `preparation_step` mapped column to OrderDB (~line 301)
- `backend/src/models/order.py` — Add step constants, request/response schemas, add `preparation_step` to OrderResponse and OrderListItem
- `backend/src/services/order_service.py` — Add `update_preparation_step()`, update `approve_order()` to init step
- `backend/src/api/v1/orders.py` — Add `POST /{order_id}/update-preparation` endpoint
- `backend/src/services/notification_creator.py` — Add ORDER_READY_SHIP_MESSAGE, ORDER_READY_PICKUP_MESSAGE

**Frontend:**
- `frontend/src/types/order.ts` — Add preparation step types, extend OrderListItem
- `frontend/src/app/actions/order-actions.ts` — Add `updatePreparationStep()` server action
- `frontend/src/components/client/orders/OrderTable.tsx` — Add prep step progress + advance button
- `frontend/src/components/client/orders/OrderBoardClient.tsx` — Add updatePrepMutation, delivery mode dialog, toast

**Tests:**
- `backend/tests/test_10_5_sub_steps.py` — NEW: comprehensive test suite

### Project Structure Notes

- Backend follows layered pattern: `router → service → model` (no direct DB access in routers)
- All API responses use wrapper format: `{ "data": { ... } }` for success, `{ "error": { "code", "message" } }` for failures
- Multi-tenant: all queries MUST filter by `tenant_id`
- Row locking via `with_for_update()` for concurrent safety
- All error messages in Vietnamese
- Frontend mutations use TanStack Query `useMutation` + `queryClient.invalidateQueries`
- Server actions in `order-actions.ts` proxy JWT via Next.js (HttpOnly cookie → backend)
- Toast pattern: state-based 3-second auto-dismiss (see OrderBoardClient.tsx toast implementation)

### Previous Story Intelligence (10.4)

Key learnings from Story 10.4 that MUST be applied:
- **Atomicity**: Use `db.flush()` before commit for multi-step transitions
- **Import pattern**: If importing from `tailor_task_service.py`, import inside function body to avoid circular imports
- **Status field on list item**: `service_type` is already populated on `OrderListItem` — add `preparation_step` the same way
- **Test structure**: Follow 10.4 pattern — separate test classes per scenario, mock DB session
- **Toast pattern**: 3-second auto-dismiss with descriptive message, matches existing implementation

### Anti-patterns to Avoid

- DO NOT create a separate `preparation_tasks` table — keep it simple with a column on OrderDB
- DO NOT use `update_order_status()` for preparing → ready_* transitions — use dedicated function
- DO NOT add WebSocket/polling — just invalidate queries after mutation (TanStack Query pattern)
- DO NOT duplicate notification logic — reuse `create_notification()` from `notification_creator.py`
- DO NOT hardcode step lists in frontend — define constants that mirror backend definitions
- DO NOT skip `with_for_update()` on order lookup — concurrent safety is required

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 10 Story 10.5]
- [Source: _bmad-output/planning-artifacts/architecture.md#Order Status Pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Payment Model]
- [Source: backend/src/services/tailor_task_service.py#PRODUCTION_STEPS — pattern to follow]
- [Source: backend/src/services/tailor_task_service.py#update_production_step() — forward-only pattern]
- [Source: backend/src/services/order_service.py#approve_order() — init preparation on approve]
- [Source: backend/src/services/order_service.py#_VALID_TRANSITIONS — preparing=None, handled by dedicated function]
- [Source: frontend/src/components/client/orders/OrderDetailDrawer.tsx#PRODUCTION_STEPS — UI progress pattern]
- [Source: frontend/src/components/client/orders/OrderBoardClient.tsx — mutation/toast pattern]
- [Source: _bmad-output/implementation-artifacts/10-4-owner-approve-va-auto-routing.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Implemented preparation sub-step tracking for Buy/Rent orders in 'preparing' status
- Backend: RENT_PREP_STEPS (cleaning→altering→ready), BUY_PREP_STEPS (qc→packaging)
- update_preparation_step() with forward-only validation, auto-transition to ready_to_ship/ready_for_pickup on last step
- approve_order() now auto-initializes preparation_step when transitioning to 'preparing'
- Customer notification sent when order becomes ready (ORDER_READY_SHIP_MESSAGE / ORDER_READY_PICKUP_MESSAGE)
- Frontend: PrepStepProgress component with segmented progress bar, "Tiếp" advance button
- DeliveryModeDialog for ship/pickup selection on last step
- 23 tests all passing (7 test classes covering schemas, rent/buy flows, error cases, notifications)
- All 113 Epic 10 tests pass with no regressions

### File List

**New files:**
- backend/migrations/026_order_preparation_step.sql
- backend/tests/test_10_5_sub_steps.py

**Modified files:**
- backend/src/models/db_models.py
- backend/src/models/order.py
- backend/src/services/order_service.py
- backend/src/api/v1/orders.py
- backend/src/services/notification_creator.py
- frontend/src/types/order.ts
- frontend/src/app/actions/order-actions.ts
- frontend/src/components/client/orders/OrderTable.tsx
- frontend/src/components/client/orders/OrderBoardClient.tsx
- _bmad-output/implementation-artifacts/sprint-status.yaml
