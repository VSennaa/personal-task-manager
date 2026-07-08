#!/usr/bin/env bash
# Backup diário do Postgres de produção via pg_dump, rotação de 7 dias.
# Rodado via systemd timer (deploy/backup.timer) ou cron — ver deploy/README.md.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/personal-task-manager}"
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/personal-task-manager}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

cd "$PROJECT_DIR"
# shellcheck disable=SC1091
source .env

mkdir -p "$BACKUP_DIR"
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
outfile="$BACKUP_DIR/backup-${timestamp}.sql.gz"

docker compose -f docker-compose.prod.yml exec -T db \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" | gzip > "$outfile"

echo "Backup criado em $outfile"

find "$BACKUP_DIR" -name 'backup-*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete

echo "Backups com mais de ${RETENTION_DAYS} dias removidos"
