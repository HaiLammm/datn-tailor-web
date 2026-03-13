# Story 4.1: Xử lý State Thanh toán qua Webhook

Status: review

## Story

As a Hệ thống (Backend API Listener),
I want bắt gói tin Thanh Toán từ MOMO/VNPay/Stripe thông qua Event Webhook,
So that xác thực giao dịch, chuyển Order `Pending` thành `Confirmed` tự động không Timeout.

## Acceptance Criteria

1. **AC1 — Webhook Endpoint Active:** Hệ thống có endpoint `/api/v1/payments/webhook/{provider}` nhận POST callback từ VNPay/Momo/Stripe.
2. **AC2 — Signature Verification:** Mỗi callback PHẢI được xác thực qua HMAC-SHA256 signature trước khi xử lý. Request không hợp lệ → HTTP 400 + log cảnh báo.
3. **AC3 — Order Status Transition:** Khi payment OK → Order chuyển từ `pending` → `confirmed`. Khi payment FAILED → Order giữ `pending` + ghi `payment_status = failed`.
4. **AC4 — Idempotency:** Webhook callback gọi lại lần 2+ cho cùng transaction KHÔNG thay đổi trạng thái đã xử lý (idempotent).
5. **AC5 — Payment Record:** Mỗi webhook callback tạo `payment_transactions` record lưu: provider, transaction_id, amount, status, raw_payload (JSONB).
6. **AC6 — Email Trigger:** Khi order confirmed thành công → trigger background email xác nhận đơn hàng (try/except, không block main flow).
7. **AC7 — Logging & Monitoring:** Mọi webhook event đều được log structured (provider, order_id, status, timestamp). Mismatch status log ERROR level.
8. **AC8 — Return URL Handler:** Frontend `/checkout/confirmation?orderId=X&status=Y` page đọc order status từ backend thay vì trust query param.

## Tasks / Subtasks

