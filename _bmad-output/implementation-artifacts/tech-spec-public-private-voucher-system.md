---
title: 'Public/Private Voucher System + Campaign Account Channel'
slug: 'public-private-voucher-system'
created: '2026-03-25'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 16 (App Router)', 'FastAPI', 'PostgreSQL 17', 'SQLAlchemy async', 'Zustand', 'TanStack Query', 'Zod', 'Pydantic v2', 'Tailwind CSS']
files_to_modify: ['backend/migrations/024_add_visibility_to_vouchers.sql', 'backend/src/models/db_models.py', 'backend/src/models/voucher.py', 'backend/src/models/campaign.py', 'backend/src/services/voucher_service.py', 'backend/src/services/campaign_service.py', 'backend/src/api/v1/vouchers.py', 'backend/tests/test_voucher_checkout.py', 'frontend/src/types/voucher.ts', 'frontend/src/types/cart.ts', 'frontend/src/store/cartStore.ts', 'frontend/src/components/client/checkout/VoucherSelector.tsx', 'frontend/src/components/client/checkout/OrderSummary.tsx', 'frontend/src/components/client/vouchers/VoucherForm.tsx', 'frontend/src/components/client/campaigns/CampaignForm.tsx', 'frontend/src/app/actions/voucher-actions.ts']
code_patterns: ['Service layer pattern', 'Async SQLAlchemy', 'Tenant isolation', 'Server Actions proxy', 'Zustand persist', 'Zod + Pydantic dual validation']
test_patterns: ['pytest async in-memory SQLite', 'Existing: test_voucher_checkout.py (14 tests)', 'Existing: test_voucher_crud_api.py (23 tests)']
---

# Tech-Spec: Public/Private Voucher System + Campaign Account Channel

**Created:** 2026-03-25

## Overview

### Problem Statement

The current voucher system treats all vouchers equally — no distinction between public discount codes (anyone can enter) and private vouchers (assigned to specific customers). Campaign broadcasting only supports email/sms/zalo channels, lacking a way to assign vouchers directly to customer accounts. Checkout rules (max 2, 1 per type) are too restrictive for private vouchers.

### Solution

- Add `visibility` field ('public' | 'private') to VoucherDB
- Refactor checkout rules: public max 1/order + 1 lifetime/account; private allows multiple unique codes per order
- Add "account" channel to campaigns for direct voucher assignment to customer accounts
- Update Owner UI: voucher form (visibility toggle), campaign form (voucher filter by visibility + account channel)

### Scope

**In Scope:**
- DB migration: add `visibility` column to `vouchers` table (default 'private')
- Backend voucher CRUD: add visibility to create/update/response schemas
- Backend checkout validation: refactor rules — public (max 1/order, 1 lifetime/account, auto-assign), private (multiple unique codes/order, each code max 1x/order, require pre-assignment)
- Backend discount calculation: support N vouchers, apply percent first then fixed sequentially
- Campaign: add "account" channel — assigns voucher to customer accounts without email
- Campaign form: show visibility label on vouchers, both public & private selectable
- Frontend Owner voucher form: add public/private toggle
- Frontend Checkout: code input (public) + assigned list (private), combine 1 public + N unique private

**Out of Scope:**
- SMS/Zalo channel implementation
- Custom segment by manual selection
- Changing email dispatch logic

## Context for Development

### Voucher Rules — FINAL

| Rule | Public Voucher | Private Voucher |
|------|---------------|-----------------|
| How obtained | Customer enters code at checkout | Assigned via campaign/owner |
| Auto-assign at checkout | Yes (code entry → auto-creates UserVoucherDB) | No (must be pre-assigned) |
| Limit per order | Max **1** public voucher | **Multiple unique codes**, each code max **1x** per order |
| Limit per account | Each public code usable **1 time lifetime** | Based on assignment count |
| Showroom preview | No | Yes (auto-preview from assigned) |
| Campaign usage | Selectable in campaigns (any channel) | Selectable in campaigns (any channel, assigns to accounts) |

### Files to Reference

