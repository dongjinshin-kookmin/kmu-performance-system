#!/bin/sh
set -eu

database="/app/data/kmu.db"
backup_dir="/app/data/backups"
retention_days="${BACKUP_RETENTION_DAYS:-30}"

case "$retention_days" in
  ''|*[!0-9]*)
    echo "BACKUP_RETENTION_DAYS는 0 이상의 정수여야 합니다." >&2
    exit 1
    ;;
esac

if [ ! -s "$database" ]; then
  echo "백업할 데이터베이스를 찾을 수 없습니다: $database" >&2
  exit 1
fi

mkdir -p "$backup_dir"
timestamp="$(date '+%Y%m%d-%H%M%S')"
backup_file="$backup_dir/kmu-$timestamp.db"

sqlite3 "$database" ".timeout 10000" "PRAGMA wal_checkpoint(PASSIVE);" >/dev/null
sqlite3 "$database" ".timeout 10000" ".backup '$backup_file'"
chown node:node "$backup_file"
chmod 0640 "$backup_file"

if [ "$retention_days" -gt 0 ]; then
  find "$backup_dir" -type f -name 'kmu-*.db' -mtime "+$retention_days" -delete
fi

echo "$backup_file"
