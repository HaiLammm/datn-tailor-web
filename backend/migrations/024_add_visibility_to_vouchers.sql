-- Migration 024: Add visibility (public/private) to vouchers
-- Public/Private Voucher System

ALTER TABLE vouchers ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'private';

-- Index for filtering by visibility
CREATE INDEX idx_vouchers_visibility ON vouchers(tenant_id, visibility);
