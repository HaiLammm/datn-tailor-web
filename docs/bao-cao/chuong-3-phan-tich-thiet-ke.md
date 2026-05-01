---
title: "Chương 3 — Phân tích và Thiết kế hệ thống"
project: tailor_project (Nhà May Thanh Lộc)
group: Nhóm 1 — Đồ án Công nghệ phần mềm
author: Lem
date: 2026-04-15
language: vi
---

# Chương 3. Phân tích và Thiết kế hệ thống

Chương này trình bày kiến trúc tổng thể, mô hình dữ liệu, thiết kế API và thiết kế giao diện người dùng. Mọi quyết định kiến trúc tuân theo tài liệu *Architecture Decision Document* đã được phê duyệt trước khi triển khai.

## 3.1. Kiến trúc tổng thể

### 3.1.1. Mô hình kiến trúc

Hệ thống tuân theo mô hình **Full-stack Layered Architecture** với hai deployable unit (frontend + backend) giao tiếp qua REST API, cùng một lớp persistence (PostgreSQL + pgvector).

```mermaid
flowchart TB
    Browser["Browser<br/>(Customer / Owner / Tailor)"]
    
    subgraph FE["Frontend — Next.js 16 (port 3000)"]
        AppRouter["App Router<br/>(auth) / (customer) / (workplace)"]
        Proxy["proxy.ts<br/>Cookie -> JWT Bearer"]
        Actions["Server Actions<br/>(18 action files)"]
        Stores["Zustand + TanStack Query"]
    end

    subgraph BE["Backend — FastAPI (port 8000)"]
        Routers["api/v1/<br/>30 routers"]
        Services["services/<br/>30 service files"]
        Models["models/<br/>Pydantic + SQLAlchemy"]
        Patterns["patterns/<br/>Pattern Engine"]
        Geometry["geometry/<br/>AI Bespoke (hoan)"]
        Agents["agents/<br/>LangGraph (hoan)"]
        Constraints["constraints/<br/>Hard/Soft rules"]
        Core["core/<br/>config, db, security"]
    end

    DB[("PostgreSQL 17<br/>+ pgvector<br/>22 tables")]

    Browser -->|HTTPS| FE
    AppRouter --> Proxy
    AppRouter --> Actions
    Actions --> Proxy
    Proxy -->|"Authorization: Bearer"| Routers
    Routers --> Services
    Services --> Models
    Services --> Patterns
    Services --> Geometry
    Services --> Agents
    Models --> DB
    Patterns --> DB
    Constraints -.->|validate| Services
    Core -.->|config, auth| Routers
```

### 3.1.2. Mô hình kiến trúc (ASCII — phiên bản in ấn)

Phiên bản ASCII dưới đây phục vụ cho các trường hợp in giấy hoặc renderer không hỗ trợ Mermaid:

