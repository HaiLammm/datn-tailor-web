---
stepsCompleted: ["step-01-init", "step-02-discovery", "step-03-success", "step-04-journeys", "step-05-domain", "step-06-innovation", "step-07-project-type", "step-08-scoping", "step-09-functional", "step-10-nonfunctional", "step-11-polish", "step-e-01-discovery", "step-e-02-review", "step-e-03-edit"]
inputDocuments: ["_bmad-output/planning-artifacts/product-brief-tailor_project-2026-02-17.md", "_bmad-output/planning-artifacts/research/technical-semantic-to-geometric-translation-architecture-2026-02-17.md", "_bmad-output/analysis/brainstorming-session-2026-02-16.md"]
workflowType: "prd"
documentCounts: {briefCount: 1, researchCount: 1, brainstormingCount: 1, projectDocsCount: 0}
classification:
  projectType: "SaaS B2B / Manufacturing Design Tool"
  domain: "Fashion & Manufacturing (Heritage Customization)"
  complexity: "High"
  projectContext: "greenfield"
lastEdited: "Saturday, February 21, 2026"
---

# Product Requirements Document - tailor_project

**Author:** Lem
**Date:** Wednesday, February 18, 2026

## Executive Summary
Dự án **tailor_project** là một hệ thống thiết kế may đo thông minh nhằm xóa bỏ "khoảng cách ngôn ngữ" giữa mong muốn cảm tính của khách hàng và thông số kỹ thuật của thợ may. Thông qua trình biên dịch **Physical-Emotional Compiler**, hệ thống chuyển đổi các tính từ trừu tượng thành các trị số hình học chính xác (**Geometric Delta**), đảm bảo sự vừa vặn tuyệt đối cả về vật lý lẫn thẩm mỹ, đồng thời số hóa và bảo tồn tri thức di sản của các nghệ nhân may đo lâu đời.

## Success Criteria

### User Success

*   **Chỉ số Thỏa mãn Kỹ thuật:** Đạt điểm **> 4.5/5** từ các nghệ nhân may đo về độ minh bạch và đầy đủ của bản vẽ Blueprint.
*   **Độ chính xác Cảm xúc:** Chỉ số Semantic Fidelity **> 4.0/5** thông qua khảo sát sự khớp lệnh giữa "tính từ" khách hàng chọn và cảm nhận thực tế về thiết kế.
*   **Tỷ lệ First-Fit:** Đạt **> 90%** độ vừa vặn vật lý ngay lần cắt vải đầu tiên, không cần chỉnh sửa lớn về cấu trúc rập.

### Business Success

*   **Hiệu suất Vận hành:** Giảm **70% thời gian tư vấn** (từ 60 phút xuống còn 15 phút) nhờ hệ thống chuẩn bị sẵn các phương án Blueprint.
*   **Mô hình Di sản:** Số hóa thành công ít nhất **50+ Smart Rules** (bí kíp ngầm) từ các nghệ nhân vào hệ thống "Atelier Academy".
*   **Giá trị Kế thừa:** Minh (thợ F2) có thể thực hiện cắt rập chính xác cho các mẫu phức tạp mà không cần sự hỗ trợ trực tiếp từ nghệ nhân chủ tiệm.

### Technical Success

*   **Geometric Integrity:** Tỷ lệ lỗi logic hình học **E = 0%**. Lớp Guardrail (Pydantic) ngăn chặn tuyệt đối các thiết kế vi phạm vùng an toàn vật lý.
*   **Hiệu năng Suy luận:** Thời gian phản hồi trung bình **Lavg < 15 giây** cho toàn bộ chu trình LangGraph (từ Input đến Blueprint).
*   **Độ chính xác Tìm kiếm:** Search Precision **P@3 > 85%** cho các gợi ý vải và quy tắc dựa trên "tính từ" phong cách.
*   **Sai số Toán học:** Sai số hình học tuyệt đối **ΔG ≤ 1mm** so với tính toán lý thuyết trên bản vẽ rập.

### Measurable Outcomes

*   **Lavg < 15s** (Đo lường qua 100 request liên tục).
*   **P@3 > 85%** (Đối chứng giữa gợi ý AI và thẩm định của nghệ nhân).
*   **Error Rate = 0%** (Kiểm thử với 50 bộ số đo cực đoan - Edge cases).
*   **ΔG ≤ 0.1cm** (So sánh tọa độ node trên bản vẽ AI và bản vẽ chuẩn).

## Product Scope

