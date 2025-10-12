// Complete ITP workflow test with Playwright
const { chromium } = require('playwright');

async function testCompleteITPWorkflow() {
  console.log('🚀 Starting complete ITP workflow test...\n');

  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000 // Slow down for observation
  });
  const page = await browser.newPage();

  // Enhanced logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ ERROR RESPONSE: ${response.status()} ${response.url()}`);
    } else if (response.url().includes('/api/')) {
      console.log(`✅ API RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Step 1: Login
    console.log('1️⃣ Logging in...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle' });
    await page.fill('input[name="email"]', 'jayson@jaysonryan.com.au');
    await page.fill('input[name="password"]', 'Jayson@2024');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard**');
    console.log('✅ Login successful');

    // Step 2: Navigate to project
    console.log('2️⃣ Navigating to project...');
    const projectId = '89253127-a60a-48a7-a511-ce89c316d3af';
    await page.goto(`http://localhost:3000/dashboard/projects/${projectId}`, { waitUntil: 'networkidle' });

    // Step 3: Create a new lot or navigate to existing lot
    console.log('3️⃣ Looking for existing lot or create new one...');
    const lotId = 'f497f453-fb01-49fe-967a-3182a61a5a1b';
    
    try {
      // Try to navigate to existing lot
      await page.goto(`http://localhost:3000/dashboard/projects/${projectId}/lots/${lotId}`, { waitUntil: 'networkidle' });
      console.log('✅ Navigated to existing lot');
    } catch (error) {
      console.log('⚠️  Lot not found, creating new one...');
      // Add lot creation logic here if needed
    }

    // Step 4: Check ITP section exists
    console.log('4️⃣ Checking for ITP section...');
    await page.waitForTimeout(3000); // Let page fully load
    
    // Look for ITP elements with multiple selectors
    const itpSection = await page.locator('text=ITP, text=Inspection, [data-testid*="itp"]').first();
    if (await itpSection.count() > 0) {
      console.log('✅ ITP section found');
    } else {
      console.log('⚠️  ITP section not visible, taking screenshot...');
      await page.screenshot({ path: 'debug-no-itp-section.png', fullPage: true });
    }

    // Step 5: Add ITP template
    console.log('5️⃣ Adding ITP template...');
    
    // Look for Add ITP button with multiple possible texts
    const addButtons = await page.locator('button:has-text("Add ITP"), button:has-text("Add"), button:has-text("Assign")');
    
    if (await addButtons.count() > 0) {
      await addButtons.first().click();
      console.log('✅ Add ITP button clicked');

      // Wait for template selection modal
      await page.waitForTimeout(2000);
      
      // Look for available templates
      const templateButtons = await page.locator('button:has-text("Asphalt"), button:has-text("Concrete"), button[data-testid*="template"]');
      
      if (await templateButtons.count() > 0) {
        await templateButtons.first().click();
        console.log('✅ Template selected');
        
        // Wait for assignment to complete
        await page.waitForTimeout(5000);
      } else {
        console.log('⚠️  No templates found');
        await page.screenshot({ path: 'debug-no-templates.png', fullPage: true });
      }
    } else {
      console.log('⚠️  Add ITP button not found');
      await page.screenshot({ path: 'debug-no-add-button.png', fullPage: true });
    }

    // Step 6: Interact with ITP items
    console.log('6️⃣ Testing ITP interaction...');
    
    // Look for ITP cards
    const itpCards = await page.locator('[data-testid="itp-card"], .mobile-itp-card, .itp-card');
    const cardCount = await itpCards.count();
    
    if (cardCount > 0) {
      console.log(`📝 Found ${cardCount} ITP cards`);
      
      // Click to expand first card
      await itpCards.first().click();
      await page.waitForTimeout(2000);
      
      // Look for Pass/Fail/N/A buttons
      const passButtons = await page.locator('button:has-text("PASS"), button:has-text("Pass")');
      const failButtons = await page.locator('button:has-text("FAIL"), button:has-text("Fail")');
      const naButtons = await page.locator('button:has-text("N/A"), button:has-text("NA")');
      
      console.log(`🟢 Found ${await passButtons.count()} PASS buttons`);
      console.log(`🔴 Found ${await failButtons.count()} FAIL buttons`);
      console.log(`⚪ Found ${await naButtons.count()} N/A buttons`);
      
      // Test clicking buttons
      if (await passButtons.count() > 0) {
        console.log('Testing PASS button...');
        await passButtons.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ PASS button clicked');
      }
      
      if (await failButtons.count() > 0) {
        console.log('Testing FAIL button...');
        await failButtons.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ FAIL button clicked');
      }
      
      if (await naButtons.count() > 0) {
        console.log('Testing N/A button...');
        await naButtons.first().click();
        await page.waitForTimeout(1000);
        console.log('✅ N/A button clicked');
      }
      
    } else {
      console.log('⚠️  No ITP cards found');
      await page.screenshot({ path: 'debug-no-itp-cards.png', fullPage: true });
    }

    // Step 7: Test report generation
    console.log('7️⃣ Testing report generation...');
    
    const exportButtons = await page.locator('button:has-text("Export"), button:has-text("Report"), button:has-text("Generate")');
    
    if (await exportButtons.count() > 0) {
      await exportButtons.first().click();
      console.log('✅ Export button clicked');
      await page.waitForTimeout(3000);
    } else {
      console.log('⚠️  Export button not found');
    }

    // Step 8: Final screenshot
    console.log('8️⃣ Taking final workflow screenshot...');
    await page.screenshot({ 
      path: 'complete-itp-workflow-result.png', 
      fullPage: true 
    });
    
    console.log('\n🎉 Complete ITP workflow test finished!');
    console.log('Screenshots saved for review.');

  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: 'itp-workflow-error.png', 
      fullPage: true 
    });
  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testCompleteITPWorkflow().catch(console.error);
}

module.exports = { testCompleteITPWorkflow };