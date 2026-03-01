---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - "_bmad-output/planning-artifacts/prd.md"
  - "_bmad-output/planning-artifacts/architecture.md"
  - "_bmad-output/planning-artifacts/ux-design-specification.md"
project_name: "tailor_project"
user_name: "Lem"
date: "Sunday, February 22, 2026"
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
FR22: Hệ thống hiển thị danh sách áo dài cho thuê với đầy đủ hình ảnh, mô tả và kích thước cơ bản.
FR23: Hiển thị trạng thái thực tế của từng bộ đồ: Available (Sẵn sàng), Rented (Đang thuê), Maintenance (Giặt ủi/Sửa chữa).
FR24: Hiển thị ngày dự kiến bộ đồ sẽ quay lại kho để khách hàng theo dõi.
FR25: Chủ tiệm có quyền thêm/xóa/sửa thông tin bộ đồ và cập nhật trạng thái nhanh chóng (2-3 lần chạm).

### NonFunctional Requirements

NFR1: Thời gian phản hồi chu trình suy luận LangGraph trung bình Lavg < 15 giây.
NFR2: Hệ thống hỗ trợ xử lý ít nhất 5 yêu cầu suy luận đồng thời.
NFR3: Sai số hình học tuyệt đối ΔG không vượt quá 1mm so với tính toán lý thuyết.
NFR4: Hệ thống sẵn sàng hoạt động 99.9% thời gian làm việc của tiệm.
NFR5: Master Geometry JSON được kiểm tra tính toàn vẹn (Checksum) trước khi lưu trữ.
NFR6: Xác thực người dùng cho mọi phiên làm việc tại tiệm.
NFR7: Tuân thủ RBAC để bảo vệ các bí kíp Golden Rules di sản.
NFR8: Mã hóa dữ liệu số đo và tri thức di sản ở trạng thái nghỉ (at rest).
NFR9: Ghi log chi tiết các quyết định AI và các lần thợ may ghi đè (Override).
NFR10: Giao diện Adaptive Canvas phản hồi trực quan trong vòng < 200ms khi người dùng kéo Sliders.
NFR11: Sử dụng 100% thuật ngữ chuyên môn ngành may Việt Nam trong toàn bộ hệ thống.

### Additional Requirements

**From Architecture:**
- **Starter Template:** Next.js 16 (Frontend) & FastAPI + LangGraph (Backend).
- **Tech Stack:** Python, LangGraph, FastAPI, PostgreSQL 17 + pgvector 0.8.x, React + Tailwind, Auth.js v5.
- **Inference Strategy:** Client-side Morphing (tức thì) vs Backend Inference (đóng gói thiết kế).
- **Geometry Logic:** $P_{final} = P_{base} + \alpha \cdot \Delta_{preset}$.
- **Security:** RBAC (Owner, Tailor, Customer) via Next.js Middleware.
- **Validation:** Pydantic v2 (Backend) & Zod (Frontend).
- **Data Foundation:** Master Geometry JSON (SSOT) via PostgreSQL JSONB.

**From UX:**
- **Visuals:** Heritage Palette (Indigo Depth, Silk Ivory, Heritage Gold), Dual-Tone Typography (Serif & Mono).
- **Patterns:** "The Sculpting Loop", "Geometric Elasticity", "Haptic Golden Points", "Comparison Overlay".
- **Performance:** SVG Path manipulation via requestAnimationFrame for < 200ms latency.
- **Responsive:** Dual-Device Synergy (Artisan Tablet/Desktop vs Customer Mobile Bottom Sheet).
- **Accessibility:** WCAG 2.1 AA, 44x44px touch targets.

### FR Coverage Map

