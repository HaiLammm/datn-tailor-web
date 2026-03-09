# Story 4.4: Xuat Ban ve San xuat (Manufacturing Blueprint & DXF/SVG Export)

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a **Tho may (Minh)**,
I want **xuat ban ve ky thuat chi tiet duoi dang SVG hoac DXF**,
so that **toi co the in rap hoac chieu len vai de bat dau cat che tac**.

## Acceptance Criteria

1. **Given** Thiet ke da duoc phe duyet va vuot qua cac Guardrails (design status = "locked")
   **When** Tho Minh nhan "Export for Production" tren Tailor Review page
   **Then** Backend tao file SVG (hien thi truc quan) va file DXF (chuan CAD cho may cat)
   **And** Tra ve file download truc tiep (StreamingResponse)

2. **Given** Ban ve duoc tao thanh cong
   **When** Render noi dung ban ve
   **Then** Ban ve bao gom cac thong so gia giam (+/- cm) chi tiet cho tung vi tri rap
   **And** Su dung 100% thuat ngu chuyen nganh may Viet Nam tren ban ve (NFR11)
   **And** Annotation vi tri: Vong co, Rong vai, Vong nguc, Vong eo, Vong mong, Dai ao, Dai tay, Vong co tay

3. **Given** Thiet ke co vi pham Guardrails chua duoc giai quyet
   **When** Minh nhan "Export for Production"
   **Then** He thong tu choi xuat va hien thi loi (FR10: ngan chan xuat Blueprint neu vi pham Golden Rules)
   **And** Redirect ve Sanity Check Dashboard de review

4. **Given** Nguoi dung co role = Customer
   **When** Truy cap export endpoint
   **Then** He thong tra ve 403 Forbidden (chi Owner va Tailor duoc phep xuat)

5. **Given** File SVG duoc xuat
   **When** Mo file bang trinh duyet hoac phan mem vector
   **Then** Tat ca cac PatternPart duoc hien thi chinh xac (coordinates mm)
   **And** Sai so hinh hoc tuyet doi <= 1mm so voi tinh toan ly thuyet (NFR3)

6. **Given** File DXF duoc xuat
   **When** Mo file bang phan mem CAD (AutoCAD, LibreCAD)
   **Then** Tat ca cac entity (LINE, LWPOLYLINE, SPLINE) hien thi dung
   **And** Annotations bang tieng Viet hien thi chinh xac
   **And** Don vi la mm (millimeters)

## Tasks / Subtasks

