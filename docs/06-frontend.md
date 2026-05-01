# Chương 06 — Frontend (Next.js 16 App Router)

## 6.1. Cấu trúc thư mục `frontend/`

```
frontend/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/                # Route group: auth screens
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   ├── verify-otp/
│   │   │   ├── forgot-password/
│   │   │   ├── reset-password/
│   │   │   └── layout.tsx
│   │   ├── (customer)/            # Route group: Boutique Mode
│   │   │   ├── showroom/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/
│   │   │   ├── booking/
│   │   │   ├── checkout/
│   │   │   ├── measurement-gate/
│   │   │   ├── profile/
│   │   │   └── layout.tsx
│   │   ├── (workplace)/           # Route group: Command Mode
│   │   │   ├── owner/
│   │   │   │   ├── page.tsx       # Dashboard
│   │   │   │   ├── orders/
│   │   │   │   ├── products/
│   │   │   │   ├── inventory/
│   │   │   │   ├── customers/
│   │   │   │   ├── appointments/
│   │   │   │   ├── rentals/
│   │   │   │   ├── crm/
│   │   │   │   ├── vouchers/
│   │   │   │   ├── campaigns/
│   │   │   │   ├── production/
│   │   │   │   ├── rules/
│   │   │   │   └── staff/
│   │   │   ├── tailor/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── tasks/
│   │   │   │   ├── review/
│   │   │   │   └── feedback/
│   │   │   ├── design-session/    # Pattern Engine UI (Owner)
│   │   │   │   ├── page.tsx
│   │   │   │   └── DesignSessionClient.tsx
│   │   │   └── layout.tsx
│   │   ├── actions/               # Server Actions (TS, gọi backend qua proxy)
│   │   │   ├── appointment-actions.ts
│   │   │   ├── booking-actions.ts
│   │   │   ├── campaign-actions.ts
│   │   │   ├── cart-actions.ts
│   │   │   ├── design-actions.ts
│   │   │   ├── garment-actions.ts
│   │   │   ├── geometry-actions.ts
│   │   │   ├── kpi-actions.ts
│   │   │   ├── lead-actions.ts
│   │   │   ├── order-actions.ts
│   │   │   ├── override-actions.ts
│   │   │   ├── owner-task-actions.ts
│   │   │   ├── pattern-actions.ts        # Epic 11
│   │   │   ├── profile-actions.ts
│   │   │   ├── rental-actions.ts
│   │   │   ├── rule-actions.ts
│   │   │   ├── tailor-task-actions.ts
│   │   │   └── voucher-actions.ts
│   │   ├── api/
│   │   │   └── auth/              # NextAuth route handler
│   │   ├── globals.css
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Homepage
│   │   └── favicon.ico
│   ├── components/
│   │   ├── client/                # Client components — chia theo domain
│   │   │   ├── AddStaffForm.tsx
│   │   │   ├── booking/
│   │   │   ├── campaigns/
│   │   │   ├── cart/
│   │   │   ├── checkout/
│   │   │   ├── crm/
│   │   │   ├── CustomerForm.tsx
│   │   │   ├── CustomerListTable.tsx
│   │   │   ├── dashboard/
│   │   │   ├── design/            # Pattern UI (Epic 11) + AI Bespoke (Epic 12+)
│   │   │   ├── inventory/
│   │   │   ├── MeasurementHistory.tsx
│   │   │   ├── orders/
│   │   │   ├── production/
│   │   │   ├── products/
│   │   │   ├── profile/
│   │   │   ├── rentals/
│   │   │   ├── rules/
│   │   │   ├── showroom/
│   │   │   ├── StaffTable.tsx
│   │   │   ├── tailor/
│   │   │   ├── vouchers/
│   │   │   └── workplace/
│   │   ├── providers/             # React Context providers (Auth, QueryClient)
│   │   └── ui/                    # Radix-based primitives
│   │       ├── Avatar.tsx
│   │       └── skeleton.tsx
│   ├── store/
│   │   ├── cartStore.ts           # Zustand: shopping cart
│   │   └── designStore.ts         # Zustand: design session (style, intensity, geometry)
│   ├── hooks/
│   │   ├── useAutoFit.ts          # Auto-fit canvas
│   │   ├── useMorphing.ts         # Real-time morphing < 200ms
│   │   └── usePatternSession.ts   # Epic 11: pattern session lifecycle
│   ├── types/                     # 20 file TypeScript types
│   │   ├── booking.ts   campaign.ts   cart.ts        customer.ts
│   │   ├── fabric.ts    garment.ts    geometry.ts    inference.ts
│   │   ├── kpi.ts       lead.ts       notification.ts order.ts
│   │   ├── override.ts  pattern.ts    rental.ts      rule.ts
│   │   └── staff.ts     style.ts      tailor-task.ts voucher.ts
│   ├── utils/
│   ├── __tests__/
│   ├── auth.ts                    # NextAuth v5 config
│   └── proxy.ts                   # Server-side proxy (đính cookie + JWT)
├── public/                        # Static assets
├── package.json
├── next.config.ts
├── tsconfig.json
├── jest.config.js + jest.setup.js
└── eslint.config.mjs
```

