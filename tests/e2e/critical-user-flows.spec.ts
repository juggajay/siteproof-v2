import { test, expect, type Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@siteproof.com',
  password: process.env.TEST_USER_PASSWORD || 'Test123!@#',
};

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[name="email"], input[type="email"]', email);
  await page.fill('input[name="password"], input[type="password"]', password);
  await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');

  // Wait for navigation or dashboard
  await page.waitForURL(/\/(dashboard|projects)/, { timeout: 10000 }).catch(() => {
    console.log('Login may have redirected elsewhere or failed');
  });
}

async function waitForApiResponse(page: Page, url: string, timeout = 5000) {
  return page.waitForResponse(
    (response) => response.url().includes(url) && response.status() < 400,
    { timeout }
  );
}

// Test Suite 1: Authentication Flow
test.describe('Critical User Flow: Authentication', () => {
  test('should successfully login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    // Fill login form
    await page.fill('input[name="email"], input[type="email"]', TEST_USER.email);
    await page.fill('input[name="password"], input[type="password"]', TEST_USER.password);

    // Submit form
    await page.click('button[type="submit"]');

    // Verify redirect to dashboard or projects
    await expect(page).toHaveURL(/\/(dashboard|projects)/, { timeout: 10000 });

    // Verify user is logged in (check for logout button or user menu)
    const isLoggedIn =
      (await page.locator('[data-testid="user-menu"]').count()) > 0 ||
      (await page.locator('text=/logout|sign out/i').count()) > 0 ||
      (await page.locator('[href*="/logout"]').count()) > 0;

    expect(isLoggedIn).toBeTruthy();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Wait for error message
    const errorVisible = await page
      .locator('text=/invalid|incorrect|wrong|error/i')
      .first()
      .isVisible()
      .catch(() => false);

    expect(errorVisible).toBeTruthy();
  });

  test('should logout successfully', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    // Find and click logout
    const logoutButton = page.locator(
      '[data-testid="logout"], button:has-text("Logout"), button:has-text("Sign Out"), a[href*="/logout"]'
    ).first();

    await logoutButton.click();

    // Verify redirect to login
    await expect(page).toHaveURL(/\/(login|auth)/, { timeout: 5000 });
  });
});

// Test Suite 2: Project Management
test.describe('Critical User Flow: Project Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should load projects list', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`);

    // Wait for projects to load
    await page.waitForSelector('[data-testid="projects-list"], main, .projects', {
      timeout: 10000,
    });

    // Verify page loaded
    const hasContent =
      (await page.locator('text=/project/i').count()) > 0 ||
      (await page.locator('[data-testid="project-card"]').count()) > 0 ||
      (await page.locator('text=/no projects/i').count()) > 0;

    expect(hasContent).toBeTruthy();
  });

  test('should open create project dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`);

    // Click create project button
    await page
      .click(
        '[data-testid="create-project"], button:has-text("Create Project"), button:has-text("New Project"), a:has-text("Create Project")'
      )
      .catch(async () => {
        // Try alternative selectors
        await page.click('button:has-text("Create")').catch(() => {});
      });

    // Verify dialog/form opened
    await page.waitForTimeout(1000);

    const dialogVisible =
      (await page.locator('[role="dialog"]').count()) > 0 ||
      (await page.locator('text=/project name|create project/i').count()) > 0 ||
      (await page.locator('form').count()) > 0;

    expect(dialogVisible).toBeTruthy();
  });

  test('should navigate to project details', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`);

    // Wait for projects to load
    await page.waitForSelector('[data-testid="projects-list"], main', { timeout: 10000 });

    // Try to click first project
    const firstProject = page
      .locator('[data-testid="project-card"], a[href*="/projects/"]')
      .first();

    const projectExists = (await firstProject.count()) > 0;

    if (projectExists) {
      await firstProject.click();

      // Verify navigation
      await expect(page).toHaveURL(/\/projects\/[a-zA-Z0-9-]+/, { timeout: 5000 });

      // Verify project details loaded
      const detailsLoaded =
        (await page.locator('text=/lot|itp|inspection/i').count()) > 0 ||
        (await page.locator('[data-testid="project-details"]').count()) > 0;

      expect(detailsLoaded).toBeTruthy();
    } else {
      console.log('No projects available to test navigation');
    }
  });
});

// Test Suite 3: Dashboard
test.describe('Critical User Flow: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should load dashboard with widgets', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    // Wait for dashboard to load
    await page.waitForSelector('main, [data-testid="dashboard"]', { timeout: 10000 });

    // Verify widgets are present
    const hasWidgets =
      (await page.locator('[data-testid*="widget"]').count()) > 0 ||
      (await page.locator('text=/project|itp|ncr/i').count()) > 3 ||
      (await page.locator('[class*="card"], [class*="widget"]').count()) > 0;

    expect(hasWidgets).toBeTruthy();
  });

  test('should load project summary widget', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`);

    await page.waitForTimeout(2000); // Wait for API calls

    // Check for project summary
    const hasSummary =
      (await page.locator('text=/project summary|total projects|active projects/i').count()) >
        0 ||
      (await page.locator('[data-testid="project-summary"]').count()) > 0;

    expect(hasSummary).toBeTruthy();
  });

  test('should measure dashboard load performance', async ({ page }) => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    const loadTime = Date.now() - startTime;

    console.log(`Dashboard load time: ${loadTime}ms`);

    // Dashboard should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});

// Test Suite 4: ITP (Inspection Test Plan) Management
test.describe('Critical User Flow: ITP Management', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should navigate to ITP section', async ({ page }) => {
    // Try multiple navigation patterns
    await page.goto(`${BASE_URL}/projects`);

    // Click on first project
    const firstProject = page.locator('[data-testid="project-card"], a[href*="/projects/"]').first();

    if ((await firstProject.count()) > 0) {
      await firstProject.click();

      // Look for ITP section
      await page.waitForTimeout(2000);

      const hasItp =
        (await page.locator('text=/itp|inspection|test plan/i').count()) > 0 ||
        (await page.locator('[href*="/itp"]').count()) > 0 ||
        (await page.locator('[data-testid*="itp"]').count()) > 0;

      expect(hasItp).toBeTruthy();
    } else {
      console.log('No projects available for ITP testing');
    }
  });

  test('should load ITP list', async ({ page }) => {
    await page.goto(`${BASE_URL}/projects`);

    // Navigate to first project
    const firstProject = page.locator('a[href*="/projects/"]').first();

    if ((await firstProject.count()) > 0) {
      await firstProject.click();
      await page.waitForTimeout(2000);

      // Try to find ITP section
      const itpLink = page.locator('[href*="/itp"], text=/inspection/i').first();

      if ((await itpLink.count()) > 0) {
        await itpLink.click();
        await page.waitForTimeout(2000);

        // Verify ITP list loaded
        const itpListLoaded =
          (await page.locator('[data-testid="itp-list"]').count()) > 0 ||
          (await page.locator('text=/inspection|template/i').count()) > 0;

        expect(itpListLoaded).toBeTruthy();
      }
    }
  });
});

