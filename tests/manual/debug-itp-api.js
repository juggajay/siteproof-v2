// Debug script to test ITP API with authentication
const fetch = require('node-fetch');

async function testWithAuth() {
  console.log('🔍 Testing ITP API endpoints with authentication simulation...\n');
  
  const baseUrl = 'http://localhost:3000';
  const projectId = '89253127-a60a-48a7-a511-ce89c316d3af';
  const lotId = '9af7274e-7259-418d-9d03-f5615afb6ef9'; // From user's console logs
  
  // Test endpoints that were failing
  const endpoints = [
    `/api/projects/${projectId}/lots/${lotId}/itp`,
    `/api/itp/templates`,
    `/api/itp/instances/assign`
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`Testing: ${endpoint}`);
      
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: endpoint.includes('assign') ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Simulate no auth header (should get 401)
        },
        body: endpoint.includes('assign') ? JSON.stringify({
          templateIds: ['test'],
          projectId,
          lotId
        }) : undefined
      });
      
      const status = response.status;
      const text = await response.text();
      
      console.log(`  Status: ${status}`);
      console.log(`  Response: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
      
      if (status === 500) {
        console.log('  ❌ 500 ERROR DETECTED!');
      } else if (status === 401) {
        console.log('  ✅ 401 Unauthorized (expected)');
      } else {
        console.log(`  ⚠️  Unexpected status: ${status}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Request failed: ${error.message}`);
    }
    
    console.log('');
  }
  
  console.log('🏁 API testing complete');
}

testWithAuth().catch(console.error);