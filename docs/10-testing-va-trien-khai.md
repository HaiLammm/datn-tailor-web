# Chương 10 — Kiểm thử & Triển khai

## 10.1. Chiến lược kiểm thử

| Loại | Tool | Phạm vi | Vị trí |
|---|---|---|---|
| **Backend Unit + Integration** | pytest + pytest-asyncio + httpx + aiosqlite | Service logic, API endpoints, DB integration với in-memory SQLite | `backend/tests/` |
| **Frontend Unit + Component** | Jest + Testing Library + jest-environment-jsdom | Components, hooks, store | `frontend/src/__tests__/` + `*.test.tsx` cạnh component |
| **E2E** | (Khuyến nghị Playwright cho production) | Critical user journeys: register, checkout, design session | Chưa setup |
| **Load test** | (Khuyến nghị k6 / Locust) | NFR2 (5 concurrent inference), NFR5 (100 concurrent users) | Chưa setup |
| **Accessibility test** | (Khuyến nghị axe-core / Lighthouse CI) | NFR20 WCAG 2.1 Level A | Chưa setup |

## 10.2. Backend Test Suite (`backend/tests/`)

### 10.2.1 Test files đã có (~50+)

Phân nhóm theo Story:

**Epic 1 (Auth):**
- `test_auth_api.py`, `test_auth_service.py`, `test_auth_recovery.py`

**Epic 2-3 (Showroom + Cart + Checkout):**
- `test_garments_api.py`, `test_garment_service.py`
- `test_fabrics_api.py`

**Epic 4-5 (Booking + Order Management):**
- `test_appointment_api.py`, `test_appointment_service.py`
- `test_customer_appointments_api.py`
- `test_owner_appointments_api.py` (nếu có)

**Epic 6 (Customer Profile):**
- `test_customers_api.py`, `test_customer_service.py`
- `test_customer_profile_api.py`, `test_customer_profile_measurements_api.py`

**Epic 9 (CRM + Marketing):**
- `test_voucher_crud_api.py`, `test_customer_vouchers_api.py`
- `test_campaign_service.py`
- (lead tests trong files khác)

**Epic 10 (Unified Order Workflow):**
- `test_10_1_db_migration_service_type.py` — DB migration
- `test_10_2_measurement_gate.py` — `/orders/check-measurement`
- `test_10_3_checkout_service_type.py` — checkout 3 luồng
- `test_10_4_owner_approve.py` — `/orders/{id}/approve`
- `test_10_5_sub_steps.py` — preparation sub-steps
- `test_10_6_remaining_payment.py` — `/orders/{id}/pay-remaining`
- `test_10_7_rental_return.py` — `/orders/{id}/refund-security`

**Epic 11 (Pattern Engine):**
- `test_11_1_pattern_models.py` — Pydantic + SQLAlchemy
- `test_11_2_pattern_api.py` — endpoints create/generate/get
- `test_11_2_pattern_engine.py` — formulas + engine output
- `test_11_3_export_api.py` — export single + batch
- `test_11_3_gcode_export.py` — G-code conversion correctness

**AI Bespoke (Epic 12-14, partial):**
- `test_emotional_compiler.py`
- `test_geometry.py`, `test_geometry_api.py`
- `test_designs_api.py`
- `test_constraint_registry.py`, `test_hard_constraints.py`
- `test_guardrails_api.py`
- `test_inference_api.py`
- `test_export_api.py`, `test_export_service.py`

**Notifications:**
- `test_customer_notifications_api.py`

### 10.2.2 Chạy tests

```bash
cd backend
source venv/bin/activate

# Toàn bộ
pytest

# Chỉ Pattern Engine
pytest tests/test_11_*.py -v

# Coverage
pytest --cov=src --cov-report=html
xdg-open htmlcov/index.html

# Test 1 file cụ thể
pytest tests/test_voucher_crud_api.py -v

# Test với pattern matching
pytest -k "test_create_pattern_session" -v
```

### 10.2.3 Test fixtures pattern