```text
┌─────────────────────────────────────────────────────────────────┐
│                    BROWSER (3 vai trò)                          │
│      Cookie HttpOnly + Secure + SameSite (Auth.js v5)          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────────┐
│           NEXT.JS 16 APP ROUTER (port 3000)                     │
│                                                                  │
│  app/                                                            │
│   ├─ (auth)/       → login, register, OTP, reset                │
│   ├─ (customer)/   → showroom, booking, checkout (Boutique)     │
│   ├─ (workplace)/  → owner/, tailor/, design-session/ (Command) │
│   ├─ actions/      → 18 Server Actions (goi backend qua proxy) │
│   └─ proxy.ts      → doc cookie, dinh JWT, forward request     │
│                                                                  │
│  State: Zustand (cart, design) + TanStack Query (server sync)   │
│  UI: TailwindCSS v4 + Radix UI + Framer Motion                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTP (server-to-server, JWT)
┌──────────────────────────▼──────────────────────────────────────┐
│           FASTAPI BACKEND (port 8000)                            │
│                                                                  │
│  api/v1/ (30 routers) → services/ (30 files) → models/ (ORM)   │
│                                                                  │
│  Sidecars doc lap:                                               │
│    patterns/    — Pattern Engine (Epic 11, deterministic)        │
│    geometry/    — GeometryRebuilder (Epic 13, hoan)              │
│    agents/      — LangGraph Emotional Compiler (Epic 12, hoan)  │
│    constraints/ — Hard/Soft rules registry (Epic 14, hoan)      │
│    core/        — config, database, security, seed               │
│                                                                  │
│  Background: scheduler_service (nhac tra do), email_service      │
└──────────────────────────┬──────────────────────────────────────┘
                           │ asyncpg
┌──────────────────────────▼──────────────────────────────────────┐
│           POSTGRESQL 17 + pgvector 0.8.x                         │
│           22 tables, 30 migrations, tenant_id isolation          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.1.3. Nguyên lý kiến trúc cốt lõi

**Nguyên lý 1 — Authoritative Server Pattern (SSOT)**

Backend là nguồn chân lý duy nhất cho mọi validation nghiệp vụ, giá trị hoá đơn và tồn kho. Frontend chỉ chịu trách nhiệm validate kiểu (TypeScript/Zod) và rendering UI. Khi checkout, backend tính lại toàn bộ giá, voucher, tồn kho — không tin cậy giá trị từ Zustand store.

**Nguyên lý 2 — Dual-Mode UI Architecture**

Giao diện tách hoàn toàn hai chế độ thông qua Route Groups của Next.js:

| Thuộc tính | Boutique Mode `(customer)/` | Command Mode `(workplace)/` |
|---|---|---|
| Đối tượng | Customer | Owner, Tailor |
| Background | Silk Ivory `#F9F7F2` | White `#FFFFFF` |
| Heading font | Cormorant Garamond (serif) | Inter (sans-serif) |
| Spacing | 16–24 px (spacious) | 8–12 px (dense) |
| Navigation | Bottom Tab Bar (mobile) | Sidebar collapsible |
| Ưu tiên | Thẩm mỹ, animation | Mật độ dữ liệu, hiệu suất |

**Nguyên lý 3 — Proxy Pattern (Auth-aware)**

```text
Browser → Next.js Server (proxy.ts đọc cookie, đính JWT) → FastAPI Backend
```

Browser không bao giờ gọi trực tiếp FastAPI. Proxy đảm bảo JWT không bị lộ qua JavaScript (HttpOnly cookie).

**Nguyên lý 4 — "Core cứng, Shell mềm"**

Module `patterns/` (Pattern Engine, Epic 11) hoàn toàn standalone — không import từ `geometry/`, `agents/`, hay `constraints/`. Dùng công thức tất định (pure math), chạy dưới 50 ms cho 3 mảnh rập. Tách biệt hoàn toàn với AI Bespoke Engine để đảm bảo mọi output luôn khả thi vật lý.

### 3.1.4. Sơ đồ thành phần (Component Diagram)

```mermaid
flowchart LR
    subgraph Frontend
        RC["Route Groups<br/>(auth), (customer),<br/>(workplace)"]
        SA["Server Actions<br/>(18 files)"]
        ZS["Zustand Stores<br/>cart, design"]
        TQ["TanStack Query<br/>server state cache"]
        UI["Components<br/>Radix + Tailwind +<br/>Framer Motion"]
    end

    subgraph Backend
        API["API Layer<br/>30 FastAPI routers"]
        SVC["Service Layer<br/>30 business services"]
        PE["Pattern Engine<br/>formulas + SVG +<br/>G-code"]
        BG["Background<br/>scheduler, email,<br/>webhook"]
    end

    subgraph Data
        PG[("PostgreSQL<br/>22 tables")]
        FS["File Storage<br/>/uploads"]
    end

    RC --> SA
    SA --> API
    ZS --> TQ
    TQ --> SA
    UI --> RC
    API --> SVC
    SVC --> PE
    SVC --> PG
    SVC --> BG
    BG --> PG
    API --> FS
```

## 3.2. Mô hình dữ liệu

### 3.2.1. Tổng quan

