import { Pool, PoolClient } from 'pg';
import * as bcrypt from 'bcrypt';

export interface WebsiteConfig {
  id: string;
  logoUrl?: string;
  siteName: string;
  tagline?: string;
  theme: ThemeConfig;
  branding: Record<string, any>;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
}

export interface WebsiteConfigUpdate {
  logoUrl?: string;
  siteName?: string;
  tagline?: string;
  theme?: Partial<ThemeConfig>;
  branding?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface ReviewerInput {
  email: string;
  password: string;
  permissions?: Record<string, boolean>;
}

export interface ReviewerUpdate {
  email?: string;
  password?: string;
  permissions?: Record<string, boolean>;
  isActive?: boolean;
}

export interface Reviewer {
  id: string;
  email: string;
  role: 'Reviewer';
  permissions: Record<string, boolean>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
}

export interface ReviewerFilters {
  isActive?: boolean;
  email?: string;
}

export class AdminService {
  private readonly SALT_ROUNDS = 10;

  constructor(private pool: Pool) {}

  /**
   * Get website configuration
   */
  async getWebsiteConfig(): Promise<WebsiteConfig> {
    const result = await this.pool.query(
      'SELECT * FROM website_config WHERE id = 1'
    );

    if (result.rows.length === 0) {
      throw new Error('Website configuration not found');
    }

    return this.mapRowToWebsiteConfig(result.rows[0]);
  }

  /**
   * Update website configuration (logo, theme, branding)
   */
  async updateWebsiteConfig(updates: WebsiteConfigUpdate): Promise<WebsiteConfig> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get existing config
      const existingResult = await client.query(
        'SELECT * FROM website_config WHERE id = 1'
      );

      if (existingResult.rows.length === 0) {
        throw new Error('Website configuration not found');
      }

      const existing = this.mapRowToWebsiteConfig(existingResult.rows[0]);

      // Merge updates with existing config data
      const updatedConfigData: any = {
        logo: updates.logoUrl !== undefined ? updates.logoUrl : existing.logoUrl,
        siteName: updates.siteName !== undefined ? updates.siteName : existing.siteName,
        tagline: updates.tagline !== undefined ? updates.tagline : existing.tagline,
        primaryColor: updates.theme?.primaryColor !== undefined ? updates.theme.primaryColor : existing.theme.primaryColor,
        secondaryColor: updates.theme?.secondaryColor !== undefined ? updates.theme.secondaryColor : existing.theme.secondaryColor,
        font: updates.theme?.fontFamily !== undefined ? updates.theme.fontFamily : existing.theme.fontFamily,
        metadata: updates.metadata !== undefined ? { ...existing.metadata, ...updates.metadata } : existing.metadata,
      };

      // Add branding if provided
      if (updates.branding !== undefined) {
        updatedConfigData.branding = updates.branding;
      } else if (existing.branding && Object.keys(existing.branding).length > 0) {
        updatedConfigData.branding = existing.branding;
      }

      const result = await client.query(
        `UPDATE website_config 
         SET config_data = $1, updated_at = NOW()
         WHERE id = 1
         RETURNING *`,
        [JSON.stringify(updatedConfigData)]
      );

      await client.query('COMMIT');