## 6.2. Routing strategy — Next.js 16 App Router

### 6.2.1 Route Groups (Dual-Mode UI)

| Route group | Đối tượng | Layout | Style mode |
|---|---|---|---|
| `(auth)/` | Tất cả (chưa login) | Auth-only minimal layout | Standalone |
| `(customer)/` | Customer (& guest cho showroom) | Bottom Tab Bar mobile, Breadcrumb | **Boutique Mode** |
| `(workplace)/` | Owner & Tailor | Sidebar collapsible, Role-based menu | **Command Mode** |

Mỗi group có `layout.tsx` riêng — áp dụng đúng theme tokens, font (Cormorant Garamond serif vs Inter sans), spacing density.

### 6.2.2 Dynamic routes

- `(customer)/showroom/[id]/` — product detail
- `(workplace)/design-session/[sessionId]/` — pattern session detail (Epic 11)
- `(workplace)/tailor/tasks/[taskId]/` — task detail có embedded PatternPreview
- `(workplace)/owner/orders/[id]/`, `customers/[id]/`, …

### 6.2.3 Server Components vs Client Components

- **Server Components (default)**: data fetching ban đầu, SEO, layout structure.
- **Client Components (`"use client"`)**: tương tác — Slider, drag, Morphing canvas, modal, form steps.
- Pattern Engine UI: `DesignSessionClient.tsx` là client component (form input + Realtime preview); page `page.tsx` là server (load customer list).

## 6.3. State management

### 6.3.1 Zustand (Local UI)

`store/cartStore.ts` — giỏ hàng:
- items[], add, remove, updateQty
- Persistence qua middleware (cookie/localStorage cho guest, sync khi login)
- Optimistic UI: thêm vào giỏ phản hồi tức thì; checkout sẽ re-validate với backend (Authoritative Server)

`store/designStore.ts` — design session (Epic 12):
- selected_pillar, intensity_values, fabric_recommendations, master_geometry, morph_delta, constraint_violations
- DevTools middleware kích hoạt
- Submission state: is_submitting, last_submitted_sequence, submission_warnings

> Quy tắc Zustand: chỉ giữ Local UI State. KHÔNG cache giá / inventory.

### 6.3.2 TanStack Query (Server State)

- `@tanstack/react-query@5.90.21`
- Wrap app trong `<QueryClientProvider>` ở `components/providers/`
- Key convention: `['domain', 'subdomain', params]`
- Invalidation tự động sau mutation (vd: order.create → invalidate `['orders']`, `['notifications']`)

## 6.4. Server Actions (`app/actions/`)

18 server action file — thay thế tradition API routes cho mutation:

```typescript
// Ví dụ pattern-actions.ts
'use server';

export async function createPatternSessionAction(input: PatternSessionInput) {
  const session = await proxy().post('/api/v1/patterns/sessions', input);
  revalidatePath('/workplace/design-session');
  return session.data;
}
```

→ Lợi ích: gọi từ form `<form action={...}>`, không cần thêm fetch wrapper.

## 6.5. Auth integration — NextAuth v5

- File: `frontend/src/auth.ts` cấu hình providers (Credentials chính, có thể mở Google/Facebook).
- Session strategy: JWT trong HttpOnly cookie (NFR15).
- Route handler: `app/api/auth/[...nextauth]/route.ts`.
- Server-side check: `auth()` import từ `auth.ts` để kiểm role trong layout `(workplace)/`.

## 6.6. Proxy pattern — `frontend/src/proxy.ts`

- Đọc cookie session, lấy JWT.
- Đính `Authorization: Bearer <jwt>` vào header.
- Forward fetch tới `process.env.BACKEND_URL`.
- Trả response wrapper `{data, meta}` hoặc throw error structured.

```typescript
// Pseudocode tóm tắt
export function proxy() {
  return {
    get:    (path) => fetch(`${BACKEND_URL}${path}`, { headers: authHeaders() }),
    post:   (path, body) => fetch(..., { method: 'POST', body: JSON.stringify(body), headers: { ...authHeaders(), 'Content-Type': 'application/json' } }),
    // ...
  };
}
```

## 6.7. Component library

### 6.7.1 UI primitives — `components/ui/`

- `Avatar.tsx`, `skeleton.tsx` (custom thin layer trên Radix UI)