### MVP - Minimum Viable Product (Phase 1)
**Trọng tâm: "Lõi Thực thi Chính xác & Quản lý Vận hành"**
- **Sản phẩm:** Một loại trang phục duy nhất (Áo dài truyền thống & cách tân).
- **Cấu trúc:** Hệ thống Local-First cho một tiệm may di sản duy nhất.
- **Lõi Kỹ thuật:** 
    - Physical-Emotional Compiler dịch thuật Adjective -> Delta.
    - Master Geometry JSON làm Nguồn sự thật duy nhất (SSOT).
    - Deterministic Guardrails (Pydantic) chặn đứng lỗi vật lý.
- **Module Bổ sung:** 
    - **Rental Management (CRUD):** "Cửa sổ trưng bày số" giúp quản lý kho đồ thuê, tra cứu trạng thái và lịch hẹn trả đồ nhanh chóng.

### Growth Features (Phase 2)
**Trọng tâm: "Số hóa Quy trình & Kế thừa"**
- **Rule Editor UI:** Giao diện cho nghệ nhân tự nhập và điều chỉnh các Smart Rules.
- **Body Version Control:** Quản lý lịch sử và biến đổi hình thể khách hàng theo thời gian.
- **Mở rộng Biến thể:** Hỗ trợ các cấu trúc cổ, tay và tà Áo dài phức tạp hơn.

### Vision (Phase 3)
**Trọng tâm: "Hệ sinh thái May đo Số"**
- **Atelier Academy:** AI tự học và tinh chỉnh thẩm mỹ từ phản hồi thực tế của nghệ nhân.
- **Tích hợp CAD/CNC:** Xuất trực tiếp file lệnh cho máy cắt tự động.
- **Mô phỏng 3D:** Trải nghiệm "Fitting" ảo trên Avatar 3D cá nhân hóa.

## User Journeys

### Journey 1: Linh - "Hiện đại hóa niềm tin truyền thống" (Khách hàng)
- **Mở đầu:** Linh (Nhà thiết kế số) tìm đến tiệm may di sản vì tin vào tay nghề nghệ nhân, nhưng lo lắng chú thợ không hiểu phong cách "Minimalist" (Tối giản) của cô.
- **Tương tác:** 
    - **May đo:** Linh và thợ may cùng sử dụng **Adaptive Canvas** để điều chỉnh phong cách. Linh thấy lớp phủ **Comparison Overlay** so sánh rập chuẩn và rập tùy chỉnh.
    - **Thuê đồ:** Linh truy cập danh mục "Áo dài sẵn có", xem hình ảnh, size và trạng thái thực tế của bộ đồ cô thích. Cô thấy dòng chữ "Dự kiến sẵn sàng vào: 25/02/2026" và quyết định đặt lịch hẹn.
- **Kết thúc:** Linh nhận được bộ đồ vừa vặn cả về số đo lẫn tâm hồn. Sự mơ hồ biến mất hoàn toàn nhờ dữ liệu hình học trực quan.

### Journey 2: Minh (F2) - "Số hóa đôi tay cha ông" (Người thợ kế thừa)
- **Mở đầu:** Minh là con trai chủ tiệm, đang học nghề. Anh có sức trẻ nhưng chưa có kinh nghiệm xử lý các dáng người đặc biệt như cha mình.
- **Tương tác:** Minh mở **Manufacturing Blueprint** và nhận các con số gia giảm (**Geometric Delta**) chi tiết. Guardrail cảnh báo: "Vải lụa tơ tằm dãn canh vải, nới thêm 0.5cm sườn".
- **Cao trào:** Minh nhận ra đây là bí kíp cha anh đã đúc kết hàng chục năm. Nhờ AI hỗ trợ, anh tự tin cầm kéo cắt rập chính xác mà không cần hỏi cha từng li một.
- **Kết thúc:** Minh rút ngắn thời gian học nghề, tiệm có thêm một tay kéo vững vàng dựa trên tri thức được số hóa.

### Journey 3: Cô Lan - "Bảo hiểm bí kíp gia truyền" (Chủ tiệm/Founder)
- **Mở đầu:** Cô Lan muốn nghỉ hưu nhưng trăn trở vì khách quen sẽ rời đi nếu không ai may "ra đúng cái chất" riêng biệt của cô.
- **Diễn biến:** 
    - **Quản trị tri thức:** Cô Lan trực tiếp tham gia quá trình mã hóa các "mẹo" nghề vào hệ thống.
    - **Quản lý vận hành:** Cô sử dụng Dashboard cho thuê trên điện thoại, chỉ với 2 lần chạm để cập nhật trạng thái "Đang giặt ủi" cho bộ áo dài Linh vừa trả, hệ thống tự động tính ngày sẵn sàng cho khách tiếp theo.
