#!/usr/bin/env bash
# Pull leaderboards data commits from GitHub and rebuild the Next.js frontend.
# JSON under frontend/public/data/leaderboards/ is bundled at build time.
#
# Install (on VPS as root):
#   chmod +x /opt/mahoot/deploy/refresh-leaderboards.sh
#   crontab -e   # see deploy/README.md for schedule
#
# Manual run:
#   /opt/mahoot/deploy/refresh-leaderboards.sh

set -euo pipefail

ROOT="${MAHOOT_ROOT:-/opt/mahoot}"
LOG_DIR="$ROOT/deploy/logs"
LOG_FILE="$LOG_DIR/refresh-leaderboards.log"
LOCK_FILE="/tmp/mahoot-refresh-leaderboards.lock"

mkdir -p "$LOG_DIR"

exec >>"$LOG_FILE" 2>&1

echo ""
echo "=== $(date -u +"%Y-%m-%dT%H:%M:%SZ") leaderboards refresh start ==="

flock -n "$LOCK_FILE" bash -c "
  set -euo pipefail
  cd '$ROOT'

  git fetch origin main
  LOCAL=\$(git rev-parse HEAD)
  REMOTE=\$(git rev-parse origin/main)

  if [ \"\$LOCAL\" = \"\$REMOTE\" ]; then
    echo 'No new commits on origin/main — skipping build.'
    exit 0
  fi

  echo \"Updating \$LOCAL -> \$REMOTE\"
  git pull --ff-only origin main

  if [ ! -f frontend/.env.production.local ]; then
    echo 'ERROR: missing frontend/.env.production.local — OAuth URLs will break. Aborting.'
    exit 1
  fi

  cd frontend
  npm run build
  pm2 restart next

  echo \"=== refresh complete (\$(git rev-parse --short HEAD)) ===\"
" || {
  rc=$?
  if [ "$rc" -eq 1 ]; then
    echo "Another refresh is already running (lock held) — skipped."
    exit 0
  fi
  echo "ERROR: refresh failed with exit code $rc"
  exit "$rc"
}
