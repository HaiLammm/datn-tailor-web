# Unified Story 6.4: Tuong Tac Broadcasting & Template SMS / SNS

Status: review

## Phase 1 — Requirements (Original)
> Khong co story Phase 1 tuong ung — story duoc tao moi trong Phase 2

## Phase 2 — Implementation
> Nguon: _bmad-output/implementation-artifacts/6-4-tuong-tac-broadcasting-template-sms-sns.md

# Story 6.4: Tuong Tac Broadcasting & Template SMS / SNS

Status: review

## Story

As a Van Hanh Marketing (Co Lan — Owner),
I want to compose bulk messages, broadcast via Email/Zalo OA/Facebook channels with embedded voucher codes using customizable templates,
So that I can run structured promotional campaigns to Hot/Warm customer segments on a monthly basis.

## Acceptance Criteria

1. **Campaign List View** — Owner sees a paginated table of all campaigns with columns: Name, Channel (Email/SMS/Zalo), Template, Segment, Status (Draft/Scheduled/Sent/Failed), Recipients Count, Open Rate, Click Rate, Sent Date, Actions.
2. **Create Campaign** — Owner fills a form with: campaign name, channel (email initially, SMS/Zalo stubs), message template (select or create inline), customer segment (All/Hot/Warm/Cold leads or All Customers), optional voucher_id to embed, scheduled_at (immediate or future). System validates and persists to `campaigns` table.
3. **Message Templates CRUD** — Owner can create, edit, delete reusable message templates. Templates support variable interpolation: `{{name}}`, `{{voucher_code}}`, `{{shop_name}}`, `{{expiry_date}}`. Templates have: name, subject (for email), body (rich text), channel type. Pre-built default templates seeded.
4. **Template Preview** — Owner can preview a template with sample data before sending. Preview renders all variables with example values.
5. **Send Campaign (Email Channel)** — System resolves the recipient list from segment, renders the template per-recipient with personalized variables, and dispatches via existing SMTP service. Each send is logged in `campaign_recipients` with status (sent/failed/opened/clicked).
6. **Campaign Analytics** — Dashboard shows per-campaign: total recipients, sent count, failed count, open rate (%), click rate (%), voucher redemptions linked to campaign. Summary shows: total campaigns, average open rate, total messages sent this month.
7. **Customer Segmentation** — System supports segments: "All Customers" (users with role=Customer), "Hot Leads" / "Warm Leads" / "Cold Leads" (from leads table by temperature), "Voucher Holders" (users with active voucher assignments). Custom segment by manual selection deferred to future.
8. **Channel Stubs** — SMS and Zalo OA channels have UI selection and backend model support but dispatch is stubbed with TODO comments and appropriate error messages ("Channel not configured"). Only Email channel is fully functional for MVP.
9. **Validation Rules** — Campaign name required and unique per tenant; template must exist; segment must resolve to > 0 recipients; voucher_id if provided must be active and unexpired; scheduled_at must be in the future if not immediate.

## Tasks / Subtasks

