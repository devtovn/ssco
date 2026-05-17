/**
 * Product domain types
 */

export interface Product {
  id: number;
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, any>;
  images: string[];
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  // Relations
  categories?: number[]; // Category IDs
}

export interface ProductInput {
  name: string;
  description?: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, any>;
  images?: string[];
  keywords?: string[];
  categoryIds?: number[];
}

export interface ProductUpdate {
  name?: string;
  description?: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, any>;
  images?: string[];
  keywords?: string[];
  isActive?: boolean;
  categoryIds?: number[];
}

export interface ProductPerformance {
  productId: number;
  productName: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

/**
 * Product with price information
 */
export interface ProductWithPrice extends Product {
  lowestPrice?: number;
  averagePrice?: number;
  priceRange?: {
    min: number;
    max: number;
  };
  sourceName?: string;
  sourceUrl?: string;
}
