#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/space_cutitaru}"
REPO_URL="${REPO_URL:-https://github.com/webcutitaru/space_cutitaru.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3001}"

echo "==> Deploying SPACE to ${APP_DIR}"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install Node 20+ first."
  exit 1
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "Installing PM2 globally..."
  npm install -g pm2
fi

if [ ! -d "${APP_DIR}/.git" ]; then
  echo "==> Cloning repository"
  mkdir -p "$(dirname "${APP_DIR}")"
  git clone "${REPO_URL}" "${APP_DIR}"
fi

cd "${APP_DIR}"

echo "==> Pulling latest ${BRANCH}"
git fetch origin
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

echo "==> Installing dependencies"
npm ci

echo "==> Building production app"
npm run build

echo "==> Restarting PM2 process"
if pm2 describe space >/dev/null 2>&1; then
  pm2 restart space
else
  pm2 start ecosystem.config.js
fi

pm2 save

echo "==> Deploy complete"
echo "App should be available on http://127.0.0.1:${PORT}"
echo "Ensure nginx proxies space.cutitaru.com -> 127.0.0.1:${PORT}"
