# Chương 01 — Tổng quan dự án

## 1.1. Thông tin chung

| Mục | Giá trị |
|---|---|
| **Tên codename** | `tailor_project` (slug repo: `datn-tailor-web`) |
| **Tên thương mại** | Nhà May Thanh Lộc |
| **Nhóm thực hiện** | Nhóm 1 — Đồ án Công nghệ phần mềm |
| **Loại sản phẩm** | Multi-tenant SaaS Platform cho ngành may đo áo dài |
| **Phiên bản** | 0.1.0 (MVP) |
| **Ngôn ngữ chính** | 100% giao diện & thuật ngữ Tiếng Việt chuyên ngành may |

## 1.2. Bối cảnh & vấn đề

Ngành may áo dài tại Việt Nam đang đối mặt với 3 vấn đề cốt lõi (trích Product Brief 2026-02-17):

1. **"Sự phản bội của tính từ"** — đứt gãy giữa cảm xúc khách hàng (*"thanh tao, mạnh mẽ, kín đáo"*) và thông số kỹ thuật của thợ may (cm, độ rộng, độ rủ).
2. **"Bẫy số trung bình"** — đồ may sẵn không đáp ứng được sự đa dạng hình thể thực tế.
3. **"Chiếc hộp đen"** của may đo truyền thống — phụ thuộc vào năng lực cảm thụ chủ quan của nghệ nhân, tri thức không được số hoá → mai một khi nghệ nhân nghỉ hưu.

Cộng thêm các thách thức quản lý vận hành:
- Owner phải quản lý đồng thời bán đồ, cho thuê, đặt may, lịch hẹn, phân công thợ, kho áo dài, voucher, CRM Leads — không có công cụ thống nhất.
- Thợ may cần xem rập kỹ thuật chuẩn, không có công cụ chuyển đổi số đo → bản vẽ rập tự động.
- Khách hàng muốn đặt may online nhưng không có cách xác nhận số đo trước thanh toán.

## 1.3. Mục tiêu sản phẩm

### 1.3.1 Mục tiêu nghiệp vụ (theo PRD)

- **Doanh thu**: Số hoá toàn bộ chuỗi giá trị từ tư vấn → may đo → bán/cho thuê → tái mua.
- **Tri thức**: Số hoá ≥ 50 Smart Rules cốt lõi từ nghệ nhân vào hệ thống.
- **Vận hành**: Giảm 70% thời gian "dò sóng" tư vấn (60 phút → 15 phút) nhờ Blueprint sẵn.
- **Chất lượng**: Tỷ lệ "First-Fit" (vừa vặn ngay lần đầu) > 90%; Zero-Correction < 5%.

### 1.3.2 Mục tiêu kỹ thuật

| Chỉ số | Mục tiêu |
|---|---|
| Inference Latency (LangGraph) | < 15s/cycle |
| Adaptive Canvas response time | < 200ms |
| API endpoint thường (non-AI) | < 300ms p95 |
| Page load (e-commerce) | < 2s p95 |
| Constraint Violation Rate | **0%** (tuyệt đối không xuất bản vẽ vi phạm Golden Rules) |
| Geometric error vs lý thuyết | ≤ 1mm |
| Pattern SVG vs in vật lý | ±0.5mm |
| Concurrent users | ≥ 100 e-commerce users đồng thời |
| Uptime giờ vận hành | 99.9% |
| Payment success rate | > 99.5% |

## 1.4. Đối tượng người dùng

### 1.4.1 Người dùng chính (3 vai trò)

1. **Customer (Khách hàng)** — chế độ giao diện Boutique Mode
   - Phân khúc 1: *Physical Outliers* — khách có hình thể không thuộc size chuẩn S-M-L
   - Phân khúc 2: *Aesthetic Perfectionists* — Gen Z/Millennials làm sáng tạo, muốn "lập trình" phong cách
2. **Owner (Chủ tiệm)** — chế độ giao diện Command Mode
   - Sử dụng dashboard quản lý: doanh thu, đơn, kho, lịch hẹn, leads, vouchers, campaigns, phân công thợ.
3. **Tailor (Thợ may)** — chế độ giao diện Command Mode (giới hạn quyền)
   - Nhận task, xem rập kỹ thuật (PatternPreview), cập nhật trạng thái, theo dõi thu nhập.

### 1.4.2 Người dùng phụ

- **Traditional Tailors** đóng vai trò "Người bảo tồn tri thức" — góp ý vào Smart Rules.
- **Atelier Academy** — hệ thống học hỏi từ Override của thợ may để cải thiện AI trong tương lai.

## 1.5. Phạm vi MVP

### 1.5.1 Đã đưa vào MVP (11 epic, FR phủ ~80%)

