# Task 7.2: Implement Affiliate Link Generation - Completion Report

## Overview
This task implements affiliate link generation with template parsing, supporting multiple link formats (query_param, path_param, subdomain, custom) and campaign-specific refer codes.

## Methods Implemented

### Main Method

**`generateAffiliateLink(productUrl: string, platformId: string, campaignId?: string): Promise<string>`**

**Purpose**: Generate affiliate link from product URL and platform configuration

**Parameters**:
- `productUrl`: Original product URL from e-commerce platform
- `platformId`: Platform identifier (e.g., 'tiki', 'lazada', 'shopee')
- `campaignId`: Optional campaign ID for campaign-specific tracking

**Returns**: Affiliate link with refer code injected, or original URL if config not found/disabled

**Logic Flow**:
1. Fetch affiliate config by platform ID
2. Return original URL if config not found or disabled (fallback)
3. Parse product URL to extract components
4. Get refer code (campaign-specific or default)
5. Generate link based on format type
6. Return generated affiliate link
7. Fallback to original URL on any error

**Error Handling**:
- Invalid URLs: Returns original URL
- Config not found: Returns original URL with warning log
- Disabled config: Returns original URL with warning log
- Generation errors: Returns original URL with error log

### Format-Specific Generators

#### 1. Query Parameter Format

**`generateQueryParamLink(productUrl, format, referCode, productId?): string`**

**Supported Platforms**: Tiki, Lazada, Shopee, Sendo

**Example Input**:
```
productUrl: https://tiki.vn/product.html?spid=123
format.parameterName: 'aff_sid'
referCode: 'YOUR_CODE'
```

**Example Output**:
```
https://tiki.vn/product.html?spid=123&aff_sid=YOUR_CODE
```

**Logic**:
- Parses URL using URL API
- Adds affiliate parameter using `searchParams.set()`
- Preserves existing query parameters
- Adds product ID parameter if needed

#### 2. Path Parameter Format

**`generatePathParamLink(baseUrl, productPath, format, referCode, productId?): string`**

**Supported Platforms**: Custom affiliate programs

**Example Input**:
```
baseUrl: https://lazada.vn
productPath: /product-name-i123.html
format.template: '{base_url}/r/{refer_code}/{product_path}'
referCode: 'YOUR_CODE'
```

**Example Output**:
```
https://lazada.vn/r/YOUR_CODE/product-name-i123.html
```

**Logic**:
- Replaces `{base_url}` with protocol + host
- Replaces `{refer_code}` or `{referCode}` with actual code
- Replaces `{product_path}` with pathname + search
- Handles leading slash in product path

#### 3. Subdomain Format

**`generateSubdomainLink(url, format, referCode, productId?): string`**

**Supported Platforms**: Custom subdomain-based tracking

**Example Input**:
```
url: https://shopee.vn/product-name-i.123.456
format.template: 'https://{refer_code}.{domain}/{product_path}'
referCode: 'YOUR_CODE'
```

**Example Output**:
```
https://YOUR_CODE.shopee.vn/product-name-i.123.456
```

**Logic**:
- Extracts domain from URL
- Replaces `{refer_code}` with actual code
- Replaces `{domain}` with hostname
- Replaces `{product_path}` with pathname + search

#### 4. Custom Format

**`generateCustomLink(productUrl, format, referCode, productId?, campaignId?): string`**

**Supported Platforms**: Fully customizable

**Example Input**:
```
productUrl: https://sendo.vn/product.html
format.template: '{base_url}?ref={refer_code}&campaign={campaign_id}&pid={product_id}'
referCode: 'YOUR_CODE'
campaignId: 'SUMMER2024'
productId: '123'
```

**Example Output**:
```
https://sendo.vn/product.html?ref=YOUR_CODE&campaign=SUMMER2024&pid=123
```

**Logic**:
- Supports all placeholder types
- Replaces `{base_url}`, `{refer_code}`, `{product_path}`, `{product_url}`
- Replaces `{product_id}` if available
- Replaces `{campaign_id}` if provided

### Helper Methods

#### Extract Product ID

**`extractProductId(productUrl: string): string | undefined`**

**Purpose**: Extract product ID from various URL patterns

**Supported Patterns**:
1. Query parameters: `?spid=123`, `?pid=123`, `?id=123`
2. Path with dash: `/product-name-i123456.html`
3. Path with dots: `/product-name-i.123.456`
4. Products path: `/products/123456`