```python
# Sử dụng aiosqlite cho test, không cần Postgres thật
@pytest_asyncio.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    SessionLocal = async_sessionmaker(engine, class_=AsyncSession)
    async with SessionLocal() as session:
        yield session

@pytest_asyncio.fixture
async def owner_user(db_session):
    user = UserDB(email="owner@test.com", role="Owner", tenant_id=DEFAULT_TENANT_ID, ...)
    db_session.add(user)
    await db_session.commit()
    return user
```

## 10.3. Frontend Test Suite

### 10.3.1 Cấu hình

- `frontend/jest.config.js` — preset Next.js
- `frontend/jest.setup.js` — extends `@testing-library/jest-dom` matchers
- TypeScript transform qua `ts-jest` + `@babel/preset-*`

### 10.3.2 Chạy

```bash
cd frontend
npm test               # Run once
npm run test:watch     # Watch mode
npm test -- --coverage # With coverage
```

### 10.3.3 Pattern test

```typescript
// MeasurementForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MeasurementForm } from './MeasurementForm';

test('hiển thị error khi vong_nach < min_value', async () => {
  render(<MeasurementForm onSubmit={jest.fn()} />);
  const input = screen.getByLabelText('Vòng nách');
  fireEvent.change(input, { target: { value: '1' } });
  fireEvent.blur(input);
  expect(await screen.findByText(/Vòng nách phải từ/i)).toBeInTheDocument();
});
```

## 10.4. Lint & Type checking

### 10.4.1 Backend

```bash
# (Chưa cấu hình ruff/mypy trong repo, khuyến nghị thêm)
pip install ruff mypy
ruff check src/
mypy src/
```

### 10.4.2 Frontend

```bash
cd frontend
npm run lint              # ESLint
npx tsc --noEmit          # TypeScript check không build
```

## 10.5. Triển khai (Deployment)

### 10.5.1 Mô hình target

```
                    ┌─────────────────────┐
                    │  Vercel             │
   Browser  ───────▶│  (Next.js 16        │
                    │   SSR + Edge cache) │
                    └──────────┬──────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │  Docker container   │
                    │  FastAPI + Uvicorn  │
                    │  (cloud VPS / ECS)  │
                    └──────────┬──────────┘
                               │ asyncpg + TLS
                               ▼
                    ┌─────────────────────┐
                    │  Postgres 17        │
                    │  + pgvector         │
                    │  (Neon / RDS)       │
                    └─────────────────────┘
```

### 10.5.2 Frontend (Next.js → Vercel)

```bash
# Cách 1: Vercel CLI
npm i -g vercel
cd frontend
vercel              # preview
vercel --prod       # production

# Cách 2: GitHub Integration
# Push lên main → Vercel auto-deploy
```

