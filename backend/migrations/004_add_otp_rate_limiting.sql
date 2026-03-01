-- Migration 004: Add OTP rate limiting
-- Story 1.2: HIGH Priority Fix - Prevent OTP spam

-- Add created_at index to otp_codes for rate limiting queries
CREATE INDEX IF NOT EXISTS idx_otp_codes_created_at ON otp_codes(created_at);

-- Create composite index for rate limiting queries (email + created_at)
CREATE INDEX IF NOT EXISTS idx_otp_codes_email_created ON otp_codes(email, created_at DESC);
