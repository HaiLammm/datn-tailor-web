---
date: '2026-06-10'
trigger: 'Domain research gap analysis — bespoke flow missing fitting–alteration loop and post-delivery alteration warranty vs industry-standard tailor shop workflow'
scope: 'Moderate'
status: 'approved'
affected_epics: [12]
new_stories: ['12.6', '12.7']
affected_artifacts:
  - prd/functional-requirements.md
  - architecture.md
  - ux-design-specification.md
  - implementation-artifacts/sprint-status.yaml
source_research: 'planning-artifacts/research/domain-quy-trinh-tiem-may-ao-dai-research-2026-06-10.md'
approved_proposals: 4
---

# Sprint Change Proposal — Fitting Loop & Post-Delivery Alteration Warranty

**Date:** 2026-06-10
**Triggered by:** Domain research report (industry-standard tailor shop workflow comparison)
**Scope Classification:** Moderate
**Author:** Lem (with Scrum Master facilitation)
**Review Mode:** Incremental — all 4 edit proposals approved individually

---

## Section 1: Issue Summary

### Problem Statement

The bespoke order flow does not model two practices that are standard across Vietnamese tailor shops:

1. **Fitting–alteration loop.** Industry norm is 1–2 fitting rounds (thử đồ) — at least 2 recommended for áo dài — with an alteration pass after each round, and the shop proactively inviting the customer when the trial garment is ready. The system's production sub-steps (Cutting → Sewing → Fitting → Finishing) are strictly linear: no repeatable loop, no fitting appointment, no record of rounds or adjustments. Epic 12's new 11-state task machine added an owner-internal QC/rework loop but no customer fitting stage (GARMENT_STAGES contains no `fitting`).
2. **Post-delivery alteration warranty (hậu mãi).** Reputable shops universally offer a free immediate re-fit at pickup and a time-boxed free alteration window after delivery (observed range across shops: 7 days–6 months). The system's pipeline ends at `delivered → completed` with no alteration-request path.

### Discovery Context

Identified by the domain research workflow on 2026-06-10 (`research/domain-quy-trinh-tiem-may-ao-dai-research-2026-06-10.md`), which compared the documented business flows (`docs/08-luong-nghiep-vu.md`) step-by-step against industry-standard practice verified from multiple Vietnamese sources plus international bespoke references (Savile Row / Henry Poole). The comparison found 7 of 9 standard workflow steps already matched; these two gaps were the only genuine mismatches.

### Evidence

- 1–2 fitting rounds standard, free immediate re-fit at pickup (sovaba.travel — Hội An practice; tiemmaydo.vn — shop proactively contacts customer when trial garment ready).
- Post-delivery alteration windows observed: 7 days (TIE Men), 15 days + 6-month seam warranty (Thomas Nguyen Tailor), 30 days (Thanh Kha), 1 free alteration (Hồng Oanh) — no industry-wide standard; shop-configurable window required.
- Savile Row reference: 3 named fittings; pattern kept on file so repeat orders need fewer fittings (henrypoole.com) — validating the existing measurement-profile + pattern-session architecture.

---

## Section 2: Impact Analysis

### Epic Impact

| Epic | Status | Impact |
|---|---|---|
| Epic 10 (Unified Order Workflow) | done | Not reopened. Changes are additive on top of its pipeline. FR87 (owned by Epic 10 scope) is amended but implementation lands in Epic 12 stories. |
| Epic 12 (Bespoke Production Task Workflow) | in-progress | **Two new stories added: 12.6, 12.7.** Existing infrastructure reused: 11-state machine, task_stage_logs, task_history, rework mechanics. Story 12.5 (review) unaffected — no shared files conflict expected. |
| Epic 4 (Appointment Booking) | done | Reused as-is for fitting appointments (no changes). |
| Epics 13/14 (Deferred AI) | deferred | None. |

### Artifact Conflicts

