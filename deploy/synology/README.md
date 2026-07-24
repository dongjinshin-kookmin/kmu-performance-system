# Synology DS916+ 내부망 배포

적용 장비:

- Synology DS916+
- DSM 7.1.1-42962 Update 9
- 메모리 8GB
- DSM 패키지 센터의 **Docker** 패키지
- 내부망 접속 우선

이 구성은 Mac에서 `linux/amd64` 이미지를 완성한 뒤 NAS에서는 이미지를 불러와
실행만 합니다. DS916+에서 소스 빌드를 수행하지 않으므로 설치가 빠르고
`better-sqlite3`의 CPU 아키텍처도 NAS에 맞게 고정됩니다.

## 1. NAS 사전 준비

1. DSM 패키지 센터에서 **Docker**를 설치합니다.
2. 제어판 → 터미널 및 SNMP에서 SSH 서비스를 잠시 활성화합니다.
3. File Station에서 다음 폴더를 만듭니다.

   `/volume1/docker/kmu-performance/deploy`

4. DSM 방화벽을 사용 중이면 내부망에서 TCP `3100` 포트만 허용합니다.

## 2. Mac에서 NAS용 이미지 만들기

Docker Desktop을 실행한 다음 프로젝트 폴더에서 실행합니다.

```bash
npm run nas:build
```

완료되면 다음 폴더가 생성됩니다.

```text
dist/synology-ds916/
├── .env
├── .env.example
├── README.md
├── docker-compose.yml
├── install.sh
└── kmu-performance-ds916-amd64.tar.gz
```

폴더 안의 파일을 모두 NAS의
`/volume1/docker/kmu-performance/deploy`에 업로드합니다.

## 3. NAS에서 최초 설치

Mac 터미널에서 NAS에 접속합니다.

```bash
ssh DSM관리자계정@NAS_IP
cd /volume1/docker/kmu-performance/deploy
sudo sh install.sh
```

설치가 끝난 후 내부망의 브라우저에서 접속합니다.

```text
http://NAS_IP:3100/dashboard
```

최초 실행 시 `/volume1/docker/kmu-performance/data/kmu.db`가 자동으로 생성됩니다.
컨테이너를 삭제하거나 교체해도 이 폴더의 데이터는 유지됩니다.

## 운영 명령

상태 확인:

```bash
sudo docker ps --filter name=kmu-performance
sudo docker logs --tail 100 kmu-performance
```

재시작:

```bash
sudo docker restart kmu-performance
```

중지 및 시작:

```bash
sudo docker stop kmu-performance
sudo docker start kmu-performance
```

## DB 백업

수동 백업:

```bash
sudo docker exec kmu-performance backup-db
```

백업은 `/volume1/docker/kmu-performance/data/backups`에 저장되며 기본 보존 기간은
30일입니다. DSM 제어판 → 작업 스케줄러에서 매일 다음 명령을 실행하도록 등록하면
자동 백업할 수 있습니다.

```bash
/usr/local/bin/docker exec kmu-performance backup-db
```

NAS에서 `docker` 위치가 다르면 SSH에서 `which docker`로 확인한 경로를 사용합니다.

복원할 때는 먼저 컨테이너를 중지한 뒤 백업 파일을 `kmu.db`로 복사합니다.

```bash
sudo docker stop kmu-performance
sudo cp /volume1/docker/kmu-performance/data/backups/kmu-YYYYMMDD-HHMMSS.db \
  /volume1/docker/kmu-performance/data/kmu.db
sudo rm -f /volume1/docker/kmu-performance/data/kmu.db-wal \
  /volume1/docker/kmu-performance/data/kmu.db-shm
sudo docker start kmu-performance
```

## 버전 업데이트

Mac에서 최신 코드를 받은 뒤 `npm run nas:build`를 다시 실행합니다. 새로 생성된
배포 묶음을 NAS에 덮어쓰고 `sudo sh install.sh`를 실행하면 DB는 유지하면서
애플리케이션 이미지만 교체됩니다.

## 외부 공개 전 확인사항

현재 역할 전환은 시연용 쿠키 방식입니다. 인터넷에 공개하기 전에는 정식 로그인,
HTTPS 역방향 프록시, 접속 기록, 로그인 시도 제한을 먼저 구현해야 합니다.
준비 전에는 공유기 포트 포워딩이나 DSM의 직접 외부 노출을 사용하지 마세요.