Cơ sở dữ liệu gồm **22 bảng** được chia thành 7 nhóm domain, kết nối bởi hơn **39 foreign key**. Tất cả bảng nghiệp vụ đều chứa `tenant_id` để hỗ trợ multi-tenant isolation ở tầng ứng dụng.

Dưới đây trình bày ERD theo từng nhóm domain để dễ đọc. Sơ đồ ERD đầy đủ xem tại Phụ lục A (`_bmad-output/erd.mmd`).

### 3.2.2. Nhóm Auth & Tenant

```mermaid
erDiagram
    tenants {
        uuid id PK
        varchar name
        varchar slug
        bool is_active
    }
    users {
        uuid id PK
        varchar email UK
        varchar role "Owner | Tailor | Customer"
        uuid tenant_id FK
        bool is_active
    }
    staff_whitelist {
        uuid id PK
        varchar email
        varchar role
    }
    otp_codes {
        int id PK
        varchar email
        varchar code
        varchar purpose "register | recovery"
        bool is_used
        int attempts
    }

    tenants ||--o{ users : "tenant_id"
```

**Mô tả:**

| Bảng | Vai trò |
|---|---|
| `tenants` | Mỗi record = 1 tiệm may, cách ly hoàn toàn dữ liệu |
| `users` | Tài khoản — 3 role: Owner, Tailor, Customer. FK `tenant_id` |
| `staff_whitelist` | Whitelist email nhân viên được phép đăng ký role Owner/Tailor |
| `otp_codes` | Mã OTP cho đăng ký và khôi phục mật khẩu, có rate limiting |

### 3.2.3. Nhóm Customer & Measurement

```mermaid
erDiagram
    customer_profiles {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        varchar full_name
        varchar phone
    }
    measurements {
        uuid id PK
        uuid customer_profile_id FK
        uuid tenant_id FK
        decimal neck
        decimal shoulder_width
        decimal bust
        decimal waist
        decimal hip
    }

    users ||--o{ customer_profiles : "user_id"
    customer_profiles ||--o{ measurements : "customer_profile_id"
    tenants ||--o{ customer_profiles : "tenant_id"
    tenants ||--o{ measurements : "tenant_id"
```

**Mô tả:**

| Bảng | Vai trò |
|---|---|
| `customer_profiles` | Hồ sơ khách hàng (per-tenant) — gắn `user_id` |
| `measurements` | Bộ số đo cơ thể — versioned (1 khách có nhiều bộ số đo theo thời gian) |

### 3.2.4. Nhóm Order, Payment & Rental

```mermaid
erDiagram
    orders {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        varchar service_type "buy | rent | bespoke"
        varchar status
        varchar payment_status
        decimal total_amount
        uuid pattern_session_id FK "nullable"
        varchar security_type "cccd | cash_deposit"
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid garment_id FK
        varchar transaction_type "buy | rent"
        decimal unit_price
        decimal total_price
    }
    payment_transactions {
        uuid id PK
        uuid order_id FK
        varchar payment_type "full | deposit | remaining | security_deposit"
        decimal amount
        varchar method
        varchar status "pending | paid | failed | refunded"
        varchar gateway_ref
    }
    rental_returns {
        uuid id PK
        uuid tenant_id FK
        uuid order_item_id FK
        uuid garment_id FK
        varchar return_condition "Good | Damaged | Lost"
        decimal deposit_deduction
    }
    garments {
        uuid id PK
        varchar name
        varchar status
    }

    orders ||--o{ order_items : "order_id"
    orders ||--o{ payment_transactions : "order_id"
    order_items ||--o{ rental_returns : "order_item_id"
    garments ||--o{ order_items : "garment_id"
    garments ||--o{ rental_returns : "garment_id"
```

**Mô tả:**

| Bảng | Vai trò |
|---|---|
| `orders` | Đơn hàng — `service_type` phân biệt 3 luồng; `pattern_session_id` gắn rập (Epic 11) |
| `order_items` | Chi tiết từng sản phẩm trong đơn — `transaction_type` phân loại mua/thuê |
| `payment_transactions` | Mô hình thanh toán đa bước: full / deposit / remaining / security_deposit |
| `rental_returns` | Ghi nhận trả đồ thuê: tình trạng + tiền trừ cọc |

