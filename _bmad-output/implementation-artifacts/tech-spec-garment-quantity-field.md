---
title: 'Add Quantity Field to Garment Management System'
slug: 'garment-quantity-field'
created: '2026-03-31'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['FastAPI', 'SQLAlchemy', 'Pydantic v2', 'Next.js 16', 'TypeScript', 'Zod', 'PostgreSQL']
files_to_modify: ['backend/src/models/db_models.py', 'backend/src/models/garment.py', 'backend/src/api/v1/garments.py', 'backend/src/services/garment_service.py', 'backend/src/services/rental_service.py', 'backend/src/services/order_service.py', 'frontend/src/types/garment.ts', 'frontend/src/components/client/products/ProductForm.tsx']
code_patterns: ['db.flush() → db.commit() → db.refresh()', '.with_for_update() for row locking', 'Multi-tenant isolation via tenant_id', 'Pydantic @field_validator and @model_validator', 'Zod schema for frontend validation']
test_patterns: ['pytest + pytest-asyncio (backend)', 'Jest + React Testing Library (frontend)', 'In-memory SQLite for isolated DB tests', 'Fixture-based seed data', 'Multi-tenant isolation tests']
---

# Tech-Spec: Add Quantity Field to Garment Management System

**Created:** 2026-03-31

## Overview

### Problem Statement

Garments in the current system are treated as individual items with no quantity tracking. Each garment record represents a single unit, and availability is tracked via a `status` field (available/rented/maintenance). Owners have no way to know how many units of a particular garment are in stock, and the system cannot automatically manage inventory levels when garments are rented or returned.

### Solution

Add a `quantity` field (integer, default=1, min=0, max=9999) across the full stack: database model, Pydantic schemas, API endpoints, frontend type definitions, and the ProductForm component. Implement automatic quantity decrement on rental and increment on return. When quantity reaches 0, the garment status should reflect unavailability.

### Scope

**In Scope:**
- Backend DB model (`GarmentDB`): Add `quantity` column with default=1
- Pydantic schemas: Add `quantity` to create/update/response schemas
- API endpoints: Include `quantity` in create/update/response flows
- Frontend types: Add `quantity` to `Garment` interface
- ProductForm component: Add quantity input field with validation (min=0, max=9999)
- Auto-decrement quantity on order creation (rent/buy)
- Auto-increment quantity on return (good condition only)
- Availability check: use `quantity > 0` instead of `status == "available"` only

**Out of Scope:**
- Inventory history / audit log
- Batch quantity operations
- Warehouse management features
- Alembic migration file (manual migration step noted)

## Context for Development

### Codebase Patterns

