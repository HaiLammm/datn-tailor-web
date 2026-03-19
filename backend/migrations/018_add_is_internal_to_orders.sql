-- Migration 018: Add is_internal column to orders, make shipping_address nullable
-- Supports internal orders (Owner production orders) that skip shipping/payment

ALTER TABLE orders ADD COLUMN is_internal BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE orders ALTER COLUMN shipping_address DROP NOT NULL;
CREATE INDEX idx_orders_tenant_is_internal ON orders(tenant_id, is_internal);
