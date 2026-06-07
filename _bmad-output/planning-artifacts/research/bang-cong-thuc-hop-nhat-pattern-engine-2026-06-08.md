# Bảng công thức hợp nhất — chuẩn để code Pattern Engine (Epic 11)

**Ngày:** 2026-06-08
**Mục đích:** Gộp 3 nguồn (vở học may của mẹ · video Ngô Gia Hạnh · bảng brainstorming nghệ nhân 2026-04-02) thành **một bảng công thức chuẩn duy nhất** để làm đầu vào sạch cho `bmad-correct-course` và khâu sửa `backend/src/patterns/`. Mỗi dòng có nhãn độ tin cậy + nguồn, để khi code biết số nào chắc, số nào suy luận, số nào phải hỏi mẹ.

## Chú giải độ tin cậy

| Nhãn | Nghĩa |
|---|---|
| ✅ **Chuẩn** | ≥2 nguồn độc lập khớp (vở + video, hoặc vở + giáo trình VN/quốc tế) |
| 🟡 **1 nguồn** | Chỉ ở vở của mẹ (đáng tin vì là vở học của mẹ, nhưng chưa xác nhận chéo) |
| 🔵 **Suy luận** | Không có trực tiếp; suy từ logic/đối xứng trước-sau |
| ⚠️ **Xác minh** | Chữ khó đọc hoặc 2 nguồn mâu thuẫn — hỏi mẹ trước khi tin |

**Nguồn:** V = vở của mẹ · VID = video Gia Hạnh · BS = bảng brainstorming 2026-04-02 · GT = giáo trình VN/quốc tế (báo cáo §4) · QT = quy tắc nghề mẹ nói miệng 2026-06-07.

**Bộ số đo mẫu dùng cho cột "ví dụ"** (cm): dài áo 100 · hạ eo 36 · vòng cổ 36 · vòng nách 34 · vòng ngực 84 · vòng eo 66 · vòng mông 90 · dài tay 60 · bắp tay 32 · cửa tay 15 · dang ngực 17 · hạ ben ngực 23 · xuôi vai 4 · rộng vai 36.

---

## 0. Số đo đầu vào (15 số)

| # | Số đo | Engine hiện có? | Dùng cho |
|---|---|---|---|
| 1 | Dài áo | ✓ | dài thân |
| 2 | Hạ eo | ✓ | vị trí eo |
| 3 | Vòng cổ | ✓ | cổ, đầu tay |
| 4 | Vòng nách | ✓ | hạ nách thân |
| 5 | Vòng ngực | ✓ | ngang ngực, hạ nách tay raglan |
| 6 | Vòng eo | ✓ | ngang eo |
| 7 | Vòng mông | ✓ | ngang mông, tà |
| 8 | Dài tay | ✓ | dài tay |
| 9 | Vòng bắp tay | ✓ | ngang bắp tay |
| 10 | Vòng cổ tay | ✓ | cửa tay |
| 11 | **Hạ ben/chiết ngực** | ✗ MỚI | định vị đỉnh ngực (ben sườn) |
| 12 | **Dang ngực** (khoảng cách 2 đỉnh ngực) | ✗ MỚI | định vị đỉnh ngực ngang |
| 13 | **Hạ mông** (eo→mông) | ✗ (đang hard-code) | vị trí mông; mặc định 18 |
| 14 | **Xuôi vai** | ✗ MỚI | độ dốc vai (set-in) |
| 15 | **Rộng vai** | ✗ MỚI | ngang vai (set-in) |

> Số 13: hiện engine hard-code 60cm cho cả thân — phải thay bằng dài áo + ha_eo + (hạ mông=18). Số 11/12/14/15 chỉ cần khi bật ben ngực / kiểu set-in.

## Quy ước hệ toạ độ dựng hình

- **Trục giữa thân** = đường dọc; rập là **nửa thân**, trục giữa là nếp gấp đôi vải (không chừa đường may tại đây).
- **Đường ngang vai** = mốc trên cùng; mọi "hạ X" đo **xuống** từ đường này.
- Các đường ngang (từ trên xuống): ngang vai → hạ nách → hạ eo → hạ mông → lai (gấu).
- Mọi "ngang X" đo **từ trục giữa ra**.
- **Hạ mông = hạ eo + 18cm** (mông cách eo 18cm, trung bình; có thể đo).

---

## 1. THÂN SAU (raglan) — 1 chi tiết, vải gấp đôi, rọc giữa phía trên để may dây kéo

