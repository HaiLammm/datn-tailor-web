---
title: 'Voucher Apply & Discount Preview for Customers'
slug: 'voucher-apply-discount-preview'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16 (App Router)', 'FastAPI', 'PostgreSQL 17', 'SQLAlchemy async', 'Zustand', 'TanStack Query', 'Zod', 'Pydantic v2', 'Tailwind CSS']
files_to_modify: ['backend/migrations/023_add_voucher_discount_to_orders.sql', 'backend/src/models/db_models.py', 'backend/src/models/order.py', 'backend/src/models/voucher.py', 'backend/src/services/voucher_service.py', 'backend/src/services/order_service.py', 'backend/src/api/v1/orders.py', 'backend/src/api/v1/customer_profile.py', 'backend/tests/test_voucher_checkout.py', 'frontend/src/types/order.ts', 'frontend/src/types/voucher.ts', 'frontend/src/store/cartStore.ts', 'frontend/src/app/actions/order-actions.ts', 'frontend/src/app/actions/voucher-actions.ts', 'frontend/src/components/client/checkout/VoucherSelector.tsx', 'frontend/src/components/client/checkout/OrderSummary.tsx', 'frontend/src/components/client/checkout/CheckoutClient.tsx', 'frontend/src/components/client/checkout/ShippingFormClient.tsx', 'frontend/src/components/client/checkout/OrderConfirmation.tsx', 'frontend/src/components/client/showroom/GarmentCard.tsx', 'frontend/src/components/client/showroom/ShowroomContent.tsx', 'frontend/src/app/(customer)/showroom/page.tsx']
code_patterns: ['Service layer pattern (business logic in services/, not route handlers)', 'Async SQLAlchemy with async_session', 'Tenant isolation via tenant_id on every query', 'Authoritative Server Pattern (backend SSOT for prices)', 'Server Actions proxy pattern (no direct browser-to-backend)', 'Zustand persist to localStorage', 'TanStack Query for server state', 'Zod client validation + Pydantic backend validation', 'Response format: {data, meta} for lists, {data} for single']
test_patterns: ['Backend: pytest async tests in backend/tests/', 'Test file: backend/tests/test_voucher_checkout.py', 'Existing voucher tests: backend/tests/test_voucher_crud_api.py (23 tests)', 'Pattern: conftest.py fixtures for db session, test users, test tenants']
---

# Tech-Spec: Voucher Apply & Discount Preview for Customers

**Created:** 2026-03-25

## Overview

### Problem Statement

Customers who have been assigned vouchers (via UserVoucherDB) have no way to apply them during checkout, and cannot preview discounted prices when browsing products in the showroom.

### Solution

- **Backend:** API to validate & apply vouchers to orders, calculate discount amounts (SSOT), refund vouchers when orders are cancelled.
- **Frontend Showroom:** Auto-display discounted prices on GarmentCard for logged-in customers by selecting the best assigned vouchers per type (e.g., best percent + best fixed).
- **Frontend Checkout:** UI to select/apply multiple vouchers (different types), display discount breakdown, update total.

### Scope

**In Scope:**
- Backend API: validate voucher eligibility, apply voucher(s) to order, calculate discount (SSOT), refund voucher(s) on order cancellation
- Showroom: display discounted price on GarmentCard for authenticated customers (auto-select best vouchers per type — e.g., best percent + best fixed — from assigned vouchers)
- Checkout: UI to select voucher(s), display discount breakdown per voucher, update final total
- Allow applying multiple vouchers of different types per order (e.g., 1 percent + 1 fixed)
- Mark voucher(s) as `is_used` on order submission, restore on order cancellation
- Authenticated customers only (assigned via UserVoucherDB), no guest checkout voucher support

**Out of Scope:**
- Guest checkout voucher application
- Owner assigning vouchers to customers (already exists separately)
- Voucher auto-apply at checkout (customer must actively select)
- Payment integration changes

## Context for Development

### Codebase Patterns

