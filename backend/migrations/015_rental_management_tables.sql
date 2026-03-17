-- Story 4.3: Create rental_returns table and add rental tracking to order_items

-- Create rental_returns table for tracking rental returns with condition assessment
CREATE TABLE IF NOT EXISTS rental_returns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    order_item_id UUID NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    garment_id UUID NOT NULL REFERENCES garments(id) ON DELETE CASCADE,
    return_condition VARCHAR(20) NOT NULL,  -- 'good', 'damaged', 'lost'
    damage_notes TEXT,
    deposit_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0,
    processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    returned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_rental_returns_tenant_id ON rental_returns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rental_returns_order_item_id ON rental_returns(order_item_id);
CREATE INDEX IF NOT EXISTS idx_rental_returns_garment_id ON rental_returns(garment_id);

-- Add rental tracking columns to order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS rental_status VARCHAR(20);
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10, 2);

-- Add index on transaction_type for better query performance
CREATE INDEX IF NOT EXISTS idx_order_items_transaction_type ON order_items(transaction_type);

-- Backfill existing rent items with rental status
UPDATE order_items
SET rental_status = CASE
    WHEN end_date < CURRENT_DATE THEN 'overdue'
    ELSE 'active'
END
WHERE transaction_type = 'rent' AND rental_status IS NULL;
