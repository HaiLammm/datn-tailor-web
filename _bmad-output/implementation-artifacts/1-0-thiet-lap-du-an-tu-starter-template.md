# Story 1.0: Thiết lập dự án từ Starter Template

Status: review

## Story

As a **Nhà phát triển**,
I want **khởi tạo cấu trúc thư mục Frontend và Backend từ Starter Template**,
so that **dự án có nền tảng kỹ thuật đúng như Kiến trúc đã định nghĩa**.

## Acceptance Criteria

1. **Cấu trúc Thư mục:** Tạo thành công hai thư mục chính `/frontend` và `/backend` tại root của dự án.
2. **Frontend Initialization:** Khởi tạo Next.js 15/16 thành công với TypeScript, Tailwind CSS, ESLint, App Router và Turbopack.
3. **Backend Initialization:** Khởi tạo FastAPI với Python 3.11+, cấu trúc phân lớp (Layered), và cài đặt sẵn LangGraph, Pydantic v2.
4. **Auth.js v5 Setup:** Cấu hình thành công `auth.ts` và tích hợp `proxy.ts` (Next.js 16 style) để bảo vệ các route.
5. **Database Connection:** Thiết lập tệp `.env` cho cả Frontend và Backend, bao gồm các biến kết nối PostgreSQL 17.
6. **Starter Scripts:** Có các script `npm run dev` (FE) và `uvicorn` (BE) hoạt động bình thường.

## Tasks / Subtasks

- [x] **Khởi tạo Frontend (AC: 2, 6)**
  - [x] Chạy lệnh `npx create-next-app@latest frontend --typescript --tailwind --eslint --app --turbopack --src-dir --import-alias "@/*"`
  - [x] Kiểm tra file `package.json` và cấu trúc `src/app`.
- [x] **Khởi tạo Backend (AC: 3, 6)**
  - [x] Tạo thư mục `backend/src`.
  - [x] Thiết lập môi trường ảo (venv/poetry) và cài đặt: `fastapi`, `uvicorn`, `langgraph`, `pydantic[email]`, `sqlalchemy`, `psycopg2-binary`.
  - [x] Tạo file `main.py` cơ bản với endpoint `/health`.
- [x] **Cấu hình Xác thực Auth.js v5 (AC: 4)**
  - [x] Cài đặt `next-auth@beta`.
  - [x] Tạo file `src/auth.ts` và `src/proxy.ts` (Next.js 16).
  - [x] Tạo API Route `app/api/auth/[...nextauth]/route.ts`.
- [x] **Thiết lập Môi trường & Database (AC: 1, 5)**
  - [x] Tạo tệp `.env` tại root và copy vào `frontend/` và `backend/`.
  - [x] Định nghĩa các biến: `DATABASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`.

## Dev Notes

### Architecture Patterns
- **Monorepo-lite:** Giữ FE và BE trong cùng một repo để dễ quản lý nhưng độc lập về deployment.
- **SSOT Alignment:** Master Geometry JSON sẽ được quản lý bởi Pydantic v2 tại Backend và Zod tại Frontend.
- **Next.js 16 Proxy:** Sử dụng `proxy.ts` thay vì `middleware.ts` để tận dụng Node.js runtime cho Auth logic.

### Technical Stack
- **Frontend:** Next.js 15+, Tailwind CSS, Radix UI (Headless).
- **Backend:** Python 3.11+, FastAPI, LangGraph (Stateful Orchestration).
- **Database:** PostgreSQL 17 + pgvector.

### References
- [Source: _bmad-output/planning-artifacts/architecture.md#Starter Template Evaluation]
- [Source: _bmad-output/planning-artifacts/prd/technical-project-type-requirements.md]

## Dev Agent Record

### Agent Model Used
Antigravity (Claude)

### Completion Notes List
- **Task 1 (Frontend):** Next.js 16.1.6 khởi tạo thành công với TypeScript, Tailwind CSS v4, ESLint v9, App Router, Turbopack. `npm run dev` chạy OK trên port 3000.
- **Task 2 (Backend):** FastAPI 0.133.1 khởi tạo với cấu trúc phân lớp (api/v1, agents, geometry, constraints, models, services). Venv tạo thành công, tất cả dependencies đã cài. `/health` endpoint trả 200 OK. `requirements.txt` generated.
- **Task 3 (Auth.js v5):** `next-auth@beta` cài đặt. `auth.ts` cấu hình JWT session strategy. `proxy.ts` triển khai theo Next.js 16 style (thay middleware.ts). API route `[...nextauth]` created. Build pass.
- **Task 4 (Environment):** `.env` tạo tại root, frontend/, backend/ với DATABASE_URL, AUTH_SECRET, NEXTAUTH_URL, BACKEND_URL. `.gitignore` cập nhật đầy đủ.
- **Validation:** Frontend `npm run build` pass (TypeScript OK, static pages generated, proxy detected). Backend 22/22 pytest tests pass.
- ✅ Resolved review finding [High]: H1 — Added 22 automated tests (test_main.py + test_project_structure.py)
- ✅ Resolved review finding [High]: H2 — AUTH_SECRET replaced with cryptographically-secure random value
- ✅ Resolved review finding [High]: H3 — False positive: Next.js 16 auto-detects `proxy.ts` (build output: `ƒ Proxy (Middleware)`)
- ✅ Resolved review finding [Medium]: M2 — False positive: Next.js 16 uses Turbopack by default (output: `▲ Next.js 16.1.6 (Turbopack)`)
- ✅ Resolved review finding [Medium]: M3 — Added CORSMiddleware to FastAPI with configurable CORS_ORIGINS env var
- ✅ Resolved review finding [Low]: L1 — requirements.txt cleaned to direct dependencies only
- ✅ Resolved review finding [Low]: L2 — next-auth pinned to exact `5.0.0-beta.30`
- ⚠️ Review finding [Medium]: M1 — Git commit is developer responsibility, `.gitignore` is configured

### Change Log
- 2026-02-26: Story 1.0 implemented — all 4 tasks completed, all ACs satisfied.
- 2026-02-26: Code review follow-ups resolved — 7/8 findings addressed (H1, H2, H3, M2, M3, L1, L2). M1 deferred to manual git workflow.

## File List
- `frontend/` (Next.js 16 project)
- `frontend/package.json`
- `frontend/src/auth.ts`
- `frontend/src/proxy.ts`
- `frontend/src/app/api/auth/[...nextauth]/route.ts`
- `frontend/.env`
- `backend/` (FastAPI project)
- `backend/src/main.py` (updated: added CORS middleware)
- `backend/src/__init__.py`
- `backend/src/api/__init__.py`
- `backend/src/api/v1/__init__.py`
- `backend/src/agents/__init__.py`
- `backend/src/geometry/__init__.py`
- `backend/src/constraints/__init__.py`
- `backend/src/models/__init__.py`
- `backend/src/services/__init__.py`
- `backend/tests/__init__.py` (new)
- `backend/tests/test_main.py` (new: 8 tests)
- `backend/tests/test_project_structure.py` (new: 14 tests)
- `backend/requirements.txt` (updated: direct deps only)
- `backend/venv/`
- `backend/.env` (updated: real AUTH_SECRET)
- `.env` (updated: real AUTH_SECRET)
- `.gitignore`
