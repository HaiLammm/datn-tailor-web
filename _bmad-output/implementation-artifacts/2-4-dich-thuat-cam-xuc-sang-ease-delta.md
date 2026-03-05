# Story 2.4: Dich thuat Cam xuc sang Ease Delta (Emotional Compiler Engine)

Status: done

## Story

As a **He thong (AI Engine)**,
I want **chuyen doi cuong do phong cach thanh cac chi so hinh hoc (Deltas)**,
so that **co du lieu chinh xac de bien doi ban ve rap**.

## Acceptance Criteria

1. **Translate Endpoint:** API `POST /api/v1/inference/translate` nhan Style + Intensity input va tra ve Master Geometry JSON chua cac bo Delta (vd: `waist_ease: +2.0cm`).
2. **LangGraph Orchestration:** Backend su dung LangGraph de xay dung "Stateful Multi-Agent" reasoning loop cho viec dich thuat cam xuc sang hinh hoc.
3. **Smart Rules Lookup:** Agent tra cuu Smart Rules cua nghe nhan tu Local Knowledge Base (LKB) tai Backend de xac dinh Delta mapping.
4. **Master Geometry JSON Output:** Response phai tuan thu schema Master Geometry Snapshot gom: `sequence_id`, `base_hash`, `algorithm_version`, `deltas`, `geometry_hash`.
5. **Performance NFR1:** Thoi gian phan hoi suy luan trung binh Lavg < 15 giay (toan bo LangGraph inference cycle).
6. **Vietnamese Terminology:** 100% ten Delta, labels, va error messages su dung thuat ngu chuyen mon nganh may Viet Nam (NFR11).

## Tasks / Subtasks

- [x] **Backend: Inference Models** (AC: 1, 4, 6)
  - [x] Tao file `backend/src/models/inference.py` voi Pydantic models:
    - `TranslateRequest`: `pillar_id: str`, `intensities: list[IntensityValueItem]`, `sequence_id: int`, `base_measurement_id: str | None`
    - `DeltaValue`: `key: str`, `value: float`, `unit: str`, `label_vi: str`
    - `MasterGeometrySnapshot`: `sequence_id: int`, `base_hash: str`, `algorithm_version: str`, `deltas: list[DeltaValue]`, `geometry_hash: str`, `created_at: datetime`
    - `TranslateResponse`: `success: bool`, `snapshot: MasterGeometrySnapshot | None`, `inference_time_ms: int`, `error: str | None`
  - [x] Su dung 100% Vietnamese labels cho Delta keys (vd: `do_cu_eo`, `ha_nach`, `rong_vai`)

- [x] **Backend: Smart Rules LKB Data** (AC: 3, 6)
  - [x] Tao file `backend/src/services/smart_rules_service.py`:
    - `SmartRule` dataclass: `pillar_id`, `slider_key`, `delta_mappings: list[DeltaMapping]`
    - `DeltaMapping`: `slider_range: tuple[float, float]`, `delta_key: str`, `delta_formula: str | Callable`
    - Hardcode 3 bo Smart Rules cho 3 pillars (Truyen thong, Toi gian, Tien phong)
  - [x] Method `get_rules_for_pillar(pillar_id: str) -> list[SmartRule]`
  - [x] Method `compute_deltas(pillar_id: str, intensities: dict[str, float]) -> list[DeltaValue]`

- [x] **Backend: LangGraph Emotional Compiler Agent** (AC: 2, 3)
  - [x] Tao file `backend/src/agents/emotional_compiler.py`:
    - Dinh nghia LangGraph `StateGraph` voi cac nodes:
      - `validate_input`: Validate request schema va sequence_id
      - `lookup_rules`: Goi SmartRulesService.get_rules_for_pillar()
      - `compute_deltas`: Ap dung Smart Rules de tinh Delta values
      - `build_snapshot`: Tao MasterGeometrySnapshot voi hash
    - Dinh nghia edges cho flow: START -> validate_input -> lookup_rules -> compute_deltas -> build_snapshot -> END
    - Export `run_emotional_compiler(request: TranslateRequest) -> TranslateResponse`
  - [x] Su dung `langgraph` package (cai dat trong requirements.txt)
  - [x] Khong su dung LLM/OpenAI trong MVP — chi dung deterministic rule-based logic

- [x] **Backend: Inference API Endpoint** (AC: 1, 5)
  - [x] Tao file `backend/src/api/v1/inference.py`:
    - `POST /api/v1/inference/translate` endpoint
    - Import va goi `run_emotional_compiler()` tu agents module
    - Ghi nhan `inference_time_ms` bang `time.perf_counter()`
    - Tra ve `TranslateResponse` voi `success`, `snapshot`, `inference_time_ms`
  - [x] Register router trong `backend/src/main.py`
  - [x] Validate `inference_time_ms < 15000` trong tests (NFR1)