- **Kết thúc:** Cô Lan yên tâm nghỉ hưu, giá trị của tiệm giờ đây nằm ở hệ thống tri thức đã được số hóa trọn vẹn và quy trình vận hành trơn tru.

## Domain-Specific Requirements

### Bespoke Constraints & Legacy Digitization
- **Local Knowledge Base (LKB):** Hệ thống RAG ưu tiên tuyệt đối các quy tắc di sản của tiệm hơn là kiến thức may mặc phổ thông.
- **Geometric Precision:** Sai số hình học ΔG mục tiêu đạt mức **0.5mm**, đáp ứng tiêu chuẩn khắt khe của may đo cao cấp.

### Internal Governance & "The Vault"
- **Bảo mật Di sản:** Bảo vệ "Hầm chứa tri thức" (Smart Rules) khỏi truy cập trái phép, đảm bảo bí mật kinh doanh gia đình.
- **Role-Based Access (RBAC):** Phân quyền rõ ràng giữa Cô Lan (Quyền quản trị tri thức) và Minh (Quyền thực thi sản xuất).

### Physical-Digital Integration
- **SVG/DXF Export:** Xuất bản vẽ vector chuẩn xác cho việc in ấn rập hoặc chiếu lên vải.
- **Manual Override:** Thợ may có quyền ghi đè gợi ý của AI dựa trên cảm nhận thực tế về bề mặt và lỗi vải tự nhiên.

### Innovation & Novel Patterns

#### Detected Innovation Areas
- **Physical-Emotional Compiler:** Định lượng hóa các khái niệm trừu tượng thành trị số hình học (Geometric Delta).
- **Atelier Academy:** Chuyển đổi tri thức ngầm (Tacit Knowledge) thành hệ thống AI. 
    - **Learning Loop:** AI hấp thụ tri thức thông qua phản hồi trực tiếp của nghệ nhân (Human-in-the-loop). Mỗi lần nghệ nhân thực hiện **Override** (Ghi đè) đề xuất của AI, hệ thống sẽ phân tích lý do (chất liệu, lỗi vải, gu riêng) để tinh chỉnh các Golden Rules cho lần sau.
- **Adaptive Canvas:** Giao diện hợp tác trực quan dựa trên dữ liệu hình học thời gian thực.

### Market Context & Competitive Landscape
- **Differentiator:** Lấp đầy khoảng trống giữa App chọn size phổ thông hời hợt và Phần mềm CAD chuyên dụng khô khan bằng cách kết hợp sự bay bổng của AI với tính thực thi hình học.

### Risk Mitigation
- **Deterministic Guardrails:** Chặn đứng các lỗi vi phạm vật lý tại tầng dữ liệu thông qua kiểm tra ràng buộc toán học.
- **Manual Override:** Duy trì yếu tố con người (Human-in-the-loop) để xử lý các biến số vật liệu không thể dự đoán.

## Technical & Project-Type Requirements

### Technical Architecture
- **Single Source of Truth (SSOT):** Sử dụng Master Geometry JSON (PostgreSQL JSONB) làm cầu nối duy nhất.
- **Master Geometry JSON Example:**
```json
{
  "pattern_id": "AD-001",
  "base_measurements": {"neck": 32, "bust": 84, "waist": 66},
  "emotional_deltas": {
    "style": "Minimalist",
    "ease_factor": 1.2,
    "nodes": [
      {"id": "shoulder_L", "delta_x": 0.5, "delta_y": -0.2},
      {"id": "waist_line", "offset": 1.5}
    ]
  },
  "physical_constraints": {"material": "Silk", "safety_margin": 0.3}
}
```
- **Logic Hình học lõi:** Áp dụng công thức $P_{final} = P_{base} + \alpha \cdot \Delta_{preset}$.

### API Endpoint Specifications (FastAPI)
- **/v1/inference/translate:** Dịch thuật từ Cảm xúc (Adjective + Intensity) sang Ease Profile.
- **/v1/blueprint/generate:** Áp dụng Delta vào mẫu rập chuẩn dựa trên số đo thực tế.
- **/v1/guardrails/check:** Kiểm tra vi phạm vật lý và rủi ro hình học trước khi xuất bản vẽ.

### Data Schema & Knowledge Base
- **Master Geometry JSON Structure:** Tọa độ (x,y), Metadata vải (Φ), Ease Profile và tham chiếu rập gốc.
- **Manufacturing Standards:** Hỗ trợ xuất dữ liệu SVG (hiển thị) và DXF (sản xuất).

## Functional Requirements

