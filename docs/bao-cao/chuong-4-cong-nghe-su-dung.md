---
title: "Chương 4 — Công nghệ sử dụng"
project: tailor_project (Nhà May Thanh Lộc)
group: Nhóm 1 — Đồ án Công nghệ phần mềm
author: Lem
date: 2026-04-15
language: vi
---

# Chương 4. Công nghệ sử dụng

Chương này trình bày chi tiết ngăn xếp công nghệ (tech stack) của hệ thống, lý do lựa chọn cho từng thành phần, và so sánh với các phương án thay thế phổ biến. Mọi phiên bản ghi nhận đều dựa trên `package.json` (frontend) và `requirements.txt` (backend) tại thời điểm triển khai.

## 4.1. Tổng quan theo tầng

```mermaid
flowchart TB
    subgraph FE["Frontend"]
        N["Next.js 16.1.6"]
        R["React 19.2.3"]
        TS["TypeScript 5"]
        TW["TailwindCSS v4"]
        ZU["Zustand 5.0.11"]
        TQ["TanStack Query 5.90.21"]
        NA["NextAuth 5 beta.30"]
        FM["Framer Motion 12.35.2"]
        RX["Radix UI"]
    end

    subgraph BE["Backend"]
        FA["FastAPI >= 0.133"]
        PY["Python 3.13"]
        PD["Pydantic V2 >= 2.12"]
        SA["SQLAlchemy 2.0 async"]
        AP["asyncpg >= 0.30"]
        LG["LangGraph >= 1.0"]
    end

    subgraph DB["Database"]
        PG["PostgreSQL 17"]
        PV["pgvector 0.8.x"]
    end

    FE -->|"REST API (JSON)"| BE
    BE -->|"asyncpg"| DB
```

## 4.2. Frontend

### 4.2.1. Next.js 16 — Framework chính

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 16.1.6 |
| **Vai trò** | Full-stack React framework: SSR, SSG, App Router, Server Actions |
| **Runtime** | Node.js 20.9+ |

**Lý do lựa chọn:**

- **App Router** cho phép tổ chức Route Groups — nền tảng của kiến trúc Dual-Mode UI (`(customer)/` vs `(workplace)/`).
- **Server Components** (mặc định) tách biệt phần tĩnh (SEO, layout) và phần tương tác (Client Components) → giảm bundle JavaScript gửi xuống browser.
- **Server Actions** thay thế API routes truyền thống cho các mutation đơn giản (tạo đơn, cập nhật profile) → code gọn hơn, tích hợp tự nhiên với `revalidatePath`.
- **Turbopack** (dev mode) cho tốc độ hot reload nhanh hơn đáng kể so với Webpack.

**So sánh với phương án thay thế:**

| Tiêu chí | Next.js 16 (đã chọn) | Nuxt 3 (Vue) | Remix |
|---|---|---|---|
| Route Groups (Dual-Mode UI) | Có — native | Không có tương đương trực tiếp | Không có |
| Server Components | Có (React 19 RSC) | Không | Không |
| Server Actions | Có — native | Không | Form action (khác cách tiếp cận) |
| Hệ sinh thái component | Rất lớn (React) | Lớn (Vue) | Lớn (React) nhưng kém middleware |
| Triển khai Vercel | Tối ưu nhất | Hỗ trợ nhưng không native | Hỗ trợ |

→ Next.js 16 là lựa chọn duy nhất hỗ trợ đồng thời Route Groups + RSC + Server Actions — ba tính năng then chốt cho kiến trúc Dual-Mode UI và Proxy Pattern.

### 4.2.2. React 19 — UI Library

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 19.2.3 |
| **Vai trò** | Component model, hooks, concurrent features |

React 19 mang đến Server Components ổn định (không còn experimental) và `use()` hook cho data fetching — cần thiết khi kết hợp với Next.js App Router.

### 4.2.3. TypeScript 5 — Type System

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 5.x |
| **Vai trò** | Type-safe toàn bộ frontend: components, hooks, store, server actions, types |

20 file type definitions trong `src/types/` đảm bảo type-safe xuyên suốt từ API response đến UI rendering. Mỗi domain object (order, garment, pattern, customer...) có một file type riêng.

### 4.2.4. TailwindCSS v4 — Styling

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 4.x (qua `@tailwindcss/postcss`) |
| **Vai trò** | Utility-first CSS, Heritage Palette tokens, Adaptive Density spacing |

