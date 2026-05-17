import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create affiliate_configs table
  pgm.createTable('affiliate_configs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    platform_id: {
      type: 'varchar(100)',
      notNull: true,
      unique: true,
    },
    platform_name: {
      type: 'varchar(200)',
      notNull: true,
    },
    refer_code: {
      type: 'varchar(500)',
      notNull: true,
    },
    link_template: {
      type: 'text',
      notNull: true,
    },
    link_format: {
      type: 'jsonb',
      notNull: true,
    },
    is_enabled: {
      type: 'boolean',
      default: true,
    },
    priority: {
      type: 'integer',
      default: 0,
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

  // Create indexes for affiliate_configs table
  pgm.createIndex('affiliate_configs', 'platform_id', {
    name: 'idx_affiliate_configs_platform',
  });
  pgm.createIndex('affiliate_configs', 'is_enabled', {
    name: 'idx_affiliate_configs_enabled',
  });
  pgm.createIndex('affiliate_configs', 'priority', {
    name: 'idx_affiliate_configs_priority',
    method: 'btree',
    order: 'DESC',
  });

  // Create affiliate_campaigns table
  pgm.createTable('affiliate_campaigns', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    affiliate_config_id: {
      type: 'uuid',
      notNull: true,
      references: 'affiliate_configs(id)',
      onDelete: 'CASCADE',
    },
    campaign_id: {
      type: 'varchar(100)',
      notNull: true,
    },
    campaign_name: {
      type: 'varchar(200)',
      notNull: true,
    },
    refer_code: {
      type: 'varchar(500)',
      notNull: true,
    },
    start_date: {
      type: 'timestamp',
      notNull: true,
    },
    end_date: {
      type: 'timestamp',
    },
    is_active: {
      type: 'boolean',
      default: true,
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Create unique constraint for affiliate_campaigns
  pgm.addConstraint('affiliate_campaigns', 'affiliate_campaigns_unique', {
    unique: ['affiliate_config_id', 'campaign_id'],
  });

  // Create indexes for affiliate_campaigns table
  pgm.createIndex('affiliate_campaigns', 'affiliate_config_id', {
    name: 'idx_affiliate_campaigns_config',
  });
  pgm.createIndex('affiliate_campaigns', 'campaign_id', {
    name: 'idx_affiliate_campaigns_campaign_id',
  });
  pgm.createIndex('affiliate_campaigns', 'is_active', {
    name: 'idx_affiliate_campaigns_active',
  });
  pgm.createIndex('affiliate_campaigns', ['start_date', 'end_date'], {
    name: 'idx_affiliate_campaigns_dates',
  });

  // Create affiliate_link_clicks table (non-partitioned version)
  pgm.createTable('affiliate_link_clicks', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    affiliate_config_id: {
      type: 'uuid',
      notNull: true,
      references: 'affiliate_configs(id)',
      onDelete: 'CASCADE',
    },
    campaign_id: {
      type: 'uuid',
      references: 'affiliate_campaigns(id)',
      onDelete: 'SET NULL',
    },
    product_id: {
      type: 'uuid',
      references: 'products(id)',
      onDelete: 'SET NULL',
    },
    generated_link: {
      type: 'text',
      notNull: true,
    },
    user_session: {
      type: 'varchar(200)',
    },
    user_agent: {
      type: 'text',
    },
    referrer: {
      type: 'text',
    },
    clicked_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    is_conversion: {
      type: 'boolean',
      default: false,
    },
    conversion_value: {
      type: 'decimal(12,2)',
    },
    conversion_at: {
      type: 'timestamp',
    },
  });

  // Create indexes for affiliate_link_clicks table
  pgm.createIndex('affiliate_link_clicks', 'affiliate_config_id', {
    name: 'idx_affiliate_clicks_config',
  });
  pgm.createIndex('affiliate_link_clicks', 'campaign_id', {
    name: 'idx_affiliate_clicks_campaign',
  });
  pgm.createIndex('affiliate_link_clicks', 'product_id', {
    name: 'idx_affiliate_clicks_product',
  });
  pgm.createIndex('affiliate_link_clicks', 'clicked_at', {
    name: 'idx_affiliate_clicks_clicked_at',
    method: 'btree',
    order: 'DESC',
  });
  pgm.createIndex('affiliate_link_clicks', 'is_conversion', {
    name: 'idx_affiliate_clicks_conversion',
  });
  pgm.createIndex('affiliate_link_clicks', 'user_session', {
    name: 'idx_affiliate_clicks_session',
  });

  // Create ad_zones table
  pgm.createTable('ad_zones', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(200)',
      notNull: true,
    },
    position: {
      type: 'varchar(100)',
      notNull: true,
    },
    dimensions: {
      type: 'jsonb',
      notNull: true,
    },
    configuration: {
      type: 'jsonb',
    },
    is_active: {
      type: 'boolean',
      default: true,
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

  // Create indexes for ad_zones table
  pgm.createIndex('ad_zones', 'position', {
    name: 'idx_ad_zones_position',
  });
  pgm.createIndex('ad_zones', 'is_active', {
    name: 'idx_ad_zones_active',
  });

  // Create advertisements table
  pgm.createTable('advertisements', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    zone_id: {
      type: 'uuid',
      notNull: true,
      references: 'ad_zones(id)',
      onDelete: 'CASCADE',
    },
    type: {
      type: 'varchar(50)',
      notNull: true,
    },
    content_url: {
      type: 'text',
    },
    targeting: {
      type: 'jsonb',
    },
    start_date: {
      type: 'timestamp',
      notNull: true,
    },
    end_date: {
      type: 'timestamp',
    },
    performance_data: {
      type: 'jsonb',
    },
    is_active: {
      type: 'boolean',
      default: true,
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

  // Create indexes for advertisements table
  pgm.createIndex('advertisements', 'zone_id', {
    name: 'idx_advertisements_zone',
  });
  pgm.createIndex('advertisements', 'type', {
    name: 'idx_advertisements_type',
  });
  pgm.createIndex('advertisements', ['start_date', 'end_date'], {
    name: 'idx_advertisements_dates',
  });
  pgm.createIndex('advertisements', 'is_active', {
    name: 'idx_advertisements_active',
  });

  // Insert default affiliate configurations for major platforms
  pgm.sql(`
    INSERT INTO affiliate_configs (platform_id, platform_name, refer_code, link_template, link_format, priority) VALUES
      ('tiki', 'Tiki', 'YOUR_TIKI_REFER_CODE', '{base_url}?spid={product_id}&aff_sid={refer_code}', 
       '{"type": "query_param", "parameterName": "aff_sid", "template": "{base_url}?spid={product_id}&aff_sid={refer_code}", "exampleUrl": "https://tiki.vn/product.html?spid=123456&aff_sid=YOUR_CODE"}'::jsonb, 1),
      ('lazada', 'Lazada', 'YOUR_LAZADA_REFER_CODE', '{base_url}?aff_short_key={refer_code}', 
       '{"type": "query_param", "parameterName": "aff_short_key", "template": "{base_url}?aff_short_key={refer_code}", "exampleUrl": "https://www.lazada.vn/products/product-name-i123456.html?aff_short_key=YOUR_CODE"}'::jsonb, 2),
      ('tiktok_shop', 'TikTok Shop', 'YOUR_TIKTOK_REFER_CODE', '{base_url}?affiliate_id={refer_code}', 
       '{"type": "query_param", "parameterName": "affiliate_id", "template": "{base_url}?affiliate_id={refer_code}", "exampleUrl": "https://shop.tiktok.com/view/product/123456?affiliate_id=YOUR_CODE"}'::jsonb, 3),
      ('shopee', 'Shopee', 'YOUR_SHOPEE_REFER_CODE', '{base_url}?af_siteid={refer_code}', 
       '{"type": "query_param", "parameterName": "af_siteid", "template": "{base_url}?af_siteid={refer_code}", "exampleUrl": "https://shopee.vn/product-name-i.123456.789012?af_siteid=YOUR_CODE"}'::jsonb, 4),
      ('sendo', 'Sendo', 'YOUR_SENDO_REFER_CODE', '{base_url}?ref={refer_code}', 
       '{"type": "query_param", "parameterName": "ref", "template": "{base_url}?ref={refer_code}", "exampleUrl": "https://www.sendo.vn/product-name-123456.html?ref=YOUR_CODE"}'::jsonb, 5)
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  pgm.dropTable('advertisements', { ifExists: true, cascade: true });
  pgm.dropTable('ad_zones', { ifExists: true, cascade: true });
  pgm.dropTable('affiliate_link_clicks', { ifExists: true, cascade: true });
  pgm.dropTable('affiliate_campaigns', { ifExists: true, cascade: true });
  pgm.dropTable('affiliate_configs', { ifExists: true, cascade: true });
}