### 3.2.5. Nhóm Product, Production & Design

```mermaid
erDiagram
    garments {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar category
        decimal rental_price
        decimal sale_price
        varchar status "Available | Rented | Maintenance | Retired"
        varchar material
    }
    tailor_tasks {
        uuid id PK
        uuid tenant_id FK
        uuid order_id FK
        uuid assigned_to FK
        varchar status "assigned | in_progress | completed"
        decimal piece_rate
    }
    appointments {
        uuid id PK
        uuid tenant_id FK
        varchar customer_name
        date appointment_date
        varchar slot "morning | afternoon"
        varchar status
    }
    designs {
        uuid id PK
        uuid user_id FK
        uuid tenant_id FK
        json master_geometry
        varchar status
    }
    design_overrides {
        uuid id PK
        uuid design_id FK
        uuid tenant_id FK
        uuid tailor_id FK
        varchar delta_key
        decimal original_value
        decimal overridden_value
    }

    tenants ||--o{ garments : "tenant_id"
    orders ||--o{ tailor_tasks : "order_id"
    users ||--o{ tailor_tasks : "assigned_to"
    tenants ||--o{ appointments : "tenant_id"
    users ||--o{ designs : "user_id"
    tenants ||--o{ designs : "tenant_id"
    designs ||--o{ design_overrides : "design_id"
    users ||--o{ design_overrides : "tailor_id"
```

**Mô tả:**

| Bảng | Vai trò |
|---|---|
| `garments` | Kho áo dài: bán + cho thuê, theo dõi trạng thái và chất liệu |
| `tailor_tasks` | Phân công thợ may — `piece_rate` lưu lương theo sản phẩm |
| `appointments` | Lịch hẹn tư vấn Bespoke — slot morning/afternoon |
| `designs` | Thiết kế áo dài — Master Geometry JSON (Epic 12–14, hoãn) |
| `design_overrides` | Override thủ công của thợ may — delta_key, original vs overridden value |

### 3.2.6. Nhóm CRM & Marketing

```mermaid
erDiagram
    leads {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar classification "hot | warm | cold"
        varchar source
    }
    lead_conversions {
        uuid id PK
        uuid tenant_id FK
        uuid customer_profile_id FK
        uuid converted_by FK
        varchar lead_name
    }
    vouchers {
        uuid id PK
        uuid tenant_id FK
        varchar code
        varchar type "percent | fixed"
        decimal value
        date expiry_date
        bool is_active
        varchar visibility "public | private"
    }
    user_vouchers {
        uuid id PK
        uuid user_id FK
        uuid voucher_id FK
        bool is_used
    }
    notifications {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        varchar type
        varchar title
        bool is_read
    }

    tenants ||--o{ leads : "tenant_id"
    leads ||--o{ lead_conversions : "lead_name (soft link)"
    customer_profiles ||--o{ lead_conversions : "customer_profile_id"
    vouchers ||--o{ user_vouchers : "voucher_id"
    users ||--o{ user_vouchers : "user_id"
    tenants ||--o{ notifications : "tenant_id"
    users ||--o{ notifications : "user_id"
```

**Mô tả:**

| Bảng | Vai trò |
|---|---|
| `leads` | Khách tiềm năng — phân loại Hot/Warm/Cold |
| `lead_conversions` | Lịch sử chuyển đổi lead → customer |
| `vouchers` | Mã giảm giá: percent/fixed, public/private visibility |
| `user_vouchers` | Gán voucher cho user, tracking `is_used` |
| `notifications` | Thông báo in-app — type, title, is_read |

### 3.2.7. Nhóm Pattern Engine (Epic 11)

