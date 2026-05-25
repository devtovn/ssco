/**
 * Category Management Service
 * Handles all category-related operations including CRUD, tree structure, and metrics
 */

import { Pool, PoolClient } from 'pg';
import {
  Category,
  CategoryInput,
  CategoryUpdate,
  CategoryTree,
  CategoryMetrics,
  CategoryWithChildren,
} from '@price-comparison/types';
import { pool, queryRead } from '../config/database';

export class CategoryManagementService {
  /**
   * Create a new category
   */
  async createCategory(input: CategoryInput): Promise<Category> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if slug already exists
      const slugCheck = await client.query(
        'SELECT id FROM categories WHERE slug = $1',
        [input.slug]
      );
      
      if (slugCheck.rows.length > 0) {
        throw new Error(`Category with slug '${input.slug}' already exists`);
      }
      
      // If parentId is provided, verify it exists
      if (input.parentId) {
        const parentCheck = await client.query(
          'SELECT id FROM categories WHERE id = $1',
          [input.parentId]
        );
        
        if (parentCheck.rows.length === 0) {
          throw new Error(`Parent category with ID ${input.parentId} not found`);
        }
      }
      
      // Insert category
      const result = await client.query(
        `INSERT INTO categories (name_vi, name_en, slug, description, icon, parent_id, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name_vi, slug, description, icon, parent_id, is_active, created_at, updated_at`,
        [input.name, input.name, input.slug, input.description, input.icon, input.parentId ?? null, true]
      );
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return this.mapRowToCategory(row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update an existing category
   */
  async updateCategory(id: string, update: CategoryUpdate): Promise<Category> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if category exists
      const existsCheck = await client.query(
        'SELECT id FROM categories WHERE id = $1',
        [id]
      );
      
      if (existsCheck.rows.length === 0) {
        throw new Error(`Category with ID ${id} not found`);
      }
      
      // If slug is being updated, check for conflicts
      if (update.slug) {
        const slugCheck = await client.query(
          'SELECT id FROM categories WHERE slug = $1 AND id != $2',
          [update.slug, id]
        );
        
        if (slugCheck.rows.length > 0) {
          throw new Error(`Category with slug '${update.slug}' already exists`);
        }
      }
      
      // If parentId is being updated, verify it exists and prevent circular reference
      if (update.parentId !== undefined) {
        if (update.parentId === id) {
          throw new Error('Category cannot be its own parent');
        }
        
        if (update.parentId !== null) {
          const parentCheck = await client.query(
            'SELECT id FROM categories WHERE id = $1',
            [update.parentId]
          );
          
          if (parentCheck.rows.length === 0) {
            throw new Error(`Parent category with ID ${update.parentId} not found`);
          }
          
          // Check for circular reference
          const isCircular = await this.wouldCreateCircularReference(client, id, update.parentId);
          if (isCircular) {
            throw new Error('Cannot set parent: would create circular reference');
          }
        }
      }
      
      // Build dynamic update query
      const updates: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;
      
      if (update.name !== undefined) {
        updates.push(`name_vi = $${paramIndex++}`);
        values.push(update.name);
        updates.push(`name_en = $${paramIndex++}`);
        values.push(update.name);
      }
      if (update.slug !== undefined) {
        updates.push(`slug = $${paramIndex++}`);
        values.push(update.slug);
      }
      if (update.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(update.description);
      }
      if (update.icon !== undefined) {
        updates.push(`icon = $${paramIndex++}`);
        values.push(update.icon);
      }
      if (update.parentId !== undefined) {
        updates.push(`parent_id = $${paramIndex++}`);
        values.push(update.parentId);
      }
      if (update.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(update.isActive);
      }
      
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(id);
      
      const result = await client.query(
        `UPDATE categories
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, name_vi, slug, description, icon, parent_id, is_active, created_at, updated_at`,
        values
      );
      
      await client.query('COMMIT');
      
      const row = result.rows[0];
      return this.mapRowToCategory(row);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete a category (with cascade handling)
   */
  async deleteCategory(id: string, cascade: boolean = false): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Check if category exists
      const existsCheck = await client.query(
        'SELECT id FROM categories WHERE id = $1',
        [id]
      );
      
      if (existsCheck.rows.length === 0) {
        throw new Error(`Category with ID ${id} not found`);
      }
      
      // Check for child categories
      const childrenCheck = await client.query(
        'SELECT COUNT(*) as count FROM categories WHERE parent_id = $1',
        [id]
      );
      
      const hasChildren = parseInt(childrenCheck.rows[0].count) > 0;
      
      if (hasChildren && !cascade) {
        throw new Error('Cannot delete category with children. Use cascade=true to delete all children.');
      }
      
      // Check for products
      const productsCheck = await client.query(
        'SELECT COUNT(*) as count FROM product_categories WHERE category_id = $1',
        [id]
      );
      
      const hasProducts = parseInt(productsCheck.rows[0].count) > 0;
      
      if (hasProducts) {
        throw new Error('Cannot delete category with associated products. Remove products first.');
      }
      
      if (cascade && hasChildren) {
        // Recursively delete all children
        await this.deleteCategoryRecursive(client, id);
      } else {
        // Delete the category
        await client.query('DELETE FROM categories WHERE id = $1', [id]);
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(rootId?: string): Promise<CategoryTree[]> {
    const query = rootId
      ? 'SELECT * FROM categories WHERE parent_id = $1 AND is_active = true ORDER BY display_order ASC, name_vi'
      : 'SELECT * FROM categories WHERE parent_id IS NULL AND is_active = true ORDER BY display_order ASC, name_vi';
    
    const params = rootId ? [rootId] : [];
    const result = await queryRead(query, params);
    
    const trees: CategoryTree[] = [];
    
    for (const row of result.rows) {
      const category = this.mapRowToCategory(row);
      const children = await this.getCategoryTree(category.id);
      
      trees.push({
        category,
        children,
      });
    }
    
    return trees;
  }

  /**
   * Assign product to categories
   */
  async assignProductToCategories(productId: number, categoryIds: number[]): Promise<void> {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Verify all categories exist
      const categoriesCheck = await client.query(
        'SELECT id FROM categories WHERE id = ANY($1::int[])',
        [categoryIds]
      );
      
      if (categoriesCheck.rows.length !== categoryIds.length) {
        throw new Error('One or more category IDs are invalid');
      }
      
      // Remove existing associations
      await client.query(
        'DELETE FROM product_categories WHERE product_id = $1',
        [productId]
      );
      
      // Insert new associations
      if (categoryIds.length > 0) {
        const values = categoryIds.map((catId, idx) => 
          `($1, $${idx + 2})`
        ).join(', ');
        
        await client.query(
          `INSERT INTO product_categories (product_id, category_id) VALUES ${values}`,
          [productId, ...categoryIds]
        );
      }
      
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get products by category (with subcategory support)
   */
  async getProductsByCategory(
    categoryId: number,
    includeSubcategories: boolean = true,
    page: number = 1,
    limit: number = 20
  ): Promise<{ products: any[]; total: number }> {
    const offset = (page - 1) * limit;
    
    let categoryIds = [categoryId];

    if (includeSubcategories) {
      const descendants = await this.getAllDescendantIds(categoryId);
      categoryIds = [categoryId, ...descendants];
    }
    
    // Get products
    const productsQuery = `
      SELECT DISTINCT p.*,
        (SELECT MIN(pe.price) FROM price_entries pe WHERE pe.product_id = p.id AND pe.is_available = true) as lowest_price
      FROM products p
      INNER JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.category_id = ANY($1::text[])
        AND p.is_active = true
      ORDER BY p.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const productsResult = await queryRead(productsQuery, [categoryIds, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      INNER JOIN product_categories pc ON p.id = pc.product_id
      WHERE pc.category_id = ANY($1::text[])
        AND p.is_active = true
    `;
    
    const countResult = await queryRead(countQuery, [categoryIds]);
    const total = parseInt(countResult.rows[0].total);
    
    return {
      products: productsResult.rows,
      total,
    };
  }

  /**
   * Get category metrics for analytics
   */
  async getCategoryMetrics(categoryId: number): Promise<CategoryMetrics> {
    // Get product count
    const productCountQuery = `
      SELECT COUNT(DISTINCT pc.product_id) as count
      FROM product_categories pc
      INNER JOIN products p ON pc.product_id = p.id
      WHERE pc.category_id = $1 AND p.is_active = true
    `;
    
    const productCountResult = await queryRead(productCountQuery, [categoryId]);
    const productCount = parseInt(productCountResult.rows[0].count);
    
    // Get view count from analytics (if table exists)
    let viewCount = 0;
    try {
      const viewCountQuery = `
        SELECT COUNT(*) as count
        FROM user_interactions
        WHERE type = 'product_view'
          AND metadata->>'categoryId' = $1
      `;
      
      const viewCountResult = await queryRead(viewCountQuery, [categoryId.toString()]);
      viewCount = parseInt(viewCountResult.rows[0].count);
    } catch (error) {
      // Table might not exist yet
      console.warn('Could not fetch view count:', error);
    }
    
    // Get search count
    let searchCount = 0;
    try {
      const searchCountQuery = `
        SELECT COUNT(*) as count
        FROM search_logs
        WHERE category_id = $1
      `;
      
      const searchCountResult = await queryRead(searchCountQuery, [categoryId]);
      searchCount = parseInt(searchCountResult.rows[0].count);
    } catch (error) {
      console.warn('Could not fetch search count:', error);
    }
    
    // Calculate conversion rate (placeholder - needs actual conversion data)
    const conversionRate = 0;
    
    return {
      categoryId,
      productCount,
      viewCount,
      searchCount,
      conversionRate,
    };
  }

  /**
   * Get category by ID
   */
  async getCategoryById(id: string): Promise<Category | null> {
    const result = await queryRead(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCategory(result.rows[0]);
  }

  /**
   * Get category by slug
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    const result = await queryRead(
      'SELECT * FROM categories WHERE slug = $1',
      [slug]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToCategory(result.rows[0]);
  }

  /**
   * Get all categories (flat list)
   */
  async getAllCategories(activeOnly: boolean = true): Promise<Category[]> {
    const query = activeOnly
      ? 'SELECT * FROM categories WHERE is_active = true ORDER BY name_vi'
      : 'SELECT * FROM categories ORDER BY name_vi';
    
    const result = await queryRead(query);
    
    return result.rows.map(row => this.mapRowToCategory(row));
  }

  // Private helper methods

  private mapRowToCategory(row: any): Category {
    return {
      id: row.id,
      name: row.name_vi ?? row.name,
      slug: row.slug,
      description: row.description,
      icon: row.icon,
      parentId: row.parent_id,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }

  private async wouldCreateCircularReference(
    client: PoolClient,
    categoryId: string,
    newParentId: string
  ): Promise<boolean> {
    // Check if newParentId is a descendant of categoryId
    const descendants = await this.getAllDescendantIds(categoryId, client);
    return descendants.includes(newParentId);
  }

  private async getAllDescendantIds(
    categoryId: string,
    client?: PoolClient
  ): Promise<string[]> {
    const executor = client || { query: queryRead.bind(null) };
    
    const result = await (client 
      ? client.query(
          `WITH RECURSIVE descendants AS (
            SELECT id FROM categories WHERE id = $1
            UNION
            SELECT c.id FROM categories c
            INNER JOIN descendants d ON c.parent_id = d.id
          )
          SELECT id FROM descendants WHERE id != $1`,
          [categoryId]
        )
      : queryRead(
          `WITH RECURSIVE descendants AS (
            SELECT id FROM categories WHERE id = $1
            UNION
            SELECT c.id FROM categories c
            INNER JOIN descendants d ON c.parent_id = d.id
          )
          SELECT id FROM descendants WHERE id != $1`,
          [categoryId]
        )
    );
    
    return result.rows.map(row => row.id);
  }

  async reorderCategories(
    updates: Array<{ id: string; parentId: string | null; displayOrder: number }>
  ): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const { id, parentId, displayOrder } of updates) {
        await client.query(
          'UPDATE categories SET parent_id = $1, display_order = $2, updated_at = NOW() WHERE id = $3',
          [parentId, displayOrder, id]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  private async deleteCategoryRecursive(client: PoolClient, categoryId: string): Promise<void> {
    // Get all children
    const childrenResult = await client.query(
      'SELECT id FROM categories WHERE parent_id = $1',
      [categoryId]
    );
    
    // Recursively delete children
    for (const child of childrenResult.rows) {
      await this.deleteCategoryRecursive(client, child.id);
    }
    
    // Delete the category itself
    await client.query('DELETE FROM categories WHERE id = $1', [categoryId]);
  }
}

// Export singleton instance
export const categoryManagementService = new CategoryManagementService();
