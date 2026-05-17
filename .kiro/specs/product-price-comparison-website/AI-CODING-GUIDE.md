# AI Coding Guide - Product Price Comparison Website

## Mục đích
File này cung cấp hướng dẫn chi tiết cho AI Code Agents để sinh code từ requirements.md, design.md và tasks.md.

## Cấu trúc Project

```
SSCO/
├── backend/                    # Express.js TypeScript backend
│   ├── src/
│   │   ├── config/            # Database, Redis, Swagger config
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── routes/            # API endpoints
│   │   ├── services/          # Business logic
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Helper functions
│   ├── migrations/            # Database migrations
│   └── scripts/               # Utility scripts
├── frontend/                   # Next.js 14 App Router
│   ├── app/                   # Pages and layouts
│   ├── components/            # React components
│   ├── lib/                   # Client utilities
│   └── types/                 # TypeScript types
└── packages/
    └── types/                 # Shared types package
        └── src/               # Shared TypeScript interfaces


## Technology Stack Chi Tiết

### Backend
- **Runtime**: Node.js 20 LTS
- **Framework**: Express.js 4.x với TypeScript 5.x
- **Database**: PostgreSQL 15 với node-pg-migrate
- **Cache**: Redis 7 với ioredis client
- **Validation**: Zod 3.x
- **Authentication**: jsonwebtoken + bcrypt
- **API Docs**: swagger-ui-express + OpenAPI 3.0

### Frontend
- **Framework**: Next.js 14 với App Router
- **Styling**: Tailwind CSS 3.x + Headless UI
- **State**: Zustand 4.x
- **HTTP Client**: fetch API (built-in)
- **PWA**: next-pwa

### Shared
- **Types**: @price-comparison/types (monorepo package)
- **Validation**: Zod schemas exported from types package

## Patterns và Best Practices

### 1. Service Layer Pattern

**Mỗi service class phải có:**
- Constructor nhận dependencies (database pool, cache client)
- Public methods cho business logic
- Private helper methods
- Error handling với try-catch
- Logging cho debugging

**Ví dụ CategoryManagementService:**

```typescript
// backend/src/services/CategoryManagementService.ts
import { Pool } from 'pg';
import { Category, CategoryInput, CategoryTree } from '@price-comparison/types';

export class CategoryManagementService {
  constructor(private pool: Pool) {}

