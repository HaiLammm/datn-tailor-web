---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments: ["_bmad-output/planning-artifacts/prd.md", "_bmad-output/planning-artifacts/product-brief-tailor_project-2026-02-17.md", "_bmad-output/planning-artifacts/ux-design-specification.md", "_bmad-output/planning-artifacts/research/technical-semantic-to-geometric-translation-architecture-2026-02-17.md"]
workflowType: 'architecture'
project_name: 'tailor_project'
user_name: 'Lem'
date: 'Sunday, February 22, 2026'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
Hệ thống tập trung vào việc số hóa quy trình may đo cao cấp thông qua 6 module chính:
1. **Style Interpretation:** Dịch thuật cảm xúc khách hàng sang thông số kỹ thuật.
2. **Geometric Engine:** Áp dụng biến đổi Delta vào mẫu rập chuẩn SVG/DXF.
3. **Deterministic Guardrails:** Kiểm soát vi phạm vật lý tự động.
4. **Collaboration:** Giao diện Adaptive Canvas cho khách hàng và thợ may.
5. **Profile Management:** Lưu trữ số đo và lịch sử thiết kế.
6. **Rental Management:** Quản lý kho đồ thuê với tương tác "2 chạm".

**Non-Functional Requirements:**
- **Hiệu năng:** Độ trễ suy luận < 15 giây, phản hồi UI < 200ms.
- **Độ chính xác:** Sai số hình học ΔG ≤ 1mm (mục tiêu 0.5mm).
- **Bảo mật:** Phân quyền RBAC chặt chẽ để bảo vệ "Hầm chứa tri thức" của các nghệ nhân.
- **Khả dụng:** 99.9% thời gian hoạt động, sử dụng 100% thuật ngữ chuyên ngành may Việt Nam.

**Scale & Complexity:**
Dự án có độ phức tạp cao do yêu cầu tích hợp giữa suy luận AI (Probabilistic) và sản xuất hình học (Deterministic).
- Primary domain: Full-stack AI-Driven Manufacturing
- Complexity level: High
- Estimated architectural components: ~8-10 components (Agents, Geometry Engine, API, Database, Storage, UI Modes)

### Technical Constraints & Dependencies

- **Technology Stack:** Python (Backend), LangGraph (AI Orchestration), FastAPI (API), PostgreSQL + pgvector (Data), React + Tailwind (Frontend).
- **Legacy Knowledge:** Phải ưu tiên tri thức nội bộ của tiệm (LKB) hơn kiến thức phổ thông.
- **Physical Integrity:** Không được phép xuất bản vẽ nếu vi phạm Guardrails.

### Cross-Cutting Concerns Identified

- **Knowledge Digitization:** Cơ chế chuyển đổi tri thức ngầm (Tacit) thành dữ liệu số (Explicit).
- **Human-in-the-loop:** Quyền ghi đè (Manual Override) của nghệ nhân là tối cao.
- **Data Integrity:** Đảm bảo Master Geometry JSON không bị sai lệch trong quá trình truyền tải và lưu trữ.

## Starter Template Evaluation

### Primary Technology Domain
Full-stack AI-Driven Manufacturing (Next.js Frontend + FastAPI/LangGraph Backend)

### Starter Options Selected

**Frontend: Next.js 16 Starter**
- **Rationale:** Next.js 16 cung cấp hiệu năng tối ưu (Turbopack) và App Router ổn định, phù hợp cho việc xử lý SVG morphing mượt mà.
- **Initialization Command:**
  ```bash
  npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
  ```

**Backend: FastAPI + LangGraph Starter**
- **Rationale:** Python là ngôn ngữ tốt nhất cho AI và xử lý hình học. LangGraph cho phép xây dựng các vòng lặp suy luận AI (Reasoning Loops) cần thiết cho việc dịch thuật cảm xúc sang hình học.
- **Initialization Command:** (Custom installation via pip/poetry for FastAPI, LangGraph, Pydantic v2)

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**
- **Auth Strategy:** Auth.js v5 + JWT với Role-based Middleware.
- **Data Foundation:** PostgreSQL 17 + `pgvector` cho lưu trữ hybrid (quan hệ + vector).
- **Inference Strategy:** Tách biệt Client-side Morphing (tức thì) và Backend Inference (đóng gói thiết kế).

**Important Decisions (Shape Architecture):**
- **State Management:** Zustand (Local state Sliders) + TanStack Query (Server sync).
- **Communication:** REST API thuần túy, không sử dụng WebSockets cho tương tác UI.