- **PRD** (`prd/functional-requirements.md` §16): FR87 amended; FR100, FR101 added. MVP unchanged.
- **Architecture** (`architecture.md`): Bespoke pipeline diagram amended (Fitting ⇄ Alteration loop + warranty window); Data Architecture additions (`fitting_rounds` table, `tailor_tasks.task_type`, tenant setting `alteration_warranty_days`, GARMENT_STAGES `fitting` stage); 3 new API endpoints.
- **UX** (`ux-design-specification.md`): UX-DR9 amended (loop rendering + warranty countdown); UX-DR32 added (fitting & after-care touchpoints, plain-Vietnamese customer copy).
- **Sprint status** (`implementation-artifacts/sprint-status.yaml`): 2 new story entries under epic-12.

### Pre-existing Documentation Drift (side findings, follow-up actions)

- `docs/08-luong-nghiep-vu.md` §8.8 (Tailor Task Workflow) predates Epic 12's 11-state machine — needs sync after Epic 12 completes.
- `prd/functional-requirements.md` FR91–FR99 do not carry the SCP 2026-06-08 amendments that `epics.md` records — recommend back-porting amendment notes to the PRD shard.

### Technical Impact

- New DB migration(s): `fitting_rounds` table, `tailor_tasks.task_type` column, tenant warranty setting. Follow the project's model↔migration sync discipline (known drift risk).
- All changes backward compatible: `task_type` defaults to `'production'`; `fitting` stage added via GARMENT_STAGES config; no existing column altered.

---

## Section 3: Recommended Approach

**Selected path: Direct Adjustment** — add Stories 12.6 and 12.7 within the existing Epic 12 structure.

- **Rationale:** Epic 12 is the active bespoke-production-workflow epic and already provides the exact mechanics needed (repeatable loops via rework pattern, immutable task_history, stage lifecycle). Both gaps are additive transitions/states — no rollback or MVP reduction is warranted.
- **Options rejected:** Rollback (nothing to revert — N/A); MVP review (MVP intact — N/A); separate new Epic 16 (declined by user — unnecessary management overhead, Epic 12 is the natural home).
- **Effort estimate:** Medium (2 stories, ~1 migration each, reuse-heavy).
- **Risk:** Low (additive, backward compatible, infrastructure proven by 12.1–12.4).
- **Timeline impact:** Extends Epic 12 by 2 stories; does not block 12.5 (in review) or 11.9 (blocked on artisan session).

---

## Section 4: Detailed Change Proposals (all approved individually)

### Proposal 1 — PRD: `prd/functional-requirements.md` §16 ✅ approved

**A. Amend FR87:**

OLD:
> **FR87 (Service-Type Preparation Steps):** Preparation sub-steps are differentiated by service type: Rent (Cleaning → Altering → Ready), Buy (QC → Packaging). Bespoke follows existing production sub-steps (Cutting → Sewing → Fitting → Finishing).

NEW:
> **FR87 (Service-Type Preparation Steps):** Preparation sub-steps are differentiated by service type: Rent (Cleaning → Altering → Ready), Buy (QC → Packaging). Bespoke follows production sub-steps (Cutting → Sewing → Fitting ⇄ Alteration → Finishing), where Fitting ⇄ Alteration is a repeatable loop (industry norm: 1–2 rounds) rather than a single linear step. [Amended SCP 2026-06-10]

**B. Add FR100:**

> **FR100 (Fitting Round Management):** When a bespoke garment reaches the Fitting sub-step, the system notifies the customer to schedule a fitting appointment (reusing the Appointment Booking module). Owner/Tailor records the outcome of each fitting round (passed / needs alteration, with adjustment notes). A "needs alteration" outcome returns the task to Alteration and allows a subsequent fitting round. Every round is recorded as a timestamped business event (per the status-transition tracking principle, SCP 2026-05-01). [Added SCP 2026-06-10]

**C. Add FR101:**

> **FR101 (Post-Delivery Alteration Warranty):** Within a shop-configurable warranty window (default: 30 days) after a bespoke order is delivered, the customer can request a free fit alteration. An approved request creates a lightweight alteration task (no full production pipeline re-entry) and is tracked through completion and re-handover. Requests outside the window are at Owner's discretion. [Added SCP 2026-06-10]

