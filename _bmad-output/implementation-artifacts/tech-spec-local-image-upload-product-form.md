---
title: 'Local Image Upload for Product Form'
slug: 'local-image-upload-product-form'
created: '2026-03-31'
status: 'implementation-complete'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['FastAPI', 'Python 3.11+', 'Next.js 16 App Router', 'React Hook Form', 'Zod', 'Pydantic v2', 'SQLAlchemy AsyncSession']
files_to_modify:
  - 'backend/src/api/v1/uploads.py (NEW)'
  - 'backend/src/main.py'
  - 'backend/src/models/garment.py'
  - 'frontend/src/components/client/products/ProductForm.tsx'
  - 'frontend/src/app/actions/garment-actions.ts'
  - 'frontend/next.config.ts'
code_patterns:
  - 'Backend routers: APIRouter with prefix, Depends for auth/tenant'
  - 'Auth: require_roles("Owner") + get_tenant_id_from_user'
  - 'Frontend: Server Actions forward auth token via Bearer header'
  - 'Form: React Hook Form + zodResolver, inline Zod schema'
  - 'API calls: fetch with AbortController timeout pattern'
test_patterns: []
---

# Tech-Spec: Local Image Upload for Product Form

**Created:** 2026-03-31

## Overview

### Problem Statement

Owner phải nhập URL ảnh thủ công khi tạo/sửa sản phẩm — không tiện dụng và yêu cầu phải có external image hosting. Cần cho phép chọn ảnh trực tiếp từ máy để upload.

### Solution

Thay thế hoàn toàn URL input fields bằng file picker cho phép chọn ảnh từ local. Tạo backend upload endpoint lưu ảnh vào static folder và serve static files. Hiển thị thumbnail preview sau khi chọn file.

### Scope

**In Scope:**
- Backend: endpoint upload ảnh (lưu local disk), serve static files via FastAPI StaticFiles
- Frontend: file picker cho ảnh chính + ảnh bổ sung với thumbnail preview
- Xóa bỏ hoàn toàn URL input fields
- Backward-compatible: garment data cũ với external URLs vẫn hiển thị bình thường

**Out of Scope:**
- Cloud storage (S3, Cloudinary)
- Image optimization/resize
- Drag & drop

## Context for Development

### Codebase Patterns

- **Backend routers:** `APIRouter(prefix="/api/v1/...")`, auth via `Depends(require_roles("Owner"))`, tenant via `Depends(get_tenant_id_from_user)`
- **Backend main.py:** `app.include_router(...)` pattern, no StaticFiles mount yet
- **Garment model:** `GarmentBase` has `image_url: str | None` and `image_urls: list[str]` with URL regex validator `^https?://\S+$`
- **Frontend Server Actions:** `garment-actions.ts` — `getAuthToken()` via `auth()`, fetch with `AbortController` timeout, `revalidatePath` after mutations
- **Frontend form:** `ProductForm.tsx` — React Hook Form + Zod, `image_url` as text input, `image_urls_raw` as textarea (newline-separated URLs)
- **Next.js config:** `next.config.ts` has `images.remotePatterns` for `https://**`, rewrites proxy `/api/v1/*` to backend
- **Next.js proxy:** `proxy.ts` replaces `middleware.ts` for auth/routing (project rule: NO middleware.ts)

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `frontend/src/components/client/products/ProductForm.tsx` | Form tạo/sửa sản phẩm — replace URL inputs with file pickers + preview |
| `backend/src/api/v1/garments.py` | Garment CRUD endpoints — reference auth/router patterns |
| `backend/src/models/garment.py` | Garment Pydantic schemas — update `image_url`/`image_urls` validators |
| `backend/src/main.py` | App entry — mount StaticFiles, register upload router |
| `frontend/src/app/actions/garment-actions.ts` | Server actions — add `uploadGarmentImages` action |
| `frontend/next.config.ts` | Next.js config — add localhost to image remotePatterns |
| `backend/src/api/dependencies.py` | Auth dependencies — `require_roles`, `get_tenant_id_from_user` |

### Technical Decisions

