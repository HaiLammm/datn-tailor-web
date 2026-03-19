---
title: 'Owner Internal Order (Đơn Nội Bộ Chủ Tiệm)'
slug: 'owner-internal-order'
created: '2026-03-19'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['FastAPI', 'PostgreSQL', 'SQLAlchemy', 'Pydantic v2', 'Next.js 16', 'TypeScript', 'TanStack Query', 'Radix UI', 'Tailwind CSS']
files_to_modify: ['backend/migrations/018_add_is_internal_to_orders.sql', 'backend/src/models/db_models.py', 'backend/src/models/order.py', 'backend/src/models/tailor_task.py', 'backend/src/services/order_service.py', 'backend/src/api/v1/orders.py', 'frontend/src/types/order.ts', 'frontend/src/app/actions/order-actions.ts', 'frontend/src/components/client/orders/OrderBoardClient.tsx', 'frontend/src/components/client/orders/OrderFilters.tsx', 'frontend/src/components/client/orders/OrderTable.tsx', 'frontend/src/components/client/orders/InternalOrderDialog.tsx', 'frontend/src/components/client/orders/OrderDetailDrawer.tsx', 'frontend/src/components/client/checkout/OrderConfirmation.tsx', 'backend/tests/test_internal_order_service.py', 'backend/tests/test_order_service.py']
code_patterns: ['Authoritative Server Pattern (backend SSOT for prices)', 'Server Actions for auth-forwarding', 'TanStack Query with staleTime 60s', 'OwnerOnly dependency guard', 'API response wrapper { data, meta }', 'Optimistic updates with useMutation']
test_patterns: ['pytest async with AsyncSession', 'Jest + React Testing Library', 'Seed fixtures in conftest', 'Test valid/invalid transitions']
---

# Tech-Spec: Owner Internal Order (Đơn Nội Bộ Chủ Tiệm)

**Created:** 2026-03-19

## Overview

### Problem Statement

Chủ tiệm may muốn tự sản xuất áo dài cho kho hàng của tiệm, nhưng hiện tại chỉ có flow đặt hàng từ khách hàng (guest checkout). Không có cách nào để chủ tiệm tạo đơn sản xuất nội bộ — đơn không cần shipping, không cần thanh toán, và đi thẳng vào pipeline sản xuất.

### Solution

Thêm endpoint + UI tạo đơn nội bộ trên Order Board. Đơn nội bộ auto skip `pending`/`confirmed`, vào thẳng `in_production` → xuất hiện trong dropdown "Giao việc mới" trên Production Board (Story 5.2). Không cần shipping/payment. Customer info auto-fill từ thông tin Owner.

Flow: Tạo đơn nội bộ (Order Board) → Đơn auto `in_production` → Giao việc mới (Production Board) → Nhân viên thực hiện → Hoàn thành → Thêm vào kho hàng (mark `delivered`).

### Scope

**In Scope:**
- Field `is_internal` trên OrderDB để phân biệt đơn nội bộ vs đơn khách
- API `POST /api/v1/orders/internal` (Owner-only, skip shipping & payment)
- Đơn nội bộ auto status `in_production`, payment auto `paid`
- Auto-fill customer_name/phone từ thông tin Owner
- Nút "Tạo đơn nội bộ" + form trên Order Board (chỉ cần chọn garments)
- Filter đơn nội bộ/đơn khách trên Order Board
- Tích hợp với Production Board flow hiện tại (Story 5.2 — đơn `in_production` xuất hiện trong dropdown giao việc)

**Out of Scope:**
- Quản lý kho hàng chi tiết (inventory management system) — chỉ mark `delivered` = nhập kho
- Rent flow cho đơn nội bộ (chỉ hỗ trợ `buy`)
- Shipping/payment cho đơn nội bộ
- Thay đổi Production Board UI (đã có từ Story 5.2)

## Context for Development

### Codebase Patterns

