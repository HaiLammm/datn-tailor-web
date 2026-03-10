---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: [
  "_bmad-output/planning-artifacts/prd/index.md",
  "_bmad-output/planning-artifacts/prd/functional-requirements.md",
  "_bmad-output/planning-artifacts/prd/non-functional-requirements-nfrs.md",
  "_bmad-output/planning-artifacts/prd/architecture.md", 
  "_bmad-output/planning-artifacts/prd/ux-design-specification.md"
]
---

# tailor_project - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for tailor_project, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

FR1: Người dùng có thể chọn các Trụ cột Phong cách (Style Pillars) định sẵn.
FR2: Người dùng có thể điều chỉnh cường độ phong cách qua Sliders.
FR3: Hệ thống có thể dịch thuật lựa chọn phong cách thành các bộ chỉ số Ease Delta.
FR4: Hệ thống có thể gợi ý vải phù hợp dựa trên phong cách và cấu trúc trang phục.
FR5: Hệ thống có thể áp dụng Ease Delta vào mẫu rập chuẩn (Golden Base Pattern).
FR6: Hệ thống có thể tính toán tọa độ (x,y) mới dựa trên số đo thực tế của khách hàng.
FR7: Hệ thống có thể tạo Master Geometry JSON chứa thông số hình học sau biến đổi.
FR8: Hệ thống có thể xuất bản vẽ Blueprint (SVG) để hiển thị trực quan.
FR9: Hệ thống tự động kiểm tra các ràng buộc vật lý (ví dụ: vòng nách vs bắp tay).
FR10: Hệ thống ngăn chặn xuất Blueprint nếu vi phạm các quy tắc hình học Golden Rules.
FR11: Hệ thống đưa ra cảnh báo kỹ thuật khi thông số nằm sát vùng nguy hiểm.
FR12: Thợ may có thể ghi đè (Override) thủ công các đề xuất của AI.
FR13: Người dùng có thể xem lớp phủ Overlay so sánh rập chuẩn và rập tùy chỉnh.
FR14: Thợ may có thể sử dụng Sanity Check Dashboard để đối chiếu số đo khách và đề xuất AI.
FR15: Hệ thống xuất thông số gia giảm (+/- cm) chi tiết cho từng vị trí cắt rập.
FR16: Hệ thống quản lý và bảo vệ bí kíp Golden Rules nội bộ.
FR17: Thợ may có thể nhập và lưu trữ bộ số đo chi tiết cho từng khách hàng.
FR18: Hệ thống liên kết số đo khách hàng với các phiên bản rập tùy chỉnh tương ứng.
FR19: Hệ thống Local-First cho một tiệm may di sản duy nhất (MVP).
FR20: Tenant Model (SaaS Core): Kiến trúc tách biệt dữ liệu giữa các tiệm (Isolation).
FR21: Rule Editor UI: Giao diện cho nghệ nhân tự điều chỉnh các Smart Rules (Phase 2).
FR22: Hệ thống hiển thị danh mục thời trang cho thuê, tích hợp hình ảnh, thông số.
FR23: Theo dõi Availability (Sẵn sàng/Đang thuê/Bảo trì).
FR24: Lên lịch Return Timeline báo ngày trả.
FR25: Owner sử dụng thao tác 2 chạm trên thiết bị quản lý Inventory/Trạng thái.
FR26: Đăng nhập & Yêu cầu mật khẩu mới.
FR27: Khôi phục mật khẩu.
FR28: Gửi form reset mật khẩu.
FR29: Danh mục sản phẩm (Listings) cho Sale/Rental.
FR30: Filter (Bình duyệt Season, Material...).
FR31: Product Details (Ảnh HD, sizes...).
FR32: Tùy chọn Mua hoặc Thuê.
FR33: CRUD Áo dài Items bởi Owner.
FR34: Theo dõi Inventory/Availability.
FR35: Thiết lập attributes theo Season/Category.
FR36: Lịch Rental Timeline.
FR37: Return notification email cho khách hàng.
FR38: Thêm/Sửa/Xoá items trên Giỏ Hàng.
FR39: State quản lý giỏ hàng trên App/Browser.
FR40: Cung cấp Shipping Information.
FR41: System Checkout.
FR42: Visual Calendar chọn Slot.
FR43: Booking info details (Note).
FR44: Send Booking Confirmation (Email).
FR45: Order List Status filtering (Host).
FR46: Customer & Host xem nội dung đơn hàng (Detail).
FR47: Operations Cập nhật Status Pipeline (Host).
FR48: Active Rental Monitoring (Host).
FR49: Logging tình trạng hư hỏng/Returns (Host).
FR50: Trigger overdue return logic.
FR51: Integrations Gateway Payments (Momo/Stripe etc).
FR52: Payment Status checking.
FR53: Order History per Customer Profile.
FR54: Generate PDF order Invoice.
FR55: Revenue Overview charts.
FR56: Revenue visual indicators.
FR57: E-com Order & Buy/Rent Metrics.
FR58: Warning notification "Production in 7 days".
FR59: Appointment schedule real-time.
FR60: Appointments filtering.
FR61: Assignments to Tailors.
FR62: Production Task list.
FR63: Garment Costing calculations.
FR64: Monthly Income graphs per Garment/Tailor.
FR65: Tailor status update mechanics.
FR66: Customer Measurement/Order Profile.
FR67: Profile Search engine.
FR68: Historical measure differences.
FR69: Leads board display.
FR70: Form to add Manual Leads.
FR71: Level 1-2-3 (Hot, Warm, Cold) label logic.
FR72: Conversion from Lead -> Customer account.
FR73: CRUD for Vouchers.
FR74: Types (% - Fixed value).
FR75: Setup limitations on Vouchers.
FR76: Voucher analytics (count/rate).
FR77: Push Vouchers via notifications.
FR78: Bulk Outreach Campaigns.
FR79: Social Message integrations (Facebook/Zalo APIs).
FR80: Templates for Messaging.
FR81: Campaign ROI evaluation (Logs).

### NonFunctional Requirements

