#!/usr/bin/env bash
set -e

echo "[jobtrail-backend] Applying Prisma migrations..."
npx prisma migrate deploy

echo "[jobtrail-backend] Starting server on port ${PORT:-8000}..."
exec node dist/main.js
