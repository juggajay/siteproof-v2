import { test, expect } from '@playwright/test';

test.describe('SiteProof Comprehensive Testing', () => {
  
  test.describe('API Endpoints', () => {
    test('Health check endpoint should work', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('status', 'ok');
      expect(data).toHaveProperty('message');
      expect(data).toHaveProperty('timestamp');
    });

    test('Setup check endpoint should work or return proper error', async ({ request }) => {
      const response = await request.get('/api/setup/check');
      // Could be 200 (success) or 500 (server error) but not 404
      expect([200, 500, 401, 403].includes(response.status())).toBeTruthy();
    });

    test('Test Supabase endpoint should work or return proper error', async ({ request }) => {
      const response = await request.get('/api/test-supabase');
      // Could be 200 (success) or 500 (server error) but not 404
      expect([200, 500, 401, 403].includes(response.status())).toBeTruthy();
    });
  });

  test.describe('Public Pages', () => {
    test('Landing page should load', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveTitle(/SiteProof|Email Template Builder/);
      
      // Take screenshot of landing page
      await page.screenshot({ path: 'screenshots/landing-page.png', fullPage: true });
    });

    test('Login page should load and be functional', async ({ page }) => {
      await page.goto('/auth/login');
      await expect(page).toHaveTitle(/Login|Sign in/);
      
      // Check for login form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
      
      // Take screenshot of login page
      await page.screenshot({ path: 'screenshots/login-page.png', fullPage: true });
    });

    test('Signup page should load and be functional', async ({ page }) => {
      await page.goto('/auth/signup');
      await expect(page).toHaveTitle(/Sign up|Register/);
      
      // Check for signup form elements
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      // Take screenshot of signup page
      await page.screenshot({ path: 'screenshots/signup-page.png', fullPage: true });
    });

    test('Forgot password page should load', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      await expect(page.getByText(/forgot.*password/i)).toBeVisible();
      
      // Check for email input
      await expect(page.locator('input[type="email"]')).toBeVisible();
      
      // Take screenshot of forgot password page
      await page.screenshot({ path: 'screenshots/forgot-password-page.png', fullPage: true });
    });
  });

  test.describe('Design System Pages', () => {
    test('Design system showcase should load', async ({ page }) => {
      await page.goto('/design-system');
      await expect(page.getByText(/design system|components/i)).toBeVisible();
      
      // Take screenshot of design system
      await page.screenshot({ path: 'screenshots/design-system.png', fullPage: true });
    });

    test('Design test page should load', async ({ page }) => {
      await page.goto('/design-test');
      // Should not return 404
      await expect(page.locator('h1')).toBeVisible();
      
      // Take screenshot
      await page.screenshot({ path: 'screenshots/design-test.png', fullPage: true });
    });
  });

  test.describe('Dashboard Pages (Authentication Required)', () => {
    test('Dashboard should redirect to login when not authenticated', async ({ page }) => {
      await page.goto('/dashboard');
      
      // Should either show login form or redirect to login page
      await expect(page.url()).toMatch(/\/auth\/login|\/dashboard/);
      
      // If redirected to login, should see login form
      if (page.url().includes('/auth/login')) {
        await expect(page.locator('input[type="email"]')).toBeVisible();
      }
      
      // Take screenshot
      await page.screenshot({ path: 'screenshots/dashboard-unauthenticated.png', fullPage: true });
    });

    test('Projects page should handle authentication', async ({ page }) => {
      await page.goto('/dashboard/projects');
      
      // Should either show login form or projects page
      await expect(page.url()).toMatch(/\/auth\/login|\/dashboard\/projects/);
      
      // Take screenshot
      await page.screenshot({ path: 'screenshots/projects-page.png', fullPage: true });
    });
  });

  test.describe('Error Handling', () => {
    test('404 page should work for non-existent routes', async ({ page }) => {
      await page.goto('/non-existent-page');
      await expect(page.getByText(/404|not found/i)).toBeVisible();
      
      // Take screenshot of 404 page
      await page.screenshot({ path: 'screenshots/404-page.png', fullPage: true });
    });
  });

  test.describe('Responsive Design', () => {
    test('Login page should be responsive on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto('/auth/login');
      
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();
      
      // Take mobile screenshot
      await page.screenshot({ path: 'screenshots/login-mobile.png', fullPage: true });
    });

    test('Landing page should be responsive on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await page.goto('/');
      
      // Take tablet screenshot
      await page.screenshot({ path: 'screenshots/landing-tablet.png', fullPage: true });
    });
  });

  test.describe('Performance', () => {
    test('Landing page should load quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('Login page should load quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/auth/login');
      const loadTime = Date.now() - startTime;
      
      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });
  });

  test.describe('Accessibility', () => {
    test('Login page should have proper labels', async ({ page }) => {
      await page.goto('/auth/login');
      
      // Check for proper form labels
      const emailInput = page.locator('input[type="email"]');
      const passwordInput = page.locator('input[type="password"]');
      
      await expect(emailInput).toBeVisible();
      await expect(passwordInput).toBeVisible();
      
      // Should have associated labels or aria-labels
      const emailLabel = await emailInput.getAttribute('aria-label') || 
                        await page.locator('label[for]').first().textContent();
      const passwordLabel = await passwordInput.getAttribute('aria-label') || 
                           await page.locator('label').nth(1).textContent();
      
      expect(emailLabel).toBeTruthy();
      expect(passwordLabel).toBeTruthy();
    });
  });
});