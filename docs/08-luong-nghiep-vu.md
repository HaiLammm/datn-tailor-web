# Chương 08 — Luồng nghiệp vụ chính

## 8.1. Tổng quan 3 luồng đơn hàng (Unified Order Workflow — Epic 10)

Hệ thống phân biệt 3 luồng trạng thái theo `service_type` (đặt trên `orders.service_type`):

```
service_type ∈ { 'buy', 'rent', 'bespoke' }
```

### 8.1.1 Buy (Mua sẵn)

```
pending → confirmed → preparing (QC → Packaging)
       → ready_to_ship | ready_for_pickup
       → shipped → delivered → completed
```

- 1 transaction `payment_type='full'` (100% upfront).
- Owner approve → tự động chuyển sang preparing kho QC.

### 8.1.2 Rent (Thuê)

```
pending → confirmed → preparing (Cleaning → Altering → Ready)
       → ready_to_ship | ready_for_pickup
       → shipped → delivered → renting → returned → completed
```

- 2-3 transactions: `deposit` + (optional `security_deposit`) + `remaining`.
- BẮT BUỘC: `security_type` ∈ {`cccd`, `cash_deposit`} + `security_value`.
- BẮT BUỘC: `pickup_date` + `return_date`.
- Trạng thái `renting` → khách đang giữ đồ; scheduler nhắc trước 3 ngày & 1 ngày.
- `returned` → Owner kiểm tra (`rental_returns.return_condition` ∈ {Good/Damaged/Lost}) → hoàn deposit hoặc trừ.

### 8.1.3 Bespoke (Đặt may)

```
pending_measurement → pending → confirmed
       → in_production (Cutting → Sewing → Fitting → Finishing)
       → ready_to_ship | ready_for_pickup
       → shipped → delivered → completed
```

- 2 transactions: `deposit` + `remaining`.
- `pending_measurement`: chỉ Bespoke — đơn chờ khách xác nhận / cập nhật số đo (Measurement Gate).
- Owner approve → auto-tạo `tailor_tasks` + (Epic 11) gắn pattern session nếu có.

## 8.2. Order Status Pipeline (so sánh)

| State | Buy | Rent | Bespoke |
|---|---|---|---|
| `pending_measurement` | ❌ | ❌ | ✅ (đầu) |
| `pending` | ✅ (đầu) | ✅ (đầu) | ✅ |
| `confirmed` | ✅ | ✅ | ✅ |
| `preparing` (sub-steps khác nhau) | QC → Packaging | Cleaning → Altering → Ready | — |
| `in_production` (sub-steps) | — | — | Cutting → Sewing → Fitting → Finishing |
| `ready_to_ship` / `ready_for_pickup` | ✅ | ✅ | ✅ |
| `shipped` → `delivered` | ✅ | ✅ | ✅ |
| `renting` | — | ✅ | — |
| `returned` | — | ✅ | — |
| `completed` | ✅ | ✅ | ✅ |

## 8.3. Payment Model (Multi-Transaction)

`payment_transactions` table:

| Field | Type | Mô tả |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK tenants |
| `order_id` | UUID | FK orders |
| `payment_type` | VARCHAR | `full` \| `deposit` \| `remaining` \| `security_deposit` |
| `amount` | NUMERIC(12,2) | Số tiền |
| `method` | VARCHAR | COD / bank_transfer / e_wallet / cccd |
| `status` | VARCHAR | pending / paid / failed / refunded |
| `gateway_ref` | VARCHAR | Mã giao dịch từ gateway |
| `created_at`, `updated_at` | TIMESTAMPTZ | |

Mô hình thanh toán **theo service_type**:

| Service | Transactions |
|---|---|
| Buy | 1× `full` |
| Rent | 1× `deposit` + (optional 1× `security_deposit`) + 1× `remaining` |
| Bespoke | 1× `deposit` + 1× `remaining` |

## 8.4. Bespoke Measurement Gate (FR82)

Trước khi customer được phép checkout đơn Bespoke:

