#!/bin/sh
set -e

echo "=== Running database migrations ==="
npx prisma@5.22.0 migrate deploy 2>&1

echo "=== Starting Next.js server ==="
exec node server.js