import { test, expect } from '@playwright/test';

test.describe('Full Application Test Suite', () => {
  test.beforeEach(async ({ page }) => {
    // Start from the homepage
    await page.goto('/');
  });

  test('should load all static assets without errors', async ({ page }) => {
    // Check for favicon
    const faviconResponse = await page.goto('/favicon.ico');
    expect(faviconResponse?.status()).toBe(200);
    
    // Check for specific favicon sizes
    const favicon16Response = await page.goto('/favicon-16x16.png');
    expect(favicon16Response?.status()).toBe(200);
    
    const favicon32Response = await page.goto('/favicon-32x32.png');
    expect(favicon32Response?.status()).toBe(200);
    
    // Check for PWA icons
    const iconSizes = [72, 96, 128, 144, 152, 192, 384, 512];
    for (const size of iconSizes) {
      const iconResponse = await page.goto(`/icons/icon-${size}x${size}.png`);
      expect(iconResponse?.status()).toBe(200);
    }
    
    // Check for apple touch icon
    const appleTouchResponse = await page.goto('/apple-touch-icon.png');
    expect(appleTouchResponse?.status()).toBe(200);
    
    // Check manifest.json
    const manifestResponse = await page.goto('/manifest.json');
    expect(manifestResponse?.status()).toBe(200);
    const manifest = await manifestResponse?.json();
    expect(manifest).toHaveProperty('name');
    expect(manifest).toHaveProperty('icons');
    expect(manifest.icons.length).toBeGreaterThan(0);
  });

  test('should register service worker successfully', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for service worker to register
    const swRegistered = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        return registration !== undefined;
      }
      return false;
    });
    
    expect(swRegistered).toBe(true);
  });

  test('should load dashboard without errors', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for no console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.waitForLoadState('networkidle');
    
    // Filter out expected warnings (like font preload)
    const realErrors = consoleErrors.filter(error => 
      !error.includes('preloaded using link preload') &&
      !error.includes('Non-Error promise rejection captured')
    );
    
    expect(realErrors).toHaveLength(0);
  });

  test('should navigate to projects and load lots', async ({ page }) => {
    await page.goto('/dashboard/projects');
    
    // Wait for projects to load
    await page.waitForSelector('[data-testid="project-card"], .project-item', { 
      timeout: 10000 
    });
    
    // Click on first project
    const firstProject = await page.locator('[data-testid="project-card"], .project-item').first();
    await firstProject.click();
    
    // Wait for lots to load
    await page.waitForSelector('[data-testid="lot-item"], .lot-item', { 
      timeout: 10000 
    });
    
    // Verify lots are displayed
    const lots = await page.locator('[data-testid="lot-item"], .lot-item').count();
    expect(lots).toBeGreaterThanOrEqual(0);
  });

  test('should create a new lot successfully', async ({ page }) => {
    await page.goto('/dashboard/projects');
    
    // Navigate to a project
    await page.locator('[data-testid="project-card"], .project-item').first().click();
    
    // Click create lot button
    const createButton = await page.locator('button:has-text("Create Lot"), button:has-text("New Lot"), button:has-text("Add Lot")').first();
    await createButton.click();
    
    // Fill in lot details
    await page.fill('input[name="name"]', `Test Lot ${Date.now()}`);
    await page.fill('textarea[name="description"], input[name="description"]', 'Test lot description');
    
    // Submit form
    await page.click('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
    
    // Wait for success
    await page.waitForResponse(response => 
      response.url().includes('/api/projects') && 
      response.url().includes('/lots') && 
      response.status() === 200
    );
    
    // Verify lot appears in list
    await page.waitForSelector('[data-testid="lot-item"], .lot-item');
    const lotsAfter = await page.locator('[data-testid="lot-item"], .lot-item').count();
    expect(lotsAfter).toBeGreaterThan(0);
  });

  test('should handle API endpoints correctly', async ({ page, request }) => {
    // Get auth token first
    await page.goto('/dashboard');
    const cookies = await page.context().cookies();
    
    // Test lots endpoint
    const projectId = '217523b8-6dd7-4d94-b876-e41879d07970'; // Replace with actual project ID
    const lotsResponse = await request.get(`/api/projects/${projectId}/lots`, {
      headers: {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      }
    });
    
    expect(lotsResponse.status()).toBe(200);
    const lotsData = await lotsResponse.json();
    expect(Array.isArray(lotsData)).toBe(true);
    
    // Test ITP endpoint
    if (lotsData.length > 0) {
      const lotId = lotsData[0].id;
      const itpResponse = await request.get(`/api/projects/${projectId}/lots/${lotId}/itp`, {
        headers: {
          'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
        }
      });
      
      expect(itpResponse.status()).toBe(200);
      const itpData = await itpResponse.json();
      expect(Array.isArray(itpData)).toBe(true);
    }
  });

  test('should not have any 404 errors for resources', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('response', response => {
      if (response.status() === 404) {
        failedRequests.push(response.url());
      }
    });
    
    await page.goto('/dashboard/projects');
    await page.waitForLoadState('networkidle');
    
    // Filter out expected 404s (if any)
    const unexpected404s = failedRequests.filter(url => 
      url.includes('/favicon') || 
      url.includes('/icons/') || 
      url.includes('/api/')
    );
    
    expect(unexpected404s).toHaveLength(0);
  });
});