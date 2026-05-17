# Cost Optimization Analysis - Component Comparison

## Document Overview

This document analyzes various components that can be removed or optimized to reduce infrastructure costs for a startup with < 50,000 products. It compares three optimization strategies and provides recommendations.

---

## Components Analysis for Cost Reduction

### 🔴 **1. ClickHouse (Analytics Database)** - REMOVE COMPLETELY ⭐⭐⭐

**Current Usage:** Time-series analytics data
**RAM Usage:** 1-2 GB
**Cost Impact:** Part of VPS cost

**Replacement Strategy:**
- ✅ Use PostgreSQL for analytics (sufficient for < 1M records/day)
- ✅ Use Google Analytics 4 (Free) for user analytics
- ✅ Create analytics tables in PostgreSQL with partitioning

**PostgreSQL Analytics Implementation:**
```sql
-- Create partitioned analytics table
CREATE TABLE analytics_events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    user_session VARCHAR(100),
    product_id UUID,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Create monthly partitions
CREATE TABLE analytics_events_2024_01 PARTITION OF analytics_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- Indexes for performance
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX idx_analytics_events_session ON analytics_events(user_session);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
```

**When to add ClickHouse:**
- Have > 10M events/day
- Need real-time complex analytics
- Have > 100,000 daily visitors
- Need sub-second query performance on billions of rows

**Savings: 1-2 GB RAM**

---

### 🔴 **2. Elasticsearch** - REMOVE, USE PostgreSQL FTS ⭐⭐⭐⭐

**Current Usage:** Product search engine
**RAM Usage:** 3 GB
**Cost Impact:** Significant

**Replacement Strategy:**
- ✅ PostgreSQL Full-Text Search with GIN indexes
- ✅ Trigram extension for fuzzy search
- ✅ Materialized views for search optimization

**PostgreSQL Full-Text Search Implementation:**
```sql
-- Enable extensions
CREATE EXTENSION pg_trgm;
CREATE EXTENSION unaccent;

-- Create search index
CREATE INDEX idx_products_search_gin ON products 
USING GIN(to_tsvector('vietnamese', name || ' ' || description || ' ' || brand));

-- Trigram index for fuzzy search
CREATE INDEX idx_products_name_trgm ON products 
USING GIN(name gin_trgm_ops);

-- Materialized view for better performance
CREATE MATERIALIZED VIEW products_search AS
SELECT 
    id,
    name,
    brand,
    category,
    to_tsvector('vietnamese', name || ' ' || description || ' ' || brand) as search_vector,
    similarity(name, '') as name_similarity
FROM products
WHERE is_active = true;

CREATE INDEX idx_products_search_vector ON products_search 
USING GIN(search_vector);

-- Refresh strategy (run every 5 minutes)
REFRESH MATERIALIZED VIEW CONCURRENTLY products_search;
```

**Search Query Examples:**
```sql
-- Full-text search
SELECT * FROM products_search
WHERE search_vector @@ to_tsquery('vietnamese', 'điện thoại')
ORDER BY ts_rank(search_vector, to_tsquery('vietnamese', 'điện thoại')) DESC
LIMIT 20;

-- Fuzzy search with trigram
SELECT * FROM products
WHERE name % 'iphone'  -- similarity operator
ORDER BY similarity(name, 'iphone') DESC
LIMIT 20;

-- Combined search with ranking
SELECT 
    p.*,
    ts_rank(to_tsvector('vietnamese', p.name), query) as rank,
    similarity(p.name, 'iphone') as sim
FROM products p, to_tsquery('vietnamese', 'iphone') query
WHERE to_tsvector('vietnamese', p.name) @@ query
   OR p.name % 'iphone'
ORDER BY rank DESC, sim DESC
LIMIT 20;
```

**Performance Optimization:**
```javascript
// Cache search results in Redis
const searchProducts = async (query) => {
  const cacheKey = `search:${query}`;
  
  // Check cache first
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);
  
  // Execute search
  const results = await db.query(searchQuery, [query]);
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(results));
  
  return results;
};
```

**When to add Elasticsearch:**
- Have > 50,000 products
- Search query time > 300ms consistently
- Need advanced features (faceted search, aggregations)
- Need fuzzy search with complex rules