**Examples**:
```typescript
extractProductId('https://tiki.vn/product.html?spid=123')
// Returns: '123'

extractProductId('https://lazada.vn/product-name-i123456.html')
// Returns: '123456'

extractProductId('https://shopee.vn/product-i.123.456')
// Returns: '123456'

extractProductId('https://example.com/products/789')
// Returns: '789'
```

#### Get Active Campaign

**`getActiveCampaign(configId: string, campaignId: string): Promise<{referCode: string} | null>`**

**Purpose**: Fetch campaign-specific refer code if campaign is active

**Query**:
```sql
SELECT refer_code FROM affiliate_campaigns 
WHERE affiliate_config_id = $1 
AND campaign_id = $2 
AND is_active = true
AND (end_date IS NULL OR end_date > NOW())
```

**Returns**: Campaign refer code or null if not found/inactive/expired

## Usage Examples

### 1. Basic Link Generation

```typescript
import { AffiliateLinkService } from './services/AffiliateLinkService';
import { pool } from './config/database';

const affiliateService = new AffiliateLinkService(pool);

// Generate Tiki affiliate link
const tikiLink = await affiliateService.generateAffiliateLink(
  'https://tiki.vn/product.html?spid=123456',
  'tiki'
);
// Result: https://tiki.vn/product.html?spid=123456&aff_sid=YOUR_TIKI_CODE

// Generate Lazada affiliate link
const lazadaLink = await affiliateService.generateAffiliateLink(
  'https://www.lazada.vn/products/product-name-i123456.html',
  'lazada'
);
// Result: https://www.lazada.vn/products/product-name-i123456.html?aff_short_key=YOUR_LAZADA_CODE
```

### 2. Campaign-Specific Link Generation

```typescript
// Generate link with campaign-specific refer code
const campaignLink = await affiliateService.generateAffiliateLink(
  'https://shopee.vn/product-name-i.123.456',
  'shopee',
  'SUMMER2024'
);
// Uses campaign refer code instead of default
```

### 3. Fallback Behavior

```typescript
// Config not found - returns original URL
const unknownLink = await affiliateService.generateAffiliateLink(
  'https://unknown-platform.com/product',
  'unknown_platform'
);
// Result: https://unknown-platform.com/product (original URL)

// Config disabled - returns original URL
const disabledLink = await affiliateService.generateAffiliateLink(
  'https://tiki.vn/product.html',
  'disabled_platform'
);
// Result: https://tiki.vn/product.html (original URL)
```

### 4. Error Handling

```typescript
try {
  const link = await affiliateService.generateAffiliateLink(
    'invalid-url',
    'tiki'
  );
  // Returns: 'invalid-url' (fallback to original)
} catch (error) {
  // Errors are caught internally, returns original URL
}
```

## Link Format Examples

### Tiki (Query Parameter)
```
Input:  https://tiki.vn/product.html?spid=123456
Output: https://tiki.vn/product.html?spid=123456&aff_sid=YOUR_CODE
```

### Lazada (Query Parameter)
```
Input:  https://www.lazada.vn/products/product-name-i123456.html
Output: https://www.lazada.vn/products/product-name-i123456.html?aff_short_key=YOUR_CODE
```

### TikTok Shop (Query Parameter)
```
Input:  https://shop.tiktok.com/view/product/123456
Output: https://shop.tiktok.com/view/product/123456?affiliate_id=YOUR_CODE
```

### Shopee (Query Parameter)
```
Input:  https://shopee.vn/product-name-i.123.456
Output: https://shopee.vn/product-name-i.123.456?af_siteid=YOUR_CODE
```

### Sendo (Query Parameter)
```
Input:  https://www.sendo.vn/product-name-123456.html
Output: https://www.sendo.vn/product-name-123456.html?ref=YOUR_CODE
```

### Custom Path Parameter
```
Input:  https://example.com/product-name-i123.html
Template: {base_url}/r/{refer_code}/{product_path}
Output: https://example.com/r/YOUR_CODE/product-name-i123.html
```

### Custom Subdomain
```
Input:  https://shop.example.com/product
Template: https://{refer_code}.{domain}/{product_path}
Output: https://YOUR_CODE.shop.example.com/product
```

## Template Placeholders

### Supported Placeholders

| Placeholder | Description | Example Value |
|------------|-------------|---------------|
| `{base_url}` | Protocol + hostname | `https://tiki.vn` |
| `{refer_code}` or `{referCode}` | Affiliate refer code | `YOUR_CODE` |
| `{product_path}` | URL pathname + search | `/product.html?id=123` |
| `{product_url}` | Full product URL | `https://tiki.vn/product.html` |
| `{product_id}` | Extracted product ID | `123456` |
| `{campaign_id}` | Campaign identifier | `SUMMER2024` |
| `{domain}` | Hostname only | `tiki.vn` |

