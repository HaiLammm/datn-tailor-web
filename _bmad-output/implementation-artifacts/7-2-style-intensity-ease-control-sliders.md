# Unified Story 7.2: Style Intensity Ease Control Sliders

Status: Phase 1 only — not implemented in Phase 2

## Phase 1 — Requirements (Original)
> Nguồn: docs/2-2-tinh-chinh-cuong-do-phong-cach.md

## Story

As a **Khách hàng**,
I want **điều chỉnh mức độ của các tính từ phong cách qua các thanh trượt**,
so that **tôi có thể tinh chỉnh thiết kế theo đúng cảm xúc cá nhân**.

## Acceptance Criteria

1. **Slider Submission:** Khi người dùng kéo thanh trượt cường độ (ví dụ: "Độ rộng tà áo" từ 0 đến 100%), hệ thống ghi nhận giá trị cường độ (Intensity) và gửi dữ liệu về backend (debounced ~300ms sau lần thay đổi cuối).
2. **Golden Points Display:** Mỗi thanh trượt hiển thị các mốc "Tỷ lệ vàng" (Haptic Golden Points) với màu Heritage Gold (#D4AF37) tại các vị trí đặc biệt mà nghệ nhân khuyến nghị.
3. **Backend Validation:** Backend validate intensity values nằm trong phạm vi `[min_value, max_value]` của slider; trả về soft-constraint warnings nếu giá trị quá cực đoan nhưng vẫn cho phép submit.
4. **Golden Points from LKB:** Mỗi `IntensitySlider` trong Backend LKB phải chứa danh sách `golden_points: list[float]` — các vị trí tỷ lệ vàng theo kinh nghiệm nghệ nhân.
5. **Sequence Control:** Mỗi submission gắn `sequence_id` tăng dần; backend chỉ xử lý request có `sequence_id` cao nhất (race condition protection).
6. **Vietnamese Terminology:** 100% nhãn, cảnh báo, và feedback sử dụng thuật ngữ chuyên môn ngành may Việt Nam (NFR11).

## Phase 2 — Implementation
> Không có story Phase 2 tương ứng

## Traceability
- Phase 1 Story: 2.2 — Tinh chỉnh Cường độ Phong cách (Adjective Intensity Sliders)
- Phase 2 Story: N/A
- Epic: 7
