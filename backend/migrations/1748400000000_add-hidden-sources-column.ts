import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('products', {
    hidden_sources: {
      type: 'text[]',
      default: pgm.func("ARRAY[]::text[]"),
    },
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('products', ['hidden_sources'], { ifExists: true });
}
