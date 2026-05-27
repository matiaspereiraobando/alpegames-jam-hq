#!/usr/bin/env bash
set -euo pipefail

# Create a new Alpe Games jam repo from template with all secrets configured.
# Usage: ./create-jam-repo.sh <jam-number> <jam-name> [--skip-hq-register]
# Example: ./create-jam-repo.sh 1 platformer-escape --skip-hq-register

usage() {
  echo "Usage: $0 <jam-number> <jam-name> [--skip-hq-register]" >&2
}

if [[ $# -lt 2 ]]; then
  usage
  exit 1
fi

JAM_NUMBER="$1"
JAM_NAME="$2"
shift 2
SKIP_HQ_REGISTER=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-hq-register)
      SKIP_HQ_REGISTER=1
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

REPO_NAME="alpegames-jam-$(printf '%03d' "$JAM_NUMBER")-$JAM_NAME"
ORG="matiaspereiraobando"
TEMPLATE="$ORG/alpegames-jam-template"
WORKSPACE="/root/alpegames-jam-projects"
REPO_URL="https://github.com/$ORG/$REPO_NAME"
LOCAL_PATH="$WORKSPACE/$REPO_NAME"

# Load secrets from Hermes env
HERMES_ENV="$HOME/.hermes/.env"
if [[ ! -f "$HERMES_ENV" ]]; then
  echo "ERROR: $HERMES_ENV not found" >&2
  exit 1
fi

TELEGRAM_BOT_TOKEN=$(grep '^TELEGRAM_BOT_TOKEN=' "$HERMES_ENV" | cut -d= -f2-)
TELEGRAM_CHAT_ID=$(grep '^TELEGRAM_HOME_CHANNEL=' "$HERMES_ENV" | cut -d= -f2-)
VPS_SSH_KEY=$(cat "$HOME/.ssh/id_ed25519_jamhq")
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
if [[ -d "$LOCAL_PATH" ]]; then
  echo "  Directory $LOCAL_PATH already exists, pulling latest."
  cd "$LOCAL_PATH" && git pull --ff-only origin master 2>/dev/null || true
else
  gh repo clone "$ORG/$REPO_NAME" "$LOCAL_PATH"
fi

# 4. Set up VPS game directory
echo "[4/5] Preparing VPS game directory..."
JAM_PADDED="$(printf '%03d' "$JAM_NUMBER")"
VPS_PATH="/opt/alpegames/games/jam-$JAM_PADDED"
VPS_WARNING=""
if ssh -i "$HOME/.ssh/id_ed25519_jamhq" -o ConnectTimeout=10 "$VPS_USER@$VPS_HOST" "mkdir -p $VPS_PATH" 2>/dev/null; then
  echo "  VPS directory created"
else
  echo "  VPS directory skipped (SSH failed)"
  VPS_WARNING="VPS directory skipped (SSH failed)"
fi

# 5. Register in Jam HQ
if [[ "$SKIP_HQ_REGISTER" -eq 1 ]]; then
  echo "[5/5] Skipping Jam HQ registration (--skip-hq-register)"
else
  echo "[5/5] Registering project in Jam HQ..."
  curl -fsS -X POST "https://jam.alpegames.cl/api/projects" \
    -H "Content-Type: application/json" \
    -H "X-Jamhq-Automation-Source: script" \
    -d "{
      \"title\": \"Jam #$JAM_NUMBER - $JAM_NAME\",
      \"description\": \"Auto-created from template\",
      \"engine\": \"Love2D\",
      \"jam_number\": $JAM_NUMBER,
      \"jam_slug\": \"$JAM_NAME\"
    }" > /dev/null
  echo "  Project registered in Jam HQ"
fi

echo ""
echo "=== Done ==="
echo "Repo:    $REPO_URL"
echo "Local:   $LOCAL_PATH"
echo "VPS:     $VPS_PATH"
echo "Jam HQ:  https://jam.alpegames.cl"
echo ""
echo "Next steps:"
echo "  1. cd $LOCAL_PATH"
echo "  2. Fill in GDD.md and conf.lua"
echo "  3. Start building your game!"
echo "  4. Push feature branches and open PRs — AI reviewer handles the rest."

if [[ -n "$VPS_WARNING" ]]; then
  printf 'JAMHQ_RESULT={"repo_url":"%s","local_path":"%s","vps_path":"%s","warning":"%s"}\n' "$REPO_URL" "$LOCAL_PATH" "$VPS_PATH" "$VPS_WARNING" >&2
else
  printf 'JAMHQ_RESULT={"repo_url":"%s","local_path":"%s","vps_path":"%s"}\n' "$REPO_URL" "$LOCAL_PATH" "$VPS_PATH" >&2
fi
