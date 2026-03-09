# Story 3.4: Đóng gói dữ liệu SSOT (Master Geometry JSON Generation)

## Description
As a **Hệ thống**,
I want **đóng gói toàn bộ thông số hình học sau biến đổi vào một file JSON duy nhất**,
So that **dữ liệu được truyền tải và lưu trữ đồng nhất (Single Source of Truth)**.

## Acceptance Criteria
- [x] **Given** Người dùng nhấn "Lock Design" để hoàn tất thiết kế
- [x] **When** Hệ thống gửi yêu cầu lưu trữ
- [x] **Then** Một file Master Geometry JSON được tạo ra chứa: sequence_id, base_hash, deltas, và geometry_hash
- [x] **And** Hệ thống kiểm tra tính toàn vẹn (Checksum) trước khi lưu vào Database (NFR5)

## Tasks

### 1. Backend: Pydantic models for Master Geometry JSON
- [x] Review `backend/src/models/geometry.py`.
- [x] Define `LockedDesign` model to include:
    - `sequence_id`: UUID for the design iteration.
    - `base_hash`: SHA-256 of the base pattern.
    - `deltas`: The morph deltas (MorphDelta) applied.
    - `geometry_hash`: Self-checksum for integrity.
- [x] Ensure nested models (like `MorphDelta`) are correctly defined for serialization.

### 2. Backend: Logic to compute geometry_hash (SHA-256)
- [x] Implement `compute_master_geometry_hash` in `backend/src/core/hashing.py` to compute SHA-256 hash of a dict.
- [x] Ensure the hash is computed on a **canonical JSON representation** (sorted keys, no whitespace) to be deterministic.
- [x] Exclude `geometry_hash` itself from the hash calculation payload.

### 3. Backend: API endpoint to receive "Lock Design" request and save to DB
- [x] **Database Model:** Create `DesignDB` model in `backend/src/models/db_models.py`.
    - Fields: `id`, `user_id`, `tenant_id`, `master_geometry` (JSON), `geometry_hash`, `created_at`, `status`.
- [x] **API Endpoint:** Create `POST /api/v1/designs/lock` in `backend/src/api/v1/designs.py`.
    - Input: Request body with `LockDesignRequest` (deltas, base_id).
    - Process: Construct LockedDesign → compute geometry_hash → save to DB.
    - Output: `design_id`, `sequence_id`, `geometry_hash`, `status`.
- [x] **Validation:** Pydantic validates input; hash integrity verified.

### 4. Frontend: "Lock Design" button and API integration
- [x] Add "Lock Design" button to the UI (DesignSessionClient).
- [x] Implement the `lockDesign` server action calling `POST /api/v1/designs/lock`.
- [x] Handle loading state and success/error notifications.
- [x] On success, prevent further editing (switch to "Locked" mode with lock icon).

## Technical Notes
- **Master Geometry JSON Structure:**
  ```json
  {
    "sequence_id": "uuid",
    "base_hash": "sha256_of_base_pattern",
    "deltas": { ... },
    "geometry_hash": "sha256_of_this_object_excluding_hash"
  }
  ```
- **Database:** Use JSON column type (PostgreSQL JSONB at runtime) for flexible storage.

## Dev Agent Record

### Implementation Plan
- Task 1: Added `LockedDesign` and `LockDesignRequest` Pydantic models to `geometry.py`
- Task 2: Added `compute_master_geometry_hash` and `compute_base_pattern_hash` to `hashing.py`
- Task 3: Created `DesignDB` model, `designs.py` API router with `POST /api/v1/designs/lock`
- Task 4: Added `lockDesign` server action, store state (is_design_locked, is_locking, etc.), Lock Design button with loading/locked/error states

### Completion Notes
- All 4 tasks implemented with full test coverage
- Backend: 298 tests passing (17 new: 11 model/hash + 6 API)
- Frontend: 200 tests passing (7 new: store actions + type tests)
- Used `JSON` type instead of `JSONB` in SQLAlchemy for SQLite test compatibility (PostgreSQL auto-uses JSONB at runtime)
- Lock Design button appears after "Tạo bản vẽ" succeeds, prevents re-editing once locked

## File List
- `backend/src/models/geometry.py` — Added `LockedDesign`, `LockDesignRequest` models
- `backend/src/core/hashing.py` — Added `compute_master_geometry_hash`, `compute_base_pattern_hash`
- `backend/src/models/db_models.py` — Added `DesignDB` model
- `backend/src/api/v1/designs.py` — New file: Lock Design API endpoint
- `backend/src/main.py` — Registered designs router
- `backend/tests/test_master_geometry_ssot.py` — New: 11 tests for models and hashing
- `backend/tests/test_designs_api.py` — New: 6 tests for lock API endpoint
- `frontend/src/types/geometry.ts` — Added `LockDesignResponse` interface
- `frontend/src/types/style.ts` — Added lock state fields and actions to store types
- `frontend/src/store/designStore.ts` — Added lock state and actions
- `frontend/src/app/actions/geometry-actions.ts` — Added `lockDesign` server action
- `frontend/src/app/(customer)/design-session/DesignSessionClient.tsx` — Added Lock Design button and handler
- `frontend/src/__tests__/lockDesign.test.ts` — New: 7 tests for lock store and types
- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Updated story status

## Change Log
- 2026-03-06: Story 3.4 implemented — all 4 tasks complete with SSOT packaging, SHA-256 integrity, API endpoint, and UI lock button
- 2026-03-09: Code Review — 4 HIGH, 4 MEDIUM, 2 LOW issues found and fixed:
  - H1: Fixed handleLockDesign to use stored MorphDelta instead of broken construction from DeltaValue[]
  - H2: Added db.commit() after db.flush() to persist locked designs
  - H3: Added auth token forwarding to all geometry server actions
  - H4: Removed duplicate hashing function, using canonical compute_base_hash
  - M1: Renamed misleading test to reflect actual behavior
  - M3: Added 422 guardrail violation parsing in lockDesign response
  - M4: Extracted LoadingSpinner to avoid SVG duplication
  - L1: Moved inline imports to module-level
  - L2: LockDesignResponse missing status field (deferred — non-blocking)

## Status
done