- **Authoritative Server Pattern**: Backend là SSOT cho giá cả và trạng thái. Frontend KHÔNG bao giờ tính giá — backend verify từ GarmentDB.
- **API Response Wrapper**: Tất cả endpoints trả về `{ "data": {...}, "meta": {} }` cho single entity, `{ "data": [...], "meta": { "pagination": {...} } }` cho list.
- **Error Format**: `{ "error": { "code": "ERR_CODE", "message": "Vietnamese message" } }`
- **Multi-Tenant Isolation**: Mọi query PHẢI filter theo `tenant_id`.
- **Server Actions**: Mọi API call từ frontend đi qua `app/actions/` server actions, KHÔNG gọi backend trực tiếp từ client components.
- **OwnerOnly Guard**: Dùng `OwnerOnly` dependency cho endpoints chỉ dành cho Owner (pattern từ `kpi.py`). `OwnerOnly` returns `UserDB` object with `id`, `full_name`, `phone`, `tenant_id`.
- **TanStack Query**: `staleTime: 60_000`, `queryKey` chứa tất cả filter params.
- **Optimistic Updates**: `useMutation` với `onMutate`/`onError` rollback (pattern từ OrderTable.tsx status update).
- **URL State for Filters**: Dùng `useSearchParams()` + `useRouter()` sync filter state.

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `backend/src/models/db_models.py:258-300` | OrderDB model — cần thêm `is_internal` field, make `shipping_address` nullable |
| `backend/src/models/db_models.py:41-61` | UserDB model — `full_name`, `phone` fields dùng để auto-fill customer info |
| `backend/src/models/db_models.py:302-334` | OrderItemDB model — không thay đổi, reuse cho internal orders |
| `backend/src/models/db_models.py:394-431` | GarmentDB model — `sale_price`, `name`, `status` dùng cho garment validation |
| `backend/src/models/order.py` | Pydantic schemas: OrderCreate, OrderStatus, PaymentMethod enums, **OrderResponse** |
| `backend/src/models/tailor_task.py:49-53` | `OrderInfoForTask` — `shipping_address: dict` (required) — **MUST make nullable** |
| `backend/src/services/order_service.py:33-191` | `create_order()` — garment validation + price logic to reuse |
| `backend/src/services/order_service.py:260-310` | `list_orders()` — filter logic to extend with `is_internal` |
| `backend/src/services/order_service.py:429-438` | Status update notification — fires when `customer_id` is set |
| `backend/src/api/v1/orders.py` | Router `/api/v1/orders` — route ordering matters: `POST /internal` MUST be FIRST route |
| `backend/src/api/v1/garments.py` | Garment list endpoint — uses hardcoded tenant_id, NOT authenticated |
| `backend/migrations/017_create_vouchers_tables.sql` | Latest migration — next number is `018` |
| `frontend/src/types/order.ts` | TS types — `shipping_address: ShippingAddress` **MUST become nullable** |
| `frontend/src/app/actions/order-actions.ts` | Server actions with auth pattern |
| `frontend/src/components/client/orders/OrderBoardClient.tsx` | Main orchestrator with TanStack Query |
| `frontend/src/components/client/orders/OrderFilters.tsx` | Filter UI component |
| `frontend/src/components/client/orders/OrderTable.tsx` | Table with status badges, next-status actions |
| `frontend/src/components/client/orders/OrderDetailDrawer.tsx:183` | Already has `{order.shipping_address && (` conditional |
| `frontend/src/components/client/checkout/OrderConfirmation.tsx:33` | Destructures `shipping_address` WITHOUT null check — will crash |
| `frontend/src/components/client/production/TaskCreateDialog.tsx` | Giao việc dialog — already filters orders by `in_production` status |
| `backend/tests/test_order_board_service.py` | Test patterns — async fixtures, seed data |
| `backend/tests/test_order_service.py` | Existing `create_order` tests — MUST pass after refactor |
| `backend/src/services/order_customer_service.py:136` | `order.shipping_address or {}` — already handles null safely |
| `backend/src/services/email_service.py:942` | `if hasattr(order, "shipping_address") and order.shipping_address:` — handles null safely |

