# Unified Story 3.1: Cart State Management (Zustand + TanStack)

Status: done

## Phase 1 — Requirements (Original)
> Không có story Phase 1 tương ứng — story được tạo mới trong Phase 2

## Phase 2 — Implementation  
> Nguồn: _bmad-output/implementation-artifacts/3-1-cart-state-management.md

# Story 3.1: Cart State Management (Zustand + TanStack)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khách hàng,
I want thêm/sửa/xoá một chiếc Áo Dài từ màn hình Showroom vào Giỏ Hàng chung (Buy/Rent),
so that tôi dễ dàng Gom Đơn và kiểm tra tổng chi phí.

## Acceptance Criteria

1. **Given** Component Thẻ sản phẩm (GarmentCard) hoặc trang Chi tiết sản phẩm (ProductDetailClient)
   **When** Khách bấm nút "Thêm Thuê" (chọn ngày thuê) hoặc "Thêm Mua" (chọn size)
   **Then** Zustand Cart Store cập nhật Optimistic UI ngay lập tức (không chờ server)
   **And** Icon Cart trên Navbar hiển thị badge đếm số lượng items trong giỏ

2. **Given** Giỏ hàng có ít nhất 1 item
   **When** Khách mở Cart Drawer/Modal (click icon Cart Navbar)
   **Then** Danh sách items hiển thị đầy đủ: tên sản phẩm, loại (Thuê/Mua), chi tiết (ngày thuê hoặc size), giá, ảnh thumbnail
   **And** Nút xóa từng item và tổng giá trị đơn hàng

3. **Given** Cart Drawer/Modal đang mở
   **When** Khách bấm nút Xóa item
   **Then** Item bị xóa khỏi Zustand store ngay lập tức (Optimistic)
   **And** Badge count trên Navbar cập nhật tương ứng

4. **Given** Người dùng thêm sản phẩm loại "Thuê"
   **When** Modal chọn ngày thuê mở
   **Then** Phải chọn start_date và end_date hợp lệ (start < end, start >= today)
   **And** Tính toán rental_price = daily_price × số ngày thuê

5. **Given** Người dùng thêm sản phẩm loại "Mua"
   **When** Modal/Dropdown chọn size mở
   **Then** Hiển thị danh sách size_options của sản phẩm (lấy từ GarmentDB)
   **And** Phải chọn size trước khi thêm vào giỏ

6. **Given** Người dùng refresh trang hoặc đóng/mở lại trình duyệt
   **When** Trang Showroom load lại
   **Then** Cart state được khôi phục từ localStorage (persist)
   **And** Items vẫn còn trong giỏ hàng như trước

## Tasks / Subtasks

- [x] Task 1: Tạo Zustand Cart Store (AC: 1, 2, 3, 4, 5, 6)
  - [x] Tạo `frontend/src/store/cartStore.ts` với Zustand + persist middleware
  - [x] Định nghĩa `CartItem` type: `{ id, garment_id, garment_name, image_url, transaction_type: 'buy'|'rent', size?, start_date?, end_date?, rental_days?, unit_price, total_price }` (quantity omitted — duplicate prevention used instead)
  - [x] Implement actions: `addItem`, `removeItem`, `updateItem`, `clearCart`
  - [x] Implement computed: `cartCount`, `cartTotal`
  - [x] Cấu hình persist với localStorage key `tailor-cart`

- [x] Task 2: Tạo Cart Types và Constants (AC: 1, 4, 5)
  - [x] Tạo `frontend/src/types/cart.ts` với `CartItem`, `CartState`, `CartStore` types
  - [x] Validate không cho thêm cùng 1 garment_id + loại + size/dates vào giỏ 2 lần

- [x] Task 3: Cập nhật Navbar - Cart Icon Badge (AC: 1)
  - [x] Tìm và cập nhật layout Navbar (trong `(customer)/layout.tsx` hoặc `layout.tsx`)
  - [x] Thêm CartBadge component: icon giỏ hàng + số đếm từ `useCartStore`
  - [x] Badge hiển thị khi count > 0, ẩn khi count = 0
  - [x] `"use client"` directive vì cần đọc Zustand store

