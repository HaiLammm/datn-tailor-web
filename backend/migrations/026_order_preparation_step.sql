-- Migration 026: Add preparation_step column to orders table (Story 10.5)
-- Tracks sub-step progress within 'preparing' status for Buy/Rent orders.
-- NULL = not in preparation phase.

ALTER TABLE orders ADD COLUMN IF NOT EXISTS preparation_step VARCHAR(20) DEFAULT NULL;

-- Patch #9: Initialize preparation_step for any existing orders already in 'preparing' status
UPDATE orders SET preparation_step = 'cleaning' WHERE status = 'preparing' AND service_type = 'rent' AND preparation_step IS NULL;
UPDATE orders SET preparation_step = 'qc' WHERE status = 'preparing' AND service_type = 'buy' AND preparation_step IS NULL;
