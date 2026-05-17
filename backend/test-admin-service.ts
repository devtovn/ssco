import { Pool } from 'pg';
import { AdminService } from './src/services/AdminService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testAdminService() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const adminService = new AdminService(pool);

  try {
    console.log('Testing AdminService...\n');

    // Test 1: Get website config
    console.log('1. Testing getWebsiteConfig()...');
    const config = await adminService.getWebsiteConfig();
    console.log('✅ Website config retrieved:');
    console.log(JSON.stringify(config, null, 2));
    console.log('');

    // Test 2: Update website config
    console.log('2. Testing updateWebsiteConfig()...');
    const updatedConfig = await adminService.updateWebsiteConfig({
      siteName: 'Test Updated Site',
      theme: { primaryColor: '#FF5733' },
    });
    console.log('✅ Website config updated:');
    console.log(`  Site Name: ${updatedConfig.siteName}`);
    console.log(`  Primary Color: ${updatedConfig.theme.primaryColor}`);
    console.log('');

    // Test 3: Create reviewer
    console.log('3. Testing createReviewer()...');
    const reviewer = await adminService.createReviewer({
      email: `test-reviewer-${Date.now()}@example.com`,
      password: 'TestPassword123',
      permissions: {
        canCreateArticles: true,
        canEditArticles: true,
        canApproveArticles: false,
      },
    });
    console.log('✅ Reviewer created:');
    console.log(`  ID: ${reviewer.id}`);
    console.log(`  Email: ${reviewer.email}`);
    console.log(`  Permissions: ${JSON.stringify(reviewer.permissions)}`);
    console.log('');

    // Test 4: Get reviewers
    console.log('4. Testing getReviewers()...');
    const reviewers = await adminService.getReviewers();
    console.log(`✅ Found ${reviewers.length} reviewer(s)`);
    console.log('');

    // Test 5: Update reviewer
    console.log('5. Testing updateReviewer()...');
    const updatedReviewer = await adminService.updateReviewer(reviewer.id, {
      permissions: {
        canCreateArticles: true,
        canEditArticles: true,
        canApproveArticles: true,
      },
    });
    console.log('✅ Reviewer updated:');
    console.log(`  Permissions: ${JSON.stringify(updatedReviewer.permissions)}`);
    console.log('');

    // Test 6: Get reviewer by ID
    console.log('6. Testing getReviewerById()...');
    const foundReviewer = await adminService.getReviewerById(reviewer.id);
    console.log('✅ Reviewer found:');
    console.log(`  Email: ${foundReviewer?.email}`);
    console.log('');

    // Test 7: Delete reviewer
    console.log('7. Testing deleteReviewer()...');
    await adminService.deleteReviewer(reviewer.id);
    console.log('✅ Reviewer deleted');
    console.log('');

    // Restore original config
    console.log('8. Restoring original website config...');
    await adminService.updateWebsiteConfig({
      siteName: 'Price Comparison',
      theme: { primaryColor: '#3B82F6' },
    });
    console.log('✅ Config restored');
    console.log('');

    console.log('✅ All tests passed!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testAdminService();
