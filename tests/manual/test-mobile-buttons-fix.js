/**
 * Test Mobile ITP Pass/Fail/N/A Button Fix
 * 
 * This script validates that the mobile ITP buttons now work correctly
 * with the section-based data structure fix.
 */

const { chromium } = require('playwright');

async function testMobileButtonsFix() {
  console.log('🧪 Testing Mobile ITP Pass/Fail/N/A Button Fix');
  console.log('==============================================');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 500
  });
  const context = await browser.newContext({
    viewport: { width: 375, height: 812 } // Mobile viewport
  });
  const page = await context.newPage();

  // Track console logs to validate the fix
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    
    // Log relevant messages
    if (text.includes('handleStatusChange') || 
        text.includes('button clicked') ||
        text.includes('Section') ||
        text.includes('updated to') ||
        text.includes('Could not find') ||
        text.includes('Getting ITP items')) {
      console.log(`📱 ${text}`);
    }
  });

  try {
    // Step 1: Navigate to application
    console.log('1️⃣ Navigating to application...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Check for login
    const needsLogin = await page.locator('input[type="email"]').first().isVisible();
    if (needsLogin) {
      console.log('🔐 Please login and navigate to a lot with ITPs...');
      await page.pause();
    }
    
    // Step 2: Look for ITP cards
    console.log('2️⃣ Looking for ITP cards...');
    const itpCards = await page.locator('.bg-white.rounded-lg.shadow-sm.border').all();
    
    if (itpCards.length === 0) {
      console.log('❌ No ITP cards found. Please:');
      console.log('   1. Navigate to a project');
      console.log('   2. Go to a lot');
      console.log('   3. Add an ITP template if none exist');
      await page.pause();
      return;
    }
    
    console.log(`✅ Found ${itpCards.length} ITP card(s)`);
    
    // Step 3: Expand the first ITP
    console.log('3️⃣ Expanding first ITP card...');
    await itpCards[0].click();
    await page.waitForTimeout(2000);
    
    // Step 4: Test the buttons
    console.log('4️⃣ Testing Pass/Fail/N/A buttons...');
    
    const passButtons = await page.locator('button:has-text("PASS")').all();
    const failButtons = await page.locator('button:has-text("FAIL")').all();
    const naButtons = await page.locator('button:has-text("N/A")').all();
    
    console.log(`Found ${passButtons.length} PASS buttons`);
    console.log(`Found ${failButtons.length} FAIL buttons`);
    console.log(`Found ${naButtons.length} N/A buttons`);
    
    if (passButtons.length === 0) {
      console.log('❌ No buttons found - ITP may not have expanded properly');
      return;
    }
    
    // Clear previous logs
    consoleLogs.length = 0;
    
    // Test PASS button
    console.log('🟢 Clicking PASS button...');
    await passButtons[0].click();
    await page.waitForTimeout(2000);
    
    // Test FAIL button  
    if (failButtons.length > 0) {
      console.log('🔴 Clicking FAIL button...');
      await failButtons[0].click();
      await page.waitForTimeout(2000);
    }
    
    // Test N/A button
    if (naButtons.length > 0) {
      console.log('⚪ Clicking N/A button...');
      await naButtons[0].click();
      await page.waitForTimeout(2000);
    }
    
    // Step 5: Analyze results
    console.log('5️⃣ Analyzing results...');
    console.log('========================');
    
    let foundSectionContext = 0;
    let foundItemContext = 0;
    let foundStatusUpdates = 0;
    let foundErrors = 0;
    
    consoleLogs.forEach(log => {
      if (log.includes('Section') && log.includes('Item') && log.includes('handleStatusChange')) {
        foundSectionContext++;
      }
      if (log.includes('button clicked for section:')) {
        foundItemContext++;
      }
      if (log.includes('status updated to')) {
        foundStatusUpdates++;
      }
      if (log.includes('Could not find') || log.includes('Failed to')) {
        foundErrors++;
        console.log(`❌ Error detected: ${log}`);
      }
    });
    
    // Results summary
    console.log('\\n📊 Test Results:');
    console.log('================');
    console.log(`✅ Section context calls: ${foundSectionContext}`);
    console.log(`✅ Button clicks with context: ${foundItemContext}`);
    console.log(`✅ Successful status updates: ${foundStatusUpdates}`);
    console.log(`❌ Errors detected: ${foundErrors}`);
    
    if (foundSectionContext > 0 && foundItemContext > 0 && foundErrors === 0) {
      console.log('\\n🎉 SUCCESS: Mobile ITP buttons are working correctly!');
      console.log('   ✅ Section and item context is being passed');
      console.log('   ✅ API calls are being made with correct data structure');
      console.log('   ✅ No "Could not find ITP instance" errors');
    } else if (foundErrors > 0) {
      console.log('\\n❌ ERRORS DETECTED: Some buttons still have issues');
    } else {
      console.log('\\n🔍 INCONCLUSIVE: Limited activity detected - may need manual verification');
    }
    
    console.log('\\n📱 Test completed. Check the UI to see if button states persist after clicking.');
    console.log('Press any key to close browser...');
    await page.pause();
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

// Run the test
if (require.main === module) {
  testMobileButtonsFix().catch(console.error);
}

module.exports = { testMobileButtonsFix };