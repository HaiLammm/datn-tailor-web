-- Migration 006b: Create designs table (Story 3.4)
-- Must exist before 007 which creates design_overrides referencing designs(id)

CREATE TABLE IF NOT EXISTS designs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    master_geometry JSONB NOT NULL,
    geometry_hash VARCHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'locked',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_designs_user_id ON designs(user_id);
CREATE INDEX IF NOT EXISTS idx_designs_tenant_id ON designs(tenant_id);

-- Comments
COMMENT ON TABLE designs IS 'Story 3.4: Locked designs with Master Geometry JSON (SSOT)';
COMMENT ON COLUMN designs.status IS 'Design status: locked, draft, etc.';
COMMENT ON COLUMN designs.geometry_hash IS 'SHA-256 hash of master_geometry for integrity checks';
