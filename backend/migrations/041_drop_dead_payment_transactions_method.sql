-- Migration: 041_drop_dead_payment_transactions_method.sql
-- Story 10.7 (code-review round 1, 2026-06-08): Rental Return & Security Refund
-- Depends on: 040_add_extended_measurements_to_pattern_sessions.sql
--
-- Context:
--   The original 029 migration added a `method` column (+ CHECK + partial index) to
--   payment_transactions to mark refunds. The corrected design records security refunds
--   in order_payments (cash-only scope), so payment_transactions.method is dead. 029 was
--   removed from source. This migration drops the column safely (IF EXISTS) so any
--   environment that already applied 029 converges to the same schema as a fresh DB.
--
-- Changes:
--   1. Drop idx_payment_transactions_method (if it exists)
--   2. Drop check_payment_method constraint (if it exists)
--   3. Drop payment_transactions.method column (if it exists)

DROP INDEX IF EXISTS idx_payment_transactions_method;

ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS check_payment_method;

ALTER TABLE payment_transactions DROP COLUMN IF EXISTS method;
