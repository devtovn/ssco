import { MigrationBuilder } from 'node-pg-migrate';

/** Affiliate configs are seeded in 1704000001000_create-affiliate-advertisement-tables.ts */
export async function up(_pgm: MigrationBuilder): Promise<void> {
  console.log('DEFAULT AFFILIATE CONFIGS: already seeded in create-affiliate-advertisement-tables migration');
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // No-op: earlier migration down removes configs
}
