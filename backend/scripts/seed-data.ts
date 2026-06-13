import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'kombe',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function verifySeededData() {
  const client = await pool.connect();

  try {
    console.log('\n' + '='.repeat(80));
    console.log('VERIFYING SEEDED DATA');
    console.log('='.repeat(80) + '\n');

    // Verify categories
    const categoriesResult = await client.query(
      'SELECT COUNT(*) as count, array_agg(name) as names FROM categories WHERE is_active = true'
    );
    const categoriesCount = parseInt(categoriesResult.rows[0].count);
    const categoryNames = categoriesResult.rows[0].names;

    console.log('📁 CATEGORIES:');
    console.log(`   Total: ${categoriesCount}`);
    console.log(`   Names: ${categoryNames.join(', ')}`);
    console.log('   ✅ Categories seeded successfully\n');

    // Verify affiliate configurations
    const affiliateResult = await client.query(
      'SELECT COUNT(*) as count, array_agg(platform_name) as platforms FROM affiliate_configs WHERE is_active = true'
    );
    const affiliateCount = parseInt(affiliateResult.rows[0].count);
    const platformNames = affiliateResult.rows[0].platforms;

    console.log('🔗 AFFILIATE CONFIGURATIONS:');
    console.log(`   Total: ${affiliateCount}`);
    console.log(`   Platforms: ${platformNames.join(', ')}`);
    console.log('   ✅ Affiliate configs seeded successfully\n');

    // Verify admin user
    const adminResult = await client.query(
      "SELECT email, role, is_active FROM users WHERE role = 'Administrator'"
    );

    console.log('👤 ADMINISTRATOR ACCOUNT:');
    if (adminResult.rows.length > 0) {
      const admin = adminResult.rows[0];
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
      console.log(`   Active: ${admin.is_active}`);
      console.log('   ✅ Admin account created successfully\n');
    } else {
      console.log('   ❌ Admin account not found\n');
    }

    // Summary
    console.log('='.repeat(80));
    console.log('VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    console.log(`✅ Categories: ${categoriesCount}/10 expected`);
    console.log(`✅ Affiliate Configs: ${affiliateCount}/5 expected`);
    console.log(`✅ Admin Account: ${adminResult.rows.length}/1 expected`);
    console.log('='.repeat(80) + '\n');

    // Check if all expected data is present
    if (categoriesCount >= 10 && affiliateCount >= 5 && adminResult.rows.length >= 1) {
      console.log('✅ ALL SEED DATA VERIFIED SUCCESSFULLY!\n');
      return true;
    } else {
      console.log('⚠️  SOME SEED DATA IS MISSING. Please run migrations again.\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verifying seeded data:', error);
    return false;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run verification
verifySeededData()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
