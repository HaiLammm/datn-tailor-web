-- Migration 037: Code review fixes for Story 12.1
-- P-2: Composite index for ordered audit log queries
-- P-5: Remove misleading default on stage_order

CREATE INDEX IF NOT EXISTS idx_task_history_task_created
    ON task_history(task_id, created_at);

ALTER TABLE task_stage_logs ALTER COLUMN stage_order DROP DEFAULT;