### 6.7.2 Domain components — `components/client/{domain}/`

| Folder | Tiêu biểu | Mục đích |
|---|---|---|
| `dashboard/` | `KPICard.tsx`, `RevenueChart.tsx`, `OrderStatsCard.tsx`, `AppointmentsTodayCard.tsx`, `ProductionAlerts.tsx`, `OwnerDashboardClient.tsx` | Owner Dashboard (Epic 7) |
| `design/` | `AdaptiveCanvas.tsx`, `IntensitySliders.tsx`, `StylePillarSelector.tsx`, `FabricCard.tsx`, `FabricRecommendationPanel.tsx`, `MeasurementForm.tsx`, `SvgPattern.tsx`, `ComparisonOverlay.tsx`, `DeltaStatsPanel.tsx`, `OverrideHistoryPanel.tsx`, `SanityCheckDashboard.tsx`, `ExportBlueprintButton.tsx` | AI Bespoke + Pattern Engine UI (Epic 11/12+) |
| `showroom/` | Product cards, filters | Catalog (Epic 2) |
| `cart/`, `checkout/` | Cart sidebar, checkout steps | Epic 3 + Epic 10 |
| `booking/` | Calendar, slot picker | Epic 4 |
| `orders/`, `production/`, `rentals/` | Order Board, Production sub-steps, Rental management | Epic 5 + Epic 10 |
| `crm/` | LeadCard, Pipeline | Epic 9 |
| `vouchers/`, `campaigns/` | Voucher CRUD, Campaign builder | Epic 9 |
| `tailor/` | TaskRow, PatternPreview embed | Epic 8 + Epic 11 |
| `inventory/`, `products/` | Inventory grid + Product CRUD | Epic 2 |
| `profile/` | Customer profile, MeasurementHistory | Epic 6 |
| `workplace/` | Sidebar, header common | Layout |
| `rules/` | Smart Rules editor | Epic 14 (deferred) |

## 6.8. Custom hooks

| Hook | Mục đích |
|---|---|
| `useAutoFit.ts` | Auto-fit SVG canvas vào viewport |
| `useMorphing.ts` | Real-time morphing geometry (< 200ms) — interpolation client-side cho slider drag |
| `usePatternSession.ts` | Epic 11 — quản lý lifecycle Pattern Session: create → generate → preview → export |

## 6.9. TypeScript types — `src/types/`

Mỗi domain object có 1 file type:
- `pattern.ts` — `PatternSession`, `PatternPiece`, `MeasurementInput`, `ExportFormat`, …
- `order.ts` — `Order`, `OrderItem`, `OrderStatus`, `ServiceType`, …
- `customer.ts`, `garment.ts`, `geometry.ts`, `style.ts`, … (20 files)

## 6.10. Styling — TailwindCSS v4 + Heritage Palette

### 6.10.1 Color tokens (UX-DR1)

| Token | Hex | Mục đích |
|---|---|---|
| Primary Indigo | `#1A2B4C` | Brand chính |
| Surface Silk Ivory | `#F9F7F2` | Background Boutique |
| Accent Heritage Gold | `#D4AF37` | Highlight, focus ring |
| Background White | `#FFFFFF` | Background Command |
| Text Primary Charcoal | `#1A1A2E` | Body text |
| Text Secondary Warm Gray | `#6B7280` | Caption, hint |
| Success Jade | `#059669` | Confirm, completed |
| Warning Amber | `#D97706` | Pending, alert |
| Error Ruby | `#DC2626` | Error, overdue |
| Info Slate | `#3B82F6` | Notification, link |

### 6.10.2 Typography (UX-DR2)

| Family | Use case |
|---|---|
| **Cormorant Garamond** | Display/H1-H3 (Boutique heading) |
| **Inter** | Body, Button, Caption |
| **JetBrains Mono** | Data, Numbers (giá VND, KPI) |

### 6.10.3 Spacing & density

- 8px base grid
- Boutique: gap 16-24px (spacious)
- Command: gap 8-12px (dense)

## 6.11. Responsive strategy (UX-DR16)

- **Mobile-first** cho `(customer)/`: viewport ≥ 375px
- **Desktop/Tablet-first** cho `(workplace)/`
- Breakpoints: Mobile 320-767px, Tablet 768-1023px, Desktop 1024+

## 6.12. Khởi chạy frontend (dev)

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

## 6.13. Test (Jest + Testing Library)

```bash
npm test              # Run once
npm run test:watch    # Watch mode
```

Test config:
- `jest.config.js` — preset Next.js
- `jest.setup.js` — `@testing-library/jest-dom` matchers
- Unit test: components đặt trong `__tests__/` hoặc cạnh component (`.test.tsx`)
