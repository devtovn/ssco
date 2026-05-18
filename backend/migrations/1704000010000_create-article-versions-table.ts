import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.addColumns('articles', {
    created_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    rejection_reason: {
      type: 'text',
    },
  });

  pgm.createIndex('articles', 'created_by', { name: 'idx_articles_created_by' });

  pgm.createTable('article_versions', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    article_id: {
      type: 'uuid',
      notNull: true,
      references: 'articles(id)',
      onDelete: 'CASCADE',
    },
    version: {
      type: 'integer',
      notNull: true,
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
    edited_by: {
      type: 'uuid',
      references: 'users(id)',
      onDelete: 'SET NULL',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('article_versions', 'article_versions_article_version_unique', {
    unique: ['article_id', 'version'],
  });

  pgm.createIndex('article_versions', 'article_id', { name: 'idx_article_versions_article_id' });
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('article_versions', { ifExists: true, cascade: true });
  pgm.dropColumns('articles', ['created_by', 'rejection_reason'], { ifExists: true });
}