FR1: Epic 2 - Style Interpretation
FR2: Epic 2 - Style Intensity Sliders
FR3: Epic 2 - Ease Delta Translation
FR4: Epic 2 - Fabric Suggestion
FR5: Epic 3 - Geometry Transformation
FR6: Epic 3 - coordinate calculation
FR7: Epic 3 - Master Geometry JSON creation
FR8: Epic 3 - SVG Blueprint export
FR9: Epic 4 - Physical Guardrails
FR10: Epic 4 - Physical Integrity Lock
FR11: Epic 4 - Risk Alerts
FR12: Epic 4 - Manual Override
FR13: Epic 3 - Comparison Overlay
FR14: Epic 4 - Sanity Check Dashboard
FR15: Epic 4 - Manufacturing Blueprint
FR16: Epic 1 - The Vault Security
FR17: Epic 1 - Profile Management
FR18: Epic 1 - Measurement-Profile Link
FR19: Epic 1 - Local-First Setup
FR20: Epic 1 - Tenant Isolation
FR21: Epic 2 - Rule Editor UI
FR22: Epic 5 - Digital Catalog
FR23: Epic 5 - Availability Status
FR24: Epic 5 - Return Timeline
FR25: Epic 5 - Inventory Admin

## Epic List

### Epic 1: Nền tảng Xác thực & Quản lý Hồ sơ (Core Foundation)
Thiết lập hệ thống bảo mật, phân quyền RBAC và quản lý số đo khách hàng. Hỗ trợ đăng nhập qua Google OAuth, đăng ký khách hàng qua website với xác thực OTP, và quản trị tài khoản nhân viên.
**FRs covered:** FR16, FR17, FR18, FR19, FR20, NFR6, NFR7, NFR8

## Epic 1: Nền tảng Xác thực & Quản lý Hồ sơ (Core Foundation)

Thiết lập hệ thống bảo mật, phân quyền RBAC và quản lý số đo khách hàng. Đây là "điểm tựa" cho mọi giao dịch và thiết kế sau này.

### Story 1.0: Thiết lập dự án từ Starter Template

As a **Nhà phát triển**,
I want **khởi tạo cấu trúc thư mục Frontend và Backend từ Starter Template**,
So that **dự án có nền tảng kỹ thuật đúng như Kiến trúc đã định nghĩa**.

**Acceptance Criteria:**

**Given** Máy chủ phát triển đã sẵn sàng
**When** Chạy các lệnh khởi tạo Next.js 16 (Frontend) và FastAPI + LangGraph (Backend)
**Then** Cấu trúc thư mục `/frontend` và `/backend` được tạo ra với đầy đủ các thư viện cơ bản (Tailwind, LangGraph, Pydantic v2, Auth.js v5)
**And** File cấu hình môi trường (.env) được thiết lập cho kết nối PostgreSQL 17

### Story 1.1: Đăng nhập Hệ thống Đa phương thức (Unified Login)

As a **Người dùng (Khách/Thợ/Chủ)**,
I want **đăng nhập bằng tài khoản Google hoặc Email/Mật khẩu**,
So that **tôi có thể truy cập vào hệ thống một cách linh hoạt và bảo mật**.

**Acceptance Criteria:**

**Given** Người dùng đang ở trang Đăng nhập
**When** Người dùng chọn "Tiếp tục với Google" hoặc nhập Email/Mật khẩu hợp lệ
**Then** Hệ thống xác thực danh tính qua Auth.js v5 (NextAuth)
**And** Hệ thống tự động nhận diện vai trò (Role) dựa trên Email (so khớp với staff_whitelist hoặc config.py)
**And** Chuyển hướng người dùng về Dashboard tương ứng (Owner/Tailor/Customer)

### Story 1.2: Đăng ký Tài khoản Khách hàng & Xác thực OTP

As a **Khách hàng mới**,
I want **đăng ký tài khoản qua website và kích hoạt bằng mã OTP gửi về Email**,
So that **tài khoản của tôi được bảo mật và xác thực chính xác**.

**Acceptance Criteria:**

