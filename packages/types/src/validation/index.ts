/**
 * Validation schemas index
 * Export all Zod schemas for request/response validation
 */

// Product schemas
export * from './product.schema';

// Category schemas
export * from './category.schema';

// Search schemas
export * from './search.schema';

// Affiliate schemas
export * from './affiliate.schema';

// User schemas
export * from './user.schema';

// Common validation utilities
export { z } from 'zod';

/**
 * Validation helper function
 * Validates data against a Zod schema and returns typed result
 */
export function validate<T>(schema: import('zod').ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
} {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Async validation helper function
 * For schemas with async refinements
 */
export async function validateAsync<T>(schema: import('zod').ZodSchema<T>, data: unknown): Promise<{
  success: boolean;
  data?: T;
  errors?: Array<{ field: string; message: string }>;
}> {
  const result = await schema.safeParseAsync(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }
  
  return {
    success: false,
    errors: result.error.errors.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    })),
  };
}
