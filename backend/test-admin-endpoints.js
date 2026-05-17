const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testAdminEndpoints() {
  try {
    console.log('Testing Admin API Endpoints...\n');

    // Test 1: Get website config (public endpoint)
    console.log('1. Testing GET /api/admin/config');
    try {
      const configResponse = await axios.get(`${BASE_URL}/admin/config`);
      console.log('✓ GET /api/admin/config - Success');
      console.log('  Response:', JSON.stringify(configResponse.data, null, 2));
    } catch (error) {
      console.log('✗ GET /api/admin/config - Failed:', error.response?.data || error.message);
    }

    // Test 2: Login as admin to get token
    console.log('\n2. Testing POST /api/auth/login (to get admin token)');
    let adminToken = '';
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin@pricecompare.vn',
        password: 'Admin@123456'
      });
      adminToken = loginResponse.data.tokens.accessToken;
      console.log('✓ POST /api/auth/login - Success');
      console.log('  Admin token obtained');
    } catch (error) {
      console.log('✗ POST /api/auth/login - Failed:', error.response?.data || error.message);
      console.log('  Cannot continue with authenticated tests');
      return;
    }

    // Test 3: Update website config (admin only)
    console.log('\n3. Testing PUT /api/admin/config (admin only)');
    try {
      const updateConfigResponse = await axios.put(
        `${BASE_URL}/admin/config`,
        {
          siteName: 'Test Price Comparison',
          tagline: 'Test tagline',
          primaryColor: '#FF5733'
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      console.log('✓ PUT /api/admin/config - Success');
      console.log('  Response:', JSON.stringify(updateConfigResponse.data, null, 2));
    } catch (error) {
      console.log('✗ PUT /api/admin/config - Failed:', error.response?.data || error.message);
    }

    // Test 4: Get reviewers list (admin only)
    console.log('\n4. Testing GET /api/admin/reviewers (admin only)');
    try {
      const reviewersResponse = await axios.get(`${BASE_URL}/admin/reviewers`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✓ GET /api/admin/reviewers - Success');
      console.log('  Response:', JSON.stringify(reviewersResponse.data, null, 2));
    } catch (error) {
      console.log('✗ GET /api/admin/reviewers - Failed:', error.response?.data || error.message);
    }

    // Test 5: Create reviewer (admin only)
    console.log('\n5. Testing POST /api/admin/reviewers (admin only)');
    let reviewerId = '';
    try {
      const createReviewerResponse = await axios.post(
        `${BASE_URL}/admin/reviewers`,
        {
          email: `test.reviewer.${Date.now()}@example.com`,
          password: 'TestPassword123',
          permissions: { canCreateArticles: true, canApproveArticles: true }
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      reviewerId = createReviewerResponse.data.reviewer.id;
      console.log('✓ POST /api/admin/reviewers - Success');
      console.log('  Response:', JSON.stringify(createReviewerResponse.data, null, 2));
    } catch (error) {
      console.log('✗ POST /api/admin/reviewers - Failed:', error.response?.data || error.message);
    }

    // Test 6: Update reviewer (admin only)
    if (reviewerId) {
      console.log('\n6. Testing PUT /api/admin/reviewers/:id (admin only)');
      try {
        const updateReviewerResponse = await axios.put(
          `${BASE_URL}/admin/reviewers/${reviewerId}`,
          {
            permissions: { canCreateArticles: true, canApproveArticles: false },
            isActive: true
          },
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );
        console.log('✓ PUT /api/admin/reviewers/:id - Success');
        console.log('  Response:', JSON.stringify(updateReviewerResponse.data, null, 2));
      } catch (error) {
        console.log('✗ PUT /api/admin/reviewers/:id - Failed:', error.response?.data || error.message);
      }

      // Test 7: Delete reviewer (admin only)
      console.log('\n7. Testing DELETE /api/admin/reviewers/:id (admin only)');
      try {
        const deleteReviewerResponse = await axios.delete(
          `${BASE_URL}/admin/reviewers/${reviewerId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );
        console.log('✓ DELETE /api/admin/reviewers/:id - Success');
        console.log('  Response:', JSON.stringify(deleteReviewerResponse.data, null, 2));
      } catch (error) {
        console.log('✗ DELETE /api/admin/reviewers/:id - Failed:', error.response?.data || error.message);
      }
    }

    // Test 8: Test unauthorized access
    console.log('\n8. Testing PUT /api/admin/config without token (should fail)');
    try {
      await axios.put(`${BASE_URL}/admin/config`, {
        siteName: 'Unauthorized Test'
      });
      console.log('✗ PUT /api/admin/config - Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ PUT /api/admin/config - Correctly rejected (401)');
      } else {
        console.log('✗ PUT /api/admin/config - Failed with unexpected error:', error.response?.data || error.message);
      }
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

testAdminEndpoints();
