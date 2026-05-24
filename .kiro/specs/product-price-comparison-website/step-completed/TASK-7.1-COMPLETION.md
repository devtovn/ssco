# Task 7.1: Create AffiliateLinkService Class - Completion Report

## Overview
This task implements the AffiliateLinkService class for managing affiliate configurations for e-commerce platforms. The service handles CRUD operations for affiliate configs with validation.

## Files Created

### 1. AffiliateLinkService (`src/services/AffiliateLinkService.ts`)

#### Interfaces Defined

**AffiliateConfig**
```typescript
interface AffiliateConfig {
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
```

**AffiliateLinkFormat**
```typescript
interface AffiliateLinkFormat {
  type: 'query_param' | 'path_param' | 'subdomain' | 'custom';
  parameterName?: string;  // For query_param type
  template: string;
  exampleUrl: string;
}
```

**AffiliateConfigInput**
- Used for creating new affiliate configurations
- Required fields: platformId, platformName, referCode, linkTemplate, linkFormat
- Optional: priority (defaults to 0)

**AffiliateConfigUpdate**
- Used for updating existing configurations
- All fields optional (partial update)
- Fields: platformName, referCode, linkTemplate, linkFormat, isEnabled, priority

**ValidationResult**
```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

#### Methods Implemented

**`createAffiliateConfig(input: AffiliateConfigInput): Promise<AffiliateConfig>`**
- Creates new affiliate configuration
- Validates link format before insertion
- Throws error if validation fails
- Returns created config with generated ID

**`updateAffiliateConfig(platformId: string, updates: AffiliateConfigUpdate): Promise<AffiliateConfig>`**
- Updates existing affiliate configuration
- Fetches existing config first
- Merges updates with existing data
- Validates if link format or template is updated
- Builds dynamic SQL query based on provided fields
- Returns updated config

**`deleteAffiliateConfig(platformId: string): Promise<void>`**
- Deletes affiliate configuration by platform ID
- Throws error if config not found
- Cascades to related records (campaigns, clicks)

**`getAffiliateConfigs(filters?): Promise<AffiliateConfig[]>`**
- Retrieves all affiliate configurations
- Optional filtering:
  - `isEnabled`: Filter by enabled/disabled status
  - `platformIds`: Filter by specific platform IDs
- Orders by priority (ASC) then platform name (ASC)
- Returns array of configs

**`getAffiliateConfigByPlatform(platformId: string): Promise<AffiliateConfig | null>`**
- Retrieves single affiliate configuration by platform ID
- Returns null if not found
- Used internally for validation and updates

**`validateAffiliateLinkFormat(config: AffiliateConfig): Promise<ValidationResult>`**
- Validates affiliate configuration
- Checks:
  - Platform ID not empty
  - Platform name not empty
  - Refer code not empty
  - Link template not empty
  - Link format type is valid (query_param, path_param, subdomain, custom)
  - Parameter name present for query_param type
  - Template contains {refer_code} or {referCode} placeholder
  - Priority is non-negative
- Returns validation result with errors array

#### Validation Rules

1. **Platform ID**: Required, non-empty string
2. **Platform Name**: Required, non-empty string
3. **Refer Code**: Required, non-empty string
4. **Link Template**: Required, non-empty string
5. **Link Format Type**: Must be one of: query_param, path_param, subdomain, custom
6. **Parameter Name**: Required for query_param type
7. **Format Template**: Must contain {refer_code} or {referCode} placeholder
8. **Priority**: Must be non-negative integer

#### Database Interaction

**Insert Query**
```sql
INSERT INTO affiliate_configs 
(platform_id, platform_name, refer_code, link_template, link_format, priority, is_enabled)
VALUES ($1, $2, $3, $4, $5, $6, true)
RETURNING *
```

**Update Query** (Dynamic)
```sql
UPDATE affiliate_configs 
SET platform_name = $1, refer_code = $2, ..., updated_at = NOW()
WHERE platform_id = $N
RETURNING *
```

**Delete Query**
```sql
DELETE FROM affiliate_configs WHERE platform_id = $1
```

**Select Queries**
```sql
-- Get all with filters
SELECT * FROM affiliate_configs 
WHERE is_enabled = $1 AND platform_id = ANY($2)
ORDER BY priority ASC, platform_name ASC

-- Get by platform
SELECT * FROM affiliate_configs WHERE platform_id = $1
```

## Usage Examples

### 1. Create Affiliate Configuration

```typescript
import { AffiliateLinkService } from './services/AffiliateLinkService';
import { pool } from './config/database';

const affiliateService = new AffiliateLinkService(pool);

const config = await affiliateService.createAffiliateConfig({
  platformId: 'tiki',
  platformName: 'Tiki',
  referCode: 'YOUR_TIKI_CODE',
  linkTemplate: '{base_url}?spid={product_id}&aff_sid={refer_code}',
  linkFormat: {
    type: 'query_param',
    parameterName: 'aff_sid',
    template: '{base_url}?spid={product_id}&aff_sid={refer_code}',
    exampleUrl: 'https://tiki.vn/product.html?spid=123&aff_sid=YOUR_CODE'
  },
  priority: 1
});

console.log('Created config:', config.id);
```

### 2. Update Affiliate Configuration

```typescript
const updated = await affiliateService.updateAffiliateConfig('tiki', {
  referCode: 'NEW_TIKI_CODE',
  priority: 2,
  isEnabled: true
});

