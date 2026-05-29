-- Add missing columns: sale_price, quantity, image_urls
ALTER TABLE garments ADD COLUMN IF NOT EXISTS sale_price NUMERIC(10,2);
ALTER TABLE garments ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
ALTER TABLE garments ADD COLUMN IF NOT EXISTS image_urls JSONB NOT NULL DEFAULT '[]'::jsonb;
