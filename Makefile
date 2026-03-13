# Root Makefile for Tailor Project (Áo dài AI)

.PHONY: help install dev-frontend dev-backend dev dev-all test lint clean

# Hiển thị các lệnh hỗ trợ
help:
	@echo "Tailor Project Management Commands:"
	@echo "  make install      - Cài đặt dependencies cho cả Frontend và Backend"
	@echo "  make dev          - Chạy đồng thời cả Frontend và Backend (Dev mode)"
	@echo "  make dev-frontend - Chỉ chạy Frontend (Next.js)"
	@echo "  make dev-backend  - Chỉ chạy Backend (FastAPI)"
	@echo "  make test         - Chạy bộ test cho cả hai"
	@echo "  make lint         - Kiểm tra lỗi code (Linting)"
	@echo "  make clean        - Dọn dẹp cache và các file rác"

# Cài đặt dependencies
install:
	@echo "--- Cài đặt Frontend dependencies ---"
	cd frontend && npm install
	@echo "--- Cài đặt Backend dependencies ---"
	cd backend && if [ ! -d "venv" ]; then python3 -m venv venv; fi
	cd backend && ./venv/bin/pip install -r requirements.txt

# Chạy Frontend (Next.js)
dev-frontend:
	cd frontend && npm run dev

# Chạy Backend (FastAPI)
dev-backend:
	cd backend && make run

# Chạy đồng thời cả hai (Sử dụng & để chạy nền)
# Lưu ý: Nhấn Ctrl+C có thể không tắt được cả hai tiến trình nền, 
# khuyên dùng chạy trong các terminal riêng biệt hoặc dùng 'dev' bên dưới.
dev:
	@echo "Đang khởi động hệ thống..."
	@(make dev-backend & make dev-frontend)

# Chạy test
test:
	@echo "--- Chạy Frontend tests ---"
	cd frontend && npm test
	@echo "--- Chạy Backend tests ---"
	cd backend && make test

# Kiểm tra code
lint:
	@echo "--- Linting Frontend ---"
	cd frontend && npm run lint
	@echo "--- Linting Backend ---"
	cd backend && ./venv/bin/ruff check .

# Dọn dẹp
clean:
	@echo "Dọn dẹp..."
	cd backend && make clean
	rm -rf frontend/.next
	rm -rf frontend/node_modules
	@echo "Đã dọn dẹp xong."
