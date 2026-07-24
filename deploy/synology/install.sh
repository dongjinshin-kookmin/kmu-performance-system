#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$script_dir"

if [ "$(id -u)" -ne 0 ]; then
  echo "sudo sh install.sh 명령으로 실행해주세요." >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  docker_bin="$(command -v docker)"
elif [ -x /var/packages/Docker/target/usr/bin/docker ]; then
  docker_bin="/var/packages/Docker/target/usr/bin/docker"
else
  echo "DSM 패키지 센터에서 Docker를 먼저 설치해주세요." >&2
  exit 1
fi

if [ ! -f .env ]; then
  cp .env.example .env
fi

set -a
. "$script_dir/.env"
set +a

archive="${1:-$script_dir/kmu-performance-ds916-amd64.tar.gz}"
if [ ! -f "$archive" ]; then
  echo "Docker 이미지 파일을 찾을 수 없습니다: $archive" >&2
  exit 1
fi

mkdir -p "${KMP_DATA_DIR:-/volume1/docker/kmu-performance/data}"
gzip -dc "$archive" | "$docker_bin" load

if "$docker_bin" compose version >/dev/null 2>&1; then
  compose() {
    "$docker_bin" compose "$@"
  }
elif command -v docker-compose >/dev/null 2>&1; then
  compose() {
    docker-compose "$@"
  }
elif [ -x /var/packages/Docker/target/usr/bin/docker-compose ]; then
  compose() {
    /var/packages/Docker/target/usr/bin/docker-compose "$@"
  }
else
  echo "docker-compose 명령을 찾을 수 없습니다. DSM Docker 패키지를 업데이트해주세요." >&2
  exit 1
fi

compose -f docker-compose.yml up -d
compose -f docker-compose.yml ps

attempt=0
while [ "$attempt" -lt 45 ]; do
  health="$("$docker_bin" inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' kmu-performance 2>/dev/null || true)"
  case "$health" in
    healthy)
      break
      ;;
    unhealthy|exited|dead)
      echo "컨테이너 상태가 비정상입니다: $health" >&2
      "$docker_bin" logs --tail 100 kmu-performance >&2 || true
      exit 1
      ;;
  esac

  attempt=$((attempt + 1))
  sleep 2
done

if [ "${health:-}" != "healthy" ]; then
  echo "90초 안에 상태 점검이 완료되지 않았습니다." >&2
  "$docker_bin" logs --tail 100 kmu-performance >&2 || true
  exit 1
fi

echo
echo "설치가 완료되었습니다."
echo "컨테이너 상태: healthy"
echo "접속 주소: http://NAS_IP:${KMP_HOST_PORT:-3100}/dashboard"
