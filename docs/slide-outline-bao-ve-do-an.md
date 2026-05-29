# Outline Slide Bảo Vệ Đồ Án Tốt Nghiệp

> **Đề tài:** Hệ thống quản lý tiệm may áo dài — Nhà May Thanh Lộc
> **Thời lượng:** 30 phút (~25 slides nội dung + 2-3 slides mở/đóng)
> **Trọng tâm:** Nghiệp vụ chuyên môn ngành may đo & lý do chọn đề tài

---

## PHẦN 1: MỞ ĐẦU (Slides 1-2) — ~1 phút

### Slide 1 — Trang bìa
- Tên đề tài: Xây dựng hệ thống quản lý tiệm may áo dài
- Tên thương mại: Nhà May Thanh Lộc
- Họ tên, MSSV, lớp
- GVHD
- Năm 2026

### Slide 2 — Nội dung trình bày
- Mục lục 5-6 phần chính (dạng timeline hoặc numbered list)

---

## PHẦN 2: TẠI SAO TÔI CHỌN ĐỀ TÀI NÀY (Slides 3-5) — ~4 phút

### Slide 3 — Thực trạng ngành may đo áo dài
**Speaker notes:**
Ngành may áo dài vẫn vận hành theo cách truyền thống: khách đến tiệm, thợ may ghi số đo vào sổ tay, trao đổi bằng miệng, rồi tự cắt theo kinh nghiệm. Mọi thứ phụ thuộc vào trí nhớ và tay nghề của một người duy nhất.

- Bullet 1: Tiệm may nhỏ quản lý bằng sổ tay, Excel, Zalo — không có hệ thống nào dành riêng cho ngành
- Bullet 2: Khách muốn mua, thuê, đặt may — mỗi loại một quy trình khác nhau, chưa ai gom lại được
- Bullet 3: Thợ may giỏi thì bận, thợ mới thì chưa đủ kinh nghiệm — không có cách nào truyền lại tri thức ngoài "đứng cạnh mà học"

### Slide 4 — Khoảng trống trên thị trường
**Speaker notes:**
Tôi đã tìm hiểu các phần mềm quản lý tiệm may hiện có. Phần lớn là phần mềm quản lý bán hàng chung chung, không hiểu đặc thù nghề may: không có khái niệm "số đo khách hàng", không phân biệt đơn mua/thuê/đặt may, không hỗ trợ phân công thợ may.

- Phần mềm POS/bán hàng thông thường: không hiểu nghiệp vụ may đo
- Phần mềm quốc tế (Tailornova, Bootstrap Fashion): thiết kế cho thị trường phương Tây, không phù hợp áo dài Việt Nam
- Chưa có giải pháp nào gom mua + thuê + đặt may vào một hệ thống duy nhất

### Slide 5 — Mục tiêu đồ án
**Speaker notes:**
Vì vậy, đồ án này xây dựng một hệ thống quản lý toàn diện cho tiệm may áo dài — từ lúc khách bước vào cửa tiệm cho đến lúc nhận đồ về. Hệ thống phục vụ 3 đối tượng: khách hàng, chủ tiệm, và thợ may.

- Số hoá toàn bộ quy trình vận hành tiệm may áo dài
- Phục vụ 3 vai trò: Khách hàng — Chủ tiệm — Thợ may
- Hỗ trợ 3 loại dịch vụ: Mua sẵn, Thuê, Đặt may (Bespoke)

---

## PHẦN 3: NGHIỆP VỤ CHUYÊN MÔN NGÀNH MAY (Slides 6-14) — ~10 phút

> Đây là phần trọng tâm — trình bày để hội đồng thấy bạn thực sự hiểu nghề may, không phải chỉ viết code.

