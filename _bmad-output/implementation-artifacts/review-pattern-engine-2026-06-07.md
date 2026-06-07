# Báo cáo Kiểm định Phê phán — Cách vẽ rập áo dài (Pattern Engine, Epic 11)

| | |
|---|---|
| **Ngày** | 2026-06-07 |
| **Loại** | Adversarial Review (General) — `bmad-review-adversarial-general` |
| **Phạm vi** | `backend/src/patterns/` (`formulas.py`, `engine.py`, `svg_export.py`, `gcode_export.py`) đối chiếu SVG mẫu tại `_bmad-output/planning-artifacts/research/svg-samples/` và chuẩn FR92–FR94 (`docs/07-pattern-engine.md`) |
| **Bối cảnh** | Epic 11 đã done cả 6 story, pass code review, nhưng người dùng phản ánh bản vẽ rập chưa đạt chuẩn nghiệp vụ |
| **Trạng thái** | Đầu vào cho Correct Course (Epic 11) |

---

## Kết luận tổng quát

Phản ánh "chưa đạt chuẩn" là **chính xác nhưng còn nhẹ**. Bản vẽ hiện tại không phải là rập áo dài chưa đạt chuẩn — nó **chưa phải là rập áo dài**. Các công thức không có nguồn gốc từ nghệ nhân, hình học sinh ra sai ở mức centimét (không phải milimét), và quy trình kiểm định FR92 bị vô hiệu vì "reference nghệ nhân" thực chất là output của chính engine.

---

## Nhóm A — Sai lệch hình học nghiêm trọng (vi phạm trực tiếp FR92/FR93/FR94)

- **Vòng nách là đường thẳng giả danh đường cong, sâu 0.9cm.** Arc `A 3.0 21.5 0 0 1 22.5 3.0` đi từ (22.5, 2.1) đến (22.5, 3.0) — hai điểm cùng hoành độ, cách nhau 0.9cm theo chiều dọc. Với rx=3, ry=21.5, độ võng thực tế của cung so với dây cung là **~0.007mm** — một đường thẳng đứng. "Vòng nách" sâu 0.9cm thì không cánh tay nào chui qua được. FR93 ("1/4 ellipse khớp contour") thất bại hoàn toàn: đây là lát cắt ~2.4° của một ellipse khổng lồ, không phải 1/4 ellipse.

- **Công thức `armhole_drop = vong_nach / 12` vô căn cứ.** Vòng nách 36cm → hạ nách 3cm. Công thức dựng rập truyền thống cho hạ nách nằm quanh `vong_nach/4 + 2~3cm` (~11–12cm) hoặc theo hệ ngực; "hạ nách giống áo sơ mi" (lời nghệ nhân) nằm quanh 18–22cm từ đầu vai. Docstring ghi "tailor-validated" nhưng không tài liệu nào trong repo chứng minh.

- **Vòng cổ rộng đúng 1cm — là bug, không phải thiết kế.** Độ mở ngang cổ = `shoulder_x - bust_width` = đúng bằng seam_allowance (1.0cm), hoàn toàn do tình cờ đại số. Cổ áo thật cần ~`vong_co/6` (≈5.6cm). "Neck curve" còn được vẽ bằng lệnh `L` — đường chéo thẳng, không phải đường cong.

- **Hai số đo bị vứt bỏ: `do_dai_ao` và `ha_eo` không hề được dùng.** `bodice_length` hardcode 60.0cm; vị trí eo hardcode `0.45 × 60 = 27cm`; mông tại `0.65 × 60 = 39cm`. Khách đo áo dài 120cm nhận rập 60cm — sai lệch **600mm** so với dung sai ±0.5mm của FR94. Đo 10 số nhưng dùng 8.

- **Tay áo dài hơn số đo 17cm.** `hem_y = cap_height + sleeve_length` — `do_dai_tay` (đo vai→cổ tay) bị cộng thêm nguyên chiều cao đầu tay phía dưới. Mẫu sleeve.svg cao 77cm cho số đo tay 60cm.