NFR1: Thời gian phản hồi chu trình suy luận LangGraph trung bình Lavg < 15 giây.
NFR2: Hệ thống hỗ trợ xử lý ít nhất 5 yêu cầu suy luận đồng thời.
NFR3: Thời gian Load page < 2s cho 95% user E-commerce.
NFR4: Res API non-inferface < 300ms.
NFR5: Hỗ trợ ít nhất 100 concurrent E-com User.
NFR6: Sai số hình học tuyệt đối ΔG không vượt quá 1mm so với tính toán lý thuyết.
NFR7: Hệ thống sẵn sàng hoạt động 99.9% thời gian làm việc của tiệm.
NFR8: Master Geometry JSON được kiểm tra tính toàn vẹn (Checksum) trước khi lưu trữ.
NFR9: Thành công thanh toán Payment gateway > 99.5%.
NFR10: Đảm bảo tính ACID của giỏ hàng và Order Inventory tránh trùng slot (Race condition).
NFR11: Log Authentication chi tiết cho từng phiên làm việc tại tiệm.
NFR12: Tuân thủ RBAC bảo vệ The Vault.
NFR13: AES-256 Encoding on rest.
NFR14: Payment Processing PCI DSS Validation.
NFR15: Secure JWT Session in proxy-forwarded Cookies.
NFR16: Bắt buộc Log mọi AI Override for ML training Academy.
NFR17: UI Morph Respond < 200ms bằng kỹ thuật kéo thanh slider JS.
NFR18: Áp đặt 100% chuyên ngành tiếng Việt cho mảng may đo thủ công.
NFR19: Giao diện Mobile 100% Fully Responsive cho Ecom Flow.
NFR20: Cấu trúc WAGC 2.1 level A compliant.

### Additional Requirements

**From Architecture:**
- Starter Template: Dự án được thiết lập Next.js 16 App Router. Chừa Layer Proxy để làm Cookie Guarding. FastAPI/LangGraph Python 3.11 chạy ảo uvloop riêng biệt. Pydantic 2.
- Kiến trúc Payment sử dụng hệ thống Webhook + Async Background Job qua worker queue (Order xử lý ngay và thông báo gửi email tránh Timeout).
- State/Fetch sử dụng Zustand + TanStack Query làm song song (Optimistic + Authoritative Server cache clear).
- Tên Database 100% snake_case, Class Model PascalCase. Endpoints số nhiều (Plural).
- PostgreSQL 17 + `pgvector`.
- JSON body `snake_case`.

**From UX:**
- Visual: Áp dụng Heritage Palette 2.0 (Indigo Depth, Silk Ivory, Heritage Gold) và typography Dual-Tone (Cormorant Garamond, Inter, JetBrains Mono).
- Architecture Mode: Tích hợp chế độ đa chiều (Dual-Mode: Customer "Boutique" Spacious với 16-24px gap vs Command "Dashboard" Dense 8-12px padding) tùy Authentication Role.
- Các module Booking Calendar, ProductCard UI, KPICard Dashboard Owner, Leads Form CRM đều yêu cầu Framer Motion Animation.

### FR Coverage Map

FR1-FR4: Epic 7 - Style Interpretation & Sliders
FR5-FR8: Epic 8 - Geometry Transformation & Export
FR9-FR12: Epic 9 - Physical Guardrails & Manual Override
FR13: Epic 8 - Comparison Overlay
FR14-FR15: Epic 9 - Sanity Check & Blueprint Production
FR16: Epic 1 - The Vault Security
FR22-FR25: Epic 2 - Catalog & Rental Status
FR26-FR28: Epic 1 - Auth & Password Recovery
FR29-FR37: Epic 2 - Product Listings & Inventory CRUD
FR38-FR41: Epic 3 - Cart & Checkout flow
FR42-FR44: Epic 3 - Appointment Booking flow
FR45-FR54: Epic 4 - Order, Rental Returns & Payments processing
FR55-FR61: Epic 5 - Owner Operations Dashboard
FR62-FR65: Epic 5 - Tailor Task Dashboard
FR66-FR68: Epic 1 - Customer Profiles & Measurement History
FR69-FR81: Epic 6 - CRM, Leads, Vouchers & Campaigns


## Epic List

### Epic 1: Khởi tạo Nền tảng Xác thực & Quản lý Người dùng (Authentication & User Profiles)
Người dùng (Customer, Tailor, Owner) có thể đăng ký, đăng nhập an toàn, khôi phục mật khẩu và chủ tiệm có thể thiết lập bảo mật và quản lý hồ sơ số đo khách hàng.
**FRs covered:** FR16, FR26, FR27, FR28, FR66, FR67, FR68.

### Epic 2: Quản lý Sản phẩm & Kho hàng (Product & Inventory Management)
Khách hàng có thể duyệt danh mục sản phẩm đồ mua/đồ thuê với đầy đủ thông tin chi tiết. Ngược lại, chủ tiệm có thể tuỳ biến thêm, sửa, xoá sản phẩm cũng như cập nhật trạng thái kho 2 chạm nhanh chóng.
**FRs covered:** FR22, FR23, FR24, FR25, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37.

### Epic 3: Trải nghiệm Mua sắm & Đặt lịch (E-commerce & Booking Journey)
Khách hàng có thể thêm sản phẩm vào giỏ hàng, hoàn thành tiến trình checkout trơn tru và chọn slot hẹn đặt lịch tư vấn Bespoke qua Calendar giao diện thông minh.
**FRs covered:** FR38, FR39, FR40, FR41, FR42, FR43, FR44.

### Epic 4: Xử lý Đơn hàng & Thanh toán (Order & Payment Management)
Chủ tiệm theo dõi được tất cả đơn đặt hàng, quản lý đơn trả đồ thuê. Hệ thống xử lý thanh toán thông qua cổng giao dịch (Gateway integration) đảm bảo dữ liệu ACID.
**FRs covered:** FR45, FR46, FR47, FR48, FR49, FR50, FR51, FR52, FR53, FR54.

### Epic 5: Trung tâm Điều hành & Trạm làm việc Thợ may (Operations & Tailor Workforce)
Cung cấp cho Host/Founder Dashboard chỉ huy (Doanh thu, Phân việc) tối ưu theo layout Data Dense, đồng thời cấp Workstation list cho các F2 (Tailor) theo dõi nhiệm vụ gia công và thu nhập tháng của họ.
**FRs covered:** FR55, FR56, FR57, FR58, FR59, FR60, FR61, FR62, FR63, FR64, FR65.

### Epic 6: Quản trị Quan hệ & Tiếp thị (CRM & Marketing)
Owner có thể quản lý, phân cấp Lead, tổ chức tung Voucher/PromoCode để tạo Sale Convert. Quản lý việc gửi chiến dịch Broadcast tương tác trên Message Channel.
**FRs covered:** FR69, FR70, FR71, FR72, FR73, FR74, FR75, FR76, FR77, FR78, FR79, FR80, FR81.

