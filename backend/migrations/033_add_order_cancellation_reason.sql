-- Migration 033: Add cancellation_reason to orders
-- Stores reason when order is cancelled (nullable — only set on cancel)

ALTER TABLE orders
    ADD COLUMN cancellation_reason TEXT;