**Backend:**
- Service layer pattern: all business logic in `backend/src/services/`, NOT in route handlers
- Async SQLAlchemy: `async_session` from `backend/src/db.py`, queries use `await session.execute(select(...))`
- Tenant isolation: every query MUST filter by `tenant_id` from JWT
- Auth dependency: `get_current_user` for customer endpoints, `get_current_owner` for owner endpoints
- Response format: `{"data": {...}}` for single, `{"data": [...], "meta": {"total", "page", "page_size"}}` for lists
- Decimal handling: PostgreSQL Numeric → Pydantic `Decimal` → serialized as strings in JSON
- Error codes: 400 (validation), 404 (not found), 409 (duplicate), 403 (wrong tenant)
- Import pattern: `from fastapi import HTTPException`, `from sqlalchemy import select, func`, `from decimal import Decimal`

**Frontend:**
- Server Actions proxy to backend via `fetchWithAuth()` from `frontend/src/lib/api.ts`
- Zustand store with `devtools` + `persist` middleware, persisted to localStorage
- TanStack Query for server data fetching
- Tailwind CSS styling: cream bg `bg-[#F9F7F2]`, gold accents `#D4AF37`, serif font `Cormorant Garamond`
- Currency format: `toLocaleString('vi-VN')` for VND
- Server Action auth: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }`

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/src/models/db_models.py:262-305` | OrderDB model — needs discount fields added |
| `backend/src/models/db_models.py:567-607` | VoucherDB model — existing, no changes needed |
| `backend/src/models/db_models.py:609-642` | UserVoucherDB model — has `is_used`, `used_at`, `used_in_order_id` (nullable, no FK yet) |
| `backend/src/models/order.py` | Order Pydantic schemas — needs voucher fields in OrderCreate/OrderResponse |
| `backend/src/models/voucher.py` | Voucher Pydantic schemas — needs discount calculation schemas |
| `backend/src/services/order_service.py` | Order creation (lines 136-208) + status transitions (lines 344-654) |
| `backend/src/services/voucher_service.py` | Voucher CRUD (345 lines) — needs checkout validation + discount functions |
| `backend/src/api/v1/orders.py` | Order endpoints (210 lines) — create_order at lines 65-82 |
| `backend/src/api/v1/customer_profile.py:567-626` | `GET /customers/me/vouchers` — existing customer voucher listing |
| `backend/migrations/` | 22 existing migrations — next is 023 |
| `frontend/src/components/client/checkout/CheckoutClient.tsx` | Checkout step 1 — cart review + OrderSummary |
| `frontend/src/components/client/checkout/OrderSummary.tsx` | Order summary sidebar — props: itemCount, subtotal, hasUnavailableItems, isVerifying |
| `frontend/src/components/client/checkout/ShippingFormClient.tsx` | Checkout step 2 — form + payment + calls `createOrder()` action |
| `frontend/src/components/client/checkout/OrderConfirmation.tsx` | Checkout step 3 — shows order.total_amount |
| `frontend/src/components/client/showroom/GarmentCard.tsx` | Product card — shows rental_price, sale_price |
| `frontend/src/components/client/showroom/ShowroomContent.tsx` | Showroom wrapper — passes garment data to GarmentGrid |
| `frontend/src/components/client/profile/VoucherList.tsx` | Reference: voucher card UI pattern (accent bar, status badge) |
| `frontend/src/store/cartStore.ts` | Zustand cart — items[], addItem, removeItem, clearCart, cartTotal() |
| `frontend/src/types/order.ts` | CreateOrderInput, OrderResponse — no voucher fields yet |
| `frontend/src/types/voucher.ts` | VoucherItem (customer), VouchersData, OwnerVoucher |
| `frontend/src/app/actions/order-actions.ts` | `createOrder(orderData: CreateOrderInput)` server action |
| `frontend/src/app/actions/profile-actions.ts` | `getMyVouchers()` server action — reusable |

### Technical Decisions

- Authenticated customers only — voucher features require login + UserVoucherDB assignment
- Multiple vouchers per order allowed, but only one per type (1 percent max + 1 fixed max)
- Discount calculation is backend SSOT — frontend displays preview but backend validates and calculates final amounts
- Voucher refund on order cancellation — `is_used` reset, `used_count` decremented
- Order model: add `discount_amount` and `subtotal_amount` to OrderDB; `total_amount` remains as final post-discount total
- `applied_voucher_ids` stored as JSONB array in OrderDB for audit trail
- Showroom discount preview: frontend calculates from customer's voucher list (no new API), backend remains SSOT at checkout
- Multiple voucher application order: percent voucher first (on subtotal), then fixed voucher on remaining
- New migration 023 for OrderDB discount columns + FK constraint on user_vouchers.used_in_order_id