### Slide 6 — Vấn đề 1: Khách nói một đằng, thợ hiểu một nẻo
**Speaker notes:**
Khi khách đến tiệm may, họ thường diễn đạt mong muốn bằng cảm xúc: "Em muốn kiểu thanh lịch", "Chị thích dáng ôm nhưng không bó", "Làm cho thoải mái nhưng vẫn sang". Những từ này hoàn toàn có nghĩa với khách, nhưng với thợ may thì quá mơ hồ. "Thanh lịch" của người này khác "thanh lịch" của người kia. Thợ may phải tự đoán — và đoán sai thì phải sửa, tốn thời gian và vật liệu.

- Khách hàng nói: "Chị muốn kiểu thanh lịch, ôm nhẹ"
- Thợ may nghe: thanh lịch là gì? Ôm nhẹ là ôm bao nhiêu cm?
- Kết quả: đồ may xong đẹp nhưng "không phải ý chị" → phải sửa lại
- Con số thực tế: buổi tư vấn ban đầu có thể mất 45-60 phút chỉ để "dò" xem khách muốn gì

### Slide 7 — Vấn đề 2: Đồ may sẵn không vừa ai cả
**Speaker notes:**
Áo dài may sẵn theo bảng size S, M, L — nhưng cơ thể mỗi người khác nhau. Một người cao 1m65 nhưng eo nhỏ, người khác cũng cao 1m65 nhưng vai rộng. Cả hai mặc size M đều không vừa. Bảng size chỉ là con số trung bình — và trung bình thì không vừa với ai cụ thể. Đây là lý do mà dịch vụ may đo vẫn tồn tại, dù đồ may sẵn rẻ hơn nhiều.

- Bảng size S-M-L được tính theo số đo trung bình của một nhóm người
- Nhưng cơ thể thật thì không ai "trung bình" cả: lưng dài vai ngắn, ngực nhỏ hông to, ...
- Ví dụ: 2 khách cùng size M, nhưng một người eo 64cm, người kia eo 72cm → cùng một áo, một người rộng thùng thình, người kia bó cứng
- Hệ thống cần lưu 10 số đo cụ thể cho từng khách, không phải chỉ "size M"

### Slide 8 — Vấn đề 3: Kinh nghiệm thợ may nằm trong đầu, không ở đâu khác
**Speaker notes:**
Một thợ may giỏi cần ít nhất 5-10 năm kinh nghiệm. Tay nghề đó nằm hoàn toàn trong đầu họ — cách chia vải, cách tính cử động, lúc nào nên nới, lúc nào nên ôm. Khi thợ nghỉ việc hay nghỉ hưu, toàn bộ kinh nghiệm đó biến mất. Tiệm may phải bắt đầu lại từ đầu với thợ mới. Đây không chỉ là vấn đề kinh doanh — đây là vấn đề bảo tồn một nghề truyền thống.

- Thợ may giỏi mất 5-10 năm mới thành nghề
- Kinh nghiệm chỉ truyền được bằng "đứng cạnh mà xem, làm theo rồi khắc biết"
- Khi thợ nghỉ → tiệm mất năng lực sản xuất, khách quen cũng đi theo thợ
- Câu hỏi: có cách nào số hoá những quy tắc này để thợ mới có thể tham khảo?

### Slide 9 — Giải pháp: Hệ thống hiểu nghiệp vụ may đo
**Speaker notes:**
Từ 3 vấn đề trên, hệ thống cần làm 3 việc: (1) Lưu trữ chính xác số đo của từng khách, theo dõi sự thay đổi theo thời gian. (2) Chuẩn hoá quy trình từ đặt hàng đến giao hàng cho cả 3 loại dịch vụ. (3) Bước đầu số hoá kinh nghiệm thợ may thành công thức tính toán rập áo.

- Hồ sơ số đo cá nhân hoá (10 số đo, có version theo thời gian)
- Quy trình chuẩn cho 3 loại dịch vụ: Mua / Thuê / Đặt may
- Pattern Engine: chuyển 10 số đo → bản rập áo dài (3 mảnh) bằng công thức toán học

