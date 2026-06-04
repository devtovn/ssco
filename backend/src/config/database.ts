import { Pool, PoolConfig, PoolClient } from 'pg';

/**
 * PostgreSQL connection pool configuration
 * Supports read replicas through environment variables
 */
const poolConfig: PoolConfig = {
  // Primary database connection
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'pricecompare',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',

  // Connection pool settings
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10), // Minimum connections
  max: parseInt(process.env.DATABASE_POOL_MAX || '50', 10), // Maximum connections
  idleTimeoutMillis: 30000, // Close idle connections after 30 seconds
  connectionTimeoutMillis: 5000, // Timeout for acquiring connection
  
  // Statement timeout (30 seconds)
  statement_timeout: 30000,
  
  // Query timeout (30 seconds)
  query_timeout: 30000,
  
  // Application name for monitoring
  application_name: 'price-comparison-backend',

  // Session defaults (avoids extra client.query on pool 'connect' — deprecated in pg@8+)
  options: '-c timezone=UTC',
  
  // Keep-alive settings
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
};

// Primary pool for write operations
export const pool = new Pool(poolConfig);

// Read replica pool (if configured)
let readPool: Pool | null = null;
if (process.env.DB_READ_HOST) {
  const readPoolConfig: PoolConfig = {
    ...poolConfig,
    host: process.env.DB_READ_HOST,
    port: parseInt(process.env.DB_READ_PORT || '5432', 10),
    // Read replicas can have more connections
    max: parseInt(process.env.DATABASE_READ_POOL_MAX || '30', 10),
  };
  readPool = new Pool(readPoolConfig);
  
  readPool.on('connect', () => {
    console.log('✅ Read replica database connected');
  });
  
  readPool.on('error', (err) => {
    console.error('❌ Read replica database error:', err);
  });
}

// Connection event handlers for primary pool
pool.on('connect', () => {
  if (process.env.NODE_ENV !== 'production') {
    console.log('🔌 Database: New client connected to primary pool');
  }
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error on primary pool:', err);
  // Don't exit process, let the application handle it
});

/**
 * Execute a query on the primary pool (for writes)
 */
export const query = async (text: string, params?: unknown[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`⚠️  Slow query detected (${duration}ms):`, text.substring(0, 100));
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Query failed (${duration}ms):`, text.substring(0, 100), error);
    throw error;
  }
};

/**
 * Execute a read-only query (uses read replica if available)
 */
export const queryRead = async (text: string, params?: unknown[]) => {
  const targetPool = readPool || pool;
  const start = Date.now();
  
  try {
    const res = await targetPool.query(text, params);
    const duration = Date.now() - start;
    
    if (duration > 1000) {
      console.warn(`⚠️  Slow read query detected (${duration}ms):`, text.substring(0, 100));
    }
    
    return res;
  } catch (error) {
    const duration = Date.now() - start;
    console.error(`❌ Read query failed (${duration}ms):`, text.substring(0, 100), error);
    throw error;
  }
};

/**
 * Get a client from the primary pool (for transactions)
 */
export const getClient = async (): Promise<PoolClient> => {
  const client = await pool.connect();
  const originalRelease = client.release.bind(client);

  // Set a timeout warning for long-held clients
  const timeout = setTimeout(() => {
    console.warn('⚠️  A client has been checked out for more than 10 seconds!');
  }, 10000);

  // Monkey patch the release method to clear timeout
  client.release = () => {
    clearTimeout(timeout);
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
};

/**
 * Get a client from the read pool (for read-only transactions)
 */
export const getReadClient = async (): Promise<PoolClient> => {
  const targetPool = readPool || pool;
  const client = await targetPool.connect();
  const originalRelease = client.release.bind(client);

  const timeout = setTimeout(() => {
    console.warn('⚠️  A read client has been checked out for more than 10 seconds!');
  }, 10000);

  client.release = () => {
    clearTimeout(timeout);
    client.release = originalRelease;
    return originalRelease();
  };

  return client;
};

/**
 * Get pool statistics
 */
export const getPoolStats = () => {
  return {
    primary: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
    read: readPool
      ? {
          total: readPool.totalCount,
          idle: readPool.idleCount,
          waiting: readPool.waitingCount,
        }
      : null,
  };
};

/**
 * Graceful shutdown
 */
export const closePool = async (): Promise<void> => {
  console.log('🔌 Closing database connections...');
  
  await pool.end();
  console.log('✅ Primary pool closed');
  
  if (readPool) {
    await readPool.end();
    console.log('✅ Read pool closed');
  }
};

// Handle process termination
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});
