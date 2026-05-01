# Chương 07 — Pattern Engine (Epic 11)

> Đây là module trọng tâm mới nhất của dự án (theo SCP 2026-04-03). Kỹ thuật **deterministic formula-based** — KHÔNG dùng AI/LLM.

## 7.1. Bối cảnh & mục đích

| Khía cạnh | AI Bespoke Engine (Epic 12-14, hoãn) | Technical Pattern Engine (Epic 11, đang triển khai) |
|---|---|---|
| **Mục đích** | Cảm xúc/tính từ → concept pattern (artistic) | 10 số đo cơ thể → 3 mảnh rập (production-ready) |
| **Phương pháp** | LLM + Semantic + Ease Delta + Geometry rebuild | Công thức tất định (pure math) |
| **AI/LLM** | Có (LangGraph, Emotional Compiler) | KHÔNG — chạy trên CPU thường |
| **Output** | Master Geometry JSON (concept) | SVG 1:1 + G-code (cắt laser) |
| **Người dùng** | Customer + Tailor (collaborative) | Owner (Internal Design Session) |
| **Code location** | `backend/src/geometry/` + `agents/` | `backend/src/patterns/` (standalone) |
| **Validation** | Hard/Soft constraints phức tạp | Min/max basic (trust nghệ nhân) |

> **Nguyên tắc kiến trúc:** *"Core cứng, Shell mềm"* — Engine tính toán cố định, UX linh hoạt cho Owner. Module `patterns/` KHÔNG import từ `geometry/` hay `agents/`.

## 7.2. Yêu cầu chức năng (FR91-FR99)

| FR | Mô tả |
|---|---|
| FR91 | Owner tạo pattern session bằng cách chọn customer; hệ thống auto-fill 10 số đo từ measurement record |
| FR92 | Hệ thống sinh 3 mảnh rập (front bodice, back bodice, sleeve) từ 10 số đo; sai số hình học < 1mm so với reference của nghệ nhân |
| FR93 | Sinh đường vòng nách (1/4 ellipse arc) và đường mang tay (1/2 ellipse arc) khớp contour |
| FR94 | Xuất mỗi mảnh rập SVG ở scale 1:1 — bản in khớp số đo vật lý ±0.5mm |
| FR95 | Xuất pattern dạng G-code cho máy laser: closed paths, cut sequence, speed/power params |
| FR96 | Hiển thị real-time SVG preview ở split-pane (input số đo trái, preview rập phải) — cập nhật < 500ms |
| FR97 | Owner gắn pattern session đã hoàn thành vào order khi assign tailor task |
| FR98 | Tailor xem các mảnh rập trong order/task detail page với zoom & pan |
| FR99 | Validate cả 10 số đo theo min/max ranges trước khi sinh; số đo invalid → message tiếng Việt cụ thể với range hợp lệ |

## 7.3. Data Model

### 7.3.1 `pattern_sessions`

