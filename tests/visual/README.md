# Visual Testing Workflow

Free visual regression testing using Playwright MCP tools and scripts.

## Directory Structure

```
tests/visual/
├── baseline/           # Original screenshots (before redesign)
│   ├── mobile/
│   ├── tablet/
│   └── desktop/
├── current/            # Current screenshots (after changes)
│   ├── mobile/
│   ├── tablet/
│   └── desktop/
├── diff/               # Visual diff images
│   ├── mobile/
│   ├── tablet/
│   └── desktop/
├── capture-baseline.ts # Script to capture baseline screenshots
├── compare.ts          # Script to compare current vs baseline
└── README.md           # This file
```

## Setup

Install dependencies:

```bash
# Install Playwright browsers
npx playwright install chromium

# Install image comparison library
pnpm add -D pngjs pixelmatch
pnpm add -D @types/pngjs @types/pixelmatch
```

## Workflow

### 1. Capture Baseline (Before Redesign)

Before starting the design overhaul, capture baseline screenshots:

```bash
# Make sure dev server is running
pnpm dev

# In another terminal, capture baseline
npx tsx tests/visual/capture-baseline.ts
```

This will create screenshots in `tests/visual/baseline/` for:
- Mobile (375x667)
- Tablet (768x1024)
- Desktop (1920x1080)

### 2. Make Design Changes

Work on your design overhaul, updating components and styles.

### 3. Capture Current Screenshots

After making changes, capture new screenshots:

```bash
# Update the script to save to 'current' directory
# Or manually copy capture-baseline.ts and modify OUTPUT_DIR

npx tsx tests/visual/capture-current.ts
```

### 4. Compare & Review Differences

Compare current screenshots against baseline:

```bash
npx tsx tests/visual/compare.ts
```

This will:
- Generate diff images in `tests/visual/diff/`
- Show pixel difference percentage
- Highlight changed areas in pink
- Exit with error if differences exceed 1% threshold

### 5. Review Diff Images

Open diff images to review visual changes:

```bash
# View all diff images
open tests/visual/diff/**/*.png

# Or open specific viewport
open tests/visual/diff/desktop/*.png
```

### 6. Update Baseline

If changes are intentional and approved:

```bash
# Replace baseline with current screenshots
rm -rf tests/visual/baseline
cp -r tests/visual/current tests/visual/baseline
```

## Pages Captured

### Public Pages
- Home page (`/`)

### Authenticated Pages (requires login)
- Dashboard (`/dashboard`)
- Projects (`/dashboard/projects`)
- Inspections (`/inspections`)
- ITP Templates (`/dashboard/itp-templates`)
- NCRs (`/ncr`)
- Daily Diary (`/diary`)

## Adding Authentication

To capture authenticated pages, update `capture-baseline.ts`:

```typescript
// Add before capturing authenticated pages
await page.goto(`${BASE_URL}/login`);
await page.fill('[name="email"]', 'your-email@example.com');
await page.fill('[name="password"]', 'your-password');
await page.click('button[type="submit"]');
await page.waitForURL('**/dashboard');
```

## Customization

### Adjust Viewports

Edit `VIEWPORTS` in `capture-baseline.ts`:

```typescript
const VIEWPORTS = {
  mobile: { width: 375, height: 667, name: 'iPhone SE' },
  tablet: { width: 768, height: 1024, name: 'iPad Mini' },
  desktop: { width: 1920, height: 1080, name: 'Desktop' },
  // Add more:
  'tablet-landscape': { width: 1024, height: 768, name: 'iPad Landscape' },
};
```

### Add More Pages

Edit `PAGES_TO_CAPTURE`:

```typescript
const PAGES_TO_CAPTURE = {
  public: [
    { name: 'home', path: '/' },
    { name: 'pricing', path: '/pricing' },
  ],
  authenticated: [
    { name: 'dashboard', path: '/dashboard' },
    { name: 'settings', path: '/settings' },
    // Add more pages
  ],
};
```

### Adjust Difference Threshold

Edit `compare.ts`:

```typescript
const passed = percentageDiff < 1.0; // Change from 1% to your tolerance
```

## CI/CD Integration

Add to `.github/workflows/visual-regression.yml`:

```yaml
name: Visual Regression Tests

on: [pull_request]

jobs:
  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright
        run: npx playwright install chromium

      - name: Start dev server
        run: pnpm dev &

      - name: Wait for server
        run: npx wait-on http://localhost:3000

      - name: Capture screenshots
        run: npx tsx tests/visual/capture-current.ts

      - name: Compare with baseline
        run: npx tsx tests/visual/compare.ts

      - name: Upload diff images
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: visual-diffs
          path: tests/visual/diff/
```

## Tips

1. **Ignore Dynamic Content**: Mask timestamps, user names, etc.
2. **Wait for Animations**: Add `await page.waitForTimeout(1000)` after navigation
3. **Disable Animations**: Add CSS to disable transitions during capture
4. **Use Full Page**: Set `fullPage: true` for scrollable pages
5. **Hide Flaky Elements**: Use `await page.locator('.dynamic').evaluate(el => el.style.visibility = 'hidden')`

## Cost

**Total: $0/month** - Completely free using Playwright and pngjs!

## Comparison with Percy

| Feature | Percy | This Setup |
|---------|-------|------------|
| Cost | $149/month | $0/month |
| Screenshot Capture | ✅ | ✅ |
| Visual Diff | ✅ | ✅ |
| Multiple Viewports | ✅ | ✅ |
| CI/CD Integration | ✅ | ✅ |
| Review Dashboard | ✅ | ❌ (manual) |
| History Tracking | ✅ | ❌ (git-based) |
| Auto-approval | ✅ | ❌ (manual) |

## Support

For issues or questions, see:
- [Playwright Documentation](https://playwright.dev/)
- [pngjs Documentation](https://www.npmjs.com/package/pngjs)
- [pixelmatch Documentation](https://www.npmjs.com/package/pixelmatch)