**Given** Người dùng ở trang Đăng ký (Register)
**When** Người dùng nhập đầy đủ: Họ tên, Email, Mật khẩu, Ngày tháng năm sinh, Giới tính, Địa chỉ
**Then** Hệ thống tạo tài khoản ở trạng thái `Inactive` với vai trò mặc định là `Customer`
**And** Hệ thống gửi một Email thông báo kèm mã OTP duy nhất đến email đã đăng ký
**When** Người dùng nhập đúng mã OTP trên trang kích hoạt
**Then** Trạng thái tài khoản chuyển thành `Active` và cho phép đăng nhập

### Story 1.3: Quản lý Hồ sơ & Số đo (Dành cho Chủ tiệm/Thợ may)

As a **Chủ tiệm hoặc Thợ may**,
I want **thêm nhanh hồ sơ khách hàng và nhập bộ số đo thủ công (Quick-Add)**,
So that **tôi có thể số hóa dữ liệu cho khách hàng trực tiếp tại tiệm**.

**Acceptance Criteria:**

**Given** Nhân viên đang ở trang Quản trị khách hàng
**When** Nhấn "Thêm khách hàng mới" và nhập Tên, SĐT, Email (tùy chọn) cùng bộ thông số đo (Cổ, Ngực, Eo, Mông...)
**Then** Hệ thống lưu trữ hồ sơ và liên kết với tài khoản khách hàng (nếu có) trong PostgreSQL

### Story 1.4: Quản lý & Tạo tài khoản Nhân viên (Dành cho Chủ tiệm)

As a **Chủ tiệm (Cô Lan)**,
I want **tạo tài khoản cho thợ may (Minh) trực tiếp tại trang Admin**,
So that **nhân viên có thể truy cập vào các công cụ sản xuất với đúng quyền hạn**.

**Acceptance Criteria:**

**Given** Cô Lan đang ở trang Quản trị nhân sự
**When** Cô nhập Email của nhân viên và gán vai trò `Tailor`
**Then** Hệ thống lưu Email vào danh sách nhân viên hợp lệ (Staff Whitelist)
**And** Nhân viên có thể đăng nhập bằng Google hoặc Email/Mật khẩu để truy cập quyền thợ may

### Story 1.5: Khởi tạo Tài khoản Chủ tiệm (System Seed)

As a **Quản trị viên hệ thống**,
I want **tài khoản chủ tiệm được cấu hình cứng trong file backend**,
So that **hệ thống luôn có một tài khoản quản trị tối cao (Owner) ngay khi khởi tạo**.

**Acceptance Criteria:**

**Given** File `config.py` tại backend chứa thông tin Email của chủ tiệm
**When** Hệ thống khởi động (Backend Start)
**Then** Hệ thống đảm bảo Email này luôn có vai trò `Owner` (Quyền quản trị tri thức cao nhất)

### Story 1.6: Thiết lập hạ tầng Multi-tenant & Local-first (Infrastructure Foundation)

As a **Kiến trúc sư hệ thống**,
I want **thiết lập cấu trúc Database hỗ trợ đa tiệm (Multi-tenant) và cơ chế Local-first**,
So that **hệ thống có thể vận hành ổn định tại một tiệm di sản và sẵn sàng mở rộng trong tương lai**.

**Acceptance Criteria:**

**Given** Database PostgreSQL 17 đã được khởi tạo
**When** Thực hiện thiết kế Schema cho các bảng `customers`, `measurements`, `designs`
**Then** Mọi bảng dữ liệu phải chứa cột `tenant_id` để thực hiện cách biệt dữ liệu (Isolation) (FR20)
**And** Hệ thống hỗ trợ cơ chế SQLite Local Sync hoặc caching tầng Edge để đảm bảo trải nghiệm Local-first (FR19)
**And** Các chính sách Row-Level Security (RLS) được thiết lập để đảm bảo thợ tiệm này không thể xem dữ liệu tiệm khác

## Epic 2: Trình biên dịch Cảm xúc & Cấu hình Phong cách (Style & Semantic Engine)

