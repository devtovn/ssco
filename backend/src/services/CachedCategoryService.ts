/**
 * Cached Category Service
 * Wraps CategoryManagementService with Redis caching
 */

import {
  Category,
  CategoryInput,
  CategoryUpdate,
  CategoryTree,
  CategoryMetrics,
} from '@price-comparison/types';
import { categoryManagementService } from './CategoryManagementService';
import { CacheService, CacheKeys, CacheTTL } from '../utils/cache';

export class CachedCategoryService {
  /**
   * Create a new category (invalidates cache)
   */
  async createCategory(input: CategoryInput): Promise<Category> {
    const category = await categoryManagementService.createCategory(input);
    
    // Invalidate category tree cache
    await this.invalidateCategoryCache();
    
    return category;
  }

  /**
   * Update an existing category (invalidates cache)
   */
  async updateCategory(id: string, update: CategoryUpdate): Promise<Category> {
    const category = await categoryManagementService.updateCategory(id, update);
    
    // Invalidate all category-related caches
    await this.invalidateCategoryCache();
    await CacheService.delete(CacheKeys.CATEGORY_PRODUCTS(id));
    await CacheService.delete(CacheKeys.CATEGORY_METRICS(id));
    
    return category;
  }

  /**
   * Delete a category (invalidates cache)
   */
  async deleteCategory(id: string, cascade: boolean = false): Promise<void> {
    await categoryManagementService.deleteCategory(id, cascade);
    
    // Invalidate all category-related caches
    await this.invalidateCategoryCache();
    await CacheService.delete(CacheKeys.CATEGORY_PRODUCTS(id));
    await CacheService.delete(CacheKeys.CATEGORY_METRICS(id));
  }

  /**
   * Get category tree (with caching)
   */
  async getCategoryTree(rootId?: string): Promise<CategoryTree[]> {
    const cacheKey = rootId 
      ? `${CacheKeys.CATEGORY_TREE}:${rootId}`
      : CacheKeys.CATEGORY_TREE;
    
    // Try to get from cache
    const cached = await CacheService.get<CategoryTree[]>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const tree = await categoryManagementService.getCategoryTree(rootId);
    
    // Store in cache
    await CacheService.set(cacheKey, tree, CacheTTL.CATEGORY_TREE);
    
    return tree;
  }

  /**
   * Assign product to categories (invalidates cache)
   */
  async assignProductToCategories(productId: number, categoryIds: number[]): Promise<void> {
    await categoryManagementService.assignProductToCategories(productId, categoryIds);
    
    // Invalidate product cache for all affected categories
    for (const categoryId of categoryIds) {
      await CacheService.delete(CacheKeys.CATEGORY_PRODUCTS(categoryId));
      await CacheService.delete(CacheKeys.CATEGORY_METRICS(categoryId));
    }
  }

  /**
   * Get products by category (with caching)
   */
  async getProductsByCategory(
    categoryId: string,
    includeSubcategories: boolean = true,
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: any[]; total: number }> {
    const cacheKey = `${CacheKeys.CATEGORY_PRODUCTS(categoryId)}:${includeSubcategories}:${page}:${limit}`;
    
    // Try to get from cache
    const cached = await CacheService.get<{ products: any[]; total: number }>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const result = await categoryManagementService.getProductsByCategory(
      categoryId,
      includeSubcategories,
      page,
      limit
    );
    
    // Store in cache
    await CacheService.set(cacheKey, result, CacheTTL.CATEGORY_PRODUCTS);
    
    return result;
  }

  /**
   * Get category metrics (with caching)
   */
  async getCategoryMetrics(categoryId: string): Promise<CategoryMetrics> {
    const cacheKey = CacheKeys.CATEGORY_METRICS(categoryId);
    
    // Try to get from cache
    const cached = await CacheService.get<CategoryMetrics>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const metrics = await categoryManagementService.getCategoryMetrics(categoryId);
    
    // Store in cache
    await CacheService.set(cacheKey, metrics, CacheTTL.CATEGORY_METRICS);
    
    return metrics;
  }

  /**
   * Get category by ID (with caching)
   */
  async getCategoryById(id: string): Promise<Category | null> {
    const cacheKey = `category:${id}`;
    
    // Try to get from cache
    const cached = await CacheService.get<Category>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const category = await categoryManagementService.getCategoryById(id);
    
    if (category) {
      // Store in cache
      await CacheService.set(cacheKey, category, CacheTTL.CATEGORY_TREE);
    }
    
    return category;
  }

  /**
   * Get category by slug (with caching)
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const cacheKey = `category:slug:${slug}`;
    
    // Try to get from cache
    const cached = await CacheService.get<Category>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const category = await categoryManagementService.getCategoryBySlug(slug);
    
    if (category) {
      // Store in cache
      await CacheService.set(cacheKey, category, CacheTTL.CATEGORY_TREE);
    }
    
    return category;
  }

  /**
   * Get all categories (with caching)
   */
  async getAllCategories(activeOnly: boolean = true): Promise<Category[]> {
    const cacheKey = `categories:all:${activeOnly}`;
    
    // Try to get from cache
    const cached = await CacheService.get<Category[]>(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return cached;
    }
    
    console.log(`Cache MISS: ${cacheKey}`);
    
    // Get from database
    const categories = await categoryManagementService.getAllCategories(activeOnly);
    
    // Store in cache
    await CacheService.set(cacheKey, categories, CacheTTL.CATEGORY_TREE);
    
    return categories;
  }

  /**
   * Invalidate all category-related caches
   */
  private async invalidateCategoryCache(): Promise<void> {
    // Invalidate category tree cache
    await CacheService.deletePattern('category:tree*');
    await CacheService.deletePattern('category:*');
    await CacheService.deletePattern('categories:all:*');
    
    console.log('Category cache invalidated');
  }

  /**
   * Warm up category cache
   * Call this on application startup or after cache clear
   */
  async reorderCategories(
    updates: Array<{ id: string; parentId: string | null; displayOrder: number }>
  ): Promise<void> {
    await categoryManagementService.reorderCategories(updates);
    await this.invalidateCategoryCache();
  }

  async warmCache(): Promise<void> {
    console.log('Warming up category cache...');
    
    try {
      // Cache category tree
      await this.getCategoryTree();
      
      // Cache all categories
      await this.getAllCategories(true);
      await this.getAllCategories(false);
      
      console.log('Category cache warmed up successfully');
    } catch (error) {
      console.error('Failed to warm up category cache:', error);
    }
  }
}

// Export singleton instance
export const cachedCategoryService = new CachedCategoryService();
