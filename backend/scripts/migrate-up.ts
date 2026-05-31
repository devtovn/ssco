/**
 * Migration runner — unified entry point for all environments.
 *
 * Usage:
 *   npx tsx scripts/migrate-up.ts          # apply all pending
 *   npx tsx scripts/migrate-up.ts --down   # rollback last migration
 *
 * Reads DATABASE_URL from env (docker-compose sets it automatically).
 * Falls back to .env for local dev.
 */

import path from 'path';
import dotenv from 'dotenv';

// Load .env only when running locally (Docker sets env vars directly)
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const direction = process.argv.includes('--down') ? 'down' : 'up';
const count = direction === 'down' ? 1 : Infinity;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('✗ DATABASE_URL is not set');
    process.exit(1);
  }

  console.log(`Running migrations ${direction}...`);
  console.log(`Database: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`);

  const { runner } = await import('node-pg-migrate');

  await runner({
    databaseUrl,
    migrationsTable: 'pgmigrations',
    dir: path.resolve(__dirname, '../migrations'),
    direction,
    count,
    log: console.log,
    verbose: false,
  });
}

main()
  .then(() => {
    console.log(`✓ Migrations ${direction} completed`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(`✗ Migrations ${direction} failed:`, err.message || err);
    process.exit(1);
  });
