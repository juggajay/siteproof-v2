#!/usr/bin/env node

const { chromium } = require('playwright');

async function testItpDelete() {
  console.log('🧪 Testing ITP Delete Functionality...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Set to true for CI/CD
    slowMo: 200 
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
    }
    
    // Find and click on a lot
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
    console.log('\n5️⃣ Testing ITP delete functionality...');
    await page.waitForTimeout(3000);
    
    // Look for delete buttons (trash icons)
    const deleteButtons = await page.locator('button[aria-label*="Delete"]');
    const deleteCount = await deleteButtons.count();
    
    console.log(`Found ${deleteCount} ITP(s) with delete buttons`);
    
    if (deleteCount > 0) {
      // Count ITPs before deletion
      const itpCountBefore = deleteCount;
      console.log(`ITPs before deletion: ${itpCountBefore}`);
      
      // Click the first delete button
      console.log('\n6️⃣ Clicking delete button on first ITP...');
      await deleteButtons.first().click();
      await page.waitForTimeout(500);
      
      // Check if confirmation dialog appears
      const confirmDialog = await page.locator('text="Confirm Delete"');
      if (await confirmDialog.isVisible()) {
        console.log('✅ Confirmation dialog appeared');
        
        // Test cancel button first
        console.log('7️⃣ Testing cancel button...');
        const cancelButton = await page.locator('button:has-text("Cancel")');
        await cancelButton.click();
        await page.waitForTimeout(500);
        
        // Verify dialog closed and ITP still exists
        if (!(await confirmDialog.isVisible())) {
          console.log('✅ Cancel worked - dialog closed');
        }
        
        // Now actually delete
        console.log('\n8️⃣ Actually deleting ITP...');
        await deleteButtons.first().click();
        await page.waitForTimeout(500);
        
        const deleteConfirmButton = await page.locator('button:has-text("Delete ITP")');
        await deleteConfirmButton.click();
        console.log('✅ Clicked Delete ITP button');
        
        // Wait for deletion to complete
        await page.waitForTimeout(2000);
        
        // Count ITPs after deletion
        const deleteButtonsAfter = await page.locator('button[aria-label*="Delete"]');
        const itpCountAfter = await deleteButtonsAfter.count();
        console.log(`ITPs after deletion: ${itpCountAfter}`);
        
        if (itpCountAfter < itpCountBefore) {
          console.log('✅ ITP successfully deleted!');
        } else {
          console.log('❌ ITP deletion failed - count unchanged');
        }
      } else {
        console.log('❌ Confirmation dialog did not appear');
      }
      
    } else {
      console.log('⚠️ No ITPs found to delete');
    }
    
    console.log('\n✅ Delete functionality test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    // Take screenshot on error
    await page.screenshot({ 
      path: 'tests/error-screenshot-itp-delete.png',
      fullPage: true 
    });
    console.log('📸 Error screenshot saved');
    
  } finally {
    console.log('\n🎬 Test session complete');
    await browser.close();
  }
}

// Run the test
testItpDelete().catch(console.error);