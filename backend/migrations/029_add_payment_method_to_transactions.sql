-- Migration: 029_add_payment_method_to_transactions.sql
-- Story 10.7: Rental Return & Security Refund
-- Date: 2026-04-03
-- Depends on: 028_add_rental_lifecycle_columns.sql
--
-- Changes:
--   1. Add method column to payment_transactions table (payment | refund)
--   This distinguishes between payment direction (customer → system) and refunds (system → customer)

-- ============================================================
-- 1. Add method column to payment_transactions table
-- ============================================================

-- Payment direction: 'payment' (customer pays system) or 'refund' (system returns to customer)
-- Default 'payment' for backward compatibility with existing payment transactions
ALTER TABLE payment_transactions ADD COLUMN method VARCHAR(20) NOT NULL DEFAULT 'payment';

-- Add check constraint for valid payment methods
ALTER TABLE payment_transactions ADD CONSTRAINT check_payment_method
  CHECK (method IN ('payment', 'refund'));

-- Create index for refund queries (finding refunded transactions for audit)
CREATE INDEX idx_payment_transactions_method ON payment_transactions(method) WHERE method = 'refund';
