# Sprint Change Proposal — Technical Pattern Generation

**Date:** 2026-04-03
**Author:** Bob (Scrum Master)
**Trigger:** Brainstorming Session 2026-04-02 — "Big update Design Session"
**Scope Classification:** Moderate
**Status:** Pending Approval

---

## 1. Issue Summary

### Problem Statement

Design Session currently uses AI Emotional Compiler (Epic 7-9) to translate style adjectives into artistic concept patterns. However, the output is a concept drawing — not a production-ready sewing pattern that can be used to cut fabric. The shop needs a **deterministic Pattern Engine** that takes 10 body measurements and generates 3 real technical pattern pieces (front bodice, back bodice, sleeve) exportable as SVG (1:1 scale) and G-code for laser cutting machines.

### Discovery Context

Identified through Brainstorming Session 2026-04-02 with Owner (Lem). Session used 4 techniques (First Principles Thinking, Morphological Analysis, Cross-Pollination, Role Playing) generating 23 ideas organized into a 3-phase roadmap. Key breakthrough: complete formula set validated by experienced tailors — pattern generation is fully algorithmic, no AI inference needed.

### Evidence

- Complete mathematical formula table for bodice (front/back) and sleeve patterns
- Tailor-confirmed: armhole curve = 1/4 ellipse (digitizing "artisan feel")
- DRY architecture validated: front bodice = back bodice - 1cm (waist & hip offset)
- 10 input measurements sufficient for all 3 pattern pieces
- User flow defined: Customer profile → Pattern generation → Export → Laser cutting

---

## 2. Impact Analysis

### Epic Impact

| Epic | Status | Impact | Action |
|:---|:---|:---|:---|
| Epic 1-6 | Done | No impact | None |
| Epic 7 (Style Engine) | Done | No impact | Retained for AI concept flow |
| Epic 8 (Geometry) | Done | No code change | Pattern Engine is a separate module from MasterGeometry |
| Epic 9 (Guardrails) | Done | No code change | Story 9.5 SVG export logic may be referenced but not modified |
| Epic 10 (Order Workflow) | In-progress | Minor | Add `pattern_session_id` FK to orders table (Story 11.1) |
| **Epic 11 (NEW)** | Backlog | **New epic** | 6 stories covering Pattern Engine MVP |

### Story Impact

No existing stories require modification. All changes are additive:
- 6 new stories in Epic 11 (11.1 through 11.6)
- Epic 10 Story 10.7 (backlog) unaffected

### Artifact Conflicts

| Artifact | Conflict | Resolution |
|:---|:---|:---|
| PRD Executive Summary | Missing Pattern Generation as core function | Add as 4th core function |
| PRD Product Scope | No Pattern Generation in MVP modules | Add Epic 11 to Phase 1, align Phase 2-3 with brainstorming roadmap |
| PRD Functional Requirements | No FRs for pattern generation | Add FR91-FR99 (Section 17) |
| Architecture | No Pattern Engine component, no data model, no API endpoints | Add Pattern Engine section, `patterns/` directory, 2 new DB tables, 5 API endpoints |
| UX Design Specification | No pattern generation UX flows | Add Owner Pattern Generation Flow, Tailor Pattern Viewing Flow, 3 new custom components |
| Epics | No Epic 11 | Add Epic 11 with 6 stories and FR coverage map |

### Technical Impact

- **Backend:** New `patterns/` module (engine.py, formulas.py, svg_export.py, gcode_export.py) — completely independent from existing `geometry/` module
- **Frontend:** New Design Session page at `(workplace)/design-session/` (already moved per recent commit) with split-pane layout, SVG viewer, and export bar
- **Database:** 2 new tables (`pattern_sessions`, `pattern_pieces`) + 1 FK on `orders`
- **No AI/LLM dependency** — deterministic formula-based, runs on standard CPU

---

## 3. Recommended Approach

### Selected Path: Direct Adjustment (Option 1)

Add Epic 11 as a new epic with 6 stories. No changes to existing epics or completed work.

### Rationale

- **Low risk:** Deterministic code with formulas already validated by tailors — no AI uncertainty
- **Medium effort:** Clear requirements from brainstorming, complete formula set documented
- **Zero disruption:** Epic 7-9 (AI Concept) and Epic 11 (Technical Pattern) serve different use cases, no code conflicts
- **High business value:** Production tool Owner needs daily — bridges digital design to physical fabric cutting
- **Natural sequencing:** Epic 10 completes first → Epic 11 starts with clean slate

### Effort Estimate

