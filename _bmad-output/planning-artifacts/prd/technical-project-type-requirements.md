# Technical & Project-Type Requirements

## Technical Architecture
- **Single Source of Truth (SSOT):** Sử dụng Master Geometry Specification làm cầu nối duy nhất.
- **Logic Hình học lõi:** Áp dụng công thức $P_{final} = P_{base} + \alpha \cdot \Delta_{preset}$.

## API Endpoint Specifications
- **/v1/inference/translate:** Dịch thuật từ Cảm xúc sang Ease Profile.
- **/v1/blueprint/generate:** Áp dụng Delta vào mẫu rập chuẩn dựa trên số đo thực tế.
- **/v1/guardrails/check:** Kiểm tra vi phạm vật lý và rủi ro hình học trước khi xuất bản vẽ.

## Data Schema & Knowledge Base
- **Master Geometry Structure:** Tọa độ (x,y), Metadata vải, Ease Profile và tham chiếu rập gốc.
- **Manufacturing Standards:** Hỗ trợ xuất dữ liệu SVG (hiển thị) và DXF (sản xuất).
