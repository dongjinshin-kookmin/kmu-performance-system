# syntax=docker/dockerfile:1.7

# DS916+의 x86-64 환경과 구형 Synology 커널을 고려해 musl 기반 이미지를 사용한다.
ARG NODE_VERSION=22

FROM node:${NODE_VERSION}-alpine AS dependencies
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS builder
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# 생성 DB는 저장소에 포함하지 않는다. 이미지 빌드 때 재현한 뒤 정적 페이지와
# NAS 최초 실행용 seed DB에 동일한 데이터를 사용한다.
RUN npm run db:rebuild && npm run build

FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN apk add --no-cache libstdc++ sqlite tini su-exec \
    && mkdir -p /app/data /app/seed-data \
    && chown -R node:node /app

COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/data/kmu.db /app/seed-data/kmu.db
COPY --chown=root:root deploy/synology/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
COPY --chown=root:root deploy/synology/backup-db.sh /usr/local/bin/backup-db
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh /usr/local/bin/backup-db

EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "server.js"]
