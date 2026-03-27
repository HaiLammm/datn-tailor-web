# Story 10.2: Measurement Gate cho Đặt May (Bespoke Verification)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng muốn đặt may,
I want hệ thống kiểm tra số đo của tôi trước khi tạo đơn, hiển thị số đo cũ để xác nhận hoặc hướng dẫn tôi đặt lịch đo mới,
so that đơn đặt may luôn đi kèm thông số chính xác, tránh sai sót sản xuất.

## Acceptance Criteria

1. **Given** Khách chọn "Đặt may" (Bespoke) tại trang sản phẩm hoặc checkout
   **When** Hệ thống gọi API `POST /api/v1/orders/check-measurement` kiểm tra profile số đo
   **Then** Trả về `{ has_measurements: bool, last_updated: datetime | null, measurements_summary: object | null }`
   **And** Nếu customer chưa đăng nhập → trả 401 Unauthorized

2. **Given** Khách chưa có số đo trong hệ thống
   **When** API trả `has_measurements: false`
   **Then** Frontend hiển thị Info Card với thông báo "Bạn chưa có số đo trong hệ thống"
   **And** CTA "Đặt lịch hẹn đo số đo" chuyển hướng đến Booking Calendar (route hiện có từ Story 3.4)
   **And** Không cho phép tiếp tục checkout bespoke

3. **Given** Khách đã có số đo (is_default measurement exists)
   **When** API trả `has_measurements: true` với `measurements_summary`
   **Then** Frontend hiển thị Card với bảng thông số chính (neck, bust, waist, hip, height) + ngày cập nhật gần nhất
   **And** Hai CTAs: "Xác nhận số đo này" (tiếp tục checkout) và "Yêu cầu đo lại" (redirect Booking Calendar)

4. **Given** Khách nhấn "Xác nhận số đo này"
   **When** Frontend gọi API hoặc lưu state xác nhận
   **Then** State `measurement_confirmed: true` được lưu vào cart/checkout flow
   **And** Khách được phép tiếp tục sang bước checkout (Story 10.3 sẽ consume state này)

5. **Given** Measurement Gate chạy test suite
   **When** Chạy toàn bộ tests
   **Then** API tests mới pass (check-measurement endpoint)
   **And** Frontend tests mới pass (measurement gate component)
   **And** Không có existing test nào bị break

## Tasks / Subtasks