### Slide 10 — 10 số đo cơ thể trong may áo dài
**Speaker notes:**
Để may một chiếc áo dài vừa vặn, thợ may cần ít nhất 10 số đo. Đây không phải con số tôi tự nghĩ ra — tôi đã tham khảo tài liệu chuyên ngành và trao đổi với thợ may thực tế. Mỗi số đo có vai trò riêng trong việc dựng rập áo.

- Hiển thị hình minh hoạ cơ thể + 10 vị trí đo:
  1. Độ dài áo (do_dai_ao)
  2. Hạ eo (ha_eo)
  3. Vòng cổ (vong_co)
  4. Vòng nách (vong_nach)
  5. Vòng ngực (vong_nguc)
  6. Vòng eo (vong_eo)
  7. Vòng mông (vong_mong)
  8. Độ dài tay (do_dai_tay)
  9. Vòng bắp tay (vong_bap_tay)
  10. Vòng cổ tay (vong_co_tay)

### Slide 11 — Cách dựng rập áo dài: từ số đo đến bản cắt
**Speaker notes:**
Rập (pattern) là bản vẽ kỹ thuật mà thợ may dùng để cắt vải. Một áo dài gồm 3 mảnh rập chính: thân trước, thân sau, và tay áo. Hệ thống của tôi dùng công thức toán học tất định — không phải AI — để tính toán kích thước từng mảnh rập dựa trên 10 số đo.

- Áo dài = 3 mảnh rập: thân trước (front bodice), thân sau (back bodice), tay áo (sleeve)
- Ví dụ công thức thực tế:
  - Ngang ngực = vòng ngực ÷ 4
  - Ngang eo = vòng eo ÷ 4 (thân sau), vòng eo ÷ 4 − 1cm (thân trước — vì thân trước hẹp hơn thân sau)
  - Hạ nách = vòng nách ÷ 12
- Sai số cho phép: dưới 1mm so với cách tính của thợ may kinh nghiệm

### Slide 12 — Thân trước khác thân sau: tại sao −1cm?
**Speaker notes:**
Nhiều người không biết: thân trước áo dài hẹp hơn thân sau 1cm ở eo và hông. Đây là quy tắc kinh nghiệm của thợ may — vì phần ngực phía trước chiếm thể tích, nên cần bớt vải ở eo để áo không bị phùng. Trong hệ thống, tôi dùng một hàm duy nhất cho cả thân trước và thân sau, chỉ khác tham số offset (0 cho sau, −1 cho trước). Đây là ví dụ về cách số hoá kinh nghiệm thuyền thống.

- Minh hoạ: 2 mảnh rập chồng lên nhau, highlight chỗ lệch 1cm
- Quy tắc: thân trước hẹp hơn thân sau ở eo & hông
- Trong code: cùng 1 hàm `generate_bodice(measurements, offset)` — offset=0 cho sau, offset=−1 cho trước
- Ý nghĩa: đây chính là việc "ghi lại kinh nghiệm thợ may" thành công thức

### Slide 13 — Đường cong nách và mang tay: hình học thực tế
**Speaker notes:**
Phần khó nhất khi dựng rập không phải là đường thẳng — mà là đường cong. Đường vòng nách và đường mang tay phải khớp với nhau hoàn hảo, nếu không thì khách sẽ bị vướng khi giơ tay. Hệ thống dùng đường cong ellipse (cung 1/4 cho nách, cung 1/2 cho mang tay) — đây là phép tính hình học, không phải vẽ tay.

- Đường vòng nách: cung 1/4 ellipse
- Đường mang tay: cung 1/2 ellipse
- 2 đường này phải khớp contour (nếu không → áo bó nách hoặc rộng nách)
- Xuất ra SVG tỷ lệ 1:1 — in ra giấy là cắt được luôn (sai số ±0.5mm)

