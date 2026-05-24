import { MigrationBuilder } from 'node-pg-migrate';

function buildMonthlyPartitions(
  pgm: MigrationBuilder,
  tableName: string,
  monthsAhead: number = 13
): void {
  const now = new Date();

  for (let i = 0; i < monthsAhead; i++) {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i, 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + i + 1, 1));
    const partitionName = `${tableName}_${start.getUTCFullYear()}_${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
    const startIso = start.toISOString().slice(0, 10);
    const endIso = end.toISOString().slice(0, 10);

    pgm.sql(`
      CREATE TABLE IF NOT EXISTS ${partitionName}
      PARTITION OF ${tableName}
      FOR VALUES FROM ('${startIso}') TO ('${endIso}')
    `);
  }
}

export async function up(pgm: MigrationBuilder): Promise<void> {
  pgm.sql(`
    CREATE TABLE user_interactions (
      id char(26) NOT NULL DEFAULT generate_ulid(),
      event_type varchar(50) NOT NULL,
      page_path text,
      product_id char(26) REFERENCES products(id) ON DELETE SET NULL,
      target_url text,
      metadata jsonb DEFAULT '{}',
      user_session varchar(200),
      user_agent text,
      referrer text,
      created_at timestamp NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, created_at)
    ) PARTITION BY RANGE (created_at)
  `);

  buildMonthlyPartitions(pgm, 'user_interactions');

  pgm.createIndex('user_interactions', 'event_type', { name: 'idx_user_interactions_event_type' });
  pgm.createIndex('user_interactions', 'product_id', { name: 'idx_user_interactions_product_id' });
  pgm.createIndex('user_interactions', 'created_at', {
    name: 'idx_user_interactions_created_at',
    method: 'btree',
    order: 'DESC',
  });
  pgm.createIndex('user_interactions', 'user_session', { name: 'idx_user_interactions_session' });

  pgm.sql(`
    CREATE TABLE system_metrics (
      id char(26) NOT NULL DEFAULT generate_ulid(),
      metric_name varchar(100) NOT NULL,
      metric_value decimal(12,4) NOT NULL,
      unit varchar(20),
      metadata jsonb DEFAULT '{}',
      recorded_at timestamp NOT NULL DEFAULT NOW(),
      PRIMARY KEY (id, recorded_at)
    ) PARTITION BY RANGE (recorded_at)
  `);

  buildMonthlyPartitions(pgm, 'system_metrics');

  pgm.createIndex('system_metrics', 'metric_name', { name: 'idx_system_metrics_name' });
  pgm.createIndex('system_metrics', 'recorded_at', {
    name: 'idx_system_metrics_recorded_at',
    method: 'btree',
    order: 'DESC',
  });

  pgm.createTable('analytics_daily_aggregates', {
    id: {
      type: 'char(26)',
      primaryKey: true,
      default: pgm.func('generate_ulid()'),
    },
    aggregate_date: {
      type: 'date',
      notNull: true,
    },
    metric_type: {
      type: 'varchar(50)',
      notNull: true,
    },
    dimension_key: {
      type: 'varchar(200)',
      notNull: true,
      default: "''",
    },
    metric_value: {
      type: 'bigint',
      notNull: true,
      default: 0,
    },
    metadata: {
      type: 'jsonb',
      default: '{}',
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()'),
    },
  });

  pgm.addConstraint('analytics_daily_aggregates', 'analytics_daily_aggregates_unique', {
    unique: ['aggregate_date', 'metric_type', 'dimension_key'],
  });

  pgm.createIndex('analytics_daily_aggregates', 'aggregate_date', {
    name: 'idx_analytics_aggregates_date',
  });
  pgm.createIndex('analytics_daily_aggregates', 'metric_type', {
    name: 'idx_analytics_aggregates_type',
  });

  pgm.sql(`
    CREATE OR REPLACE FUNCTION purge_analytics_older_than_months(months_to_keep integer DEFAULT 12)
    RETURNS void AS $$
    DECLARE
      cutoff_date date := (date_trunc('month', NOW()) - (months_to_keep || ' months')::interval)::date;
    BEGIN
      DELETE FROM user_interactions WHERE created_at < cutoff_date;
      DELETE FROM system_metrics WHERE recorded_at < cutoff_date;
      DELETE FROM search_logs WHERE searched_at < cutoff_date;
      DELETE FROM analytics_daily_aggregates WHERE aggregate_date < cutoff_date;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.sql('DROP FUNCTION IF EXISTS purge_analytics_older_than_months(integer)');
  pgm.dropTable('analytics_daily_aggregates', { ifExists: true, cascade: true });
  pgm.dropTable('system_metrics', { ifExists: true, cascade: true });
  pgm.dropTable('user_interactions', { ifExists: true, cascade: true });
}