### Technical Decisions

- **DB Migration Required**: `shipping_address` hiện tại là `JSONB NOT NULL` → cần ALTER thành nullable. Thêm column `is_internal BOOLEAN NOT NULL DEFAULT FALSE`. Migration number: **018** (017 is latest).
- **Separate endpoint**: `POST /api/v1/orders/internal` thay vì modify endpoint hiện tại — tách biệt logic, không ảnh hưởng guest checkout.
- **Reuse garment validation**: Extract shared helper `_validate_and_price_items()` từ `create_order()` — cả hai flows dùng chung logic verify garment + calculate price. **MUST run existing `test_order_service.py` tests after refactor** to ensure guest checkout is not broken.
- **Auto-fill Owner info**: Backend lấy `full_name`/`phone` từ `UserDB` record qua `OwnerOnly` dependency. Nếu `full_name` null → dùng email. Nếu `phone` null → set "N/A".
- **PaymentMethod**: Thêm `internal` vào PaymentMethod enum. **CRITICAL**: Must update BOTH backend (`order.py` enum) AND frontend (`order.ts` type) **atomically** in same deploy — otherwise `list_orders` response will fail Pydantic validation for ALL orders.
- **Status skip**: Internal orders tạo trực tiếp với `status="in_production"`, `payment_status="paid"`. Bypass transition matrix vì matrix chỉ enforce trên updates.
- **shipping_address nullable cascade**: Making `shipping_address` nullable affects multiple files:
  - `OrderResponse.shipping_address` in `order.py` → change to `ShippingAddress | None = None` **(F1 — Critical)**
  - `OrderInfoForTask.shipping_address` in `tailor_task.py` → change to `dict | None = None` **(F4 — High)**
  - `OrderConfirmation.tsx` → add null guard on destructure **(F8 — Medium)**
  - `OrderDetailDrawer.tsx` → already has conditional render (safe)
  - `order_customer_service.py:136` → already uses `or {}` (safe)
  - `email_service.py:942` → already checks truthiness (safe)
  - Frontend `OrderResponse` TS type → change to `shipping_address: ShippingAddress | null` **(F7 — Medium)**
- **No notification on creation**: Không gửi notification khi tạo đơn nội bộ. **ALSO**: suppress status update notifications for internal orders — add `if not order.is_internal` guard in `update_order_status()` before calling `create_notification()` **(F11)**.
- **Garment availability**: For internal orders, **skip garment availability check** (`status != "available"`). Internal orders are production orders — Owner can produce garments regardless of current rental status. Only validate garment exists and has `sale_price` **(F10)**.
- **Garment list for dialog**: The existing `GET /api/v1/garments` uses hardcoded `get_default_tenant_id()` — NOT the authenticated owner's tenant. Create a new server action `fetchGarmentsForInternalOrder()` that calls `GET /api/v1/garments` with auth header, OR add an authenticated tenant-scoped garment list endpoint. Recommended: add `is_internal=true` query param to existing garments endpoint that switches to authenticated tenant_id, OR create a simple inline query in `create_internal_order` validation **(F6)**.
- **Index optimization**: Use composite index `(tenant_id, is_internal)` instead of standalone `(is_internal)` boolean index **(F13)**.

### Critical Warnings for Dev Agent