console.log('Updated config:', updated.platformId);
```

### 3. Get All Configurations

```typescript
// Get all enabled configs
const enabledConfigs = await affiliateService.getAffiliateConfigs({
  isEnabled: true
});

// Get specific platforms
const specificConfigs = await affiliateService.getAffiliateConfigs({
  platformIds: ['tiki', 'lazada', 'shopee']
});

// Get all configs
const allConfigs = await affiliateService.getAffiliateConfigs();
```

### 4. Get Configuration by Platform

```typescript
const tikiConfig = await affiliateService.getAffiliateConfigByPlatform('tiki');

if (tikiConfig) {
  console.log('Tiki refer code:', tikiConfig.referCode);
} else {
  console.log('Tiki config not found');
}
```

### 5. Validate Configuration

```typescript
const validation = await affiliateService.validateAffiliateLinkFormat(config);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
} else {
  console.log('Configuration is valid');
}
```

### 6. Delete Configuration

```typescript
await affiliateService.deleteAffiliateConfig('tiki');
console.log('Tiki config deleted');
```

## Link Format Examples

### Query Parameter Format
```typescript
{
  type: 'query_param',
  parameterName: 'aff_sid',
  template: '{base_url}?spid={product_id}&aff_sid={refer_code}',
  exampleUrl: 'https://tiki.vn/product.html?spid=123&aff_sid=CODE'
}
```

### Path Parameter Format
```typescript
{
  type: 'path_param',
  template: '{base_url}/r/{refer_code}/{product_path}',
  exampleUrl: 'https://lazada.vn/r/CODE/product-name-i123.html'
}
```

### Subdomain Format
```typescript
{
  type: 'subdomain',
  template: 'https://{refer_code}.{domain}/{product_path}',
  exampleUrl: 'https://CODE.shopee.vn/product-name-i.123.456'
}
```

### Custom Format
```typescript
{
  type: 'custom',
  template: '{base_url}?ref={refer_code}&campaign={campaign_id}&pid={product_id}',
  exampleUrl: 'https://sendo.vn/product.html?ref=CODE&campaign=CAMP&pid=123'
}
```

## Error Handling

### Validation Errors
```typescript
try {
  await affiliateService.createAffiliateConfig(invalidInput);
} catch (error) {
  // Error: Invalid affiliate configuration: Platform ID is required, Refer code is required
}
```

### Not Found Errors
```typescript
try {
  await affiliateService.updateAffiliateConfig('nonexistent', updates);
} catch (error) {
  // Error: Affiliate config not found for platform: nonexistent
}
```

### Database Errors
```typescript
try {
  await affiliateService.createAffiliateConfig(input);
} catch (error) {
  // Database constraint violations, connection errors, etc.
}
```

## Database Schema

The service works with the `affiliate_configs` table created in migration `1704000001000_create-affiliate-advertisement-tables.ts`:

```sql
CREATE TABLE affiliate_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id VARCHAR(100) NOT NULL UNIQUE,
  platform_name VARCHAR(200) NOT NULL,
  refer_code VARCHAR(500) NOT NULL,
  link_template TEXT NOT NULL,
  link_format JSONB NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  priority INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Requirements Satisfied

This task satisfies the following requirements:
- **Requirement 12.1**: Configure affiliate settings for each E-Commerce Platform
- **Requirement 12.2**: Support affiliate configuration for multiple platforms
- **Requirement 12.3**: Input and manage refer-code/affiliate-id for each platform
- **Requirement 12.4**: Configure affiliate link templates with dynamic parameters
- **Requirement 12.12**: Validate affiliate link formats before saving

## Next Steps

After completing this task, proceed to:
1. **Task 7.2**: Implement affiliate link generation with template parsing
2. **Task 7.3**: Implement affiliate tracking and analytics
3. **Task 7.4**: Add caching for affiliate operations
4. **Task 7.5**: Create REST API endpoints for affiliate management

## Notes

### Default Configurations
The database already has 5 default affiliate configurations seeded from migration `1704000005000_seed-default-affiliate-configs.ts`:
- Tiki (priority 1, 5.0% commission)
- Lazada (priority 2, 4.5% commission)
- TikTok Shop (priority 3, 6.0% commission)
- Shopee (priority 4, 5.5% commission)
- Sendo (priority 5, 4.0% commission)

### Priority Ordering
- Lower priority number = higher priority
- Used when multiple affiliate programs available for same product
- Configs ordered by priority ASC in queries

### Link Format Flexibility
The service supports 4 link format types to accommodate different affiliate program structures:
1. **query_param**: Most common (Tiki, Lazada, Shopee)
2. **path_param**: URL path-based (some custom programs)
3. **subdomain**: Subdomain-based tracking
4. **custom**: Fully customizable template

### Validation Strategy
- Validation happens before insert/update
- Prevents invalid configs from being saved
- Returns detailed error messages for debugging
- Template must contain refer code placeholder

### Future Enhancements
1. Add campaign support (Task 7.3)
2. Add link generation logic (Task 7.2)
3. Add click tracking (Task 7.3)
4. Add performance analytics (Task 7.3)
5. Add Redis caching (Task 7.4)
6. Add REST API endpoints (Task 7.5)