- **Epic 1**: Foundation, Authentication (multi-method), multi-tenant infrastructure.
- **Epic 2**: Product catalog + Digital Showroom + inventory CRUD.
- **Epic 3**: Cart, Checkout, Payment gateway.
- **Epic 4**: Appointment Booking với calendar morning/afternoon slots.
- **Epic 5**: Order management, rental tracking, invoice PDF.
- **Epic 6**: Measurement & Customer Profiles (versioned).
- **Epic 7**: Operations Dashboard (KPI, revenue chart, production alerts).
- **Epic 8**: Tailor Dashboard (tasks, income breakdown).
- **Epic 9**: CRM (Leads Hot/Warm/Cold, Vouchers, Campaigns Zalo/FB/Email).
- **Epic 10**: Unified Order Workflow (Buy/Rent/Bespoke với 3 luồng riêng).
- **Epic 11**: Technical Pattern Generation (đang triển khai 11.1 → 11.6).

### 1.5.2 Hoãn lại (post-MVP)

- **Epic 12 — AI Style & Semantic Interpretation** (FR1-FR4): chọn Style Pillar, Sliders → Ease Delta.
- **Epic 13 — AI Geometric Transformation Engine** (FR5-FR8): áp Ease Delta lên Golden Base Pattern, sinh Master Geometry.
- **Epic 14 — AI Guardrails & Tailor Collaboration** (FR9-FR16): Hard/Soft constraints, Override, Sanity Check Dashboard.

> **Lý do hoãn:** AI Bespoke Engine cần dataset huấn luyện và Smart Rules từ nghệ nhân chưa đủ chín; ưu tiên hoàn thành lõi e-commerce + Pattern Engine deterministic trước.

## 1.6. Hành trình người dùng tiêu biểu

### Hành trình "Linh — Nhà thiết kế đi tìm sự tĩnh lặng" (Bespoke)

1. **Discovery**: Linh (26 tuổi, UI/UX Designer, lưng dài & vai gầy) cần áo dài cách tân.
2. **Đặt lịch tư vấn**: Vào Booking Calendar → chọn slot Afternoon → submit yêu cầu.
3. **Đo & lưu hồ sơ**: Tại tiệm, thợ may đo 10 thông số cơ thể, lưu vào `customer_profiles` + `measurements`.
4. **Bespoke Order**: Online Linh chọn "Bespoke", hệ thống Measurement Gate xác nhận đã có số đo, thanh toán deposit.
5. **Owner phê duyệt** → tự động tạo `tailor_tasks` + sinh pattern session từ 10 số đo của Linh.
6. **Thợ may thực thi**: Xem PatternPreview (3 mảnh: thân trước, thân sau, tay), in SVG 1:1 hoặc xuất G-code cho máy laser.
7. **Hoàn tất**: Sản phẩm `ready_for_pickup` → Linh thanh toán remaining → nhận đồ → lưu Version Control hình thể.

### Hành trình "Khách hàng thuê áo dài" (Rent)

1. Browse Digital Showroom → lọc theo Season/Color/Material/Size.
2. Chọn Rent → nhập calendar pickup_date / return_date.
3. Checkout với deposit + CCCD (hoặc cash security).
4. Owner approve → kho chuẩn bị (Cleaning → Altering → Ready) → khách nhận.
5. Sau ngày trả: `rental_returns` ghi nhận condition (Good/Damaged/Lost) → hoàn deposit (hoặc trừ).
6. Hệ thống nhắc tự động 3 ngày & 1 ngày trước hạn trả (scheduler service).

## 1.7. Roadmap & hướng phát triển

| Giai đoạn | Nội dung |
|---|---|
| **Phase 1 (Hiện tại)** | Hoàn thiện Epic 11 Pattern Engine (Story 11.4 → 11.6) |
| **Phase 2** | Mở rộng Pattern Engine cho Open Garment System (không chỉ áo dài — `garment_type` đã chuẩn bị schema) |
| **Phase 3** | Triển khai Epic 12-14 (AI Bespoke): chọn provider LLM, train Smart Rules từ 50+ nghệ nhân |
| **Phase 4** | Tích hợp Zalo/Facebook Messaging API hoàn chỉnh cho campaign |
| **Phase 5** | Mobile app native (React Native) cho Customer + Tailor |
| **Phase 6** | Multi-region deployment, scale tenants > 100 tiệm |

## 1.8. Tài liệu nguồn tham khảo

- `_bmad-output/planning-artifacts/product-brief-tailor_project-2026-02-17.md`
- `_bmad-output/planning-artifacts/prd/index.md` (+ 8 chương con)
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/project-context.md`
- `README.md` (cập nhật 2026-03-22)
