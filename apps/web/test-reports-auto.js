#!/usr/bin/env node

const { chromium } = require('playwright');

async function testReports() {
  console.log('Starting automated report testing...');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    // Enable console logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    console.log('1. Navigating to localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });

    // Check if we need to login
    if (page.url().includes('/auth/login') || page.url().includes('/login')) {
      console.log('2. Login page detected, attempting login...');

      // Try to find and fill email field
      const emailInput = await page.$(
        'input[type="email"], input[name="email"], input[id="email"]'
      );
      if (emailInput) {
        await emailInput.fill('test@siteproof.com');
        console.log('   - Email filled');
      }

      // Try to find and fill password field
      const passwordInput = await page.$(
        'input[type="password"], input[name="password"], input[id="password"]'
      );
      if (passwordInput) {
        await passwordInput.fill('TestPassword123!');
        console.log('   - Password filled');
      }

      // Find and click submit button
      const submitButton = await page.$(
        'button[type="submit"], button:has-text("Sign In"), button:has-text("Log In"), button:has-text("Login")'
      );
      if (submitButton) {
        await submitButton.click();
        console.log('   - Login submitted');

        // Wait for navigation
        await page.waitForTimeout(3000);
      }
    }

    console.log('3. Navigating to reports page...');
    await page.goto('http://localhost:3000/dashboard/reports', { waitUntil: 'networkidle' });

    // Wait a bit for auto-fix to trigger
    await page.waitForTimeout(2000);

    console.log('4. Checking for reports...');

    // Check if reports API is being called
    const reportsResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/reports?limit=20');
        const data = await response.json();
        return data;
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('5. Reports API response:', JSON.stringify(reportsResponse, null, 2));

    if (reportsResponse.reports && reportsResponse.reports.length > 0) {
      console.log(`   - Found ${reportsResponse.reports.length} reports`);

      // Check for stuck reports
      const stuckReports = reportsResponse.reports.filter(
        (r) => r.status === 'queued' || r.status === 'processing'
      );

      if (stuckReports.length > 0) {
        console.log(
          `   - Found ${stuckReports.length} stuck reports, refreshing to trigger auto-fix...`
        );

        // Refresh page to trigger auto-fix
        await page.reload({ waitUntil: 'networkidle' });
        await page.waitForTimeout(2000);

        // Check again
        const updatedResponse = await page.evaluate(async () => {
          try {
            const response = await fetch('/api/reports?limit=20');
            const data = await response.json();
            return data;
          } catch (error) {
            return { error: error.message };
          }
        });

        const stillStuck =
          updatedResponse.reports?.filter(
            (r) => r.status === 'queued' || r.status === 'processing'
          ) || [];

        if (stillStuck.length === 0) {
          console.log('   ✓ All stuck reports have been auto-fixed!');
        } else {
          console.log(`   ⚠ ${stillStuck.length} reports still stuck`);
        }
      } else {
        console.log('   ✓ No stuck reports found');
      }

      // Try to download first completed report
      const completedReport = reportsResponse.reports.find((r) => r.status === 'completed');
      if (completedReport) {
        console.log(`6. Testing download for report: ${completedReport.id}`);

        const downloadResponse = await page.evaluate(async (reportId) => {
          try {
            const response = await fetch(`/api/reports/${reportId}/download`);
            return {
              status: response.status,
              ok: response.ok,
              contentType: response.headers.get('content-type'),
            };
          } catch (error) {
            return { error: error.message };
          }
        }, completedReport.id);

        console.log('   Download response:', downloadResponse);

        if (downloadResponse.ok) {
          console.log('   ✓ Report download endpoint working!');
        } else {
          console.log('   ⚠ Report download failed');
        }
      }
    } else {
      console.log('   - No reports found');
    }

    // Test report generation
    console.log('7. Testing report generation...');
    const generateResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/api/reports/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            report_type: 'project_summary',
            report_name: 'Test Report ' + Date.now(),
            format: 'pdf',
            project_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
            date_range: {
              start: '2024-01-01',
              end: '2024-12-31',
            },
          }),
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log('   Generate response:', JSON.stringify(generateResponse, null, 2));

    console.log('\n✅ Automated testing complete!');
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
testReports().catch(console.error);