### Existing Checkout Flow (3 Steps)

```
Step 1: /checkout → CheckoutClient → verify cart → OrderSummary → "Tiếp Tục Thanh Toán"
Step 2: /checkout/shipping → ShippingFormClient → form + payment → createOrder() → redirect
Step 3: /checkout/confirmation → OrderConfirmationClient → fetch order → OrderConfirmation display
```

Voucher selection happens at **Step 1** (select/preview in OrderSummary) and persists in **Zustand cartStore** through **Step 2** (included in createOrder submission).

## Implementation Plan

### Tasks

#### Task 1: Database Migration — Add discount columns to orders + FK constraint
- File: `backend/migrations/023_add_voucher_discount_to_orders.sql`
- Action: Create new migration with:
  ```sql
  -- Add discount tracking to orders
  ALTER TABLE orders ADD COLUMN subtotal_amount NUMERIC(12,2);
  ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(12,2) DEFAULT 0;
  ALTER TABLE orders ADD COLUMN applied_voucher_ids JSONB DEFAULT '[]'::jsonb;

  -- Backfill: existing orders have subtotal = total (no discount)
  UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount IS NULL;

  -- Make subtotal NOT NULL after backfill
  ALTER TABLE orders ALTER COLUMN subtotal_amount SET NOT NULL;

  -- Add FK constraint to user_vouchers.used_in_order_id
  ALTER TABLE user_vouchers ADD CONSTRAINT fk_user_vouchers_order_id
    FOREIGN KEY (used_in_order_id) REFERENCES orders(id) ON DELETE SET NULL;

  -- Index for querying orders by voucher
  CREATE INDEX idx_orders_applied_voucher_ids ON orders USING gin(applied_voucher_ids);
  ```
- Notes: Next migration number is 023. Backfill ensures existing orders are consistent.

#### Task 2: Update OrderDB ORM model
- File: `backend/src/models/db_models.py`
- Action: Add three new columns to OrderDB class (around line 290, before `created_at`):
  ```python
  subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
  discount_amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0"))
  applied_voucher_ids: Mapped[list] = mapped_column(JSON, default=list)
  ```
- Notes: Import `JSON` from sqlalchemy if not already imported. `total_amount` remains as final post-discount total.

#### Task 3: Update Order Pydantic schemas
- File: `backend/src/models/order.py`
- Action:
  1. Add to `OrderCreate`:
     ```python
     voucher_codes: list[str] = []  # Optional list of voucher codes to apply
     ```
  2. Add to `OrderResponse`:
     ```python
     subtotal_amount: Decimal
     discount_amount: Decimal
     applied_voucher_ids: list[str] = []  # list of voucher UUIDs
     ```
  3. Add to `OrderListItem`:
     ```python
     discount_amount: Decimal
     ```
- Notes: `total_amount` already exists and will now represent post-discount total.

#### Task 4: Add Voucher checkout schemas
- File: `backend/src/models/voucher.py`
- Action: Add new schemas:
  ```python
  class VoucherDiscountDetail(BaseModel):
      voucher_id: UUID
      code: str
      type: VoucherType
      value: Decimal
      discount_amount: Decimal  # actual discount calculated

  class DiscountPreviewRequest(BaseModel):
      voucher_codes: list[str]  # 1-2 codes, different types
      order_subtotal: Decimal

  class DiscountPreviewResponse(BaseModel):
      vouchers: list[VoucherDiscountDetail]
      total_discount: Decimal
      final_total: Decimal
  ```
- Notes: DiscountPreviewRequest used by the preview endpoint. VoucherDiscountDetail used in both preview and order response.