**Savings: 3 GB RAM**

---

### 🟡 **3. Redis** - REDUCE SIZE (not remove) ⭐⭐

**Current Usage:** 1 GB RAM
**Optimized Usage:** 512 MB RAM

**Why keep Redis:**
- Essential for session storage
- Critical for caching (80%+ hit rate)
- Required for Bull Queue
- Very lightweight and efficient

**Optimized Redis Configuration:**
```conf
# redis.conf
maxmemory 512mb
maxmemory-policy allkeys-lru

# Disable persistence for cache-only data (optional)
save ""
appendonly no
```

**Memory Allocation:**
```
Session storage:        100 MB
Search results cache:   150 MB
Price comparison cache: 100 MB
Popular keywords:       50 MB
Bull Queue:             50 MB
Category cache:         30 MB
Buffer:                 32 MB
─────────────────────────────
TOTAL:                  512 MB
```

**Cache Strategy:**
```javascript
// Tiered caching with TTL
const CACHE_TTL = {
  search: 300,        // 5 minutes
  prices: 3600,       // 1 hour
  categories: 3600,   // 1 hour
  popular: 1800,      // 30 minutes
  session: 86400      // 24 hours
};

// Implement cache warming for popular data
const warmCache = async () => {
  const popularKeywords = await getPopularKeywords();
  for (const keyword of popularKeywords) {
    await searchProducts(keyword); // This will cache results
  }
};
```

**Savings: 512 MB RAM**

---

### 🟡 **4. Background Jobs Service** - MERGE INTO BACKEND ⭐⭐

**Current Usage:** Separate service, 1 GB RAM
**Optimized:** Integrated into Express.js backend

**Implementation:**
```javascript
// server.js - Express.js with integrated background jobs
const express = require('express');
const Queue = require('bull');

const app = express();

// Create queues
const scrapeQueue = new Queue('scraping', {
  redis: { host: 'localhost', port: 6379 }
});

const emailQueue = new Queue('email', {
  redis: { host: 'localhost', port: 6379 }
});

// Process jobs in the same process
scrapeQueue.process(5, async (job) => {
  const { url, productId } = job.data;
  // Scraping logic
  await scrapeProduct(url, productId);
});

emailQueue.process(10, async (job) => {
  const { to, subject, body } = job.data;
  // Email sending logic
  await sendEmail(to, subject, body);
});

// API endpoints
app.post('/api/products/scrape', async (req, res) => {
  const job = await scrapeQueue.add({
    url: req.body.url,
    productId: req.body.productId
  });
  res.json({ jobId: job.id });
});

// Start server
app.listen(3000);
```

**Scheduled Jobs:**
```javascript
const cron = require('node-cron');

// Schedule price updates every 6 hours
cron.schedule('0 */6 * * *', async () => {
  console.log('Starting scheduled price update...');
  const products = await getActiveProducts();
  
  for (const product of products) {
    await scrapeQueue.add({
      url: product.source_url,
      productId: product.id
    }, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000
      }
    });
  }
});

// Refresh materialized views every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY products_search');
});
```

**Trade-offs:**
- ❌ Backend process slightly heavier
- ❌ Cannot scale workers independently
- ✅ Saves 1 GB RAM
- ✅ Simpler architecture
- ✅ Easier to manage

**When to separate:**
- Background jobs run > 30 minutes
- Need to scale workers independently
- Backend performance affected
- Have > 100,000 products to scrape

**Savings: 1 GB RAM**

---

### 🟡 **5. PostgreSQL** - OPTIMIZE CONFIGURATION ⭐⭐

**Current Usage:** 4 GB RAM
**Optimized Usage:** 3 GB RAM

**Optimized Configuration:**
```conf
# postgresql.conf for 3 GB allocation

# Memory Settings
shared_buffers = 1GB              # Down from 2GB
effective_cache_size = 2GB        # Down from 4GB
work_mem = 16MB                   # Down from 32MB
maintenance_work_mem = 256MB      # Down from 512MB

# Connection Settings
max_connections = 100             # Sufficient for startup

# Write-Ahead Log
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1            # For SSD
effective_io_concurrency = 200    # For SSD

# Logging
log_min_duration_statement = 1000 # Log slow queries > 1s
```