### Epic 7: Trình biên dịch Cảm xúc & Phong cách (AI Core: Style & Semantic Engine)
Khách hàng có thể tương tác với thanh trượt phong cách để AI dịch thuật cảm xúc thành thông số kỹ thuật (Ease Deltas) và gợi ý vải (Fabric matcher).
**FRs covered:** FR1, FR2, FR3, FR4.

### Epic 8: Bộ máy Biến đổi Hình học (AI Core: Geometric Transformation)
Hệ thống biến đổi Mẫu rập chuẩn thành Mẫu riêng dựa trên Ease Delta và Output Master JSON SSOT. Kèm logic vẽ Overlay So sánh.
**FRs covered:** FR5, FR6, FR7, FR8, FR13.

### Epic 9: Kiểm soát Vật lý & Phê duyệt Kỹ thuật (AI Core: Guardrails & Tailor Review)
Rào chắn tính toán vật lý chặn tỷ lệ vô lý. Phát Alert, cho phép thợ may Override Output AI (để học bằng human round) trước khi Export CAD file SVG cuối cùng.
**FRs covered:** FR9, FR10, FR11, FR12, FR14, FR15.


<!-- Repeat for each epic in epics_list (N = 1, 2, 3...) -->

## Epic 1: Khởi tạo Nền tảng Xác thực & Quản lý Người dùng (Authentication & User Profiles)

Người dùng (Customer, Tailor, Owner) có thể đăng ký, đăng nhập an toàn, khôi phục mật khẩu và chủ tiệm có thể thiết lập bảo mật và quản lý hồ sơ số đo khách hàng.

<!-- Repeat for each story (M = 1, 2, 3...) within epic N -->

### Story 1.1: Thiết lập cấu trúc dự án từ Starter Template

As a Nhà phát triển,
I want khởi tạo cấu trúc thư mục Frontend và Backend từ Starter Template,
So that dự án có nền tảng kỹ thuật đúng như Kiến trúc đã định nghĩa.

**Acceptance Criteria:**

**Given** Máy chủ phát triển hoặc môi trường dev đã sẵn sàng
**When** Chạy lệnh khởi tạo Next.js 16 và Python FastAPI/LangGraph
**Then** Thư mục /frontend và /backend được tạo với đầy đủ file boilerplate
**And** File biến môi trường (.env) cho PostgreSQL đã được thiết lập

### Story 1.2: Thiết kế và khởi tạo Database Multi-tenant

As a Kiến trúc sư hệ thống,
I want thiết lập Schema cơ sở dữ liệu trên PostgreSQL có hỗ trợ Isolation (tenant_id),
So that hệ thống sẵn sàng phân tách dữ liệu cho 1 tiệm hoặc mở rộng nhiều tiệm sau này.

**Acceptance Criteria:**

**Given** Database PostgreSQL 17 và pgvector đã chạy
**When** Chạy script khởi tạo (migrations) cho các bảng users, profiles
**Then** Schema được tạo thành công với cột `tenant_id`
**And** Connection pool từ FastAPI kết nối chuẩn xác

### Story 1.3: Đăng nhập Hệ thống Đa phương thức (Unified Login)

As a Người dùng (Khách/Thợ/Chủ),
I want đăng nhập bằng tài khoản Google hoặc Email/Mật khẩu,
So that tôi có thể truy cập vào hệ thống an toàn theo đúng vai trò (Role).

**Acceptance Criteria:**

**Given** Người dùng ở trang SignIn
**When** Nhấn "Tiếp tục với Google" hoặc điền thông tin hợp lệ
**Then** Hệ thống Auth.js sinh JWT HttpOnly Cookie
**And** Chuyển hướng người dùng về Dashboard tương ứng (Customer/Tailor/Owner)

### Story 1.4: Đăng ký Tài khoản & Xác thực OTP

As a Khách hàng mới,
I want đăng ký tài khoản qua website và kích hoạt bằng mã OTP gửi về Email,
So that tài khoản của tôi được bảo mật và thông tin chính chủ.

**Acceptance Criteria:**

**Given** Người dùng điền đầy đủ thông tin đăng ký hợp lệ
**When** Bấm Submit Form
**Then** Trạng thái tài khoản đổi thành `Inactive` và Email OTP được gửi đi
**When** Điền đúng mã OTP 6 số trên màn hình kích hoạt
**Then** Trạng thái đổi thành `Active` và tự động đăng nhập

### Story 1.5: Khôi phục Mật khẩu qua OTP

As a Người dùng quên mật khẩu,
I want lấy lại quyền truy cập bằng cách nhận OTP qua Email,
So that tôi không bị mất tài khoản khi lỡ quên password.

**Acceptance Criteria:**

**Given** Người dùng ấn "Quên mật khẩu" và nhập Email hợp lệ
**When** Submit yêu cầu
**Then** Một luồng OTP-recovery được tạo và Email gửi đi (dùng template `otp_password_recovery.html`)
**When** Nhập đúng OTP
**Then** Được phép cập nhật Mật khẩu mới an toàn

### Story 1.6: Quản lý Nhân sự (Tạo tài khoản Tailor)

As a Chủ tiệm (Cô Lan),
I want tạo tài khoản cho thợ may trực tiếp tại trang Admin,
So that thợ may có quyền đăng nhập vào Workstation bằng vai trò Tailor.

**Acceptance Criteria:**

**Given** Owner đang ở trang Quản trị Nhân sự
**When** Nhập Email của thợ may (Minh) và bấm cấp quyền Tailor
**Then** Email này được lưu vào bảng Whitelist Staff DB
**And** System gửi email mời làm việc đến thợ may

### Story 1.7: Quản lý Hồ sơ & Số đo Khách hàng (Quick-Add)

As a Chủ tiệm hoặc Thợ may,
I want nhập thủ công hồ sơ khách hàng vãng lai và số đo của họ,
So that lưu trữ thông tin số hóa ngay tại tiệm.

**Acceptance Criteria:**

**Given** Admin đang ở trang Quản lý Khách hàng
**When** Bấm "Thêm khách vãng lai", nhập Tên, SĐT và thông số đo
**Then** Bản ghi được lưu trữ thành công trên DB
**And** Bản số đo có đánh dấu version history
## Epic 2: Quản lý Sản phẩm & Kho hàng (Product & Inventory Management)

Khách hàng có thể duyệt danh mục sản phẩm đồ mua/đồ thuê với đầy đủ thông tin chi tiết. Ngược lại, chủ tiệm có thể tuỳ biến thêm, sửa, xoá sản phẩm cũng như cập nhật trạng thái kho 2 chạm nhanh chóng.

