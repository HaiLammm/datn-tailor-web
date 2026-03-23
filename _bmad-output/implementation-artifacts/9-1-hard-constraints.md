# Unified Story 9-1: Hard Constraints

Status: done

## Phase 1 — Requirements (Original)
> Nguon: docs/4-1a-loi-kiem-tra-rang-buoc-vat-ly.md

### Story

As a **Backend System**,
I want **automatically validate physical constraints (e.g., armhole circumference vs bicep) against submitted deltas**,
so that **designs that violate mechanical/physical rules are blocked before blueprint export, ensuring every garment can physically be constructed**.

### Acceptance Criteria

1. **Given** Backend receives new Delta values (from style intensity submission or direct override)
   **When** API `POST /api/v1/guardrails/check` is called with a `GuardrailCheckRequest` containing deltas + base measurements
   **Then** The system runs the full Constraint Registry (Hard constraints first, then Soft constraints) using Pydantic v2 validation
   **And** Returns a `GuardrailCheckResponse` with pass/fail status, list of ALL violations (not just first), and list of warnings

2. **Given** A Hard Constraint is violated (e.g., armhole circumference < bicep circumference)
   **When** The constraint check completes
   **Then** The response includes `status: "rejected"`, detailed errors for EVERY violated constraint (constraint_id, violated values, safe_suggestion)
   **And** The response includes `last_valid_sequence_id` from the most recent passing snapshot for Frontend snap-back
   **And** The system prevents any downstream snapshot save or blueprint export (FR10)

3. **Given** A Soft Constraint is triggered (e.g., values near danger zone threshold)
   **When** The constraint check completes
   **Then** The response includes `status: "warning"`, advisory messages in 100% Vietnamese tailoring terminology (NFR11)
   **And** The system allows the operation to proceed

4. **Given** All constraints pass without violation
   **When** The constraint check completes
   **Then** The response includes `status: "passed"` with empty violations and warnings arrays

5. **Given** The Lock Design flow (Story 3.4) is triggered
   **When** `POST /api/v1/designs/lock` is called
   **Then** The guardrail check MUST run before persisting the LockedDesign
   **And** If Hard Constraints fail, the lock request is rejected with 422 status and constraint details
   **And** If Soft Constraints warn, lock proceeds but warnings are included in the lock response

6. **Given** No deltas are provided (empty deltas list)
   **When** The guardrail check runs
   **Then** The check passes with `status: "passed"` (base pattern always valid)

7. **Given** A value is exactly at the boundary threshold (e.g., armhole == bicep + 2cm exactly)
   **When** The constraint check runs
   **Then** The constraint PASSES (boundary-inclusive: >= not >)

### Tasks / Subtasks

- [x] Task 1: Constraint Registry Framework (AC: #1, #2, #3, #4)
- [x] Task 2: Hard Constraint Implementations (AC: #2)
- [x] Task 3: Soft Constraint Implementations (AC: #3)
- [x] Task 4: Pydantic Models for Guardrails (AC: #1, #2, #6, #7)
- [x] Task 5: Guardrails API Endpoint (AC: #1)
- [x] Task 6: Integrate Guardrails into Lock Design Flow (AC: #5)
- [x] Task 7: Comprehensive Tests (AC: #1-#7)

## Phase 2 — Implementation
> Phase 2 file khong ton tai — story hoan thanh truoc khi co workflow implementation-artifacts

## Traceability
- Phase 1 Story: 4.1a - Deterministic Guardrails Logic (Physical Constraint Engine)
- Phase 2 Story: 9-1-hard-constraints
- Epic: 9
