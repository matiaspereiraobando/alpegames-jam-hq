#!/bin/bash
# Alpe Games Jam HQ - Deploy Script
# Run this on the VPS: bash scripts/deploy.sh
set -euo pipefail

APP_DIR="/opt/alpegames/jam-hq"
DATA_DIR="/opt/alpegames/jam-hq-data"
REPO="https://github.com/matiaspereiraobando/alpegames-jam-hq.git"

echo "=== Deploying Jam HQ ==="

# 1. Clone or pull latest
if [ -d "$APP_DIR/.git" ]; then
    echo "[1/6] Pulling latest changes..."
    cd "$APP_DIR"
    git fetch origin
    git checkout master
    # Force-sync with remote to handle history rewrites (e.g. secret scrubbing)
    git reset --hard origin/master
else
    echo "[1/6] Cloning repository..."
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
    git checkout master
fi

# 2. Install dependencies
echo "[2/6] Installing dependencies..."
npm ci

# 3. Build
echo "[3/6] Building Next.js app..."
npm run build

# 4. Prepare standalone static/public assets
# Next standalone does NOT automatically include .next/static assets.
# Without this copy, production can render unstyled pages (CSS 404).
echo "[4/6] Syncing static assets for standalone runtime..."
bash scripts/prepare-standalone.sh

# 5. Ensure persistent data dir + restart services
echo "[5/6] Restarting Jam HQ services..."
mkdir -p "$DATA_DIR"
mkdir -p /var/log/jamhq-automation

# If an old DB exists under app dir but persistent DB does not, migrate once.
if [ -f "$APP_DIR/data/jam-hq.db" ] && [ ! -f "$DATA_DIR/jam-hq.db" ]; then
  cp "$APP_DIR/data/jam-hq.db" "$DATA_DIR/jam-hq.db"
fi

install -m 0644 scripts/jamhq-automation-worker.service /etc/systemd/system/jamhq-automation-worker.service

systemctl daemon-reload
systemctl restart jam-hq
systemctl enable jam-hq
systemctl restart jamhq-automation-worker
systemctl enable jamhq-automation-worker

# 6. Smoke checks (retry up to 10 times with 3s delay for app startup)
echo "[6/6] Running smoke checks..."
STATUS="000"
HEALTH="000"
for i in $(seq 1 10); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ 2>/dev/null || true)
  HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health 2>/dev/null || true)
  if [ "$STATUS" = "200" ] && [ "$HEALTH" = "200" ]; then
    break
  fi
  echo "  Waiting for app to start... (attempt $i/10, HTTP ${STATUS})"
  sleep 3
done

echo ""
echo "=== Deploy Complete ==="
echo "Service status: $(systemctl is-active jam-hq)"
echo "Home status: ${STATUS}"
echo "Health status: ${HEALTH}"
echo "App URL: https://jam.alpegames.cl"
echo ""

if [ "$STATUS" != "200" ]; then
  echo "ERROR: homepage check failed (HTTP ${STATUS})"
  exit 1
fi

if [ "$HEALTH" != "200" ]; then
  echo "ERROR: health check failed (HTTP ${HEALTH})"
  exit 1
fi

exit 0