```mermaid
erDiagram
    pattern_sessions {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        uuid created_by FK
        numeric do_dai_ao "do dai ao"
        numeric ha_eo "ha eo"
        numeric vong_co "vong co"
        numeric vong_nach "vong nach"
        numeric vong_nguc "vong nguc"
        numeric vong_eo "vong eo"
        numeric vong_mong "vong mong"
        numeric do_dai_tay "do dai tay"
        numeric vong_bap_tay "vong bap tay"
        numeric vong_co_tay "vong co tay"
        varchar garment_type
        varchar status "draft | completed | exported"
    }
    pattern_pieces {
        uuid id PK
        uuid session_id FK
        varchar piece_type "front_bodice | back_bodice | sleeve"
        text svg_data "SVG 1-1 scale"
        jsonb geometry_params
    }

    pattern_sessions ||--o{ pattern_pieces : "session_id"
    orders }o--|| pattern_sessions : "pattern_session_id"
    customer_profiles ||--o{ pattern_sessions : "customer_id"
    users ||--o{ pattern_sessions : "created_by"
    tenants ||--o{ pattern_sessions : "tenant_id"
```

**Mô tả:**

| Bảng | Vai trò |
|---|---|
| `pattern_sessions` | Phiên sinh rập — snapshot 10 số đo (immutable), garment_type extensible |
| `pattern_pieces` | 3 mảnh rập kết quả — SVG markup + geometry params JSONB |

**Quyết định thiết kế quan trọng:**

- **10 cột riêng** cho số đo (không dùng JSONB) → hỗ trợ SQL query trực tiếp, type safety, Pydantic validation per field.
- **svg_data TEXT** lưu trực tiếp trong DB — pattern SVG nhỏ (dưới 50 KB), tránh phức tạp quản lý file external.
- **garment_type VARCHAR** chuẩn bị cho Open Garment System (không chỉ áo dài) mà không cần thay đổi schema.

### 3.2.8. Chiến lược Multi-Tenancy

Hệ thống áp dụng **shared schema, tenant_id column** — tất cả bảng nghiệp vụ chứa `tenant_id UUID` FK về `tenants(id)`.

```mermaid
flowchart LR
    REQ["Request vao<br/>(co JWT)"] --> DEP["TenantId<br/>Dependency"]
    DEP -->|"extract tenant_id<br/>tu user.tenant_id"| SVC["Service Layer"]
    SVC -->|"WHERE tenant_id = ?"| DB[("PostgreSQL")]

    DEP -->|"Owner khong co<br/>tenant_id?"| DEFAULT["Default Tenant<br/>00000000-...-000001"]
```

- Mọi truy vấn service BẮT BUỘC filter theo `tenant_id`.
- Owner role có thể dùng default tenant nếu chưa gán tenant cụ thể.
- Khi resource thuộc tenant khác → trả `404` (không phải `403`) để tránh leak thông tin.

## 3.3. Thiết kế API

### 3.3.1. Tổng quan endpoint

Backend cung cấp **30 router** tại prefix `/api/v1/`, tổ chức theo domain nghiệp vụ:

| Nhóm | Router tiêu biểu | Phương thức chính | Đối tượng auth |
|---|---|---|---|
| **Auth** | `/auth` | POST login, register, OTP send/verify, reset | Public / CurrentUser |
| **Customer Self-service** | `/customers/me` | GET profile, measurements, orders, notifications, vouchers | Customer |
| **Products & Showroom** | `/garments` | GET list (paginated + filter), GET detail, POST/PUT/DELETE CRUD | Public (GET) / OwnerOnly (CRUD) |
| **Cart & Checkout** | `/orders` | POST create, GET list, GET detail | CurrentUser |
| **Booking** | `/appointments` | POST create, GET list | CurrentUser / OwnerOnly |
| **Order Management** | `/orders/{id}/approve`, `/orders/{id}/pay-remaining`, `/orders/{id}/refund-security` | POST | OwnerOnly / Customer |
| **Tailor Tasks** | `/tailor/tasks` | GET list, PATCH status | OwnerOrTailor |
| **Dashboard KPI** | `/kpi` | GET stats, revenue, order-breakdown | OwnerOnly |
| **CRM** | `/leads`, `/vouchers`, `/campaigns` | CRUD | OwnerOnly |
| **Pattern Engine** | `/patterns/sessions`, `/patterns/pieces/{id}/export` | POST create/generate, GET detail/export | OwnerOnly / OwnerOrTailor |
| **Uploads** | `/uploads` | POST multipart | CurrentUser |