- **Backend (Stories 11.1-11.3):** ~3 stories — DB migration + formula engine + export API
- **Frontend (Stories 11.4-11.6):** ~3 stories — measurement form + SVG preview + export UI
- **Complexity:** Medium — math is known, SVG/G-code generation is well-documented

### Risk Assessment

| Risk | Level | Mitigation |
|:---|:---|:---|
| Formula accuracy | Low | Formulas validated by experienced tailors in brainstorming |
| SVG 1:1 scale correctness | Low | Unit tests with known measurements, ΔG < 1mm (NFR6) |
| G-code compatibility | Medium | Start with generic G-code, machine-specific presets in Phase 3 |
| Scope creep into Phase 2-3 | Low | MVP strictly limited to Đợt 1 (5 items from roadmap) |

---

## 4. Detailed Change Proposals

### 4.1 PRD Changes

**Edit 1: Executive Summary** (`prd/executive-summary.md`)
- Add "Technical Pattern Generation" as 4th core function
- Platform now serves 4 functions (was 3)

**Edit 2: Product Scope** (`prd/product-scope.md`)
- Add "Technical Pattern Generation (Epic 11)" to MVP Core Modules
- Move brainstorming Đợt 2 items to Phase 2 (Pattern Enhanced UX, Grading)
- Replace "CAD/CNC Integration" in Phase 3 with "Laser Automation" (more specific)
- Add "Open Garment System" to Phase 3

**Edit 3: Functional Requirements** (`prd/functional-requirements.md`)
- Add Section 17: "Technical Pattern Generation & Production Export"
- 9 new FRs: FR91-FR99

### 4.2 Architecture Changes

**Edit 4: Architecture Document** (`architecture.md`)
- Add "Technical Pattern Engine (Epic 11)" section with:
  - Architectural distinction from AI Bespoke Engine
  - Core algorithm description
  - Data model (2 new tables)
  - Curve generation approach (ellipse arcs)
  - Export pipeline (SVG + G-code)
  - Order integration (FK)
- Add `patterns/` directory to backend structure
- Add `design-session/` to `(workplace)` frontend structure
- Add 5 new API endpoints

### 4.3 UX Design Changes

**Edit 5: UX Specification** (`ux-design-specification.md`)
- Add Owner Pattern Generation Flow to Experience Mechanics
- Add Tailor Pattern Viewing Flow
- Add platform strategy rows for Pattern Generation and Pattern Viewing
- Add 3 custom components: PatternPreview, MeasurementForm, PatternExportBar

### 4.4 Epic & Story Changes

**Edit 6: Epics Document** (`epics.md`)
- Add Epic 11: "Tạo Bản Rập Kỹ Thuật & Xuất Sản Xuất"
- 6 stories: DB Migration → Engine API → Export API → Form UI → Preview UI → Export+Attach UI
- Update FR Coverage Map: FR91-FR99 → Epic 11

---

## 5. Implementation Handoff

### Scope Classification: Moderate

Requires backlog reorganization and document updates before development begins.

### Handoff Plan

| Role | Responsibility | Action |
|:---|:---|:---|
| **PM (John)** | PRD updates | Apply Edit 1-3 to PRD files |
| **Architect (Winston)** | Architecture updates | Apply Edit 4 to architecture.md |
| **UX Designer (Sally)** | UX spec updates | Apply Edit 5 to ux-design-specification.md |
| **SM (Bob)** | Sprint planning | Add Epic 11 to sprint-status.yaml, create stories when Epic 10 completes |
| **Dev (Amelia)** | Implementation | Begin Epic 11 after Epic 10 done, follow story sequence 11.1 → 11.6 |

### Sequencing

1. **Now:** Update all planning artifacts (PRD, Architecture, UX, Epics)
2. **Next:** Complete Epic 10 (Stories 10.5-10.7 remaining)
3. **Then:** Sprint Planning for Epic 11
4. **Implementation order:** 11.1 (DB) → 11.2 (Engine) → 11.3 (Export) → 11.4 (Form) → 11.5 (Preview) → 11.6 (Export UI)

### Success Criteria

- [ ] All 6 planning artifacts updated and consistent
- [ ] Epic 11 added to sprint-status.yaml
- [ ] Epic 10 completed (10.5-10.7 done)
- [ ] Stories 11.1-11.6 implemented and reviewed
- [ ] Pattern Engine produces accurate patterns (ΔG < 1mm)
- [ ] SVG export at 1:1 scale verified with physical measurement
- [ ] G-code export produces valid output for laser cutter
- [ ] Owner can generate → preview → export → attach pattern to order end-to-end