#### Task 5: Add voucher checkout service functions
- File: `backend/src/services/voucher_service.py`
- Action: Add 5 new functions at end of file:
  1. `async def validate_voucher_for_checkout(db: AsyncSession, tenant_id: UUID, user_id: UUID, voucher_code: str, order_subtotal: Decimal) -> tuple[VoucherDB, UserVoucherDB]`:
     - Query VoucherDB by code + tenant_id, join UserVoucherDB by user_id
     - Validate: exists, is_active=True, expiry_date >= today, UserVoucherDB.is_used=False
     - Validate: order_subtotal >= voucher.min_order_value
     - Return (voucher, user_voucher) tuple or raise HTTPException with specific error messages
  2. `def calculate_single_discount(voucher: VoucherDB, amount: Decimal) -> Decimal`:
     - If type="percent": discount = amount * (value / 100), cap at max_discount_value if set
     - If type="fixed": discount = min(value, amount) — cannot exceed order amount
     - Return discount rounded to 2 decimal places
  3. `async def validate_and_calculate_multi_discount(db: AsyncSession, tenant_id: UUID, user_id: UUID, voucher_codes: list[str], order_subtotal: Decimal) -> tuple[list[tuple[VoucherDB, UserVoucherDB, Decimal]], Decimal]`:
     - Validate max 2 voucher codes, must be different types (raise 400 if same type)
     - Call validate_voucher_for_checkout for each code
     - Apply percent voucher first on subtotal, then fixed voucher on remaining
     - Return list of (voucher, user_voucher, discount_amount) tuples + total_discount
  4. `async def apply_vouchers_to_order(db: AsyncSession, voucher_data: list[tuple[VoucherDB, UserVoucherDB, Decimal]], order_id: UUID) -> None`:
     - For each (voucher, user_voucher, discount): set user_voucher.is_used=True, used_at=now(), used_in_order_id=order_id
     - Increment voucher.used_count += 1 for each
     - `await db.flush()` (commit handled by caller)
  5. `async def refund_vouchers_for_order(db: AsyncSession, order_id: UUID) -> None`:
     - Query UserVoucherDB where used_in_order_id=order_id AND is_used=True
     - For each: set is_used=False, used_at=None, used_in_order_id=None
     - Load related VoucherDB and decrement used_count -= 1
     - `await db.flush()`
- Notes: All functions follow existing async pattern. Tenant isolation maintained. Decimal used throughout for precision.

#### Task 6: Add discount preview API endpoint
- File: `backend/src/api/v1/customer_profile.py`
- Action: Add new endpoint after the existing voucher listing endpoint (~line 626):
  ```python
  @router.post("/me/vouchers/preview-discount")
  async def preview_voucher_discount(
      request: DiscountPreviewRequest,
      current_user = Depends(get_current_user),
      tenant_id: UUID = Depends(get_tenant_id),
      db: AsyncSession = Depends(get_db)
  ):
  ```
  - Calls `validate_and_calculate_multi_discount(db, tenant_id, current_user.id, request.voucher_codes, request.order_subtotal)`
  - Returns `DiscountPreviewResponse` with voucher details, total discount, final total
- Notes: This endpoint allows frontend to get backend-validated discount calculation before order submission. Follows existing auth pattern in customer_profile.py.

#### Task 7: Modify order creation to support vouchers
- File: `backend/src/services/order_service.py`
- Action: Modify `create_order()` function (lines 136-208):
  1. After `_validate_and_price_items()` calculates `total_amount` (the subtotal):
     ```python
     subtotal = total_amount  # rename for clarity
     discount_amount = Decimal("0")
     applied_voucher_ids = []
     voucher_apply_data = []

     if order_data.voucher_codes and customer_id:
         voucher_apply_data, discount_amount = await validate_and_calculate_multi_discount(
             db, tenant_id, customer_id, order_data.voucher_codes, subtotal
         )
         applied_voucher_ids = [str(v[0].id) for v in voucher_apply_data]

     final_total = subtotal - discount_amount
     ```
  2. When creating OrderDB instance, set:
     ```python
     subtotal_amount=subtotal,
     discount_amount=discount_amount,
     total_amount=final_total,
     applied_voucher_ids=applied_voucher_ids,
     ```
  3. After `db.flush()` for the order, call:
     ```python
     if voucher_apply_data:
         await apply_vouchers_to_order(db, voucher_apply_data, order.id)
     ```
  4. Add imports: `from backend.src.services.voucher_service import validate_and_calculate_multi_discount, apply_vouchers_to_order`
- Notes: Guest checkout (customer_id=None) skips voucher logic entirely. Voucher codes are optional.

#### Task 8: Modify order cancellation to refund vouchers
- File: `backend/src/services/order_service.py`
- Action: In `update_order_status()`, inside the cancellation block (around line 525-536 where status transitions to "cancelled"):
  ```python
  if new_status == "cancelled" and order.applied_voucher_ids:
      await refund_vouchers_for_order(db, order.id)
  ```
  - Add import: `from backend.src.services.voucher_service import refund_vouchers_for_order`