**Database Optimization Strategies:**
```sql
-- 1. Proper indexing
CREATE INDEX CONCURRENTLY idx_products_active ON products(is_active) 
WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_price_entries_product_scraped 
ON price_entries(product_id, scraped_at DESC);

-- 2. Partitioning for large tables
CREATE TABLE price_entries_partitioned (
    LIKE price_entries INCLUDING ALL
) PARTITION BY RANGE (scraped_at);

-- Create monthly partitions
CREATE TABLE price_entries_2024_01 PARTITION OF price_entries_partitioned
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

-- 3. Regular maintenance
-- Run VACUUM ANALYZE weekly
VACUUM ANALYZE;

-- Reindex monthly
REINDEX DATABASE productdb;

-- 4. Connection pooling
-- Use PgBouncer for connection pooling
```

**Monitoring Queries:**
```sql
-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check cache hit ratio (should be > 95%)
SELECT 
    sum(heap_blks_read) as heap_read,
    sum(heap_blks_hit) as heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;
```

**Savings: 1 GB RAM**

---

### 🟢 **6. Next.js** - KEEP SSR (Important for SEO) ⭐⭐⭐⭐⭐

**Current Usage:** 3 GB RAM
**Optimized Usage:** 2.5 GB RAM

**Why keep Next.js SSR:**
- ✅ Critical for SEO (price comparison sites need good SEO)
- ✅ Better initial page load
- ✅ Social media sharing (Open Graph)
- ✅ Better user experience

**Optimization Strategies:**
```javascript
// next.config.js
module.exports = {
  // Enable SWC compiler (faster)
  swcMinify: true,
  
  // Optimize images
  images: {
    domains: ['cdn.example.com'],
    formats: ['image/avif', 'image/webp'],
  },
  
  // Static optimization
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['@mui/material', 'lodash'],
  },
  
  // Reduce bundle size
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      cacheGroups: {
        default: false,
        vendors: false,
        commons: {
          name: 'commons',
          chunks: 'all',
          minChunks: 2,
        },
      },
    };
    return config;
  },
};
```

**Memory Optimization:**
```javascript
// Use ISR (Incremental Static Regeneration) for product pages
export async function getStaticProps({ params }) {
  const product = await fetchProduct(params.id);
  
  return {
    props: { product },
    revalidate: 3600, // Regenerate every hour
  };
}

// Use SSG for static pages
export async function getStaticProps() {
  return {
    props: {},
  };
}

// Use SSR only when necessary
export async function getServerSideProps(context) {
  // Only for pages that need real-time data
  const data = await fetchRealTimeData();
  return { props: { data } };
}
```

**Alternative (Not Recommended for SEO):**
If you absolutely need to save 2 GB RAM, you can use Static Export:
```javascript
// next.config.js
module.exports = {
  output: 'export', // Static HTML export
};
```

But this loses:
- ❌ SSR benefits
- ❌ API routes
- ❌ Dynamic routing
- ❌ ISR

**Savings: 500 MB RAM (with optimization, keeping SSR)**

---

## 💰 Cost Optimization Options

### **Option 1: Aggressive Cost Cutting** (Maximum Savings)

**Components Removed/Reduced:**
1. ❌ Elasticsearch → PostgreSQL FTS (3 GB)
2. ❌ ClickHouse → PostgreSQL analytics (1-2 GB)
3. ⬇️ Redis: 1 GB → 256 MB (768 MB)
4. ⬇️ Next.js SSR → Static Export (2.5 GB)
5. ⬇️ PostgreSQL: 4 GB → 2 GB (2 GB)
6. ⬇️ Background Jobs → Merge into Backend (1 GB)

**New Configuration:**
```
Nginx (Static Next.js):    500 MB
Express.js + Jobs:         2.5 GB
PostgreSQL:                2 GB
Redis:                     256 MB
─────────────────────────────────
TOTAL:                     5.25 GB

VPS Required: 2-4 vCPU, 6-8 GB RAM
Recommended: Hetzner CPX21 (3 vCPU, 4 GB) = €8.90/month (~$10)
           or Hetzner CPX31 (4 vCPU, 8 GB) = €15.90/month (~$17)
```

