# Story 11.2: Pattern Engine Core API

Status: review

## Story

As an Owner,
I want to run the pattern generation formula engine on selected customer measurements,
so that I can generate 3 technical pattern pieces (front bodice, back bodice, sleeve) with geometric precision for production use.

## Acceptance Criteria

1. **Pattern Session Creation API** — `POST /api/v1/patterns/sessions`
   - Given valid customer_id, garment_type, notes, and 10 measurements within min/max ranges
   - When Owner sends POST request with PatternSessionCreate payload
   - Then system creates pattern_session record with status="draft", returns PatternSessionResponse with 201
   - And tenant_id is set from authenticated user context (multi-tenant isolation)
   - And created_by is set to current user's ID

2. **Pattern Generation API** — `POST /api/v1/patterns/sessions/{id}/generate`
   - Given a pattern_session with status="draft" and valid measurements
   - When Owner sends POST to generate endpoint
   - Then formula engine produces exactly 3 pattern_pieces (front_bodice, back_bodice, sleeve)
   - And each piece contains svg_data (TEXT, <50KB) and geometry_params (JSONB)
   - And session status transitions from "draft" → "completed"
   - And response includes full PatternSessionResponse with nested pieces

3. **Front/Back Bodice Generation** — DRY offset architecture
   - Given 10 measurements from pattern_session
   - When generating front_bodice: offset = -1cm; back_bodice: offset = 0cm
   - Then both pieces share single `generate_bodice(measurements, offset)` function
   - And bust_width = vong_nguc / 4
   - And waist_width = (vong_eo / 4) + offset
   - And hip_width = vong_mong / 4
   - And armhole_drop = vong_nach / 12
   - And neck_depth = vong_co / 16
   - And hem_width = 37cm (fixed constant)
   - And seam_allowance = 1cm (auto-added, not user-configurable)

4. **Armhole Curve** — 1/4 ellipse arc
   - Given bodice calculations
   - When rendering armhole curve
   - Then semi_major_axis = armhole_drop, semi_minor_axis = bust_width
   - And SVG uses `A` (arc) command: `A semi_major semi_minor 0 0 1 end_x end_y`

5. **Sleeve Generation** — 1/2 ellipse arc cap
   - Given 10 measurements
   - When generating sleeve piece
   - Then cap_height = vong_nach / 2 - 1
   - And bicep_width = vong_bap_tay / 2 + 2.5
   - And wrist_width derived from vong_co_tay
   - And sleeve length = do_dai_tay
   - And SVG cap curve uses `A` arc command for half-ellipse

6. **Get Session Detail API** — `GET /api/v1/patterns/sessions/{id}`
   - Given a pattern_session exists for the authenticated user's tenant
   - When Owner or Tailor sends GET request
   - Then returns PatternSessionResponse with all measurements, status, and nested pieces (if generated)
   - And 404 if session not found or wrong tenant

7. **Measurement Validation Before Generation** (FR99)
   - Given measurements outside min/max ranges (defined in PatternSessionCreate schema)
   - When generate endpoint is called
   - Then return 422 with Vietnamese-language error messages specifying acceptable range
   - Example: "Vòng ngực phải từ 50 đến 180 cm"

8. **Geometric Precision** (NFR6)
   - Given formula outputs
   - When comparing to tailor-validated reference patterns
   - Then geometric deviation < 1mm (absolute ΔG ≤ 1mm)
   - And SVG coordinates maintain ±0.5mm accuracy at 1:1 scale

## Tasks / Subtasks

