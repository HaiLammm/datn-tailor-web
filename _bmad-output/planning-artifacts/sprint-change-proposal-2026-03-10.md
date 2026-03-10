# Sprint Change Proposal - tailor_project

**Date:** 2026-03-10  
**Prepared by:** Bob (Scrum Master)  
**For:** Lem (User)

---

## 1. Issue Summary

### Problem Statement
PRD/Epics hiện tại thiếu 20 module/trang cần thiết cho một sản phẩm hoàn chỉnh. Dự án pivot từ "AI Bespoke Tool" sang "E-commerce + Booking + AI Bespoke Platform".

### Discovery Context
- Yêu cầu từ stakeholder
- Nhận ra MVP thiếu các trang nền tảng cơ bản
- Pivot chiến lược sang E-commerce

### Evidence
- 10/20 modules hoàn toàn mới (không có trong PRD)
- 6/20 modules cần mở rộng lớn
- 4 domain mới: E-commerce, Payment Processing, Booking/Scheduling, CRM & Marketing

---

## 2. Impact Analysis

### 2.1 Epic Impact

| Epic | Loại thay đổi | Stories mới |
|---|---|---|
| Epic 1 (Auth & Profile) | Mở rộng | +4 (User Profiles cho 3 roles) |
| Epic 5 (Product & Inventory) | Viết lại | +9 (Product CRUD, Inventory, Filters) |
| Epic 6 (NEW) | MỚI | +9 (Homepage, Cart, Checkout, Booking, About) |
| Epic 7 (NEW) | MỚI | +12 (Orders, Payments, Rental) |
| Epic 8 (NEW) | MỚI | +15 (Owner/Tailor Dashboards, Tasks, Appointments, Customers) |
| Epic 9 (NEW) | MỚI | +12 (Leads, Vouchers, CRM Outreach) |
| Epic 2-4 (AI Core) | Giữ nguyên | 0 |

### 2.2 Artifact Impact

| Artifact | Required Changes |
|---|---|
| **PRD** | Mở rộng MVP, thêm FR26-35+, cập nhật User Journeys |
| **Architecture** | Thêm Payment Gateway, 10+ API endpoints, Database schema mới |
| **UX Design** | Global navigation, 20+ new components, Mobile-first E-commerce |
| **CI/CD** | Payment service deployment, Background jobs |
| **Monitoring** | Payment logging, Appointment reminders |

---

## 3. Recommended Approach

### Selected: Option 4 (Hybrid)

**Rationale:** Chia nhỏ thành nhiều sprints, mỗi sprint có deliverable rõ ràng, giảm risk

### Effort Estimate
- **Total Stories:** ~35-40 stories mới
- **Risk Level:** Medium (mitigated by incremental delivery)
- **Timeline Impact:** MVP sẽ kéo dài, cần 4+ sprints

### Epic Order (Hướng A - E-commerce First)
**Epic 1 -> 5 -> 6 -> 7 -> 8 -> 9 -> 2 -> 3 -> 4**

---

## 4. Detailed Change Proposals (All Approved)

### Proposal #1: Epic 1 - User Profile & Authentication (Approved ✓)

| Story | Description | Priority | Estimate |
|---|---|---|---|
| 1.1a | User Profile Dashboard cho Customer: Lịch sử đơn hàng, tình trạng thuê, lịch hẹn | P0 | M |
| 1.1b | User Profile Dashboard cho Owner: Doanh thu, lịch hẹn, leads, vouchers | P0 | M |
| 1.1c | User Profile Dashboard cho Tailor: Thu nhập, công việc được giao, lịch | P0 | M |
| 1.3a | Chỉnh sửa Story 1.3: Thêm fields số đo đầy đủ, lịch sử tư vấn | P1 | S |

### Proposal #2: Epic 5 - Product & Inventory (Approved ✓)