Xây dựng "não bộ" cho hệ thống, nơi khách hàng có thể chọn phong cách và AI dịch chúng thành các bộ chỉ số hình học (Ease Delta).

### Story 2.1: Lựa chọn Trụ cột Phong cách (Style Pillars)

As a **Khách hàng**,
I want **chọn một phong cách thiết kế định sẵn (vd: Minimalist, Traditional)**,
So that **hệ thống có thể nạp các quy tắc thẩm mỹ tương ứng**.

**Acceptance Criteria:**

**Given** Người dùng đang ở trang Design Session
**When** Người dùng chọn một "Style Pillar" (ví dụ: Modern Minimalist)
**Then** Hệ thống hiển thị các mô tả phong cách và cập nhật các thanh trượt cường độ (Sliders) liên quan
**And** Hệ thống nạp bộ quy tắc (Rules) từ Local Knowledge Base cho phong cách đó

### Story 2.2: Tinh chỉnh cường độ Phong cách (Adjective Intensity Sliders)

As a **Khách hàng**,
I want **điều chỉnh mức độ của các tính từ phong cách qua các thanh trượt**,
So that **tôi có thể tinh chỉnh thiết kế theo đúng cảm xúc cá nhân**.

**Acceptance Criteria:**

**Given** Người dùng đã chọn một phong cách
**When** Người dùng kéo thanh trượt cường độ (ví dụ: "Độ rộng tà áo" từ 0 đến 100%)
**Then** Hệ thống ghi nhận giá trị cường độ (Intensity) và gửi dữ liệu về backend
**And** Thanh trượt hiển thị các mốc "Tỷ lệ vàng" của nghệ nhân để hướng dẫn người dùng

### Story 2.3: Gợi ý chất liệu vải dựa trên Phong cách (Fabric Recommendation)

As a **Khách hàng**,
I want **nhận được gợi ý về loại vải phù hợp với phong cách đã chọn**,
So that **thiết kế cuối cùng đảm bảo tính thẩm mỹ và khả thi khi may**.

**Acceptance Criteria:**

**Given** Người dùng đã chọn phong cách và cường độ
**When** Người dùng yêu cầu gợi ý vải
**Then** Hệ thống đề xuất các loại vải (Lụa, Gấm, Voan...) dựa trên độ rủ và lý tính phù hợp với cấu trúc rập
**And** Hiển thị Fabric Card với hình ảnh texture và mô tả đặc tính vải

### Story 2.4: Dịch thuật Cảm xúc sang Ease Delta (Emotional Compiler Engine)

As a **Hệ thống (AI Engine)**,
I want **chuyển đổi cường độ phong cách thành các chỉ số hình học (Deltas)**,
So that **có dữ liệu chính xác để biến đổi bản vẽ rập**.

**Acceptance Criteria:**

**Given** Người dùng gửi yêu cầu thiết kế (Style + Intensity)
**When** API `/v1/inference/translate` được gọi
**Then** Backend (FastAPI + LangGraph) tra cứu Smart Rules của nghệ nhân
**And** Trả về Master Geometry JSON chứa các bộ Delta (ví dụ: `waist_ease: +2.0cm`)
**And** Thời gian phản hồi suy luận trung bình Lavg < 15 giây (NFR1)

### Story 2.5: Phác thảo Giao diện Rule Editor (Phase 2 Placeholder)

As a **Nghệ nhân (Cô Lan)**,
I want **có một giao diện cơ bản để xem và điều chỉnh các quy tắc (Smart Rules)**,
So that **tôi có thể trực tiếp số hóa bí kíp gia truyền mà không cần hỗ trợ từ lập trình viên**.

**Acceptance Criteria:**

**Given** Cô Lan đang ở trang Admin quản trị tri thức
**When** Cô truy cập vào mục "Smart Rules Editor"
**Then** Hệ thống hiển thị danh sách các quy tắc hiện có (Style Pillars, Ease Deltas) (FR21)
**And** Cho phép xem chi tiết logic của từng quy tắc (dưới dạng bảng hoặc JSON thô)
**And** Có nút "Lưu thay đổi" để cập nhật dữ liệu vào Local Knowledge Base (LKB)

