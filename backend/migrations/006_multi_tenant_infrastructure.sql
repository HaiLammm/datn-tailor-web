-- Migration 006: Multi-tenant infrastructure and Local-first support
-- Story 1.6: Thiết lập hạ tầng Multi-tenant & Local-first
-- Date: 2026-03-04

-- ============================================================
-- 1. Create tenants table (AC1: Tenant Isolation)
-- ============================================================

CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create default tenant for existing data migration
INSERT INTO tenants (id, name, slug, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'Tiệm May Thanh Lộc', 'thanh-loc', TRUE)
ON CONFLICT (slug) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- Trigger to auto-update updated_at column for tenants
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. Add tenant_id to users table (AC5: Multi-tenant Middleware)
-- ============================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;

-- Set default tenant for existing users
UPDATE users SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);

-- ============================================================
-- 3. Add version column for sync support (AC3: Local-first Ready)
-- ============================================================

-- Add version to customer_profiles
ALTER TABLE customer_profiles 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add version to measurements
ALTER TABLE measurements 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- ============================================================
-- 4. Add tenant foreign key constraints (AC1: Tenant Isolation)
-- ============================================================

-- Update customer_profiles tenant_id to reference tenants table
-- First, ensure all existing records have valid tenant_id
UPDATE customer_profiles 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

-- Add foreign key constraint (if not already added via SQLAlchemy)
-- Note: This may fail if constraint already exists - that's OK
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_customer_profiles_tenant'
    ) THEN
        ALTER TABLE customer_profiles 
        ADD CONSTRAINT fk_customer_profiles_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Update measurements tenant_id to reference tenants table
UPDATE measurements 
SET tenant_id = '00000000-0000-0000-0000-000000000001' 
WHERE tenant_id IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_measurements_tenant'
    ) THEN
        ALTER TABLE measurements 
        ADD CONSTRAINT fk_measurements_tenant 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================
-- 5. Row-Level Security Policies (AC2: RLS)
-- ============================================================

-- Enable RLS on business tables
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for customer_profiles
-- Users can only see/modify records belonging to their tenant
DROP POLICY IF EXISTS tenant_isolation_customer_profiles ON customer_profiles;
CREATE POLICY tenant_isolation_customer_profiles ON customer_profiles
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- Create RLS policy for measurements
DROP POLICY IF EXISTS tenant_isolation_measurements ON measurements;
CREATE POLICY tenant_isolation_measurements ON measurements
    USING (tenant_id = current_setting('app.current_tenant_id', true)::uuid)
    WITH CHECK (tenant_id = current_setting('app.current_tenant_id', true)::uuid);

-- ============================================================
-- 6. Comments for documentation
-- ============================================================

COMMENT ON TABLE tenants IS 'Multi-tenant infrastructure - each tenant represents a tailor shop';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly unique identifier for tenant';
COMMENT ON COLUMN users.tenant_id IS 'User belongs to this tenant (null for system users like Owner)';
COMMENT ON COLUMN customer_profiles.version IS 'Optimistic locking version for Local-first sync';
COMMENT ON COLUMN measurements.version IS 'Optimistic locking version for Local-first sync';
