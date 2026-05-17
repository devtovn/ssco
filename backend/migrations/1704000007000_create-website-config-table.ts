import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create website_config table for storing website configuration
  pgm.createTable('website_config', {
    id: {
      type: 'integer',
      primaryKey: true,
      default: 1,
    },
    config_data: {
      type: 'jsonb',
      notNull: true,
      default: JSON.stringify({
        logo: '',
        siteName: 'Price Comparison',
        tagline: 'So sánh giá tốt nhất',
        primaryColor: '#3B82F6',
        secondaryColor: '#10B981',
        font: 'Inter',
        metadata: {},
      }),
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

  // Add constraint to ensure only one config row exists
  pgm.addConstraint('website_config', 'website_config_single_row', {
    check: 'id = 1',
  });

  // Insert default configuration
  pgm.sql(`
    INSERT INTO website_config (id, config_data)
    VALUES (1, '${JSON.stringify({
      logo: '',
      siteName: 'Price Comparison',
      tagline: 'So sánh giá tốt nhất',
      primaryColor: '#3B82F6',
      secondaryColor: '#10B981',
      font: 'Inter',
      metadata: {},
    })}'::jsonb)
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('website_config', { ifExists: true, cascade: true });
}
