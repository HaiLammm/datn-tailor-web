# Story 2.3: Gợi ý Chất liệu Vải dựa trên Phong cách (Fabric Recommendation)

Status: done

## Story

As a **Khách hàng**,
I want **nhận được gợi ý về loại vải phù hợp với phong cách đã chọn**,
so that **thiết kế cuối cùng đảm bảo tính thẩm mỹ và khả thi khi may**.

## Acceptance Criteria

1. **Fabric Request Trigger:** Khi người dùng đã chọn phong cách (Story 2.1) và điều chỉnh cường độ (Story 2.2), hệ thống cho phép yêu cầu gợi ý vải thông qua nút "Xem gợi ý vải" trên Design Session UI.
2. **Backend Fabric Recommendation:** Backend API `GET /api/v1/fabrics/recommendations?pillar_id={id}&intensities={json}` trả về danh sách vải phù hợp dựa trên:
   - Phong cách đã chọn (pillar_id)
   - Các giá trị cường độ hiện tại (intensity_values)
   - Đặc tính vải (độ rủ, lý tính vật liệu) phù hợp với cấu trúc rập
3. **Fabric Card Display:** Mỗi gợi ý vải hiển thị dưới dạng "Fabric Card" gồm:
   - Hình ảnh texture của vải (hoặc placeholder)
   - Tên vải bằng tiếng Việt (vd: Lụa Hà Đông, Gấm Thái Tuấn, Voan Pháp)
   - Mô tả đặc tính vải (độ rủ, độ dày, độ co dãn)
   - Mức độ phù hợp (percentage hoặc badge: "Rất phù hợp", "Phù hợp", "Có thể dùng")
4. **LKB Fabric Data:** Fabric data được lưu trữ trong Local Knowledge Base tại Backend (hardcoded ban đầu, không cần DB).
5. **Vietnamese Terminology:** 100% nhãn, mô tả sử dụng thuật ngữ chuyên môn ngành may Việt Nam (NFR11).
6. **No Blocking:** Gợi ý vải là tính năng tùy chọn — không block flow nếu người dùng không yêu cầu.

## Tasks / Subtasks

- [x] **Backend: Fabric Models & LKB Data** (AC: 4, 5)
  - [x] Tạo file `backend/src/models/fabric.py` với Pydantic models:
    - `FabricProperty`: Đặc tính vải (drape, thickness, stretch, etc.)
    - `FabricResponse`: Chi tiết một loại vải
    - `FabricRecommendationResponse`: Danh sách gợi ý kèm compatibility score
  - [x] Tạo `backend/src/services/fabric_service.py`:
    - `FabricService` class với LKB hardcoded data (8-10 loại vải: Lụa, Gấm, Voan, Đũi, Lanh, Nhung, Kate, Taffeta...)
    - Method `get_recommendations(pillar_id, intensities) -> list[FabricRecommendation]`
    - Logic tính compatibility score dựa trên mapping pillar → fabric properties

- [x] **Backend: Fabric Recommendation API** (AC: 2)
  - [x] Tạo router `backend/src/api/v1/fabrics.py`:
    - `GET /api/v1/fabrics/recommendations` endpoint
    - Query params: `pillar_id: str`, `intensities: str` (JSON-encoded)
  - [x] Register router trong `backend/src/main.py`
  - [x] Viết tests: `backend/tests/test_fabrics_api.py`

- [x] **Frontend: Fabric Types** (AC: 3)
  - [x] Thêm types vào `frontend/src/types/fabric.ts`:
    - `FabricProperty`, `FabricResponse`, `FabricRecommendationResponse`
    - Zod schemas cho response validation

- [x] **Frontend: Zustand Store Extension** (AC: 1, 6)
  - [x] Cập nhật `frontend/src/store/designStore.ts`:
    - Thêm state: `fabric_recommendations: FabricResponse[]`, `is_loading_fabrics: boolean`
    - Thêm actions: `setFabricRecommendations(fabrics)`, `setLoadingFabrics(loading)`
    - Thêm action: `clearFabricRecommendations()`

- [x] **Frontend: Server Action & API Call** (AC: 2)
  - [x] Thêm vào `frontend/src/app/actions/design-actions.ts`:
    - `fetchFabricRecommendations(pillarId: string, intensities: IntensityValues): Promise<FabricRecommendationResponse>`