| File | Purpose | What Changes |
| ---- | ------- | ------------ |
| `backend/src/models/db_models.py:570-609` | VoucherDB model | Add `visibility` column |
| `backend/src/models/voucher.py` | Pydantic schemas | Add visibility to Create/Update/Response + DiscountPreviewRequest |
| `backend/src/models/campaign.py:15-19` | ChannelType enum | Add 'account' value |
| `backend/src/services/voucher_service.py:353-441` | validate_voucher_for_checkout() | Visibility-based auto_assign + public lifetime check |
| `backend/src/services/voucher_service.py:463-523` | validate_and_calculate_multi_discount() | Remove max 2 limit, add public/private rules |
| `backend/src/services/campaign_service.py:583-757` | send_campaign() | Handle "account" channel |
| `backend/src/api/v1/vouchers.py` | Owner CRUD endpoints | Pass visibility through |
| `frontend/src/components/client/vouchers/VoucherForm.tsx` | Owner voucher form | Add visibility toggle |
| `frontend/src/components/client/campaigns/CampaignForm.tsx:258-285` | Campaign voucher picker | Show visibility label |
| `frontend/src/components/client/checkout/VoucherSelector.tsx` | Checkout voucher modal | Separate public/private sections |
| `frontend/src/store/cartStore.ts:76-101` | Cart voucher state | Refactor applyVoucher (remove type-based dedup) |
| `frontend/src/types/cart.ts` | CartAppliedVoucher | Add visibility field |
| `frontend/src/types/voucher.ts` | VoucherItem, OwnerVoucher | Add visibility field |

### Technical Decisions

- `visibility` VARCHAR(10) DEFAULT 'private' on vouchers table
- Remove old "max 2 vouchers, 1 per type" rule entirely
- New rules in `validate_and_calculate_multi_discount()`: count public (max 1), private unique codes (unlimited), each code once
- Public lifetime check: query UserVoucherDB WHERE is_used=True AND user_id=X AND voucher_id=Y
- Campaign "account" channel: create UserVoucherDB assignments, no email dispatch, mark recipients as 'sent'
- Discount application: sort percent first, fixed second, apply sequentially on remaining amount
- Backfill: existing vouchers → 'private'

## Implementation Plan

### Tasks

#### Task 1: DB Migration — add visibility to vouchers
- File: `backend/migrations/024_add_visibility_to_vouchers.sql`
- Action:
  ```sql
  ALTER TABLE vouchers ADD COLUMN visibility VARCHAR(10) NOT NULL DEFAULT 'private';
  CREATE INDEX idx_vouchers_visibility ON vouchers(tenant_id, visibility);
  ```
- Notes: Backfill not needed — DEFAULT handles existing rows.

#### Task 2: Update VoucherDB ORM model
- File: `backend/src/models/db_models.py`
- Action: Add to VoucherDB class (after `is_active`, before `created_at`):
  ```python
  visibility: Mapped[str] = mapped_column(String(10), nullable=False, default="private")
  ```

#### Task 3: Update Voucher Pydantic schemas
- File: `backend/src/models/voucher.py`
- Action:
  1. Add `VoucherVisibility` enum: `PUBLIC = "public"`, `PRIVATE = "private"`
  2. Add to `VoucherCreateRequest`: `visibility: VoucherVisibility = VoucherVisibility.PRIVATE`
  3. Add to `VoucherUpdateRequest`: `visibility: Optional[VoucherVisibility] = None`
  4. Add to `OwnerVoucherResponse`: `visibility: str`
  5. Add to `VoucherResponse` (customer): `visibility: str`

#### Task 4: Update voucher_service.py CRUD
- File: `backend/src/services/voucher_service.py`
- Action: In `create_voucher()`, pass `visibility=data.visibility.value` to VoucherDB constructor. In `update_voucher()`, handle visibility field update.

