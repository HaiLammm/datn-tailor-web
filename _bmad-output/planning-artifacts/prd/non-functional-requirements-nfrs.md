# Non-Functional Requirements (NFRs)

## 1. Performance & Scalability
- **NFR1 (Latency):** Thời gian phản hồi chu trình suy luận LangGraph trung bình Lavg < 15 giây, đo lường bằng hệ thống giám sát hiệu năng (APM) qua 100 request liên tục.
- **NFR2 (Throughput):** Hệ thống hỗ trợ xử lý ít nhất 5 yêu cầu suy luận đồng thời, kiểm chứng qua Load Testing trong môi trường staging.

## 2. Accuracy & Reliability
- **NFR3 (Geometric Precision):** Sai số hình học tuyệt đối ΔG không vượt quá 1mm so với tính toán lý thuyết, xác minh bằng công cụ kiểm tra tọa độ node trên bản vẽ vector SVG/DXF.
- **NFR4 (Availability):** Hệ thống sẵn sàng hoạt động 99.9% thời gian làm việc của tiệm, theo dõi qua uptime monitor của hạ tầng cloud.
- **NFR5 (Data Integrity):** Master Geometry Specification được kiểm tra tính toàn vẹn thông qua mã băm (Checksum) trước khi lưu trữ và truyền tải.

## 3. Security & Privacy
- **NFR6 (Authentication):** Xác thực đa yếu tố cho mọi phiên làm việc tại tiệm, kiểm chứng bằng nhật ký truy cập (Audit Log).
- **NFR7 (Authorization):** Tuân thủ RBAC chặt chẽ để bảo vệ bí kíp Golden Rules, xác minh bằng kiểm thử phân quyền định kỳ.
- **NFR8 (Data Encryption):** Mã hóa dữ liệu số đo và tri thức di sản ở trạng thái nghỉ (at rest) bằng tiêu chuẩn AES-256.

## 4. Maintainability & Usability
- **NFR9 (Logging):** Ghi log chi tiết 100% các quyết định AI và các lần thợ may ghi đè (Override) để phục vụ Atelier Academy.
- **NFR10 (Usability):** Giao diện Adaptive Canvas phản hồi trực quan (UI response) trong vòng < 200ms khi người dùng kéo Sliders, đo bằng công cụ DevTools browser.
- **NFR11 (Terminology):** Sử dụng 100% thuật ngữ chuyên môn ngành may Việt Nam, xác thực thông qua bảng đối soát thuật ngữ (Terminology Glossary) được nghệ nhân phê duyệt.