### Template Examples

**Query Parameter**:
```
{base_url}?spid={product_id}&aff_sid={refer_code}
```

**Path Parameter**:
```
{base_url}/r/{refer_code}/{product_path}
```

**Subdomain**:
```
https://{refer_code}.{domain}/{product_path}
```

**Custom**:
```
{base_url}?ref={refer_code}&campaign={campaign_id}&pid={product_id}
```

## Campaign Support

### Campaign-Specific Refer Codes

Campaigns allow using different refer codes for specific marketing initiatives:

```typescript
// Create campaign with specific refer code
await pool.query(
  `INSERT INTO affiliate_campaigns 
   (affiliate_config_id, campaign_id, campaign_name, refer_code, start_date, is_active)
   VALUES ($1, $2, $3, $4, NOW(), true)`,
  [configId, 'SUMMER2024', 'Summer Sale 2024', 'SUMMER_CODE']
);

// Generate link with campaign code
const link = await affiliateService.generateAffiliateLink(
  productUrl,
  'tiki',
  'SUMMER2024'  // Uses SUMMER_CODE instead of default
);
```

### Campaign Validation

Campaigns must be:
- Active (`is_active = true`)
- Not expired (`end_date IS NULL OR end_date > NOW()`)
- Associated with the affiliate config

## Product ID Extraction

### Extraction Patterns

The service automatically extracts product IDs from various URL formats:

**Query Parameters**:
- `?spid=123` (Tiki)
- `?pid=123` (Generic)
- `?id=123` (Generic)

**Path Patterns**:
- `/product-name-i123456.html` (Lazada style)
- `/product-name-i.123.456` (Shopee style)
- `/products/123456` (REST style)

**Regex Patterns Used**:
```typescript
// Dash or underscore with 'i' prefix
/[-_]i\.?(\d+)/

// Products path
/\/products?\/(\d+)/
```

## Error Handling & Fallbacks

### Fallback Strategy

The service implements graceful degradation:

1. **Config Not Found**: Returns original URL + warning log
2. **Config Disabled**: Returns original URL + warning log
3. **Invalid URL**: Returns original URL + error log
4. **Generation Error**: Returns original URL + error log
5. **Campaign Not Found**: Uses default refer code

### Logging

```typescript
// Warning logs
console.warn(`Affiliate config not found or disabled for platform: ${platformId}`);
console.warn(`Unknown link format type: ${type}`);

// Error logs
console.error('Error generating affiliate link:', error);
```

### No Exceptions Thrown

The method never throws exceptions - always returns a valid URL (original or generated).

## Requirements Satisfied

This task satisfies the following requirements:
- **Requirement 12.5**: Automatically append refer-code to all product purchase links
- **Requirement 12.6**: Support multiple affiliate link formats
- **Requirement 12.13**: Provide fallback to direct product links if affiliate configuration is disabled or invalid
- **Requirement 12.14**: Support campaign-specific refer-codes for tracking different marketing initiatives

## Integration with Other Services

### With Product Display
```typescript
// In product detail page
const product = await getProduct(productId);
const affiliateLink = await affiliateService.generateAffiliateLink(
  product.sourceUrl,
  product.platform
);
// Display affiliateLink as "Buy Now" button
```

### With Price Comparison
```typescript
// In price comparison table
const prices = await priceService.getProductPrices(productId);
for (const price of prices) {
  price.affiliateLink = await affiliateService.generateAffiliateLink(
    price.sourceUrl,
    price.platform
  );
}
```

## Next Steps

After completing this task, proceed to:
1. **Task 7.3**: Implement affiliate tracking and analytics
2. **Task 7.4**: Add caching for affiliate operations
3. **Task 7.5**: Create REST API endpoints for affiliate management

## Notes

### Performance Considerations
- Each link generation requires 1-2 database queries
- Consider caching configs (Task 7.4)
- Product ID extraction uses regex (fast)
- URL parsing uses native URL API (fast)

### Security Considerations
- Always validate URLs before parsing
- Sanitize refer codes to prevent injection
- Use parameterized queries for database access
- Log generation errors for monitoring

### Testing Recommendations
1. Test all 4 link format types
2. Test with various URL patterns
3. Test campaign-specific codes
4. Test fallback scenarios
5. Test product ID extraction patterns
6. Test with invalid/malformed URLs

### Future Enhancements
1. Add link shortening support
2. Add UTM parameter injection
3. Add A/B testing support
4. Add link expiration
5. Add link analytics preview
