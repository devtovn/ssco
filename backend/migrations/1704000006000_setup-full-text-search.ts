import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  console.log('Setting up PostgreSQL Full-Text Search...');

  // Install pg_trgm extension for fuzzy matching
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  console.log('✓ pg_trgm extension installed');

  // Install unaccent extension for Vietnamese text search
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS unaccent;`);
  console.log('✓ unaccent extension installed');

  // Create custom text search configuration for Vietnamese
  pgm.sql(`
    CREATE TEXT SEARCH CONFIGURATION vietnamese (COPY = simple);
  `);
  console.log('✓ Vietnamese text search configuration created');

  // Add tsvector column for product name search
  pgm.addColumn('products', {
    name_tsvector: {
      type: 'tsvector',
    },
  });
  console.log('✓ name_tsvector column added to products');

  // Add tsvector column for product keywords search
  pgm.addColumn('products', {
    keywords_tsvector: {
      type: 'tsvector',
    },
  });
  console.log('✓ keywords_tsvector column added to products');

  // Create function to update tsvector columns
  pgm.sql(`
    CREATE OR REPLACE FUNCTION products_tsvector_update() RETURNS trigger AS $$
    BEGIN
      NEW.name_tsvector := to_tsvector('vietnamese', unaccent(COALESCE(NEW.name, '')));
      NEW.keywords_tsvector := to_tsvector('vietnamese', unaccent(array_to_string(NEW.keywords, ' ')));
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log('✓ products_tsvector_update function created');

  // Create trigger to automatically update tsvector columns
  pgm.sql(`
    CREATE TRIGGER products_tsvector_update_trigger
    BEFORE INSERT OR UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION products_tsvector_update();
  `);
  console.log('✓ products_tsvector_update_trigger created');

  // Update existing products to populate tsvector columns
  pgm.sql(`
    UPDATE products
    SET name_tsvector = to_tsvector('vietnamese', unaccent(COALESCE(name, ''))),
        keywords_tsvector = to_tsvector('vietnamese', unaccent(array_to_string(keywords, ' ')));
  `);
  console.log('✓ Existing products updated with tsvector data');

  // Create GIN index for name_tsvector (fast full-text search)
  pgm.createIndex('products', 'name_tsvector', {
    method: 'gin',
    name: 'idx_products_name_tsvector',
  });
  console.log('✓ GIN index created on name_tsvector');

  // Create GIN index for keywords_tsvector
  pgm.createIndex('products', 'keywords_tsvector', {
    method: 'gin',
    name: 'idx_products_keywords_tsvector',
  });
  console.log('✓ GIN index created on keywords_tsvector');

  // Create GIN index for trigram similarity on product name (fuzzy matching)
  pgm.sql(`
    CREATE INDEX idx_products_name_trgm ON products USING gin (name gin_trgm_ops);
  `);
  console.log('✓ Trigram GIN index created on name');

  // Create GIN index for trigram similarity on brand
  pgm.sql(`
    CREATE INDEX idx_products_brand_trgm ON products USING gin (brand gin_trgm_ops);
  `);
  console.log('✓ Trigram GIN index created on brand');

  // Create composite index for common search patterns
  pgm.createIndex('products', ['is_active', 'created_at'], {
    name: 'idx_products_active_created',
  });
  console.log('✓ Composite index created on is_active and created_at');

  console.log('='.repeat(80));
  console.log('FULL-TEXT SEARCH SETUP COMPLETED');
  console.log('='.repeat(80));
  console.log('Extensions installed:');
  console.log('  - pg_trgm (trigram matching for fuzzy search)');
  console.log('  - unaccent (remove accents for Vietnamese text)');
  console.log('Indexes created:');
  console.log('  - GIN index on name_tsvector (full-text search)');
  console.log('  - GIN index on keywords_tsvector (full-text search)');
  console.log('  - GIN index on name (trigram fuzzy matching)');
  console.log('  - GIN index on brand (trigram fuzzy matching)');
  console.log('='.repeat(80));
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop indexes
  pgm.dropIndex('products', 'name_tsvector', {
    name: 'idx_products_name_tsvector',
  });
  pgm.dropIndex('products', 'keywords_tsvector', {
    name: 'idx_products_keywords_tsvector',
  });
  pgm.sql(`DROP INDEX IF EXISTS idx_products_name_trgm;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_products_brand_trgm;`);
  pgm.dropIndex('products', ['is_active', 'created_at'], {
    name: 'idx_products_active_created',
  });

  // Drop trigger and function
  pgm.sql(`DROP TRIGGER IF EXISTS products_tsvector_update_trigger ON products;`);
  pgm.sql(`DROP FUNCTION IF EXISTS products_tsvector_update();`);

  // Drop columns
  pgm.dropColumn('products', 'name_tsvector');
  pgm.dropColumn('products', 'keywords_tsvector');

  // Drop text search configuration
  pgm.sql(`DROP TEXT SEARCH CONFIGURATION IF EXISTS vietnamese;`);

  // Drop extensions
  pgm.sql(`DROP EXTENSION IF EXISTS unaccent;`);
  pgm.sql(`DROP EXTENSION IF EXISTS pg_trgm;`);

  console.log('Full-text search setup rolled back');
}
