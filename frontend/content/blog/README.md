# Blog content — `frontend/content/blog/`

Mỗi bài viết là **một file Markdown** `<slug>.md` với YAML frontmatter. Site đọc các
file này lúc **build (SSG)**, nên một bài mới xuất hiện sau khi repo được **deploy lại**.

Tên file = slug = đường dẫn: `frontend/content/blog/cach-chon-vai-ao-dai.md` → `/blog/cach-chon-vai-ao-dai`.

## Frontmatter

```yaml
---
title: "Tiêu đề bài viết"           # bắt buộc
description: "Mô tả SEO 150–160 ký tự" # nên có (meta description, OG)
excerpt: "Tóm tắt ngắn cho thẻ bài"    # nên có (mặc định = description)
publishedDate: 2026-06-09             # YYYY-MM-DD (không đặt trong nháy)
category: cam-nang                    # slug; xem bảng nhãn bên dưới
tags: ["áo dài", "chọn vải"]          # tùy chọn
image: /blog/<slug>/cover.jpg         # tùy chọn; đường dẫn dưới /public hoặc URL ngoài
imageAlt: "Mô tả ảnh"                 # tùy chọn (mặc định = title)
author: "Nhà May Thanh Lộc"           # tùy chọn
draft: false                          # true → ẩn ở production
---

Nội dung Markdown… (h2/h3, **đậm**, danh sách, > trích dẫn, bảng, ảnh đều được render).
```

Trường nào thiếu đều có mặc định an toàn (xem `src/lib/blog.ts`). `category` là **chuỗi tự do**:
slug lạ vẫn hiển thị được (nhãn suy ra từ slug). Các slug có nhãn tiếng Việt sẵn:

| slug        | nhãn hiển thị     |
|-------------|-------------------|
| `cam-nang`  | Cẩm nang          |
| `xu-huong`  | Xu hướng          |
| `cau-chuyen`| Câu chuyện nghề   |
| `huong-dan` | Hướng dẫn         |
| `cham-soc`  | Chăm sóc áo dài   |

Thêm nhãn mới trong `CATEGORY_LABELS` ở `src/lib/blog.ts`.

Ảnh: đặt file dưới `frontend/public/blog/<slug>/…` rồi tham chiếu `image: /blog/<slug>/cover.jpg`
(đường dẫn tuyệt đối tính từ gốc `/public`). URL ngoài (`https://…`) cũng dùng được.

---

## Tự động sinh bài SEO từ `auto_workflow/seo-cockpit`

Cockpit publish bằng cách **git commit file Markdown vào repo của một "Website"**. Website cho
trang này **đã được đăng ký sẵn** (slug `nha-may-thanh-loc`) — không cần tạo lại. Cấu hình:

| khoá `frontmatterMap` | giá trị | tác dụng |
|---|---|---|
| `path` | `frontend/content/blog` | nơi commit file `.md` (đúng thư mục này) |
| `publicPrefix` | `/blog` | tiền tố URL ghi vào frontmatter `image` |
| `mediaFolder` | `frontend/public/blog` | nơi commit ảnh nhị phân trong repo |
| `requiredFields` | `["description","excerpt"]` | trường bắt buộc trước khi đăng (ảnh KHÔNG bắt buộc) |

Repo đích: `HaiLammm/datn-tailor-web@main`, token `GITHUB_TOKEN` (server-side).

**Đa-site đã hỗ trợ:** cockpit đọc các khoá trên qua `cockpit/lib/website-content.ts` — site
setsubi giữ nguyên hành vi cũ, trang này nhận cấu hình riêng. Không còn phụ thuộc cứng vào
`src/content/blog` hay `public/images/SEO`.

**`category`:** quá trình *sinh bài* của cockpit gợi ý enum `electricity|water` (cho setsubi),
nhưng phía tailor `category` là **chuỗi tự do** nên không vỡ — chỉ cần sửa lại thành slug áo dài
(vd `cam-nang`, `cau-chuyen`) trong khung Frontmatter trước khi đăng; slug lạ vẫn hiển thị (nhãn
suy ra từ slug).

**Lưu ý deploy:** `next.config.ts` đặt `output: "standalone"`, nên bài mới chỉ xuất hiện sau khi
**deploy lại app** (đánh đổi đã chọn của mô hình file-based). Hợp đồng frontmatter ở trên khớp
1-1 với các trường cockpit phát ra (`title/description/excerpt/publishedDate/category/image/imageAlt`).
