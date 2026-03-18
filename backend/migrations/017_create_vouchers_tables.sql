-- Migration 017: Create vouchers infrastructure (Story 4.4g)
-- vouchers: master voucher definitions (will be managed by Owner via Story 6.3)
-- user_vouchers: per-customer assignment of vouchers

CREATE TABLE vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,           -- 'percent' | 'fixed'
    value NUMERIC(10, 2) NOT NULL,       -- percent (0-100) or fixed VND amount
    min_order_value NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- minimum order total to apply
    max_discount_value NUMERIC(12, 2),   -- cap for percent vouchers (NULL = no cap)
    description TEXT,
    expiry_date DATE NOT NULL,
    total_uses INT NOT NULL DEFAULT 1,   -- max total assignments/uses for this voucher
    used_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_voucher_type CHECK (type IN ('percent', 'fixed')),
    CONSTRAINT chk_voucher_value_positive CHECK (value > 0),
    CONSTRAINT chk_percent_range CHECK (type != 'percent' OR value <= 100),
    UNIQUE (tenant_id, code)
);

-- Fast lookup of vouchers by tenant
CREATE INDEX idx_vouchers_tenant ON vouchers (tenant_id);

-- Query active vouchers sorted by expiry for Owner dashboard (Story 6.3)
CREATE INDEX idx_vouchers_active ON vouchers (tenant_id, is_active, expiry_date);

-- user_vouchers: individual assignment of a voucher to a customer account
CREATE TABLE user_vouchers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    voucher_id UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    used_at TIMESTAMPTZ,
    used_in_order_id UUID,              -- NULL until applied at checkout (FK to orders.id added in Epic 6)
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (user_id, voucher_id)        -- one assignment per user per voucher
);

-- Fast lookup: list all vouchers for a user
CREATE INDEX idx_user_vouchers_user ON user_vouchers (user_id, tenant_id);

-- Reverse lookup: which users have a given voucher
CREATE INDEX idx_user_vouchers_voucher ON user_vouchers (voucher_id);
