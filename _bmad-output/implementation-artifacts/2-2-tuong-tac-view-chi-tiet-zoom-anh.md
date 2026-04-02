# Unified Story 2.2: Tương tác View Chi Tiết & Zoom Ảnh

Status: done

## Phase 1 — Requirements (Original)
> Nguồn: docs/5-1-danh-muc-san-pham-trung-bay-so.md

### Story

As a **Khach hang** (Customer),
I want **xem danh sach ao dai cho thue voi hinh anh va mo ta chi tiet**,
So that **toi co the chon duoc bo do ung y truoc khi den tiem**.

### Acceptance Criteria

1. **Given** Khach hang truy cap trang Showroom
   **When** He thong nap danh sach tu co so du lieu
   **Then** Hien thi cac the san pham (Cards) gom: Hinh anh, Ten bo do, Mo ta, Kich co co ban (S/M/L) va Gia thue
   **And** Co bo loc theo mau sac hoac dip le (vd: Le cuoi, Khai truong)

2. **Given** Khach hang xem danh muc showroom
   **When** He thong hien thi danh sach san pham
   **Then** Moi san pham hien thi trang thai thoi gian thuc: Available (San sang), Rented (Dang thue), Maintenance (Giat ui/Sua chua)

3. **Given** He thong hien thi danh muc san pham
   **When** Du lieu duoc load tu database
   **Then** Multi-tenant isolation dam bao chi hien thi san pham cua tenant hien tai (via `tenant_id`)

4. **Given** Trang showroom duoc truy cap
   **When** He thong render trang
   **Then** Trang duoc SSG/ISR optimized theo architecture spec cho `(customer)/` route group

5. **Given** Khach hang xem tren thiet bi di dong
   **When** Giao dien responsive
   **Then** Bo cuc doc voi Bottom Sheet Interaction, toi uu thao tac mot tay, touch targets toi thieu 44x44px

## Phase 2 — Implementation
> Nguồn: _bmad-output/implementation-artifacts/2-2-tuong-tac-view-chi-tiet-zoom-anh.md

# Story 2.2: Tương tác View Chi Tiết & Zoom Ảnh

Status: done

## Story

As a **Khách hàng**,
I want **xem rõ ràng từng sợi vải, bảng size và mô tả trên trang sản phẩm HD**,
so that **tôi nắm bắt chất lượng và chuẩn size đồ trước khi quyết định thuê/mua**.

## Acceptance Criteria

1. **Image Gallery:** Trang chi tiết sản phẩm (`/showroom/[id]`) hiển thị Gallery ảnh HD hỗ trợ nhiều ảnh (carousel/thumbnail navigation). Ảnh chính chiếm ≥60% viewport trên desktop. (FR31)
2. **Zoom Desktop (Hover):** Khi rê chuột (hover) trên ảnh, hiển thị lens zoom phóng đại chi tiết vải/họa tiết. Phản hồi zoom < 200ms. (FR31, NFR17)
3. **Zoom Mobile (Pinch):** Trên thiết bị cảm ứng, hỗ trợ pinch-to-zoom và double-tap-to-zoom cho ảnh sản phẩm. Gesture mượt mà, natural feel. (FR31, NFR19)
4. **Size Chart Expandable:** Phần "Bảng Kích Cỡ" hiển thị dạng Accordion/Disclosure — mặc định collapse, click để mở rộng bao gồm bảng kích thước chi tiết (Ngực, Eo, Mông, Dài) cho từng size S/M/L/XL/XXL. (FR31)
5. **Product Info Section:** Hiển thị đầy đủ: Tên (Cormorant Garamond), Giá (JetBrains Mono, Heritage Gold), Mô tả, Tags (Color, Occasion), Badge Mua/Thuê, và Status Badge. (FR31)
6. **Buy/Rent Toggle:** Cho phép user chọn giữa "Mua" hoặc "Thuê" — toggle switch rõ ràng. Khi chọn "Thuê", hiển thị date picker cho ngày mượn/trả. (FR32)
7. **CTA Actions:** Nút "Thêm vào giỏ hàng" (Heritage Gold) và nút "Đặt lịch Bespoke" (contextual, nếu sản phẩm hỗ trợ). Cả hai nút đều ≥44x44px. (FR31, NFR20)
8. **Responsive Layout:** Desktop: 2-column (60% image / 40% info). Mobile: stacked single-column, ảnh trên - info dưới. (NFR19)
9. **Breadcrumb Navigation:** Breadcrumb "Showroom > [Category] > [Tên sản phẩm]" cho phép quay lại danh sách. (UX: Progressive Forward Navigation)
10. **Skeleton Loading:** Hiển thị skeleton placeholder khi đang tải dữ liệu, duy trì spatial context. Không dùng spinner. (UX: Graceful Recovery)
11. **Vietnamese Terminology:** Toàn bộ nhãn UI sử dụng 100% thuật ngữ tiếng Việt chuyên ngành. (NFR18)

