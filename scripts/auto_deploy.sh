#!/usr/bin/env bash
# Tự động deploy aodaithanhloc.com: cron gọi mỗi phút, nếu origin/main có
# commit mới thì git pull (ff-only) + rebuild Docker. Xem DEPLOY-aodaithanhloc.md.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOCK=/tmp/tailor_auto_deploy.lock
LOG="$REPO/logs/auto_deploy.log"

mkdir -p "$REPO/logs"

# Một instance duy nhất; nếu đang rebuild dở thì lần cron sau bỏ qua luôn.
exec 9>"$LOCK"
flock -n 9 || exit 0

cd "$REPO"

git fetch origin --quiet

LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

[ "$LOCAL" = "$REMOTE" ] && exit 0
# Local đi trước origin (commit chưa push) → không có gì mới để deploy.
git merge-base --is-ancestor "$REMOTE" "$LOCAL" && exit 0

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') phát hiện commit mới: ${LOCAL:0:7} -> ${REMOTE:0:7}"

  if ! git merge --ff-only origin/main; then
    echo "!!! Không fast-forward được (lịch sử phân nhánh hoặc xung đột) — cần xử lý tay."
    exit 1
  fi

  # Server đặt COMPOSE_FILE trong .env (thêm overlay docker-compose.server.yml);
  # docker compose chỉ đọc biến đó khi không truyền -f.
  if grep -q '^COMPOSE_FILE=' .env 2>/dev/null; then
    docker compose up -d --build
  else
    docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  fi

  echo "=== $(date '+%Y-%m-%d %H:%M:%S') deploy xong tại $(git rev-parse --short HEAD)"
} >>"$LOG" 2>&1
