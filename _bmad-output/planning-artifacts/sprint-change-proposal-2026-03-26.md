# Sprint Change Proposal — Unified Order Workflow (5-Phase)

**Date:** 2026-03-26
**Triggered by:** Stakeholder requirement — comprehensive order workflow for 3 service types
**Scope Classification:** Moderate
**Status:** Pending Approval

---

## Section 1: Issue Summary

The current system processes orders through a flat pipeline without distinguishing between service types (Buy, Rent, Bespoke). A comprehensive 5-phase workflow is required:

1. **Measurement Verification** (Bespoke only) — Gate check before order creation
2. **Service-Type Order Creation** — Differentiated payment (Full / Deposit / Deposit+Security)
3. **Owner Approval & Routing** — Manual confirmation before production/preparation
4. **Production & Preparation** — Service-specific sub-steps
5. **Handover & Completion** — Remaining payment, delivery, rental return & security refund

**Evidence:** Current checkout (Story 3.3) treats all orders identically. Order status pipeline (FR47) lacks approval step, preparation states, and rental lifecycle states. Payment model (FR51/52) only supports single-payment transactions.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Status | Impact Level | Details |
|------|--------|-------------|---------|
| Epic 3 (E-commerce & Booking) | done | High | Checkout needs measurement gate, service-type payment, rental security form |
| Epic 4 (Order & Payment) | done | High | New statuses, approve step, remaining payment, security deposit refund |
| Epic 5 (Operations & Tailor) | done | Medium | Expand sub-steps for Rent/Buy preparation types |
| Epic 1 (Auth & Profiles) | done | Low | Measurement data linkage to checkout (data exists, needs connection) |
| Epic 6 (CRM & Marketing) | in-progress | None | Independent — Voucher/Campaign unaffected |
| Epic 7-9 (AI Core) | done | None | Independent |

### New Epic Required

**Epic 10: Quy trinh Don hang Toan dien (Unified Order Workflow)**

Hệ thống hỗ trợ quy trinh xu ly don hang 5 giai doan, phan biet ro 3 loai dich vu (Mua san / Thue / Dat may), bao gom: xac thuc so do cho dat may, thanh toan nhieu hinh thuc (Full / Deposit / Security Deposit), phe duyet Owner, sub-steps san xuat theo loai dich vu, va luong ban giao hoan chinh.

### Artifact Conflicts

**PRD:** 9 new FRs required (FR82-FR90)
**Architecture:** Order status pipeline expansion, payment model redesign, 4 new API endpoints, checkout route update
**UX Design:** 4 new screens/flows (measurement gate, service-type checkout, approve action, remaining payment)
**Database:** Migration for orders table expansion + new payment_transactions table

---

## Section 3: Recommended Approach

**Selected: Direct Adjustment — Add Epic 10**

### Rationale

- System already has ~80% foundation (order management, payment gateway, booking, production sub-steps, measurement profiles)
- Changes are **additive**, not destructive — no existing code needs to be reverted
- Established code patterns (Authoritative Server, Server Actions, TanStack Query) are reused
- Epic 10 is independent, easy to track, does not affect Epic 6 in-progress

### Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| DB migration on live orders table | Medium | Use ALTER with DEFAULT values, test migration on staging first |
| Checkout flow complexity increase | Medium | Thorough E2E testing for all 3 service flows |
| Backward compatibility with existing orders | Low | Existing orders default to `service_type=buy`, `full` payment — no behavior change |

### Effort Estimate

- **Stories:** 7
- **Estimated complexity:** Medium (leverages existing patterns heavily)
- **Sequence:** After Epic 6 completion (6.3 and 6.4 currently in review)

---

## Section 4: Detailed Change Proposals

### 4.1 PRD Changes — New Functional Requirements

**FR82:** When a customer selects "Bespoke Order" (Dat may), the system checks their measurement profile. If no measurements exist, the customer is redirected to the Booking page. If measurements exist, the system displays the existing data with last-updated timestamp for confirmation or re-measurement request.

**FR83:** The system supports 3 payment modes by service type: Buy (100% upfront), Rent (Deposit + CCCD or Security Deposit), Bespoke (Deposit only).

**FR84:** Rental orders require recording either CCCD (citizen ID) or a cash security deposit, plus pickup/return dates at checkout time.

**FR85:** Owner must approve orders before they enter production/preparation. Order transitions from `pending` to `confirmed` upon Owner approval.

**FR86:** Upon Owner confirmation, the system automatically creates a TailorTask (with attached measurement data) for bespoke orders, or routes to warehouse preparation for rent/buy orders.

**FR87:** Preparation sub-steps are differentiated by service type: Rent (Cleaning → Altering → Ready), Buy (QC → Packaging).

**FR88:** Orders display `ready_to_ship` or `ready_for_pickup` status when preparation is complete.

**FR89:** Customers pay the remaining balance (order total minus deposit) before receiving the product.

**FR90:** For rental orders, the system returns the security deposit (cash) or CCCD to the customer after the returned product passes condition inspection.

### 4.2 Architecture Changes

#### Order Status Pipeline Expansion

```
# BUY (Mua san):
pending → confirmed → preparing → ready_to_ship/ready_for_pickup → shipped → delivered → completed

# RENT (Thue):
pending → confirmed → preparing → ready_to_ship/ready_for_pickup → shipped → delivered → renting → returned → completed

# BESPOKE (Dat may):
pending_measurement → pending → confirmed → in_production → ready_to_ship/ready_for_pickup → shipped → delivered → completed
```

#### Payment Model Expansion