TailwindCSS v4 sử dụng Oxide engine (viết bằng Rust) cho tốc độ build nhanh hơn v3. Heritage Palette (10 color tokens từ UX-DR1) được cấu hình dưới dạng CSS variables — cho phép chuyển đổi Boutique/Command mode chỉ bằng thay đổi biến CSS ở layout wrapper.

### 4.2.5. State Management — Zustand + TanStack Query

| Công cụ | Phiên bản | Phạm vi | Vai trò |
|---|---|---|---|
| **Zustand** | 5.0.11 | Local UI State | Cart, design session, slider values, modal visibility |
| **TanStack Query** | 5.90.21 | Server State | Fetch, cache, invalidation cho orders, profiles, patterns, KPI |

**So sánh với phương án thay thế:**

| Tiêu chí | Zustand + TanStack Query (đã chọn) | Redux Toolkit + RTK Query | Jotai + SWR |
|---|---|---|---|
| Boilerplate | Rất thấp (< 10 dòng cho 1 store) | Cao (slices, reducers, middleware) | Thấp |
| Tách Local vs Server state | Rõ ràng (2 tool riêng) | Gộp chung trong Redux | Rõ ràng |
| Re-render performance | Tốt (selector-based) | Phụ thuộc cách viết selector | Tốt (atomic) |
| Bundle size | Nhỏ (Zustand ~1KB + TQ ~13KB) | Lớn (~30KB) | Nhỏ |
| Immer middleware | Có (nested state) | Built-in | Không native |
| DevTools | Có | Có | Hạn chế |

→ Zustand + TanStack Query cho bundle nhỏ nhất, tách biệt rõ Local/Server state, phù hợp với Authoritative Server Pattern (TanStack Query luôn invalidate khi checkout, không tin Zustand cache giá).

### 4.2.6. Authentication — NextAuth v5

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 5.0.0-beta.30 (Auth.js v5) |
| **Vai trò** | JWT session trong HttpOnly Secure cookie |

NextAuth v5 tích hợp native với Next.js App Router (route handler tại `app/api/auth/`). Cookie được set `HttpOnly + Secure + SameSite=Lax` → đáp ứng NFR15. Proxy pattern đọc cookie này để đính JWT vào header khi gọi FastAPI.

### 4.2.7. UI Primitives & Animation

| Công cụ | Phiên bản | Vai trò |
|---|---|---|
| **Radix UI** (primitives: Dialog, Dropdown, Tooltip...) | 1.1.15+ | Accessible primitives không áp đặt style → dễ tuỳ biến cho Boutique vs Command |
| **Framer Motion** | 12.35.2 | Page transitions (fade/slide), card hover, layout reorder, scroll hero. Boutique Mode animation-heavy, Command Mode animation-light |
| **react-hook-form** + `@hookform/resolvers` | 7.71 / 5.2 | Form state management, validation (Zod resolver) |
| **recharts** | 3.8.0 | Biểu đồ doanh thu, KPI sparkline trên Owner Dashboard |
| **react-medium-image-zoom** | 5.4.1 | HD zoom cho product detail (FR31) |

### 4.2.8. Testing & Build tooling

| Công cụ | Phiên bản | Vai trò |
|---|---|---|
| **Jest** | 30.2.0 | Test runner |
| **@testing-library/react** | 16.3.2 | Component test với DOM queries |
| **@testing-library/jest-dom** | 6.9.1 | Custom matchers (toBeInTheDocument, toHaveClass...) |
| **@testing-library/user-event** | 14.6.1 | Simulate user interactions |
| **ts-jest** | 29.4.6 | TypeScript transform cho test |
| **ESLint** + `eslint-config-next` | 9.x / 16.1.6 | Lint rules chuẩn Next.js |
| **Turbopack** | Bundled with Next.js 16 | Dev bundler (nhanh hơn Webpack) |

## 4.3. Backend

### 4.3.1. FastAPI — Framework chính

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | >= 0.133.0 |
| **Runtime** | Python 3.13 + Uvicorn (uvloop) |
| **Vai trò** | Async REST API, dependency injection, auto-gen OpenAPI docs |

**Lý do lựa chọn:**

