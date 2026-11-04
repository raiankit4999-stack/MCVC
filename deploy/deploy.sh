#!/usr/bin/env bash
# Build and (re)start the stack. Run on the VPS from the repository root: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")"
[ -f .env ] || { echo "Create deploy/.env from deploy/.env.example first"; exit 1; }
git -C .. pull --ff-only
docker compose build
docker compose up -d
docker compose ps
echo "Web: http://127.0.0.1:$(grep -E '^WEB_PORT=' .env | cut -d= -f2 || echo 3100)  — configure your reverse proxy to point here."
