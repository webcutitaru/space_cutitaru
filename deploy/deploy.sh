#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/space_cutitaru}"
REPO_URL="${REPO_URL:-https://github.com/webcutitaru/space_cutitaru.git}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3001}"

echo "==> Deploying SPACE to ${APP_DIR}"

export DEBIAN_FRONTEND=noninteractive

# Prefer nvm Node 22+ (Next.js 16 requires Node >= 20)
if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
  # shellcheck disable=SC1090
  . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
  nvm install 22 >/dev/null 2>&1 || true
  nvm use 22 >/dev/null 2>&1 || true
fi

if ! command -v node >/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "==> Installing Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "Node $(node -v), npm $(npm -v)"

if ! command -v pm2 >/dev/null; then
  echo "==> Installing PM2"
  npm install -g pm2
fi

if ! command -v git >/dev/null; then
  apt-get install -y git
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

echo "==> App health check"
curl -sI "http://127.0.0.1:${PORT}" | head -5 || true

echo "==> Deploy complete on port ${PORT}"