1. **MUST** update `OrderResponse.shipping_address` to `ShippingAddress | None = None` in `order.py` — otherwise ALL order read endpoints crash for internal orders (F1).
2. **MUST** add `internal` to `PaymentMethod` enum in BOTH `order.py` AND `order.ts` — otherwise Pydantic rejects ALL order serialization (F2).
3. **MUST** use migration number `018` — `016` and `017` already exist (F3).
4. **MUST** update `OrderInfoForTask.shipping_address` to `dict | None = None` in `tailor_task.py` — otherwise tailor task detail crashes for internal orders (F4).
5. **MUST** place `POST /internal` as the FIRST route in `orders.py` — before `POST ""` at line 36, before `GET /{order_id}` at line 60 (F5).
6. **MUST** ensure garment list for InternalOrderDialog uses authenticated, tenant-scoped query (F6).
7. **MUST** update frontend TS type `shipping_address` to `ShippingAddress | null` in `order.ts` (F7).
8. **MUST** add null guard for `shipping_address` in `OrderConfirmation.tsx:33` (F8).
9. **MUST** run existing `test_order_service.py` tests after refactoring `create_order()` (F9).
10. **MUST** skip garment availability check for internal orders — only check garment exists + has sale_price (F10).
11. **MUST** suppress status update notifications for internal orders in `update_order_status()` (F11).
12. **DO NOT** use standalone `(is_internal)` index — use composite `(tenant_id, is_internal)` (F13).
13. **MUST** deploy backend and frontend type changes together to prevent type mismatch (F14).

## Implementation Plan

### Tasks

- [x] Task 1: Database Migration — Add `is_internal` column, make `shipping_address` nullable
  - File: `backend/migrations/018_add_is_internal_to_orders.sql` (CREATE)
  - Action: Write SQL migration:
    ```sql
    ALTER TABLE orders ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE orders ALTER COLUMN shipping_address DROP NOT NULL;
    CREATE INDEX idx_orders_tenant_is_internal ON orders(tenant_id, is_internal);
    ```
  - Notes: Migration number **018** (017 is latest). Composite index on `(tenant_id, is_internal)` instead of standalone boolean index. Existing orders all have `shipping_address` populated so no data issues.

- [x] Task 2: Backend Model Updates — OrderDB + Pydantic schemas + TailorTask schemas
  - File: `backend/src/models/db_models.py`
  - Action: Add `is_internal` field to OrderDB, change `shipping_address` to nullable:
    ```python
    is_internal: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    shipping_address: Mapped[dict | None] = mapped_column(JSON, nullable=True)  # was nullable=False
    ```
  - File: `backend/src/models/order.py`
  - Action:
    1. Add `internal` to `PaymentMethod` enum: `internal = "internal"`
    2. Change `OrderResponse.shipping_address` to nullable: `shipping_address: ShippingAddress | None = None` **(F1 fix — Critical)**
    3. Add `is_internal: bool = False` to `OrderResponse`
    4. Add new Pydantic model `InternalOrderCreate`:
       ```python
       class InternalOrderCreate(BaseModel):
           items: list[OrderItemCreate] = Field(..., min_length=1)
           notes: str | None = Field(None, max_length=500)
       ```
       - No `customer_name`, `customer_phone`, `shipping_address` — backend auto-fills from Owner profile
       - Only `items` (garments to produce) and optional `notes`
       - Items validated: `transaction_type` must be `"buy"` only
    5. Add `is_internal: bool = False` to `OrderListItem`
    6. Add `is_internal: bool | None = None` to `OrderFilterParams`
  - File: `backend/src/models/tailor_task.py`
  - Action: Change `OrderInfoForTask.shipping_address` to nullable: `shipping_address: dict | None = None` **(F4 fix — High)**

