/**
 * Category domain types
 */

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  // Computed fields
  productCount?: number;
  level?: number;
}

export interface CategoryInput {
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: number;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  parentId?: number;
  isActive?: boolean;
}

export interface CategoryTree {
  category: Category;
  children: CategoryTree[];
}

export interface CategoryMetrics {
  categoryId: number;
  productCount: number;
  viewCount: number;
  searchCount: number;
  conversionRate: number;
  popularProducts?: number[]; // Product IDs
}

/**
 * Category with subcategories
 */
export interface CategoryWithChildren extends Category {
  children: Category[];
  subcategoryCount: number;
}
