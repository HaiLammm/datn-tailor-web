-- Story 5.3: Create tailor_tasks table for production task tracking
-- Status flow: assigned → in_progress → completed (no backward transitions)

CREATE TABLE IF NOT EXISTS tailor_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    garment_name VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'assigned',
    deadline TIMESTAMPTZ,
    notes TEXT,
    piece_rate NUMERIC(12, 2),
    design_id UUID REFERENCES designs(id) ON DELETE SET NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_tailor_tasks_tenant_id ON tailor_tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tailor_tasks_assigned_to ON tailor_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tailor_tasks_status ON tailor_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tailor_tasks_order_id ON tailor_tasks(order_id);
