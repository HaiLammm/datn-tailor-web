-- Migration 038: Add pattern-aligned measurement fields to customer profiles
-- Align Story 1.3 customer measurements with Story 11.4 pattern session inputs

ALTER TABLE measurements
    ADD COLUMN IF NOT EXISTS ha_eo DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS vong_nach DECIMAL(5,2),
    ADD COLUMN IF NOT EXISTS vong_bap_tay DECIMAL(5,2);

COMMENT ON COLUMN measurements.ha_eo IS 'Waist drop measurement (cm)';
COMMENT ON COLUMN measurements.vong_nach IS 'Armhole circumference measurement (cm)';
COMMENT ON COLUMN measurements.vong_bap_tay IS 'Bicep circumference measurement (cm)';