**Monthly Cost:**
```
VPS:                       $10-17
Domain:                    $1
Storage:                   $5
AI API (GPT-4):           $40
Proxies:                  $30
Email:                    $10
─────────────────────────────
TOTAL:                    $96-103/month
```

**Trade-offs:**
- ❌ No SSR (SEO impact)
- ❌ Performance: Medium
- ❌ Harder to scale
- ✅ VERY CHEAP!

**Annual Savings vs Original:** $300-360

---

### **Option 2: Balanced** (Recommended) ⭐⭐⭐⭐⭐

**Components Removed/Reduced:**
1. ❌ Elasticsearch → PostgreSQL FTS (3 GB)
2. ❌ ClickHouse → PostgreSQL analytics (1-2 GB)
3. ⬇️ Redis: 1 GB → 512 MB (512 MB)
4. ⬇️ Background Jobs → Merge into Backend (1 GB)
5. ⬇️ PostgreSQL: 4 GB → 3 GB (1 GB)
6. ⬇️ Next.js: 3 GB → 2.5 GB with optimization (500 MB)

**New Configuration:**
```
Next.js Frontend (SSR):    2.5 GB
Express.js + Jobs:         2.5 GB
PostgreSQL:                3 GB
Redis:                     512 MB
─────────────────────────────────
TOTAL:                     8.5 GB

VPS Required: 4 vCPU, 8-12 GB RAM
Recommended: Hetzner CPX41 (8 vCPU, 16 GB) = €30.90/month (~$34)
           or Hetzner CPX31 (4 vCPU, 8 GB) = €15.90/month (~$17) - tight
```

**Monthly Cost:**
```
VPS (CPX31 - tight):      $17
or VPS (CPX41 - safe):    $34
Domain:                   $1
Storage:                  $5
Backups:                  $5
AI API (GPT-4):          $40
Proxies:                 $30
Email:                   $10
─────────────────────────────
TOTAL (tight):           $108/month
TOTAL (safe):            $125/month
```

**Benefits:**
- ✅ Keeps SSR for SEO
- ✅ Good performance
- ✅ Easy to scale later
- ✅ Still affordable
- ✅ Professional setup

**Trade-offs:**
- ⚠️ Tight on 8 GB (need monitoring)
- ✅ Comfortable on 12-16 GB

**Annual Savings vs Original:** $180-240

**Why This is Recommended:**
1. Maintains SEO advantages (critical for price comparison)
2. Good balance of cost and performance
3. Can handle 1,000-10,000 daily visitors
4. Easy to upgrade when needed
5. Professional enough for production

---

### **Option 3: Minimal Changes** (Safest)

**Components Removed:**
1. ❌ Elasticsearch → PostgreSQL FTS (3 GB)
2. ❌ ClickHouse → PostgreSQL analytics (1 GB)

**Configuration:**
```
Next.js Frontend:          3 GB
Express.js Backend:        4 GB
PostgreSQL:                4 GB
Redis:                     1 GB
Background Jobs:           1 GB
─────────────────────────────────
TOTAL:                     13 GB

VPS Required: 8 vCPU, 16 GB RAM
Recommended: Hetzner CPX41 (8 vCPU, 16 GB) = €30.90/month (~$34)
```

**Monthly Cost:**
```
VPS:                      $34
Domain:                   $1
Storage:                  $5
Backups:                  $5
AI API (GPT-4):          $40
Proxies:                 $30
Email:                   $10
─────────────────────────────
TOTAL:                   $125/month
```

**Annual Savings vs Original:** $96-180

---

## 📊 Detailed Comparison Table