- [x] Task 3: Backend Service — `create_internal_order()` function + refactor shared helper
  - File: `backend/src/services/order_service.py`
  - Action:
    1. Extract shared helper from `create_order()`:
       ```python
       async def _validate_and_price_items(
           db: AsyncSession,
           items: list[OrderItemCreate],
           tenant_id: UUID,
           skip_availability_check: bool = False,
       ) -> tuple[list[OrderItemDB], list[dict], Decimal]:
       ```
       - Batch fetch garments with FOR UPDATE lock
       - If `skip_availability_check=False`: verify `status == "available"` (existing behavior)
       - If `skip_availability_check=True`: only verify garment exists (for internal orders) **(F10 fix)**
       - Verify price (SSOT): `sale_price` must exist for `buy` items
       - Return (order_items, item_details, total_amount)
    2. Refactor `create_order()` to use `_validate_and_price_items(skip_availability_check=False)`
    3. Add new function:
       ```python
       async def create_internal_order(
           db: AsyncSession,
           order_data: InternalOrderCreate,
           owner: UserDB,
           tenant_id: UUID,
       ) -> OrderResponse:
       ```
       - Reject any item with `transaction_type != "buy"` → 422 error
       - Call `_validate_and_price_items(skip_availability_check=True)` — internal orders can use garments regardless of rental status **(F10 fix)**
       - Auto-fill `customer_name` = `owner.full_name or owner.email`
       - Auto-fill `customer_phone` = `owner.phone or "N/A"`
       - Set `shipping_address = None`
       - Set `payment_method = "internal"`
       - Set `status = "in_production"`, `payment_status = "paid"`
       - Set `is_internal = True`
       - Set `customer_id = owner.id`
       - Set `shipping_note = order_data.notes`
       - No payment URL generation
       - No notification
    4. Update `list_orders()` — add `is_internal` filter:
       ```python
       if params.is_internal is not None:
           query = query.where(OrderDB.is_internal == params.is_internal)
       ```
    5. Update response builders to include `is_internal` field
    6. **Suppress notification for internal orders in `update_order_status()`** **(F11 fix)**:
       ```python
       # Change line ~430 from:
       if _customer_id is not None and new_status in ORDER_STATUS_MESSAGES:
       # To:
       if _customer_id is not None and new_status in ORDER_STATUS_MESSAGES and not _is_internal:
       ```
       Where `_is_internal` is read from the order before update.
  - Notes: **MUST run existing `test_order_service.py` tests after refactoring** to verify guest checkout still works **(F9 fix)**.

- [x] Task 4: Backend API Endpoint — `POST /api/v1/orders/internal`
  - File: `backend/src/api/v1/orders.py`
  - Action: Add new endpoint **as the FIRST route in the file** **(F5 fix)**:
    ```python
    @router.post(
        "/internal",
        response_model=dict,
        status_code=status.HTTP_201_CREATED,
        summary="Create internal order (Owner only)",
    )
    async def create_internal_order_endpoint(
        order_data: InternalOrderCreate,
        user: OwnerOnly,
        tenant_id: TenantId,
        db: AsyncSession = Depends(get_db),
    ) -> dict:
    ```
  - Notes: MUST be declared BEFORE `POST ""` (line 36) and `GET /{order_id}` (line 60). Add `is_internal` query param to existing `GET /` list endpoint.

- [x] Task 5: Frontend Types — Add internal order types + fix nullable shipping_address
  - File: `frontend/src/types/order.ts`
  - Action:
    1. Add `"internal"` to `PaymentMethod` type: `type PaymentMethod = "cod" | "vnpay" | "momo" | "internal"` **(F2 fix — frontend side)**
    2. **Change `shipping_address: ShippingAddress` to `shipping_address: ShippingAddress | null`** in `OrderResponse` and `CreateOrderResult` types **(F7 fix)**
    3. Add `InternalOrderInput` interface:
       ```typescript
       export interface InternalOrderInput {
         items: { garment_id: string; transaction_type: "buy"; size?: string }[];
         notes?: string;
       }
       ```
    4. Add `is_internal?: boolean` to `OrderListItem`
    5. Add `is_internal?: boolean` to `OrderListParams`

