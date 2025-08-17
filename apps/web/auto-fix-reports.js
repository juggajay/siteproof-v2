#!/usr/bin/env node

const http = require('http');

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function autoFixReports() {
  console.log('Auto-fixing stuck reports...\n');

  // First, fetch current reports to trigger auto-fix
  console.log('1. Fetching reports (this will auto-fix stuck ones)...');

  try {
    const fetchOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/reports?limit=100',
      method: 'GET',
      rejectUnauthorized: false,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const response = await makeRequest(fetchOptions);

    if (response.status === 200 && response.data.reports) {
      const reports = response.data.reports;
      console.log(`   Found ${reports.length} total reports`);

      const stuckReports = reports.filter(
        (r) => r.status === 'queued' || r.status === 'processing'
      );

      if (stuckReports.length > 0) {
        console.log(`   Found ${stuckReports.length} stuck reports`);
        console.log('   Auto-fix should have been triggered\n');

        // Wait and fetch again to verify
        console.log('2. Waiting 2 seconds and checking again...');
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const response2 = await makeRequest(fetchOptions);
        if (response2.status === 200 && response2.data.reports) {
          const stillStuck = response2.data.reports.filter(
            (r) => r.status === 'queued' || r.status === 'processing'
          );

          if (stillStuck.length === 0) {
            console.log('   ✅ All reports fixed successfully!');
          } else {
            console.log(`   ⚠️ ${stillStuck.length} reports still stuck`);
          }
        }
      } else {
        console.log('   ✅ No stuck reports found!');
      }
    } else {
      console.log('   Could not fetch reports. You may need to login first.');
    }
  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease make sure the app is running at http://localhost:3000');
  }
}

// Run the auto-fix
autoFixReports();