### Dọc (hạ — từ ngang vai)
| Điểm | Công thức | Ví dụ | Tin cậy | Nguồn |
|---|---|---|---|---|
| AB Dài áo | = dài áo | 100 | 🔵 | suy (TT = +1 sa vạt +3 ben) |
| AC Hạ nách | = vòng nách/2 + 1 | 18 | ✅ | V+VID |
| AD Hạ eo | = hạ eo | 36 | ✅ | V+VID |
| AE Hạ mông | = hạ eo + 18 | 54 | 🟡 | V (18 trung bình) |

### Ngang (từ trục giữa)
| Điểm | Công thức | Ví dụ | Tin cậy | Nguồn |
|---|---|---|---|---|
| Ngang cổ | = vòng cổ/8 − 1 | 3,5 | ✅ | V+VID |
| Lên cổ sau | = 0,5 (đánh cong) | 0,5 | 🟡 | V |
| Ngang ngực | = vòng ngực/4 + 0→0,5 cử động | 21,5 | ✅ | V+VID+GT |
| Ngang eo | = vòng eo/4 + 3 *(gồm 2 ben + 1 cử)* | 19,5 | ✅ | V+VID |
| Ngang mông | = vòng mông/4 + 1 | 23,5 | 🟡 | V |
| Ngang tà (lai) | = vòng mông/4 + 2 *(tà luôn ≥ mông)* | 24,5 | ✅ | V+VID |

### Ben thân sau (tùy chọn, khi cần ôm)
- Vị trí: trục song song trục giữa, tại ~½ ngang eo. Đầu trên = ngang nách, đầu dưới = trên mông 5cm.
- Rộng = 2cm (nếu có cong dán lưng, đã trừ 1) / 3cm (nếu không). 🟡 V+VID
- Cong dán lưng (tùy chọn): lùi 0,2 ở cổ, eo lụi 1cm.

> **Sau khi vẽ: đo vòng nách thân sau bằng thước dây, lưu lại** (ví dụ ≈ 28,5) → dùng cho FR93 (mục 5).

---

## 2. THÂN TRƯỚC (raglan) — 1 chi tiết, vải gấp đôi nguyên (chuẩn Thanh Lộc)

### Dọc
| Điểm | Công thức | Ví dụ | Tin cậy | Nguồn |
|---|---|---|---|---|
| A′B′ Dài thân | = dài áo + 1 (sa vạt) + 3 (ben ngực) | 104 | ✅ | V+VID |
| A′C′ Hạ nách | = vòng nách/2 | 17 | ✅ | V+VID |
| A′D′ Hạ eo | = hạ eo + 3 | 39 | ✅ | V+VID |
| Hạ mông | = hạ eo + 18 | 54 | 🟡 | V |

### Ngang
| Điểm | Công thức | Ví dụ | Tin cậy | Nguồn |
|---|---|---|---|---|
| Ngang cổ | = vòng cổ/8 + 0,5 | 5,0 | ✅ | V+VID |
| Hạ cổ | = vòng cổ/8 + 1,5 *(= vào cổ + 1)* | 6,0 | ✅ | V+VID |
| Ngang ngực | = vòng ngực/4 + 1 *(1cm này bị ben sườn "ăn", áo ôm vẫn cộng)* | 22 | ✅ | V+VID |
| Ngang eo | = vòng eo/4 + 4 *(gồm 3 ben + 1 cử)* | 20,5 | 🟡 | V |
| Ngang mông | = vòng mông/4 + 1 | 23,5 | 🟡 | V |
| Ngang tà | = vòng mông/4 + 2 | 24,5 | ✅ | V+VID |

### Ben sườn (ben ngực) — VID
- Đỉnh ngực: ngang = dang ngực/2 từ trục giữa; dọc = hạ ben ngực (≈23) từ ngang vai *(hoặc chéo ngực = hỏm cổ→đỉnh ≈19)*.
- Ben sườn: từ ngang eo lên 7cm; rộng **3cm** (ngực lép) / **4cm** (ngực đầy); đỉnh ben cách đỉnh ngực 3cm; 2 cạnh xéo bằng nhau. Chích xong → vòng nách tự hẹp 1cm. 🟡 VID

### Ben eo — VID
- Hạ chân ngực = **vòng ngực/10** dưới đỉnh ngực (ví dụ 8,4). Rộng ben 3cm (1,5 mỗi bên), tại chân ngực 2,5cm; kết thúc trên mông 5cm. 🟡 VID
- Sa vạt: lai trước võng xuống hơn lai sau 1cm. ✅ V+VID
- Xẻ tà: ngay eo (người lớn tuổi: dưới eo ~2cm).