- [x] Task 1: Database Migration — payment_transactions table (AC: #5)
  - [x] 1.1: Tạo migration `013_create_payment_transactions.sql`
  - [x] 1.2: Columns: id, order_id (FK), provider (varchar), transaction_id (varchar, unique per provider), amount (numeric), status (varchar), raw_payload (JSONB), created_at
  - [x] 1.3: Index on order_id, unique index on (provider, transaction_id)
  - [x] 1.4: Thêm `payment_status` column vào bảng `orders` (varchar, default 'pending', values: pending/paid/failed/refunded)

- [x] Task 2: Pydantic Schemas — Payment models (AC: #1, #2, #5)
  - [x] 2.1: `PaymentStatus` enum (pending, paid, failed, refunded) trong `order.py`
  - [x] 2.2: `WebhookPayload` base schema + provider-specific schemas (VNPayWebhook, MomoWebhook)
  - [x] 2.3: `PaymentTransactionResponse` schema

- [x] Task 3: DB Models — PaymentTransactionDB (AC: #5)
  - [x] 3.1: Thêm `PaymentTransactionDB` class vào `db_models.py`
  - [x] 3.2: Thêm `payment_status` field vào `OrderDB`
  - [x] 3.3: Thêm relationship `OrderDB.payment_transactions`

- [x] Task 4: Payment Service — Business Logic (AC: #2, #3, #4, #6, #7)
  - [x] 4.1: `payment_service.py` — `verify_webhook_signature(provider, payload, signature, secret)` → bool
  - [x] 4.2: `process_webhook(db, provider, payload)` — main handler: verify → check idempotent → update order → create transaction record → trigger email
  - [x] 4.3: Provider-specific parsers: `_parse_vnpay_callback(payload)`, `_parse_momo_callback(payload)` → normalized (order_id, transaction_id, amount, status)
  - [x] 4.4: Idempotency check: SELECT existing transaction by (provider, transaction_id). If exists → return 200 OK, no state change
  - [x] 4.5: Order update with `SELECT ... FOR UPDATE` lock to prevent race conditions
  - [x] 4.6: Email trigger: `try/except` wrap `send_order_confirmation_email()` → log on failure, never block

- [x] Task 5: Webhook API Endpoint (AC: #1, #2, #7)
  - [x] 5.1: `payments.py` router — `POST /api/v1/payments/webhook/{provider}`
  - [x] 5.2: Accept raw body (not parsed JSON) for signature verification
  - [x] 5.3: Return 200 OK quickly (gateway timeout prevention)
  - [x] 5.4: Register router in `main.py`

- [x] Task 6: Configuration — Webhook Secrets (AC: #2)
  - [x] 6.1: Thêm `VNPAY_WEBHOOK_SECRET`, `MOMO_WEBHOOK_SECRET` vào `config.py` (env vars, default empty)
  - [x] 6.2: Thêm `PAYMENT_PROVIDERS` list constant

- [x] Task 7: Frontend — Confirmation Page Update (AC: #8)
  - [x] 7.1: Update `/checkout/confirmation` page: fetch order từ backend via `getOrder()` action thay vì trust `status` query param
  - [x] 7.2: Hiển thị trạng thái payment thực từ backend (pending/paid/failed)
  - [x] 7.3: Polling hoặc single fetch với retry nếu status vẫn pending (gateway chưa callback)

- [x] Task 8: Email Service — Order Confirmation (AC: #6)
  - [x] 8.1: Thêm `send_order_confirmation_email(order_data)` vào `email_service.py`
  - [x] 8.2: Template email: mã đơn, danh sách item, tổng tiền, phương thức thanh toán, địa chỉ giao

- [x] Task 9: Testing (AC: ALL)
  - [x] 9.1: `test_payment_service.py` — signature verification (valid/invalid), idempotency, status transitions, email trigger
  - [x] 9.2: `test_payment_api.py` — webhook endpoint (valid callback, invalid signature → 400, duplicate → 200 idempotent)
  - [x] 9.3: Frontend test update: confirmation page fetches from backend not query params

### Review Follow-ups (AI)

- [x] [AI-Review][High] H1: Add try/except IntegrityError around db.commit() in process_webhook for race condition on duplicate transaction insert — return 200 "Already processed" instead of 500 [backend/src/services/payment_service.py:211-214]
- [x] [AI-Review][High] H2: OrderDB has no customer_email field — send_order_confirmation_email always returns False. Either add customer_email to OrderDB/migration or use customer_id to look up user email [backend/src/services/email_service.py:1011]
- [x] [AI-Review][High] H3: process_webhook fetches order without selectinload(OrderDB.items) — email function accesses order.items after commit causing potential DetachedInstanceError. Add selectinload or refresh with items before email call [backend/src/services/payment_service.py:172,219]
- [x] [AI-Review][Med] M1: No amount verification — webhook amount not compared to order.total_amount before confirming. Add amount mismatch check and log ERROR if different [backend/src/services/payment_service.py:189]
- [x] [AI-Review][Med] M2: Remove unused Pydantic schemas WebhookPayload, VNPayWebhook, MomoWebhook from order.py — dead code never imported [backend/src/models/order.py:120-151]
- [x] [AI-Review][Med] M3: Response format inconsistency — unsupported provider in payments.py returns {"error":...} with 200 instead of standard format. Delegate provider validation to service or return proper HTTPException [backend/src/api/v1/payments.py:42-47]
- [x] [AI-Review][Med] M4: Frontend polling timeout (10 attempts) shows no user feedback — renders OrderConfirmation with pending status. Add explicit timeout message "Thanh toán chưa xác nhận" [frontend/src/components/client/checkout/OrderConfirmationClient.tsx:78-80]
- [x] [AI-Review][Low] L1: Remove unused paymentStatus prop from OrderConfirmationClientProps interface — dead API surface [frontend/src/components/client/checkout/OrderConfirmationClient.tsx:21]
- [x] [AI-Review][Low] L2: VNPay signature pattern uses HMAC of raw body instead of SHA256 of sorted query params per Dev Notes — acceptable for MVP mock but add TODO comment for real integration [backend/src/services/payment_service.py:29]

## Senior Developer Review (AI)

**Review Date:** 2026-03-13
**Reviewer:** Claude Opus 4.6 (Code Review Agent)
**Outcome:** Changes Requested

**Summary:** Implementation covers all 8 ACs structurally. Webhook endpoint, signature verification, idempotency, status transitions, payment record, email trigger, logging, and frontend confirmation page all exist. However, 3 HIGH issues affect runtime correctness: idempotency race condition could 500 on concurrent requests, email function references nonexistent field so never sends, and order items aren't loaded for email template. 4 MEDIUM issues around amount verification, dead code, response format, and polling UX.

**Action Items:** 9 total (3 High, 4 Medium, 2 Low) — ALL RESOLVED
- [x] H1: Idempotency race condition — IntegrityError unhandled
- [x] H2: customer_email field missing — email always skips
- [x] H3: Order items not loaded for email — DetachedInstanceError risk
- [x] M1: No amount verification
- [x] M2: Dead Pydantic schemas
- [x] M3: Response format inconsistency
- [x] M4: Polling timeout no user feedback
- [x] L1: Unused paymentStatus prop
- [x] L2: VNPay signature pattern mismatch

## Dev Notes

### Architecture Pattern: Webhook & Background Tasks

```
Frontend → createOrder() → Backend (Order Pending) → return payment_url
User → redirect to VNPay/Momo gateway → pays
Gateway → POST /api/v1/payments/webhook/{provider} → Backend
Backend → verify signature → update Order → trigger email (background)
Frontend → /checkout/confirmation?orderId=X → fetches real status from Backend
```

**CRITICAL:** Frontend MUST NOT trust query params for payment status. Always fetch from backend.

### Existing Code to Build Upon (Story 3.3)

| What | Where |
|------|-------|
| OrderDB, OrderItemDB | `backend/src/models/db_models.py` (line 258+) |
| OrderStatus enum, OrderCreate/Response | `backend/src/models/order.py` |
| create_order, get_order | `backend/src/services/order_service.py` |
| Orders API router | `backend/src/api/v1/orders.py` |
| Orders migration | `backend/migrations/011_create_orders_tables.sql` |
| Order types (frontend) | `frontend/src/types/order.ts` |
| Order server actions | `frontend/src/app/actions/order-actions.ts` |
| Confirmation page | `frontend/src/app/(customer)/checkout/confirmation/page.tsx` |
| OrderConfirmationClient | `frontend/src/components/client/checkout/OrderConfirmationClient.tsx` |
| Email service | `backend/src/services/email_service.py` |

### Payment URL Flow (Current Mock from Story 3.3)

Story 3.3 hiện tại trả mock payment_url:
```python
# order_service.py line 140
payment_url = f"/checkout/confirmation?orderId={order.id}&status=success"
```

Story 4.1 cần:
1. Thay mock URL bằng real gateway URL (hoặc mock gateway URL format đúng)
2. Webhook endpoint nhận callback từ gateway
3. Confirmation page đọc status từ backend, không từ `?status=success`

### Database Schema Addition

```sql
-- 013_create_payment_transactions.sql
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,        -- 'vnpay', 'momo'
    transaction_id VARCHAR(255) NOT NULL,  -- gateway's transaction ID
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,           -- 'success', 'failed'
    raw_payload JSONB NOT NULL,            -- full gateway callback for audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX idx_payment_tx_provider_txid ON payment_transactions(provider, transaction_id);
CREATE INDEX idx_payment_tx_order_id ON payment_transactions(order_id);

-- Add payment_status to orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
```

### Signature Verification Pattern

```python
import hashlib
import hmac

def verify_webhook_signature(provider: str, raw_body: bytes, signature: str, secret: str) -> bool:
    """HMAC-SHA256 signature verification for webhook callbacks."""
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
```

**VNPay:** Signature in `vnp_SecureHash` param, uses SHA256 of sorted query params.
**Momo:** Signature in `signature` field, uses HMAC-SHA256 of specific fields.

### Idempotency Pattern

```python
# Check existing transaction BEFORE any state change
existing = await db.execute(
    select(PaymentTransactionDB).where(
        PaymentTransactionDB.provider == provider,
        PaymentTransactionDB.transaction_id == gateway_tx_id,
    )
)
if existing.scalar_one_or_none():
    return {"data": {"message": "Already processed"}, "meta": {}}
```

### Anti-Patterns (DO NOT)

1. **DO NOT** store raw card data or sensitive payment credentials (PCI DSS)
2. **DO NOT** trust client-side payment status — always verify via backend
3. **DO NOT** block webhook response waiting for email — email is background task
4. **DO NOT** install payment SDKs (no vnpay-python, momo-sdk) — use raw HTTP/HMAC
5. **DO NOT** create `middleware.ts` — project uses `proxy.ts`
6. **DO NOT** put Client Components in `app/` folder
7. **DO NOT** skip `db.commit()` after `db.flush()` — data will rollback
8. **DO NOT** use Zod library — project uses inline validation
9. **DO NOT** raise generic exceptions — use `HTTPException` with standard error format `{"error": {"code": "ERR_*", "message": "..."}}`
10. **DO NOT** implement real gateway integration — use mock webhook format for MVP (but with proper signature verification pattern)
11. **DO NOT** recreate format utilities — reuse from `frontend/src/utils/format.ts`
12. **DO NOT** skip loading/error states in frontend components

### Project Structure Notes

- **Server Components** in `app/` — `frontend/src/app/(customer)/checkout/confirmation/page.tsx`
- **Client Components** in `components/client/` — e.g., `OrderConfirmationClient.tsx`
- **Server Actions** in `app/actions/` — `order-actions.ts`
- **Backend API** in `api/v1/` — new `payments.py` router
- **Services** in `services/` — new `payment_service.py`
- **Models** in `models/` — extend `order.py` and `db_models.py`
- **Config** in `core/config.py` — add webhook secrets

### API Response Format (Standard)

```json
// Success
{"data": {...}, "meta": {}}

// Error
{"error": {"code": "ERR_CODE", "message": "Thông báo người dùng"}}
```

### Testing Standards

- Backend: pytest + async fixtures, use `AsyncSession` mock
- Frontend: Jest + React Testing Library
- Test naming: `test_<what>_<scenario>` (backend), `it("descriptive behavior")` (frontend)
- Mock external services, not database queries for integration tests
- Assert exact values, not `>= 0` style weak assertions

### Previous Story 3.3 Code Review Learnings

| Learning | Application to 4.1 |
|----------|---------------------|
| Race condition with `SELECT ... FOR UPDATE` | Apply same pattern when updating order status from webhook |
| Open redirect via payment_url | N/A for webhook (backend-only), but confirmation page must not trust query params |
| Email must not block main flow | `try/except` around email in webhook handler |
| `"meta": {}` in every response | Include in webhook success response |
| Error message leak | Return generic messages, log details server-side |
| Service raises HTTPException | Follow same pattern (architectural debt acknowledged) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.1]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns — Webhook & Background Tasks]
- [Source: _bmad-output/planning-artifacts/architecture.md#Non-Functional Requirements — PCI DSS, Payment uptime > 99.5%]
- [Source: _bmad-output/implementation-artifacts/3-3-checkout-information-payment-gateway.md#Dev Notes, Code Review Fixes]
- [Source: _bmad-output/project-context.md#Coding Rules, Security & Authentication]

## Change Log

- 2026-03-13: Story 4.1 implemented — webhook payment processing with VNPay/Momo support, idempotency, signature verification, order status transitions, confirmation page polling from backend
- 2026-03-13: Code Review (AI) — Changes Requested: 9 action items (3 High, 4 Med, 2 Low). Key findings: idempotency race condition, email never sends (missing customer_email field), order items not loaded for email template
- 2026-03-13: Addressed all 9 code review findings (3 High, 4 Med, 2 Low). H1: IntegrityError race condition handled. H2: Email uses customer_id→UserDB lookup. H3: selectinload(items) added. M1: Amount mismatch logging. M2: Dead schemas removed. M3: HTTPException for unsupported provider. M4: Polling timeout UI. L1: Unused prop removed. L2: TODO comment added.

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Backend tests: 19 passed (13 service + 6 API)
- Frontend tests: 21 passed (14 OrderConfirmation + 7 OrderConfirmationClient)
- Full regression: Backend 540/542 pass (2 pre-existing failures in test_sanity_check_api.py), Frontend 616/616 pass
- Post-review-fix: Backend 22 passed (16 service + 6 API), Frontend 22 passed (13 OrderConfirmation + 9 OrderConfirmationClient)
- Post-review regression: Backend 530 pass (1 pre-existing failure in test_sanity_check_api.py), Frontend 617/617 pass

### Completion Notes List

- Task 1: Created `013_create_payment_transactions.sql` migration with payment_transactions table and payment_status column on orders
- Task 2: Added PaymentStatus enum, VNPayWebhook, MomoWebhook, WebhookPayload, PaymentTransactionResponse schemas to order.py; added payment_status to OrderResponse
- Task 3: Added PaymentTransactionDB to db_models.py with UniqueConstraint; added payment_status field and payment_transactions relationship to OrderDB
- Task 4: Created payment_service.py with verify_webhook_signature (HMAC-SHA256), process_webhook (full flow), VNPay/Momo parsers, idempotency check, FOR UPDATE lock, non-blocking email trigger
- Task 5: Created payments.py router with POST /api/v1/payments/webhook/{provider}; registered in main.py
- Task 6: Added VNPAY_WEBHOOK_SECRET, MOMO_WEBHOOK_SECRET, PAYMENT_PROVIDERS to config.py
- Task 7: Updated OrderConfirmationClient to fetch real payment_status from backend (never trusts query params per AC#8); added polling for pending payments with 3s interval, max 10 attempts
- Task 8: Added send_order_confirmation_email and _create_order_confirmation_email_html to email_service.py with Heritage branding
- Task 9: Created test_payment_service.py (13 tests), test_payment_api.py (6 tests), OrderConfirmationClient.test.tsx (7 tests); updated OrderConfirmation.test.tsx mock to include payment_status
- ✅ Resolved review finding [High]: H1 — Added try/except IntegrityError around db.commit() with rollback, returns "Already processed"
- ✅ Resolved review finding [High]: H2 — Email now receives customer_email from UserDB lookup via customer_id; removed broken getattr approach
- ✅ Resolved review finding [High]: H3 — Added selectinload(OrderDB.items) to order query to prevent DetachedInstanceError
- ✅ Resolved review finding [Med]: M1 — Added amount mismatch check with ERROR log before order status update
- ✅ Resolved review finding [Med]: M2 — Removed unused WebhookPayload, VNPayWebhook, MomoWebhook schemas from order.py
- ✅ Resolved review finding [Med]: M3 — Changed unsupported provider response from 200+error body to proper HTTPException(400); also changed invalid JSON response to HTTPException(400)
- ✅ Resolved review finding [Med]: M4 — Added pollingTimedOut state and explicit timeout UI with "Thanh Toán Chưa Xác Nhận" message
- ✅ Resolved review finding [Low]: L1 — Removed unused paymentStatus prop from OrderConfirmationClientProps and page.tsx
- ✅ Resolved review finding [Low]: L2 — Added TODO comment documenting VNPay production uses SHA256 of sorted query params

### File List

- backend/migrations/013_create_payment_transactions.sql (new)
- backend/src/models/order.py (modified — removed dead webhook schemas M2)
- backend/src/models/db_models.py (modified)
- backend/src/core/config.py (modified)
- backend/src/services/payment_service.py (new — H1 IntegrityError, H2 email lookup, H3 selectinload, M1 amount check, L2 TODO)
- backend/src/services/order_service.py (modified)
- backend/src/services/email_service.py (modified — H2 customer_email param)
- backend/src/api/v1/payments.py (new — M3 HTTPException for unsupported provider)
- backend/src/main.py (modified)
- backend/tests/test_payment_service.py (new — added 3 new tests: IntegrityError, amount mismatch, guest order)
- backend/tests/test_payment_api.py (new — updated unsupported provider test for 400 status)
- frontend/src/types/order.ts (modified)
- frontend/src/app/(customer)/checkout/confirmation/page.tsx (modified — L1 removed paymentStatus)
- frontend/src/components/client/checkout/OrderConfirmationClient.tsx (modified — M4 timeout UI, L1 removed prop)
- frontend/src/__tests__/OrderConfirmationClient.test.tsx (new — added timeout test, updated prop test)
- frontend/src/__tests__/OrderConfirmation.test.tsx (modified)
