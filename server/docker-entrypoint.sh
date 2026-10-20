#!/bin/sh
set -e

echo "[entrypoint] applying database schema..."
npx prisma db push --skip-generate --accept-data-loss

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] seeding database..."
  ./node_modules/.bin/tsx prisma/seed.ts || npx tsx prisma/seed.ts || echo "[entrypoint] seed skipped"
fi

echo "[entrypoint] starting server..."
exec node dist/index.js