#### Task 5: Refactor validate_voucher_for_checkout()
- File: `backend/src/services/voucher_service.py`
- Action: Replace current auto_assign logic (lines ~405-426) with:
  ```python
  if not user_voucher:
      if voucher.visibility == "private":
          raise HTTPException(400, detail=f"Bạn chưa được gán voucher '{voucher.code}'")
      # Public voucher: check lifetime usage
      lifetime_check = await db.execute(
          select(UserVoucherDB).where(
              UserVoucherDB.user_id == user_id,
              UserVoucherDB.voucher_id == voucher.id,
              UserVoucherDB.is_used == True,
          )
      )
      if lifetime_check.scalar_one_or_none():
          raise HTTPException(400, detail=f"Bạn đã sử dụng voucher '{voucher.code}' trước đó")
      # Auto-assign public voucher
      user_voucher = UserVoucherDB(tenant_id=tenant_id, user_id=user_id, voucher_id=voucher.id)
      db.add(user_voucher)
      await db.flush()
  else:
      # Existing assignment — check if public voucher already used lifetime
      if voucher.visibility == "public" and user_voucher.is_used:
          raise HTTPException(400, detail=f"Bạn đã sử dụng voucher '{voucher.code}' trước đó")
  ```
- Notes: Remove `auto_assign` parameter (no longer needed — behavior determined by visibility).

#### Task 6: Refactor validate_and_calculate_multi_discount()
- File: `backend/src/services/voucher_service.py`
- Action: Replace current validation (lines ~481-507) with:
  ```python
  # Deduplicate codes
  unique_codes = list(dict.fromkeys(code.strip().upper() for code in voucher_codes))

  # Validate all vouchers
  validated = []
  for code in unique_codes:
      voucher, user_voucher = await validate_voucher_for_checkout(
          db, tenant_id, user_id, code, order_subtotal
      )
      validated.append((voucher, user_voucher))

  # Enforce rules: max 1 public per order
  public_count = sum(1 for v, _ in validated if v.visibility == "public")
  if public_count > 1:
      raise HTTPException(400, detail="Chỉ được sử dụng tối đa 1 voucher công khai (public) mỗi đơn hàng")

  # Sort: percent first, then fixed (for correct discount application)
  validated.sort(key=lambda x: (0 if x[0].type == "percent" else 1))

  # Calculate discounts sequentially
  results = []
  remaining = order_subtotal
  total_discount = Decimal("0")
  for voucher, user_voucher in validated:
      discount = calculate_single_discount(voucher, remaining)
      results.append((voucher, user_voucher, discount))
      remaining -= discount
      total_discount += discount

  return results, total_discount
  ```
- Notes: Remove `auto_assign` parameter. Remove max 2 limit. Remove type-uniqueness check.

#### Task 7: Add "account" channel to campaign
- File: `backend/src/models/campaign.py`
- Action: Add to ChannelType enum:
  ```python
  account = "account"  # Direct voucher assignment to customer accounts
  ```

#### Task 8: Update campaign_service.py send_campaign()
- File: `backend/src/services/campaign_service.py`
- Action: After segment resolution (line ~643), before email dispatch, add account channel handling:
  ```python
  if campaign.channel == "account":
      # Account channel: assign voucher directly, no email
      if not campaign.voucher_id:
          raise HTTPException(400, detail="Kênh 'Account' yêu cầu chọn voucher")

      sent = 0
      failed = 0
      now = datetime.now(timezone.utc)
      for r in recipients:
          rec = db_records.get(r["email"])
          if r.get("user_id") and campaign.voucher_id:
              try:
                  existing = await db.execute(
                      select(UserVoucherDB).where(
                          UserVoucherDB.user_id == r["user_id"],
                          UserVoucherDB.voucher_id == campaign.voucher_id,
                      )
                  )
                  if not existing.scalar_one_or_none():
                      db.add(UserVoucherDB(
                          tenant_id=campaign.tenant_id,
                          user_id=r["user_id"],
                          voucher_id=campaign.voucher_id,
                      ))
                  sent += 1
                  if rec:
                      rec.status = "sent"
                      rec.sent_at = now
              except Exception as e:
                  failed += 1
                  if rec:
                      rec.status = "failed"
                      rec.error_message = str(e)
          else:
              failed += 1
              if rec:
                  rec.status = "failed"
                  rec.error_message = "Recipient has no account"

      campaign.sent_count = sent
      campaign.failed_count = failed
      campaign.status = "sent" if sent > 0 else "failed"
      campaign.sent_at = now
      campaign.updated_at = now
      await db.flush()
      await db.commit()
      await db.refresh(campaign)
      return campaign
  ```
- Notes: Add this block BEFORE the existing email/sms/zalo channel logic. Return early for account channel.

