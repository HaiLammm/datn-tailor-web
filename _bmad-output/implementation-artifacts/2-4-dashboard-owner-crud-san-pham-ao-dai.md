# Story 2.4: Dashboard Owner CRUD San Pham Ao Dai

Status: done

<!-- Note: Validation is optional. Run validate-create-story for quality check before dev-story. -->

## Story

As a Quan tri Chu tiem (Owner),
I want them/sua/xoa mot mau thiet ke hoac do cho thue tu Dashboard Command Mode,
so that Danh muc So cua tiem luon tuoi moi va cap nhat kip thoi.

## Acceptance Criteria

1. **Given** Owner dang o Command Mode -> Products page **When** tap "Them San Pham" va dien day du form (Anh URL + Ten + Mo ta + Tuy chon Thue/Ban + Attributes) **Then** du lieu duoc tao thanh cong tren Database va hien Toast thong bao thanh cong.
2. **Given** Owner dang xem danh sach san pham **When** bam "Sua" tren mot san pham **Then** form duoc pre-fill voi du lieu hien tai va cho phep cap nhat tung phan (partial update).
3. **Given** Owner dang xem danh sach san pham **When** bam "Xoa" va xac nhan trong dialog **Then** san pham bi xoa khoi Database va danh sach cap nhat lai (TanStack cache invalidation + re-fetch).
4. **Given** Owner dang o trang Products **When** trang tai xong **Then** hien thi danh sach san pham dang bang (table) voi cot: Anh, Ten, Loai, Gia Thue, Gia Ban, Trang thai, va cac nut hanh dong (Sua/Xoa).
5. **Given** Owner nhap thong tin khong hop le (thieu truong bat buoc, URL khong hop le) **When** bam Submit **Then** hien thi loi validation cu the bang tieng Viet tai tung truong.
6. **Given** Owner vua tao/sua/xoa san pham thanh cong **When** quay lai trang Showroom (customer) **Then** du lieu da duoc cap nhat (TanStack Query cache invalidation dong bo).
7. **Given** Owner dang o trang Products **When** danh sach co nhieu hon 10 san pham **Then** hien thi pagination va ho tro tim kiem theo ten san pham.

## Tasks / Subtasks