- [x] **Backend: Hashing Utilities** (AC: 4)
  - [x] Tao file `backend/src/core/hashing.py`:
    - `compute_geometry_hash(deltas: list[DeltaValue]) -> str`: SHA-256 hash cua sorted deltas JSON
    - `compute_base_hash(measurement_id: str | None) -> str`: Hash cua base measurement (placeholder cho MVP)
  - [x] Dung `hashlib.sha256` voi deterministic JSON serialization

- [x] **Backend: Testing** (AC: 1, 2, 3, 4, 5)
  - [x] Tao file `backend/tests/test_inference_api.py`:
    - Test happy path: POST /translate voi valid pillar_id + intensities -> 200 + snapshot
    - Test invalid pillar_id -> 404
    - Test missing intensities -> 400
    - Test response contains valid Master Geometry schema fields
    - Test geometry_hash la deterministic (same input -> same hash)
  - [x] Tao file `backend/tests/test_smart_rules_service.py`:
    - Test get_rules_for_pillar() cho 3 pillars
    - Test compute_deltas() tra ve dung Delta keys
    - Test Delta values nam trong pham vi hop ly (vd: ease khong qua +-10cm)
  - [x] Tao file `backend/tests/test_emotional_compiler.py`:
    - Test LangGraph agent runs through all nodes
    - Test inference_time_ms < 15000 (NFR1 performance)

- [x] **Frontend: Inference Types** (AC: 1, 4)
  - [x] Tao file `frontend/src/types/inference.ts`:
    - `TranslateRequest`, `DeltaValue`, `MasterGeometrySnapshot`, `TranslateResponse`
    - Zod schemas cho response validation
  - [x] Luu y: `snake_case` cho JSON fields (SSOT sync voi Backend)

- [x] **Frontend: Zustand Store Extension** (AC: 1)
  - [x] Cap nhat `frontend/src/store/designStore.ts`:
    - Them state: `master_geometry: MasterGeometrySnapshot | null`, `is_translating: boolean`, `translate_error: string | null`
    - Them actions: `setMasterGeometry(snapshot)`, `setTranslating(loading)`, `setTranslateError(error)`
  - [x] Khong trigger translation tu dong — chi khi user click "Tao ban ve" button

- [x] **Frontend: Server Action** (AC: 1)
  - [x] Cap nhat `frontend/src/app/actions/design-actions.ts`:
    - Them `translateDesign(pillarId: string, intensities: IntensityValueItem[], sequenceId: number): Promise<TranslateResponse>`
    - Goi `POST /api/v1/inference/translate`
    - Validate response voi Zod schema

- [x] **Frontend: Integration UI** (AC: 1)
  - [x] Cap nhat `frontend/src/app/(customer)/design-session/DesignSessionClient.tsx`:
    - Them "Tao ban ve" button (disabled neu chua chon pillar hoac dang loading)
    - Click button -> goi translateDesign() -> update store voi master_geometry
    - Hien thi loading spinner va error state
  - [x] Hien thi ket qua MasterGeometrySnapshot (JSON preview hoac Delta summary card) sau khi thanh cong

- [x] **Frontend: Testing** (AC: 1)
  - [x] Cap nhat/tao tests trong `frontend/src/__tests__/`:
    - Test translateDesign server action
    - Test store state updates khi translation thanh cong/that bai
    - Test "Tao ban ve" button enable/disable logic

## Dev Notes

### Boi canh tu Story 2.1, 2.2, 2.3 (DA TRIEN KHAI — can KE THUA)

Story 2.4 **MO RONG** tren nen tang da co:

| Da co (Story 2.1-2.3) | Story 2.4 them gi |
|---|---|
| `IntensitySlider`, `IntensitySubmitRequest` models | Them `TranslateRequest`, `MasterGeometrySnapshot` |
| `StyleService` voi LKB pillars + sliders | Tao `SmartRulesService` voi Delta mappings |
| `POST /api/v1/styles/submit-intensity` | Them `POST /api/v1/inference/translate` |
| `designStore` voi `intensity_values`, `sequence_id` | Them `master_geometry`, `is_translating` |
| `design-actions.ts` voi `submitIntensity()` | Them `translateDesign()` |
| Folder `agents/` (chi co `__init__.py`) | **DAU TIEN** tao LangGraph agent tại day |

### Architecture Constraints (CRITICAL — KHONG VI PHAM)