## Epic 3: Bộ máy Biến đổi Hình học & Bản vẽ Blueprint (Geometry & Visualization)

Áp dụng Delta vào mẫu rập chuẩn dựa trên số đo thực tế và hiển thị bản vẽ SVG mượt mà thông qua Adaptive Canvas.

### Story 3.1: Adaptive Canvas & Khởi tạo Rập chuẩn (Baseline Rendering)

As a **Khách hàng hoặc Thợ may**,
I want **thấy bản vẽ rập chuẩn (Baseline) hiển thị trên màn hình thiết kế**,
So that **tôi có một điểm tựa trực quan trước khi bắt đầu chỉnh sửa**.

**Acceptance Criteria:**

**Given** Người dùng bắt đầu một phiên thiết kế (Design Session)
**When** Hệ thống nạp mẫu trang phục và số đo khách hàng
**Then** Giao diện Adaptive Canvas hiển thị bản vẽ rập SVG chuẩn xác
**And** Bản vẽ phải được dựng từ các thông số cơ bản (Base Measurements) một cách chính xác (ΔG ≤ 1mm)

### Story 3.2: Biến đổi Rập thời gian thực (Geometric Elasticity)

As a **Khách hàng**,
I want **thấy bản vẽ rập biến đổi mượt mà khi tôi kéo thanh trượt phong cách**,
So that **tôi có thể cảm nhận trực quan sự thay đổi của thiết kế ngay lập tức**.

**Acceptance Criteria:**

**Given** Người dùng đang điều chỉnh cường độ phong cách qua Sliders
**When** Giá trị thanh trượt thay đổi
**Then** Frontend sử dụng thuật toán nội suy (Interpolation) để tính toán lại tọa độ các Node trên SVG Path
**And** Hiệu ứng biến đổi (Morphing) đạt độ trễ phản hồi UI < 200ms (NFR10)
**And** Các điểm biến đổi tuân thủ đúng công thức hình học: $P_{final} = P_{base} + \alpha \cdot \Delta_{preset}$

### Story 3.3: So sánh thiết kế với Rập chuẩn (Comparison Overlay)

As a **Khách hàng**,
I want **xem lớp phủ bóng mờ của rập chuẩn đè lên rập đang tùy chỉnh**,
So that **tôi nhận ra sự khác biệt và mức độ cá nhân hóa của thiết kế hiện tại**.

**Acceptance Criteria:**

**Given** Người dùng đã thực hiện các thay đổi về phong cách
**When** Người dùng bật chế độ "Comparison Mode"
**Then** Hệ thống hiển thị rập chuẩn dưới dạng lớp phủ (Overlay) bóng mờ với màu sắc tương phản
**And** Các điểm chênh lệch (Deltas) được làm nổi bật trực quan

### Story 3.4: Đóng gói dữ liệu SSOT (Master Geometry JSON Generation)

As a **Hệ thống**,
I want **đóng gói toàn bộ thông số hình học sau biến đổi vào một file JSON duy nhất**,
So that **dữ liệu được truyền tải và lưu trữ đồng nhất (Single Source of Truth)**.

**Acceptance Criteria:**

**Given** Người dùng nhấn "Lock Design" để hoàn tất thiết kế
**When** Hệ thống gửi yêu cầu lưu trữ
**Then** Một file Master Geometry JSON được tạo ra chứa: sequence_id, base_hash, deltas, và geometry_hash
**And** Hệ thống kiểm tra tính toàn vẹn (Checksum) trước khi lưu vào Database (NFR5)

## Epic 4: Hệ thống Kiểm soát Vật lý & Phê duyệt Kỹ thuật (Guardrails & Tailor Review)

