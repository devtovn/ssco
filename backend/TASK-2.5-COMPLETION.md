# Task 2.5: Set up Redis Cache and Connection Pooling - Completion Report

## Overview
This task implements Redis 7 caching infrastructure with 512 MB allocation and PostgreSQL connection pooling with read replica support.

## Files Created/Modified

### 1. Cache Utility (`src/utils/cache.ts`)

#### CacheKeys
Centralized cache key management with prefixes for:
- **Categories**: tree, products, metrics
- **Search**: results, suggestions, popular keywords
- **Prices**: product prices, price history, best deals
- **Affiliate**: configs, campaigns, performance
- **Advertisements**: zones, performance
- **Authentication**: refresh tokens, user sessions

#### CacheTTL
Predefined TTL (Time To Live) values in seconds:
- Category tree: 1 hour
- Search results: 5 minutes
- Product prices: 1 hour
- Affiliate configs: 1 hour
- Ad zones: 10 minutes
- Refresh tokens: 7 days

#### CacheService Class
Comprehensive caching operations:
- `get<T>(key)`: Get value from cache
- `set(key, value, ttl)`: Set value with TTL
- `delete(key)`: Delete specific key
- `deletePattern(pattern)`: Delete keys matching pattern
- `exists(key)`: Check if key exists
- `ttl(key)`: Get remaining TTL
- `increment(key, amount)`: Increment counter
- `setMultiple(entries)`: Batch set operations
- `getMultiple<T>(keys)`: Batch get operations
- `warmCache()`: Warm up frequently accessed data
- `clearAll()`: Clear all cache (use with caution)
- `getStats()`: Get cache statistics (keys, memory, hits, misses)

### 2. Enhanced Redis Configuration (`src/config/redis.ts`)

#### Features
- **Connection pooling** with keep-alive
- **Reconnection strategy** with exponential backoff
- **Offline queue** for buffering commands during disconnection
- **Connection timeout**: 10 seconds
- **Keep-alive**: 5 seconds
- **Max reconnection attempts**: 10
- **Graceful shutdown** support

#### Event Handlers
- `connect`: Connection established
- `ready`: Ready to accept commands
- `error`: Connection errors
- `reconnecting`: Reconnection in progress
- `end`: Connection closed

#### Exported Functions
- `connectRedis()`: Establish connection
- `disconnectRedis()`: Graceful shutdown
- `redisClient`: Redis client instance
- `cache`: Legacy utility functions (deprecated)

### 3. Enhanced Database Configuration (`src/config/database.ts`)

#### Primary Pool Configuration
- **Min connections**: 2 (configurable)
- **Max connections**: 20 (configurable)
- **Idle timeout**: 30 seconds
- **Connection timeout**: 5 seconds
- **Statement timeout**: 30 seconds
- **Query timeout**: 30 seconds
- **Keep-alive**: Enabled (10 seconds initial delay)
- **Application name**: `price-comparison-backend`

#### Read Replica Support
- Optional read replica pool (if `DB_READ_HOST` is configured)
- **Max connections**: 30 (configurable)
- Automatic fallback to primary pool if replica not configured
- Separate connection pool for read operations

#### Exported Functions
- `query(text, params)`: Execute write query on primary pool
- `queryRead(text, params)`: Execute read query (uses replica if available)
- `getClient()`: Get client for transactions (primary pool)
- `getReadClient()`: Get client for read-only transactions
- `getPoolStats()`: Get pool statistics (total, idle, waiting)
- `closePool()`: Graceful shutdown

#### Features
- **Slow query detection**: Warns if query takes > 1 second
- **Long-held client warning**: Warns if client held > 10 seconds
- **Automatic timezone**: Sets UTC on connection
- **Graceful shutdown**: Handles SIGINT and SIGTERM
- **Error logging**: Detailed error messages with query context

### 4. Updated Environment Variables (`.env.example`)

#### Database Variables
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=pricecompare
DB_USER=postgres
DB_PASSWORD=postgres
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=20

# Read Replica (optional)
DB_READ_HOST=
DB_READ_PORT=5432
DATABASE_READ_POOL_MAX=30
```

#### Redis Variables
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Usage Examples

### Using CacheService

```typescript
import { CacheService, CacheKeys, CacheTTL } from '../utils/cache';

// Get from cache
const categories = await CacheService.get<Category[]>(CacheKeys.CATEGORY_TREE);

// Set in cache
await CacheService.set(
  CacheKeys.CATEGORY_TREE,
  categoriesData,
  CacheTTL.CATEGORY_TREE
);

// Delete pattern
await CacheService.deletePattern('category:*');

// Get stats
const stats = await CacheService.getStats();
console.log(`Cache: ${stats.keys} keys, ${stats.memory} memory`);
```

### Using Database Pools

```typescript
import { query, queryRead, getClient } from '../config/database';

