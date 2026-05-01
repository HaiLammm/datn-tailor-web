# Chương 02 — Kiến trúc hệ thống

## 2.1. Mô hình kiến trúc tổng thể

Hệ thống tuân theo mô hình **Full-stack Layered Microservices Architecture** với 2 deployable units (frontend + backend) và 1 lớp persistence (PostgreSQL + pgvector).

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BROWSER (Customer / Owner / Tailor)         │
│                                                                     │
│   - HTML/CSS/JS rendered by Next.js (React Server Components +     │
│     Client Components)                                              │
│   - Auth.js v5 cookies (HttpOnly, Secure, SameSite)                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS, fetch()
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NEXT.JS 16 APP ROUTER (frontend/, port 3000)           │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────────┐ │
│   │  app/                                                        │ │
│   │   ├─ (auth)/      → login, register, OTP, reset            │ │
│   │   ├─ (customer)/  → showroom, booking, checkout (Boutique) │ │
│   │   ├─ (workplace)/ → owner/, tailor/, design-session/ (Cmd) │ │
│   │   ├─ actions/     → Server Actions (TS) — call backend     │ │
│   │   ├─ api/auth/    → NextAuth route handler                 │ │
│   │   └─ proxy.ts     → server-side proxy thêm JWT vào header  │ │
│   └──────────────────────────────────────────────────────────────┘ │
│                                                                     │
│   - Zustand: Local UI state (cart, design pillars)                 │
│   - TanStack Query: Server state syncing & cache                   │
│   - TailwindCSS v4 + Radix UI primitives                           │
│   - Framer Motion: animations                                      │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTP (server-to-server, JWT cookie)
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              FASTAPI BACKEND (backend/src, port 8000)               │
│                                                                     │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │ src/main.py — FastAPI app + 30 router include + CORS + lifespan││
│  └────────────────────────────────────────────────────────────────┘│
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  api/v1/         │→ │  services/       │→ │  models/        │  │
│  │  (30 routers)    │  │  (~30 services)  │  │  Pydantic +     │  │
│  │  - auth          │  │  - auth_service  │  │  SQLAlchemy ORM │  │
│  │  - patterns      │  │  - pattern_svc   │  │                 │  │
│  │  - orders        │  │  - order_svc     │  └─────────────────┘  │
│  │  - …             │  │  - …             │                       │
│  └──────────────────┘  └──────────────────┘                       │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐  │
│  │  patterns/       │  │  geometry/       │  │  agents/        │  │
│  │  (Epic 11 —      │  │  (Epic 12-14 —   │  │  (Epic 12-14 —  │  │
│  │  deterministic)  │  │  AI engine)      │  │  LangGraph)     │  │
│  └──────────────────┘  └──────────────────┘  └─────────────────┘  │
│                                                                    │
│  ┌──────────────────┐  ┌──────────────────┐                       │
│  │  constraints/    │  │  core/           │                       │
│  │  Hard/Soft rules │  │  config, db,     │                       │
│  │  + registry      │  │  security, seed  │                       │
│  └──────────────────┘  └──────────────────┘                       │
│                                                                    │
│  Background:                                                       │
│  - scheduler_service (start_reminder_scheduler, lifespan event)    │
│  - email_service (aiosmtplib)                                      │
│  - payment webhooks                                                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ asyncpg
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│              POSTGRESQL 17 + PGVECTOR 0.8.x                         │
│                                                                     │
│  - 22 tables (auth, tenants, customers, designs, garments,         │
│    orders, payments, appointments, rentals, tailor_tasks,          │
│    vouchers, leads, notifications, pattern_sessions, …)            │
│  - 30 SQL migrations (001 → 030)                                    │
│  - tenant_id trên hầu hết tables (multi-tenant isolation)          │
│  - JSONB cho master_geometry, geometry_params, payload mềm         │
└─────────────────────────────────────────────────────────────────────┘
```

## 2.2. Nguyên lý kiến trúc cốt lõi

### 2.2.1 Authoritative Server Pattern (SSOT)

> **Backend là Single Source of Truth duy nhất** cho mọi validation vật lý, giá hoá đơn, và tồn kho.
> Frontend chỉ chịu trách nhiệm validate kiểu (TypeScript/Zod) và rendering UI.

Hệ quả:
- Mọi giá trị giỏ hàng / total_amount / inventory check được Backend re-compute khi checkout.
- Hard Constraint geometry violations trả về **HTTP 422 Unprocessable Entity** với message tiếng Việt chuyên ngành may.
- Frontend KHÔNG được phép cache giá hoặc tồn kho dài hạn → TanStack Query luôn invalidate khi navigate Checkout.

### 2.2.2 Dual-Mode UI Architecture

Hệ thống tách hoàn toàn 2 chế độ giao diện qua **Route Groups** của Next.js:

| Mode | Route group | Đối tượng | Đặc trưng |
|---|---|---|---|
| **Boutique Mode** | `(customer)/` | Customer | Background Ivory, spacious 16-24px gaps, serif headings (Cormorant Garamond), micro-animations Framer Motion |
| **Command Mode** | `(workplace)/` | Owner / Tailor | Background White, dense 8-12px gaps, sans-serif dominant (Inter), KPI-heavy, sidebar collapsible |

→ React Context + layout wrappers detect mode dựa trên route → áp dụng đúng design tokens (Heritage Palette).

### 2.2.3 Proxy Pattern (Auth-aware)

```
Browser  →  Next.js Server Action / proxy.ts  →  FastAPI Backend
         (NextAuth cookie HttpOnly)         (Authorization: Bearer <jwt>)
