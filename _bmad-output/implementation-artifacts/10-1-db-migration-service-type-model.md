# Story 10.1: DB Migration & Service Type Model

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Kiến trúc sư hệ thống,
I want mở rộng Order model với `service_type` (buy/rent/bespoke), thêm các status enum mới, tạo bảng `order_payments` cho multi-transaction tracking, và bổ sung các fields deposit/security,
so that hệ thống có nền tảng dữ liệu phục vụ quy trình đơn hàng 3 loại dịch vụ trong Epic 10.

## Acceptance Criteria

1. **Given** Database PostgreSQL hiện tại với bảng `orders` đang hoạt động (migration 024)
   **When** Chạy migration `025_unified_order_workflow.sql`
   **Then** Bảng `orders` có thêm 7 cột mới: `service_type` (default 'buy'), `security_type` (nullable), `security_value` (nullable), `pickup_date` (nullable), `return_date` (nullable), `deposit_amount` (nullable), `remaining_amount` (nullable)
   **And** Tất cả đơn hàng cũ không bị ảnh hưởng (default `service_type='buy'`, các cột nullable/default)

2. **Given** Migration đã chạy thành công
   **When** Tạo bảng `order_payments` mới
   **Then** Bảng `order_payments` tồn tại với columns: `id`, `tenant_id`, `order_id`, `payment_type`, `amount`, `method`, `status`, `gateway_ref`, `created_at`, `updated_at`
   **And** Foreign key `tenant_id → tenants(id)` và `order_id → orders(id)` với indexes phù hợp
   **And** **KHÔNG** thay đổi bảng `payment_transactions` hiện có (webhook audit trail — Story 4.1)

3. **Given** Backend Python models
   **When** Cập nhật `backend/src/models/order.py`
   **Then** `OrderStatus` enum có thêm 8 giá trị mới: `pending_measurement`, `preparing`, `ready_to_ship`, `ready_for_pickup`, `in_production`, `renting`, `returned`, `completed`
   **And** Enum mới `ServiceType` được tạo: `buy`, `rent`, `bespoke`
   **And** Enum mới `SecurityType` được tạo: `cccd`, `cash_deposit`
   **And** Pydantic schema `OrderPaymentRecord` mới được tạo

4. **Given** Backend SQLAlchemy ORM
   **When** Cập nhật `backend/src/models/db_models.py`
   **Then** `OrderDB` có 7 cột mới tương ứng với migration
   **And** Class `OrderPaymentDB` mới map tới bảng `order_payments`
   **And** `OrderDB.order_payments` relationship được thêm

5. **Given** Tất cả thay đổi đã hoàn tất
   **When** Chạy test suite hiện tại
   **Then** Không có test hiện tại nào bị break (backward compatibility đảm bảo)
   **And** Tests mới verify migration và models hoạt động đúng

## Tasks / Subtasks

