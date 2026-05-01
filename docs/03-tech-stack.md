# Chương 03 — Công nghệ sử dụng (Tech Stack)

## 3.1. Tổng quan công nghệ theo tầng

| Tầng | Công nghệ chính | Phiên bản | Vai trò |
|---|---|---|---|
| **Frontend Framework** | Next.js | 16.1.6 | App Router, RSC + Client Components, Server Actions |
| **UI Library** | React | 19.2.3 | Component model |
| **Type System (FE)** | TypeScript | 5.x | Type-safe FE |
| **Styling** | TailwindCSS | 4.x (PostCSS) | Utility-first CSS, Heritage Palette tokens |
| **UI Primitives** | @radix-ui/react-dialog | 1.1.15 | Accessible primitives (WCAG 2.1) |
| **Animation** | Framer Motion | 12.35.2 | Page transitions, micro-interactions |
| **State (Local)** | Zustand | 5.0.11 | Cart, design session, optimistic UI |
| **State (Server)** | TanStack Query | 5.90.21 | Server state cache, invalidation |
| **Forms** | react-hook-form + @hookform/resolvers | 7.71 / 5.2 | Form validation |
| **Charts** | recharts | 3.8.0 | KPI dashboard, revenue chart |
| **Image** | react-medium-image-zoom | 5.4.1 | Product detail HD zoom |
| **Auth (FE)** | NextAuth.js | 5.0.0-beta.30 | Auth.js v5, HttpOnly cookie |
| **Backend Framework** | FastAPI | ≥ 0.133.0 | Async REST API |
| **ASGI Server** | Uvicorn (uvloop) | ≥ 0.41.0 | Production WSGI/ASGI |
| **Type System (BE)** | Pydantic | ≥ 2.12.0 | Request/response schemas + validation |
| **ORM** | SQLAlchemy (async) | ≥ 2.0.0 | DB ORM với async session |
| **DB Driver** | asyncpg | ≥ 0.30.0 | PostgreSQL async driver |
| **DB Driver (sync, legacy)** | psycopg2-binary | ≥ 2.9.0 | Cho migration script |
| **AI Orchestration** | LangGraph | ≥ 1.0.0 | Emotional Compiler workflow (Epic 12-14) |
| **Database** | PostgreSQL | 17 | Primary store |
| **Vector Search** | pgvector | 0.8.x | Semantic search cho fabric/style (Epic 12) |
| **Auth (BE)** | python-jose[cryptography] | ≥ 3.3.0 | JWT decode/encode |
| **Password hashing** | bcrypt | ≥ 4.0.1 | Hash mật khẩu |
| **Email** | aiosmtplib | ≥ 3.0.0 | Async SMTP gửi OTP, notification |
| **DXF/CAD** | ezdxf | ≥ 1.4.0 | Xuất DXF (cho future CAD pipeline) |
| **Env management** | python-dotenv | ≥ 1.0.0 | Load `.env` |
| **File upload** | python-multipart | ≥ 0.0.20 | Multipart form |

## 3.2. Frontend chi tiết

### 3.2.1 `frontend/package.json` — dependencies

```json
{
  "dependencies": {
    "@hookform/resolvers": "^5.2.2",
    "@radix-ui/react-dialog": "^1.1.15",
    "@tanstack/react-query": "^5.90.21",
    "framer-motion": "^12.35.2",
    "next": "16.1.6",
    "next-auth": "5.0.0-beta.30",
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "react-hook-form": "^7.71.2",
    "react-medium-image-zoom": "^5.4.1",
    "recharts": "^3.8.0",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/react": "^16.3.2",
    "@testing-library/user-event": "^14.6.1",
    "eslint": "^9",
    "eslint-config-next": "16.1.6",
    "jest": "^30.2.0",
    "jest-environment-jsdom": "^30.2.0",
    "tailwindcss": "^4",
    "ts-jest": "^29.4.6",
    "typescript": "^5"
  }
}
```

### 3.2.2 Build & dev tooling

| Công cụ | Vai trò |
|---|---|
| **Turbopack** (Next.js 16 default) | Bundler dev mode |
| **ESLint** + `eslint-config-next` | Lint rules |
| **Jest** + `@testing-library/react` + `@testing-library/jest-dom` | Unit test components & hooks |
| **ts-jest**, `@babel/preset-*` | TS transform cho test |
| **PostCSS** + `@tailwindcss/postcss` | Tailwind v4 build |

### 3.2.3 Scripts

```json
"scripts": {
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "eslint",
  "test": "jest",
  "test:watch": "jest --watch"
}
```

## 3.3. Backend chi tiết

### 3.3.1 `backend/requirements.txt`