Env vars cần thiết trên Vercel:
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (vd: https://app.thanhloc.com)
- `BACKEND_URL` (vd: https://api.thanhloc.com)

### 10.5.3 Backend (FastAPI → Docker)

`Dockerfile` mẫu (chưa có trong repo, gợi ý):

```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY src/ ./src/
COPY migrations/ ./migrations/
EXPOSE 8000
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

```bash
docker build -t tailor-backend .
docker run -p 8000:8000 \
  -e DATABASE_URL=postgresql://... \
  -e JWT_SECRET_KEY=... \
  -e CORS_ORIGINS=https://app.thanhloc.com \
  tailor-backend
```

### 10.5.4 Database migrations

```bash
# Manual (dev)
cd backend
for f in migrations/*.sql; do
  psql -U postgres -d tailor_db -f "$f"
done

# Production: tích hợp vào CI/CD pipeline
# Khuyến nghị: chuyển sang Alembic để tracking migration version
```

### 10.5.5 Health checks

- Frontend: `https://app.thanhloc.com/` (Next.js default)
- Backend: `GET /health` → `{"status":"healthy"}`
- DB: `SELECT 1` từ container backend

## 10.6. CI/CD pipeline (gợi ý)

`.github/workflows/ci.yml` (chưa có, gợi ý):

```yaml
name: CI

on: [push, pull_request]

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:17
        env: { POSTGRES_PASSWORD: postgres }
        ports: ['5432:5432']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with: { python-version: '3.13' }
      - run: pip install -r backend/requirements.txt
      - run: cd backend && pytest --cov=src

  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd frontend && npm ci
      - run: cd frontend && npm run lint
      - run: cd frontend && npx tsc --noEmit
      - run: cd frontend && npm test -- --ci
      - run: cd frontend && npm run build
```

## 10.7. Monitoring & Observability

| Lớp | Tool | Chỉ số |
|---|---|---|
| **Frontend** | Vercel Analytics + Web Vitals | LCP, FID, CLS, page load p95 (NFR3 < 2s) |
| **Backend API** | Prometheus + Grafana | Latency p95 (NFR4 < 300ms), error rate, throughput |
| **AI/LangGraph** | Langfuse | Inference latency (NFR1 < 15s), trace step-by-step |
| **DB** | pg_stat_statements + Datadog | Slow query, connection pool |
| **Uptime** | UptimeRobot / Pingdom | NFR7 99.9% giờ vận hành |
| **Error tracking** | Sentry | Frontend + Backend exceptions |
| **Logs** | ELK / CloudWatch | Audit (NFR16 100% AI decisions logged) |

## 10.8. Backup & Disaster Recovery

| Đối tượng | Strategy |
|---|---|
| **PostgreSQL** | Daily full backup + WAL streaming → Point-in-time recovery (PITR) |
| **uploads/** | S3 với versioning + lifecycle policy |
| **Secrets** | Vault / AWS Secrets Manager với rotation 90 ngày |
| **Code** | Git (GitHub) — branch protection trên main |
| **Recovery target** | RPO < 1h, RTO < 4h cho production |

## 10.9. Performance benchmarks (target)

| Endpoint | Target latency p95 | Test method |
|---|---|---|
| `GET /api/v1/garments` (filter showroom) | < 500ms (FR30) | k6 100 RPS |
| `POST /api/v1/orders/check-measurement` | < 100ms | unit + integration |
| `POST /api/v1/patterns/sessions/{id}/generate` | < 200ms | unit (engine target < 50ms + DB write) |
| `GET /api/v1/patterns/sessions/{id}` | < 100ms | integration |
| `POST /api/v1/inference/...` (Epic 12+) | < 15s (NFR1) | LangGraph staging load test |
| Page load (showroom) | < 2s p95 (NFR3) | Lighthouse + RUM |
| Slider drag morphing | < 200ms (NFR17) | Browser DevTools profiling |

## 10.10. Pre-launch checklist

### Functional
- [ ] All Epic 1-11 acceptance tests pass
- [ ] Sample data seed (vouchers, garments, leads) cho demo

### Security
- [ ] Penetration test
- [ ] OWASP Top 10 review
- [ ] Secrets rotation policy
- [ ] HTTPS/HSTS configured
- [ ] CSP headers set

### Performance
- [ ] Load test 100 concurrent users (NFR5)
- [ ] DB indexes optimized cho query slow > 100ms
- [ ] Image optimization (Next.js Image component)
- [ ] Bundle size analysis (`next build` output)

### Operations
- [ ] CI/CD pipeline green
- [ ] Monitoring alerts configured
- [ ] Backup tested (restore drill)
- [ ] On-call rotation defined
- [ ] Runbook cho incident common (DB connection lost, payment webhook fail)

### Compliance
- [ ] Privacy policy + ToS + Cookie policy
- [ ] PCI DSS attestation từ payment provider
- [ ] WCAG 2.1 Level A audit (NFR20)
- [ ] GDPR/Vietnamese Personal Data Protection Law compliance

## 10.11. Tài liệu vận hành tham khảo

- `_bmad-output/implementation-artifacts/sprint-status.yaml` — Trạng thái sprint hiện tại
- `_bmad-output/implementation-artifacts/11-3-svg-gcode-export-api.md` — Spec implementation Story 11.3
- `_bmad-output/implementation-artifacts/11-4-profile-driven-measurement-form-ui.md` — Spec Story 11.4
- `_bmad-output/code-review/` — Code review reports (BMAD)
- `Makefile` (root + backend) — Lệnh tắt cho dev
