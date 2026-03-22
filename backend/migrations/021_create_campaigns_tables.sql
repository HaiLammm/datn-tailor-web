-- Migration 021: Create campaigns tables (Story 6.4)
-- Tables: message_templates, campaigns, campaign_recipients

-- Message templates (reusable across campaigns)
CREATE TABLE IF NOT EXISTS message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',  -- 'email' | 'sms' | 'zalo'
    subject VARCHAR(255),                           -- email subject (null for SMS/Zalo)
    body TEXT NOT NULL,                             -- template body with {{variable}} placeholders
    is_default BOOLEAN NOT NULL DEFAULT FALSE,      -- pre-built templates seeded at init
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_message_templates_tenant ON message_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_channel ON message_templates(tenant_id, channel);

-- Campaigns (outreach broadcasts)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',    -- 'email' | 'sms' | 'zalo'
    template_id UUID NOT NULL REFERENCES message_templates(id),
    segment VARCHAR(50) NOT NULL,                    -- 'all_customers'|'hot_leads'|'warm_leads'|'cold_leads'|'voucher_holders'
    voucher_id UUID REFERENCES vouchers(id),         -- optional embedded voucher
    status VARCHAR(20) NOT NULL DEFAULT 'draft',     -- 'draft'|'scheduled'|'sending'|'sent'|'failed'
    scheduled_at TIMESTAMPTZ,                        -- null = immediate when sent
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(tenant_id, status);

-- Campaign recipients (per-recipient send log)
CREATE TABLE IF NOT EXISTS campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,   -- nullable: leads may not have accounts
    email VARCHAR(255),                                     -- recipient email
    recipient_name VARCHAR(255),                            -- recipient display name
    status VARCHAR(20) NOT NULL DEFAULT 'pending',          -- 'pending'|'sent'|'failed'|'opened'|'clicked'
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(campaign_id, status);
