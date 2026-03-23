# Unified Story 6.3: Voucher Creator UI (Cong Cu Thuc Dai Ban Hang)

Status: review

## Phase 1 — Requirements (Original)
> Khong co story Phase 1 tuong ung — story duoc tao moi trong Phase 2

## Phase 2 — Implementation
> Nguon: _bmad-output/implementation-artifacts/6-3-voucher-creator-ui.md

# Story 6.3: Voucher Creator UI (Cong Cu Thuc Dai Ban Hang)

Status: review

## Story

As a Quan Ly Sales Co Cau Gia (Owner),
I want CRUD Giao Dien Tao Ma Voucher Code Giam Gia The Loai (%) Lan (Truc tiep gia tien / Fixed Value),
So that thuc day Ngay Le Hoi (Tet) va tang doanh so ban hang.

## Acceptance Criteria

1. **Voucher List View** — Owner sees a paginated table of all vouchers with columns: Code, Type (% / Fixed), Value, Min Order, Expiry, Status (Active/Expired), Used/Total, Actions.
2. **Create Voucher** — Owner fills a form with: code (e.g. TETLUXV26), discount type (percent or fixed VND), discount value, min_order_value, max_discount_value (for percent type), description, expiry_date, total_uses. System validates and persists to `vouchers` table.
3. **Edit Voucher** — Owner can update any field of an existing voucher (except code if already assigned to users). Changes saved to DB.
4. **Deactivate/Activate Voucher** — Owner can toggle `is_active` without deleting. Deactivated vouchers cannot be assigned to new customers.
5. **Delete Voucher** — Owner can delete a voucher only if `used_count == 0` (no customer has used it). Confirm dialog required.
6. **Validation Rules** — Code unique per tenant; percent value 0-100; fixed value > 0; expiry_date must be in the future on create; min_order_value >= 0; max_discount_value only for percent type.
7. **Analytics Summary** — Dashboard shows: total vouchers, active count, total redemptions (sum of used_count), and redemption rate.

## Tasks / Subtasks