- [x] **Frontend: FabricCard Component** (AC: 3, 5)
  - [x] Tạo `frontend/src/components/client/design/FabricCard.tsx`:
    - Props: `fabric: FabricResponse`
    - Layout: Image (texture), Name, Description, Properties, Compatibility Badge
    - Heritage Gold accent cho "Rất phù hợp" badges
    - Responsive: Stack vertical trên mobile

- [x] **Frontend: FabricRecommendationPanel Component** (AC: 1, 3)
  - [x] Tạo `frontend/src/components/client/design/FabricRecommendationPanel.tsx`:
    - "Xem gợi ý vải" button (disabled nếu chưa chọn pillar)
    - Loading state với spinner
    - Grid/List hiển thị FabricCards
    - Empty state khi chưa fetch

- [x] **Frontend: Integration vào Design Session** (AC: 1)
  - [x] Cập nhật `frontend/src/app/(customer)/design-session/DesignSessionClient.tsx`:
    - Thêm FabricRecommendationPanel vào layout

- [x] **Testing** (AC: 1, 2, 3)
  - [x] Backend: Unit tests cho FabricService (recommendation logic)
  - [x] Backend: API tests cho `/api/v1/fabrics/recommendations`
  - [x] Frontend: Component tests cho FabricCard
  - [x] Frontend: Store tests cho fabric-related state

## Dev Notes

### Bối cảnh từ Story 2.1 & 2.2 (ĐÃ TRIỂN KHAI — cần KẾ THỪA)

Story 2.3 **MỞ RỘNG** trên nền tảng đã có:

| Đã có (Story 2.1 & 2.2) | Story 2.3 thêm gì |
|---|---|
| `StylePillarResponse` với `sliders` | Không thay đổi |
| `designStore` với `selected_pillar`, `intensity_values` | Thêm `fabric_recommendations`, `is_loading_fabrics` |
| `design-actions.ts` với `submitIntensity` | Thêm `fetchFabricRecommendations` |
| Design Session UI với Sliders | Thêm FabricRecommendationPanel |

### Architecture Constraints (CRITICAL — KHÔNG VI PHẠM)

