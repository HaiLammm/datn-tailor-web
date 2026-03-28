# Story 10.6: Remaining Payment & Handover (Thanh toán còn lại & Bàn giao)

Status: review

## Story

As a Khách hàng,
I want thanh toán phần tiền còn lại khi đơn hàng sẵn sàng, và nhận hàng trơn tru,
So that hoàn tất nghĩa vụ tài chính và nhận sản phẩm đúng hẹn.

## Acceptance Criteria

1. **Given** Đơn hàng có status='ready_to_ship' hoặc 'ready_for_pickup' và remaining_amount > 0
   **When** Khách gọi API `POST /api/v1/orders/{id}/pay-remaining`
   **Then** Payment gateway được khởi tạo cho số tiền remaining_amount
   **And** OrderPaymentDB record (type='remaining') được tạo với status='pending'
   **And** Trả về payment_url để redirect khách sang gateway

2. **Given** Payment gateway gửi webhook sau khi khách thanh toán thành công
   **When** Backend xử lý webhook cho remaining payment
   **Then** OrderPaymentDB (type='remaining') cập nhật status='success'
   **And** Order.remaining_amount = 0, order.payment_status = 'paid'
   **And** Hệ thống gửi thông báo "Thanh toán hoàn tất" cho khách

3. **Given** Đơn Mua 100% (service_type='buy', remaining_amount=NULL hoặc 0)
   **When** Owner chuyển status từ ready_to_ship/ready_for_pickup
   **Then** Không yêu cầu remaining payment, chuyển thẳng → shipped/delivered

4. **Given** Đơn hàng đã thanh toán đầy đủ (remaining_amount=0 hoặc payment_status='paid')
   **When** Owner cập nhật trạng thái qua Order Board
   **Then** ready_to_ship → shipped → delivered → completed
   **And** ready_for_pickup → delivered → completed
   **And** Mỗi transition gửi thông báo cho khách

5. **Given** Đơn hàng chưa thanh toán remaining (remaining_amount > 0, payment_status != 'paid')
   **When** Owner cố gắng chuyển ready_to_ship → shipped
   **Then** Trả về 422 ERR_REMAINING_UNPAID, chặn transition

6. **Given** Khách xem đơn hàng ở trạng thái ready_to_ship/ready_for_pickup
   **When** Customer profile orders page hiển thị
   **Then** Hiển thị nút "Thanh toán còn lại" với số tiền remaining_amount
   **And** Hiển thị deposit_amount đã thanh toán và remaining_amount cần thanh toán

## Tasks / Subtasks