| Story | Description | Priority | Estimate |
|---|---|---|---|
| 5.1a | Product Listing: Hiển thị tất cả áo dài, phân trang | P0 | M |
| 5.1b | Product Filters: Lọc theo Mùa, Màu sắc, Chất liệu, Size | P0 | L |
| 5.2a | Product Detail: Hình ảnh HD, Zoom, Mô tả, Bảng size | P0 | M |
| 5.2b | Product Detail - Mua/Thuê: Chọn Mua đứt hoặc Thuê, Calendar ngày mượn/trả | P0 | L |
| 5.3a | Product CRUD (Owner): Thêm/Sửa/Xóa áo dài | P0 | M |
| 5.3b | Inventory Management: Cập nhật tồn kho, trạng thái | P0 | S |
| 5.3c | Season Attributes: Thiết lập thuộc tính "Mùa" cho bộ lọc | P1 | S |
| 5.4a | Rental Status Timeline: Hiển thị ngày khách phải trả đồ | P1 | S |
| 5.4b | Return Notifications: Thông báo nhắc trả đồ tự động | P1 | S |

### Proposal #3: Epic 6 - E-commerce & Booking (Approved ✓)

| Story | Description | Priority | Estimate |
|---|---|---|---|
| 6.1a | Homepage: Giới thiệu thương hiệu, bộ sưu tập mới, khuyến mãi, CTA | P0 | M |
| 6.2a | Cart: Danh sách sản phẩm, số lượng, đơn giá, phân loại Mua/Thuê | P0 | L |
| 6.2b | Cart Actions: Cập nhật số lượng, xóa item, tính tổng tiền | P0 | S |
| 6.3a | Checkout: Nhập thông tin giao hàng, chọn phương thức thanh toán | P0 | L |
| 6.3b | Checkout Actions: Xác nhận đơn hàng, tạo order | P0 | M |
| 6.4a | Appointment Booking: Calendar chọn ngày/giờ đến tiệm | P0 | L |
| 6.4b | Appointment Form: Thông tin cá nhân, yêu cầu đặc biệt | P0 | S |
| 6.4c | Appointment Confirmation: Xác nhận lịch hẹn, thông báo | P0 | S |
| 6.5a | About & Contact: Câu chuyện thương hiệu, bản đồ, liên lạc | P1 | S |

### Proposal #4: Epic 7 - Order & Payment Management (Approved ✓)

| Story | Description | Priority | Estimate |
|---|---|---|---|
| 7.1a | Order Management (Owner): Theo dõi đơn hàng, lọc trạng thái | P0 | M |
| 7.1b | Order Details: Xem chi tiết đơn hàng | P0 | S |
| 7.1c | Order Actions: Cập nhật trạng thái đơn | P0 | S |
| 7.2a | Rental Management (Owner): Quản lý đồ đang cho thuê | P0 | M |
| 7.2b | Return Tracking: Theo dõi tình trạng khi nhận lại | P0 | S |
| 7.2c | Late Returns: Thông báo khách hàng trả muộn | P1 | S |
| 7.3a | Payment Integration: Tích hợp payment gateway | P0 | XL |
| 7.3b | Payment Methods: COD, Chuyển khoản, Ví điện tử | P0 | M |
| 7.3c | Payment Status: Xử lý Paid, Failed, Refunded | P0 | M |
| 7.3d | Payment Security: 3DSecure, PCI compliance | P0 | M |
| 7.4a | Order History (Customer): Xem lịch sử đơn hàng | P0 | S |
| 7.4b | Order Details (Customer): Xem chi tiết, tải hóa đơn | P0 | S |

### Proposal #5: Epic 8 - Operations Dashboard & Workforce (Approved ✓)

