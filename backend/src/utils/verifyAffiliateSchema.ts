import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function verifyAffiliateSchema() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Verifying affiliate and advertisement tables schema...\n');

    // Check affiliate_configs table
    console.log('✓ Checking affiliate_configs table...');
    const affiliateConfigsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'affiliate_configs'
      ORDER BY ordinal_position;
    `);
    console.log(`  Found ${affiliateConfigsResult.rows.length} columns`);
    
    // Check affiliate_campaigns table
    console.log('✓ Checking affiliate_campaigns table...');
    const affiliateCampaignsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'affiliate_campaigns'
      ORDER BY ordinal_position;
    `);
    console.log(`  Found ${affiliateCampaignsResult.rows.length} columns`);
    
    // Check affiliate_link_clicks table
    console.log('✓ Checking affiliate_link_clicks table...');
    const affiliateClicksResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'affiliate_link_clicks'
      ORDER BY ordinal_position;
    `);
    console.log(`  Found ${affiliateClicksResult.rows.length} columns`);
    
    // Check ad_zones table
    console.log('✓ Checking ad_zones table...');
    const adZonesResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'ad_zones'
      ORDER BY ordinal_position;
    `);
    console.log(`  Found ${adZonesResult.rows.length} columns`);
    
    // Check advertisements table
    console.log('✓ Checking advertisements table...');
    const advertisementsResult = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'advertisements'
      ORDER BY ordinal_position;
    `);
    console.log(`  Found ${advertisementsResult.rows.length} columns`);
    
    // Check indexes
    console.log('\n✓ Checking indexes...');
    const indexesResult = await client.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('affiliate_configs', 'affiliate_campaigns', 'affiliate_link_clicks', 'ad_zones', 'advertisements')
      ORDER BY tablename, indexname;
    `);
    console.log(`  Found ${indexesResult.rows.length} indexes`);
    
    // Check default affiliate configurations
    console.log('\n✓ Checking default affiliate configurations...');
    const defaultConfigsResult = await client.query(`
      SELECT platform_id, platform_name, priority, is_enabled
      FROM affiliate_configs
      ORDER BY priority;
    `);
    console.log(`  Found ${defaultConfigsResult.rows.length} default configurations:`);
    defaultConfigsResult.rows.forEach(row => {
      console.log(`    - ${row.platform_name} (${row.platform_id}): priority ${row.priority}, enabled: ${row.is_enabled}`);
    });
    
    // Test inserting a sample affiliate campaign
    console.log('\n✓ Testing affiliate campaign insertion...');
    const tikiConfig = await client.query(`
      SELECT id FROM affiliate_configs WHERE platform_id = 'tiki' LIMIT 1;
    `);
    
    if (tikiConfig.rows.length > 0) {
      const configId = tikiConfig.rows[0].id;
      await client.query(`
        INSERT INTO affiliate_campaigns (affiliate_config_id, campaign_id, campaign_name, refer_code, start_date, is_active)
        VALUES ($1, 'test_campaign_001', 'Test Campaign', 'TEST_REFER_CODE', NOW(), true)
        ON CONFLICT DO NOTHING;
      `, [configId]);
      console.log('  Successfully inserted test campaign');
      
      // Clean up test data
      await client.query(`
        DELETE FROM affiliate_campaigns WHERE campaign_id = 'test_campaign_001';
      `);
      console.log('  Cleaned up test campaign');
    }
    
    // Test inserting a sample ad zone
    console.log('\n✓ Testing ad zone insertion...');
    await client.query(`
      INSERT INTO ad_zones (name, position, dimensions, is_active)
      VALUES ('Test Header Ad', 'header', '{"width": 728, "height": 90}'::jsonb, true)
      RETURNING id;
    `);
    console.log('  Successfully inserted test ad zone');
    
    // Clean up test ad zone
    await client.query(`
      DELETE FROM ad_zones WHERE name = 'Test Header Ad';
    `);
    console.log('  Cleaned up test ad zone');
    
    console.log('\n✅ All schema verification tests passed!');
    
  } catch (error) {
    console.error('❌ Schema verification failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifyAffiliateSchema()
  .then(() => {
    console.log('\n🎉 Verification complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Verification failed:', error);
    process.exit(1);
  });