      return this.mapRowToWebsiteConfig(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new Reviewer account with password hashing
   */
  async createReviewer(input: ReviewerInput): Promise<Reviewer> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if email already exists
      const emailCheck = await client.query(
        'SELECT id FROM users WHERE email = $1',
        [input.email]
      );

      if (emailCheck.rows.length > 0) {
        throw new Error(`User with email '${input.email}' already exists`);
      }

      // Validate email format
      if (!this.isValidEmail(input.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password strength
      if (!this.isValidPassword(input.password)) {
        throw new Error(
          'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number'
        );
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, this.SALT_ROUNDS);

      // Set default permissions if not provided
      const permissions = input.permissions || {
        canCreateArticles: true,
        canEditArticles: true,
        canApproveArticles: true,
        canRejectArticles: true,
        canViewAnalytics: false,
      };

      // Insert reviewer
      const result = await client.query(
        `INSERT INTO users (email, password_hash, role, permissions, is_active)
         VALUES ($1, $2, 'Reviewer', $3, true)
         RETURNING *`,
        [input.email, passwordHash, JSON.stringify(permissions)]
      );

      await client.query('COMMIT');

      return this.mapRowToReviewer(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update Reviewer account with permission updates
   */
  async updateReviewer(reviewerId: string, updates: ReviewerUpdate): Promise<Reviewer> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if reviewer exists
      const existsCheck = await client.query(
        "SELECT * FROM users WHERE id = $1 AND role = 'Reviewer'",
        [reviewerId]
      );

      if (existsCheck.rows.length === 0) {
        throw new Error(`Reviewer with ID ${reviewerId} not found`);
      }

      // If email is being updated, check for conflicts
      if (updates.email) {
        if (!this.isValidEmail(updates.email)) {
          throw new Error('Invalid email format');
        }

        const emailCheck = await client.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [updates.email, reviewerId]
        );

        if (emailCheck.rows.length > 0) {
          throw new Error(`User with email '${updates.email}' already exists`);
        }
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.email !== undefined) {
        updateFields.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }

      if (updates.password !== undefined) {
        // Validate password strength
        if (!this.isValidPassword(updates.password)) {
          throw new Error(
            'Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one number'
          );
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(updates.password, this.SALT_ROUNDS);
        updateFields.push(`password_hash = $${paramIndex++}`);
        values.push(passwordHash);
      }

      if (updates.permissions !== undefined) {
        updateFields.push(`permissions = $${paramIndex++}`);
        values.push(JSON.stringify(updates.permissions));
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      if (updateFields.length === 0) {
        // No updates provided
        await client.query('COMMIT');
        return this.mapRowToReviewer(existsCheck.rows[0]);
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(reviewerId);

      const result = await client.query(
        `UPDATE users 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      await client.query('COMMIT');

      return this.mapRowToReviewer(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete Reviewer account
   */
  async deleteReviewer(reviewerId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if reviewer exists
      const existsCheck = await client.query(
        "SELECT id FROM users WHERE id = $1 AND role = 'Reviewer'",
        [reviewerId]
      );

      if (existsCheck.rows.length === 0) {
        throw new Error(`Reviewer with ID ${reviewerId} not found`);
      }

      // Check if reviewer has associated articles
      const articlesCheck = await client.query(
        'SELECT COUNT(*) as count FROM articles WHERE reviewer_id = $1',
        [reviewerId]
      );

      const articleCount = parseInt(articlesCheck.rows[0].count);

      if (articleCount > 0) {
        throw new Error(
          `Cannot delete reviewer with ${articleCount} associated articles. Please reassign or delete articles first.`
        );
      }

      // Delete the reviewer
      await client.query('DELETE FROM users WHERE id = $1', [reviewerId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all Reviewers with optional filtering
   */
  async getReviewers(filters?: ReviewerFilters): Promise<Reviewer[]> {
    let query = "SELECT * FROM users WHERE role = 'Reviewer'";
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      values.push(filters.isActive);
    }

    if (filters?.email) {
      query += ` AND email ILIKE $${paramIndex++}`;
      values.push(`%${filters.email}%`);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);

    return result.rows.map((row) => this.mapRowToReviewer(row));
  }

  /**
   * Get Reviewer by ID
   */
  async getReviewerById(reviewerId: string): Promise<Reviewer | null> {
    const result = await this.pool.query(
      "SELECT * FROM users WHERE id = $1 AND role = 'Reviewer'",
      [reviewerId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToReviewer(result.rows[0]);
  }

  // Private helper methods

  /**
   * Map database row to WebsiteConfig object
   */
  private mapRowToWebsiteConfig(row: any): WebsiteConfig {
    const configData = typeof row.config_data === 'string' 
      ? JSON.parse(row.config_data) 
      : row.config_data;

    return {
      id: row.id.toString(),
      logoUrl: configData.logo || '',
      siteName: configData.siteName || 'Price Comparison',
      tagline: configData.tagline || '',
      theme: {
        primaryColor: configData.primaryColor || '#3B82F6',
        secondaryColor: configData.secondaryColor || '#10B981',
        fontFamily: configData.font || 'Inter',
      },
      branding: configData.branding || {},
      metadata: configData.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to Reviewer object
   */
  private mapRowToReviewer(row: any): Reviewer {
    return {
      id: row.id,
      email: row.email,
      role: 'Reviewer',
      permissions:
        typeof row.permissions === 'string' ? JSON.parse(row.permissions) : row.permissions,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastLogin: row.last_login,
    };
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate password strength
   * Must be at least 8 characters long and contain:
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   */
  private isValidPassword(password: string): boolean {
    if (password.length < 8) {
      return false;
    }

    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return hasUppercase && hasLowercase && hasNumber;
  }
}
