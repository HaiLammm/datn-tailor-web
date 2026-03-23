# Unified Story 3.2: Render Cart Checkout Details

Status: review

## Phase 1 — Requirements (Original)
> Không có story Phase 1 tương ứng — story được tạo mới trong Phase 2

## Phase 2 — Implementation  
> Nguồn: _bmad-output/implementation-artifacts/3-2-render-cart-checkout-details.md

# Story 3.2: Render Cart Checkout Details

Status: review

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Khach hang,
I want liet ke chinh xac cac muc Hang hoa, gia va lich Thue-Mua tuong ung,
so that toi check-loi va tinh tien chuan sat.

## Acceptance Criteria

1. **Given** Khach hang bam "Tien hanh Thanh Toan" tu CartDrawer
   **When** Trang Checkout (Buoc 1) load tai `/checkout`
   **Then** Hien thi danh sach tat ca items tu Zustand cart store voi day du thong tin: anh thumbnail, ten san pham, loai (Thue/Mua), chi tiet (ngay thue hoac size), don gia, thanh tien
   **And** Hien thi tong gia tri don hang (cart total) o cuoi danh sach

2. **Given** Trang Checkout da load
   **When** Component mount hoan tat
   **Then** Goi Server Action verify gia va availability tu Backend (Authoritative Server Pattern)
   **And** Hien thi loading state trong luc verify
   **And** Cap nhat gia tren UI neu Backend tra ve gia khac voi Zustand local state

