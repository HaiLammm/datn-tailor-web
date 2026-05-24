# Story 11.5: Split-Pane Pattern Preview

Status: done

## Story

As an Owner,
I want to view generated pattern pieces in a split-pane layout with SVG preview, zoom/pan, and piece toggle after creating a pattern session,
so that I can visually verify the 3 technical patterns (front bodice, back bodice, sleeve) before exporting or attaching to an order.

## Acceptance Criteria

1. **Session Detail Route** — Dynamic route `/design-session/[sessionId]`
   - Given Owner navigates to `/design-session/{sessionId}` (redirected from Story 11.4 form submission)
   - When page loads
   - Then system fetches pattern session via `GET /api/v1/patterns/sessions/{sessionId}`
   - And displays session metadata (customer name, garment type, creation date, status)

2. **Split-Pane Layout** — Measurement summary (left) + SVG preview (right)
   - Given session is loaded with status `draft` or `completed`
   - When page renders on desktop (≥1024px)
   - Then layout shows 2 panes: left panel (measurement summary + actions, ~35% width) and right panel (SVG preview, ~65% width)
   - And on mobile (<1024px), layout stacks vertically (measurements top, preview bottom)

3. **Generate Pattern Trigger** — Owner triggers pattern generation from draft session
   - Given session status is `draft` (pieces array empty)
   - When Owner clicks "Tạo mẫu" button
   - Then frontend calls `POST /api/v1/patterns/sessions/{sessionId}/generate`
   - And displays loading state: "Đang tạo mẫu rập..."
   - And on success, session status transitions to `completed` and 3 pieces render in preview
   - And on error (422/500), displays Vietnamese error toast

4. **PatternPreview Component** — SVG viewer with zoom/pan
   - Given session status is `completed` (3 pieces available)
   - When preview renders
   - Then it displays the selected piece's `svg_data` in a responsive SVG container
   - And supports mouse wheel zoom (desktop) and pinch-to-zoom (mobile touch)
   - And supports click-drag pan (desktop) and touch-drag pan (mobile)
   - And displays piece dimensions from `geometry_params` (e.g., "Ngang ngực: 42cm, Ngang eo: 38cm")

5. **Piece Toggle** — Switch between 3 pattern pieces
   - Given 3 pieces are generated
   - When Owner clicks a piece tab (Thân trước / Thân sau / Tay áo)
   - Then preview switches to display that piece's SVG
   - And active tab is visually highlighted
   - And geometry params panel updates to show selected piece's parameters

6. **PatternExportBar** — Export SVG/G-code with laser parameters
   - Given session status is `completed`
   - When export bar renders
   - Then it shows 3 buttons: [Xuất SVG] [Xuất G-code] [Xuất tất cả]
   - And "Xuất SVG" downloads current piece as `.svg` file via `GET /api/v1/patterns/pieces/{pieceId}/export?format=svg`
   - And "Xuất G-code" opens popover with speed (mm/min) and power (0-100%) inputs, then downloads via `GET /api/v1/patterns/pieces/{pieceId}/export?format=gcode&speed=X&power=Y`
   - And "Xuất tất cả" downloads batch ZIP via `GET /api/v1/patterns/sessions/{sessionId}/export?format={selected}`

7. **Measurement Summary Panel** — Left pane content
   - Given session is loaded
   - When left panel renders
   - Then it displays all 10 measurements with Vietnamese labels and values (e.g., "Vòng ngực: 88.0 cm")
   - And customer name if linked (or "Nhập thủ công" if no customer)
   - And session status badge (Bản nháp / Hoàn thành / Đã xuất)

8. **Empty/Loading States** — Graceful handling
   - Given session is loading
   - Then page shows skeleton placeholders for both panes
   - Given session not found (404)
   - Then page shows "Phiên thiết kế không tồn tại" with back link
   - Given session is `draft` (no pieces)
   - Then right pane shows empty state with "Nhấn 'Tạo mẫu' để bắt đầu" message and illustration

## Tasks / Subtasks

