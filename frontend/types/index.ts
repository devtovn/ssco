export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  brand?: string;
  model?: string;
  specifications?: Record<string, any>;
  images: string[];
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface PriceEntry {
  id: string;
  productId: string;
  sourceName: string;
  sourceUrl: string;
  price: number;
  currency: string;
  isAvailable: boolean;
  scrapedAt: Date;
  metadata?: Record<string, any>;
}

export interface Category {
  id: string;
  nameVi: string;
  nameEn: string;
  slug: string;
  description?: string;
  icon?: string;
  parentId?: string;
  level: number;
  productCount: number;
  isActive: boolean;
}

export interface SearchQuery {
  keyword: string;
  category?: string;
  priceRange?: {
    min: number;
    max: number;
  };
  brand?: string;
  sortBy?: 'price_asc' | 'price_desc' | 'name' | 'popularity';
  page: number;
  limit: number;
}

export interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