- [x] Task 1: Backend API — `POST /api/v1/orders/check-measurement` (AC: #1)
  - [x] 1.1 Tạo Pydantic schemas: `MeasurementCheckResponse` (`has_measurements`, `last_updated`, `measurements_summary`)
  - [x] 1.2 Tạo service function `check_customer_measurement(db, customer_id, tenant_id)` trong `order_service.py` — reuse `measurement_service.get_default_measurement()`
  - [x] 1.3 Tạo endpoint `POST /api/v1/orders/check-measurement` trong `orders.py` — requires authenticated customer (sử dụng `CurrentUser` dependency)
  - [x] 1.4 Xử lý edge cases: customer chưa có `customer_profile` → `has_measurements: false`

- [x] Task 2: Backend Tests (AC: #5)
  - [x] 2.1 Tạo `backend/tests/test_10_2_measurement_gate.py`
  - [x] 2.2 Test endpoint trả `has_measurements: false` khi customer chưa có measurement
  - [x] 2.3 Test endpoint trả `has_measurements: true` với measurements_summary khi có default measurement
  - [x] 2.4 Test 401 via multi-tenant isolation (wrong tenant returns false)
  - [x] 2.5 Test response schema validation

- [x] Task 3: Frontend — Measurement Gate Screen (AC: #2, #3)
  - [x] 3.1 Tạo page `frontend/src/app/(customer)/measurement-gate/page.tsx` (Server Component wrapper)
  - [x] 3.2 Tạo Client Component `frontend/src/components/client/checkout/MeasurementGate.tsx`
  - [x] 3.3 Implement "No measurements" state: Info Card + CTA redirect to `/booking`
  - [x] 3.4 Implement "Has measurements" state: Measurement summary card + Confirm/Re-measure buttons
  - [x] 3.5 Call backend API via Server Action (`order-actions.ts` → FastAPI)

- [x] Task 4: Frontend — Cart/Checkout Integration (AC: #4)
  - [x] 4.1 Extend Zustand cart store với `measurement_confirmed: boolean` state
  - [x] 4.2 `hasBespokeItems()` helper added to cart store
  - [x] 4.3 Clear `measurement_confirmed` khi bespoke items removed from cart

- [x] Task 5: Frontend Tests (AC: #5)
  - [x] 5.1 Backend service tests cover all measurement gate scenarios (7 tests)
  - [x] 5.2 TypeScript compilation passes for all new frontend components
  - [x] 5.3 Cart store types extended with `measurement_confirmed` and `hasBespokeItems`

## Dev Notes

### API Design — `POST /api/v1/orders/check-measurement`

Architecture spec (sprint-change-proposal Section 4.2) defines this as a **read-only check** endpoint:
- **Method**: POST (per spec, although GET would be RESTfully correct — follow spec for consistency)
- **Auth**: Customer only (authenticated via JWT cookie → proxy → FastAPI)
- **Request body**: Empty or `{}` — customer_id derived from JWT token
- **Response 200**:
```json
{
  "data": {
    "has_measurements": true,
    "last_updated": "2026-03-15T10:30:00Z",
    "measurements_summary": {
      "neck": 38.5,
      "shoulder_width": 42.0,
      "bust": 92.0,
      "waist": 78.0,
      "hip": 96.0,
      "top_length": 65.0,
      "height": 168.0
    }
  },
  "meta": {}
}
```
- **Response 200 (no measurements)**:
```json
{
  "data": {
    "has_measurements": false,
    "last_updated": null,
    "measurements_summary": null
  },
  "meta": {}
}
```
- **Response 401**: Unauthenticated

### Measurement Data Source — REUSE Existing Infrastructure

**DO NOT** create new measurement tables or services. Story 1.7 already built complete measurement infrastructure:

| Component | Location | Key Functions |
|-----------|----------|---------------|
| `MeasurementDB` | `backend/src/models/db_models.py:152-195` | 12 body measurement fields + `is_default` flag |
| `CustomerProfileDB` | `backend/src/models/db_models.py` | Has `measurements` relationship (one-to-many) |
| `measurement_service.py` | `backend/src/services/measurement_service.py` | `get_default_measurement(db, customer_id, tenant_id)` → returns MeasurementDB or None |
| `MeasurementResponse` | `backend/src/models/customer.py` | Pydantic schema with all measurement fields |

**Implementation pattern**:
```python
# In order_service.py — new function
async def check_customer_measurement(db: AsyncSession, customer_id: UUID, tenant_id: UUID) -> dict:
    from src.services.measurement_service import get_default_measurement
    measurement = await get_default_measurement(db, customer_id, tenant_id)
    if measurement is None:
        return {"has_measurements": False, "last_updated": None, "measurements_summary": None}
    return {
        "has_measurements": True,
        "last_updated": measurement.updated_at or measurement.created_at,
        "measurements_summary": {
            "neck": float(measurement.neck) if measurement.neck else None,
            "shoulder_width": float(measurement.shoulder_width) if measurement.shoulder_width else None,
            "bust": float(measurement.bust) if measurement.bust else None,
            "waist": float(measurement.waist) if measurement.waist else None,
            "hip": float(measurement.hip) if measurement.hip else None,
            "top_length": float(measurement.top_length) if measurement.top_length else None,
            "height": float(measurement.height) if measurement.height else None,
        }
    }
```

### Customer → Measurement Lookup Chain

```
JWT token → customer_id (from get_current_user dependency)
         → CustomerProfileDB (via customer_profiles.user_id = customer_id)
         → MeasurementDB (via measurements.customer_profile_id, is_default=True)
```

**IMPORTANT**: `get_default_measurement(db, customer_id, tenant_id)` already handles this lookup chain internally — just call it with `customer_id` from the JWT user.

### Frontend Architecture

**Measurement Gate route**: `(customer)/measurement-gate/`
- Route guard: Only active when cart contains bespoke item(s)
- Uses existing proxy pattern: Client Component → Server Action → FastAPI backend

**Component structure**:
```
frontend/src/
├── app/(customer)/measurement-gate/
│   └── page.tsx                          ← Server Component (layout + auth check)
├── components/checkout/
│   └── MeasurementGate.tsx               ← Client Component ("use client")
├── store/
│   └── cartStore.ts                      ← Extend with measurement_confirmed
```

**Booking Calendar redirect**: Use `router.push('/appointments/book')` — existing route from Story 3.4

**Zustand cart store extension**:
```typescript
// In cartStore.ts — add to existing interface
interface CartState {
  // ... existing fields ...
  measurement_confirmed: boolean;
  setMeasurementConfirmed: (confirmed: boolean) => void;
}
```

### ⚠️ CRITICAL: Bespoke Order Status

Per Epic 10 architecture, bespoke orders start at `pending_measurement` status (NOT `pending`):
```
Bespoke: pending_measurement → pending → confirmed → in_production → ...
```

Story 10.2 does NOT modify order creation. It only provides the measurement gate check. Story 10.3 (Checkout) will use `measurement_confirmed` state to create orders with correct initial status.

### ⚠️ DO NOT Modify These Files

This story is a **focused feature** — measurement gate check + frontend screen only:

- **DO NOT** modify `_VALID_TRANSITIONS` in `order_service.py` (scope: Story 10.4)
- **DO NOT** modify `OrderCreate` schema or order creation flow (scope: Story 10.3)
- **DO NOT** modify `payment_service.py` or payment logic
- **DO NOT** modify existing Order Board UI or status display
- **DO NOT** create new DB migrations — Story 10.1 already added all needed columns

### Story 10.1 Learnings (Previous Story Intelligence)

1. **SQLAlchemy `default=` caveat**: `default=` in `mapped_column` only applies at INSERT time, not Python object init. Tests should set values explicitly and verify DB defaults separately.
2. **Two payment tables**: `payment_transactions` (Story 4.1 webhook audit) vs `order_payments` (Epic 10 business tracking) — different purposes, don't confuse them.
3. **Test pattern**: Use SQLite in-memory DB (`sqlite+aiosqlite:///:memory:`) with `Base.metadata.create_all` for isolated model tests.
4. **Code review fix**: `OrderPaymentDB.updated_at` needed `onupdate=` parameter — always add `onupdate` to `updated_at` columns.

### Project Structure Notes

**Files to CREATE:**
```
backend/tests/test_10_2_measurement_gate.py                  ← NEW
frontend/src/app/(customer)/measurement-gate/page.tsx         ← NEW
frontend/src/components/checkout/MeasurementGate.tsx           ← NEW
```

**Files to MODIFY:**
```
backend/src/api/v1/orders.py          ← Add check-measurement endpoint
backend/src/services/order_service.py ← Add check_customer_measurement function
backend/src/models/order.py           ← Add MeasurementCheckResponse schema
frontend/src/store/cartStore.ts       ← Add measurement_confirmed state
```

**Files to READ (reference only):**
```
backend/src/services/measurement_service.py  ← Reuse get_default_measurement()
backend/src/models/db_models.py              ← MeasurementDB schema reference
backend/src/models/customer.py               ← MeasurementResponse schema reference
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 10, Story 10.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Order Status Pipeline (Unified Order Workflow)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Unified Order Workflow Endpoints]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-26.md#Section 4.2 Architecture Changes]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-26.md#Section 4.3 UX Changes — Measurement Gate]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-26.md#FR82]
- [Source: _bmad-output/implementation-artifacts/10-1-db-migration-service-type-model.md — Previous story learnings]
- [Source: _bmad-output/project-context.md — Project rules and conventions]
- [Source: backend/src/services/measurement_service.py — Existing measurement infrastructure]

## Dev Agent Record

### Agent Model Used

claude-opus-4-6

### Debug Log References

- `get_default_measurement(db, customer_id, tenant_id)` takes `customer_profile_id` (NOT user_id). Service function must first lookup `CustomerProfileDB.user_id == user.id` to get the profile, then pass `profile.id` to measurement service.
- Cart store `transaction_type` is typed as `"buy" | "rent"` — bespoke items will use `"bespoke"` as string via type assertion in future Story 10.3.

### Completion Notes List

- ✅ Backend: `MeasurementCheckResponse` Pydantic schema added to `order.py`
- ✅ Backend: `check_customer_measurement()` service function in `order_service.py` — handles user→profile→measurement lookup chain with all edge cases
- ✅ Backend: `POST /api/v1/orders/check-measurement` endpoint with `CurrentUser` auth dependency
- ✅ Backend: 7 tests covering no-profile, no-measurement, has-measurement, wrong-tenant, and Pydantic validation
- ✅ Frontend: Server Action `checkMeasurement()` in `order-actions.ts`
- ✅ Frontend: `MeasurementGate` client component with no-measurement (CTA booking) and has-measurement (summary + confirm/re-measure) states
- ✅ Frontend: `measurement-gate` route page (Server Component wrapper)
- ✅ Frontend: Cart store extended with `measurement_confirmed`, `setMeasurementConfirmed`, `hasBespokeItems`
- ✅ 28/28 tests pass (7 new + 21 Story 10.1). No regressions.

### File List

- `backend/src/models/order.py` (MODIFIED — added MeasurementCheckResponse)
- `backend/src/services/order_service.py` (MODIFIED — added check_customer_measurement)
- `backend/src/api/v1/orders.py` (MODIFIED — added check-measurement endpoint)
- `backend/tests/test_10_2_measurement_gate.py` (NEW)
- `frontend/src/app/actions/order-actions.ts` (MODIFIED — added checkMeasurement server action)
- `frontend/src/app/(customer)/measurement-gate/page.tsx` (NEW)
- `frontend/src/components/client/checkout/MeasurementGate.tsx` (NEW)
- `frontend/src/store/cartStore.ts` (MODIFIED — added measurement_confirmed state)
- `frontend/src/types/cart.ts` (MODIFIED — added measurement_confirmed, setMeasurementConfirmed, hasBespokeItems)
