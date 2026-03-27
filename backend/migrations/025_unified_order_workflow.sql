-- Migration: 025_unified_order_workflow.sql
-- Epic 10: Unified Order Workflow (5-Phase)
-- Date: 2026-03-26
-- Depends on: 024_add_visibility_to_vouchers.sql
--
-- Changes:
--   1. Expand `orders` table with service_type, security fields, rental dates, deposit fields
--   2. Create new `order_payments` table for business-level multi-transaction tracking
--
-- NOTE: `payment_transactions` table (migration 013) is NOT modified here.
--   That table stores gateway webhook audit trail (Story 4.1) — different purpose.

-- ============================================================
-- 1. Mở rộng bảng `orders` với Epic 10 fields
-- ============================================================

-- Loại dịch vụ: Mua sẵn / Thuê / Đặt may (default 'buy' để backward compatible)
ALTER TABLE orders ADD COLUMN service_type VARCHAR(10) NOT NULL DEFAULT 'buy';

-- Security deposit type — chỉ dùng cho Rent: CCCD hoặc tiền cọc thế chân
ALTER TABLE orders ADD COLUMN security_type VARCHAR(15);

-- Giá trị cọc: số CCCD hoặc số tiền cọc (NULL cho Buy/Bespoke)
ALTER TABLE orders ADD COLUMN security_value VARCHAR(50);

-- Ngày nhận / trả đồ thuê (nullable — chỉ Rent)
ALTER TABLE orders ADD COLUMN pickup_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN return_date TIMESTAMPTZ;

-- Số tiền đặt cọc (deposit_amount) và số tiền còn lại phải trả (remaining_amount)
-- NULL cho Buy (100% full payment), có giá trị cho Rent và Bespoke
ALTER TABLE orders ADD COLUMN deposit_amount NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN remaining_amount NUMERIC(12,2);

-- ============================================================
-- 2. Tạo bảng `order_payments` — Business-level payment tracking
--
-- Khác với `payment_transactions` (migration 013 — webhook audit trail),
-- bảng này theo dõi từng giao dịch nghiệp vụ trên 1 đơn hàng:
--   full       → Mua sẵn thanh toán 1 lần
--   deposit    → Đặt cọc ban đầu (Thuê/Đặt may)
--   remaining  → Thanh toán phần còn lại khi đơn sẵn sàng
--   security_deposit → Cọc thế chân bằng tiền mặt (Thuê)
-- ============================================================
CREATE TABLE order_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_type VARCHAR(20) NOT NULL,  -- full | deposit | remaining | security_deposit
    amount NUMERIC(12,2) NOT NULL,
    method VARCHAR(20) NOT NULL,        -- cod | vnpay | momo | cash | internal
    status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending | paid | failed | refunded
    gateway_ref VARCHAR(255),           -- Gateway transaction ID or reference
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes để tối ưu queries theo Epic 10 workflows
CREATE INDEX idx_order_payments_order ON order_payments(order_id);
CREATE INDEX idx_order_payments_tenant ON order_payments(tenant_id);
CREATE INDEX idx_order_payments_status ON order_payments(status);
