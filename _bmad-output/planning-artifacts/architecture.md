---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
workflowType: 'architecture'
lastStep: 8
status: 'complete'
completedAt: '2026-03-10T15:42:18+07:00'
inputDocuments:
  - _bmad-output/planning-artifacts/prd/index.md
  - _bmad-output/planning-artifacts/prd/executive-summary.md
  - _bmad-output/planning-artifacts/prd/product-scope.md
  - _bmad-output/planning-artifacts/prd/success-criteria.md
  - _bmad-output/planning-artifacts/prd/user-journeys.md
  - _bmad-output/planning-artifacts/prd/functional-requirements.md
  - _bmad-output/planning-artifacts/prd/non-functional-requirements-nfrs.md
  - _bmad-output/planning-artifacts/prd/domain-specific-requirements.md
  - _bmad-output/planning-artifacts/prd/technical-project-type-requirements.md
  - _bmad-output/planning-artifacts/product-brief-tailor_project-2026-02-17.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/project-context.md
workflowType: 'architecture'
project_name: 'tailor_project'
user_name: 'Lem'
date: '2026-03-10T15:09:35+07:00'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Hệ thống là một nền tảng lai mức độ cao (Hybrid Platform) bao gồm 8 phân hệ chính:
1. **E-commerce & Digital Catalog:** Quản lý sản phẩm, giỏ hàng, thanh toán và xử lý đơn hàng.
2. **Appointment Booking:** Quản lý lịch tư vấn Bespoke giữa Customer và Tailor trực tiếp tại tiệm.
3. **AI Bespoke Engine & Geometry Transformation:** Cốt lõi dịch thuật cảm xúc thành thông số kỹ thuật (Deltas) và tái tạo bản vẽ (Master Geometry JSON).
4. **Operations & CRM Dashboard:** Trung tâm chỉ huy (Command Center) quản lý doanh thu, kho hàng, leads, vouchers, và phân việc.
5. **Tailor Workstation:** Công cụ cho nghệ nhân nhận việc, kiểm tra bản vẽ rập, và cập nhật tiến độ tự động tới khách hàng.

**Non-Functional Requirements (Architectural Drivers):**
- **Performance:** Phản hồi thay đổi hình học trên UI < 200ms bằng nội suy Client-side. API phản hồi < 300ms, tải trang < 2s.
- **Security & Reliability:** PCI DSS compliance cho thanh toán; JWT lưu trữ bằng HttpOnly cookies; Uptime thanh toán > 99.5%.
- **Accessibility & i18n:** WCAG 2.1 Level A. Bắt buộc 100% thuật ngữ Tiếng Việt chuyên ngành may.

**Scale & Complexity:**
- Hệ thống hỗ trợ đồng thời ít nhất 100 kết nối người dùng/nhân viên với độ trễ thấp.
- **Primary domain:** Full-stack E-commerce & AI-Driven Manufacturing
- **Complexity level:** Cao (High)
- **Estimated architectural components:** ~12-15 components (Frontend Apps, APIs, Database Services, AI Agents, Payment Integrations, Mailing/SMS Services)

### Technical Constraints & Dependencies

- **Technology Stack:** Next.js (Frontend), FastAPI + LangGraph (Backend), PostgreSQL + pgvector (Data).
- Hệ thống bắt buộc sử dụng Authoritative Server Pattern — Backend là Nguồn chân lý duy nhất (SSOT) cho mọi validation vật lý, giá trị hóa đơn và tồn kho. Frontend chỉ đảm nhiệm validate Type và UI Rendering.
- **Integrations:** Gateway thanh toán (VNPay/Momo/Stripe), SMS/Email Notification API (nhắc lịch, OTP password recovery).

### Cross-Cutting Concerns Identified

- **Dual-Mode UI Architecture:** Kiến trúc Frontend phải hỗ trợ tách biệt hoàn toàn CSS styling, Layouts và Component behaviors giữa "Boutique Mode" (Customer) và "Command Mode" (Owner/Tailor) theo Role của Auth.
- **Transaction & Inventory Consistency:** Race conditions logic xử lý giỏ hàng E-commerce, Booking slot booking và Cập nhật kho phải là ACID-compliant thuần túy.
- **Data Integrity & Traceability:** Tính bất biến của `Master Geometry JSON` qua các chu kỳ thay đổi của AI; cơ chế Versioning rập thiết kế (Snapshot-based rollback).

## Starter Template Evaluation

### Primary Technology Domain

