#!/bin/sh
set -e

echo "[entrypoint] applying database schema..."
./node_modules/.bin/prisma db push --skip-generate --accept-data-loss

if [ "${SEED_ON_START:-false}" = "true" ]; then
  should_seed="false"

  if [ "${SEED_FORCE:-false}" = "true" ]; then
    echo "[entrypoint] SEED_FORCE=true; database will be reset."
    should_seed="true"
  else
    user_count=$(node -e '
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      prisma.user.count()
        .then((count) => { process.stdout.write(String(count)); return prisma.$disconnect(); })
        .catch((err) => { console.error(err); process.exit(1); });
    ')
    if [ "$user_count" = "0" ]; then
      echo "[entrypoint] empty database detected; seeding demo data."
      should_seed="true"
    else
      echo "[entrypoint] database already contains $user_count user(s); skipping seed."
    fi
  fi

  if [ "$should_seed" = "true" ]; then
    ./node_modules/.bin/tsx prisma/seed.ts || npx tsx prisma/seed.ts
  fi
fi

echo "[entrypoint] starting server..."
exec node dist/index.js
