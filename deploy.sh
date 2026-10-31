#!/usr/bin/env bash
# Đẩy mã nguồn lên VPS và build lại container.
# Dùng: SERVER=user@ip ./deploy.sh   (mặc định root@163.61.73.171)
set -euo pipefail

SERVER="${SERVER:-root@163.61.73.171}"
REMOTE_DIR="${REMOTE_DIR:-/opt/hai-dang-sos}"

cd "$(dirname "$0")"
echo "→ Đồng bộ mã nguồn tới $SERVER:$REMOTE_DIR"
ssh "$SERVER" "mkdir -p '$REMOTE_DIR'"
rsync -az --delete \
  --exclude node_modules --exclude dist --exclude dev-dist --exclude .git \
  ./ "$SERVER:$REMOTE_DIR/"

echo "→ Build và khởi động container"
ssh "$SERVER" "cd '$REMOTE_DIR' && docker compose up -d --build && docker compose ps"
echo "✓ Xong. App chạy tại http://<ip-server>:8090 (trỏ domain qua Cloudflare hoặc reverse proxy sẵn có)."