- [x] Task 6: Frontend Server Action — `createInternalOrder()` + `fetchGarmentsForInternalOrder()`
  - File: `frontend/src/app/actions/order-actions.ts`
  - Action:
    1. Add `createInternalOrder()` server action:
       ```typescript
       export async function createInternalOrder(orderData: InternalOrderInput) {
         const session = await auth();
         if (!session?.accessToken) throw new Error("Chưa đăng nhập");
         const res = await fetch(`${BACKEND_URL}/api/v1/orders/internal`, {
           method: "POST",
           headers: {
             Authorization: `Bearer ${session.accessToken}`,
             "Content-Type": "application/json",
           },
           body: JSON.stringify(orderData),
           cache: "no-store",
         });
         if (!res.ok) { /* error handling pattern from existing actions */ }
         const json = await res.json();
         return json.data;
       }
       ```
    2. Add `fetchGarmentsForInternalOrder()` server action **(F6 fix)** — authenticated, uses Owner's session token to ensure tenant isolation:
       ```typescript
       export async function fetchGarmentsForInternalOrder() {
         const session = await auth();
         if (!session?.accessToken) throw new Error("Chưa đăng nhập");
         const res = await fetch(`${BACKEND_URL}/api/v1/garments?status=available&page_size=100`, {
           headers: { Authorization: `Bearer ${session.accessToken}` },
           cache: "no-store",
         });
         if (!res.ok) throw new Error("Không thể tải danh sách sản phẩm");
         const json = await res.json();
         return json.data;
       }
       ```
       - **NOTE**: If existing garments endpoint does not support authenticated tenant resolution, create a new endpoint `GET /api/v1/orders/internal/garments` (OwnerOnly, tenant-scoped) that returns available garments with `sale_price` set. This is safer than depending on the public endpoint.

- [x] Task 7: Frontend — InternalOrderDialog component
  - File: `frontend/src/components/client/orders/InternalOrderDialog.tsx` (CREATE)
  - Action: Radix UI Dialog with form:
    - **Garment selection**: Multi-select from available garments fetched via `fetchGarmentsForInternalOrder()`. Each garment shows: name, category, sale_price, image thumbnail.
    - **Size selection**: Per-garment size dropdown from `size_options[]`
    - **Notes**: Optional textarea for production notes
    - **No shipping fields, no payment fields, no customer fields**
    - Submit → calls `createInternalOrder()` mutation → invalidates `["owner-orders"]` query
    - Loading state on submit button
    - Vietnamese labels: "Tạo đơn nội bộ", "Chọn sản phẩm", "Kích cỡ", "Ghi chú", "Tạo đơn"
  - Notes: Follow `TaskCreateDialog.tsx` pattern for Radix Dialog structure.

- [x] Task 8: Frontend — Wire InternalOrderDialog into OrderBoard
  - File: `frontend/src/components/client/orders/OrderBoardClient.tsx`
  - Action:
    1. Import `InternalOrderDialog`
    2. Add state `const [showInternalDialog, setShowInternalDialog] = useState(false)`
    3. Add "Tạo đơn nội bộ" button next to filters (Heritage Gold accent, factory icon)
    4. Render `<InternalOrderDialog open={showInternalDialog} onClose={...} />`
    5. Add TanStack Query mutation for `createInternalOrder` with `invalidateQueries(["owner-orders"])`

- [x] Task 9: Frontend — Add `is_internal` filter + badge to OrderTable
  - File: `frontend/src/components/client/orders/OrderFilters.tsx`
  - Action: Add "Loại đơn" filter toggle/select: "Tất cả" | "Đơn khách" | "Đơn nội bộ". Maps to `is_internal` query param.
  - File: `frontend/src/components/client/orders/OrderTable.tsx`
  - Action: In customer name cell, if `order.is_internal === true`, show badge "Nội bộ" (`bg-purple-100 text-purple-800`) next to customer name.

- [x] Task 10: Frontend — Handle null shipping_address across all components
  - File: `frontend/src/components/client/orders/OrderDetailDrawer.tsx`
  - Action: In the shipping address section, verify existing null check works with new `ShippingAddress | null` type. Add explicit "Đơn nội bộ — không giao hàng" message with info icon when `order.is_internal`.
  - File: `frontend/src/components/client/checkout/OrderConfirmation.tsx` **(F8 fix)**
  - Action: Line 33 `const { shipping_address: addr } = order;` → add null guard:
    ```typescript
    const addr = order.shipping_address;
    // In render: {addr && ( <shipping address display> )}
    // Or: show "Đơn nội bộ" message if !addr
    ```
  - Notes: `OrderConfirmation.tsx` is customer-facing checkout — internal orders should never appear here, but null guard prevents crashes if someone navigates directly via URL.

