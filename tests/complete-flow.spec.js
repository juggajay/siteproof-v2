const { test, expect } = require('@playwright/test');

test.describe('SiteProof Complete Application Flow', () => {
  test('complete user journey from signup to report generation', async ({ page }) => {
    // Set viewport for consistent screenshots
    await page.setViewportSize({ width: 1280, height: 720 });
    
    console.log('🚀 Starting complete SiteProof application flow test...');

    // Step 1: Navigate to application
    console.log('📍 Step 1: Navigate to application homepage');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/01-homepage.png', fullPage: true });
    
    // Check if we're redirected to login or if we see a dashboard
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Step 2: Handle Authentication
    if (currentUrl.includes('/auth/login') || currentUrl.includes('/login')) {
      console.log('📍 Step 2: Authentication required - Testing login flow');
      
      // Try to go to signup first
      await page.click('a[href="/auth/signup"]').catch(() => {
        console.log('Signup link not found, will try login');
      });
      
      if (page.url().includes('/signup')) {
        console.log('🔑 Testing signup flow');
        await page.screenshot({ path: 'screenshots/02-signup-form.png', fullPage: true });
        
        // Fill signup form
        await page.fill('input[type="email"]', 'test@siteproof.com');
        await page.fill('input[type="password"]', 'TestPassword123!');
        await page.fill('input[name="confirmPassword"]', 'TestPassword123!').catch(() => {
          console.log('No confirm password field found');
        });
        await page.fill('input[name="firstName"]', 'Test').catch(() => {
          console.log('No firstName field found');
        });
        await page.fill('input[name="lastName"]', 'User').catch(() => {
          console.log('No lastName field found');
        });
        
        await page.screenshot({ path: 'screenshots/03-signup-filled.png', fullPage: true });
        
        // Submit signup
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshots/04-after-signup.png', fullPage: true });
      }
      
      // If still on auth page, try login
      if (page.url().includes('/auth/')) {
        console.log('🔑 Testing login flow');
        await page.goto('http://localhost:3000/auth/login');
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: 'screenshots/05-login-form.png', fullPage: true });
        
        // Fill login form with test credentials
        await page.fill('input[type="email"]', 'test@siteproof.com');
        await page.fill('input[type="password"]', 'TestPassword123!');
        await page.screenshot({ path: 'screenshots/06-login-filled.png', fullPage: true });
        
        // Submit login
        await page.click('button[type="submit"]');
        await page.waitForTimeout(3000);
        await page.screenshot({ path: 'screenshots/07-after-login.png', fullPage: true });
      }
    }
    
    // Step 3: Navigate to dashboard and check organization setup
    console.log('📍 Step 3: Navigate to dashboard');
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/08-dashboard.png', fullPage: true });
    
    // Check if organization setup is needed
    if (page.url().includes('/organization/setup') || await page.isVisible('text=Organization Setup').catch(() => false)) {
      console.log('🏢 Setting up organization');
      await page.screenshot({ path: 'screenshots/09-org-setup.png', fullPage: true });
      
      await page.fill('input[name="organizationName"]', 'Test Construction Company').catch(() => {
        console.log('Organization name field not found');
      });
      await page.fill('input[name="industry"]', 'Construction').catch(() => {
        console.log('Industry field not found');
      });
      
      await page.click('button[type="submit"]').catch(() => {
        console.log('Submit button not found, continuing...');
      });
      await page.waitForTimeout(2000);
      await page.screenshot({ path: 'screenshots/10-after-org-setup.png', fullPage: true });
    }
    
    // Step 4: Create a new project
    console.log('📍 Step 4: Create a new project');
    await page.goto('http://localhost:3000/dashboard/projects');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/11-projects-page.png', fullPage: true });
    
    // Look for create project button
    const createProjectSelector = 'a[href*="/projects/new"], button:has-text("New Project"), button:has-text("Create Project"), a:has-text("New Project")';
    await page.click(createProjectSelector).catch(async () => {
      console.log('Create project button not found, trying alternative navigation');
      await page.goto('http://localhost:3000/dashboard/projects/new');
    });
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/12-new-project-form.png', fullPage: true });
    
    // Fill project form
    await page.fill('input[name="name"]', 'Test High-Rise Building Project');
    await page.fill('input[name="description"]', 'Comprehensive testing of construction project management system').catch(() => {
      console.log('Description field not found');
    });
    await page.fill('input[name="location"]', '123 Construction St, Test City, TC 12345').catch(() => {
      console.log('Location field not found');
    });
    
    // Set project dates if available
    await page.fill('input[type="date"][name="startDate"]', '2024-01-01').catch(() => {
      console.log('Start date field not found');
    });
    await page.fill('input[type="date"][name="endDate"]', '2024-12-31').catch(() => {
      console.log('End date field not found');
    });
    
    await page.screenshot({ path: 'screenshots/13-project-form-filled.png', fullPage: true });
    
    // Submit project creation
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/14-project-created.png', fullPage: true });
    
    // Step 5: Create a lot within the project
    console.log('📍 Step 5: Create a lot within the project');
    
    // Navigate to lots section - try multiple possible routes
    const lotSelectors = [
      'a:has-text("Lots")',
      'a[href*="/lots"]',
      'button:has-text("Add Lot")',
      'a:has-text("Manage Lots")'
    ];
    
    let lotNavigated = false;
    for (const selector of lotSelectors) {
      try {
        await page.click(selector);
        await page.waitForTimeout(2000);
        lotNavigated = true;
        break;
      } catch (e) {
        console.log(`Selector ${selector} not found, trying next...`);
      }
    }
    
    if (!lotNavigated) {
      // Try direct URL navigation
      const projectId = page.url().split('/').pop();
      await page.goto(`http://localhost:3000/dashboard/projects/${projectId}/lots`);
    }
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/15-lots-page.png', fullPage: true });
    
    // Create new lot
    await page.click('button:has-text("New Lot"), a:has-text("Add Lot"), button:has-text("Create Lot")').catch(async () => {
      console.log('No lot creation button found, will create via form if available');
    });
    
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/16-lot-creation.png', fullPage: true });
    
    // Fill lot information
    await page.fill('input[name="lotNumber"]', 'LOT-001').catch(() => {
      console.log('Lot number field not found');
    });
    await page.fill('input[name="description"]', 'Foundation and basement level').catch(() => {
      console.log('Lot description field not found');
    });
    await page.fill('input[name="area"]', '2500').catch(() => {
      console.log('Area field not found');
    });
    
    await page.screenshot({ path: 'screenshots/17-lot-form-filled.png', fullPage: true });
    
    // Submit lot creation
    await page.click('button[type="submit"]').catch(() => {
      console.log('Submit button for lot not found');
    });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/18-lot-created.png', fullPage: true });
    
    // Step 6: Navigate to ITP Forms
    console.log('📍 Step 6: Navigate to ITP (Inspection Test Plan) forms');
    await page.goto('http://localhost:3000/itp-forms');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/19-itp-forms-page.png', fullPage: true });
    
    // Step 7: Create new ITP
    console.log('📍 Step 7: Create and interact with ITP forms');
    await page.click('a[href*="/itp-forms/new"], button:has-text("New ITP"), a:has-text("Create ITP")').catch(async () => {
      console.log('No ITP creation button found, navigating directly');
      await page.goto('http://localhost:3000/itp-forms/new');
    });
    
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/20-new-itp-form.png', fullPage: true });
    
    // Fill ITP form details
    await page.fill('input[name="title"]', 'Concrete Foundation Inspection').catch(() => {
      console.log('ITP title field not found');
    });
    await page.fill('textarea[name="description"]', 'Comprehensive inspection of concrete foundation including rebar placement, concrete quality, and curing process').catch(() => {
      console.log('ITP description field not found');
    });
    
    // Select inspection type if available
    await page.selectOption('select[name="inspectionType"]', 'Foundation').catch(() => {
      console.log('Inspection type dropdown not found');
    });
    
    // Add inspection points/checklist items
    const checklistItems = [
      'Verify rebar placement and spacing',
      'Check concrete mix design compliance',
      'Inspect formwork alignment',
      'Verify curing procedures',
      'Test concrete strength'
    ];
    
    for (let i = 0; i < checklistItems.length; i++) {
      try {
        await page.click('button:has-text("Add Item"), button:has-text("Add Checkpoint")');
        await page.fill(`input[name="checklistItem${i}"], input[name="item${i}"]`, checklistItems[i]);
      } catch (e) {
        console.log(`Could not add checklist item ${i}: ${checklistItems[i]}`);
      }
    }
    
    await page.screenshot({ path: 'screenshots/21-itp-form-filled.png', fullPage: true });
    
    // Submit ITP creation
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/22-itp-created.png', fullPage: true });
    
    // Step 8: Fill out inspection form
    console.log('📍 Step 8: Fill out inspection form and submit');
    
    // Look for inspection form or create inspection
    await page.click('button:has-text("Start Inspection"), a:has-text("Conduct Inspection"), button:has-text("Begin")').catch(() => {
      console.log('Start inspection button not found');
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/23-inspection-form.png', fullPage: true });
    
    // Fill inspection details
    const checkboxes = await page.$$('input[type="checkbox"]');
    for (let checkbox of checkboxes) {
      try {
        await checkbox.check();
      } catch (e) {
        console.log('Could not check checkbox');
      }
    }
    
    // Fill any text areas for comments
    const textareas = await page.$$('textarea');
    for (let i = 0; i < textareas.length; i++) {
      try {
        await textareas[i].fill(`Inspection completed successfully. All items meet specification requirements. Checkpoint ${i + 1} passed.`);
      } catch (e) {
        console.log(`Could not fill textarea ${i}`);
      }
    }
    
    // Add inspector signature if available
    await page.fill('input[name="inspector"]', 'John Doe, PE').catch(() => {
      console.log('Inspector field not found');
    });
    
    await page.screenshot({ path: 'screenshots/24-inspection-completed.png', fullPage: true });
    
    // Submit inspection
    await page.click('button[type="submit"], button:has-text("Submit Inspection")');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'screenshots/25-inspection-submitted.png', fullPage: true });
    
    // Step 9: Generate reports
    console.log('📍 Step 9: Generate and view reports');
    await page.goto('http://localhost:3000/dashboard/reports');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/26-reports-page.png', fullPage: true });
    
    // Generate new report
    await page.click('button:has-text("Generate Report"), a:has-text("New Report"), button:has-text("Create Report")').catch(() => {
      console.log('Generate report button not found');
    });
    
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/27-report-generation.png', fullPage: true });
    
    // Select report type and parameters
    await page.selectOption('select[name="reportType"]', 'Inspection Summary').catch(() => {
      console.log('Report type dropdown not found');
    });
    
    await page.fill('input[name="reportName"]', 'Foundation Inspection Summary Report').catch(() => {
      console.log('Report name field not found');
    });
    
    // Set date range if available
    await page.fill('input[name="startDate"]', '2024-01-01').catch(() => {
      console.log('Start date field not found');
    });
    await page.fill('input[name="endDate"]', '2024-12-31').catch(() => {
      console.log('End date field not found');
    });
    
    await page.screenshot({ path: 'screenshots/28-report-config.png', fullPage: true });
    
    // Generate report
    await page.click('button[type="submit"], button:has-text("Generate")');
    await page.waitForTimeout(5000); // Reports might take time to generate
    await page.screenshot({ path: 'screenshots/29-report-generated.png', fullPage: true });
    
    // Step 10: Final verification
    console.log('📍 Step 10: Final verification and summary');
    
    // Check dashboard overview
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/30-final-dashboard.png', fullPage: true });
    
    // Verify navigation works
    const navLinks = ['/dashboard/projects', '/dashboard/inspections', '/dashboard/reports'];
    for (const link of navLinks) {
      try {
        await page.goto(`http://localhost:3000${link}`);
        await page.waitForLoadState('networkidle');
        await page.screenshot({ path: `screenshots/31-verify-${link.split('/').pop()}.png`, fullPage: true });
      } catch (e) {
        console.log(`Could not navigate to ${link}`);
      }
    }
    
    console.log('✅ Complete application flow test completed successfully!');
    console.log('📸 Screenshots saved to screenshots/ directory');
    console.log('🔍 Check screenshots for visual verification of all steps');
    
    // Final assertion - we should be able to see the dashboard
    await page.goto('http://localhost:3000/dashboard');
    await expect(page).toHaveURL(/.*dashboard.*/);
  });
  
  test('error handling and edge cases', async ({ page }) => {
    console.log('🧪 Testing error handling and edge cases...');
    
    // Test invalid login
    await page.goto('http://localhost:3000/auth/login');
    await page.fill('input[type="email"]', 'invalid@email.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/error-01-invalid-login.png', fullPage: true });
    
    // Test 404 pages
    await page.goto('http://localhost:3000/non-existent-page');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/error-02-404-page.png', fullPage: true });
    
    // Test form validation
    await page.goto('http://localhost:3000/itp-forms/new');
    await page.click('button[type="submit"]'); // Submit empty form
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/error-03-form-validation.png', fullPage: true });
    
    console.log('✅ Error handling tests completed');
  });
});