- **Đầu tay áo: rx/ry hoán đổi + sai cờ large-arc, chiều cao vẽ ra không khớp tham số.** Arc `A 17.0 15.5 0 1 0 31.0 17.0`: dây cung ngang 31cm nên rx phải là nửa dây cung (15.5 = bicep_width), ry là chiều cao đầu tay — code đảo ngược. Tính lại hình học: đỉnh cung chỉ đạt y≈7.9, tức chiều cao đầu tay **vẽ ra ~9.1cm trong khi `cap_height` lưu trong geometry_params là 17cm** — preview, tham số và bản in mâu thuẫn nhau. `large-arc=1` còn làm cung quét >180°, phình ngang **vượt đường bắp tay ~1.5cm mỗi bên** — đầu tay rộng hơn thân tay, vô nghĩa về may mặc.

- **Đường sườn là polyline gãy khúc.** Nách → eo → mông → gấu nối bằng 4 đoạn thẳng với góc gãy tại eo và mông; đường sườn thật phải là cong trơn. Taper thẳng từ nách (x=22.5) xuống eo (x=16.5) làm **chu vi tại tầm ngực (y≈10–15) nhỏ hơn vòng ngực yêu cầu** — áo không cài nổi quanh ngực.

- **Gấu hẹp hơn mông tạo kink ngược.** `hem_width` cố định 37cm → nửa gấu 19.5cm < nửa mông 23.5cm: sườn phình ra tại mông rồi thắt vào tại gấu — zigzag vật lý không tồn tại trên rập thật; hằng số 37cm chết cứng với mọi cỡ người.

## Nhóm B — Sai phương pháp dựng rập áo dài (mức nghiệp vụ)

- **Không có chiết ly (dart) nào.** Thân trước áo dài bắt buộc có ly ngực/ly eo để ôm dáng. Engine sinh thân trước và thân sau **giống hệt nhau ngoại trừ 1cm tại eo** (đối chiếu 2 file mẫu: khác biệt duy nhất là `16.5` vs `17.5`). Không ly, không hò, không vạt.

- **Vai ngang 0 độ, không có số đo vai.** Đường vai vẽ ngang tuyệt đối tại y=neck_depth, kéo tới `vong_nguc/4 + 1` (22.5cm — vai người không rộng thế). Cần hạ xuôi vai ~4–5cm và số đo ngang vai riêng — bộ 10 số đo **thiếu số đo vai**, lỗ hổng từ tầng spec.

- **Không xẻ tà, không vạt áo.** Đặc trưng định danh của áo dài là tà trước/sau xẻ từ eo. Rập đóng kín sườn từ nách tới gấu ở 60cm — về cấu trúc là một sơ mi cộc dáng hộp.

- **Không kiểm tra khớp nách–tay.** Chu vi đầu tay phải khớp chu vi vòng nách thân (cộng cử động ~1.5–2cm). Không dòng code nào so sánh hai độ dài cung. Với nách sâu 0.9cm và đầu tay nửa-ellipse chu vi ~50cm, hai chi tiết **không thể may vào nhau**.

- **Hạ cổ trước/sau dùng chung công thức `vong_co/16`.** Cổ trước phải sâu hơn cổ sau (chuẩn: trước ~`cổ/8+1`, sau ~1.5–2cm).

- **Chiều phân bổ ±1cm eo trước/sau chưa được kiểm chứng.** Code cho thân trước *nhỏ hơn* thân sau 1cm; nhiều hệ công thức truyền thống phân phần lớn hơn cho thân trước (vì ngực). Chưa có xác nhận từ nghệ nhân.

## Nhóm C — Pipeline xuất bản (SVG/G-code) tự phá chuẩn của chính nó

- **`_arc_to_polyline` là nguỵ tạo toán học.** Không chuyển đổi arc — bịa một bezier bậc 2 với độ võng `avg_radius * 0.5` ("Simplified arc height factor"), bỏ qua cờ large-arc/sweep, hướng võng phụ thuộc chiều vẽ path chứ không phụ thuộc hình học. Hệ quả: **đường laser cắt lệch khỏi SVG preview hàng centimét**, bản in (arc thật) khác bản cắt (bezier giả). FR94/FR95 sụp đổ tại đây kể cả khi SVG đúng. Cần thay bằng chuyển đổi endpoint-to-center chuẩn SVG.

- **Không bù kerf laser.** Tia laser ăn ~0.1–0.2mm; không offset kerf → mọi chi tiết cắt ra nhỏ hơn hệ thống. Ngân sách dung sai ±0.5mm tiêu sạch trước khi tính lỗi khác.

