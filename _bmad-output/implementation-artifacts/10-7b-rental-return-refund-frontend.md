# Story 10.7b: Rental Return & Refund — Frontend (Order Board + Customer View)

Status: done

> 🧩 **Split from Story 10.7** (2026-06-08). Backend (transitions + `refund-security`) is **done**
> in 10.7. This story builds the frontend half — owner Order Board controls and the customer
> rental view — covering **AC#5 and AC#6** of the original 10.7.
> **Scope:** cash-only (COD + in-store cash). NO payment gateway — "Hoàn cọc" is the Owner
> confirming cash handed back, or the CCCD card returned. See [[payment-scope-cash-only]].

## Story

As a Chủ tiệm (Owner),
I want các nút điều khiển vòng đời thuê và hoàn cọc ngay trên Order Board, cùng với màn hình cho khách xem tình trạng thuê/cọc,
So that tôi vận hành được quy trình trả thuê + hoàn cọc tiền mặt mà backend đã hỗ trợ, và khách theo dõi được đơn thuê của mình.

## Acceptance Criteria

1. **Owner Order Board — chuyển trạng thái vòng đời thuê (AC#6)**
   - Given một đơn Thuê (`service_type='rent'`) ở `delivered`
   - When Owner xem Order Board
   - Then nút "Khách đang thuê" hiển thị (delivered→renting); ở `renting` hiện nút "Xác nhận đã trả" (renting→returned); ở `returned` hiện nút "Hoàn cọc"; ở các trạng thái này badge trạng thái hiển thị đúng (Đang thuê / Đã trả đồ / Hoàn tất).
   - And các nút này dùng `order.next_valid_status` từ backend (đã trả đúng nhờ fix 10.7), không tự suy luận transition ở client.

2. **Owner — hoàn cọc với lựa chọn tình trạng (AC#3 UI / AC#6)**
   - Given đơn ở `returned`
   - When Owner bấm "Hoàn cọc"
   - Then mở modal chọn tình trạng: **Tốt** (Good) / **Hỏng** (Damaged) / **Thất lạc** (Lost), kèm mô tả ngắn mức hoàn (Tốt/Hỏng = hoàn 100% cọc tiền mặt; Thất lạc = không hoàn).
   - And khi xác nhận, gọi server action → `POST /api/v1/orders/{id}/refund-security` với `{condition}`.
   - And với cọc **CCCD**, UI nói rõ "trả lại giấy tờ" thay vì hiển thị số tiền.

3. **Owner — phản hồi sau hoàn cọc**
   - Given hoàn cọc thành công
   - When server action trả về
   - Then hiện toast: cọc tiền mặt → "Đã hoàn cọc: {refund_amount} đ"; CCCD → "Đã trả lại giấy tờ cho khách". Danh sách đơn được làm mới (invalidate query) và badge tình trạng (Tốt/Hỏng/Thất lạc) hiển thị trên đơn.
   - And nếu backend trả `already_processed=true` (gọi lặp), KHÔNG báo lỗi — hiện thông báo trung tính "Cọc đơn này đã được hoàn trước đó".

4. **Owner — badge tình trạng trả đồ**
   - Given đơn `returned`/`completed` đã có `rental_condition`
   - When Order Board hiển thị
   - Then có badge: Tốt (xanh) / Hỏng (vàng) / Thất lạc (đỏ).

5. **Khách — màn hình chi tiết đơn thuê (AC#5)**
   - Given khách xem chi tiết một đơn Thuê ở trang Profile
   - When màn hình hiển thị
   - Then có **timeline trạng thái** thuê: delivered → renting → returned → completed (đánh dấu bước hiện tại); hiện **ngày hẹn trả** (`return_date`); và **khối thông tin cọc**: loại (CCCD / Tiền mặt), giá trị, trạng thái hoàn (Chưa hoàn / Đã hoàn), số tiền hoàn nếu có, và tình trạng trả đồ nếu có.

6. **Ngôn ngữ thuần Việt, không thuật ngữ kỹ thuật**
   - Mọi chữ hướng khách/owner dùng tiếng Việt rõ ràng (Tốt/Hỏng/Thất lạc, "Hoàn cọc", "Đang thuê"…), không lộ enum tiếng Anh hay thuật ngữ. Xem [[customer-copy-plain-vietnamese]].

## Tasks / Subtasks

> 📌 **Scope note (2026-06-08, approved by Lem):** AC#4/#5 need rental/security fields the
> backend responses didn't expose. Approved a small **additive** backend change (read-only field
> exposure — no logic change) added as Task 0 below. Reviewed together with this story.

- [x] **Task 0: Backend — expose read-only rental/security fields (additive)** (AC: #4, #5)
  - [x] 0.1 `OrderListItem` (`backend/src/models/order.py`) += `rental_condition`, `security_type`, `security_value` (all `str | None = None`); populate in `list_orders` builder (`order_service.py`).
  - [x] 0.2 `CustomerOrderDetail` (`backend/src/models/order_customer.py`) += `service_type`, `security_type`, `security_value`, `return_date`, `rental_condition`, `security_refund_amount` (Decimal|None); populate in `get_order_detail` (`order_customer_service.py`), querying the refunded `OrderPaymentDB` row for the amount.
  - [x] 0.3 Backend tests for the new fields (board list item + customer detail).

- [x] **Task 1: Types** (`frontend/src/types/order.ts`) (AC: #2, #5)
  - [x] 1.1 Thêm `RentalCondition` (`"Good" | "Damaged" | "Lost"`) + nhãn Việt (Tốt/Hỏng/Thất lạc).
  - [x] 1.2 Thêm `RefundSecurityRequest` (`{ condition: RentalCondition }`) và `RefundSecurityResponse` (`order_id, refund_amount, security_type, original_amount, condition, already_processed`).
  - [x] 1.3 Bổ sung các field thuê vào type đơn nếu thiếu: `rental_condition`, `rental_started_at`, `returned_at` (OrderStatus đã có `renting/returned/completed`; `security_type/value` đã có — KHÔNG trùng lặp).

- [x] **Task 2: Server action** (`frontend/src/app/actions/order-actions.ts`) (AC: #2, #3)
  - [x] 2.1 Thêm `refundSecurity(orderId, condition)` gọi `POST /api/v1/orders/{orderId}/refund-security` body `{condition}`, theo đúng khuôn các action hiện có (auth header, `unwrap data`, xử lý lỗi). Tái dùng `updateOrderStatus` (đã có) cho các transition delivered→renting→returned→completed — KHÔNG viết lại.
  - [x] 2.2 Trả về `RefundSecurityResponse`; bề mặt `already_processed` cho UI.

- [x] **Task 3: Order Board — nút vòng đời + badge** (`OrderBoardClient.tsx`, `OrderTable.tsx`) (AC: #1, #4)
  - [x] 3.1 Thêm nhãn vào `NEXT_STATUS_LABELS` (OrderTable): delivered→renting "Khách đang thuê", renting→returned "Xác nhận đã trả", returned→completed "Hoàn tất". (Badge trạng thái ở `StatusBadge.tsx` đã có renting/returned/completed — chỉ kiểm tra, không thêm lại.)
  - [x] 3.2 Thêm `RentalConditionBadge` (Tốt=xanh/Hỏng=vàng/Thất lạc=đỏ) hiển thị khi `rental_condition` có giá trị.
  - [x] 3.3 Với đơn `returned`: hiện nút "Hoàn cọc" (mở modal Task 4) cạnh/thay cho nút next-status.

- [x] **Task 4: Modal chọn tình trạng + hoàn cọc** (`OrderBoardClient.tsx` + component modal) (AC: #2, #3)
  - [x] 4.1 Modal 3 lựa chọn (Tốt/Hỏng/Thất lạc) + mô tả mức hoàn; nếu `security_type='cccd'` đổi nội dung sang "trả lại giấy tờ".
  - [x] 4.2 Xác nhận → gọi `refundSecurity()`; loading state; đóng modal.
  - [x] 4.3 Toast theo `refund_amount`/`security_type`; xử lý `already_processed` (thông báo trung tính, không lỗi); `invalidateQueries` cho danh sách đơn.

- [x] **Task 5: Màn hình khách — đơn thuê** (`OrderDetailModal.tsx` / `OrderDetailDrawer.tsx` / `(customer)/profile/orders`) (AC: #5)
  - [x] 5.1 Timeline trạng thái thuê (delivered→renting→returned→completed) với chỉ báo bước hiện tại.
  - [x] 5.2 Hiện `return_date` (ngày hẹn trả).
  - [x] 5.3 Khối thông tin cọc: loại (CCCD/Tiền mặt), giá trị, trạng thái hoàn, số tiền hoàn, tình trạng trả đồ.

- [x] **Task 6: Test** (AC: #1–#6)
  - [x] 6.1 Test component cho modal chọn tình trạng (3 lựa chọn, biến thể CCCD).
  - [x] 6.2 Test server action `refundSecurity` (gọi đúng endpoint/body, parse response, nhánh `already_processed`).
  - [x] 6.3 Test render khối thông tin cọc + timeline ở màn hình khách.

## Dev Notes

### Backend contract (đã có — story 10.7, KHÔNG sửa backend)

- **Transition:** dùng `updateOrderStatus(orderId, status)` đã có → `PATCH/PUT` order status. Backend tự đặt `rental_started_at`/`returned_at` và chặn sai luồng. `order.next_valid_status` đã rental-aware (rent: delivered→renting; mua: delivered→completed).
- **Hoàn cọc:** `POST /api/v1/orders/{order_id}/refund-security` (OwnerOnly), body `{ "condition": "Good" | "Damaged" | "Lost" }`. Response bọc `{ data: RefundSecurityResponse, meta: {} }`:
  - `RefundSecurityResponse = { order_id, refund_amount (số), security_type ("cccd"|"cash_deposit"), original_amount (chuỗi|null), condition, already_processed (bool) }`.
- **RentalCondition (backend enum values):** `"Good"`, `"Damaged"`, `"Lost"` (đúng chữ hoa). Map nhãn Việt ở frontend: Tốt/Hỏng/Thất lạc.
- **Quy tắc hoàn (cash-only):** Tốt/Hỏng → hoàn 100% cọc tiền mặt; Thất lạc → 0. CCCD → `refund_amount=0`, hoàn = trả lại thẻ (UI nói "trả lại giấy tờ", không hiện "0 đ").

### Hiện trạng frontend (tái dùng, đừng làm lại)

- `frontend/src/components/client/orders/StatusBadge.tsx` — **đã** có nhãn `renting`/`returned`/`completed` (Đang thuê / Đã trả đồ / Hoàn tất). Chỉ kiểm tra màu, không thêm trùng.
- `frontend/src/app/actions/order-actions.ts` — **đã** có `updateOrderStatus`, `getCustomerOrderDetail`, `fetchOrders`… (tái dùng). **Chưa** có `refundSecurity` → cần thêm.
- `OrderTable.tsx` — đã dùng `order.next_valid_status` + `NEXT_STATUS_LABELS` (chỉ thêm nhãn cho transition thuê).
- `OrderBoardClient.tsx` — **chưa** có refund/condition → thêm modal + nút "Hoàn cọc".
- `types/order.ts` — `OrderStatus` đã có renting/returned/completed; có `security_type`/`security_value`; **chưa** có `RentalCondition`/refund types/`rental_condition`.

### Patterns & anti-patterns

- Mutation dùng TanStack Query `useMutation` + `queryClient.invalidateQueries` (theo các board hiện có).
- Toast tự ẩn ~3s, message theo `refund_amount`/`security_type`.
- **Cash-only:** KHÔNG dựng luồng cổng thanh toán; "Hoàn cọc" chỉ là xác nhận thao tác tiền mặt/CCCD. [[payment-scope-cash-only]]
- **Idempotency:** gọi lặp `refund-security` an toàn ở backend (`already_processed=true`) — UI phải xử lý nhã nhặn, không hiện lỗi.
- **Copy thuần Việt:** không lộ enum tiếng Anh, không thuật ngữ. [[customer-copy-plain-vietnamese]]
- Đa tenant + auth: server action giữ nguyên khuôn header/credential như các action khác.

### References

- [Source: _bmad-output/implementation-artifacts/10-7-rental-return-va-security-refund.md — AC#5/#6, Tasks 7–11 (descoped here), backend contract]
- [Source: backend/src/api/v1/orders.py#refund-security — endpoint hợp đồng]
- [Source: backend/src/models/order.py — RentalCondition, RefundSecurityRequest/Response]
- [Source: backend/src/services/order_service.py — refund_security(), _structural_next_status()]
- [Source: _bmad-output/planning-artifacts/architecture.md — Order Status Pipeline (rental flow), Payment Model (security deposit)]
- [Source: frontend/src/components/client/orders/* — OrderBoardClient, OrderTable, StatusBadge, OrderDetailModal/Drawer]

## Dev Agent Record

### Completion Notes (2026-06-08)

All tasks done; cash-only scope. Tests: **16/16 backend** (test_10_7_rental_return.py incl. new
customer-detail exposure test) + **17/17 new frontend** (refundSecurity action, RefundDialog,
OrderDetailModal security section) + existing order tests green (36) with no regressions.
`tsc --noEmit` clean for all changed files.

- **Backend (additive, approved):** exposed `rental_condition`/`security_type`/`security_value` on
  `OrderListItem`; exposed `service_type`/`security_type`/`security_value`/`return_date`/
  `rental_condition`/`security_refund_amount` on `CustomerOrderDetail` (refund amount queried from
  the refunded `OrderPaymentDB` row). No business-logic change.
- **Order Board:** next-status labels are now service-type aware (`delivered`+rent → "Khách đang thuê");
  a `returned` rental shows a "Hoàn cọc" button (gated before "Hoàn tất") opening a condition modal
  (Tốt/Hỏng/Thất lạc), with a CCCD variant ("trả lại giấy tờ"); a `RentalConditionBadge` shows the
  recorded condition. Idempotent replay (`already_processed`) surfaces a neutral toast, not an error.
- **Customer view:** `OrderDetailModal` renders a "Tiền cọc thuê" section (type, value, return date,
  condition, refund status). The rental timeline was already produced by the backend.
- **Reuse:** `updateOrderStatus` reused for all transitions; `StatusBadge` already styled the rental
  statuses — not duplicated.

### File List

**Backend (additive exposure):**
- `backend/src/models/order.py` — `OrderListItem` += rental_condition/security_type/security_value
- `backend/src/models/order_customer.py` — `CustomerOrderDetail` += rental/security/refund fields
- `backend/src/services/order_service.py` — populate new OrderListItem fields in `list_orders`
- `backend/src/services/order_customer_service.py` — populate new fields + query refunded amount
- `backend/tests/test_10_7_rental_return.py` — new test: customer-detail exposes security + refund

**Frontend:**
- `frontend/src/types/order.ts` — RentalCondition + labels, RefundSecurity types, OrderListItem/CustomerOrderDetail fields
- `frontend/src/app/actions/order-actions.ts` — `refundSecurity()` server action
- `frontend/src/components/client/orders/OrderTable.tsx` — rental next-status labels, RentalConditionBadge, "Hoàn cọc" button
- `frontend/src/components/client/orders/OrderBoardClient.tsx` — `RefundDialog` (exported), refund mutation + handlers + toast
- `frontend/src/components/client/orders/OrderDetailModal.tsx` — rental security deposit section
- `frontend/src/__tests__/rentalRefundAction.test.ts` — refundSecurity action tests (NEW)
- `frontend/src/__tests__/RefundDialog.test.tsx` — condition modal tests (NEW)
- `frontend/src/__tests__/OrderDetailModal.test.tsx` — security section + Lost-forfeit render tests (extended)

## Senior Developer Review (AI)

**Date:** 2026-06-08 · **Outcome:** Changes Requested → **Resolved (Approved)**

3-layer adversarial review (Blind / Edge Case / Acceptance Auditor) + empirical test runs.
Acceptance Auditor confirmed **all 6 ACs met, reuse intact, cash-only scope clean, no functional
defects**. 7 minor hardening findings applied; final: 18 BE + 35 FE tests green, tsc clean.

### Review Follow-ups (AI) — all resolved
- [x] **[Med] P-A (PII):** the raw CCCD number (`security_value` for cccd) is no longer shipped in
  `OrderListItem` (board list payload) nor `CustomerOrderDetail` — masked to None for cccd.
- [x] **[Low-Med] P-B:** a Lost cash rental now shows "Không hoàn (đồ thất lạc)" instead of the
  misleading "Đã hoàn 0 ₫" in the customer view.
- [x] **[Low] P-C:** NaN guard for a malformed cash `security_value` (no more "NaN ₫") in the refund
  dialog + customer view.
- [x] **[Low] P-D:** `RentalConditionBadge` falls back gracefully for an out-of-enum condition.
- [x] **[Low] P-E:** customer-detail refund-amount query uses `.scalars().first()` (defensive vs duplicates).
- [x] **[Low] P-F:** refund success invalidates the refunded order's detail key (`variables.orderId`),
  not just the currently-open drawer.
- [x] **[Low] P-G:** added backend tests for the board `OrderListItem` exposure + CCCD masking.

**Rejected (verified non-issues):** double-refund via row button (backend `with_for_update` +
idempotency); CCCD condition selection (records garment condition — valid); `nextStatusLabel`
undefined / label-vs-transition divergence (all real statuses mapped; backend rental-aware).

**Deferred (pre-existing project pattern, not introduced here):** modal a11y (`role=dialog`/Escape/
focus-trap) + backdrop-click-while-pending — every existing dialog in OrderBoardClient shares this
pattern; address in a dedicated a11y pass.

### Change Log

| Date | Round | Change |
|------|-------|--------|
| 2026-06-08 | Dev | Implemented Tasks 0–6 (Order Board rental controls + refund modal + customer view + additive backend exposure). 16 BE + 17 FE tests. |
| 2026-06-08 | Review | 7 hardening patches (P-A PII mask … P-G tests); all 6 ACs confirmed. 18 BE + 35 FE tests green, tsc clean. **Approved.** |