| Component | Original | Option 1 (Aggressive) | Option 2 (Balanced) ⭐ | Option 3 (Minimal) |
|-----------|----------|----------------------|----------------------|-------------------|
| **Elasticsearch** | 3 GB | ❌ 0 GB (PostgreSQL FTS) | ❌ 0 GB (PostgreSQL FTS) | ❌ 0 GB (PostgreSQL FTS) |
| **ClickHouse** | 1-2 GB | ❌ 0 GB (PostgreSQL) | ❌ 0 GB (PostgreSQL) | ❌ 0 GB (PostgreSQL) |
| **Next.js** | 3 GB | ⬇️ 0.5 GB (Static) | ⬇️ 2.5 GB (SSR optimized) | ✅ 3 GB (SSR) |
| **Express.js** | 4 GB | ⬆️ 2.5 GB (+jobs) | ⬆️ 2.5 GB (+jobs) | ✅ 4 GB |
| **PostgreSQL** | 4 GB | ⬇️ 2 GB | ⬇️ 3 GB | ✅ 4 GB |
| **Redis** | 1 GB | ⬇️ 256 MB | ⬇️ 512 MB | ✅ 1 GB |
| **Background Jobs** | 1 GB | ❌ 0 GB (merged) | ❌ 0 GB (merged) | ✅ 1 GB |
| **TOTAL RAM** | 16 GB | **5.25 GB** | **8.5 GB** | **13 GB** |
| **VPS Size** | 16 GB | 6-8 GB | 8-12 GB | 16 GB |
| **VPS Cost** | $38 | **$10-17** | **$17-34** | **$34** |
| **Total Monthly** | $139 | **$96-103** | **$108-125** | **$125** |
| **Annual Cost** | $1,668 | **$1,152-1,236** | **$1,296-1,500** | **$1,500** |
| **Annual Savings** | $0 | **$432-516** | **$168-372** | **$168** |
| **SEO Quality** | Excellent | Poor | Excellent | Excellent |
| **Performance** | Excellent | Medium | Good | Excellent |
| **Scalability** | Excellent | Poor | Good | Excellent |

---

## 🎯 Recommended Strategy: Option 2 (Balanced)

### **Why Option 2 is Best for Startup:**

**1. Cost-Effective**
- Saves $168-372/year compared to original
- Still affordable at $108-125/month
- Good ROI on infrastructure investment

**2. Maintains Critical Features**
- ✅ SSR for SEO (essential for price comparison site)
- ✅ Good search performance with PostgreSQL FTS
- ✅ Adequate caching with Redis
- ✅ Professional setup

**3. Scalability Path**
- Easy to add Elasticsearch later (when > 50K products)
- Easy to add ClickHouse later (when > 100K daily visitors)
- Easy to separate background jobs (when needed)
- Can upgrade VPS incrementally

**4. Performance**
- Search: 50-200ms (acceptable)
- Page load: < 2s (good)
- API response: < 200ms (good)
- Cache hit rate: > 80% (excellent)

**5. Operational Simplicity**
- Fewer services to manage
- Simpler deployment
- Easier debugging
- Lower maintenance overhead

---

## 📈 Scaling Roadmap

### **Phase 1: Launch (Month 1-3)** - Option 2 Tight

**Configuration:**
```
VPS: 4 vCPU, 8 GB RAM ($17/month)
Total: $108/month
```

**Metrics to Monitor:**
- RAM usage (should stay < 80%)
- Search query time (should be < 300ms)
- API response time (should be < 200ms)
- Cache hit rate (should be > 80%)

**Upgrade Triggers:**
- RAM usage > 85% consistently
- Search time > 300ms
- Daily visitors > 5,000

---

### **Phase 2: Growth (Month 3-6)** - Option 2 Safe

**Configuration:**
```
VPS: 8 vCPU, 16 GB RAM ($34/month)
Total: $125/month
```

**What Changes:**
- More comfortable RAM headroom
- Better performance under load
- Can handle traffic spikes

**Upgrade Triggers:**
- Products > 50,000
- Search time > 300ms consistently
- Daily visitors > 10,000

---

### **Phase 3: Scale (Month 6-12)** - Add Services Back

**Add Elasticsearch:**
```
When: Products > 50,000 or search time > 300ms
Cost: +$0 (same VPS, reallocate RAM)
      or +$20/month (upgrade to 24 GB VPS)
```

**Add ClickHouse:**
```
When: Analytics queries slow or > 100K daily visitors
Cost: +$20-40/month (separate VPS or upgrade)
```

**Separate Background Jobs:**
```
When: Scraping affects backend performance
Cost: +$20-30/month (small VPS for workers)
```

---

### **Phase 4: Multi-Server (Year 2+)**