### Slide 14 — Xuất file cho sản xuất: SVG và G-code
**Speaker notes:**
Sau khi tính xong, hệ thống xuất rập dưới 2 dạng. Một là SVG tỷ lệ 1:1 — in ra giấy A0, đặt lên vải rồi cắt theo. Hai là G-code — đây là ngôn ngữ điều khiển máy cắt laser, tiệm nào có máy CNC thì dùng được luôn, không cần cắt tay.

- SVG 1:1: in ra giấy → đặt lên vải → cắt tay (phổ biến nhất hiện tại)
- G-code: điều khiển máy cắt laser tự động (tốc độ, công suất laser có thể tuỳ chỉnh)
- Cả 2 định dạng đều export được từng mảnh hoặc cả 3 mảnh (ZIP)

---

## PHẦN 4: LUỒNG NGHIỆP VỤ HỆ THỐNG (Slides 15-19) — ~6 phút

### Slide 15 — Tổng quan 3 loại dịch vụ
**Speaker notes:**
Một tiệm may áo dài không chỉ may — họ còn bán sẵn và cho thuê. Mỗi loại có quy trình hoàn toàn khác nhau. Bán sẵn thì thanh toán một lần rồi giao. Thuê thì phải đặt cọc, ghi nhận ngày trả, kiểm tra tình trạng khi trả. Đặt may thì phải kiểm tra số đo trước, rồi mới vào sản xuất. Hệ thống gom cả 3 vào một pipeline đơn hàng thống nhất.

| | Mua sẵn (Buy) | Thuê (Rent) | Đặt may (Bespoke) |
|---|---|---|---|
| Thanh toán | 1 lần 100% | Cọc + tiền thuê + cọc bảo đảm | Cọc 50% + còn lại |
| Đặc thù | Đơn giản nhất | Cần ngày trả, kiểm tra khi trả | Cần số đo, phân công thợ |

### Slide 16 — Luồng đặt may (Bespoke) — phức tạp nhất
**Speaker notes:**
Đây là luồng phức tạp nhất và cũng là luồng thể hiện rõ nhất giá trị của hệ thống. Trước khi đặt may, khách phải có số đo — nếu chưa có thì hệ thống hướng dẫn đặt lịch đo. Khi chủ tiệm duyệt đơn, hệ thống tự động tạo task cho thợ may và gắn bản rập vào đơn. Thợ may nhận task trên điện thoại, xem rập, cập nhật tiến độ.

- Sơ đồ trạng thái:
  ```
  Chờ số đo → Chờ duyệt → Đã duyệt
  → Sản xuất (Cắt → May → Thử → Hoàn thiện)
  → Sẵn sàng giao → Đã giao → Hoàn tất
  ```
- Highlight: Measurement Gate — hệ thống kiểm tra tự động "khách đã có số đo chưa?"
- Highlight: Tự động phân công thợ may + gắn bản rập

### Slide 17 — Luồng thuê áo dài (Rent)
**Speaker notes:**
Cho thuê có đặc thù riêng: phải theo dõi ngày trả, nhắc nhở tự động, kiểm tra tình trạng áo khi trả. Nếu áo bị hỏng thì trừ tiền cọc. Hệ thống có scheduler chạy nền, tự nhắc khách trước 3 ngày và 1 ngày.

- Sơ đồ: Đặt cọc → Chuẩn bị (Giặt → Sửa → Sẵn sàng) → Giao → Đang thuê → Trả → Kiểm tra → Hoàn tất
- Nhắc nhở tự động: 3 ngày & 1 ngày trước hạn trả
- Kiểm tra trả: Tốt / Hỏng / Mất → xử lý cọc bảo đảm tương ứng

### Slide 18 — Quy trình sản xuất 11 trạng thái
**Speaker notes:**
Khi một đơn đặt may được duyệt, nó đi qua 11 trạng thái sản xuất. Mỗi trạng thái là một bước thực tế trong xưởng may. Thợ may cập nhật trạng thái trên app, chủ tiệm theo dõi trên bảng sản xuất (Production Board), khách hàng nhận thông báo khi đơn chuyển trạng thái.

