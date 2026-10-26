# syntax=docker/dockerfile:1

# --- Client build ---
FROM node:20-slim AS client-build
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# --- Server build ---
FROM node:20-slim AS server-build
WORKDIR /app/server
RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*
COPY server/package.json server/package-lock.json ./
RUN npm ci
COPY server/prisma ./prisma
RUN ./node_modules/.bin/prisma generate
COPY server/tsconfig.json ./
COPY server/src ./src
RUN npm run build

# --- Single runtime image ---
FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=4000 \
    DATABASE_URL=file:/app/data/prod.db \
    UPLOAD_DIR=/app/data/uploads \
    CLIENT_DIST=/app/client-dist

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends openssl curl \
    && rm -rf /var/lib/apt/lists/*

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/prisma ./prisma
RUN ./node_modules/.bin/prisma generate

COPY --from=server-build /app/server/dist ./dist
COPY server/src ./src
COPY server/docker-entrypoint.sh ./docker-entrypoint.sh
COPY --from=client-build /app/client/dist ./client-dist

RUN chmod +x ./docker-entrypoint.sh \
    && mkdir -p /app/data/uploads

EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -fsS http://localhost:4000/api/health || exit 1
ENTRYPOINT ["./docker-entrypoint.sh"]