- [x] Task 4: Tạo AddToCartButton Component (AC: 1, 4, 5)
  - [x] Tạo `frontend/src/components/client/showroom/AddToCartButton.tsx`
  - [x] Props: `garment: Garment`, `mode: 'buy' | 'rent'`
  - [x] Cho mode 'rent': mở `RentalDateModal` để chọn ngày
  - [x] Cho mode 'buy': mở `SizeSelectModal` để chọn size
  - [x] Sau khi chọn xong → gọi `cartStore.addItem()` → hiển thị toast success

- [x] Task 5: Tạo RentalDateModal Component (AC: 4)
  - [x] Tạo `frontend/src/components/client/showroom/RentalDateModal.tsx`
  - [x] Date picker: start_date, end_date (HTML `<input type="date">` hoặc Headless UI)
  - [x] Validation Zod: start >= today, end > start
  - [x] Hiển thị preview: số ngày × rental_price/ngày = tổng tiền thuê
  - [x] Nút "Thêm vào Giỏ" → dispatch addItem

- [x] Task 6: Tạo SizeSelectModal Component (AC: 5)
  - [x] Tạo `frontend/src/components/client/showroom/SizeSelectModal.tsx`
  - [x] Hiển thị danh sách `garment.size_options` dưới dạng radio buttons
  - [x] Validation: phải chọn size
  - [x] Nút "Thêm vào Giỏ" → dispatch addItem

- [x] Task 7: Tạo CartDrawer Component (AC: 2, 3)
  - [x] Tạo `frontend/src/components/client/cart/CartDrawer.tsx`
  - [x] Slide-in drawer từ phải, overlay backdrop
  - [x] Danh sách CartItemRow: ảnh thumb, tên, loại, chi tiết (ngày hoặc size), giá
  - [x] Nút xóa từng item (`removeItem`)
  - [x] Footer: tổng tiền + nút "Tiến hành Thanh Toán" (link đến `/checkout` - Story 3.2)
  - [x] Empty state khi giỏ trống

- [x] Task 8: Tích hợp vào GarmentCard và ProductDetailClient (AC: 1)
  - [x] Cập nhật `frontend/src/components/client/showroom/GarmentCard.tsx`: thêm nút "Thuê" / "Mua"
  - [x] Cập nhật `frontend/src/components/client/showroom/ProductDetailClient.tsx`: tích hợp `AddToCartButton`
  - [x] Tái sử dụng `BuyRentToggle.tsx` nếu có thể

- [x] Task 9: Viết Tests (AC: tất cả)
  - [x] `frontend/src/__tests__/cartStore.test.ts`: unit tests cho Zustand store actions và computed values
  - [x] `frontend/src/__tests__/AddToCartButton.test.tsx`: render, click, modal flow
  - [x] `frontend/src/__tests__/CartDrawer.test.tsx`: hiển thị items, xóa item, empty state
  - [x] `frontend/src/__tests__/RentalDateModal.test.tsx`: validation ngày, tính tiền

## Dev Notes

### Tổng quan Architecture cho Story 3.1

Story này là **PURE FRONTEND** - không cần thêm backend endpoint mới. Cart state được quản lý hoàn toàn ở client với Zustand + localStorage persist. Backend chỉ được gọi ở Story 3.2 (verify giá/availability) và Story 3.3 (tạo order).

**Pattern**: Zustand (Optimistic UI) → localStorage (Persist) → Backend chỉ verify khi Checkout.

### Zustand Store Pattern - Phải Follow

Dự án đã có `frontend/src/store/designStore.ts` làm mẫu Zustand. Cart store phải follow cùng pattern:

