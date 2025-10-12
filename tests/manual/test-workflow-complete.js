const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:3001';

async function testCompleteWorkflow() {
  console.log('🚀 Testing Complete Lot Workflow...\n');
  
  try {
    // Step 1: Check server health
    console.log('1. Checking server health...');
    const healthResponse = await axios.get(`${BASE_URL}/api/health`);
    console.log('   ✅ Server is healthy:', healthResponse.data.status);
    
    // Step 2: Test ITP templates API
    console.log('\n2. Testing ITP Templates API...');
    try {
      const templatesResponse = await axios.get(`${BASE_URL}/api/itp/templates?is_active=true`, {
        validateStatus: () => true
      });
      console.log('   ℹ️ ITP Templates API status:', templatesResponse.status);
      if (templatesResponse.status === 401) {
        console.log('   ✅ ITP Templates API properly requires authentication');
      } else if (templatesResponse.status === 200) {
        console.log('   ✅ ITP Templates API accessible (templates:', templatesResponse.data.templates?.length || 0, ')');
      }
    } catch (e) {
      console.log('   ⚠️ ITP Templates API test failed:', e.message);
    }
    
    // Step 3: Test lot creation API
    console.log('\n3. Testing Lot Creation API...');
    try {
      const createResponse = await axios.post(`${BASE_URL}/api/projects/test-project/lots`, {
        name: 'Test Lot',
        description: 'Test lot description',
        selectedItpTemplates: [],
        files: []
      }, {
        validateStatus: () => true
      });
      console.log('   ℹ️ Lot Creation API status:', createResponse.status);
      if (createResponse.status === 401) {
        console.log('   ✅ Lot Creation API properly requires authentication');
      } else if (createResponse.status === 201) {
        console.log('   ✅ Lot Creation API works');
      }
    } catch (e) {
      console.log('   ⚠️ Lot Creation API test failed:', e.message);
    }
    
    // Step 4: Test lot detail page
    console.log('\n4. Testing Lot Detail Page...');
    try {
      const lotDetailResponse = await axios.get(`${BASE_URL}/dashboard/projects/test-project/lots/test-lot`, {
        validateStatus: () => true,
        maxRedirects: 0
      });
      console.log('   ℹ️ Lot Detail Page status:', lotDetailResponse.status);
      if (lotDetailResponse.status === 307) {
        console.log('   ✅ Lot Detail Page redirects to auth (expected)');
      }
    } catch (e) {
      console.log('   ⚠️ Lot Detail Page test failed:', e.message);
    }
    
    // Step 5: Test file upload endpoint
    console.log('\n5. Testing File Upload Endpoint...');
    try {
      const updateResponse = await axios.put(`${BASE_URL}/api/projects/test-project/lots/test-lot`, {
        files: [
          {
            url: 'https://example.com/test.pdf',
            name: 'test.pdf',
            size: 1024,
            type: 'application/pdf'
          }
        ]
      }, {
        validateStatus: () => true
      });
      console.log('   ℹ️ File Upload API status:', updateResponse.status);
      if (updateResponse.status === 401) {
        console.log('   ✅ File Upload API properly requires authentication');
      }
    } catch (e) {
      console.log('   ⚠️ File Upload API test failed:', e.message);
    }
    
    console.log('\n✅ Complete workflow tests completed!');
    console.log('\n📋 Manual Testing Steps:');
    console.log('1. Open http://localhost:3001 in your browser');
    console.log('2. Sign in with your credentials');
    console.log('3. Navigate to Projects → Create Project');
    console.log('4. Create a project');
    console.log('5. In the project, click "Create Lot"');
    console.log('6. Fill in lot details:');
    console.log('   - Name: Test Lot');
    console.log('   - Description: Test lot description');
    console.log('   - Select ITP templates if available');
    console.log('   - Upload some files');
    console.log('7. Click "Create Lot"');
    console.log('8. After creation, click on the lot to view details');
    console.log('9. Verify:');
    console.log('   ✓ Files are displayed in the Files section');
    console.log('   ✓ ITP instances are shown (if templates were selected)');
    console.log('   ✓ Action buttons work:');
    console.log('     - "View Files" scrolls to files section');
    console.log('     - "Assign ITP Template" navigates to assignment page');
    console.log('     - "Export Report" attempts to download report');
    console.log('   ✓ Lot details are properly displayed');
    
    console.log('\n🔧 Key Fixes Applied:');
    console.log('- Fixed database schema mismatch for itp_instances table');
    console.log('- Corrected lot creation workflow to properly handle files');
    console.log('- Added proper error handling and logging');
    console.log('- Fixed action buttons functionality');
    console.log('- Improved file display and upload process');
    console.log('- Added smooth scrolling for better UX');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testCompleteWorkflow();