**Configuration:**
```
Load Balancer:        $15/month
App Servers (2x):     $80/month
Database:             $80/month
Cache + Search:       $40/month
Workers:              $40/month
─────────────────────────────
TOTAL:               $255/month
```

---

## 💡 Implementation Checklist for Option 2

### **1. PostgreSQL Setup**

```bash
# Install PostgreSQL 15
sudo apt install postgresql-15

# Install extensions
sudo -u postgres psql -c "CREATE EXTENSION pg_trgm;"
sudo -u postgres psql -c "CREATE EXTENSION unaccent;"

# Configure postgresql.conf
sudo nano /etc/postgresql/15/main/postgresql.conf
```

```conf
# Memory settings
shared_buffers = 1GB
effective_cache_size = 2GB
work_mem = 16MB
maintenance_work_mem = 256MB
```

### **2. Redis Setup**

```bash
# Install Redis
sudo apt install redis-server

# Configure redis.conf
sudo nano /etc/redis/redis.conf
```

```conf
maxmemory 512mb
maxmemory-policy allkeys-lru
```

### **3. Next.js Optimization**

```javascript
// next.config.js
module.exports = {
  swcMinify: true,
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    optimizeCss: true,
  },
};
```

### **4. Express.js with Background Jobs**

```javascript
// server.js
const express = require('express');
const Queue = require('bull');
const cron = require('node-cron');

const app = express();

// Setup queues
const scrapeQueue = new Queue('scraping', {
  redis: { host: 'localhost', port: 6379 }
});

// Process jobs
scrapeQueue.process(5, async (job) => {
  // Scraping logic
});

// Schedule jobs
cron.schedule('0 */6 * * *', async () => {
  // Price update logic
});

app.listen(3000);
```

### **5. Monitoring Setup**

```bash
# Install monitoring tools
npm install prom-client express-prom-bundle

# Setup Prometheus + Grafana
docker-compose up -d prometheus grafana
```

### **6. Database Indexes**

```sql
-- Create all necessary indexes
CREATE INDEX CONCURRENTLY idx_products_search_gin 
ON products USING GIN(to_tsvector('vietnamese', name || ' ' || description));

CREATE INDEX CONCURRENTLY idx_products_name_trgm 
ON products USING GIN(name gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_price_entries_product_scraped 
ON price_entries(product_id, scraped_at DESC);

-- Create materialized view
CREATE MATERIALIZED VIEW products_search AS
SELECT 
    id, name, brand, category,
    to_tsvector('vietnamese', name || ' ' || description) as search_vector
FROM products WHERE is_active = true;

CREATE INDEX idx_products_search_vector 
ON products_search USING GIN(search_vector);
```

---

## 🔍 Monitoring and Alerts

### **Key Metrics to Monitor:**

**1. RAM Usage**
```bash
# Check RAM usage
free -h

# Alert when > 85%
```

**2. PostgreSQL Performance**
```sql
-- Check slow queries
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC LIMIT 10;

-- Check cache hit ratio
SELECT 
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as cache_hit_ratio
FROM pg_statio_user_tables;
```

**3. Redis Performance**
```bash
# Check Redis memory
redis-cli INFO memory

# Check hit rate
redis-cli INFO stats | grep keyspace
```

**4. Application Performance**
```javascript
// Add response time monitoring
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn(`Slow request: ${req.path} took ${duration}ms`);
    }
  });
  next();
});
```

---

## 📝 Conclusion

**For a startup with < 50,000 products, Option 2 (Balanced) provides:**

✅ **Cost Savings:** $168-372/year compared to original design
✅ **Good Performance:** Adequate for 1,000-10,000 daily visitors
✅ **SEO Maintained:** Keeps SSR for search engine optimization
✅ **Scalability:** Easy upgrade path when needed
✅ **Simplicity:** Fewer services to manage
✅ **Professional:** Production-ready setup

**Total Monthly Cost: $108-125**
- VPS: $17-34
- AI API: $40
- Proxies: $30
- Services: $16

**When to Upgrade:**
- Add Elasticsearch: When products > 50K or search > 300ms
- Add ClickHouse: When analytics queries slow
- Separate workers: When scraping affects backend
- Multi-server: When daily visitors > 20,000

**This configuration provides the best balance of cost, performance, and scalability for a startup price comparison website.** 🎯