3. **Given** Backend verify tra ve mot so items khong con available (status !== 'available')
   **When** Ket qua verify hien thi
   **Then** Items khong available duoc highlight voi canh bao mau do (Ruby Red #DC2626)
   **And** Hien thi thong bao "San pham nay hien khong kha dung" tren item do
   **And** Nut "Thanh Toan" bi disable cho den khi user xu ly cac items khong available

4. **Given** Danh sach items dang hien thi tren Checkout page
   **When** Khach hang bam nut "Xoa" (Trash icon) tren bat ky item nao
   **Then** Item bi xoa khoi Zustand cart store (Optimistic UI)
   **And** Danh sach cap nhat lai ngay lap tuc, tong gia tri tinh lai
   **And** Neu gio hang trong → redirect ve trang Showroom `/showroom`

5. **Given** Danh sach items dang hien thi tren Checkout page
   **When** Khach hang thay doi so luong (quantity) hoac cap nhat thong tin (size/ngay thue) cua item
   **Then** Zustand store cap nhat Optimistic
   **And** Tong gia tri tinh toan lai chinh xac (rental_price x ngay hoac sale_price)
   **And** Re-verify voi Backend sau khi thay doi

6. **Given** Tat ca items da verified thanh cong va available
   **When** Khach hang bam nut "Tiep Tuc Thanh Toan" (proceed to Step 2)
   **Then** Chuyen huong den trang checkout step 2: `/checkout/shipping` (Story 3.3)
   **And** Cart state duoc giu nguyen

## Tasks / Subtasks

- [x] Task 1: Tao Checkout Page Route (AC: 1)
  - [x] Tao `frontend/src/app/(customer)/checkout/page.tsx` — Server Component shell
  - [x] Tao `frontend/src/components/client/checkout/CheckoutClient.tsx` — Client Component chinh
  - [x] Layout: 2-column tren desktop (items trai + order summary phai), 1-column tren mobile
  - [x] Import CartStore va hien thi danh sach items

- [x] Task 2: Tao CheckoutItemRow Component (AC: 1, 4, 5)
  - [x] Tao `frontend/src/components/client/checkout/CheckoutItemRow.tsx`
  - [x] Hien thi: thumbnail (64x64), ten san pham, badge Thue/Mua, chi tiet (size hoac ngay thue), don gia, thanh tien
  - [x] Nut xoa item (Trash icon) → goi `cartStore.removeItem()`
  - [x] Cho phep chinh so luong (quantity +/- buttons) HOAC edit size/ngay thue (open modal)
  - [x] Unavailable state: overlay mo + canh bao message

- [x] Task 3: Tao OrderSummary Component (AC: 1, 6)
  - [x] Tao `frontend/src/components/client/checkout/OrderSummary.tsx`
  - [x] Hien thi: so luong items, subtotal, tong cong
  - [x] Nut "Tiep Tuc Thanh Toan" → navigate `/checkout/shipping`
  - [x] Disable nut neu co items unavailable hoac cart rong

- [x] Task 4: Implement Server Action verify cart (AC: 2, 3)
  - [x] Tao Server Action `verifyCart()` trong `frontend/src/app/actions/cart-actions.ts`
  - [x] Input: danh sach `{ garment_id, transaction_type, size?, start_date?, end_date? }[]`
  - [x] Goi Backend API `GET /api/v1/garments/{id}` cho tung item de verify gia va availability
  - [x] Hoac tao batch endpoint: `POST /api/v1/cart/verify` (neu Backend chua co, dung fetchGarmentDetail da co)
  - [x] Return: `{ garment_id, verified_price, is_available, current_status }[]`
  - [x] Handle error cases: garment deleted, price changed, status changed

- [x] Task 5: Integrate verification vao CheckoutClient (AC: 2, 3)
  - [x] Goi `verifyCart()` khi component mount (useEffect hoac TanStack Query)
  - [x] Hien thi loading skeleton trong luc verify
  - [x] Map ket qua verify len tung CheckoutItemRow
  - [x] Neu gia thay doi: hien thi gia cu (gach ngang) va gia moi, cap nhat cartStore
  - [x] Neu item unavailable: hien thi warning badge + disable item

- [x] Task 6: Handle empty cart va edge cases (AC: 4)
  - [x] Neu cart rong khi vao `/checkout` → redirect ve `/showroom`
  - [x] Sau khi xoa het items → redirect ve `/showroom`
  - [x] Handle network error khi verify: hien thi retry button
  - [x] Handle partial verify failure: chi mark loi items, cho phep tiep tuc voi items ok

- [x] Task 7: Responsive design va UX polish (AC: 1-6)
  - [x] Mobile: single column, sticky OrderSummary o bottom
  - [x] Desktop: 2-column layout (8fr items + 4fr summary)
  - [x] Typography: JetBrains Mono cho gia, Inter cho body, Cormorant Garamond cho headings
  - [x] Colors: Heritage Gold CTA, Silk Ivory background, Indigo Depth text
  - [x] Transitions: 200ms ease-out cho item removal animation
  - [x] Empty state illustration

- [x] Task 8: Viet Tests (AC: tat ca)
  - [x] `frontend/src/__tests__/CheckoutClient.test.tsx`: render items, verify flow, empty redirect
  - [x] `frontend/src/__tests__/CheckoutItemRow.test.tsx`: display, remove, unavailable state
  - [x] `frontend/src/__tests__/OrderSummary.test.tsx`: totals, button states
  - [x] `frontend/src/__tests__/cartActions.test.ts`: verifyCart server action mock

## Dev Notes

### Tong quan Architecture cho Story 3.2

Story nay la **CHECKOUT STEP 1** — hien thi va verify cart items truoc khi tien hanh thanh toan. Day la buoc chuyen tiep giua Cart (pure client state — Story 3.1) va Payment (server-side order creation — Story 3.3).

**CRITICAL PATTERN**: Authoritative Server Pattern
- Zustand cart store chi la Optimistic UI — gia va availability **PHAI** duoc verify boi Backend truoc khi cho phep thanh toan
- TanStack Query duoc dung de fetch/verify du lieu tu Backend, khong phai Zustand
- Backend la SSOT (Single Source of Truth) cho gia va ton kho

**Flow**: CartDrawer "Tien hanh Thanh Toan" → `/checkout` (Story 3.2) → `/checkout/shipping` (Story 3.3)

### Previous Story Intelligence (Story 3.1)

Story 3.1 da implement thanh cong:
- **Cart Store**: `frontend/src/store/cartStore.ts` — Zustand v5 + persist + devtools
- **Cart Types**: `frontend/src/types/cart.ts` — CartItem, CartStore interfaces
- **Cart Components**: CartBadge, CartDrawer, CartItemRow trong `frontend/src/components/client/cart/`
- **Format Utils**: `frontend/src/utils/format.ts` — formatPrice(), parsePrice()
- **Focus Trap**: `frontend/src/utils/useFocusTrap.ts` — accessibility hook

**Key Learnings tu Story 3.1 Code Review:**
- H1: parseFloat NaN guard da fix qua shared `parsePrice()` — PHAI dung `parsePrice()` tu `utils/format.ts`
- H3: CSS block/flex conflict — can than voi display property conflicts
- M1: DRY formatPrice utility — PHAI dung `formatPrice()` tu `utils/format.ts`, KHONG tao moi
- M3: Focus trap — dung `useFocusTrap` hook cho modals
- Custom micro-toast pattern: KHONG dung thu vien ngoai (khong co react-hot-toast hay sonner)
- Zod NOT in project deps — dung inline validation functions thay vi Zod (cho Frontend validation)
- `crypto.randomUUID()` cho UUID generation — khong can uuid lib

### Existing CartStore API (PHAI dung, KHONG tao lai)

```typescript
// frontend/src/store/cartStore.ts
interface CartStore {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'id'>) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  cartCount: () => number;
  cartTotal: () => number;
}
```

### Existing Server Actions Pattern (PHAI follow)

```typescript
// frontend/src/app/actions/garment-actions.ts
// Public actions (no auth needed):
export async function fetchGarments(filters?: GarmentFilter): Promise<Garment[]>
export async function fetchGarmentDetail(id: string): Promise<Garment | null>

// Owner-only actions (need auth):
export async function createGarment(data: FormData): Promise<{success; data?; error?}>
```

**CRITICAL**: Server Actions goi authenticated endpoint PHAI forward auth token:
```typescript
const session = await auth();
headers: { Authorization: `Bearer ${session?.accessToken}` }
```

Tuy nhien, `verifyCart` co the la **public action** (khong can auth) vi khach hang chua dang nhap van co the xem checkout. Dung `fetchGarmentDetail()` da co de verify tung item.

### Verify Strategy: Dung fetchGarmentDetail da co

**KHONG** can tao backend endpoint moi. Dung `fetchGarmentDetail(garment_id)` cho tung item:

```typescript
// frontend/src/app/actions/cart-actions.ts
'use server';
import { fetchGarmentDetail } from './garment-actions';

export async function verifyCartItems(
  items: { garment_id: string; transaction_type: string }[]
): Promise<VerifyResult[]> {
  const results = await Promise.all(
    items.map(async (item) => {
      const garment = await fetchGarmentDetail(item.garment_id);
      if (!garment) return { garment_id: item.garment_id, is_available: false, verified_price: 0 };
      return {
        garment_id: item.garment_id,
        is_available: garment.status === 'available',
        verified_sale_price: garment.sale_price,
        verified_rental_price: garment.rental_price,
        current_status: garment.status,
      };
    })
  );
  return results;
}
```

### Garment Type (da co - DON'T recreate)

```typescript
// frontend/src/types/garment.ts
interface Garment {
  id: string;
  name: string;
  rental_price: number;    // gia thue/ngay
  sale_price: number;      // gia ban
  image_url: string;
  image_urls: string[];
  size_options: string[];
  status: GarmentStatus;   // available, rented, maintenance
  category: GarmentCategory;
  // ...
}
```

### CartItem Type (da co - DON'T recreate)

```typescript
// frontend/src/types/cart.ts
interface CartItem {
  id: string;              // UUID v4
  garment_id: string;
  garment_name: string;
  image_url: string;
  transaction_type: 'buy' | 'rent';
  size?: string;
  start_date?: string;     // ISO "YYYY-MM-DD"
  end_date?: string;
  rental_days?: number;
  unit_price: number;
  total_price: number;
}
```

### Format Utilities (da co - PHAI import, KHONG tao moi)

```typescript
// frontend/src/utils/format.ts
export function formatPrice(amount: number): string  // → "1.500.000 d"
export function parsePrice(value: string | number): number  // → NaN-safe parsing
```

### Checkout Page Structure (Recommended)

```
frontend/src/
├── app/(customer)/checkout/
│   └── page.tsx                          (NEW - Server Component shell)
├── components/client/checkout/
│   ├── CheckoutClient.tsx                (NEW - Main client component)
│   ├── CheckoutItemRow.tsx               (NEW - Single item row)
│   └── OrderSummary.tsx                  (NEW - Total + CTA)
├── app/actions/
│   └── cart-actions.ts                   (NEW - verifyCartItems server action)
└── __tests__/
    ├── CheckoutClient.test.tsx           (NEW)
    ├── CheckoutItemRow.test.tsx          (NEW)
    ├── OrderSummary.test.tsx             (NEW)
    └── cartActions.test.ts              (NEW)
```

### UX Design Requirements

Theo `ux-design-specification.md`:

**Layout:**
- Desktop: 2-column (8fr items list + 4fr order summary sidebar)
- Mobile: single column, OrderSummary sticky bottom
- Breakpoints: Mobile 320-767px, Tablet 768-1023px, Desktop 1024+

**Color Palette:**
- Background: Silk Ivory `#F9F7F2`
- Primary CTA: Heritage Gold `#D4AF37`
- Text: Deep Charcoal `#1A1A2E`
- Error/Unavailable: Ruby Red `#DC2626`
- Success: Jade Green `#059669`
- Secondary text: Warm Gray `#6B7280`
- Header/Accents: Indigo Depth `#1A2B4C`

**Typography:**
- Page title (H1): Cormorant Garamond, 600 weight
- Product names: Cormorant Garamond, 500 weight
- Body/Labels: Inter, 400/500 weight
- Prices/Numbers: JetBrains Mono, 400 weight
- Button/CTA: Inter, 600 weight

**Transitions:**
- Item removal: 200ms ease-out fade/slide
- Loading skeleton: pulse animation
- Button hover: scale(1.02) + shadow elevation

**Checkout Flow:**
- 3-step process: (1) Review Cart ← STORY 3.2, (2) Shipping Info, (3) Confirm Order
- Progress indicator at top showing current step
- "From Homepage to Order Confirmation in <= 3 minutes" target

### Customer Layout Navigation (da co)

```typescript
// frontend/src/app/(customer)/layout.tsx
// Header: Logo + Nav links + CartBadge
// CartBadge opens CartDrawer
// Layout wraps children in main content area
```

Checkout page se render **ben trong** customer layout, co san header + CartBadge.

### Testing Standards

- Tests hien tai: 457 frontend tests (sau Story 3.1). PHAI tang, KHONG giam.
- Target: +20-30 tests moi cho Story 3.2
- Pattern: `@testing-library/react` + `userEvent` + `jest.mock`
- Mock `cartStore` voi `jest.mock('@/store/cartStore')`
- Mock Server Actions voi `jest.mock('@/app/actions/cart-actions')`
- Test coverage: render, verify flow, error states, empty redirect, item removal

### Anti-Patterns (DO NOT DO)

1. **DO NOT** trust Zustand prices at checkout — PHAI verify voi Backend
2. **DO NOT** install new dependencies (khong co Zod, khong co toast libraries)
3. **DO NOT** recreate format utilities — dung `formatPrice()` va `parsePrice()` tu `utils/format.ts`
4. **DO NOT** create new types that duplicate existing — dung CartItem va Garment da co
5. **DO NOT** use `middleware.ts` — project dung `proxy.ts` cho auth
6. **DO NOT** put Client Components trong `app/` folder — chi Server Components
7. **DO NOT** use localStorage truc tiep — dung Zustand persist
8. **DO NOT** skip loading/error states — moi async operation can co skeleton/error UI

### Git Intelligence

Recent commit pattern: `feat(scope): implement Story X.Y - Description`
Code review fixes committed separately.

### Project Structure Notes

**Alignment voi unified project structure:**
- Checkout components: `frontend/src/components/client/checkout/` (new subfolder, parallel to `cart/`)
- Server actions: `frontend/src/app/actions/cart-actions.ts` (new file, parallel to `garment-actions.ts`)
- Page route: `frontend/src/app/(customer)/checkout/page.tsx` (new route in customer group)
- Tests: `frontend/src/__tests__/Checkout*.test.tsx`

**Dependencies (khong can cai moi):**
- Zustand (da co)
- TanStack Query (da co - co the dung cho verify, hoac dung useEffect + Server Action)
- Tailwind CSS (da co)
- @testing-library/react (da co)

### References

- Cart Store implementation: [Source: `frontend/src/store/cartStore.ts`]
- Cart types: [Source: `frontend/src/types/cart.ts`]
- Garment types: [Source: `frontend/src/types/garment.ts`]
- Format utilities: [Source: `frontend/src/utils/format.ts`]
- Focus trap hook: [Source: `frontend/src/utils/useFocusTrap.ts`]
- Garment server actions: [Source: `frontend/src/app/actions/garment-actions.ts`]
- CartDrawer (checkout link): [Source: `frontend/src/components/client/cart/CartDrawer.tsx`]
- CartItemRow pattern: [Source: `frontend/src/components/client/cart/CartItemRow.tsx`]
- CartBadge: [Source: `frontend/src/components/client/cart/CartBadge.tsx`]
- Customer layout: [Source: `frontend/src/app/(customer)/layout.tsx`]
- Architecture Authoritative Server: [Source: `_bmad-output/planning-artifacts/architecture.md#State Management Patterns`]
- Architecture E-commerce State: [Source: `_bmad-output/planning-artifacts/architecture.md#E-commerce State & Cart Management`]
- UX Commerce Flow: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Customer Commerce Flow`]
- UX Color Palette: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Heritage Palette v2`]
- UX Typography: [Source: `_bmad-output/planning-artifacts/ux-design-specification.md#Dual-Tone Typography`]
- Epic 3 requirements: [Source: `_bmad-output/planning-artifacts/epics.md#Epic 3`]
- Previous story: [Source: `_bmad-output/implementation-artifacts/3-1-cart-state-management.md`]
- Project context: [Source: `_bmad-output/project-context.md`]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6

