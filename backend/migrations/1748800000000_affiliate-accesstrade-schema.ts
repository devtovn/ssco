import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // credentials may have been added manually via scripts/add-affiliate-credentials.sql
  pgm.sql(`
    ALTER TABLE affiliate_configs
      ADD COLUMN IF NOT EXISTS credentials JSONB DEFAULT NULL;
  `);

  pgm.createTable('affiliate_publishers', {
    id: {
      type: 'char(26)',
      primaryKey: true,
      default: pgm.func('generate_ulid()'),
    },
    provider: {
      type: 'varchar(50)',
      notNull: true,
      unique: true,
    },
    display_name: {
      type: 'varchar(200)',
      notNull: true,
    },
    app_token: {
      type: 'text',
    },
    api_base_url: {
      type: 'text',
      notNull: true,
      default: 'https://api.accesstrade.vn',
    },
    is_enabled: {
      type: 'boolean',
      default: false,
    },
    metadata: {
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

  pgm.createIndex('affiliate_publishers', 'provider', {
    name: 'idx_affiliate_publishers_provider',
  });
  pgm.createIndex('affiliate_publishers', 'is_enabled', {
    name: 'idx_affiliate_publishers_enabled',
  });

  pgm.addColumns('affiliate_configs', {
    publisher_id: {
      type: 'char(26)',
      references: 'affiliate_publishers(id)',
      onDelete: 'SET NULL',
    },
    provider: {
      type: 'varchar(50)',
      notNull: true,
      default: 'native',
    },
    domain_patterns: {
      type: 'text[]',
      default: pgm.func("'{}'"),
    },
  });

  pgm.createIndex('affiliate_configs', 'publisher_id', {
    name: 'idx_affiliate_configs_publisher',
  });
  pgm.createIndex('affiliate_configs', 'provider', {
    name: 'idx_affiliate_configs_provider',
  });

  pgm.addColumns('affiliate_campaigns', {
    is_primary: {
      type: 'boolean',
      default: false,
    },
    notes: {
      type: 'text',
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.createIndex('affiliate_campaigns', ['affiliate_config_id', 'is_primary'], {
    name: 'idx_affiliate_campaigns_primary',
  });

  pgm.sql(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_affiliate_campaigns_primary
    ON affiliate_campaigns (affiliate_config_id)
    WHERE is_primary = true AND is_active = true;
  `);

  pgm.addColumns('price_entries', {
    affiliate_campaign_id: {
      type: 'char(26)',
      references: 'affiliate_campaigns(id)',
      onDelete: 'SET NULL',
    },
    affiliate_url_at: {
      type: 'timestamp',
    },
  });

  pgm.createIndex('price_entries', 'affiliate_campaign_id', {
    name: 'idx_price_entries_affiliate_campaign',
  });

  pgm.sql(`
    INSERT INTO affiliate_publishers (provider, display_name, is_enabled, metadata)
    VALUES ('accesstrade', 'AccessTrade Vietnam', false, '{"source":"migration"}'::jsonb)
    ON CONFLICT (provider) DO NOTHING;
  `);

  pgm.sql(`
    COMMENT ON TABLE affiliate_publishers IS
      'Publisher-level affiliate credentials (e.g. AccessTrade app token) shared across platform configs';
    COMMENT ON COLUMN affiliate_publishers.app_token IS
      'AccessTrade API token at publisher level — not duplicated per platform';
    COMMENT ON COLUMN affiliate_configs.publisher_id IS
      'FK to affiliate_publishers when provider = accesstrade';
    COMMENT ON COLUMN affiliate_configs.provider IS
      'Link generation mode: native | accesstrade | manual';
    COMMENT ON COLUMN affiliate_configs.domain_patterns IS
      'Hostname patterns to match product URLs to this config';
    COMMENT ON COLUMN affiliate_configs.credentials IS
      'Platform-specific API credentials (native mode). See structure-tables.md';
    COMMENT ON COLUMN affiliate_campaigns.is_primary IS
      'Default campaign for seed/regenerate; at most one active primary per config';
    COMMENT ON COLUMN affiliate_campaigns.campaign_id IS
      'External campaign ID (e.g. AccessTrade campaign_id), not internal ULID';
    COMMENT ON COLUMN price_entries.affiliate_campaign_id IS
      'Campaign used when affiliate_url was generated — enables bulk regenerate';
    COMMENT ON COLUMN price_entries.affiliate_url_at IS
      'When affiliate_url was last generated or refreshed';
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP INDEX IF EXISTS uq_affiliate_campaigns_primary');

  pgm.dropIndex('price_entries', 'affiliate_campaign_id', {
    name: 'idx_price_entries_affiliate_campaign',
    ifExists: true,
  });
  pgm.dropColumns('price_entries', ['affiliate_campaign_id', 'affiliate_url_at'], {
    ifExists: true,
  });

  pgm.dropIndex('affiliate_campaigns', ['affiliate_config_id', 'is_primary'], {
    name: 'idx_affiliate_campaigns_primary',
    ifExists: true,
  });
  pgm.dropColumns('affiliate_campaigns', ['is_primary', 'notes', 'updated_at'], {
    ifExists: true,
  });

  pgm.dropIndex('affiliate_configs', 'provider', {
    name: 'idx_affiliate_configs_provider',
    ifExists: true,
  });
  pgm.dropIndex('affiliate_configs', 'publisher_id', {
    name: 'idx_affiliate_configs_publisher',
    ifExists: true,
  });
  pgm.dropColumns('affiliate_configs', ['publisher_id', 'provider', 'domain_patterns'], {
    ifExists: true,
  });

  pgm.dropTable('affiliate_publishers', { ifExists: true, cascade: true });
}
