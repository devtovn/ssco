/**
 * Advertisement Service
 * Handles advertisement zone management, ad placements, performance tracking, and metrics
 */

import { Pool, PoolClient } from 'pg';

export interface AdZone {
  id: string;
  name: string;
  position: AdPosition;
  dimensions: AdDimensions;
  configuration: AdConfiguration;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdDimensions {
  width: number;
  height: number;
  unit: 'px' | '%' | 'rem';
}

export interface AdConfiguration {
  displayTiming?: {
    delayMs?: number;
    durationMs?: number;
    frequency?: 'once' | 'always' | 'session';
  };
  targeting?: {
    pages?: string[];
    categories?: string[];
    devices?: ('mobile' | 'tablet' | 'desktop')[];
  };
  styling?: {
    backgroundColor?: string;
    borderRadius?: string;
    padding?: string;
    margin?: string;
  };
}

export type AdPosition =
  | 'header'
  | 'footer'
  | 'sidebar'
  | 'in-content'
  | 'overlay'
  | 'floating';

export interface AdZoneConfig {
  name: string;
  position: AdPosition;
  dimensions: AdDimensions;
  configuration?: AdConfiguration;
}

export interface PlacementConfig {
  dimensions?: AdDimensions;
  configuration?: AdConfiguration;
  isActive?: boolean;
}

export interface Advertisement {
  id: string;
  zoneId: string;
  type: AdType;
  contentUrl?: string;
  targeting?: AdTargeting;
  startDate: Date;
  endDate?: Date;
  performanceData: AdPerformanceData;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AdType = 'google_ads' | 'static_banner' | 'html_embed';

export interface AdTargeting {
  categories?: string[];
  keywords?: string[];
  userSegments?: string[];
}

export interface AdPerformanceData {
  impressions: number;
  clicks: number;
  ctr: number; // Click-through rate
  lastUpdated: Date;
}

export interface AdEvent {
  type: 'impression' | 'click';
  timestamp: Date;
  metadata?: {
    userSession?: string;
    userAgent?: string;
    referrer?: string;
    page?: string;
  };
}

export interface AdMetrics {
  zoneId: string;
  zoneName: string;
  totalImpressions: number;
  totalClicks: number;
  ctr: number;
  averageImpressions: number;
  averageClicks: number;
  performanceByDate: DatePerformance[];
  performanceByAd: AdPerformanceDetail[];
}

export interface DatePerformance {
  date: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export interface AdPerformanceDetail {
  adId: string;
  adType: AdType;
  impressions: number;
  clicks: number;
  ctr: number;
}

export class AdvertisementService {
  constructor(private pool: Pool) {}

  /**
   * Create a new advertisement zone with position and size configuration
   */
  async createAdZone(config: AdZoneConfig): Promise<AdZone> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Validate position
      const validPositions: AdPosition[] = [
        'header',
        'footer',
        'sidebar',
        'in-content',
        'overlay',
        'floating',
      ];

      if (!validPositions.includes(config.position)) {
        throw new Error(
          `Invalid position: ${config.position}. Must be one of: ${validPositions.join(', ')}`
        );
      }

      // Validate dimensions
      if (config.dimensions.width <= 0 || config.dimensions.height <= 0) {
        throw new Error('Dimensions width and height must be positive numbers');
      }

      const validUnits = ['px', '%', 'rem'];
      if (!validUnits.includes(config.dimensions.unit)) {
        throw new Error(
          `Invalid dimension unit: ${config.dimensions.unit}. Must be one of: ${validUnits.join(', ')}`
        );
      }

      // Check if zone name already exists
      const nameCheck = await client.query(
        'SELECT id FROM ad_zones WHERE name = $1',
        [config.name]
      );

      if (nameCheck.rows.length > 0) {
        throw new Error(`Ad zone with name '${config.name}' already exists`);
      }

      // Insert ad zone
      const result = await client.query(
        `INSERT INTO ad_zones (name, position, dimensions, configuration, is_active)
         VALUES ($1, $2, $3, $4, true)
         RETURNING *`,
        [
          config.name,
          config.position,
          JSON.stringify(config.dimensions),
          JSON.stringify(config.configuration || {}),
        ]
      );

