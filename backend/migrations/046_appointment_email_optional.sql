-- Migration 046: Email không bắt buộc khi đặt lịch (aodaithanhloc giai đoạn 1, 22/11/2026)
-- Khách ở tiệm chủ yếu liên hệ bằng điện thoại/Zalo; bắt nhập email làm rớt lịch hẹn.
-- Idempotent: DROP NOT NULL chạy lại không lỗi.

ALTER TABLE appointments
    ALTER COLUMN customer_email DROP NOT NULL;
