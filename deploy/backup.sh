#!/usr/bin/env bash
# Daily logical backup (add to cron: 30 2 * * * /path/to/repo/deploy/backup.sh). Keeps 14 days.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
docker compose exec -T db pg_dump -U postgres -Fc mcvc > "backups/mcvc-$(date +%F-%H%M).dump"
find backups -name 'mcvc-*.dump' -mtime +14 -delete
# Restore test (do this regularly):
#   docker compose exec -T db pg_restore -U postgres -d mcvc_restore_test --create < backups/<file>.dump