### 1. Style & Semantic Interpretation
- **FR1:** Người dùng có thể chọn các Trụ cột Phong cách (Style Pillars) định sẵn.
- **FR2:** Người dùng có thể điều chỉnh cường độ phong cách qua Sliders.
- **FR3:** Hệ thống có thể dịch thuật lựa chọn phong cách thành các bộ chỉ số Ease Delta.
- **FR4:** Hệ thống có thể gợi ý vải phù hợp dựa trên phong cách và cấu trúc trang phục.

### 2. Geometric Transformation Engine
- **FR5:** Hệ thống có thể áp dụng Ease Delta vào mẫu rập chuẩn (Golden Base Pattern).
- **FR6:** Hệ thống có thể tính toán tọa độ (x,y) mới dựa trên số đo thực tế của khách hàng.
- **FR7:** Hệ thống có thể tạo Master Geometry JSON chứa thông số hình học sau biến đổi.
- **FR8:** Hệ thống có thể xuất bản vẽ Blueprint (SVG) để hiển thị trực quan.

### 3. Deterministic Guardrails & Validation
- **FR9:** Hệ thống tự động kiểm tra các ràng buộc vật lý (ví dụ: vòng nách vs bắp tay).
- **FR10:** Hệ thống ngăn chặn xuất Blueprint nếu vi phạm các quy tắc hình học Golden Rules.
- **FR11:** Hệ thống đưa ra cảnh báo kỹ thuật khi thông số nằm sát vùng nguy hiểm.
- **FR12:** Thợ may có thể ghi đè (Override) thủ công các đề xuất của AI.

### 4. Tailor Collaboration & Production
- **FR13:** Người dùng có thể xem lớp phủ Overlay so sánh rập chuẩn và rập tùy chỉnh.
- **FR14:** Thợ may có thể sử dụng Sanity Check Dashboard để đối chiếu số đo khách và đề xuất AI.
- **FR15:** Hệ thống xuất thông số gia giảm (+/- cm) chi tiết cho từng vị trí cắt rập.
- **FR16:** Hệ thống quản lý và bảo vệ bí kíp Golden Rules nội bộ.

### 5. Measurement & Profile Management
- **FR17:** Thợ may có thể nhập và lưu trữ bộ số đo chi tiết cho từng khách hàng.
- **FR18:** Hệ thống liên kết số đo khách hàng với các phiên bản rập tùy chỉnh tương ứng.

### 6. Rental Catalog & Status (Digital Showroom)
- **FR22 (Digital Catalog):** Hệ thống hiển thị danh sách áo dài cho thuê với đầy đủ hình ảnh, mô tả và kích thước cơ bản.
- **FR23 (Availability Status):** Hiển thị trạng thái thực tế của từng bộ đồ: Available (Sẵn sàng), Rented (Đang thuê), Maintenance (Giặt ủi/Sửa chữa).
- **FR24 (Return Timeline):** Hiển thị ngày dự kiến bộ đồ sẽ quay lại kho để khách hàng theo dõi.
- **FR25 (Inventory Admin):** Chủ tiệm có quyền thêm/xóa/sửa thông tin bộ đồ và cập nhật trạng thái nhanh chóng (2-3 lần chạm).

## Non-Functional Requirements (NFRs)

### 1. Performance & Scalability
- **NFR1 (Latency):** Thời gian phản hồi chu trình suy luận LangGraph trung bình Lavg < 15 giây.
- **NFR2 (Throughput):** Hệ thống hỗ trợ xử lý ít nhất 5 yêu cầu suy luận đồng thời.

### 2. Accuracy & Reliability
- **NFR3 (Geometric Precision):** Sai số hình học tuyệt đối ΔG không vượt quá 1mm so với tính toán lý thuyết.
- **NFR4 (Availability):** Hệ thống sẵn sàng hoạt động 99.9% thời gian làm việc của tiệm.
- **NFR5 (Data Integrity):** Master Geometry JSON được kiểm tra tính toàn vẹn (Checksum) trước khi lưu trữ.

### 3. Security & Privacy
- **NFR6 (Authentication):** Xác thực người dùng cho mọi phiên làm việc tại tiệm.
- **NFR7 (Authorization):** Tuân thủ RBAC để bảo vệ các bí kíp Golden Rules di sản.
- **NFR8 (Data Encryption):** Mã hóa dữ liệu số đo và tri thức di sản ở trạng thái nghỉ (at rest).

### 4. Maintainability & Usability
- **NFR9 (Logging):** Ghi log chi tiết các quyết định AI và các lần thợ may ghi đè (Override).
- **NFR10 (Usability):** Giao diện Adaptive Canvas phản hồi trực quan trong vòng < 200ms khi người dùng kéo Sliders.
- **NFR11 (Terminology):** Sử dụng 100% thuật ngữ chuyên môn ngành may Việt Nam trong toàn bộ hệ thống.
