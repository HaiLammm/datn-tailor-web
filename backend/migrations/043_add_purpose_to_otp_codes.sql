-- Migration 043: Add 'purpose' column to otp_codes (model/schema drift fix)
-- OtpCodeDB.purpose exists in the ORM model (String(50), NOT NULL, default 'register',
-- indexed) but no migration ever added the column — 003 created otp_codes without it.
-- OTP flows (register / password reset) that read or write `purpose` therefore fail.
-- Existing rows backfill to 'register' (the model default). Idempotent.

ALTER TABLE otp_codes
    ADD COLUMN IF NOT EXISTS purpose VARCHAR(50) NOT NULL DEFAULT 'register';

CREATE INDEX IF NOT EXISTS idx_otp_codes_purpose ON otp_codes(purpose);