  async createCategory(input: CategoryInput): Promise<Category> {
    const client = await this.pool.connect();
    try {
      // Validate parent exists if parentId provided
      if (input.parentId) {
        const parentExists = await this.categoryExists(input.parentId, client);
        if (!parentExists) {
          throw new Error(`Parent category ${input.parentId} not found`);
        }
      }

      // Calculate level based on parent
      const level = input.parentId 
        ? await this.getParentLevel(input.parentId, client) + 1 
        : 0;

      // Generate slug from Vietnamese name
      const slug = this.generateSlug(input.nameVi);

      const result = await client.query(
        `INSERT INTO categories (name_vi, name_en, slug, description, icon, parent_id, level, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [input.nameVi, input.nameEn, slug, input.description, input.icon, input.parentId, level, true]
      );

      return this.mapRowToCategory(result.rows[0]);
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async getCategoryTree(): Promise<CategoryTree[]> {
    const result = await this.pool.query(
      `SELECT * FROM categories WHERE is_active = true ORDER BY level, display_order`
    );
    
    const categories = result.rows.map(row => this.mapRowToCategory(row));
    return this.buildTree(categories);
  }

  private buildTree(categories: Category[], parentId: string | null = null): CategoryTree[] {
    return categories
      .filter(cat => cat.parentId === parentId)
      .map(cat => ({
        category: cat,
        children: this.buildTree(categories, cat.id)
      }));
  }

  private generateSlug(nameVi: string): string {
    return nameVi
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async categoryExists(id: string, client: any): Promise<boolean> {
    const result = await client.query('SELECT 1 FROM categories WHERE id = $1', [id]);
    return result.rows.length > 0;
  }

  private async getParentLevel(parentId: string, client: any): Promise<number> {
    const result = await client.query('SELECT level FROM categories WHERE id = $1', [parentId]);
    return result.rows[0]?.level ?? 0;
  }

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      nameVi: row.name_vi,
      nameEn: row.name_en,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      parentId: row.parent_id,
      level: row.level,
      productCount: row.product_count || 0,
      isActive: row.is_active,
      metadata: row.metadata || {}
    };
  }
}
```

### 2. Cached Service Wrapper Pattern

**Mỗi cached service phải:**
- Wrap original service
- Check cache trước khi gọi service
- Set cache sau khi lấy data từ service
- Invalidate cache khi data thay đổi

**Ví dụ CachedCategoryService:**

```typescript
// backend/src/services/CachedCategoryService.ts
import { CategoryManagementService } from './CategoryManagementService';
import { CacheService, CacheKeys, CacheTTL } from '../utils/cache';
import { Category, CategoryInput, CategoryTree } from '@price-comparison/types';

export class CachedCategoryService {
  constructor(
    private categoryService: CategoryManagementService,
    private cache: typeof CacheService
  ) {}

  async getCategoryTree(): Promise<CategoryTree[]> {
    // Try cache first
    const cached = await this.cache.get<CategoryTree[]>(CacheKeys.CATEGORY_TREE);
    if (cached) {
      return cached;
    }

    // Cache miss - fetch from service
    const tree = await this.categoryService.getCategoryTree();
    
    // Store in cache
    await this.cache.set(CacheKeys.CATEGORY_TREE, tree, CacheTTL.CATEGORY_TREE);
    
    return tree;
  }

  async createCategory(input: CategoryInput): Promise<Category> {
    const category = await this.categoryService.createCategory(input);
    
    // Invalidate category tree cache
    await this.cache.delete(CacheKeys.CATEGORY_TREE);
    
    return category;
  }

  async updateCategory(id: string, updates: Partial<CategoryInput>): Promise<Category> {
    const category = await this.categoryService.updateCategory(id, updates);
    
    // Invalidate related caches
    await this.cache.deletePattern('category:*');
    
    return category;
  }
}
```

### 3. REST API Route Pattern

**Mỗi route file phải có:**
- Express Router instance
- OpenAPI documentation comments
- Zod validation middleware
- Authentication/authorization middleware (nếu cần)
- Error handling với asyncHandler wrapper

**Ví dụ categories routes:**

```typescript
// backend/src/routes/categories.ts
import { Router } from 'express';
import { CachedCategoryService } from '../services/CachedCategoryService';
import { validateRequest } from '../middleware/validateRequest';
import { authenticateJWT, requireRole } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { CategoryInputSchema } from '@price-comparison/types/validation';

const router = Router();

/**
 * @openapi
 * /api/categories/tree:
 *   get:
 *     summary: Get category tree
 *     description: Returns hierarchical category structure
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category tree
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CategoryTree'
 */
router.get('/tree', asyncHandler(async (req, res) => {
  const categoryService = req.app.get('categoryService') as CachedCategoryService;
  const tree = await categoryService.getCategoryTree();
  res.json(tree);
}));

/**
 * @openapi
 * /api/categories:
 *   post:
 *     summary: Create new category
 *     description: Create a new product category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CategoryInput'
 *     responses:
 *       201:
 *         description: Category created
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/',
  authenticateJWT,
  requireRole('Administrator'),
  validateRequest(CategoryInputSchema),
  asyncHandler(async (req, res) => {
    const categoryService = req.app.get('categoryService') as CachedCategoryService;
    const category = await categoryService.createCategory(req.body);
    res.status(201).json(category);
  })
);

export default router;
```

### 4. Database Migration Pattern

**Mỗi migration file phải có:**
- Timestamp prefix (format: YYYYMMDDHHmmss)
- up() function để apply changes
- down() function để rollback changes
- Proper indexes cho performance
- Comments giải thích schema

**Ví dụ migration:**

```typescript
// backend/migrations/1704000007000_create-categories-table.ts
import { MigrationBuilder, ColumnDefinitions } from 'node-pg-migrate';

export const shorthands: ColumnDefinitions | undefined = undefined;

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Create categories table
  pgm.createTable('categories', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()')
    },
    name_vi: {
      type: 'varchar(200)',
      notNull: true,
      comment: 'Vietnamese category name'
    },
    name_en: {
      type: 'varchar(200)',
      notNull: true,
      comment: 'English category name'
    },
    slug: {
      type: 'varchar(200)',
      notNull: true,
      unique: true,
      comment: 'URL-friendly slug'
    },
    description: {
      type: 'text',
      comment: 'Category description'
    },
    icon: {
      type: 'varchar(500)',
      comment: 'Icon URL or class name'
    },
    parent_id: {
      type: 'uuid',
      references: 'categories(id)',
      onDelete: 'CASCADE',
      comment: 'Parent category for hierarchy'
    },
    level: {
      type: 'integer',
      notNull: true,
      default: 0,
      comment: 'Hierarchy level (0 = root)'
    },
    display_order: {
      type: 'integer',
      default: 0,
      comment: 'Display order within same level'
    },
    is_active: {
      type: 'boolean',
      notNull: true,
      default: true
    },
    created_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    },
    updated_at: {
      type: 'timestamp',
      notNull: true,
      default: pgm.func('NOW()')
    }
  });

  // Create indexes for performance
  pgm.createIndex('categories', 'parent_id');
  pgm.createIndex('categories', 'slug');
  pgm.createIndex('categories', 'level');
  pgm.createIndex('categories', 'is_active');
  pgm.createIndex('categories', ['level', 'display_order']);

  console.log('✅ Categories table created successfully');
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  pgm.dropTable('categories', { cascade: true });
  console.log('✅ Categories table dropped');
}
```

### 5. TypeScript Interface Pattern

**Mỗi domain phải có:**
- Base interface cho entity
- Input interface cho creation
- Update interface cho partial updates
- Response interface cho API responses

**Ví dụ Category interfaces:**

```typescript
// packages/types/src/category.ts

/**
 * Category entity representing a product category
 */
export interface Category {
  id: string;
  nameVi: string;
  nameEn: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  level: number;
  displayOrder: number;
  productCount: number;
  isActive: boolean;
  metadata?: CategoryMetadata;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Input for creating a new category
 */
export interface CategoryInput {
  nameVi: string;
  nameEn: string;
  description?: string;
  icon?: string;
  parentId?: string;
  displayOrder?: number;
}

/**
 * Input for updating an existing category
 */
export interface CategoryUpdate {
  nameVi?: string;
  nameEn?: string;
  description?: string;
  icon?: string;
  parentId?: string;
  displayOrder?: number;
  isActive?: boolean;
}

/**
 * Hierarchical category tree structure
 */
export interface CategoryTree {
  category: Category;
  children: CategoryTree[];
}

/**
 * Category metadata for additional information
 */
export interface CategoryMetadata {
  seoTitle?: string;
  seoDescription?: string;
  bannerImage?: string;
  featuredProducts?: string[];
  [key: string]: any;
}

/**
 * Category metrics for analytics
 */
export interface CategoryMetrics {
  categoryId: string;
  totalProducts: number;
  activeProducts: number;
  averagePrice: number;
  priceRange: {
    min: number;
    max: number;
  };
  popularBrands: string[];
  viewCount: number;
  searchCount: number;
}
```

### 6. Zod Validation Schema Pattern

**Mỗi validation schema phải:**
- Match corresponding TypeScript interface
- Include detailed error messages
- Validate business rules
- Export both schema và inferred type

**Ví dụ Category validation:**

```typescript
// packages/types/src/validation/category.schema.ts
import { z } from 'zod';

export const CategoryInputSchema = z.object({
  nameVi: z.string()
    .min(3, 'Vietnamese name must be at least 3 characters')
    .max(200, 'Vietnamese name must not exceed 200 characters'),
  
  nameEn: z.string()
    .min(3, 'English name must be at least 3 characters')
    .max(200, 'English name must not exceed 200 characters'),
  
  description: z.string()
    .max(1000, 'Description must not exceed 1000 characters')
    .optional(),
  
  icon: z.string()
    .url('Icon must be a valid URL')
    .or(z.string().regex(/^[a-z-]+$/, 'Icon must be a valid CSS class'))
    .optional(),
  
  parentId: z.string()
    .uuid('Parent ID must be a valid UUID')
    .optional(),
  
  displayOrder: z.number()
    .int('Display order must be an integer')
    .min(0, 'Display order must be non-negative')
    .optional()
});

export const CategoryUpdateSchema = CategoryInputSchema.partial().extend({
  isActive: z.boolean().optional()
});

export const CategoryQuerySchema = z.object({
  includeInactive: z.boolean().optional(),
  parentId: z.string().uuid().optional(),
  level: z.number().int().min(0).optional()
});

// Export inferred types
export type CategoryInputValidated = z.infer<typeof CategoryInputSchema>;
export type CategoryUpdateValidated = z.infer<typeof CategoryUpdateSchema>;
export type CategoryQueryValidated = z.infer<typeof CategoryQuerySchema>;
```


## Common Implementation Patterns

### Error Handling Pattern

```typescript
// backend/src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from 'express';

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json({
    error: message,
    code,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
```

### Authentication Middleware Pattern

```typescript
// backend/src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: 'Administrator' | 'Reviewer';
    permissions: Record<string, boolean>;
  };
}

export const authenticateJWT = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided', code: 'NO_TOKEN' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      permissions: decoded.permissions
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', code: 'INVALID_TOKEN' });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated', code: 'NOT_AUTHENTICATED' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions', 
        code: 'FORBIDDEN',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
};
```

### Validation Middleware Pattern

```typescript
// backend/src/middleware/validateRequest.ts
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validateRequest = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Query validation failed',
          code: 'QUERY_VALIDATION_ERROR',
          details: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};
```

## Database Query Patterns

### Basic CRUD Operations

```typescript
// CREATE
const result = await pool.query(
  `INSERT INTO table_name (column1, column2) VALUES ($1, $2) RETURNING *`,
  [value1, value2]
);

// READ with pagination
const result = await pool.query(
  `SELECT * FROM table_name 
   WHERE condition = $1 
   ORDER BY created_at DESC 
   LIMIT $2 OFFSET $3`,
  [condition, limit, offset]
);

// UPDATE
const result = await pool.query(
  `UPDATE table_name 
   SET column1 = $1, updated_at = NOW() 
   WHERE id = $2 
   RETURNING *`,
  [newValue, id]
);

// DELETE
await pool.query(
  `DELETE FROM table_name WHERE id = $1`,
  [id]
);
```

### Transaction Pattern

```typescript
async function performTransaction() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Multiple operations
    await client.query('INSERT INTO table1 ...');
    await client.query('UPDATE table2 ...');
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
```

### Full-Text Search Pattern

```typescript
// Search with PostgreSQL Full-Text Search
const result = await pool.query(
  `SELECT *, 
          ts_rank(to_tsvector('vietnamese', name), plainto_tsquery('vietnamese', $1)) as rank
   FROM products
   WHERE to_tsvector('vietnamese', name) @@ plainto_tsquery('vietnamese', $1)
      OR similarity(name, $1) > 0.3
   ORDER BY rank DESC, similarity(name, $1) DESC
   LIMIT $2 OFFSET $3`,
  [searchQuery, limit, offset]
);
```

### Hierarchical Query Pattern (Category Tree)

```typescript
// Recursive CTE for category tree
const result = await pool.query(
  `WITH RECURSIVE category_tree AS (
    -- Base case: root categories
    SELECT id, name_vi, name_en, slug, parent_id, level, 0 as depth
    FROM categories
    WHERE parent_id IS NULL AND is_active = true
    
    UNION ALL
    
    -- Recursive case: child categories
    SELECT c.id, c.name_vi, c.name_en, c.slug, c.parent_id, c.level, ct.depth + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
    WHERE c.is_active = true
  )
  SELECT * FROM category_tree ORDER BY level, name_vi`
);
```

## Cache Patterns

### Cache-Aside Pattern

```typescript
async function getCachedData<T>(
  cacheKey: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Try cache first
  const cached = await CacheService.get<T>(cacheKey);
  if (cached) {
    return cached;
  }

  // Cache miss - fetch from source
  const data = await fetchFn();

  // Store in cache
  await CacheService.set(cacheKey, data, ttl);

  return data;
}
```

### Cache Invalidation Pattern

```typescript
// Invalidate specific key
await CacheService.delete(cacheKey);

// Invalidate pattern (all keys matching pattern)
await CacheService.deletePattern('category:*');

// Invalidate multiple related caches
await Promise.all([
  CacheService.delete(CacheKeys.CATEGORY_TREE),
  CacheService.deletePattern('category:*:products'),
  CacheService.deletePattern('category:*:metrics')
]);
```

## API Response Patterns

### Success Response

```typescript
// Single resource
res.json({
  id: '123',
  name: 'Product Name',
  price: 1000000
});

// List with pagination
res.json({
  data: [...items],
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5
  }
});

// Created resource
res.status(201).json({
  id: '123',
  message: 'Resource created successfully'
});
```

### Error Response

```typescript
// Validation error
res.status(400).json({
  error: 'Validation failed',
  code: 'VALIDATION_ERROR',
  details: [
    { path: 'email', message: 'Invalid email format' }
  ]
});

// Not found
res.status(404).json({
  error: 'Resource not found',
  code: 'NOT_FOUND',
  resource: 'Product',
  id: '123'
});

// Unauthorized
res.status(401).json({
  error: 'Authentication required',
  code: 'UNAUTHORIZED'
});

// Forbidden
res.status(403).json({
  error: 'Insufficient permissions',
  code: 'FORBIDDEN',
  required: 'Administrator',
  current: 'Reviewer'
});
```

## Testing Patterns

### Unit Test Pattern

```typescript
// backend/src/services/__tests__/CategoryManagementService.test.ts
import { CategoryManagementService } from '../CategoryManagementService';
import { Pool } from 'pg';

describe('CategoryManagementService', () => {
  let service: CategoryManagementService;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    mockPool = {
      connect: jest.fn(),
      query: jest.fn()
    } as any;
    service = new CategoryManagementService(mockPool);
  });

  describe('createCategory', () => {
    it('should create a category successfully', async () => {
      const input = {
        nameVi: 'Điện lạnh',
        nameEn: 'Refrigeration',
        description: 'Test category'
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{
            id: '123',
            name_vi: input.nameVi,
            name_en: input.nameEn,
            slug: 'dien-lanh',
            level: 0,
            is_active: true
          }]
        }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      const result = await service.createCategory(input);

      expect(result.id).toBe('123');
      expect(result.nameVi).toBe(input.nameVi);
      expect(result.slug).toBe('dien-lanh');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw error if parent category not found', async () => {
      const input = {
        nameVi: 'Sub Category',
        nameEn: 'Sub Category',
        parentId: 'non-existent-id'
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn()
      };

      mockPool.connect.mockResolvedValue(mockClient as any);

      await expect(service.createCategory(input)).rejects.toThrow('Parent category');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
```

## Environment Variables

### Backend .env

```env
# Server
NODE_ENV=development
PORT=3001
API_PREFIX=/api

# Database
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

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# JWT
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# AI Service
OPENAI_API_KEY=your-openai-api-key
AI_MODEL=gpt-4

# External APIs
TIKI_API_KEY=
LAZADA_API_KEY=
TIKTOK_API_KEY=

# Scraping
PROXY_URL=
USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36
```

### Frontend .env.local

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_GA_ID=
```

## Checklist khi implement một feature mới

### Backend Service
- [ ] Tạo TypeScript interface trong `packages/types/src/`
- [ ] Tạo Zod validation schema trong `packages/types/src/validation/`
- [ ] Tạo database migration trong `backend/migrations/`
- [ ] Tạo Service class trong `backend/src/services/`
- [ ] Tạo Cached Service wrapper (nếu cần)
- [ ] Tạo REST API routes trong `backend/src/routes/`
- [ ] Thêm OpenAPI documentation comments
- [ ] Register routes trong `backend/src/index.ts`
- [ ] Viết unit tests
- [ ] Viết integration tests
- [ ] Update API documentation

### Frontend Component
- [ ] Tạo React component trong `frontend/components/`
- [ ] Tạo page trong `frontend/app/`
- [ ] Implement API calls với fetch
- [ ] Add loading states
- [ ] Add error handling
- [ ] Implement responsive design
- [ ] Add accessibility attributes
- [ ] Test trên mobile/tablet
- [ ] Optimize performance

## Quy tắc quan trọng

1. **LUÔN sử dụng TypeScript** - Không dùng `any`, prefer `unknown` nếu cần
2. **LUÔN validate input** - Dùng Zod schemas cho mọi API input
3. **LUÔN handle errors** - Try-catch trong async functions, error middleware
4. **LUÔN release database clients** - Dùng try-finally để release
5. **LUÔN cache khi có thể** - Wrap services với cached versions
6. **LUÔN log errors** - Console.error với context đầy đủ
7. **LUÔN document APIs** - OpenAPI comments cho mọi endpoint
8. **LUÔN test** - Unit tests cho business logic, integration tests cho APIs
9. **LUÔN optimize queries** - Add indexes, use read replicas cho SELECT
10. **LUÔN secure endpoints** - Authentication + authorization middleware

## Tài liệu tham khảo

- Requirements: `requirements.md` - Business requirements chi tiết
- Design: `design.md` - Technical design và architecture
- Tasks: `tasks.md` - Implementation tasks breakdown
- Completion docs: `backend/TASK-*.md` - Completed task documentation