```
Customer click "Đặt may Bespoke"
    │
    ▼
[Frontend: (customer)/measurement-gate/]
    │
    ▼ POST /api/v1/orders/check-measurement
    │
    ├─ has_measurements=false → CTA: "Đặt lịch đo" → redirect (customer)/booking/
    └─ has_measurements=true  → display summary + last_updated
                                 + 2 options:
                                   - "Xác nhận, dùng số đo này" → tiếp tục checkout
                                   - "Yêu cầu đo lại" → redirect (customer)/booking/
```

→ Endpoint `POST /api/v1/orders/check-measurement` là read-only check, không tạo side effects. Trả 200 với data hoặc 404 nếu chưa có profile.

## 8.5. Owner Approve Flow (FR85, FR86)

```
Owner thấy đơn 'pending' trên Order Board (workplace/owner/orders/)
    │
    ▼ Click "Phê duyệt"
    │
    ▼ POST /api/v1/orders/{id}/approve
    │
    ▼ Backend transition: pending → confirmed
    │
    ├─ service_type=bespoke
    │     → tạo TailorTask (assigned_to: thợ có capacity thấp nhất)
    │     → (nếu có) attach pattern_session vào order
    │     → notification cho thợ may
    │
    └─ service_type=rent | buy
          → chuyển sang 'preparing'
          → notification cho kho
          → (rent) bắt đầu countdown pickup_date
```

Background tasks:
- Email confirmation tới customer
- Cập nhật inventory `garments` (set `renter_id` cho rent, decrement stock cho buy)
- Push notification

## 8.6. Remaining Payment Flow (FR89)

Khi đơn Bespoke/Rent đã `ready_to_ship` hoặc `ready_for_pickup`:

```
Customer vào (customer)/profile/orders/
    │
    ▼ Thấy badge "Cần thanh toán: X VND"
    │
    ▼ Click "Thanh toán"
    │
    ▼ POST /api/v1/orders/{id}/pay-remaining
    │
    ▼ Backend khởi tạo gateway transaction (deposit-style flow đã có)
    │
    ▼ Webhook → cập nhật payment_transactions (type='remaining')
    │
    ▼ orders.payment_status = 'paid' đầy đủ
    │
    ▼ Email + notification
```

## 8.7. Rental Return Lifecycle (Story 10.7, FR90)

```
Đơn rent ở trạng thái 'renting' (đã giao cho khách)
    │
    ▼ Khách trả đồ tại tiệm
    │
    ▼ Owner mở (workplace)/owner/rentals/[id]/
    │
    ▼ Kiểm tra tình trạng → ghi vào rental_returns:
    │    return_condition ∈ {Good, Damaged, Lost}
    │    deposit_deduction (cm trừ deposit nếu damaged/lost)
    │
    ▼ POST /api/v1/orders/{id}/refund-security
    │
    ▼ Backend tạo payment_transaction:
    │    payment_type='security_deposit'
    │    status='refunded'
    │    amount = security_value - deposit_deduction
    │
    ▼ orders.status = 'returned' → 'completed'
    │
    ▼ Notification cho customer
```

## 8.8. Tailor Task Workflow

```
Tailor login → (workplace)/tailor/tasks/
    │
    ▼ Danh sách tasks (FR62): name, customer, garment, deadline, status, income preview
    │
    ▼ Click task → /tailor/tasks/[taskId]
    │
    ▼ Xem:
    │    - Order detail
    │    - Master Geometry (Epic 13+) HOẶC Pattern Pieces (Epic 11)
    │    - Số đo customer
    │
    ▼ Cập nhật status (FR65): assigned → in_progress → completed
    │
    ▼ POST /api/v1/tailor/tasks/{id}/status
    │
    ▼ Backend:
    │    - update tailor_tasks.status
    │    - update orders sub-step
    │    - notification cho Owner
    │    - cập nhật income tracking (Epic 8 dashboard)
```

## 8.9. Showroom & Cart Flow (Buy/Rent)