```typescript
// frontend/src/store/cartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { devtools } from 'zustand/middleware';

// QUAN TRỌNG: Sử dụng persist middleware để lưu localStorage
export const useCartStore = create<CartStore>()(
  devtools(
    persist(
      (set, get) => ({
        items: [],
        // actions...
      }),
      {
        name: 'tailor-cart',  // localStorage key
        storage: createJSONStorage(() => localStorage),
      }
    ),
    { name: 'CartStore' }
  )
);
```

**Tham khảo pattern**: `frontend/src/store/designStore.ts`

### CartItem Type Definition

```typescript
// frontend/src/types/cart.ts
export type CartTransactionType = 'buy' | 'rent';

export interface CartItem {
  id: string;              // UUID v4 (generated client-side)
  garment_id: string;      // GarmentDB.id
  garment_name: string;    // Để hiển thị trong drawer
  image_url: string;       // Thumbnail
  transaction_type: CartTransactionType;
  // For buy:
  size?: string;           // Size được chọn
  // For rent:
  start_date?: string;     // ISO date string "YYYY-MM-DD"
  end_date?: string;       // ISO date string "YYYY-MM-DD"
  rental_days?: number;    // Tính từ start/end
  // Pricing:
  unit_price: number;      // rental_price/day HOẶC sale_price
  total_price: number;     // unit_price × days (rent) hoặc unit_price (buy)
}
```

### Existing GarmentCard và ProductDetailClient

Các component này đã tồn tại. Không được tạo lại - chỉ **modify** để thêm cart button:

- `frontend/src/components/client/showroom/GarmentCard.tsx` - Thêm nút "Thuê"/"Mua"
- `frontend/src/components/client/showroom/ProductDetailClient.tsx` - Tích hợp `AddToCartButton`
- `BuyRentToggle.tsx` - Component chuyển đổi Buy/Rent đã có, tái sử dụng logic này

**Lưu ý**: `GarmentCard` hiển thị trong grid nên button cần compact. `ProductDetailClient` có không gian rộng hơn.

### Existing Garment Data Model (Đã có)

```typescript
// Từ frontend/src/types/garment.ts
interface Garment {
  id: string;
  name: string;
  rental_price: number;    // giá thuê/ngày
  sale_price: number;      // giá bán
  image_url: string;
  image_urls: string[];
  size_options: string[];  // ["S", "M", "L", "XL"] etc.
  status: GarmentStatus;   // available, rented, maintenance
  category: GarmentCategory;
  // ... etc
}
```

### Navbar Cart Badge Location

Tìm file layout trong `(customer)` route group:
- `frontend/src/app/(customer)/layout.tsx` - Customer layout (có Navbar)
- Hoặc tìm trong global `layout.tsx`

CartBadge cần `"use client"` vì đọc Zustand store. Nếu layout là Server Component thì tạo component riêng:

```typescript
// CartBadge.tsx - "use client"
'use client';
import { useCartStore } from '@/store/cartStore';

export function CartBadge() {
  const count = useCartStore(state => state.items.length);
  return (
    <button onClick={/* openCartDrawer */} className="relative">
      <CartIcon />
      {count > 0 && (
        <span className="absolute -top-2 -right-2 min-w-[20px] h-5 rounded-full bg-amber-600 text-white text-xs flex items-center justify-center">
          {count}
        </span>
      )}
    </button>
  );
}
```

### Toast Pattern - ĐỪNG dùng thư viện ngoài

Dự án dùng custom micro-toast (không có `react-hot-toast` hay `sonner`). Pattern từ Story 2.4:

```typescript
const [toast, setToast] = useState<{message: string; type: 'success'|'error'} | null>(null);

useEffect(() => {
  if (toast) {
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }
}, [toast]);
```

### CartDrawer - Slide-in Pattern

Drawer từ phải sử dụng Tailwind transition + `translate-x`:

