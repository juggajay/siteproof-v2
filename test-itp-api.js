// Direct API testing script for ITP endpoints
const https = require('https');
const http = require('http');

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(options.body);
    }
    
    req.end();
  });
}

async function testAPI() {
  console.log('🧪 Testing SiteProof ITP API Endpoints\n');
  
  const baseUrl = 'http://localhost:3000';
  const projectId = '89253127-a60a-48a7-a511-ce89c316d3af';
  const lotId = 'f497f453-fb01-49fe-967a-3182a61a5a1b';
  
  // Test 1: Health endpoint
  console.log('1️⃣ Testing health endpoint...');
  try {
    const health = await makeRequest(`${baseUrl}/api/health`);
    console.log(`   Status: ${health.status}`);
    if (health.status === 200) {
      console.log('   ✅ Health endpoint working');
    }
  } catch (error) {
    console.log('   ❌ Health endpoint failed:', error.message);
  }
  
  // Test 2: ITP Templates endpoint
  console.log('\n2️⃣ Testing ITP templates endpoint...');
  try {
    const templates = await makeRequest(`${baseUrl}/api/itp/templates`);
    console.log(`   Status: ${templates.status}`);
    console.log(`   Response: ${templates.data.substring(0, 200)}...`);
  } catch (error) {
    console.log('   ❌ Templates endpoint failed:', error.message);
  }
  
  // Test 3: Lot ITP instances endpoint (the failing one)
  console.log('\n3️⃣ Testing lot ITP instances endpoint...');
  try {
    const lotItp = await makeRequest(`${baseUrl}/api/projects/${projectId}/lots/${lotId}/itp`);
    console.log(`   Status: ${lotItp.status}`);
    console.log(`   Response: ${lotItp.data.substring(0, 500)}`);
    
    if (lotItp.status === 500) {
      console.log('   ❌ 500 ERROR DETECTED!');
      console.log('   Full response:', lotItp.data);
    } else if (lotItp.status === 401) {
      console.log('   ⚠️  401 Unauthorized (expected without authentication)');
    }
  } catch (error) {
    console.log('   ❌ Lot ITP endpoint failed:', error.message);
  }
  
  // Test 4: ITP Assignment endpoint
  console.log('\n4️⃣ Testing ITP assignment endpoint...');
  try {
    const assign = await makeRequest(`${baseUrl}/api/itp/instances/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        templateIds: ['test-template-id'],
        projectId: projectId,
        lotId: lotId
      })
    });
    console.log(`   Status: ${assign.status}`);
    console.log(`   Response: ${assign.data.substring(0, 300)}`);
    
    if (assign.status === 500) {
      console.log('   ❌ 500 ERROR DETECTED!');
      console.log('   Full response:', assign.data);
    }
  } catch (error) {
    console.log('   ❌ Assignment endpoint failed:', error.message);
  }
  
  console.log('\n🏁 API testing completed!');
}

// Check if server is running first
async function checkServer() {
  try {
    await makeRequest('http://localhost:3000/api/health');
    console.log('✅ Development server is running on localhost:3000\n');
    return true;
  } catch (error) {
    console.log('❌ Development server is not running. Please start with: npm run dev');
    return false;
  }
}

async function main() {
  const serverRunning = await checkServer();
  if (serverRunning) {
    await testAPI();
  }
}

main().catch(console.error);