- [x] Task 1: Backend — `pay_remaining()` service function (AC: #1, #5)
  - [x] 1.1 Add `pay_remaining()` in `order_service.py`: validate status in (ready_to_ship, ready_for_pickup), remaining_amount > 0, create OrderPaymentDB (type='remaining', status='pending'), generate payment URL
  - [x] 1.2 Add `POST /api/v1/orders/{id}/pay-remaining` endpoint in `orders.py` (Customer auth)
  - [x] 1.3 Add `PayRemainingRequest` and `PayRemainingResponse` schemas in `order.py`
- [x] Task 2: Backend — Webhook handler for remaining payment (AC: #2)
  - [x] 2.1 Extend `process_webhook()` in `payment_service.py` to detect remaining payment type (check OrderPaymentDB type='remaining')
  - [x] 2.2 On success: update OrderPaymentDB status='success', set order.remaining_amount=0, order.payment_status='paid'
  - [x] 2.3 Add notification templates: ORDER_REMAINING_PAID_MESSAGE
- [x] Task 3: Backend — Status transitions for handover flow (AC: #3, #4, #5)
  - [x] 3.1 Update `_VALID_TRANSITIONS` to add: delivered→completed (shipped→delivered, ready_to_ship→shipped, ready_for_pickup→delivered already existed)
  - [x] 3.2 Add payment guard in `update_order_status()`: block ready_to_ship→shipped if remaining_amount > 0 and payment_status != 'paid' (COD/internal exempt)
  - [x] 3.3 Add notification templates: ORDER_SHIPPED_MESSAGE, ORDER_DELIVERED_MESSAGE, ORDER_COMPLETED_MESSAGE + completed in ORDER_STATUS_MESSAGES
  - [x] 3.4 Update `_next_status()` to return correct next status for ready_to_ship (with payment guard), ready_for_pickup, shipped, delivered
- [x] Task 4: Frontend — Customer remaining payment UI (AC: #6)
  - [x] 4.1 Add TypeScript types: `PayRemainingRequest`, `PayRemainingResponse`
  - [x] 4.2 Add `payRemaining()` server action in `order-actions.ts`
  - [x] 4.3 Add remaining payment button/card in customer order detail (OrderDetailModal)
  - [x] 4.4 Handle payment redirect: on success → redirect to gateway URL, on return → refresh order status
- [x] Task 5: Frontend — Owner handover status buttons (AC: #3, #4)
  - [x] 5.1 Update `NEXT_STATUS_LABELS` in OrderTable.tsx for new transitions (added `delivered: "Hoàn tất"`)
  - [x] 5.2 Update `_next_status()` display logic in OrderBoardClient for ready_to_ship, shipped statuses (backend-driven via next_valid_status)
  - [x] 5.3 Show payment status indicator on Order Board for orders with remaining_amount > 0
- [x] Task 6: Tests (AC: #1–#6)
  - [x] 6.1 Unit tests for `pay_remaining()` — valid, invalid status, already paid, wrong tenant, wrong customer
  - [x] 6.2 Unit tests for remaining payment webhook processing (notification template tests)
  - [x] 6.3 Unit tests for status transition guards (remaining unpaid blocks shipping, COD bypass, NULL remaining)
  - [x] 6.4 Unit tests for full handover flow: ready → shipped → delivered → completed
  - [x] 6.5 Integration test: buy order skips remaining payment

## Dev Notes

### Architecture Pattern: Reuse Webhook & Background Task (Story 4.1)

The existing `payment_service.py` has a complete webhook flow:
```
Frontend → Backend initiate payment → Redirect to VNPay/Stripe → Webhook callback → Update order
```

**Story 10.6 extends this pattern** for remaining payments. The key difference: initial checkout creates OrderPaymentDB (type='deposit'), and now `pay_remaining()` creates OrderPaymentDB (type='remaining').

### Key Implementation Details

**1. `pay_remaining()` service function:**
- Validate: `order.status in ('ready_to_ship', 'ready_for_pickup')`
- Validate: `order.remaining_amount > 0` (else 422 ERR_ALREADY_PAID)
- Validate: tenant_id match + `with_for_update()` for concurrent safety
- Create OrderPaymentDB: `payment_type='remaining'`, `amount=order.remaining_amount`, `status='pending'`
- Generate mock payment URL (same pattern as order creation, line 275-278 in order_service.py):
  ```python
  payment_url = f"/checkout/confirmation?orderId={order.id}&paymentType=remaining&status=success"
  ```
- Return: `PayRemainingResponse(order_id, payment_url, amount)`

**2. Webhook extension for remaining payments:**
- In `process_webhook()` (payment_service.py ~line 164-220): after finding order, check if this is a remaining payment by querying `OrderPaymentDB` where `order_id=order.id AND payment_type='remaining' AND status='pending'`
- If found: update that record's status='success', set `order.remaining_amount=0`, `order.payment_status='paid'`
- If not found (normal checkout payment): existing flow handles it
- Send notification: ORDER_REMAINING_PAID_MESSAGE

**3. Status transition updates:**
Current `_VALID_TRANSITIONS` (order_service.py ~line 485):
```python
"ready_to_ship": "shipped",
"ready_for_pickup": "delivered",
```
These already exist from Story 10.1. Add:
- `"shipped": "delivered"` (if not already present)
- `"delivered": "completed"` (terminal for buy/bespoke)
- Keep `"renting"` and `"returned"` for Story 10.7

**Payment guard for shipping:**
```python
if current_status == "ready_to_ship" and new_status == "shipped":
    if order.remaining_amount and order.remaining_amount > 0 and order.payment_status != "paid":
        raise HTTPException(422, ERR_REMAINING_UNPAID)
```
Follow existing pattern from `checked → shipped` guard (~line 726-736).

**Buy 100% orders:** `remaining_amount` is NULL (set at order creation for buy). Guard check: `order.remaining_amount and order.remaining_amount > 0` naturally passes for buy orders (NULL is falsy).

**4. `_next_status()` updates:**
```python
if o.status == "ready_to_ship":
    # Block if remaining unpaid
    if o.remaining_amount and o.remaining_amount > 0 and o.payment_status != "paid":
        return None  # No button shown — customer must pay first
    return "shipped"
if o.status == "ready_for_pickup":
    return "delivered"
if o.status == "shipped":
    return "delivered"
if o.status == "delivered":
    return "completed" if o.service_type != "rent" else None  # rent → renting (Story 10.7)
```

**5. Notification templates** — add to `notification_creator.py`:
```python
ORDER_REMAINING_PAID_MESSAGE = (
    "Thanh toán hoàn tất",
    "Đơn hàng {order_code} đã thanh toán đầy đủ. Cảm ơn bạn!",
)
ORDER_SHIPPED_MESSAGE = (
    "Đơn hàng đang giao",
    "Đơn hàng {order_code} đang được giao đến bạn.",
)
ORDER_DELIVERED_MESSAGE = (
    "Đơn hàng đã giao thành công",
    "Đơn hàng {order_code} đã giao thành công. Cảm ơn bạn đã mua sắm!",
)
ORDER_COMPLETED_MESSAGE = (
    "Đơn hàng hoàn tất",
    "Đơn hàng {order_code} đã hoàn tất. Hẹn gặp lại!",
)
```

**6. Request/Response schemas:**
```python
class PayRemainingRequest(BaseModel):
    payment_method: PaymentMethod = PaymentMethod.vnpay

class PayRemainingResponse(BaseModel):
    order_id: UUID
    payment_url: str | None
    amount: Decimal
    payment_type: str  # "remaining"
```

**7. Frontend customer order detail:**
- Location: `frontend/src/app/(customer)/profile/orders/` and `OrderDetailModal.tsx`
- Show payment breakdown: deposit paid ✓, remaining amount pending
- "Thanh toán còn lại" button when `remaining_amount > 0` and `payment_status != 'paid'`
- On click: call `payRemaining()` → receive `payment_url` → `window.location.href = payment_url`

**8. Frontend Owner Board updates:**
- `NEXT_STATUS_LABELS`: add `ready_to_ship: "Giao hàng"`, `shipped: "Xác nhận giao"`, `delivered: "Hoàn tất"`
- Payment indicator: small badge showing "Chờ thanh toán" if remaining > 0 on ready_to_ship orders

### Two Important Model Distinctions

**OrderPaymentDB** (`order_payments` table) = business payment records:
- `payment_type`: full | deposit | remaining | security_deposit
- `status`: pending | success | failed
- Created by: order creation (deposit), `pay_remaining()` (remaining), Story 10.7 (security_deposit)
- **This is what Story 10.6 creates and updates**

**PaymentTransactionDB** (`payment_transactions` table) = gateway webhook audit:
- `provider`: vnpay | momo
- `transaction_id`: gateway-assigned ID (unique with provider)
- `raw_payload`: JSON audit trail
- Created by: webhook handler only
- **Existing from Story 4.1 — no changes needed for 10.6**

### Anti-patterns to Avoid

- DO NOT create a separate remaining_payments table — use OrderPaymentDB with `payment_type='remaining'`
- DO NOT bypass the payment guard — remaining MUST be paid before shipping (except COD/buy 100%)
- DO NOT use `update_order_status()` for payment-related transitions — extend the existing guard logic
- DO NOT duplicate webhook signature verification — reuse `verify_webhook_signature()` from payment_service.py
- DO NOT block COD orders — COD orders have `payment_method='cod'`, guard should check: `(remaining_amount > 0 AND payment_status != 'paid' AND payment_method NOT IN ('cod', 'internal'))`
- DO NOT modify PaymentTransactionDB schema — it's the gateway audit trail, separate from business payments

### Previous Story Intelligence (10.5)

Key learnings that MUST be applied:
- **Atomicity**: Use `db.flush()` before `db.commit()` for multi-step transitions (notification before commit for atomicity)
- **Import pattern**: If importing from other services, import inside function body to avoid circular imports
- **Row locking**: Always use `with_for_update()` for order mutations
- **Test structure**: Separate test classes per scenario, in-memory SQLite DB
- **Toast pattern**: 3-second auto-dismiss with descriptive message
- **Error codes**: Use specific error codes (ERR_REMAINING_UNPAID, ERR_ALREADY_PAID) not generic ones
- **Notification pattern**: Create notification before commit, wrap in try/except with logger.warning

### Files to Modify

**Backend:**
- `backend/src/models/order.py` — Add PayRemainingRequest, PayRemainingResponse schemas
- `backend/src/services/order_service.py` — Add `pay_remaining()`, update `_VALID_TRANSITIONS`, update `_next_status()`, add payment guard
- `backend/src/api/v1/orders.py` — Add `POST /{order_id}/pay-remaining` endpoint (Customer auth)
- `backend/src/services/payment_service.py` — Extend `process_webhook()` for remaining payment detection
- `backend/src/services/notification_creator.py` — Add ORDER_REMAINING_PAID_MESSAGE, ORDER_SHIPPED_MESSAGE, ORDER_DELIVERED_MESSAGE, ORDER_COMPLETED_MESSAGE

**Frontend:**
- `frontend/src/types/order.ts` — Add PayRemainingRequest, PayRemainingResponse types
- `frontend/src/app/actions/order-actions.ts` — Add `payRemaining()` server action
- `frontend/src/components/client/orders/OrderTable.tsx` — Update NEXT_STATUS_LABELS for new transitions
- `frontend/src/components/client/orders/OrderBoardClient.tsx` — Update status button display, add payment indicator
- `frontend/src/app/(customer)/profile/orders/OrdersClient.tsx` OR `OrderDetailModal.tsx` — Add remaining payment UI

**Tests:**
- `backend/tests/test_10_6_remaining_payment.py` — NEW: comprehensive test suite

### Project Structure Notes

- Backend follows layered pattern: `router → service → model` (no direct DB access in routers)
- All API responses use wrapper format: `{ "data": { ... } }` for success, `{ "error": { "code", "message" } }` for failures
- Multi-tenant: all queries MUST filter by `tenant_id`
- Row locking via `with_for_update()` for concurrent safety
- All error messages in Vietnamese
- Frontend mutations use TanStack Query `useMutation` + `queryClient.invalidateQueries`
- Server actions in `order-actions.ts` proxy JWT via Next.js (HttpOnly cookie → backend)
- Customer auth: use `CurrentUser` dependency (not `OwnerOnly`) for pay-remaining endpoint

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 10 Story 10.6]
- [Source: _bmad-output/planning-artifacts/architecture.md#Payment Model]
- [Source: _bmad-output/planning-artifacts/architecture.md#Order Status Pipeline]
- [Source: backend/src/services/payment_service.py#process_webhook() — webhook pattern to extend]
- [Source: backend/src/services/payment_service.py#verify_webhook_signature() — signature verification]
- [Source: backend/src/models/db_models.py#OrderPaymentDB — business payment model]
- [Source: backend/src/models/db_models.py#PaymentTransactionDB — gateway audit model]
- [Source: backend/src/services/order_service.py#_VALID_TRANSITIONS — status transition matrix]
- [Source: backend/src/services/order_service.py#update_order_status() — checked→shipped guard pattern]
- [Source: backend/src/services/order_service.py#pay_remaining target location ~after update_preparation_step]
- [Source: _bmad-output/implementation-artifacts/10-5-sub-steps-chuan-bi-thue-va-mua.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- Test fixture fix: `address_detail` needed 5+ chars for ShippingAddress validation

### Completion Notes List

- Task 1: Added `pay_remaining()` service function with full validation (status, remaining_amount, tenant, customer ownership), OrderPaymentDB record creation, mock payment URL. Added PayRemainingRequest/PayRemainingResponse schemas. Added POST endpoint with CurrentUser auth.
- Task 2: Extended `process_webhook()` to detect pending remaining payments via OrderPaymentDB query. On success: updates payment record status, zeros remaining_amount, sets payment_status='paid'. Sends ORDER_REMAINING_PAID_MESSAGE notification.
- Task 3: Updated `_VALID_TRANSITIONS` (delivered→completed). Added payment guard for ready_to_ship→shipped (COD/internal exempt). Added 4 notification templates. Updated `_next_status()` for handover statuses with payment guard logic.
- Task 4: Added frontend types, `payRemaining()` server action, payment breakdown section and "Thanh toán còn lại" button in OrderDetailModal. Added deposit_amount/remaining_amount to CustomerOrderDetail (backend + frontend).
- Task 5: Updated NEXT_STATUS_LABELS with `delivered: "Hoàn tất"`. Added payment indicator badge ("Chờ thanh toán") on OrderTable for ready_to_ship orders with unpaid remaining. Added remaining_amount to OrderListItem.
- Task 6: 26 tests all passing — schemas, pay_remaining (8 cases), payment guard (4 cases), handover flow (4 cases), buy skip (2 cases), notification templates (5 cases). Zero regressions on existing Epic 10 tests (90/90 pass).

### Change Log

- 2026-03-28: Story 10.6 implementation complete — all 6 tasks, 26 tests passing
- 2026-03-28: Code review fixes (10/11 items): P1 idempotency, P2 pickup guard, P3 webhook amount, P4-P5 DetachedInstance, P6 rent guard, P7 atomic notification, P8 dead code, P9 pickup badge, P11 COD validation. 31 tests passing.

### File List

**Backend (modified):**
- backend/src/models/order.py — Added PayRemainingRequest, PayRemainingResponse schemas; remaining_amount to OrderListItem
- backend/src/models/order_customer.py — Added deposit_amount, remaining_amount to CustomerOrderDetail
- backend/src/services/order_service.py — Added pay_remaining() with idempotency, updated _VALID_TRANSITIONS (delivered→completed), added payment guards (ship + pickup + rent), updated _next_status(), COD validation
- backend/src/services/payment_service.py — Extended process_webhook() for remaining payment with correct amount verification, atomic notification, captured locals
- backend/src/services/notification_creator.py — Added ORDER_REMAINING_PAID_MESSAGE, completed in ORDER_STATUS_MESSAGES
- backend/src/services/order_customer_service.py — Pass deposit_amount/remaining_amount to CustomerOrderDetail
- backend/src/api/v1/orders.py — Added POST /{order_id}/pay-remaining endpoint (Customer auth)

**Backend (new):**
- backend/tests/test_10_6_remaining_payment.py — 31 tests: schemas, pay_remaining, guards, handover flow, buy skip, code review fixes, notifications

**Frontend (modified):**
- frontend/src/types/order.ts — Added PayRemainingRequest, PayRemainingResponse, remaining_amount to OrderListItem, deposit_amount/remaining_amount to CustomerOrderDetail
- frontend/src/app/actions/order-actions.ts — Added payRemaining() server action
- frontend/src/components/client/orders/OrderDetailModal.tsx — Payment breakdown section + "Thanh toán còn lại" button
- frontend/src/components/client/orders/OrderTable.tsx — Updated NEXT_STATUS_LABELS (delivered), payment indicator badge for ship + pickup
