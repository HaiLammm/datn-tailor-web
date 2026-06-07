# Báo cáo đánh giá công thức vẽ rập áo dài — Pattern Engine (Epic 11)

**Ngày:** 2026-06-07
**Phạm vi:** `backend/src/patterns/formulas.py`, `backend/src/patterns/svg_export.py`, đối chiếu với công thức gốc của nghệ nhân (brainstorming 2026-04-02) và công thức may đo áo dài của các nhà may/hệ thống rập trên thế giới.
**Phương pháp:** (1) Chạy engine với bộ số đo thực và xác minh hình học bằng tính toán theo chuẩn W3C SVG arc; (2) Deep research web: 5 hướng tìm kiếm song song, 22 nguồn được tải và trích xuất công thức, 73 lượt kiểm chứng đối nghịch (mỗi công thức được xác minh độc lập, đối chiếu nguyên văn với trang nguồn).

> **Cập nhật 2026-06-08:** bổ sung nguồn video do Lem cung cấp — [Thiết kế áo dài tay ráp lăng (Ngô Gia Hạnh)](https://www.youtube.com/watch?v=tNKD9zuD6D4), trích đầy đủ công thức từ phụ đề trong `cong-thuc-tay-raglan-video-gia-hanh-2026-06-08.md`. Nguồn này **củng cố thêm các kết luận chính**: hạ nách họ `vòng nách/2 ± x` (nguồn độc lập thứ 3), ngang eo `eo/4 + 3 ben + 0,5` trùng khít giáo trình §4.1, tà luôn ≥ mông (xác nhận lỗi G8), và đặc biệt là **quy trình ép khớp chu vi nách thân ↔ nách tay bằng thước dây + 1→1,5cm cử động mỗi bên** — đúng nguyên lý FR93 đang thiếu (lỗi G5) kèm thuật toán cụ thể để cài đặt.
>
> **Cập nhật 2026-06-08 (bổ sung):** Lem cung cấp thêm ảnh **vở học may CỦA CHÍNH NGHỆ NHÂN (mẹ Lem)** — Bài 3 raglan + bài tay thường cổ thuyền tr.45 — chép lại tại `so-tay-cong-thuc-ao-dai-raglan-tay-thuong-2026-06-08.md`. Đây là **nguồn ground-truth cấp 1** (bằng chứng viết tay về phương pháp nghệ nhân được đào tạo), thay đổi cục diện mục 5-P0: phần lớn bảng công thức đã có nguồn viết, buổi phỏng vấn thu hẹp còn xác minh biến tấu + trang thiếu. Kết quả chính: vở khớp video Gia Hạnh từng 0,5cm (cùng phương pháp); chốt hạ nách tay raglan = `vòng ngực/4 − 1`; lần đầu có nguồn VN cho **set-in với xuôi vai + rộng vai** (đối chiếu lỗi G7); xác nhận lỗi G9 (chừa đường may theo vùng: thân 2cm, lai 2–3cm, cổ cắt sát); phát hiện mảnh rập **vạt con** engine chưa có khái niệm; 5 số đo engine chưa thu (hạ chiết ngực, dang ngực, hạ ben ngực, xuôi vai, rộng vai). Lệch giữa vở và bảng brainstorming 2026-04-02 (ease ngực/eo) có giả thuyết lý giải: bảng miệng gộp đường may vào công thức, vở tách riêng — xem bảng đối chiếu trong tài liệu vở.

---

## 1. Tóm tắt điều hành

**Kết luận chính: phần vẽ rập hiện tại KHÔNG dùng được để cắt vải thật.** Có 3 tầng vấn đề:

1. **🔴 Code lệch khỏi chính công thức của nghệ nhân dự án** — story spec 11.2 ghi *"from brainstorming session, tailor-validated"* nhưng nội dung công thức **không khớp** bảng công thức gốc mà nghệ nhân cung cấp trong buổi brainstorming 2026-04-02. Sai lệch ở **5/9 thông số**, trong đó hạ nách sai 14cm. Code cài trung thành theo spec → lỗi nằm ở khâu soạn spec, không phải khâu code.
2. **🔴 Hình học SVG sai về bản chất** — cung vòng nách dài 0.9cm (gần như không tồn tại), cung đầu tay lõm ngược chiều và tự cắt vào thân tay, chiều dài thân hard-code 60cm bỏ qua số đo `do_dai_ao`/`ha_eo`.
3. **🔴 Test "độ chính xác hình học" là kiểm chứng vòng tròn** — `EXPECTED_BACK = 80.0/4` so với code cũng tính `80/4`. AC #8 (sai số <1mm so với rập chuẩn nghệ nhân) chưa bao giờ được kiểm thực sự.

So với thế giới: công thức gốc của nghệ nhân **nhất quán với thực hành VN truyền thống và chuẩn quốc tế** (hạ nách ≈ ½ vòng nách, có cử động ở eo/ngực, sleeve cap ease 3–4cm). Phiên bản trong spec/code thì không khớp với bất kỳ nguồn nào tìm được.

---

## 2. Truy nguyên: công thức gốc nghệ nhân → spec → code

| Thành phần | Bảng gốc nghệ nhân (brainstorming 2026-04-02) | Story spec 11.2 = Code | Đánh giá |
|---|---|---|---|
| Hạ nách | `vòng_nách/2 − 1` (= 17cm) | `vòng_nách/12` (= 3cm) | ❌ Sai 14cm — `/12` không có trong bảng gốc |
| Chiều dài cổ | `vòng_cổ/5` (= 6.6cm) | `vòng_cổ/16` (= 2.1cm) | ❌ Sai 4.5cm — `/16` không có trong bảng gốc |
| Rộng ngực | `vòng_ngực/4 + 1 + 2.5` | `vòng_ngực/4` | ❌ Mất 3.5cm cử động + đường may |
| Rộng eo | `vòng_eo/4 + 1 + 2.5 + 2.5` (trước −1) | `vòng_eo/4` (trước −1) | ❌ Mất 6cm |
| Rộng mông | `vòng_mông/4 + offset` (trước −1) | `vòng_mông/4` (không offset) | ❌ Offset trước/sau bị bỏ (chỉ áp vào eo) |
| Rộng gấu (tà) | 37cm cố định | 37cm | ✅ Khớp |
| Cap height tay | `vòng_nách/2 − 1` | `vòng_nách/2 − 1` | ✅ Khớp |
| Rộng bắp tay | `vòng_bắp_tay/2 + 2.5` | `vòng_bắp_tay/2 + 2.5` | ✅ Khớp |
| Rộng cổ tay | `vòng_cổ_tay/2 + 1.5` | `vòng_cổ_tay/2 + 1` | ⚠️ Lệch 0.5cm |

**Bằng chứng nội bộ bổ sung:** ý tưởng First Principles #2 trong brainstorming ghi ví dụ công thức `vòng_eo/4 + 6` — khớp với bảng gốc (1 + 2.5 + 2.5 = 6), chứng tỏ bảng gốc nhất quán nội bộ. Yêu cầu sleeve ease của nghệ nhân (*"cap dài hơn vòng nách 3–4cm"*, First Principles #6) cũng trùng đúng chuẩn quốc tế (xem mục 4).

Lưu ý: bảng gốc dùng **cùng công thức `vòng_nách/2 − 1` cho cả hạ nách thân và cap height tay** — đây là nguyên lý khớp nách–tay cơ bản. Spec đổi hạ nách thành `/12` nhưng giữ cap height nguyên → phá vỡ tính nhất quán này.

---

## 3. Lỗi hình học SVG (xác minh bằng số, bộ đo: ngực 86 / eo 66 / mông 90 / cổ 33 / nách 36 / hạ eo 36 / dài áo 120)

| # | Lỗi | Số liệu xác minh |
|---|---|---|
| G1 | Chiều dài thân hard-code `bodice_length = 60.0` | Khách dài áo 120cm → rập 60cm. `do_dai_ao`, `ha_eo` hoàn toàn không được dùng |
| G2 | Vị trí eo/mông theo tỉ lệ cứng (0.45/0.65 × 60) | Eo render tại y=27cm trong khi hạ eo khách = 36cm (lệch 9cm) |
| G3 | Cung vòng nách gần như không tồn tại | 2 đầu mút cung cùng hoành độ x=22.5, span dọc 0.9cm → chiều dài cung **0.9cm** (cần ~9–10cm) |
| G4 | Cung đầu tay lõm ngược chiều | `A 17.0 15.5 0 1 0` từ (0,17) đến (31,17): cung vồng **xuống dưới** (y 17→38.9) trong hệ SVG y-hướng-xuống → tự cắt vào thân tay; chiều cao đầu tay thực = 21.9cm ≠ 17cm thiết kế |
| G5 | Không có ràng buộc chu vi nách ↔ đầu tay (FR93) | Chu vi cung đầu tay 64.3cm vs cung nách 2 thân 1.8cm; nghệ nhân yêu cầu chênh chỉ 3–4cm |
| G6 | Rộng cổ = 1cm — vô tình trùng seam allowance | Code vẽ `L (shoulder_x − bust_width) neck_depth` = (1.0, 2.1): vòng cổ không tham gia vào rộng cổ |
| G7 | Vai ngang tuyệt đối, không có độ xuôi vai | Đường vai là đoạn ngang y=2.1 từ x=1 đến x=22.5 (rộng vai 21.5cm = bust_width — phi thực tế) |
| G8 | Tà hẹp hơn mông → sườn gập ngược | Gấu 18.5cm < hông 22.5cm (37/2 + 1 < 90/4 + 1) |
| G9 | Seam allowance chỉ cộng vào x mép ngoài | Không phải offset path: cổ, vai, gấu không có đường may |
| G10 | Cổ và sườn vẽ bằng đoạn thẳng `L` | Không có đường cong cổ/lượn sườn |

File SVG mẫu để quan sát (⚠️ **đây là output của engine hiện tại, KHÔNG phải rập chuẩn nghệ nhân**): `_bmad-output/planning-artifacts/research/svg-samples/{front_bodice,back_bodice,sleeve}.svg`

**Về test:** `backend/tests/test_11_2_pattern_engine.py` khai báo *"tailor-validated reference values"* nhưng `EXPECTED_*` chỉ là chính công thức được tính tay lại (`80.0/4`, `38.0/12`...). Test chỉ chứng minh code cài đúng spec — không chứng minh spec đúng với rập nghệ nhân. Ngoài ra `test_armhole_arc_uses_correct_radii` và `test_sleeve_arc_uses_correct_radii` **khóa cứng lỗi G3/G4** (assert đúng thứ tự rx/ry sai).

---

## 4. So sánh với công thức các nhà may / hệ thống rập thế giới

### 4.1 Nhà may & tài liệu Việt Nam (áo dài)

| Thông số | Áo dài tay raglan (giáo trình, [123docz/garmentspace](https://123docz.net/document/1842570-cong-thuc-thiet-ke-ao-dai-tay-raglan-dep-va-chi-tiet.htm), đối chứng [thietkerap.com.vn](https://thietkerap.com.vn/cong-thuc-cat-may-ao-dai-tay-raglan-than-sau/)) | Áo dài tay thường ([luvinus](https://luvinus.com/cong-thuc-cat-may/hoc-may-ao-dai/), [thoitrangviet247](https://thoitrangviet247.com)) | Code hiện tại |
|---|---|---|---|
| Hạ nách | **½ vòng nách + 2** (=18cm) | (không nêu rõ) | vòng nách/12 (=3cm) ❌ |
| Ngang ngực | sau = ¼ ngực − 0.5; **trước = sau + 2** | ¼ ngực (một số nguồn cho phép + cử động) | ¼ ngực, trước = sau ⚠️ |
| Ngang eo | sau = ¼ eo + 3 ply + 0.5 cử động | ¼ eo **+ 2** | ¼ eo + 0 ❌ |
| Ngang mông | ¼ mông + 0.5 | ¼ mông (+1.5 tùy nguồn — không thống nhất) | ¼ mông + 0 ⚠️ |
| Vào cổ / hạ cổ | sau: ⅛ cổ − 0.5 (=3.5), hạ 0.5; trước: ⅛ cổ + 1 (=5), hạ = ½ vào cổ (=2.5) | cổ = 7cm cố định | vòng cổ/16 (=2.1) làm "depth", rộng cổ = 1cm ❌ |
| Trước vs sau | **Trước RỘNG HƠN sau 2cm ở ngực** | — | Trước HẸP hơn sau 1cm ở eo ❌ ngược chiều |
| Cửa tay | — | trước 14cm / sau 16cm (cố định) | ½ cổ tay + 1 |

> Đã loại 2 nguồn ([luvinus áo bà ba raglan](https://luvinus.com/cong-thuc-cat-may/cach-cat-mat-ao-ba-ba-tay-raglan/), [bbcosplay áo bà ba](https://bbcosplay.com/news/cong-thuc-cat-may-ao-ba-ba-nach-xeo-tay-raglan-2586)) khỏi bảng chính vì là **áo bà ba** (dáng rộng), không phải áo dài — bộ kiểm chứng đối nghịch đã gắn cờ "garment mismatch". Tuy vậy đáng chú ý: nguồn áo bà ba raglan có `hạ nách = vòng nách/2 + 2.5` và `bắp tay = vòng bắp tay/2 + 2.5` — cùng họ công thức với bảng nghệ nhân, càng củng cố rằng `vòng nách/2 ± x` mới là dạng đúng của hạ nách.

### 4.2 Hệ thống rập quốc tế (fitted bodice + set-in sleeve)

| Thông số | Aldrich ([inthefolds](https://inthefolds.com/blog/2016/2/22/how-to-draft-a-bodice-block), [dresspatternmaking](https://dresspatternmaking.com/patternmaking-basics/analyzing-other-block-making-intro/ease-in-the-bodice-aldrich)) | Joseph-Armstrong ([dresspatternmaking](https://dresspatternmaking.com/patternmaking-basics/analyzing-other-block-making-intro/ease-in-the-bodice-joseph-armstrong)) | Khác ([modelistecreative](https://modelistecreative.com/2019/02/07/drafting-a-basic-bodice-block-explained/), [dresspatternmaking sleeve](https://dresspatternmaking.com/blocks-2/drafting-patternmaking-blocks/sleeve-block/how-to-draft-the-sleeve-block/)) | Code hiện tại |
|---|---|---|---|---|
| Hạ nách (armhole depth) | số đo hạ nách cơ thể + 0.5cm | đo trực tiếp theo cơ thể | hằng số theo size (18cm size 12UK) + 3.8–4cm ease | vòng nách/12 = 3cm ❌ không nguồn nào dùng dạng này |
| Ease vòng ngực | ~7cm (block có tay); ~2.4cm (block sát không tay) | ~8.25cm tổng | 7.5–10cm | **0cm** ❌ (áo dài bó sát thì ease nhỏ, nhưng 0 tuyệt đối + không chiết ly thì không nguồn nào làm) |
| Rộng cổ | vòng cổ/5 (sau), /5 − 0.5 (trước) | số đo cổ + ⅛" | hạ cổ trước = vòng cổ/6 + 2–3cm | vòng cổ/16 ❌ — `/5` của Aldrich trùng đúng bảng nghệ nhân |
| Cap height tay | — | — | **số đo cơ thể trực tiếp** (đỉnh vai → ngang bắp tay); cap là tam giác ràng buộc bởi (vòng nách, bắp tay, cap height) — 2 đại lượng quyết định cái còn lại | vòng nách/2 − 1 = 17cm ⚠️ cao hơn thông lệ set-in; chấp nhận được nếu là quy ước riêng của nghệ nhân, **nhưng phải đi cùng ràng buộc chu vi** |
| Sleeve cap ease (chu vi đầu tay − chu vi nách) | — | — | ¾"–1¾" (≈2–4.5cm); nguồn khác 1.25–1.75" | **+62cm** ❌ (không có ràng buộc nào) — yêu cầu 3–4cm của nghệ nhân nằm đúng trong chuẩn |
| Rộng bắp tay | — | — | (bắp tay + 1")/2 hoặc +2"/2 | bắp tay/2 + 2.5 ✅ tương đương |
| Rộng cổ tay | — | — | (cổ tay + 0.5")/2 | cổ tay/2 + 1 ✅ hợp lý (nghệ nhân: +1.5) |

### 4.3 Nguồn không khai thác được (ghi nhận trung thực)

- **Sách Triệu Thị Chơi** và giáo trình trường nghề bản giấy: không có bản số hóa truy cập được — khuyến nghị đối chiếu thủ công với nghệ nhân.
- **Bunka (Nhật):** chỉ xác định được đặc điểm hệ (3 số đo gốc, bảng phần trăm trong giáo trình Bunka Fashion Series, dùng thước đo độ) — công thức số chi tiết nằm trong sách in, không trích được ([flekka](https://flekka.com/2011/06/08/comparing-close-fitting-slopers-bunka-vs-aldrich-part-2/)).
- **Tà 37cm cố định:** không tìm được nguồn độc lập xác nhận hay bác bỏ — đây là design decision riêng của nghệ nhân (chấp nhận được), nhưng cần xử lý ràng buộc tà ≥ mông (lỗi G8).
- **Độ xuôi vai cho áo dài:** các nguồn raglan không dùng khái niệm này; với tay thường chưa tìm được công thức VN cụ thể.

---

## 5. Nhận xét tổng hợp

1. **Bảng công thức gốc của nghệ nhân là đáng tin** — hạ nách `vòng nách/2 − 1` cùng họ với giáo trình áo dài raglan VN (`vòng nách/2 + 2`) và nguyên lý quốc tế (hạ nách theo số đo dọc thực, không phải /12 chu vi); yêu cầu sleeve cap ease 3–4cm trùng khít chuẩn quốc tế (¾"–1¾"). Vấn đề duy nhất của bảng gốc: chưa định nghĩa rộng cổ/hạ cổ tách bạch (chỉ có "chiều dài cổ = vòng cổ/5") và chưa có công thức hạ eo/dài áo trong dựng hình.
2. **Sai lệch phát sinh ở khâu soạn story spec 11.2**, sau đó được code và test "đóng băng" lại. Các hệ số `/12`, `/16` không xuất hiện trong bất kỳ nguồn nào (nội bộ lẫn bên ngoài) — nhiều khả năng là lỗi chép/bịa khi soạn spec.
3. **Hướng offset trước/sau đang ngược với thực hành phổ biến** (nguồn VN: thân trước rộng hơn ở ngực để ôm khuôn ngực; bảng nghệ nhân: trước hẹp hơn 1cm ở eo VÀ mông). Cần nghệ nhân phân xử — có thể phương pháp Thanh Lộc (cắt gấp đôi vải theo trục đối xứng) có quy ước riêng.
4. **Render SVG hiện không phản ánh được cả công thức đúng lẫn sai** — kể cả khi sửa hệ số, các lỗi hình học G1–G10 vẫn làm rập sai (thân 60cm cứng, cung ngược chiều, không có cổ).
5. **Một phát hiện tốt:** nhóm công thức tay (cap height, bắp tay, cổ tay) về cơ bản khớp bảng nghệ nhân và tương đương chuẩn quốc tế — chỉ thiếu ràng buộc chu vi nách ↔ đầu tay và render đúng.

> **➡️ Đầu vào sạch cho khâu sửa:** toàn bộ công thức từ 3 nguồn đã được gộp thành **một bảng chuẩn để code**, kèm nhãn độ tin cậy (chuẩn/1 nguồn/suy luận/cần xác minh) và bản đồ "công thức → sửa lỗi G nào": `bang-cong-thuc-hop-nhat-pattern-engine-2026-06-08.md`. Dùng file này làm đầu vào chính cho `bmad-correct-course`.

## 6. Khuyến nghị (theo độ ưu tiên)

| Ưu tiên | Việc | Ghi chú |
|---|---|---|
| P0 | **Xác nhận lại bảng công thức với nghệ nhân (mẹ Lem)** trước khi sửa code: hướng offset trước−sau, rộng cổ + hạ cổ tách bạch, vị trí eo dùng `ha_eo`, quy tắc tà vs mông — dùng bảng phỏng vấn có sẵn: `artisan-interview-checklist.md` | Phương pháp Thanh Lộc là chuẩn đối chứng duy nhất hợp lệ; mọi hệ số không được tự bịa. Đã xác nhận 2026-06-07: tiệm may CẢ HAI kiểu tay (raglan = tay liền cổ; tay tra thẳng với **đầu tay cắt DỰA THEO đường cong nách của thân** — trùng đúng nguyên lý "tam giác tay" quốc tế ở P1) |
| P0 | Sửa `formulas.py` về đúng bảng đã xác nhận (hạ nách, cổ, ease ngực/eo/mông, offset mông, cổ tay +1.5) | Đề xuất chạy `bmad-correct-course` vì ảnh hưởng AC của story 11.2 (đã đóng) |
| P0 | Sửa `svg_export.py`: dùng `do_dai_ao`/`ha_eo` cho chiều dọc; sửa hướng sweep + rx/ry cung đầu tay; dựng cung nách thực từ điểm vai đến điểm nách | Lỗi G1–G5 |
| P1 | Thêm ràng buộc FR93: chu vi cung đầu tay = chu vi cung nách (trước+sau) + 3–4cm; tính cap height hoặc bicep từ ràng buộc này thay vì để 3 đại lượng độc lập | Nguyên lý "tam giác tay" |
| P1 | Viết lại test chính xác hình học với **giá trị đo từ rập thật của nghệ nhân** (chụp/đo rập giấy) thay vì tính lại công thức | Hết kiểm chứng vòng tròn; AC #8 mới có nghĩa |
| P2 | Vẽ cổ áo, độ xuôi vai (nếu tay thường), lượn sườn cong; seam allowance dạng offset path | Lỗi G6, G7, G9, G10 |
| P2 | Xử lý tà: quy tắc khi 37/2 < ¼ mông (tà loe từ hông xuống thay vì gập vào) | Lỗi G8 |

---

## Phụ lục A — Số liệu xác minh hình học

Bộ đo thử: dài áo 120, hạ eo 36, cổ 33, nách 36, ngực 86, eo 66, mông 90, dài tay 60, bắp tay 26, cổ tay 15 (cm).

- Cung nách render: `A 3.0 21.5 0 0 1` từ (22.5, 2.1) → (22.5, 3.0); tâm (19.5, 2.55); **chiều dài cung 0.90cm**.
- Cung đầu tay render: `A 17.0 15.5 0 1 0` từ (0, 17) → (31, 17); tâm (15.5, 23.37); cung chiếm y ∈ [17, 38.87] (vồng xuống); **chiều dài cung 64.27cm**; chiều cao đầu tay thực 21.87cm (thiết kế 17cm).
- Phép chuyển endpoint→center theo W3C SVG 1.1 F.6.5; chiều dài cung tính bằng lấy mẫu 2000 điểm.

## Phụ lục B — Danh mục nguồn chính đã kiểm chứng

VN: 123docz/garmentspace (áo dài raglan — giáo trình), thietkerap.com.vn (Toán Trần — thân sau/trước áo dài raglan), luvinus.com (áo dài + áo bà ba raglan), thoitrangviet247.com, bbcosplay.com (áo bà ba), catmay.edu.vn, daycatmay.edu.vn, aodaihanh.com, video Ngô Gia Hạnh "Thiết kế áo dài tay ráp lăng" (bổ sung 2026-06-08, trích chi tiết tại `cong-thuc-tay-raglan-video-gia-hanh-2026-06-08.md`).
Quốc tế: inthefolds.com (Aldrich-based bodice block), dresspatternmaking.com (ease Aldrich/Armstrong, sleeve block, sleeve cap ease), modelistecreative.com (bodice block), flekka.com (Bunka vs Aldrich), mellysews.com, sewguide.com.
Mỗi công thức trong bảng mục 4 đều qua kiểm chứng đối nghịch (xác minh nguyên văn trên trang nguồn + đối chiếu chéo ≥2 nguồn khi có); các khẳng định bị bác bỏ trong vòng kiểm chứng (ví dụ "+1.5cm là chuẩn ease hông", "7.5–10cm là chuẩn ease phổ quát") đã được hạ cấp hoặc chú thích "không thống nhất giữa nguồn".