```
fastapi>=0.133.0
python-multipart>=0.0.20
uvicorn[standard]>=0.41.0
langgraph>=1.0.0
pydantic[email]>=2.12.0
sqlalchemy>=2.0.0
psycopg2-binary>=2.9.0
asyncpg>=0.30.0
python-dotenv>=1.0.0
python-jose[cryptography]>=3.3.0
bcrypt>=4.0.1
aiosmtplib>=3.0.0
ezdxf>=1.4.0

# Testing
pytest>=9.0.0
httpx>=0.28.0
pytest-asyncio>=1.3.0
aiosqlite>=0.20.0
```

### 3.3.2 Python runtime

- Python 3.13 (theo README)
- Virtualenv tại `backend/venv/`
- Async-first: dùng `async def` cho tất cả handlers + session DB

### 3.3.3 Testing tooling

| Tool | Mục đích |
|---|---|
| `pytest` | Test runner |
| `pytest-asyncio` | Async test support |
| `httpx` | Async HTTP client để test FastAPI endpoints |
| `aiosqlite` | SQLite async cho test (tách biệt với PG production) |

## 3.4. Storage & infrastructure

### 3.4.1 PostgreSQL + pgvector

- **PostgreSQL 17** — chính thức theo Architecture Decision Document.
- **pgvector 0.8.x** — semantic search cho fabric matching (Epic 12 hoãn).
- **asyncpg** đường dẫn URL được convert tự động:
  ```python
  # backend/src/core/database.py
  _async_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
  engine = create_async_engine(_async_url, echo=False)
  ```

### 3.4.2 File static

- Backend mount `/uploads` từ `backend/uploads/` qua `StaticFiles`.
- Hình ảnh sản phẩm, ảnh hồ sơ khách hàng được upload qua `POST /api/v1/uploads`.

### 3.4.3 Email

- `aiosmtplib` async SMTP — dùng cho OTP, đơn confirm, nhắc trả đồ.
- Cấu hình qua biến môi trường `SMTP_USER`, `SMTP_PASSWORD`.

## 3.5. External integrations (planned)

| Tích hợp | Trạng thái | Mục đích |
|---|---|---|
| VNPay | Theo PRD, chưa thấy code production | Payment gateway nội địa |
| MoMo | Như VNPay | Payment gateway ví |
| Stripe | Optional, theo brief | Payment quốc tế |
| Zalo OA API | Hoãn | Outreach campaign |
| Facebook Messenger API | Hoãn | Outreach campaign |
| Langfuse | Cài sẵn, chưa active | Trace LangGraph (khi Epic 12+ chạy) |
| Prometheus | Khuyến nghị deploy | API latency monitoring |

## 3.6. Cấu hình môi trường

`backend/.env`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tailor_db
JWT_SECRET_KEY=your-secret-key
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
CORS_ORIGINS=http://localhost:3000
```

`frontend/.env.local`:

```env
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

## 3.7. Tóm tắt lý do chọn công nghệ

| Lựa chọn | Lý do |
|---|---|
| **Next.js 16 App Router** | RSC tách biệt UI tĩnh & UI tương tác → giảm bundle. Server Actions ngắn gọn cho form. App Router phù hợp với Dual-Mode UI qua Route Groups. |
| **FastAPI + Pydantic V2** | Async cao + validation Rust-speed (V2). Phù hợp xử lý mảng SVG Deltas lớn. |
| **PostgreSQL + pgvector** | ACID cho orders/inventory + Vector cho semantic search trong cùng 1 engine → giảm phụ thuộc Redis/Elastic. |
| **Auth.js v5** | Tích hợp tự nhiên với Next.js; cookie HttpOnly chuẩn an toàn (NFR15). |
| **Zustand + TanStack Query** | Tách rõ Local UI vs Server State; tránh re-render thừa của Redux; tránh cache mù của App Router. |
| **TailwindCSS v4** | Performance build cao (oxide engine), tokens hoá Heritage Palette gọn. |
| **Radix UI** | A11y-first primitives, không áp đặt style — dễ tùy biến cho Boutique vs Command. |
| **LangGraph** | Workflow graph cho AI multi-step (Emotional Compiler) — chuẩn bị cho Epic 12-14. |

## 3.8. Phiên bản tham chiếu nhanh

```
Frontend
  Next.js          16.1.6
  React            19.2.3
  TypeScript       5.x
  TailwindCSS      4.x
  NextAuth         5.0.0-beta.30
  Zustand          5.0.11
  TanStack Query   5.90.21

Backend
  Python           3.13
  FastAPI          ≥ 0.133.0
  Pydantic         ≥ 2.12.0
  SQLAlchemy       ≥ 2.0.0
  asyncpg          ≥ 0.30.0
  LangGraph        ≥ 1.0.0

Database
  PostgreSQL       17
  pgvector         0.8.x
```