### 3.3.2. Quy ước response

Mọi endpoint tuân theo wrapper thống nhất:

**Thành công:**

```json
{
  "data": { "id": "uuid", "status": "completed", "..." : "..." },
  "meta": { "pagination": { "page": 1, "size": 20, "total": 100 } }
}
```

**Lỗi:**

```json
{
  "error": {
    "code": "ERR_INVALID_FORMAT",
    "message": "Dinh dang xuat khong hop le. Chon 'svg' hoac 'gcode'"
  }
}
```

HTTP status tuân theo quy ước: `200`/`201` thành công, `400` sai format, `401` token hết hạn, `403` sai role, `404` không tìm thấy (hoặc khác tenant), **`422`** vi phạm ràng buộc hình học (message tiếng Việt 100%), `500` lỗi không lường trước.

### 3.3.3. Ví dụ chi tiết — Pattern Engine API

**Tạo phiên sinh rập:**

```
POST /api/v1/patterns/sessions
Authorization: Bearer <owner_jwt>
Content-Type: application/json

{
  "customer_id": "uuid-of-customer",
  "do_dai_ao": 120.0,
  "ha_eo": 38.5,
  "vong_co": 36.0,
  "vong_nach": 40.0,
  "vong_nguc": 88.0,
  "vong_eo": 68.0,
  "vong_mong": 92.0,
  "do_dai_tay": 55.0,
  "vong_bap_tay": 28.0,
  "vong_co_tay": 16.0,
  "garment_type": "ao_dai",
  "notes": "Khach yeu cau ta rong hon 2cm"
}
```

**Response 201:**

```json
{
  "data": {
    "id": "session-uuid",
    "customer_id": "uuid-of-customer",
    "status": "draft",
    "garment_type": "ao_dai",
    "do_dai_ao": 120.0,
    "vong_nguc": 88.0,
    "..."  : "..."
  },
  "meta": {}
}
```

**Sinh 3 mảnh rập:**

```
POST /api/v1/patterns/sessions/{session-uuid}/generate
Authorization: Bearer <owner_jwt>
```

**Response 200:**

```json
{
  "data": {
    "id": "session-uuid",
    "status": "completed",
    "pieces": [
      { "id": "piece-1", "piece_type": "front_bodice", "svg_data": "<svg ...>", "geometry_params": { "bust_width": 22.0, "waist_width": 16.0, "..." : "..." } },
      { "id": "piece-2", "piece_type": "back_bodice", "svg_data": "<svg ...>", "geometry_params": { "..." : "..." } },
      { "id": "piece-3", "piece_type": "sleeve", "svg_data": "<svg ...>", "geometry_params": { "cap_height": 19.0, "..." : "..." } }
    ]
  },
  "meta": {}
}
```

**Xuất G-code (single piece):**

```
GET /api/v1/patterns/pieces/{piece-1}/export?format=gcode&speed=1000&power=80
Authorization: Bearer <owner_jwt>
```

**Response:** `Content-Type: text/plain`, file download `front_bodice.gcode`.

### 3.3.4. Ví dụ chi tiết — Unified Order Workflow API

**Owner phê duyệt đơn:**

```
POST /api/v1/orders/{order-id}/approve
Authorization: Bearer <owner_jwt>
```

**Response 200:**

```json
{
  "data": {
    "id": "order-id",
    "status": "confirmed",
    "service_type": "bespoke",
    "routing": "tailor_task_created"
  },
  "meta": {}
}
```

Backend tự động: (1) chuyển status `pending` → `confirmed`, (2) tạo `tailor_tasks` nếu bespoke, (3) gửi notification cho thợ may, (4) email xác nhận cho customer.

## 3.4. Thiết kế giao diện người dùng

### 3.4.1. Luồng tương tác — Đặt may Bespoke (Customer)

