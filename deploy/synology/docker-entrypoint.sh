#!/bin/sh
set -eu

umask 027
data_dir="/app/data"
database="$data_dir/kmu.db"
seed_database="/app/seed-data/kmu.db"

mkdir -p "$data_dir"

if [ ! -s "$database" ]; then
  if [ ! -s "$seed_database" ]; then
    echo "초기 데이터베이스를 찾을 수 없습니다: $seed_database" >&2
    exit 1
  fi

  cp "$seed_database" "$database.initializing"
  mv "$database.initializing" "$database"
  echo "성과관리 초기 데이터베이스를 생성했습니다."
fi

chown -R node:node "$data_dir"
chmod 0750 "$data_dir"
chmod 0640 "$database"

exec su-exec node:node "$@"