// Write operation (uses primary pool)
await query('INSERT INTO products (name) VALUES ($1)', ['Product Name']);

// Read operation (uses read replica if available)
const result = await queryRead('SELECT * FROM products WHERE id = $1', [123]);

// Transaction (uses primary pool)
const client = await getClient();
try {
  await client.query('BEGIN');
  await client.query('UPDATE products SET price = $1 WHERE id = $2', [100, 123]);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

### Cache Warming

```typescript
import { CacheService } from '../utils/cache';

// Warm cache on application startup
await CacheService.warmCache();
```

## Configuration

### Redis Memory Allocation
Redis is configured with 512 MB memory allocation in `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Connection Pool Sizing

#### Primary Pool (Writes)
- **Min**: 2 connections (always available)
- **Max**: 20 connections (scales with load)
- Suitable for write-heavy operations

#### Read Replica Pool (Reads)
- **Max**: 30 connections (more than primary)
- Handles high read traffic
- Falls back to primary if not configured

### Recommended Settings

#### Development
```env
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
DATABASE_READ_POOL_MAX=15
```

#### Production
```env
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=50
DATABASE_READ_POOL_MAX=100
```

## Monitoring

### Cache Statistics
```typescript
const stats = await CacheService.getStats();
console.log('Cache Statistics:', stats);
// Output: { keys: 150, memory: '45.2M', hits: '12345', misses: '678' }
```

### Pool Statistics
```typescript
import { getPoolStats } from '../config/database';

const stats = getPoolStats();
console.log('Pool Statistics:', stats);
// Output: { 
//   primary: { total: 10, idle: 5, waiting: 0 },
//   read: { total: 15, idle: 10, waiting: 0 }
// }
```

## Performance Optimizations

### 1. Cache Key Hashing
For complex query parameters, use the `hashQuery` utility:
```typescript
import { hashQuery } from '../utils/hashQuery';

const queryHash = hashQuery({ category: 'electronics', price: '100-500' });
const cacheKey = CacheKeys.SEARCH_RESULTS(queryHash);
```

### 2. Batch Operations
Use `setMultiple` and `getMultiple` for batch operations:
```typescript
// Set multiple values at once
await CacheService.setMultiple([
  { key: 'key1', value: data1, ttl: 3600 },
  { key: 'key2', value: data2, ttl: 3600 },
]);

// Get multiple values at once
const values = await CacheService.getMultiple<Product>(['key1', 'key2']);
```

### 3. Read Replica Usage
Always use `queryRead` for read-only operations:
```typescript
// ✅ Good - uses read replica
const products = await queryRead('SELECT * FROM products WHERE category_id = $1', [1]);

// ❌ Bad - uses primary pool unnecessarily
const products = await query('SELECT * FROM products WHERE category_id = $1', [1]);
```

## Error Handling

### Redis Connection Errors
- Automatic reconnection with exponential backoff
- Offline queue buffers commands during disconnection
- Max 10 reconnection attempts before giving up

### Database Connection Errors
- Connection timeout: 5 seconds
- Query timeout: 30 seconds
- Automatic client release on error
- Graceful shutdown on process termination

## Testing

### Test Redis Connection
```bash
cd backend
npx tsx -e "import { redisClient } from './src/config/redis'; await redisClient.ping().then(() => console.log('Redis OK')).catch(console.error)"
```

### Test Database Connection
```bash
cd backend
npx tsx -e "import { query } from './src/config/database'; await query('SELECT NOW()').then(() => console.log('Database OK')).catch(console.error)"
```

### Test Cache Operations
```bash
cd backend
npx tsx -e "import { CacheService } from './src/utils/cache'; await CacheService.set('test', {hello: 'world'}, 60); const val = await CacheService.get('test'); console.log('Cache OK:', val)"
```

## Requirements Satisfied

This task satisfies the following requirements from the spec:
- **Requirement 8.1**: Redis 7 with 512 MB allocation
- **Requirement 8.10**: Connection pooling for PostgreSQL with read replicas support

## Next Steps

After completing this task, you can proceed to:
1. **Task 3.1**: Create core TypeScript interfaces
2. **Task 3.2**: Create Zod validation schemas
3. **Task 4.1**: Implement Category Management Service (will use caching)

## Notes

### Cache Invalidation Strategy
- Use `deletePattern` for bulk invalidation
- Invalidate related caches on updates
- Example: When updating a category, invalidate `category:*` pattern

### Connection Pool Monitoring
- Monitor pool statistics regularly
- Adjust pool sizes based on load
- Watch for "waiting" connections (indicates pool exhaustion)

### Read Replica Setup
- Configure `DB_READ_HOST` to enable read replica
- Ensure replica is in sync with primary
- Use `queryRead` for all SELECT queries
