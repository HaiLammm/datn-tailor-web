-- Migration: 028_add_rental_lifecycle_columns.sql
-- Story 10.7: Rental Return & Security Refund
-- Date: 2026-04-03
-- Depends on: 027_add_shipping_address_autofill_to_users.sql
--
-- Changes:
--   1. Add rental_started_at, returned_at columns to orders table (rental lifecycle tracking)
--   2. Add rental_condition column to orders table (Good | Damaged | Lost)

-- ============================================================
-- 1. Add rental lifecycle timestamp columns to orders table
-- ============================================================

-- Timestamp when rental status transitions to 'renting' (customer receives rental item)
ALTER TABLE orders ADD COLUMN rental_started_at TIMESTAMPTZ;

-- Timestamp when rental status transitions to 'returned' (customer returns rental item)
ALTER TABLE orders ADD COLUMN returned_at TIMESTAMPTZ;

-- Condition of returned rental item (Good | Damaged | Lost)
-- Set when renting → returned transition via refund-security endpoint
ALTER TABLE orders ADD COLUMN rental_condition VARCHAR(20);

-- Add check constraint for valid condition values (only for rental orders)
ALTER TABLE orders ADD CONSTRAINT check_rental_condition
  CHECK (rental_condition IS NULL OR rental_condition IN ('Good', 'Damaged', 'Lost'));

-- Create index for rental status queries (finding returned items for refund processing)
CREATE INDEX idx_orders_rental_condition ON orders(rental_condition) WHERE rental_condition IS NOT NULL;
CREATE INDEX idx_orders_returned_at ON orders(returned_at) WHERE returned_at IS NOT NULL;
