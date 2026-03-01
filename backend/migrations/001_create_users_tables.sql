-- Migration 001: Create users and staff_whitelist tables
-- Story 1.1: Đăng nhập Hệ thống Đa phương thức

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),  -- NULL for Google OAuth users
    role VARCHAR(50) NOT NULL DEFAULT 'Customer',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff whitelist table for role detection
CREATE TABLE IF NOT EXISTS staff_whitelist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL,  -- 'Tailor' | 'Owner'
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_staff_whitelist_email ON staff_whitelist (email);
