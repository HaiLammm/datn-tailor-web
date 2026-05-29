---
date: '2026-05-01'
trigger: 'Requirement misunderstanding — database designed for state snapshots instead of business event tracking'
scope: 'Major'
status: 'approved'
affected_epics: [2, 3, 4, 5, 7, 8, 9, 10, 11]
new_epic: 15
affected_artifacts:
  - prd/functional-requirements.md
  - architecture.md
  - ux-design-specification.md
  - epics.md
approved_proposals: 6
---

# Sprint Change Proposal — Status Transition & Business Event Tracking

**Date:** 2026-05-01
**Triggered by:** Requirement misunderstanding — fundamental design flaw
**Scope Classification:** Major
**Author:** Lem (with Scrum Master facilitation)

---

## Section 1: Issue Summary

### Problem Statement

The current database architecture stores only the current status of entities (orders, tailor tasks, garments, appointments, etc.) via a single `status` column that gets overwritten on each state change. This "snapshot" approach treats business reality as a static photograph when it is actually a continuous video — a flow of events.

### Core Design Flaw

**"Doanh nghiệp không hỏi về trạng thái hiện tại — họ luôn hỏi về sự kiện, sự chuyển động."**

Every status change is a business event that the enterprise cares about. The current status is merely the result of the most recent transition. By only storing the final state, the system loses the entire history of events that preceded it.

### Evidence

12 entities with status fields were audited. Only a few have partial event tracking (payment_transactions for webhook audit, rental_returns for condition logging). None have comprehensive status transition history.

**Critical entities without transition tracking:**

| Entity | Status Fields | Business Questions Lost |
|:---|:---|:---|
| Orders | status (14 values), payment_status, preparation_step | "Was this cancelled order previously paid?" "How long was it pending?" "Who approved?" |
| Tailor Tasks | status (4), production_step (6) | "How long per production step?" "SLA compliance?" |
| Order Payments | status (4) | "How many payment attempts?" "Which timed out?" |
| Garments | status (3) | "How long in maintenance?" "Rental frequency?" |
| Appointments | status (3) | "Who cancelled? When?" |
| Leads | classification (3) | "Days from cold to hot?" |

### Business Impact by Department

**Accounting (Kế toán):** Cannot reconcile bank statements. When an order shows "cancelled", there is no trace whether it was previously "paid" — making refund processing and cash flow reconciliation impossible. Cannot distinguish payment method timing (COD cash arrives late vs. bank transfer arrives immediately).

**Marketing:** Cannot build conversion funnels. When the only data is the final status "Cancel", there is no way to know if the customer reached "Pending Payment" or "Paid" before cancelling. The entire drop-off measurement at each funnel stage is lost.

**Management (BGĐ/Sếp):** Cannot segment cancellations for strategic decisions. 5,000 cancelled orders is meaningless without context — cancellations before payment (lost potential revenue → Marketing must fix) vs. cancellations after payment (real money lost + operational cost → Operations must fix). Without this distinction, management invests in the wrong team.

**Customer Service (CSKH):** Cannot explain order history to customers calling in. "Your payment timed out on attempt 1 and 2, succeeded on attempt 3" requires transition data that doesn't exist.

**Operations:** Cannot measure processing speed or identify bottlenecks. "How long from pending to confirmed?" and "Which stage has the longest average duration?" are unanswerable.

### Design Validation Test

The database design must pass these questions:
1. "How many orders were in status X at some point this month but aren't anymore?"
2. "How long does it take for an order to go from pending to delivered?"
3. "Was this cancelled order previously paid?"

**Current system: FAILS all three.**

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Impact Level | Reason |
|:---|:---|:---|
| Epic 1 (Foundation & Auth) | None | No stateful entities |
| Epic 2 (Product Catalog) | Medium | garment_status_transitions needed |
| Epic 3 (Cart, Checkout, Payment) | High | order + payment transitions — core revenue tracking |
| Epic 4 (Appointment Booking) | Medium | appointment_status_transitions |
| Epic 5 (Order & Rental Mgmt) | High | Order lifecycle + rental status history |
| Epic 6 (Measurement & Customers) | None | Already has versioned measurement history (FR68) |
| Epic 7 (Operations Dashboard) | High | Task assignment + SLA analytics need transition data |
| Epic 8 (Tailor Dashboard) | High | Production step timing for productivity metrics |
| Epic 9 (CRM & Marketing) | Medium | Lead classification + voucher + campaign history |
| Epic 10 (Unified Order Workflow) | High | 3 service-type flows need full audit trail |
| Epic 11 (Pattern Generation) | Medium | Session status history |
| Epic 12-14 (Deferred AI) | None | Deferred; designs are immutable "locked" |

