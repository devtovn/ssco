import { createClient, RedisClientType } from 'redis';

/**
 * Redis 7 configuration with connection pooling support
 * Memory allocation: 512 MB (configured in docker-compose.yml)
 */
const redisConfig = {
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    // Connection timeout
    connectTimeout: 10000,
    // Keep-alive to maintain connections
    keepAlive: 5000,
    // Reconnect strategy
    reconnectStrategy: (retries: number) => {
      if (retries > 10) {
        console.error('❌ Redis: Max reconnection attempts reached');
        return new Error('Max reconnection attempts reached');
      }
      // Exponential backoff: 50ms, 100ms, 200ms, 400ms, ...
      const delay = Math.min(retries * 50, 3000);
      console.log(`🔄 Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
      return delay;
    },
  },
  password: process.env.REDIS_PASSWORD || undefined,
  database: parseInt(process.env.REDIS_DB || '0', 10),
  // Enable offline queue to buffer commands when disconnected
  enableOfflineQueue: true,
  // Disable ready check for faster startup
  disableOfflineQueue: false,
};

// Create Redis client
const redisClient: RedisClientType = createClient(redisConfig);

// Connection event handlers
redisClient.on('connect', () => {
  console.log('🔌 Redis: Connection established');
});

redisClient.on('ready', () => {
  console.log('✅ Redis: Ready to accept commands');
  console.log(`📊 Redis: Connected to ${redisConfig.socket.host}:${redisConfig.socket.port}`);
});

redisClient.on('error', (err) => {
  console.error('❌ Redis: Connection error:', err.message);
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis: Reconnecting...');
});

redisClient.on('end', () => {
  console.log('🔌 Redis: Connection closed');
});

// Connect to Redis
let isConnecting = false;
export const connectRedis = async (): Promise<void> => {
  if (isConnecting || redisClient.isOpen) {
    return;
  }

  isConnecting = true;
  try {
    await redisClient.connect();
    console.log('✅ Redis: Successfully connected');
  } catch (error) {
    console.error('❌ Redis: Failed to connect:', error);
    throw error;
  } finally {
    isConnecting = false;
  }
};

// Graceful shutdown
export const disconnectRedis = async (): Promise<void> => {
  if (redisClient.isOpen) {
    await redisClient.quit();
    console.log('✅ Redis: Gracefully disconnected');
  }
};

// Auto-connect on module load
void connectRedis();

// Legacy cache utility functions (deprecated - use CacheService instead)
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redisClient.get(key);
    return value ? (JSON.parse(value) as T) : null;
  },

  async set(key: string, value: unknown, ttl?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttl) {
      await redisClient.setEx(key, ttl, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    await redisClient.del(key);
  },

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  },

  async exists(key: string): Promise<boolean> {
    const result = await redisClient.exists(key);
    return result === 1;
  },
};

export { redisClient };
export default redisClient;
