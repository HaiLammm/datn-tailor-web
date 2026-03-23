# Unified Story 7.3: Hệ gợi ý loại vải từ thông số

Status: Phase 1 only — not implemented in Phase 2

## Phase 1 — Requirements (Original)
> Nguồn: docs/2-3-goi-y-chat-lieu-vai-dua-tren-phong-cach.md

## Story

As a **Khách hàng**,
I want **nhận được gợi ý về loại vải phù hợp với phong cách đã chọn**,
so that **thiết kế cuối cùng đảm bảo tính thẩm mỹ và khả thi khi may**.

## Acceptance Criteria

1. **Fabric Request Trigger:** Khi người dùng đã chọn phong cách (Story 2.1) và điều chỉnh cường độ (Story 2.2), hệ thống cho phép yêu cầu gợi ý vải thông qua nút "Xem gợi ý vải" trên Design Session UI.
2. **Backend Fabric Recommendation:** Backend API `GET /api/v1/fabrics/recommendations?pillar_id={id}&intensities={json}` trả về danh sách vải phù hợp dựa trên:
   - Phong cách đã chọn (pillar_id)
   - Các giá trị cường độ hiện tại (intensity_values)
   - Đặc tính vải (độ rủ, lý tính vật liệu) phù hợp với cấu trúc rập
3. **Fabric Card Display:** Mỗi gợi ý vải hiển thị dưới dạng "Fabric Card" gồm:
   - Hình ảnh texture của vải (hoặc placeholder)
   - Tên vải bằng tiếng Việt (vd: Lụa Hà Đông, Gấm Thái Tuấn, Voan Pháp)
   - Mô tả đặc tính vải (độ rủ, độ dày, độ co dãn)
   - Mức độ phù hợp (percentage hoặc badge: "Rất phù hợp", "Phù hợp", "Có thể dùng")
4. **LKB Fabric Data:** Fabric data được lưu trữ trong Local Knowledge Base tại Backend (hardcoded ban đầu, không cần DB).
5. **Vietnamese Terminology:** 100% nhãn, mô tả sử dụng thuật ngữ chuyên môn ngành may Việt Nam (NFR11).
6. **No Blocking:** Gợi ý vải là tính năng tùy chọn — không block flow nếu người dùng không yêu cầu.

## Phase 2 — Implementation
> Không có story Phase 2 tương ứng

## Traceability
- Phase 1 Story: 2.3 — Gợi ý Chất liệu Vải dựa trên Phong cách (Fabric Recommendation)
- Phase 2 Story: N/A
- Epic: 7
