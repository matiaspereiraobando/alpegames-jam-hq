#!/bin/bash
# Alpe Games Jam HQ - Deploy Script
# Run this on the VPS: bash scripts/deploy.sh
set -euo pipefail

APP_DIR="/opt/alpegames/jam-hq"
REPO="https://github.com/matiaspereiraobando/alpegames-jam-hq.git"

echo "=== Deploying Jam HQ ==="

# 1. Clone or pull latest
if [ -d "$APP_DIR/.git" ]; then
    echo "[1/6] Pulling latest changes..."
    cd "$APP_DIR"
    git fetch origin
    git checkout master
    git pull --ff-only origin master
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
mkdir -p .next/standalone/.next
rm -rf .next/standalone/.next/static
cp -R .next/static .next/standalone/.next/static

if [ -d public ]; then
  rm -rf .next/standalone/public
  cp -R public .next/standalone/public
fi

# 5. Restart service
echo "[5/6] Restarting Jam HQ service..."
systemctl daemon-reload
systemctl restart jam-hq
systemctl enable jam-hq

# 6. Smoke checks
echo "[6/6] Running smoke checks..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/ || true)
HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health || true)

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
