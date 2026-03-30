-- Migration 027: Add structured shipping address + auto_fill_infor to users table
-- Enables auto-fill shipping info at checkout from customer profile data.

ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_province VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_district VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_ward VARCHAR(100) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS shipping_address_detail TEXT DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auto_fill_infor BOOLEAN NOT NULL DEFAULT FALSE;
