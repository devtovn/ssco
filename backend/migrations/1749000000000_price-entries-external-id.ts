import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('price_entries', {
    external_id: { type: 'varchar(100)' },
  });

  pgm.sql(`
    UPDATE price_entries
    SET external_id = metadata->>'externalId'
    WHERE external_id IS NULL
      AND metadata->>'externalId' IS NOT NULL
      AND metadata->>'externalId' <> '';
  `);

  pgm.createIndex('price_entries', ['source_name', 'external_id'], {
    name: 'idx_price_entries_source_external_unique',
    unique: true,
    where: 'external_id IS NOT NULL',
  });

  pgm.sql(`
    COMMENT ON COLUMN price_entries.external_id IS
      'Platform listing ID (Tiki sku/spid, Shopee itemId) — unique per source_name';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropIndex('price_entries', ['source_name', 'external_id'], {
    name: 'idx_price_entries_source_external_unique',
    ifExists: true,
  });
  pgm.dropColumns('price_entries', ['external_id'], { ifExists: true });
}
