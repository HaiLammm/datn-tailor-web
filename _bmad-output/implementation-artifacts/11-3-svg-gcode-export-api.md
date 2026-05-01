# Story 11.3: SVG & G-code Export API

Status: completed

## Story

As an Owner or Tailor,
I want to export generated pattern pieces as SVG files for printing or G-code files for laser cutting,
so that I can produce physical patterns with industrial precision for actual garment construction.

## Acceptance Criteria

1. **Export Single Piece SVG** — `GET /api/v1/patterns/pieces/{id}/export?format=svg`
   - Given a generated pattern piece exists in the database
   - When Owner or Tailor sends GET request with `format=svg`
   - Then system returns the svg_data as `Content-Type: image/svg+xml`
   - And `Content-Disposition: attachment; filename="{piece_type}.svg"`
   - And SVG maintains 1:1 scale (FR94: ±0.5mm tolerance)

2. **Export Single Piece G-code** — `GET /api/v1/patterns/pieces/{id}/export?format=gcode&speed=X&power=Y`
   - Given a generated pattern piece exists in the database
   - When Owner or Tailor sends GET request with `format=gcode` and laser params
   - Then system converts SVG path data to G-code commands
   - And G-code includes: closed paths, cut sequence, origin point, configurable speed/power (FR95)
   - And `Content-Type: text/plain` with `.gcode` extension
   - And speed defaults to 1000 mm/min, power defaults to 80%

3. **Batch Export Session SVG** — `GET /api/v1/patterns/sessions/{id}/export?format=svg`
   - Given a completed pattern session with 3 generated pieces
   - When Owner or Tailor sends GET request with `format=svg`
   - Then system creates a ZIP archive containing all 3 SVG files
   - And `Content-Type: application/zip` with filename `session_{id}_svg.zip`
   - And each file is named `{piece_type}.svg`

4. **Batch Export Session G-code** — `GET /api/v1/patterns/sessions/{id}/export?format=gcode&speed=X&power=Y`
   - Given a completed pattern session with 3 generated pieces
   - When Owner or Tailor sends GET request with `format=gcode`
   - Then system creates a ZIP archive containing all 3 G-code files
   - And G-code uses provided speed/power params (or defaults)
   - And `Content-Type: application/zip` with filename `session_{id}_gcode.zip`
   - And each file is named `{piece_type}.gcode`

5. **G-code Generation Requirements** (FR95 compliance)
   - G-code output follows standard laser cutter dialect (G0/G1 commands)
   - Closed paths: path ends at same coordinate as start (returns to origin after cut)
   - Cut sequence: header → move to start → cutting passes → end sequence
   - Origin point: top-left corner (0,0) of the piece bounding box
   - Speed parameter: `F{speed}` command in mm/min
   - Power parameter: `S{power}` command (0-100 scale converted to 0-255 PWM)
   - Comments for piece identification and cut order

6. **Tenant Isolation & Auth**
   - Both endpoints require OwnerOrTailor authentication
   - Piece must belong to a session owned by user's tenant
   - Return 404 if piece/session not found or belongs to different tenant
   - Return 404 if session status is "draft" (no pieces generated yet)

7. **Query Parameter Validation**
   - `format` is required, must be `svg` or `gcode` — return 422 otherwise
   - `speed` (optional, gcode only): must be positive integer, default 1000
   - `power` (optional, gcode only): must be 0-100 integer, default 80
   - Invalid params return 422 with descriptive Vietnamese error message

## Tasks / Subtasks

