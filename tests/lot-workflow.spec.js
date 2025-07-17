const { test, expect } = require('@playwright/test');

test.describe('Lot Workflow Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('http://localhost:3001');
    
    // Wait for the page to load
    await page.waitForSelector('body');
    
    // Skip authentication for now by going directly to dashboard
    // In a real scenario, we would authenticate here
    await page.goto('http://localhost:3001/dashboard');
  });

  test('Complete lot workflow: create lot, add ITPs, add files, view details', async ({ page }) => {
    // Step 1: Navigate to projects
    await page.goto('http://localhost:3001/dashboard/projects');
    
    // Look for existing project or create one
    const projectExists = await page.locator('text=Test Project').first().isVisible().catch(() => false);
    let projectId;
    
    if (!projectExists) {
      // Create a new project
      await page.click('button:has-text("Create Project")');
      await page.fill('input[name="name"]', 'Test Project');
      await page.fill('textarea[name="description"]', 'Test project for lot workflow');
      await page.click('button[type="submit"]');
      await page.waitForSelector('text=Test Project');
    }
    
    // Get project ID from URL or element
    await page.click('text=Test Project');
    await page.waitForURL(/\/dashboard\/projects\/[a-f0-9-]+/);
    projectId = page.url().split('/').pop();
    
    // Step 2: Create a new lot
    await page.click('button:has-text("Create Lot")');
    
    // Fill lot form
    await page.fill('input[name="name"]', 'Test Lot 1');
    await page.fill('textarea[name="description"]', 'Test lot for workflow testing');
    
    // Select ITP templates if available
    const itpTemplatesExist = await page.locator('text=ITP Templates').isVisible().catch(() => false);
    if (itpTemplatesExist) {
      await page.check('input[type="checkbox"]', { first: true });
    }
    
    // Add a mock file
    const fileInput = page.locator('input[type="file"]');
    if (await fileInput.isVisible()) {
      // Create a test file
      const testFile = Buffer.from('Test file content');
      await fileInput.setInputFiles({
        name: 'test-document.pdf',
        mimeType: 'application/pdf',
        buffer: testFile
      });
    }
    
    // Submit lot creation
    await page.click('button[type="submit"]');
    await page.waitForSelector('text=Lot created successfully');
    
    // Step 3: Navigate to the created lot
    await page.waitForURL(/\/dashboard\/projects\/[a-f0-9-]+\/lots\/[a-f0-9-]+/);
    
    // Verify lot details are displayed
    await expect(page.locator('h1')).toContainText('Lot #');
    await expect(page.locator('text=Test Lot 1')).toBeVisible();
    await expect(page.locator('text=Test project for workflow testing')).toBeVisible();
    
    // Step 4: Check ITP instances are displayed
    const itpSection = page.locator('text=ITP Instances');
    await expect(itpSection).toBeVisible();
    
    // If ITPs were created, verify they show up
    const itpInstances = page.locator('[data-testid="itp-instance"]');
    const itpCount = await itpInstances.count();
    
    if (itpCount > 0) {
      console.log(`Found ${itpCount} ITP instances`);
      // Verify ITP instance details
      await expect(itpInstances.first()).toBeVisible();
      await expect(itpInstances.first().locator('text=Status:')).toBeVisible();
      await expect(itpInstances.first().locator('text=Progress:')).toBeVisible();
    } else {
      console.log('No ITP instances found - checking for empty state');
      await expect(page.locator('text=No ITP instances')).toBeVisible();
    }
    
    // Step 5: Check files are displayed
    const filesSection = page.locator('text=Files');
    await expect(filesSection).toBeVisible();
    
    // Check if files were uploaded
    const fileElements = page.locator('[data-testid="file-item"]');
    const fileCount = await fileElements.count();
    
    if (fileCount > 0) {
      console.log(`Found ${fileCount} files`);
      await expect(fileElements.first()).toBeVisible();
    } else {
      console.log('No files found - checking for empty state');
      await expect(page.locator('text=No files uploaded')).toBeVisible();
    }
    
    // Step 6: Test action buttons
    const actionButtons = page.locator('.bg-blue-600, .bg-gray-600, .bg-green-600');
    const buttonCount = await actionButtons.count();
    
    console.log(`Found ${buttonCount} action buttons`);
    
    // Test "Assign ITP Template" button
    const assignItpButton = page.locator('button:has-text("Assign ITP Template")');
    if (await assignItpButton.isVisible()) {
      await assignItpButton.click();
      // Wait for modal or navigation
      await page.waitForTimeout(1000);
    }
    
    // Test "View Files" button
    const viewFilesButton = page.locator('button:has-text("View Files")');
    if (await viewFilesButton.isVisible()) {
      await viewFilesButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Step 7: Verify lot statistics in sidebar
    await expect(page.locator('text=Quick Stats')).toBeVisible();
    await expect(page.locator('text=Files:')).toBeVisible();
    await expect(page.locator('text=ITP Instances:')).toBeVisible();
    await expect(page.locator('text=Last Updated:')).toBeVisible();
    
    // Step 8: Test navigation back to project
    await page.click('button:has-text("Back to Project")');
    await page.waitForURL(/\/dashboard\/projects\/[a-f0-9-]+$/);
    
    // Verify we're back at the project page
    await expect(page.locator('text=Test Project')).toBeVisible();
    
    console.log('✅ Complete lot workflow test passed!');
  });
  
  test('Test lot error handling', async ({ page }) => {
    // Test accessing non-existent lot
    await page.goto('http://localhost:3001/dashboard/projects/00000000-0000-0000-0000-000000000000/lots/00000000-0000-0000-0000-000000000000');
    
    // Should show error page, not crash
    await expect(page.locator('text=Lot Not Found')).toBeVisible();
    await expect(page.locator('text=The lot you are looking for could not be found')).toBeVisible();
    
    // Test navigation buttons in error state
    await expect(page.locator('text=Back to Project')).toBeVisible();
    await expect(page.locator('text=All Projects')).toBeVisible();
    
    console.log('✅ Error handling test passed!');
  });
});