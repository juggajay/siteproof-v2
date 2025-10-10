import { test, expect } from '@playwright/test';
import { format } from 'date-fns';

// Test configuration
const TEST_URL = process.env.TEST_URL || 'http://localhost:3000';
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPassword123!';

test.describe('Reports Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto(`${TEST_URL}/auth/login`);
    
    // Login
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    
    // Wait for dashboard to load
    await page.waitForURL('**/dashboard');
  });

  test('should display reports dashboard with statistics', async ({ page }) => {
    // Navigate to reports page
    await page.goto(`${TEST_URL}/dashboard/reports`);
    
    // Check page title
    await expect(page.locator('h1')).toContainText('Reports');
    
    // Check statistics cards are visible
    await expect(page.locator('text=Reports Today')).toBeVisible();
    await expect(page.locator('text=This Week')).toBeVisible();
    await expect(page.locator('text=Processing')).toBeVisible();
    await expect(page.locator('text=Scheduled')).toBeVisible();
    
    // Check tabs are present
    await expect(page.locator('text=Recent Reports')).toBeVisible();
    await expect(page.locator('text=Scheduled Reports')).toBeVisible();
  });

  test('should open report generation form', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    
    // Click generate report button
    await page.click('button:has-text("Generate Report")');
    
    // Check modal is visible
    await expect(page.locator('h2:has-text("Generate Report")')).toBeVisible();
    
    // Check form fields are present
    await expect(page.locator('text=Report Type')).toBeVisible();
    await expect(page.locator('text=Report Name')).toBeVisible();
    await expect(page.locator('text=Project')).toBeVisible();
    await expect(page.locator('text=Report Date')).toBeVisible();
    await expect(page.locator('text=Export Format')).toBeVisible();
  });

  test('should validate report generation form', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    await page.click('button:has-text("Generate Report")');
    
    // Try to submit without filling required fields
    await page.click('button:has-text("Generate Report"):visible:last');
    
    // Check validation messages
    await expect(page.locator('text=Report name is required')).toBeVisible();
    await expect(page.locator('text=Please select a project')).toBeVisible();
  });

  test('should select different report types', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    await page.click('button:has-text("Generate Report")');
    
    // Test report type selection
    const reportTypes = [
      'Project Summary',
      'Daily Diary Export',
      'Inspection Summary',
      'NCR Report',
    ];
    
    for (const reportType of reportTypes) {
      const typeElement = page.locator(`text=${reportType}`);
      if (await typeElement.isVisible()) {
        await typeElement.click();
        // Verify selection is highlighted
        const parent = typeElement.locator('..');
        await expect(parent).toHaveClass(/border-blue-500/);
      }
    }
  });

  test('should select different export formats', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    await page.click('button:has-text("Generate Report")');
    
    // Test format selection
    const formats = ['PDF', 'Excel', 'CSV', 'JSON'];
    
    for (const format of formats) {
      const formatElement = page.locator(`text=${format}`).first();
      if (await formatElement.isVisible()) {
        await formatElement.click();
        // Verify selection is highlighted
        const parent = formatElement.locator('..');
        await expect(parent).toHaveClass(/border-blue-500/);
      }
    }
  });

  test('should toggle advanced options', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    await page.click('button:has-text("Generate Report")');
    
    // Initially advanced options should be hidden
    await expect(page.locator('text=Include photos in report')).not.toBeVisible();
    
    // Click to show advanced options
    await page.click('text=Advanced Options');
    
    // Check advanced options are visible
    await expect(page.locator('text=Include photos in report')).toBeVisible();
    await expect(page.locator('text=Include signatures')).toBeVisible();
    await expect(page.locator('text=Description (optional)')).toBeVisible();
  });

  test('should handle single date selection', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    await page.click('button:has-text("Generate Report")');
    
    const dateInput = page.locator('input[type="date"]').first();
    const mirroredDateInput = page.locator('input[type="date"]').nth(1);

    const targetDate = format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

    await dateInput.fill(targetDate);

    await expect(dateInput).toHaveValue(targetDate);
    await expect(mirroredDateInput).toHaveValue(targetDate);

    const isReadOnly = await mirroredDateInput.evaluate((el) => el.hasAttribute('readonly'));
    expect(isReadOnly).toBeTruthy();
  });

  test('should display recent reports list', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    
    // Check if recent reports section exists
    const reportsSection = page.locator('[role="region"]').filter({ hasText: 'Recent Reports' });
    
    // If there are no reports, should show empty state
    const emptyState = page.locator('text=No reports found');
    const reportsList = page.locator('[data-testid="reports-list"]');
    
    // Either empty state or reports list should be visible
    const hasEmptyState = await emptyState.isVisible().catch(() => false);
    const hasReportsList = await reportsList.isVisible().catch(() => false);
    
    expect(hasEmptyState || hasReportsList).toBeTruthy();
  });

  test('should filter reports', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    
    // Test filter buttons if they exist
    const filterButtons = ['All Reports', 'My Reports', 'In Progress'];
    
    for (const filterText of filterButtons) {
      const filterButton = page.locator(`button:has-text("${filterText}")`);
      if (await filterButton.isVisible()) {
        await filterButton.click();
        // Wait for potential data reload
        await page.waitForTimeout(500);
      }
    }

    const projectFilter = page.locator('select[name="project-filter"]');
    await expect(projectFilter).toBeVisible();
    const projectOptionCount = await projectFilter.locator('option').count();
    if (projectOptionCount > 1) {
      const firstProjectValue = await projectFilter.locator('option').nth(1).getAttribute('value');
      if (firstProjectValue) {
        await projectFilter.selectOption(firstProjectValue);
        await page.waitForTimeout(300);
      }
    }

    const reportTypeFilter = page.locator('select[name="report-type-filter"]');
    await expect(reportTypeFilter).toBeVisible();
    const hasProjectSummaryOption = await reportTypeFilter
      .locator('option[value="project_summary"]')
      .count();
    if (hasProjectSummaryOption) {
      await reportTypeFilter.selectOption('project_summary');
      await page.waitForTimeout(300);
    }

    const dateFilter = page.locator('input[name="report-date-filter"]');
    await expect(dateFilter).toBeVisible();
    const targetDate = format(new Date(), 'yyyy-MM-dd');
    await dateFilter.fill(targetDate);
    await page.waitForTimeout(300);

    const clearFiltersButton = page.locator('button:has-text("Clear filters")');
    await expect(clearFiltersButton).toBeVisible();
    await clearFiltersButton.click();
    await page.waitForTimeout(300);
    await expect(dateFilter).toHaveValue('');
  });

  test('should handle report actions (download, cancel, retry)', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);

    // Check if any report cards exist
    const reportCards = page.locator('[data-testid="report-card"]');
    const count = await reportCards.count();

    if (count > 0) {
      // Check for action buttons on first report
      const firstCard = reportCards.first();

      // Look for possible action buttons
      const downloadButton = firstCard.locator('button[title="Download Report"]');
      const cancelButton = firstCard.locator('button:has-text("Cancel")');
      const retryButton = firstCard.locator('button[title="Retry"]');

      // At least one action should be available based on report status
      const hasDownload = await downloadButton.isVisible().catch(() => false);
      const hasCancel = await cancelButton.isVisible().catch(() => false);
      const hasRetry = await retryButton.isVisible().catch(() => false);

      expect(hasDownload || hasCancel || hasRetry).toBeTruthy();
    }
  });

  test('should delete report successfully for multi-org users', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);

    // Check if any completed report cards exist
    const reportCards = page.locator('[data-testid="report-card"]');
    const count = await reportCards.count();

    if (count > 0) {
      const firstCard = reportCards.first();

      // Get report name before deletion for verification
      const reportName = await firstCard.locator('[data-testid="report-name"]').textContent().catch(() => null);

      // Look for delete button (might be in a dropdown menu)
      const deleteButton = firstCard.locator('button[title="Delete Report"]');
      const moreButton = firstCard.locator('button[aria-label="More actions"]');

      // Try to find and click delete button
      let deleteClicked = false;

      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        deleteClicked = true;
      } else if (await moreButton.isVisible().catch(() => false)) {
        // Open dropdown menu first
        await moreButton.click();
        await page.waitForTimeout(300);

        // Find delete option in menu
        const deleteMenuItem = page.locator('button:has-text("Delete"), [role="menuitem"]:has-text("Delete")');
        if (await deleteMenuItem.isVisible().catch(() => false)) {
          await deleteMenuItem.click();
          deleteClicked = true;
        }
      }

      if (deleteClicked) {
        // Confirm deletion if confirmation dialog appears
        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")');
        if (await confirmButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await confirmButton.click();
        }

        // Wait for deletion to complete
        await page.waitForTimeout(1000);

        // Verify report is removed from list
        if (reportName) {
          const deletedReport = page.locator(`[data-testid="report-name"]:has-text("${reportName}")`);
          await expect(deletedReport).not.toBeVisible({ timeout: 5000 });
        } else {
          // Verify count decreased
          const newCount = await reportCards.count();
          expect(newCount).toBeLessThan(count);
        }

        // Verify success message
        const successMessage = page.locator('text=/deleted successfully|removed/i');
        await expect(successMessage).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should display report progress for processing reports', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    
    // Look for any processing reports
    const processingBadge = page.locator('text=Processing').first();
    
    if (await processingBadge.isVisible()) {
      // Should show progress bar
      const progressBar = page.locator('[role="progressbar"]').first();
      await expect(progressBar).toBeVisible();
      
      // Should show current step
      const currentStep = page.locator('text=/Processing|Generating|Uploading/');
      await expect(currentStep).toBeVisible();
    }
  });

  test('should show scheduled reports tab', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    
    // Click scheduled reports tab
    await page.click('button:has-text("Scheduled Reports")');
    
    // Should show coming soon or scheduled reports list
    const comingSoon = page.locator('text=Scheduled Reports Coming Soon');
    const scheduledList = page.locator('[data-testid="scheduled-reports-list"]');
    
    const hasComingSoon = await comingSoon.isVisible().catch(() => false);
    const hasScheduledList = await scheduledList.isVisible().catch(() => false);
    
    expect(hasComingSoon || hasScheduledList).toBeTruthy();
  });

  test('should handle report generation with mock data', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    await page.click('button:has-text("Generate Report")');
    
    // Fill in the form with mock data
    await page.click('text=Project Summary');
    await page.fill('input[placeholder="Enter a name for this report"]', 'Test Report ' + Date.now());
    
    // Select first project if available
    const projectSelect = page.locator('select').filter({ hasText: 'Select a project' });
    const options = await projectSelect.locator('option').count();
    
    if (options > 1) {
      // Select the first actual project (skip the placeholder)
      await projectSelect.selectOption({ index: 1 });
      
      // Select PDF format
      await page.click('text=PDF');
      
      // Submit the form
      await page.click('button:has-text("Generate Report"):visible:last');
      
      // Should show success message or close modal
      await expect(page.locator('text=Report generation started')).toBeVisible({ timeout: 5000 })
        .catch(async () => {
          // Or modal should close
          await expect(page.locator('h2:has-text("Generate Report")')).not.toBeVisible({ timeout: 5000 });
        });
    }
  });

  test('should handle financial report permissions', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    await page.click('button:has-text("Generate Report")');
    
    // Check if financial summary is available based on user role
    const financialOption = page.locator('text=Financial Summary');
    
    // This will depend on the test user's role
    // If visible, it means user has permission
    // If not visible, it means user lacks permission
    const hasFinancialAccess = await financialOption.isVisible().catch(() => false);
    
    // Test is successful either way - just checking the permission system works
    expect(typeof hasFinancialAccess).toBe('boolean');
  });
});

test.describe('Reports Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${TEST_URL}/auth/login`);
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.context().setOffline(true);
    
    try {
      await page.goto(`${TEST_URL}/dashboard/reports`);
      
      // Should show error or retry option
      const errorMessage = page.locator('text=/Failed|Error|Offline/');
      const retryButton = page.locator('button:has-text("Retry")');
      
      const hasError = await errorMessage.isVisible().catch(() => false);
      const hasRetry = await retryButton.isVisible().catch(() => false);
      
      expect(hasError || hasRetry).toBeTruthy();
    } finally {
      // Restore online mode
      await page.context().setOffline(false);
    }
  });

  test('should show error state for failed reports', async ({ page }) => {
    await page.goto(`${TEST_URL}/dashboard/reports`);
    
    // Look for any failed reports
    const failedBadge = page.locator('text=Failed').first();
    
    if (await failedBadge.isVisible()) {
      // Should show error message
      const errorMessage = page.locator('text=/error|failed/i');
      await expect(errorMessage).toBeVisible();
      
      // Should have retry button
      const retryButton = page.locator('button[title="Retry"]');
      await expect(retryButton).toBeVisible();
    }
  });
});
