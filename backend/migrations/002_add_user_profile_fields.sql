-- Migration 002: Add user profile fields for registration
-- Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP
-- Author: Dev Agent (Amelia)
-- Date: 2026-03-01

-- Add profile fields to users table
ALTER TABLE users
ADD COLUMN full_name VARCHAR(255),
ADD COLUMN phone VARCHAR(20),
ADD COLUMN date_of_birth DATE,
ADD COLUMN gender VARCHAR(20),
ADD COLUMN address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN users.full_name IS 'Full name of the user (Họ và tên)';
COMMENT ON COLUMN users.phone IS 'Phone number (Số điện thoại)';
COMMENT ON COLUMN users.date_of_birth IS 'Date of birth (Ngày tháng năm sinh)';
COMMENT ON COLUMN users.gender IS 'Gender: Male, Female, Other (Giới tính)';
COMMENT ON COLUMN users.address IS 'Full address (Địa chỉ đầy đủ)';
