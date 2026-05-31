const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api';

async function testAdEndpoints() {
  try {
    console.log('Testing Advertisement API Endpoints...\n');

    // Test 1: Get all ad zones (public endpoint)
    console.log('1. Testing GET /api/ads/zones');
    try {
      const zonesResponse = await axios.get(`${BASE_URL}/ads/zones`);
      console.log('✓ GET /api/ads/zones - Success');
      console.log('  Response:', JSON.stringify(zonesResponse.data, null, 2));
    } catch (error) {
      console.log('✗ GET /api/ads/zones - Failed:', error.response?.data || error.message);
    }

    // Test 2: Get active ad zones only
    console.log('\n2. Testing GET /api/ads/zones?isActive=true');
    try {
      const activeZonesResponse = await axios.get(`${BASE_URL}/ads/zones?isActive=true`);
      console.log('✓ GET /api/ads/zones?isActive=true - Success');
      console.log('  Response:', JSON.stringify(activeZonesResponse.data, null, 2));
    } catch (error) {
      console.log('✗ GET /api/ads/zones?isActive=true - Failed:', error.response?.data || error.message);
    }

    // Test 3: Login as admin to get token
    console.log('\n3. Testing POST /api/auth/login (to get admin token)');
    let adminToken = '';
    try {
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'admin',
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

    // Test 4: Create ad zone (admin only)
    console.log('\n4. Testing POST /api/ads/zones (admin only)');
    let zoneId = '';
    try {
      const createZoneResponse = await axios.post(
        `${BASE_URL}/ads/zones`,
        {
          name: `Test Ad Zone ${Date.now()}`,
          position: 'header',
          dimensions: {
            width: 728,
            height: 90,
            unit: 'px'
          },
          configuration: {
            displayTiming: {
              delayMs: 1000,
              frequency: 'always'
            },
            targeting: {
              devices: ['desktop', 'tablet']
            }
          }
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      zoneId = createZoneResponse.data.zone.id;
      console.log('✓ POST /api/ads/zones - Success');
      console.log('  Response:', JSON.stringify(createZoneResponse.data, null, 2));
    } catch (error) {
      console.log('✗ POST /api/ads/zones - Failed:', error.response?.data || error.message);
    }

    // Test 5: Update ad zone (admin only)
    if (zoneId) {
      console.log('\n5. Testing PUT /api/ads/zones/:id (admin only)');
      try {
        const updateZoneResponse = await axios.put(
          `${BASE_URL}/ads/zones/${zoneId}`,
          {
            dimensions: {
              width: 970,
              height: 90,
              unit: 'px'
            },
            isActive: true
          },
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );
        console.log('✓ PUT /api/ads/zones/:id - Success');
        console.log('  Response:', JSON.stringify(updateZoneResponse.data, null, 2));
      } catch (error) {
        console.log('✗ PUT /api/ads/zones/:id - Failed:', error.response?.data || error.message);
      }

      // Test 6: Get performance metrics (admin only)
      console.log('\n6. Testing GET /api/ads/performance/:zoneId (admin only)');
      try {
        const performanceResponse = await axios.get(
          `${BASE_URL}/ads/performance/${zoneId}?days=30`,
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );
        console.log('✓ GET /api/ads/performance/:zoneId - Success');
        console.log('  Response:', JSON.stringify(performanceResponse.data, null, 2));
      } catch (error) {
        console.log('✗ GET /api/ads/performance/:zoneId - Failed:', error.response?.data || error.message);
      }

      // Test 7: Delete ad zone (admin only)
      console.log('\n7. Testing DELETE /api/ads/zones/:id (admin only)');
      try {
        const deleteZoneResponse = await axios.delete(
          `${BASE_URL}/ads/zones/${zoneId}`,
          {
            headers: { Authorization: `Bearer ${adminToken}` }
          }
        );
        console.log('✓ DELETE /api/ads/zones/:id - Success');
        console.log('  Response:', JSON.stringify(deleteZoneResponse.data, null, 2));
      } catch (error) {
        console.log('✗ DELETE /api/ads/zones/:id - Failed:', error.response?.data || error.message);
      }
    }

    // Test 8: Test validation errors
    console.log('\n8. Testing POST /api/ads/zones with invalid data (should fail)');
    try {
      await axios.post(
        `${BASE_URL}/ads/zones`,
        {
          name: 'Invalid Zone',
          position: 'invalid_position',
          dimensions: {
            width: -100,
            height: 90,
            unit: 'px'
          }
        },
        {
          headers: { Authorization: `Bearer ${adminToken}` }
        }
      );
      console.log('✗ POST /api/ads/zones - Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✓ POST /api/ads/zones - Correctly rejected (400)');
        console.log('  Validation errors:', JSON.stringify(error.response.data, null, 2));
      } else {
        console.log('✗ POST /api/ads/zones - Failed with unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 9: Test unauthorized access
    console.log('\n9. Testing POST /api/ads/zones without token (should fail)');
    try {
      await axios.post(`${BASE_URL}/ads/zones`, {
        name: 'Unauthorized Zone',
        position: 'header',
        dimensions: {
          width: 728,
          height: 90,
          unit: 'px'
        }
      });
      console.log('✗ POST /api/ads/zones - Should have failed but succeeded');
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('✓ POST /api/ads/zones - Correctly rejected (401)');
      } else {
        console.log('✗ POST /api/ads/zones - Failed with unexpected error:', error.response?.data || error.message);
      }
    }

    // Test 10: Test tracking endpoint (public)
    console.log('\n10. Testing POST /api/ads/track (public endpoint)');
    console.log('  Note: This will fail if no advertisements exist in the database');
    try {
      const trackResponse = await axios.post(`${BASE_URL}/ads/track`, {
        adId: '00000000000000000000000000', // Dummy ULID
        type: 'impression',
        metadata: {
          userSession: 'test-session-123',
          userAgent: 'Mozilla/5.0',
          page: '/test-page'
        }
      });
      console.log('✓ POST /api/ads/track - Success');
      console.log('  Response:', JSON.stringify(trackResponse.data, null, 2));
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✓ POST /api/ads/track - Correctly rejected (404 - ad not found)');
      } else {
        console.log('✗ POST /api/ads/track - Failed:', error.response?.data || error.message);
      }
    }

    console.log('\n✅ All tests completed!');

  } catch (error) {
    console.error('Test suite failed:', error.message);
  }
}

testAdEndpoints();