### New Epic Required

**Epic 15: Status Transition & Business Event Tracking** — dedicated epic with 7 stories covering infrastructure, per-tier integration, API endpoints, and analytics UI.

### Artifact Changes

| Artifact | Change Type | Details |
|:---|:---|:---|
| PRD (functional-requirements.md) | Add Section 18 | 8 new FRs (FR100-FR107) for transition tracking |
| PRD (functional-requirements.md) | Modify 6 FRs | FR47, FR52, FR53, FR65, FR85, FR87 — add transition references |
| Architecture (architecture.md) | Add Section | Status Transition Architecture — design philosophy, data model, 11 tables, backend pattern, 8 query examples |
| Architecture (architecture.md) | Add Endpoints | 9 new API endpoints for transition history + analytics |
| UX Design (ux-design-specification.md) | Modify Component | OrderTimeline — upgrade to render from real transition data |
| UX Design (ux-design-specification.md) | Add 2 Components | FunnelChart, StageMetrics for analytics dashboard |
| UX Design (ux-design-specification.md) | Add Phase 5 | Component Implementation Strategy — Phase 5 (Transition Analytics) |
| Epics (epics.md) | Add Epic 15 | 7 stories + FR coverage map update |

### Technical Impact

- **Database:** 11 new transition tables with composite indexes
- **Backend Services:** All status mutation functions refactored through `record_transition()` pattern
- **Backend API:** 9 new endpoints (5 per-entity history + 4 analytics)
- **Frontend:** OrderTimeline upgrade + 2 new analytics components (Phase 5)
- **Testing:** Unit tests for transition recording, integration tests for query patterns
- **Existing Code:** No breaking changes — `status` column remains as materialized cache

---

## Section 3: Recommended Approach

### Selected Path: Direct Adjustment

**Rationale:**
- Changes are purely **additive** — no existing code deleted or rewritten
- Entity tables keep `status` column as materialized cache → zero breaking changes
- Backend refactor has clear scope: find every `entity.status = X` → wrap with `record_transition()`
- Migration tables follow common schema — can be generated systematically
- Low risk, medium effort, very high business value

### Why Not Other Options

- **Rollback:** Not needed — no completed work conflicts with this change
- **MVP Scope Reduction:** Not needed — transition tracking adds value without replacing features

### Effort Estimate

| Component | Effort | Notes |
|:---|:---|:---|
| Story 15.1 (Foundation) | 3-5 days | 6 tables + indexes + base service |
| Story 15.2 (Orders & Payments) | 3-4 days | Highest complexity — 3 status fields, most mutations |
| Story 15.3 (Tailor Tasks) | 1-2 days | 2 status fields |
| Story 15.4 (Tier 2 entities) | 2-3 days | 3 entities |
| Story 15.5 (Tier 3 entities) | 2-3 days | 5 entities, simpler |
| Story 15.6 (API) | 3-4 days | 9 endpoints + analytics queries |
| Story 15.7 (Frontend) | 3-5 days | 3 components (OrderTimeline upgrade + 2 new) |
| **Total** | **~17-26 days** | **~2-3 sprints** |

### Risk Assessment

| Risk | Level | Mitigation |
|:---|:---|:---|
| Performance impact from transition inserts | Low | Same DB transaction as status update; indexes optimized |
| Missing transition records (developer forgets) | Medium | Linting rule: grep for direct status assignment; code review checklist |
| Backfill accuracy for existing data | Low | Use created_at/updated_at as approximation; clearly mark as "backfilled" in metadata |
| Scope creep into advanced analytics | Low | Phase 5 (analytics UI) is clearly separated; can defer without losing transition data value |

---

## Section 4: Detailed Change Proposals

### Proposal #1: PRD — Add Section 18 (APPROVED ✅)
- Add 8 new FRs (FR100-FR107) covering order transitions, payment transitions, task transitions, garment lifecycle, appointment transitions, lead journey, cross-entity analytics, and remaining entity logs
- Section title: "Status Transition & Audit Trail"

