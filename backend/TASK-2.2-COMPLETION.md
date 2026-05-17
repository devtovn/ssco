# Task 2.2 Completion: Create Affiliate and Advertisement Tables

## Overview
Successfully created database tables for affiliate link management and advertisement system with all required indexes and default data.

## Implementation Details

### Migration File
Created migration file: `migrations/1704000001000_create-affiliate-advertisement-tables.ts`

### Tables Created

#### 1. affiliate_configs
Stores platform-specific affiliate configurations for e-commerce platforms.

**Columns:**
- `id` (UUID, Primary Key)
- `platform_id` (VARCHAR(100), Unique) - Platform identifier (e.g., 'tiki', 'lazada')
- `platform_name` (VARCHAR(200)) - Display name
- `refer_code` (VARCHAR(500)) - Affiliate refer code
- `link_template` (TEXT) - Template for generating affiliate links
- `link_format` (JSONB) - Link format configuration with type and parameters
- `is_enabled` (BOOLEAN, Default: true)
- `priority` (INTEGER, Default: 0) - Priority order for affiliate programs
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_affiliate_configs_platform` on `platform_id`
- `idx_affiliate_configs_enabled` on `is_enabled`
- `idx_affiliate_configs_priority` on `priority` (DESC)

**Default Data:**
Seeded 5 default affiliate configurations:
1. Tiki (priority 1)
2. Lazada (priority 2)
3. TikTok Shop (priority 3)
4. Shopee (priority 4)
5. Sendo (priority 5)

#### 2. affiliate_campaigns
Stores campaign-specific affiliate tracking with custom refer codes.

**Columns:**
- `id` (UUID, Primary Key)
- `affiliate_config_id` (UUID, Foreign Key → affiliate_configs)
- `campaign_id` (VARCHAR(100)) - Campaign identifier
- `campaign_name` (VARCHAR(200)) - Campaign display name
- `refer_code` (VARCHAR(500)) - Campaign-specific refer code
- `start_date` (TIMESTAMP)
- `end_date` (TIMESTAMP, Nullable)
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMP)

**Constraints:**
- Unique constraint on (`affiliate_config_id`, `campaign_id`)

**Indexes:**
- `idx_affiliate_campaigns_config` on `affiliate_config_id`
- `idx_affiliate_campaigns_campaign_id` on `campaign_id`
- `idx_affiliate_campaigns_active` on `is_active`
- `idx_affiliate_campaigns_dates` on (`start_date`, `end_date`)

#### 3. affiliate_link_clicks
Tracks affiliate link clicks and conversions with user metadata.

**Columns:**
- `id` (UUID, Primary Key)
- `affiliate_config_id` (UUID, Foreign Key → affiliate_configs)
- `campaign_id` (UUID, Foreign Key → affiliate_campaigns, Nullable)
- `product_id` (UUID, Foreign Key → products, Nullable)
- `generated_link` (TEXT) - The generated affiliate link
- `user_session` (VARCHAR(200)) - User session identifier
- `user_agent` (TEXT) - Browser user agent
- `referrer` (TEXT) - HTTP referrer
- `clicked_at` (TIMESTAMP)
- `is_conversion` (BOOLEAN, Default: false)
- `conversion_value` (DECIMAL(12,2), Nullable)
- `conversion_at` (TIMESTAMP, Nullable)

**Indexes:**
- `idx_affiliate_clicks_config` on `affiliate_config_id`
- `idx_affiliate_clicks_campaign` on `campaign_id`
- `idx_affiliate_clicks_product` on `product_id`
- `idx_affiliate_clicks_clicked_at` on `clicked_at` (DESC)
- `idx_affiliate_clicks_conversion` on `is_conversion`
- `idx_affiliate_clicks_session` on `user_session`

**Note:** This table is designed to support partitioning by month for better performance with large click data volumes (as specified in the design document).

#### 4. ad_zones
Defines advertisement zones with position and configuration.

**Columns:**
- `id` (UUID, Primary Key)
- `name` (VARCHAR(200)) - Zone name
- `position` (VARCHAR(100)) - Position identifier (e.g., 'header', 'sidebar')
- `dimensions` (JSONB) - Width and height configuration
- `configuration` (JSONB, Nullable) - Additional zone configuration
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_ad_zones_position` on `position`
- `idx_ad_zones_active` on `is_active`