- [x] **Task 1: Backend -- Add ezdxf dependency** (AC: #6)
  - [x] 1.1 Add `ezdxf>=1.4.0` to `backend/requirements.txt`
  - [x] 1.2 Verify installation with `pip install -r requirements.txt`

- [x] **Task 2: Backend -- Export Pydantic Models** (AC: #1, #2)
  - [x] 2.1 Create `backend/src/models/export.py` with `ExportRequest`, `ExportFormat` enum, `BlueprintMetadata`
  - [x] 2.2 `ExportFormat` enum: `SVG = "svg"`, `DXF = "dxf"`
  - [x] 2.3 `ExportRequest`: `design_id: UUID`, `format: ExportFormat`

- [x] **Task 3: Backend -- Blueprint Export Service** (AC: #1, #2, #5, #6)
  - [x] 3.1 Create `backend/src/services/export_service.py`
  - [x] 3.2 Implement `generate_svg(master_geometry, overrides, measurements)` -> SVG string
    - Convert `PatternPart.paths` to SVG `<path d="...">` using same logic as `SvgPattern.tsx`
    - Add Vietnamese annotation text elements with +/- cm deltas
    - ViewBox in mm, with proper scaling
  - [x] 3.3 Implement `generate_dxf(master_geometry, overrides, measurements)` -> bytes
    - Use `ezdxf.new(dxfversion="R2010")` for maximum compatibility
    - Convert `Segment` types: line -> `LINE`, curve -> `SPLINE` or `LWPOLYLINE`
    - Add Vietnamese text annotations as `TEXT` entities
    - Set units to mm in DXF header
  - [x] 3.4 Implement `calculate_delta_annotations(base_values, final_values)` -> annotation list
    - Uses `MEASUREMENT_MAPPING` from `designs.py` for Vietnamese labels
    - Calculates +/- cm for each measurement position

- [x] **Task 4: Backend -- Export API Endpoint** (AC: #1, #3, #4)
  - [x] 4.1 Create `backend/src/api/v1/export.py` router
  - [x] 4.2 `POST /api/v1/designs/{design_id}/export` endpoint
    - Auth: `Depends(require_roles("Owner", "Tailor"))`
    - Tenant isolation: `Depends(get_tenant_id_from_user)`
    - Query param: `format: ExportFormat` (default: "svg")
    - Load DesignDB by id + tenant_id
    - Verify design status == "locked"
    - Verify geometry_hash integrity via `compute_master_geometry_hash()`
    - Run guardrail check on locked geometry (reuse `get_registry().run_all()`)
    - If guardrails fail -> 422 with Vietnamese error message
    - Generate SVG or DXF via export_service
    - Return `StreamingResponse` with correct Content-Type and Content-Disposition
  - [x] 4.3 Register router in `backend/src/main.py`

- [x] **Task 5: Frontend -- Export TypeScript Types** (AC: #1)
  - [x] 5.1 Add `ExportFormat`, `ExportResponse` types to `frontend/src/types/geometry.ts`

- [x] **Task 6: Frontend -- Export Server Action** (AC: #1, #3)
  - [x] 6.1 Create `exportBlueprint(designId, format)` in `frontend/src/app/actions/geometry-actions.ts`
    - Follow exact same auth token + error handling pattern as `lockDesign()`
    - Return blob URL for download
    - Handle 403 (unauthorized), 404 (design not found), 422 (guardrails failed) with Vietnamese messages

- [x] **Task 7: Frontend -- Export Button UI on Tailor Review Page** (AC: #1, #3)
  - [x] 7.1 Create `frontend/src/components/client/design/ExportBlueprintButton.tsx`
    - Two buttons: "Xuat SVG" and "Xuat DXF"
    - Heritage Gold primary style for main export action
    - Loading state during export generation
    - Error display for guardrail failures (redirect to Sanity Check)
    - Success: trigger browser download
  - [x] 7.2 Export from `frontend/src/components/client/design/index.ts`
  - [x] 7.3 Integrate in `frontend/src/app/(workplace)/tailor/review/page.tsx`
    - Show ExportBlueprintButton only for locked designs
    - Pass design_id prop

- [x] **Task 8: Tests** (AC: #1-#6)
  - [x] 8.1 `backend/tests/test_export_api.py` -- API endpoint tests
    - Test successful SVG export (200 + correct Content-Type)
    - Test successful DXF export (200 + correct Content-Type)
    - Test export with unlocked design -> 422
    - Test export with guardrail violations -> 422
    - Test Customer role -> 403
    - Test design not found -> 404
    - Test tenant isolation (cannot export other tenant's design)
  - [x] 8.2 `backend/tests/test_export_service.py` -- Unit tests for export logic
    - Test SVG generation produces valid XML
    - Test DXF generation produces valid DXF (parseable by ezdxf)
    - Test Vietnamese annotations present in output
    - Test +/- cm delta calculations accuracy
    - Test coordinate precision <= 1mm (NFR3)
  - [x] 8.3 `frontend/src/__tests__/exportBlueprint.test.tsx` -- Component tests
    - Test ExportBlueprintButton renders for locked design
    - Test loading state during export
    - Test error display on guardrail failure
    - Test download trigger on success

## Dev Notes

### Architecture Compliance

**Authoritative Server Pattern (CRITICAL):**
- Backend generates ALL export files (SVG/DXF). Frontend MUST NOT generate export files client-side.
- Backend reconstructs final geometry from `LockedDesign` (base + deltas + overrides) before export.
- Frontend only triggers the export request and handles the file download.

**Geometry Integrity Check (FR10):**
- Before export, verify `geometry_hash` matches the stored design using `compute_master_geometry_hash()` from `backend/src/core/hashing.py`.
- Run guardrail check (`get_registry().run_all()`) on the locked design's geometry. If ANY hard constraint fails, block export with 422.

**RBAC (Owner + Tailor only):**
- Use `Depends(require_roles("Owner", "Tailor"))` from `backend/src/api/dependencies.py`.
- Customer role MUST get 403 on export endpoints.
- Use `Depends(get_tenant_id_from_user)` for tenant isolation on all queries.

### Existing Code to Reuse (DO NOT Reinvent)

1. **`backend/src/geometry/engine.py` (`GeometryEngine`):**
   The `compute_target_geometry()` method can reconstruct final geometry from base + style deltas. Use this to get the final `MasterGeometry` for export.

2. **`backend/src/models/geometry.py` (`MasterGeometry`, `PatternPart`, `Path`, `Segment`, `Point`):**
   These Pydantic models define the geometry structure. The export service converts these to SVG/DXF format.

3. **`frontend/src/components/client/design/SvgPattern.tsx` (SVG path rendering logic):**
   Contains the segment-to-SVG-path-d conversion algorithm. The backend SVG generator MUST replicate this exact logic:
   - `move` -> `M x y`
   - `line` -> `L x y`
   - `curve` with cp2 -> `C cp1.x cp1.y, cp2.x cp2.y, to.x to.y` (cubic bezier)
   - `curve` without cp2 -> `Q cp1.x cp1.y, to.x to.y` (quadratic bezier)
   - `closed` -> append `Z`

4. **`backend/src/api/v1/designs.py` (`MEASUREMENT_MAPPING`, `BASE_PATTERN_VALUES`):**
   Vietnamese label mapping and base pattern values for calculating +/- cm annotations.

5. **`backend/src/api/v1/guardrails.py` (`get_registry()`):**
   Reuse the frozen constraint registry for pre-export guardrail validation.

6. **`backend/src/api/dependencies.py` (`require_roles`, `get_tenant_id_from_user`, `get_current_user_from_token`):**
   Pre-built RBAC dependencies. Use directly on export endpoints.

7. **`backend/src/core/hashing.py` (`compute_master_geometry_hash()`):**
   Verify geometry integrity before export.

8. **`backend/src/models/db_models.py` (`DesignDB`):**
   The design table with `master_geometry` JSON column, `geometry_hash`, `status`, `tenant_id`. Query by `id + tenant_id`.

9. **`frontend/src/app/actions/geometry-actions.ts` (server action patterns):**
   Follow exact same auth token forwarding, AbortController timeout, and error handling pattern.

### Technical Requirements

**SVG Export:**
- Standalone SVG file with `xmlns="http://www.w3.org/2000/svg"`
- ViewBox calculated from geometry bounds (mm units)
- Each `PatternPart` rendered as `<g>` group with `id="{part_id}"`
- Each `Path` rendered as `<path d="...">` with fill/stroke from model
- Annotation `<text>` elements positioned near each measurement point
- Vietnamese labels from `MEASUREMENT_MAPPING` (e.g., "Vong nguc: +2.0 cm")
- Font: system default, size proportional to pattern scale
- Include metadata: design_id, export timestamp, geometry_hash

**DXF Export:**
- Use `ezdxf>=1.4.0` library (MIT License, Production-Stable)
- DXF version: R2010 for wide CAD software compatibility
- Create separate layers for: pattern outlines, annotations, measurements
- Convert segments: `line` -> `LINE` entity, `curve` -> `SPLINE` entity
- Vietnamese text as `TEXT` entities on annotation layer
- Units: mm (set `$INSUNITS = 4` in DXF header)
- Include delta annotations as text at measurement positions

**API Response:**
- SVG: `Content-Type: image/svg+xml`, filename: `blueprint-{design_id}.svg`
- DXF: `Content-Type: application/dxf`, filename: `blueprint-{design_id}.dxf`
- Use `StreamingResponse` from FastAPI for efficient file delivery
- `Content-Disposition: attachment; filename="blueprint-{design_id}.{ext}"`

### Vietnamese Measurement Labels (NFR11)

All labels on the exported blueprint MUST use Vietnamese tailoring terminology:
```
vong_co    -> "Vong co"       (Neck circumference)
rong_vai   -> "Rong vai"      (Shoulder width)
vong_nguc  -> "Vong nguc"     (Bust circumference)
vong_eo    -> "Vong eo"       (Waist circumference)
vong_mong  -> "Vong mong"     (Hip circumference)
dai_ao     -> "Dai ao"        (Top length)
dai_tay    -> "Dai tay"       (Sleeve length)
vong_co_tay -> "Vong co tay"  (Wrist circumference)
```

Delta format on blueprint: `{label_vi}: {sign}{delta_cm} cm` (e.g., "Vong nguc: +2.0 cm")

### Library & Framework Requirements

**New dependency:**
- `ezdxf>=1.4.0` (latest stable: 1.4.3, released Oct 2025)
  - MIT License, Production-Stable
  - Supports Python >= 3.10 (project uses 3.11+)
  - Core dependencies: typing_extensions, pyparsing, numpy, fontTools
  - DO NOT install optional `[draw]` extras (not needed for file generation)
  - Key API: `ezdxf.new()`, `doc.modelspace()`, `msp.add_line()`, `msp.add_text()`, `doc.saveas()`

**Existing dependencies used:**
- `fastapi` (StreamingResponse for file download)
- `sqlalchemy` (async DB queries for DesignDB)
- `pydantic` (export models)

### File Structure Requirements

**Files to create:**
```
backend/src/models/export.py                    -- Export Pydantic models (ExportFormat, ExportRequest, BlueprintMetadata)
backend/src/services/export_service.py          -- SVG/DXF generation logic
backend/src/api/v1/export.py                    -- Export API router (/api/v1/designs/{id}/export)
backend/tests/test_export_api.py                -- API endpoint tests
backend/tests/test_export_service.py            -- Export service unit tests
frontend/src/components/client/design/ExportBlueprintButton.tsx -- Export button component
frontend/src/__tests__/exportBlueprint.test.tsx  -- Frontend component tests
```

**Files to modify:**
```
backend/requirements.txt                        -- Add ezdxf>=1.4.0
backend/src/main.py                             -- Register export router
frontend/src/types/geometry.ts                  -- Add ExportFormat, ExportResponse types
frontend/src/app/actions/geometry-actions.ts     -- Add exportBlueprint() server action
frontend/src/components/client/design/index.ts  -- Export ExportBlueprintButton
frontend/src/app/(workplace)/tailor/review/page.tsx -- Integrate ExportBlueprintButton
```

**Files NOT to modify:**
- `backend/src/geometry/engine.py` -- Read-only usage, do not modify engine
- `backend/src/constraints/*` -- Constraint engine complete from 4.1a, read-only
- `backend/src/models/geometry.py` -- Existing models sufficient, read-only
- `frontend/src/store/designStore.ts` -- No new store state needed
- `frontend/src/components/client/design/SvgPattern.tsx` -- Reference only, do not modify

### Previous Story Intelligence

**From Story 4.3 (Manual Override & Feedback Loop):**
- Override records stored in `design_overrides` table with `delta_key`, `overridden_value`
- When exporting, MUST merge overrides into the delta annotations
- DesignDB has `overrides` relationship for loading override records
- Override values take precedence over AI-suggested deltas in the annotation display
- Field `flagged_for_learning` is informational only -- no impact on export

**From Story 4.2 (Sanity Check Dashboard):**
- SanityCheckDashboard displays 3-column comparison table
- If export fails due to guardrails, UI should redirect back to this dashboard
- Severity styling (normal/warning/danger) with Heritage Palette colors

**From Story 4.1a (Guardrails Engine):**
- `get_registry().run_all(measurements, deltas)` returns `GuardrailCheckResponse`
- Hard constraints: violations MUST block export (FR10)
- The guardrail check currently blocks Lock Design. Export MUST also integrate guardrails.
- Guardrail check completes in < 50ms (pure computation, no DB queries)

**Code Review Lessons from Story 4.3 (MUST Follow):**
- H1: Never call server actions with empty/placeholder data
- H2: Measurement field names differ between DB (English) and guardrails (Vietnamese) -- always verify mapping
- H3: Import existing types from `@/types/` -- never inline duplicate types
- M1: Use exact key matching for row->constraint mapping (not `includes()`)
- M2: Log auth failures, don't silently return success

### Git Intelligence

**Recent commit patterns:**
- Feature commits use `feat(story-X.Y):` or `feat(epic-X):` prefix
- Fix commits use `fix:` prefix
- Refactor commits use `refactor:` prefix
- Files created follow existing directory structure conventions
- Tests are always co-located with the feature commit

**Key files from recent work (Epic 4):**
- `backend/src/api/v1/overrides.py` -- Most recent router pattern to follow
- `backend/src/models/override.py` -- Most recent Pydantic model pattern
- `backend/tests/test_overrides_api.py` -- Most recent test pattern
- `frontend/src/app/actions/override-actions.ts` -- Most recent server action pattern

### Project Structure Notes

- Alignment with unified project structure: Export backend logic in `services/` (business logic), API in `api/v1/`, models in `models/`
- Frontend: Export button in `components/client/design/` (Client Component), integrated in `app/(workplace)/tailor/review/page.tsx` (Server Page)
- All frontend components under `components/` MUST have `"use client"` directive
- Server Actions in `app/actions/` -- this is where `exportBlueprint()` goes
- TypeScript types in `types/` -- maintain `snake_case` for SSOT JSON fields

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4]
- [Source: _bmad-output/planning-artifacts/epics.md#Epic 4 description]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authoritative Server Pattern]
- [Source: _bmad-output/planning-artifacts/architecture.md#RBAC]
- [Source: _bmad-output/planning-artifacts/architecture.md#Geometry Engine]
- [Source: _bmad-output/planning-artifacts/architecture.md#Manufacturing Standards]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Artisan Flow Step G: Export Blueprint]
- [Source: _bmad-output/planning-artifacts/prd/functional-requirements.md#FR8 FR10 FR15]
- [Source: _bmad-output/planning-artifacts/prd/domain-specific-requirements.md#SVG/DXF Export]
- [Source: _bmad-output/planning-artifacts/prd/technical-project-type-requirements.md#Manufacturing Standards]
- [Source: _bmad-output/planning-artifacts/prd/non-functional-requirements-nfrs.md#NFR3 Geometric Precision]
- [Source: _bmad-output/implementation-artifacts/4-3-ghi-de-phan-hoi-tu-nghe-nhan.md (previous story)]
- [Source: _bmad-output/implementation-artifacts/4-1a-loi-kiem-tra-rang-buoc-vat-ly.md (guardrails engine)]
- [Source: _bmad-output/implementation-artifacts/4-2-bang-doi-soat-ky-thuat-cho-tho-may.md (sanity check dashboard)]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: backend/src/geometry/engine.py (geometry computation)]
- [Source: backend/src/models/geometry.py (MasterGeometry, LockedDesign models)]
- [Source: backend/src/api/v1/designs.py#MEASUREMENT_MAPPING]
- [Source: backend/src/api/v1/designs.py#BASE_PATTERN_VALUES]
- [Source: backend/src/api/v1/guardrails.py#get_registry (constraint registry)]
- [Source: backend/src/api/dependencies.py#require_roles (RBAC)]
- [Source: backend/src/core/hashing.py#compute_master_geometry_hash]
- [Source: backend/src/models/db_models.py#DesignDB]
- [Source: frontend/src/components/client/design/SvgPattern.tsx (SVG path rendering reference)]
- [Source: frontend/src/app/actions/geometry-actions.ts (server action pattern)]
- [Source: frontend/src/app/(workplace)/tailor/review/page.tsx (integration target)]
- [Source: https://pypi.org/project/ezdxf/ (ezdxf v1.4.3 - DXF library)]

## Dev Agent Record

### Agent Model Used

gemini-2.0-flash-thinking-exp

### Debug Log References

- Fixed TypeError in ezdxf.add_spline by using set_open_uniform.
- Fixed recursion in document.createElement mock in frontend tests.
- Fixed 404 in API tests by improving DB mock model matching.

### Completion Notes List

- Implemented SVG/DXF export with Vietnamese annotations.
- Integrated export button in Tailor Review page.
- Verified with comprehensive unit and integration tests.

### File List

- backend/requirements.txt
- backend/src/models/export.py
- backend/src/services/export_service.py
- backend/src/api/v1/export.py
- backend/src/main.py
- backend/tests/test_export_service.py
- backend/tests/test_export_api.py
- frontend/src/types/geometry.ts
- frontend/src/app/actions/geometry-actions.ts
- frontend/src/components/client/design/ExportBlueprintButton.tsx
- frontend/src/components/client/design/index.ts
- frontend/src/app/(workplace)/tailor/review/page.tsx
- frontend/src/__tests__/exportBlueprint.test.tsx
