/**
 * User domain types
 */

export type UserRole = 'Administrator' | 'Reviewer';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

export interface UserInput {
  email: string;
  password: string;
  role: UserRole;
  permissions?: Record<string, boolean>;
}

export interface UserUpdate {
  email?: string;
  password?: string;
  role?: UserRole;
  permissions?: Record<string, boolean>;
  isActive?: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface AuthUser {
  id: number;
  email: string;
  role: UserRole;
  permissions: Record<string, boolean>;
}

export interface JWTPayload {
  userId: number;
  email: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  iat: number;
  exp: number;
}

export interface RefreshTokenPayload {
  userId: number;
  tokenId: string;
  iat: number;
  exp: number;
}