- Notes: Only triggers if order had vouchers applied. Refund resets is_used, clears used_in_order_id, decrements used_count.

#### Task 9: Update OrderResponse mapping in order_service.py
- File: `backend/src/services/order_service.py`
- Action: Find where OrderResponse is constructed from OrderDB (in `create_order`, `get_order`, `list_orders`, etc.) and ensure new fields are mapped:
  ```python
  subtotal_amount=order.subtotal_amount,
  discount_amount=order.discount_amount,
  applied_voucher_ids=[str(v) for v in (order.applied_voucher_ids or [])],
  ```
- Notes: Check all places where OrderResponse/OrderListItem is built. `subtotal_amount` may need `Decimal(str(...))` conversion.

#### Task 10: Frontend — Update TypeScript types
- File: `frontend/src/types/order.ts`
- Action:
  1. Add to `CreateOrderInput`:
     ```typescript
     voucher_codes?: string[];  // list of voucher codes to apply
     ```
  2. Add to `OrderResponse`:
     ```typescript
     subtotal_amount: number;
     discount_amount: number;
     applied_voucher_ids: string[];
     ```
  3. Add to `OrderListItem` (if exists):
     ```typescript
     discount_amount: number;
     ```
- File: `frontend/src/types/voucher.ts`
- Action: Add new types:
  ```typescript
  export interface DiscountPreviewRequest {
    voucher_codes: string[];
    order_subtotal: number;
  }

  export interface VoucherDiscountDetail {
    voucher_id: string;
    code: string;
    type: VoucherType;
    value: string;
    discount_amount: string;
  }

  export interface DiscountPreviewResponse {
    vouchers: VoucherDiscountDetail[];
    total_discount: string;
    final_total: string;
  }

  export interface AppliedVoucher {
    id: string;          // user_vouchers.id
    voucher_id: string;  // vouchers.id
    code: string;
    type: VoucherType;
    value: number;
    discount_amount: number;  // calculated discount
  }
  ```

#### Task 11: Frontend — Add voucher server actions
- File: `frontend/src/app/actions/voucher-actions.ts`
- Action: Add new server action (append to existing file which has owner CRUD actions):
  ```typescript
  export async function previewVoucherDiscount(
    voucherCodes: string[],
    orderSubtotal: number
  ): Promise<{ success: boolean; data?: DiscountPreviewResponse; error?: string }>
  ```
  - POST to `/api/v1/customers/me/vouchers/preview-discount`
  - Requires auth (uses `fetchWithAuth`)
  - Returns discount preview from backend
- Notes: Reuse existing `getMyVouchers()` from profile-actions.ts for fetching voucher list.

#### Task 12: Frontend — Update cartStore with voucher state
- File: `frontend/src/store/cartStore.ts`
- Action: Add voucher state and actions to the Zustand store:
  ```typescript
  // New state
  appliedVouchers: AppliedVoucher[];

  // New actions
  applyVoucher: (voucher: AppliedVoucher) => void;  // add to list, max 1 per type
  removeVoucher: (voucherId: string) => void;        // remove by voucher_id
  clearVouchers: () => void;                          // remove all
  totalDiscount: () => number;                        // sum of applied discounts
  finalTotal: () => number;                           // cartTotal() - totalDiscount()
  ```
  - `applyVoucher` must enforce: max 1 percent + 1 fixed. If same type exists, replace it.
  - `clearVouchers` called alongside `clearCart` on order completion.
  - Persist `appliedVouchers` to localStorage alongside `items`.
- Notes: Import `AppliedVoucher` from types/voucher.ts.

#### Task 13: Frontend — Create VoucherSelector component
- File: `frontend/src/components/client/checkout/VoucherSelector.tsx` (NEW)
- Action: Create client component for selecting vouchers at checkout:
  - Props: `subtotal: number; onVouchersChange: (vouchers: AppliedVoucher[]) => void`
  - Fetch customer's vouchers via `getMyVouchers()` on mount
  - Filter to show only `status === 'active'` vouchers that meet `min_order_value <= subtotal`
  - Display each eligible voucher as a selectable card (inspired by VoucherList.tsx pattern):
    - Accent bar (indigo for percent, emerald for fixed)
    - Discount display: "Giảm X%" or "Giảm X₫"
    - Code in monospace
    - Min order requirement
    - Expiry date
    - Select/deselect toggle button
  - When voucher selected: call `previewVoucherDiscount()` to get backend-validated discount
  - Enforce max 1 per type: if selecting same type, replace previous
  - Show applied discount amount per voucher
  - If not authenticated: show login prompt instead of voucher list
  - Loading skeleton while fetching vouchers
  - Empty state: "Bạn chưa có voucher nào" with link to voucher page
- Notes: Use Tailwind consistent with project styling. Vietnamese labels.

#### Task 14: Frontend — Update OrderSummary with voucher display
- File: `frontend/src/components/client/checkout/OrderSummary.tsx`
- Action: Extend component to show vouchers and discount:
  1. Add new props:
     ```typescript
     appliedVouchers?: AppliedVoucher[];
     totalDiscount?: number;
     onOpenVoucherSelector?: () => void;
     isAuthenticated?: boolean;
     ```
  2. Add voucher section between "Tạm tính" and divider:
     - Button "Chọn Voucher" (or "Thêm Voucher") if authenticated and no vouchers applied
     - List of applied vouchers with code + discount amount + remove button
     - Each voucher: `-{discount_amount}₫` in green
  3. Update total calculation:
     ```
     Tạm tính: {formatPrice(subtotal)}
     [Voucher section with applied discounts]
     ---
     Tổng cộng: {formatPrice(subtotal - totalDiscount)}
     ```
  4. If totalDiscount > 0, show original subtotal with strikethrough and new total highlighted
- Notes: Keep backward compatible — if no voucher props passed, render as before (guest checkout).

#### Task 15: Frontend — Update CheckoutClient to integrate vouchers
- File: `frontend/src/components/client/checkout/CheckoutClient.tsx`
- Action:
  1. Import `useCartStore` voucher actions/state
  2. Add state for voucher selector modal open/close
  3. Check auth status (use `useSession` from auth)
  4. Pass voucher props to `OrderSummary`:
     ```typescript
     appliedVouchers={appliedVouchers}
     totalDiscount={totalDiscount()}
     onOpenVoucherSelector={() => setShowVoucherSelector(true)}
     isAuthenticated={!!session?.user}
     ```
  5. Render `VoucherSelector` modal/panel when open
  6. When vouchers change: update cartStore via `applyVoucher` / `removeVoucher`
- Notes: VoucherSelector can be a slide-in panel or modal. Use existing dialog patterns.

#### Task 16: Frontend — Update ShippingFormClient to pass vouchers on submit
- File: `frontend/src/components/client/checkout/ShippingFormClient.tsx`
- Action:
  1. Read `appliedVouchers` from cartStore
  2. Include voucher codes in createOrder call:
     ```typescript
     const result = await createOrder({
       ...orderData,
       voucher_codes: appliedVouchers.map(v => v.code),
     });
     ```
  3. Display applied vouchers + discount in the order summary sidebar (same as CheckoutClient)
  4. On successful order: `clearVouchers()` alongside `clearCart()`
- Notes: ShippingFormClient also renders an OrderSummary — ensure voucher info shown here too.

#### Task 17: Frontend — Update order-actions.ts to send voucher codes
- File: `frontend/src/app/actions/order-actions.ts`
- Action: Modify `createOrder()` to include `voucher_codes` in the POST body:
  ```typescript
  const body = {
    ...orderData,
    voucher_codes: orderData.voucher_codes || [],
  };
  ```
- Notes: Backward compatible — if no voucher_codes, sends empty array.

#### Task 18: Frontend — Update OrderConfirmation to show discount
- File: `frontend/src/components/client/checkout/OrderConfirmation.tsx`
- Action: Update the order details display to show discount:
  ```
  Items list...
  ---
  Tạm tính: {formatPrice(order.subtotal_amount)}
  Giảm giá voucher: -{formatPrice(order.discount_amount)}  (only if > 0)
  ---
  Tổng cộng: {formatPrice(order.total_amount)}
  ```
- Notes: `order.total_amount` from backend is already post-discount. Only show discount line if `discount_amount > 0`.

#### Task 19: Frontend — Showroom discount preview on GarmentCard
- File: `frontend/src/components/client/showroom/ShowroomContent.tsx`
- Action:
  1. Check if user is authenticated (use session from server component or pass as prop)
  2. If authenticated: fetch vouchers via `getMyVouchers()` at showroom page level
  3. Calculate best discount per type from active vouchers (client-side):
     - Best percent: highest effective discount for a given price
     - Best fixed: highest value
  4. Pass `bestVouchers` data to GarmentGrid → GarmentCard as prop
- File: `frontend/src/app/(customer)/showroom/page.tsx`
- Action: Fetch vouchers in server component if authenticated, pass to ShowroomContent as prop
- Notes: Voucher fetch is at page level to avoid N+1 per card. Calculate discount per garment in GarmentCard.

#### Task 20: Frontend — GarmentCard discounted price display
- File: `frontend/src/components/client/showroom/GarmentCard.tsx`
- Action:
  1. Add optional prop: `bestVouchers?: { percent?: VoucherItem; fixed?: VoucherItem }`
  2. If bestVouchers provided, calculate discount preview for this garment:
     - For sale_price (buy): apply percent first, then fixed
     - For rental_price (rent/day): apply percent first, then fixed
  3. Display discounted price alongside original:
     ```
     Original: strikethrough, smaller, gray
     Discounted: bold, larger, red/accent color
     Savings badge: "Tiết kiệm X₫" in green
     ```
  4. If no vouchers or garment price below min_order_value: show normal price only
- Notes: This is a preview only — actual discount is calculated by backend at checkout. Label clearly as "Giá ước tính với voucher" to avoid confusion.

#### Task 21: Backend Tests — Voucher checkout integration
- File: `backend/tests/test_voucher_checkout.py` (NEW)
- Action: Create comprehensive test file covering:
  1. `test_validate_voucher_for_checkout_success` — valid voucher, assigned, active, not expired, min_order met
  2. `test_validate_voucher_not_assigned` — voucher exists but not assigned to user → 400
  3. `test_validate_voucher_already_used` — is_used=True → 400
  4. `test_validate_voucher_expired` — expiry_date in past → 400
  5. `test_validate_voucher_inactive` — is_active=False → 400
  6. `test_validate_voucher_min_order_not_met` — order_subtotal < min_order_value → 400
  7. `test_calculate_discount_percent` — 20% of 500000 = 100000
  8. `test_calculate_discount_percent_with_cap` — 50% of 1000000 capped at max_discount_value
  9. `test_calculate_discount_fixed` — fixed 50000 on 200000 order = 50000
  10. `test_calculate_discount_fixed_exceeds_order` — fixed 100000 on 50000 order = 50000 (capped)
  11. `test_multi_voucher_different_types` — 1 percent + 1 fixed applied correctly
  12. `test_multi_voucher_same_type_rejected` — 2 percent vouchers → 400
  13. `test_create_order_with_voucher` — order created with discount applied, voucher marked used
  14. `test_create_order_guest_ignores_vouchers` — guest checkout skips voucher logic
  15. `test_cancel_order_refunds_voucher` — cancelled order resets is_used, decrements used_count
  16. `test_preview_discount_endpoint` — POST /me/vouchers/preview-discount returns correct calculation
  17. `test_preview_discount_unauthenticated` — 401 if not logged in
- Notes: Follow existing test patterns from test_voucher_crud_api.py. Use conftest fixtures.

### Acceptance Criteria

