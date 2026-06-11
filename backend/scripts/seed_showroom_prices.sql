-- Seed giá showroom cho áo dài Nhà May Thanh Lộc.
-- Đặt lại toàn bộ garment về khung giá demo của tiệm:
--   - giá thuê (rental_price): 100.000 – 150.000đ  (bước 10k)
--   - giá bán  (sale_price)  : 750.000 – 1.500.000đ (bước 50k)
--
-- Idempotent: chạy lại bao nhiêu lần cũng cho giá nằm trong khung trên.
-- Cách chạy (DB dev trong Docker, cổng 5433):
--   docker exec -i tailor_project-db-1 psql -U <user> -d tailor_db \
--     < backend/scripts/seed_showroom_prices.sql
--
-- Ghi chú: ảnh áo dài của tiệm nằm ở frontend/public/uploads/garments/<uuid>.jpg
-- (frontend tự phục vụ theo image_url đã lưu trong bảng garments).

UPDATE garments
SET rental_price = round(random() * 5) * 10000 + 100000,   -- 100k..150k
    sale_price   = round(random() * 15) * 50000 + 750000;  -- 750k..1.500k
