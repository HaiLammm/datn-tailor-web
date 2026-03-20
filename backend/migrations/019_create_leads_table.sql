-- Migration 019: Create leads table for CRM module (Story 6.1)
-- Leads = potential customers who have expressed interest but not yet placed an order.
-- Sources: manual entry, website visits, abandoned carts, abandoned bookings, signups.
-- Classification: hot / warm / cold (owner manually assigns or drag-to-cycle).

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  -- source enum: manual | website | booking_abandoned | cart_abandoned | signup
  classification VARCHAR(10) NOT NULL DEFAULT 'warm',
  -- classification enum: hot | warm | cold
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for multi-tenant queries and common filter patterns
CREATE INDEX IF NOT EXISTS idx_leads_tenant ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_classification ON leads(tenant_id, classification);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_source ON leads(tenant_id, source);
CREATE INDEX IF NOT EXISTS idx_leads_tenant_created ON leads(tenant_id, created_at DESC);