- **Async-native:** toàn bộ handler và DB session đều `async def` → xử lý I/O đồng thời hiệu quả (NFR4 < 300 ms, NFR5 100 concurrent).
- **Pydantic V2 tích hợp sâu:** request/response validation tự động, error messages tiếng Việt cho 422 (NFR18).
- **Dependency Injection:** `OwnerOnly`, `TenantId`, `get_db` — hệ thống auth/tenant injection sạch, tái sử dụng xuyên suốt 30 router.
- **Auto OpenAPI docs:** Swagger UI tại `/docs` — hỗ trợ test nhanh trong quá trình phát triển.

**So sánh với phương án thay thế:**

| Tiêu chí | FastAPI (đã chọn) | Django REST Framework | Express.js (Node) |
|---|---|---|---|
| Async native | Có (ASGI) | Hạn chế (WSGI, Django 5 mới bắt đầu async) | Có |
| Request validation | Pydantic V2 (Rust core, rất nhanh) | Serializer (chậm hơn) | Phải thêm Joi/Zod |
| Dependency Injection | Built-in, mạnh | Không có DI pattern chuẩn | Không native |
| Auto API docs | OpenAPI 3.0 tự động | Cần DRF Spectacular | Cần Swagger middleware |
| AI/ML ecosystem | Python native (LangGraph, pgvector) | Python native | Cần bridge sang Python |
| Type safety | Pydantic + mypy | Serializer (runtime) | TypeScript (nếu dùng TS) |

→ FastAPI vượt trội ở ba điểm: async hiệu năng cao, Pydantic V2 validation nhanh (quan trọng cho validate mảng SVG Deltas lớn), và hệ sinh thái AI Python native (LangGraph cho Epic 12–14).

### 4.3.2. Pydantic V2 — Validation & Schemas

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | >= 2.12.0 (kèm email validator) |
| **Vai trò** | Request/response schema, DB model validation, min/max range cho số đo (FR99) |

Pydantic V2 có core viết bằng Rust → nhanh hơn V1 từ 5 đến 50 lần tuỳ loại dữ liệu. Đặc biệt quan trọng khi validate `PatternSessionCreate` với 10 trường số đo NUMERIC, mỗi trường có min/max range riêng.

### 4.3.3. SQLAlchemy 2.0 async + asyncpg — ORM & Driver

| Công cụ | Phiên bản | Vai trò |
|---|---|---|
| **SQLAlchemy** | >= 2.0.0 | Async ORM, declarative models, session management |
| **asyncpg** | >= 0.30.0 | PostgreSQL async driver (nhanh nhất cho Python) |
| **psycopg2-binary** | >= 2.9.0 | Sync driver cho migration scripts |

SQLAlchemy 2.0 hỗ trợ `async_sessionmaker` + `AsyncSession` — cho phép mọi truy vấn DB chạy non-blocking. Auto-commit khi handler return, auto-rollback khi exception (xem `core/database.py`).

### 4.3.4. LangGraph — AI Orchestration (Epic 12–14)

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | >= 1.0.0 |
| **Vai trò** | Workflow graph cho Emotional Compiler (dịch cảm xúc → Ease Delta) |
| **Trạng thái** | Cài sẵn, chạy khi Epic 12–14 triển khai |

LangGraph mô hình hoá workflow AI đa bước dưới dạng graph — phù hợp cho chuỗi: *nhận tính từ → tra pgvector → sinh Ease Delta → validate constraints → output Master Geometry*. Kết hợp với Langfuse để trace từng bước suy luận (NFR16).

### 4.3.5. Các thư viện hỗ trợ

| Thư viện | Phiên bản | Vai trò |
|---|---|---|
| **python-jose[cryptography]** | >= 3.3.0 | JWT encode/decode (HS256) |
| **bcrypt** | >= 4.0.1 | Hash mật khẩu (work factor 12) |
| **aiosmtplib** | >= 3.0.0 | Async SMTP — gửi OTP, thông báo đơn, nhắc trả đồ |
| **python-multipart** | >= 0.0.20 | Xử lý multipart/form-data (file upload) |
| **python-dotenv** | >= 1.0.0 | Load biến môi trường từ `.env` |
| **ezdxf** | >= 1.4.0 | Xuất DXF cho pipeline CAD/CNC tương lai |

### 4.3.6. Backend Testing

