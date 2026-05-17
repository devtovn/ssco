import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create users table for Administrator and Reviewer roles
  pgm.createTable('users', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    email: {
      type: 'varchar(255)',
      notNull: true,
      unique: true,
    },
    password_hash: {
      type: 'varchar(255)',
      notNull: true,
    },
    role: {
      type: 'varchar(50)',
      notNull: true,
      check: "role IN ('Administrator', 'Reviewer')",
    },
    permissions: {
      type: 'jsonb',
      default: '{}',
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
    last_login: {
      type: 'timestamp',
    },
  });

  // Create indexes for users table
  pgm.createIndex('users', 'email', {
    name: 'idx_users_email',
    unique: true,
  });
  pgm.createIndex('users', 'role', {
    name: 'idx_users_role',
  });
  pgm.createIndex('users', 'is_active', {
    name: 'idx_users_active',
  });

  // Create articles table with version control
  pgm.createTable('articles', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    product_id: {
      type: 'uuid',
      references: 'products(id)',
      onDelete: 'SET NULL',
    },
    title: {
      type: 'varchar(500)',
      notNull: true,
    },
    content: {
      type: 'text',
      notNull: true,
    },
    seo_metadata: {
      type: 'jsonb',
      default: '{}',
    },
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: "'draft'",
      check: "status IN ('draft', 'pending_review', 'approved', 'published', 'rejected')",
    },
    reviewer_id: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    version: {
      type: 'integer',
      notNull: true,
      default: 1,
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
    published_at: {
      type: 'timestamp',
    },
  });

  // Create indexes for articles table
  pgm.createIndex('articles', 'product_id', {
    name: 'idx_articles_product_id',
  });
  pgm.createIndex('articles', 'status', {
    name: 'idx_articles_status',
  });
  pgm.createIndex('articles', 'reviewer_id', {
    name: 'idx_articles_reviewer_id',
  });
  pgm.createIndex('articles', 'published_at', {
    name: 'idx_articles_published_at',
    method: 'btree',
    order: 'DESC',
  });
  pgm.createIndex('articles', 'created_at', {
    name: 'idx_articles_created_at',
    method: 'btree',
    order: 'DESC',
  });

  // Create full-text search index for article titles
  pgm.sql(`
    CREATE INDEX idx_articles_title_search 
    ON articles 
    USING GIN(to_tsvector('english', title))
  `);

  // Create search_logs table for analytics
  pgm.createTable('search_logs', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    query: {
      type: 'varchar(500)',
      notNull: true,
    },
    category: {
      type: 'varchar(100)',
    },
    filters: {
      type: 'jsonb',
      default: '{}',
    },
    results_count: {
      type: 'integer',
      notNull: true,
      default: 0,
    },
    searched_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
    user_session: {
      type: 'varchar(200)',
    },
    user_agent: {
      type: 'text',
    },
  });

  // Create indexes for search_logs table
  pgm.createIndex('search_logs', 'query', {
    name: 'idx_search_logs_query',
  });
  pgm.createIndex('search_logs', 'category', {
    name: 'idx_search_logs_category',
  });
  pgm.createIndex('search_logs', 'searched_at', {
    name: 'idx_search_logs_searched_at',
    method: 'btree',
    order: 'DESC',
  });
  pgm.createIndex('search_logs', 'user_session', {
    name: 'idx_search_logs_user_session',
  });

  // Create composite index for popular search queries analytics
  pgm.createIndex('search_logs', ['query', 'searched_at'], {
    name: 'idx_search_logs_query_date',
  });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Drop tables in reverse order to respect foreign key constraints
  pgm.dropTable('search_logs', { ifExists: true, cascade: true });
  pgm.dropTable('articles', { ifExists: true, cascade: true });
  pgm.dropTable('users', { ifExists: true, cascade: true });
}