*(Mirror the same FR87/FR100/FR101 text in the `epics.md` Requirements Inventory.)*

### Proposal 2 — Architecture: `architecture.md` ✅ approved

**A. Bespoke pipeline diagram:**

```
pending_measurement → pending → confirmed
  → in_production (Cutting → Sewing → Fitting ⇄ Alteration → Finishing)
  → ready_to_ship | ready_for_pickup → shipped → delivered
  → completed (alteration warranty window — FR101)
```

- Fitting ⇄ Alteration: repeatable loop (1–n rounds); each round records outcome (passed / needs_alteration) + adjustment notes as a business event (SCP 2026-05-01 principle). On reaching Fitting, system invites customer to book a fitting via the Booking module.
- completed (bespoke): within the configurable warranty window, customer may request alteration → lightweight alteration task, NOT a full pipeline re-entry. [Amended SCP 2026-06-10]

**B. Data Architecture additions (additive):**

- New table `fitting_rounds`: `id`, `tenant_id`, `order_id`, `task_id`, `round_number`, `appointment_id` (nullable FK → appointments), `outcome` ∈ {`passed`, `needs_alteration`}, `notes`, `fitted_at`, `created_at`.
- `tailor_tasks.task_type`: `'production' | 'alteration'` (default `'production'` — backward compatible). Alteration tasks use the existing Epic 12 11-state machine with a reduced stage list (alteration → finishing).
- Tenant-level setting: `alteration_warranty_days` (default 30).
- GARMENT_STAGES (Epic 12): insert `fitting` stage after `assembly` for all garment types — e.g. ao_dai: cutting, body_sewing, sleeve_sewing, assembly, **fitting**, embroidery, finishing. The `fitting` stage completes only when a fitting_round with outcome = `passed` exists.

**C. New API endpoints (additive):**

- `POST /api/v1/orders/{id}/fitting-rounds` — Owner/Tailor records a fitting round outcome
- `GET  /api/v1/orders/{id}/fitting-rounds` — fitting round history (Owner + Customer)
- `POST /api/v1/orders/{id}/request-alteration` — Customer, within warranty window
- Notification triggers: "Mời bạn tới thử đồ" (fitting ready), "Đang chỉnh sửa theo góp ý của bạn" (needs_alteration), "Yêu cầu chỉnh sửa đã được tiếp nhận" (alteration request received)

### Proposal 3 — Epic 12 stories + sprint-status ✅ approved

**Story 12.6 — Fitting Rounds & Alteration Loop**

> As a Owner (Chủ tiệm), I want the bespoke production flow to support repeatable fitting rounds — inviting the customer to a fitting appointment, recording each round's outcome and adjustment notes, and looping back to alteration when needed, so that the shop's digital workflow matches the real tailoring practice of 1–2 fitting rounds before finishing.

AC outline:
1. Migration: `fitting_rounds` table + GARMENT_STAGES inserts `fitting` stage after `assembly` (all garment types)
2. Task reaching `fitting` stage → customer notification "Mời bạn tới thử đồ" + booking link (reuse Epic 4)
3. `POST /orders/{id}/fitting-rounds`: Owner/Tailor records outcome (passed / needs_alteration + notes); needs_alteration → new round, fitting stage stays in_progress; passed → stage completes
4. `GET /orders/{id}/fitting-rounds`: round timeline (Owner + Customer)
5. Customer order detail shows fitting progress in plain Vietnamese ("Chờ bạn tới thử", "Đang chỉnh sửa theo góp ý của bạn")
6. Every round logged as event in task_history (SCP 2026-05-01)

**Story 12.7 — Post-Delivery Alteration Warranty**

> As a Customer (Khách hàng), I want to request a free fit alteration within the warranty window after receiving my bespoke áo dài, so that I get the fit promise that reputable tailor shops provide.

