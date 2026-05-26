import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // ── price_entries composite indexes (most impactful) ──────────────────────
  pgm.createIndex('price_entries', ['product_id', 'is_available', 'scraped_at'], {
    name: 'idx_price_entries_product_available_date',
    order: { scraped_at: 'DESC' },
  });

  pgm.createIndex('price_entries', ['is_available', 'scraped_at', 'product_id', 'price'], {
    name: 'idx_price_entries_available_date_product_price',
    order: { scraped_at: 'DESC' },
  });

  // ── product_categories reverse lookup ─────────────────────────────────────
  pgm.createIndex('product_categories', ['category_id', 'product_id'], {
    name: 'idx_product_categories_category_product',
  });

  // ── affiliate_link_clicks analytics ───────────────────────────────────────
  pgm.createIndex('affiliate_link_clicks', ['affiliate_config_id', 'clicked_at', 'is_conversion'], {
    name: 'idx_affiliate_clicks_config_date_conversion',
    order: { clicked_at: 'DESC' },
  });

  // ── advertisements active lookup ──────────────────────────────────────────
  pgm.createIndex('advertisements', ['zone_id', 'is_active', 'start_date', 'end_date'], {
    name: 'idx_advertisements_zone_active_dates',
  });

  // ── articles workflow ─────────────────────────────────────────────────────
  pgm.createIndex('articles', ['status', 'published_at'], {
    name: 'idx_articles_status_published',
    order: { published_at: 'DESC' },
  });

  // ── products brand suggestions ────────────────────────────────────────────
  pgm.createIndex('products', ['is_active', 'brand'], {
    name: 'idx_products_active_brand',
  });

  // ── analytics daily aggregates ────────────────────────────────────────────
  pgm.createIndex('analytics_daily_aggregates', ['aggregate_date', 'metric_type', 'dimension_key'], {
    name: 'idx_analytics_daily_date_type_key',
    order: { aggregate_date: 'DESC' },
  });

  // ── user_interactions compound (partitioned table) ────────────────────────
  pgm.createIndex('user_interactions', ['product_id', 'event_type', 'created_at'], {
    name: 'idx_user_interactions_product_event_date',
    order: { created_at: 'DESC' },
  });

  // ── Materialized view: cheapest available price per product ───────────────
  pgm.sql(`
    CREATE MATERIALIZED VIEW cheapest_prices AS
    SELECT DISTINCT ON (product_id)
      product_id,
      source_name,
      source_url,
      price
    FROM price_entries
    WHERE is_available = true
      AND scraped_at >= NOW() - INTERVAL '30 days'
    ORDER BY product_id, price ASC, scraped_at DESC;

    CREATE UNIQUE INDEX idx_cheapest_prices_product
      ON cheapest_prices (product_id);
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP MATERIALIZED VIEW IF EXISTS cheapest_prices;');

  pgm.dropIndex('user_interactions', ['product_id', 'event_type', 'created_at'], {
    name: 'idx_user_interactions_product_event_date',
  });
  pgm.dropIndex('analytics_daily_aggregates', ['aggregate_date', 'metric_type', 'dimension_key'], {
    name: 'idx_analytics_daily_date_type_key',
  });
  pgm.dropIndex('products', ['is_active', 'brand'], {
    name: 'idx_products_active_brand',
  });
  pgm.dropIndex('articles', ['status', 'published_at'], {
    name: 'idx_articles_status_published',
  });
  pgm.dropIndex('advertisements', ['zone_id', 'is_active', 'start_date', 'end_date'], {
    name: 'idx_advertisements_zone_active_dates',
  });
  pgm.dropIndex('affiliate_link_clicks', ['affiliate_config_id', 'clicked_at', 'is_conversion'], {
    name: 'idx_affiliate_clicks_config_date_conversion',
  });
  pgm.dropIndex('product_categories', ['category_id', 'product_id'], {
    name: 'idx_product_categories_category_product',
  });
  pgm.dropIndex('price_entries', ['is_available', 'scraped_at', 'product_id', 'price'], {
    name: 'idx_price_entries_available_date_product_price',
  });
  pgm.dropIndex('price_entries', ['product_id', 'is_available', 'scraped_at'], {
    name: 'idx_price_entries_product_available_date',
  });
}