Tích hợp các ràng buộc toán học để ngăn chặn lỗi vật lý và cho phép thợ may ghi đè (Override) thủ công trước khi xuất bản vẽ sản xuất.

### Story 4.1a: Lõi kiểm tra Ràng buộc Vật lý (Deterministic Guardrails Logic)

As a **Hệ thống (Backend)**,
I want **tự động kiểm tra các ràng buộc vật lý (vd: vòng nách vs bắp tay)**,
So that **ngăn chặn các thiết kế vi phạm quy luật cơ học và không thể may được**.

**Acceptance Criteria:**

**Given** Backend nhận được các giá trị Delta mới
**When** API `/v1/guardrails/check` được gọi
**Then** Hệ thống (Pydantic v2) chạy bộ lọc "Hard Constraints" (vd: chu vi nách rập ≥ chu vi bắp tay khách) (FR9)
**And** Nếu vi phạm nghiêm trọng, trả về mã lỗi kèm lý do chi tiết để chặn xuất bản vẽ (FR10)

### Story 4.1b: Hiển thị Cảnh báo Kỹ thuật Trực tiếp (Inline Guardrails UI)

As a **Khách hàng hoặc Thợ may**,
I want **thấy các cảnh báo kỹ thuật ngay khi đang điều chỉnh thiết kế**,
So that **tôi hiểu được lý do tại sao một số tùy chỉnh bị hạn chế**.

**Acceptance Criteria:**

**Given** Người dùng đang thay đổi thiết kế trên Adaptive Canvas
**When** Backend trả về kết quả Guardrail Check
**Then** Hệ thống hiển thị các cảnh báo nhẹ (Soft Constraints) dưới dạng Tooltip hoặc Inline Hint (vd: "Hạ nách hơi cao, có thể gây cấn tay") (FR11)
**And** Nếu vi phạm nặng, thanh trượt Sliders tự động snap-back về vị trí an toàn gần nhất

### Story 4.2: Bảng đối soát Kỹ thuật cho Thợ may (Artisan Sanity Check Dashboard)

As a **Thợ may (Minh)**,
I want **xem bảng đối soát 3 cột (Số đo khách - Mẫu chuẩn - Đề xuất AI)**,
So that **tôi có cái nhìn toàn diện về sự khác biệt trước khi cắt rập**.

**Acceptance Criteria:**

**Given** Minh đang xem xét thiết kế của khách hàng
**When** Anh truy cập vào Sanity Check Dashboard
**Then** Hệ thống hiển thị bảng 3 cột: 1. Số đo cơ thể (Body), 2. Mẫu chuẩn (Base), 3. Đề xuất của AI (Suggested)
**And** Các con số sai lệch (Deltas) được bôi màu nổi bật để dễ dàng nhận diện

### Story 4.3: Ghi đè & Phản hồi từ Nghệ nhân (Manual Override & Feedback Loop)

As a **Thợ may**,
I want **ghi đè (Override) các thông số do AI đề xuất dựa trên kinh nghiệm thực tế**,
So that **quyết định cuối cùng luôn thuộc về chuyên môn con người (Human-in-the-loop)**.

**Acceptance Criteria:**

**Given** Minh phát hiện một thông số AI đề xuất chưa tối ưu cho chất liệu vải đặc thù
**When** Minh thực hiện thay đổi giá trị thủ công
**Then** Hệ thống lưu lại giá trị ghi đè và đánh dấu (Flag) cho lần học sau của AI (Atelier Academy)
**And** Ghi log chi tiết lý do ghi đè của thợ may (NFR9)

### Story 4.4: Xuất Bản vẽ Sản xuất (Manufacturing Blueprint & DXF/SVG Export)

As a **Thợ may (Minh)**,
I want **xuất bản vẽ kỹ thuật chi tiết dưới dạng SVG hoặc DXF**,
So that **tôi có thể in rập hoặc chiếu lên vải để bắt đầu cắt chế tác**.

**Acceptance Criteria:**

