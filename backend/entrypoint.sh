#!/usr/bin/env bash
set -e

echo "[jobtrail-backend] Applying Prisma migrations..."
npx prisma migrate deploy

if [ "${JOBTRAIL_SEED:-true}" = "true" ]; then
  echo "[jobtrail-backend] Seeding (no-op if already seeded)..."
  node prisma/seed.js || echo "[jobtrail-backend] Seed step skipped/failed (non-fatal)."
fi

echo "[jobtrail-backend] Starting server on port ${PORT:-8000}..."
exec node dist/main.js