Sơ đồ sequence dưới đây mô tả luồng chính của hành trình Bespoke từ góc nhìn Customer:

```mermaid
sequenceDiagram
    actor C as Customer
    participant FE as Next.js Frontend
    participant BE as FastAPI Backend
    participant DB as PostgreSQL

    C->>FE: Chon "Dat may Bespoke"
    FE->>BE: POST /orders/check-measurement
    BE->>DB: SELECT measurements WHERE customer_id
    
    alt Chua co so do
        BE-->>FE: 200 {has_measurements: false}
        FE-->>C: Redirect -> Booking Calendar
    else Da co so do
        BE-->>FE: 200 {has_measurements, summary}
        FE-->>C: Hien thi summary so do
        C->>FE: "Xac nhan, dung so do nay"
        FE->>BE: POST /orders (service_type=bespoke)
        BE->>DB: INSERT orders (status=pending)
        BE->>BE: Redirect payment gateway (deposit)
        BE-->>FE: 201 {order_id, payment_url}
        FE-->>C: Redirect VNPay/MoMo
        Note over C,BE: Webhook callback sau thanh toan
        BE->>DB: UPDATE payment_transactions (paid)
        BE->>BE: Send email confirmation
        BE-->>FE: Order pending (cho Owner approve)
    end
```

### 3.4.2. Luồng tương tác — Sinh rập kỹ thuật (Owner)

```mermaid
sequenceDiagram
    actor O as Owner
    participant FE as Design Session UI
    participant BE as FastAPI Backend
    participant PE as Pattern Engine
    participant DB as PostgreSQL

    O->>FE: Mo Design Session, chon Customer
    FE->>BE: GET /customers/{id}/measurements
    BE-->>FE: 10 so do moi nhat
    FE-->>O: Auto-fill MeasurementForm

    O->>FE: Dieu chinh so do, nhan "Tao phien"
    FE->>BE: POST /patterns/sessions
    BE->>DB: INSERT pattern_sessions (draft)
    BE-->>FE: session_id

    O->>FE: Nhan "Sinh rap"
    FE->>BE: POST /patterns/sessions/{id}/generate
    BE->>PE: generate_pattern_pieces(measurements)
    PE-->>BE: 3 PieceResult (SVG + params)
    BE->>DB: INSERT 3 pattern_pieces
    BE-->>FE: session (completed) + 3 pieces

    FE-->>O: Split-pane: PatternPreview (SVG)
    O->>FE: Nhan "Xuat G-code"
    FE->>BE: GET /pieces/{id}/export?format=gcode
    BE-->>FE: File download .gcode
```

### 3.4.3. Cấu trúc route frontend

Bảng dưới đây ánh xạ các route chính vào chức năng và vai trò:

| Route group | Route tiêu biểu | Chức năng | Vai trò |
|---|---|---|---|
| `(auth)/` | `/login`, `/register`, `/verify-otp`, `/forgot-password`, `/reset-password` | Xác thực | Tất cả |
| `(customer)/` | `/showroom`, `/showroom/[id]` | Duyệt sản phẩm, chi tiết HD zoom | Customer + Guest |
| | `/booking` | Đặt lịch tư vấn | Customer |
| | `/measurement-gate` | Kiểm tra số đo trước bespoke checkout | Customer |
| | `/checkout` | Thanh toán (service-type-aware) | Customer |
| | `/profile` | Hồ sơ, đơn hàng, voucher, thông báo | Customer |
| `(workplace)/` | `/owner` | Dashboard KPI + doanh thu | Owner |
| | `/owner/orders`, `/owner/products`, `/owner/inventory` | Quản lý đơn, sản phẩm, kho | Owner |
| | `/owner/customers`, `/owner/staff` | Quản lý khách hàng, nhân viên | Owner |
| | `/owner/crm`, `/owner/vouchers`, `/owner/campaigns` | CRM, voucher, chiến dịch | Owner |
| | `/owner/rentals`, `/owner/production` | Quản lý thuê, sản xuất | Owner |
| | `/design-session` | Sinh rập kỹ thuật (split-pane) | Owner |
| | `/tailor/tasks`, `/tailor/tasks/[taskId]` | Danh sách task, chi tiết + PatternPreview | Tailor |
| | `/tailor/feedback`, `/tailor/review` | Phản hồi, review | Tailor |

