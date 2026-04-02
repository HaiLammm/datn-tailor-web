---
title: 'Add Rental Quantity Field to Inventory Status Update'
slug: 'inventory-rental-quantity'
created: '2026-04-02'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['FastAPI', 'SQLAlchemy', 'Pydantic v2', 'Next.js 16', 'TypeScript', 'PostgreSQL']
files_to_modify: ['backend/src/models/garment.py', 'backend/src/services/garment_service.py', 'frontend/src/app/actions/garment-actions.ts', 'frontend/src/components/client/inventory/StatusUpdatePanel.tsx']
code_patterns: ['2-Touch inline expansion pattern', 'GarmentStatusUpdate Pydantic schema with @model_validator', 'Server actions with revalidatePath', 'Multi-tenant isolation via tenant_id', 'db.flush() → db.commit() → db.refresh()']
test_patterns: ['pytest + pytest-asyncio (backend)', 'Pydantic validation tests', 'Manual UI testing']
---

# Tech-Spec: Add Rental Quantity Field to Inventory Status Update

**Created:** 2026-04-02

## Overview

### Problem Statement

When an Owner updates a garment's status from "Sẵn sàng" (available) to "Đang thuê" (rented) on the Inventory page (`/owner/inventory`), the form only collects: expected return date, renter name, and renter email. There is no way to specify HOW MANY units are being rented out. The `quantity` field was added to the garment model (see `tech-spec-garment-quantity-field.md`) but the inventory status update flow does not leverage it — the Owner cannot decrement stock when marking items as rented.

### Solution

Add a "Số lượng cho thuê" (rental quantity) input field to the `StatusUpdatePanel` component, placed after the email field. When the Owner confirms the status update to "rented":
- The garment's `quantity` is decremented by the rental amount.
- If `quantity` reaches 0, status changes to "rented".
- If `quantity` remains > 0, status stays "available" (still has stock).
- The rental quantity field defaults to 1, min=1, max=current garment quantity.

### Scope

**In Scope:**
- Frontend: Add rental quantity input to StatusUpdatePanel (after email field)
- Frontend: Pass rental_quantity to server action
- Backend: Add `rental_quantity` field to `GarmentStatusUpdate` Pydantic schema
- Backend: Update `update_garment_status()` service to decrement quantity and conditionally set status
- Backend: Validate rental_quantity (min=1, max=current quantity)

**Out of Scope:**
- Rental history / audit log for quantity changes
- Batch status updates across multiple garments
- Changes to the order_service.py or rental_service.py flows (already handled by garment-quantity-field spec)
- Changes to other status transitions (only "available" → "rented" affected)

## Context for Development

### Codebase Patterns