#### Task 9: Update Owner voucher API to pass visibility
- File: `backend/src/api/v1/vouchers.py`
- Action: No code changes needed — visibility flows through VoucherCreateRequest → service → DB automatically. OwnerVoucherResponse already uses `from_attributes`.
- Notes: Verify list endpoint supports filtering by visibility if needed (add optional `visibility` query param).

#### Task 10: Update frontend voucher types
- File: `frontend/src/types/voucher.ts`
- Action: Add `visibility: 'public' | 'private'` to `VoucherItem`, `OwnerVoucher`, and `VoucherFormData` interfaces.
- File: `frontend/src/types/cart.ts`
- Action: Add `visibility: 'public' | 'private'` to `CartAppliedVoucher` interface.

#### Task 11: Update cartStore voucher rules
- File: `frontend/src/store/cartStore.ts`
- Action: Refactor `applyVoucher`:
  ```typescript
  applyVoucher: (voucher: CartAppliedVoucher) =>
    set((state) => {
      if (voucher.visibility === "public") {
        // Replace any existing public voucher (max 1 public)
        const filtered = state.appliedVouchers.filter(v => v.visibility !== "public");
        return { appliedVouchers: [...filtered, voucher] };
      } else {
        // Private: replace if same voucher_id exists (each code once)
        const filtered = state.appliedVouchers.filter(v => v.voucher_id !== voucher.voucher_id);
        return { appliedVouchers: [...filtered, voucher] };
      }
    }),
  ```

#### Task 12: Update VoucherSelector — separate public/private sections
- File: `frontend/src/components/client/checkout/VoucherSelector.tsx`
- Action:
  1. Keep manual code input at top (for public vouchers)
  2. Below input, add section header "Voucher của bạn" showing only PRIVATE assigned vouchers
  3. Filter `eligibleVouchers` to only show private vouchers from `getMyVouchers()`
  4. Add `visibility` to the `onApply` callback data
  5. When manual code applied successfully, pass `visibility: "public"` or response visibility
- Notes: Public vouchers don't appear in the list (entered via code only). Private vouchers appear in assigned list.

#### Task 13: Update VoucherForm — add visibility toggle
- File: `frontend/src/components/client/vouchers/VoucherForm.tsx`
- Action: Add toggle/radio after the voucher type selector:
  - Two buttons: "Voucher Riêng (Private)" / "Voucher Công Khai (Public)"
  - Default: Private
  - Help text: "Riêng: gán cho khách hàng cụ thể. Công khai: ai có mã đều dùng được."
  - Add to Zod schema: `visibility: z.enum(["public", "private"]).default("private")`
  - Add to form state and submit data

#### Task 14: Update CampaignForm — account channel + voucher visibility label
- File: `frontend/src/components/client/campaigns/CampaignForm.tsx`
- Action:
  1. Add "Account" to channel options: `{ value: "account", label: "Tài Khoản (Gán trực tiếp)" }`
  2. When channel="account", show info: "Voucher sẽ được gán trực tiếp vào tài khoản khách hàng"
  3. When channel="account", make voucher_id required
  4. In voucher picker dropdown, show visibility label: `{code} (Công khai)` or `{code} (Riêng tư)`

#### Task 15: Update customer voucher API response
- File: `backend/src/api/v1/customer_profile.py`
- Action: In `get_my_vouchers()`, add `"visibility": v.visibility` to the voucher dict in the response loop (~line 612-624).

#### Task 16: Update tests
- File: `backend/tests/test_voucher_checkout.py`
- Action:
  1. Update seed_data: add `visibility="public"` to some vouchers, `visibility="private"` to others
  2. Update `test_validate_voucher_auto_assign` → test with public voucher
  3. Update `test_validate_voucher_no_auto_assign_rejected` → test with private voucher (no assignment)
  4. Add `test_public_voucher_lifetime_limit` — public voucher used once, second attempt rejected
  5. Add `test_public_voucher_max_one_per_order` — 2 public vouchers in same order → 400
  6. Add `test_private_multiple_unique_per_order` — 3 different private vouchers in same order → success
  7. Add `test_private_same_code_twice_rejected` — same private code twice → deduplicated to 1
  8. Update `test_multi_voucher_different_types` → becomes `test_multi_voucher_public_plus_private`
  9. Remove `test_multi_voucher_same_type_rejected` (rule no longer exists)

