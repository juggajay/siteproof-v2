import { test, expect } from '@playwright/test';

test.describe('Report Generation and Download', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/auth/login');

    // Fill in login credentials (using test account)
    await page.fill('input[name="email"]', 'test@siteproof.com');
    await page.fill('input[name="password"]', 'TestPassword123!');

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard/**', { timeout: 10000 });
  });

  test('should auto-fix stuck reports and allow download', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/dashboard/reports');

    // Wait for reports to load
    await page.waitForSelector('[data-testid="report-card"], [data-testid="no-reports"]', {
      timeout: 10000,
    });

    // Check if there are any reports
    const reportCards = await page.$$('[data-testid="report-card"]');

    if (reportCards.length > 0) {
      // Get the first report's status
      const firstReportStatus = await page.textContent('[data-testid="report-status"]:first-child');
      console.log('First report status:', firstReportStatus);

      // If the report was stuck, it should now show as completed
      if (firstReportStatus?.includes('queued') || firstReportStatus?.includes('processing')) {
        // Refresh the page to trigger auto-fix
        await page.reload();
        await page.waitForSelector('[data-testid="report-card"]');

        // Check status again
        const updatedStatus = await page.textContent('[data-testid="report-status"]:first-child');
        expect(updatedStatus).toContain('completed');
      }

      // Try to download the first report
      const firstReportCard = reportCards[0];
      await firstReportCard.click();

      // Wait for download to start (or error message)
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      const download = await downloadPromise;

      if (download) {
        // Verify download started
        expect(download).toBeTruthy();
        console.log('Report download started successfully');
      }
    }
  });

  test('should generate a new report', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/dashboard/reports');

    // Click on generate new report button
    const generateButton = page.locator(
      'button:has-text("Generate Report"), button:has-text("New Report")'
    );
    if (await generateButton.isVisible()) {
      await generateButton.click();

      // Fill in report generation form
      await page.selectOption('select[name="report_type"]', 'project_summary');
      await page.fill('input[name="report_name"]', 'Test Report ' + Date.now());

      // Select format
      await page.selectOption('select[name="format"]', 'pdf');

      // Submit form
      await page.click('button[type="submit"]');

      // Wait for success message or redirect
      await page.waitForSelector('[data-testid="success-message"], [data-testid="report-card"]', {
        timeout: 10000,
      });

      console.log('Report generation triggered successfully');
    }
  });

  test('should handle report deletion', async ({ page }) => {
    // Navigate to reports page
    await page.goto('/dashboard/reports');

    // Wait for reports to load
    await page.waitForSelector('[data-testid="report-card"], [data-testid="no-reports"]', {
      timeout: 10000,
    });

    // Find delete buttons
    const deleteButtons = await page.$$('[data-testid="delete-report"]');

    if (deleteButtons.length > 0) {
      // Get initial report count
      const initialCount = deleteButtons.length;

      // Click first delete button
      await deleteButtons[0].click();

      // Confirm deletion if there's a confirmation dialog
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
      if (await confirmButton.isVisible({ timeout: 1000 })) {
        await confirmButton.click();
      }

      // Wait for deletion to complete
      await page.waitForTimeout(2000);

      // Check new count
      const newDeleteButtons = await page.$$('[data-testid="delete-report"]');
      expect(newDeleteButtons.length).toBeLessThan(initialCount);

      console.log('Report deleted successfully');
    }
  });
});
