#!/usr/bin/env bash
set -euo pipefail

# Create a new Alpe Games jam repo from template with all secrets configured.
# Usage: ./create-jam-repo.sh <jam-number> <jam-name>
# Example: ./create-jam-repo.sh 1 platformer-escape

JAM_NUMBER="${1:?Usage: create-jam-repo.sh <jam-number> <jam-name>}"
JAM_NAME="${2:?Usage: create-jam-repo.sh <jam-number> <jam-name>}"
SKIP_HQ_REGISTER="${3:-}"  # pass --skip-hq-register to skip Jam HQ registration
REPO_NAME="alpegames-jam-$(printf '%03d' "$JAM_NUMBER")-$JAM_NAME"
ORG="matiaspereiraobando"
TEMPLATE="$ORG/alpegames-jam-template"
WORKSPACE="/root/alpegames-jam-projects"

# Load secrets from env vars (set by systemd) or fallback to Hermes .env file
if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  HERMES_ENV="$HOME/.hermes/.env"
  if [[ -f "$HERMES_ENV" ]]; then
    TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$HERMES_ENV" | cut -d= -f2)
    TELEGRAM_CHAT_ID=$(grep '^TELEGRAM_HOME_CHANNEL=' "$HERMES_ENV" | cut -d= -f2)
  fi
fi

# Fallback: TELEGRAM_HOME_CHANNEL (systemd) -> TELEGRAM_CHAT_ID (script)
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-${TELEGRAM_HOME_CHANNEL:-}}"

if [[ -z "${TELEGRAM_BOT_TOKEN:-}" ]]; then
  echo "WARNING: TELEGRAM_BOT_TOKEN not set; GitHub secrets will not be configured."
fi

VPS_SSH_KEY=$(cat "$HOME/.ssh/id_ed25519_jamhq" 2>/dev/null || echo "")
VPS_HOST="161.35.55.246"
VPS_USER="root"

echo "=== Creating Jam Repo: $REPO_NAME ==="

# 1. Create repo from template
echo "[1/5] Creating repo from template..."
if gh repo view "$ORG/$REPO_NAME" &>/dev/null; then
  echo "  Repo $ORG/$REPO_NAME already exists, skipping creation."
else
  gh repo create "$ORG/$REPO_NAME" --template "$TEMPLATE" --public --clone=false
  echo "  Created $ORG/$REPO_NAME"
fi

# 2. Set GitHub secrets
echo "[2/5] Setting GitHub secrets..."
echo "$TELEGRAM_BOT_TOKEN" | gh secret set TELEGRAM_BOT_TOKEN --repo "$ORG/$REPO_NAME" 2>/dev/null && echo "  TELEGRAM_BOT_TOKEN set" || echo "  TELEGRAM_BOT_TOKEN skipped (already set or error)"
echo "$TELEGRAM_CHAT_ID" | gh secret set TELEGRAM_CHAT_ID --repo "$ORG/$REPO_NAME" 2>/dev/null && echo "  TELEGRAM_CHAT_ID set" || echo "  TELEGRAM_CHAT_ID skipped"
echo "$VPS_SSH_KEY" | gh secret set VPS_SSH_KEY --repo "$ORG/$REPO_NAME" 2>/dev/null && echo "  VPS_SSH_KEY set" || echo "  VPS_SSH_KEY skipped"
echo "$VPS_HOST" | gh secret set VPS_HOST --repo "$ORG/$REPO_NAME" 2>/dev/null && echo "  VPS_HOST set" || echo "  VPS_HOST skipped"
echo "$VPS_USER" | gh secret set VPS_USER --repo "$ORG/$REPO_NAME" 2>/dev/null && echo "  VPS_USER set" || echo "  VPS_USER skipped"

# 3. Clone locally
echo "[3/5] Cloning repo locally..."
if [[ -d "$WORKSPACE/$REPO_NAME" ]]; then
  echo "  Directory $WORKSPACE/$REPO_NAME already exists, pulling latest."
  cd "$WORKSPACE/$REPO_NAME" && git pull --ff-only origin master 2>/dev/null || true
else
  gh repo clone "$ORG/$REPO_NAME" "$WORKSPACE/$REPO_NAME"
fi

# 4. Set up VPS game directory
echo "[4/5] Preparing VPS game directory..."
JAM_SLUG="$(printf '%03d' "$JAM_NUMBER")"
JAM_GAME_DIR="/opt/alpegames/games/jam-$JAM_SLUG"
LOCAL_HOSTNAME=$(hostname 2>/dev/null || echo "")
if [[ "$LOCAL_HOSTNAME" == *"ubuntu-s-1vcpu"* ]] || [[ -d /opt/alpegames ]]; then
  # Running on the VPS — create directly
  mkdir -p "$JAM_GAME_DIR" && echo "  VPS directory created: $JAM_GAME_DIR" || echo "  VPS directory creation failed"
else
  # Running locally — SSH to VPS
  ssh -i "$HOME/.ssh/id_ed25519_jamhq" -o ConnectTimeout=10 "root@$VPS_HOST" "mkdir -p $JAM_GAME_DIR" 2>/dev/null && echo "  VPS directory created" || echo "  VPS directory skipped (SSH failed)"
fi

# 5. Register in Jam HQ (skip if triggered from Jam HQ to prevent loop)
if [[ "$SKIP_HQ_REGISTER" == "--skip-hq-register" ]]; then
  echo "[5/5] Skipping Jam HQ registration (--skip-hq-register)"
else
  echo "[5/5] Registering project in Jam HQ..."
  curl -s -X POST "https://jam.alpegames.cl/api/projects" \
    -H "Content-Type: application/json" \
    -H "X-Jamhq-Automation-Source: script" \
    -d "{
      \"title\": \"Jam #$JAM_NUMBER - $JAM_NAME\",
      \"description\": \"Auto-created from template\",
      \"engine\": \"Love2D\",
      \"status\": \"active\"
    }" > /dev/null && echo "  Project registered in Jam HQ" || echo "  Jam HQ registration skipped"
fi

# Emit structured result for the automation worker
JAM_SLUG_DIR="/opt/alpegames/games/jam-$JAM_SLUG"
REPO_URL="https://github.com/$ORG/$REPO_NAME"
echo "JAMHQ_RESULT={\"repo_url\":\"$REPO_URL\",\"vps_path\":\"$JAM_SLUG_DIR\"}" >&2

echo ""
echo "=== Done ==="
echo "Repo:    https://github.com/$ORG/$REPO_NAME"
echo "Local:   $WORKSPACE/$REPO_NAME"
echo "VPS:     /opt/alpegames/games/jam-$JAM_SLUG"
echo "Jam HQ:  https://jam.alpegames.cl"
echo ""
echo "Next steps:"
echo "  1. cd $WORKSPACE/$REPO_NAME"
echo "  2. Fill in GDD.md and conf.lua"
echo "  3. Start building your game!"
echo "  4. Push feature branches and open PRs — AI reviewer handles the rest."
