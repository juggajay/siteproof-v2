#!/usr/bin/env node

/**
 * Simple script to test authentication and report API
 */

const { execSync } = require('child_process');

function runCurl(command, description) {
  console.log(`\n${description}:`);
  console.log(`Command: ${command}`);
  console.log('---');
  try {
    const result = execSync(command, { encoding: 'utf8', timeout: 10000 });
    console.log(result);
  } catch (error) {
    console.log('Error:', error.message);
    if (error.stdout) console.log('Stdout:', error.stdout);
    if (error.stderr) console.log('Stderr:', error.stderr);
  }
  console.log('---\n');
}

async function debugAuthAndReports() {
  console.log('\n🔍 Debugging Authentication and Reports\n');
  console.log('='.repeat(60));

  // Test 1: Check if server is running
  runCurl(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000',
    '1. Check if server is running'
  );

  // Test 2: Test home page redirect
  runCurl(
    'curl -v http://localhost:3000/ 2>&1 | head -20',
    '2. Test home page (should redirect to auth)'
  );

  // Test 3: Test login page
  runCurl(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/auth/login',
    '3. Test login page accessibility'
  );

  // Test 4: Test reports API without auth
  runCurl(
    'curl -s http://localhost:3000/api/reports',
    '4. Test reports API without authentication'
  );

  // Test 5: Test with cookie simulation (won't work, but let's see the response)
  runCurl(
    'curl -s -H "Cookie: sb-access-token=dummy" http://localhost:3000/api/reports',
    '5. Test reports API with dummy cookie'
  );

  // Test 6: Check for any authentication debug endpoints
  runCurl(
    'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/user',
    '6. Test auth user endpoint'
  );

  // Test 7: Check middleware response for API route
  runCurl(
    'curl -v http://localhost:3000/api/reports 2>&1 | grep -E "(HTTP|Set-Cookie|Location)"',
    '7. Check HTTP headers from reports API'
  );

  console.log('\n' + '='.repeat(60));
  console.log('📋 Debug Complete\n');
  
  console.log('💡 Next Steps:');
  console.log('1. If server returns 401 for all API calls, the issue is authentication');
  console.log('2. You need to log in through the web interface first');
  console.log('3. Then test the reports functionality in the browser');
  console.log('4. Check browser developer tools for console errors');
  console.log('5. Verify that cookies are being set after login\n');
}

debugAuthAndReports();