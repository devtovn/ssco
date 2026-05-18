/**
 * Verification script for Admin API endpoints
 * This script verifies that all admin endpoints are properly registered and accessible
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001';
const API_PREFIX = '/api';

// Test endpoints
const endpoints = [
  { method: 'GET', path: `${API_PREFIX}/admin/config`, requiresAuth: false },
  { method: 'PUT', path: `${API_PREFIX}/admin/config`, requiresAuth: true },
  { method: 'GET', path: `${API_PREFIX}/admin/reviewers`, requiresAuth: true },
  { method: 'POST', path: `${API_PREFIX}/admin/reviewers`, requiresAuth: true },
  { method: 'PUT', path: `${API_PREFIX}/admin/reviewers/test-id`, requiresAuth: true },
  { method: 'DELETE', path: `${API_PREFIX}/admin/reviewers/test-id`, requiresAuth: true },
];

console.log('🔍 Verifying Admin API Endpoints...\n');
console.log('Note: This script only checks if endpoints are registered.');
console.log('It does not test authentication or business logic.\n');

// Check if server is running
const checkServer = () => {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE_URL}/health`, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        reject(new Error(`Server returned status ${res.statusCode}`));
      }
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
  });
};

// Test endpoint registration
const testEndpoint = (endpoint) => {
  return new Promise((resolve) => {
    const url = new URL(endpoint.path, BASE_URL);
    
    const options = {
      method: endpoint.method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    const req = http.request(options, (res) => {
      // We expect:
      // - 401 for protected endpoints without auth
      // - 404 for endpoints that don't exist
      // - 200/400/500 for endpoints that exist
      
      const exists = res.statusCode !== 404;
      const needsAuth = endpoint.requiresAuth && res.statusCode === 401;
      
      resolve({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        exists,
        statusCode: res.statusCode,
        requiresAuth: endpoint.requiresAuth,
        authWorking: needsAuth,
      });
    });
    
    req.on('error', (err) => {
      resolve({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        exists: false,
        error: err.message,
      });
    });
    
    req.setTimeout(5000, () => {
      req.destroy();
      resolve({
        endpoint: `${endpoint.method} ${endpoint.path}`,
        exists: false,
        error: 'Request timeout',
      });
    });
    
    // Send empty body for POST/PUT requests
    if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      req.write(JSON.stringify({}));
    }
    
    req.end();
  });
};

// Run verification
(async () => {
  try {
    console.log('Checking if server is running...');
    await checkServer();
    console.log('✅ Server is running\n');
    
    console.log('Testing endpoint registration:\n');
    
    const results = await Promise.all(endpoints.map(testEndpoint));
    
    let allPassed = true;
    
    results.forEach((result) => {
      if (result.error) {
        console.log(`❌ ${result.endpoint}`);
        console.log(`   Error: ${result.error}\n`);
        allPassed = false;
      } else if (!result.exists) {
        console.log(`❌ ${result.endpoint}`);
        console.log(`   Status: ${result.statusCode} (Not Found)\n`);
        allPassed = false;
      } else {
        const authStatus = result.requiresAuth 
          ? (result.authWorking ? '🔒 Auth Required' : '⚠️  Auth Not Working')
          : '🌐 Public';
        
        console.log(`✅ ${result.endpoint}`);
        console.log(`   Status: ${result.statusCode} | ${authStatus}\n`);
      }
    });
    
    console.log('\n' + '='.repeat(60));
    if (allPassed) {
      console.log('✅ All admin endpoints are properly registered!');
    } else {
      console.log('❌ Some endpoints have issues. Please check the output above.');
    }
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('❌ Server is not running or not accessible');
    console.error(`   Error: ${error.message}`);
    console.error('\nPlease start the server with: npm run dev');
    process.exit(1);
  }
})();
