// Test ITP workflow with authentication using puppeteer
const puppeteer = require('puppeteer');

async function testITPWorkflow() {
  console.log('🚀 Starting complete ITP workflow test...\n');
  
  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for headless mode
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Enable console logging
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('response', response => {
    if (response.status() >= 400) {
      console.log(`❌ ERROR RESPONSE: ${response.status()} ${response.url()}`);
    }
  });

  try {
    // Step 1: Navigate to login
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/auth/login', { waitUntil: 'networkidle0' });
    await page.waitForSelector('input[name="email"]', { timeout: 10000 });
    
    // Step 2: Login
    console.log('2️⃣ Logging in...');
    await page.type('input[name="email"]', 'jayson@jaysonryan.com.au');
    await page.type('input[name="password"]', 'Jayson@2024');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard redirect
    await page.waitForURL('**/dashboard**', { timeout: 15000 });
    console.log('✅ Login successful');
    
    // Step 3: Navigate to specific lot
    console.log('3️⃣ Navigating to lot...');
    const projectId = '89253127-a60a-48a7-a511-ce89c316d3af';
    const lotId = 'f497f453-fb01-49fe-967a-3182a61a5a1b';
    
    await page.goto(`http://localhost:3000/dashboard/projects/${projectId}/lots/${lotId}`, { 
      waitUntil: 'networkidle0' 
    });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Step 4: Check for ITP section
    console.log('4️⃣ Looking for ITP section...');
    try {
      await page.waitForSelector('text=ITP Inspections', { timeout: 10000 });
      console.log('✅ ITP section found');
    } catch (error) {
      console.log('⚠️  ITP section not found, checking page content...');
      const content = await page.content();
      console.log('Page title:', await page.title());
    }
    
    // Step 5: Look for Add ITP button
    console.log('5️⃣ Looking for Add ITP button...');
    try {
      const addItpButton = await page.waitForSelector('button:has-text("Add ITP")', { timeout: 5000 });
      if (addItpButton) {
        console.log('✅ Add ITP button found');
        await addItpButton.click();
        
        // Step 6: Wait for template modal
        console.log('6️⃣ Waiting for template selection modal...');
        await page.waitForSelector('text=Select ITP Template', { timeout: 10000 });
        console.log('✅ Template selection modal opened');
        
        // Look for available templates
        const templates = await page.$$('button[data-testid="template-option"], .template-card button, button:has-text("Asphalt")');
        if (templates.length > 0) {
          console.log(`📋 Found ${templates.length} templates`);
          await templates[0].click();
          console.log('✅ Template selected');
          
          // Wait for assignment to complete
          await page.waitForTimeout(3000);
          
          // Step 7: Look for ITP cards
          console.log('7️⃣ Looking for ITP cards...');
          const itpCards = await page.$$('[data-testid="itp-card"], .itp-card');
          if (itpCards.length > 0) {
            console.log(`📝 Found ${itpCards.length} ITP cards`);
            
            // Click to expand first card
            await itpCards[0].click();
            await page.waitForTimeout(2000);
            
            // Step 8: Test Pass/Fail/N/A buttons
            console.log('8️⃣ Testing Pass/Fail/N/A buttons...');
            
            const passButtons = await page.$$('button:has-text("PASS")');
            const failButtons = await page.$$('button:has-text("FAIL")');
            const naButtons = await page.$$('button:has-text("N/A")');
            
            console.log(`🟢 Found ${passButtons.length} PASS buttons`);
            console.log(`🔴 Found ${failButtons.length} FAIL buttons`);
            console.log(`⚪ Found ${naButtons.length} N/A buttons`);
            
            if (passButtons.length > 0) {
              await passButtons[0].click();
              console.log('✅ PASS button clicked');
            }
            
            if (failButtons.length > 0) {
              await failButtons[0].click();
              console.log('✅ FAIL button clicked');
            }
          } else {
            console.log('⚠️  No ITP cards found after assignment');
          }
        } else {
          console.log('⚠️  No templates available');
        }
      }
    } catch (error) {
      console.log('⚠️  Add ITP button not found:', error.message);
    }
    
    // Step 9: Look for Export Report button
    console.log('9️⃣ Looking for Export Report button...');
    try {
      const exportButton = await page.$('button:has-text("Export Report"), button:has-text("Generate Report")');
      if (exportButton) {
        await exportButton.click();
        console.log('✅ Export Report button clicked');
      } else {
        console.log('⚠️  Export Report button not found');
      }
    } catch (error) {
      console.log('⚠️  Export Report button error:', error.message);
    }
    
    // Step 10: Take screenshot
    console.log('🔟 Taking final screenshot...');
    await page.screenshot({ 
      path: 'itp-workflow-result.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot saved as itp-workflow-result.png');
    
    console.log('\n🎉 Complete ITP workflow test finished!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    await page.screenshot({ 
      path: 'itp-workflow-error.png', 
      fullPage: true 
    });
    console.log('📸 Error screenshot saved as itp-workflow-error.png');
  } finally {
    await browser.close();
  }
}

// Run the test
testITPWorkflow().catch(console.error);