- [x] Task 1: Create `backend/src/patterns/` module (AC: #3, #4, #5)
  - [x] 1.1 Create `backend/src/patterns/__init__.py`
  - [x] 1.2 Create `backend/src/patterns/formulas.py` — deterministic bodice/sleeve formulas
    - `generate_bodice(measurements, offset=0) → dict` with bust_width, waist_width, hip_width, armhole_drop, neck_depth, hem_width, seam_allowance
    - `generate_sleeve(measurements) → dict` with cap_height, bicep_width, wrist_width, sleeve_length
    - All measurements as Decimal input, float output for SVG coordinate math
  - [x] 1.3 Create `backend/src/patterns/svg_export.py` — SVG rendering from geometry params
    - `render_bodice_svg(params, piece_type) → str` — generates SVG markup with `A` arc commands
    - `render_sleeve_svg(params) → str` — generates sleeve SVG with half-ellipse cap
    - SVG viewBox in cm, 1:1 scale, <50KB per piece
  - [x] 1.4 Create `backend/src/patterns/engine.py` — orchestrator
    - `generate_pattern_pieces(measurements) → list[PieceResult]` — calls formulas + svg_export for all 3 pieces
    - Returns list of (piece_type, svg_data, geometry_params) tuples

- [x] Task 2: Create `backend/src/services/pattern_service.py` (AC: #1, #2, #6, #7)
  - [x] 2.1 `create_session(db, data: PatternSessionCreate, user, tenant_id) → PatternSessionResponse`
    - Create PatternSessionDB with status="draft"
    - Validate customer_id belongs to tenant
    - Return 201 with session data
  - [x] 2.2 `generate_patterns(db, session_id, user, tenant_id) → PatternSessionResponse`
    - Load session, verify status="draft" and tenant ownership
    - Call engine.generate_pattern_pieces() with session measurements
    - Create 3 PatternPieceDB records (front_bodice, back_bodice, sleeve)
    - Update session status to "completed"
    - Return session with eager-loaded pieces
  - [x] 2.3 `get_session(db, session_id, tenant_id) → PatternSessionResponse`
    - selectinload(PatternSessionDB.pieces) for eager loading
    - 404 if not found or wrong tenant

- [x] Task 3: Create `backend/src/api/v1/patterns.py` router (AC: #1, #2, #6)
  - [x] 3.1 `POST /api/v1/patterns/sessions` — OwnerOnly auth, calls create_session
  - [x] 3.2 `POST /api/v1/patterns/sessions/{id}/generate` — OwnerOnly auth, calls generate_patterns
  - [x] 3.3 `GET /api/v1/patterns/sessions/{id}` — OwnerOrTailor auth, calls get_session
  - [x] 3.4 Register router in `backend/src/main.py`

- [x] Task 4: Unit tests `backend/tests/test_11_2_pattern_engine.py` (AC: #3, #4, #5, #8)
  - [x] 4.1 Test formulas.generate_bodice() with known measurement sets
  - [x] 4.2 Test formulas.generate_sleeve() with known measurement sets
  - [x] 4.3 Test SVG output contains correct `A` arc commands
  - [x] 4.4 Test engine.generate_pattern_pieces() returns exactly 3 pieces
  - [x] 4.5 Test geometric precision: verify calculated coordinates against reference values (ΔG ≤ 1mm)

- [x] Task 5: Integration tests (AC: #1, #2, #6, #7)
  - [x] 5.1 Test POST /sessions creates draft session with correct data
  - [x] 5.2 Test POST /sessions/{id}/generate produces 3 pieces and status="completed"
  - [x] 5.3 Test GET /sessions/{id} returns session with pieces
  - [x] 5.4 Test 422 response for invalid measurements with Vietnamese error messages
  - [x] 5.5 Test tenant isolation — cannot access other tenant's sessions
  - [x] 5.6 Test auth — Tailor can GET but cannot POST create/generate

## Dev Notes

### Architecture Compliance

**CRITICAL: Pattern Engine is COMPLETELY INDEPENDENT from AI Bespoke Engine (Epics 7-9)**
- Module path: `backend/src/patterns/` — does NOT import from `geometry/` or `agents/`
- Deterministic formulas only — no AI/LLM, no randomness, standard CPU
- Response time target: <50ms for 3 pieces generation

### Formula Reference (from brainstorming session, tailor-validated)

```
# Front/Back Bodice (DRY — single function, offset parameter)
generate_bodice(measurements, offset=0):
    bust_width     = vong_nguc / 4
    waist_width    = (vong_eo / 4) + offset    # offset=0 back, -1 front
    hip_width      = vong_mong / 4
    armhole_drop   = vong_nach / 12
    neck_depth     = vong_co / 16
    hem_width      = 37                         # fixed constant (cm)
    seam_allowance = 1                          # auto-added (cm)

# Armhole Curve — 1/4 ellipse arc
    SVG: A {armhole_drop} {bust_width} 0 0 1 {end_x} {end_y}

# Sleeve
generate_sleeve(measurements):
    cap_height  = vong_nach / 2 - 1
    bicep_width = vong_bap_tay / 2 + 2.5
    wrist_width = vong_co_tay / 2 + 1           # derive from wrist circumference
    length      = do_dai_tay

# Sleeve Cap — 1/2 ellipse arc
    SVG: A {cap_height} {bicep_width} 0 1 0 {end_x} {end_y}
```

### Existing Code to Reuse (from Story 11.1)

| Artifact | Path | What's Done |
|----------|------|-------------|
| Migration | `backend/migrations/030_pattern_tables.sql` | Tables: pattern_sessions, pattern_pieces, orders.pattern_session_id |
| ORM Models | `backend/src/models/db_models.py` (lines 890-960) | PatternSessionDB, PatternPieceDB with relationships |
| Pydantic Schemas | `backend/src/models/pattern.py` | PatternSessionCreate (with min/max validation), PatternSessionResponse, PatternPieceResponse, GeometryParams, PieceType enum |

**DO NOT recreate these — import and use directly.**

### Service Layer Conventions (match existing patterns)

- All functions are `async` with `AsyncSession` parameter
- Use `selectinload()` for eager loading relationships (e.g., `selectinload(PatternSessionDB.pieces)`)
- Use `await db.flush()` before commit to get generated IDs
- Use `model_validate()` for ORM → Pydantic conversion
- Raise `HTTPException` with detail dict for errors: `{"code": "ERR_CODE", "message": "Vietnamese message"}`
- All queries MUST filter by `tenant_id` for multi-tenant isolation

### API Router Conventions (match existing patterns)

- Response wrapper: `{"data": result.model_dump(mode="json"), "meta": {}}`
- Auth dependencies from `src.api.dependencies`: `OwnerOnly`, `OwnerOrTailor`, `TenantId`
- DB session: `db: AsyncSession = Depends(get_db)` from `src.core.database`
- POST create returns `status_code=status.HTTP_201_CREATED`
- Router prefix: `/api/v1/patterns`
- Tags: `["patterns"]`
- **Register router in `backend/src/main.py`** — follow existing include_router pattern

### SVG Generation Notes

- SVG viewBox units in centimeters (1:1 scale)
- Use `<path>` elements with `M` (moveto), `L` (lineto), `A` (arc) commands
- Closed paths: end with `Z` command
- Each piece is standalone SVG document with proper xmlns
- Target: <50KB per piece SVG markup
- Precision: coordinates to 1 decimal place (0.1mm)

### Error Messages — Vietnamese Tailoring Terminology

```python
# Measurement validation errors (FR99)
"Vòng ngực phải từ 50 đến 180 cm"
"Vòng eo phải từ 40 đến 160 cm"
"Độ dài áo phải từ 30 đến 200 cm"

# Business logic errors
"Phiên thiết kế không tìm thấy"                    # 404: session not found
"Phiên thiết kế đã hoàn thành, không thể tạo lại"  # 409: already generated
"Khách hàng không thuộc cửa hàng này"              # 403: wrong tenant customer
```

### File Structure to Create

```
backend/src/patterns/           # NEW module
├── __init__.py
├── engine.py                   # Orchestrator: measurements → 3 pieces
├── formulas.py                 # Deterministic math (bodice, sleeve)
└── svg_export.py               # SVG rendering from geometry params
                                # NOTE: gcode_export.py is Story 11.3

backend/src/services/
└── pattern_service.py          # NEW service (async, tenant-isolated)

backend/src/api/v1/
└── patterns.py                 # NEW router (3 endpoints for 11.2)

backend/tests/
└── test_11_2_pattern_engine.py # NEW tests
```

### What NOT to Build (out of scope for 11.2)

- **G-code export** → Story 11.3
- **Batch export (zip)** → Story 11.3
- **Export single piece API** → Story 11.3
- **Attach pattern to order API** → Story 11.6
- **Frontend components** → Stories 11.4, 11.5, 11.6
- **gcode_export.py** → Story 11.3

### Project Structure Notes

- Pattern engine module at `backend/src/patterns/` is architecturally independent — no imports from `geometry/`, `agents/`, or `constraints/`
- Service file at `backend/src/services/pattern_service.py` follows same flat structure as existing services (order_service.py, notification_creator.py, etc.)
- API router at `backend/src/api/v1/patterns.py` follows same versioned structure as orders.py, customers.py

### Previous Story Intelligence (11.1)

- ORM models use `Numeric(5, 1)` for measurements — when reading from DB, values come as `Decimal`
- Convert `Decimal` → `float` before formula math to avoid precision issues with division
- PatternSessionDB.customer_id references `customer_profiles` table (not `customers`)
- GeometryParams Pydantic model already defines the JSONB structure — use it when storing geometry_params
- PieceType enum: `front_bodice`, `back_bodice`, `sleeve` — match exactly when creating PatternPieceDB

### Git Intelligence

Recent commits show:
- Consistent use of SQLAlchemy async patterns
- All services follow the same dependency injection pattern
- Router registration in main.py uses `app.include_router(router)` pattern
- Tests use pytest with async fixtures

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 11, Story 11.2]
- [Source: _bmad-output/planning-artifacts/architecture.md — Technical Pattern Engine section]
- [Source: _bmad-output/planning-artifacts/sprint-change-proposal-2026-04-03.md — Epic 11 specification]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md — FR91-FR99]
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements-nfrs.md — NFR6]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — UX-DR11, UX-DR12]
- [Source: _bmad-output/implementation-artifacts/11-1-db-migration-pattern-data-model.md — Previous story]
- [Source: _bmad-output/project-context.md — Implementation rules]
- [Source: backend/src/models/pattern.py — Existing Pydantic schemas]
- [Source: backend/src/models/db_models.py:890-960 — Existing ORM models]
- [Source: backend/src/services/order_service.py — Service layer reference pattern]
- [Source: backend/src/api/v1/orders.py — API router reference pattern]

## Dev Agent Record

### Agent Model Used
Gemini (Antigravity) — 2026-04-03

### Debug Log References
- Fixed MissingGreenlet in `create_session`: replaced `db.refresh()` with explicit selectinload query after commit
- Fixed MissingGreenlet in `generate_patterns`: replaced reload-after-commit with in-memory response construction from `piece_db_list` (tracked before flush)
- `test_lead_conversion_service.py` pre-existing import error unrelated to Story 11.2

### Completion Notes List
- ✅ Task 1: `backend/src/patterns/` module created (4 files: __init__.py, formulas.py, svg_export.py, engine.py)
- ✅ Task 2: `backend/src/services/pattern_service.py` — create_session, generate_patterns, get_session
- ✅ Task 3: `backend/src/api/v1/patterns.py` — 3 endpoints + registered in main.py
- ✅ Task 4: 39 unit tests in `test_11_2_pattern_engine.py` — all PASSED (0.06s)
- ✅ Task 5: 27 integration tests in `test_11_2_pattern_api.py` — all PASSED (2.22s)
- ✅ Regression: 970 tests pass (14 pre-existing failures + 87 pre-existing errors unrelated to this story)
- ✅ AC #3: DRY bodice architecture (generate_bodice with offset=-1/0)
- ✅ AC #4: Armhole 1/4 ellipse arc using `A` command
- ✅ AC #5: Sleeve 1/2 ellipse arc cap using `A` command
- ✅ AC #8: ΔG ≤ 1mm geometric precision — all parametric tests pass

### File List
- backend/src/patterns/__init__.py (new)
- backend/src/patterns/formulas.py (new)
- backend/src/patterns/svg_export.py (new)
- backend/src/patterns/engine.py (new)
- backend/src/services/pattern_service.py (new)
- backend/src/api/v1/patterns.py (new)
- backend/src/main.py (modified — import + include_router)
- backend/tests/test_11_2_pattern_engine.py (new)
- backend/tests/test_11_2_pattern_api.py (new)

### Change Log
- 2026-04-03: Story 11.2 implemented — Pattern Engine Core API (formulas, SVG export, service, router, 66 tests)
