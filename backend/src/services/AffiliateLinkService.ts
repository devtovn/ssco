import { Pool } from 'pg';

export type AffiliateProviderKind = 'native' | 'accesstrade' | 'manual';

export interface AffiliatePublisher {
  id: string;
  provider: string;
  displayName: string;
  appToken?: string;
  apiBaseUrl: string;
  isEnabled: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateCampaign {
  id: string;
  affiliateConfigId: string;
  campaignId: string;
  campaignName: string;
  referCode: string;
  startDate: Date;
  endDate?: Date;
  isActive: boolean;
  isPrimary: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateConfig {
  id: string;
  platformId: string;
  platformName: string;
  publisherId?: string;
  provider: AffiliateProviderKind;
  domainPatterns: string[];
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  /**
   * Platform-specific API credentials (stored as JSONB).
   * tiki:    { refCode }
   * shopee:  { pubId, accessToken }
   * tiktok:  { appKey, accessToken }
   * lazada:  { appToken, campaignId }
   */
  credentials?: Record<string, string>;
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
  publisherId?: string;
  provider?: AffiliateProviderKind;
  domainPatterns?: string[];
  referCode: string;
  linkTemplate: string;
  linkFormat: AffiliateLinkFormat;
  credentials?: Record<string, string>;
  priority?: number;
}

export interface AffiliateConfigUpdate {
  platformName?: string;
  publisherId?: string | null;
  provider?: AffiliateProviderKind;
  domainPatterns?: string[];
  referCode?: string;
  linkTemplate?: string;
  linkFormat?: AffiliateLinkFormat;
  credentials?: Record<string, string>;
  isEnabled?: boolean;
  priority?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
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

export interface StoredAffiliateLinkResult {
  affiliateUrl: string;
  method: 'auto' | 'api';
  affiliateCampaignId?: string;
}

export interface AffiliateCampaignInput {
  affiliateConfigId: string;
  campaignId: string;
  campaignName: string;
  referCode: string;
  startDate: Date;
  endDate?: Date;
  isActive?: boolean;
  isPrimary?: boolean;
  notes?: string;
}

export interface RegenerateAffiliateResult {
  updated: number;
  skipped: number;
  errors: string[];
}

export class AffiliateLinkService {
  constructor(private pool: Pool) {}

  /**
   * Create new affiliate configuration
   */
  async createAffiliateConfig(input: AffiliateConfigInput): Promise<AffiliateConfig> {
    const provider = input.provider ?? 'accesstrade';
    const referCode = input.referCode?.trim() || `at-${input.platformId}`;
    const linkTemplate = input.linkTemplate ?? '{product_url}';
    const linkFormat = input.linkFormat ?? {
      type: 'custom' as const,
      template: '{product_url}',
      exampleUrl: `https://${input.platformId.replace(/_/g, '-')}.vn/`,
    };

    const validation = await this.validateAffiliateLinkFormat({
      ...input,
      id: '',
      provider,
      domainPatterns: input.domainPatterns ?? [],
      referCode,
      linkTemplate,
      linkFormat,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    if (!validation.isValid) {
      throw new Error(`Invalid affiliate configuration: ${validation.errors.join(', ')}`);
    }

    const result = await this.pool.query(
      `INSERT INTO affiliate_configs
       (platform_id, platform_name, publisher_id, provider, domain_patterns,
        refer_code, link_template, link_format, credentials, priority, is_enabled)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
       RETURNING *`,
      [
        input.platformId,
        input.platformName,
        input.publisherId ?? null,
        provider,
        input.domainPatterns ?? [],
        referCode,
        linkTemplate,
        JSON.stringify(linkFormat),
        input.credentials ? JSON.stringify(input.credentials) : null,
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
    if (updates.publisherId !== undefined) {
      updateFields.push(`publisher_id = $${paramIndex++}`);
      values.push(updates.publisherId);
    }
    if (updates.provider !== undefined) {
      updateFields.push(`provider = $${paramIndex++}`);
      values.push(updates.provider);
    }
    if (updates.domainPatterns !== undefined) {
      updateFields.push(`domain_patterns = $${paramIndex++}`);
      values.push(updates.domainPatterns);
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
    if (updates.credentials !== undefined) {
      updateFields.push(`credentials = $${paramIndex++}`);
      values.push(
        updates.credentials === null ? null : JSON.stringify(updates.credentials)
      );
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

    // Validate refer code (not required for AccessTrade)
    if (config.provider !== 'accesstrade') {
      if (!config.referCode || config.referCode.trim().length === 0) {
        errors.push('Refer code is required');
      }
    }

    // Link template/format only required for native/manual
    if (config.provider === 'accesstrade') {
      return { isValid: errors.length === 0, errors };
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
      publisherId: row.publisher_id ?? undefined,
      provider: (row.provider ?? 'accesstrade') as AffiliateProviderKind,
      domainPatterns: row.domain_patterns ?? [],
      referCode: row.refer_code,
      linkTemplate: row.link_template,
      linkFormat: typeof row.link_format === 'string'
        ? JSON.parse(row.link_format)
        : row.link_format,
      credentials: row.credentials
        ? (typeof row.credentials === 'string' ? JSON.parse(row.credentials) : row.credentials)
        : undefined,
      isEnabled: row.is_enabled,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToPublisher(row: any, includeToken = false): AffiliatePublisher {
    return {
      id: row.id,
      provider: row.provider,
      displayName: row.display_name,
      appToken: includeToken ? row.app_token ?? undefined : undefined,
      apiBaseUrl: row.api_base_url,
      isEnabled: row.is_enabled,
      metadata: row.metadata
        ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata)
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToCampaign(row: any): AffiliateCampaign {
    return {
      id: row.id,
      affiliateConfigId: row.affiliate_config_id,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name,
      referCode: row.refer_code,
      startDate: row.start_date,
      endDate: row.end_date ?? undefined,
      isActive: row.is_active,
      isPrimary: row.is_primary ?? false,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getAffiliatePublishers(includeToken = false): Promise<AffiliatePublisher[]> {
    const result = await this.pool.query(
      'SELECT * FROM affiliate_publishers ORDER BY provider ASC'
    );
    return result.rows.map((row) => this.mapRowToPublisher(row, includeToken));
  }

  async getAffiliatePublisherByProvider(
    provider: string,
    includeToken = false
  ): Promise<AffiliatePublisher | null> {
    const result = await this.pool.query(
      'SELECT * FROM affiliate_publishers WHERE provider = $1',
      [provider]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToPublisher(result.rows[0], includeToken);
  }

  async getPrimaryCampaignForConfig(configId: string): Promise<AffiliateCampaign | null> {
    const result = await this.pool.query(
      `SELECT * FROM affiliate_campaigns
       WHERE affiliate_config_id = $1
         AND is_primary = true
         AND is_active = true
         AND (end_date IS NULL OR end_date > NOW())
       ORDER BY start_date DESC
       LIMIT 1`,
      [configId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToCampaign(result.rows[0]);
  }

  async getAffiliateCampaignsForConfig(configId: string): Promise<AffiliateCampaign[]> {
    const result = await this.pool.query(
      `SELECT * FROM affiliate_campaigns
       WHERE affiliate_config_id = $1
       ORDER BY is_primary DESC, start_date DESC`,
      [configId]
    );
    return result.rows.map((row) => this.mapRowToCampaign(row));
  }

  async updateAffiliatePublisher(
    provider: string,
    updates: { displayName?: string; appToken?: string; apiBaseUrl?: string; isEnabled?: boolean }
  ): Promise<AffiliatePublisher> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (updates.displayName !== undefined) {
      fields.push(`display_name = $${i++}`);
      values.push(updates.displayName);
    }
    if (updates.appToken !== undefined) {
      fields.push(`app_token = $${i++}`);
      values.push(updates.appToken);
    }
    if (updates.apiBaseUrl !== undefined) {
      fields.push(`api_base_url = $${i++}`);
      values.push(updates.apiBaseUrl);
    }
    if (updates.isEnabled !== undefined) {
      fields.push(`is_enabled = $${i++}`);
      values.push(updates.isEnabled);
    }
    fields.push('updated_at = NOW()');
    values.push(provider);

    const result = await this.pool.query(
      `UPDATE affiliate_publishers SET ${fields.join(', ')} WHERE provider = $${i} RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      throw new Error(`Publisher not found: ${provider}`);
    }
    return this.mapRowToPublisher(result.rows[0], true);
  }

  async createAffiliateCampaign(input: AffiliateCampaignInput): Promise<AffiliateCampaign> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      if (input.isPrimary) {
        await client.query(
          `UPDATE affiliate_campaigns SET is_primary = false, updated_at = NOW()
           WHERE affiliate_config_id = $1 AND is_primary = true`,
          [input.affiliateConfigId]
        );
      }
      const result = await client.query(
        `INSERT INTO affiliate_campaigns
           (affiliate_config_id, campaign_id, campaign_name, refer_code, start_date, end_date,
            is_active, is_primary, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          input.affiliateConfigId,
          input.campaignId,
          input.campaignName,
          input.referCode,
          input.startDate,
          input.endDate ?? null,
          input.isActive ?? true,
          input.isPrimary ?? false,
          input.notes ?? null,
        ]
      );
      await client.query('COMMIT');
      return this.mapRowToCampaign(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async setPrimaryCampaign(campaignRowId: string): Promise<AffiliateCampaign> {
    const existing = await this.pool.query(
      'SELECT affiliate_config_id FROM affiliate_campaigns WHERE id = $1',
      [campaignRowId]
    );
    if (existing.rows.length === 0) {
      throw new Error(`Campaign not found: ${campaignRowId}`);
    }
    const configId = existing.rows[0].affiliate_config_id;
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE affiliate_campaigns SET is_primary = false, updated_at = NOW()
         WHERE affiliate_config_id = $1`,
        [configId]
      );
      const result = await client.query(
        `UPDATE affiliate_campaigns
         SET is_primary = true, is_active = true, updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [campaignRowId]
      );
      await client.query('COMMIT');
      return this.mapRowToCampaign(result.rows[0]);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Generate affiliate link for seed/storage — resolves AccessTrade or native credentials
   * and returns the internal campaign row id when applicable.
   */
  async generateStoredAffiliateLink(
    platformId: string,
    sourceUrl: string
  ): Promise<StoredAffiliateLinkResult> {
    const config = await this.getAffiliateConfigByPlatform(platformId);
    if (!config || !config.isEnabled) {
      throw new Error(`Chưa cấu hình affiliate cho sàn "${platformId}"`);
    }

    if (config.provider === 'accesstrade') {
      const publisher = await this.resolvePublisherForConfig(config);
      if (!publisher?.app_token) {
        throw new Error('AccessTrade app token chưa cấu hình (Admin → Affiliate → AccessTrade)');
      }
      const campaign = await this.getPrimaryCampaignForConfig(config.id);
      if (!campaign) {
        throw new Error(`Chưa có campaign primary cho "${platformId}"`);
      }
      const { generateAccessTradeAffiliateUrl } = await import('./PlatformAffiliateService');
      const result = await generateAccessTradeAffiliateUrl(sourceUrl, {
        appToken: publisher.app_token,
        campaignId: campaign.campaignId,
      });
      return { ...result, affiliateCampaignId: campaign.id };
    }

    if (config.provider === 'manual') {
      const affiliateUrl = await this.generateAffiliateLink(sourceUrl, platformId);
      const campaign = await this.getPrimaryCampaignForConfig(config.id);
      return {
        affiliateUrl,
        method: 'auto',
        affiliateCampaignId: campaign?.id,
      };
    }

    if (!config.credentials) {
      throw new Error(`Thiếu credentials cho "${platformId}"`);
    }

    const { generateAffiliateLinkForPlatform } = await import('./PlatformAffiliateService');
    const creds = { platform: platformId, ...config.credentials } as import('./PlatformAffiliateService').PlatformCredentials;
    const result = await generateAffiliateLinkForPlatform(sourceUrl, creds);

    let affiliateCampaignId: string | undefined;
    const primary = await this.getPrimaryCampaignForConfig(config.id);
    if (primary) {
      affiliateCampaignId = primary.id;
    } else if (config.credentials.campaignId) {
      const row = await this.pool.query(
        `SELECT id FROM affiliate_campaigns
         WHERE affiliate_config_id = $1 AND campaign_id = $2`,
        [config.id, config.credentials.campaignId]
      );
      affiliateCampaignId = row.rows[0]?.id;
    }

    return { ...result, affiliateCampaignId };
  }

  /**
   * Bulk regenerate price_entries.affiliate_url using the current primary campaign.
   */
  async regenerateAffiliateUrls(params: {
    affiliateConfigId: string;
    fromCampaignId?: string;
    limit?: number;
  }): Promise<RegenerateAffiliateResult> {
    const configRow = await this.pool.query(
      'SELECT platform_id FROM affiliate_configs WHERE id = $1',
      [params.affiliateConfigId]
    );
    if (configRow.rows.length === 0) {
      throw new Error(`Affiliate config not found: ${params.affiliateConfigId}`);
    }
    const platformId = configRow.rows[0].platform_id as string;

    const primary = await this.getPrimaryCampaignForConfig(params.affiliateConfigId);
    if (!primary) {
      throw new Error('Chưa có campaign primary — không thể regenerate');
    }

    let query = `
      SELECT id, source_url FROM price_entries
      WHERE source_name = $1 AND affiliate_url IS NOT NULL
    `;
    const values: unknown[] = [platformId];
    if (params.fromCampaignId) {
      query += ` AND affiliate_campaign_id = $${values.length + 1}`;
      values.push(params.fromCampaignId);
    }
    query += ' ORDER BY scraped_at DESC';
    if (params.limit) {
      query += ` LIMIT $${values.length + 1}`;
      values.push(params.limit);
    }

    const entries = await this.pool.query(query, values);
    let updated = 0;
    const errors: string[] = [];

    for (const row of entries.rows) {
      try {
        const result = await this.generateStoredAffiliateLink(platformId, row.source_url);
        await this.pool.query(
          `UPDATE price_entries
           SET affiliate_url = $1, affiliate_campaign_id = $2, affiliate_url_at = NOW()
           WHERE id = $3`,
          [
            result.affiliateUrl,
            result.affiliateCampaignId ?? primary.id,
            row.id,
          ]
        );
        updated++;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`${row.id}: ${msg}`);
      }
    }

    return {
      updated,
      skipped: entries.rows.length - updated,
      errors,
    };
  }

  private async resolvePublisherForConfig(
    config: AffiliateConfig
  ): Promise<{ app_token: string | null } | null> {
    if (config.publisherId) {
      const byId = await this.pool.query(
        'SELECT app_token FROM affiliate_publishers WHERE id = $1 AND is_enabled = true',
        [config.publisherId]
      );
      if (byId.rows[0]) return byId.rows[0];
    }
    const byProvider = await this.pool.query(
      `SELECT app_token FROM affiliate_publishers
       WHERE provider = 'accesstrade' AND is_enabled = true
       LIMIT 1`
    );
    return byProvider.rows[0] ?? null;
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

    // Single query with CTEs — replaces 3 separate round-trips to the same table
    const perfResult = await this.pool.query(
      `WITH base AS (
         SELECT
           clicked_at,
           is_conversion,
           conversion_value,
           product_id
         FROM affiliate_link_clicks
         WHERE affiliate_config_id = $1
           AND clicked_at >= $2
           AND clicked_at <= $3
       ),
       totals AS (
         SELECT
           COUNT(*)                                    AS total_clicks,
           COUNT(*) FILTER (WHERE is_conversion = true) AS total_conversions,
           COALESCE(SUM(conversion_value), 0)          AS total_revenue
         FROM base
       ),
       by_date AS (
         SELECT
           DATE(clicked_at)                              AS date,
           COUNT(*)                                      AS clicks,
           COUNT(*) FILTER (WHERE is_conversion = true)  AS conversions
         FROM base
         GROUP BY DATE(clicked_at)
         ORDER BY date ASC
       ),
       top_products AS (
         SELECT
           product_id,
           COUNT(*)                                      AS clicks,
           COUNT(*) FILTER (WHERE is_conversion = true)  AS conversions,
           COALESCE(SUM(conversion_value), 0)            AS revenue
         FROM base
         WHERE product_id IS NOT NULL
         GROUP BY product_id
         ORDER BY clicks DESC
         LIMIT 10
       )
       SELECT
         'totals'                AS section,
         t.total_clicks::text    AS col1,
         t.total_conversions::text AS col2,
         t.total_revenue::text   AS col3,
         NULL                    AS col4,
         NULL                    AS col5
       FROM totals t
       UNION ALL
       SELECT 'date', d.date::text, d.clicks::text, d.conversions::text, NULL, NULL
       FROM by_date d
       UNION ALL
       SELECT 'product', p.product_id, p.clicks::text, p.conversions::text, p.revenue::text, NULL
       FROM top_products p`,
      [config.id, dateRange.startDate, dateRange.endDate]
    );

    const totalsRow = perfResult.rows.find((r) => r.section === 'totals')!;
    const totalClicks = parseInt(totalsRow.col1);
    const totalConversions = parseInt(totalsRow.col2);
    const estimatedRevenue = parseFloat(totalsRow.col3);
    const conversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;

    const clicksByDate: ClickData[] = perfResult.rows
      .filter((r) => r.section === 'date')
      .map((row) => ({
        date: row.col1,
        clicks: parseInt(row.col2),
        conversions: parseInt(row.col3),
      }));

    const topProducts: ProductPerformance[] = perfResult.rows
      .filter((r) => r.section === 'product')
      .map((row) => {
        const clicks = parseInt(row.col2);
        const conversions = parseInt(row.col3);
        return {
          productId: row.col1,
          clicks,
          conversions,
          conversionRate: clicks > 0 ? (conversions / clicks) * 100 : 0,
          revenue: parseFloat(row.col4),
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
