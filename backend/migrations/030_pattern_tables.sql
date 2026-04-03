-- Migration: 030_pattern_tables.sql
-- Story 11.1: DB Migration — Pattern Data Model
-- Date: 2026-04-03
-- Depends on: 029_add_payment_method_to_transactions.sql
--
-- Changes:
--   1. Create pattern_sessions table (10 measurement snapshot columns)
--   2. Create pattern_pieces table (SVG + geometry params)
--   3. Add pattern_session_id FK to orders table

-- ============================================================
-- 1. pattern_sessions — Snapshot 10 body measurements for pattern generation
-- ============================================================

CREATE TABLE IF NOT EXISTS pattern_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 10 measurement snapshot columns (immutable at generation time)
    -- Vietnamese tailoring terminology — DO NOT translate to English
    do_dai_ao NUMERIC(5,1) NOT NULL,       -- body length
    ha_eo NUMERIC(5,1) NOT NULL,            -- waist drop
    vong_co NUMERIC(5,1) NOT NULL,          -- neck circumference
    vong_nach NUMERIC(5,1) NOT NULL,        -- armhole circumference
    vong_nguc NUMERIC(5,1) NOT NULL,        -- bust circumference
    vong_eo NUMERIC(5,1) NOT NULL,          -- waist circumference
    vong_mong NUMERIC(5,1) NOT NULL,        -- hip circumference
    do_dai_tay NUMERIC(5,1) NOT NULL,       -- sleeve length
    vong_bap_tay NUMERIC(5,1) NOT NULL,     -- bicep circumference
    vong_co_tay NUMERIC(5,1) NOT NULL,      -- wrist circumference

    garment_type VARCHAR(50) NOT NULL DEFAULT 'ao_dai',
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT check_pattern_session_status
        CHECK (status IN ('draft', 'completed', 'exported'))
);

CREATE INDEX IF NOT EXISTS idx_pattern_sessions_tenant_customer
    ON pattern_sessions(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_pattern_sessions_tenant_created_by
    ON pattern_sessions(tenant_id, created_by);
CREATE INDEX IF NOT EXISTS idx_pattern_sessions_status
    ON pattern_sessions(status);

-- ============================================================
-- 2. pattern_pieces — Generated pattern pieces (3 per session)
-- ============================================================

CREATE TABLE IF NOT EXISTS pattern_pieces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES pattern_sessions(id) ON DELETE CASCADE,
    piece_type VARCHAR(20) NOT NULL,
    svg_data TEXT NOT NULL,
    geometry_params JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT check_piece_type
        CHECK (piece_type IN ('front_bodice', 'back_bodice', 'sleeve'))
);

CREATE INDEX IF NOT EXISTS idx_pattern_pieces_session
    ON pattern_pieces(session_id);
CREATE INDEX IF NOT EXISTS idx_pattern_pieces_session_type
    ON pattern_pieces(session_id, piece_type);

-- ============================================================
-- 3. Add pattern_session_id FK to orders table
-- ============================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS pattern_session_id UUID
    REFERENCES pattern_sessions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_orders_pattern_session
    ON orders(pattern_session_id) WHERE pattern_session_id IS NOT NULL;
