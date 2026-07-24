#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
bundle_dir="$project_root/dist/synology-ds916"
image_name="kmu-performance-system:ds916-amd64"
image_archive="$bundle_dir/kmu-performance-ds916-amd64.tar.gz"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker Desktop을 먼저 설치하고 실행해주세요." >&2
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker 엔진에 연결할 수 없습니다. Docker Desktop 실행 상태를 확인해주세요." >&2
  exit 1
fi

if ! docker buildx version >/dev/null 2>&1; then
  echo "Docker Buildx를 사용할 수 없습니다. Docker Desktop을 업데이트해주세요." >&2
  exit 1
fi

mkdir -p "$bundle_dir"

docker buildx build \
  --platform linux/amd64 \
  --tag "$image_name" \
  --load \
  "$project_root"

docker save "$image_name" | gzip -9 > "$image_archive"

cp "$project_root/deploy/synology/docker-compose.yml" "$bundle_dir/docker-compose.yml"
cp "$project_root/deploy/synology/.env.example" "$bundle_dir/.env"
cp "$project_root/deploy/synology/.env.example" "$bundle_dir/.env.example"
cp "$project_root/deploy/synology/install.sh" "$bundle_dir/install.sh"
cp "$project_root/deploy/synology/README.md" "$bundle_dir/README.md"
chmod 0755 "$bundle_dir/install.sh"

echo
echo "DS916+ 배포 묶음을 생성했습니다:"
echo "$bundle_dir"
echo
echo "이 폴더의 파일을 NAS의 /volume1/docker/kmu-performance/deploy 에 업로드하세요."
