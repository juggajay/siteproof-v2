import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

/**
 * Visual Comparison Script
 *
 * Compares current screenshots against baseline to detect visual regressions.
 *
 * Usage: npx tsx tests/visual/compare.ts
 */

const BASELINE_DIR = path.join(__dirname, 'baseline');
const CURRENT_DIR = path.join(__dirname, 'current');
const DIFF_DIR = path.join(__dirname, 'diff');

// Ensure directories exist
[CURRENT_DIR, DIFF_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

interface ComparisonResult {
  viewport: string;
  page: string;
  baselinePath: string;
  currentPath: string;
  diffPath: string;
  pixelsDifferent: number;
  percentageDiff: number;
  passed: boolean;
}

async function compareImages(
  baselinePath: string,
  currentPath: string,
  diffPath: string,
  threshold: number = 0.1
): Promise<{ pixelsDifferent: number; totalPixels: number }> {
  const baseline = PNG.sync.read(fs.readFileSync(baselinePath));
  const current = PNG.sync.read(fs.readFileSync(currentPath));

  const { width, height } = baseline;
  const diff = new PNG({ width, height });

  const pixelsDifferent = pixelmatch(
    baseline.data,
    current.data,
    diff.data,
    width,
    height,
    { threshold }
  );

  fs.writeFileSync(diffPath, PNG.sync.write(diff));

  return {
    pixelsDifferent,
    totalPixels: width * height,
  };
}

async function runComparison() {
  console.log('🔍 Starting visual comparison...\n');

  const results: ComparisonResult[] = [];
  const viewports = ['mobile', 'tablet', 'desktop'];

  for (const viewport of viewports) {
    const baselineViewportDir = path.join(BASELINE_DIR, viewport);
    const currentViewportDir = path.join(CURRENT_DIR, viewport);
    const diffViewportDir = path.join(DIFF_DIR, viewport);

    if (!fs.existsSync(baselineViewportDir)) {
      console.log(`⚠️  No baseline found for ${viewport}, skipping...`);
      continue;
    }

    if (!fs.existsSync(diffViewportDir)) {
      fs.mkdirSync(diffViewportDir, { recursive: true });
    }

    const baselineFiles = fs.readdirSync(baselineViewportDir).filter((f) => f.endsWith('.png'));

    console.log(`📱 Comparing ${viewport} screenshots...`);

    for (const file of baselineFiles) {
      const pageName = file.replace('.png', '');
      const baselinePath = path.join(baselineViewportDir, file);
      const currentPath = path.join(currentViewportDir, file);
      const diffPath = path.join(diffViewportDir, file);

      if (!fs.existsSync(currentPath)) {
        console.log(`  ⚠️  ${pageName}: No current screenshot found`);
        continue;
      }

      try {
        const { pixelsDifferent, totalPixels } = await compareImages(
          baselinePath,
          currentPath,
          diffPath
        );

        const percentageDiff = (pixelsDifferent / totalPixels) * 100;
        const passed = percentageDiff < 1.0; // 1% tolerance

        results.push({
          viewport,
          page: pageName,
          baselinePath,
          currentPath,
          diffPath,
          pixelsDifferent,
          percentageDiff,
          passed,
        });

        const status = passed ? '✅' : '❌';
        console.log(
          `  ${status} ${pageName}: ${percentageDiff.toFixed(2)}% different (${pixelsDifferent} pixels)`
        );
      } catch (error) {
        console.error(`  ❌ ${pageName}: Comparison failed -`, error.message);
      }
    }
  }

  // Summary
  console.log('\n📊 Summary:');
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📁 Diff images saved to: ${DIFF_DIR}`);

  if (failed > 0) {
    console.log('\n⚠️  Visual regression detected! Review diff images.');
    process.exit(1);
  } else {
    console.log('\n✅ No visual regressions detected!');
  }
}

runComparison().catch((error) => {
  console.error('❌ Comparison failed:', error);
  process.exit(1);
});