| Story | Description | Priority | Estimate |
|---|---|---|---|
| 8.1a | Dashboard Overview: Tổng quan doanh thu, đơn hàng, lịch hẹn | P0 | M |
| 8.1b | Revenue Charts: Biểu đồ doanh thu | P0 | M |
| 8.1c | Order Statistics: Số lượng đơn mua vs thuê | P0 | S |
| 8.1d | Alerts - Pending Productions: Trang phục chưa hoàn thành 7 ngày tới | P0 | M |
| 8.2a | Appointment List: Danh sách khách đặt lịch real-time | P0 | M |
| 8.2b | Appointment Filtering: Lọc theo ngày, trạng thái | P0 | S |
| 8.2c | Task Assignment: Bàn giao công việc cho nhân viên | P0 | M |
| 8.3a | Assigned Tasks: Danh sách công việc được giao | P0 | M |
| 8.3b | Production List: Trang phục đã thực hiện + giá tiền | P0 | M |
| 8.3c | Income Statistics: Thu nhập tháng, phân loại trang phục | P0 | M |
| 8.3d | Task Status Update: Cập nhật trạng thái công việc | P0 | S |
| 8.4a | Customer Profiles: Thông tin số đo, lịch sử mua/thuê | P0 | M |
| 8.4b | Customer Search: Tìm kiếm theo tên, SĐT, email | P0 | S |
| 8.4c | Measurement History: Lịch sử thay đổi số đo | P1 | S |

### Proposal #6: Epic 9 - CRM & Marketing (Approved ✓)

| Story | Description | Priority | Estimate |
|---|---|---|---|
| 9.1a | Lead List: Danh sách khách hàng tiềm năng | P0 | M |
| 9.1b | Lead Creation: Thêm lead mới | P0 | S |
| 9.1c | Lead Classification: Phân loại mức độ quan tâm | P0 | S |
| 9.1d | Lead Conversion: Chuyển đổi lead thành khách hàng | P1 | S |
| 9.2a | Voucher CRUD: Tạo, sửa, xóa voucher | P0 | M |
| 9.2b | Voucher Types: Giảm giá % hoặc cố định | P0 | S |
| 9.2c | Voucher Conditions: Điều kiện sử dụng | P0 | S |
| 9.2d | Voucher Analytics: Theo dõi sử dụng, doanh thu | P1 | M |
| 9.2e | Voucher Distribution: Gửi mã qua email/SMS | P1 | S |
| 9.3a | Outreach Campaign: Gửi tin nhắn hàng loạt | P0 | M |
| 9.3b | Channel Integration: Tích hợp Zalo, Facebook | P0 | L |
| 9.3c | Template Messages: Mẫu tin nhắn có sẵn | P0 | S |
| 9.3d | Campaign Analytics: Tỷ lệ mở tin, sử dụng voucher | P1 | M |

---

## 5. MVP Scope Impact

| Original MVP | New MVP (Updated) |
|---|---|
| AI Bespoke Tool + Rental Catalog | AI Bespoke + E-commerce + Booking + CRM |

### Feature Summary by User Role

**Customer:**
- Homepage, Product Listing/Detail, Cart, Checkout, Appointment Booking, User Profile, About & Contact

**Owner (Cô Lan):**
- Dashboard (Revenue, Orders, Alerts), Product Management, Order Management, Appointment Management, Task Assignment, Customer Management, Lead Management, Voucher System, CRM Outreach

**Tailor (Minh):**
- Assigned Tasks, Production List, Income Statistics, Task Status Update

---

## 6. Implementation Handoff

### Change Scope: **MAJOR**

Requires coordination between:
- Product Owner (backlog prioritization)
- Solution Architect (database schema, payment integration)
- Development Team (implementation)

### Deliverables
1. Updated PRD with new functional requirements
2. Revised Architecture document with new database schema
3. Updated UX Design with new navigation and components
4. Sprint plan (4+ sprints)
5. Updated epic/story backlog

---

## 7. Next Steps

1. **Approve this Sprint Change Proposal**
2. **Prioritize stories within each Epic**
3. **Assign to sprints**
4. **Begin implementation with Epic 1 + Epic 5**

---

**Approved by:** _________________  
**Date:** _________________
