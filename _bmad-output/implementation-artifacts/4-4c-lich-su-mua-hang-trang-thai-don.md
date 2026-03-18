# Story 4.4c: Lịch sử mua hàng & Trạng thái đơn

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng,
I want xem lịch sử các đơn hàng đã đặt (mua và thuê) với trạng thái từng đơn và chi tiết giao hàng,
So that tôi có thể theo dõi các đơn hàng của mình và tải hoá đơn nếu cần.

## Acceptance Criteria

1. **AC1 — Order History Page Display:** Trang `/profile/orders` hiển thị danh sách các đơn hàng của khách hàng hiện tại dưới dạng Card Grid hoặc Table. Mỗi đơn hàng hiển thị: Mã Đơn, Ngày Đặt, Tổng Tiền, Trạng Thái, Loại (Mua/Thuê). Phân trang Server-side với 10 đơn/trang.

2. **AC2 — Order Status Badges:** Hiển thị badge với màu sắc tương ứng cho từng trạng thái: `Pending` (Vàng - Chờ xác nhận), `Confirmed` (Xanh dương - Đã xác nhận), `In Production` (Tím - Đang may), `Shipped` (Xanh lá - Đã gửi), `Delivered` (Xanh - Đã giao), `Cancelled` (Đỏ - Hủy), `Returned` (Xám - Đã trả).

3. **AC3 — Order Detail Modal:** Khi click vào một đơn hàng, mở Modal hoặc Page hiển thị chi tiết đơn:
   - Mã đơn, ngày đặt, trạng thái
   - Danh sách sản phẩm (Ảnh thumbnail, tên, số lượng, giá đơn vị, subtotal)
   - Thông tin giao hàng (Tên, Địa chỉ, Số điện thoại, Ghi chú)
   - Tổng tiền (Subtotal, Phí vận chuyển, Tổng cộng)
   - Timeline Trạng thái (Pending → Confirmed → ... → Delivered) với dấu thời gian

4. **AC4 — Rental-Specific Fields:** Nếu đơn là loại Thuê (Order Type = "rental"):
   - Ngày thuê (Start Date) và Ngày trả dự kiến (Expected Return Date)
   - Trạng thái Trả: "Pending Return" (chưa trả), "Returned" (đã trả), "Overdue" (quá hạn)
   - Phí lategame/phí bồi thường nếu có

5. **AC5 — Download Invoice PDF:** Nút "Tải Hoá Đơn" trên Order Detail:
   - Gọi `GET /api/v1/orders/{order_id}/invoice` (Server Action)
   - Backend sinh PDF từ template Jinja2 + `reportlab` hoặc `weasyprint`
   - PDF chứa: Mã đơn, ngày, khách hàng, danh sách sản phẩm, tổng tiền, logo tiệm
   - Tên file: `order_{order_id}_invoice.pdf`

6. **AC6 — Filter & Search (Optional):** Bộ lọc nhanh để tìm đơn hàng:
   - Lọc theo Trạng thái (dropdown)
   - Lọc theo Loại (Mua / Thuê)
   - Lọc theo Khoảng ngày (Date range)
   - Tìm kiếm theo Mã Đơn

7. **AC7 — Responsive Design:** Thiết kế Mobile-first, tương thích tablet/desktop. Card Grid trên mobile (1 cột), table trên desktop (2+ cột). Tuân thủ Heritage Palette Boutique Mode.

8. **AC8 — No Orders State:** Nếu khách hàng chưa có đơn nào, hiển thị thông báo "Chưa có đơn hàng nào. Hãy bắt đầu mua sắm!" với nút CTA quay về Showroom.

## Tasks / Subtasks

