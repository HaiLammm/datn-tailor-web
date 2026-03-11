# Story 2.4: Dashboard Owner CRUD San Pham Ao Dai

Status: ready-for-dev

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

- [ ] Task 1: Frontend - Tao trang Owner Products voi Server Component (AC: #4, #7)
  - [ ] 1.1: Tao route `(workplace)/owner/products/page.tsx` voi Server Component fetch du lieu ban dau
  - [ ] 1.2: Tao `ProductManagementClient.tsx` client component cho tuong tac (search, pagination)
  - [ ] 1.3: Implement tim kiem theo ten san pham (debounce 300ms) va pagination (10 items/page)
- [ ] Task 2: Frontend - Tao bang danh sach san pham (ProductTable) (AC: #4)
  - [ ] 2.1: Tao component `ProductTable.tsx` hien thi cot: Anh thumbnail, Ten, Loai (category badge), Gia Thue, Gia Ban, Trang thai (StatusBadge), Actions
  - [ ] 2.2: Responsive: desktop hien bang, mobile hien card layout
  - [ ] 2.3: Nut hanh dong: "Sua" (link/modal), "Xoa" (trigger confirm dialog)
- [ ] Task 3: Frontend - Form tao san pham moi (AC: #1, #5)
  - [ ] 3.1: Tao route `(workplace)/owner/products/new/page.tsx` hoac modal
  - [ ] 3.2: Tao component `ProductForm.tsx` su dung React Hook Form + Zod validation
  - [ ] 3.3: Cac truong form: name (required), description, category (select enum), occasion (select enum), material (select enum), color, size_options (multi-select chips), rental_price (required, number), sale_price (number), image_url (URL validate), image_urls (multiple URL inputs)
  - [ ] 3.4: Zod schema validate: name min 2 chars, rental_price > 0, image URLs must be valid http/https, size_options at least 1
  - [ ] 3.5: Submit goi `createGarment` server action, hien Toast thanh cong, redirect ve danh sach
- [ ] Task 4: Frontend - Form sua san pham (AC: #2, #5)
  - [ ] 4.1: Tao route `(workplace)/owner/products/[id]/edit/page.tsx` hoac re-use ProductForm
  - [ ] 4.2: Pre-fill form voi du lieu hien tai tu `fetchGarmentDetail`
  - [ ] 4.3: Submit goi `updateGarment` server action (partial update - chi gui truong thay doi)
  - [ ] 4.4: Hien Toast thanh cong, redirect ve danh sach
- [ ] Task 5: Frontend - Dialog xac nhan xoa va Toast notifications (AC: #3, #6)
  - [ ] 5.1: Tao component `DeleteConfirmDialog.tsx` voi thong bao xac nhan bang tieng Viet
  - [ ] 5.2: Goi `deleteGarment` server action khi xac nhan
  - [ ] 5.3: Tao/tai su dung he thong Toast notification (pattern tu InventoryList micro-toast)
  - [ ] 5.4: TanStack Query cache invalidation sau moi thao tac CRUD (revalidate showroom + products)
- [ ] Task 6: Frontend - Viet comprehensive tests (AC: #1-#7)
  - [ ] 6.1: Unit tests cho ProductForm (validation, submit, pre-fill)
  - [ ] 6.2: Unit tests cho ProductTable (render, pagination, search)
  - [ ] 6.3: Unit tests cho DeleteConfirmDialog (confirm, cancel)
  - [ ] 6.4: Integration tests cho CRUD flow (create -> list -> edit -> delete)

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

### Debug Log References

### Completion Notes List

### File List