**1. LangGraph cho AI Orchestration**
> "LangGraph cho phep xay dung cac vong lap suy luan AI (Reasoning Loops) can thiet cho viec dich thuat cam xuc sang hinh hoc" — [Source: architecture.md#Starter Options]

- Su dung `langgraph` package de xay dung StateGraph
- MVP: Khong dung LLM/OpenAI — chi rule-based deterministic logic
- Future: Co the them LLM node de "giai thich" ly do Delta

**2. Backend la SSOT — Frontend KHONG tinh Delta**
> "Backend la nguon chan ly duy nhat (SSOT) cho hinh hoc va rang buoc vat ly" — [Source: project-context.md#Critical Implementation Rules]

- `MasterGeometrySnapshot` chi duoc tao tai Backend
- Frontend chi nhan va hien thi — khong re-compute

**3. Master Geometry Snapshot Schema**
> "Chua: sequence_id, base_hash, algorithm_version, deltas, geometry_hash. Nguyen tac: Khong bao gio tin tuong hinh hoc tu Frontend; luon tai dung tu Base Geometry + Deltas" — [Source: architecture.md#Geometry & Constraint Architecture]

- `geometry_hash` phai deterministic (same deltas -> same hash)
- `algorithm_version` = "1.0.0" cho MVP
- `base_hash` = placeholder hash (chua co Base Geometry engine)

**4. Performance < 15 giay (NFR1)**
> "Do tre suy luan < 15 giay" — [Source: architecture.md#Requirements Overview]

- Do `inference_time_ms` bang `time.perf_counter()`
- Log warning neu > 10s, fail test neu > 15s

**5. Smart Rules trong LKB**
> "Tra cuu Smart Rules cua nghe nhan tu Local Knowledge Base" — [Source: epics.md#Story 2.4]

- Hardcode rules trong `smart_rules_service.py` (giong cach `style_service.py` hardcode pillars)
- Moi pillar co mapping: `slider_key -> delta_key, delta_formula`
- Vi du: `do_om_than: 70% -> waist_ease: +1.5cm`

**6. Khong WebSockets — REST API thuan tuy**
> "REST API thuan tuy, khong su dung WebSockets cho tuong tac UI" — [Source: architecture.md#API & Communication Patterns]

- Translation la synchronous POST request
- Frontend show loading state trong khi doi response

### Project Structure Notes

```
backend/
├── src/
│   ├── agents/
│   │   ├── __init__.py              # EXISTING (empty)
│   │   └── emotional_compiler.py    # NEW: LangGraph StateGraph
│   ├── api/v1/
│   │   ├── styles.py                # EXISTING
│   │   └── inference.py             # NEW: /translate endpoint
│   ├── core/
│   │   └── hashing.py               # NEW: geometry_hash, base_hash
│   ├── models/
│   │   ├── style.py                 # EXISTING
│   │   └── inference.py             # NEW: TranslateRequest, MasterGeometrySnapshot
│   └── services/
│       ├── style_service.py         # EXISTING
│       └── smart_rules_service.py   # NEW: Smart Rules LKB
└── tests/
    ├── test_inference_api.py        # NEW
    ├── test_smart_rules_service.py  # NEW
    └── test_emotional_compiler.py   # NEW

frontend/src/
├── types/
│   ├── style.ts                     # EXISTING
│   └── inference.ts                 # NEW
├── store/designStore.ts             # MODIFIED: them master_geometry state
├── app/
│   ├── actions/design-actions.ts    # MODIFIED: them translateDesign()
│   └── (customer)/design-session/
│       └── DesignSessionClient.tsx  # MODIFIED: them "Tao ban ve" button
└── __tests__/                       # NEW/MODIFIED tests
```

### Delta Key Examples (Vietnamese Terminology)

| Delta Key | Label (Vietnamese) | Unit | Description |
|-----------|-------------------|------|-------------|
| `do_cu_eo` | Do cu eo | cm | Ease adjustment at waist |
| `ha_nach` | Ha nach | cm | Armhole drop distance |
| `rong_vai` | Rong vai | cm | Shoulder width adjustment |
| `dai_tay` | Dai tay | cm | Sleeve length adjustment |
| `rong_nguc` | Rong nguc | cm | Chest width adjustment |
| `do_xoe_ta` | Do xoe ta | cm | Hem flare amount |

### Smart Rules Formula Examples

```python
# Traditional pillar - do_om_than slider
if slider_value >= 70:
    waist_ease = -1.5  # Tighter fit
elif slider_value >= 50:
    waist_ease = 0.0   # Standard
else:
    waist_ease = +2.0  # Looser fit

# Minimalist pillar - do_rong_vai slider
shoulder_delta = (slider_value - 50) * 0.05  # Linear scaling
```

### References

- [Source: architecture.md#Geometry & Constraint Architecture] — Master Geometry Snapshot schema
- [Source: architecture.md#Backend Structure] — agents/ folder for LangGraph
- [Source: epics.md#Story 2.4] — Acceptance Criteria and User Story
- [Source: project-context.md#Technology Stack] — LangGraph, Pydantic v2
- [Source: ux-design-specification.md] — Vietnamese terminology requirements

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
