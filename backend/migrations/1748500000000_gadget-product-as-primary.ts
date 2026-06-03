import { MigrationBuilder } from 'node-pg-migrate';

/**
 * Make products the primary entity for gadgets:
 *  - Drop gadget_devices.specs (jsonb) — specs are now stored in the 14 typed spec tables
 *    keyed by product_id. The crawler flow creates a product row first, then links it.
 */
export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.dropColumns('gadget_devices', ['specs'], { ifExists: true });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('gadget_devices', {
    specs: {
      type: 'jsonb',
      notNull: true,
      default: pgm.func("'{}'::jsonb"),
    },
  });
}
