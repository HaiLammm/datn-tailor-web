---
project_name: 'tailor_project'
user_name: 'Lem'
date: '2026-02-26'
sections_completed: ['technology_stack', 'naming_conventions', 'project_structure', 'security_rbac', 'language_rules', 'framework_rules']
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Auth.js v5 (Beta), Zustand (State), TanStack Query (Data Fetching).
- **Backend:** Python 3.11+, FastAPI, LangGraph, Pydantic v2.
- **Database:** PostgreSQL 17, pgvector 0.8.x (Tên DB: `tailor_db`).
- **Format:** Master Geometry JSON (Single Source of Truth).

---

## Naming Conventions

- **Backend (Python):**
  - Database fields, API endpoints, Variables, Functions: `snake_case`.
  - Classes, Pydantic Models: `PascalCase`.
- **Frontend (TypeScript/React):**
  - Components, Types/Interfaces: `PascalCase`.
  - Variables, Functions, Hooks: `camelCase`.
  - JSON Fields (for SSOT synchronization): `snake_case`.

---

## Project Structure

### Frontend (`/frontend/src`)
- **`app/`**: Chứa **Server Components** (Layouts, Pages, Route Groups). Ưu tiên xử lý logic Server, SEO và fetch dữ liệu tại đây.
- **`components/`**: CHỈ chứa **Client Components** (`"use client"`).
  - **`components/common/`**: Các UI components nhỏ, tái sử dụng cao (Button, Input, Slider).
  - **`components/layout/`**: Các khung sườn giao diện (Skeleton, Navbar, Footer).
- **`lib/`**: Chứa cấu hình các thư viện (Auth.js, Prisma, API Clients).
- **`utils/`**: Chứa các hàm tiện ích dùng chung (formatDate.ts, validateEmail.ts).
- **`store/`**: Zustand stores cho quản lý trạng thái Client.
- **`types/`**: Định nghĩa kiểu dữ liệu TypeScript (duy trì `snake_case` cho đồng bộ SSOT).

### Backend (`/backend/src`)
- **`api/v1/`**: Định nghĩa các API endpoints.
- **`agents/`**: Logic điều phối LangGraph.
- **`geometry/`**: Lõi xử lý hình học và bản vẽ.
- **`constraints/`**: Các quy tắc vật lý và hình học (Hard/Soft Rules).
- **`models/`**: Pydantic models (SSOT).
- **`services/`**: Logic nghiệp vụ và xử lý dữ liệu.

---

## Critical Implementation Rules

### 1. Authoritative Server Pattern
- **RULE:** Backend là nguồn chân lý duy nhất (SSOT) cho hình học và các ràng buộc vật lý.
- **DO NOT** tái lập logic biến đổi hình học hoặc ràng buộc vải tại Frontend.
- **DO NOT** tin tưởng dữ liệu hình học gửi từ Frontend. Luôn tái dựng từ Base Geometry + Deltas.

### 2. Terminology Policy
- **RULE:** Sử dụng 100% thuật ngữ chuyên ngành may mặc Việt Nam (vd: "Hạ nách", "Cấn tay", "Vòng nách").
- Mọi nhãn UI và đầu ra của AI phải tuân thủ bảng đối soát thuật ngữ đã được phê duyệt.

### 3. Validation Strategy
- **Frontend:** Sử dụng Zod để xác thực dữ liệu thô đầu vào (kiểu dữ liệu, trường bắt buộc).
- **Backend:** Sử dụng Pydantic v2 để xác thực toàn bộ logic nghiệp vụ và hình học.

### 4. Security & Authentication (JWT & Cookie)
- **RULE:** Sử dụng **JWT (JSON Web Token)** lưu trữ trong **HttpOnly, Secure, SameSite Cookie** cho mọi phiên làm việc.
  - Tuyệt đối KHÔNG lưu token trong `localStorage` hoặc `sessionStorage`.
  - Backend phải thiết lập cờ `HttpOnly` và `Secure` (trong production) cho Header `Set-Cookie`.
- **RULE (CSRF):** Triển khai cơ chế bảo vệ CSRF khi sử dụng xác thực dựa trên Cookie.
- **RULE:** Phân quyền RBAC chặt chẽ cho `Owner`, `Tailor`, và `Customer`.
- **RULE (Next.js 16):** Sử dụng `proxy.ts` thay thế hoàn toàn cho `middleware.ts` để quản lý xác thực và điều hướng tại tầng Node.js runtime. Tuyệt đối KHÔNG tạo file `middleware.ts`.

### 5. Language-Specific Rules

**TypeScript (Frontend):**
- **RULE (Strict Type):** Sử dụng **Strict Mode 100%**. Mọi biến và props phải có kiểu dữ liệu rõ ràng.
- **RULE (Interface vs Type):** Ưu tiên `interface` cho cấu trúc dữ liệu và `type` cho Union types.

**Python (Backend):**
- **RULE (Type Hints):** PHẢI sử dụng Type Hints cho tất cả các hàm và tham số.
- **RULE (Async):** Ưu tiên xử lý bất đồng bộ (`async def`) cho các hoạt động I/O.

### 6. Framework-Specific Rules (Next.js 15/16)

- **RULE (Component Separation):** Thư mục `app/` là nơi chứa Server Components. Thư mục `components/` là nơi CHỈ chứa Client Components. AI không được đặt Client Components trực tiếp trong `app/` trừ khi là tệp page/layout cần thiết.
- **RULE (Optimization):** Luôn ưu tiên tối ưu hóa mã nguồn bằng cách sử dụng các hàm dùng chung tại `utils/` và các component nguyên tử tại `components/common/`.
- **RULE (Library Config):** Mọi cấu hình khởi tạo thư viện phải nằm trong thư mục `lib/`.
- **RULE (Server Actions):** Sử dụng Server Actions cho các mutation dữ liệu từ Client lên Backend.
