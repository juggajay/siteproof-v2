#!/usr/bin/env node
/**
 * Test script to verify ITP display issue is fixed
 * This tests that ITPs are properly fetched and displayed after assignment
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

// Test IDs from your current session
const PROJECT_ID = '217523b8-6dd7-4d94-b876-e41879d07970';
const LOT_ID = '74bec425-61e5-4bcb-9ac5-ee160684a8c3';

async function fetchWithAuth(url, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers,
      credentials: 'include', // Include cookies for auth
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error(`Error ${response.status}:`, errorData);
      return { error: `HTTP ${response.status}`, data: null };
    }
    
    const data = await response.json();
    return { error: null, data };
  } catch (error) {
    console.error('Fetch error:', error.message);
    return { error: error.message, data: null };
  }
}

async function testITPFetching() {
  console.log('=== Testing ITP Display Fix ===\n');
  
  // Step 1: Fetch ITP instances for the lot
  console.log('Step 1: Fetching ITP instances for lot...');
  const itpUrl = `/api/projects/${PROJECT_ID}/lots/${LOT_ID}/itp`;
  const { error: fetchError, data: itpData } = await fetchWithAuth(itpUrl);
  
  if (fetchError) {
    console.error('❌ Failed to fetch ITP instances:', fetchError);
    return false;
  }
  
  console.log('✅ Successfully fetched ITP endpoint');
  console.log('Response structure:', {
    hasInstances: !!itpData.instances,
    instanceCount: itpData.instances?.length || 0,
  });
  
  // Step 2: Verify response structure
  console.log('\nStep 2: Verifying response structure...');
  
  if (!itpData.instances || !Array.isArray(itpData.instances)) {
    console.error('❌ Response missing "instances" array');
    console.log('Actual response:', JSON.stringify(itpData, null, 2));
    return false;
  }
  
  console.log(`✅ Found ${itpData.instances.length} ITP instance(s)`);
  
  // Step 3: Check each instance has template data
  console.log('\nStep 3: Checking template data in instances...');
  
  let hasTemplateData = true;
  itpData.instances.forEach((instance, index) => {
    console.log(`\nInstance ${index + 1}:`);
    console.log(`  - ID: ${instance.id}`);
    console.log(`  - Template ID: ${instance.template_id}`);
    console.log(`  - Status: ${instance.inspection_status || 'N/A'}`);
    console.log(`  - Has template data: ${!!instance.itp_templates}`);
    
    if (instance.itp_templates) {
      console.log(`  - Template name: ${instance.itp_templates.name}`);
      console.log(`  - Template category: ${instance.itp_templates.category || 'N/A'}`);
      console.log(`  - Has structure: ${!!instance.itp_templates.structure}`);
    } else {
      console.error(`  ❌ Missing itp_templates data!`);
      hasTemplateData = false;
    }
  });
  
  if (!hasTemplateData) {
    console.error('\n❌ Some instances are missing template data');
    return false;
  }
  
  console.log('\n✅ All instances have proper template data');
  
  // Step 4: Verify data structure for display
  console.log('\nStep 4: Verifying data structure for frontend display...');
  
  const firstInstance = itpData.instances[0];
  if (firstInstance) {
    const requiredFields = ['id', 'template_id', 'lot_id', 'data'];
    const templateRequiredFields = ['id', 'name', 'structure'];
    
    const missingFields = requiredFields.filter(field => !(field in firstInstance));
    if (missingFields.length > 0) {
      console.error('❌ Instance missing required fields:', missingFields);
      return false;
    }
    
    if (firstInstance.itp_templates) {
      const missingTemplateFields = templateRequiredFields.filter(
        field => !(field in firstInstance.itp_templates)
      );
      if (missingTemplateFields.length > 0) {
        console.error('❌ Template missing required fields:', missingTemplateFields);
        return false;
      }
    }
    
    console.log('✅ All required fields present for display');
  }
  
  console.log('\n=== Test Results ===');
  console.log('✅ ITP display fix is working correctly!');
  console.log('ITPs should now be visible in the lot detail page.');
  
  return true;
}

// Run the test
testITPFetching()
  .then(success => {
    if (success) {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('\n❌ Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });