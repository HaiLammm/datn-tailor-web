# Story 10.3: Checkout Phan loai Dich vu (Service-Type Checkout)

Status: review

## Story

As a Khach hang,
I want checkout flow phan biet ro rang theo loai dich vu toi chon (Mua / Thue / Dat may) voi form thanh toan phu hop,
So that toi chi dien thong tin can thiet va thanh toan dung so tien cho loai dich vu.

## Acceptance Criteria

1. **Service-Type Detection per Cart Item**
   - Given khach da them san pham vao gio hang va tien hanh checkout
   - When he thong xac dinh `service_type` cua tung item
   - Then moi item duoc phan loai chinh xac: `buy`, `rent`, hoac `bespoke`

2. **Buy (Mua san) — Full Payment Flow**
   - Given cart chua items voi `service_type=buy`
   - When khach tien hanh checkout
   - Then form thanh toan 100% gia tri (checkout hien tai — khong thay doi)
   - And Order duoc tao voi `status='pending'`, `service_type='buy'`
   - And `OrderPaymentDB` record duoc tao voi `payment_type='full'`, `amount=total_amount`

3. **Rent (Thue) — Deposit + Security Flow**
   - Given cart chua items voi `service_type=rent`
   - When khach tien hanh checkout
   - Then form bo sung: `pickup_date`, `return_date`, lua chon CCCD hoac tien coc the chan (`security_type`)
   - And thanh toan = deposit only (30% tong gia tri)
   - And Order duoc tao voi `status='pending'`, `service_type='rent'`, `deposit_amount`, `remaining_amount`
   - And `OrderPaymentDB` record duoc tao voi `payment_type='deposit'`

4. **Bespoke (Dat may) — Deposit + Measurement Badge**
   - Given cart chua items voi `service_type=bespoke` va `measurement_confirmed=true` (Story 10.2)
   - When khach tien hanh checkout
   - Then hien thi badge "So do da xac nhan" (measurement confirmation badge)
   - And thanh toan = deposit only (50% tong gia tri)
   - And Order duoc tao voi `status='pending'`, `service_type='bespoke'`, `deposit_amount`, `remaining_amount`
   - And `OrderPaymentDB` record duoc tao voi `payment_type='deposit'`

5. **Mixed Cart Handling**
   - Given cart chua items voi nhieu `service_type` khac nhau
   - When khach tien hanh checkout
   - Then he thong tach thanh cac orders rieng biet theo `service_type` (1 order per service_type)
   - And moi order ap dung logic thanh toan tuong ung

6. **Payment Transaction Records**
   - Given moi order duoc tao thanh cong
   - When order creation hoan tat
   - Then `OrderPaymentDB` record duoc tao trong `order_payments` table
   - And record chua: `payment_type`, `amount`, `method`, `status='pending'`
   - And `gateway_ref` duoc cap nhat khi payment gateway tra ve

7. **Form Validation per Service Type**
   - Given khach dang dien form checkout
   - When service_type la `rent`
   - Then `pickup_date` va `return_date` la required fields
   - And `security_type` (cccd | cash_deposit) la required
   - And `security_value` la required (CCCD number hoac cash amount)
   - When service_type la `bespoke`
   - Then `measurement_confirmed` phai la `true` (Story 10.2 gate check)

## Tasks / Subtasks

- [x] Task 1: Backend — Extend OrderCreate schema for service-type checkout (AC: #1, #3, #4, #7)
  - [x] 1.1 Add `service_type` field to `OrderItemCreate` (pattern: `^(buy|rent|bespoke)$`)
  - [x] 1.2 Create `RentalCheckoutFields` schema: `pickup_date`, `return_date`, `security_type`, `security_value`
  - [x] 1.3 Add optional `rental_fields: RentalCheckoutFields | None` to `OrderCreate`
  - [x] 1.4 Add optional `measurement_confirmed: bool = False` to `OrderCreate`
  - [x] 1.5 Validate: if any item is `bespoke`, `measurement_confirmed` must be `True`
  - [x] 1.6 Validate: if any item is `rent`, `rental_fields` must be provided
  - [x] 1.7 Update `OrderFilterParams.transaction_type` pattern to include `bespoke`

- [x] Task 2: Backend — Extend order creation logic with service-type awareness (AC: #2, #3, #4, #5, #6)
  - [x] 2.1 Modify `_validate_and_price_items()` to handle `bespoke` items (use `sale_price` as base, calculate deposit)
  - [x] 2.2 Modify `create_order()` to set `service_type` on OrderDB based on cart items
  - [x] 2.3 Implement deposit calculation: Rent = 30% of total, Bespoke = 50% of total
  - [x] 2.4 Set `deposit_amount` and `remaining_amount` on OrderDB for rent/bespoke
  - [x] 2.5 Set rental fields on OrderDB: `pickup_date`, `return_date`, `security_type`, `security_value`
  - [x] 2.6 Create `OrderPaymentDB` record on order creation (payment_type: full/deposit)
  - [x] 2.7 Handle mixed cart: if items have different service_types, determine order-level service_type by priority (bespoke > rent > buy) OR split into separate orders

- [x] Task 3: Backend — Update OrderResponse with service-type fields (AC: #2, #3, #4)
  - [x] 3.1 Add `security_type`, `security_value`, `pickup_date`, `return_date` to `OrderResponse`
  - [x] 3.2 Include `OrderPaymentRecord` list in order detail response
  - [x] 3.3 Ensure backward compatibility — existing `buy` orders unaffected

- [x] Task 4: Frontend — Extend CartTransactionType and CartItem types (AC: #1)
  - [x] 4.1 Update `CartTransactionType` to `"buy" | "rent" | "bespoke"`
  - [x] 4.2 Add `service_type` field to `CartItem` (same as `transaction_type` — explicit mapping)
  - [x] 4.3 Update `isDuplicate()` in cartStore to handle `bespoke` items

- [x] Task 5: Frontend — Service-type conditional checkout UI (AC: #2, #3, #4, #7)
  - [x] 5.1 Create `RentalCheckoutFields` component: pickup_date, return_date, security_type selector, security_value input
  - [x] 5.2 Create `BespokeCheckoutBadge` component: measurement confirmed badge with summary
  - [x] 5.3 Modify `ShippingFormClient` to render conditional fields based on cart service types
  - [x] 5.4 Add deposit amount display in `OrderSummary` for rent/bespoke (show deposit vs total)
  - [x] 5.5 Integrate MeasurementGate redirect: if bespoke items + `measurement_confirmed=false`, redirect to `/measurement-gate`

- [x] Task 6: Frontend — Update createOrder server action and types (AC: #2, #3, #4, #6)
  - [x] 6.1 Update `CreateOrderInput` type with service-type fields
  - [x] 6.2 Extend `createOrder()` action to pass rental_fields and measurement_confirmed
  - [x] 6.3 Update order confirmation page to show service-type specific information

- [x] Task 7: Tests (AC: all)
  - [x] 7.1 Backend: Test buy order creation (full payment, OrderPaymentDB record)
  - [x] 7.2 Backend: Test rent order creation (deposit, rental fields, security, OrderPaymentDB)
  - [x] 7.3 Backend: Test bespoke order creation (deposit, measurement_confirmed validation)
  - [x] 7.4 Backend: Test validation failures (rent without rental_fields, bespoke without measurement)
  - [x] 7.5 Backend: Test mixed cart handling
  - [x] 7.6 Backend: Test backward compatibility (existing buy flow unchanged)
  - [x] 7.7 Frontend: TypeScript compilation passes for all new/modified types

## Dev Notes

### Critical: Reuse Existing Infrastructure — DO NOT Reinvent

| Component | Location | Reuse Strategy |
|-----------|----------|----------------|
| `OrderDB` | `backend/src/models/db_models.py` | Already has `service_type`, `security_type`, `security_value`, `pickup_date`, `return_date`, `deposit_amount`, `remaining_amount` from Story 10.1 migration |
| `OrderPaymentDB` | `backend/src/models/db_models.py` | Already created in Story 10.1 — use for payment records |
| `ServiceType` enum | `backend/src/models/order.py:45-50` | Already defined: `buy`, `rent`, `bespoke` |
| `SecurityType` enum | `backend/src/models/order.py:53-57` | Already defined: `cccd`, `cash_deposit` |
| `PaymentStatus` enum | `backend/src/models/order.py:60-66` | Already defined: `pending`, `paid`, `failed`, `refunded` |
| `_validate_and_price_items()` | `backend/src/services/order_service.py:39-138` | Extend — do NOT rewrite; add bespoke pricing branch |
| `create_order()` | `backend/src/services/order_service.py:141-199+` | Extend — add service_type logic to existing flow |
| Cart store | `frontend/src/store/cartStore.ts` | Already has `measurement_confirmed`, `hasBespokeItems()` from Story 10.2 |
| MeasurementGate | `frontend/src/components/client/checkout/MeasurementGate.tsx` | Story 10.2 — reference only, integrate its state |
| Checkout 3-step | `frontend/src/app/(customer)/checkout/` | Extend existing pages — do NOT create new checkout route |

### Deposit Calculation Logic

```python
# In order_service.py — extend create_order()
DEPOSIT_RATE_RENT = Decimal("0.30")     # 30% deposit for rent
DEPOSIT_RATE_BESPOKE = Decimal("0.50")  # 50% deposit for bespoke

# For rent:
deposit_amount = final_total * DEPOSIT_RATE_RENT
remaining_amount = final_total - deposit_amount

# For bespoke:
deposit_amount = final_total * DEPOSIT_RATE_BESPOKE
remaining_amount = final_total - deposit_amount

# For buy: deposit_amount = None, remaining_amount = None (full payment)
```

### OrderPaymentDB Record Creation Pattern

```python
# After OrderDB created, create corresponding payment record
from src.models.db_models import OrderPaymentDB

payment_record = OrderPaymentDB(
    tenant_id=tenant_id,
    order_id=order.id,
    payment_type="full" if service_type == "buy" else "deposit",
    amount=deposit_amount if service_type != "buy" else final_total,
    method=order_data.payment_method.value,
    status="pending",
    gateway_ref=None,  # Updated by payment webhook later
)
db.add(payment_record)
```

### Bespoke Item Pricing

Bespoke items should use `sale_price` as the base price (same as buy). The pricing difference is only in payment split (deposit vs full), NOT in the item price itself. In `_validate_and_price_items()`:

```python
if item.transaction_type == "bespoke":
    if garment.sale_price is None:
        raise HTTPException(
            status_code=422,
            detail={"error": {"code": "ERR_ITEM_NOT_FOR_BESPOKE", "message": f"San pham khong ho tro dat may: {garment.name}"}}
        )
    unit_price = garment.sale_price
    item_total = unit_price
```

### Mixed Cart Strategy

**Recommended approach:** Determine order-level `service_type` by highest-complexity item:
- If any item is `bespoke` → order `service_type='bespoke'`
- Else if any item is `rent` → order `service_type='rent'`
- Else → `service_type='buy'`

This simplifies the first iteration. Splitting into separate orders is deferred to a future enhancement if needed.

**Why single-order approach:** The current order model has ONE `service_type` per order. Creating separate orders would require major UX changes (multiple confirmations, multiple payments). Keep it simple for MVP.

### OrderItemCreate Schema Extension

Current `OrderItemCreate.transaction_type` has pattern `^(buy|rent)$`. Change to:

```python
class OrderItemCreate(BaseModel):
    garment_id: UUID
    transaction_type: str = Field(..., pattern=r"^(buy|rent|bespoke)$")
    # ... rest unchanged
```

### OrderCreate Schema Extension

```python
class RentalCheckoutFields(BaseModel):
    """Rental-specific checkout fields (Story 10.3)."""
    pickup_date: date
    return_date: date
    security_type: SecurityType
    security_value: str = Field(..., min_length=1, max_length=50)

    @field_validator("return_date")
    @classmethod
    def return_after_pickup(cls, v: date, info) -> date:
        if "pickup_date" in info.data and v <= info.data["pickup_date"]:
            raise ValueError("Ngay tra phai sau ngay nhan")
        return v

class OrderCreate(BaseModel):
    # ... existing fields ...
    # New Story 10.3 fields:
    rental_fields: RentalCheckoutFields | None = None  # Required if any rent items
    measurement_confirmed: bool = False  # Required True if any bespoke items

    @model_validator(mode="after")
    def validate_service_type_requirements(self) -> "OrderCreate":
        has_rent = any(i.transaction_type == "rent" for i in self.items)
        has_bespoke = any(i.transaction_type == "bespoke" for i in self.items)
        if has_rent and self.rental_fields is None:
            raise ValueError("rental_fields bat buoc cho don thue")
        if has_bespoke and not self.measurement_confirmed:
            raise ValueError("Phai xac nhan so do truoc khi dat may")
        return self
```

### Frontend Type Extensions

**`cart.ts` — Extend `CartTransactionType`:**
```typescript
export type CartTransactionType = "buy" | "rent" | "bespoke";
```

This change removes the need for `as string` type assertions in `hasBespokeItems()` and `removeItem()` (clean up Story 10.2 workarounds).

**`order.ts` — Extend `CreateOrderInput`:**
```typescript
interface RentalCheckoutFields {
  pickup_date: string;    // ISO date "YYYY-MM-DD"
  return_date: string;
  security_type: "cccd" | "cash_deposit";
  security_value: string;
}

interface CreateOrderInput {
  // ... existing fields ...
  rental_fields?: RentalCheckoutFields;
  measurement_confirmed?: boolean;
}
```

### Frontend Checkout UI Changes

**Step 2 (ShippingFormClient) — Conditional rendering:**

```
IF cart has rent items:
  Show RentalCheckoutFields component:
    - DatePicker: pickup_date
    - DatePicker: return_date
    - Radio/Select: security_type (CCCD | Tien coc the chan)
    - Input: security_value (CCCD number or cash amount)

IF cart has bespoke items:
  Show BespokeCheckoutBadge component:
    - Green badge: "So do da xac nhan" with check icon
    - Last updated date from measurement gate
    - Link to re-verify: redirect to /measurement-gate

IF cart has bespoke items AND measurement_confirmed is false:
  Redirect to /measurement-gate (block checkout progression)
```

**OrderSummary — Deposit display:**
```
IF service_type is rent or bespoke:
  Show:
    Tong gia tri: {total_amount}
    Dat coc ({rate}%): {deposit_amount}    ← This is what you pay now
    Con lai: {remaining_amount}            ← Pay later when order is ready
ELSE:
  Show existing total display (unchanged)
```

### Status Transition Note

Story 10.3 creates orders with `status='pending'` for ALL service types. The `pending_measurement` status is NOT used here — Story 10.2's MeasurementGate ensures measurement is confirmed BEFORE reaching checkout. Status machine changes (Story 10.4 scope) are NOT part of this story.

### DO NOT Modify

- `_VALID_TRANSITIONS` dict in `order_service.py:393-401` (scope: Story 10.4)
- `update_order_status()` function (scope: Story 10.4)
- MeasurementGate component (Story 10.2 — read-only reference)
- Order Board UI (scope: Story 10.4)
- Payment webhook logic (scope: Story 10.6)
- No new DB migrations needed — Story 10.1 already added all columns

### Previous Story Intelligence (Story 10.2)

**Key learnings to apply:**
1. **Measurement lookup chain:** `JWT → user.id → CustomerProfileDB → MeasurementDB (is_default=True)`. The `check_customer_measurement()` function in `order_service.py` handles this — DO NOT duplicate.
2. **Cart store `transaction_type` casting:** Currently uses `as string` for "bespoke" comparison. After extending `CartTransactionType` to include "bespoke", clean up these type assertions.
3. **Server Action pattern:** Follow `checkMeasurement()` pattern in `order-actions.ts` for auth token forwarding.
4. **SQLAlchemy `default=` caveat:** `default=` in `mapped_column` only applies at INSERT time. Tests should set values explicitly.
5. **Two payment tables:** `payment_transactions` (Story 4.1 webhook audit) vs `order_payments` (Epic 10 business tracking). This story creates records in `order_payments` (OrderPaymentDB), NOT in `payment_transactions`.

### Git Intelligence (Recent Commits)

| Commit | Key Insight |
|--------|-------------|
| `e581526` Story 10.1 | Added OrderPaymentDB, ServiceType, SecurityType enums, all OrderDB columns. These are the foundation this story builds on. |
| `9de28fa` Epic 10 spec | Documented 5-phase order process. Architecture reference for payment model. |
| `a607fb9` Voucher system | `create_order()` already handles voucher logic. New service-type logic must integrate cleanly around voucher code at `order_service.py:153-168`. |
| `b1350e5` Customer ID link | `create_order()` accepts `customer_id` param. Bespoke orders REQUIRE authentication (measurement gate), so `customer_id` will always be set for bespoke. |

### Project Structure Notes

**Files to MODIFY:**
```
backend/src/models/order.py              ← Add RentalCheckoutFields, extend OrderCreate, OrderResponse, OrderFilterParams
backend/src/services/order_service.py    ← Extend _validate_and_price_items(), create_order() with service-type logic + OrderPaymentDB creation
backend/src/api/v1/orders.py             ← Minor: update import if new schemas added
frontend/src/types/cart.ts               ← Extend CartTransactionType to include "bespoke"
frontend/src/types/order.ts              ← Add RentalCheckoutFields, extend CreateOrderInput
frontend/src/store/cartStore.ts          ← Clean up "as string" assertions now that bespoke is native type
frontend/src/app/actions/order-actions.ts ← Extend createOrder() to pass rental_fields, measurement_confirmed
frontend/src/components/client/checkout/CheckoutClient.tsx     ← Add measurement gate redirect check
frontend/src/components/client/checkout/ShippingFormClient.tsx  ← Add conditional rental/bespoke fields
frontend/src/components/client/checkout/OrderSummary.tsx       ← Add deposit display
```

**Files to CREATE:**
```
backend/tests/test_10_3_checkout_service_type.py                     ← Tests for all service-type checkout scenarios
frontend/src/components/client/checkout/RentalCheckoutFields.tsx      ← Rental-specific form fields component
frontend/src/components/client/checkout/BespokeCheckoutBadge.tsx      ← Measurement confirmed badge component
```

**Files to READ (reference only):**
```
backend/src/models/db_models.py          ← OrderDB, OrderPaymentDB column definitions
backend/src/services/measurement_service.py   ← For understanding measurement data (DO NOT modify)
frontend/src/components/client/checkout/MeasurementGate.tsx  ← Integration reference (DO NOT modify)
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic-10, Story 10.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Order-Status-Pipeline]
- [Source: _bmad-output/planning-artifacts/architecture.md#Payment-Model-Multi-Transaction]
- [Source: _bmad-output/planning-artifacts/architecture.md#Service-Type-Classification-Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Checkout-Flow]
- [Source: _bmad-output/implementation-artifacts/10-2-measurement-gate-cho-dat-may.md]
- [Source: _bmad-output/project-context.md#Authoritative-Server-Pattern]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

1. Pre-existing test failure: `test_internal_order_service.py::test_create_internal_order_success` expects `in_progress` but code sets `confirmed` — NOT caused by Story 10.3.
2. Pre-existing TS errors in `sizeChartAccordion.test.tsx`, `statusUpdatePanel.test.tsx`, `proxy.ts` — unrelated to this story.
3. Fixed TS error: `VerifyCartItem.transaction_type` needed `"bespoke"` after extending `CartTransactionType`.

### Completion Notes List

- Backend: Created `RentalCheckoutFields` Pydantic schema with date validation and `SecurityType` integration
- Backend: Added `model_validator` to `OrderCreate` enforcing rental_fields for rent items and measurement_confirmed for bespoke items
- Backend: Extended `_validate_and_price_items()` with bespoke pricing branch (uses `sale_price`)
- Backend: Extended `create_order()` with service_type detection (priority: bespoke > rent > buy), deposit calculation (rent=30%, bespoke=50%), rental field assignment, and `OrderPaymentDB` record creation
- Backend: Updated all 5 `OrderResponse` construction sites with new service-type fields
- Backend: Updated `OrderFilterParams` and `list_orders_endpoint` to accept `bespoke` transaction type
- Frontend: Extended `CartTransactionType` to include `"bespoke"`, cleaned up `as string` type assertions
- Frontend: Created `RentalCheckoutFields` component (date pickers, security type radio, security value input)
- Frontend: Created `BespokeCheckoutBadge` component (measurement confirmed badge with re-verify link)
- Frontend: Extended `ShippingFormClient` with conditional rental/bespoke sections, deposit display, and measurement gate redirect
- Frontend: Updated `CreateOrderInput`, `OrderResponse` types with service-type fields
- Frontend: Fixed `VerifyCartItem` type to accept `"bespoke"` transaction type
- Tests: 26 new tests covering all 7 ACs — schema validation, deposit calculation, mixed cart, backward compatibility
- Test results: 54/54 Epic 10 tests pass (10.1: 21, 10.2: 7, 10.3: 26). No regressions.

### File List

**Modified:**
- `backend/src/models/order.py` — Added RentalCheckoutFields, model_validator on OrderCreate, extended OrderItemCreate/OrderResponse/OrderFilterParams
- `backend/src/services/order_service.py` — Extended _validate_and_price_items() for bespoke, create_order() with service-type logic/deposit/OrderPaymentDB, updated all OrderResponse constructions
- `backend/src/api/v1/orders.py` — Updated imports, bespoke in transaction_type filter
- `frontend/src/types/cart.ts` — CartTransactionType includes "bespoke"
- `frontend/src/types/order.ts` — Added ServiceType, SecurityType, RentalCheckoutFields, extended CreateOrderInput/OrderResponse/OrderListParams
- `frontend/src/store/cartStore.ts` — Cleaned up "as string" assertions, updated isDuplicate() for bespoke
- `frontend/src/app/actions/cart-actions.ts` — VerifyCartItem accepts "bespoke"
- `frontend/src/components/client/checkout/ShippingFormClient.tsx` — Conditional rental/bespoke UI, deposit display, measurement gate redirect, rental field validation
- `frontend/src/components/client/checkout/CheckoutClient.tsx` — Measurement gate redirect for bespoke items

**Created:**
- `backend/tests/test_10_3_checkout_service_type.py` — 26 tests (7 classes)
- `frontend/src/components/client/checkout/RentalCheckoutFields.tsx` — Rental form fields component
- `frontend/src/components/client/checkout/BespokeCheckoutBadge.tsx` — Measurement confirmation badge component
