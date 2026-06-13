import { describe, it, expect } from '@jest/globals';
import { resolveTikiAvailability } from './tikiAvailability';

describe('resolveTikiAvailability', () => {
  it('returns true for search listing with availability=1', () => {
    expect(
      resolveTikiAvailability({
        id: 278630241,
        name: 'Apple iPhone 17',
        price: 23990000,
        availability: 1,
      })
    ).toBe(true);
  });

  it('returns false for search listing with availability=0', () => {
    expect(
      resolveTikiAvailability({
        id: 1,
        name: 'Sold out item',
        price: 100000,
        availability: 0,
      })
    ).toBe(false);
  });

  it('returns true for product detail with inventory_status=available', () => {
    expect(
      resolveTikiAvailability({
        inventory_status: 'available',
        inventory_type: 'instock',
        price: 23990000,
      })
    ).toBe(true);
  });

  it('returns true when stock_item.qty > 0', () => {
    expect(
      resolveTikiAvailability({
        stock_item: { qty: 5 },
        price: 100000,
      })
    ).toBe(true);
  });

  it('returns false for explicit out_of_stock status', () => {
    expect(
      resolveTikiAvailability({
        inventory_status: 'out_of_stock',
        availability: 1,
        price: 100000,
      })
    ).toBe(false);
  });

  it('returns false when no stock signals and price is zero', () => {
    expect(resolveTikiAvailability({ name: 'Freebie', price: 0 })).toBe(false);
  });
});
