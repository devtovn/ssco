import { MigrationBuilder } from 'node-pg-migrate';

export async function up(pgm: MigrationBuilder): Promise<void> {
  // Insert 5 default affiliate configurations for Vietnamese e-commerce platforms
  const affiliateConfigs = [
    {
      platform_id: 'tiki',
      platform_name: 'Tiki',
      refer_code: 'TIKI_REFER_CODE',
      link_template: 'https://tiki.vn/{{product_url}}?ref={{refer_code}}',
      link_format: 'query_param',
      is_active: true,
      priority: 1,
      commission_rate: 5.0,
      notes: 'Tiki affiliate program - Replace TIKI_REFER_CODE with actual code',
    },
    {
      platform_id: 'lazada',
      platform_name: 'Lazada',
      refer_code: 'LAZADA_REFER_CODE',
      link_template: 'https://www.lazada.vn/{{product_url}}?aff_id={{refer_code}}',
      link_format: 'query_param',
      is_active: true,
      priority: 2,
      commission_rate: 4.5,
      notes: 'Lazada affiliate program - Replace LAZADA_REFER_CODE with actual code',
    },
    {
      platform_id: 'tiktokshop',
      platform_name: 'TikTok Shop',
      refer_code: 'TIKTOK_REFER_CODE',
      link_template: 'https://vt.tiktok.com/{{refer_code}}/{{product_url}}',
      link_format: 'path_param',
      is_active: true,
      priority: 3,
      commission_rate: 6.0,
      notes: 'TikTok Shop affiliate program - Replace TIKTOK_REFER_CODE with actual code',
    },
    {
      platform_id: 'shopee',
      platform_name: 'Shopee',
      refer_code: 'SHOPEE_REFER_CODE',
      link_template: 'https://shopee.vn/{{product_url}}?ref={{refer_code}}',
      link_format: 'query_param',
      is_active: true,
      priority: 4,
      commission_rate: 5.5,
      notes: 'Shopee affiliate program - Replace SHOPEE_REFER_CODE with actual code',
    },
    {
      platform_id: 'sendo',
      platform_name: 'Sendo',
      refer_code: 'SENDO_REFER_CODE',
      link_template: 'https://www.sendo.vn/{{product_url}}?ref={{refer_code}}',
      link_format: 'query_param',
      is_active: true,
      priority: 5,
      commission_rate: 4.0,
      notes: 'Sendo affiliate program - Replace SENDO_REFER_CODE with actual code',
    },
  ];

  // Insert affiliate configurations with ON CONFLICT to avoid duplicates
  for (const config of affiliateConfigs) {
    pgm.sql(`
      INSERT INTO affiliate_configs (
        platform_id, 
        platform_name, 
        refer_code, 
        link_template, 
        link_format, 
        is_active, 
        priority, 
        commission_rate, 
        notes
      )
      VALUES (
        '${config.platform_id}',
        '${config.platform_name}',
        '${config.refer_code}',
        '${config.link_template}',
        '${config.link_format}',
        ${config.is_active},
        ${config.priority},
        ${config.commission_rate},
        '${config.notes}'
      )
      ON CONFLICT (platform_id) DO UPDATE SET
        platform_name = EXCLUDED.platform_name,
        link_template = EXCLUDED.link_template,
        link_format = EXCLUDED.link_format,
        priority = EXCLUDED.priority,
        commission_rate = EXCLUDED.commission_rate,
        notes = EXCLUDED.notes,
        updated_at = CURRENT_TIMESTAMP
    `);
  }

  console.log('='.repeat(80));
  console.log('DEFAULT AFFILIATE CONFIGURATIONS SEEDED');
  console.log('='.repeat(80));
  console.log(`Total affiliate configs inserted: ${affiliateConfigs.length}`);
  console.log('Platforms:', affiliateConfigs.map((c) => c.platform_name).join(', '));
  console.log('='.repeat(80));
  console.log('IMPORTANT: Update refer_code values with actual affiliate codes!');
  console.log('='.repeat(80));
}

export async function down(pgm: MigrationBuilder): Promise<void> {
  // Remove the default affiliate configurations
  const platformIds = ['tiki', 'lazada', 'tiktokshop', 'shopee', 'sendo'];

  pgm.sql(`
    DELETE FROM affiliate_configs 
    WHERE platform_id IN (${platformIds.map((id) => `'${id}'`).join(', ')})
  `);
}
