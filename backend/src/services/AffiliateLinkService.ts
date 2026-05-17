import { Pool } from 'pg';

export interface AffiliateConfig {
  id: string;
  platformId: string;
  platformName: string;
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  isEnabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateLinkFormat {
  type: 'query_param' | 'path_param' | 'subdomain' | 'custom';
  parameterName?: string;
  template: string;
  exampleUrl: string;
}

export interface AffiliateConfigInput {
  platformId: string;
  platformName: string;
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  priority?: number;
}

export interface AffiliateConfigUpdate {
  platformName?: string;
  referCode?: string;
  linkTemplate?: string;
  linkFormat?: AffiliateLinkFormat;
  isEnabled?: boolean;
  priority?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class AffiliateLinkService {
  constructor(private pool: Pool) {}

  /**
   * Create new affiliate configuration
   */
  async createAffiliateConfig(input: AffiliateConfigInput): Promise<AffiliateConfig> {
    // Validate link format
    const validation = await this.validateAffiliateLinkFormat({
      ...input,
      id: '',
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!validation.isValid) {
      throw new Error(`Invalid affiliate configuration: ${validation.errors.join(', ')}`);
    }

    const result = await this.pool.query(
      `INSERT INTO affiliate_configs 
       (platform_id, platform_name, refer_code, link_template, link_format, priority, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING *`,
      [
        input.platformId,
        input.platformName,
        input.referCode,
        input.linkTemplate,
        JSON.stringify(input.linkFormat),
        input.priority || 0,
      ]
    );

    return this.mapRowToConfig(result.rows[0]);
  }

  /**
   * Update existing affiliate configuration
   */
  async updateAffiliateConfig(
    platformId: string,
    updates: AffiliateConfigUpdate
  ): Promise<AffiliateConfig> {
    // Get existing config
    const existing = await this.getAffiliateConfigByPlatform(platformId);
    if (!existing) {
      throw new Error(`Affiliate config not found for platform: ${platformId}`);
    }

    // Merge updates with existing config
    const merged = {
      ...existing,
      ...updates,
    };

    // Validate if link format is being updated
    if (updates.linkFormat || updates.linkTemplate) {
      const validation = await this.validateAffiliateLinkFormat(merged);
      if (!validation.isValid) {
        throw new Error(`Invalid affiliate configuration: ${validation.errors.join(', ')}`);
      }
    }

    // Build dynamic update query
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.platformName !== undefined) {
      updateFields.push(`platform_name = $${paramIndex++}`);
      values.push(updates.platformName);
    }
    if (updates.referCode !== undefined) {
      updateFields.push(`refer_code = $${paramIndex++}`);
      values.push(updates.referCode);
    }
    if (updates.linkTemplate !== undefined) {
      updateFields.push(`link_template = $${paramIndex++}`);
      values.push(updates.linkTemplate);
    }
    if (updates.linkFormat !== undefined) {
      updateFields.push(`link_format = $${paramIndex++}`);
      values.push(JSON.stringify(updates.linkFormat));
    }
    if (updates.isEnabled !== undefined) {
      updateFields.push(`is_enabled = $${paramIndex++}`);
      values.push(updates.isEnabled);
    }
    if (updates.priority !== undefined) {
      updateFields.push(`priority = $${paramIndex++}`);
      values.push(updates.priority);
    }

    updateFields.push(`updated_at = NOW()`);
    values.push(platformId);

    const result = await this.pool.query(
      `UPDATE affiliate_configs 
       SET ${updateFields.join(', ')}
       WHERE platform_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error(`Failed to update affiliate config for platform: ${platformId}`);
    }

    return this.mapRowToConfig(result.rows[0]);
  }

  /**
   * Delete affiliate configuration
   */
  async deleteAffiliateConfig(platformId: string): Promise<void> {
    const result = await this.pool.query(
      'DELETE FROM affiliate_configs WHERE platform_id = $1',
      [platformId]
    );

    if (result.rowCount === 0) {
      throw new Error(`Affiliate config not found for platform: ${platformId}`);
    }
  }

  /**
   * Get all affiliate configurations with optional filtering
   */
  async getAffiliateConfigs(filters?: {
    isEnabled?: boolean;
    platformIds?: string[];
  }): Promise<AffiliateConfig[]> {
    let query = 'SELECT * FROM affiliate_configs WHERE 1=1';
    const values: any[] = [];
    let paramIndex = 1;

    if (filters?.isEnabled !== undefined) {
      query += ` AND is_enabled = $${paramIndex++}`;
      values.push(filters.isEnabled);
    }

    if (filters?.platformIds && filters.platformIds.length > 0) {
      query += ` AND platform_id = ANY($${paramIndex++})`;
      values.push(filters.platformIds);
    }

    query += ' ORDER BY priority ASC, platform_name ASC';

    const result = await this.pool.query(query, values);
    return result.rows.map((row) => this.mapRowToConfig(row));
  }

  /**
   * Get affiliate configuration by platform ID
   */
  async getAffiliateConfigByPlatform(platformId: string): Promise<AffiliateConfig | null> {
    const result = await this.pool.query(
      'SELECT * FROM affiliate_configs WHERE platform_id = $1',
      [platformId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToConfig(result.rows[0]);
  }

  /**
   * Validate affiliate link format
   */
  async validateAffiliateLinkFormat(config: AffiliateConfig): Promise<ValidationResult> {
    const errors: string[] = [];

    // Validate platform ID
    if (!config.platformId || config.platformId.trim().length === 0) {
      errors.push('Platform ID is required');
    }

    // Validate platform name
    if (!config.platformName || config.platformName.trim().length === 0) {
      errors.push('Platform name is required');
    }

    // Validate refer code
    if (!config.referCode || config.referCode.trim().length === 0) {
      errors.push('Refer code is required');
    }

    // Validate link template
    if (!config.linkTemplate || config.linkTemplate.trim().length === 0) {
      errors.push('Link template is required');
    }

    // Validate link format
    if (!config.linkFormat) {
      errors.push('Link format is required');
    } else {
      // Validate format type
      const validTypes = ['query_param', 'path_param', 'subdomain', 'custom'];
      if (!validTypes.includes(config.linkFormat.type)) {
        errors.push(`Invalid link format type: ${config.linkFormat.type}`);
      }

      // Validate parameter name for query_param type
      if (config.linkFormat.type === 'query_param' && !config.linkFormat.parameterName) {
        errors.push('Parameter name is required for query_param format');
      }

      // Validate template
      if (!config.linkFormat.template || config.linkFormat.template.trim().length === 0) {
        errors.push('Link format template is required');
      }

      // Check if template contains required placeholders
      const template = config.linkFormat.template;
      if (!template.includes('{refer_code}') && !template.includes('{referCode}')) {
        errors.push('Link format template must contain {refer_code} or {referCode} placeholder');
      }
    }

    // Validate priority
    if (config.priority !== undefined && config.priority < 0) {
      errors.push('Priority must be non-negative');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Map database row to AffiliateConfig object
   */
  private mapRowToConfig(row: any): AffiliateConfig {
    return {
      id: row.id,
      platformId: row.platform_id,
      platformName: row.platform_name,
      referCode: row.refer_code,
      linkTemplate: row.link_template,
      linkFormat: typeof row.link_format === 'string' 
        ? JSON.parse(row.link_format) 
        : row.link_format,
      isEnabled: row.is_enabled,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}


  /**
   * Generate affiliate link from product URL and platform ID
   */
  async generateAffiliateLink(
    productUrl: string,
    platformId: string,
    campaignId?: string
  ): Promise<string> {
    // Get affiliate config for platform
    const config = await this.getAffiliateConfigByPlatform(platformId);

    // Fallback to direct link if config not found or disabled
    if (!config || !config.isEnabled) {
      console.warn(`Affiliate config not found or disabled for platform: ${platformId}`);
      return productUrl;
    }

    try {
      // Parse product URL
      const url = new URL(productUrl);
      const baseUrl = `${url.protocol}//${url.host}`;
      const productPath = url.pathname + url.search;
      const productId = this.extractProductId(productUrl);

      // Get refer code (campaign-specific or default)
      let referCode = config.referCode;
      if (campaignId) {
        const campaign = await this.getActiveCampaign(config.id, campaignId);
        if (campaign) {
          referCode = campaign.referCode;
        }
      }

      // Generate link based on format type
      let affiliateLink: string;

      switch (config.linkFormat.type) {
        case 'query_param':
          affiliateLink = this.generateQueryParamLink(
            productUrl,
            config.linkFormat,
            referCode,
            productId
          );
          break;

        case 'path_param':
          affiliateLink = this.generatePathParamLink(
            baseUrl,
            productPath,
            config.linkFormat,
            referCode,
            productId
          );
          break;

        case 'subdomain':
          affiliateLink = this.generateSubdomainLink(
            url,
            config.linkFormat,
            referCode,
            productId
          );
          break;

        case 'custom':
          affiliateLink = this.generateCustomLink(
            productUrl,
            config.linkFormat,
            referCode,
            productId,
            campaignId
          );
          break;

        default:
          console.warn(`Unknown link format type: ${config.linkFormat.type}`);
          return productUrl;
      }

      return affiliateLink;
    } catch (error) {
      console.error('Error generating affiliate link:', error);
      return productUrl; // Fallback to direct link on error
    }
  }

  /**
   * Generate query parameter format link
   * Example: https://tiki.vn/product.html?spid=123&aff_sid=CODE
   */
  private generateQueryParamLink(
    productUrl: string,
    format: AffiliateLinkFormat,
    referCode: string,
    productId?: string
  ): string {
    const url = new URL(productUrl);
    
    // Add affiliate parameter
    if (format.parameterName) {
      url.searchParams.set(format.parameterName, referCode);
    }

    // Add product ID if needed and available
    if (format.template.includes('{product_id}') && productId) {
      url.searchParams.set('spid', productId);
    }

    return url.toString();
  }

  /**
   * Generate path parameter format link
   * Example: https://lazada.vn/r/CODE/product-name-i123.html
   */
  private generatePathParamLink(
    baseUrl: string,
    productPath: string,
    format: AffiliateLinkFormat,
    referCode: string,
    productId?: string
  ): string {
    let link = format.template
      .replace('{base_url}', baseUrl)
      .replace('{refer_code}', referCode)
      .replace('{referCode}', referCode)
      .replace('{product_path}', productPath.startsWith('/') ? productPath.substring(1) : productPath);

    if (productId) {
      link = link.replace('{product_id}', productId);
    }

    return link;
  }

  /**
   * Generate subdomain format link
   * Example: https://CODE.shopee.vn/product-name-i.123.456
   */
  private generateSubdomainLink(
    url: URL,
    format: AffiliateLinkFormat,
    referCode: string,
    productId?: string
  ): string {
    const domain = url.hostname;
    const productPath = url.pathname + url.search;

    let link = format.template
      .replace('{refer_code}', referCode)
      .replace('{referCode}', referCode)
      .replace('{domain}', domain)
      .replace('{product_path}', productPath.startsWith('/') ? productPath.substring(1) : productPath);

    if (productId) {
      link = link.replace('{product_id}', productId);
    }

    return link;
  }

  /**
   * Generate custom format link
   * Example: https://sendo.vn/product.html?ref=CODE&campaign=CAMP&pid=123
   */
  private generateCustomLink(
    productUrl: string,
    format: AffiliateLinkFormat,
    referCode: string,
    productId?: string,
    campaignId?: string
  ): string {
    const url = new URL(productUrl);
    const baseUrl = `${url.protocol}//${url.host}`;
    const productPath = url.pathname + url.search;

    let link = format.template
      .replace('{base_url}', baseUrl)
      .replace('{refer_code}', referCode)
      .replace('{referCode}', referCode)
      .replace('{product_path}', productPath.startsWith('/') ? productPath.substring(1) : productPath)
      .replace('{product_url}', productUrl);

    if (productId) {
      link = link.replace('{product_id}', productId);
    }

    if (campaignId) {
      link = link.replace('{campaign_id}', campaignId);
    }

    return link;
  }

  /**
   * Extract product ID from URL
   */
  private extractProductId(productUrl: string): string | undefined {
    try {
      const url = new URL(productUrl);
      
      // Try to extract from query parameters
      const spid = url.searchParams.get('spid');
      if (spid) return spid;

      const pid = url.searchParams.get('pid');
      if (pid) return pid;

      const id = url.searchParams.get('id');
      if (id) return id;

      // Try to extract from path (common patterns)
      // Pattern: /product-name-i123456.html or /product-name-i.123.456
      const pathMatch = url.pathname.match(/[-_]i\.?(\d+)/);
      if (pathMatch) return pathMatch[1];

      // Pattern: /products/123456
      const productMatch = url.pathname.match(/\/products?\/(\d+)/);
      if (productMatch) return productMatch[1];

      return undefined;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Get active campaign by ID
   */
  private async getActiveCampaign(
    configId: string,
    campaignId: string
  ): Promise<{ referCode: string } | null> {
    const result = await this.pool.query(
      `SELECT refer_code FROM affiliate_campaigns 
       WHERE affiliate_config_id = $1 
       AND campaign_id = $2 
       AND is_active = true
       AND (end_date IS NULL OR end_date > NOW())`,
      [configId, campaignId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return {
      referCode: result.rows[0].refer_code,
    };
  }
}


export interface ClickMetadata {
  userSession: string;
  userAgent: string;
  referrer?: string;
  productId: string;
  campaignId?: string;
}

export interface AffiliatePerformance {
  platformId: string;
  platformName: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  estimatedRevenue: number;
  clicksByDate: ClickData[];
  topProducts: ProductPerformance[];
}

export interface ClickData {
  date: string;
  clicks: number;
  conversions: number;
}

export interface ProductPerformance {
  productId: string;
  productName?: string;
  clicks: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export class AffiliateLinkService {
  // ... existing code ...

  /**
   * Track affiliate link click
   */
  async trackAffiliateLinkClick(
    platformId: string,
    generatedLink: string,
    metadata: ClickMetadata
  ): Promise<string> {
    // Get affiliate config
    const config = await this.getAffiliateConfigByPlatform(platformId);
    if (!config) {
      throw new Error(`Affiliate config not found for platform: ${platformId}`);
    }

    // Get campaign ID if provided
    let campaignDbId: string | null = null;
    if (metadata.campaignId) {
      const campaign = await this.getActiveCampaign(config.id, metadata.campaignId);
      if (campaign) {
        const campaignResult = await this.pool.query(
          'SELECT id FROM affiliate_campaigns WHERE affiliate_config_id = $1 AND campaign_id = $2',
          [config.id, metadata.campaignId]
        );
        if (campaignResult.rows.length > 0) {
          campaignDbId = campaignResult.rows[0].id;
        }
      }
    }

    // Insert click record
    const result = await this.pool.query(
      `INSERT INTO affiliate_link_clicks 
       (affiliate_config_id, campaign_id, product_id, generated_link, 
        user_session, user_agent, referrer, clicked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
       RETURNING id`,
      [
        config.id,
        campaignDbId,
        metadata.productId,
        generatedLink,
        metadata.userSession,
        metadata.userAgent,
        metadata.referrer || null,
      ]
    );

    return result.rows[0].id;
  }

  /**
   * Record affiliate conversion
   */
  async recordConversion(
    clickId: string,
    conversionValue: number
  ): Promise<void> {
    await this.pool.query(
      `UPDATE affiliate_link_clicks 
       SET is_conversion = true, 
           conversion_value = $1,
           conversion_at = NOW()
       WHERE id = $2`,
      [conversionValue, clickId]
    );
  }

  /**
   * Get affiliate performance metrics
   */
  async getAffiliatePerformance(
    platformId: string,
    dateRange: DateRange
  ): Promise<AffiliatePerformance> {
    // Get affiliate config
    const config = await this.getAffiliateConfigByPlatform(platformId);
    if (!config) {
      throw new Error(`Affiliate config not found for platform: ${platformId}`);
    }

    // Get total clicks and conversions
    const totalsResult = await this.pool.query(
      `SELECT 
         COUNT(*) as total_clicks,
         COUNT(*) FILTER (WHERE is_conversion = true) as total_conversions,
         COALESCE(SUM(conversion_value), 0) as total_revenue
       FROM affiliate_link_clicks
       WHERE affiliate_config_id = $1
       AND clicked_at >= $2
       AND clicked_at <= $3`,
      [config.id, dateRange.startDate, dateRange.endDate]
    );

    const totals = totalsResult.rows[0];
    const totalClicks = parseInt(totals.total_clicks);
    const totalConversions = parseInt(totals.total_conversions);
    const estimatedRevenue = parseFloat(totals.total_revenue);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Get clicks by date
    const clicksByDateResult = await this.pool.query(
      `SELECT 
         DATE(clicked_at) as date,
         COUNT(*) as clicks,
         COUNT(*) FILTER (WHERE is_conversion = true) as conversions
       FROM affiliate_link_clicks
       WHERE affiliate_config_id = $1
       AND clicked_at >= $2
       AND clicked_at <= $3
       GROUP BY DATE(clicked_at)
       ORDER BY date ASC`,
      [config.id, dateRange.startDate, dateRange.endDate]
    );

    const clicksByDate: ClickData[] = clicksByDateResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      clicks: parseInt(row.clicks),
      conversions: parseInt(row.conversions),
    }));

    // Get top products by performance
    const topProductsResult = await this.pool.query(
      `SELECT 
         product_id,
         COUNT(*) as clicks,
         COUNT(*) FILTER (WHERE is_conversion = true) as conversions,
         COALESCE(SUM(conversion_value), 0) as revenue
       FROM affiliate_link_clicks
       WHERE affiliate_config_id = $1
       AND clicked_at >= $2
       AND clicked_at <= $3
       AND product_id IS NOT NULL
       GROUP BY product_id
       ORDER BY clicks DESC
       LIMIT 10`,
      [config.id, dateRange.startDate, dateRange.endDate]
    );

    const topProducts: ProductPerformance[] = topProductsResult.rows.map((row) => {
      const clicks = parseInt(row.clicks);
      const conversions = parseInt(row.conversions);
      return {
        productId: row.product_id,
        clicks,
        conversions,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        revenue: parseFloat(row.revenue),
      };
    });

    return {
      platformId: config.platformId,
      platformName: config.platformName,
      totalClicks,
      totalConversions,
      conversionRate,
      estimatedRevenue,
      clicksByDate,
      topProducts,
    };
  }

  /**
   * Get campaign performance
   */
  async getCampaignPerformance(
    platformId: string,
    campaignId: string,
    dateRange: DateRange
  ): Promise<AffiliatePerformance> {
    // Get affiliate config
    const config = await this.getAffiliateConfigByPlatform(platformId);
    if (!config) {
      throw new Error(`Affiliate config not found for platform: ${platformId}`);
    }

    // Get campaign
    const campaignResult = await this.pool.query(
      `SELECT id, campaign_name FROM affiliate_campaigns 
       WHERE affiliate_config_id = $1 AND campaign_id = $2`,
      [config.id, campaignId]
    );

    if (campaignResult.rows.length === 0) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    const campaignDbId = campaignResult.rows[0].id;
    const campaignName = campaignResult.rows[0].campaign_name;

    // Get campaign metrics
    const totalsResult = await this.pool.query(
      `SELECT 
         COUNT(*) as total_clicks,
         COUNT(*) FILTER (WHERE is_conversion = true) as total_conversions,
         COALESCE(SUM(conversion_value), 0) as total_revenue
       FROM affiliate_link_clicks
       WHERE campaign_id = $1
       AND clicked_at >= $2
       AND clicked_at <= $3`,
      [campaignDbId, dateRange.startDate, dateRange.endDate]
    );

    const totals = totalsResult.rows[0];
    const totalClicks = parseInt(totals.total_clicks);
    const totalConversions = parseInt(totals.total_conversions);
    const estimatedRevenue = parseFloat(totals.total_revenue);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    // Get clicks by date
    const clicksByDateResult = await this.pool.query(
      `SELECT 
         DATE(clicked_at) as date,
         COUNT(*) as clicks,
         COUNT(*) FILTER (WHERE is_conversion = true) as conversions
       FROM affiliate_link_clicks
       WHERE campaign_id = $1
       AND clicked_at >= $2
       AND clicked_at <= $3
       GROUP BY DATE(clicked_at)
       ORDER BY date ASC`,
      [campaignDbId, dateRange.startDate, dateRange.endDate]
    );

    const clicksByDate: ClickData[] = clicksByDateResult.rows.map((row) => ({
      date: row.date.toISOString().split('T')[0],
      clicks: parseInt(row.clicks),
      conversions: parseInt(row.conversions),
    }));

    // Get top products
    const topProductsResult = await this.pool.query(
      `SELECT 
         product_id,
         COUNT(*) as clicks,
         COUNT(*) FILTER (WHERE is_conversion = true) as conversions,
         COALESCE(SUM(conversion_value), 0) as revenue
       FROM affiliate_link_clicks
       WHERE campaign_id = $1
       AND clicked_at >= $2
       AND clicked_at <= $3
       AND product_id IS NOT NULL
       GROUP BY product_id
       ORDER BY clicks DESC
       LIMIT 10`,
      [campaignDbId, dateRange.startDate, dateRange.endDate]
    );

    const topProducts: ProductPerformance[] = topProductsResult.rows.map((row) => {
      const clicks = parseInt(row.clicks);
      const conversions = parseInt(row.conversions);
      return {
        productId: row.product_id,
        clicks,
        conversions,
        conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
        revenue: parseFloat(row.revenue),
      };
    });

    return {
      platformId: config.platformId,
      platformName: `${config.platformName} - ${campaignName}`,
      totalClicks,
      totalConversions,
      conversionRate,
      estimatedRevenue,
      clicksByDate,
      topProducts,
    };
  }

  /**
   * Get all platforms performance summary
   */
  async getAllPlatformsPerformance(
    dateRange: DateRange
  ): Promise<AffiliatePerformance[]> {
    const configs = await this.getAffiliateConfigs({ isEnabled: true });
    
    const performances = await Promise.all(
      configs.map((config) =>
        this.getAffiliatePerformance(config.platformId, dateRange)
      )
    );

    return performances;
  }
}
