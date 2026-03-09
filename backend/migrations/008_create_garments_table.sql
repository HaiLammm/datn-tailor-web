-- Migration 008: Create garments table for Digital Showroom (Story 5.1)
-- Stores ao dai garments available for rental with multi-tenant isolation

CREATE TABLE IF NOT EXISTS garments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    color VARCHAR(50),
    occasion VARCHAR(50),
    size_options JSONB NOT NULL DEFAULT '[]'::jsonb,
    rental_price NUMERIC(10, 2) NOT NULL,
    image_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'available',
    expected_return_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_garments_tenant_id ON garments(tenant_id);
CREATE INDEX idx_garments_status ON garments(status);
CREATE INDEX idx_garments_category ON garments(category);
CREATE INDEX idx_garments_occasion ON garments(occasion);

-- Updated timestamp trigger
CREATE OR REPLACE FUNCTION update_garments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_garments_updated_at
    BEFORE UPDATE ON garments
    FOR EACH ROW
    EXECUTE FUNCTION update_garments_updated_at();

-- Comments
COMMENT ON TABLE garments IS 'Story 5.1: Digital Showroom - Ao dai garments for rental';
COMMENT ON COLUMN garments.tenant_id IS 'Multi-tenant isolation - links to tenant shop';
COMMENT ON COLUMN garments.status IS 'Enum: available, rented, maintenance';
COMMENT ON COLUMN garments.size_options IS 'JSON array of available sizes: ["S", "M", "L", "XL", "XXL"]';
COMMENT ON COLUMN garments.expected_return_date IS 'For rented items - when expected back';