**1. Backend là SSOT cho Fabric Data**
> "Backend là nguồn chân lý duy nhất (SSOT)" — [Source: architecture.md#Geometry & Constraint Architecture]

- Fabric catalog và recommendation logic phải nằm ở Backend
- Frontend chỉ hiển thị data nhận từ API
- Không hardcode fabric data ở Frontend

**2. REST API Pattern (Không WebSocket)**
> "REST API thuần túy, không sử dụng WebSockets cho tương tác UI" — [Source: architecture.md#API & Communication Patterns]

- Sử dụng `GET` endpoint với query params
- Response được cache tại client nếu cần (TanStack Query optional)

**3. Vietnamese Terminology 100%**
> "Sử dụng 100% thuật ngữ chuyên ngành may mặc Việt Nam" — [Source: project-context.md#Terminology Policy]

- Tên vải: Lụa Hà Đông, Gấm Thái Tuấn, Voan Pháp, Đũi Nam Định...
- Đặc tính: Độ rủ, Độ dày, Độ co dãn, Độ bóng, Khả năng giữ phom

**4. Fabric Card UX (Tesla Configurator Inspiration)**
> "Tesla Configurator (Visualization): Cảm hứng cho Fabric Cards mô phỏng độ rủ và lý tính vật liệu" — [Source: ux-design-specification.md#Inspiring Products Analysis]

- Card visual phải premium và informative
- Texture image giúp khách hàng hình dung chất liệu
- Compatibility badge rõ ràng với Heritage Gold accent

**5. Non-Blocking Optional Feature**
- "Xem gợi ý vải" là tính năng tùy chọn
- User có thể bỏ qua và tiếp tục flow (Story 2.4: Ease Delta)
- Không bắt buộc phải chọn vải để tiếp tục

### Fabric Compatibility Logic (Gợi ý)

Đề xuất logic tính compatibility score:

```python
# Pillar → Preferred Fabric Properties mapping
PILLAR_FABRIC_PREFERENCES = {
    "traditional": {
        "drape": "high",      # Lụa, Gấm cần độ rủ cao
        "thickness": "medium",
        "formality": "formal",
    },
    "minimalist": {
        "drape": "medium",
        "thickness": "light",
        "formality": "smart-casual",
    },
    "avant-garde": {
        "drape": "varied",
        "thickness": "varied",
        "formality": "experimental",
    },
}

# Intensity values ảnh hưởng fabric compatibility:
# - do_om_than > 70 → ưu tiên vải có stretch
# - do_rong_vai > 60 → ưu tiên vải giữ phom tốt
# - chieu_dai_ao < 40 → vải nhẹ phù hợp hơn
```

### Project Structure Notes

```
backend/
├── src/
│   ├── models/fabric.py           # NEW: Fabric Pydantic models
│   ├── services/fabric_service.py # NEW: Fabric recommendation service
│   └── api/v1/fabrics.py          # NEW: Fabric API router
└── tests/
    └── test_fabrics_api.py        # NEW: Fabric API tests

frontend/src/
├── types/fabric.ts                 # NEW: Fabric TypeScript types
├── store/designStore.ts            # MODIFIED: Add fabric state
├── components/client/design/
│   ├── FabricCard.tsx              # NEW: Single fabric card
│   └── FabricRecommendationPanel.tsx # NEW: Fabric list panel
└── app/
    ├── actions/design-actions.ts   # MODIFIED: Add fetchFabricRecommendations
    └── (customer)/design-session/
        └── DesignSessionClient.tsx # MODIFIED: Add FabricRecommendationPanel
```

### Sample Fabric LKB Data (10 loại vải)

```python
FABRICS_LKB = [
    {
        "id": "lua-ha-dong",
        "name": "Lụa Hà Đông",
        "description": "Lụa tơ tằm truyền thống, độ bóng cao, mềm mại và mát khi mặc.",
        "image_url": "/images/fabrics/lua-ha-dong.jpg",
        "properties": {
            "drape": "high",
            "thickness": "light",
            "stretch": "none",
            "shine": "high",
            "formality": "formal",
        },
        "suitable_pillars": ["traditional"],
    },
    {
        "id": "gam-thai-tuan",
        "name": "Gấm Thái Tuấn",
        "description": "Vải gấm dệt hoa văn truyền thống, sang trọng cho áo dài lễ.",
        ...
    },
    # ... 8 loại vải khác
]
```

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#API & Communication Patterns]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Inspiring Products Analysis]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: _bmad-output/implementation-artifacts/2-1-lua-chon-tru-cot-phong-cach.md#Dev Agent Record]
- [Source: _bmad-output/implementation-artifacts/2-2-tinh-chinh-cuong-do-phong-cach.md#Dev Agent Record]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4.6 (claude-sonnet-4-6)

### Debug Log References

### Completion Notes List

1. **Backend Implementation**: Created `fabric.py` models (FabricProperty, FabricResponse, FabricRecommendationResponse), `fabric_service.py` with 10 Vietnamese fabric types in LKB, weighted compatibility scoring based on pillar preferences and intensity adjustments, and `fabrics.py` API router with GET endpoint. Registered router in main.py.

2. **Frontend Implementation**: Created `fabric.ts` types with Zod schemas, extended `designStore.ts` with `fabric_recommendations`, `is_loading_fabrics` state and 3 new actions. Added `fetchFabricRecommendations` server action with AbortController timeout. Built `FabricCard.tsx` (texture placeholder, Vietnamese property tags, Heritage Gold compatibility badges) and `FabricRecommendationPanel.tsx` (fetch button, loading spinner, fabric grid, empty state). Integrated into `DesignSessionClient.tsx`.

3. **Compatibility Scoring Logic**: Uses weighted Manhattan distance between fabric properties and pillar ideal values. Intensity sliders dynamically shift ideal values (e.g., high `do_om_than` → prefer stretch fabrics). Scores mapped to 3 Vietnamese labels: "Rất phù hợp" (≥75), "Phù hợp" (≥50), "Có thể dùng" (<50).

4. **Test Coverage**: 16 backend tests (11 API + 5 unit), 17 frontend tests (6 FabricCard + 6 FabricRecommendationPanel + 5 store). Total: 206 backend + 85 frontend = 291 all passing.

### File List

**New files:**
- `backend/src/models/fabric.py` — Pydantic models for fabric data
- `backend/src/services/fabric_service.py` — FabricService with LKB data and compatibility logic
- `backend/src/api/v1/fabrics.py` — Fabric recommendations API router
- `backend/tests/test_fabrics_api.py` — Backend tests (16 tests)
- `frontend/src/types/fabric.ts` — TypeScript types and Zod schemas
- `frontend/src/components/client/design/FabricCard.tsx` — Single fabric card component
- `frontend/src/components/client/design/FabricRecommendationPanel.tsx` — Fabric panel component
- `frontend/src/__tests__/fabricRecommendation.test.tsx` — Frontend tests (17 tests)

**Modified files:**
- `backend/src/main.py` — Registered fabrics router
- `frontend/src/store/designStore.ts` — Added fabric state and actions
- `frontend/src/types/style.ts` — Extended DesignSessionState and DesignSessionActions with fabric types
- `frontend/src/app/actions/design-actions.ts` — Added fetchFabricRecommendations server action
- `frontend/src/components/client/design/index.ts` — Added FabricCard and FabricRecommendationPanel exports
- `frontend/src/app/(customer)/design-session/DesignSessionClient.tsx` — Integrated FabricRecommendationPanel

## Code Review (AI - 2026-03-04)

**Reviewed by:** Claude Opus 4.5  
**Overall Status:** ✅ **PASS - APPROVED FOR DONE**

### Summary
- ✅ **Implementation Quality:** 5/5 — Clean, well-documented, follows project standards
- ✅ **Architecture:** 5/5 — Perfect SSOT adherence, backend holds fabric catalog
- ✅ **Testing:** 5/5 — Comprehensive coverage (16 backend + 17 frontend = 33 tests)
- ✅ **Vietnamese Terminology:** 5/5 — All fabric names, descriptions, labels in Vietnamese
- ✅ **UX:** 5/5 — Heritage Gold accent for top matches, responsive grid, clear states

### Test Results
- ✅ Backend: **206/206 tests PASSED** (including 16 fabric tests)
- ✅ Frontend: **85/85 tests PASSED** (including 17 fabric tests)

### Acceptance Criteria Verification
- ✅ **AC1:** Fabric Request Trigger — "Xem gợi ý vải" button implemented [`FabricRecommendationPanel.tsx:74-87`]
- ✅ **AC2:** Backend API — `GET /api/v1/fabrics/recommendations?pillar_id={id}&intensities={json}` [`fabrics.py:24-75`]
- ✅ **AC3:** Fabric Card Display — Image, name, description, properties, compatibility badge [`FabricCard.tsx:53-107`]
- ✅ **AC4:** LKB Fabric Data — 10 Vietnamese fabric types hardcoded [`fabric_service.py:99-205`]
- ✅ **AC5:** Vietnamese Terminology 100% — All labels and descriptions in Vietnamese
- ✅ **AC6:** No Blocking — Optional feature, returns null if no pillar selected [`FabricRecommendationPanel.tsx:57-59`]

### Issues Found
- ❌ **CRITICAL:** NONE
- ❌ **HIGH:** NONE
- 🟡 **LOW:** 2 (acceptable for MVP)

### LOW Priority Issues (Non-blocking)

1. **[AI-Review][LOW]** FabricCard uses native `<img>` instead of Next.js `<Image>` component
   - **Location:** `frontend/src/components/client/design/FabricCard.tsx:62`
   - **Impact:** No automatic image optimization
   - **Recommendation:** Consider using `next/image` for production images when real fabric textures are available

2. **[AI-Review][LOW]** FabricService singleton is cached per-process via `@lru_cache` — not shared across workers
   - **Location:** `backend/src/api/v1/fabrics.py:18-21`
   - **Impact:** Each worker loads its own copy of fabric LKB (minimal memory, <1KB)
   - **Recommendation:** Acceptable for MVP; consider Redis cache if fabric catalog grows large

### Implementation Highlights

1. **Compatibility Scoring Algorithm:** Well-designed weighted Manhattan distance with pillar-specific ideal values and intensity-based adjustments. Clean separation of concerns.

2. **Error Handling:** AbortController with 10s timeout in server action, graceful error returns, proper Zod validation.

3. **State Management:** Clean Zustand integration with `fabric_recommendations`, `is_loading_fabrics`, and three actions. Properly clears on session reset.

4. **UX Polish:** Heritage Gold (`#D4AF37`) accent for "Rất phù hợp" badges, loading spinner, empty state, responsive 2-column grid.

### Decision
✅ **APPROVED - READY FOR DONE**

All 6 acceptance criteria satisfied, no blocking issues, excellent code quality and Vietnamese terminology compliance. Story 2.3 is production-ready!