### Story 2.1: Hiển thị Listing Grid Sản phẩm (Boutique Mode)

As a Khách hàng,
I want xem danh sách áo dài dưới định dạng thẻ (Cards grid) tại Showroom,
So that tôi xem nhanh tổng quan những mẫu thiết kế sẵn/cho thuê.

**Acceptance Criteria:**

**Given** Truy cập Homepage/Showroom
**When** Tải nội dung
**Then** Frontend render grid danh sách với phân trang Server-side
**And** Mỗi thẻ có ảnh Thumbnail, Tiêu đề, Badge Mua/Thuê, và Giá

### Story 2.2: Tương tác View Chi Tiết & Zoom Ảnh

As a Khách hàng,
I want xem rõ ràng từng sợi vải, bảng size và mô tả trên trang sản phẩm HD,
So that tôi nắm bắt chất lượng và chuẩn size đồ.

**Acceptance Criteria:**

**Given** Đã chọn 1 sản phẩm
**When** Xem hình ảnh và rê chuột (Hover) / Kéo (Pinch-zoom)
**Then** Hiển thị chức năng Zoom và thư viện (Gallery) ảnh chất lượng cao
**And** Khối văn bản "Bảng Kích Cỡ" mở rộng chuẩn xác

### Story 2.3: Hệ thống Lọc Sản Phẩm Đa Chiều (Filters)

As a Khách hàng,
I want lọc nhanh các trang phục theo Season (ví dụ: Tết), Chất Liệu (Lụa),
So that gom gọn sản phẩm quan tâm.

**Acceptance Criteria:**

**Given** Đang xem trang Showroom
**When** Click các thẻ Tag Filter
**Then** Cập nhật danh sách lưới < 500ms không cần Reload Page
**And** Có thể Mix cấu hình chọn nhiều Filters (Size L + Lụa)

### Story 2.4: Dashboard Owner CRUD Sản Phẩm Áo Dài

As a Quản trị Chủ tiệm,
I want thêm/sửa/xoá một mẫu thiết kế hoặc đồ cho thuê,
So that Danh mục Số của tiệm luôn tươi mới.

**Acceptance Criteria:**

**Given** Admin đang ở Command Mode -> Product
**When** Gửi form Post (Ảnh + Tên + Mô tả + Tuỳ chọn Thuê/Bán + Attributes)
**Then** Dữ liệu cập nhật Database và xoá Cache TanStack (Re-fetch)
**And** Frontend hiện thông báo Toast thành công

### Story 2.5: Tracker Trạng thái "2 chạm" (Availability Status)

As a Quản lý kho,
I want thao tác chuyển trạng thái (Rented/Available/Maintenance) chỉ với 2 nút nhấn,
So that thao tác kiểm kê không mất sức.

**Acceptance Criteria:**

**Given** Dashboard trang kiểm trạng thái Inventory (Danh sách)
**When** Bấm chọn 1 Item -> Chạm nút Switch Status Menu
**Then** Cập nhật ngay vào SQL table `availability`
**And** Render lại Badge trên Dashboard mà không tải lại trang

### Story 2.6: Timeline Tracking & Automated Email Reminders

As a Hệ thống (Background Worker),
I want theo dõi danh sách đồ cho thuê theo ngày dự kiến trả,
So that báo hiệu thông báo và tự tạo nhắc nhở.

**Acceptance Criteria:**

**Given** Task worker cron-job chạy hằng ngày
**When** Soi tìm những món đồ quá hạn (Overdue) hoặc còn 1 ngày trả
**Then** Cập nhật trường Status và đánh dấu cảnh báo Đỏ (Red pulse)
**And** Tự động phát Mail/SMS (qua Notification API) tới khách hàng có món đồ Rented

## Epic 3: Trải nghiệm Mua sắm & Đặt lịch (E-commerce & Booking Journey)

Khách hàng có thể thêm sản phẩm vào giỏ hàng, hoàn thành tiến trình checkout trơn tru và chọn slot hẹn đặt lịch tư vấn Bespoke trực tiếp tại cửa hàng qua Calendar giao diện thông minh.

### Story 3.1: Cart State Management (Zustand + TanStack)

As a Khách hàng,
I want thêm/sửa/xoá một chiếc Áo Dài từ màn hình Showroom vào Giỏ Hàng chung (Buy/Rent),
So that tôi dễ dàng Gom Đơn và kiểm tra tổng chi phí.

**Acceptance Criteria:**

**Given** Component Thẻ sản phẩm hoặc Chi tiết sản phẩm
**When** Bấm nút Add "Thuê" (chọn ngày) / Add "Bán" (chọn size)
**Then** Zustand State Update Optimistic + Modal Giỏ Hàng Nhảy số
**And** Icon Cart (Navbar) hiển thị đếm số Lượng Items

### Story 3.2: Render Cart Checkout Details

As a Khách hàng,
I want liệt kê chính xác các mục Hàng hoá, giá và lịch Thuê-Mua tương ứng,
So that tôi check-lỗi và tính tiền chuẩn sát.

**Acceptance Criteria:**

**Given** Dashboard Thanh toán (Checkout Page Bước 1)
**When** Load danh mục Items Cart
**Then** API Fetch xác thực lại (Authoritative) Availability/Price tổng kết
**And** Cho phép người dùng chỉnh số Lượng hoặc Nút Trash (Loại bỏ Item)

### Story 3.3: Checkout Information & Payment Gateway

As a Khách hàng,
I want hoàn tất nhập Địa chỉ Giao Hàng (Shipping) và chọn Phương Thức Thanh Toán (COD, VNPay, Momo, v.v.),
So that tôi chốt Order.

**Acceptance Criteria:**

**Given** Checkout Page Bước 2
**When** Gửi form Thông Tin Địa Chỉ, Option Thanh toán
**Then** Validate Zod đầy đủ required fields
**And** Sinh Order `Pending` (Gửi email hoá đơn Chờ) -> Forward API URL Payment qua Cổng

### Story 3.4: Lịch Book Appointments Tiệm & Khách (Calendar UI)

As a Khách hàng muốn tư vấn Bespoke,
I want 1 Lịch Đặt Hẹn trực quan báo Slots Sáng/Chiều trống,
So that đặt hẹn đến tiệm dễ dàng.

**Acceptance Criteria:**

