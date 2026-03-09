-- Migration 007: Create design_overrides table (Story 4.3)
-- Created at: 2026-03-09

CREATE TABLE IF NOT EXISTS design_overrides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_id UUID NOT NULL REFERENCES designs(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tailor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    delta_key VARCHAR(100) NOT NULL,
    original_value NUMERIC(5, 2) NOT NULL,
    overridden_value NUMERIC(5, 2) NOT NULL,
    delta_unit VARCHAR(20) NOT NULL DEFAULT 'cm',
    label_vi VARCHAR(255) NOT NULL,
    reason_vi TEXT,
    flagged_for_learning BOOLEAN NOT NULL DEFAULT FALSE,
    sequence_id INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_design_overrides_design_id ON design_overrides(design_id);
CREATE INDEX idx_design_overrides_tenant_id ON design_overrides(tenant_id);
CREATE INDEX idx_design_overrides_tailor_id ON design_overrides(tailor_id);