Full-stack Microservices Architecture dựa trên phân tích yêu cầu tích hợp sâu: **Next.js 16 (Frontend)** giao tiếp qua REST API tới **FastAPI + LangGraph (Backend)**.

### Starter Options Considered

1. **Frontend: Official Next.js 16 `create-next-app` Starter**
   - Sự lựa chọn tiêu chuẩn và an toàn nhất từ Vercel. Nó luôn đi kèm các thiết lập mới nhất về App Router, Turbopack, Tailwind CSS v4 và ESLint nguyên bản. Lý tưởng để tích hợp sau này với Framer Motion và Zustand.
2. **Backend: LangGraph Production-Ready FastAPI Template** (như `wassim249/fastapi-langgraph-agent-production-ready-template`)
   - Cung cấp sẵn mô hình Asynchronous API (uvloop), cấu hình kết nối chuẩn với PostgreSQL/pgvector, và tích hợp Langfuse để đo lường/theo dõi tiến trình suy luận (tracing). Đây là thiết lập rất quan trọng để đảm bảo sự ổn định của `AI Bespoke Engine`.

### Selected Starters: Next.js 16 App Router & FastAPI-LangGraph Base

**Rationale for Selection:**
Vì `tailor_project` yêu cầu tính chuyên biệt rất cao (đặc biệt là việc xử lý Validation Hình học 2 lớp ngặt nghèo và kiến trúc Dual-Mode UI), việc dùng các boilerplate gộp chung (như T3 Stack, Blitz) sẽ gây cản trở và khó tùy biến. Việc tách hẳn frontend bằng công cụ chính chủ của Next.js và dựng backend dựa trên một khung LangGraph chuẩn (tự thiết lập Custom Docker/FastAPI) giúp đảm bảo Performance và bảo vệ The Vault Knowledge vững chắc nhất.

**Initialization Commands:**

