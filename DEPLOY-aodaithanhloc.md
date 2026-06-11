# Triển khai aodaithanhloc.com (home server + Cloudflare Tunnel)

Stack đã đóng gói Docker sẵn (`db` + `backend` + `frontend`). Phần production thêm
`cloudflared` để đưa domain ra Internet — **không cần mở cổng router hay IP tĩnh**,
Cloudflare tự lo HTTPS. Tất cả service đặt `restart: unless-stopped` và Docker đã
**bật theo boot**, nên sau khi `up -d` một lần là **tự chạy lại mỗi lần khởi động máy**.

## 1. Tạo Cloudflare Tunnel (một lần)

1. Cloudflare **Zero Trust** → **Networks → Tunnels → Create a tunnel** (loại *Cloudflared*).
2. Đặt tên (vd `aodaithanhloc`), **copy token** ở bước "Install connector"
   (chuỗi dài bắt đầu `eyJ...`). KHÔNG cần cài cloudflared theo hướng dẫn của họ —
   ta chạy bằng Docker.
3. Tab **Public Hostname → Add a public hostname**:
   - **Subdomain:** để trống — **Domain:** `aodaithanhloc.com`
   - **Service:** `HTTP` → `frontend:3000`
   - (Tuỳ chọn) thêm bản ghi thứ hai cho `www.aodaithanhloc.com` cũng trỏ `frontend:3000`.
   Cloudflare tự tạo bản ghi DNS (CNAME) cho domain (DNS đang ở Cloudflare).

## 2. Cấu hình secret

```bash
cd ~/Projects/tailor_project
cp .env.prod.example .env
# Dán token vào CLOUDFLARE_TUNNEL_TOKEN=...
# (nên đổi JWT_SECRET_KEY và AUTH_SECRET cho production)
```

## 3. Build + chạy

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- Frontend được build với `NEXT_PUBLIC_*` = `https://aodaithanhloc.com` (các biến này
  nhúng lúc build — đã xử lý trong `frontend/Dockerfile` + overlay).
- DB tái dùng volume `postgres_data` hiện có (giữ nguyên dữ liệu showroom).

Kiểm tra:
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
docker logs -f tailor_project-cloudflared-1   # thấy "Registered tunnel connection"
```
Mở https://aodaithanhloc.com.

## 4. Tự chạy khi khởi động máy

Đã đạt sẵn nhờ: `restart: unless-stopped` + `systemctl is-enabled docker` = **enabled**.
Sau khi `up -d`, mỗi lần boot Docker khởi động lại các container. Không cần systemd unit riêng.

Kiểm tra nhanh: `sudo reboot` rồi `docker compose ... ps` thấy tất cả `Up`.

## Cập nhật về sau

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```
(blog file-based: bài mới chỉ xuất hiện sau khi build lại — vì `output: standalone`.)

## Ghi chú

- Chỉ `cloudflared` là đường công khai; cổng `3000`/`8000` của base compose chỉ để
  debug nội bộ trên máy (home server sau NAT). Muốn chắc chắn không lộ, có thể bỏ
  `ports:` của `frontend`/`backend` ở base hoặc bind `127.0.0.1`.
- Ảnh sản phẩm showroom nằm ở `frontend/public/uploads/garments/`. Ảnh do chủ tiệm
  upload mới (qua trang Owner) lưu ở volume `backend_uploads`; nếu cần hiển thị, thêm
  route phục vụ `/uploads/*` từ backend (việc riêng, ngoài phạm vi deploy).
