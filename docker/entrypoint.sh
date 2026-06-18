#!/bin/sh
set -e

echo "=== Running database migrations ==="
node /app/migrate.mjs 2>&1

echo "=== Running seed ==="
node /app/seed.cjs 2>&1

echo "=== Starting Next.js server ==="
exec node server.js