/**
 * Validate ITP Pass/Fail/N/A Button Fix
 * 
 * This script tests the fix for the item ID generation issue where
 * JSONB field names were being used instead of real inspection items.
 */

const { chromium } = require('playwright');

async function validateItpFix() {
  console.log('🧪 Testing ITP Pass/Fail/N/A button fix - Item ID generation');
  console.log('===============================================================');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 } // Mobile viewport
  });
  const page = await context.newPage();

  // Capture console logs to validate item IDs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    
    if (text.includes('getItpItems') || 
        text.includes('PASS button clicked') ||
        text.includes('FAIL button clicked') ||
        text.includes('N/A button clicked') ||
        text.includes('handleStatusChange') ||
        text.includes('Found') ||
        text.includes('Could not find')) {
      console.log(`📱 MOBILE: ${text}`);
    }
  });

  try {
    // Step 1: Navigate to application
    console.log('1️⃣ Navigating to application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check if login is needed
    const needsLogin = await page.locator('input[type="email"], button:has-text("Login"), button:has-text("Sign In")').first().isVisible();
    if (needsLogin) {
      console.log('🔐 Please login manually to continue the test...');
      await page.pause();
    }
    
    // Step 2: Navigate to projects
    console.log('2️⃣ Finding and navigating to a project...');
    await page.locator('a[href*="/dashboard/projects"]').first().click();
    await page.waitForLoadState('networkidle');
    
    const projects = await page.locator('a[href*="/projects/"]').all();
    if (projects.length === 0) {
      console.log('❌ No projects found. Please create a project first.');
      return;
    }
    
    await projects[0].click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to project');
    
    // Step 3: Navigate to a lot
    console.log('3️⃣ Finding and navigating to a lot...');
    const lots = await page.locator('a[href*="/lots/"]').all();
    if (lots.length === 0) {
      console.log('❌ No lots found. Please create a lot first.');
      return;
    }
    
    await lots[0].click();
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to lot');
    
    // Step 4: Check if ITP already exists or add one
    console.log('4️⃣ Checking for existing ITPs or adding new one...');
    const existingItps = await page.locator('.bg-white.rounded-lg.shadow-sm.border').all();
    
    if (existingItps.length === 0) {
      // Add an ITP
      console.log('📋 Adding a new ITP template...');
      const addItpButton = await page.locator('button:has-text("Add ITP")').first();
      if (await addItpButton.isVisible()) {
        await addItpButton.click();
        await page.waitForTimeout(1000);
        
        // Select first available template
        const templates = await page.locator('button[class*="p-4"][class*="text-left"]').all();
        if (templates.length > 0) {
          await templates[0].click();
          await page.waitForLoadState('networkidle');
          console.log('✅ ITP template assigned');
        } else {
          console.log('❌ No templates available');
          return;
        }
      }
    }
    
    // Step 5: Expand ITP to see inspection items
    console.log('5️⃣ Expanding ITP to reveal inspection items...');
    await page.waitForTimeout(2000);
    const itpCards = await page.locator('.bg-white.rounded-lg.shadow-sm.border').all();
    
    if (itpCards.length === 0) {
      console.log('❌ No ITP cards found after adding template');
      return;
    }
    
    // Click to expand
    await itpCards[0].click();
    await page.waitForTimeout(2000);
    
    // Step 6: Analyze inspection items and button behavior
    console.log('6️⃣ Testing Pass/Fail/N/A buttons and item ID generation...');
    
    const passButtons = await page.locator('button:has-text("PASS")').all();
    const failButtons = await page.locator('button:has-text("FAIL")').all();
    const naButtons = await page.locator('button:has-text("N/A")').all();
    
    console.log(`Found ${passButtons.length} PASS buttons`);
    console.log(`Found ${failButtons.length} FAIL buttons`);
    console.log(`Found ${naButtons.length} N/A buttons`);
    
    if (passButtons.length === 0) {
      console.log('❌ No Pass/Fail/N/A buttons found - ITP may not be properly expanded');
      return;
    }
    
    // Test each button type
    const testResults = {
      passButton: false,
      failButton: false,
      naButton: false,
      validItemIds: [],
      invalidItemIds: []
    };
    
    // Clear console logs before tests
    consoleLogs.length = 0;
    
    // Test PASS button
    console.log('🟢 Testing PASS button...');
    await passButtons[0].click();
    await page.waitForTimeout(1500);
    
    // Test FAIL button
    if (failButtons.length > 0) {
      console.log('🔴 Testing FAIL button...');
      await failButtons[0].click();
      await page.waitForTimeout(1500);
    }
    
    // Test N/A button
    if (naButtons.length > 0) {
      console.log('⚪ Testing N/A button...');
      await naButtons[0].click();
      await page.waitForTimeout(1500);
    }
    
    // Step 7: Analyze results
    console.log('7️⃣ Analyzing test results...');
    console.log('==========================');
    
    // Check console logs for validation
    const itemIdPattern = /(?:PASS|FAIL|N\/A) button clicked for item: (.+)/;
    const statusChangePattern = /handleStatusChange called: Item (.+) status changed to/;
    const errorPattern = /Could not find ITP instance for item: (.+)/;
    
    let foundValidItemIds = 0;
    let foundInvalidItemIds = 0;
    let foundErrors = 0;
    
    consoleLogs.forEach(log => {
      const itemMatch = log.match(itemIdPattern);
      const statusMatch = log.match(statusChangePattern);
      const errorMatch = log.match(errorPattern);
      
      if (itemMatch) {
        const itemId = itemMatch[1];
        if (['overall_status', 'completion_percentage', 'inspection_results'].includes(itemId)) {
          foundInvalidItemIds++;
          console.log(`❌ Invalid item ID detected: ${itemId}`);
        } else {
          foundValidItemIds++;
          console.log(`✅ Valid item ID detected: ${itemId}`);
        }
      }
      
      if (errorMatch) {
        foundErrors++;
        console.log(`❌ Error: ${log}`);
      }
    });
    
    // Summary
    console.log('\\n📊 Test Summary:');
    console.log('================');
    console.log(`✅ Valid item IDs found: ${foundValidItemIds}`);
    console.log(`❌ Invalid item IDs found: ${foundInvalidItemIds}`);
    console.log(`⚠️ Errors found: ${foundErrors}`);
    
    if (foundValidItemIds > 0 && foundInvalidItemIds === 0 && foundErrors === 0) {
      console.log('\\n🎉 SUCCESS: ITP button fix is working correctly!');
      console.log('   - Real inspection items are being used');
      console.log('   - No JSONB field names detected as item IDs');
      console.log('   - No "Could not find ITP instance" errors');
    } else if (foundInvalidItemIds > 0) {
      console.log('\\n⚠️ PARTIAL FIX: Still detecting JSONB field names as item IDs');
      console.log('   - Need to check template structure parsing');
    } else if (foundErrors > 0) {
      console.log('\\n❌ ERRORS: Item ID lookup is still failing');
      console.log('   - Check handleStatusChange logic');
    } else {
      console.log('\\n🔍 INCONCLUSIVE: No clear results detected');
      console.log('   - Check console logging or button click handling');
    }
    
    console.log('\\n📱 Press any key to close browser...');
    await page.pause();
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await browser.close();
  }
}

// Run the validation
if (require.main === module) {
  validateItpFix().catch(console.error);
}

module.exports = { validateItpFix };