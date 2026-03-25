-- Migration 023: Add voucher discount tracking to orders
-- Story: Voucher Apply & Discount Preview for Customers

-- Add discount tracking columns to orders
ALTER TABLE orders ADD COLUMN subtotal_amount NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN discount_amount NUMERIC(12,2) DEFAULT 0 NOT NULL;
ALTER TABLE orders ADD COLUMN applied_voucher_ids JSONB DEFAULT '[]'::jsonb NOT NULL;

-- Backfill: existing orders have subtotal = total (no discount applied)
UPDATE orders SET subtotal_amount = total_amount WHERE subtotal_amount IS NULL;

-- Make subtotal NOT NULL after backfill
ALTER TABLE orders ALTER COLUMN subtotal_amount SET NOT NULL;

-- Add FK constraint to user_vouchers.used_in_order_id (field exists from migration 017)
ALTER TABLE user_vouchers ADD CONSTRAINT fk_user_vouchers_order_id
    FOREIGN KEY (used_in_order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- Index for querying orders by applied vouchers
CREATE INDEX idx_orders_applied_voucher_ids ON orders USING gin(applied_voucher_ids);