1. **Transaction Pattern:** All DB mutations use `db.flush()` → `db.commit()` → `db.refresh()` sequence.
2. **Row Locking:** `.with_for_update()` used in `_validate_and_price_items()` and `process_return()` to prevent race conditions.
3. **Multi-tenant Isolation:** All garment queries filter by `tenant_id`.
4. **Pydantic Validation:** `@field_validator` for individual fields, `@model_validator(mode="after")` for cross-field.
5. **Frontend Validation:** Zod schemas with `.refine()` for custom rules.
6. **Service Layer:** API endpoints delegate to service functions. Business logic lives in `services/`.
7. **Availability Check:** Currently `garment.status != "available"` in `_validate_and_price_items()` (line 101 of `order_service.py`). This must be extended to also check `quantity > 0`.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/src/models/db_models.py` (L458-496) | `GarmentDB` SQLAlchemy model — add `quantity` column |
| `backend/src/models/garment.py` | Pydantic schemas: `GarmentBase`, `GarmentCreate`, `GarmentUpdate`, `GarmentResponse`, `GarmentFilter` |
| `backend/src/api/v1/garments.py` | REST endpoints — no direct changes needed if schemas updated correctly |
| `backend/src/services/garment_service.py` (L229-260) | `update_garment_status()` — manual status transitions |
| `backend/src/services/rental_service.py` (L239-361) | `process_return()` — return flow with row locking. Add quantity increment |
| `backend/src/services/order_service.py` (L61-174) | `_validate_and_price_items()` — availability check + row locking. Add quantity decrement |
| `frontend/src/types/garment.ts` | TypeScript `Garment` interface, `GarmentFilter`, response types |
| `frontend/src/components/client/products/ProductForm.tsx` | Product form with Zod validation — add quantity input |
| `backend/tests/test_garment_service.py` | Existing service tests to extend |
| `backend/tests/test_garments_api.py` | Existing API tests to extend |

### Technical Decisions

- **Default quantity = 1**: Backward compatible — all existing garments get quantity=1 via column default + migration.
- **Validation**: min=0, max=9999 at Pydantic and Zod levels.
- **Quantity decrement in `_validate_and_price_items()`**: This function already locks garment rows with `FOR UPDATE` and checks availability. Add quantity decrement here (line ~101-160).
- **Quantity increment in `process_return()`**: Only for `good` condition. `damaged` and `lost` do not increment.
- **Availability logic change**: `_validate_and_price_items()` line 101 currently checks `garment.status != "available"`. Extend to also reject if `garment.quantity < 1`.
- **No auto-status change on quantity=0**: Keep status field independent from quantity. Owner can manually manage status. The availability check uses both `status == "available"` AND `quantity > 0`.

## Implementation Plan

### Tasks

- [x] **Task 1: Add `quantity` column to `GarmentDB` model**
  - File: `backend/src/models/db_models.py`
  - Action: Add `quantity: Mapped[int] = mapped_column(Integer, nullable=False, default=1)` after `sale_price` field (line ~479).
  - Notes: Use `Integer` type from SQLAlchemy. Default=1 ensures backward compatibility. Must run a DB migration after: `ALTER TABLE garments ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;`

- [x] **Task 2: Add `quantity` to Pydantic schemas**
  - File: `backend/src/models/garment.py`
  - Action:
    - `GarmentBase`: Add `quantity: int = Field(default=1, ge=0, le=9999, description="Số lượng tồn kho")`
    - `GarmentUpdate`: Add `quantity: int | None = Field(default=None, ge=0, le=9999)` (optional for partial update)
    - `GarmentResponse`: Field is inherited from `GarmentBase` via existing pattern — verify it's included
    - `GarmentFilter`: No change needed (filtering by quantity not required)
  - Notes: `ge=0, le=9999` enforces min/max at Pydantic level.

- [x] **Task 3: Add quantity decrement on order creation**
  - File: `backend/src/services/order_service.py`
  - Action: In `_validate_and_price_items()` (line ~101):
    1. Extend availability check: reject if `garment.quantity < 1` (in addition to status check)
    2. After creating `OrderItemDB`, decrement: `garment.quantity -= 1`
    3. If `garment.quantity == 0`, optionally set `garment.status = "rented"` (or keep as-is and rely on the compound check)
  - Notes: Row locking already exists via `.with_for_update()` (line 83). The decrement happens within the same transaction. Each order item with `quantity=1` in OrderItemDB corresponds to 1 garment unit decrement.

- [x] **Task 4: Add quantity increment on return (good condition)**
  - File: `backend/src/services/rental_service.py`
  - Action: In `process_return()` (line ~333):
    1. For `good` condition: add `garment.quantity += 1` before setting status to "available"
    2. For `damaged` condition: do NOT increment (garment goes to maintenance)
    3. For `lost` condition: do NOT increment (garment is lost)
  - Notes: Row locking already in place via `.with_for_update()` (line 302). The increment is atomic within the existing transaction.

- [x] **Task 5: Add `quantity` to frontend TypeScript types**
  - File: `frontend/src/types/garment.ts`
  - Action: Add `quantity: number;` to the `Garment` interface.
  - Notes: Field follows `snake_case` convention per project rules.

- [x] **Task 6: Add quantity input to ProductForm**
  - File: `frontend/src/components/client/products/ProductForm.tsx`
  - Action:
    1. Add to Zod schema: `quantity: z.coerce.number().int().min(0).max(9999).default(1)`
    2. Add form input field between "Giá bán" (sale_price) and image upload section:
       ```
       Label: "Số lượng"
       Type: number input
       Min: 0, Max: 9999, Default: 1
       ```
    3. Include `quantity` in form payload on submit
    4. Set default value in form reset/initialization (1 for new, existing value for edit)
  - Notes: Follow the same pattern as `rental_price` input (string coerced to number via Zod). The field should be required with default=1.

- [x] **Task 7: Run DB migration**
  - Action: Execute SQL migration to add the column:
    ```sql
    ALTER TABLE garments ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1;
    ```
  - Notes: All existing garments will get quantity=1. This is a non-destructive, backward-compatible migration.

### Acceptance Criteria

- [ ] **AC 1:** Given a new garment is created without specifying quantity, when the garment is saved, then `quantity` defaults to 1.
- [ ] **AC 2:** Given a new garment is created with `quantity=50`, when the garment is saved, then `quantity` is stored as 50.
- [ ] **AC 3:** Given a garment with `quantity=5`, when a rent order is created for that garment, then `quantity` decrements to 4.
- [ ] **AC 4:** Given a garment with `quantity=1`, when a rent order is created, then `quantity` decrements to 0.
- [ ] **AC 5:** Given a garment with `quantity=0` and `status="available"`, when a customer attempts to create an order, then the API returns 422 with `ERR_ITEM_UNAVAILABLE`.
- [ ] **AC 6:** Given a rented garment is returned in `good` condition, when `process_return` is called, then `quantity` increments by 1.
- [ ] **AC 7:** Given a rented garment is returned in `damaged` condition, when `process_return` is called, then `quantity` does NOT increment.
- [ ] **AC 8:** Given a rented garment is returned as `lost`, when `process_return` is called, then `quantity` does NOT increment.
- [ ] **AC 9:** Given the ProductForm at `/owner/products/new`, when the form is rendered, then a "Số lượng" input is visible with default value 1, min=0, max=9999.
- [ ] **AC 10:** Given the ProductForm at `/owner/products/[id]/edit`, when editing an existing garment, then the quantity field shows the current quantity value.
- [ ] **AC 11:** Given a user enters quantity=-1 or quantity=10000 in the form, when they submit, then validation rejects with an error message.
- [ ] **AC 12:** Given a user enters quantity=-1 via the API, when the request is processed, then Pydantic validation rejects with 422.
- [ ] **AC 13:** Given two concurrent rent orders for a garment with `quantity=1`, when both are processed, then only one succeeds (row locking prevents overselling).

## Additional Context

### Dependencies

- No new external libraries required.
- Depends on existing SQLAlchemy `Integer` type (already available).
- Depends on existing row locking pattern in `_validate_and_price_items()` and `process_return()`.
- Requires DB migration (Task 7) to be run before deploying backend changes.

### Testing Strategy

**Backend Unit Tests (extend existing):**
- `test_garment_service.py`: Test CRUD with quantity field (create with default, create with explicit value, update quantity).
- `test_garments_api.py`: Test API endpoints include quantity in request/response. Test validation (min=0, max=9999, reject negative/overflow).

**Backend Integration Tests:**
- Test quantity decrement on order creation in `_validate_and_price_items()`.
- Test quantity=0 blocks new orders.
- Test quantity increment on good-condition return.
- Test no increment on damaged/lost return.
- Test concurrent order race condition (two simultaneous orders for quantity=1 garment).

**Frontend Tests:**
- Test ProductForm renders quantity input with correct default.
- Test ProductForm validation rejects invalid quantity values.
- Test edit mode loads existing quantity value.

**Manual Testing:**
1. Create a garment with quantity=5 via ProductForm.
2. Place a rent order → verify quantity decreases to 4.
3. Return garment (good condition) → verify quantity increases to 5.
4. Set quantity to 1, place order → verify quantity=0.
5. Attempt another order → verify 422 rejection.

### Notes

- **Race condition mitigation**: The existing `FOR UPDATE` row locking in `_validate_and_price_items()` (line 83) already prevents concurrent overselling. The quantity decrement happens within the locked transaction.
- **Buy orders**: `_validate_and_price_items()` handles both rent and buy. Quantity decrement applies to both transaction types. For buy orders, there is no return flow, so quantity is permanently reduced.
- **Future consideration**: If inventory audit logging is needed later, it can be added as a separate `inventory_log` table without modifying this implementation.
- **Migration safety**: The `DEFAULT 1` ensures zero downtime — existing rows are automatically populated, and the application code handles both old (no quantity) and new (with quantity) states gracefully.
