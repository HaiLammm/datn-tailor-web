-- Migration 020: Create lead_conversions audit table (Story 6.2)
-- Tracks lead-to-customer conversion history for CRM analytics

CREATE TABLE IF NOT EXISTS lead_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,  -- Reference only (lead is deleted after conversion)
  lead_name VARCHAR(255) NOT NULL,
  lead_phone VARCHAR(20),
  lead_email VARCHAR(255),
  lead_source VARCHAR(50),
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  converted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_tenant ON lead_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_customer ON lead_conversions(customer_profile_id);
