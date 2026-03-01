-- Migration 003: Create OTP codes table
-- Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP
-- Author: Dev Agent (Amelia)
-- Date: 2026-03-01

-- Create otp_codes table for email verification
CREATE TABLE otp_codes (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_otp_email ON otp_codes(email);
CREATE INDEX idx_otp_expires ON otp_codes(expires_at);
CREATE INDEX idx_otp_is_used ON otp_codes(is_used);

-- Add comments for documentation
COMMENT ON TABLE otp_codes IS 'OTP verification codes for email authentication';
COMMENT ON COLUMN otp_codes.email IS 'Email address associated with this OTP';
COMMENT ON COLUMN otp_codes.code IS '6-digit OTP code';
COMMENT ON COLUMN otp_codes.expires_at IS 'Expiration timestamp (10 minutes from creation)';
COMMENT ON COLUMN otp_codes.is_used IS 'Whether this OTP has been used';
COMMENT ON COLUMN otp_codes.created_at IS 'Creation timestamp';