| Công cụ | Phiên bản | Vai trò |
|---|---|---|
| **pytest** | >= 9.0.0 | Test runner |
| **pytest-asyncio** | >= 1.3.0 | Async test support cho `async def` test functions |
| **httpx** | >= 0.28.0 | Async HTTP client — test FastAPI endpoints end-to-end |
| **aiosqlite** | >= 0.20.0 | SQLite async — in-memory DB cho test (tách biệt PG production) |

## 4.4. Database

### 4.4.1. PostgreSQL 17 — RDBMS chính

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 17 |
| **Vai trò** | ACID-compliant store cho orders, inventory, payments, measurements |

**Lý do lựa chọn:**

- **ACID transactions** cho giỏ hàng, đặt slot booking, cập nhật tồn kho — đảm bảo NFR10 (nhất quán dưới concurrent access).
- **JSONB** cho `master_geometry` (designs) và `geometry_params` (pattern_pieces) — linh hoạt mà vẫn queryable.
- **pgvector extension** cho semantic search trong cùng engine — không cần thêm Redis/Elasticsearch.

**So sánh với phương án thay thế:**

| Tiêu chí | PostgreSQL 17 (đã chọn) | MySQL 8 | MongoDB 7 |
|---|---|---|---|
| ACID cho orders/inventory | Hoàn chỉnh | Hoàn chỉnh | Hạn chế (multi-doc transaction chậm) |
| JSONB query | Mạnh (GIN index) | JSON function (yếu hơn) | Native (mạnh) |
| Vector search (pgvector) | Có — trong cùng engine | Không native | Atlas Vector Search (managed) |
| Async driver Python | asyncpg (rất nhanh) | aiomysql (chậm hơn) | motor (tốt) |
| Multi-tenancy row-level | Dễ (tenant_id + RLS nếu cần) | Dễ | Dễ |
| Cộng đồng + tooling | Rất lớn | Rất lớn | Lớn |

→ PostgreSQL vượt trội nhờ kết hợp ACID cho e-commerce + pgvector cho AI semantic search trong cùng một engine, giảm độ phức tạp vận hành.

### 4.4.2. pgvector 0.8.x — Vector Search Extension

| Thuộc tính | Giá trị |
|---|---|
| **Phiên bản** | 0.8.x |
| **Vai trò** | Semantic search cho fabric matching, style similarity (Epic 12) |
| **Trạng thái** | Extension cài sẵn, chưa active trong MVP |

Khi Epic 12 triển khai, pgvector cho phép tìm kiếm vải tương tự bằng vector embedding (cosine similarity) mà không cần infrastructure riêng (Pinecone, Weaviate).

## 4.5. Infrastructure & Tooling

### 4.5.1. Runtime & Build

| Thành phần | Công cụ | Ghi chú |
|---|---|---|
| Frontend runtime | Node.js 20.9+ | Yêu cầu tối thiểu của Next.js 16 |
| Frontend bundler (dev) | Turbopack | Mặc định Next.js 16, nhanh hơn Webpack |
| Frontend bundler (prod) | Next.js Build | Static + SSR output |
| Backend runtime | Python 3.13 + virtualenv | `backend/venv/` |
| Backend ASGI server | Uvicorn (uvloop) >= 0.41 | Production-grade, multi-worker |
| Package manager (FE) | npm | Theo `create-next-app` default |
| Package manager (BE) | pip + requirements.txt | Đơn giản, phù hợp quy mô đồ án |

### 4.5.2. Deployment target

| Thành phần | Nền tảng | Lý do |
|---|---|---|
| Frontend | Vercel (hoặc Docker) | Tối ưu nhất cho Next.js; CDN toàn cầu; preview deployment |
| Backend | Docker container (VPS/ECS) | Linh hoạt cấu hình Python runtime; có thể thêm GPU cho LangGraph |
| Database | Neon (managed) hoặc self-host Docker | Neon hỗ trợ pgvector native; branching cho dev/staging |

### 4.5.3. Monitoring & Observability (khuyến nghị production)

| Lớp | Công cụ | Chỉ số theo dõi |
|---|---|---|
| Frontend | Vercel Analytics + Web Vitals | LCP, FID, CLS, page load p95 |
| Backend API | Prometheus + Grafana | Latency p95, error rate, throughput |
| AI tracing | Langfuse | Inference latency, step-by-step trace |
| Database | pg_stat_statements | Slow queries, connection pool |
| Uptime | UptimeRobot / Pingdom | Availability 99.9% (NFR7) |
| Error tracking | Sentry | Frontend + Backend exceptions |

