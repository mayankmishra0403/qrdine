#!/bin/sh
set -e

echo "=== Running database migrations ==="
if ! npx prisma@5.22.0 migrate deploy 2>&1; then
  echo "No existing migrations — running db push instead"
  npx prisma@5.22.0 db push --accept-data-loss --skip-generate 2>&1
fi

echo "=== Running seed ==="
node /app/seed.cjs 2>&1

echo "=== Starting Next.js server ==="
exec node server.js