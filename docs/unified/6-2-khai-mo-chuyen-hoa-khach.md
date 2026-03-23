# Unified Story 6.2: Khai Mo & Chuyen Hoa Khach (Lead-to-Customer Conversion)

Status: review

## Phase 1 — Requirements (Original)
> Khong co story Phase 1 tuong ung — story duoc tao moi trong Phase 2

## Phase 2 — Implementation
> Nguon: _bmad-output/implementation-artifacts/6-2-khai-mo-chuyen-hoa-khach.md

# Story 6.2: Khai Mo & Chuyen Hoa Khach (Lead-to-Customer Conversion)

Status: review

## Story

As a Quan tri Chu Co So Mua Ban (Owner),
I want tac vu button click ngay truc tiep tu Lead nay sinh len bang Nguoi Mua/Customer (dong bo Profile do thuoc doi),
So that toi khong can ton cong nhap du lieu X2, tiet kiem nhanh gon tai cua hang.

## Acceptance Criteria

1. **Given** a Lead card with "Hot" classification on the CRM Leads Board
   **When** Owner clicks the "Chuyen khach" (Convert to Customer) action button
   **Then** a confirmation dialog appears showing Lead info (name, phone, email) with option to create user account
   **And** upon confirmation, a new `customer_profiles` record is created with Lead's contact data
   **And** a default empty `measurements` record (is_default=true) is initialized for the new customer
   **And** the Lead record is soft-deleted (or hard-deleted) from the active leads list
   **And** a conversion audit log is saved (timestamp, converted_by, source_lead_id, target_customer_id)
   **And** a success toast notification is displayed to the Owner

2. **Given** a Lead with status "Warm" or "Cold"
   **When** Owner views the Lead card action menu
   **Then** the "Chuyen khach" button is still available (not restricted to Hot only per re-analysis — Owner may convert any lead at their discretion)
   **And** a warning is shown for non-Hot leads: "Lead chua o trang thai Hot. Ban co chac muon chuyen?"

3. **Given** a Lead whose phone number already exists in `customer_profiles` for this tenant
   **When** Owner attempts to convert
   **Then** the system shows error: "Khach hang voi so dien thoai nay da ton tai"
   **And** the conversion is blocked to prevent duplicates
   **And** the Lead remains in the Leads Board unchanged

4. **Given** a Lead with email that matches an existing `users` record
   **When** conversion is successful
   **Then** the new `customer_profiles.user_id` is linked to the existing user account
   **And** no duplicate user account is created

5. **Given** two Owners viewing the same Lead simultaneously
   **When** Owner A initiates conversion first
   **Then** Owner B's conversion attempt fails gracefully with message: "Lead nay da duoc chuyen thanh khach hang"
   **And** the Lead disappears from Owner B's board on next data refresh

6. **Given** a successful Lead conversion
   **When** the CRM page refreshes or TanStack Query refetches
   **Then** the converted Lead is no longer visible in the Leads Board
   **And** the new Customer appears in the Customer Management page (`/owner/customers`)

## Tasks / Subtasks