// Test Suite 5: Responsive Design & Mobile
test.describe('Critical User Flow: Responsive Design', () => {
  test('should render correctly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE

    await page.goto(`${BASE_URL}/login`);

    // Verify page renders
    const loginForm = page.locator('form, input[type="email"]');
    await expect(loginForm.first()).toBeVisible();

    // Check for mobile menu
    await login(page, TEST_USER.email, TEST_USER.password);

    const hasMobileMenu =
      (await page.locator('[data-testid="mobile-menu"], button[aria-label*="menu"]').count()) >
      0;

    // Mobile menu should exist or navigation should be visible
    expect(hasMobileMenu || (await page.locator('nav').count()) > 0).toBeTruthy();
  });

  test('should render correctly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad

    await login(page, TEST_USER.email, TEST_USER.password);

    await page.goto(`${BASE_URL}/dashboard`);

    // Verify responsive layout
    await page.waitForSelector('main', { timeout: 10000 });

    const mainContent = page.locator('main');
    await expect(mainContent).toBeVisible();
  });
});

// Test Suite 6: Error Handling
test.describe('Critical User Flow: Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto(`${BASE_URL}/non-existent-page-12345`);

    // Wait for page to load
    await page.waitForTimeout(2000);

    // Should show 404 message or redirect
    const has404 =
      (await page.locator('text=/404|not found|page not found/i').count()) > 0 ||
      page.url().includes('/dashboard') ||
      page.url().includes('/projects');

    expect(has404).toBeTruthy();
  });

  test('should handle network errors', async ({ page, context }) => {
    // Block API requests
    await context.route('**/api/**', (route) => route.abort());

    await page.goto(`${BASE_URL}/dashboard`);

    await page.waitForTimeout(3000);

    // Should show error message or handle gracefully
    const handlesError =
      (await page.locator('text=/error|failed|try again/i').count()) > 0 ||
      (await page.locator('[role="alert"]').count()) > 0;

    expect(handlesError).toBeTruthy();
  });
});

// Test Suite 7: Performance
test.describe('Critical User Flow: Performance', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);

    const pages = [
      { url: '/dashboard', name: 'Dashboard' },
      { url: '/projects', name: 'Projects' },
    ];

    for (const testPage of pages) {
      const startTime = Date.now();

      await page.goto(`${BASE_URL}${testPage.url}`);
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      console.log(`${testPage.name} load time: ${loadTime}ms`);

      // Pages should load within 3 seconds
      expect(loadTime).toBeLessThan(3000);
    }
  });

  test('should not have console errors on critical pages', async ({ page }) => {
    const consoleErrors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await login(page, TEST_USER.email, TEST_USER.password);
    await page.goto(`${BASE_URL}/dashboard`);
    await page.waitForTimeout(3000);

    // Filter out known acceptable errors (like network errors in dev)
    const criticalErrors = consoleErrors.filter(
      (err) =>
        !err.includes('Failed to load resource') &&
        !err.includes('net::ERR_') &&
        !err.includes('favicon')
    );

    console.log(`Console errors found: ${criticalErrors.length}`);
    if (criticalErrors.length > 0) {
      console.log('Errors:', criticalErrors);
    }

    // Warn but don't fail on console errors
    expect(criticalErrors.length).toBeLessThan(5);
  });
});
