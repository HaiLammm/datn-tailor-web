# Unified Story 2.5: Phác thảo Giao diện Rule Editor

Status: Phase 1 only — not implemented in Phase 2

## Phase 1 — Requirements (Original)
> Nguồn: docs/2-5-phac-thao-giao-dien-rule-editor.md

## Story

As a **Nghệ nhân (Cô Lan)** (Owner role),
I want a basic interface to view and adjust Smart Rules (Style Pillars, Ease Deltas),
so that I can directly digitize heritage craft secrets without needing programmer support.

## Acceptance Criteria

1. **AC1 - Rule List Display:** Given Cô Lan is authenticated with Owner role and navigates to Knowledge Management page, When she accesses the "Smart Rules Editor" section, Then the system displays a list of all existing rules grouped by Style Pillar (Traditional, Minimalist, Avant-Garde) showing pillar name, number of delta mappings, and last-modified timestamp.

2. **AC2 - Rule Detail View:** Given Cô Lan selects a Style Pillar from the list, When the rule detail panel opens, Then the system displays all delta mappings for that pillar in a structured table format (slider_id → delta_keys, scale_factor, golden_points, min/max range), AND provides a toggle to view the raw JSON representation of the rule data.

3. **AC3 - Rule Edit & Save:** Given Cô Lan is viewing rule details, When she modifies values (scale_factor, golden_points, min/max range) and clicks "Lưu thay đổi" (Save Changes), Then the system validates input ranges via backend Pydantic validation, AND updates the Local Knowledge Base (LKB), AND displays a success confirmation with the updated timestamp.

4. **AC4 - Input Validation:** Given Cô Lan enters invalid values (e.g., min > max, negative scale_factor, golden_points outside [0,100] range), When she attempts to save, Then the system displays specific Vietnamese error messages for each invalid field, AND prevents saving until all errors are resolved.

5. **AC5 - RBAC Protection:** Given a user with Customer or Tailor role, When they attempt to access the Rule Editor route, Then the system redirects them to their appropriate dashboard, AND the Rule Editor API endpoints return 403 Forbidden.

## Phase 2 — Implementation
> Không có story Phase 2 tương ứng

## Traceability
- Phase 1 Story: 2.5 — Phác thảo Giao diện Rule Editor (Phase 2 Placeholder)
- Phase 2 Story: N/A
- Epic: 2