**Frontend:**
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
```

**Backend:**
```bash
mkdir backend && cd backend
python -m venv venv
source venv/bin/activate
pip install fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy asyncpg pgvector langgraph langchain-core
```
*(Lưu ý: Backend sẽ được khởi tạo như một custom boilerplate thay vì clone 1 template phức tạp, sau đó cài các dependencies chủ chốt của hệ thống ngay từ đầu).*

**Architectural Decisions Provided by Starters:**

**Language & Runtime:**
- Frontend: TypeScript chạy trên Node.js/Edge Runtime (yêu cầu Node 20.9+).
- Backend: Python 3.11+ chạy môi trường ảo (venv) với Uvicorn ASGI.

**Styling Solution:**
- Tailwind CSS v4 được config mặc định qua directive `@tailwind` và file CSS gốc. Sẽ thêm plugin tùy chỉnh cho "Heritage Palette" sau.

**Build Tooling & Optimization:**
- Frontend xử lý qua Turbopack (dev) và cấu hình chuẩn Next.js Build cache.
- Backend tận dụng Pydantic V2 (code bằng Rust) để tối ưu hóa việc validate mảng SVG Deltas kích thước lớn.

**State & Fetching:**
- Không sử dụng App Router cache mù quáng mà sẽ bypass bằng TanStack Query cho danh bạ Khách hàng và Trạng thái Inventory thời gian thực.

**Code Organization:**
- Khẳng định áp dụng cấu trúc Layered trên Backend (routers/services/agents/models) và Feature-Folded trên Frontend.

**Note:** Project initialization using this command should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- Authentication & State Management cho E-commerce giỏ hàng (Cart) và AI Bespoke Studio.
- Thiết kế kết nối Database chung cho The Vault Knowledge và Orders.

**Important Decisions (Shape Architecture):**
- Xử lý bất đồng bộ (Thanh toán Webhook, Notification Order).

**Deferred Decisions (Post-MVP):**
- Recommendation Engine cho Digital Catalog (giữ mặc định Query ban đầu).

### Data Architecture

- **Database Choice:** PostgreSQL 17 + `pgvector` 0.8.x định tuyến qua `asyncpg`. Hỗ trợ luồng dữ liệu E-commerce thuần quan hệ ACID (Orders, Inventory) kết hợp song hành với lưu trữ Data JSON bất biến (Immutable State của bản vẽ AI).
- **Validation:** Pydantic V2 trên Backend làm màng lọc toàn vẹn dữ liệu cho Hình học cấu trúc áo dài (Hard Constraints) và Dữ liệu giỏ hàng.

### Authentication & Security

- **Authentication Method:** Dùng **Auth.js v5 (NextAuth)**. Lưu trữ JWT qua chuẩn **HttpOnly Secure Cookie**.
- **Proxy Pattern:** Chuyến hướng API từ Next.js Client > `proxy.ts` (Next Server) > Kèm Cookie xác thực > FastAPI Backend. Không gọi trực tiếp từ trình duyệt đến API Backend. Cách tiếp cận này giúp Next.js App Router xử lý RBAC (Role-based Access Control) cho 2 chế độ (Boutique & Command Mode) mượt mà mà vẫn tách biệt khỏi mã Backend (The Vault).

### API & Communication Patterns

- **Communication:** Thuần RESTful API Backend qua FastAPI, không dùng WebSockets để tính hình học (Morphing ở Client via UI <200ms).
- **E-commerce Payments:** Giải pháp thiết kế theo mô hình **Webhook & Background Tasks**. Hệ thống Frontend gọi Backend khởi tạo Order Pending -> Chuyển sang URL VNPay/Stripe -> Trả về kết quả qua Webhook Backend -> Trigger background task gửi email và cập nhật Inventory. Hạn chế hoàn toàn rủi ro nghẽn cổ chai kịch bản Timeout.

### Frontend Architecture

- **E-commerce State & Cart Management:** Kết hợp linh hoạt **Zustand** (Local UI, Cart UI nhanh nhạy) và **TanStack Query** (Background Syncing + Cache Invalidation). Dữ liệu Inventory và Giá trị giỏ hàng cuối cùng đều phải được Backend quyết định (Authoritative Server) khi Checkout, Zustand chỉ phục vụ mặt trải nghiệm (Optimistic UI - Zero-Thought Commerce).
- **Component Design System:** Radix UI cho các Control nguyên thủy không bị định hướng sẵn Styles, được tùy biến thông qua Tailwind CSS V4 và Framer Motion. Thiết kế này giúp đảm bảo chuẩn tiếp cận WCAG 2.1 Level A. Cấu trúc Component được chia tách rõ rệt dựa trên route phân nhóm `(customer)` cho giao diện mua hàng và `(workplace)` cho hệ thống quản lý lệnh.

### Infrastructure & Deployment

- **Deployment Model:** Container hóa hoàn toàn, Next.js chạy độc lập trên Vercel hoặc Docker; FastAPI chạy Node riêng rẽ có GPU/CPU tối ưu cho LLM Routing.
- **Monitoring:** Sử dụng Langfuse (đã thiết lập trong Starter template Backend) cho việc Trace chuỗi Graph truy vấn cấu trúc Áo dài, và Prometheus cho API Monitoring.

### Decision Impact Analysis

**Implementation Sequence:**
1. Cài đặt DB `pgvector` và `asyncpg` -> Khởi tạo Models căn bản.
2. Xây dựng Next.js Route Framework kèm Auth.js v5 và Proxy.ts.
3. Thiết lập Background Task Queues và Webhooks cho Payment.
4. Triển khai các Component UI Boutique và Cart State Management.

**Cross-Component Dependencies:**
- Việc lựa chọn Cookie-based Auth + Proxy.ts ảnh hưởng toàn bộ tới các lệnh Fetch dữ liệu ở Client. TanStack Query bắt buộc phải cấu hình Custom Fetcher truyền Cookie này trên Server Layer.
- Database Schema phải hỗ trợ rõ Multi-tenancy nếu muốn mở rộng Brand (mặc định Schema ban đầu sẽ cần `brand_id` ẩn).

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**Critical Conflict Points Identified:**
4 areas where AI agents could make different choices: Naming Conventions, API Response Wrappers, State Management usage, and Error Handling formats.

### Naming Patterns

**Database Naming Conventions:**
- Sử dụng 100% `snake_case` cho Table, Column, và Foreign Keys. (VD: `user_id`, `orders`, `line_items`).
- Tên bảng (Table) bắt buộc ở dạng số nhiều (Plural).
- Pydantic Models trên Backend sử dụng `PascalCase`.

**API Naming Conventions:**
- REST endpoint dùng số nhiều (VD: `/api/v1/users`, `/api/v1/orders`).
- Route parameter dùng định dạng bracket (FastAPI chuẩn: `/{user_id}`).
- Dữ liệu Query Paramenter và JSON Body truyền đi BẮT BUỘC ở định dạng `snake_case` để khớp với Pydantic Backend.

**Code Naming Conventions:**
- Frontend React Component và tên File: `PascalCase.tsx` (VD: `UserCard.tsx`) để tương thích tính case-sensitive trên Linux.
- Local variables, hàm utils Frontend: `camelCase` (VD: `getUserData`).

### Structure Patterns

**Project Organization:**
- Backend: Cấu trúc Layered Architecture (routers, services, agents, models, geometry).
- Frontend: Cấu trúc Feature-Folded Organization, phân tách theo luồng `(customer)` và `(workplace)` thông qua Route Groups của Next.js App Router.

### Format Patterns

**API Response Formats:**
- **Thành công:** `{ "data": { ... }, "meta": { "pagination": ... } }`
- **Thất bại:** `{ "error": { "code": "ERR_CODE", "message": "Thông báo người dùng" } }`

**Data Exchange Formats:**
- Frontend phải chủ động remap `camelCase` state hiện tại thành `snake_case` payload trước khi gửi POST/PUT.

### Communication Patterns

**State Management Patterns:**
- **Zustand:** Chỉ quản lý Local UI State (Slider parameters, Modal Visibility, Optimistic UI update). Sử dụng `Immer` Middleware cho nested objects.
- **TanStack Query:** Chuyên trị mọi nghiệp vụ Server State Syncing, Fetching, và Cache Invalidation. Đặc biệt quan trọng ở bước Checkout để chốt Validation tồn kho và giá cả từ Backend thay vì tin vào Zustand.

### Process Patterns

**Error Handling Patterns:**
- **Validation lóp thô (Type):** Zod trên Next.js chặn ngay tại Client.
- **Validation Database/Domain:** FastAPI trả về `400 Bad Request` nếu sai định dạng.
- **Vi phạm Geometry (Áo dài):** Trả về HTTP `422 Unprocessable Entity` với Error Message mô tả Tiếng Việt 100% chuyên ngành để User/Tailor hiểu.

### Enforcement Guidelines

**All AI Agents MUST:**
- KHÔNG BAO GIỜ tự dịch thuật ngữ ngành may sang Tiếng Anh trong Database hay UI (VD: Bắt buộc dùng `vong_nach`, `ha_eo`, `can_tay`).
- Bắt buộc tuân thủ Wrapper Structure (`data`, `error`) khi xử lý mọi lệnh Fetch.

**Pattern Examples:**

**Good Examples:**
```typescript
// Component: ProductGrid.tsx
const fetchOrders = async () => {
    const res = await api.get('/api/v1/orders');
    return res.data.data; // Wrapper extraction
}
```

**Anti-Patterns:**
```typescript
// BAD: Chữ thường cho component
// product-grid.tsx
// BAD: Sai format body
axios.post('/api/v1/orders', { userId: 123 }) // userId thay vì user_id
```

## Project Structure & Boundaries

### Complete Project Directory Structure

**Frontend (Next.js 16 App Router):**
```text
frontend/
├── src/
│   ├── app/
│   │   ├── (customer)/           # Chế độ Boutique (E-commerce & Booking)
│   │   │   ├── showroom/         # Catalog sản phẩm
│   │   │   ├── design-session/   # Tương tác áo dài (Canvas AI)
│   │   │   └── checkout/         # Thanh toán
│   │   ├── (workplace)/          # Chế độ Command (Role: Owner, Tailor)
│   │   │   ├── layout.tsx        # Chứa Role-based Guards
│   │   │   ├── tailor/           # Trạm làm việc của thợ may (View bản vẽ)
│   │   │   └── owner/            # Dashboard tổng & Quản lý The Vault
│   │   ├── layout.tsx            # Global layout (Font chữ, Header chung)
│   │   └── proxy.ts              # Proxy server trung chuyển JWT, Server Actions
│   ├── components/
│   │   ├── ui/                   # Radix UI primitives
│   │   ├── 3d/                   # Render Engine cho Áo dài
│   │   └── features/             # Component nhóm theo tính năng (VD: cart, booking)
│   ├── store/                    # Slice quản lý State (Zustand)
│   ├── lib/
│   │   ├── api-client.ts         # Axios/Fetch utility có đính kèm config
│   │   └── auth.ts               # Config Auth.js v5 (NextAuth)
│   └── types/                    # Định nghĩa chung TypeScript (SSOT)
```

**Backend (FastAPI + LangGraph Python):**
```text
backend/
├── src/
│   ├── api/
│   │   └── v1/                   # Endpoints chia theo Router (orders, geometry, booking)
│   ├── agents/                   # Thư mục riêng chứa LangGraph (Emotional Compiler)
│   ├── geometry/                 # GeometryRebuilder & Delta engine cốt lõi
│   ├── constraints/              # Màng lọc Hard/Soft rules (The Vault logic)
│   ├── services/                 # Xử lý nghiệp vụ Backend, webhook listener
│   ├── models/                   # Pydantic Schemas & SQLAlchemy Entities 
│   ├── core/                     # JWT Authentication, Config & Loggings
│   └── main.py                   # FastAPI Application Entry point
├── tests/
│   ├── e2e/                      # End-to-end API tests
│   └── unit/                     # Unit testing cho Agents & Validator
```

### Architectural Boundaries

**API Boundaries:**
- Mọi giao tiếp tĩnh (Dữ liệu Profile, Products, Inventories) sẽ truy xuất qua REST endpoint từ FastAPI.
- Authentication JWT BẮT BUỘC chỉ được xử lý, parse và decode tại vòng ngoài (Next.js `proxy.ts`). Sau khi Proxy xác thực thành công, nó gửi payload gốc xuống Backend API nội bộ (tránh Backend phải quản lý vòng lặp cấp quyền rườm rà).

**Component Boundaries:**
- **Client Components** (`"use client"`): Chứa tương tác (Slider, Mouse Event, Morphing Áo dài Canvas).
- **Server Components** (default): Chứa việc Load dữ liệu ban đầu, SEO tags, cấu trúc Layout chung.

**Data Boundaries:**
- Hình học ảo của Áo Dài sẽ không bao giờ được validate hay lưu trữ tại LocalStorage UI. Database Backend luôn đóng vai trò là SSOT (nguồn chân lý duy nhất).

## Architecture Validation Results

### Coherence Validation ✅

**Decision Compatibility:**
- Next.js 16, Auth.js v5, và FastAPI hoàn toàn tương thích thông qua Cookie-forwarding Proxy pattern.
- PostgreSQL 17 + `pgvector` xử lý tốt cả Data Relationship (Orders, Inventory) lẫn Vector search (Semantic).

**Pattern Consistency:**
- Sự phân định rõ ràng `camelCase` (Frontend) và `snake_case` (Backend DB/API) đi kèm quy tắc Remap Payload giúp loại bỏ 90% lỗi Type Mismatch thường gặp.

**Structure Alignment:**
- Tổ chức Route Groups `(customer)` và `(workplace)` của Next.js khớp hoàn toàn với định hướng chia đôi luồng trải nghiệm người dùng của PRD.

### Requirements Coverage Validation ✅

**Epic/Feature Coverage:**
- Kiến trúc đủ sức bao phủ đầy đủ các nhóm tính năng (E-commerce, Booking, AI Canvas, Tailor Workspace, Owner Dashboard).

**Non-Functional Requirements Coverage:**
- **Performance:** Giải quyết bằng Client-side Morphing và FastAPI Asynchronous Routing.
- **Security:** Giải quyết bằng HttpOnly JWT Cookie và The Vault Backend Protection.

### Implementation Readiness Validation ✅

**Decision Completeness:**
- Gần như mọi quyết định công nghệ quan trọng đã được chốt (kèm giải pháp thay thế/Webhook/Background tasks).
- Thiếu sót duy nhất chỉ là các công cụ External nhỏ lẻ (VD: chọn VNPay hay Momo) nhưng không ảnh hưởng cốt lõi kiến trúc hiện tại.

### Architecture Completeness Checklist

**✅ Requirements Analysis**
- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**✅ Architectural Decisions**
- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**✅ Implementation Patterns**
- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**✅ Project Structure**
- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** READY FOR IMPLEMENTATION

**Confidence Level:** Cao (High) - Do giải pháp tách bạch rõ ràng Separation of Concerns giữa UI và Business Logic.

**Key Strengths:**
- Authoritative Server Pattern bảo vệ toàn vẹn logic may đo.
- Zero-Thought Commerce nhờ bộ khung Zustand UI mượt mà.

### Implementation Handoff

**AI Agent Guidelines:**
- Follow all architectural decisions exactly as documented
- Use implementation patterns consistently across all components
- Respect project structure and boundaries
- Refer to this document for all architectural questions

**First Implementation Priority:**
- Story đầu tiên phải là việc Khởi tạo Dự Án (Project Initialization) chạy lệnh `create-next-app` và cài đặt môi trường ảo (venv) FastAPI.