**Given** Navigation -> Booking Consultation (CTA từ Home)
**When** Chọn Ngày có hiển thị Trống/Đầy, Khối sáng / chiều và Điền Form Yêu Cầu
**Then** Modal xác nhận "Thành Công" và Background Task lưu DB Slots
**And** Tự phát Email + Countdown (SMS) Booking Reminder trước ngày hẹn

## Epic 4: Xử lý Đơn hàng & Thanh toán (Order & Payment Management)

Chủ tiệm theo dõi được tất cả đơn đặt hàng, quản lý đơn trả đồ thuê. Hệ thống xử lý thanh toán thông qua cổng giao dịch (Gateway integration) đảm bảo dữ liệu ACID.

### Story 4.1: Xử lý State Thanh toán qua Webhook

As a Hệ thống (Backend API Listener),
I want bắt gói tin Thanh Toán từ MOMO/VNPay/Stripe thông qua Event Webhook,
So that xác thực giao dịch, chuyển Order `Pending` thành `Confirmed` tự động không Timeout.

**Acceptance Criteria:**

**Given** Endpoint Webhook Listener đang mở
**When** Nhận Callback từ Gateway thông báo Payment OK (hoặc Failed)
**Then** Payload Hash hợp lệ (mã Signature) mới tiến hành Transaction logic Update Order
**And** Log Error / Phát Sinh nếu Mismatch Status

### Story 4.2: Visual Bảng Đơn Hàng Owner / Host (Order Board)

As a Quản Trị Hệ thống (Cô Lan),
I want theo dõi danh sách Đơn đặt / Mua / Thuê tổng quan theo trạng thái Pipeline trực quan (Từ Mới, Xác nhận, Đang May, Gửi đi, Tới nơi),
So that tôi ko bỏ lỡ Đơn Mới vướng thanh toán.

**Acceptance Criteria:**

**Given** Bảng điều khiển Ops (Owner Menu) -> Orders List
**When** Tải nội dung
**Then** Dùng bảng Status Badges đa sắc (Pending, Shipped, Delivered, Canceled)
**And** Phân mảng Lọc / Dò Tìm qua mã Đơn, Email Customer
**And** Quick-Toggle thao tác chuyển dòng đời trạng thái 1-Chạm

### Story 4.3: Owner Theo Dõi Thuê/Mượn Dài Hạn

As a Chủ tiệm,
I want liệt kê Riêng Bảng Quản Trị Đồ Thuê, gồm ngày Dựng Áo, Tới Hẹn Trả và Trạng Thái Hư Hỏng,
So that nắm bắt Hợp Đồng.

**Acceptance Criteria:**

**Given** Phân Hệ Ops -> Rental Management Tab
**When** Chủ tiệm Mở Màn hình Danh sách Active Rental
**Then** Hiển Nhắc Nhở Đỏ chói nếu "Overdue" quá hạn trả
**And** Lúc Khách Măng Áo Trả Tiệm: Chủ có Form Note nhận định Chất Lượng Áo (Good, Damaged, Lost) rồi thu phí trừ cọc

### Story 4.4: View Orders Lịch Sử Mua Hàng Khách Lẻ (My Profile)

As a Khách Hàng Chăm SóC Tự Thân,
I want thấy bảng liệt kê Orders Đã Giao Dịch, Xem / Tải Hoá Đơn Định Dạng PDF,
So that lưu file chứng minh thanh toán.

**Acceptance Criteria:**

**Given** URL Customer Dashboard (/profile/orders)
**When** Request Render Component Grid
**Then** Liệt Kê Order Cards kèm trạng thái
**And** Bấm Item = Nút Dowload Invoice Mẫu Định Đạng Rạc

## Epic 5: Trung tâm Điều hành & Trạm làm việc Thợ may (Operations & Tailor Workforce)

Cung cấp cho Host/Founder Dashboard chỉ huy (Doanh thu, Phân việc) tối ưu theo layout Data Dense, đồng thời cấp Workstation list cho các F2 (Tailor) theo dõi nhiệm vụ gia công và thu nhập tháng của họ.

### Story 5.1: KPI "Morning Command Center" Dash (Doanh Thu)

As a Quản lý Tiệm / Chủ (Owner),
I want thấy ngay Bảng Dashboard mở Sáng (Trang Chủ Ops): Biểu Đồ Doanh Thu, Báo Cáo Xu Hướng, và Liệt Kê Nhanh (5 Giây) Số lượng Orders Đang Khóa Hướng Tới (Pending), Đơn Hôm Nay,
So that không mất công Dò Tìm.

**Acceptance Criteria:**

**Given** Tài Khoản Chủ Chạm Mắt (View) Dashboard
**When** Call Fast API `/kpi/quick-glance` (Fetch Dữ Liệu Thời Gian Thực)
**Then** Frontend Lên Số Revenue Metric Cards (Ngày/Tuần/Tháng), Nút Mũi Tên Đỏ Xanh (Xu Hướng Lên/Xuống)
**And** Có Biểu Đồ Thanh Bar Chart, Và List Appointments Lịch Cố Định Hôm Nay

### Story 5.2: Bảng Điều Phối Khối Sản Xuất Gắp Việc

As a Chủ Cơ Sở Mua Bán (Owner),
I want giao Các Đơn Hàng Thành Công (`In Production`) Tới Tay Thợ May Bằng Phân Công Giao Dịch,
So that việc được chia rõ Người, Chống Thời Gian Sắp Hết.

**Acceptance Criteria:**

**Given** Tab Quản Trị Tác Vụ Thợ May
**When** Bấm Đơn Nào Thợ May Chỉ Định + Thêm Deadline, Note
**Then** DB Lưu Liền Kề `tailor_tasks` AssigneeID -> Phát Push/Mail Note Cảnh Báo Cho Thợ May "Có Việc Mới Cần Áo Dài"
**And** Hệ Thống Warning Countdown Nếu Thời Hạn Hoàn Thành Dọc Đường Đỏ Quá 7 ngày

### Story 5.3: Workstation "Production Flow" Dash Cho Thợ Tiệm

As a Thợ May Kỹ Thuật (Tailor/F2),
I want Một Dashboard Cá Nhân (Nhận Việc, Trình Diễn Bức Ảnh Blueprint Ngay Trong List Các Thông Báo Công Việc, Trạng Thái Hoàn Thành Đơn),
So that tôi chỉ xem Các Đơn Chuyên Trách 1-Chạm.

**Acceptance Criteria:**