### Data Architecture

**Database Choice:**
- **Technology:** PostgreSQL 17
- **Name:** `tailor_db`
- **Extension:** `pgvector` 0.8.x
- **Rationale:** Giải pháp duy nhất cho phép quản lý cả dữ liệu quan hệ (SSOT) và tìm kiếm ngữ nghĩa (Smart Rules) trong cùng một môi trường ACID-compliant.

**Data Modeling:**
- **Validation:** Pydantic v2 (Backend) đảm bảo tính toàn vẹn của Master Geometry JSON trước khi lưu trữ.

### Authentication & Security

**Authentication Method:**
- **Provider:** Auth.js v5 (NextAuth.js)
- **Session:** JWT (Stateless)
- **Rationale:** Tận dụng hệ sinh thái Next.js 16, hỗ trợ tốt cho cả Node.js và Edge runtime.

**Authorization Patterns:**
- **Pattern:** Role-based Access Control (RBAC) thông qua `proxy.ts` (Next.js 16 Proxy pattern).
- **Roles:** `Owner` (Quản trị tri thức), `Tailor` (Thợ may kế thừa), `Customer` (Khách hàng).
- **CRITICAL:** Trong Next.js 16, `proxy.ts` thay thế hoàn toàn cho `middleware.ts`. Tuyệt đối KHÔNG tạo file `middleware.ts` vì sẽ gây xung đột runtime.

### API & Communication Patterns

**API Design:**
- **Pattern:** RESTful API (FastAPI).
- **Real-time Interaction:** Không sử dụng WebSockets. Slider UI tính toán chuyển đổi SVG (Morphing) hoàn toàn tại Client bằng thuật toán nội suy (Interpolation) để đạt độ trễ < 200ms.

### Geometry & Constraint Architecture (The Engine)

Hệ thống tuân thủ mô hình **Authoritative Server**, Backend là nguồn chân lý duy nhất (SSOT).

**1. Master Geometry Snapshot (Immutable State):**
- Mỗi thay đổi được lưu thành một trạng thái bất biến (Immutable).
- Chứa: `sequence_id`, `base_hash`, `algorithm_version`, `deltas`, `geometry_hash`.
- Nguyên tắc: Không bao giờ tin tưởng hình học từ Frontend; luôn tái dựng từ **Base Geometry + Deltas**.

**2. Concurrency & Race Condition Control:**
- Sử dụng **Sequence-based Validation**: Frontend gắn `sequence_id` tăng dần. Backend chỉ chấp nhận và xử lý request có sequence cao nhất, loại bỏ các request cũ (Early Return).

**3. Constraint Engine (Registry Pattern):**
- **Phase 1 - Hard Constraints:** Vi phạm dẫn đến Reject Snapshot ngay lập tức.
- **Phase 2 - Soft Constraints:** Trả về cảnh báo (Warnings) nhưng cho phép lưu snapshot.
- Cô lập logic kiểm tra: Dễ dàng tích hợp AI để giải thích lỗi vi phạm cho người dùng.

**4. Error Recovery & Evolution:**
- **FE Revert:** Tự động snap-back về `safe_snapshot_id` gần nhất khi validation thất bại.
- **GeometryRebuilderService:** Đảm bảo tính tương thích ngược khi thuật toán rập gốc (Base) nâng cấp phiên bản.

## Implementation Patterns & Consistency Rules

### Validation & Constraint Strategy

Hệ thống áp dụng nguyên tắc **Phân tách Trách nhiệm Kiểm soát (Separation of Validation Concerns)**:

**1. Frontend Validation (Zod):**
- **Trách nhiệm:** Chỉ kiểm tra tính hợp lệ của dữ liệu thô (Type safety, Required fields).
- **Phạm vi:** `number`, `string`, `boolean`, `enum`, `null check`.
- **Cấm Replicate:** Tuyệt đối không tái lập logic hình học (Geometry constraints) hoặc logic vật liệu (Fabric constraints) tại Frontend.

**2. Backend Constraint Engine (Authoritative):**
- **Trách nhiệm:** Thực thi toàn bộ logic nghiệp vụ, hình học và vật lý.
- **Quy trình:** Nhận Delta → Tái dựng hình học → Chạy Constraint Registry (Hard/Soft) → Trả về kết quả Validation + Snap-back data (nếu lỗi).

### Naming & Structure Patterns