- **Tài liệu sai về độ chính xác.** Docstring ghi "rounded to 1 decimal (0.1mm precision)" — đơn vị là cm nên 1 chữ số thập phân là **1mm**, sai 10 lần. Làm tròn tham số (0.1cm) + làm tròn toạ độ khi render chồng sai số ~1mm/toạ độ — một mình nó đã chạm trần FR92.

- **Rập sản xuất trống trơn ký hiệu kỹ thuật.** Không canh sợi, không bấm dấu khớp nách–tay, không ghi chú "vải gập đôi" tại đường giữa, không nhãn số đo/size, không ô hiệu chuẩn 10×10cm để kiểm tra scale máy in.

## Nhóm D — Quy trình kiểm định bị vô hiệu

- **"Reference của nghệ nhân" chính là output của engine.** Ba file trong `svg-samples/` khớp 100% với output của `render_bodice_svg`/`render_sleeve_svg` — cùng cấu trúc path, title, stroke-width, và **cùng toàn bộ các lỗi** (cổ 1cm, nách 0.9cm, vai ngang). Không nghệ nhân nào vẽ tay ra thân áo có cổ rộng 1cm. FR92 đang được "kiểm chứng" bằng cách **so engine với chính nó** — phép thử tuần hoàn, vô giá trị. Đây là lý do gốc khiến 6 story pass code review mà sản phẩm vẫn chưa đạt chuẩn: chưa từng tồn tại ground truth độc lập.

- **Paradigm tay áo chưa được đặt câu hỏi khi viết spec.** Engine dựng theo tay tra thẳng (set-in); spec không nhắc đến tay raglan — kiểu phổ biến của áo dài hiện đại.

---

## Phụ lục — Ground truth từ nghệ nhân (xác nhận 2026-06-07, sau kiểm định)

Nghệ nhân tiệm Thanh Lộc (mẹ của Lem) xác nhận:

1. Cắt áo dài chia **3 phần**: thân trước, thân sau, cổ + tay.
2. **Thân trước/thân sau có trục đối xứng → gấp đôi vải để cắt** ⇒ hướng vẽ nửa thân của engine (đường giữa = nếp gấp, không chừa đường may tại nếp gấp) là đúng — giữ lại.
3. Tiệm may **CẢ HAI kiểu tay**:
   - **Tay raglan** = tay liền cổ — mảnh tay kéo lên tận vòng cổ, đường may chéo từ cổ xuống nách. Engine hiện **chưa mô hình hoá** kiểu này.
   - **Tay tra thẳng** (áo dài hiện đại) — đường may vai + hạ nách giống áo sơ mi; **tay cắt DỰA THEO đường cong nách của thân** → xác nhận trực tiếp finding "không kiểm tra khớp nách–tay": `generate_sleeve()` phải nhận đường nách làm đầu vào, không dùng công thức độc lập.
4. Công thức chi tiết (hạ nách, xuôi vai, chiết ly, xẻ tà, lá cổ...) đang thu thập qua bảng phỏng vấn: `_bmad-output/planning-artifacts/research/artisan-interview-checklist.md` — ưu tiên mục G (buổi cắt mẫu có ghi hình để số hoá reference độc lập).

## Khuyến nghị xử lý

Mức độ phát hiện vượt ngưỡng "sửa công thức" — động tới spec (bộ số đo thiếu vai, FR93 mô tả sai bản chất đường cong, thiếu paradigm raglan). Thứ tự:

1. **Thu thập ground truth thật** — hoàn thành bảng phỏng vấn nghệ nhân + số hoá bộ rập mẫu cắt tay (mục G của checklist). Không có bước này, mọi vòng sửa code là đoán mò.
2. **Correct Course cho Epic 11** (`bmad-correct-course`) — change proposal: cập nhật FR (2 kiểu tay qua `garment_type`, sửa FR93, bổ sung số đo vai), dựng lại `formulas.py` + `svg_export.py` theo công thức nghệ nhân, thay `_arc_to_polyline` bằng chuyển đổi endpoint-to-center chuẩn SVG, thêm kiểm tra khớp cung nách–tay + bù kerf, định nghĩa lại acceptance test FR92 với reference độc lập.
3. Xoá hoặc đánh dấu rõ `svg-samples/` là engine output, **không phải** reference nghệ nhân, để không ai dùng nhầm làm chuẩn đối chứng lần nữa.
