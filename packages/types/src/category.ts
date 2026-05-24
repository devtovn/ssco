/**
 * Category domain types
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
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
  parentId?: string;
}

export interface CategoryUpdate {
  name?: string;
  slug?: string;
  description?: string;
  icon?: string;
  parentId?: string | null;
  isActive?: boolean;
}

export interface CategoryTree {
  category: Category;
  children: CategoryTree[];
}

export interface CategoryMetrics {
  categoryId: string;
  productCount: number;
  viewCount: number;
  searchCount: number;
  conversionRate: number;
  popularProducts?: string[]; // Product IDs
}

/**
 * Category with subcategories
 */
export interface CategoryWithChildren extends Category {
  children: Category[];
  subcategoryCount: number;
}
