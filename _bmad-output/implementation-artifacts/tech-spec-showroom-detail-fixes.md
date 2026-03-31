---
title: 'Showroom Detail — Bespoke Link, Checkout Logic Fix & Size Chart Styling'
type: 'feature'
created: '2026-03-31'
status: 'done'
baseline_commit: '2b6aa7e'
context: ['_bmad-output/project-context.md']
---

# Showroom Detail — Bespoke Link, Checkout Logic Fix & Size Chart Styling

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Trang showroom detail có 4 vấn đề: (1) Nút "Đặt lịch Bespoke" là placeholder chưa hoạt động — trang /booking đã có sẵn nhưng chưa được liên kết, (2) Nút "Thêm vào giỏ hàng" trong BuyRentToggle chưa kết nối logic cart — không mở modal phù hợp theo mode Thuê/Mua, (3) Tồn tại 2 nút AddToCartButton riêng ("Thêm Thuê"/"Thêm Mua") gây trùng lặp vì đã có toggle Thuê/Mua, (4) Bảng kích cỡ font quá lớn và cột "Cỡ" quá rộng.

**Approach:** (1) Nút "Đặt lịch Bespoke" navigate tới `/booking` (trang booking đã tồn tại). (2) Nút "Thêm vào giỏ hàng" trong BuyRentToggle đổi thành "Tiến hành thanh toán" — mở RentalDateModal khi mode=thue, SizeSelectModal khi mode=mua. (3) Xóa 2 AddToCartButton riêng khỏi ProductDetailClient. (4) Giảm font-size và width cột "Cỡ" trong SizeChartAccordion.

## Boundaries & Constraints

**Always:** Dùng Heritage palette (#1A2B4C, #D4AF37, #F9F7F2). Min-h 44px cho touch targets. Thuật ngữ Việt.

**Ask First:** Nếu cần thay đổi backend API hoặc cartStore logic.

**Never:** Không tạo API endpoint mới. Không tạo modal booking mới (dùng trang /booking có sẵn). Không đặt client component trong app/.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Bespoke click | User clicks "Đặt lịch Bespoke" | Navigate to /booking | N/A |
| Checkout mode=thue | User clicks "Tiến hành thanh toán" with Thuê selected | RentalDateModal opens | N/A |
| Checkout mode=mua | User clicks "Tiến hành thanh toán" with Mua selected | SizeSelectModal opens | N/A |
| Product rent-only | sale_price=null, mode forced to "thue" | Mua button disabled, only rent flow available | N/A |

</frozen-after-approval>

## Code Map

- `components/client/showroom/BuyRentToggle.tsx` -- Toggle + CTA buttons, needs cart modal integration + Bespoke link
- `components/client/showroom/ProductDetailClient.tsx` -- Remove standalone AddToCartButton instances, pass garment to BuyRentToggle
- `components/client/showroom/SizeChartAccordion.tsx` -- Reduce font-size and "Cỡ" column width
- `components/client/showroom/RentalDateModal.tsx` -- Existing, reused by BuyRentToggle
- `components/client/showroom/SizeSelectModal.tsx` -- Existing, reused by BuyRentToggle

## Tasks & Acceptance

**Execution:**
- [ ] `components/client/showroom/BuyRentToggle.tsx` -- MODIFY: (a) Add garment prop. (b) Import RentalDateModal + SizeSelectModal. (c) Rename "Thêm vào giỏ hàng" → "Tiến hành thanh toán". (d) onClick opens RentalDateModal when mode=thue, SizeSelectModal when mode=mua. (e) "Đặt lịch Bespoke" becomes Next.js Link to /booking.
- [ ] `components/client/showroom/ProductDetailClient.tsx` -- MODIFY: Remove AddToCartButton section (lines 82-89). Pass garment prop to BuyRentToggle.
- [ ] `components/client/showroom/SizeChartAccordion.tsx` -- MODIFY: Reduce table font from text-sm to text-xs. Reduce "Cỡ" column badge from w-8 h-8 to w-6 h-6. Reduce cell padding from px-3 py-2 to px-2 py-1.5.

**Acceptance Criteria:**
- Given showroom detail page, when user clicks "Đặt lịch Bespoke", then navigates to /booking
- Given mode=Thuê selected, when user clicks "Tiến hành thanh toán", then RentalDateModal opens
- Given mode=Mua selected, when user clicks "Tiến hành thanh toán", then SizeSelectModal opens
- Given showroom detail page, then no separate "Thêm Thuê"/"Thêm Mua" buttons are visible
- Given size chart accordion open, then font is smaller and "Cỡ" column is narrower than before

## Spec Change Log

- v2: Bespoke booking page already exists at /booking — changed from creating new modal to linking to existing page.

## Verification

**Commands:**
- `cd frontend && npx tsc --noEmit` -- expected: no type errors
- `cd frontend && npm run build` -- expected: build succeeds

**Manual checks:**
- Visit /showroom/{id}, verify "Đặt lịch Bespoke" navigates to /booking
- Verify toggle Thuê/Mua with "Tiến hành thanh toán" opens correct modal
- Verify no "Thêm Thuê"/"Thêm Mua" buttons exist
- Verify size chart has smaller font and narrower "Cỡ" column
