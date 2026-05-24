-- Migration 036: Add delivery_date to orders (Story 12.2 code review fix)
-- Used to calculate tailor task deadline_at = delivery_date - 3 days.

ALTER TABLE orders
    ADD COLUMN delivery_date TIMESTAMPTZ;