```sql
CREATE TABLE pattern_sessions (
  id            UUID PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  customer_id   UUID NOT NULL REFERENCES customer_profiles(id),
  created_by    UUID NOT NULL REFERENCES users(id),

  -- 10 cột số đo (immutable snapshot tại thời điểm generate)
  do_dai_ao     NUMERIC(5,1) NOT NULL,  -- độ dài áo
  ha_eo         NUMERIC(5,1) NOT NULL,  -- hạ eo
  vong_co       NUMERIC(5,1) NOT NULL,  -- vòng cổ
  vong_nach     NUMERIC(5,1) NOT NULL,  -- vòng nách
  vong_nguc     NUMERIC(5,1) NOT NULL,  -- vòng ngực
  vong_eo       NUMERIC(5,1) NOT NULL,  -- vòng eo
  vong_mong     NUMERIC(5,1) NOT NULL,  -- vòng mông
  do_dai_tay    NUMERIC(5,1) NOT NULL,  -- độ dài tay
  vong_bap_tay  NUMERIC(5,1) NOT NULL,  -- vòng bắp tay
  vong_co_tay   NUMERIC(5,1) NOT NULL,  -- vòng cổ tay

  garment_type  VARCHAR NOT NULL,       -- extensible cho Open Garment System (Phase 3)
  notes         TEXT,
  status        VARCHAR NOT NULL,       -- 'draft' | 'completed' | 'exported'
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Design Rationale:**
- 10 cột riêng (KHÔNG JSONB) → enable SQL queries trực tiếp, type safety, Pydantic validation per field.
- `garment_type` chuẩn bị Open Garment System mà không đổi schema.

### 7.3.2 `pattern_pieces`

```sql
CREATE TABLE pattern_pieces (
  id              UUID PRIMARY KEY,
  session_id      UUID NOT NULL REFERENCES pattern_sessions(id) ON DELETE CASCADE,
  piece_type      VARCHAR NOT NULL,    -- 'front_bodice' | 'back_bodice' | 'sleeve'
  svg_data        TEXT NOT NULL,       -- SVG markup ở 1:1 scale, lưu trực tiếp DB
  geometry_params JSONB NOT NULL,      -- params đã tính (bust_width, waist_width, …)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Design Rationale:**
- `svg_data` TEXT trong DB — pattern SVGs nhỏ (< 50KB), tránh quản lý file external phức tạp.

### 7.3.3 FK trên `orders`

```sql
ALTER TABLE orders
  ADD COLUMN pattern_session_id UUID REFERENCES pattern_sessions(id);
-- nullable: chỉ populate khi Owner attach pattern (FR97)
```

## 7.4. Pattern Engine Module — `backend/src/patterns/`

### 7.4.1 `engine.py` — Orchestrator

```python
@dataclass
class PieceResult:
    piece_type: str        # 'front_bodice' | 'back_bodice' | 'sleeve'
    svg_data: str
    geometry_params: dict

def generate_pattern_pieces(measurements: dict[str, Any]) -> list[PieceResult]:
    # Front bodice: offset = -1 cm (AC #3)
    front_params = generate_bodice(measurements, offset=-1.0)
    front_svg = render_bodice_svg(front_params, piece_type="front_bodice")

    # Back bodice: offset = 0 cm
    back_params = generate_bodice(measurements, offset=0.0)
    back_svg = render_bodice_svg(back_params, piece_type="back_bodice")

    # Sleeve
    sleeve_params = generate_sleeve(measurements)
    sleeve_svg = render_sleeve_svg(sleeve_params)

    return [
        PieceResult("front_bodice", front_svg, front_params),
        PieceResult("back_bodice",  back_svg,  back_params),
        PieceResult("sleeve",       sleeve_svg, sleeve_params),
    ]
```

**Mục tiêu performance:** < 50ms cho 3 mảnh trên CPU thường (deterministic math).

### 7.4.2 `formulas.py` — Công thức tất định

```python
REQUIRED_BODICE_KEYS = ("vong_nguc", "vong_eo", "vong_mong", "vong_nach", "vong_co")
REQUIRED_SLEEVE_KEYS = ("vong_nach", "vong_bap_tay", "vong_co_tay", "do_dai_tay")
```

**Công thức Bodice (DRY — 1 hàm, offset param):**

```
bust_width     = vong_nguc / 4
waist_width    = (vong_eo / 4) + offset       # offset = 0 cho back, -1 cho front
hip_width      = vong_mong / 4
armhole_drop   = vong_nach / 12
neck_depth     = vong_co / 16
hem_width      = 37.0    (constant cm — design decision)
seam_allowance = 1.0     (auto-added, không config bởi user MVP)
```

**Công thức Sleeve:**

```
cap_height  = vong_nach / 2 - 1
bicep_width = vong_bap_tay / 2 + 2.5
wrist_width = vong_co_tay / 2 + 1
length      = do_dai_tay
```

> **Front = Back - 1cm** (waist & hip offset): kiến trúc DRY — 1 hàm chung với param `offset` (0 cho back, -1 cho front).

### 7.4.3 `svg_export.py`

- `render_bodice_svg(params, piece_type)`:
  - Vẽ closed path bodice: cổ → vai → nách (1/4 ellipse arc, SVG `A` command) → cạnh sườn → eo → hông → tà
  - `viewBox` set theo cm (1cm = 1 unit) → in 1:1
  - Thêm seam allowance offset
- `render_sleeve_svg(params)`:
  - Vẽ closed path sleeve: đường mang tay (1/2 ellipse arc, SVG `A` command) → cạnh sleeve → cổ tay → ngược về

### 7.4.4 `gcode_export.py`

- `svg_to_gcode(svg_data, speed, power, piece_type) -> str`:
  - Parse SVG path
  - Convert sang G-code:
    - Header: `G21` (mm), `G90` (absolute), set laser off
    - Move to start: `G0 X.. Y..`
    - Cut: `G1 X.. Y.. F{speed} S{power*255/100}` (laser on)
    - Closed path: quay về điểm start
    - Footer: laser off, return home
  - Defaults: speed = 1000 mm/min, power = 80%

## 7.5. API Endpoints

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| `POST` | `/api/v1/patterns/sessions` | OwnerOnly | Tạo pattern session draft với 10 số đo + garment_type + notes |
| `POST` | `/api/v1/patterns/sessions/{id}/generate` | OwnerOnly | Chạy formula engine → tạo 3 pattern_pieces. Validate FR99 trước. Status: draft → completed |
| `GET` | `/api/v1/patterns/sessions/{id}` | OwnerOrTailor | Lấy session detail + 3 pieces. Phục vụ Design Session preview + Tailor view |
| `GET` | `/api/v1/patterns/pieces/{id}/export` | OwnerOrTailor | Export 1 mảnh: `?format=svg` hoặc `?format=gcode&speed=X&power=Y` |
| `GET` | `/api/v1/patterns/sessions/{id}/export` | OwnerOrTailor | Batch export 3 mảnh dạng ZIP — `?format=svg` hoặc `?format=gcode&...` |
| `POST` | `/api/v1/orders/{id}/attach-pattern` | OwnerOnly | Gắn pattern_session_id vào order (FR97) |

**Validation export params (`backend/src/api/v1/patterns.py:117`):**

```python
def _validate_export_params(format, speed, power):
    if format is None:
        raise HTTPException(422, {"code": "ERR_INVALID_FORMAT",
                                  "message": "Định dạng xuất không hợp lệ. Chọn 'svg' hoặc 'gcode'"})
    if speed is not None and speed <= 0:
        raise HTTPException(422, {"code": "ERR_INVALID_SPEED",
                                  "message": "Tốc độ cắt phải là số dương (mm/phút)"})
    if power is not None and (power < 0 or power > 100):
        raise HTTPException(422, {"code": "ERR_INVALID_POWER",
                                  "message": "Công suất laser phải từ 0 đến 100 (%)"})
    return format_enum, speed or 1000, power or 80
```

## 7.6. Frontend UI — Design Session

### 7.6.1 Routes mới

| Route | Component | Mục đích |
|---|---|---|
| `(workplace)/design-session/page.tsx` | `DesignSessionClient.tsx` | Split-pane: MeasurementForm trái + PatternPreview phải |
| `(workplace)/design-session/[sessionId]/page.tsx` | (chưa thấy) | Session detail: 3 pieces toggle + Export bar |
| `(workplace)/tailor/tasks/[taskId]/` | (existing + embedded) | Tailor xem PatternPreview compact |

### 7.6.2 Components mới (Epic 11)

| Component | File | Vai trò |
|---|---|---|
| `MeasurementForm` | `frontend/src/components/client/design/MeasurementForm.tsx` | Form 10 trường + Customer Combobox auto-fill |
| `PatternPreview` | `frontend/src/components/client/design/SvgPattern.tsx` (hoặc tách riêng) | SVG viewer zoom/pan, toggle 3 pieces |
| `PatternExportBar` | (cần tạo theo SCP) | [Xuất SVG] [Xuất G-code] + popover laser params |

### 7.6.3 Hook `usePatternSession.ts`

```typescript
// frontend/src/hooks/usePatternSession.ts
export function usePatternSession(sessionId?: string) {
  // - createSession(input)
  // - generatePieces(sessionId)
  // - getSession(sessionId)  -> 3 pieces
  // - exportPiece(pieceId, format, speed?, power?)
  // - exportSessionBatch(sessionId, format, speed?, power?)
  // ...
}
```

### 7.6.4 Server Actions

`frontend/src/app/actions/pattern-actions.ts` — wrap proxy.ts gọi backend:
- `createPatternSession(input)`
- `generatePatternPieces(sessionId)`
- `getPatternSession(sessionId)`
- `attachPatternToOrder(orderId, sessionId)`

### 7.6.5 Types

`frontend/src/types/pattern.ts`:

```typescript
export interface PatternSession {
  id: string;
  customer_id: string;
  do_dai_ao: number; ha_eo: number; vong_co: number; vong_nach: number;
  vong_nguc: number; vong_eo: number; vong_mong: number;
  do_dai_tay: number; vong_bap_tay: number; vong_co_tay: number;
  garment_type: string;
  notes?: string;
  status: 'draft' | 'completed' | 'exported';
  pieces?: PatternPiece[];
}

export interface PatternPiece {
  id: string;
  piece_type: 'front_bodice' | 'back_bodice' | 'sleeve';
  svg_data: string;
  geometry_params: Record<string, number>;
}

export type ExportFormat = 'svg' | 'gcode';
```

## 7.7. Tests đã có

| File | Story | Nội dung |
|---|---|---|
| `backend/tests/test_11_1_pattern_models.py` | 11.1 | Test Pydantic model + SQLAlchemy mapping |
| `backend/tests/test_11_2_pattern_api.py` | 11.2 | Test endpoints create/generate/get session |
| `backend/tests/test_11_2_pattern_engine.py` | 11.2 | Test công thức formulas + engine output |
| `backend/tests/test_11_3_export_api.py` | 11.3 | Test export endpoints (single + batch) |
| `backend/tests/test_11_3_gcode_export.py` | 11.3 | Test G-code conversion |

## 7.8. Backlog Story 11.x

| Story | Mô tả | Trạng thái |
|---|---|---|
| 11.1 | DB Migration + Pattern Models | ✅ |
| 11.2 | Formula Engine + Generate API | ✅ |
| 11.3 | SVG/G-code Export API | ✅ (theo `_bmad-output/implementation-artifacts/11-3-svg-gcode-export-api.md`) |
| 11.4 | Profile-driven Measurement Form UI | 🔄 (theo `_bmad-output/implementation-artifacts/11-4-profile-driven-measurement-form-ui.md`) |
| 11.5 | Pattern Preview UI (split-pane) | ⏳ |
| 11.6 | Export + Attach UI + Tailor Pattern View | ⏳ |

## 7.9. Pipeline triển khai khuyến nghị

1. **Customer Profile + Measurement** đã có sẵn (Epic 6).
2. **Owner mở Design Session** → chọn customer → MeasurementForm auto-fill 10 số đo (FR91).
3. **Validate** (FR99) → POST `/sessions/generate` → backend chạy `generate_pattern_pieces()` → lưu 3 pieces (FR92, FR93).
4. **Real-time preview** ở split-pane (FR96) — TanStack Query refetch khi user adjust số đo.
5. **Export** (FR94, FR95):
   - SVG single: `/pieces/{id}/export?format=svg`
   - G-code single: `/pieces/{id}/export?format=gcode&speed=1000&power=80`
   - Batch: `/sessions/{id}/export?format=...` → ZIP
6. **Attach to order** (FR97): khi Owner approve bespoke order, gắn pattern_session_id.
7. **Tailor view** (FR98): trong task detail page, render PatternPreview embedded — zoom/pan, không có Export controls.
