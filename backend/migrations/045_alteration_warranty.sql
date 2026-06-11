-- Migration 045: Post-delivery alteration warranty (Story 12.7, SCP 2026-06-10)
-- FR101: customers of bespoke orders may request one free fit alteration within
-- a per-tenant warranty window after delivery. Lightweight by design — NO new
-- table and NO new orders.status value: the pending request lives in
-- orders.alteration_requested_at + an owner notification, and the approved work
-- is a normal TailorTask with task_type='alteration' (reduced stage list).
-- Idempotent (IF NOT EXISTS / DO $$ guards, style of 043/044).

-- ── tenants.settings ──────────────────────────────────────────────────────────
-- Per-tenant JSONB settings bag (Option A — matches the geometry_params JSONB
-- pattern). Read via get_tenant_setting(tenant, key, default);
-- "alteration_warranty_days" defaults to 30 when absent.

ALTER TABLE tenants
    ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}'::jsonb;

-- ── tailor_tasks.task_type ────────────────────────────────────────────────────
-- 'production' (default, all existing rows) | 'alteration' (warranty rework on
-- a delivered/completed order — flows through the same 11-state machine).

ALTER TABLE tailor_tasks
    ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) NOT NULL DEFAULT 'production';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_tailor_task_type'
          AND conrelid = 'tailor_tasks'::regclass
    ) THEN
        ALTER TABLE tailor_tasks
            ADD CONSTRAINT chk_tailor_task_type
            CHECK (task_type IN ('production', 'alteration'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tailor_tasks_task_type ON tailor_tasks(task_type);

-- ── orders.alteration_requested_at ────────────────────────────────────────────
-- Pending-request marker. Set when the customer requests an alteration,
-- cleared when the owner approves (the alteration task takes over from there).

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS alteration_requested_at TIMESTAMPTZ NULL;

-- ── orders.alteration_request_note ────────────────────────────────────────────
-- The customer's alteration description, persisted with the pending marker so
-- the owner can review it directly (the notification is only a courtesy copy).
-- Copied onto the alteration task's notes on approval, then cleared with the
-- marker; restored from the task when a cancellation-approve reopens the request.

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS alteration_request_note TEXT NULL;

-- ── orders.delivery_date backfill ─────────────────────────────────────────────
-- The warranty window anchor. From this migration on, entering 'delivered' (or
-- 'completed' when delivered was skipped) stamps delivery_date exactly once in
-- update_order_status. Existing handed-over rows have no recorded handover
-- timestamp; updated_at is the closest approximation and, once copied here,
-- can never move again (idempotent: only fills NULLs).

UPDATE orders
SET delivery_date = updated_at
WHERE status IN ('delivered', 'completed')
  AND delivery_date IS NULL;

-- ── Notifications type CHECK constraint refresh ──────────────────────────────
-- Same discipline as migration 044: the CHECK must whitelist every type the
-- codebase sends, or new notifications are silently dropped by the bare-except
-- in create_notification. Re-create with 044's 20 types + the 3 new alteration
-- types. Idempotent (DROP IF EXISTS + ADD).

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS chk_notification_type;

ALTER TABLE notifications ADD CONSTRAINT chk_notification_type CHECK (
    type IN (
        -- original five (migration 016)
        'order_status', 'appointment', 'return_reminder', 'payment', 'system',
        -- task workflow (Story 5.2 / 12.2)
        'task_created', 'task_assigned', 'task_accepted', 'task_rejected',
        'task_on_hold', 'task_resumed', 'task_reassigned',
        'task_cancellation_request', 'task_cancellation_resolved',
        -- QC (Story 12.2)
        'task_submitted_qc', 'qc_passed', 'qc_failed_rework',
        -- fitting loop (Story 12.6)
        'fitting_ready', 'fitting_alteration', 'fitting_passed',
        -- alteration warranty (Story 12.7)
        'alteration_requested', 'alteration_approved', 'alteration_done'
    )
);
