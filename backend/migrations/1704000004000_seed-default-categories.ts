import { MigrationBuilder } from 'node-pg-migrate';

/** Categories are created via admin UI; no default seed data. */
export async function up(_pgm: MigrationBuilder): Promise<void> {
  // No-op
}

export async function down(_pgm: MigrationBuilder): Promise<void> {
  // No-op
}
