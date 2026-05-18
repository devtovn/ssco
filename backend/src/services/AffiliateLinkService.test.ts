import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { AffiliateLinkService } from './AffiliateLinkService';

describe('AffiliateLinkService', () => {
  let service: AffiliateLinkService;
  let pool: { query: jest.Mock };

  beforeEach(() => {
    pool = { query: jest.fn() };
    service = new AffiliateLinkService(pool as never);
  });

  it('should expose validateAffiliateLinkFormat method', () => {
    expect(typeof service.validateAffiliateLinkFormat).toBe('function');
  });
});
