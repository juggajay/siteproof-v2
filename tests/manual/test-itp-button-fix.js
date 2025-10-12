const { chromium } = require('playwright');

async function testItpButtonFix() {
  console.log('🧪 Testing ITP Pass/Fail/N/A button fix...');
  
  const browser = await chromium.launch({ 
    headless: false, 
    slowMo: 1000,
    devtools: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Navigate to the application
    console.log('📱 Navigating to application...');
    await page.goto('http://localhost:3000');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check if we need to login
    const loginButton = await page.locator('button:has-text("Login"), button:has-text("Sign In"), input[type="email"]').first();
    if (await loginButton.isVisible()) {
      console.log('🔐 Login required, please login manually...');
      await page.pause();
    }
    
    // Navigate to a project
    console.log('🗂️ Looking for projects...');
    const projectLinks = await page.locator('a[href*="/projects/"]').all();
    if (projectLinks.length > 0) {
      await projectLinks[0].click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to project');
    } else {
      console.log('❌ No projects found');
      return;
    }
    
    // Navigate to a lot
    console.log('📍 Looking for lots...');
    const lotLinks = await page.locator('a[href*="/lots/"]').all();
    if (lotLinks.length > 0) {
      await lotLinks[0].click();
      await page.waitForLoadState('networkidle');
      console.log('✅ Navigated to lot');
    } else {
      console.log('❌ No lots found');
      return;
    }
    
    // Look for Add ITP button
    console.log('🔍 Looking for Add ITP button...');
    const addItpButton = await page.locator('button:has-text("Add ITP")').first();
    if (await addItpButton.isVisible()) {
      console.log('✅ Found Add ITP button');
      await addItpButton.click();
      await page.waitForTimeout(1000);
      
      // Select a template
      const templateButtons = await page.locator('button:has-text("Asphalt"), button:has-text("Foundation"), button:has-text("Concrete")').all();
      if (templateButtons.length > 0) {
        console.log('📋 Selecting template...');
        await templateButtons[0].click();
        await page.waitForLoadState('networkidle');
        console.log('✅ Template assigned');
      }
    }
    
    // Look for ITP cards
    console.log('🔍 Looking for ITP cards...');
    await page.waitForTimeout(2000);
    const itpCards = await page.locator('.bg-white.rounded-lg.shadow-sm.border').all();
    
    if (itpCards.length > 0) {
      console.log(`✅ Found ${itpCards.length} ITP card(s)`);
      
      // Click to expand the first ITP
      console.log('🎈 Expanding ITP card...');
      await itpCards[0].click();
      await page.waitForTimeout(1000);
      
      // Look for Pass/Fail/N/A buttons
      console.log('🔍 Looking for Pass/Fail/N/A buttons...');
      const passButtons = await page.locator('button:has-text("PASS")').all();
      const failButtons = await page.locator('button:has-text("FAIL")').all();
      const naButtons = await page.locator('button:has-text("N/A")').all();
      
      console.log(`Found ${passButtons.length} PASS buttons`);
      console.log(`Found ${failButtons.length} FAIL buttons`);
      console.log(`Found ${naButtons.length} N/A buttons`);
      
      if (passButtons.length > 0) {
        // Test clicking a PASS button
        console.log('🟢 Testing PASS button click...');
        
        // Enable console logging to capture item IDs
        page.on('console', msg => {
          if (msg.text().includes('🟢 PASS button clicked') || 
              msg.text().includes('🔄 handleStatusChange') ||
              msg.text().includes('getItpItems') ||
              msg.text().includes('Found') ||
              msg.text().includes('Could not find')) {
            console.log(`🖥️ CONSOLE: ${msg.text()}`);
          }
        });
        
        await passButtons[0].click();
        await page.waitForTimeout(2000);
        
        console.log('✅ PASS button clicked - check console logs above for item ID details');
        
        // Test a FAIL button
        if (failButtons.length > 0) {
          console.log('🔴 Testing FAIL button click...');
          await failButtons[0].click();
          await page.waitForTimeout(2000);
          console.log('✅ FAIL button clicked');
        }
        
        // Test an N/A button
        if (naButtons.length > 0) {
          console.log('⚪ Testing N/A button click...');
          await naButtons[0].click();
          await page.waitForTimeout(2000);
          console.log('✅ N/A button clicked');
        }
      } else {
        console.log('❌ No Pass/Fail/N/A buttons found');
      }
    } else {
      console.log('❌ No ITP cards found');
    }
    
    console.log('🎯 Test completed. Press any key to close browser...');
    await page.pause();
    
  } catch (error) {
    console.error('❌ Error during test:', error);
  } finally {
    await browser.close();
  }
}

testItpButtonFix().catch(console.error);