1. **2-Touch Pattern:** InventoryCard expands inline to show StatusUpdatePanel. When "Đang thuê" is clicked, additional fields appear (date, name, email). The new quantity field follows this same pattern.
2. **Pydantic Validation:** `GarmentStatusUpdate` uses `@field_validator` for individual fields and `@model_validator(mode="after")` for cross-field validation (e.g., rented requires date+name+email).
3. **Auto-clear:** When status ≠ "rented", renter fields are auto-cleared to NULL in the model_validator.
4. **Server Actions:** `updateGarmentStatus()` in garment-actions.ts calls `PATCH /api/v1/garments/{id}/status`.
5. **Multi-tenant Isolation:** All garment queries filter by `tenant_id`.
6. **Quantity field:** Already exists in `GarmentDB` model as `quantity: int` (default=1, min=0, max=9999).
7. **Transaction Pattern:** `db.flush()` → `db.commit()` → `db.refresh()` in service layer.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/src/models/garment.py` (L234-278) | `GarmentStatusUpdate` schema — add `rental_quantity` field + validation |
| `backend/src/services/garment_service.py` (L229-260) | `update_garment_status()` — add quantity decrement + conditional status logic |
| `frontend/src/app/actions/garment-actions.ts` (L358-421) | Server action `updateGarmentStatus()` — add `rentalQuantity` param |
| `frontend/src/components/client/inventory/StatusUpdatePanel.tsx` (L1-209) | Status update form — add rental quantity input after email field |
| `backend/src/models/db_models.py` (L458-496) | `GarmentDB` model — `quantity` column already exists (no changes needed) |
| `backend/src/api/v1/garments.py` (L235-264) | PATCH `/status` endpoint — no changes needed (schema handles it) |

### Technical Decisions

- **Conditional status change:** If `rental_quantity < garment.quantity` → quantity decrements but status stays "available". If `rental_quantity == garment.quantity` → quantity becomes 0 and status changes to "rented".
- **Server-side validation:** `rental_quantity` must be `>= 1` and `<= garment.quantity`. This check happens in `update_garment_status()` service (not in Pydantic schema, because it requires DB state). Pydantic only validates `>= 1`.
- **Default:** `rental_quantity` defaults to 1 in both frontend and backend.
- **Only for "rented" transition:** `rental_quantity` is only relevant when target status is "rented". For other transitions, it's ignored/cleared in the `@model_validator`.

## Implementation Plan

### Tasks

- [x] **Task 1: Add `rental_quantity` to `GarmentStatusUpdate` Pydantic schema**
  - File: `backend/src/models/garment.py`
  - Action:
    1. Add field to `GarmentStatusUpdate` class (after `renter_email`, line ~241): `rental_quantity: int | None = Field(default=1, ge=1, description="Số lượng cho thuê")`
    2. Update `@model_validator` `validate_rented_date()` (line ~262): when `status == RENTED`, validate that `rental_quantity` is not None and `>= 1`
    3. In the `status != RENTED` branch (line ~272): auto-clear `rental_quantity` to None
  - Notes: Max validation (`<= garment.quantity`) cannot be done in Pydantic — it requires DB state. This is handled in Task 2.

- [x] **Task 2: Update `update_garment_status()` service with quantity decrement logic**
  - File: `backend/src/services/garment_service.py`
  - Action: In `update_garment_status()` (line ~229), after fetching the garment:
    1. If `status_update.status == RENTED` and `status_update.rental_quantity` is not None:
       - Validate: `rental_quantity <= garment.quantity`. If not, raise `HTTPException(422, detail="Số lượng cho thuê vượt quá tồn kho (còn {garment.quantity})")`.
       - Validate: `garment.quantity >= 1`. If not, raise `HTTPException(422, detail="Sản phẩm đã hết hàng")`.
       - Decrement: `garment.quantity -= status_update.rental_quantity`
       - Conditional status: if `garment.quantity == 0` → set `garment.status = "rented"`. If `garment.quantity > 0` → keep `garment.status = "available"` (do NOT change to "rented").
    2. If `status_update.status != RENTED`: keep existing logic unchanged (set status directly).
    3. Set `renter_name`, `renter_email`, `expected_return_date`, `renter_id` as before.
  - Notes: Import `HTTPException` from `fastapi`. The existing `db.flush() → db.commit() → db.refresh()` pattern handles the transaction.

- [x] **Task 3: Add `rentalQuantity` param to frontend server action**
  - File: `frontend/src/app/actions/garment-actions.ts`
  - Action:
    1. Add `rentalQuantity?: number` as 6th parameter to `updateGarmentStatus()` function (line ~358).
    2. In the body construction (line ~376): add `if (rentalQuantity) { body.rental_quantity = rentalQuantity; }`
  - Notes: Follow the same pattern as `renterName`/`renterEmail` optional params.

- [x] **Task 4: Add rental quantity input to `StatusUpdatePanel`**
  - File: `frontend/src/components/client/inventory/StatusUpdatePanel.tsx`
  - Action:
    1. Add state: `const [rentalQuantity, setRentalQuantity] = useState<number>(1);` (after `renterEmail` state, line ~27)
    2. In `handleStatusClick` when `newStatus === RENTED && !showDatePicker` (line ~63): reset `setRentalQuantity(1)`.
    3. In the `handleStatusClick` submit call (line ~87): pass `rentalQuantity` as 6th argument to `updateGarmentStatus()`.
    4. In the reset after success (line ~98): add `setRentalQuantity(1)`.
    5. In the cancel handler (line ~195): add `setRentalQuantity(1)`.
    6. Add input field **after** the email error message (after line ~180), **before** the confirm button div (line ~182):
       ```tsx
       <label htmlFor="rental-quantity" className="block text-sm font-medium text-stone-700 mb-2 mt-3">
           Số lượng cho thuê:
       </label>
       <input
           id="rental-quantity"
           type="number"
           min={1}
           max={garment.quantity}
           value={rentalQuantity}
           onChange={(e) => setRentalQuantity(Math.max(1, Math.min(garment.quantity, parseInt(e.target.value) || 1)))}
           className="w-full h-12 px-3 rounded-md border border-stone-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
       />
       <p className="text-xs text-stone-400 mt-1">Tồn kho hiện tại: {garment.quantity}</p>
       ```
    7. Update the confirm button `disabled` condition (line ~185): add `|| rentalQuantity < 1 || rentalQuantity > garment.quantity` to the existing disabled check.
  - Notes: `garment.quantity` is available via props. The `onChange` handler clamps the value between 1 and `garment.quantity` to prevent invalid input.

### Acceptance Criteria

- [ ] **AC 1:** Given the StatusUpdatePanel for a garment with quantity=10, when the Owner clicks "Đang thuê", then a "Số lượng cho thuê" input appears after the email field with default value 1, min=1, max=10.
- [ ] **AC 2:** Given the Owner enters rental_quantity=3 for a garment with quantity=10, when they confirm the status update, then garment.quantity becomes 7 and status remains "available".
- [ ] **AC 3:** Given the Owner enters rental_quantity=10 for a garment with quantity=10, when they confirm the status update, then garment.quantity becomes 0 and status changes to "rented".
- [ ] **AC 4:** Given the Owner enters rental_quantity=11 for a garment with quantity=10, when they submit, then the backend returns 422 with message "Số lượng cho thuê vượt quá tồn kho".
- [ ] **AC 5:** Given a garment with quantity=0, when the Owner attempts to set status to "rented", then the backend returns 422 with message "Sản phẩm đã hết hàng".
- [ ] **AC 6:** Given the Owner updates status to "available" or "maintenance", when the request is sent, then rental_quantity is ignored (not sent/auto-cleared).
- [ ] **AC 7:** Given the rental quantity input is displayed, when the Owner types a value < 1 or > garment.quantity, then the input is clamped to valid range and the confirm button is disabled for out-of-range values.
- [ ] **AC 8:** Given the StatusUpdatePanel shows the rental quantity input, then a helper text "Tồn kho hiện tại: {quantity}" is visible below the input.

## Additional Context

### Dependencies

- Depends on `quantity` column already existing in `GarmentDB` (implemented via tech-spec-garment-quantity-field.md).
- No new external libraries required.
- No DB migration needed (quantity column already exists).

### Testing Strategy

**Backend Unit Tests:**
- Test `GarmentStatusUpdate` Pydantic schema accepts `rental_quantity` >= 1, rejects < 1.
- Test `GarmentStatusUpdate` auto-clears `rental_quantity` when status != "rented".

**Backend Integration Tests:**
- Test `update_garment_status()` decrements quantity correctly (quantity=10, rental=3 → quantity=7, status="available").
- Test `update_garment_status()` sets status to "rented" when quantity reaches 0 (quantity=5, rental=5 → quantity=0, status="rented").
- Test `update_garment_status()` returns 422 when rental_quantity > garment.quantity.
- Test `update_garment_status()` returns 422 when garment.quantity is already 0.

**Manual Testing:**
1. Go to `/owner/inventory`, expand a garment with quantity=5.
2. Click "Đang thuê" → verify quantity input appears after email with default=1, max=5.
3. Enter rental_quantity=2, fill other fields, click "Xác nhận" → verify quantity updates to 3, status stays "available".
4. Repeat with rental_quantity=3 → verify quantity=0, status="rented".
5. Try to rent again → verify rejection.

### Notes

- **No row locking added:** The status update flow uses a simple read-then-write pattern (not `FOR UPDATE`). For the manual inventory management use case, this is acceptable since only the Owner interacts with this UI. The order flow in `order_service.py` already has row locking for concurrent customer orders.
- **Frontend clamping:** The `onChange` handler clamps values in real-time, but the confirm button also has a `disabled` guard as a safety net.
- **Backward compatibility:** `rental_quantity` defaults to 1, so existing API consumers that don't send this field will behave as before (decrement by 1).

## Review Notes
- Adversarial review completed
- Findings: 13 total, 2 fixed, 11 skipped (out of scope / by design / existing pattern)
- Resolution approach: auto-fix
- Fixed: F5 (falsy check on rentalQuantity), F8 (silent reset → raise ValueError)