New table `payment_transactions`:
- `id`, `order_id`, `payment_type` (full/deposit/remaining/security_deposit), `amount`, `method`, `status`, `gateway_ref`, `created_at`

New fields on `orders`:
- `service_type` ENUM (buy, rent, bespoke)
- `security_type` ENUM (cccd, cash_deposit) — nullable, rent only
- `security_value` VARCHAR — nullable (CCCD number or deposit amount)
- `pickup_date`, `return_date` — nullable, rent only
- `deposit_amount`, `remaining_amount` — nullable

#### New API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/orders/check-measurement` | Check if customer has valid measurements before bespoke order |
| POST | `/api/v1/orders/{id}/approve` | Owner approves pending order → confirmed |
| POST | `/api/v1/orders/{id}/pay-remaining` | Process remaining balance payment |
| POST | `/api/v1/orders/{id}/refund-security` | Refund security deposit or return CCCD |

### 4.3 UX Changes

#### Measurement Gate (Bespoke only — before checkout)

- **No measurements:** Info card with CTA "Dat lich hen do so do" → redirect to Booking Calendar (existing Story 3.4)
- **Has measurements:** Card showing measurement summary + last updated date + two CTAs: "Xac nhan so do nay" / "Yeu cau do lai"

#### Checkout Service-Type Differentiation

- **Buy:** Standard checkout (existing flow) — full payment
- **Rent:** Additional fields: CCCD or security deposit toggle, pickup date, return date. Payment = deposit only
- **Bespoke:** Payment = deposit only. Measurement confirmation badge displayed

#### Owner Approve Flow (Order Board)

- New "Phe duyet" button on pending orders (prominent, Heritage Gold accent)
- Order type badges: Buy (green), Rent (amber), Bespoke (indigo)
- Post-approve toast showing routing destination (Tho may / Kho)

#### Remaining Payment & Handover

- Customer receives notification when order is `ready`
- Payment screen for remaining balance in Customer Profile → Orders
- Rental return tracking with security refund status

### 4.4 Database Migration

```sql
-- Migration: 019_unified_order_workflow.sql

-- 1. Add service_type to orders
ALTER TABLE orders ADD COLUMN service_type VARCHAR(10) NOT NULL DEFAULT 'buy';
ALTER TABLE orders ADD COLUMN security_type VARCHAR(15);
ALTER TABLE orders ADD COLUMN security_value VARCHAR(50);
ALTER TABLE orders ADD COLUMN pickup_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN return_date TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN deposit_amount NUMERIC(12,2);
ALTER TABLE orders ADD COLUMN remaining_amount NUMERIC(12,2);

-- 2. Create payment_transactions table
CREATE TABLE payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    order_id UUID NOT NULL REFERENCES orders(id),
    payment_type VARCHAR(20) NOT NULL, -- full, deposit, remaining, security_deposit
    amount NUMERIC(12,2) NOT NULL,
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    gateway_ref VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_transactions_order ON payment_transactions(order_id);
CREATE INDEX idx_payment_transactions_tenant ON payment_transactions(tenant_id);
```

---

## Section 5: Implementation Handoff

### Story Breakdown — Epic 10

| Story | Name | Description | Depends On |
|-------|------|-------------|------------|
| 10.1 | DB Migration & Service Type Model | Expand Order model: `service_type`, new status enum values, `payment_transactions` table, deposit/security fields | First |
| 10.2 | Measurement Gate for Bespoke | API check measurement + Frontend screen: no data → redirect booking, has data → confirm/request re-measure | 10.1 |
| 10.3 | Service-Type Checkout | Differentiated checkout: Buy (100%), Rent (Deposit + CCCD/Security + dates), Bespoke (Deposit) | 10.1, 10.2 |
| 10.4 | Owner Approve & Auto-routing | Owner approves pending → confirmed. Auto-create TailorTask (bespoke) or route to warehouse (rent/buy) | 10.1 |
| 10.5 | Preparation Sub-steps for Rent & Buy | Expand production tracking: Rent (Cleaning→Altering→Ready), Buy (QC→Packaging). Status ready_to_ship/ready_for_pickup | 10.4 |
| 10.6 | Remaining Payment & Handover | Pay remaining balance, status transitions shipped→delivered→completed | 10.5 |
| 10.7 | Rental Return & Security Refund | Return flow: condition check → refund security deposit/CCCD. Status renting→returned→completed | 10.6 |

### Handoff Recipients

| Role | Agent | Responsibility |
|------|-------|---------------|
| PM | John (📋) | Update PRD with FR82-FR90 |
| Architect | Winston (🏗️) | Update Architecture doc (status pipeline, payment model, API endpoints) |
| Scrum Master | Bob (🏃) | Create story files for Epic 10, update sprint-status.yaml |
| Developer | Amelia (💻) | Implement 7 stories in sequence |
| QA | Quinn (🧪) | E2E tests for all 3 service type flows |

### Success Criteria

- [ ] All 3 service types (Buy/Rent/Bespoke) complete their full lifecycle without errors
- [ ] Existing orders (pre-migration) continue to function as `service_type=buy`
- [ ] Measurement gate correctly blocks bespoke checkout when no measurements exist
- [ ] Owner can approve/reject orders before production starts
- [ ] Deposit + remaining payment flow works end-to-end with payment gateway
- [ ] Rental security (CCCD or cash deposit) is tracked and refunded correctly
- [ ] Sub-steps display correctly per service type on Production Board

---

## Approval

- [x] Stakeholder approval received — 2026-03-26 (Lem)
- [x] Handoff responsibilities confirmed
- [x] Timeline agreed upon — After Epic 6 completion
