const { chromium } = require('playwright');

async function testNCRCreation() {
  console.log('🎭 Starting Playwright NCR Test...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for headless mode
    devtools: true  // Opens DevTools automatically
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // Enable console logging
  page.on('console', msg => {
    if (msg.text().includes('Skipping') || msg.text().includes('NCR') || msg.text().includes('error')) {
      console.log('Browser console:', msg.text());
    }
  });
  
  // Monitor network requests
  page.on('request', request => {
    if (request.url().includes('/api/ncrs') && request.method() === 'POST') {
      console.log('📤 NCR POST Request:');
      console.log('   URL:', request.url());
      console.log('   Method:', request.method());
      const postData = request.postData();
      if (postData) {
        console.log('   Payload:', postData.substring(0, 500));
      }
    }
  });
  
  page.on('response', response => {
    if (response.url().includes('/api/ncrs') && response.request().method() === 'POST') {
      console.log('📥 NCR Response:');
      console.log('   Status:', response.status());
      response.text().then(body => {
        console.log('   Body:', body.substring(0, 500));
      }).catch(() => {});
    }
  });
  
  try {
    // Navigate to the site
    console.log('1️⃣ Navigating to site...');
    await page.goto('https://siteproof-v2-web.vercel.app', { 
      waitUntil: 'networkidle' 
    });
    
    // Check if we need to login
    const loginButton = await page.$('button:has-text("Sign in")');
    if (loginButton) {
      console.log('⚠️  Login required. Please login manually in the browser window.');
      console.log('   After logging in, navigate to the NCR creation page.');
      console.log('   Press Enter here when ready to continue...');
      
      // Wait for user to login manually
      await new Promise(resolve => {
        process.stdin.once('data', resolve);
      });
    }
    
    // Navigate to NCR creation (adjust URL as needed)
    console.log('2️⃣ Navigating to NCR creation page...');
    await page.goto('https://siteproof-v2-web.vercel.app/dashboard/ncrs/new', {
      waitUntil: 'networkidle'
    });
    
    // Wait for form to load
    await page.waitForSelector('input[name="title"]', { timeout: 10000 });
    
    // Fill the form
    console.log('3️⃣ Filling NCR form...');
    await page.fill('input[name="title"]', 'Test NCR from Playwright');
    await page.fill('textarea[name="description"]', 'This is a test NCR created by Playwright to debug the 500 error');
    
    // Select severity if it's a dropdown
    const severitySelect = await page.$('select[name="severity"]');
    if (severitySelect) {
      await page.selectOption('select[name="severity"]', 'medium');
    }
    
    // Select category
    const categorySelect = await page.$('select[name="category"]');
    if (categorySelect) {
      await page.selectOption('select[name="category"]', 'Quality');
    }
    
    // IMPORTANT: Leave contractor_id and assigned_to empty
    console.log('4️⃣ Leaving contractor and assigned_to fields empty...');
    
    // Take a screenshot before submitting
    await page.screenshot({ path: 'ncr-form-before-submit.png' });
    console.log('📸 Screenshot saved: ncr-form-before-submit.png');
    
    // Find and click submit button
    console.log('5️⃣ Submitting form...');
    const submitButton = await page.$('button[type="submit"]');
    if (submitButton) {
      await submitButton.click();
    } else {
      // Try alternative selectors
      await page.click('button:has-text("Create")');
    }
    
    // Wait for response
    console.log('6️⃣ Waiting for response...');
    await page.waitForTimeout(5000);
    
    // Take a screenshot after submitting
    await page.screenshot({ path: 'ncr-form-after-submit.png' });
    console.log('📸 Screenshot saved: ncr-form-after-submit.png');
    
    // Check for error messages
    const errorMessage = await page.$('.error-message, .toast-error, [role="alert"]');
    if (errorMessage) {
      const errorText = await errorMessage.textContent();
      console.log('❌ Error message found:', errorText);
    }
    
    console.log('\n✅ Test complete! Check the screenshots and console output above.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: 'ncr-test-error.png' });
  } finally {
    console.log('\nPress Ctrl+C to close the browser...');
    // Keep browser open for inspection
    await new Promise(() => {});
  }
}

// Run the test
testNCRCreation().catch(console.error);