- [x] Task 1: Backend — Order History & Invoice Endpoints (AC: #1, #2, #3, #5)
  - [x] 1.1: Tạo `backend/src/api/v1/order_customer.py` — New router cho customer order endpoints
  - [x] 1.2: `GET /api/v1/customer/orders` — Trả danh sách đơn hàng của customer hiện tại (pagination, sorting, filtering)
    - Query params: `page`, `limit`, `status`, `order_type`, `date_from`, `date_to`
    - Response: `{ data: [...], meta: { total, page, limit } }`
    - Note: prefix `/api/v1/customer/orders` (not `/api/v1/orders`) to avoid conflict with existing owner endpoints
  - [x] 1.3: `GET /api/v1/customer/orders/{order_id}` — Trả chi tiết 1 đơn hàng (với timeline status)
  - [x] 1.4: `GET /api/v1/customer/orders/{order_id}/invoice` — Sinh và trả printable HTML invoice (browser print → PDF)
    - Note: reportlab/weasyprint not in requirements.txt → implemented as HTML invoice (no new deps needed)
    - Header: Logo tiệm, địa chỉ. Body: mã đơn, khách, sản phẩm, tổng tiền. Footer: cảm ơn. Print button included.
  - [x] 1.5: Tạo Pydantic models trong `backend/src/models/order_customer.py`: `CustomerOrderSummary`, `CustomerOrderDetail`, `CustomerOrderItemResponse`, `OrderTimelineEntry`
  - [x] 1.6: Register router trong `backend/src/main.py`

- [x] Task 2: Backend — Order Service & Query Logic (AC: #1, #2, #3, #4, #6)
  - [x] 2.1: Tạo `backend/src/services/order_customer_service.py` với các method:
    - `get_customer_orders(customer_id, filters, pagination)` — query với join OrderItems, GarmentDB, timeline synthesis
    - `get_order_detail(order_id, customer_id)` — validate customer ownership, trả detail đầy đủ
    - `_build_timeline(status, created_at, updated_at)` — synthetic timeline generation
  - [x] 2.2: Implement filter logic:
    - Filter status: `WHERE OrderDB.status == ?`
    - Filter order_type: `WHERE order_type IN ('buy', 'rental')`
    - Filter date_from/date_to: `WHERE created_at >= ? AND created_at <= ?`
    - Search: `WHERE id LIKE ?`

- [x] Task 3: Backend — Invoice HTML Generation (AC: #5)
  - [x] 3.1: Implemented inline HTML template in `backend/src/services/invoice_service.py`
    - No Jinja2 template file needed — uses Python f-strings for template rendering
    - Styled HTML invoice with CSS print media query
  - [x] 3.2: Tạo `backend/src/services/invoice_service.py` với method `generate_invoice_html(order_detail)`
    - Renders complete styled HTML document
  - [x] 3.3: Implement trong endpoint: fetch order, generate HTML, return as text/html download

- [x] Task 4: Backend Tests (AC: #1, #2, #3, #5)
  - [x] 4.1: `backend/tests/test_order_customer_api.py` — 11 tests: 11/11 PASS
    - GET orders: success, empty (other customer), unauthorized
    - GET orders: filter by status, filter by type (buy), filter by type (rental)
    - GET order detail: success, not found, unauthorized (different customer)
    - GET invoice: success (HTML), not found
  - [x] 4.2: Test invoice generation: verified HTML contains HÓA ĐƠN and customer data

- [x] Task 5: Frontend Types & Schemas (AC: #1, #2, #3, #4, #6)
  - [x] 5.1: Thêm types trong `frontend/src/types/order.ts`:
    - `CustomerOrderSummary`, `CustomerOrderDetail`, `CustomerOrderItem`, `OrderTimelineEntry`
    - `CustomerOrderDeliveryInfo`, `CustomerOrderListMeta`, `CustomerOrderListResponse`
  - [x] 5.2: Added TypeScript union types for status and enums (no Zod, matching existing project patterns)

- [x] Task 6: Frontend Server Actions (AC: #1, #3, #5, #6)
  - [x] 6.1: Added to `frontend/src/app/actions/order-actions.ts` — 3 Server Actions:
    - `getCustomerOrders(filters?, pagination?)` — Call `GET /api/v1/customer/orders`
    - `getCustomerOrderDetail(orderId)` — Call `GET /api/v1/customer/orders/{orderId}`
    - `downloadOrderInvoice(orderId)` — Call `GET /api/v1/customer/orders/{orderId}/invoice`, returns HTML
  - [x] 6.2: Follow pattern từ `profile-actions.ts`: session auth token, Bearer auth, AbortController timeout 10s
  - [x] 6.3: Return type: `{ success: boolean, data?: T, error?: string }`

- [x] Task 7: Frontend — Order History Page (AC: #1, #2, #6, #7)
  - [x] 7.1: Rewrite `frontend/src/app/(customer)/profile/orders/page.tsx` — Server Component
  - [x] 7.2: Fetch customer orders via `getCustomerOrders()` Server Action
  - [x] 7.3: `OrdersClient.tsx` renders order grid/list with:
    - Order card showing: mã đơn, ngày, tổng tiền, status badge, loại (Mua/Thuê)
    - Pagination controls (previous/next), Mobile card + Desktop table
    - Filter dropdown (status, order_type)
  - [x] 7.4: "No orders" state (AC8): message + CTA button "Khám phá Showroom"

- [x] Task 8: Frontend — Order Detail Modal/Page (AC: #3, #4, #5)
  - [x] 8.1: Tạo `frontend/src/components/client/orders/OrderDetailModal.tsx` — "use client" component
    - Props: `order`, `isOpen`, `onClose`
  - [x] 8.2: Content sections: Header (mã đơn, status badge, ngày), Items table, Delivery info, Pricing summary, Timeline
  - [x] 8.3: For rental orders (AC4): rental date range + rental_status label
  - [x] 8.4: "Tải Hoá Đơn" button → Server Action → opens invoice HTML in new tab

- [x] Task 9: Frontend — Order Status Badge Component (AC: #2)
  - [x] 9.1: Tạo `frontend/src/components/client/orders/OrderStatusBadge.tsx`
    - Heritage Palette colors for all statuses including returned/overdue
    - Also exports `OrderTypeBadge` for buy/rental/mixed

- [x] Task 10: Frontend Tests (AC: ALL)
  - [x] 10.1: `frontend/src/__tests__/OrderHistoryPage.test.tsx` — 8 tests: 8/8 PASS
  - [x] 10.2: `frontend/src/__tests__/OrderDetailModal.test.tsx` — 8 tests: 8/8 PASS
  - [x] 10.3: `frontend/src/__tests__/orderActions.test.ts` — 6 new customer tests + existing 10: all PASS
  - [x] 10.4: `frontend/src/__tests__/OrderStatusBadge.test.tsx` — 11 tests: 11/11 PASS

### Review Follow-ups (AI)

- [x] [AI-Review][High] XSS vulnerability in invoice HTML: user-supplied fields (recipient_name, phone, address, notes, garment_name) interpolated without html.escape() [backend/src/services/invoice_service.py:247-250]
- [x] [AI-Review][High] `status` query parameter accepts any arbitrary string with no enum/pattern validation, inconsistent with owner endpoint which uses OrderStatus enum [backend/src/api/v1/order_customer.py:35]
- [x] [AI-Review][High] Search filter uses `OrderDB.id.cast(type_=None)` which is undefined behavior (works on SQLite but will fail on PostgreSQL); also search term not escaped for LIKE wildcards [backend/src/services/order_customer_service.py:199-206]
- [x] [AI-Review][Med] Duplicate `formatCurrency` and `formatDate` utility functions in OrdersClient.tsx and OrderDetailModal.tsx — extract to shared utils [frontend/src/app/(customer)/profile/orders/OrdersClient.tsx:31-45, frontend/src/components/client/orders/OrderDetailModal.tsx:19-43]
- [x] [AI-Review][Med] `_build_timeline` silently defaults unknown statuses to index 0 (pending only) instead of showing actual current status [backend/src/services/order_customer_service.py:92]
- [x] [AI-Review][Med] `from sqlalchemy import func` imported inside function body instead of module top-level [backend/src/services/order_customer_service.py:209]
- [x] [AI-Review][Med] `or_()` wrapper around single condition is dead code — remove or add missing search conditions [backend/src/services/order_customer_service.py:202-206]
- [x] [AI-Review][Med] Unused imports: `Decimal` and `and_` never referenced [backend/src/services/order_customer_service.py:8-9,13]
- [x] [AI-Review][Low] AC4 "Pending Return" maps to rental_status='active' but label shows "Đang thuê" not "Chưa trả" — minor AC deviation [frontend/src/components/client/orders/OrderDetailModal.tsx:59]
- [x] [AI-Review][Low] AC6 date range filter and order number search supported by backend but not exposed in frontend UI (AC6 is Optional) [frontend/src/app/(customer)/profile/orders/OrdersClient.tsx]

## Senior Developer Review (AI)

**Review Date:** 2026-03-18
**Reviewer Model:** claude-opus-4-6
**Review Outcome:** Changes Requested

**Summary:** Implementation is structurally sound with good test coverage (11 backend + 45 frontend tests passing). Code follows project patterns well. However, 3 HIGH severity security/correctness issues must be addressed before merge: XSS in invoice HTML, missing input validation on status param, and broken UUID cast in search filter.

**Action Items:**
- [ ] H1: Escape user-supplied data in invoice HTML with `html.escape()` (Security)
- [ ] H2: Add OrderStatus enum validation to `status` query param (Input Validation)
- [ ] H3: Fix `cast(type_=None)` to `cast(String)` and escape LIKE wildcards (Correctness)
- [ ] M1: Extract duplicate formatCurrency/formatDate to shared utils (DRY)
- [ ] M2: Handle unknown statuses in `_build_timeline` gracefully (Robustness)
- [ ] M3: Move `func` import to module top-level (Convention)
- [ ] M4: Remove unnecessary `or_()` wrapper (Dead Code)
- [ ] M5: Remove unused `Decimal` and `and_` imports (Cleanup)
- [ ] L1: Map rental_status 'active' label to "Chưa trả" per AC4 wording (AC Compliance)
- [ ] L2: Consider exposing date range / search in frontend UI (Optional AC6)

**Severity Breakdown:** 3 High, 5 Medium, 2 Low — Total: 10 action items

## Dev Notes

### Architecture Pattern: Order History & Retrieval

```
Customer opens /profile/orders
  → Server Component calls getCustomerOrders() Server Action
  → Server Action calls getAuthToken() + fetch /api/v1/orders (Bearer JWT)
  → Backend validates JWT, queries orders filtered by customer_id
  → Frontend renders Order cards + pagination
  → User clicks order → Modal opens, calls getOrderDetail()
  → Modal shows detail + timeline
  → User clicks "Download Invoice" → calls downloadOrderInvoice()
  → Server Action streams PDF blob to browser download
```

### Existing Code to Reuse (DO NOT Reinvent)

| What | Where | How to Reuse |
|------|-------|-----:|
| Auth session | `frontend/src/auth.ts` | `await auth()` → `session.accessToken` for Server Actions |
| Server Action pattern | `frontend/src/app/actions/profile-actions.ts` | `getAuthToken()` helper, Bearer auth, timeout, error handling |
| DB query patterns | `backend/src/services/` | existing services like `rental_service.py`, `product_service.py` |
| Order model | `backend/src/models/db_models.py` | OrderDB table with foreign keys: customer_id, payment_status, delivery_address |
| Order API patterns | `backend/src/api/v1/rental_tracking.py` | Similar endpoint structure, response format |
| Component patterns | `frontend/src/components/client/` | existing Profile, Product Detail components for structure |
| Modal pattern | `frontend/src/components/` | use existing modal/dialog patterns from project |
| PDF generation | `backend/src/services/` | check if invoice/PDF service exists, reuse or create new |
| Pagination | `frontend/src/components/` | existing pagination component if available |
| Status badges | `frontend/src/components/` | check for existing badge components |
| Responsive grid | `frontend/src/components/` | existing grid layout patterns from Product listings |

### Backend API Design

```
# New router: /api/v1/orders (customer-specific)
# File: backend/src/api/v1/order_customer.py

GET /api/v1/orders
  Auth: Bearer JWT (any authenticated customer)
  Query params: page=1, limit=10, status=?, order_type=?, date_from=?, date_to=?
  Response 200: {
    "data": [
      {
        "order_id": "uuid",
        "order_number": "ORD-20260318-001",
        "customer_id": "uuid",
        "total_amount": 1500000,
        "order_status": "delivered",
        "order_type": "buy",
        "created_at": "2026-03-18T10:00:00Z",
        "items": [
          {
            "product_id": "uuid",
            "product_name": "Áo dài lụa xanh",
            "quantity": 1,
            "unit_price": 1500000,
            "subtotal": 1500000,
            "image_url": "/products/..."
          }
        ],
        "delivery_info": {
          "recipient_name": "Nguyễn Linh",
          "phone": "0931234567",
          "address": "123 Nguyễn Huệ, Q.1, TP.HCM",
          "notes": ""
        }
      }
    ],
    "meta": {
      "total": 15,
      "page": 1,
      "limit": 10
    }
  }

GET /api/v1/orders/{order_id}
  Auth: Bearer JWT
  Response 200: {
    "data": {
      ...order detail
      "timeline": [
        { "status": "pending", "timestamp": "2026-03-18T10:00:00Z", "description": "Đơn hàng được tạo" },
        { "status": "confirmed", "timestamp": "2026-03-18T10:30:00Z", "description": "Đơn hàng được xác nhận" },
        ...
      ]
    },
    "meta": {}
  }

GET /api/v1/orders/{order_id}/invoice
  Auth: Bearer JWT
  Response 200: Binary PDF file
  Headers: Content-Type: application/pdf, Content-Disposition: attachment; filename=order_{order_id}_invoice.pdf
```

### Frontend Server Action Patterns

```typescript
// Order Actions (frontend/src/app/actions/order-actions.ts)
import { auth } from "@/auth";

async function getAuthToken() {
  const session = await auth();
  if (!session?.accessToken) throw new Error("Unauthorized");
  return session.accessToken;
}

export async function getCustomerOrders(
  filters?: OrderFilter,
  pagination?: { page: number; limit: number }
) {
  try {
    const token = await getAuthToken();
    const params = new URLSearchParams();
    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }
    if (filters?.status) params.append("status", filters.status);
    if (filters?.order_type) params.append("order_type", filters.order_type);
    // ... more filter params

    const response = await fetch(
      `${process.env.BACKEND_URL}/api/v1/orders?${params}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }
    );

    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const json = await response.json();
    return { success: true, data: json.data, meta: json.meta };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

export async function downloadOrderInvoice(orderId: string) {
  try {
    const token = await getAuthToken();
    const response = await fetch(
      `${process.env.BACKEND_URL}/api/v1/orders/${orderId}/invoice`,
      {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      }
    );

    if (!response.ok) throw new Error("Failed to download invoice");
    const blob = await response.blob();

    // Client-side download trigger
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `order_${orderId}_invoice.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}
```

### Order Status Flow

```
Pending (Chờ xác nhận) — Orange/Yellow badge
  ↓
Confirmed (Đã xác nhận) — Blue badge
  ↓
In Production (Đang may) — Purple badge [only for 'buy' type]
  ↓
Shipped (Đã gửi) — Green badge
  ↓
Delivered (Đã giao) — Teal badge

Cancelled (Hủy) — Red badge [can happen at any stage]

[For Rental Type]
Returned (Đã trả) — Gray badge
Overdue (Quá hạn) — Dark red badge
```

### Design: Heritage Palette (Boutique Mode)

- **Background:** `bg-gray-50` (page), `bg-white` (cards)
- **Primary accent:** Indigo (`text-indigo-600`, `border-indigo-600`)
- **Section title:** `font-serif font-bold text-gray-900` (Cormorant Garamond)
- **Table header:** `bg-gray-100 text-gray-700 font-semibold`
- **Status badges:**
  - Pending: `bg-yellow-50 text-yellow-700 border border-yellow-200`
  - Confirmed: `bg-blue-50 text-blue-700 border border-blue-200`
  - In Production: `bg-purple-50 text-purple-700 border border-purple-200`
  - Shipped: `bg-green-50 text-green-700 border border-green-200`
  - Delivered: `bg-cyan-50 text-cyan-700 border border-cyan-200`
  - Cancelled: `bg-red-50 text-red-700 border border-red-200`
  - Returned: `bg-gray-100 text-gray-700 border border-gray-300`
- **Timeline line:** `border-l-2 border-indigo-300`, circle dots `w-3 h-3 rounded-full bg-indigo-600`
- **Button primary:** `bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-6 py-2.5`
- **Table rows:** alternate `bg-white` and `bg-gray-50` for striping

### Anti-Patterns (DO NOT)

1. **DO NOT** create new npm packages for PDF download — use browser's native `fetch` + `Blob` + file download
2. **DO NOT** fetch invoice data on every page render — implement caching/memoization
3. **DO NOT** duplicate customer_id validation — backend must validate JWT ownership
4. **DO NOT** hardcode order status strings — use enums
5. **DO NOT** make invoice download synchronous — use Server Action with async/await
6. **DO NOT** render full order history without pagination — implement server-side pagination
7. **DO NOT** expose order IDs in URLs without validating customer ownership — backend checks customer_id from JWT
8. **DO NOT** use inline PDF generation on frontend — backend generates PDF with templates
9. **DO NOT** forget to add Bearer token to invoice download request — all authenticated endpoints need auth header
10. **DO NOT** log sensitive data (customer addresses, payment info) — use minimal logging

### Previous Story 4.4b Learnings (Apply Here)

| Learning | Application to 4.4c |
|----------|---------------------|
| Server Component for data fetching | Fetch orders at page level (Server Component), pass via props to client components |
| useEffect cleanup patterns | If using any timers/intervals in client components, add proper cleanup |
| Inline toast for notifications | Reuse same toast pattern for success/error messages (e.g., "Invoice downloaded", "Failed to load orders") |
| Heritage Palette colors | Use exact color scheme for badges, timeline, buttons |
| Avoid new dependencies | No new npm packages; use browser APIs + existing tailwind |
| Auth token handling | getAuthToken() helper → Bearer auth → error handling |
| Validation patterns | Zod for frontend validation, Pydantic for backend |

### Backend Testing Patterns

- Use inline fixtures with in-memory SQLite (`sqlite+aiosqlite:///:memory:`)
- Follow `test_order_customer_api.py` pattern from existing tests
- Mock `CurrentUser` dependency for testing
- Use `httpx.AsyncClient` with `ASGITransport` for API testing
- Create seed fixtures for test data (orders, customers, items)

### Frontend Testing Patterns

- Mock `auth()` from `@/auth` to provide test token
- Mock Server Actions with jest.mock
- Use React Testing Library for component tests
- Assert Vietnamese text for all UI strings
- Test responsive behavior: mobile (375px), tablet (768px), desktop (1024px+)

### Project Structure Notes

- Backend new files: `backend/src/api/v1/order_customer.py`, `backend/src/services/order_service.py`, `backend/src/services/invoice_service.py`, `backend/src/models/order.py`
- Frontend Client Components: `frontend/src/components/client/orders/OrderDetailModal.tsx`, `OrderStatusBadge.tsx`
- Frontend Server Component: `frontend/src/app/(customer)/profile/orders/page.tsx`
- Frontend Server Actions: `frontend/src/app/actions/order-actions.ts`
- Frontend Types: `frontend/src/types/order.ts`
- Backend Templates: `backend/src/templates/order_invoice.html`
- Tests: `backend/tests/test_order_customer_api.py`, `frontend/src/__tests__/OrderHistoryPage.test.tsx`, etc.

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4, Story 4.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#E-commerce & Order Processing]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR45-FR54 Order & Payment Management]
- [Source: _bmad-output/implementation-artifacts/4-4b-thong-tin-ca-nhan-bao-mat.md — Previous story patterns and learnings]
- [Source: _bmad-output/implementation-artifacts/4-4a-customer-profile-layout-navbar-icon.md — Profile page structure]
- [Source: backend/src/api/v1/rental_tracking.py — Similar endpoint patterns]
- [Source: frontend/src/app/actions/profile-actions.ts — Server Action pattern]
- [Source: frontend/src/types/customer.ts — Type definition patterns]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]

## Dev Agent Record

### Agent Model Used

claude-haiku-4-5-20251001 (2026-03-18) — Story creation & context compilation
claude-sonnet-4-6 (2026-03-18) — Story initial implementation
claude-haiku-4-5-20251001 (2026-03-18) — Code review fixes & refinement

### Debug Log References

Fixed 10 code review action items (2026-03-18 14:20):
- H1: Added html.escape() for XSS protection in invoice HTML
- H2: Added OrderStatus enum validation for status query parameter
- H3: Fixed SQLAlchemy cast() and LIKE escape for search filter
- M1: Extracted formatCurrency/formatDate to shared utils (frontend/src/utils/order-formatters.ts)
- M2: Handle unknown statuses gracefully in _build_timeline
- M3: Moved func import to module top-level
- M4: Removed unnecessary or_() wrapper
- M5: Removed unused Decimal and and_ imports
- L1: Updated rental status label from "Đang thuê" to "Chưa trả"
- L2: Added date range and search filter UI controls to frontend

### Completion Notes List

**Initial Implementation (2026-03-18, first 11 backend + 33 frontend tests):**
- Implemented customer order history with full pagination, filtering (status, type), and detail modal
- Used prefix `/api/v1/customer/orders` (not `/api/v1/orders`) to avoid conflict with existing owner-only endpoints
- Invoice implemented as printable HTML (browser print → PDF) instead of server-side PDF generation because `reportlab`/`weasyprint` are not in requirements.txt — avoids adding new dependencies
- Synthetic timeline generated from `order.status` + `created_at`/`updated_at` (no status history table exists in DB)
- `order_number` formatted as `ORD-{YYYYMMDD}-{first 6 chars of UUID}` since OrderDB has no `order_number` column
- Extended existing `StatusBadge.tsx` pattern with new `OrderStatusBadge.tsx` including `returned` and `overdue` rental statuses

**Code Review Fixes (2026-03-18, all 10 action items addressed):**
- Security: Added html.escape() for user-supplied fields in invoice HTML (H1)
- Input Validation: Added OrderStatus enum validation for status query parameter (H2)
- Database: Fixed SQLAlchemy cast(type_=String) and escape LIKE wildcards for search (H3)
- Refactoring: Extracted duplicate formatters to shared utils module (M1)
- Robustness: Enhanced _build_timeline to handle unknown statuses gracefully (M2)
- Code Quality: Moved func import to module top-level, removed unused imports, removed dead code (M3-M5)
- UX: Fixed rental status label "Chưa trả" per AC4, added date range & search UI filters for AC6 (L1-L2)

**Test Results:**
- Backend: 11/11 tests PASS ✓
- Frontend: 45/45 tests PASS ✓ (17 orderActions, 8 OrderHistoryPage, 8 OrderDetailModal, 11 OrderStatusBadge, 1 existing)
- No regressions; all changes backward-compatible

### File List

**New files (initial implementation):**
- `backend/src/api/v1/order_customer.py`
- `backend/src/models/order_customer.py`
- `backend/src/services/order_customer_service.py`
- `backend/src/services/invoice_service.py`
- `backend/tests/test_order_customer_api.py`
- `frontend/src/app/(customer)/profile/orders/OrdersClient.tsx`
- `frontend/src/components/client/orders/OrderDetailModal.tsx`
- `frontend/src/components/client/orders/OrderStatusBadge.tsx`
- `frontend/src/__tests__/OrderHistoryPage.test.tsx`
- `frontend/src/__tests__/OrderDetailModal.test.tsx`
- `frontend/src/__tests__/OrderStatusBadge.test.tsx`

**New files (review fixes):**
- `frontend/src/utils/order-formatters.ts` — shared formatting utilities (M1)

**Modified files (initial implementation):**
- `backend/src/main.py` — added `order_customer_router`
- `frontend/src/types/order.ts` — added customer-facing types
- `frontend/src/app/actions/order-actions.ts` — added `getCustomerOrders`, `getCustomerOrderDetail`, `downloadOrderInvoice`
- `frontend/src/app/(customer)/profile/orders/page.tsx` — rewritten as Server Component
- `frontend/src/__tests__/orderActions.test.ts` — extended with customer action tests

**Modified files (review fixes):**
- `backend/src/services/invoice_service.py` — added html.escape() for XSS protection (H1)
- `backend/src/api/v1/order_customer.py` — added OrderStatus enum validation (H2)
- `backend/src/services/order_customer_service.py` — fixed SQLAlchemy cast, LIKE escaping, imports, timeline handling (H3, M2-M5)
- `frontend/src/app/(customer)/profile/orders/OrdersClient.tsx` — use shared formatters, add date/search filters (M1, L2), fixed typo
- `frontend/src/components/client/orders/OrderDetailModal.tsx` — use shared formatters, fix rental status label (M1, L1)
- `frontend/src/__tests__/OrderHistoryPage.test.tsx` — extended test mocks for formatters

**No changes to sprint-status.yaml** — status remains in-progress until user confirms review is complete

### Change Log

- 2026-03-18 [14:20]: Code review fixes completed — All 10 action items (3H/5M/2L) resolved. Security, validation, database, and UX improvements. 11 backend + 45 frontend tests all passing.
- 2026-03-18 [04:20]: Story 4.4c implemented — Customer Order History & Status, Invoice Download. 10 new files created, 6 modified. Initial test run: 11 backend + 33 frontend tests.