- [ ] Task 1: Database Migration (AC: #1, #2, #3, #5)
  - [ ] 1.1 Create migration `021_create_campaigns_tables.sql` with tables: `message_templates`, `campaigns`, `campaign_recipients`
  - [ ] 1.2 Add ORM models: `MessageTemplateDB`, `CampaignDB`, `CampaignRecipientDB` to `backend/src/models/db_models.py`

- [ ] Task 2: Backend Pydantic Schemas (AC: #1-#9)
  - [ ] 2.1 Create `backend/src/models/campaign.py` with request/response schemas for campaigns, templates, recipients, analytics, segments

- [ ] Task 3: Backend Template Service (AC: #3, #4)
  - [ ] 3.1 Create `backend/src/services/template_service.py` with CRUD for message templates, variable rendering, preview with sample data

- [ ] Task 4: Backend Campaign Service (AC: #1, #2, #5, #6, #7, #9)
  - [ ] 4.1 Create `backend/src/services/campaign_service.py` with: `list_campaigns()`, `get_campaign()`, `create_campaign()`, `update_campaign()`, `delete_campaign()`, `send_campaign()`, `get_campaign_analytics()`, `get_campaigns_summary()`, `resolve_segment()`
  - [ ] 4.2 Integrate with existing `email_service.py` for Email channel dispatch
  - [ ] 4.3 Log each recipient send to `campaign_recipients` table with status tracking

- [ ] Task 5: Backend API Endpoints (AC: #1-#9)
  - [ ] 5.1 Create `backend/src/api/v1/campaigns.py` router with Owner-only CRUD + send + analytics endpoints
  - [ ] 5.2 Create `backend/src/api/v1/templates.py` router with Owner-only CRUD + preview endpoints
  - [ ] 5.3 Register both routers in `backend/src/main.py`

- [ ] Task 6: Backend Tests (AC: #1-#9)
  - [ ] 6.1 Create `backend/tests/test_campaign_service.py` covering campaign CRUD, send, analytics, segment resolution, validation
  - [ ] 6.2 Create `backend/tests/test_template_service.py` covering template CRUD, variable rendering, preview

- [ ] Task 7: Frontend Types & Actions (AC: #1-#8)
  - [ ] 7.1 Create `frontend/src/types/campaign.ts` with TypeScript interfaces for campaigns, templates, recipients, analytics, segments
  - [ ] 7.2 Create `frontend/src/app/actions/campaign-actions.ts` with Server Actions for all campaign and template operations

- [ ] Task 8: Frontend Campaign List Page (AC: #1, #6)
  - [ ] 8.1 Create `frontend/src/app/(workplace)/owner/campaigns/page.tsx` (Server Component with auth guard)
  - [ ] 8.2 Create `frontend/src/components/client/campaigns/CampaignManagementClient.tsx` with table, search, filter by status, pagination, summary stats

- [ ] Task 9: Frontend Create/Edit Campaign (AC: #2, #7, #8, #9)
  - [ ] 9.1 Create `frontend/src/app/(workplace)/owner/campaigns/new/page.tsx`
  - [ ] 9.2 Create `frontend/src/app/(workplace)/owner/campaigns/[id]/edit/page.tsx`
  - [ ] 9.3 Create `frontend/src/components/client/campaigns/CampaignForm.tsx` (shared create/edit form with Zod validation, segment selector, channel selector, template picker, voucher picker)

- [ ] Task 10: Frontend Template Manager (AC: #3, #4)
  - [ ] 10.1 Create `frontend/src/app/(workplace)/owner/campaigns/templates/page.tsx`
  - [ ] 10.2 Create `frontend/src/components/client/campaigns/TemplateManagerClient.tsx` (list + inline create/edit with variable insertion toolbar)
  - [ ] 10.3 Create `frontend/src/components/client/campaigns/TemplatePreview.tsx` (render preview with sample data)

- [ ] Task 11: Frontend Campaign Analytics Detail (AC: #6)
  - [ ] 11.1 Create `frontend/src/app/(workplace)/owner/campaigns/[id]/page.tsx` (campaign detail with analytics charts)
  - [ ] 11.2 Create `frontend/src/components/client/campaigns/CampaignAnalyticsClient.tsx` (recipient table + stats cards)

- [ ] Task 12: Sidebar Navigation (AC: all)
  - [ ] 12.1 Add "Chien dich" menu item to `WorkplaceSidebar.tsx` under CRM section (after Vouchers)

## Dev Notes

### Existing Infrastructure — DO NOT Recreate

| Component | Location | What Exists |
|-----------|----------|-------------|
| Email service | `backend/src/services/email_service.py` | Async SMTP sending via aiosmtplib, Heritage-branded HTML templates |
| Notification creator | `backend/src/services/notification_creator.py` | Helper to persist in-app notifications to DB |
| Notification DB model | `backend/src/models/db_models.py:530-557` | NotificationDB ORM with type, title, message, data JSON |
| Notifications table | `backend/migrations/016_create_notifications_table.sql` | In-app notifications schema |
| SMTP config | `backend/src/core/config.py:30-36` | SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, FROM_EMAIL |
| Vouchers table | `backend/src/models/db_models.py:560-598` | VoucherDB with code, type, value, expiry, is_active, used_count |
| User vouchers | `backend/src/models/db_models.py:602-634` | UserVoucherDB many-to-many assignment |
| Leads table | `backend/src/models/db_models.py:637+` | LeadDB with temperature (hot/warm/cold) |
| Voucher service | `backend/src/services/voucher_service.py` | Owner CRUD operations for vouchers |
| Lead service | `backend/src/services/lead_service.py` | Lead management with temperature classification |
| CRM frontend | `frontend/src/components/client/crm/LeadsBoardClient.tsx` | Kanban board for leads |
| Voucher frontend | `frontend/src/components/client/vouchers/` | VoucherManagementClient, VoucherForm |

### Database Schema — NEW Tables Required

Migration `021_create_campaigns_tables.sql`:

```sql
-- Message templates (reusable across campaigns)
CREATE TABLE message_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',  -- 'email' | 'sms' | 'zalo'
    subject VARCHAR(255),                           -- email subject line (null for SMS/Zalo)
    body TEXT NOT NULL,                              -- template body with {{variable}} placeholders
    is_default BOOLEAN NOT NULL DEFAULT FALSE,       -- pre-built templates
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);
CREATE INDEX idx_message_templates_tenant ON message_templates(tenant_id);

-- Campaigns (outreach broadcasts)
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    channel VARCHAR(20) NOT NULL DEFAULT 'email',    -- 'email' | 'sms' | 'zalo'
    template_id UUID NOT NULL REFERENCES message_templates(id),
    segment VARCHAR(50) NOT NULL,                    -- 'all_customers' | 'hot_leads' | 'warm_leads' | 'cold_leads' | 'voucher_holders'
    voucher_id UUID REFERENCES vouchers(id),         -- optional embedded voucher
    status VARCHAR(20) NOT NULL DEFAULT 'draft',     -- 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed'
    scheduled_at TIMESTAMPTZ,                        -- null = immediate
    sent_at TIMESTAMPTZ,
    total_recipients INTEGER NOT NULL DEFAULT 0,
    sent_count INTEGER NOT NULL DEFAULT 0,
    failed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(tenant_id, name)
);
CREATE INDEX idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX idx_campaigns_status ON campaigns(tenant_id, status);

-- Campaign recipients (per-recipient send log)
CREATE TABLE campaign_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- 'pending' | 'sent' | 'failed' | 'opened' | 'clicked'
    sent_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_user ON campaign_recipients(user_id);
```

### Backend Patterns (MUST follow)

- **Service layer pattern:** ALL business logic in service files, NOT in route handlers. Follow `voucher_service.py` pattern exactly.
- **Async SQLAlchemy:** Use `async_session` from `backend/src/db.py`, all queries use `await session.execute(select(...))`.
- **Tenant isolation:** EVERY query MUST filter by `tenant_id` from JWT token. No cross-tenant data leaks.
- **Auth dependency:** Use `get_current_owner` dependency for Owner-only endpoints (same as `backend/src/api/v1/vouchers.py`).
- **Response format:** `{"data": {...}}` for single, `{"data": [...], "meta": {"total": N, "page": P, "page_size": S}}` for lists.
- **Error codes:** 400 (validation), 404 (not found), 409 (duplicate name), 403 (wrong tenant).
- **DB commit:** After `db.flush()` MUST call `await db.commit()` to persist data. No commit = rollback.

### Email Dispatch Pattern — Reuse Existing

The campaign email dispatch MUST reuse `email_service.py` patterns:
1. Create a new function `create_campaign_email_html(template_body, variables)` in `email_service.py` that renders a Heritage-branded HTML email from template body + interpolated variables.
2. Create `send_campaign_email(to_email, subject, html_content)` that uses existing `aiosmtplib` SMTP config.
3. Campaign service iterates recipients, renders template per-recipient, calls send, logs status to `campaign_recipients`.
4. Use `asyncio.gather()` with concurrency limit (e.g., 5 at a time) to avoid SMTP rate limits.
5. If send fails for a recipient, log error and continue — do NOT abort entire campaign.

### Template Variable Rendering

Supported variables (resolve at send time):
| Variable | Source | Description |
|----------|--------|-------------|
| `{{name}}` | User's `full_name` | Recipient's full name |
| `{{email}}` | User's `email` | Recipient's email |
| `{{voucher_code}}` | Voucher's `code` | Embedded voucher code (if campaign has voucher_id) |
| `{{voucher_value}}` | Voucher's `value` + `type` | e.g., "20%" or "100,000 VND" |
| `{{expiry_date}}` | Voucher's `expiry_date` | Formatted as dd/mm/yyyy |
| `{{shop_name}}` | Tenant's `name` or config | Shop name |

Rendering: Simple `str.replace()` for each variable. If variable not available (e.g., no voucher), replace with empty string.

### Frontend Patterns (MUST follow)

- **CRUD page structure:** Follow `/owner/vouchers/` pattern exactly:
  - `page.tsx` = Server Component with auth guard + SSR data fetch
  - `new/page.tsx` = Create page
  - `[id]/edit/page.tsx` = Edit page
  - Shared `CampaignForm.tsx` component for create/edit
- **Client components** go in `frontend/src/components/client/campaigns/`
- **Server Actions** proxy to backend via `fetchWithAuth()` from `frontend/src/lib/api.ts`
- **Form validation:** Zod schema on client side, backend validates independently
- **State management:** TanStack Query for server state, `useRouter()` for navigation
- **Toast notifications:** Use existing toast system — Vietnamese messages for success/error
- **Styling:** Tailwind CSS, `bg-[#F9F7F2]` cream background, `font-serif` for titles, Radix UI primitives
- **Responsive:** Desktop-first grid, collapse to single column on mobile
- **Framer Motion:** Use `AnimatePresence` for list transitions (consistent with existing patterns)

### API Endpoints to Create

**Campaign Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/campaigns` | List campaigns (paginated, filterable by status) |
| GET | `/api/v1/campaigns/summary` | Campaigns summary stats |
| GET | `/api/v1/campaigns/{id}` | Get campaign detail with analytics |
| POST | `/api/v1/campaigns` | Create new campaign |
| PUT | `/api/v1/campaigns/{id}` | Update draft campaign |
| DELETE | `/api/v1/campaigns/{id}` | Delete campaign (only if draft/failed) |
| POST | `/api/v1/campaigns/{id}/send` | Trigger campaign send |
| GET | `/api/v1/campaigns/{id}/recipients` | List recipients with delivery status |
| GET | `/api/v1/campaigns/segments` | List available segments with recipient counts |

**Template Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/templates` | List message templates |
| GET | `/api/v1/templates/{id}` | Get single template |
| POST | `/api/v1/templates` | Create new template |
| PUT | `/api/v1/templates/{id}` | Update template |
| DELETE | `/api/v1/templates/{id}` | Delete template (only if not used in active campaign) |
| POST | `/api/v1/templates/{id}/preview` | Preview template with sample data |

### Pydantic Schemas to Create (`backend/src/models/campaign.py`)

```python
class ChannelType(str, Enum):
    email = "email"
    sms = "sms"
    zalo = "zalo"

class CampaignStatus(str, Enum):
    draft = "draft"
    scheduled = "scheduled"
    sending = "sending"
    sent = "sent"
    failed = "failed"

class RecipientStatus(str, Enum):
    pending = "pending"
    sent = "sent"
    failed = "failed"
    opened = "opened"
    clicked = "clicked"

class SegmentType(str, Enum):
    all_customers = "all_customers"
    hot_leads = "hot_leads"
    warm_leads = "warm_leads"
    cold_leads = "cold_leads"
    voucher_holders = "voucher_holders"

class TemplateCreateRequest(BaseModel):
    name: str                           # max 100 chars
    channel: ChannelType = ChannelType.email
    subject: Optional[str] = None       # required for email
    body: str                           # template body with {{variables}}

class TemplateResponse(BaseModel):
    id: UUID
    name: str
    channel: ChannelType
    subject: Optional[str]
    body: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

class CampaignCreateRequest(BaseModel):
    name: str                           # max 200 chars
    channel: ChannelType = ChannelType.email
    template_id: UUID
    segment: SegmentType
    voucher_id: Optional[UUID] = None
    scheduled_at: Optional[datetime] = None  # null = immediate on send

class CampaignResponse(BaseModel):
    id: UUID
    name: str
    channel: ChannelType
    template_id: UUID
    template_name: str                  # joined from template
    segment: SegmentType
    voucher_id: Optional[UUID]
    voucher_code: Optional[str]         # joined from voucher
    status: CampaignStatus
    scheduled_at: Optional[datetime]
    sent_at: Optional[datetime]
    total_recipients: int
    sent_count: int
    failed_count: int
    created_at: datetime
    updated_at: datetime

class CampaignAnalytics(BaseModel):
    total_recipients: int
    sent_count: int
    failed_count: int
    opened_count: int
    clicked_count: int
    open_rate: float                    # opened / sent * 100
    click_rate: float                   # clicked / sent * 100
    voucher_redemptions: int            # if campaign has voucher

class CampaignsSummary(BaseModel):
    total_campaigns: int
    sent_campaigns: int
    avg_open_rate: float
    total_messages_this_month: int

class SegmentInfo(BaseModel):
    segment: SegmentType
    label: str                          # Vietnamese label
    recipient_count: int
```

### TypeScript Types to Create (`frontend/src/types/campaign.ts`)

```typescript
export type ChannelType = "email" | "sms" | "zalo";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "failed";
export type RecipientStatus = "pending" | "sent" | "failed" | "opened" | "clicked";
export type SegmentType = "all_customers" | "hot_leads" | "warm_leads" | "cold_leads" | "voucher_holders";

export interface MessageTemplate {
  id: string;
  name: string;
  channel: ChannelType;
  subject: string | null;
  body: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  channel: ChannelType;
  template_id: string;
  template_name: string;
  segment: SegmentType;
  voucher_id: string | null;
  voucher_code: string | null;
  status: CampaignStatus;
  scheduled_at: string | null;
  sent_at: string | null;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
}

export interface CampaignAnalytics {
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  clicked_count: number;
  open_rate: number;
  click_rate: number;
  voucher_redemptions: number;
}

export interface CampaignsSummary {
  total_campaigns: number;
  sent_campaigns: number;
  avg_open_rate: number;
  total_messages_this_month: number;
}

export interface SegmentInfo {
  segment: SegmentType;
  label: string;
  recipient_count: number;
}

export interface CampaignFormData {
  name: string;
  channel: ChannelType;
  template_id: string;
  segment: SegmentType;
  voucher_id: string | null;
  scheduled_at: string | null;
}

export interface TemplateFormData {
  name: string;
  channel: ChannelType;
  subject: string;
  body: string;
}
```

### Segment Resolution Logic

```python
async def resolve_segment(segment: SegmentType, tenant_id: UUID, session) -> list[dict]:
    """Resolve segment to list of {user_id, full_name, email}."""
    if segment == "all_customers":
        # Query users WHERE role='Customer' AND tenant_id=tenant_id
        pass
    elif segment in ("hot_leads", "warm_leads", "cold_leads"):
        # Query leads WHERE temperature=segment.split('_')[0] AND tenant_id=tenant_id
        # Leads have email + name but may NOT have user_id (unconverted leads)
        pass
    elif segment == "voucher_holders":
        # Query user_vouchers JOIN users WHERE voucher.is_active=True AND tenant_id=tenant_id
        pass
    return recipients
```

Important: Leads that are NOT yet converted to customers may only have email (no user_id). The campaign_recipients table uses `user_id` as nullable OR add `email` column directly. For leads without accounts, store their email directly in `campaign_recipients.email`.

### Channel Stub Pattern

For SMS and Zalo channels, implement dispatch stub:
```python
async def _dispatch_sms(recipient_email: str, body: str) -> bool:
    """SMS dispatch — NOT YET IMPLEMENTED."""
    logger.warning("SMS channel not configured. Message not sent to %s", recipient_email)
    raise NotImplementedError("SMS channel integration pending — configure Twilio/AWS SNS credentials")

async def _dispatch_zalo(recipient_email: str, body: str) -> bool:
    """Zalo OA dispatch — NOT YET IMPLEMENTED."""
    logger.warning("Zalo OA channel not configured. Message not sent to %s", recipient_email)
    raise NotImplementedError("Zalo OA channel integration pending — configure Zalo OA API credentials")
```

On frontend, show info banner when SMS/Zalo selected: "Kênh nay chua duoc cau hinh. Chi ho tro Email tai thoi diem nay."

### Pre-Built Default Templates (Seed Data)

Include in migration or service init:
1. **"Khuyen mai thang"** — Monthly promotion with voucher: "Chao {{name}}, [Shop] gui ban ma giam gia {{voucher_code}} — giam {{voucher_value}}. Han su dung: {{expiry_date}}."
2. **"Chao mung khach moi"** — Welcome new customer: "Chao mung {{name}} den voi {{shop_name}}! Cam on ban da tin tuong chon chung toi."
3. **"Nhac hen"** — Appointment reminder: "{{name}} oi, ban co lich hen tai {{shop_name}} vao ngay mai. Hen gap ban!"

### Project Structure Notes

- All new files follow established naming conventions (`snake_case` backend, `PascalCase` frontend components)
- Route path: `/owner/campaigns` (consistent with `/owner/vouchers`, `/owner/crm`)
- Template management is a sub-route: `/owner/campaigns/templates`
- Sidebar icon: Use Megaphone SVG icon (matches broadcast/campaign concept)
- Campaign menu item placed after Vouchers in sidebar CRM section
- New migration: `021_create_campaigns_tables.sql` (next after 020)

### Previous Story Intelligence (6.3: Voucher Creator UI)

- **Full-stack CRUD confirmed working:** Backend service + API + Frontend pages + Server Actions + Tests
- **Proxy Pattern:** All API calls flow through Next.js Server Actions -> backend, no direct browser-to-backend calls
- **Zod validation:** Client-side form validation with Zod, backend validates independently with Pydantic
- **Custom dialogs:** Use custom dialog implementation (not Radix AlertDialog), consistent with existing patterns
- **Framer Motion:** Use AnimatePresence for delete/toggle animations
- **Pre-existing test failures:** rental_service, staff_service, sanity_check_api, internal_order_service — ignore these, not related
- **Toast pattern:** Success toast with Vietnamese messages, error toast with error detail
- **23 backend tests** passing for voucher CRUD — similar coverage expected for campaigns

### Git Intelligence

Recent commits show consistent patterns:
- Feature commits: `feat(epic): description`
- File structure: services -> API routes -> frontend components -> tests
- All stories implement full-stack: backend service + API + frontend + tests
- Latest commit `4048b1e` (Story 6.3) modified: service, API route, models, frontend pages, components, actions, types, sidebar, tests

### Critical Anti-Patterns to Avoid

1. **DO NOT create a separate notification for each campaign send** — campaigns have their own `campaign_recipients` tracking, separate from the `notifications` table (which is for in-app user notifications).
2. **DO NOT hardcode email HTML in campaign service** — use `email_service.py` to create Heritage-branded HTML wrapper, pass template-rendered body as content.
3. **DO NOT make browser-to-backend API calls** — ALL calls go through Server Actions via `fetchWithAuth()`.
4. **DO NOT create middleware.ts** — use `proxy.ts` pattern per project rules.
5. **DO NOT store SMTP credentials in code** — use existing `settings` from `backend/src/core/config.py`.
6. **DO NOT block on send failures** — log error per-recipient and continue sending to remaining recipients.
7. **DO NOT duplicate email template rendering** — reuse Heritage branding patterns from existing `email_service.py` templates.

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 6, Story 6.4, lines 592-603]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md — FR78, FR79, FR80, FR81]
- [Source: _bmad-output/planning-artifacts/prd/product-scope.md — CRM & Marketing scope]
- [Source: _bmad-output/planning-artifacts/prd/technical-project-type-requirements.md — CRM Schema: Campaigns, CustomerSegments]
- [Source: _bmad-output/planning-artifacts/architecture.md — API Patterns, Auth, Email/SMS integrations]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — Journey 5: CRM & Marketing flow]
- [Source: _bmad-output/implementation-artifacts/6-3-voucher-creator-ui.md — Previous story patterns & learnings]
- [Source: backend/src/services/email_service.py — Existing SMTP service with Heritage branding]
- [Source: backend/src/services/notification_creator.py — Notification persistence helper]
- [Source: backend/src/models/db_models.py:530-634 — NotificationDB, VoucherDB, UserVoucherDB models]
- [Source: backend/src/core/config.py — SMTP configuration settings]
- [Source: backend/migrations/ — 001-020 existing migrations]
- [Source: frontend/src/components/client/workplace/WorkplaceSidebar.tsx — Sidebar navigation (CRM + Vouchers entries)]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List

## Traceability
- Phase 1 Story: N/A
- Phase 2 Story: 6.4 Tuong Tac Broadcasting & Template SMS / SNS
- Epic: 6