```
Customer browse (customer)/showroom/
    │
    ▼ Filter (FR30): Season, Color, Material, Size — kết quả < 500ms
    │
    ▼ Click product → (customer)/showroom/[id]/
    │
    ▼ Xem HD images zoom (react-medium-image-zoom), size chart
    │
    ▼ Chọn:
    │    - "Mua" (FR32) → add to cart với transaction_type='buy'
    │    - "Thuê" → calendar pickup/return → add to cart với transaction_type='rent'
    │
    ▼ Cart sidebar (cartStore Zustand) update tức thì (Optimistic UI)
    │
    ▼ Checkout (customer)/checkout/
    │    → service-type-aware form:
    │       - Buy: shipping address, payment method
    │       - Rent: + CCCD/cash toggle + pickup/return dates
    │       - Bespoke: + measurement summary badge
    │
    ▼ POST /api/v1/orders/ (Backend re-validate giá + tồn kho)
    │
    ▼ Redirect payment gateway → webhook → email confirm
```

## 8.10. CRM Lead → Customer Conversion

```
Owner thấy lead trong (workplace)/owner/crm/
    │
    ▼ Lead có classification ∈ {Hot, Warm, Cold}
    │
    ▼ Owner click "Convert" trên LeadCard
    │
    ▼ Form: nhập thêm thông tin (email, password tạm hoặc invite OTP)
    │
    ▼ POST /api/v1/leads/{id}/convert
    │
    ▼ Backend:
    │    - tạo user (role='Customer')
    │    - tạo customer_profile gắn user_id
    │    - INSERT lead_conversions log
    │    - lead.status='converted'
    │    - email invite (OTP set password)
```

## 8.11. Voucher Application Flow

```
Owner tạo voucher (workplace)/owner/vouchers/
    │
    ▼ Type=percent | fixed, value, expiry, conditions, visibility (public/private)
    │
    ▼ Phân phối:
    │    - public: hiện trên Showroom cho mọi user
    │    - private: gửi qua email/Zalo cho segment cụ thể (Campaign)
    │
Customer:
    ▼ Áp voucher tại Checkout → POST /api/v1/orders/ với voucher_code
    │
Backend:
    ▼ voucher_service.validate(code, customer, cart):
    │    - Còn hạn? Đủ điều kiện min_order? Còn lượt? User đã dùng?
    ▼ Apply discount → orders.voucher_discount = X
    ▼ user_vouchers.is_used=true
    ▼ Voucher analytics: usage_count +=1
```

## 8.12. Notification System

`notifications` table + `notification_creator` service tạo notification cho:

| Trigger | Recipient | Notification |
|---|---|---|
| Order created | Customer | "Đơn hàng #X đã tạo" |
| Order approved | Customer | "Đơn hàng #X đã được xác nhận" |
| Tailor task assigned | Tailor | "Bạn có task mới: ..." |
| Production sub-step done | Customer | "Đơn của bạn đang ở bước Cắt vải" |
| Ready for pickup | Customer | "Sản phẩm sẵn sàng — vui lòng tới nhận" |
| Rental due in 3 days | Customer | "Còn 3 ngày đến hạn trả áo dài" |
| Rental due in 1 day | Customer | "Còn 1 ngày đến hạn trả áo dài" |
| Rental overdue | Customer + Owner | "Đơn thuê quá hạn" |
| Voucher distributed | Customer (segment) | "Bạn nhận được voucher giảm X%" |
| Lead converted | Owner | "Lead Y đã chuyển thành Customer" |

→ Frontend: `(customer)/profile/notifications/` + `(workplace)/owner/notifications/` (badge unread count).

## 8.13. Scheduler Service (Background)

`backend/src/services/scheduler_service.py` — async loop khởi tạo trong `lifespan`:

```python
async def start_reminder_scheduler():
    async def loop():
        while True:
            await check_rental_returns_due_in_days(3)
            await check_rental_returns_due_in_days(1)
            await check_rental_overdue()
            await asyncio.sleep(3600)  # mỗi 1 giờ
    return asyncio.create_task(loop())
```

→ Tự động cancel khi shutdown app (`scheduler_task.cancel()` trong `lifespan` finally).