- [x] Task 1: Create `backend/src/patterns/gcode_export.py` (AC: #2, #5)
  - [x] 1.1 Implement `parse_svg_path(svg_data: str) -> list[tuple]` — parse SVG path `d` attribute into coordinates
  - [x] 1.2 Implement `generate_gcode(coordinates: list, speed: int, power: int, piece_type: str) -> str`
    - Header comments (piece_type, timestamp, params)
    - G90 absolute positioning, G21 metric units
    - Move to start (G0 X0 Y0)
    - Cutting pass (G1 with F{speed} S{power_pwm})
    - End sequence (M5 laser off, G0 X0 Y0 return home)
  - [x] 1.3 Implement `svg_to_gcode(svg_data: str, speed: int = 1000, power: int = 80, piece_type: str = "") -> str`
    - Wrapper that calls parse + generate

- [x] Task 2: Create export functions in `backend/src/services/pattern_service.py` (AC: #1, #2, #3, #4, #6)
  - [x] 2.1 `get_piece_for_export(db, piece_id, tenant_id) -> PatternPieceDB`
    - Load piece with session eager-loaded
    - Verify session.tenant_id matches
    - Verify session.status != "draft"
    - Return piece or raise 404
  - [x] 2.2 `get_session_pieces_for_export(db, session_id, tenant_id) -> list[PatternPieceDB]`
    - Load session with pieces eager-loaded
    - Verify tenant_id matches
    - Verify status == "completed" or "exported"
    - Return pieces list or raise 404
  - [x] 2.3 `create_svg_zip(pieces: list[PatternPieceDB]) -> bytes`
    - Use `zipfile` to create in-memory ZIP
    - Add each piece as `{piece_type}.svg`
  - [x] 2.4 `create_gcode_zip(pieces: list[PatternPieceDB], speed: int, power: int) -> bytes`
    - Convert each piece SVG to G-code
    - Create ZIP with `{piece_type}.gcode` files

- [x] Task 3: Add export endpoints to `backend/src/api/v1/patterns.py` (AC: #1, #2, #3, #4, #7)
  - [x] 3.1 Add Pydantic models for query params: `ExportFormat` enum, `ExportParams` model
  - [x] 3.2 `GET /api/v1/patterns/pieces/{id}/export` — single piece export
    - Return StreamingResponse with appropriate content-type
    - Handle svg vs gcode format
  - [x] 3.3 `GET /api/v1/patterns/sessions/{id}/export` — batch export
    - Return StreamingResponse with ZIP content
    - Handle svg vs gcode format

- [x] Task 4: Unit tests `backend/tests/test_11_3_gcode_export.py` (AC: #5)
  - [x] 4.1 Test SVG path parsing extracts correct coordinates
  - [x] 4.2 Test G-code output format matches laser cutter requirements
  - [x] 4.3 Test closed path: end coordinate equals start coordinate
  - [x] 4.4 Test speed/power parameter embedding
  - [x] 4.5 Test default values when params not provided

- [x] Task 5: Integration tests `backend/tests/test_11_3_export_api.py` (AC: #1, #2, #3, #4, #6, #7)
  - [x] 5.1 Test single piece SVG export returns correct content-type and attachment header
  - [x] 5.2 Test single piece G-code export with custom speed/power
  - [x] 5.3 Test batch SVG export creates valid ZIP with 3 files
  - [x] 5.4 Test batch G-code export creates valid ZIP with 3 files
  - [x] 5.5 Test 404 for piece from different tenant
  - [x] 5.6 Test 404 for draft session (no pieces yet)
  - [x] 5.7 Test 422 for invalid format parameter
  - [x] 5.8 Test 422 for invalid speed/power values
  - [x] 5.9 Test auth — Customer cannot access export endpoints

## Dev Notes

### Architecture Compliance

**CRITICAL: Story 11.3 continues Pattern Engine module (independent from AI Bespoke Engine)**
- Module path: `backend/src/patterns/` — adds `gcode_export.py`
- No imports from `geometry/`, `agents/`, or `constraints/`
- Deterministic export — no AI/LLM involved

### G-code Specification (FR95 Compliance)

```gcode
; Pattern Piece: front_bodice
; Generated: 2026-04-03T12:00:00
; Speed: 1000 mm/min, Power: 80%
G90          ; Absolute positioning
G21          ; Metric units (mm)
G0 X0 Y0     ; Move to origin (no cut)
M3 S204      ; Laser on (80% = 204/255 PWM)
G1 X100 Y0 F1000   ; Cut to first point
G1 X100 Y200       ; Continue cutting path
...
G1 X0 Y0           ; Close path (return to start)
M5                 ; Laser off
G0 X0 Y0           ; Return home
; End of piece
```

**Key G-code Commands:**
- `G90`: Absolute positioning mode
- `G21`: Metric units (millimeters)
- `G0 X Y`: Rapid move (no cutting)
- `G1 X Y F{speed}`: Linear cut at feedrate
- `M3 S{pwm}`: Laser on with power (0-255 PWM)
- `M5`: Laser off
- `;`: Comment line

**PWM Conversion:** `power_percent * 255 / 100 = power_pwm` (e.g., 80% → 204)

### SVG Path Parsing

Story 11.2 generates SVG with this path structure:
```xml
<path id="front_bodice" d="M 0.0 0.0 L 25.0 2.3 A 3.5 22.5 0 0 1 26.0 5.8 L ..." fill="none" stroke="#000" stroke-width="0.1"/>
```

Parsing strategy:
1. Extract `d` attribute from `<path>` element (regex or xml.etree)
2. Tokenize: `M`, `L`, `A`, `Z` commands with coordinate pairs
3. Convert `A` (arc) commands to line approximation (polyline) for G-code compatibility
4. Scale: SVG uses cm, G-code uses mm → multiply coordinates by 10

### Existing Code to Reuse (from Story 11.1 & 11.2)

| Artifact | Path | What's Available |
|----------|------|------------------|
| ORM Models | `backend/src/models/db_models.py` | PatternSessionDB, PatternPieceDB |
| Pydantic Schemas | `backend/src/models/pattern.py` | PatternPieceResponse, PieceType enum |
| Service Layer | `backend/src/services/pattern_service.py` | get_session() pattern |
| Router | `backend/src/api/v1/patterns.py` | Existing 3 endpoints to extend |
| SVG Rendering | `backend/src/patterns/svg_export.py` | render_bodice_svg(), render_sleeve_svg() |
| Engine | `backend/src/patterns/engine.py` | PieceResult dataclass |

**DO NOT recreate these — import and extend.**

### Service Layer Conventions (match existing patterns)

- All functions are `async` with `AsyncSession` parameter
- Use `selectinload()` for eager loading relationships
- Raise `HTTPException` with detail dict: `{"code": "ERR_CODE", "message": "Vietnamese message"}`
- All queries MUST filter by `tenant_id` for multi-tenant isolation

### API Router Conventions (match existing patterns)

- Response types: `StreamingResponse` for file downloads (not JSON wrapper)
- Auth dependencies: `OwnerOrTailor` from `src.api.dependencies`
- DB session: `db: AsyncSession = Depends(get_db)`
- Router prefix: `/api/v1/patterns` (already registered)
- Tags: `["patterns"]`

### File Response Headers

```python
# SVG single file
return StreamingResponse(
    content=svg_data,
    media_type="image/svg+xml",
    headers={"Content-Disposition": f'attachment; filename="{piece_type}.svg"'}
)

# G-code single file
return StreamingResponse(
    content=gcode_data,
    media_type="text/plain",
    headers={"Content-Disposition": f'attachment; filename="{piece_type}.gcode"'}
)

# ZIP batch
return StreamingResponse(
    content=zip_bytes,
    media_type="application/zip",
    headers={"Content-Disposition": f'attachment; filename="session_{session_id}_{format}.zip"'}
)
```

### Error Messages — Vietnamese Tailoring Terminology

```python
# Export validation errors (AC #7)
"Định dạng xuất không hợp lệ. Chọn 'svg' hoặc 'gcode'"    # 422: invalid format
"Tốc độ cắt phải là số dương (mm/phút)"                   # 422: invalid speed
"Công suất laser phải từ 0 đến 100 (%)"                    # 422: invalid power

# Business logic errors
"Mảnh rập không tìm thấy"                                  # 404: piece not found
"Phiên thiết kế chưa hoàn thành, không có mẫu để xuất"    # 404: draft session
```

### File Structure Changes

```
backend/src/patterns/
├── __init__.py
├── engine.py                   # Existing (11.2)
├── formulas.py                 # Existing (11.2)
├── svg_export.py               # Existing (11.2)
└── gcode_export.py             # NEW (11.3)

backend/src/services/
└── pattern_service.py          # MODIFY — add export functions

backend/src/api/v1/
└── patterns.py                 # MODIFY — add 2 export endpoints

backend/tests/
├── test_11_3_gcode_export.py   # NEW — unit tests
└── test_11_3_export_api.py     # NEW — integration tests
```

### What NOT to Build (out of scope for 11.3)

- **Frontend components** → Stories 11.4, 11.5, 11.6
- **Pattern-order attachment** → Story 11.6
- **Session status update to "exported"** → deferred (nice-to-have)
- **DXF export format** → deferred (future enhancement)

### Previous Story Intelligence (11.2)

- SVG path uses `<path>` element with `d` attribute containing M/L/A/Z commands
- SVG viewBox is in centimeters (1:1 scale)
- Coordinates are rounded to 1 decimal place (0.1mm precision)
- PatternPieceDB.svg_data contains full standalone SVG markup
- Session status transitions: `draft` → `completed` → `exported`
- Pattern pieces stored directly in DB (TEXT column, <50KB each)

### Arc to Polyline Conversion (G-code compatibility)

Most laser cutters don't support arc commands (G2/G3). Convert SVG `A` arcs to polyline:

```python
def arc_to_polyline(rx, ry, x_start, y_start, x_end, y_end, num_segments=20):
    """Convert elliptical arc to line segments for G-code."""
    # Approximate arc with 20 line segments
    points = []
    for i in range(num_segments + 1):
        t = i / num_segments
        # Parametric ellipse interpolation
        x = (1 - t) * x_start + t * x_end  # simplified for MVP
        y = (1 - t) * y_start + t * y_end
        points.append((x, y))
    return points
```

### Project Structure Notes

- Export endpoints extend existing `/api/v1/patterns` router — no new router needed
- G-code export module at `backend/src/patterns/gcode_export.py` follows same flat structure
- ZIP creation uses Python stdlib `zipfile` — no external dependencies
- StreamingResponse from `starlette.responses` (already available via FastAPI)

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 11, FR94, FR95]
- [Source: _bmad-output/planning-artifacts/architecture.md — Pattern Engine section, Export Pipeline]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md — FR94, FR95]
- [Source: _bmad-output/implementation-artifacts/11-2-pattern-engine-core-api.md — Previous story]
- [Source: backend/src/patterns/svg_export.py — SVG rendering patterns]
- [Source: backend/src/api/v1/patterns.py — Existing router structure]
- [Source: backend/src/services/pattern_service.py — Service layer patterns]
- [Source: _bmad-output/project-context.md — Implementation rules]

## Dev Agent Record

### Agent Model Used

claude-opus-4.5 (via github-copilot)

### Debug Log References

No debug issues encountered.

### Completion Notes List

- All 7 acceptance criteria implemented and tested
- G-code generation follows FR95 specification (G0/G1 commands, M3/M5 laser control, PWM power conversion)
- SVG to mm conversion: coordinates multiplied by 10 (cm to mm)
- Arc (A) commands converted to polyline for laser cutter compatibility
- 29 unit tests + 36 integration tests = 65 tests total, all passing
- Tenant isolation and role-based access control (OwnerOrTailor) enforced
- Vietnamese error messages for validation failures

### File List

**Created:**
- `backend/src/patterns/gcode_export.py` — G-code conversion module (parse_svg_path, generate_gcode, svg_to_gcode)
- `backend/tests/test_11_3_gcode_export.py` — 29 unit tests
- `backend/tests/test_11_3_export_api.py` — 36 integration tests

**Modified:**
- `backend/src/services/pattern_service.py` — Added 4 export functions
- `backend/src/api/v1/patterns.py` — Added 2 export endpoints + ExportFormat enum
