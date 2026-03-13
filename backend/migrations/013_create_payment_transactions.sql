-- Migration 013: Create payment_transactions table and add payment_status to orders
-- Story 4.1: Xử lý State Thanh toán qua Webhook

-- payment_transactions table for storing webhook callback records
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(255) NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    status VARCHAR(20) NOT NULL,
    raw_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_payment_tx_provider_txid ON payment_transactions(provider, transaction_id);
CREATE INDEX idx_payment_tx_order_id ON payment_transactions(order_id);

-- Add payment_status to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'pending';
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