### Debug Log References

- Fixed test: `screen.getByAlt` → `screen.getByAltText` (testing-library API)
- Fixed test: duplicate text "Xem Lại Giỏ Hàng" (progress indicator + h1) → used `getAllByText`

### Completion Notes List

- Implemented Checkout Step 1 page at `/checkout` route within `(customer)` route group
- Created `CheckoutClient.tsx` as main client component with verify flow, loading skeleton, error/retry, and empty cart redirect
- Created `CheckoutItemRow.tsx` with thumbnail, badges (Thuê/Mua), size/date details, price display (including price change strikethrough), unavailable warning overlay, and remove button
- Created `OrderSummary.tsx` with item count, subtotal, total, unavailable items warning, and proceed button (disabled when items unavailable/verifying/empty)
- Created `verifyCartItems()` Server Action in `cart-actions.ts` using existing `fetchGarmentDetail()` — no new backend endpoints needed (Authoritative Server Pattern)
- Responsive: 2-column desktop (8fr+4fr), single column mobile with sticky bottom OrderSummary
- Used existing utilities: `formatPrice()`, `parsePrice()` from `utils/format.ts`; Zustand `useCartStore` from `store/cartStore.ts`
- Color palette: Silk Ivory bg, Heritage Gold CTA, Ruby Red errors, Indigo Depth headings, JetBrains Mono prices
- 3-step progress indicator at top (Step 1 active)
- Price verification: auto-updates cart prices if backend returns different values, shows old price (strikethrough) + new price
- 42 new tests added (total: 508 tests, 49 suites, all passing, 0 regressions)

### Change Log

- 2026-03-11: Story 3.2 implemented — Checkout Step 1 with cart verification, responsive layout, and 42 tests

### File List

New files:
- `frontend/src/app/(customer)/checkout/page.tsx` — Server Component shell
- `frontend/src/components/client/checkout/CheckoutClient.tsx` — Main checkout client component
- `frontend/src/components/client/checkout/CheckoutItemRow.tsx` — Single item row with verify status
- `frontend/src/components/client/checkout/OrderSummary.tsx` — Order summary sidebar
- `frontend/src/app/actions/cart-actions.ts` — verifyCartItems server action
- `frontend/src/__tests__/CheckoutClient.test.tsx` — 10 tests
- `frontend/src/__tests__/CheckoutItemRow.test.tsx` — 14 tests
- `frontend/src/__tests__/OrderSummary.test.tsx` — 10 tests
- `frontend/src/__tests__/cartActions.test.ts` — 8 tests


## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: Story 3.2 Render Cart Checkout Details  
- Epic: 3
