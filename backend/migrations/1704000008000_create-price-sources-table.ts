import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.createTable('price_sources', {
    id: {
      type: 'char(26)',
      primaryKey: true,
      default: pgm.func('generate_ulid()'),
    },
    name: {
      type: 'varchar(100)',
      notNull: true,
    },
    source_type: {
      type: 'varchar(20)',
      notNull: true,
    },
    platform: {
      type: 'varchar(50)',
    },
    base_url: {
      type: 'text',
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    reliability_score: {
      type: 'decimal(3,2)',
      default: 1.0,
    },
    last_success_at: {
      type: 'timestamp',
    },
    last_failure_at: {
      type: 'timestamp',
    },
    failure_count: {
      type: 'integer',
      default: 0,
    },
    config: {
      type: 'jsonb',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('price_sources', 'platform', { name: 'idx_price_sources_platform' });
  pgm.createIndex('price_sources', 'is_active', { name: 'idx_price_sources_active' });
  pgm.createIndex('price_sources', 'source_type', { name: 'idx_price_sources_type' });

  pgm.sql(`
    INSERT INTO price_sources (name, source_type, platform, base_url, config) VALUES
      ('Tiki API', 'api', 'tiki', 'https://api.tiki.vn', '{"priority": 1}'),
      ('Lazada API', 'api', 'lazada', 'https://api.lazada.vn', '{"priority": 2}'),
      ('TikTok Shop API', 'api', 'tiktok_shop', 'https://open-api.tiktokglobalshop.com', '{"priority": 3}'),
      ('Tiki Web', 'scrape', 'tiki', 'https://tiki.vn', '{"searchPath": "/search?q="}'),
      ('Lazada Web', 'scrape', 'lazada', 'https://www.lazada.vn', '{"searchPath": "/catalog/?q="}'),
      ('Shopee Web', 'scrape', 'shopee', 'https://shopee.vn', '{"searchPath": "/search?keyword="}')
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('price_sources', { ifExists: true, cascade: true });
}