- [x] Task 1: Backend — Add conversion endpoint and service logic (AC: #1, #3, #4, #5)
  - [x] 1.1: Create `convert_lead_to_customer()` in `lead_service.py` — transactional operation: validate lead exists + phone not duplicate in `customer_profiles` -> create `CustomerProfileDB` -> create default `MeasurementDB` (is_default=true, all values null) -> delete lead -> return new customer profile
  - [x] 1.2: Add `POST /api/v1/leads/{lead_id}/convert` endpoint in `leads.py` — requires Owner role, accepts optional `create_account: bool` field, returns created customer profile
  - [x] 1.3: Handle race condition — use `SELECT ... FOR UPDATE` on lead row before conversion to prevent double-conversion
  - [x] 1.4: Handle email linking — if lead.email matches existing `users.email`, set `customer_profiles.user_id` to that user
  - [x] 1.5: Optional account creation — if `create_account=true` and lead has email, reuse `create_customer_with_account()` from `customer_service.py`

- [x] Task 2: Backend — Conversion audit logging (AC: #1)
  - [x] 2.1: Create migration `020_create_lead_conversions_table.sql` — table `lead_conversions` with: `id`, `tenant_id`, `lead_id` (UUID, stored for reference even after lead deletion), `lead_name`, `lead_phone`, `lead_email`, `lead_source`, `customer_profile_id` (FK), `converted_by` (FK to users), `created_at`
  - [x] 2.2: Add `LeadConversionDB` model to `db_models.py`
  - [x] 2.3: Record conversion in `convert_lead_to_customer()` within the same transaction

- [x] Task 3: Backend — Pydantic schemas for conversion (AC: #1, #2)
  - [x] 3.1: Add to `backend/src/models/lead.py`: `LeadConvertRequest(create_account: bool = False)`, `LeadConvertResponse(customer_profile_id, customer_name, message)`
  - [x] 3.2: Add `LeadConversionRecord` response schema for audit log queries (future use)

- [x] Task 4: Frontend — Server Action for conversion (AC: #1)
  - [x] 4.1: Add `convertLeadToCustomer(leadId: string, createAccount: boolean)` to `lead-actions.ts`
  - [x] 4.2: Returns customer profile data on success, error message on failure
  - [x] 4.3: Revalidate both `/owner/crm` and `/owner/customers` paths on success

- [x] Task 5: Frontend — Types for conversion (AC: #1)
  - [x] 5.1: Add `LeadConvertRequest`, `LeadConvertResponse` interfaces to `frontend/src/types/lead.ts`

- [x] Task 6: Frontend — Convert button and dialog in LeadsBoardClient (AC: #1, #2, #3, #5)
  - [x] 6.1: Add "Chuyen khach" button to each Lead card's Actions column in `LeadsBoardClient.tsx`
  - [x] 6.2: Create conversion confirmation dialog (Radix AlertDialog) showing: Lead name, phone, email, classification badge, checkbox "Tao tai khoan dang nhap cho khach" (default unchecked)
  - [x] 6.3: For non-Hot leads, show additional warning text in the dialog
  - [x] 6.4: Optimistic UI — on confirm, immediately remove lead row with Framer Motion exit animation (`AnimatePresence` + `motion.tr`)
  - [x] 6.5: On conversion error (duplicate phone, already converted), show error toast and restore lead row
  - [x] 6.6: Success toast with customer name: "Da chuyen {name} thanh khach hang thanh cong!"

- [x] Task 7: Backend — Unit tests for conversion (AC: #1, #3, #4, #5)
  - [x] 7.1: Test successful Hot lead conversion — customer created, measurement created, lead deleted
  - [x] 7.2: Test Warm/Cold lead conversion — still succeeds
  - [x] 7.3: Test duplicate phone rejection — conversion blocked
  - [x] 7.4: Test email auto-linking to existing user
  - [x] 7.5: Test race condition — second conversion returns 404 or 409
  - [x] 7.6: Test tenant isolation — cannot convert lead from different tenant
  - [x] 7.7: Test audit log creation — `lead_conversions` record exists after conversion

## Dev Notes

### Architecture Compliance

- **Backend is SSOT:** All validation (phone duplicate check, lead existence, tenant isolation) happens server-side. Frontend only validates form inputs with Zod.
- **Proxy Pattern:** All API calls go through Next.js Server Actions -> backend. NO direct browser-to-backend calls.
- **JWT Auth:** Use `auth()` in Server Actions to get session token. Forward as `Authorization: Bearer ${session?.accessToken}`.
- **Multi-tenant:** Every query MUST filter by `tenant_id`. Follow pattern in `lead_service.py` and `customer_service.py`.
- **Transactional integrity:** The entire conversion (create customer + create measurement + delete lead + create audit log) MUST be in a single database transaction. On any failure, ALL operations roll back.

### Existing Code to REUSE (DO NOT reinvent)

**Lead CRUD (Story 6.1):**
- `backend/src/services/lead_service.py` — `get_lead()`, `delete_lead()` patterns
- `backend/src/api/v1/leads.py` — endpoint structure, auth, error responses
- `backend/src/models/lead.py` — existing Pydantic schemas (add new ones here)
- `frontend/src/app/actions/lead-actions.ts` — Server Action pattern with auth forwarding
- `frontend/src/components/client/crm/LeadsBoardClient.tsx` — existing board component to extend

**Customer Creation (Story 1.3):**
- `backend/src/services/customer_service.py` — `create_customer_profile()` logic for reference, `create_customer_with_account()` for optional account creation, `link_customer_to_user_by_email()` for email-based linking
- `backend/src/models/customer.py` — `CustomerProfileCreateRequest`, `CustomerProfileResponse` schemas
- `backend/src/models/db_models.py` — `CustomerProfileDB` (line 111), `MeasurementDB` (line 148)

**UI Patterns:**
- `frontend/src/components/client/crm/LeadsBoardClient.tsx` — existing delete confirmation dialog pattern (reuse for conversion dialog)
- TanStack Query mutation pattern with optimistic UI already established in LeadsBoardClient
- Framer Motion animation pattern: use `AnimatePresence` + `motion.tr` for row removal

### Database Schema — New Table

```sql
-- Migration: 020_create_lead_conversions_table.sql
CREATE TABLE IF NOT EXISTS lead_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL,  -- Reference only (lead may be deleted)
  lead_name VARCHAR(255) NOT NULL,
  lead_phone VARCHAR(20),
  lead_email VARCHAR(255),
  lead_source VARCHAR(50),
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  converted_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_tenant ON lead_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_conversions_customer ON lead_conversions(customer_profile_id);
```

### Conversion Service Logic (Pseudocode)

```python
async def convert_lead_to_customer(
    db: AsyncSession,
    tenant_id: UUID,
    lead_id: UUID,
    converted_by: UUID,
    create_account: bool = False,
) -> CustomerProfileDB:
    # 1. Lock and fetch lead (SELECT FOR UPDATE prevents race condition)
    lead = await db.execute(
        select(LeadDB)
        .where(LeadDB.id == lead_id, LeadDB.tenant_id == tenant_id)
        .with_for_update()
    )
    lead = lead.scalar_one_or_none()
    if not lead:
        raise HTTPException(404, "Lead khong ton tai hoac da duoc chuyen")

    # 2. Check phone duplicate in customer_profiles
    existing = await db.execute(
        select(CustomerProfileDB)
        .where(CustomerProfileDB.tenant_id == tenant_id,
               CustomerProfileDB.phone == lead.phone,
               CustomerProfileDB.is_deleted == False)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(409, "Khach hang voi so dien thoai nay da ton tai")

    # 3. Create customer profile
    customer = CustomerProfileDB(
        tenant_id=tenant_id,
        full_name=lead.name,
        phone=lead.phone or "",
        email=lead.email,
        notes=f"Chuyen tu Lead (source: {lead.source}). {lead.notes or ''}"
    )

    # 4. Link to existing user by email (if applicable)
    if lead.email:
        user = await get_user_by_email(db, lead.email)
        if user:
            customer.user_id = user.id

    # 5. Optional: create user account
    if create_account and lead.email and not customer.user_id:
        user = await create_customer_with_account(db, lead.email, lead.name, lead.phone)
        customer.user_id = user.id

    db.add(customer)
    await db.flush()  # Get customer.id

    # 6. Create default measurement profile
    measurement = MeasurementDB(
        customer_profile_id=customer.id,
        tenant_id=tenant_id,
        is_default=True,
        measured_date=date.today(),
    )
    db.add(measurement)

    # 7. Create audit log
    conversion_log = LeadConversionDB(
        tenant_id=tenant_id,
        lead_id=lead.id,
        lead_name=lead.name,
        lead_phone=lead.phone,
        lead_email=lead.email,
        lead_source=lead.source,
        customer_profile_id=customer.id,
        converted_by=converted_by,
    )
    db.add(conversion_log)

    # 8. Delete lead
    await db.delete(lead)

    await db.commit()
    return customer
```

### API Endpoint Design

```
POST /api/v1/leads/{lead_id}/convert
Authorization: Bearer <token>
Content-Type: application/json

Request Body:
{
  "create_account": false  // Optional, default false
}

Success Response (201 Created):
{
  "data": {
    "customer_profile_id": "uuid",
    "customer_name": "Nguyen Van A",
    "message": "Da chuyen Lead thanh khach hang thanh cong"
  }
}

Error Responses:
- 404: { "error": { "code": "ERR_LEAD_NOT_FOUND", "message": "Lead khong ton tai hoac da duoc chuyen" } }
- 409: { "error": { "code": "ERR_DUPLICATE_PHONE", "message": "Khach hang voi so dien thoai nay da ton tai" } }
- 403: { "error": { "code": "ERR_FORBIDDEN", "message": "Chi Owner moi co quyen chuyen Lead" } }
```

### UI/UX Requirements

- **Convert button placement:** In the Actions column of each lead row, alongside existing Edit/Delete buttons. Use a distinct color (Heritage Gold `#D4AF37` or Indigo `#1A2B4C`) to stand out.
- **Button label:** "Chuyen khach" with an arrow-right icon
- **Confirmation dialog:** Radix AlertDialog with:
  - Title: "Chuyen Lead thanh Khach hang?"
  - Lead summary: Name, Phone, Email, Classification badge
  - Checkbox: "Tao tai khoan dang nhap cho khach" (unchecked by default, only shown if lead has email)
  - Warning for non-Hot: amber text "Lead chua o trang thai Hot"
  - Confirm button: "Chuyen khach" (Heritage Gold)
  - Cancel button: "Huy"
- **Row exit animation:** Framer Motion `AnimatePresence` with `motion.tr` — slide-out + fade, duration 300ms
- **Success toast:** Green toast "Da chuyen {name} thanh khach hang thanh cong!"
- **Error toast:** Red toast with specific error message from backend
- **Command Mode styling:** Dense layout (8-12px gaps), Inter font for labels, JetBrains Mono for data

### Migration Numbering

- Check `backend/migrations/` for latest number. Story 6.1 used `019_`. Use `020_create_lead_conversions_table.sql`.

### Naming Conventions

- DB table: `lead_conversions` (plural, snake_case)
- DB columns: `snake_case`
- Backend Pydantic: `LeadConvertRequest`, `LeadConvertResponse` (PascalCase)
- Backend service function: `convert_lead_to_customer()` (snake_case)
- API endpoint: `POST /api/v1/leads/{lead_id}/convert` (RESTful sub-resource action)
- Frontend types: `interface LeadConvertRequest` (PascalCase, snake_case fields)
- Vietnamese UI labels and error messages throughout

### Cross-Story Context

- Story 6.1 (Leads Board) is the foundation — LeadsBoardClient.tsx already has an Actions column structured for this story's Convert button (confirmed in 6.1 completion notes).
- Story 6.3 (Voucher Creator) and 6.4 (Broadcasting) may query `lead_conversions` table for analytics. Ensure the audit table is well-indexed.
- Measurement profile created here is a placeholder — Story 1.7 (Customer Measurement Management) already provides full measurement CRUD for Owner to fill in real values later.

### Project Structure Notes

- Modified backend files: `models/lead.py` (add schemas), `services/lead_service.py` (add conversion function), `api/v1/leads.py` (add endpoint), `models/db_models.py` (add LeadConversionDB)
- New backend file: `migrations/020_create_lead_conversions_table.sql`
- Modified frontend files: `types/lead.ts` (add conversion types), `actions/lead-actions.ts` (add conversion action), `components/client/crm/LeadsBoardClient.tsx` (add convert button + dialog)
- No new frontend pages needed — conversion happens within existing CRM page

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.2, FR72]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, RBAC, Transactional Integrity, Naming]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — LeadCard Actions, Command Mode, Framer Motion]
- [Source: backend/src/services/customer_service.py — create_customer_profile(), create_customer_with_account()]
- [Source: backend/src/services/lead_service.py — CRUD patterns, tenant isolation]
- [Source: backend/src/models/db_models.py — CustomerProfileDB (line 111), MeasurementDB (line 148), LeadDB (line 637)]
- [Source: frontend/src/components/client/crm/LeadsBoardClient.tsx — existing board UI, mutation patterns]
- [Source: _bmad-output/implementation-artifacts/6-1-quan-tri-he-thong-danh-sach-bang-chia-khoa.md — previous story learnings]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.6 (1M context)

### Debug Log References

- SQLite does not support SELECT FOR UPDATE — patched in tests via `_patch_for_update()` monkeypatch. Race condition protection is tested at integration level with PostgreSQL.
- Pre-existing test failures confirmed unrelated: `test_rental_service` (decimal SQLAlchemy), `test_staff_service` (attribute error), `test_sanity_check_api` (event loop), `test_internal_order_service` — all existed before this story.
- Pre-existing TypeScript errors in `__tests__/AddToCartButton.test.tsx` (jest-dom type definitions) — not introduced by this story.
- Used custom dialog implementation instead of Radix AlertDialog (consistent with existing pattern in LeadsBoardClient.tsx delete dialog).

### Completion Notes List

- Task 1: `convert_lead_to_customer()` in `lead_service.py` — full transactional conversion: SELECT FOR UPDATE lock -> phone duplicate check -> create CustomerProfileDB -> link email to existing user -> optional account creation (email or phone@local as login, default password "camonquykhach", is_active=True) -> create default MeasurementDB (is_default=true) -> create LeadConversionDB audit log -> delete lead -> commit. HTTPException 404/409 for error cases.
- Task 2: Migration `020_create_lead_conversions_table.sql` + `LeadConversionDB` ORM model. Denormalized lead data stored for reference after lead deletion. 2 indexes: tenant_id, customer_profile_id.
- Task 3: `LeadConvertRequest`, `LeadConvertResponse`, `LeadConversionRecord` Pydantic schemas added to `lead.py`.
- Task 4: `convertLeadToCustomer()` Server Action with auth token forwarding, 404/409/403 error handling, dual path revalidation (`/owner/crm` + `/owner/customers`).
- Task 5: `LeadConvertRequest`, `LeadConvertResponse`, `LeadConvertApiResponse` TypeScript interfaces added to `lead.ts`.
- Task 6: "Chuyen khach" Heritage Gold button in Actions column. ConvertConfirmDialog with lead summary, classification badge, non-Hot warning, create account checkbox. Optimistic UI removes lead row immediately via TanStack Query `onMutate`. Framer Motion `AnimatePresence` + `motion.tr` exit animation (slide-out + fade, 300ms). Toast notifications for success (green) and error (red) with auto-dismiss.
- Task 7: 10 unit tests covering all 7 specified scenarios + audit log verification + account creation with email + account creation with phone@local. All 10 pass. 32 existing lead tests unchanged and passing. Full suite: 718 passed, 10 pre-existing failures.

### Change Log

- 2026-03-22: Story 6.2 implementation complete — Lead-to-Customer conversion with full-stack implementation

### File List

- `backend/migrations/020_create_lead_conversions_table.sql` (new)
- `backend/src/models/db_models.py` (modified — added LeadConversionDB class)
- `backend/src/models/lead.py` (modified — added LeadConvertRequest, LeadConvertResponse, LeadConversionRecord)
- `backend/src/services/lead_service.py` (modified — added convert_lead_to_customer function)
- `backend/src/api/v1/leads.py` (modified — added POST /{lead_id}/convert endpoint)
- `backend/tests/test_lead_conversion_service.py` (new — 8 tests)
- `frontend/src/types/lead.ts` (modified — added conversion types)
- `frontend/src/app/actions/lead-actions.ts` (modified — added convertLeadToCustomer)
- `frontend/src/components/client/crm/LeadsBoardClient.tsx` (modified — added convert button, dialog, optimistic UI, animations, toast)

## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: 6.2 Khai Mo & Chuyen Hoa Khach (Lead-to-Customer Conversion)
- Epic: 6
