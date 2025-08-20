#!/usr/bin/env node

/**
 * Test NCR API endpoint to verify validation fixes
 * Tests empty UUID fields (contractor_id, assigned_to, lot_id)
 */

const testNCRCreation = async () => {
  const API_URL = process.env.API_URL || 'http://localhost:3000';

  // Test data with intentionally empty optional fields
  const testCases = [
    {
      name: 'NCR without contractor_id',
      data: {
        title: 'Test NCR - No Contractor',
        description: 'Testing NCR creation without contractor_id field',
        severity: 'medium',
        category: 'Quality',
        project_id: process.env.TEST_PROJECT_ID || 'YOUR_PROJECT_ID',
        tags: ['test', 'validation'],
      },
    },
    {
      name: 'NCR with empty strings (should be filtered)',
      data: {
        title: 'Test NCR - Empty Strings',
        description: 'Testing NCR creation with empty string fields that should be filtered',
        severity: 'high',
        category: 'Safety',
        project_id: process.env.TEST_PROJECT_ID || 'YOUR_PROJECT_ID',
        contractor_id: '', // Should be filtered out
        assigned_to: '', // Should be filtered out
        location: '', // Should be filtered out
        tags: ['test', 'empty-fields'],
      },
    },
    {
      name: 'NCR with all optional fields',
      data: {
        title: 'Test NCR - Complete',
        description: 'Testing NCR creation with all fields properly filled',
        severity: 'critical',
        category: 'Environmental',
        project_id: process.env.TEST_PROJECT_ID || 'YOUR_PROJECT_ID',
        location: 'Building A - Floor 3',
        trade: 'Electrical',
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        tags: ['test', 'complete'],
      },
    },
  ];

  console.log('🧪 Testing NCR API Validation Fixes\n');
  console.log(`📍 API URL: ${API_URL}\n`);

  for (const testCase of testCases) {
    console.log(`\n📋 Test: ${testCase.name}`);
    console.log('━'.repeat(50));

    // Create FormData
    const formData = new FormData();
    Object.entries(testCase.data).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'tags') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    // Log what we're sending
    console.log('📤 Sending:');
    for (const [key, value] of formData.entries()) {
      console.log(`   ${key}: ${value}`);
    }

    try {
      const response = await fetch(`${API_URL}/api/ncrs`, {
        method: 'POST',
        body: formData,
        headers: {
          // Add auth header if needed
          // 'Authorization': `Bearer ${process.env.AUTH_TOKEN}`
        },
      });

      const result = await response.json();

      if (response.ok) {
        console.log('✅ SUCCESS:', result.message || 'NCR created');
        if (result.ncr) {
          console.log(`   NCR Number: ${result.ncr.ncr_number}`);
          console.log(`   ID: ${result.ncr.id}`);
        }
      } else {
        console.log('❌ FAILED:', result.error || 'Unknown error');
        if (result.details) {
          console.log('   Details:', result.details);
        }
      }
    } catch (error) {
      console.log('❌ ERROR:', error.message);
    }
  }

  console.log('\n' + '═'.repeat(50));
  console.log('🏁 Tests Complete\n');

  console.log('💡 Tips:');
  console.log('   - Set TEST_PROJECT_ID env var with a valid project UUID');
  console.log('   - Set AUTH_TOKEN if authentication is required');
  console.log('   - Set API_URL to test against production');
  console.log('\nExample:');
  console.log(
    '   TEST_PROJECT_ID="uuid-here" API_URL="https://siteproof-v2-web.vercel.app" node scripts/test-ncr-api.js'
  );
};

// Only run if executed directly
if (require.main === module) {
  testNCRCreation().catch(console.error);
}

module.exports = { testNCRCreation };
