const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testLotWorkflow() {
  console.log('🚀 Testing Lot Workflow...\n');
  
  try {
    // Step 1: Check if server is running
    console.log('1. Checking server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('   ✅ Server is healthy:', healthResponse.data.status);
    
    // Step 2: Try to access the dashboard (this will likely redirect to auth)
    console.log('\n2. Testing dashboard access...');
    try {
      const dashboardResponse = await axios.get(`${BASE_URL}/dashboard`, {
        maxRedirects: 0,
        validateStatus: () => true
      });
      console.log('   ℹ️ Dashboard response status:', dashboardResponse.status);
      if (dashboardResponse.status === 302) {
        console.log('   ℹ️ Redirected to:', dashboardResponse.headers.location);
      }
    } catch (e) {
      console.log('   ⚠️ Dashboard access requires authentication');
    }
    
    // Step 3: Test lot detail page error handling
    console.log('\n3. Testing lot detail error handling...');
    try {
      const lotResponse = await axios.get(`${BASE_URL}/dashboard/projects/00000000-0000-0000-0000-000000000000/lots/00000000-0000-0000-0000-000000000000`, {
        maxRedirects: 0,
        validateStatus: () => true
      });
      console.log('   ✅ Lot detail error page status:', lotResponse.status);
    } catch (e) {
      console.log('   ⚠️ Lot detail error test failed:', e.message);
    }
    
    // Step 4: Test API endpoints
    console.log('\n4. Testing API endpoints...');
    
    // Test lots API (will likely return 401 without auth)
    try {
      const lotsResponse = await axios.get(`${BASE_URL}/api/projects/test-project/lots`, {
        validateStatus: () => true
      });
      console.log('   ℹ️ Lots API status:', lotsResponse.status);
      if (lotsResponse.status === 401) {
        console.log('   ✅ Lots API properly requires authentication');
      }
    } catch (e) {
      console.log('   ⚠️ Lots API test failed:', e.message);
    }
    
    console.log('\n✅ Basic workflow tests completed!');
    console.log('\nTo fully test the workflow:');
    console.log('1. Open http://localhost:3001 in a browser');
    console.log('2. Sign in with your credentials');
    console.log('3. Navigate to Projects');
    console.log('4. Create a new project');
    console.log('5. Create a new lot with files and ITP templates');
    console.log('6. View the lot detail page');
    console.log('7. Verify files and ITP instances are displayed');
    console.log('8. Test the action buttons');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testLotWorkflow();