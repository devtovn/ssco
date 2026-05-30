/**
 * Price domain types
 */

export interface PriceEntry {
  id: number;
  productId: number;
  source: string;
  sourceUrl: string;
  /** Pre-generated affiliate link stored at seed time. Use for redirect if set. */
  affiliateUrl?: string;
  price: number;
  currency: string;
  isAvailable: boolean;
  scrapedAt: Date;
  metadata?: Record<string, any>;
}

export interface PriceComparison {
  productId: number;
  productName: string;
  prices: PriceEntry[];
  lowestPrice?: PriceEntry;
  highestPrice?: PriceEntry;
  averagePrice: number;
  priceRange: PriceRange;
  lastUpdated: Date;
  availableSources: number;
}

export interface PriceHistory {
  productId: number;
  source: string;
  entries: PriceHistoryEntry[];
  trend: 'increasing' | 'decreasing' | 'stable';
  lowestEver?: number;
  highestEver?: number;
}

export interface PriceHistoryEntry {
  date: Date;
  price: number;
  isAvailable: boolean;
}

export interface PriceRange {
  min: number;
  max: number;
}

export interface Deal {
  productId: number;
  slug?: string;
  productName: string;
  productImage: string;
  categoryId?: number;
  categoryName?: string;
  originalPrice: number;
  currentPrice: number;
  discount: number;
  discountPercentage: number;
  source: string;
  sourceUrl: string;
  expiresAt?: Date;
  scrapedAt: Date;
}

export interface PriceUpdateResult {
  success: boolean;
  updatedCount: number;
  failedCount: number;
  errors?: string[];
  timestamp: Date;
}