### 3.4.4. So sánh hai chế độ giao diện

```mermaid
flowchart LR
    subgraph BM["Boutique Mode (Customer)"]
        BM1["Bottom Tab Bar<br/>(Home, Shop, Book, Profile)"]
        BM2["Ivory background<br/>Serif headings"]
        BM3["Spacious layout<br/>gap 16-24px"]
        BM4["Micro-animations<br/>Framer Motion"]
    end

    subgraph CM["Command Mode (Owner/Tailor)"]
        CM1["Sidebar collapsible<br/>Section grouping"]
        CM2["White background<br/>Sans-serif dominant"]
        CM3["Dense layout<br/>gap 8-12px"]
        CM4["Data-heavy<br/>KPI cards, tables"]
    end

    Router{"Next.js<br/>Route Group<br/>Detection"}
    Router -->|"(customer)/"| BM
    Router -->|"(workplace)/"| CM
```

### 3.4.5. State management strategy

Hệ thống tách rõ hai loại state:

| Loại | Công cụ | Phạm vi | Ví dụ |
|---|---|---|---|
| **Local UI State** | Zustand 5 (+ Immer middleware) | Client-side, optimistic | Cart items, design pillar selection, slider values, modal visibility |
| **Server State** | TanStack Query 5 | Sync với backend, cache + invalidation | Order list, customer profiles, pattern sessions, KPI data |

**Quy tắc quan trọng:** Zustand KHÔNG cache giá sản phẩm hoặc tồn kho. Khi navigate đến Checkout, TanStack Query luôn invalidate và re-fetch từ backend (Authoritative Server Pattern).

## 3.5. Thiết kế bảo mật

### 3.5.1. Mô hình bảo mật bốn lớp

```mermaid
flowchart TB
    L1["Lop 1: Browser<br/>HTTPS, HttpOnly Cookie,<br/>CSP, SameSite"]
    L2["Lop 2: Next.js Server<br/>proxy.ts verify cookie,<br/>Route guard theo role"]
    L3["Lop 3: FastAPI Backend<br/>JWT verify, RBAC dependency,<br/>TenantId filter"]
    L4["Lop 4: PostgreSQL<br/>tenant_id row isolation,<br/>AES-256 (khuyen nghi)"]

    L1 --> L2 --> L3 --> L4
```

### 3.5.2. RBAC Dependencies

Backend áp dụng RBAC thông qua FastAPI dependency injection:

| Dependency | Vai trò cho phép | Sử dụng tại |
|---|---|---|
| `CurrentUser` | Bất kỳ user đã đăng nhập | Profile, notifications |
| `OwnerOnly` | Chỉ Owner | Product CRUD, order approve, KPI, pattern generate |
| `OwnerOrTailor` | Owner hoặc Tailor | Task list, pattern view/export |
| `OptionalCurrentUser` | Đăng nhập hoặc guest | Showroom GET (hiển thị khác nhau) |
| `TenantId` | Auto-extract từ user JWT | Mọi query có filter tenant |

## 3.6. Tổng kết chương

Kiến trúc hệ thống **Nhà May Thanh Lộc** được thiết kế theo bốn nguyên lý cốt lõi: Authoritative Server (SSOT), Dual-Mode UI, Proxy Pattern, và "Core cứng, Shell mềm". Cơ sở dữ liệu gồm 22 bảng chia 7 nhóm domain, hỗ trợ multi-tenant qua `tenant_id`. API cung cấp 30 router với response wrapper thống nhất. Giao diện tách biệt hoàn toàn Boutique Mode và Command Mode qua Route Groups.

Chương tiếp theo (Chương 4) trình bày chi tiết công nghệ và lý do lựa chọn cho từng tầng kiến trúc.
