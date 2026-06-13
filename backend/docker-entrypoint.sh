#!/bin/sh

echo "=== Waiting for database ==="
until pg_isready -h "${DB_HOST:-postgres}" -p "${DB_PORT:-5432}" -d "${DB_NAME:-kombe}" -U "${DB_USER:-kombe}" -q 2>/dev/null; do
  sleep 1
done
echo "✓ Database ready"

# Override DATABASE_URL to use Docker hostname (backend/.env has localhost)
export DATABASE_URL="postgresql://${DB_USER:-kombe}:${DB_PASSWORD:-kombe_dev_password}@${DB_HOST:-postgres}:${DB_PORT:-5432}/${DB_NAME:-kombe}"
echo "✓ DATABASE_URL set"

echo "=== Running migrations ==="
npm run migrate:up
if [ $? -ne 0 ]; then
  echo "✗ Migrations FAILED"
  exit 1
fi

echo "=== Seeding sample data ==="
npm run seed || echo "⚠ Seed skipped (data may already exist)"

echo "=== Starting dev server ==="
exec npm run dev