**Naming Conventions:**
- **Backend (Python):** `snake_case` cho DB, API Endpoints, Hàm/Biến. `PascalCase` cho Pydantic Models.
- **Frontend (TS):** `PascalCase` cho Components. `camelCase` cho Hàm/Biến. `snake_case` cho JSON Fields (để đồng bộ với Master Geometry JSON).

**Project Organization:**
- **Backend:** Layered Architecture (`api`, `services`, `models`, `geometry`).
- **Frontend:** Feature-based Structure (Components, Hooks, Types theo tính năng).
- **Tests:** Folder `tests/` riêng biệt tại root của mỗi service.

### Communication & Data Formats

**API Response Wrapper:**
```json
{
  "data": { ... },
  "meta": { "sequence_id": 123 },
  "error": { "message": "...", "code": "ERR_CODE", "details": { ... } }
}
```

**Enforcement Guidelines:**
- Tất cả AI Agents phải tuân thủ nghiêm ngặt Schema của **Master Geometry JSON**.
- Mọi thay đổi về thuật ngữ phải sử dụng 100% thuật ngữ chuyên ngành may Việt Nam.

## Project Structure & Boundaries

### Frontend Structure (Next.js 16 App Router)

**Sub-applications & Route Groups:**
- `/app/(customer)`: Ưu tiên SSG/ISR. Trải nghiệm mượt mà, SEO tốt cho Showroom và Design Session.
- `/app/(workplace)/tailor`: Ưu tiên CSR. Công cụ kỹ thuật, bản vẽ SVG và quản lý sản xuất cho Minh.
- `/app/(workplace)/owner`: Dashboard quản trị, doanh thu và quản lý "The Vault" cho Cô Lan.

**Server vs Client Components Strategy:**
- **Server Components (Default):** Layouts & Pages. Xử lý RBAC (Auth.js), Fetch dữ liệu bảo mật và chuẩn bị Master Geometry JSON từ Server.
- **Client Components ("use client"):** Chỉ dành cho tương tác lá (Leaves). Ví dụ: `InteractiveCanvas.tsx` (GSAP/Zustand), `MeasurementSliders.tsx`, `RealTimeStatus.tsx`.

**Refined Directory Tree:**
```text
frontend/src/
├── app/
│   ├── (customer)/           # SSG/ISR prioritized
│   │   ├── showroom/
│   │   └── design-session/   # Mixed: Server Page + Client Canvas
│   ├── (workplace)/          # CSR/Private prioritized
│   │   ├── layout.tsx        # Shared Auth Gating (Owner/Tailor)
│   │   ├── tailor/           # Minh's Workspace
│   │   └── owner/            # Cô Lan's Dashboard
│   ├── layout.tsx            # Root layout
│   └── proxy.ts              # Next.js 16 Proxy - Role-based Redirection (Node.js Runtime)
├── components/
│   ├── server/               # Pure Server Components (Table, Info)
│   └── client/               # Interactive Components (Canvas, Sliders)
├── actions/                  # Server Actions (Gửi delta lên Backend)
├── store/                    # Zustand (Local UI state)
├── lib/
│   ├── api-client.ts         # FastAPI Communication
│   └── auth.ts               # Auth.js v5 Configuration
└── types/                    # Shared SSOT Schemas (Snake_case)
```

### Backend Structure (FastAPI + LangGraph)

```text
backend/src/
├── api/
│   └── v1/                   # Endpoints: /blueprints, /inference
├── agents/                   # LangGraph: Emotional Compiler, Atelier Academy
├── geometry/                 # GeometryRebuilder, SVG/DXF Engine
├── constraints/              # Constraint Registry (Hard/Soft Rules)
├── services/                 # Business Logic & Orchestration
├── models/                   # Pydantic & DB Schemas (SSOT)
└── core/                     # Security, JWT, Global Config
```

### Architectural Boundaries & Integration

**Internal Communication:**
- **Frontend -> Backend:** Gửi `Deltas + sequence_id` qua Server Actions hoặc API Client.
- **Backend -> Frontend:** Trả về `Validated Snapshot` hoặc `Snap-back data` when vi phạm ràng buộc.

**Security Boundaries:**
- **Auth Middleware:** Chặn truy cập trái phép dựa trên Role ngay tại tầng Next.js Middleware.
- **The Vault Boundary:** Tri thức nghệ nhân (Smart Rules) được bảo vệ nghiêm ngặt tại Backend, không bao giờ lộ ra Client code.