**Given** Tailor Login, Tab Giao Diện `Tasks`/`My Work`
**When** Render Tasks Lists Rạc Được Giao, Hiện Hạn Chót (Deadlines) 
**Then** Thấy Task Nào Bấm Đổi State (Assigned -> Đang Cắt -> Xong) (Chạm "Toggle")
**And** View Bản Mẫu CAD / Cắt Kích Thước Ngay Giao Diện Dọc Kích Bản (Sanity Detail)

### Story 5.4: Tính Lương/Thu Nhập Thợ (Costing Calculations)

As a Thợ Nghề (Tailor),
I want Hiển Thị Gầm Góc Màn Hình Biểu Đồ Doanh Thu Tính Công / Định Mức Áo Dài Tôi Thực Hiện Tháng Này vs Tháng Trước,
So that tôi yên tâm mức Lương + Đạt Động Lực "Thành Tựu".

**Acceptance Criteria:**

**Given** Widget Của Tailor Dash
**When** Task Được Thợ Chuyển `Complete`
**Then** API Chạy Bảng Cộng `Piece-rate` Của Sản Phẩm Đó Vào Lương Phụ Trợ
**And** Chart Cột Cập Nhật Đều Kỷ Ký Tháng
## Epic 6: Quản trị Quan hệ & Tiếp thị (CRM & Marketing)

Owner có thể quản lý, phân cấp Lead, tổ chức tung Voucher/PromoCode để tạo Sale Convert. Quản lý việc gửi chiến dịch Broadcast tương tác trên Message Channel.

### Story 6.1: Quản Trị Hệ Thống Danh Sách Bảng Chìa Khóa (Leads CRM)

As a Quản Trị Hệ thống (Owner/Marketing),
I want theo dõi danh sách Người Truy Cập Tầm Ngắm (Leads) Chưa Đặt Cọc Hoặc Đã Cung Cấp Thông Tin Từ Trực Tuyến Xuống App Bảng Điều Khiển,
So that tôi Đánh Giá Sức Khỏe Tiềm Năng Chốt Sale.

**Acceptance Criteria:**

**Given** Tab CRM / Leads Board
**When** Xem Card Danh Sách Contact Chưa Tạo Đơn (New Booking, Failed Cart Data Xóa Sớm / Signups) Hoặc Nhập Dữ Liệu Forms
**Then** Table Hiển Thị Source, Tên, Cấp Bậc
**And** Component Toggle Kéo Thả Phân Loại Status 3 Vạch 🟢 "Hot" (Mới Click, Đặt Lịch) 🟡 "Warm", 🔴 "Cold"

### Story 6.2: Khai Mở & Chuyển Hóa Khách (Conversion)

As a Quản trị Chủ Cơ Sở Mua Bán (Owner),
I want Tác Vụ Button Click Ngay Trực Tiếp Từ Lead Nảy Sinh Lên Bảng Người Mua/Customer (Đồng Bộ Profile Đo Thước Đợi),
So that tôi ko cần tốn công Nhập Dữ Liệu X2, Tiết Kiệm Nhanh Gọn Tại Cửa Hàng.

**Acceptance Criteria:**

**Given** Card Từng Bạn Lead Nằm Mục "Hot"
**When** Nhấn Chuyển / Push Tới Hàng Custom Menu Hành Động -> Create Account As User Role (Khởi Nhanh Hồ Sơ Number Đo Cơ Bản Default)
**Then** Lead Column Xóa Bỏ Dữ Tiết Chuyển Form Mất Vết Nhẹ Nhàng Bằng Kích Bản Tự Lưu Log Vào Customers

### Story 6.3: Voucher Creator UI (Công Cụ Thúc Đại Bán Hàng)

As a Quản Lý Sales Cơ Cấu Giá (Owner),
I want CRUD Giao Diện Tạo Mã Voucher Code Giảm Giá Thể Loại (%) Lẫn (Trực tiếp giá tiền / Fixed Value),
So that thúc đẩy Ngày Lễ Hội (Tết).

**Acceptance Criteria:**

**Given** Phân Hệ "Sales Promotions" / Quản Vouchers
**When** Khởi Cấu Hình Một Campaign: Gõ Code [TETLUXV26], Gán % Hoặc Fixed VND, Chọn "Điều kiện áp" (Trên N Món, Hoặc Hoá Đơn Tối Thiểu M VND, Thời Hạn D-Day)
**Then** Nhấn "Create" / Push Code To DB `vouchers` Với Logic Validate Hữu Hiệt Phân Nhóm Thể Loại

### Story 6.4: Tương Tác Broadcasting & Template SMS / SNS

As a Vận Hành Marketing (Cô Lan),
I want Soạn Thư Hàng Loạt Message, Phát Tin Qua API Zalo Offical/Facebook Hoặc Email Chứa Kèm Mã Giảm,
So that Cấu Trúc Khuyến Mãi Tập Khách Hot / Hằng Tháng Tiện Ích.

**Acceptance Criteria:**

**Given** Component Chiến Dịch Mới (Outreach Campaigns) Nằm Gần Voucher
**When** Cho Phép Insert Chèn Mã Biến ({{Name}}, {{Code_TET}}) Vào Template "Sáng Tạo Nhẹ" / Hoặc Dùng Form Mẫu Có Sẵn
**Then** Gọi Channel Provider Nạp List Gửi Lệnh Phát (Push SMS/Email Zalo OA) Queue
**And** Campaign Analytics Có Thống Kê / Số Đọc / Số Click Click Tỷ Lệ Theo Dõi.

## Epic 7: Trình biên dịch Cảm xúc & Phong cách (AI Core: Style & Semantic Engine)

Khách hàng có thể tương tác với thanh trượt phong cách để AI dịch thuật cảm xúc thành thông số kỹ thuật (Ease Deltas) và gợi ý vải (Fabric matcher).

### Story 7.1: UI/UX Trụ Cột Phong Cách (Pillars UI)

As a Khách Hàng Thích Tư Vấn Bespoke (Style Selection),
I want Một Loạt Thẻ Thông Số Style (Mini/Minimal/Cổ Điển/Đoạn Quyến Rũ),
So that Gợi Cảm Nội Dung Tôi Khát Vọng.

**Acceptance Criteria:**

**Given** Canvas Config
**When** Client Nhấn Box Ảnh
**Then** Component Nhập Khóa Set State Chọn Trụ Của Pillar
**And** Fetch Khung Background "Logic Vải" "Thùng Áo" DB Rule

### Story 7.2: Style Intensity / Ease Control Sliders

As a Khách Nhanh Mắt,
I want Kéo Cửa Sổ Slider (Thumb Vị Trí Cường Độ %),
So that tôi Mức Biểu Biến Thẩm Mỹ Cao.

