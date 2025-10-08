import { chromium, devices } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * Visual Baseline Capture Script
 *
 * This script captures screenshots of the current design across
 * different viewport sizes and pages for visual regression testing.
 *
 * Usage: npx tsx tests/visual/capture-baseline.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(__dirname, 'baseline');

// Ensure output directories exist
const viewports = ['mobile', 'tablet', 'desktop'];
viewports.forEach((viewport) => {
  const dir = path.join(OUTPUT_DIR, viewport);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Viewport configurations
const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad Mini' },
  desktop: { width: 1920, height: 1080, name: 'Desktop' },
};

// Pages to capture (update based on your authentication state)
const PAGES_TO_CAPTURE = {
  public: [
    { name: 'home', path: '/' },
  ],
  authenticated: [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'projects', path: '/dashboard/projects' },
    { name: 'inspections', path: '/inspections' },
    { name: 'itps', path: '/dashboard/itp-templates' },
    { name: 'ncrs', path: '/ncr' },
    { name: 'diary', path: '/diary' },
  ],
};

async function captureScreenshots() {
  console.log('🎬 Starting visual baseline capture...\n');

  const browser = await chromium.launch({ headless: true });

  for (const [viewportName, viewportConfig] of Object.entries(VIEWPORTS)) {
    console.log(`📱 Capturing ${viewportName} (${viewportConfig.width}x${viewportConfig.height})...`);

    const context = await browser.newContext({
      viewport: { width: viewportConfig.width, height: viewportConfig.height },
      deviceScaleFactor: 2, // Retina display
    });

    const page = await context.newPage();

    // Capture public pages
    for (const pageInfo of PAGES_TO_CAPTURE.public) {
      try {
        console.log(`  📸 ${pageInfo.name}...`);
        await page.goto(`${BASE_URL}${pageInfo.path}`, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000); // Wait for animations

        const screenshotPath = path.join(OUTPUT_DIR, viewportName, `${pageInfo.name}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
        });
        console.log(`     ✅ Saved to ${screenshotPath}`);
      } catch (error) {
        console.error(`     ❌ Failed to capture ${pageInfo.name}:`, error.message);
      }
    }

    // TODO: Add authentication and capture protected pages
    // For now, we'll skip authenticated pages unless you're logged in
    console.log(`  ⚠️  Skipping authenticated pages (requires login)`);

    await context.close();
  }

  await browser.close();

  console.log('\n✅ Visual baseline capture complete!');
  console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}`);
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
