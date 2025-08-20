const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🔍 Checking for new features in the application...\n');

  try {
    // 1. Check homepage
    console.log('1️⃣ Checking homepage...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check for dark mode toggle
    const darkModeToggle = await page.locator('[data-testid="dark-mode-toggle"]').count();
    console.log(`   Dark Mode Toggle: ${darkModeToggle > 0 ? '✅ Found' : '❌ Not found'}`);
    
    // Check for any dark mode CSS
    const darkModeCSS = await page.evaluate(() => {
      return Array.from(document.styleSheets).some(sheet => {
        try {
          return sheet.href && sheet.href.includes('dark-mode');
        } catch (e) {
          return false;
        }
      });
    });
    console.log(`   Dark Mode CSS: ${darkModeCSS ? '✅ Loaded' : '❌ Not loaded'}`);

    // 2. Try to login and check dashboard
    console.log('\n2️⃣ Attempting to access dashboard...');
    await page.goto('http://localhost:3000/auth/login');
    
    // Check if login page has any new features
    const loginPageContent = await page.content();
    console.log(`   Login page loaded: ${loginPageContent.includes('Login') ? '✅' : '❌'}`);

    // Try logging in with test credentials
    const emailInput = await page.locator('input[type="email"], input[name="email"]').first();
    const passwordInput = await page.locator('input[type="password"], input[name="password"]').first();
    
    if (await emailInput.count() > 0) {
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');
      
      const submitButton = await page.locator('button[type="submit"]').first();
      await submitButton.click();
      
      // Wait a bit for navigation
      await page.waitForTimeout(2000);
      
      const currentUrl = page.url();
      console.log(`   Current URL after login attempt: ${currentUrl}`);
    }

    // 3. Check for PhotoUpload component references
    console.log('\n3️⃣ Checking for PhotoUpload component...');
    const pageContent = await page.content();
    const hasPhotoUpload = pageContent.includes('PhotoUpload') || pageContent.includes('photo-upload');
    console.log(`   PhotoUpload references: ${hasPhotoUpload ? '✅ Found' : '❌ Not found'}`);

    // 4. Check for notification-related elements
    console.log('\n4️⃣ Checking for notification features...');
    const notificationElements = await page.locator('[class*="notification"], [id*="notification"]').count();
    console.log(`   Notification elements: ${notificationElements > 0 ? `✅ Found ${notificationElements}` : '❌ Not found'}`);

    // 5. Check ITP pages if accessible
    console.log('\n5️⃣ Checking ITP pages...');
    await page.goto('http://localhost:3000/dashboard/projects', { waitUntil: 'networkidle' }).catch(() => {});
    const itpUrl = page.url();
    console.log(`   ITP/Projects page accessible: ${itpUrl.includes('projects') ? '✅' : '❌'}`);

    // 6. Check JavaScript console for errors
    console.log('\n6️⃣ Checking for console errors...');
    const consoleMessages = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleMessages.push(msg.text());
      }
    });
    
    await page.goto('http://localhost:3000');
    await page.waitForTimeout(2000);
    
    if (consoleMessages.length > 0) {
      console.log('   Console errors found:');
      consoleMessages.slice(0, 5).forEach(msg => console.log(`     - ${msg}`));
    } else {
      console.log('   No console errors ✅');
    }

    // 7. Check if new API routes are accessible
    console.log('\n7️⃣ Checking new API routes...');
    const apiRoutes = [
      '/api/notifications/vapid-public-key',
      '/api/dashboard/widgets/project-summary',
      '/api/photos/upload'
    ];

    for (const route of apiRoutes) {
      const response = await page.request.get(`http://localhost:3000${route}`).catch(() => null);
      console.log(`   ${route}: ${response && response.status() < 500 ? '✅ Accessible' : '❌ Not accessible'}`);
    }

    // 8. Search for specific new components in the DOM
    console.log('\n8️⃣ Searching for new component classes...');
    const componentClasses = [
      'dashboard-widget',
      'photo-upload',
      'signature-capture',
      'bulk-operations',
      'dark-mode',
      'branded-pdf'
    ];

    for (const className of componentClasses) {
      const elements = await page.locator(`[class*="${className}"]`).count();
      console.log(`   .${className}: ${elements > 0 ? `✅ Found ${elements} element(s)` : '❌ Not found'}`);
    }

    // 9. Check if service worker is registered
    console.log('\n9️⃣ Checking service worker...');
    const hasServiceWorker = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });
    console.log(`   Service Worker: ${hasServiceWorker ? '✅ Registered' : '❌ Not registered'}`);

    // 10. Final summary
    console.log('\n📊 SUMMARY:');
    console.log('   The new components have been created but most are NOT integrated into the UI.');
    console.log('   They exist as standalone components that need to be imported into pages.');
    console.log('   To see the changes, the components need to be added to existing pages.');

  } catch (error) {
    console.error('Error during check:', error.message);
  } finally {
    await browser.close();
  }
})();