**Given** Thiết kế đã được phê duyệt và vượt qua các Guardrails
**When** Thợ Minh nhấn "Export for Production"
**Then** Hệ thống tạo file SVG (hiển thị) và file DXF (chuẩn CAD cho máy cắt)
**And** Bản vẽ bao gồm các thông số gia giảm (+/- cm) chi tiết cho từng vị trí rập
**And** Sử dụng 100% thuật ngữ chuyên ngành may Việt Nam trên bản vẽ (NFR11)

## Epic 5: Quản lý Kho đồ thuê & Showroom Số (Rental & Inventory Management)

Xây dựng danh mục đồ thuê trực tuyến và hệ thống cập nhật trạng thái "2 chạm" giúp tối ưu hóa vận hành tiệm.

### Story 5.1: Danh mục sản phẩm trưng bày số (Digital Showroom Catalog)

As a **Khách hàng**,
I want **xem danh sách áo dài cho thuê với hình ảnh và mô tả chi tiết**,
So that **tôi có thể chọn được bộ đồ ưng ý trước khi đến tiệm**.

**Acceptance Criteria:**

**Given** Khách hàng truy cập trang Showroom
**When** Hệ thống nạp danh sách từ cơ sở dữ liệu
**Then** Hiển thị các thẻ sản phẩm (Cards) gồm: Hình ảnh, Tên bộ đồ, Mô tả, Kích cỡ cơ bản (S/M/L) và Giá thuê
**And** Có bộ lọc theo màu sắc hoặc dịp lễ (vd: Lễ cưới, Khai trương)

### Story 5.2: Theo dõi Lịch trình & Trạng thái đồ thuê (Return Timeline & Status)

As a **Khách hàng**,
I want **biết chính xác bộ đồ tôi thích khi nào sẽ sẵn sàng để thuê**,
So that **tôi có thể sắp xếp lịch trình cá nhân phù hợp**.

**Acceptance Criteria:**

**Given** Khách hàng đang xem chi tiết một bộ đồ đang được thuê (`Rented`)
**When** Hệ thống kiểm tra lịch trình trả đồ
**Then** Hiển thị dòng trạng thái: "Dự kiến sẵn sàng vào: [Ngày/Tháng]"
**And** Trạng thái phải được cập nhật thời gian thực dựa trên dữ liệu kho

### Story 5.3: Cập nhật trạng thái Kho "2 chạm" (2-Touch Inventory Update)

As a **Chủ tiệm (Cô Lan)**,
I want **cập nhật trạng thái đồ thuê chỉ với 2 lần chạm màn hình**,
So that **tiết kiệm thời gian quản trị và dữ liệu kho luôn chính xác**.

**Acceptance Criteria:**

**Given** Cô Lan đang xem danh sách quản lý kho trên thiết bị di động
**When** Chạm 1: Chọn bộ đồ vừa được trả | Chạm 2: Chọn trạng thái "Maintenance" (Giặt ủi/Sửa chữa)
**Then** Hệ thống ngay lập tức cập nhật trạng thái mới và tính toán ngày sẵn sàng tiếp theo
**And** Giao diện phải tối giản, phông chữ Serif trang nhã phù hợp với phong cách của tiệm

### Story 5.4: Thông báo nhắc nhở trả đồ tự động

As a **Chủ tiệm**,
I want **hệ thống tự động gửi thông báo nhắc khách trả đồ trước 1 ngày**,
So that **quy trình thu hồi đồ diễn ra đúng hạn mà không cần tốn công liên lạc thủ công**.

**Acceptance Criteria:**

**Given** Một đơn thuê đồ đang ở trạng thái `Rented`
**When** Đến thời điểm 24 giờ trước hạn trả đồ
**Then** Hệ thống tự động gửi Email/Thông báo nhắc nhở cho khách hàng
**And** Thông báo bao gồm tên bộ đồ, thời hạn và địa chỉ trả đồ của tiệm