```tsx
<div className={`fixed inset-y-0 right-0 w-80 md:w-96 bg-white shadow-2xl transform transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
```

Backdrop: `<div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />`

### Date Validation cho Rental

```typescript
// Validation schema (Zod)
const rentalSchema = z.object({
  start_date: z.string().refine(d => new Date(d) >= new Date(new Date().toDateString()), {
    message: 'Ngày bắt đầu phải từ hôm nay trở đi'
  }),
  end_date: z.string(),
}).refine(data => new Date(data.end_date) > new Date(data.start_date), {
  message: 'Ngày kết thúc phải sau ngày bắt đầu',
  path: ['end_date'],
});
```

### Duplicate Item Prevention

Không cho phép thêm cùng 1 item (garment_id + type + size/dates):

```typescript
// Trong addItem action của cartStore:
addItem: (item) => set(state => {
  const exists = state.items.some(
    i => i.garment_id === item.garment_id &&
         i.transaction_type === item.transaction_type &&
         (item.transaction_type === 'buy' ? i.size === item.size :
          i.start_date === item.start_date && i.end_date === item.end_date)
  );
  if (exists) return state; // Không thêm duplicate
  return { items: [...state.items, item] };
}),
```

### Project Structure Notes

**Alignment với unified project structure:**
- Cart store: `frontend/src/store/cartStore.ts` (theo `designStore.ts`)
- Cart types: `frontend/src/types/cart.ts` (theo `garment.ts`, `customer.ts`)
- Cart components: `frontend/src/components/client/cart/` (new subfolder)
- Cart tests: `frontend/src/__tests__/cart*.test.ts`
- Không cần server actions mới (cart là pure client state)

**Cấu trúc components mới:**
```
frontend/src/
├── store/
│   └── cartStore.ts                    (NEW - Zustand cart store)
├── types/
│   └── cart.ts                         (NEW - CartItem types)
├── components/client/
│   ├── cart/                           (NEW subfolder)
│   │   ├── CartDrawer.tsx              (NEW)
│   │   ├── CartItemRow.tsx             (NEW)
│   │   └── CartBadge.tsx              (NEW - for Navbar)
│   └── showroom/
│       ├── GarmentCard.tsx            (MODIFIED)
│       ├── ProductDetailClient.tsx    (MODIFIED)
│       ├── AddToCartButton.tsx        (NEW)
│       ├── RentalDateModal.tsx        (NEW)
│       └── SizeSelectModal.tsx        (NEW)
└── __tests__/
    ├── cartStore.test.ts               (NEW)
    ├── AddToCartButton.test.tsx        (NEW)
    ├── CartDrawer.test.tsx             (NEW)
    └── RentalDateModal.test.tsx        (NEW)
```

**Navbar modification:**
- Tìm Navbar/layout trong `(customer)/layout.tsx` và thêm `<CartBadge>`

### UX Design Requirements

Theo `ux-design-specification.md`:
- **Màu sắc**: Heritage Gold (`amber-600` hoặc `#B8952A`) cho primary actions, Silk Ivory background
- **Typography**: Inter font cho body text
- **Touch targets**: Minimum 44×44px cho mobile
- **Micro-animations**: Transition 300ms cho drawer slide
- **Responsive**: Mobile-first, single column
- **Feedback tức thì**: Toast success/error sau mỗi hành động

### Testing Standards

Test hiện tại: 416 frontend tests (từ Story 2.4). Phải **tăng** hoặc **duy trì** không giảm.

Mục tiêu: +25-35 tests mới cho Story 3.1.

Pattern test từ `frontend/src/__tests__/productForm.test.tsx`:
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
// Wrap với QueryClientProvider nếu cần TanStack Query
// Mock cartStore với jest.mock('@/store/cartStore')
```

**Test coverage tối thiểu:**
- cartStore: addItem (success, duplicate prevention), removeItem, clearCart, persist
- CartDrawer: render empty state, render with items, remove item click
- AddToCartButton: render, open modal, submit form
- RentalDateModal: date validation, price calculation

### References

- Zustand store pattern: [Source: `frontend/src/store/designStore.ts`]
- GarmentCard component: [Source: `frontend/src/components/client/showroom/GarmentCard.tsx`]
- ProductDetailClient component: [Source: `frontend/src/components/client/showroom/ProductDetailClient.tsx`]
- BuyRentToggle component: [Source: `frontend/src/components/client/showroom/BuyRentToggle.tsx`]
- Garment types: [Source: `frontend/src/types/garment.ts`]
- TanStack Query provider: [Source: `frontend/src/components/providers/ReactQueryProvider.tsx`]
- Architecture state management: [Source: `_bmad-output/planning-artifacts/architecture.md#State Management`]
- UX cart/checkout patterns: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Commerce Flow`]
- Epic 3 requirements: [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3`]
- Custom toast pattern: [Source: `_bmad-output/implementation-artifacts/2-4-dashboard-owner-crud-san-pham-ao-dai.md`]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Debug Log References