```

- Browser KHÔNG bao giờ gọi trực tiếp FastAPI → tránh expose JWT.
- `frontend/src/proxy.ts` đọc cookie session, đính `Authorization: Bearer <token>`, forward request.
- RBAC ở 2 lớp: Next.js (route guard cho `(workplace)/` chỉ cho Owner/Tailor) + FastAPI (`OwnerOnly`, `OwnerOrTailor` dependencies).

### 2.2.4 Layered Backend

```
┌─────────────────┐
│  api/v1/*.py    │  ← Router: validate query/body bằng Pydantic, gọi service
└────────┬────────┘
         │
┌────────▼────────┐
│  services/*.py  │  ← Business logic: transaction, validation rules, gọi models + external (email, payment)
└────────┬────────┘
         │
┌────────▼────────┐
│  models/*.py    │  ← Pydantic schemas (request/response) + SQLAlchemy ORM (DB)
└────────┬────────┘
         │
┌────────▼────────┐
│  PostgreSQL     │
└─────────────────┘

Sidecars:
  patterns/    — Pattern Engine (deterministic, độc lập, không import từ geometry/ hay agents/)
  geometry/    — GeometryRebuilder + Delta engine (Epic 13)
  agents/      — LangGraph Emotional Compiler (Epic 12)
  constraints/ — Hard/Soft rules registry (Epic 14)
  core/        — config, database engine, hashing, security (JWT), seed
```

### 2.2.5 "Core cứng, Shell mềm" — Pattern Engine

Module `patterns/` được thiết kế **hoàn toàn standalone**:
- KHÔNG import từ `geometry/`, `agents/`, hay `constraints/`.
- Dùng công thức tất định (pure math, < 50ms cho 3 mảnh trên CPU thường).
- Không cần GPU, không cần LLM.
- Được thiết kế để dễ dàng tách thành microservice nếu cần.

## 2.3. Mẫu giao tiếp (Communication Patterns)

### 2.3.1 REST API thuần

- Không dùng WebSockets.
- Real-time hình học (Adaptive Canvas Morphing) được tính **client-side** (< 200ms) — không cần round-trip server.
- Pattern Engine SVG preview dùng request thường (< 500ms theo FR96).

### 2.3.2 Webhook & Background Tasks

Thanh toán theo flow:

```
Client → POST /orders → Pending order created
       → Redirect VNPay/MoMo
       → User trả tiền tại gateway
       → Gateway POST webhook → Backend
       → Backend update payment_transactions + orders
       → Background task: email confirmation + cập nhật inventory
```

→ Tránh Timeout do gateway chậm (theo NFR9 success rate > 99.5%).

### 2.3.3 Async Background Scheduler

`src/services/scheduler_service.py` chạy bằng `asyncio.create_task` trong `lifespan` của FastAPI:

- Story 5.4: nhắc trả đồ thuê (3 ngày & 1 ngày trước hạn).
- Có thể mở rộng để gửi nhắc lịch hẹn, gửi voucher campaign batch, …

## 2.4. Định dạng API & quy ước

### 2.4.1 Response wrapper

```jsonc
// Success
{ "data": { /* payload */ }, "meta": { "pagination": { "page": 1, "size": 20, "total": 100 } } }