**Acceptance Criteria:**

**Given** Khung Phụ "Điều Chỉnh" Gần Khung 3D / Bản Canvas
**When** Chơi Slider "Form Rộng" "Dáng Êm Chân" (0-100)
**Then** Báo Cáo Thay Đổi Real-time Sang App Mảng Thừa Slider
**And** Các Độ Nút Slider Đổi Thành Màu Accent Heritage Vàng (Gold) Nơi Tỷ Lệ Vàng Artisan Point 

### Story 7.3: Hệ Gợi Ý Loại Vải Từ Thông Số

As a Khách Chăm Mọi Ý,
I want Sau Cấu Trúc Khối Vấn Đề Style Vừa Chọn, App Thường Trực Ra Bản Khải Những Khúc Vải Kèm Thuộc Tính Đặc Thù
So that Thẩm Hình Đúng Chất Cuộc Mới Tốt Nhất Định.

**Acceptance Criteria:**

**Given** Phê Duyệt Cột Chỉnh Slider Dáng Êm
**When** Client Mở Mục "Phân Loại Chọn Vải (Gợi Bước Gấp)" Bấm Recommend Yêu Thích 
**Then** FastAPI Tín Hiệu Matcher Kéo Metadata (Weave, Stretch_c) Mapping Component Vải (Taffeta, Silk) Thả Gợi Ý Phù Hợp
**And** Khối Tụ Nặng Hay Gãy (Bad Options) Cắt Bỏ Mờ Ảo Tách Hẳn Tầm 

### Story 7.4: Gọi Compiler Đổi Adjective Ra Semantic Toán

As a Phân Hệ Back-end "Semantic Logic Engine",
I want Điểm % (Intensity) Và Trục Tính Phương Biến Ra Mức mm/cm Delta Thụ Lực (vd: eo + 2.0 cm),
So that Số Lượng Hoá Đoạn Thành Toán Được Cụ Thể Gửi Phân Hệ Chế Rập.

**Acceptance Criteria:**

**Given** Gói REST API Bắn Tới Server `/translate` Bọc Kèm `Pillar`, `Intensity`, `Fabric ID`
**When** LangGraph "LLM / RAG / DB Logic Chạy Xác Định Rule Hợp Lệ Nhất" Thẩm Nặng Qua LKB (The Vault) Mất Trong 15s (NFR1)
**Then** Trả Json Array `geometry_deltas` Bao Gồm ID, Position (Ngực/Eo), Số mm Đổi Lệch.

## Epic 8: Bộ máy Biến đổi Hình học (AI Core: Geometric Transformation)

Hệ thống biến đổi Mẫu rập chuẩn thành Mẫu riêng dựa trên Ease Delta và Output Master JSON SSOT. Kèm logic vẽ Overlay So sánh.

### Story 8.1: API Hình Học Căn Bản & Sinh JSON Cột Số (Geometry Model Data)

As a Phân Hệ Hữu Hạn Hình Cầu Back-end (Engine),
I want Lưu Biến Số Hình Rập `P_base` & `Delta` Trong Table Core Toán Cẩn Thận,
So that JSON Sinh Kèm Hash Tránh Cấu Trúc File Xâm Nhập (SSOT Integrity).

**Acceptance Criteria:**

**Given** Phê Duyệt Nút "Khóa Thay Đổi" Bản Canvas
**When** Client Sync Post Request "Tạo Bản Định Vị Mới" (Save JSON) Lại Đính Số Khách (Base X Y) / Tọa Vải Dọc Biên (Tension Rate)
**Then** Back-end JSON Cấu Trúc Mới Ra Hash So Chéo (Checksum) Rồi Chốt Vào Postgres `geometric_specs`.
**And** Sai Biên Chỉ Được Lệch Độ Tính Bằng JS/Backend Cho Phép ΔG Dưới 1mm Cắt.

### Story 8.2: Base Render 2D SVG & Cắt Path Kích Cỡ Mở

As a Cửa Sổ Rập (Adaptive UI),
I want Tái Tạo Rập Bằng Đồ Thị Vector Đẹp Sạch (SVG Path), Nạp Default Cơ Thể Phẳng Chưa Thay Đổi,
So that Khách Nhận Lấy View Hiện Thực Hoạt Náo <200ms Chuẩn Vòng Eo Ngực.

**Acceptance Criteria:**

**Given** Component Box Thiết Kế Lột Tả Ảnh `CanvasSVG` Bản Initial Xoay 2 Thân Trang. 
**When** Tải Điểm (Cột Node JSON Base Dọc X Y) Lên Đa Tuyến Mảng Bezier Curve
**Then** Viewport Nhỏ Vừa Lòng Hình Chụp Khớp Bức Chuẩn Cơ Sở (Baseline Render).

### Story 8.3: Nối Móc Morphing Effect Trượt Thanh Số Slider

As a Khách Cầm Trị Slider (Hoặc Thợ Đẩy Kế Thừa),
I want Mỗi Nút Dịch "Độ Thủng Tay" Thấy Canvas Trượt Đổi Gập Vệt Cong Thời Gian Quanh,
So that Hình Chỉnh Elastic Trơn Bóng Mắt (Cũng Trong Chu Trình Nháy Tính Animation Lưới Node Phản Cước Điểm Điểm Lệch Độ Delta Cung Nạp Lại). 

**Acceptance Criteria:**

**Given** CanvasSVG Lúc Vừa Kéo Thanh Chỉnh Độ X % Lên (D=2cm Lệch Thêm So Gốc)
**When** JS RequestAnimationFrame Ép Hàm React Nảy Tween Morph Đổi Cột
**Then** Đồ Thị Vặn Đường Biêng, Cúp Ngực Phóng (D>0) Mất Ngay Nhịp Cước 200 Ti Cùng Phản Cước

### Story 8.4: Layer Bóng Mờ So Sánh Chạm Comparison Dấu Lệch (So Overlay)

As a Khách / Thợ Kỹ Thuật (Review Tình Hình Cân Giảng So Gốc),
I want Cột Bấm Layer Chìm Bóng Đo Sát Điểm Biến Màu Vàng - Base Màu Dần Đứt Điểm Căng,
So that Khác Biệt (Sợi Chạm Delta Lệch 6cm Eo Cũ) Không Lẫn Vào View.

**Acceptance Criteria:**

