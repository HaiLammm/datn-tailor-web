# Functional Requirements

## 1. Style & Semantic Interpretation
- **FR1:** Người dùng có thể chọn các Trụ cột Phong cách (Style Pillars) định sẵn.
- **FR2:** Người dùng có thể điều chỉnh cường độ phong cách qua Sliders.
- **FR3:** Hệ thống dịch thuật lựa chọn phong cách thành các bộ chỉ số Ease Delta.
- **FR4:** Hệ thống gợi ý vải dựa trên ma trận tương thích giữa Ease Delta và vật liệu (đã được nghệ nhân cấu hình).

## 2. Geometric Transformation Engine
- **FR5:** Hệ thống áp dụng Ease Delta vào mẫu rập chuẩn (Golden Base Pattern).
- **FR6:** Hệ thống tính toán tọa độ (x,y) mới dựa trên số đo thực tế của khách hàng.
- **FR7:** Hệ thống tạo Master Geometry Specification chứa thông số hình học sau biến đổi.
- **FR8:** Hệ thống xuất bản vẽ Blueprint (SVG) để hiển thị trực quan.

## 3. Deterministic Guardrails & Validation
- **FR9:** Hệ thống tự động kiểm tra các ràng buộc vật lý (ví dụ: vòng nách vs bắp tay).
- **FR10:** Hệ thống ngăn chặn xuất Blueprint nếu vi phạm các quy tắc hình học Golden Rules.
- **FR11:** Hệ thống cảnh báo kỹ thuật khi thông số hình học nằm trong khoảng ±5% so với ngưỡng giới hạn vật lý của vải.
- **FR12:** Thợ may có quyền ghi đè (Override) thủ công các đề xuất của AI.

## 4. Tailor Collaboration & Production
- **FR13:** Người dùng có thể xem lớp phủ Overlay so sánh rập chuẩn và rập tùy chỉnh.
- **FR14:** Thợ may có thể sử dụng Sanity Check Dashboard để đối chiếu số đo khách và đề xuất AI.
- **FR15:** Thợ may nhận danh sách thông số gia giảm (+/- cm) chi tiết cho từng vị trí cắt rập để thực thi sản xuất.
- **FR16:** Hệ thống quản lý và bảo mật quyền truy cập bí kíp Golden Rules nội bộ.

## 5. Measurement & Profile Management
- **FR17:** Thợ may có thể nhập và lưu trữ bộ số đo chi tiết (theo danh mục thông số chuẩn) cho từng khách hàng.
- **FR18:** Hệ thống liên kết số đo khách hàng với các phiên bản rập tùy chỉnh tương ứng trong lịch sử.

## 6. Rental Catalog & Status (Digital Showroom)
- **FR22 (Digital Catalog):** Hệ thống hiển thị danh sách áo dài cho thuê với đầy đủ hình ảnh, mô tả và bảng thông số kích thước thực tế (Bust/Waist/Hip).
- **FR23 (Availability Status):** Hiển thị trạng thái thời gian thực: Available, Rented, Maintenance.
- **FR24 (Return Timeline):** Hiển thị lịch hẹn trả đồ dự kiến cho từng bộ trang phục.
- **FR25 (Inventory Admin):** Chủ tiệm cập nhật trạng thái kho đồ nhanh chóng (tối đa 3 thao tác chạm).

## 7. Authentication & Security
- **FR26 (Forgot Password):** Hệ thống cho phép yêu cầu khôi phục mật khẩu bằng cách tái sử dụng hạ tầng OTP của quy trình Đăng ký.
- **FR27 (Specific Recovery Email):** Sử dụng mẫu email OTP dành riêng cho việc khôi phục mật khẩu (`otp_password_recovery.html`), các tài nguyên logic khác được dùng chung với hệ thống Đăng ký.
- **FR28 (Password Reset Flow):** Hệ thống chỉ cho phép cập nhật mật khẩu mới sau khi xác thực OTP thành công.
