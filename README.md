# datn-tailor-web

Hệ thống quản lý tiệm may đo — Multi-tenant SaaS Platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, Tailwind CSS, TanStack Query |
| Backend | FastAPI, Python 3.13, SQLAlchemy (async), Pydantic V2 |
| Database | PostgreSQL |
| Auth | NextAuth.js + JWT |

## Cấu trúc dự án

```
tailor_project/
├── backend/
│   ├── src/
│   │   ├── api/v1/          # FastAPI route handlers
│   │   ├── core/            # Config, database, auth
│   │   ├── models/          # Pydantic schemas + SQLAlchemy ORM models
│   │   └── services/        # Business logic layer
│   ├── migrations/          # SQL migration files (001–020)
│   └── tests/               # pytest test suites
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router (pages, actions, API)
│   │   ├── components/      # React components (client/ + server/)
│   │   ├── lib/             # Utilities (api.ts, auth helpers)
│   │   └── types/           # TypeScript type definitions
│   └── public/              # Static assets
├── scripts/                 # Dev tools (ERD generator, etc.)
└── _bmad-output/            # Generated artifacts (ERD, sprint docs)
```

## Khởi chạy

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Chạy migrations
for f in migrations/*.sql; do psql -U postgres -d tailor_db -f "$f"; done

# Start server
uvicorn src.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev    # http://localhost:3000
```

### Environment Variables

Tạo file `.env` ở thư mục `backend/`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tailor_db
JWT_SECRET_KEY=your-secret-key
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

## Database Schema (ERD)

Hệ thống gồm **20 tables**, **39 foreign keys**, chia theo domain:

### Auth & Users
| Table | Mô tả |
|-------|--------|
| `users` | Tài khoản hệ thống (Owner, Tailor, Customer) |
| `staff_whitelist` | Whitelist email nhân viên được phép đăng ký |
| `otp_codes` | Mã OTP xác thực (đăng ký, khôi phục mật khẩu) |

### Tenants (Multi-tenant)
| Table | Mô tả |
|-------|--------|
| `tenants` | Mỗi tenant = 1 tiệm may, cách ly dữ liệu hoàn toàn |

### Customers & Profiles
| Table | Mô tả |
|-------|--------|
| `customer_profiles` | Thông tin khách hàng (per-tenant) |
| `measurements` | Số đo cơ thể khách hàng (nhiều bộ số đo / khách) |

### Designs
| Table | Mô tả |
|-------|--------|
| `designs` | Thiết kế áo dài (Master Geometry JSON) |
| `design_overrides` | Điều chỉnh thủ công từ thợ may (experience-based) |

### Garments (Sản phẩm)
| Table | Mô tả |
|-------|--------|
| `garments` | Kho áo dài (bán + cho thuê), tracking trạng thái |

### Orders & Payments
| Table | Mô tả |
|-------|--------|
| `orders` | Đơn hàng (mua + thuê) |
| `order_items` | Chi tiết từng sản phẩm trong đơn |
| `payment_transactions` | Giao dịch thanh toán (VNPay, MoMo webhook) |

### Appointments
| Table | Mô tả |
|-------|--------|
| `appointments` | Lịch hẹn tư vấn (morning/afternoon slots) |

### Rentals
| Table | Mô tả |
|-------|--------|
| `rental_returns` | Theo dõi trả đồ thuê (condition, deposit deduction) |

### Production
| Table | Mô tả |
|-------|--------|
| `tailor_tasks` | Phân công công việc cho thợ may (assigned → completed) |

### Vouchers
| Table | Mô tả |
|-------|--------|
| `vouchers` | Mã giảm giá (percent / fixed VND) |
| `user_vouchers` | Gán voucher cho từng khách hàng |

### CRM
| Table | Mô tả |
|-------|--------|
| `leads` | Khách hàng tiềm năng (hot / warm / cold) |
| `lead_conversions` | Lịch sử chuyển đổi lead → customer |

### Notifications
| Table | Mô tả |
|-------|--------|
| `notifications` | Thông báo in-app cho khách hàng |

### ERD Diagram (Mermaid)

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
        varchar email
        varchar role
        uuid tenant_id FK
        bool is_active
    }
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
    garments {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar category
        decimal rental_price
        decimal sale_price
        varchar status
    }
    orders {
        uuid id PK
        uuid tenant_id FK
        uuid customer_id FK
        varchar customer_name
        varchar status
        varchar payment_status
        decimal total_amount
    }
    order_items {
        uuid id PK
        uuid order_id FK
        uuid garment_id FK
        varchar transaction_type
        decimal unit_price
        decimal total_price
    }
    payment_transactions {
        uuid id PK
        uuid order_id FK
        varchar provider
        decimal amount
        varchar status
    }
    appointments {
        uuid id PK
        uuid tenant_id FK
        varchar customer_name
        date appointment_date
        varchar slot
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
    tailor_tasks {
        uuid id PK
        uuid tenant_id FK
        uuid order_id FK
        uuid assigned_to FK
        varchar status
        decimal piece_rate
    }
    rental_returns {
        uuid id PK
        uuid tenant_id FK
        uuid order_item_id FK
        uuid garment_id FK
        varchar return_condition
        decimal deposit_deduction
    }
    vouchers {
        uuid id PK
        uuid tenant_id FK
        varchar code
        varchar type
        decimal value
        date expiry_date
        bool is_active
    }
    user_vouchers {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        uuid voucher_id FK
        bool is_used
    }
    leads {
        uuid id PK
        uuid tenant_id FK
        varchar name
        varchar classification
        varchar source
    }
    lead_conversions {
        uuid id PK
        uuid tenant_id FK
        uuid customer_profile_id FK
        uuid converted_by FK
        varchar lead_name
    }
    notifications {
        uuid id PK
        uuid tenant_id FK
        uuid user_id FK
        varchar type
        varchar title
        bool is_read
    }
    otp_codes {
        int id PK
        varchar email
        varchar code
        varchar purpose
        bool is_used
    }
    staff_whitelist {
        uuid id PK
        varchar email
        varchar role
    }

    tenants ||--o{ users : "tenant_id"
    tenants ||--o{ customer_profiles : "tenant_id"
    tenants ||--o{ garments : "tenant_id"
    tenants ||--o{ orders : "tenant_id"
    tenants ||--o{ appointments : "tenant_id"
    tenants ||--o{ designs : "tenant_id"
    tenants ||--o{ tailor_tasks : "tenant_id"
    tenants ||--o{ vouchers : "tenant_id"
    tenants ||--o{ leads : "tenant_id"
    tenants ||--o{ notifications : "tenant_id"
    tenants ||--o{ measurements : "tenant_id"
    tenants ||--o{ rental_returns : "tenant_id"
    tenants ||--o{ design_overrides : "tenant_id"
    tenants ||--o{ lead_conversions : "tenant_id"
    tenants ||--o{ user_vouchers : "tenant_id"

    users ||--o{ customer_profiles : "user_id"
    users ||--o{ orders : "customer_id"
    users ||--o{ designs : "user_id"
    users ||--o{ notifications : "user_id"
    users ||--o{ user_vouchers : "user_id"
    users ||--o{ design_overrides : "tailor_id"
    users ||--o{ measurements : "measured_by"
    users ||--o{ tailor_tasks : "assigned_to"
    users ||--o{ rental_returns : "processed_by"
    users ||--o{ lead_conversions : "converted_by"

    customer_profiles ||--o{ measurements : "customer_profile_id"
    customer_profiles ||--o{ garments : "renter_id"
    customer_profiles ||--o{ lead_conversions : "customer_profile_id"

    orders ||--o{ order_items : "order_id"
    orders ||--o{ payment_transactions : "order_id"
    orders ||--o{ tailor_tasks : "order_id"

    order_items ||--o{ rental_returns : "order_item_id"
    order_items ||--o{ tailor_tasks : "order_item_id"

    garments ||--o{ order_items : "garment_id"
    garments ||--o{ rental_returns : "garment_id"

    designs ||--o{ design_overrides : "design_id"
    designs ||--o{ tailor_tasks : "design_id"

    vouchers ||--o{ user_vouchers : "voucher_id"
```

### Tạo ERD (script)

```bash
# Tạo tất cả format (Mermaid, DBML, Graphviz DOT, HTML)
python3 scripts/generate_erd.py -f all

# Output:
#   _bmad-output/erd.mmd       → paste vào mermaid.live hoặc GitHub Markdown
#   _bmad-output/erd.dbml      → paste vào dbdiagram.io
#   _bmad-output/erd.dot       → dot -Tpng erd.dot -o erd.png
#   _bmad-output/schema.html   → xdg-open schema.html
```

## API Endpoints

### Public
- `POST /api/v1/auth/login` — Đăng nhập
- `POST /api/v1/auth/register` — Đăng ký
- `POST /api/v1/auth/otp/send` — Gửi OTP
- `GET /api/v1/garments` — Danh sách sản phẩm (Digital Showroom)

### Owner (Quản trị)
- `GET/POST /api/v1/products` — CRUD sản phẩm
- `GET/POST /api/v1/orders` — Quản lý đơn hàng
- `GET/POST /api/v1/vouchers` — CRUD voucher
- `GET/POST /api/v1/leads` — CRM Leads Board
- `GET /api/v1/rentals` — Theo dõi thuê/mượn
- `GET /api/v1/appointments` — Quản lý lịch hẹn
- `GET /api/v1/staff` — Quản lý nhân viên
- `GET /api/v1/dashboard/stats` — KPI Dashboard

### Tailor (Thợ may)
- `GET /api/v1/tailor/tasks` — Danh sách công việc
- `PATCH /api/v1/tailor/tasks/:id/status` — Cập nhật trạng thái

### Customer (Khách hàng)
- `GET /api/v1/customers/me/orders` — Lịch sử đơn hàng
- `GET /api/v1/customers/me/vouchers` — Kho voucher
- `GET /api/v1/customers/me/appointments` — Lịch hẹn
- `GET /api/v1/customers/me/notifications` — Thông báo

## Testing

```bash
cd backend
pytest                           # Chạy tất cả tests
pytest tests/test_voucher_crud_api.py -v  # Chạy test cụ thể
```
