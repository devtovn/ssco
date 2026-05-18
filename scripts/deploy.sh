#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  echo "Copy .env.example to .env and configure production values."
  exit 1
fi

echo "Running database migrations..."
docker compose -f docker-compose.prod.yml run --rm backend npm run migrate:up

echo "Starting production stack..."
docker compose -f docker-compose.prod.yml up -d --build

echo "Deployment complete. Frontend: http://localhost:${FRONTEND_PORT:-3000}"
