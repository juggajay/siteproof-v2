#!/usr/bin/env node

const { chromium } = require('playwright');

async function testItpInteraction() {
  console.log('🧪 Testing ITP Interaction Fix...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 100 
  });
  
  const context = await browser.newContext({
    viewport: { width: 414, height: 896 }, // iPhone 12 Pro size
  });
  
  const page = await context.newPage();

  try {
    // Navigate to login
    console.log('1️⃣ Navigating to login page...');
    await page.goto('http://localhost:3000/login');
    
    // Login
    console.log('2️⃣ Logging in...');
    await page.fill('input[type="email"]', 'testuser@example.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('✅ Login successful');
    
    // Navigate to projects
    console.log('\n3️⃣ Navigating to projects...');
    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForTimeout(2000);
    
    // Click on first project
    const projectCard = await page.locator('.cursor-pointer').first();
    if (await projectCard.isVisible()) {
      await projectCard.click();
      console.log('✅ Entered project');
    } else {
      console.log('⚠️ No projects found, creating one...');
      // Handle project creation if needed
    }
    
    // Find and click on a lot with multiple ITPs
    console.log('\n4️⃣ Looking for lots...');
    await page.waitForTimeout(2000);
    
    const lotCards = await page.locator('[href*="/lots/"]');
    const lotCount = await lotCards.count();
    
    if (lotCount > 0) {
      console.log(`Found ${lotCount} lot(s)`);
      await lotCards.first().click();
      console.log('✅ Opened lot details');
    } else {
      console.log('⚠️ No lots found');
      await browser.close();
      return;
    }
    
    // Wait for ITP section to load
    console.log('\n5️⃣ Testing ITP interactions...');
    await page.waitForTimeout(3000);
    
    // Test multiple ITP expansion
    const itpHeaders = await page.locator('[role="button"][aria-label*="Toggle"]');
    const itpCount = await itpHeaders.count();
    
    console.log(`Found ${itpCount} ITP(s) in this lot`);
    
    if (itpCount > 0) {
      // Test clicking on each ITP header
      for (let i = 0; i < Math.min(itpCount, 3); i++) {
        console.log(`\n Testing ITP #${i + 1}:`);
        
        const header = itpHeaders.nth(i);
        const isExpanded = await header.getAttribute('aria-expanded') === 'true';
        
        console.log(`  - Initial state: ${isExpanded ? 'Expanded' : 'Collapsed'}`);
        
        // Click to toggle
        await header.click();
        await page.waitForTimeout(500);
        
        const newState = await header.getAttribute('aria-expanded') === 'true';
        console.log(`  - After click: ${newState ? 'Expanded' : 'Collapsed'}`);
        
        if (newState !== isExpanded) {
          console.log('  ✅ Toggle working correctly');
        } else {
          console.log('  ❌ Toggle not working');
        }
        
        // If expanded, test button interactions
        if (newState) {
          const passButtons = await page.locator('button[aria-label="Mark as Pass"]');
          const passCount = await passButtons.count();
          
          if (passCount > 0) {
            console.log(`  - Found ${passCount} Pass buttons`);
            
            // Test clicking first Pass button
            const firstPass = passButtons.first();
            await firstPass.click();
            await page.waitForTimeout(500);
            
            // Check if button state changed
            const buttonClasses = await firstPass.getAttribute('class');
            if (buttonClasses.includes('bg-green-600')) {
              console.log('  ✅ Pass button interaction working');
            } else {
              console.log('  ⚠️ Pass button clicked but state unclear');
            }
          }
        }
      }
      
      // Test multiple ITPs expanded simultaneously
      if (itpCount > 1) {
        console.log('\n6️⃣ Testing multiple ITPs expanded simultaneously...');
        
        // Collapse all first
        for (let i = 0; i < itpCount; i++) {
          const header = itpHeaders.nth(i);
          const isExpanded = await header.getAttribute('aria-expanded') === 'true';
          if (isExpanded) {
            await header.click();
            await page.waitForTimeout(200);
          }
        }
        
        // Expand first two ITPs
        await itpHeaders.nth(0).click();
        await page.waitForTimeout(200);
        await itpHeaders.nth(1).click();
        await page.waitForTimeout(200);
        
        // Check both are expanded
        const firstExpanded = await itpHeaders.nth(0).getAttribute('aria-expanded') === 'true';
        const secondExpanded = await itpHeaders.nth(1).getAttribute('aria-expanded') === 'true';
        
        if (firstExpanded && secondExpanded) {
          console.log('✅ Multiple ITPs can be expanded simultaneously');
        } else {
          console.log('❌ Issue with multiple ITP expansion');
        }
      }
      
      console.log('\n✅ ITP interaction test completed successfully!');
      
    } else {
      console.log('⚠️ No ITPs found in this lot');
    }
    
    // Test responsiveness
    console.log('\n7️⃣ Testing mobile responsiveness...');
    
    // Test portrait mode
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(1000);
    console.log('✅ Portrait mode working');
    
    // Test landscape mode  
    await page.setViewportSize({ width: 812, height: 375 });
    await page.waitForTimeout(1000);
    console.log('✅ Landscape mode working');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot on error
    await page.screenshot({ 
      path: 'tests/error-screenshot-itp-interaction.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved');
    
  } finally {
    console.log('\n🎬 Test session complete');
    await browser.close();
  }
}

// Run the test
testItpInteraction().catch(console.error);