      await client.query('COMMIT');

      return this.mapRowToAdZone(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update advertisement placement with timing configuration
   */
  async updateAdPlacement(zoneId: string, config: PlacementConfig): Promise<AdZone> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if zone exists
      const existsCheck = await client.query(
        'SELECT * FROM ad_zones WHERE id = $1',
        [zoneId]
      );

      if (existsCheck.rows.length === 0) {
        throw new Error(`Ad zone with ID ${zoneId} not found`);
      }

      const existing = this.mapRowToAdZone(existsCheck.rows[0]);

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (config.dimensions !== undefined) {
        // Validate dimensions
        if (config.dimensions.width <= 0 || config.dimensions.height <= 0) {
          throw new Error('Dimensions width and height must be positive numbers');
        }

        const validUnits = ['px', '%', 'rem'];
        if (!validUnits.includes(config.dimensions.unit)) {
          throw new Error(
            `Invalid dimension unit: ${config.dimensions.unit}. Must be one of: ${validUnits.join(', ')}`
          );
        }

        updateFields.push(`dimensions = $${paramIndex++}`);
        values.push(JSON.stringify(config.dimensions));
      }

      if (config.configuration !== undefined) {
        // Merge with existing configuration
        const mergedConfig = {
          ...existing.configuration,
          ...config.configuration,
        };

        updateFields.push(`configuration = $${paramIndex++}`);
        values.push(JSON.stringify(mergedConfig));
      }

      if (config.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(config.isActive);
      }

      if (updateFields.length === 0) {
        // No updates provided
        await client.query('COMMIT');
        return existing;
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(zoneId);

      const result = await client.query(
        `UPDATE ad_zones 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      await client.query('COMMIT');

      return this.mapRowToAdZone(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Track advertisement performance (impressions, clicks)
   */
  async trackAdPerformance(adId: string, event: AdEvent): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if advertisement exists
      const adCheck = await client.query(
        'SELECT id, zone_id, performance_data FROM advertisements WHERE id = $1',
        [adId]
      );

      if (adCheck.rows.length === 0) {
        throw new Error(`Advertisement with ID ${adId} not found`);
      }

      const ad = adCheck.rows[0];
      const performanceData =
        typeof ad.performance_data === 'string'
          ? JSON.parse(ad.performance_data)
          : ad.performance_data || { impressions: 0, clicks: 0, ctr: 0 };

      // Update performance data based on event type
      if (event.type === 'impression') {
        performanceData.impressions = (performanceData.impressions || 0) + 1;
      } else if (event.type === 'click') {
        performanceData.clicks = (performanceData.clicks || 0) + 1;
      }

      // Calculate CTR (Click-Through Rate)
      performanceData.ctr =
        performanceData.impressions > 0
          ? (performanceData.clicks / performanceData.impressions) * 100
          : 0;

      performanceData.lastUpdated = new Date().toISOString();

      // Update advertisement performance data
      await client.query(
        `UPDATE advertisements 
         SET performance_data = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(performanceData), adId]
      );

      // Optionally, log the event to a separate tracking table for detailed analytics
      // This would be useful for time-series analysis and detailed reporting
      // For now, we're just updating the aggregated performance data

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get performance metrics for an ad zone with aggregation
   */
  async getPerformanceMetrics(zoneId: string, days: number = 30): Promise<AdMetrics> {
    // Check if zone exists
    const zoneCheck = await this.pool.query(
      'SELECT id, name FROM ad_zones WHERE id = $1',
      [zoneId]
    );

    if (zoneCheck.rows.length === 0) {
      throw new Error(`Ad zone with ID ${zoneId} not found`);
    }

    const zone = zoneCheck.rows[0];

    // Get all advertisements for this zone
    const adsResult = await this.pool.query(
      `SELECT id, type, performance_data, created_at
       FROM advertisements
       WHERE zone_id = $1
       ORDER BY created_at DESC`,
      [zoneId]
    );

    // Calculate total metrics
    let totalImpressions = 0;
    let totalClicks = 0;
    const performanceByAd: AdPerformanceDetail[] = [];

    for (const ad of adsResult.rows) {
      const perfData =
        typeof ad.performance_data === 'string'
          ? JSON.parse(ad.performance_data)
          : ad.performance_data || { impressions: 0, clicks: 0, ctr: 0 };

      const impressions = perfData.impressions || 0;
      const clicks = perfData.clicks || 0;

      totalImpressions += impressions;
      totalClicks += clicks;

      performanceByAd.push({
        adId: ad.id,
        adType: ad.type,
        impressions,
        clicks,
        ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      });
    }

    // Calculate overall CTR
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

    // Calculate averages
    const adCount = adsResult.rows.length || 1;
    const averageImpressions = totalImpressions / adCount;
    const averageClicks = totalClicks / adCount;

    // For performanceByDate, we would need a separate tracking table
    // For now, return empty array as we're storing aggregated data
    const performanceByDate: DatePerformance[] = [];

    return {
      zoneId: zone.id,
      zoneName: zone.name,
      totalImpressions,
      totalClicks,
      ctr,
      averageImpressions,
      averageClicks,
      performanceByDate,
      performanceByAd,
    };
  }

  /**
   * Delete an advertisement zone
   */
  async deleteAdZone(zoneId: string): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if zone exists
      const existsCheck = await client.query(
        'SELECT id FROM ad_zones WHERE id = $1',
        [zoneId]
      );

      if (existsCheck.rows.length === 0) {
        throw new Error(`Ad zone with ID ${zoneId} not found`);
      }

      // Check for active advertisements
      const adsCheck = await client.query(
        'SELECT COUNT(*) as count FROM advertisements WHERE zone_id = $1 AND is_active = true',
        [zoneId]
      );

      const activeAdsCount = parseInt(adsCheck.rows[0].count);

      if (activeAdsCount > 0) {
        throw new Error(
          `Cannot delete ad zone with ${activeAdsCount} active advertisements. Deactivate or delete advertisements first.`
        );
      }

      // Delete the ad zone (cascade will delete associated advertisements)
      await client.query('DELETE FROM ad_zones WHERE id = $1', [zoneId]);

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Create a new advertisement in a zone
   */
  async createAdvertisement(
    zoneId: string,
    type: AdType,
    contentUrl: string,
    startDate: Date,
    endDate?: Date,
    targeting?: AdTargeting
  ): Promise<Advertisement> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if zone exists
      const zoneCheck = await client.query(
        'SELECT id FROM ad_zones WHERE id = $1',
        [zoneId]
      );

      if (zoneCheck.rows.length === 0) {
        throw new Error(`Ad zone with ID ${zoneId} not found`);
      }

      // Validate ad type
      const validTypes: AdType[] = ['google_ads', 'static_banner', 'html_embed'];
      if (!validTypes.includes(type)) {
        throw new Error(
          `Invalid ad type: ${type}. Must be one of: ${validTypes.join(', ')}`
        );
      }

      // Validate dates
      if (endDate && endDate <= startDate) {
        throw new Error('End date must be after start date');
      }

      // Initialize performance data
      const performanceData: AdPerformanceData = {
        impressions: 0,
        clicks: 0,
        ctr: 0,
        lastUpdated: new Date(),
      };

      // Insert advertisement
      const result = await client.query(
        `INSERT INTO advertisements 
         (zone_id, type, content_url, targeting, start_date, end_date, performance_data, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, true)
         RETURNING *`,
        [
          zoneId,
          type,
          contentUrl,
          JSON.stringify(targeting || {}),
          startDate,
          endDate || null,
          JSON.stringify(performanceData),
        ]
      );

      await client.query('COMMIT');

      return this.mapRowToAdvertisement(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all ad zones with optional filtering
   */
  async getAdZones(filters?: { isActive?: boolean; position?: AdPosition }): Promise<AdZone[]> {
    let query = 'SELECT * FROM ad_zones WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.isActive !== undefined) {
      query += ` AND is_active = $${paramIndex++}`;
      values.push(filters.isActive);
    }

    if (filters?.position) {
      query += ` AND position = $${paramIndex++}`;
      values.push(filters.position);
    }

    query += ' ORDER BY created_at DESC';

    const result = await this.pool.query(query, values);

    return result.rows.map((row) => this.mapRowToAdZone(row));
  }

  /**
   * Get ad zone by ID
   */
  async getAdZoneById(zoneId: string): Promise<AdZone | null> {
    const result = await this.pool.query(
      'SELECT * FROM ad_zones WHERE id = $1',
      [zoneId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToAdZone(result.rows[0]);
  }

  /**
   * Get advertisements for a zone
   */
  async getAdvertisementsByZone(zoneId: string): Promise<Advertisement[]> {
    const result = await this.pool.query(
      'SELECT * FROM advertisements WHERE zone_id = $1 ORDER BY created_at DESC',
      [zoneId]
    );

    return result.rows.map((row) => this.mapRowToAdvertisement(row));
  }

  /**
   * Get active advertisements for a zone (within date range)
   */
  async getActiveAdvertisements(zoneId: string): Promise<Advertisement[]> {
    const result = await this.pool.query(
      `SELECT * FROM advertisements 
       WHERE zone_id = $1 
       AND is_active = true
       AND start_date <= NOW()
       AND (end_date IS NULL OR end_date >= NOW())
       ORDER BY created_at DESC`,
      [zoneId]
    );

    return result.rows.map((row) => this.mapRowToAdvertisement(row));
  }

  /**
   * Update advertisement
   */
  async updateAdvertisement(
    adId: string,
    updates: {
      contentUrl?: string;
      targeting?: AdTargeting;
      startDate?: Date;
      endDate?: Date;
      isActive?: boolean;
    }
  ): Promise<Advertisement> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Check if advertisement exists
      const existsCheck = await client.query(
        'SELECT * FROM advertisements WHERE id = $1',
        [adId]
      );

      if (existsCheck.rows.length === 0) {
        throw new Error(`Advertisement with ID ${adId} not found`);
      }

      // Build dynamic update query
      const updateFields: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.contentUrl !== undefined) {
        updateFields.push(`content_url = $${paramIndex++}`);
        values.push(updates.contentUrl);
      }

      if (updates.targeting !== undefined) {
        updateFields.push(`targeting = $${paramIndex++}`);
        values.push(JSON.stringify(updates.targeting));
      }

      if (updates.startDate !== undefined) {
        updateFields.push(`start_date = $${paramIndex++}`);
        values.push(updates.startDate);
      }

      if (updates.endDate !== undefined) {
        updateFields.push(`end_date = $${paramIndex++}`);
        values.push(updates.endDate);
      }

      if (updates.isActive !== undefined) {
        updateFields.push(`is_active = $${paramIndex++}`);
        values.push(updates.isActive);
      }

      if (updateFields.length === 0) {
        await client.query('COMMIT');
        return this.mapRowToAdvertisement(existsCheck.rows[0]);
      }

      updateFields.push(`updated_at = NOW()`);
      values.push(adId);

      const result = await client.query(
        `UPDATE advertisements 
         SET ${updateFields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      await client.query('COMMIT');

      return this.mapRowToAdvertisement(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete an advertisement
   */
  async deleteAdvertisement(adId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM advertisements WHERE id = $1',
      [adId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Advertisement with ID ${adId} not found`);
    }
  }

  // Private helper methods

  /**
   * Map database row to AdZone object
   */
  private mapRowToAdZone(row: any): AdZone {
    return {
      id: row.id,
      name: row.name,
      position: row.position,
      dimensions:
        typeof row.dimensions === 'string'
          ? JSON.parse(row.dimensions)
          : row.dimensions,
      configuration:
        typeof row.configuration === 'string'
          ? JSON.parse(row.configuration)
          : row.configuration || {},
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to Advertisement object
   */
  private mapRowToAdvertisement(row: any): Advertisement {
    return {
      id: row.id,
      zoneId: row.zone_id,
      type: row.type,
      contentUrl: row.content_url,
      targeting:
        typeof row.targeting === 'string'
          ? JSON.parse(row.targeting)
          : row.targeting || {},
      startDate: row.start_date,
      endDate: row.end_date,
      performanceData:
        typeof row.performance_data === 'string'
          ? JSON.parse(row.performance_data)
          : row.performance_data || { impressions: 0, clicks: 0, ctr: 0 },
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