- [x] Task 11: Backend Tests — Internal order service tests + regression tests
  - File: `backend/tests/test_internal_order_service.py` (CREATE)
  - Action: Write tests following `test_order_board_service.py` pattern:
    1. `test_create_internal_order_success` — creates order with `is_internal=True`, status=`in_production`, payment=`paid`, shipping=null
    2. `test_create_internal_order_auto_fills_owner_info` — customer_name matches owner.full_name
    3. `test_create_internal_order_rejects_rent_items` — 422 for `transaction_type="rent"`
    4. `test_create_internal_order_allows_non_available_garment` — garment with status `rented` or `maintenance` is accepted **(F10 test)**
    5. `test_create_internal_order_requires_sale_price` — 422 for garment without sale_price
    6. `test_list_orders_filter_is_internal_true` — only internal orders returned
    7. `test_list_orders_filter_is_internal_false` — only customer orders returned
    8. `test_internal_order_appears_in_production_list` — internal order with `in_production` status shows up in production board query
    9. `test_internal_order_status_update_no_notification` — status update on internal order does NOT create notification **(F11 test)**
    10. `test_order_response_with_null_shipping_address` — serialization succeeds for internal order with null shipping **(F1 test)**
  - File: `backend/tests/test_order_service.py`
  - Action: **Run existing tests to verify `create_order()` refactor didn't break guest checkout** **(F9 fix)**. No new tests needed — just ensure all existing tests pass.

- [x] Task 12: Frontend Tests — InternalOrderDialog tests
  - File: `frontend/src/__tests__/InternalOrder.test.tsx` (CREATE)
  - Action: Jest + RTL tests:
    1. Dialog renders with garment list
    2. Submit button disabled when no garments selected
    3. Successful submission closes dialog
    4. "Nội bộ" badge renders on internal orders in table
    5. OrderDetailDrawer shows "Đơn nội bộ" instead of shipping address for internal orders
    6. OrderConfirmation handles null shipping_address without crash **(F8 test)**

### Acceptance Criteria

- [ ] AC1: Given Owner is on Order Board (`/owner/orders`), when Owner clicks "Tạo đơn nội bộ" button, then a dialog opens with garment selection form (no shipping/payment fields visible).

- [ ] AC2: Given Owner selects garments and submits the internal order dialog, when the form is submitted, then a new order is created with `is_internal=true`, `status="in_production"`, `payment_status="paid"`, `payment_method="internal"`, `shipping_address=null`, and `customer_name` auto-filled from Owner's profile.

- [ ] AC3: Given an internal order exists with status `in_production`, when Owner navigates to Production Board (`/owner/production`) and clicks "Giao việc mới", then the internal order appears in the order dropdown and can be assigned to a tailor.

- [ ] AC4: Given Owner is on Order Board, when Owner uses the "Loại đơn" filter, then can filter to show only internal orders, only customer orders, or all orders.

- [ ] AC5: Given an internal order is displayed in the Order Board table, when viewing the table, then the order shows a "Nội bộ" purple badge next to the customer name.

- [ ] AC6: Given Owner clicks on an internal order row, when the detail drawer opens, then it shows "Đơn nội bộ — không giao hàng" instead of shipping address, and all other order details display correctly.

- [ ] AC7: Given Owner tries to create an internal order with a garment that has no `sale_price`, when submitting, then a 422 error is returned with Vietnamese message.

- [ ] AC8: Given Owner tries to create an internal order with `transaction_type="rent"`, when submitting, then a 422 error is returned rejecting rent for internal orders.

- [ ] AC9: Given Owner creates an internal order with a garment that has `status="rented"`, when submitting, then the order is created successfully (availability check skipped for internal orders).

- [ ] AC10: Given an internal order's status is updated (e.g., `in_production → shipped`), when the update completes, then NO in-app notification is sent to the Owner.

