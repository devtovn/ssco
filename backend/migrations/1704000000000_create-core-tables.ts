import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create categories table with hierarchical structure
  pgm.createTable('categories', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name_vi: {
      type: 'varchar(200)',
      notNull: true,
    },
    name_en: {
      type: 'varchar(200)',
      notNull: true,
    },
    slug: {
      type: 'varchar(200)',
      notNull: true,
      unique: true,
    },
    description: {
      type: 'text',
    },
    icon: {
      type: 'varchar(500)',
    },
    parent_id: {
      type: 'uuid',
      references: 'categories(id)',
      onDelete: 'CASCADE',
    },
    level: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    display_order: {
      type: 'integer',
      default: 0,
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

  // Create indexes for categories table
  pgm.createIndex('categories', 'parent_id', {
    name: 'idx_categories_parent_id',
  });
  pgm.createIndex('categories', 'slug', {
    name: 'idx_categories_slug',
  });
  pgm.createIndex('categories', 'level', {
    name: 'idx_categories_level',
  });
  pgm.createIndex('categories', 'is_active', {
    name: 'idx_categories_active',
  });

  // Create products table
  pgm.createTable('products', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    name: {
      type: 'varchar(500)',
      notNull: true,
    },
    description: {
      type: 'text',
    },
    category: {
      type: 'varchar(100)',
      notNull: true,
    },
    brand: {
      type: 'varchar(100)',
    },
    model: {
      type: 'varchar(200)',
    },
    specifications: {
      type: 'jsonb',
    },
    images: {
      type: 'text[]',
    },
    keywords: {
      type: 'text[]',
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
    is_active: {
      type: 'boolean',
      default: true,
    },
  });

  // Create indexes for products table
  pgm.createIndex('products', 'category', {
    name: 'idx_products_category',
  });
  pgm.createIndex('products', 'brand', {
    name: 'idx_products_brand',
  });
  pgm.createIndex('products', 'keywords', {
    name: 'idx_products_keywords',
    method: 'gin',
  });

  // Create full-text search index for product names
  pgm.sql(`
    CREATE INDEX idx_products_name_search 
    ON products 
    USING GIN(to_tsvector('english', name))
  `);

  // Create product_categories junction table
  pgm.createTable('product_categories', {
    product_id: {
      type: 'uuid',
      notNull: true,
      references: 'products(id)',
      onDelete: 'CASCADE',
    },
    category_id: {
      type: 'uuid',
      notNull: true,
      references: 'categories(id)',
      onDelete: 'CASCADE',
    },
    is_primary: {
      type: 'boolean',
      default: false,
    },
    assigned_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  // Create composite primary key for product_categories
  pgm.addConstraint('product_categories', 'product_categories_pkey', {
    primaryKey: ['product_id', 'category_id'],
  });

  // Create indexes for product_categories table
  pgm.createIndex('product_categories', 'product_id', {
    name: 'idx_product_categories_product',
  });
  pgm.createIndex('product_categories', 'category_id', {
    name: 'idx_product_categories_category',
  });
  pgm.createIndex('product_categories', 'is_primary', {
    name: 'idx_product_categories_primary',
  });

  // Create price_entries table
  pgm.createTable('price_entries', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    product_id: {
      type: 'uuid',
      notNull: true,
      references: 'products(id)',
      onDelete: 'CASCADE',
    },
    source_name: {
      type: 'varchar(100)',
      notNull: true,
    },
    source_url: {
      type: 'text',
      notNull: true,
    },
    price: {
      type: 'decimal(12,2)',
      notNull: true,
    },
    currency: {
      type: 'varchar(3)',
      default: "'VND'",
    },
    is_available: {
      type: 'boolean',
      default: true,
    },
    scraped_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    metadata: {
      type: 'jsonb',
    },
  });

  // Create indexes for price_entries table
  pgm.createIndex('price_entries', 'product_id', {
    name: 'idx_price_entries_product_id',
  });
  pgm.createIndex('price_entries', 'source_name', {
    name: 'idx_price_entries_source',
  });
  pgm.createIndex('price_entries', 'scraped_at', {
    name: 'idx_price_entries_scraped_at',
    method: 'btree',
    order: 'DESC',
  });

  // Insert default main categories
  pgm.sql(`
    INSERT INTO categories (name_vi, name_en, slug, level, display_order) VALUES
      ('Điện lạnh', 'Refrigeration & Air Conditioning', 'dien-lanh', 0, 1),
      ('Thiết bị gia dụng', 'Home Appliances', 'thiet-bi-gia-dung', 0, 2),
      ('Điện thoại', 'Mobile Phones', 'dien-thoai', 0, 3),
      ('Máy tính bảng', 'Tablets', 'may-tinh-bang', 0, 4),
      ('Laptop', 'Laptop', 'laptop', 0, 5),
      ('Cơ khí', 'Mechanical Equipment', 'co-khi', 0, 6),
      ('Thiết bị văn phòng', 'Office Equipment', 'thiet-bi-van-phong', 0, 7),
      ('Âm thanh & Hình ảnh', 'Audio & Video', 'am-thanh-hinh-anh', 0, 8),
      ('Phụ kiện điện tử', 'Electronic Accessories', 'phu-kien-dien-tu', 0, 9),
      ('Đồ gia dụng nhà bếp', 'Kitchen Appliances', 'do-gia-dung-nha-bep', 0, 10)
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  pgm.dropTable('price_entries', { ifExists: true, cascade: true });
  pgm.dropTable('product_categories', { ifExists: true, cascade: true });
  pgm.dropTable('products', { ifExists: true, cascade: true });
  pgm.dropTable('categories', { ifExists: true, cascade: true });
}