### Proposal #2: PRD — Modify 6 Existing FRs (APPROVED ✅)
- FR47: Add "Each status transition is recorded per FR100"
- FR52: Add "Full payment attempt history is available per FR101"
- FR53: Add "including timeline of all status transitions per FR100"
- FR65: Add "Each transition is recorded with timestamp per FR102"
- FR85: Add "Approval actor and timestamp recorded per FR100"
- FR87: Add "Each sub-step transition recorded per FR102"

### Proposal #3: Architecture — Status Transition Data Model (APPROVED ✅)
- Design Philosophy: "Video, Not Snapshot" — 4 business values (funnel, cash flow, decision context, performance measurement)
- Common columns schema for all transition tables
- 11 per-entity transition tables (3 tiers)
- Index strategy (3 composite indexes per table)
- Backend implementation pattern: `record_transition()` with anti-pattern rule
- 8 SQL query examples mapped to 4 departments (Accounting Q1-Q3, Marketing Q4-Q5, Management Q6-Q7, CSKH Q8)

### Proposal #4: Architecture — API Endpoints (APPROVED ✅)
- 5 per-entity transition history endpoints
- 4 analytics endpoints (funnel, cancellation-analysis, stage-duration, productivity)
- Authorization rules (Customer own-only, Owner all, Tailor own-tasks)

### Proposal #5: UX Design — OrderTimeline Upgrade & Analytics Components (APPROVED ✅)
- OrderTimeline: render from real transition data, 3 variants (Compact/Expanded/Customer), bottleneck highlighting
- FunnelChart: conversion funnel visualization for Marketing
- StageMetrics: avg duration per stage for Operations/Management
- Phase 5 added to Component Implementation Strategy

### Proposal #6: Epics — Epic 15 (APPROVED ✅)
- 7 stories: Foundation → Tier 1 (Orders, Payments) → Tier 1 (Tasks) → Tier 2 → Tier 3 → API → Frontend
- Dependencies: 15.1 blocks all; 15.2-15.5 parallelizable; 15.6 depends on 15.2-15.5; 15.7 depends on 15.6
- FR coverage map updated (FR100-FR107 → Epic 15)

---

## Section 5: Implementation Handoff

### Change Scope Classification: Major

This change introduces a fundamental architectural principle ("Video, Not Snapshot") that affects the data model, backend service layer, API surface, and frontend analytics across the entire platform.

### Handoff Plan

| Role | Responsibility |
|:---|:---|
| **Solution Architect** | Review and finalize transition table schema; validate index strategy; approve backend pattern |
| **Backend Developer** | Implement Epic 15 Stories 15.1-15.6; refactor service layer; write migrations |
| **Frontend Developer** | Implement Story 15.7; upgrade OrderTimeline; build FunnelChart + StageMetrics |
| **QA** | Verify transition recording on every status change path; validate analytics queries against test data |
| **Product Owner** | Validate analytics outputs match department needs (Accounting, Marketing, Management, CSKH) |

### Implementation Sequence

```
Sprint N:   Story 15.1 (Foundation — tables, indexes, base service)
Sprint N:   Story 15.2 (Orders & Payments integration) — parallel after 15.1
Sprint N+1: Story 15.3 (Tailor Tasks) + Story 15.4 (Tier 2) — parallel
Sprint N+1: Story 15.5 (Tier 3) — parallel
Sprint N+2: Story 15.6 (API endpoints)
Sprint N+2: Story 15.7 (Frontend analytics components)
```

### Success Criteria

The system MUST pass the design validation test:

1. ✅ "How many orders were in status X at some point this month but aren't anymore?" → Answerable via `order_status_transitions` table
2. ✅ "How long does it take for an order to go from pending to delivered?" → Answerable via stage-duration analytics endpoint
3. ✅ "Was this cancelled order previously paid?" → Answerable via cancellation-analysis endpoint
4. ✅ CSKH can pull full order timeline in <2 seconds when customer calls
5. ✅ Marketing can view 24h conversion funnel after any campaign
6. ✅ Management can segment cancellations by phase (before/after payment)
7. ✅ No direct `entity.status = X` assignments exist in codebase (all go through `record_transition()`)

### Anti-Pattern Enforcement

**MUST NOT:** Directly assign status on any entity without recording a transition.

```python
# ❌ ANTI-PATTERN — NEVER DO THIS
order.status = "confirmed"

# ✅ CORRECT — ALWAYS USE TRANSITION SERVICE
await update_order_status(
    db, order, "confirmed",
    changed_by=current_user.id,
    context="Owner approved"
)
```

Code review checklist item: "Does this PR modify any status field? If yes, does it use `record_transition()`?"
