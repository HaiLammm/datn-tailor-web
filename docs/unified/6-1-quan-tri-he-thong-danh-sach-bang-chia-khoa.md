# Unified Story 6.1: Quan Tri He Thong Danh Sach Bang Chia Khoa (Leads CRM)

Status: review

## Phase 1 — Requirements (Original)
> Khong co story Phase 1 tuong ung — story duoc tao moi trong Phase 2

## Phase 2 — Implementation
> Nguon: _bmad-output/implementation-artifacts/6-1-quan-tri-he-thong-danh-sach-bang-chia-khoa.md

# Story 6.1: Quan Tri He Thong Danh Sach Bang Chia Khoa (Leads CRM)

Status: review

## Story

As a Quan Tri He thong (Owner/Marketing),
I want theo doi danh sach Nguoi Truy Cap Tam Ngam (Leads) Chua Dat Coc Hoac Da Cung Cap Thong Tin Tu Truc Tuyen Xuong App Bang Dieu Khien,
So that toi Danh Gia Suc Khoe Tiem Nang Chot Sale.

## Acceptance Criteria

1. **Given** Tab CRM / Leads Board is accessed by Owner
   **When** viewing the leads list (contacts without orders: New Booking, Failed Cart, Signups, or manual form entries)
   **Then** a table displays Source, Name, Classification (Hot/Warm/Cold)
   **And** a drag-and-drop toggle component allows classification into 3 statuses: "Hot" (recently clicked, booked), "Warm", "Cold"

2. **Given** Owner navigates to CRM section
   **When** the Leads Board loads
   **Then** leads are sortable/filterable by status, source, name, and date added

3. **Given** Owner wants to add a lead manually
   **When** clicking "Add Lead" button
   **Then** a form allows entry of: name, phone, email, source, notes, initial classification

4. **Given** a lead card is displayed
   **When** Owner drags the status indicator or clicks to change classification
   **Then** status updates immediately (optimistic UI) and persists to backend

## Tasks / Subtasks