1. **Storage:** Lưu ảnh vào `backend/uploads/garments/` folder, serve qua FastAPI `StaticFiles` mount tại `/uploads`
2. **Naming:** File được rename thành UUID để tránh trùng lặp: `{uuid}.{ext}`
3. **Upload flow:** Frontend gửi file qua `multipart/form-data` → Backend lưu file, trả về URL → Frontend dùng URL đó khi submit form garment
4. **Backward-compatible:** Backend trả về full URL cho uploaded files (e.g. `http://localhost:8000/uploads/garments/{uuid}.jpg`). Garment model validators chấp nhận cả external URLs lẫn upload URLs.
5. **Next.js Image:** Thêm `localhost` vào `remotePatterns` để Next.js Image component load ảnh từ backend.

## Implementation Plan

### Tasks

- [ ] **Task 1: Create backend upload endpoint**
  - File: `backend/src/api/v1/uploads.py` (NEW)
  - Action: Create new router `APIRouter(prefix="/api/v1/uploads", tags=["uploads"])`
  - Endpoint: `POST /api/v1/uploads/images` — accepts `List[UploadFile]`, auth via `require_roles("Owner")`
  - Logic:
    - Validate each file: content_type in `["image/jpeg", "image/png", "image/webp"]`, size <= 5MB
    - Create `uploads/garments/` directory if not exists
    - Save each file as `{uuid4}.{ext}` to `uploads/garments/`
    - Return `{"data": {"urls": ["http://{host}/uploads/garments/{uuid}.jpg", ...]}}` 
  - Notes: Use `python-multipart` (FastAPI dependency for UploadFile). Use sync file write in `asyncio.to_thread` or plain sync write.

- [ ] **Task 2: Mount StaticFiles and register upload router**
  - File: `backend/src/main.py`
  - Action:
    - Add `from fastapi.staticfiles import StaticFiles`
    - Add `from src.api.v1.uploads import router as uploads_router`
    - Mount static files: `app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")` — place AFTER all `include_router` calls
    - Register router: `app.include_router(uploads_router)`
  - Notes: Ensure `uploads/` directory exists at backend root. Create it in lifespan or let endpoint create on demand.

- [ ] **Task 3: Update Garment model validators**
  - File: `backend/src/models/garment.py`
  - Action: Update `validate_image_urls` in `GarmentBase` to accept both external URLs (`^https?://`) and internal upload paths (`/uploads/`). Update regex pattern to: `^(https?://\S+|/uploads/\S+)$`
  - Notes: `image_url` field in `GarmentBase` has `max_length=500` — no change needed. `GarmentUpdate` inherits no validators for image_urls, so no change needed there.

- [ ] **Task 4: Add upload Server Action**
  - File: `frontend/src/app/actions/garment-actions.ts`
  - Action: Add new server action `uploadGarmentImages(formData: FormData)`
    - Get auth token via `getAuthToken()`
    - POST to `${BACKEND_URL}/api/v1/uploads/images` with `formData` body (NO `Content-Type` header — let browser set multipart boundary)
    - Return `{ success: boolean; urls?: string[]; error?: string }`
  - Notes: Follow existing fetch + AbortController timeout pattern. Auth via `Authorization: Bearer ${token}`.

- [ ] **Task 5: Replace URL inputs with file pickers in ProductForm**
  - File: `frontend/src/components/client/products/ProductForm.tsx`
  - Action:
    - **Remove** `image_url` and `image_urls_raw` from Zod schema and form fields
    - **Remove** `URL_REGEX` constant
    - **Add state:** `const [primaryImage, setPrimaryImage] = useState<File | null>(null)` and `const [additionalImages, setAdditionalImages] = useState<File[]>([])`
    - **Add state:** `const [primaryPreview, setPrimaryPreview] = useState<string | null>(garment?.image_url ?? null)` and `const [additionalPreviews, setAdditionalPreviews] = useState<string[]>(garment?.image_urls ?? [])`
    - **Add state:** `const [uploadError, setUploadError] = useState<string | null>(null)`
    - **Add UI — Primary image picker:**
      - Hidden `<input type="file" accept="image/jpeg,image/png,image/webp">` with ref
      - Button "Chọn ảnh chính" triggers file input click
      - On change: set `primaryImage` state, create preview via `URL.createObjectURL(file)`
      - Show thumbnail preview (rounded, ~120px) with remove button (X)
    - **Add UI — Additional images picker:**
      - Hidden `<input type="file" accept="image/jpeg,image/png,image/webp" multiple>` with ref
      - Button "Thêm ảnh" triggers file input click
      - On change: append to `additionalImages` state, create previews
      - Show grid of thumbnail previews with individual remove buttons
    - **Update `onSubmit`:**
      - Before submitting garment data, upload new files (if any) via `uploadGarmentImages`
      - Build `FormData` with all new files
      - Get returned URLs, combine with existing preview URLs (for edit mode — URLs already on server)
      - Set `image_url` and `image_urls` in payload from upload results
    - **Edit mode:** When `garment` prop exists, show existing images as previews. Allow removing existing images. Track which are new files vs existing URLs.
  - Notes: Cleanup `URL.createObjectURL` via `URL.revokeObjectURL` in useEffect cleanup. Validate file type/size client-side before upload.