- [x] Task 1: Create `[sessionId]` dynamic route (AC: #1, #2, #8)
  - [x] 1.1 Create `frontend/src/app/(workplace)/design-session/[sessionId]/page.tsx` — Server component, fetch session data
  - [x] 1.2 Create `frontend/src/app/(workplace)/design-session/[sessionId]/SessionDetailClient.tsx` — Client component with split-pane layout
  - [x] 1.3 Implement responsive split-pane: CSS Grid `grid-cols-[35%_65%]` on lg, stacked on mobile

- [x] Task 2: Create PatternPreview component (AC: #4, #5)
  - [x] 2.1 Create `frontend/src/components/client/design/PatternPreview.tsx`
    - SVG container rendering `svg_data` string via `dangerouslySetInnerHTML` (SVG is server-generated, trusted)
    - Zoom state (scale, translateX, translateY) via local React state
    - Mouse wheel → zoom, click-drag → pan (desktop)
    - Touch pinch → zoom, touch-drag → pan (mobile)
    - Reset zoom button
  - [x] 2.2 Create piece toggle tabs (Thân trước / Thân sau / Tay áo)
    - Tab bar with 3 buttons, active state styling
    - Piece selection stored in local state (not Zustand — ephemeral UI state)
  - [x] 2.3 Geometry params display panel below SVG
    - Render `geometry_params` dict with Vietnamese labels

- [x] Task 3: Create PatternExportBar component (AC: #6)
  - [x] 3.1 Create `frontend/src/components/client/design/PatternExportBar.tsx`
    - [Xuất SVG] button — triggers file download
    - [Xuất G-code] button — opens Radix Popover with speed/power inputs, then download
    - [Xuất tất cả] button — batch ZIP download
  - [x] 3.2 Implement download logic via server actions (fetch with auth, return blob)

- [x] Task 4: Create server actions and hooks (AC: #1, #3, #6)
  - [x] 4.1 Add to `frontend/src/app/actions/pattern-actions.ts`:
    - `fetchPatternSession(sessionId: string)` — GET session detail
    - `generatePatternPieces(sessionId: string)` — POST generate
    - `exportPatternPiece(pieceId: string, format: string, speed?: number, power?: number)` — GET export (return blob URL)
    - `exportPatternSession(sessionId: string, format: string, speed?: number, power?: number)` — GET batch export
  - [x] 4.2 Add to `frontend/src/hooks/usePatternSession.ts`:
    - `usePatternSession(sessionId: string)` — TanStack Query for session detail
    - `useGeneratePattern(sessionId: string)` — mutation for generate
    - `useExportPiece()` — mutation for single piece export
    - `useExportSession()` — mutation for batch export

- [x] Task 5: Update types (AC: #4, #5)
  - [x] 5.1 Add to `frontend/src/types/pattern.ts`:
    - `PatternPieceResponse` interface (`id`, `session_id`, `piece_type`, `svg_data`, `geometry_params`, `created_at`)
    - `PieceType` union type: `"front_bodice" | "back_bodice" | "sleeve"`
    - `PIECE_TYPE_LABELS` mapping: `{ front_bodice: "Thân trước", back_bodice: "Thân sau", sleeve: "Tay áo" }`
    - `GEOMETRY_PARAM_LABELS` mapping for Vietnamese display
    - `ExportFormat` type: `"svg" | "gcode"`
    - Update `PatternSessionResponse` to include `pieces: PatternPieceResponse[]`

- [x] Task 6: Measurement summary panel (AC: #7)
  - [x] 6.1 Create `frontend/src/components/client/design/MeasurementSummary.tsx`
    - Read-only display of 10 measurements from session data
    - Customer name display
    - Status badge (reuse StatusBadge component pattern)
    - "Tạo mẫu" button (visible only when status=draft)

- [x] Task 7: Unit tests (AC: #1-8)
  - [x] 7.1 Create `frontend/src/__tests__/PatternPreview.test.tsx`
    - Test SVG renders from svg_data string
    - Test piece toggle switches displayed SVG
    - Test zoom/pan state updates
  - [x] 7.2 Create `frontend/src/__tests__/PatternExportBar.test.tsx`
    - Test SVG export triggers download
    - Test G-code popover shows speed/power inputs
    - Test disabled state when no pieces
  - [x] 7.3 Create `frontend/src/__tests__/SessionDetailClient.test.tsx`
    - Test split-pane renders both panels
    - Test loading skeleton state
    - Test 404 error state
    - Test draft state shows generate button
    - Test completed state shows pieces

## Dev Notes

### Architecture Compliance

**CRITICAL: Story 11.5 is FRONTEND ONLY — All backend APIs already exist from Stories 11.1-11.3**

- NO backend code changes required
- Pattern session GET: `GET /api/v1/patterns/sessions/{id}` — returns `PatternSessionResponse` with nested `pieces[]`
- Pattern generate: `POST /api/v1/patterns/sessions/{id}/generate` — returns updated session with 3 pieces
- Piece export: `GET /api/v1/patterns/pieces/{id}/export?format=svg|gcode&speed=X&power=Y`
- Batch export: `GET /api/v1/patterns/sessions/{id}/export?format=svg|gcode&speed=X&power=Y` — returns ZIP

### API Response Shapes

```typescript
// GET /api/v1/patterns/sessions/{id}
{
  data: {
    id: "uuid",
    tenant_id: "uuid",
    customer_id: "uuid" | null,
    created_by: "uuid",
    do_dai_ao: 65.0, ha_eo: 18.0, vong_co: 36.0, vong_nach: 38.0,
    vong_nguc: 88.0, vong_eo: 68.0, vong_mong: 92.0,
    do_dai_tay: 55.0, vong_bap_tay: 28.0, vong_co_tay: 16.0,
    garment_type: "ao_dai",
    notes: "...",
    status: "draft" | "completed" | "exported",
    pieces: [
      {
        id: "uuid",
        session_id: "uuid",
        piece_type: "front_bodice" | "back_bodice" | "sleeve",
        svg_data: "<svg>...</svg>",
        geometry_params: { bust_width: 44.0, waist_width: 34.0, ... },
        created_at: "2026-..."
      }
    ],
    created_at: "2026-...",
    updated_at: "2026-..."
  }
}
```

### Existing Code to Reuse — DO NOT RECREATE

| Artifact | Path | Reuse Strategy |
|----------|------|----------------|
| Pattern types + schemas | `types/pattern.ts` | Extend with `PatternPieceResponse`, `PieceType`, labels |
| Pattern server actions | `app/actions/pattern-actions.ts` | Add `fetchPatternSession`, `generatePatternPieces`, export actions |
| Pattern hooks | `hooks/usePatternSession.ts` | Add `usePatternSession(id)` query, `useGeneratePattern` mutation |
| Design store | `store/designStore.ts` | Already has `pattern_session_id` — no changes needed |
| StatusBadge pattern | `components/common/StatusBadge.tsx` or similar | Follow existing status badge styling |
| Server action auth pattern | `app/actions/pattern-actions.ts` lines 1-15 | Reuse `getAuthToken()` helper |
| Toast pattern | Existing toast usage in other components | Follow same toast import and usage |
| Skeleton loading | Existing skeleton patterns in other pages | Follow existing skeleton component usage |

### PatternPreview Component Design

```tsx
// PatternPreview.tsx — Core structure
interface PatternPreviewProps {
  pieces: PatternPieceResponse[];
  initialPieceIndex?: number;
}

// Zoom/pan state — local useState, NOT Zustand (ephemeral UI state)
const [scale, setScale] = useState(1);
const [translate, setTranslate] = useState({ x: 0, y: 0 });
const [activePieceIndex, setActivePieceIndex] = useState(0);

// SVG rendering — use dangerouslySetInnerHTML since SVG is server-generated
<div
  ref={containerRef}
  style={{ transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)` }}
  dangerouslySetInnerHTML={{ __html: activePiece.svg_data }}
/>

// Zoom: wheel event → scale ±0.1 (clamp 0.1 to 5.0)
// Pan: mousedown+mousemove → translate delta
// Touch: gesturechange/touchmove for pinch zoom + 2-finger pan
// Reset: button to set scale=1, translate={0,0}
```

### File Download Pattern

```typescript
// For SVG/G-code export — server action returns blob
export async function exportPatternPiece(
  pieceId: string,
  format: "svg" | "gcode",
  speed?: number,
  power?: number
): Promise<{ url: string; filename: string }> {
  const token = await getAuthToken();
  const params = new URLSearchParams({ format });
  if (speed) params.set("speed", String(speed));
  if (power) params.set("power", String(power));

  const response = await fetch(
    `${BACKEND_URL}/api/v1/patterns/pieces/${pieceId}/export?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // Return blob URL for client-side download trigger
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const ext = format === "svg" ? "svg" : "gcode";
  return { url, filename: `pattern-piece.${ext}` };
}
```

**Important:** Server actions cannot return Blob directly. Use a client-side fetch wrapper or return base64/URL. Preferred approach: create a client-side utility that calls the server action to get an authenticated URL, then triggers download via `<a>` tag click.

### G-code Export Popover

```tsx
// PatternExportBar.tsx — G-code popover structure
<Popover>
  <PopoverTrigger asChild>
    <Button variant="outline">Xuất G-code</Button>
  </PopoverTrigger>
  <PopoverContent>
    <div className="space-y-3">
      <label>Tốc độ cắt (mm/phút)</label>
      <Input type="number" defaultValue={1000} min={100} max={10000} />
      <label>Công suất laser (%)</label>
      <Input type="number" defaultValue={80} min={1} max={100} />
      <Button onClick={handleGcodeExport}>Tải xuống</Button>
    </div>
  </PopoverContent>
</Popover>
```

### Split-Pane Layout CSS

```tsx
// SessionDetailClient.tsx — Responsive split-pane
<div className="grid grid-cols-1 lg:grid-cols-[35%_65%] gap-4 h-[calc(100vh-4rem)]">
  {/* Left: Measurement Summary + Actions */}
  <div className="overflow-y-auto p-4 border-r border-gray-200">
    <MeasurementSummary session={session} />
    {session.status === "draft" && (
      <Button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "Đang tạo mẫu rập..." : "Tạo mẫu"}
      </Button>
    )}
    {session.status !== "draft" && (
      <PatternExportBar pieces={session.pieces} sessionId={session.id} />
    )}
  </div>

  {/* Right: Pattern Preview */}
  <div className="min-h-0">
    {session.pieces.length > 0 ? (
      <PatternPreview pieces={session.pieces} />
    ) : (
      <EmptyPatternState />
    )}
  </div>
</div>
```

### Status Badge Mapping

| Status | Vietnamese | Color |
|--------|-----------|-------|
| `draft` | Bản nháp | Gray (`bg-gray-100 text-gray-700`) |
| `completed` | Hoàn thành | Green (`bg-green-100 text-green-700`) |
| `exported` | Đã xuất | Blue (`bg-blue-100 text-blue-700`) |

### Design System Compliance

- **Font:** Inter for labels/text, JetBrains Mono for measurement numbers
- **Heritage Palette:** Indigo Depth `#1A2B4C` for primary actions, Heritage Gold `#D4AF37` for CTAs, Silk Ivory background
- **Command Mode density:** `gap-4` grid spacing, compact measurement display
- **Tab styling:** Underline active tab with `border-b-2 border-primary text-primary font-medium`
- **Popover:** Use Radix UI `Popover` primitive with Tailwind styling (consistent with existing popovers)

### What NOT to Build (out of scope)

- **Order attachment** → Story 11.6
- **Tailor pattern view** → Separate Tailor task detail integration (architecture says reuse PatternPreview)
- **Measurement editing on this page** → Session measurements are immutable after creation (read-only summary)
- **Backend changes** → Already done in 11.1-11.3
- **MeasurementForm** → Already done in Story 11.4

### Previous Story Intelligence (11.4)

From Story 11.4:
- Navigation: `useCreatePatternSession` hook already navigates to `/design-session/${data.id}` after session creation — this is the entry point for 11.5
- Types: `PatternSessionResponse` already defined but missing `pieces` array — extend it
- Pattern actions: `createPatternSession` and `fetchCustomerMeasurement` already exist — add session detail + generate + export actions
- Measurement field labels and ranges defined in `PATTERN_MEASUREMENT_FIELDS` array — reuse for summary display
- Session status values: `draft` → `completed` → `exported`

### Git Intelligence

Recent commits show:
- `a7af8c3` — Story 11.3 (SVG/G-code export API) and Story 11.4 (measurement form UI) completed together
- `4427229` — Story 11.2 (Pattern Engine Core API) implemented
- `ba99049` — Story 11.1 (DB migration + pattern session models) implemented
- All backend pattern APIs are confirmed working and deployed

### Testing Standards

- **Jest + React Testing Library** (existing setup)
- Mock server actions with `jest.mock("@/app/actions/pattern-actions")`
- Test user interactions with `userEvent` from `@testing-library/user-event`
- For zoom/pan: test that wheel events update scale state, mousedown+move updates translate
- For export: mock server action, verify download trigger
- For piece toggle: verify correct SVG content switches on tab click

### Project Structure Notes

```
frontend/src/
├── app/(workplace)/design-session/
│   ├── page.tsx                              # EXISTING — Story 11.4
│   ├── DesignSessionClient.tsx               # EXISTING — Story 11.4
│   └── [sessionId]/
│       ├── page.tsx                          # NEW — Server component
│       └── SessionDetailClient.tsx           # NEW — Client component
├── app/actions/
│   └── pattern-actions.ts                    # UPDATE — add 4 new actions
├── components/client/design/
│   ├── MeasurementForm.tsx                   # EXISTING — Story 11.4
│   ├── PatternPreview.tsx                    # NEW — SVG viewer + zoom/pan
│   ├── PatternExportBar.tsx                  # NEW — Export controls
│   └── MeasurementSummary.tsx                # NEW — Read-only measurement display
├── hooks/
│   └── usePatternSession.ts                  # UPDATE — add 4 new hooks
├── types/
│   └── pattern.ts                            # UPDATE — add piece types + labels
└── __tests__/
    └── components/
        ├── PatternPreview.test.tsx            # NEW
        ├── PatternExportBar.test.tsx          # NEW
        └── SessionDetailClient.test.tsx       # NEW
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md — Epic 11, FR92, FR94, FR95, FR96, FR98]
- [Source: _bmad-output/planning-artifacts/architecture.md — Pattern Engine section, lines 523-608]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md — PatternPreview component #9, PatternExportBar #10, Pattern Generation journey]
- [Source: _bmad-output/implementation-artifacts/11-4-profile-driven-measurement-form-ui.md — Previous story patterns, navigation flow]
- [Source: backend/src/api/v1/patterns.py — API endpoint signatures]
- [Source: backend/src/models/pattern.py — Response model shapes]
- [Source: frontend/src/types/pattern.ts — Existing types to extend]
- [Source: frontend/src/hooks/usePatternSession.ts — Existing hooks to extend]
- [Source: frontend/src/app/actions/pattern-actions.ts — Existing server actions to extend]
- [Source: _bmad-output/project-context.md — Implementation rules]

## Dev Agent Record

### Agent Model Used

openai/gpt-5.4

### Debug Log References

- `npm run lint -- "src/app/(workplace)/design-session/[sessionId]/page.tsx" "src/app/(workplace)/design-session/[sessionId]/SessionDetailClient.tsx" "src/app/(workplace)/design-session/[sessionId]/loading.tsx" "src/components/client/design/MeasurementSummary.tsx" "src/components/client/design/PatternPreview.tsx" "src/components/client/design/PatternExportBar.tsx" "src/app/actions/pattern-actions.ts" "src/hooks/usePatternSession.ts" "src/types/pattern.ts" "src/__tests__/PatternPreview.test.tsx" "src/__tests__/PatternExportBar.test.tsx" "src/__tests__/SessionDetailClient.test.tsx"`
- `npm test -- --runTestsByPath "src/__tests__/PatternPreview.test.tsx" "src/__tests__/PatternExportBar.test.tsx" "src/__tests__/SessionDetailClient.test.tsx"`

### Completion Notes List

- Added `/design-session/[sessionId]` server route and client detail shell with SSR bootstrap, split-pane layout, loading skeleton, draft empty state, and custom not-found state.
- Implemented `MeasurementSummary`, `PatternPreview`, and `PatternExportBar` with Vietnamese measurement labels, generate trigger, zoom/pan interactions, piece toggles, and authenticated file downloads.
- Extended pattern types, server actions, and TanStack hooks for session fetch, generate, export, and linked customer metadata lookup.
- Added targeted Jest coverage for preview interactions, export controls, and session detail rendering states.

### File List

- `frontend/src/app/(workplace)/design-session/[sessionId]/page.tsx`
- `frontend/src/app/(workplace)/design-session/[sessionId]/SessionDetailClient.tsx`
- `frontend/src/app/(workplace)/design-session/[sessionId]/loading.tsx`
- `frontend/src/components/client/design/MeasurementSummary.tsx`
- `frontend/src/components/client/design/PatternPreview.tsx`
- `frontend/src/components/client/design/PatternExportBar.tsx`
- `frontend/src/components/client/design/index.ts`
- `frontend/src/app/actions/pattern-actions.ts`
- `frontend/src/hooks/usePatternSession.ts`
- `frontend/src/types/pattern.ts`
- `frontend/src/__tests__/PatternPreview.test.tsx`
- `frontend/src/__tests__/PatternExportBar.test.tsx`
- `frontend/src/__tests__/SessionDetailClient.test.tsx`