- 11 trạng thái: Chờ phân công → Đã phân công → Chuẩn bị vải → Cắt → May → Thử đồ → Sửa → Hoàn thiện → QC → Sẵn sàng → Đã giao
- Production Board: bảng Kanban cho chủ tiệm theo dõi tất cả đơn đang sản xuất
- Mỗi chuyển trạng thái = 1 sự kiện nghiệp vụ (không chỉ lưu trạng thái hiện tại)

### Slide 19 — Bảng sản xuất & phân công thợ may
**Speaker notes:**
Chủ tiệm nhìn bảng sản xuất (Production Board) dạng Kanban để biết tổng quan: bao nhiêu đơn đang cắt, bao nhiêu đang may, ai đang rảnh. Khi duyệt đơn bespoke, hệ thống gợi ý thợ may có ít việc nhất. Thợ may xem task trên giao diện riêng — thấy số đo khách, bản rập, deadline, và thu nhập dự kiến.

- Screenshot/mockup Production Board
- Phân công thợ: tự động chọn thợ có workload thấp nhất
- Thợ may thấy: thông tin đơn hàng + số đo + bản rập + deadline + thu nhập

---

## PHẦN 5: KIẾN TRÚC & CÔNG NGHỆ (Slides 20-23) — ~5 phút

### Slide 20 — Kiến trúc tổng quan
**Speaker notes:**
Hệ thống theo mô hình 3 tầng cổ điển: Frontend (Next.js) — Backend API (FastAPI/Python) — Database (PostgreSQL/Neon). Đặc biệt, hệ thống hỗ trợ multi-tenant: một cài đặt phục vụ nhiều tiệm may, mỗi tiệm có dữ liệu riêng biệt hoàn toàn.

- Sơ đồ kiến trúc đơn giản:
  - Frontend: Next.js 15 (App Router, Server Components)
  - Backend: FastAPI (Python) — REST API
  - Database: PostgreSQL (Neon serverless)
  - Multi-tenant: mỗi tiệm may = 1 tenant, dữ liệu cách ly bằng tenant_id

### Slide 21 — Công nghệ sử dụng
**Speaker notes:**
Trình bày ngắn gọn lý do chọn từng công nghệ — không liệt kê suông.

| Tầng | Công nghệ | Lý do chọn |
|---|---|---|
| Frontend | Next.js 15, TypeScript, TailwindCSS, shadcn/ui | Server-side rendering, type-safe, UI component library |
| Backend | FastAPI, SQLAlchemy, Pydantic | Async, auto-gen API docs, validation mạnh |
| Database | PostgreSQL (Neon) | Serverless, branching cho dev/test |
| Pattern Engine | Python thuần (math) | Deterministic, không cần GPU/AI |

### Slide 22 — Cơ sở dữ liệu: các bảng chính
**Speaker notes:**
Không cần trình bày hết — chỉ highlight những bảng thể hiện nghiệp vụ may đo.

- `customer_profiles` + `measurements`: hồ sơ số đo có version
- `orders` + `order_items`: đơn hàng 3 loại (buy/rent/bespoke)
- `tailor_tasks` + `production_tasks`: phân công & theo dõi sản xuất
- `pattern_sessions` + `pattern_pieces`: lưu bản rập (10 số đo → 3 mảnh SVG)
- `payment_transactions`: thanh toán nhiều đợt (cọc + còn lại)
- `rental_returns`: kiểm tra trả đồ thuê

### Slide 23 — Pattern Engine: kiến trúc "lõi cứng, vỏ mềm"
**Speaker notes:**
Module Pattern Engine tách biệt hoàn toàn với phần còn lại. Bên trong là công thức toán học cố định — đầu vào 10 số đo, đầu ra 3 mảnh rập SVG. Bên ngoài là giao diện linh hoạt cho chủ tiệm. Nguyên tắc: engine tính toán không bao giờ sai, giao diện thì có thể thay đổi.

