import crypto from 'crypto';

/**
 * Generate a hash for cache keys from query parameters
 */
export const hashQuery = (query: Record<string, unknown>): string => {
  const sortedQuery = Object.keys(query)
    .sort()
    .reduce((acc, key) => {
      acc[key] = query[key];
      return acc;
    }, {} as Record<string, unknown>);

  const queryString = JSON.stringify(sortedQuery);
  return crypto.createHash('md5').update(queryString).digest('hex');
};