### 4.5.4. External Integrations

| Tích hợp | Trạng thái | Mục đích |
|---|---|---|
| VNPay / MoMo | Theo PRD, webhook pattern đã thiết kế | Payment gateway nội địa |
| Stripe | Optional | Payment quốc tế |
| Zalo OA API | Hoãn (Epic 9 outreach) | Campaign messaging |
| Facebook Messenger API | Hoãn (Epic 9 outreach) | Campaign messaging |
| Langfuse | Cài sẵn, chưa active | LangGraph trace |

## 4.6. Cấu hình môi trường

### 4.6.1. Backend (`.env`)

| Biến | Mục đích | Ví dụ |
|---|---|---|
| `DATABASE_URL` | Kết nối PostgreSQL | `postgresql://postgres:postgres@localhost:5432/tailor_db` |
| `JWT_SECRET_KEY` | Ký JWT token | (secret, không commit) |
| `SMTP_USER` | Email gửi OTP/thông báo | `noreply@thanhloc.com` |
| `SMTP_PASSWORD` | Mật khẩu SMTP | (secret, không commit) |
| `CORS_ORIGINS` | Whitelist frontend URL | `http://localhost:3000` |

### 4.6.2. Frontend (`.env.local`)

| Biến | Mục đích | Ví dụ |
|---|---|---|
| `NEXTAUTH_SECRET` | Ký session cookie | (secret, không commit) |
| `NEXTAUTH_URL` | URL frontend | `http://localhost:3000` |
| `BACKEND_URL` | URL backend cho proxy | `http://localhost:8000` |

> **Quy tắc bảo mật:** không bao giờ commit file `.env` vào git. Production sử dụng secret manager (AWS Secrets Manager, Vault, hoặc Vercel env vars).

## 4.7. Bảng tham chiếu phiên bản nhanh

### Frontend

| Thư viện | Phiên bản |
|---|---|
| Next.js | 16.1.6 |
| React | 19.2.3 |
| TypeScript | 5.x |
| TailwindCSS | v4 |
| Zustand | 5.0.11 |
| TanStack Query | 5.90.21 |
| NextAuth | 5.0.0-beta.30 |
| Framer Motion | 12.35.2 |
| Radix UI (primitives) | 1.1.15+ |
| react-hook-form | 7.71.2 |
| recharts | 3.8.0 |
| Jest | 30.2.0 |

### Backend

| Thư viện | Phiên bản |
|---|---|
| Python | 3.13 |
| FastAPI | >= 0.133.0 |
| Pydantic | >= 2.12.0 |
| SQLAlchemy | >= 2.0.0 |
| asyncpg | >= 0.30.0 |
| LangGraph | >= 1.0.0 |
| Uvicorn | >= 0.41.0 |
| bcrypt | >= 4.0.1 |
| python-jose | >= 3.3.0 |
| aiosmtplib | >= 3.0.0 |
| ezdxf | >= 1.4.0 |
| pytest | >= 9.0.0 |

### Database

| Thành phần | Phiên bản |
|---|---|
| PostgreSQL | 17 |
| pgvector | 0.8.x |

## 4.8. Tổng kết chương

Hệ thống **Nhà May Thanh Lộc** sử dụng ngăn xếp công nghệ hiện đại, mỗi lựa chọn đều có lý do kỹ thuật gắn với yêu cầu cụ thể:

- **Next.js 16** → Dual-Mode UI qua Route Groups + Server Actions gọn (Chương 3, mục 3.1.3).
- **FastAPI + Pydantic V2** → async hiệu năng cao + validation nhanh cho số đo hình học (NFR4, FR99).
- **PostgreSQL + pgvector** → ACID cho e-commerce + vector search cho AI trong cùng engine (NFR10, Epic 12).
- **Zustand + TanStack Query** → tách rõ Local/Server state, hỗ trợ Authoritative Server Pattern (Chương 3, mục 3.1.3).
- **NextAuth v5** → JWT HttpOnly cookie chuẩn an toàn (NFR15).

Chương tiếp theo (Chương 5) trình bày chi tiết triển khai từng module trên nền tảng công nghệ này.