#### 5. advertisements
Stores individual advertisements with targeting and performance data.

**Columns:**
- `id` (UUID, Primary Key)
- `zone_id` (UUID, Foreign Key → ad_zones)
- `type` (VARCHAR(50)) - Advertisement type (e.g., 'google_ads', 'banner')
- `content_url` (TEXT, Nullable) - URL for banner images or content
- `targeting` (JSONB, Nullable) - Targeting configuration
- `start_date` (TIMESTAMP)
- `end_date` (TIMESTAMP, Nullable)
- `performance_data` (JSONB, Nullable) - Impressions, clicks, CTR data
- `is_active` (BOOLEAN, Default: true)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Indexes:**
- `idx_advertisements_zone` on `zone_id`
- `idx_advertisements_type` on `type`
- `idx_advertisements_dates` on (`start_date`, `end_date`)
- `idx_advertisements_active` on `is_active`

## Verification

### Schema Verification
Created verification script: `src/utils/verifyAffiliateSchema.ts`

**Verification Results:**
✅ All 5 tables created successfully
✅ All 26 indexes created successfully
✅ 5 default affiliate configurations inserted
✅ Test affiliate campaign insertion successful
✅ Test ad zone insertion successful

### Database Verification Commands

```bash
# List all tables
docker exec price-comparison-postgres psql -U pricecompare -d price_comparison -c "\dt"

# View affiliate configurations
docker exec price-comparison-postgres psql -U pricecompare -d price_comparison -c "SELECT platform_id, platform_name, priority FROM affiliate_configs ORDER BY priority;"

# View indexes
docker exec price-comparison-postgres psql -U pricecompare -d price_comparison -c "\di" | grep -E "affiliate|ad_"
```

## Requirements Satisfied

✅ **Requirement 10.1**: Advertisement placement support with flexible positioning
✅ **Requirement 12.1**: Affiliate configuration for each e-commerce platform
✅ **Requirement 12.2**: Support for multiple platforms (Tiki, Lazada, TikTok Shop, Shopee, Sendo)
✅ **Requirement 12.3**: Affiliate link template configuration with dynamic parameters
✅ **Requirement 12.8**: Affiliate link click tracking
✅ **Requirement 12.9**: Affiliate performance reporting with clicks and conversions

## Database Statistics

- **Total Tables Created**: 5
- **Total Indexes Created**: 26
- **Default Affiliate Configs**: 5 platforms
- **Foreign Key Relationships**: 6

## Next Steps

The following tasks can now proceed:
- Task 7.1-7.5: Implement Affiliate Link Management Service
- Task 12.1-12.3: Implement Advertisement Service
- Task 16.4: Create admin advertisement management interface
- Task 16.5: Create admin affiliate management interface

## Files Modified/Created

1. `backend/migrations/1704000001000_create-affiliate-advertisement-tables.ts` - Migration file
2. `backend/src/utils/verifyAffiliateSchema.ts` - Verification script
3. `backend/TASK-2.2-COMPLETION.md` - This completion document

## Migration Execution

```bash
# Run migration
node node_modules/node-pg-migrate/bin/node-pg-migrate.js up -m backend/migrations

# Verify schema
node --import tsx backend/src/utils/verifyAffiliateSchema.ts
```

## Notes

- The affiliate_link_clicks table is designed to support partitioning by month for better performance with large datasets, as specified in the design document
- All JSONB columns support flexible configuration without schema changes
- Foreign key constraints use appropriate ON DELETE actions (CASCADE or SET NULL)
- All timestamps use PostgreSQL's NOW() function for consistency
- Default affiliate configurations use placeholder refer codes that should be updated with actual codes from affiliate programs

---

**Task Status**: ✅ Completed
**Date**: 2024
**Developer**: Kiro AI Assistant