AC outline:
1. Migration: `tailor_tasks.task_type` (`'production' | 'alteration'`, default `'production'`) + tenant setting `alteration_warranty_days` (default 30)
2. `POST /orders/{id}/request-alteration`: bespoke completed/delivered orders only, within window; outside window → 422 with clear message for manual Owner handling
3. Owner approves request → alteration task created (Epic 12 state machine, reduced stage list: alteration → finishing), tailor notified
4. Alteration completion → customer notification "Áo đã chỉnh xong — mời bạn tới nhận"; full event log
5. Customer order detail (completed orders within window): "Yêu cầu chỉnh sửa" button + form describing the fit issue
6. Order Board (Owner): badge distinguishing alteration tasks from production tasks

**Sequencing:** 12.6 before 12.7 (12.7 reuses task_type + alteration mechanics). Both independent of 12.5 (in review).

**sprint-status.yaml update:**

```yaml
  12-6-fitting-rounds-alteration-loop: backlog  # SCP 2026-06-10: domain research gap #1
  12-7-post-delivery-alteration-warranty: backlog  # SCP 2026-06-10: domain research gap #2
```

### Proposal 4 — UX: `ux-design-specification.md` ✅ approved

**A. Amend UX-DR9 (OrderTimeline):** Bespoke orders render the Fitting ⇄ Alteration loop as repeated rounds (Vòng thử 1, Vòng thử 2…) with outcome + notes per round, instead of a single linear step. Completed bespoke orders within the alteration warranty window show the remaining warranty period. [Amended SCP 2026-06-10]

**B. Add UX-DR32 (Fitting & After-care touchpoints):**
1. Customer order detail: fitting progress strip with plain-Vietnamese states ("Chờ bạn tới thử", "Đang chỉnh sửa theo góp ý của bạn", "Thử đạt — đang hoàn thiện"); CTA "Đặt lịch thử đồ" reusing BookingCalendar (UX-DR5).
2. Owner/Tailor task detail: fitting-round recorder — outcome toggle (Đạt / Cần chỉnh sửa) + adjustment notes field, ≥44px touch targets, Command Mode density.
3. Customer completed-order view: "Yêu cầu chỉnh sửa" button + simple form (mô tả chỗ chưa vừa), visible only within warranty window; outside window shows contact CTA instead.
4. All customer-facing copy is plain Vietnamese — no technical/English terms (no "Fitting", "Alteration", "QC" in Boutique Mode).

---

## Section 5: Implementation Handoff

**Scope classification: Moderate** — backlog reorganization (2 new stories) + planning-artifact amendments; no fundamental replan.

| Role | Responsibility |
|---|---|
| Scrum Master (SM) | Apply sprint-status.yaml entries; run `bmad-create-story` for 12.6 then 12.7 when their turn arrives |
| Dev team | Implement 12.6 → 12.7 via standard story cycle (create → validate → dev → review); migrations follow model↔migration sync discipline |
| PM/Architect | None required — changes are additive within approved architecture patterns |

**Follow-up actions (documentation sync, non-blocking):**
1. Update `docs/08-luong-nghiep-vu.md` (§8.1.3 bespoke pipeline, §8.8 task workflow) after 12.6/12.7 land — §8.8 already drifted from Epic 12.
2. Back-port SCP 2026-06-08 amendment notes (FR91–FR99) from `epics.md` into `prd/functional-requirements.md`.

**Success criteria:**
- Bespoke orders can record ≥1 fitting round with outcome + notes; needs_alteration loops back without pipeline restart
- Customer receives fitting invitation and can book via existing Booking module
- Completed bespoke orders accept alteration requests within the configured window and spawn alteration tasks
- All transitions logged as events (task_history / fitting_rounds) — no snapshot-only state
- Customer-facing copy 100% plain Vietnamese

---

**Research basis:** `planning-artifacts/research/domain-quy-trinh-tiem-may-ao-dai-research-2026-06-10.md`
**Checklist:** all 6 sections completed (change-navigation checklist); options Rollback and MVP-review evaluated and rejected as N/A