- [ ] **Task 6: Update Next.js config for backend images**
  - File: `frontend/next.config.ts`
  - Action: Add `localhost` pattern to `images.remotePatterns`:
    ```ts
    {
      protocol: "http",
      hostname: "localhost",
      port: "8000",
      pathname: "/uploads/**",
    }
    ```
  - Notes: This allows Next.js `<Image>` component to load images from backend. Existing `https://**` pattern remains for backward-compatible external URLs.

### Acceptance Criteria

- [ ] **AC 1:** Given Owner is on `/owner/products/new`, when they click "Chọn ảnh chính", then a native file picker dialog opens allowing selection of jpg/png/webp files
- [ ] **AC 2:** Given Owner selected a local image file, when file is chosen, then a thumbnail preview (~120px) appears immediately in the form
- [ ] **AC 3:** Given Owner has selected a primary image and additional images, when they submit the form, then files are uploaded to backend and garment is created with correct `image_url` and `image_urls` pointing to uploaded files
- [ ] **AC 4:** Given Owner tries to upload a file that is not jpg/png/webp, when they select it, then an error message is shown and the file is rejected
- [ ] **AC 5:** Given Owner tries to upload a file larger than 5MB, when they select it, then an error message is shown and the file is rejected
- [ ] **AC 6:** Given Owner is editing an existing garment with images, when the edit form loads, then existing images are shown as previews
- [ ] **AC 7:** Given Owner removes an image preview (click X), when they submit the form, then the removed image is not included in the garment data
- [ ] **AC 8:** Given Owner adds multiple additional images, when they click "Thêm ảnh" multiple times, then all selected images accumulate in the preview grid
- [ ] **AC 9:** Given a garment was created with old URL-based images, when viewed in showroom/gallery, then old images still display correctly (backward-compatible)
- [ ] **AC 10:** Given an unauthenticated user, when they try to call POST `/api/v1/uploads/images`, then they receive 401 Unauthorized

## Additional Context

### Dependencies

- `python-multipart` — Required by FastAPI for `UploadFile` handling. Check if already in `requirements.txt`; add if missing.
- No new frontend npm packages needed — native `<input type="file">` and `URL.createObjectURL` are browser APIs.

### Testing Strategy

**Manual Testing:**
1. Create new product: select primary image + 2 additional images → verify upload, preview, and garment creation
2. Edit existing product: verify existing images show as previews, add new images, remove one existing → verify save
3. Try uploading invalid file type (e.g. `.pdf`) → verify rejection with error message
4. Try uploading file > 5MB → verify rejection
5. Submit form without any images → verify garment created with null image_url and empty image_urls
6. Check old garments with external URLs still display in showroom

**Backend Endpoint Testing (curl/httpie):**
1. POST `/api/v1/uploads/images` with valid image → 200 + URL returned
2. POST `/api/v1/uploads/images` without auth → 401
3. POST `/api/v1/uploads/images` with non-Owner role → 403
4. POST `/api/v1/uploads/images` with invalid file type → 422
5. GET `/uploads/garments/{filename}` → serves image file

### Notes

- Garment data cũ có external URLs vẫn hoạt động — ProductImageGallery và các nơi hiển thị ảnh không cần thay đổi
- `uploads/` folder nên được thêm vào `.gitignore`
- Trong production, nên cân nhắc chuyển sang cloud storage (S3) — nhưng out of scope hiện tại
- File size limit 5MB là hợp lý cho ảnh sản phẩm áo dài