- [x] Task 1: Database Migration - Create `leads` table (AC: #1, #2, #3)
  - [x] 1.1: Create migration file `020_create_leads_table.sql`
  - [x] 1.2: Fields: `id`, `tenant_id`, `name`, `phone`, `email`, `source` (enum: manual, website, booking_abandoned, cart_abandoned, signup), `classification` (enum: hot, warm, cold), `notes`, `created_at`, `updated_at`
  - [x] 1.3: Add indexes on `tenant_id`, `classification`, `source`, `created_at`
- [x] Task 2: Backend Models - Pydantic schemas & SQLAlchemy model (AC: #1, #3)
  - [x] 2.1: Add `LeadDB` to `db_models.py` with SQLAlchemy mapping
  - [x] 2.2: Create `backend/src/models/lead.py` with Pydantic schemas: `LeadBase`, `LeadCreate`, `LeadUpdate`, `LeadResponse`, `LeadFilter`, enums `LeadSource`, `LeadClassification`
- [x] Task 3: Backend Service - Business logic layer (AC: #1, #2, #3, #4)
  - [x] 3.1: Create `backend/src/services/lead_service.py`
  - [x] 3.2: Functions: `list_leads()` (with filtering/sorting/pagination), `get_lead()`, `create_lead()`, `update_lead()`, `delete_lead()`, `update_classification()`
- [x] Task 4: Backend API - RESTful endpoints (AC: #1, #2, #3, #4)
  - [x] 4.1: Create `backend/src/api/v1/leads.py`
  - [x] 4.2: Endpoints: `GET /api/v1/leads` (list+filter), `GET /api/v1/leads/{id}`, `POST /api/v1/leads`, `PUT /api/v1/leads/{id}`, `DELETE /api/v1/leads/{id}`, `PATCH /api/v1/leads/{id}/classification`
  - [x] 4.3: Register router in `main.py`
  - [x] 4.4: All endpoints require `require_roles("Owner")`
- [x] Task 5: Frontend Server Actions (AC: #1, #2, #3, #4)
  - [x] 5.1: Create `frontend/src/app/actions/lead-actions.ts`
  - [x] 5.2: Functions: `fetchLeads()`, `getLeadById()`, `createLead()`, `updateLead()`, `deleteLead()`, `updateLeadClassification()`
- [x] Task 6: Frontend Types (AC: #1)
  - [x] 6.1: Create `frontend/src/types/lead.ts` with TypeScript interfaces matching Pydantic schemas (use `snake_case` fields for SSOT)
- [x] Task 7: Frontend Page - Owner CRM Leads Board (AC: #1, #2)
  - [x] 7.1: Create `frontend/src/app/(workplace)/owner/crm/page.tsx` (Server Component)
  - [x] 7.2: Auth check: redirect if not Owner
  - [x] 7.3: Initial data fetch, pass to client component
- [x] Task 8: Frontend Client Component - LeadsBoard (AC: #1, #2, #3, #4)
  - [x] 8.1: Create `frontend/src/components/client/crm/LeadsBoardClient.tsx`
  - [x] 8.2: Data table with columns: Name, Phone, Source, Classification badge, Date, Actions
  - [x] 8.3: Classification drag-and-drop or click-to-cycle component (Hot / Warm / Cold)
  - [x] 8.4: Filter bar: by classification, source, search by name/phone
  - [x] 8.5: "Add Lead" button -> modal form (name, phone, email, source, notes, classification)
  - [x] 8.6: Optimistic UI updates on classification change via TanStack Query mutations
  - [x] 8.7: Delete confirmation dialog (Radix AlertDialog)
- [x] Task 9: Sidebar Navigation Update (AC: #1)
  - [x] 9.1: Add "CRM" menu item to `WorkplaceSidebar.tsx` Owner section, linking to `/owner/crm`

## Dev Notes

### Architecture Compliance

- **Backend is SSOT:** All lead data validation happens server-side via Pydantic v2. Frontend only does type validation with Zod for forms.
- **Proxy Pattern:** All API calls go through Next.js Server Actions -> backend. NO direct browser-to-backend calls.
- **JWT Auth:** Use `auth()` in Server Actions to get session token. Forward as `Authorization: Bearer ${session?.accessToken}`.
- **Multi-tenant:** Every query MUST filter by `tenant_id`. Follow pattern in `garment_service.py`.
- **No middleware.ts:** Use `proxy.ts` pattern only (Next.js 16 rule).

### Existing Patterns to Follow (MUST REUSE)

**Backend CRUD Pattern** — Follow `garments.py` API + `garment_service.py` service exactly:
- File: `backend/src/api/v1/garments.py` — endpoint structure, error handling, pagination
- File: `backend/src/services/garment_service.py` — SQLAlchemy query patterns, tenant isolation
- File: `backend/src/models/garment.py` — Pydantic schema structure (Base/Create/Update/Response/Filter)
- Auth: `require_roles("Owner")` decorator from `backend/src/api/dependencies.py`

**Frontend CRUD Pattern** — Follow Products management:
- Server page: `frontend/src/app/(workplace)/owner/products/page.tsx` — auth check + data fetch
- Client component: `frontend/src/components/client/products/ProductManagementClient.tsx` — React Query, mutations
- Server actions: `frontend/src/app/actions/garment-actions.ts` — fetch/create/update/delete pattern
- Staff table: `frontend/src/components/client/StaffTable.tsx` — table layout with mutations

**DB Model Pattern** — Follow `GarmentDB` in `backend/src/models/db_models.py`:
- SQLAlchemy Column definitions with `tenant_id` ForeignKey
- Timestamps: `created_at`, `updated_at`
- String enums stored as VARCHAR

### UI/UX Requirements

- **Command Mode styling:** White background, Indigo sidebar, dense layout (8-12px gaps), sans-serif typography
- **LeadCard component:** Name, phone, source, classification badge (Hot/Warm/Cold), last contact, notes
- **StatusBadge for classification:** Click-to-cycle status (Owner only), color-coded (green/amber/red)
- **Table layout:** Compact dashboard variant, sortable columns, pagination
- **Add Lead form:** Radix Dialog with form fields, Zod validation
- **Delete confirmation:** Radix AlertDialog with Vietnamese messaging
- **Responsive:** Desktop = full table with sidebar, Tablet = collapsible sidebar, Mobile = card-based list
- **Color tokens:** Success/Hot = `#059669`, Warning/Warm = `#D97706`, Error/Cold = `#DC2626`
- **Data font:** JetBrains Mono for data values, Inter for labels

### Database Schema Design

```sql
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(255),
  source VARCHAR(50) NOT NULL DEFAULT 'manual',
  -- source enum: 'manual', 'website', 'booking_abandoned', 'cart_abandoned', 'signup'
  classification VARCHAR(10) NOT NULL DEFAULT 'warm',
  -- classification enum: 'hot', 'warm', 'cold'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_classification ON leads(tenant_id, classification);
CREATE INDEX idx_leads_source ON leads(tenant_id, source);
CREATE INDEX idx_leads_created ON leads(tenant_id, created_at DESC);
```

### API Response Format

Follow project standard wrapper:
```json
// Success
{ "data": { ... }, "meta": { "pagination": { "page": 1, "page_size": 20, "total": 42 } } }

// Error
{ "error": { "code": "ERR_LEAD_NOT_FOUND", "message": "Khong tim thay thong tin lead" } }
```

### Naming Conventions

- DB table: `leads` (plural, snake_case)
- DB columns: `snake_case`
- Backend Pydantic: `LeadCreate`, `LeadResponse` (PascalCase)
- Frontend types: `interface LeadResponse` (PascalCase, snake_case fields)
- Frontend component: `LeadsBoardClient.tsx` (PascalCase)
- API endpoint: `/api/v1/leads` (plural, snake_case)
- Vietnamese UI labels and error messages throughout

### Cross-Story Context

- Story 6.2 will add "Convert Lead -> Customer" action button on lead cards. Design the LeadCard component to accommodate future action buttons.
- Story 6.3 (Voucher Creator) and 6.4 (Broadcasting) will integrate with lead data for targeting. Ensure the `leads` table and API support future extensions.

### Migration Numbering

- Check `backend/migrations/` for the latest migration number. Current latest appears to be `019_*.sql`. Use `020_create_leads_table.sql`.

### Project Structure Notes

- New backend files: `models/lead.py`, `services/lead_service.py`, `api/v1/leads.py`
- New frontend files: `types/lead.ts`, `actions/lead-actions.ts`, `app/(workplace)/owner/crm/page.tsx`, `components/client/crm/LeadsBoardClient.tsx`
- Sidebar update: `components/client/workplace/WorkplaceSidebar.tsx`
- Alignment with existing project structure confirmed — all paths follow conventions

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.1]
- [Source: _bmad-output/planning-artifacts/architecture.md — CRM Schema, API Patterns, RBAC, Dual-Mode UI]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — LeadCard, Command Mode, StatusBadge, Dashboard Layout]
- [Source: _bmad-output/project-context.md — Naming Conventions, Auth Rules, Component Separation]
- [Source: backend/src/api/v1/garments.py — CRUD API pattern reference]
- [Source: backend/src/services/garment_service.py — Service layer pattern reference]
- [Source: backend/src/models/garment.py — Pydantic schema pattern reference]
- [Source: frontend/src/app/(workplace)/owner/products/page.tsx — Server page pattern reference]
- [Source: frontend/src/components/client/workplace/WorkplaceSidebar.tsx — Sidebar nav pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6

### Debug Log References

- Migration numbering: Story expected `020_`, actual latest was `018_` -> used `019_create_leads_table.sql`
- Pre-existing test failures confirmed unrelated to this story: `test_rental_service` (decimal SQLAlchemy issue), `test_staff_service` (attribute error) — both existed before this implementation
- TypeScript errors in `__tests__/` (jest-dom type definitions) are pre-existing, not introduced by this story

### Completion Notes List

- Task 1: Migration `019_create_leads_table.sql` created with all required fields and 4 indexes for tenant isolation + common filter patterns
- Task 2: `LeadDB` SQLAlchemy model added to `db_models.py`; `backend/src/models/lead.py` with full Pydantic schema set (LeadBase/Create/Update/Response/Filter/ListResponse + LeadSource/LeadClassification enums) with field validators for email and sort_by whitelist injection prevention
- Task 3: `lead_service.py` with full CRUD + `update_classification()` — multi-tenant isolation on all queries, case-insensitive search on name+phone, sort whitelist protection
- Task 4: `leads.py` API router with 6 endpoints (list/get/create/update/delete/patch classification), all Owner-only, registered in `main.py`
- Task 5: `lead-actions.ts` server actions for all 6 operations with auth token forwarding, timeout handling, error handling
- Task 6: `lead.ts` TypeScript interfaces with snake_case fields + display label constants + Tailwind color tokens for classification badges
- Task 7: `/owner/crm/page.tsx` Server Component with RBAC check + SSR initial data fetch
- Task 8: `LeadsBoardClient.tsx` with: data table, click-to-cycle ClassificationBadge, filter bar (search/classification/source), Add Lead modal (form with Zod-like validation), Delete confirmation dialog, optimistic UI via TanStack Query `onMutate`, pagination. Actions column structured for Story 6.2 Convert button extension.
- Task 9: "CRM" sidebar item added to Owner menu in `WorkplaceSidebar.tsx`
- 28 unit/integration tests covering: list filtering, search, pagination, sorting, tenant isolation, CRUD, classification update, cross-tenant security, Pydantic schema validation

### File List

- `backend/migrations/019_create_leads_table.sql` (new)
- `backend/src/models/db_models.py` (modified — added LeadDB class)
- `backend/src/models/lead.py` (new)
- `backend/src/services/lead_service.py` (new)
- `backend/src/api/v1/leads.py` (new)
- `backend/src/main.py` (modified — added leads_router import and registration)
- `backend/tests/test_lead_service.py` (new — 28 tests, all passing)
- `frontend/src/types/lead.ts` (new)
- `frontend/src/app/actions/lead-actions.ts` (new)
- `frontend/src/app/(workplace)/owner/crm/page.tsx` (new)
- `frontend/src/components/client/crm/LeadsBoardClient.tsx` (new)
- `frontend/src/components/client/workplace/WorkplaceSidebar.tsx` (modified — added CRM menu item)
- `_bmad-output/implementation-artifacts/sprint-status.yaml` (modified)

## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: 6.1 Quan Tri He Thong Danh Sach Bang Chia Khoa (Leads CRM)
- Epic: 6