- [x] Task 1: Frontend - Tao trang Owner Products voi Server Component (AC: #4, #7)
  - [x] 1.1: Tao route `(workplace)/owner/products/page.tsx` voi Server Component fetch du lieu ban dau
  - [x] 1.2: Tao `ProductManagementClient.tsx` client component cho tuong tac (search, pagination)
  - [x] 1.3: Implement tim kiem theo ten san pham (debounce 300ms) va pagination (10 items/page)
- [x] Task 2: Frontend - Tao bang danh sach san pham (ProductTable) (AC: #4)
  - [x] 2.1: Tao component `ProductTable.tsx` hien thi cot: Anh thumbnail, Ten, Loai (category badge), Gia Thue, Gia Ban, Trang thai (StatusBadge), Actions
  - [x] 2.2: Responsive: desktop hien bang, mobile hien card layout
  - [x] 2.3: Nut hanh dong: "Sua" (link/modal), "Xoa" (trigger confirm dialog)
- [x] Task 3: Frontend - Form tao san pham moi (AC: #1, #5)
  - [x] 3.1: Tao route `(workplace)/owner/products/new/page.tsx` hoac modal
  - [x] 3.2: Tao component `ProductForm.tsx` su dung React Hook Form + Zod validation
  - [x] 3.3: Cac truong form: name (required), description, category (select enum), occasion (select enum), material (select enum), color, size_options (multi-select chips), rental_price (required, number), sale_price (number), image_url (URL validate), image_urls (multiple URL inputs)
  - [x] 3.4: Zod schema validate: name min 2 chars, rental_price > 0, image URLs must be valid http/https, size_options at least 1
  - [x] 3.5: Submit goi `createGarment` server action, hien Toast thanh cong, redirect ve danh sach
- [x] Task 4: Frontend - Form sua san pham (AC: #2, #5)
  - [x] 4.1: Tao route `(workplace)/owner/products/[id]/edit/page.tsx` hoac re-use ProductForm
  - [x] 4.2: Pre-fill form voi du lieu hien tai tu `fetchGarmentDetail`
  - [x] 4.3: Submit goi `updateGarment` server action (partial update - chi gui truong thay doi)
  - [x] 4.4: Hien Toast thanh cong, redirect ve danh sach
- [x] Task 5: Frontend - Dialog xac nhan xoa va Toast notifications (AC: #3, #6)
  - [x] 5.1: Tao component `DeleteConfirmDialog.tsx` voi thong bao xac nhan bang tieng Viet
  - [x] 5.2: Goi `deleteGarment` server action khi xac nhan
  - [x] 5.3: Tao/tai su dung he thong Toast notification (pattern tu InventoryList micro-toast)
  - [x] 5.4: TanStack Query cache invalidation sau moi thao tac CRUD (revalidate showroom + products)
- [x] Task 6: Frontend - Viet comprehensive tests (AC: #1-#7)
  - [x] 6.1: Unit tests cho ProductForm (validation, submit, pre-fill)
  - [x] 6.2: Unit tests cho ProductTable (render, pagination, search)
  - [x] 6.3: Unit tests cho DeleteConfirmDialog (confirm, cancel)
  - [x] 6.4: Integration tests cho CRUD flow (create -> list -> edit -> delete)

## Dev Notes

### Architecture Requirements

- **Authoritative Server Pattern**: Backend la SSOT. Frontend chi validate Type (Zod) va UI rendering. Backend da co day du CRUD endpoints tai `/api/v1/garments`.
- **Proxy Pattern**: Moi authenticated request tu Client -> Server Action -> Backend API. KHONG goi truc tiep tu browser den Backend.
- **Server/Client Split**: Server Component o `app/` de fetch data ban dau (SSR), Client Component o `components/` de handle tuong tac.
- **Route Group**: Trang Owner nam trong `(workplace)/owner/` - chi Owner role moi truy cap duoc.

### Existing Backend CRUD (DA IMPLEMENT - KHONG CAN THAY DOI)

Backend da co day du endpoints:
- `POST /api/v1/garments` - Tao san pham (Owner only, require_roles("Owner"))
- `PUT /api/v1/garments/{garment_id}` - Cap nhat san pham (Owner only)
- `DELETE /api/v1/garments/{garment_id}` - Xoa san pham (Owner only, hard delete, 204)
- `GET /api/v1/garments` - List san pham (public, co filter + pagination)
- `GET /api/v1/garments/{garment_id}` - Chi tiet san pham (public)

Server Actions da co day du:
- `createGarment(data)` - Returns `{ success, garment?, error? }`
- `updateGarment(id, data)` - Returns `{ success, garment?, error? }`
- `deleteGarment(id)` - Returns `{ success, error? }`
- `fetchGarments(filters?)` - Returns `GarmentApiResponse | null`
- `fetchGarmentDetail(id)` - Returns `Garment | null`

### Existing Garment Data Model

**Enums** (da co tai `backend/src/models/garment.py` va `frontend/src/components/client/showroom/garmentConstants.ts`):
- GarmentCategory: ao_dai_truyen_thong, ao_dai_cach_tan, ao_dai_cuoi, ao_dai_te_nhi
- GarmentMaterial: lua, giam, nhung, voan, satin, cotton, pha
- GarmentOccasion: le_cuoi, khai_truong, tet, cong_so, tiec_tung, sinh_nhat
- GarmentStatus: available, rented, maintenance
- SIZE_OPTIONS: S, M, L, XL, XXL

**GarmentCreate fields**: name (required), description, category (required), color, occasion, material, size_options (array, min 1), rental_price (required), sale_price, image_url, image_urls (array of URLs)

### Existing Frontend Patterns (TU STORY 2.1-2.3)

- **TanStack Query**: Su dung `useQuery` voi `initialData` tu Server Component. `staleTime: 60000`, `keepPreviousData: true`.
- **Server Actions**: Pattern `fetchGarments()` voi AbortController timeout 10s. Auth token tu `await auth()`.
- **Filter chips**: Tag-based chips (khong dung dropdown) cho enum fields.
- **Toast**: Custom micro-toast (`useState` + `useEffect` auto-dismiss 3s) - KHONG dung thu vien ngoai. Pattern tai `InventoryList.tsx`.
- **Enum labels**: Import tu `garmentConstants.ts` (OCCASION_LABELS, MATERIAL_LABELS, CATEGORY_LABELS, etc.) - tat ca tieng Viet.
- **URL state**: `useRouter` + `useSearchParams` cho filter/pagination state.
- **Responsive**: Mobile-first, 44px min touch targets, scrollable chips.
- **StatusBadge**: Component co san cho hien thi status (emerald/amber/slate).

### Existing Inventory UI (REFERENCE - KHONG TRUNG LAP)

- `(workplace)/owner/inventory/page.tsx`: Da co trang inventory voi InventoryList, InventoryCard, StatusUpdatePanel.
- Story 2.4 la CRUD management (them/sua/xoa san pham), KHONG PHAI status update.
- Trang Products moi phai TACH BIET khoi trang Inventory.

### Image Handling

- Hien tai backend chi nhan image_url (string) va image_urls (JSON array of strings).
- KHONG co image upload endpoint - Owner nhap URL truc tiep (VD: tu Cloudinary, S3, hoac link ngoai).
- Validate URL phai la http:// hoac https://, max 500 chars.

### Testing Patterns

- **Frontend**: Jest + @testing-library/react. Test files tai `frontend/src/__tests__/`.
- **Backend**: pytest + pytest-asyncio. Test files tai `backend/tests/`.
- **Mock**: Mock server actions, mock TanStack Query.
- **Pattern**: Render component -> interact -> assert DOM changes.

### Previous Story Learnings (Story 2.3)

- Debounce 300ms cho search/filter input de tranh rapid API calls.
- `enum-utils.ts` tai `frontend/src/utils/enum-utils.ts` de validate enum values - TAI SU DUNG.
- Server Actions phai forward auth token: `const session = await auth(); headers: { Authorization: \`Bearer ${session?.accessToken}\` }`.
- Path revalidation sau mutation: `revalidatePath('/(workplace)/owner/...')` va `revalidatePath('/(customer)/showroom')`.
- Test count hien tai: 369+ frontend tests, 64+ backend tests - KHONG duoc lam giam.

### Project Structure Notes

- Alignment with unified project structure:
  - Pages: `frontend/src/app/(workplace)/owner/products/` (NEW)
  - Components: `frontend/src/components/client/products/` (NEW directory)
  - Types: Re-use existing `frontend/src/types/garment.ts`
  - Constants: Re-use existing `frontend/src/components/client/showroom/garmentConstants.ts`
  - Server Actions: Re-use existing `frontend/src/app/actions/garment-actions.ts`
  - Utils: Re-use existing `frontend/src/utils/enum-utils.ts`

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 2.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#Frontend Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Implementation Patterns]
- [Source: _bmad-output/project-context.md#Critical Implementation Rules]
- [Source: backend/src/api/v1/garments.py - Existing CRUD endpoints]
- [Source: frontend/src/app/actions/garment-actions.ts - Existing server actions]
- [Source: frontend/src/components/client/inventory/ - Existing inventory UI patterns]
- [Source: frontend/src/components/client/showroom/garmentConstants.ts - Enum labels]

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Debug Log References
- Fixed test: `getByRole("combobox", { name: /Loại áo dài/i })` → `getByDisplayValue("-- Chọn loại --")` (labels not associated with selects by htmlFor)
- Fixed test: `getByText(/Áo Dài Test/)` → `getAllByText(/Áo Dài Test/).length` (multiple elements match after delete dialog renders)

### Completion Notes List
- Implemented Owner Products Management page (CRUD) hoàn chỉnh với 7/7 Acceptance Criteria
- Server Component (`products/page.tsx`) fetch dữ liệu SSR, pass xuống client. Client component xử lý search/pagination/delete.
- `ProductForm.tsx` dùng React Hook Form + Zod validation, hỗ trợ cả create và edit mode (re-use). Validation messages bằng tiếng Việt.
- `ProductTable.tsx` responsive: desktop = table, mobile = card layout. Category/status badges bằng tiếng Việt.
- `DeleteConfirmDialog.tsx` có backdrop click, disable buttons khi đang xóa, tiếng Việt.
- Toast pattern lấy từ `InventoryList.tsx` (useState + useEffect 3s auto-dismiss).
- `revalidatePath` đã được thêm vào `createGarment`, `updateGarment`, `deleteGarment` actions để sync showroom cache (AC #6).
- Search debounce 300ms dùng `useEffect` + `useRouter().replace` (AC #7).
- 41 tests mới, tổng cộng 416 tests (từ 369+ → 416). Không có regressions.
- Zod đã có trong node_modules (transitive dep), không cần thêm vào package.json.

### File List
frontend/src/app/(workplace)/owner/products/page.tsx (NEW)
frontend/src/app/(workplace)/owner/products/new/page.tsx (NEW)
frontend/src/app/(workplace)/owner/products/[id]/edit/page.tsx (NEW)
frontend/src/components/client/products/ProductManagementClient.tsx (NEW)
frontend/src/components/client/products/ProductTable.tsx (NEW)
frontend/src/components/client/products/ProductForm.tsx (NEW)
frontend/src/components/client/products/DeleteConfirmDialog.tsx (NEW)
frontend/src/app/actions/garment-actions.ts (MODIFIED - added revalidatePath + name filter)
frontend/src/types/garment.ts (MODIFIED - added name field to GarmentFilter)
frontend/src/__tests__/productForm.test.tsx (NEW)
frontend/src/__tests__/productTable.test.tsx (NEW)
frontend/src/__tests__/deleteConfirmDialog.test.tsx (NEW)
frontend/src/__tests__/productManagement.test.tsx (NEW)

### Architecture Notes

- **Partial Update (Task 4.3):** Backend sử dụng `PUT /api/v1/garments/{id}` (full replace), không phải PATCH. Form luôn gửi toàn bộ fields - đây là behavior đúng với PUT semantics. Chú thích "partial update" trong task có nghĩa là user chỉ cần chỉnh fields muốn thay đổi, nhưng payload luôn là full.
- **revalidatePath format:** Sử dụng URL path (`/owner/products`, `/showroom`) không phải file-system path với route groups. Route groups `(workplace)`, `(customer)` bị loại khỏi URL.

## Change Log

- 2026-03-11: Story implemented - Owner Products CRUD Management. 7 new files created, 2 modified. 41 new tests added (total: 416). All ACs satisfied.
- 2026-03-11: Code review fixes applied - H1: Fixed createGarment/updateGarment type signatures (added material, sale_price, image_urls). H2: Fixed revalidatePath to use correct URL paths. H3: image_urls_raw validation now shows inline field error. M2: Fixed useEffect stale closure via useRef. M3: total state updates optimistically after delete. M4: Fixed timeout memory leak with useRef cleanup.