## Tasks / Subtasks

- [x] **Task 1: Backend — Mở rộng Garment Model hỗ trợ multi-image** (AC: #1)
  - [x] 1.1: Thêm field `image_urls: list[str]` vào `GarmentBase` Pydantic model (bên cạnh `image_url` single hiện có, backward-compatible).
  - [x] 1.2: Thêm field `sale_price: Decimal | None` vào `GarmentBase` cho sản phẩm bán (bên cạnh `rental_price`).
  - [x] 1.3: Thêm cột `image_urls` (JSON Array) và `sale_price` vào bảng `garments` trong DB (migration/manual).
  - [x] 1.4: Cập nhật `GarmentResponse` model — thêm `image_urls`, `sale_price`, giữ backward-compatible `image_url`.
  - [x] 1.5: Cập nhật `GarmentCreate` và `GarmentUpdate` schemas.
  - [x] 1.6: Cập nhật `garment_service` nếu cần xử lý image_urls.
  - [x] 1.7: Cập nhật tests cho models và API.

- [x] **Task 2: Frontend — Cập nhật TypeScript types** (AC: #1, #5)
  - [x] 2.1: Thêm `image_urls: string[]` và `sale_price: string | null` vào interface `Garment` trong `types/garment.ts`.

- [x] **Task 3: Frontend — Image Gallery Component** (AC: #1, #2, #3)
  - [x] 3.1: Cài đặt thư viện `react-medium-image-zoom` (zero-dep, Next.js compatible, maintained 2026).
  - [x] 3.2: Tạo component `ProductImageGallery.tsx` tại `frontend/src/components/client/showroom/`.
  - [x] 3.3: Implement thumbnail strip (horizontal scroll mobile, vertical strip desktop).
  - [x] 3.4: Implement main image viewer full-width với Next.js `<Image>` component (priority loading, optimized sizes).
  - [x] 3.5: Integrate `react-medium-image-zoom` wrapper quanh main image — hover zoom trên desktop, pinch/double-tap trên mobile.
  - [x] 3.6: Hỗ trợ navigation giữa ảnh bằng arrow keys (keyboard accessibility).

- [x] **Task 4: Frontend — Size Chart Component** (AC: #4)
  - [x] 4.1: Tạo component `SizeChartAccordion.tsx` tại `frontend/src/components/client/showroom/`.
  - [x] 4.2: Dùng Headless UI Disclosure hoặc HTML `<details>` wrapper (nhẹ, WCAG compliant).
  - [x] 4.3: Bảng kích thước sử dụng JetBrains Mono cho dữ liệu số, Inter cho label, thuật ngữ Việt (Ngực, Eo, Mông, Dài áo).
  - [x] 4.4: Hardcoded size chart data ban đầu (phase sau: fetch từ backend per category).

- [x] **Task 5: Frontend — Buy/Rent Toggle & CTA** (AC: #6, #7)
  - [x] 5.1: Tạo component `BuyRentToggle.tsx` — Headless UI Switch, Heritage styling.
  - [x] 5.2: Khi mode = "Thuê": hiển thị date picker đơn giản cho ngày mượn/trả (native `<input type="date">`).
  - [x] 5.3: Nút "Thêm vào giỏ hàng" — Heritage Gold bg, large size, disabled nếu out of stock.
  - [x] 5.4: Nút "Đặt lịch Bespoke" — Indigo Depth bg, hiển thị conditional (placeholder cho Epic 3).

- [x] **Task 6: Frontend — Redesign Product Detail Page** (AC: #5, #8, #9, #10)
  - [x] 6.1: Refactor `showroom/[id]/page.tsx` — Server Component fetch data.
  - [x] 6.2: Tạo `ProductDetailClient.tsx` — Client Component render gallery, info, actions.
  - [x] 6.3: Implement 2-column responsive layout (ảnh 60% / info 40% desktop, stacked mobile).
  - [x] 6.4: Thêm Breadcrumb navigation component.
  - [x] 6.5: Implement skeleton loading states.
  - [x] 6.6: Áp dụng Heritage Palette & Dual-Tone Typography chính xác (Cormorant Garamond headings, JetBrains Mono prices, Inter body).

- [x] **Task 7: Testing** (All ACs)
  - [x] 7.1: Backend: update existing garment model tests cho `image_urls`, `sale_price`.
  - [x] 7.2: Backend: update existing API tests cho garment detail response.
  - [x] 7.3: Frontend: Unit test `ProductImageGallery` — render, thumbnail click, keyboard navigation.
  - [x] 7.4: Frontend: Unit test `SizeChartAccordion` — expand/collapse, accessibility.
  - [x] 7.5: Frontend: Unit test `BuyRentToggle` — mode switch, date picker visibility.
  - [x] 7.6: Frontend: Update existing showroom page tests.

### Review Follow-ups (AI)

- [x] [AI-Review][CRITICAL] AC10: ProductDetailSkeleton created but never integrated — cần tạo `loading.tsx` tại `app/(customer)/showroom/[id]/loading.tsx` hoặc dùng `<Suspense>` trong page.tsx [`frontend/src/components/client/showroom/ProductDetailSkeleton.tsx`]
- [x] [AI-Review][HIGH] AC7/NFR20: Arrow prev/next buttons trong ProductImageGallery dùng `w-9 h-9` (36px) — cần tăng lên ≥44px (`w-11 h-11`) [`frontend/src/components/client/showroom/ProductImageGallery.tsx:132,140`]
- [x] [AI-Review][MEDIUM] DRY: `CATEGORY_LABEL` trùng lặp giữa `page.tsx:17-22` và `ProductDetailClient.tsx:19-24` — extract ra shared constant [`frontend/src/app/(customer)/showroom/[id]/page.tsx`, `frontend/src/components/client/showroom/ProductDetailClient.tsx`]
- [x] [AI-Review][MEDIUM] Backend: `image_urls: list[str]` thiếu validation URL format và max_length per item — có thể nhận dữ liệu rác [`backend/src/models/garment.py:51`]
- [x] [AI-Review][MEDIUM] `allImages` tính lại mỗi render gây recreate `goTo` callback — dùng `useMemo` [`frontend/src/components/client/showroom/ProductImageGallery.tsx:32-36`]
- [x] [AI-Review][MEDIUM] `formatPrice` utility định nghĩa bên trong BuyRentToggle component — move ra ngoài component body [`frontend/src/components/client/showroom/BuyRentToggle.tsx:40-43`]
- [x] [AI-Review][LOW] Thumbnail `key={i}` dùng array index — nên dùng `key={url}` [`frontend/src/components/client/showroom/ProductImageGallery.tsx:86`]
- [x] [AI-Review][LOW] Test mocks `garmentCard.test.tsx` và `returnTimeline.test.tsx` thiếu fields `renter_*`/`reminder_*` từ Garment interface (pre-existing Story 5.4)
- [x] [AI-Review][LOW] `package-lock.json` không có trong story File List — documentation gap

## Dev Notes

### Architecture Compliance

- **Authoritative Server Pattern:** Backend cung cấp danh sách `image_urls` và pricing — Frontend KHÔNG tự tạo URL hay tính giá.
- **Proxy Pattern:** Trang chi tiết là public endpoint (không cần auth), gọi `GET /api/v1/garments/{id}` trực tiếp qua Server Action (`fetchGarmentDetail`).
- **Server/Client Split:** Page (`page.tsx`) là Server Component fetch data → pass props cho `ProductDetailClient.tsx` Client Component.
- **Zustand:** KHÔNG tạo store mới cho story này. Dữ liệu chi tiết sản phẩm thuần Server-side rendered, chỉ cần local state cho gallery index và buy/rent mode.
- **API Response Wrapper:** Backend trả `{ "data": {...} }` — Frontend extract `response.data`.

### Library & Framework Requirements

| Library | Version | Purpose |
|:---|:---|:---|
| `react-medium-image-zoom` | Latest (2026) | Zero-dep image zoom, Next.js compatible. Hover zoom desktop, pinch mobile |
| Next.js `<Image>` | 16.1.6 (project version) | Optimized image loading, responsive sizes, priority loading |
| Headless UI `Disclosure` | Latest | Accessible accordion for Size Chart (WCAG 2.1 AA) |
| Tailwind CSS v4 | ^4 (project version) | Styling, Heritage Palette tokens |

### File Structure Requirements

**Backend (Modified):**
- `backend/src/models/garment.py` — Thêm `image_urls`, `sale_price` fields
- `backend/tests/test_garment_*.py` — Update tests

**Frontend (New):**
- `frontend/src/components/client/showroom/ProductImageGallery.tsx` — Image gallery + zoom
- `frontend/src/components/client/showroom/SizeChartAccordion.tsx` — Expandable size chart
- `frontend/src/components/client/showroom/BuyRentToggle.tsx` — Buy/Rent mode switch
- `frontend/src/components/client/showroom/Breadcrumb.tsx` — Breadcrumb navigation
- `frontend/src/components/client/showroom/ProductDetailClient.tsx` — Client wrapper
- `frontend/src/components/client/showroom/ProductDetailSkeleton.tsx` — Skeleton loading

**Frontend (Modified):**
- `frontend/src/app/(customer)/showroom/[id]/page.tsx` — Refactor to use new components
- `frontend/src/types/garment.ts` — Add `image_urls`, `sale_price` fields

### Testing Requirements

- Backend: Pytest — update existing garment tests, assert `image_urls` in response.
- Frontend: Jest + Testing Library — render tests, interaction tests (click thumbnail, toggle mode, expand accordion).
- Accessibility: Verify keyboard navigation in gallery (arrow keys), accordion (Enter/Space), focus management.

### Design Tokens (Heritage Palette v2)

```
Primary:       #1A2B4C (Indigo Depth) — headers, breadcrumb link
Surface:       #F9F7F2 (Silk Ivory) — page background
Accent:        #D4AF37 (Heritage Gold) — CTA buttons, price, selected thumbnail border
Text Primary:  #1A1A2E (Deep Charcoal) — body text
Text Secondary:#6B7280 (Warm Gray) — labels, metadata
Success:       #059669 (Jade Green) — "Sẵn sàng" badge
Warning:       #D97706 (Amber) — "Đang thuê" badge
Error:         #DC2626 (Ruby Red) — "Bảo trì" badge

Typography:
- H1 (Product Name):    Cormorant Garamond, 600, 2rem
- Price:                JetBrains Mono, 400, 1.875rem, Heritage Gold
- Body:                 Inter, 400, 0.875rem
- Labels/Tags:          Inter, 400, 0.75rem
- Size Chart Numbers:   JetBrains Mono, 400, 0.875rem
```

## Previous Story Intelligence

### Story 2.1 (Lựa chọn Phong cách) — Learnings

- **Zustand Store Pattern:** `useDesignStore` established in Story 2.1 — đừng tạo store mới không cần thiết. Story này không cần Zustand.
- **Server/Client Pattern:** Story 2.1 dùng pattern Server Component fetch → Client Component render. **Reuse pattern đó.**
- **Component Location:** Components nằm tại `frontend/src/components/client/` — đặt showroom components tại `components/client/showroom/` (đã tồn tại).
- **API Wrapper:** Respose format `{ data: {...} }` — extract qua Server Action `fetchGarmentDetail` (đã tồn tại).
- **Review Findings (Story 2.1):** 3 LOW issues — (1) dùng `<Image>` thay `<img>`, (2) hardcoded BACKEND_URL fallback, (3) missing error boundary. **Áp dụng bài học: dùng Next.js `<Image>` cho tất cả ảnh, handle env var đúng cách, add error boundary.**

### Existing Code to Reuse (DO NOT Reinvent)

- `fetchGarmentDetail()` — Server Action tại `app/actions/garment-actions.ts` (đã tồn tại).
- `StatusBadge` component — tại `components/client/showroom/StatusBadge.tsx` (đã tồn tại, dùng nguyên).
- `ReturnTimeline` component — tại `components/client/showroom/ReturnTimeline.tsx` (đã tồn tại, giữ lại).
- `Garment` interface — tại `types/garment.ts` (cần mở rộng, KHÔNG tạo file mới).
- Page detail route — tại `showroom/[id]/page.tsx` (refactor, KHÔNG xóa tạo lại).

### Git Intelligence

Các commit gần đây cho thấy pattern rõ ràng:
- **Feature commits:** Format `feat(epic-N): implement Story X.Y - [title]`
- **Refactor commits:** Separate commit cho infrastructure changes
- **Fix commits:** Phát hiện vấn đề proxy forwarding → đã fix
- **Dependencies:** Zustand đã cài. Framer Motion chưa cài (chưa cần cho story này).

## Project Context Reference

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.2]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Visual Design Foundation]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Component Strategy — ProductCard]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/2-1-lua-chon-tru-cot-phong-cach.md]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (claude-opus-4-6)

### Debug Log References

None — implementation completed without errors. Pre-existing `test_designs_api.py` failure unrelated to Story 2.2 (AttributeError in hard_constraints.py).

### Review Follow-up Resolution (2026-03-11)

1. Resolved review finding [CRITICAL]: Tạo `loading.tsx` tại `app/(customer)/showroom/[id]/loading.tsx` — tích hợp ProductDetailSkeleton qua Next.js Route Segment loading convention (AC10).
2. Resolved review finding [HIGH]: Arrow buttons tăng từ `w-9 h-9` (36px) lên `w-11 h-11` (44px) để đạt NFR20 touch target.
3. Resolved review finding [MEDIUM]: Extract `CATEGORY_LABEL` ra `garmentConstants.ts`, cả `page.tsx` và `ProductDetailClient.tsx` đều import từ đây.
4. Resolved review finding [MEDIUM]: Thêm `validate_image_urls` field validator trong `GarmentBase` — kiểm tra URL format (http/https), non-empty, max_length 500.
5. Resolved review finding [MEDIUM]: `allImages` dùng `useMemo([imageUrls, imageUrl])` — `goTo` callback không bị recreate mỗi render.
6. Resolved review finding [MEDIUM]: `formatPrice` move ra ngoài BuyRentToggle component body — module-level function.
7. Resolved review finding [LOW]: Thumbnail `key={url}` thay `key={i}`.
8. Resolved review finding [LOW]: Test mocks `garmentCard.test.tsx` và `returnTimeline.test.tsx` thêm đầy đủ `renter_*`/`reminder_*` fields.
9. Resolved review finding [LOW]: `package-lock.json` — documentation gap acknowledged.

### Completion Notes List

1. **Backend: Model Extension**
   - Added `image_urls: list[str]` (default `[]`) and `sale_price: Decimal | None` to `GarmentBase`, `GarmentResponse`, `GarmentCreate`, `GarmentUpdate`
   - Added `image_urls` (JSON) and `sale_price` (Numeric 10,2) columns to `GarmentDB` ORM model
   - Updated `create_garment()` service to persist both new fields
   - Backward-compatible: `image_url` single field preserved

2. **Frontend: TypeScript Types**
   - Added `sale_price: string | null` and `image_urls: string[]` to `Garment` interface

3. **Frontend: ProductImageGallery**
   - `react-medium-image-zoom@5.4.1` installed — provides hover zoom (desktop) + pinch/double-tap (mobile)
   - Thumbnail strip: horizontal scroll mobile, vertical strip desktop
   - Arrow key navigation + prev/next overlay buttons
   - Dot indicator for active image position
   - Graceful fallback: `imageUrls` → `imageUrl` → empty placeholder
   - Next.js `<Image>` with `priority` on first image, `fill` for all

4. **Frontend: SizeChartAccordion**
   - HTML `<details>/<summary>` — no extra dependency, WCAG 2.1 AA
   - Hardcoded 5-size chart (S/M/L/XL/XXL) with Ngực/Eo/Mông/Dài áo
   - Available sizes highlighted with Indigo Depth badge; unavailable dimmed
   - JetBrains Mono for numbers, Inter for labels

5. **Frontend: BuyRentToggle**
   - Toggle Thuê/Mua with aria-checked roles
   - Date picker (native `<input type="date">`) appears only in Thuê mode
   - Mua button disabled if `sale_price=null`
   - "Thêm vào giỏ hàng" (Heritage Gold) + "Đặt lịch Bespoke" (Indigo Depth) — both ≥44px touch targets
   - CTA disabled + text changed to "Hết hàng" when `isAvailable=false`

6. **Frontend: Page Refactor**
   - `page.tsx`: Server Component fetch → pass to `ProductDetailClient`
   - Added `Breadcrumb` component: "Showroom > [Category] > [Tên sản phẩm]"
   - `ProductDetailSkeleton`: skeleton placeholder (no spinner)
   - `ProductDetailClient`: 2-column layout (3fr/2fr desktop, stacked mobile)
   - Reused `StatusBadge`, `ReturnTimeline` from Story 5.1/5.2

7. **Testing**
   - Backend: 5 new tests in `test_garments_api.py` for `image_urls` and `sale_price`; 67 total pass
   - Frontend: 13 new tests (ProductImageGallery: 13, SizeChartAccordion: 7, BuyRentToggle: 11)
   - Updated 6 existing test files with new `Garment` fields
   - Total: 347 frontend tests, 67 backend garment tests — 0 failures

### File List

**Backend (Modified):**
- `backend/src/models/garment.py` — Added `image_urls`, `sale_price` to GarmentBase, GarmentResponse, GarmentCreate, GarmentUpdate
- `backend/src/models/db_models.py` — Added `image_urls` (JSON), `sale_price` (Numeric) to GarmentDB
- `backend/src/services/garment_service.py` — Updated `create_garment()` with new fields
- `backend/tests/test_garments_api.py` — Added 5 Story 2.2 tests for image_urls/sale_price

**Frontend (New):**
- `frontend/src/components/client/showroom/ProductImageGallery.tsx` — Image gallery + zoom
- `frontend/src/components/client/showroom/SizeChartAccordion.tsx` — Expandable size chart
- `frontend/src/components/client/showroom/BuyRentToggle.tsx` — Buy/Rent mode switch + CTA
- `frontend/src/components/client/showroom/Breadcrumb.tsx` — Breadcrumb navigation
- `frontend/src/components/client/showroom/ProductDetailClient.tsx` — Client wrapper
- `frontend/src/components/client/showroom/ProductDetailSkeleton.tsx` — Skeleton loading
- `frontend/src/__tests__/productImageGallery.test.tsx` — 13 tests
- `frontend/src/__tests__/sizeChartAccordion.test.tsx` — 7 tests
- `frontend/src/__tests__/buyRentToggle.test.tsx` — 11 tests

**Frontend (Modified):**
- `frontend/src/app/(customer)/showroom/[id]/page.tsx` — Refactored with new components + Breadcrumb
- `frontend/src/types/garment.ts` — Added `image_urls`, `sale_price` fields
- `frontend/src/components/client/showroom/index.ts` — Added exports for 6 new components
- `frontend/src/__tests__/garmentCard.test.tsx` — Updated mock with new Garment fields
- `frontend/src/__tests__/returnTimeline.test.tsx` — Updated mock with new Garment fields
- `frontend/src/__tests__/inventoryCard.test.tsx` — Updated mock with new Garment fields
- `frontend/src/__tests__/statusUpdatePanel.test.tsx` — Updated mock with new Garment fields
- `frontend/src/__tests__/inventoryList.test.tsx` — Updated mock with new Garment fields
- `frontend/src/__tests__/showroomPage.test.tsx` — Updated mock with new Garment fields
- `frontend/package.json` — Added `react-medium-image-zoom@5.4.1`
- `frontend/package-lock.json` — Updated with react-medium-image-zoom dependency

**Review Follow-up Fixes (2026-03-11):**
- `frontend/src/app/(customer)/showroom/[id]/loading.tsx` — New: Next.js loading segment using ProductDetailSkeleton (AC10 fix)
- `frontend/src/components/client/showroom/garmentConstants.ts` — New: Shared CATEGORY_LABEL constant (DRY fix)
- `frontend/src/components/client/showroom/ProductImageGallery.tsx` — Arrow buttons 44px, useMemo, key={url}
- `frontend/src/components/client/showroom/BuyRentToggle.tsx` — formatPrice moved outside component
- `frontend/src/components/client/showroom/ProductDetailClient.tsx` — Import CATEGORY_LABEL from garmentConstants
- `frontend/src/app/(customer)/showroom/[id]/page.tsx` — Import CATEGORY_LABEL from garmentConstants
- `frontend/src/components/client/showroom/index.ts` — Export garmentConstants
- `frontend/src/__tests__/garmentCard.test.tsx` — Added renter_*/reminder_* mock fields
- `frontend/src/__tests__/returnTimeline.test.tsx` — Added renter_*/reminder_* mock fields
- `backend/src/models/garment.py` — Added validate_image_urls field validator

## Change Log

| Date | Description |
|:---|:---|
| 2026-03-10 | Initial implementation: Backend model extension, frontend components, tests (Story 2.2) |
| 2026-03-11 | Addressed code review findings — 9 items resolved (1 Critical, 1 High, 4 Medium, 3 Low) |

## Traceability
- Phase 1 Story: 5.1 - Danh muc san pham trung bay so (Tách từ 5-1)
- Phase 2 Story: 2.2 - Tương tác View Chi Tiết & Zoom Ảnh
- Epic: 2
