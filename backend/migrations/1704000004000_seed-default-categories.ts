import { MigrationBuilder } from 'node-pg-migrate';

/** Categories are seeded in 1704000000000_create-core-tables.ts */
export async function up(_pgm: MigrationBuilder): Promise<void> {
  console.log('DEFAULT CATEGORIES: already seeded in create-core-tables migration');
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // No-op: core migration down removes categories
}