- [x] Task 1: Tạo migration SQL (AC: #1, #2)
  - [x] 1.1 Tạo file `backend/migrations/025_unified_order_workflow.sql`
  - [x] 1.2 ALTER TABLE orders — thêm 7 cột mới với DEFAULT/NULL-safe
  - [x] 1.3 CREATE TABLE order_payments với FK constraints và indexes
  - [x] 1.4 Comment giải thích từng phần migration

- [x] Task 2: Cập nhật Pydantic models — `backend/src/models/order.py` (AC: #3)
  - [x] 2.1 Thêm 8 giá trị vào `OrderStatus` enum (giữ nguyên 7 giá trị cũ)
  - [x] 2.2 Tạo enum `ServiceType` (buy, rent, bespoke)
  - [x] 2.3 Tạo enum `SecurityType` (cccd, cash_deposit)
  - [x] 2.4 Tạo class `OrderPaymentRecord` (Pydantic BaseModel) cho order_payments
  - [x] 2.5 Cập nhật `OrderResponse` để include `service_type` field (với default)

- [x] Task 3: Cập nhật SQLAlchemy ORM — `backend/src/models/db_models.py` (AC: #4)
  - [x] 3.1 Thêm 7 Mapped columns vào `OrderDB` class
  - [x] 3.2 Tạo class `OrderPaymentDB` với đầy đủ columns và relationships
  - [x] 3.3 Thêm `order_payments: Mapped[list["OrderPaymentDB"]]` relationship vào `OrderDB`

- [x] Task 4: Viết tests (AC: #5)
  - [x] 4.1 Tạo `backend/tests/test_10_1_db_migration_service_type.py`
  - [x] 4.2 Test `OrderStatus` enum có đủ tất cả giá trị mới
  - [x] 4.3 Test `ServiceType` và `SecurityType` enums
  - [x] 4.4 Test `OrderDB` có đủ columns mới
  - [x] 4.5 Test tạo order với `service_type='buy'` (backward compat)
  - [x] 4.6 Test tạo `OrderPaymentDB` record cho order

## Dev Notes

### ⚠️ CRITICAL: Đừng nhầm lẫn 2 bảng payment

| Bảng | Mục đích | Migration | Trạng thái |
|------|----------|-----------|------------|
| `payment_transactions` | Gateway webhook audit trail, idempotency (provider + transaction_id) | 013 | **KHÔNG THAY ĐỔI** |
| `order_payments` | Business-level multi-payment tracking (deposit/remaining/security) | **025 (mới)** | Tạo mới |

**Lý do**: `payment_transactions` (Story 4.1) đã tồn tại từ migration 013 với schema khác (has unique constraint `provider+transaction_id`, stores raw webhook payload). Sprint Change Proposal đề xuất "CREATE TABLE payment_transactions" nhưng bảng này đã tồn tại — vì vậy dùng tên `order_payments` để tránh conflict.

### Migration File — Tên và Số Thứ Tự

Migration mới nhất hiện tại: `024_add_visibility_to_vouchers.sql`

**File cần tạo**: `backend/migrations/025_unified_order_workflow.sql`

> ⚠️ Sprint Change Proposal mention "019_unified_order_workflow.sql" nhưng 019 đã bị chiếm bởi `019_create_leads_table.sql` — dùng **025** thay thế.

### SQL Migration Chính Xác

```sql
-- Migration: 025_unified_order_workflow.sql
-- Epic 10: Unified Order Workflow (5-Phase)
-- Date: 2026-03-26

-- 1. Mở rộng orders table với Epic 10 fields
ALTER TABLE orders ADD COLUMN service_type VARCHAR(10) NOT NULL DEFAULT 'buy';
ALTER TABLE orders ADD COLUMN security_type VARCHAR(15);  -- cccd | cash_deposit — nullable, chỉ Rent
ALTER TABLE orders ADD COLUMN security_value VARCHAR(50);  -- Số CCCD hoặc số tiền cọc
ALTER TABLE orders ADD COLUMN pickup_date TIMESTAMPTZ;     -- nullable, chỉ Rent
ALTER TABLE orders ADD COLUMN return_date TIMESTAMPTZ;     -- nullable, chỉ Rent
ALTER TABLE orders ADD COLUMN deposit_amount NUMERIC(12,2);   -- nullable
ALTER TABLE orders ADD COLUMN remaining_amount NUMERIC(12,2); -- nullable

-- 2. Tạo bảng order_payments cho multi-transaction tracking
CREATE TABLE order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL,  -- full | deposit | remaining | security_deposit
    amount NUMERIC(12,2) NOT NULL,
    method VARCHAR(20) NOT NULL,        -- cod | vnpay | momo | cash | internal
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid | failed | refunded
    gateway_ref VARCHAR(255),           -- Gateway transaction reference
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_payments_order ON order_payments(order_id);
CREATE INDEX idx_order_payments_tenant ON order_payments(tenant_id);
CREATE INDEX idx_order_payments_status ON order_payments(status);

-- KHÔNG có thay đổi nào với payment_transactions (migration 013 — Story 4.1)
```

### Cập nhật `backend/src/models/order.py`

```python
class OrderStatus(str, Enum):
    """Order lifecycle statuses — Epic 10 expanded."""
    # --- Existing (backward compatible) ---
    pending = "pending"
    confirmed = "confirmed"
    in_progress = "in_progress"    # Legacy — kept for backward compat
    checked = "checked"            # Legacy — kept for backward compat
    shipped = "shipped"
    delivered = "delivered"
    cancelled = "cancelled"
    # --- New: Epic 10 statuses ---
    pending_measurement = "pending_measurement"  # Bespoke only — chờ xác nhận số đo
    preparing = "preparing"                      # Buy/Rent — đang chuẩn bị (sub-steps)
    ready_to_ship = "ready_to_ship"              # Sẵn sàng giao hàng
    ready_for_pickup = "ready_for_pickup"        # Sẵn sàng nhận tại tiệm
    in_production = "in_production"              # Bespoke only — đang sản xuất
    renting = "renting"                          # Rent only — khách đang giữ đồ
    returned = "returned"                        # Rent only — đã trả đồ
    completed = "completed"                      # Hoàn tất toàn bộ lifecycle


class ServiceType(str, Enum):
    """Service type for Epic 10 order workflow."""
    buy = "buy"          # Mua sẵn — 100% payment upfront
    rent = "rent"        # Thuê — Deposit + Security + Remaining
    bespoke = "bespoke"  # Đặt may — Deposit + Remaining


class SecurityType(str, Enum):
    """Security deposit type for rental orders."""
    cccd = "cccd"                  # Căn cước công dân
    cash_deposit = "cash_deposit"  # Tiền cọc thế chân


class OrderPaymentRecord(BaseModel):
    """Pydantic schema for order_payments table."""
    id: UUID
    tenant_id: UUID
    order_id: UUID
    payment_type: str      # full | deposit | remaining | security_deposit
    amount: Decimal
    method: str
    status: str
    gateway_ref: str | None = None
    created_at: datetime
    updated_at: datetime
```

**Cập nhật `OrderResponse`** — thêm field mới (all optional/default để không break existing):
```python
class OrderResponse(BaseModel):
    # ... existing fields giữ nguyên ...
    service_type: ServiceType = ServiceType.buy    # default 'buy' cho backward compat
    deposit_amount: Decimal | None = None
    remaining_amount: Decimal | None = None
    # security_type/value không expose trong public OrderResponse (sensitive)
```

### Cập nhật `backend/src/models/db_models.py`

**Thêm vào `OrderDB` class** (sau cột `applied_voucher_ids`):
```python
# Epic 10 — Unified Order Workflow (Migration 025)
service_type: Mapped[str] = mapped_column(String(10), nullable=False, default="buy")
security_type: Mapped[str | None] = mapped_column(String(15), nullable=True)
security_value: Mapped[str | None] = mapped_column(String(50), nullable=True)
pickup_date: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
return_date: Mapped[datetime | None] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
deposit_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
remaining_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
# Relationships
order_payments: Mapped[list["OrderPaymentDB"]] = relationship(
    "OrderPaymentDB", back_populates="order", lazy="select"
)
```

**Tạo class `OrderPaymentDB` mới** (thêm vào db_models.py sau `OrderItemDB`):
```python
class OrderPaymentDB(Base):
    """ORM model for `order_payments` table (Epic 10).
    Business-level multi-transaction tracking: deposit, remaining, security.
    Separate from payment_transactions (Story 4.1 webhook audit trail).
    """
    __tablename__ = "order_payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=False)
    payment_type: Mapped[str] = mapped_column(String(20), nullable=False)  # full|deposit|remaining|security_deposit
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    method: Mapped[str] = mapped_column(String(20), nullable=False)        # cod|vnpay|momo|cash|internal
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    gateway_ref: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    order: Mapped["OrderDB"] = relationship("OrderDB", back_populates="order_payments")
```

### Order Status Pipeline theo service_type (Architecture Reference)

```
Buy (Mua sẵn):
  pending → confirmed → preparing (QC→Packaging) → ready_to_ship|ready_for_pickup → shipped → delivered → completed

Rent (Thuê):
  pending → confirmed → preparing (Cleaning→Altering→Ready) → ready_to_ship|ready_for_pickup → shipped → delivered → renting → returned → completed

Bespoke (Đặt may):
  pending_measurement → pending → confirmed → in_production (Cutting→Sewing→Fitting→Finishing) → ready_to_ship|ready_for_pickup → shipped → delivered → completed
```

**Lưu ý**: `in_progress` (legacy) và `checked` (legacy) giữ nguyên để đơn hàng cũ không bị lỗi. Các story Epic 10 tiếp theo chỉ sử dụng statuses mới.

### Project Structure Notes

**Files cần chỉnh sửa:**
```
backend/
├── migrations/
│   └── 025_unified_order_workflow.sql     ← TẠO MỚI
├── src/
│   └── models/
│       ├── order.py                       ← CẬP NHẬT (enums + schemas)
│       └── db_models.py                   ← CẬP NHẬT (OrderDB columns + OrderPaymentDB)
└── tests/
    └── test_10_1_db_migration_service_type.py  ← TẠO MỚI
```

**Files KHÔNG chỉnh sửa trong story này:**
- `backend/src/services/order_service.py` — chỉ thêm models, chưa update service logic
- `backend/src/api/v1/orders.py` — chưa thêm endpoints (các story 10.2-10.7)
- `backend/src/services/payment_service.py` — chỉ xử lý webhook, không liên quan
- Frontend files — story này chỉ là backend foundation

### Backward Compatibility Checklist

- [x] `service_type DEFAULT 'buy'` — đơn cũ tự động có `service_type='buy'`
- [x] `security_type`, `security_value` nullable — đơn cũ không có data
- [x] `pickup_date`, `return_date` nullable — đơn cũ không có rental dates
- [x] `deposit_amount`, `remaining_amount` nullable — đơn cũ là full payment
- [x] `OrderStatus` giữ nguyên 7 giá trị cũ — existing code không break
- [x] `OrderResponse` thêm field mới với defaults — serialization backward compatible
- [x] `payment_transactions` không bị đụng chạm — webhook processing (Story 4.1) hoạt động bình thường

### Testing Patterns (Follow Existing)

Tham khảo: `backend/tests/test_order_api.py` và `backend/tests/test_payment_service.py`

```python
# Mẫu test backward compatibility
async def test_existing_order_defaults():
    """Orders tạo trước migration vẫn hoạt động với service_type='buy'."""
    order = await create_test_order(...)
    assert order.service_type == "buy"
    assert order.security_type is None
    assert order.deposit_amount is None

# Mẫu test enum mới
def test_order_status_new_values():
    assert OrderStatus.pending_measurement == "pending_measurement"
    assert OrderStatus.preparing == "preparing"
    assert OrderStatus.ready_to_ship == "ready_to_ship"
    # ... all 8 new values

# Mẫu test OrderPaymentDB
async def test_create_order_payment():
    op = OrderPaymentDB(
        tenant_id=tenant_id,
        order_id=order_id,
        payment_type="deposit",
        amount=Decimal("500000"),
        method="vnpay",
        status="pending"
    )
    session.add(op)
    await session.commit()
    assert op.id is not None
```

### References

- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-03-26.md#Section 4.2 Architecture Changes]
- [Source: _bmad-output/planning-artifacts/architecture.md#Order Status Pipeline (Unified Order Workflow — Epic 10)]
- [Source: _bmad-output/planning-artifacts/architecture.md#Payment Model (Multi-Transaction)]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 10.1]
- [Source: backend/migrations/024_add_visibility_to_vouchers.sql — Latest migration for numbering]
- [Source: backend/migrations/013_create_payment_transactions.sql — Existing payment_transactions (DO NOT ALTER)]
- [Source: backend/src/models/order.py — Existing OrderStatus, OrderResponse to extend]
- [Source: backend/src/models/db_models.py — Existing OrderDB, PaymentTransactionDB]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

- `test_service_type_column_default` thất bại lần đầu do SQLAlchemy `default=` chỉ áp dụng lúc INSERT, không phải Python object init. Đã sửa test để explicit set `service_type="buy"` khi tạo object, và verify DB-level default qua `test_order_defaults_backward_compat`.
- Pre-existing failures trong `test_order_board_service.py` (và một số test khác): do migration 023 thêm `subtotal_amount NOT NULL` nhưng test fixtures chưa cập nhật — xác nhận không liên quan Story 10.1.

### Completion Notes List

- ✅ Migration `025_unified_order_workflow.sql` tạo thành công. Thêm 7 columns vào `orders` (service_type DEFAULT 'buy', security_type, security_value, pickup_date, return_date, deposit_amount, remaining_amount) và tạo bảng `order_payments` mới với 3 indexes.
- ✅ `payment_transactions` không bị đụng chạm — tránh conflict với Story 4.1 webhook audit trail.
- ✅ `OrderStatus` mở rộng từ 7 → 15 values (8 values mới cho Epic 10). Toàn bộ 7 legacy values giữ nguyên.
- ✅ `ServiceType` (buy/rent/bespoke) và `SecurityType` (cccd/cash_deposit) enums mới.
- ✅ `OrderPaymentRecord` Pydantic schema cho `order_payments` table.
- ✅ `OrderResponse` thêm `service_type` (default: buy), `deposit_amount`, `remaining_amount` — backward compatible.
- ✅ `OrderDB` cập nhật 7 columns mới + `order_payments` relationship.
- ✅ `OrderPaymentDB` class mới cho `order_payments` table.
- ✅ 21/21 tests mới pass. 23/23 existing order tests pass. Không có regression mới.

### File List

- `backend/migrations/025_unified_order_workflow.sql` (NEW)
- `backend/src/models/order.py` (MODIFIED)
- `backend/src/models/db_models.py` (MODIFIED)
- `backend/tests/test_10_1_db_migration_service_type.py` (NEW)
