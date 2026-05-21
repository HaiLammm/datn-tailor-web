-- Migration 034: Production Task State Machine Foundation (Story 12.1)
-- Extends tailor_tasks with full state machine columns, creates task_stage_logs and task_history tables.

-- ============================================================
-- 1. ALTER tailor_tasks — Add new columns
-- ============================================================

ALTER TABLE tailor_tasks
    ADD COLUMN version INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN accepted_at TIMESTAMPTZ,
    ADD COLUMN started_at TIMESTAMPTZ,
    ADD COLUMN submitted_at TIMESTAMPTZ,
    ADD COLUMN hold_reason TEXT,
    ADD COLUMN on_hold_at TIMESTAMPTZ,
    ADD COLUMN resumed_at TIMESTAMPTZ,
    ADD COLUMN assignment_deadline_at TIMESTAMPTZ,
    ADD COLUMN expected_finish_at TIMESTAMPTZ,
    ADD COLUMN is_rework BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN rework_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN qc_issues TEXT,
    ADD COLUMN rejection_reason TEXT,
    ADD COLUMN rejection_category VARCHAR(50),
    ADD COLUMN reassignment_reason TEXT,
    ADD COLUMN priority VARCHAR(20) NOT NULL DEFAULT 'normal';

-- 2. Make assigned_to nullable (tasks can start unassigned)
ALTER TABLE tailor_tasks ALTER COLUMN assigned_to DROP NOT NULL;

-- 3. Change default status to 'unassigned'
ALTER TABLE tailor_tasks ALTER COLUMN status SET DEFAULT 'unassigned';

-- 4. CHECK constraints
ALTER TABLE tailor_tasks
    ADD CONSTRAINT chk_priority
    CHECK (priority IN ('normal', 'urgent'));

ALTER TABLE tailor_tasks
    ADD CONSTRAINT chk_rejection_category
    CHECK (rejection_category IN ('overloaded', 'not_specialty', 'personal', 'other') OR rejection_category IS NULL);

-- ============================================================
-- 5. CREATE TABLE task_stage_logs
-- ============================================================

CREATE TABLE IF NOT EXISTS task_stage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tailor_tasks(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    stage VARCHAR(100) NOT NULL,
    stage_order INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_stage_log_status CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped'))
);

CREATE INDEX IF NOT EXISTS idx_task_stage_logs_task_id ON task_stage_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_task_stage_logs_tenant_id ON task_stage_logs(tenant_id);

-- ============================================================
-- 6. CREATE TABLE task_history
-- ============================================================

CREATE TABLE IF NOT EXISTS task_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tailor_tasks(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    from_status VARCHAR(50),
    to_status VARCHAR(50),
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_tenant_id ON task_history(tenant_id);
