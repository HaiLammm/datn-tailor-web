-- Migration 005: Create customer_profiles and measurements tables
-- Story: 1.3 - Quản lý Hồ sơ & Số đo
-- Date: 2026-03-02

-- Drop old tables if they exist (backwards compatibility)
DROP TABLE IF EXISTS measurements CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

-- Create customer_profiles table
CREATE TABLE customer_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    date_of_birth DATE,
    gender VARCHAR(20),
    address TEXT,
    notes TEXT,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT unique_phone_per_tenant UNIQUE(tenant_id, phone)
);

-- Create measurements table
CREATE TABLE measurements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    neck DECIMAL(5,2),
    shoulder_width DECIMAL(5,2),
    bust DECIMAL(5,2),
    waist DECIMAL(5,2),
    hip DECIMAL(5,2),
    top_length DECIMAL(5,2),
    sleeve_length DECIMAL(5,2),
    wrist DECIMAL(5,2),
    height DECIMAL(5,2),
    weight DECIMAL(5,2),
    measurement_notes TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    measured_date DATE NOT NULL DEFAULT CURRENT_DATE,
    measured_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_customer_profiles_phone ON customer_profiles(phone);
CREATE INDEX idx_customer_profiles_email ON customer_profiles(email);
CREATE INDEX idx_customer_profiles_tenant ON customer_profiles(tenant_id);
CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX idx_customer_profiles_is_deleted ON customer_profiles(is_deleted);
CREATE INDEX idx_measurements_customer ON measurements(customer_profile_id);
CREATE INDEX idx_measurements_tenant ON measurements(tenant_id);
CREATE INDEX idx_measurements_default ON measurements(customer_profile_id, is_default);
CREATE INDEX idx_measurements_date ON measurements(measured_date);

-- Trigger to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_profiles_updated_at
    BEFORE UPDATE ON customer_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at
    BEFORE UPDATE ON measurements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment documentation
COMMENT ON TABLE customer_profiles IS 'Customer profile records for tailor shop management';
COMMENT ON TABLE measurements IS 'Customer body measurements with versioning support';
COMMENT ON COLUMN customer_profiles.tenant_id IS 'Multi-tenant isolation identifier';
COMMENT ON COLUMN customer_profiles.is_deleted IS 'Soft delete flag - preserves historical data';
COMMENT ON COLUMN measurements.is_default IS 'Default measurement set for new orders';
COMMENT ON COLUMN measurements.measured_date IS 'Date when measurements were taken';