- [x] Task 1: Backend CRUD API (AC: #1, #2, #3, #4, #5, #6)
  - [x] 1.1 Create `backend/src/services/voucher_service.py` with: `list_vouchers()`, `get_voucher()`, `create_voucher()`, `update_voucher()`, `toggle_voucher_active()`, `delete_voucher()`, `get_voucher_stats()`
  - [x] 1.2 Create `backend/src/api/v1/vouchers.py` router with Owner-only endpoints
  - [x] 1.3 Add Pydantic request/response schemas to `backend/src/models/voucher.py` (extend existing file)
  - [x] 1.4 Register router in `backend/src/main.py`
- [x] Task 2: Backend Tests (AC: #1-#7)
  - [x] 2.1 Create `backend/tests/test_voucher_crud_api.py` covering all CRUD operations, validation, tenant isolation, delete guard
- [x] Task 3: Frontend Voucher List Page (AC: #1, #7)
  - [x] 3.1 Create `frontend/src/app/(workplace)/owner/vouchers/page.tsx` (Server Component with auth guard)
  - [x] 3.2 Create `frontend/src/components/client/vouchers/VoucherManagementClient.tsx` with table, search, pagination, stats summary
- [x] Task 4: Frontend Create/Edit Forms (AC: #2, #3, #6)
  - [x] 4.1 Create `frontend/src/app/(workplace)/owner/vouchers/new/page.tsx`
  - [x] 4.2 Create `frontend/src/app/(workplace)/owner/vouchers/[id]/edit/page.tsx`
  - [x] 4.3 Create `frontend/src/components/client/vouchers/VoucherForm.tsx` (shared create/edit form with Zod validation)
- [x] Task 5: Frontend Actions & Types (AC: #2-#5)
  - [x] 5.1 Add Owner voucher types to `frontend/src/types/voucher.ts` (extend existing, add OwnerVoucher, VoucherFormData, VoucherStats)
  - [x] 5.2 Create `frontend/src/app/actions/voucher-actions.ts` with Server Actions for all CRUD ops
- [x] Task 6: Frontend Delete/Toggle (AC: #4, #5)
  - [x] 6.1 Add toggle active and delete with confirm dialog in VoucherManagementClient
- [x] Task 7: Sidebar Navigation
  - [x] 7.1 Add "Vouchers" menu item to `WorkplaceSidebar.tsx` under CRM section

## Dev Notes

### Existing Infrastructure (Story 4.4g — DO NOT recreate)

The `vouchers` and `user_vouchers` tables already exist (migration 017). The ORM models `VoucherDB` and `UserVoucherDB` already exist in `backend/src/models/db_models.py`. Customer-facing read-only API exists at `GET /api/v1/customers/me/vouchers`. This story adds **Owner CRUD** on top of the existing schema — NO new migrations needed.

### Backend Patterns (MUST follow)

- **Service layer pattern:** All business logic in `backend/src/services/voucher_service.py`, NOT in route handlers
- **Async SQLAlchemy:** Use `async_session` from `backend/src/db.py`, all queries use `await session.execute(select(...))`
- **Tenant isolation:** Every query MUST filter by `tenant_id` from JWT token
- **Auth dependency:** Use `get_current_owner` dependency (same as `backend/src/api/v1/leads.py`)
- **Response format:** `{"data": {...}}` for single, `{"data": [...], "meta": {"total": N, "page": P, "page_size": S}}` for lists
- **Error codes:** 400 (validation), 404 (not found), 409 (duplicate code), 403 (wrong tenant)
- **Decimal handling:** PostgreSQL Numeric columns -> Pydantic `Decimal` -> serialized as strings in JSON (existing pattern in `VoucherResponse`)

### Frontend Patterns (MUST follow)

- **CRUD page structure:** Follow `/owner/products/` pattern exactly:
  - `page.tsx` = Server Component with auth guard + SSR data fetch
  - `new/page.tsx` = Create page
  - `[id]/edit/page.tsx` = Edit page
  - Shared `VoucherForm.tsx` component for create/edit
- **Client components** go in `frontend/src/components/client/vouchers/`
- **Server Actions** proxy to backend via `fetchWithAuth()` from `frontend/src/lib/api.ts`
- **Form validation:** Zod schema on client side, backend validates independently
- **State management:** TanStack Query for server state, `useRouter()` for navigation
- **Toast notifications:** Use existing toast system for success/error feedback
- **Styling:** Tailwind CSS, `bg-[#F9F7F2]` cream background, `font-serif` for titles, Radix UI primitives
- **Responsive:** Desktop-first grid, collapse to single column on mobile
- **Decimal display:** Parse with `parseFloat()` from string API values, format with `toLocaleString('vi-VN')` for VND

### API Endpoints to Create

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/vouchers` | List vouchers (paginated, filterable by status) |
| GET | `/api/v1/vouchers/stats` | Voucher analytics summary |
| GET | `/api/v1/vouchers/{id}` | Get single voucher detail |
| POST | `/api/v1/vouchers` | Create new voucher |
| PUT | `/api/v1/vouchers/{id}` | Update voucher |
| PATCH | `/api/v1/vouchers/{id}/toggle-active` | Toggle is_active |
| DELETE | `/api/v1/vouchers/{id}` | Delete (only if used_count == 0) |

### Pydantic Schemas to Add (in `backend/src/models/voucher.py`)

```python
class VoucherCreateRequest(BaseModel):
    code: str                           # max 50 chars, uppercase
    type: VoucherType                   # 'percent' | 'fixed'
    value: Decimal                      # > 0, <= 100 if percent
    min_order_value: Decimal = Decimal("0")
    max_discount_value: Optional[Decimal] = None  # only for percent
    description: Optional[str] = None
    expiry_date: date                   # must be future
    total_uses: int = 1                 # >= 1

class VoucherUpdateRequest(BaseModel):
    type: Optional[VoucherType] = None
    value: Optional[Decimal] = None
    min_order_value: Optional[Decimal] = None
    max_discount_value: Optional[Decimal] = None
    description: Optional[str] = None
    expiry_date: Optional[date] = None
    total_uses: Optional[int] = None

class OwnerVoucherResponse(BaseModel):
    id: UUID
    code: str
    type: VoucherType
    value: Decimal
    min_order_value: Decimal
    max_discount_value: Optional[Decimal] = None
    description: Optional[str] = None
    expiry_date: date
    total_uses: int
    used_count: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

class VoucherStatsResponse(BaseModel):
    total_vouchers: int
    active_vouchers: int
    total_redemptions: int
    redemption_rate: float  # used_count / total_uses across all vouchers
```

### TypeScript Types to Add (in `frontend/src/types/voucher.ts`)

```typescript
export interface OwnerVoucher {
  id: string;
  code: string;
  type: VoucherType;
  value: string;          // Decimal as string
  min_order_value: string;
  max_discount_value: string | null;
  description: string | null;
  expiry_date: string;
  total_uses: number;
  used_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VoucherFormData {
  code: string;
  type: VoucherType;
  value: number;
  min_order_value: number;
  max_discount_value: number | null;
  description: string;
  expiry_date: string;
  total_uses: number;
}

export interface VoucherStats {
  total_vouchers: number;
  active_vouchers: number;
  total_redemptions: number;
  redemption_rate: number;
}
```

### Project Structure Notes

- All new files follow established naming conventions (`snake_case` backend, `PascalCase` frontend components)
- Route path: `/owner/vouchers` (consistent with existing `/owner/products`, `/owner/crm`)
- Sidebar icon: Use `TicketPercent` from lucide-react (matches voucher/discount concept)
- No new database migrations — schema already exists from Story 4.4g

### Previous Story Intelligence (6.2: Lead Conversion)

- **Proxy Pattern confirmed:** All API calls flow through Next.js Server Actions -> backend, no direct browser-to-backend calls
- **Optimistic UI:** TanStack Query's `onMutate` hook for immediate UI updates (use for toggle active)
- **Custom dialogs:** Use custom dialog implementation (not Radix AlertDialog), consistent with existing patterns
- **Framer Motion:** Use AnimatePresence for delete/toggle animations
- **Pre-existing test failures:** rental_service, staff_service, sanity_check_api, internal_order_service — ignore these, not related
- **Toast pattern:** Success toast with Vietnamese messages, error toast with error detail

### Git Intelligence

Recent commits show consistent patterns:
- Feature commits: `feat(epic): description`
- Bug fixes: `fix(scope): description`
- File structure: services -> API routes -> frontend components -> tests
- All stories implement full-stack: backend service + API + frontend + tests

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.3]
- [Source: _bmad-output/planning-artifacts/architecture.md — Tech Stack, API Patterns, Database Schemas]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md — FR73-FR77]
- [Source: _bmad-output/implementation-artifacts/4-4g-kho-voucher.md — Voucher infrastructure]
- [Source: _bmad-output/implementation-artifacts/6-2-khai-mo-chuyen-hoa-khach.md — Previous story patterns]
- [Source: backend/migrations/017_create_vouchers_tables.sql — Existing voucher schema]
- [Source: backend/src/models/db_models.py:560-635 — VoucherDB, UserVoucherDB ORM models]
- [Source: backend/src/models/voucher.py — Existing Pydantic schemas]
- [Source: frontend/src/types/voucher.ts — Existing TypeScript types]
- [Source: frontend/src/components/client/workplace/WorkplaceSidebar.tsx — Sidebar navigation]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

### Completion Notes List

- Full-stack CRUD implementation for Owner voucher management
- Backend: 7 API endpoints (list, get, create, update, toggle-active, delete, stats) with Owner-only auth
- Service layer with multi-tenant isolation, code uniqueness (409), percent range validation, expiry date validation, delete guard (used_count > 0 blocks delete)
- 23 backend unit tests: all passing (create, list, get, update, toggle, delete, stats with tenant isolation and validation edge cases)
- Frontend: CRUD pages following /owner/products pattern (list/new/edit), VoucherForm with Zod validation, VoucherManagementClient with search/pagination/toggle/delete
- Server Actions proxy pattern (no direct browser-to-backend calls)
- Sidebar "Vouchers" menu item added to WorkplaceSidebar
- Stats summary: total, active, redemption rate displayed on list page header
- No new migrations required — reuses existing vouchers table from Story 4.4g
- Regression: 743 passed, 10 pre-existing failures (rental_service, staff_service, sanity_check_api, internal_order_service — not introduced by this story)
- Pre-existing TypeScript build error in profile/orders/page.tsx — not introduced by this story

### Change Log

- 2026-03-22: Full implementation of Story 6.3 — Owner Voucher CRUD (all 7 tasks completed)

### File List

**New Files:**
- backend/src/services/voucher_service.py
- backend/src/api/v1/vouchers.py
- backend/tests/test_voucher_crud_api.py
- frontend/src/app/(workplace)/owner/vouchers/page.tsx
- frontend/src/app/(workplace)/owner/vouchers/new/page.tsx
- frontend/src/app/(workplace)/owner/vouchers/[id]/edit/page.tsx
- frontend/src/components/client/vouchers/VoucherManagementClient.tsx
- frontend/src/components/client/vouchers/VoucherForm.tsx
- frontend/src/app/actions/voucher-actions.ts

**Modified Files:**
- backend/src/models/voucher.py (added VoucherCreateRequest, VoucherUpdateRequest, OwnerVoucherResponse, VoucherStatsResponse)
- backend/src/main.py (registered vouchers_router)
- frontend/src/types/voucher.ts (added OwnerVoucher, VoucherFormData, VoucherStats, API response types)
- frontend/src/components/client/workplace/WorkplaceSidebar.tsx (added Vouchers menu item)

## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: 6.3 Voucher Creator UI (Cong Cu Thuc Dai Ban Hang)
- Epic: 6