- [ ] AC 1: Given an authenticated customer with assigned active vouchers, when they visit `/checkout`, then they see a "Chọn Voucher" button in the OrderSummary section.
- [ ] AC 2: Given an authenticated customer clicks "Chọn Voucher", when the voucher selector opens, then only active, non-expired vouchers with min_order_value <= cart subtotal are shown.
- [ ] AC 3: Given a customer selects a percent voucher (e.g., 20%, max 100k₫), when applied to a 500k₫ cart, then discount shows as 100k₫ and total shows 400k₫.
- [ ] AC 4: Given a customer selects a fixed voucher (e.g., 50k₫), when applied to a 300k₫ cart, then discount shows as 50k₫ and total shows 250k₫.
- [ ] AC 5: Given a customer selects 1 percent + 1 fixed voucher, when both applied, then percent is calculated first on subtotal, then fixed on remaining amount. Total discount is sum of both.
- [ ] AC 6: Given a customer tries to apply 2 vouchers of the same type, when they select the second, then the first is replaced (max 1 per type).
- [ ] AC 7: Given a customer with selected vouchers proceeds to `/checkout/shipping` and submits the order, when createOrder is called, then backend validates vouchers, calculates discount (SSOT), and creates order with correct subtotal_amount, discount_amount, and total_amount.
- [ ] AC 8: Given an order is created with applied vouchers, when checking UserVoucherDB, then is_used=True, used_at is set, used_in_order_id=order.id, and VoucherDB.used_count is incremented.
- [ ] AC 9: Given an order with applied vouchers is cancelled, when status transitions to "cancelled", then vouchers are refunded: is_used=False, used_at=None, used_in_order_id=None, used_count decremented.
- [ ] AC 10: Given a guest user (not authenticated) at checkout, when viewing OrderSummary, then no voucher selection UI is shown and order creation works without voucher logic.
- [ ] AC 11: Given an authenticated customer browsing `/showroom`, when they have active assigned vouchers, then GarmentCards show discounted prices (auto-calculated from best vouchers per type) with original price crossed out.
- [ ] AC 12: Given an unauthenticated user browsing `/showroom`, when viewing GarmentCards, then only regular prices are shown (no discount preview).
- [ ] AC 13: Given a voucher with min_order_value=200k₫, when a garment costs 150k₫, then no discount preview is shown on that GarmentCard.
- [ ] AC 14: Given the order confirmation page (`/checkout/confirmation`), when an order has discount_amount > 0, then the confirmation shows subtotal, discount line, and final total separately.
- [ ] AC 15: Given an expired or already-used voucher code is submitted with an order, when backend validates, then the order creation fails with a clear error message (400).

## Additional Context

### Dependencies

- Story 6.3 (Voucher Creator UI) — COMPLETED, provides Owner CRUD for vouchers
- Story 4.4g (Voucher Infrastructure) — COMPLETED, provides DB tables (vouchers, user_vouchers), ORM models, customer voucher listing API
- Existing checkout flow — 3-step process fully functional (cart review → shipping → confirmation)
- Existing `getMyVouchers()` server action — reusable for fetching customer's assigned vouchers
- Existing `VoucherList.tsx` — UI pattern reference for voucher card styling
- No new external libraries required

### Testing Strategy

**Backend Unit Tests** (`backend/tests/test_voucher_checkout.py`):
- 17 test cases covering: validation (6), calculation (4), multi-voucher (2), order integration (3), API endpoint (2)
- Use existing conftest fixtures for db session, test users, test tenants, test garments
- Create test vouchers and user_voucher assignments in each test setup
- All tests async following existing pattern

**Manual Testing Checklist:**
- [ ] Login as customer with assigned vouchers → checkout → select voucher → verify discount display
- [ ] Apply 1 percent + 1 fixed voucher → verify calculation order and total
- [ ] Try applying 2 same-type vouchers → verify replacement behavior
- [ ] Submit order with vouchers → verify order in DB has correct discount fields
- [ ] Cancel order with vouchers → verify vouchers refunded (check user_vouchers table)
- [ ] Guest checkout → verify no voucher UI and order works normally
- [ ] Showroom as authenticated user → verify discount preview on GarmentCards
- [ ] Showroom as guest → verify no discount preview
- [ ] Voucher with min_order_value higher than cart total → verify not selectable

### Notes

**High-Risk Items:**
- Race condition: two concurrent orders using same voucher — mitigate with `SELECT ... FOR UPDATE` on UserVoucherDB during validation
- Decimal precision: all discount calculations must use Python `Decimal`, never float, to avoid rounding errors in financial calculations
- Showroom preview vs checkout actual: label showroom prices clearly as "Giá ước tính" since actual discount depends on full cart total, not individual item price

**Known Limitations:**
- Showroom preview calculates discount per-item, but actual voucher discount is per-order (based on cart subtotal). Individual item preview may differ from actual checkout discount.
- Voucher selection does not persist across browser sessions if user clears localStorage (Zustand persist limitation).
- No real-time voucher availability check — a voucher could become fully redeemed between selection and order submission. Backend validation at order creation handles this.

**Future Considerations (Out of Scope):**
- Voucher recommendation engine (suggest best voucher combination)
- Voucher stacking rules configuration (owner configurable)
- Partial voucher usage (use only part of a fixed voucher)
- Voucher usage analytics dashboard for owner
