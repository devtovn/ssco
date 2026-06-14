import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Existing rows were seeded with provider = 'native'; default product behaviour is AccessTrade.
  pgm.sql(`
    UPDATE affiliate_configs
    SET provider = 'accesstrade', updated_at = NOW()
    WHERE provider = 'native';
  `);

  pgm.alterColumn('affiliate_configs', 'provider', {
    default: 'accesstrade',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.alterColumn('affiliate_configs', 'provider', {
    default: 'native',
  });
}
