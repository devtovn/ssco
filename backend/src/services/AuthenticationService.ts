import { Pool, PoolClient } from 'pg';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { redisClient } from '../config/redis';

export interface User {
  id: string;
  email: string;
  role: 'Administrator' | 'Reviewer';
  permissions: Record<string, boolean>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  permissions: Record<string, boolean>;
}

export class AuthenticationService {
  private readonly SALT_ROUNDS = 10;
  private readonly ACCESS_TOKEN_EXPIRY = '24h';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private pool: Pool,
    private jwtSecret: string
  ) {
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is required for AuthenticationService');
    }
  }

  /**
   * Authenticate user with email and password
   */
  async login(credentials: LoginCredentials): Promise<{ user: User; tokens: AuthTokens }> {
    const { email, password } = credentials;

    // Find user by email
    const result = await this.pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      throw new Error('Invalid email or password');
    }

    const userRow = result.rows[0];

    // Check if user is active
    if (!userRow.is_active) {
      throw new Error('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, userRow.password_hash);
    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login timestamp
    await this.pool.query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [userRow.id]
    );

    // Map database row to User object
    const user = this.mapRowToUser(userRow);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    return { user, tokens };
  }

  /**
   * Logout user by invalidating refresh token
   */
  async logout(refreshToken: string): Promise<void> {
    try {
      // Verify and decode refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as TokenPayload;
      
      // Remove refresh token from Redis
      const redisKey = `refresh_token:${decoded.userId}:${refreshToken}`;
      await redisClient.del(redisKey);
    } catch (error) {
      // Token is invalid or expired, but we still consider logout successful
      console.error('Error during logout:', error);
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtSecret) as TokenPayload;

      // Check if refresh token exists in Redis
      const redisKey = `refresh_token:${decoded.userId}:${refreshToken}`;
      const exists = await redisClient.exists(redisKey);

      if (!exists) {
        throw new Error('Refresh token has been revoked');
      }

      // Get user from database
      const result = await this.pool.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [decoded.userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      const user = this.mapRowToUser(result.rows[0]);

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Remove old refresh token from Redis
      await redisClient.del(redisKey);

      return tokens;
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Verify access token and return user payload
   */
  verifyAccessToken(token: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as TokenPayload;
      return decoded;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Access token has expired');
      }
      throw new Error('Invalid access token');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    const result = await this.pool.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToUser(result.rows[0]);
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
    };

    // Generate access token
    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    // Generate refresh token
    const refreshToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    // Store refresh token in Redis with TTL
    const redisKey = `refresh_token:${user.id}:${refreshToken}`;
    await redisClient.setEx(redisKey, this.REFRESH_TOKEN_TTL, '1');

    // Calculate expiry time in seconds
    const expiresIn = 24 * 60 * 60; // 24 hours

    return {
      accessToken,
      refreshToken,
      expiresIn,
    };
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      permissions: row.permissions || {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    };
  }
}