**Given** Đang Có Bản Hiện (Modified Body Curves)
**When** Người Nhanh Ấn "Xem Mẫu Bầu Standard Cũ Compare" (Toggle Switch Compare Mode)
**Then** Chèn 1 Node SVG Class Định Màu Xám Transparent Đè Trực Điểm Node Thấp Xuống Phía Sau.
**And** Vệt Gồ Biến Khoảng Cách (Tô Vàng Bầu Highlight Lên Viền Sai 2.0).

## Epic 9: Kiểm soát Vật lý & Phê duyệt Kỹ thuật (AI Core: Guardrails & Tailor Review)

Rào chắn tính toán vật lý chặn tỷ lệ vô lý. Phát Alert, cho phép thợ may Override Output AI (để học bằng human round) trước khi Export CAD file SVG cuối cùng.

### Story 9.1: Hard-Constraints (Chặn Phá Hỏng Khung Vải)

As a Phân Hệ Core Back-end Tính Vi Phạm Học Toán (Pydantic / Constraints Engine),
I want Tường Lử Chặn Cắt Các Input Trượt Lố Vòng Cửa (Chu Vú Nâng > Lưng Sau Hoặc Vàng Sai Cấu Trúc Khóa 5cm Vượt Nhất),
So that Số Này Nếu Qua Máy Cắt Phí Tiền Vải Mặc Không Vừa.

**Acceptance Criteria:**

**Given** Phê Duyệt / Lock API Submit 
**When** Call Node Hàm Check Hình Cơ Sở Pydantic (Hard Rules Array Loop: IF Nách Bụng Thủng Quá Biến Cấm)
**Then** Back-end Chặn 422 Unprocessable Với Tin Nữ "Giảm Size Hoặc Sửa Vòng Chữ", Cấm Lưu State Lock.

### Story 9.2: Hints/UI Trực Tiếp Nháy Vi Phạm Khéo Nhỏ Cúi Soft (Cảnh Cáo Nhẹ Thở UI)

As a Khách Hàng Hoặc Thợ,
I want Kéo Thanh Trượt Gừng Mắc Đoạn Lề Giới Hạn, App UI "Ló" Thông Báo Tooltip Đầu Thanh Chữ Việt Đẹp Mắt "Chú Ý Cẩn Thân Dài Sẽ Bị Quét Lép Đất",
So that Tôi Ngưng Tay Kéo Gấp (Lệch Nỉ).

**Acceptance Criteria:**

**Given** Tín Hiệu Server Soft Constraint Fetch Báo Mới Dưới Ngưởng 5% Nguy Kịch.
**When** Tương Tác Thử Thay Đổi Trượt Thêm 1 Ly Dịch.
**Then** State Kèm Warn (Dấu Cam Cảnh Màu Amber) / Tooltip Box Rê Gần Cụm Đỏ - Bấm Để Xem Chỉ Thị Rủi Ro Ngắn.
**And** Snap-back Hồi Bật Tay (Nếu Người Thử Vặn Kép Thủy Nhấp Vào Red Line Limit).

### Story 9.3: Chức Năng Bảng Sanity Check 3 Cột Khảo Sát Thợ

As a Thợ Nghề Cắt (Tailor / Cầm Máy Sửa),
I want Xem Một Lúc Bảng Trực Diện So Nhau Giữa: Base Number(Mẫu), Body Measure(Khách Dò Cơ), Với Output AI Đã Thay,
So that Mình Chọn Quét Nhanh Đoạn Có Vấn Đề Chênh (Lệch Delta Quá Khác Dành Cho Áo Bụng Căng Mỡ Mềm).

**Acceptance Criteria:**

**Given** Dashboard Của F2/Tailor Tab Workstation Gửi Task
**When** Mở Bảng `Sanity Checklist Layout` Từng Nút Rập Đo Áo.
**Then** Component Table Chia Hàng (Mục: X X X Y Y Y) Ba Cột Tách Số. 
**And** Chữ Màu Accent Mark Highlight Khoảng Cảm Nặng (Chênh Lên Khá Cao Lớn Cỡ Nhận Cảnh Giác Trọng Hình - Chữ Tiếng Việt Vòng Ngực).

### Story 9.4: Manual Override (Thợ Ép Tắt Khóa Đổi Hình & Log Ghi Lại Academy Hậu Qủa)

As a Bậc Thợ Bậc Kỹ Khách Nắn Form (Thợ Override),
I want Số Đội Lên Lên Trên Trực Nhập, Ấn Nút Thượng Máy Tắt Quát Output Của Máy Gián Cảm Sửa Theo Bản Năng Người,
So that Đồ Xuất Tốt Đẹp Đúng Tín Tay. 

**Acceptance Criteria:**

**Given** Form Table Cột 3 Của Sanity AI Tự Cấp
**When** Tailor Chạm `Edit / Ghi Đè` Cửa Sổ Bật Pop Form Nhập Lại Size Số (Bỏ 2.0 Thay Vào 3.0 Vì Phải) "Sợi Vải Kén"
**Then** Submit Cất Biến Dữ Vượt Ngăn Khóa - Xác Nhận Master JSON Change.
**And** Log Flag "Human Edited" Vào Cột Ghi Nhớ Lấy "Học Phối Model Sau Của Data ML - ML Feedback" (NFR9) Lưu Lại. 

### Story 9.5: Cắt Export Bản Thiết Kế Số (Blueprint Maker DXF/SVG Màn Trắng Số Liệu Chặt Cắt Cực Mảnh)

As a Thợ Sản Xuất Rập Phẳng Khâu Sau Cuối Cùng,
I want Bấm Tải Bản Sắp Vector SVG / Kênh Hình Dữ Liệu Tách Định Nghĩa DXF Máy CNC Hạch Rõ Đường Nối Đứt (Margin/Hemline/Đường Cắt/Chỉ Vạch) Đỉnh Áo Chữ Thông Báo CM Chữ Ta Thuần.
So that Print Giấy Nhựa Ra Càng Nhạy Bén Đúng Đo Lường Lộ May Từng Chi Tiết.

**Acceptance Criteria:**

**Given** Lệnh Bấm Download Production Master.
**When** Bức Cảnh Báo Pass Guard Cửa Đều Mở
**Then** Hàm Python Sinh Khối Khung File Vẽ Rẽ DXF Lệnh Đường Đưa (Dựa Line Toạ Độ Canvas Hợp Quy SVG). 
**And** Gắn Tem Note "Khuyên Cắt" Tiếng Nghề Lên Đồ Bản + Header Code QR Mã Đơn Hàng Dẫn Theo Số Lệch Hàng.