- [ ] AC11: Given the Order Board lists orders, when both internal and customer orders exist, then ALL order list/detail endpoints serialize correctly with null `shipping_address` for internal orders (no 500 errors).

## Additional Context

### Dependencies

- Story 4.2 (Order Board) — done ✅ — provides base Order Board UI, list/filter/status endpoints
- Story 5.2 (Production Board) — review — provides "Giao việc mới" dialog that selects `in_production` orders
- No new npm/pip packages required
- New DB migration required (ALTER TABLE orders) — number **018**

### Testing Strategy

**Backend (pytest async):**
- Unit tests for `create_internal_order()` — success, validation errors, garment checks, availability skip
- Unit tests for `list_orders()` with `is_internal` filter
- Unit test for suppressed notification on internal order status update
- Unit test for `OrderResponse` serialization with null `shipping_address`
- **Regression tests**: Run ALL existing `test_order_service.py` tests after `create_order()` refactor
- Pattern: follow `test_order_board_service.py` fixtures and session setup

**Frontend (Jest + RTL):**
- Component test for `InternalOrderDialog` — render, validation, submit
- Component test for "Nội bộ" badge in `OrderTable`
- Component test for null shipping_address in `OrderDetailDrawer` and `OrderConfirmation`

**Manual Testing:**
1. Login as Owner → Order Board → Click "Tạo đơn nội bộ" → Select garments → Submit
2. Verify order appears in list with "Nội bộ" badge, status "In Production"
3. Navigate to Production Board → "Giao việc mới" → Verify internal order in dropdown
4. Assign task to tailor → Tailor completes → Order delivered = nhập kho
5. Filter by "Đơn nội bộ" / "Đơn khách" on Order Board
6. Verify NO notification when internal order status changes
7. Verify internal order with garment status "rented" is accepted

### Notes

- **Production Board integration**: Zero changes needed — `TaskCreateDialog` already queries `GET /api/v1/orders?status=in_production` which will naturally include internal orders.
- **Status transitions**: Internal orders follow same transition matrix from `in_production` forward: `in_production → shipped → delivered`. Owner can also cancel. The `pending → confirmed` steps are skipped at creation time only.
- **Future**: If inventory management is added later, the `delivered` status on internal orders can trigger inventory record creation.

### Adversarial Review Fixes Applied

| Finding | Severity | Fix Applied |
|---------|----------|-------------|
| F1: `OrderResponse.shipping_address` non-nullable crashes serialization | Critical | Task 2: Change to `ShippingAddress \| None = None` |
| F2: `PaymentMethod` missing `internal` breaks all order serialization | Critical | Task 2 + Task 5: Add to both backend enum and frontend type |
| F3: Migration `016` already exists | Critical | Task 1: Changed to `018` |
| F4: `OrderInfoForTask.shipping_address` required crashes tailor task | High | Task 2: Change to `dict \| None = None` in `tailor_task.py` |
| F5: Route ordering — `POST /internal` must be first | High | Task 4: Explicit instruction to place as first route |
| F6: Garment endpoint hardcoded tenant_id | High | Task 6: New `fetchGarmentsForInternalOrder()` authenticated server action |
| F7: TS type `shipping_address` not nullable | Medium | Task 5: Change to `ShippingAddress \| null` |
| F8: `OrderConfirmation.tsx` null crash | Medium | Task 10: Add null guard |
| F9: Refactor `create_order()` without regression tests | Medium | Task 11: Explicit instruction to run existing tests |
| F10: Availability check wrong for production orders | Medium | Task 3: `skip_availability_check=True` for internal orders; AC9 added |
| F11: Status notifications fire for internal orders | Low | Task 3: Suppress with `not _is_internal` guard; AC10 added |
| F12: Email template null shipping (safe by accident) | Low | No fix needed — existing code handles null |
| F13: Standalone boolean index useless | Low | Task 1: Composite `(tenant_id, is_internal)` index |
| F14: Frontend/backend type deploy ordering | Low | Warning #13 in Critical Warnings: deploy together |
