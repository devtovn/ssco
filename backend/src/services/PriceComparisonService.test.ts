import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { PriceComparisonService } from './PriceComparisonService';

jest.mock('../config/database', () => ({
  pool: { connect: jest.fn(), query: jest.fn() },
  queryRead: jest.fn(),
}));

import { queryRead } from '../config/database';

describe('PriceComparisonService', () => {
  let service: PriceComparisonService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PriceComparisonService();
  });

  it('should throw when product not found', async () => {
    (queryRead as jest.Mock).mockResolvedValueOnce({ rows: [] });
    await expect(service.getProductPrices('missing-uuid')).rejects.toThrow('not found');
  });
});
