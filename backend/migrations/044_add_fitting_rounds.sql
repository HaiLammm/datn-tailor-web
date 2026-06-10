-- Migration 044: Create fitting_rounds table (Story 12.6, SCP 2026-06-10)
-- Repeatable fitting rounds for bespoke production: each round records an
-- immutable outcome (passed / needs_alteration) + adjustment notes as a
-- business event (status-transition tracking principle, SCP 2026-05-01).
-- appointment_id is informational only — appointments are guest-booked and
-- unlinked, so NO FK constraint (see AppointmentDB). Idempotent.

CREATE TABLE IF NOT EXISTS fitting_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tailor_tasks(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    appointment_id UUID,
    outcome VARCHAR(20) NOT NULL,
    notes TEXT,
    fitted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_fitting_round_outcome CHECK (outcome IN ('passed', 'needs_alteration')),
    -- round_number is computed as count+1 per order under the task row lock;
    -- the UNIQUE constraint is the DB-level backstop against duplicates.
    CONSTRAINT uq_fitting_round_order_number UNIQUE (order_id, round_number)
);

CREATE INDEX IF NOT EXISTS idx_fitting_rounds_order_id ON fitting_rounds(order_id);
CREATE INDEX IF NOT EXISTS idx_fitting_rounds_task_id ON fitting_rounds(task_id);
CREATE INDEX IF NOT EXISTS idx_fitting_rounds_tenant_id ON fitting_rounds(tenant_id);

-- ── Notifications type CHECK constraint refresh ──────────────────────────────
-- Migration 016 limited notifications.type to the original five values, so
-- every newer type the code sends (task workflow, QC, fitting) violated the
-- constraint and was silently dropped. Re-create the constraint with the full
-- union of every type the codebase sends. Idempotent (DROP IF EXISTS + ADD).

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
        'fitting_ready', 'fitting_alteration', 'fitting_passed'
    )
);
