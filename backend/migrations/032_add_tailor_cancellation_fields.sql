-- Migration 032: Add cancellation fields to tailor_tasks
-- Supports tailor cancellation request flow with structured failure categories

ALTER TABLE tailor_tasks
    ADD COLUMN failure_reason TEXT,
    ADD COLUMN failure_category VARCHAR(50),
    ADD COLUMN cancellation_resolved_at TIMESTAMPTZ;

ALTER TABLE tailor_tasks
    ADD CONSTRAINT chk_failure_category
    CHECK (failure_category IN ('fabric_defect', 'measurement_error', 'customer_changed_mind', 'overloaded', 'other') OR failure_category IS NULL);
