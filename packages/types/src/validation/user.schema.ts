/**
 * Zod validation schemas for User domain
 */

import { z } from 'zod';

export const UserRoleSchema = z.enum(['Administrator', 'Reviewer']);

export const UserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  passwordHash: z.string(),
  role: UserRoleSchema,
  permissions: z.record(z.boolean()),
  isActive: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().optional(),
});

export const UserInputSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password is too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  role: UserRoleSchema,
  permissions: z.record(z.boolean()).optional(),
});

export const UserUpdateSchema = z.object({
  email: z.string().email().optional(),
  password: z.string()
    .min(8)
    .max(100)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/)
    .regex(/[^A-Za-z0-9]/)
    .optional(),
  role: UserRoleSchema.optional(),
  permissions: z.record(z.boolean()).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const LoginCredentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const AuthTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
  tokenType: z.string().default('Bearer'),
});

export const AuthUserSchema = z.object({
  id: z.number().int().positive(),
  email: z.string().email(),
  role: UserRoleSchema,
  permissions: z.record(z.boolean()),
});

export const JWTPayloadSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().email(),
  role: UserRoleSchema,
  permissions: z.record(z.boolean()),
  iat: z.number().int(),
  exp: z.number().int(),
});

export const RefreshTokenPayloadSchema = z.object({
  userId: z.number().int().positive(),
  tokenId: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});

// Type exports
export type UserRoleSchemaType = z.infer<typeof UserRoleSchema>;
export type UserSchemaType = z.infer<typeof UserSchema>;
export type UserInputSchemaType = z.infer<typeof UserInputSchema>;
export type UserUpdateSchemaType = z.infer<typeof UserUpdateSchema>;
export type LoginCredentialsSchemaType = z.infer<typeof LoginCredentialsSchema>;
export type AuthTokensSchemaType = z.infer<typeof AuthTokensSchema>;
export type AuthUserSchemaType = z.infer<typeof AuthUserSchema>;
export type JWTPayloadSchemaType = z.infer<typeof JWTPayloadSchema>;
export type RefreshTokenPayloadSchemaType = z.infer<typeof RefreshTokenPayloadSchema>;