- Input: 10 số đo (validated)
- Process: công thức tất định (deterministic) — chạy < 50ms
- Output: 3 mảnh rập SVG (1:1 scale) hoặc G-code
- Tách biệt: `backend/src/patterns/` không import gì từ module AI

---

## PHẦN 6: DEMO (Slides 24-26) — ~6 phút

### Slide 24 — Demo: Khách hàng đặt may áo dài
**Speaker notes:**
Demo trực tiếp hoặc video quay sẵn. Cho thấy luồng: khách chọn "Đặt may" → Measurement Gate kiểm tra số đo → thanh toán cọc → chủ tiệm nhận đơn.

- Giao diện khách hàng: Showroom → chọn đặt may → kiểm tra số đo → checkout

### Slide 25 — Demo: Chủ tiệm duyệt đơn & dựng rập
**Speaker notes:**
Chủ tiệm duyệt đơn → hệ thống tự tạo task cho thợ may. Mở Design Session → chọn khách → 10 số đo tự điền → nhấn "Tạo rập" → 3 mảnh rập hiện ra real-time. Xuất SVG/G-code.

- Giao diện chủ tiệm: Order Board → duyệt → Design Session → preview rập → export

### Slide 26 — Demo: Thợ may nhận task & cập nhật tiến độ
**Speaker notes:**
Thợ may đăng nhập → thấy danh sách task → mở task → xem số đo + bản rập → cập nhật trạng thái (đang cắt → đang may → ...). Chủ tiệm thấy cập nhật real-time trên Production Board.

- Giao diện thợ may: Task list → chi tiết task → xem rập → cập nhật trạng thái

---

## PHẦN 7: KẾT LUẬN (Slides 27-29) — ~3 phút

### Slide 27 — Kết quả đạt được
- 11 epic hoàn thành, phủ ~80% yêu cầu chức năng
- Pattern Engine: sai số < 1mm, xuất SVG/G-code production-ready
- 3 luồng đơn hàng (Buy/Rent/Bespoke) hoạt động đầy đủ
- Hệ thống multi-tenant: sẵn sàng phục vụ nhiều tiệm may

### Slide 28 — Hạn chế & hướng phát triển
- **Hạn chế:**
  - Chưa có AI tư vấn phong cách (Epic 12-14 hoãn — cần dataset từ nghệ nhân)
  - Pattern Engine mới hỗ trợ áo dài, chưa mở rộng sang loại áo khác
  - Chưa có app mobile native
- **Hướng phát triển:**
  - Mở rộng Pattern Engine cho nhiều loại trang phục (Open Garment System)
  - Tích hợp AI: chuyển cảm xúc khách hàng → tham số kỹ thuật
  - App mobile cho thợ may và khách hàng
  - Số hoá 50+ quy tắc kinh nghiệm từ nghệ nhân (Smart Rules)

### Slide 29 — Lời cảm ơn
- Cảm ơn GVHD, hội đồng
- Q&A

---

## GỢI Ý THIẾT KẾ SLIDE

- **Font:** Dùng font có hỗ trợ tiếng Việt tốt (Noto Sans, Be Vietnam Pro)
- **Màu chủ đạo:** Tông ấm (nâu, be, vàng đồng) — gợi nghề truyền thống
- **Hình ảnh:** Ảnh áo dài thực tế, ảnh xưởng may, không dùng ảnh stock generic
- **Sơ đồ:** Dùng Mermaid hoặc draw.io cho flowchart, giữ đơn giản
- **Quy tắc 6x6:** Mỗi slide tối đa 6 bullet, mỗi bullet tối đa 6 từ — nội dung chi tiết nằm ở speaker notes
- **Demo:** Quay video backup phòng trường hợp demo live gặp lỗi
