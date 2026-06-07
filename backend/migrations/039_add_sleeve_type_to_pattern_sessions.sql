-- Migration 039: Add sleeve_type to pattern_sessions (Story 11.7, FR91a)
-- Records the sleeve construction style chosen at session creation:
--   'raglan' (tay liền cổ) | 'set_in' (tay tra — cap drafted from the body armhole, FR93).
-- Existing rows default to 'raglan' (the prior behaviour).

ALTER TABLE pattern_sessions
    ADD COLUMN sleeve_type VARCHAR(20) NOT NULL DEFAULT 'raglan';