### Acceptance Criteria

- [ ] AC 1: Given an Owner creating a voucher, when they select "Công Khai (Public)", then the voucher is saved with visibility='public'.
- [ ] AC 2: Given a customer at checkout entering a public voucher code, when the code is valid and not used by this account before, then the voucher is auto-assigned and discount applied.
- [ ] AC 3: Given a customer trying to use a public voucher they already used (is_used=True), when they enter the code again, then they get error "Bạn đã sử dụng voucher này trước đó".
- [ ] AC 4: Given a customer trying to apply 2 public vouchers in one order, when adding the second, then they get error "Chỉ được sử dụng tối đa 1 voucher công khai mỗi đơn hàng".
- [ ] AC 5: Given a customer with private vouchers (voucher50k, voucher20k, voucher10k), when they select all 3 at checkout, then all 3 discounts are applied.
- [ ] AC 6: Given a customer with 2x same private voucher (voucher50k), when they try to apply both in one order, then only 1 is applied (deduplicated).
- [ ] AC 7: Given a customer at checkout entering a private voucher code they were NOT assigned, when submitting, then they get error "Bạn chưa được gán voucher này".
- [ ] AC 8: Given a customer at checkout, when they apply 1 public + 3 private vouchers, then all 4 discounts are calculated correctly (percent first, then fixed sequentially).
- [ ] AC 9: Given an Owner creating a campaign with channel="Account" and a voucher selected, when the campaign is sent, then the voucher is assigned to all recipient accounts (UserVoucherDB created) without sending emails.
- [ ] AC 10: Given a campaign with channel="Account" and no voucher selected, when trying to send, then error "Kênh 'Account' yêu cầu chọn voucher".
- [ ] AC 11: Given the VoucherSelector at checkout, when opened by an authenticated user, then public vouchers are NOT shown in the list (only entered via code input), and private assigned vouchers ARE shown.
- [ ] AC 12: Given the Owner voucher list, when viewing vouchers, then each voucher shows a "Public" or "Private" badge.
- [ ] AC 13: Given a campaign form, when selecting channel "Account", then voucher selection becomes required and an info message is displayed.
- [ ] AC 14: Given a showroom page for authenticated user, when browsing products, then only private assigned vouchers are used for discount preview (no public voucher preview).

## Additional Context

### Dependencies

- Voucher checkout implementation (completed in this session)
- Campaign system (Story 6.4, fully functional)
- No new external libraries required

### Testing Strategy

**Backend Unit Tests** (`backend/tests/test_voucher_checkout.py`):
- Update existing 14 tests for visibility-aware logic
- Add 5+ new tests: public lifetime, public max 1/order, private multi-unique, public+private combo, campaign account channel
- Total expected: ~18-20 tests

**Manual Testing Checklist:**
- [ ] Create public voucher → verify visibility='public' in DB
- [ ] Create private voucher → verify visibility='private'
- [ ] Enter public code at checkout → auto-assign + discount
- [ ] Enter same public code again → "đã sử dụng" error
- [ ] Enter 2 public codes → "tối đa 1" error
- [ ] Select multiple private vouchers → all applied
- [ ] Enter private code (not assigned) → "chưa được gán" error
- [ ] Campaign with account channel + voucher → assigns to accounts
- [ ] Campaign with account channel without voucher → error
- [ ] Showroom preview → only shows private voucher discounts

### Notes

**High-Risk Items:**
- Refactoring `validate_and_calculate_multi_discount()` touches all checkout flows — thorough testing critical
- Campaign account channel is a new dispatch path — ensure it doesn't interfere with email dispatch
- Public voucher lifetime check needs efficient query (indexed on user_id + voucher_id)

**Known Limitations:**
- Public voucher lifetime is per-account — guest users cannot use public vouchers (requires login)
- Campaign account channel requires recipients to have user accounts (leads without accounts are skipped)

**Future Considerations:**
- Voucher visibility filter on Owner list page
- Analytics: public vs private redemption rates
- Rate limiting on public voucher code attempts
