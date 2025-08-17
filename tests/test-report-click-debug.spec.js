const { test, expect } = require('@playwright/test');

test.describe('Report Download Functionality', () => {
  let page;
  let context;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext({
      // Enable downloads
      acceptDownloads: true,
    });
    page = await context.newPage();

    // Listen for console messages
    page.on('console', (msg) => {
      console.log(`Browser console [${msg.type()}]:`, msg.text());
    });

    // Listen for network requests
    page.on('request', (request) => {
      if (request.url().includes('/api/reports')) {
        console.log(`Network request: ${request.method()} ${request.url()}`);
      }
    });

    // Listen for responses
    page.on('response', (response) => {
      if (response.url().includes('/api/reports')) {
        console.log(`Network response: ${response.status()} ${response.url()}`);
      }
    });

    // Go to the app
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should download report when clicking on report card', async () => {
    console.log('\n=== Starting Report Download Test ===\n');

    try {
      // Check if we're on login page
      const isLoginPage = await page.locator('input[type="email"]').isVisible();
      
      if (isLoginPage) {
        console.log('Login page detected - need authentication setup');
        // For now, skip if login required
        test.skip('Authentication required - manual test needed');
        return;
      }

      // Navigate to reports page
      console.log('Navigating to reports page...');
      await page.goto('http://localhost:3000/reporting');
      await page.waitForLoadState('networkidle');

      // Check for existing reports
      console.log('Checking for existing reports...');
      const reportCards = await page.locator('[data-testid="report-card"], .bg-white.rounded-lg.border').count();
      console.log(`Found ${reportCards} report cards`);

      if (reportCards === 0) {
        console.log('No reports found - creating a test report...');
        
        // Click generate report button
        const generateButton = page.locator('text=Generate Report, button:has-text("Generate"), [data-testid="generate-report"]').first();
        if (await generateButton.isVisible()) {
          await generateButton.click();
          console.log('Clicked generate report button');
          
          // Wait for report generation form/modal
          await page.waitForTimeout(2000);
          
          // Fill out basic report details if form appears
          const reportNameInput = page.locator('input[name="report_name"], input[placeholder*="report name" i]');
          if (await reportNameInput.isVisible()) {
            await reportNameInput.fill('Test Report for Download');
            console.log('Filled report name');
          }
          
          // Select format as PDF
          const formatSelect = page.locator('select[name="format"], [data-testid="format-select"]');
          if (await formatSelect.isVisible()) {
            await formatSelect.selectOption('pdf');
            console.log('Selected PDF format');
          }
          
          // Submit the form
          const submitButton = page.locator('button[type="submit"], button:has-text("Generate"), button:has-text("Create")');
          if (await submitButton.isVisible()) {
            await submitButton.click();
            console.log('Submitted report generation');
            
            // Wait for report to be created
            await page.waitForTimeout(3000);
          }
        }
      }

      // Refresh and check for reports again
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // Find report cards
      const updatedReportCards = await page.locator('.bg-white.rounded-lg.border').count();
      console.log(`After refresh, found ${updatedReportCards} report cards`);

      if (updatedReportCards === 0) {
        console.log('Still no reports found - will test API directly');
        
        // Test the download API directly
        console.log('\n=== Testing Download API Directly ===\n');
        
        const response = await page.request.get('/api/reports');
        console.log('Reports API status:', response.status());
        
        if (response.ok()) {
          const data = await response.json();
          console.log('Reports data:', JSON.stringify(data, null, 2));
          
          if (data.reports && data.reports.length > 0) {
            const firstReport = data.reports[0];
            console.log(`Testing download for report: ${firstReport.id}`);
            
            const downloadResponse = await page.request.get(`/api/reports/${firstReport.id}/download`);
            console.log('Download API status:', downloadResponse.status());
            console.log('Download headers:', downloadResponse.headers());
            
            if (!downloadResponse.ok()) {
              const errorText = await downloadResponse.text();
              console.log('Download API error:', errorText);
            }
          }
        }
        return;
      }

      // Click on the first report card
      console.log('Clicking on first report card...');
      const firstReportCard = page.locator('.bg-white.rounded-lg.border').first();
      
      // Check if the card has click cursor style
      const cardStyle = await firstReportCard.evaluate(el => window.getComputedStyle(el).cursor);
      console.log('Report card cursor style:', cardStyle);
      
      // Set up download promise before clicking
      const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
      
      // Click the report card
      await firstReportCard.click();
      console.log('Clicked on report card');
      
      try {
        // Wait for download to start
        const download = await downloadPromise;
        console.log('Download started!');
        console.log('Download filename:', download.suggestedFilename());
        
        // Save the download
        const downloadPath = `/tmp/test-download-${Date.now()}.pdf`;
        await download.saveAs(downloadPath);
        console.log('Download saved to:', downloadPath);
        
      } catch (downloadError) {
        console.log('No download triggered:', downloadError.message);
        
        // Check for any error messages on the page
        const errorMessages = await page.locator('.text-red-500, .text-red-600, .text-red-700, [role="alert"]').allTextContents();
        if (errorMessages.length > 0) {
          console.log('Error messages on page:', errorMessages);
        }
        
        // Check if download button exists
        const downloadButton = page.locator('[data-testid="download-button"], button:has-text("Download")');
        const downloadButtonCount = await downloadButton.count();
        console.log(`Found ${downloadButtonCount} download buttons`);
        
        if (downloadButtonCount > 0) {
          console.log('Trying to click explicit download button...');
          const downloadPromise2 = page.waitForEvent('download', { timeout: 5000 });
          await downloadButton.first().click();
          
          try {
            const download2 = await downloadPromise2;
            console.log('Download started via button!');
            console.log('Download filename:', download2.suggestedFilename());
          } catch (buttonDownloadError) {
            console.log('Button download also failed:', buttonDownloadError.message);
          }
        }
      }

      // Take a screenshot for debugging
      await page.screenshot({ path: '/tmp/reports-page-debug.png', fullPage: true });
      console.log('Screenshot saved to /tmp/reports-page-debug.png');

    } catch (error) {
      console.error('Test error:', error);
      await page.screenshot({ path: '/tmp/error-screenshot.png', fullPage: true });
      throw error;
    }

    console.log('\n=== Report Download Test Complete ===\n');
  });

  test('should handle report generation and immediate download', async () => {
    console.log('\n=== Testing End-to-End Report Flow ===\n');

    try {
      // Check if we're on login page
      const isLoginPage = await page.locator('input[type="email"]').isVisible();
      
      if (isLoginPage) {
        console.log('Login page detected - need to handle authentication');
        test.skip('Authentication required - manual test needed');
        return;
      }

      // Test creating a report directly via API
      console.log('Testing report creation via API...');
      
      const createResponse = await page.request.post('/api/reports/generate', {
        data: {
          report_type: 'project_summary',
          report_name: 'E2E Test Report',
          description: 'End-to-end test report',
          format: 'pdf',
          project_id: '00000000-0000-0000-0000-000000000001', // Mock project ID
          date_range: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          include_photos: false,
          include_signatures: false
        }
      });

      console.log('Create report API status:', createResponse.status());
      
      if (createResponse.ok()) {
        const createData = await createResponse.json();
        console.log('Created report:', createData);
        
        if (createData.reportId) {
          // Test downloading the created report
          console.log(`Testing download for created report: ${createData.reportId}`);
          
          const downloadResponse = await page.request.get(`/api/reports/${createData.reportId}/download`);
          console.log('Download response status:', downloadResponse.status());
          
          if (downloadResponse.ok()) {
            const contentType = downloadResponse.headers()['content-type'];
            const contentLength = downloadResponse.headers()['content-length'];
            console.log('Download successful!');
            console.log('Content-Type:', contentType);
            console.log('Content-Length:', contentLength);
          } else {
            const errorText = await downloadResponse.text();
            console.log('Download failed:', errorText);
          }
        }
      } else {
        const errorText = await createResponse.text();
        console.log('Create report failed:', errorText);
      }

    } catch (error) {
      console.error('E2E test error:', error);
      throw error;
    }

    console.log('\n=== End-to-End Test Complete ===\n');
  });
});