#!/usr/bin/env node

/**
 * Diagnostic script for NCR API 500 errors
 * Tests various scenarios to identify the root cause
 */

const diagnosticTests = async () => {
  const API_URL = process.env.API_URL || 'https://siteproof-v2-web.vercel.app';
  const AUTH_TOKEN = process.env.AUTH_TOKEN || '';
  
  console.log('🔍 NCR API Diagnostic Tests\n');
  console.log(`📍 API URL: ${API_URL}`);
  console.log(`🔑 Auth Token: ${AUTH_TOKEN ? 'Provided' : 'Not provided'}\n`);
  
  const tests = [
    {
      name: 'GET /api/ncrs without auth',
      endpoint: '/api/ncrs',
      method: 'GET',
      headers: {},
      expectedStatus: 401
    },
    {
      name: 'GET /api/ncrs with auth',
      endpoint: '/api/ncrs',
      method: 'GET',
      headers: AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {},
      expectedStatus: 200
    },
    {
      name: 'GET /api/ncrs with pagination',
      endpoint: '/api/ncrs?page=1&limit=10',
      method: 'GET',
      headers: AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {},
      expectedStatus: 200
    },
    {
      name: 'GET /api/ncrs with project_id filter',
      endpoint: '/api/ncrs?project_id=test-id',
      method: 'GET',
      headers: AUTH_TOKEN ? { 'Authorization': `Bearer ${AUTH_TOKEN}` } : {},
      expectedStatus: 200
    }
  ];
  
  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log('━'.repeat(50));
    
    try {
      const response = await fetch(`${API_URL}${test.endpoint}`, {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          ...test.headers
        }
      });
      
      const statusMatch = response.status === test.expectedStatus;
      console.log(`   Status: ${response.status} ${statusMatch ? '✅' : '❌'} (expected ${test.expectedStatus})`);
      
      if (!response.ok && response.status !== test.expectedStatus) {
        const errorText = await response.text();
        console.log(`   Error Response: ${errorText.substring(0, 200)}`);
        
        // Try to parse as JSON for more details
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            console.log(`   Error Message: ${errorJson.error}`);
          }
          if (errorJson.details) {
            console.log(`   Error Details: ${JSON.stringify(errorJson.details)}`);
          }
        } catch (e) {
          // Not JSON, already printed text
        }
      } else if (response.ok) {
        const data = await response.json();
        if (data.ncrs) {
          console.log(`   ✅ Success: Retrieved ${data.ncrs.length} NCRs`);
        } else if (data.error) {
          console.log(`   ❌ Error: ${data.error}`);
        }
      }
      
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '═'.repeat(50));
  console.log('🏁 Diagnostic Complete\n');
  
  console.log('💡 To run with authentication:');
  console.log('   1. Get a valid auth token from browser DevTools');
  console.log('   2. Look in Application > Cookies > sb-access-token');
  console.log('   3. Run: AUTH_TOKEN="your-token" node scripts/diagnose-ncr-error.js\n');
};

// Check if we can connect to Supabase directly
const checkSupabaseConnection = async () => {
  console.log('\n🔌 Checking Supabase Connection...');
  console.log('━'.repeat(50));
  
  try {
    // Check if Supabase URL is accessible
    const supabaseUrl = 'https://slzmbpntjoaltasfxiiv.supabase.co';
    const healthResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsem1icG50am9hbHRhc2Z4aWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEwNDYzNzYsImV4cCI6MjA2NjYyMjM3Nn0.5zedTH8_OkBMBG8fuC54bbqkwzwjU_NupvFK4Pg28eY'
      }
    });
    
    if (healthResponse.ok) {
      console.log('   ✅ Supabase API is accessible');
    } else {
      console.log(`   ❌ Supabase API returned status: ${healthResponse.status}`);
    }
  } catch (error) {
    console.log(`   ❌ Cannot reach Supabase: ${error.message}`);
  }
};

// Main execution
const main = async () => {
  await checkSupabaseConnection();
  await diagnosticTests();
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { diagnosticTests, checkSupabaseConnection };