> **Sau khi vẽ: đo vòng nách thân trước, lưu lại** (ví dụ ≈ 23,5) → FR93.

---

## 3. TAY RAGLAN — 2 chi tiết đối xứng, canh sợi dọc

### Dọc (từ đỉnh tay)
| Điểm | Công thức | Ví dụ | Tin cậy | Nguồn |
|---|---|---|---|---|
| AB Dài tay | = dài tay (+2 tùy) | 60 | ✅ | V+VID |
| AC Hạ nách tay | = **vòng ngực/4 − 1** (ôm −0; vừa −0,5) | 20 | ✅ | V+VID |
| Hạ bắp tay | = hạ nách tay + 10cm | 30 | 🟡 | V+VID |
| Hạ khuỷu | = dài tay/2 | 30 | 🟡 | V |

### Ngang
| Điểm | Công thức | Ví dụ | Tin cậy | Nguồn |
|---|---|---|---|---|
| Ngang cổ phía trước | = vòng cổ/8 | 4,5 | ✅ | V+VID |
| Ngang cổ phía sau | = (ngang cổ trước)/2 | 2,25 | 🟡 | V |
| Lên cổ phía sau | = 1,5 | 1,5 | 🟡 | V |
| DF Ngang bắp tay | = vòng bắp tay/2 | 16 | ✅ | V+VID |
| CE Ngang nách tay | = ngang bắp tay + 1 | 17 | ✅ | V+VID |
| Cửa tay | = vòng cổ tay (canh đều 2 bên) | 15 | ✅ | V+VID |

- Sườn tay: đánh cong vào 0,5 ở giữa. 🟡
- Đường nách tay ("giống nách thân"): chia 3; **trước** cơi vào 2 + (giữa) 0,2; **sau** cơi vào 1,5 + 0,2. ✅ V+VID

---

## 4. TAY SET-IN (tay tra thẳng) — PHƯƠNG PHÁP, không phải công thức số

> **Quy tắc gốc của mẹ (QT 2026-06-07):** *đầu tay cắt DỰA THEO đường cong nách của thân.* Đây là cách sửa lỗi nặng nhất của engine (công thức tay độc lập). Trùng nguyên lý "tam giác tay" quốc tế.

| Thành phần | Cách dựng | Tin cậy | Nguồn |
|---|---|---|---|
| Cap height (đầu tay cao) | vòng nách/2 − 1 *(quy ước riêng; PHẢI đi cùng ràng buộc chu vi)* | 🟡 | BS |
| Đường cong đầu tay | **dựng từ chu vi đường nách thân** (đo nách trước+sau) sao cho chu vi cap = chu vi nách + ease 3–4cm | ✅ | QT+GT |
| Ngang bắp tay | vòng bắp tay/2 + 2,5 | 🟡 | BS |
| Cửa tay | vòng cổ tay/2 + 1 (mẹ: +1,5) | 🟡 | BS |
| Thân kiểu set-in | ngang ngực/eo/mông **giống thân raglan** (chỉ khác vai/nách) | 🔵 | suy |

**Thân set-in — phần vai (tr.45):** ngang vai = ½ rộng vai (sườn xám: −1); xuôi vai = số đo (trước +0,5); ngang cổ = vòng cổ/6 ⚠️ *(mâu thuẫn raglan /8 — hỏi mẹ)*; hạ cổ sau = vòng cổ/10 + 0,5 ⚠️.

---

## 5. RÀNG BUỘC FR93 — chu vi nách thân ↔ đầu tay (thuật toán)

Đây là quy trình mẹ làm bằng thước dây (V+VID), nên cài thành ràng buộc cứng thay vì để cap height/bắp tay/vòng nách độc lập:

```
1. Dựng xong thân → đo chu vi cung nách thân trước (Lf) và sau (Lb).
2. Mục tiêu chu vi đầu tay:
   - phía trước = Lf + 1cm cử động
   - phía sau   = Lb + 1→1,5cm cử động
3. Dựng đường nách tay → đo chu vi thực.
4. Lệch thì hiệu chỉnh (cơi thẳng góc lên / giảm xuống) cho khớp mục tiêu.
5. Nối lại bằng đường cong mềm. Khi may: "cầm 1 phân" để phân bổ ease.
```
→ Engine: tính `bicep`/`cap_height` (hoặc điểm cơi) **từ** Lf/Lb, không nhận 3 đại lượng độc lập. Sửa lỗi G5 (chênh +62cm hiện tại).

---

## 6. LÁ CỔ (cổ đứng) & VẠT CON

**Lá cổ:** dài = vòng cổ **đo trên rập sau khi ráp** + 0,5 ✅ VID. Bản nhỏ 2,5–3cm; bản to 4–4,5cm (phải khoét chân cổ rộng). Cổ **cắt sát** (may cách mép 0,5). 2 chi tiết đối xứng, canh sợi ngang. Cổ thuyền = biến thể (Bài 4) — **hoãn**, tính năng phụ.

**Vạt con:** mảnh thứ 4, xuất hiện ở hình rập + quy trình may bước 2 ("may vạt con vào thân"). Kích thước **chưa có** → ⚠️ hỏi mẹ (checklist 16b). Engine hiện chưa có khái niệm này.

---

## 7. ĐƯỜNG MAY (offset theo từng cạnh — KHÔNG cộng đồng loạt)

| Cạnh | Chừa | Tin cậy |
|---|---|---|
| Thân, nách, tay, nách tay | 2cm | ⚠️ V (đọc chưa chắc) |
| Lai / gấu | 2–3cm | 🟡 V |
| Cổ | **cắt sát** (0; may cách mép 0,5) | ✅ V+VID |
| Nếp gấp đôi (trục giữa) | **không chừa** | ✅ V+VID+QT |

> Đây là cách giải đồng thời **lỗi G9** (engine cộng seam vào x đồng loạt) VÀ **độ lệch vở↔brainstorming**: bảng BS gộp đường may vào công thức (vd eo/4 +1 +2,5 +2,5), vở tách riêng (eo/4 +3 ben, seam offset sau). → **Quyết định: dùng công thức VỞ, xử lý đường may bằng offset path riêng theo bảng trên.**

---

## 8. Bản đồ công thức → sửa lỗi engine

| Lỗi (báo cáo) | Dòng công thức sửa |
|---|---|
| G1 thân hard-code 60cm | mục 0 số 13 + dọc thân (dài áo, hạ eo, hạ mông=18) |
| G2 eo/mông tỉ lệ cứng | dùng hạ eo thật + hạ mông=eo+18 |
| G3/G4 cung arc rx/ry+sweep sai | dựng cung nách thật từ điểm vai→nách (mục 1–2) |
| G5 không ràng buộc nách↔tay | mục 5 (FR93) |
| G6 rộng cổ = 1cm | ngang cổ = cổ/8 ±x (mục 1–2), tách khỏi seam |
| G7 vai ngang tuyệt đối | xuôi vai (set-in, mục 4); raglan: lên cổ 0,5 |
| G8 tà < mông | ngang tà = mông/4 + 2 (luôn ≥ mông) |
| G9 seam cộng đồng loạt | mục 7 (offset theo cạnh) |
| G10 cổ/sườn vẽ bằng L thẳng | đánh cong cổ (chia đôi cạnh) + lượn sườn |
| Hệ số bịa /12, /16 | thay bằng nách/2±1, cổ/8±x |
| Test vòng tròn FR92 | viết lại bằng số đo rập thật (buổi cắt mẫu nhóm G) |

---

## 9. Việc còn mở (không chặn correct-course)

| Hạng mục | Trạng thái | Cần |
|---|---|---|
| Ease set-in thân trước | 🔵 suy luận | hỏi mẹ xác nhận (không chặn) |
| Ngang cổ set-in /6 vs raglan /8 | ⚠️ mâu thuẫn | hỏi mẹ |
| Chừa đường may 2cm | ⚠️ đọc chưa chắc | hỏi mẹ |
| Kích thước vạt con | ⚠️ chưa có | hỏi mẹ (16b) |
| Hướng offset trước/sau ở ngực | ⚠️ V vs GT ngược nhau | hỏi mẹ |
| Số đo rập thật cho test FR92 | ✗ | buổi cắt mẫu ghi hình (nhóm G) |
| Cổ thuyền | hoãn | tính năng phụ sau |

> Toàn bộ phần ⚠️/🔵 đều có thể **tạm chốt theo vở của mẹ + đánh dấu trong code** rồi xác nhận sau — không cản việc bắt đầu correct-course. Quyết định mặc định khi mâu thuẫn: **ưu tiên vở của mẹ** (nguồn ground-truth cấp 1).