// Error
{ "error": { "code": "ERR_INVALID_FORMAT", "message": "Định dạng xuất không hợp lệ. Chọn 'svg' hoặc 'gcode'" } }
```

### 2.4.2 HTTP Status conventions

| Status | Tình huống |
|---|---|
| 200 / 201 | Success / Created |
| 400 | Bad request, sai format DB/Domain |
| 401 | Token không hợp lệ / hết hạn |
| 403 | Đúng auth nhưng sai role/tenant |
| 404 | Không tìm thấy resource (hoặc khác tenant) |
| **422** | **Vi phạm Hard Constraint Geometry** (Áo dài) — message Tiếng Việt 100% chuyên ngành |
| 500 | Lỗi server không lường trước |

### 2.4.3 Naming conventions

| Tầng | Quy ước |
|---|---|
| Database (table, column, FK) | `snake_case`, **plural** cho table |
| Pydantic Model | `PascalCase` |
| API endpoint | RESTful plural: `/api/v1/orders`, `/api/v1/patterns/sessions` |
| Path params | bracket `{id}` |
| JSON body | `snake_case` (khớp với Pydantic) |
| Frontend component | `PascalCase.tsx` |
| Frontend variable/function | `camelCase` |
| Vietnamese tailoring terms | giữ nguyên: `vong_nach`, `ha_eo`, `vong_nguc` (KHÔNG dịch tiếng Anh) |

## 2.5. Cross-cutting concerns

| Concern | Giải pháp |
|---|---|
| **Multi-tenancy** | `tenant_id` UUID trên hầu hết tables, dependency `TenantId` extract từ user JWT |
| **Internationalization** | `useTranslate` hook, JSON locale files (vi/en) |
| **Accessibility** | WCAG 2.1 Level A — Radix UI primitives, ARIA labels, ≥ 44×44px touch target, focus rings 2px |
| **Logging & tracing** | Logger Python stdlib (Backend), Langfuse cho LangGraph (Epic 12+), Prometheus cho API metrics |
| **Data integrity** | Master Geometry JSON checksum (NFR8), versioning rập (snapshot-based rollback) |
| **Concurrency** | ACID-compliant transactions cho cart/order/inventory; race condition đặc biệt được chú ý ở slot booking + inventory checkout |

## 2.6. Sơ đồ deployment (target)

```
┌──────────────────┐       ┌─────────────────────┐
│  Vercel CDN      │       │  Docker container   │
│  (Next.js SSR    │◀─────▶│  FastAPI + Uvicorn  │
│   + Edge Cache)  │       │  (CPU/GPU optional) │
└──────────────────┘       └──────────┬──────────┘
                                      │
                                      ▼
                          ┌──────────────────────┐
                          │  PostgreSQL 17       │
                          │  + pgvector 0.8.x    │
                          │  (managed: Neon /    │
                          │   self-host Docker)  │
                          └──────────────────────┘

  Monitoring:
    - Langfuse (LangGraph trace)
    - Prometheus + Grafana (API latency, error rate)
    - Cloud uptime monitor (NFR7 99.9%)
```

## 2.7. Architecture readiness

Theo `_bmad-output/planning-artifacts/architecture.md`:

> **Overall Status:** READY FOR IMPLEMENTATION
> **Confidence Level:** Cao (High) — do giải pháp tách bạch rõ ràng Separation of Concerns giữa UI và Business Logic.
> **Key Strengths:** Authoritative Server Pattern bảo vệ toàn vẹn logic may đo. Zero-Thought Commerce nhờ Zustand UI mượt.