None - Implementation completed without blockers.

### Completion Notes List

- Implemented Zustand v5 cart store with `persist` + `devtools` middleware. Used `createJSONStorage(() => localStorage)` for persistence with key `tailor-cart`.
- CartItem type follows story spec exactly. `id` generated via `crypto.randomUUID()` (no external uuid lib needed).
- Duplicate prevention logic: same `garment_id + transaction_type + (size for buy | start_date+end_date for rent)`.
- Validation implemented without Zod (not in project deps) — inline validation functions produce same behavior as described Zod schema.
- Custom micro-toast pattern from Story 2.4 used in AddToCartButton.
- CartBadge triggers CartDrawer via local state; drawer uses Tailwind `translate-x` transition (300ms).
- GarmentCard: added compact "Thêm Thuê"/"Thêm Mua" buttons below price row, only visible for available garments.
- ProductDetailClient: AddToCartButton buttons added below existing BuyRentToggle, preserving existing UI.
- (customer)/layout.tsx updated from Server Component — CartBadge is "use client" so it hydrates correctly.
- 457 tests pass (41 new tests added, 0 regressions). TypeScript errors in tests are pre-existing project-wide issues with `@testing-library/jest-dom` types.

### File List

frontend/src/types/cart.ts (NEW)
frontend/src/store/cartStore.ts (NEW)
frontend/src/utils/format.ts (NEW — review fix: shared formatPrice/parsePrice)
frontend/src/utils/useFocusTrap.ts (NEW — review fix: accessibility focus trap hook)
frontend/src/components/client/cart/CartBadge.tsx (NEW)
frontend/src/components/client/cart/CartDrawer.tsx (NEW)
frontend/src/components/client/cart/CartItemRow.tsx (NEW)
frontend/src/components/client/showroom/AddToCartButton.tsx (NEW)
frontend/src/components/client/showroom/RentalDateModal.tsx (NEW)
frontend/src/components/client/showroom/SizeSelectModal.tsx (NEW)
frontend/src/components/client/showroom/GarmentCard.tsx (MODIFIED)
frontend/src/components/client/showroom/ProductDetailClient.tsx (MODIFIED)
frontend/src/app/(customer)/layout.tsx (MODIFIED)
frontend/src/__tests__/cartStore.test.ts (NEW)
frontend/src/__tests__/CartDrawer.test.tsx (NEW)
frontend/src/__tests__/AddToCartButton.test.tsx (NEW)
frontend/src/__tests__/RentalDateModal.test.tsx (NEW)
frontend/src/__tests__/SizeSelectModal.test.tsx (NEW — review fix: missing test coverage)

## Change Log

- 2026-03-11: Story 3.1 implemented — Cart State Management with Zustand + localStorage persist. Added 8 new files, modified 3 existing files. 41 new tests added (total 457 passing). All 6 Acceptance Criteria satisfied.
- 2026-03-11: Code review fixes (claude-opus-4-6) — Fixed 3 HIGH + 4 MEDIUM issues: H1 parseFloat NaN guard via shared parsePrice(), H2 task spec aligned with implementation, H3 CSS block/flex conflict, M1 DRY formatPrice utility, M2 Escape key handling, M3 focus trap, M4 SizeSelectModal tests. 50 tests now passing (+9 new).


## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: Story 3.1 Cart State Management (Zustand + TanStack)  
- Epic: 3
