#!/bin/sh
set -e

echo "=== Syncing database schema ==="
npx prisma@5.22.0 db push --accept-data-loss --skip-generate 2>&1

echo "=== Running seed ==="
node /app/seed.cjs 2>&1

echo "=== Starting Next.js server ==="
exec node server.js