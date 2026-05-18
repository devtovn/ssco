import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { SearchService } from './SearchService';

jest.mock('../config/database', () => ({
  queryRead: jest.fn(),
  pool: { query: jest.fn() },
}));

import { queryRead } from '../config/database';

describe('SearchService', () => {
  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService();
  });

  it('should return empty suggestions for short query', async () => {
    const result = await service.getSuggestions('a');
    expect(result).toEqual([]);
    expect(queryRead).not.toHaveBeenCalled();
  });
});
