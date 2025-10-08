# Production Safety Architecture - Design Overhaul Migration

**Document Version:** 1.0
**Date:** October 8, 2025
**Status:** Implementation Ready
**Migration Target:** Zero-Downtime Production Deployment

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Flag Architecture](#1-feature-flag-architecture)
3. [Comprehensive Testing Strategy](#2-comprehensive-testing-strategy)
4. [Rollback Mechanisms](#3-rollback-mechanisms)
5. [Production Monitoring](#4-production-monitoring)
6. [Data Migration Safety](#5-data-migration-safety)
7. [Deployment Strategy](#6-deployment-strategy)
8. [Emergency Procedures](#7-emergency-procedures)
9. [Success Criteria](#8-success-criteria)
10. [Pre-Flight Checklists](#9-pre-flight-checklists)

---

## Executive Summary

This document outlines a bulletproof, zero-downtime migration strategy for the SiteProof v2 design overhaul. The architecture ensures:

- **Progressive Rollout**: 5% → 25% → 50% → 100% with automatic fallback
- **Instant Rollback**: Feature flags enable immediate reversion without deployment
- **Data Safety**: Comprehensive backup and migration strategies for user preferences
- **Production Monitoring**: Real-time error tracking, performance metrics, and user analytics
- **Test Coverage**: E2E, visual regression, accessibility, and performance benchmarks

### Key Technologies

- **Feature Flags**: Flagsmith (self-hosted) with environment variable fallback
- **Testing**: Playwright (E2E), Percy (Visual), jest-axe (A11y), Lighthouse CI (Performance)
- **Monitoring**: Sentry (Errors), Vercel Analytics (Performance), PostHog (Behavior)
- **Rollback**: Git-based with feature flag overrides

---

## 1. Feature Flag Architecture

### 1.1 Technology Selection

**Recommended Solution: Flagsmith (Self-Hosted)**

**Rationale:**
- Open-source with self-hosting capability
- REST API + React SDK for seamless integration
- Segment-based targeting (by user role, organization, location)
- Real-time flag updates without deployment
- Audit logging and change history
- A/B testing capabilities built-in
- Free for self-hosted deployments

**Alternative: Environment Variables (Fallback)**
- Zero external dependencies
- Immediate implementation
- Limited to deployment-level rollouts
- No real-time updates

### 1.2 Implementation Architecture

#### Flag Hierarchy

```typescript
// /apps/web/src/lib/feature-flags/types.ts

export interface FeatureFlags {
  // Global Design System Flags
  'design-system-v2': boolean;
  'design-system-rollout-percentage': number;

  // Component-Level Flags
  'new-navigation': boolean;
  'new-dashboard-widgets': boolean;
  'new-form-components': boolean;
  'new-mobile-ui': boolean;
  'new-data-tables': boolean;
  'new-modals': boolean;

  // Feature-Specific Flags
  'enhanced-itp-forms': boolean;
  'redesigned-ncr-workflow': boolean;
  'new-daily-diary': boolean;
  'improved-project-view': boolean;

  // Performance Optimizations
  'enable-virtual-scrolling': boolean;
  'lazy-load-images': boolean;
  'prefetch-routes': boolean;

  // A/B Testing
  'color-scheme-variant': 'blue' | 'green' | 'purple';
  'dashboard-layout': 'grid' | 'list' | 'compact';
}

export type FeatureFlagKey = keyof FeatureFlags;
```

#### Flag Provider Setup

```typescript
// /apps/web/src/lib/feature-flags/provider.tsx

'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import flagsmith from 'flagsmith';

interface FlagContextValue {
  flags: FeatureFlags;
  isReady: boolean;
  identify: (userId: string, traits: Record<string, any>) => void;
  refresh: () => Promise<void>;
}

const FlagContext = createContext<FlagContextValue | null>(null);

export function FeatureFlagProvider({
  children,
  initialFlags
}: {
  children: React.ReactNode;
  initialFlags?: Partial<FeatureFlags>;
}) {
  const [flags, setFlags] = useState<FeatureFlags>({
    'design-system-v2': false,
    'design-system-rollout-percentage': 0,
    'new-navigation': false,
    'new-dashboard-widgets': false,
    'new-form-components': false,
    'new-mobile-ui': false,
    'new-data-tables': false,
    'new-modals': false,
    'enhanced-itp-forms': false,
    'redesigned-ncr-workflow': false,
    'new-daily-diary': false,
    'improved-project-view': false,
    'enable-virtual-scrolling': false,
    'lazy-load-images': false,
    'prefetch-routes': false,
    'color-scheme-variant': 'blue',
    'dashboard-layout': 'grid',
    ...initialFlags,
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize Flagsmith
    flagsmith.init({
      environmentID: process.env.NEXT_PUBLIC_FLAGSMITH_ENV_ID!,
      api: process.env.NEXT_PUBLIC_FLAGSMITH_API_URL,
      cacheFlags: true,
      enableAnalytics: true,
      onChange: (oldFlags, params) => {
        updateFlags();
      },
    });

    updateFlags();
  }, []);

  const updateFlags = async () => {
    try {
      await flagsmith.hasFeature('design-system-v2');

      const newFlags: FeatureFlags = {
        'design-system-v2': flagsmith.hasFeature('design-system-v2'),
        'design-system-rollout-percentage': flagsmith.getValue('design-system-rollout-percentage') || 0,
        'new-navigation': flagsmith.hasFeature('new-navigation'),
        'new-dashboard-widgets': flagsmith.hasFeature('new-dashboard-widgets'),
        'new-form-components': flagsmith.hasFeature('new-form-components'),
        'new-mobile-ui': flagsmith.hasFeature('new-mobile-ui'),
        'new-data-tables': flagsmith.hasFeature('new-data-tables'),
        'new-modals': flagsmith.hasFeature('new-modals'),
        'enhanced-itp-forms': flagsmith.hasFeature('enhanced-itp-forms'),
        'redesigned-ncr-workflow': flagsmith.hasFeature('redesigned-ncr-workflow'),
        'new-daily-diary': flagsmith.hasFeature('new-daily-diary'),
        'improved-project-view': flagsmith.hasFeature('improved-project-view'),
        'enable-virtual-scrolling': flagsmith.hasFeature('enable-virtual-scrolling'),
        'lazy-load-images': flagsmith.hasFeature('lazy-load-images'),
        'prefetch-routes': flagsmith.hasFeature('prefetch-routes'),
        'color-scheme-variant': (flagsmith.getValue('color-scheme-variant') || 'blue') as any,
        'dashboard-layout': (flagsmith.getValue('dashboard-layout') || 'grid') as any,
      };

      setFlags(newFlags);
      setIsReady(true);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
      // Fallback to environment variables
      setFlags(getFallbackFlags());
      setIsReady(true);
    }
  };

  const identify = (userId: string, traits: Record<string, any>) => {
    flagsmith.identify(userId, traits);
  };

  const refresh = async () => {
    await flagsmith.getFlags();
    updateFlags();
  };

  return (
    <FlagContext.Provider value={{ flags, isReady, identify, refresh }}>
      {children}
    </FlagContext.Provider>
  );
}

export function useFeatureFlags() {
  const context = useContext(FlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within FeatureFlagProvider');
  }
  return context;
}

export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { flags } = useFeatureFlags();
  return Boolean(flags[key]);
}

// Fallback to environment variables
function getFallbackFlags(): FeatureFlags {
  return {
    'design-system-v2': process.env.NEXT_PUBLIC_ENABLE_NEW_DESIGN === 'true',
    'design-system-rollout-percentage': Number(process.env.NEXT_PUBLIC_ROLLOUT_PERCENTAGE || 0),
    'new-navigation': process.env.NEXT_PUBLIC_NEW_NAVIGATION === 'true',
    'new-dashboard-widgets': process.env.NEXT_PUBLIC_NEW_DASHBOARD_WIDGETS === 'true',
    'new-form-components': process.env.NEXT_PUBLIC_NEW_FORM_COMPONENTS === 'true',
    'new-mobile-ui': process.env.NEXT_PUBLIC_NEW_MOBILE_UI === 'true',
    'new-data-tables': process.env.NEXT_PUBLIC_NEW_DATA_TABLES === 'true',
    'new-modals': process.env.NEXT_PUBLIC_NEW_MODALS === 'true',
    'enhanced-itp-forms': false,
    'redesigned-ncr-workflow': false,
    'new-daily-diary': false,
    'improved-project-view': false,
    'enable-virtual-scrolling': true,
    'lazy-load-images': true,
    'prefetch-routes': false,
    'color-scheme-variant': 'blue',
    'dashboard-layout': 'grid',
  };
}
```

#### Component-Level Feature Flag Usage

```typescript
// /apps/web/src/components/navigation/AppNavigation.tsx

'use client';

import { useFeatureFlag } from '@/lib/feature-flags';
import { NavigationV1 } from './NavigationV1';
import { NavigationV2 } from './NavigationV2';

export function AppNavigation() {
  const useNewNavigation = useFeatureFlag('new-navigation');

  if (useNewNavigation) {
    return <NavigationV2 />;
  }

  return <NavigationV1 />;
}
```

```typescript
// /apps/web/src/app/dashboard/page.tsx

'use client';

import { useFeatureFlags } from '@/lib/feature-flags';
import { DashboardV1 } from './DashboardV1';
import { DashboardV2 } from './DashboardV2';

export default function DashboardPage() {
  const { flags } = useFeatureFlags();
  const enableNewDesign = flags['design-system-v2'];

  if (enableNewDesign) {
    return <DashboardV2 />;
  }

  return <DashboardV1 />;
}
```

### 1.3 Gradual Rollout Strategy

#### Phase 1: Internal Testing (0-5%)
**Duration:** Week 1
**Audience:** Internal team only
**Segments:**
```javascript
// Flagsmith Segment: "internal-team"
{
  "rules": [
    {
      "type": "email",
      "operator": "CONTAINS",
      "value": "@siteproof.com"
    }
  ]
}
```

**Flags Configuration:**
- `design-system-v2`: `true`
- `design-system-rollout-percentage`: `5`
- All component flags: `true`

#### Phase 2: Beta Users (5-25%)
**Duration:** Week 2-3
**Audience:** Opted-in beta testers + power users
**Segments:**
```javascript
// Flagsmith Segment: "beta-users"
{
  "rules": [
    {
      "type": "trait",
      "trait_key": "beta_tester",
      "operator": "EQUAL",
      "value": "true"
    },
    {
      "type": "trait",
      "trait_key": "user_role",
      "operator": "IN",
      "value": ["admin", "project_manager"]
    }
  ]
}
```

**Flags Configuration:**
- `design-system-rollout-percentage`: `25`
- Monitor error rates < 0.5%
- Performance degradation < 10%

#### Phase 3: Controlled Rollout (25-50%)
**Duration:** Week 4-5
**Audience:** Randomly selected 50% of users
**Segments:**
```javascript
// Flagsmith Segment: "rollout-50-percent"
{
  "rules": [
    {
      "type": "percentage_split",
      "value": 50
    }
  ]
}
```

**Success Criteria:**
- Error rate < 1%
- Average page load < 3s
- No critical bugs reported
- Positive user feedback (NPS > 40)

#### Phase 4: Full Rollout (50-100%)
**Duration:** Week 6
**Audience:** All users
**Flags Configuration:**
- `design-system-v2`: `true` (default)
- `design-system-rollout-percentage`: `100`

**Monitoring:**
- 24-hour intensive monitoring
- On-call engineer available
- Instant rollback plan ready

### 1.4 A/B Testing Configuration

```typescript
// /apps/web/src/lib/feature-flags/ab-test.ts

export function useABTest(testName: string, variants: string[]) {
  const { flags } = useFeatureFlags();
  const variant = flags[testName as FeatureFlagKey] as string;

  useEffect(() => {
    // Track variant assignment
    if (typeof window !== 'undefined' && window.posthog) {
      window.posthog.capture('ab_test_assigned', {
        test_name: testName,
        variant: variant,
      });
    }
  }, [testName, variant]);

  return variant;
}

// Usage Example
function DashboardHeader() {
  const colorVariant = useABTest('color-scheme-variant', ['blue', 'green', 'purple']);

  const headerColors = {
    blue: 'bg-primary-600',
    green: 'bg-success-600',
    purple: 'bg-purple-600',
  };

  return (
    <header className={headerColors[colorVariant]}>
      {/* ... */}
    </header>
  );
}
```

---

## 2. Comprehensive Testing Strategy

### 2.1 End-to-End Testing (Playwright)

#### Critical User Paths to Test

```typescript
// /apps/web/tests/e2e/critical-paths.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Critical Path: Authentication', () => {
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/auth/login');

    // Test both old and new login forms
    const useNewDesign = await page.evaluate(() => {
      return localStorage.getItem('ff_design-system-v2') === 'true';
    });

    await page.fill('[name="email"]', 'test@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('text=Welcome')).toBeVisible();
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    await page.goto('/auth/login');

    await page.fill('[name="email"]', 'invalid@email.com');
    await page.fill('[name="password"]', 'wrong-password');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Invalid credentials')).toBeVisible();
  });
});

test.describe('Critical Path: Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'test@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');
  });

  test('should load dashboard widgets', async ({ page }) => {
    // Wait for skeleton loaders to disappear
    await page.waitForSelector('[data-testid="skeleton-loader"]', { state: 'hidden' });

    // Verify key widgets are present
    await expect(page.locator('[data-testid="project-summary-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="active-itps-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="ncr-overview-widget"]')).toBeVisible();
  });

  test('should allow widget rearrangement', async ({ page }) => {
    const widget = page.locator('[data-testid="project-summary-widget"]');
    const targetPosition = page.locator('[data-testid="widget-drop-zone-2"]');

    await widget.dragTo(targetPosition);

    // Verify position changed
    const newPosition = await widget.getAttribute('data-position');
    expect(newPosition).toBe('2');
  });
});

test.describe('Critical Path: ITP Form Submission', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'inspector@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');
  });

  test('should submit ITP form successfully', async ({ page }) => {
    await page.goto('/dashboard/projects/test-project/lots/test-lot/itp/test-itp');

    // Fill form fields
    await page.fill('[name="inspector_name"]', 'John Doe');
    await page.selectOption('[name="status"]', 'approved');
    await page.fill('[name="comments"]', 'All checks passed');

    // Upload photo
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('./test-fixtures/inspection-photo.jpg');

    // Submit form
    await page.click('button[type="submit"]');

    // Verify success
    await expect(page.locator('text=Form submitted successfully')).toBeVisible();
  });

  test('should handle offline submission', async ({ page, context }) => {
    // Go to ITP form
    await page.goto('/dashboard/projects/test-project/lots/test-lot/itp/test-itp');

    // Simulate offline mode
    await context.setOffline(true);

    // Fill and submit form
    await page.fill('[name="inspector_name"]', 'John Doe');
    await page.click('button[type="submit"]');

    // Verify offline queue message
    await expect(page.locator('text=Saved offline')).toBeVisible();

    // Go back online
    await context.setOffline(false);

    // Trigger sync
    await page.click('[data-testid="sync-button"]');

    // Verify sync success
    await expect(page.locator('text=Synced successfully')).toBeVisible();
  });
});

test.describe('Critical Path: NCR Workflow', () => {
  test('should create and resolve NCR', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'pm@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    // Navigate to NCR page
    await page.goto('/dashboard/ncrs/new');

    // Fill NCR form
    await page.fill('[name="title"]', 'Concrete defect');
    await page.fill('[name="description"]', 'Surface cracks detected');
    await page.selectOption('[name="severity"]', 'high');
    await page.selectOption('[name="assigned_to"]', 'contractor-1');

    // Submit NCR
    await page.click('button[type="submit"]');

    // Verify creation
    await expect(page.locator('text=NCR created successfully')).toBeVisible();

    // Get NCR ID from URL
    const url = page.url();
    const ncrId = url.split('/').pop();

    // Acknowledge NCR (as contractor)
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'contractor@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    await page.goto(`/dashboard/ncrs/${ncrId}`);
    await page.click('button[data-action="acknowledge"]');

    // Verify status change
    await expect(page.locator('text=Acknowledged')).toBeVisible();
  });
});

test.describe('Critical Path: Daily Diary Export', () => {
  test('should export daily diary as PDF', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'pm@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    await page.goto('/dashboard/diaries');

    // Select diary entry
    await page.click('[data-testid="diary-entry-1"]');

    // Export as PDF
    const downloadPromise = page.waitForEvent('download');
    await page.click('button[data-action="export-pdf"]');
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
  });
});
```

#### Feature Flag Testing

```typescript
// /apps/web/tests/e2e/feature-flags.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Feature Flag Behavior', () => {
  test('should render old UI when flag is disabled', async ({ page }) => {
    // Set feature flag to false
    await page.addInitScript(() => {
      localStorage.setItem('ff_design-system-v2', 'false');
    });

    await page.goto('/dashboard');

    // Verify old UI elements
    await expect(page.locator('[data-version="v1"]')).toBeVisible();
    await expect(page.locator('[data-version="v2"]')).not.toBeVisible();
  });

  test('should render new UI when flag is enabled', async ({ page }) => {
    // Set feature flag to true
    await page.addInitScript(() => {
      localStorage.setItem('ff_design-system-v2', 'true');
    });

    await page.goto('/dashboard');

    // Verify new UI elements
    await expect(page.locator('[data-version="v2"]')).toBeVisible();
    await expect(page.locator('[data-version="v1"]')).not.toBeVisible();
  });

  test('should switch UI when flag changes', async ({ page }) => {
    await page.goto('/dashboard');

    // Start with old UI
    await page.evaluate(() => {
      localStorage.setItem('ff_design-system-v2', 'false');
    });
    await page.reload();
    await expect(page.locator('[data-version="v1"]')).toBeVisible();

    // Enable new UI
    await page.evaluate(() => {
      localStorage.setItem('ff_design-system-v2', 'true');
    });
    await page.reload();
    await expect(page.locator('[data-version="v2"]')).toBeVisible();
  });
});
```

#### Mobile Testing

```typescript
// /apps/web/tests/e2e/mobile.spec.ts

import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 13 Pro'],
});

test.describe('Mobile Critical Paths', () => {
  test('should handle mobile ITP form submission', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'inspector@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    await page.goto('/dashboard/inspections/new');

    // Verify touch-friendly UI
    const submitButton = page.locator('button[type="submit"]');
    const buttonSize = await submitButton.boundingBox();
    expect(buttonSize?.height).toBeGreaterThanOrEqual(44); // iOS minimum

    // Test camera photo capture
    await page.click('[data-action="capture-photo"]');
    // Camera permissions would be mocked in real tests
  });

  test('should support offline inspection', async ({ page, context }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'inspector@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    // Load inspection data while online
    await page.goto('/dashboard/inspections/test-inspection');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Verify offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();

    // Submit inspection offline
    await page.fill('[name="comments"]', 'Offline test');
    await page.click('button[type="submit"]');

    // Verify queued for sync
    await expect(page.locator('text=Saved offline')).toBeVisible();
  });
});
```

### 2.2 Visual Regression Testing (Percy)

#### Setup Percy

```bash
# Install Percy
pnpm add --save-dev @percy/cli @percy/playwright

# Update playwright.config.ts
```

```typescript
// /apps/web/playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // ... existing config
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'percy-chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Percy-specific settings
      },
    },
    {
      name: 'percy-mobile',
      use: {
        ...devices['iPhone 13 Pro'],
      },
    },
  ],
});
```

#### Visual Test Suite

```typescript
// /apps/web/tests/visual/component-snapshots.spec.ts

import { test } from '@playwright/test';
import percySnapshot from '@percy/playwright';

test.describe('Visual Regression: Components', () => {
  test('Button variants', async ({ page }) => {
    await page.goto('/design-system/components/button');
    await percySnapshot(page, 'Button - All Variants');
  });

  test('Form inputs', async ({ page }) => {
    await page.goto('/design-system/components/forms');

    // Test different states
    await percySnapshot(page, 'Forms - Default State');

    // Focus state
    await page.focus('[name="email"]');
    await percySnapshot(page, 'Forms - Focus State');

    // Error state
    await page.click('button[type="submit"]');
    await percySnapshot(page, 'Forms - Error State');
  });

  test('Dashboard widgets', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for data to load
    await page.waitForSelector('[data-testid="skeleton-loader"]', { state: 'hidden' });

    await percySnapshot(page, 'Dashboard - Default Layout', {
      widths: [375, 768, 1280, 1920],
    });
  });

  test('Navigation menu', async ({ page }) => {
    await page.goto('/dashboard');

    // Desktop navigation
    await percySnapshot(page, 'Navigation - Desktop');

    // Mobile menu
    await page.setViewportSize({ width: 375, height: 667 });
    await page.click('[data-testid="mobile-menu-toggle"]');
    await percySnapshot(page, 'Navigation - Mobile Expanded');
  });

  test('Modal components', async ({ page }) => {
    await page.goto('/dashboard');

    // Open modal
    await page.click('[data-action="open-modal"]');
    await percySnapshot(page, 'Modal - Open State');
  });

  test('Data tables', async ({ page }) => {
    await page.goto('/dashboard/projects');

    await percySnapshot(page, 'Data Table - Default', {
      widths: [1280],
    });

    // Sorted state
    await page.click('[data-column="name"]');
    await percySnapshot(page, 'Data Table - Sorted');

    // Filtered state
    await page.fill('[data-filter="search"]', 'test project');
    await percySnapshot(page, 'Data Table - Filtered');
  });
});

test.describe('Visual Regression: Dark Mode', () => {
  test('should render dark mode correctly', async ({ page }) => {
    await page.goto('/dashboard');

    // Enable dark mode
    await page.evaluate(() => {
      localStorage.setItem('theme', 'dark');
    });
    await page.reload();

    await percySnapshot(page, 'Dashboard - Dark Mode', {
      widths: [375, 1280],
    });
  });
});
```

#### Percy Configuration

```yaml
# /apps/web/.percy.yml

version: 2
static:
  include:
    - "**/*.png"
    - "**/*.jpg"
    - "**/*.svg"
snapshot:
  widths:
    - 375
    - 768
    - 1280
    - 1920
  min-height: 1024
  percy-css: |
    /* Hide dynamic content from snapshots */
    [data-testid="current-time"],
    [data-testid="notification-badge"] {
      visibility: hidden;
    }
```

### 2.3 Accessibility Testing (jest-axe)

#### Setup

```bash
pnpm add --save-dev jest-axe @axe-core/playwright
```

#### Automated A11y Tests

```typescript
// /apps/web/tests/a11y/accessibility.spec.ts

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility: WCAG 2.1 AA Compliance', () => {
  test('should have no accessibility violations on login page', async ({ page }) => {
    await page.goto('/auth/login');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have no violations on dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"]', 'test@siteproof.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    await page.waitForURL('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper keyboard navigation', async ({ page }) => {
    await page.goto('/dashboard/ncrs');

    // Tab through form inputs
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('name', 'title');

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('name', 'description');

    // Tab to submit button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveAttribute('type', 'submit');
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard');

    // Check navigation
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Check form labels
    await page.goto('/dashboard/ncrs/new');
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toHaveAttribute('aria-label');
  });

  test('should support screen readers', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for proper heading hierarchy
    const h1 = page.locator('h1');
    await expect(h1).toHaveCount(1);

    // Check for skip links
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeVisible();
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .options({ rules: { 'color-contrast': { enabled: true } } })
      .analyze();

    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast'
    );

    expect(contrastViolations).toEqual([]);
  });
});

test.describe('Accessibility: Form Components', () => {
  test('should have accessible form errors', async ({ page }) => {
    await page.goto('/dashboard/ncrs/new');

    // Submit empty form
    await page.click('button[type="submit"]');

    // Check for aria-invalid
    const titleInput = page.locator('input[name="title"]');
    await expect(titleInput).toHaveAttribute('aria-invalid', 'true');

    // Check for error message association
    const errorId = await titleInput.getAttribute('aria-describedby');
    const errorMessage = page.locator(`#${errorId}`);
    await expect(errorMessage).toBeVisible();
  });

  test('should have accessible date pickers', async ({ page }) => {
    await page.goto('/dashboard/diaries/new');

    const datePicker = page.locator('[role="dialog"][aria-label*="calendar"]');

    // Open date picker
    await page.click('button[aria-label="Choose date"]');
    await expect(datePicker).toBeVisible();

    // Navigate with keyboard
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Enter');

    // Verify selection
    await expect(datePicker).not.toBeVisible();
  });
});
```

### 2.4 Performance Testing (Lighthouse CI)

#### Lighthouse CI Configuration

```javascript
// /apps/web/.lighthouserc.js

module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: 'pnpm run start',
      url: [
        'http://localhost:3000',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/dashboard/projects',
        'http://localhost:3000/dashboard/ncrs',
        'http://localhost:3000/dashboard/inspections',
      ],
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['error', { maxNumericValue: 3000 }],

        // Bundle size
        'total-byte-weight': ['warn', { maxNumericValue: 500000 }],
        'unused-javascript': ['warn', { maxNumericValue: 100000 }],

        // Accessibility
        'aria-required-attr': 'error',
        'color-contrast': 'error',
        'valid-lang': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

#### Performance Monitoring Script

```typescript
// /apps/web/tests/performance/metrics.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Performance Metrics', () => {
  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/dashboard');

    const metrics = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {
            lcp: 0,
            fid: 0,
            cls: 0,
          };

          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'first-input') {
              vitals.fid = (entry as any).processingStart - entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              vitals.cls += (entry as any).value;
            }
          });

          resolve(vitals);
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      });
    });

    // Assert Core Web Vitals
    expect((metrics as any).lcp).toBeLessThan(2500); // LCP < 2.5s
    expect((metrics as any).fid).toBeLessThan(100);  // FID < 100ms
    expect((metrics as any).cls).toBeLessThan(0.1);  // CLS < 0.1
  });

  test('should load dashboard within performance budget', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForSelector('[data-testid="skeleton-loader"]', { state: 'hidden' });

    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(3000); // 3 second budget
  });

  test('should have efficient JavaScript execution', async ({ page }) => {
    await page.goto('/dashboard');

    const jsExecutionTime = await page.evaluate(() => {
      const entries = performance.getEntriesByType('measure');
      return entries.reduce((total, entry) => total + entry.duration, 0);
    });

    expect(jsExecutionTime).toBeLessThan(1000); // < 1s JS execution
  });
});
```

### 2.5 Test Execution Schedule

```yaml
# /.github/workflows/test-suite.yml

name: Comprehensive Test Suite

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:coverage
      - uses: codecov/codecov-action@v3

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm playwright install --with-deps
      - run: pnpm test:e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  visual-regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm percy:test
        env:
          PERCY_TOKEN: ${{ secrets.PERCY_TOKEN }}

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:a11y

  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm lighthouse:ci
      - uses: treosh/lighthouse-ci-action@v9
        with:
          configPath: '.lighthouserc.js'
          uploadArtifacts: true
```

---

## 3. Rollback Mechanisms

### 3.1 Instant Rollback via Feature Flags

**Primary Rollback Method** - No deployment required

#### Emergency Rollback Procedure

```bash
# Option 1: Flagsmith Dashboard
# 1. Login to Flagsmith dashboard
# 2. Navigate to "design-system-v2" flag
# 3. Click "Disable"
# 4. Changes propagate within 60 seconds

# Option 2: Flagsmith API (Automated)
curl -X PUT \
  https://flagsmith.siteproof.com/api/v1/features/design-system-v2/ \
  -H "Authorization: Token ${FLAGSMITH_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "description": "Emergency rollback - ${REASON}"
  }'

# Option 3: Environment Variable Override (requires deployment)
# Update .env.production
NEXT_PUBLIC_ENABLE_NEW_DESIGN=false
NEXT_PUBLIC_FORCE_OLD_DESIGN=true

# Redeploy (Vercel instant rollback)
vercel --prod
```

#### Rollback Decision Matrix

| Severity | Error Rate | User Impact | Action | Response Time |
|----------|-----------|-------------|--------|---------------|
| **P0 - Critical** | > 5% | Complete service outage | Immediate rollback | < 5 minutes |
| **P1 - High** | 2-5% | Major feature broken | Rollback within 15 min | < 15 minutes |
| **P2 - Medium** | 0.5-2% | Minor feature impacted | Targeted component rollback | < 1 hour |
| **P3 - Low** | < 0.5% | Visual glitch | Monitor and fix forward | < 24 hours |

### 3.2 Component-Level Rollback

```typescript
// /apps/web/src/lib/feature-flags/rollback.ts

export interface RollbackConfig {
  component: string;
  reason: string;
  fallbackVersion: 'v1' | 'v2';
  affectedUsers?: string[];
  timestamp: string;
}

export async function rollbackComponent(config: RollbackConfig) {
  // Update Flagsmith
  await fetch('/api/feature-flags/rollback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      flag: `new-${config.component}`,
      enabled: false,
      metadata: {
        reason: config.reason,
        rollback_at: config.timestamp,
        rollback_by: 'system',
      },
    }),
  });

  // Log rollback event
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('component_rollback', {
      component: config.component,
      reason: config.reason,
      timestamp: config.timestamp,
    });
  }

  // Notify team
  await fetch('/api/notifications/slack', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      channel: '#incidents',
      text: `🔄 Component Rollback: ${config.component}\nReason: ${config.reason}`,
    }),
  });
}
```

### 3.3 Database Migration Rollback

Since the design overhaul primarily affects the frontend, database migrations are minimal. However, if user preference storage is added:

```sql
-- /apps/web/migrations/rollback/001_user_preferences.sql

-- Rollback user design preferences
BEGIN;

-- Backup current preferences
CREATE TABLE IF NOT EXISTS user_preferences_backup_20251008 AS
SELECT * FROM user_preferences;

-- Remove new design-related preferences
DELETE FROM user_preferences
WHERE preference_key IN (
  'ui_version',
  'color_scheme_variant',
  'dashboard_layout',
  'widget_positions'
);

-- Restore default preferences
UPDATE users
SET preferences = jsonb_set(
  COALESCE(preferences, '{}'::jsonb),
  '{ui_version}',
  '"v1"'
)
WHERE preferences->>'ui_version' = 'v2';

COMMIT;
```

### 3.4 Asset Versioning Strategy

```typescript
// /apps/web/next.config.mjs

const nextConfig = {
  // ... existing config

  // Asset versioning for cache busting
  generateBuildId: async () => {
    // Use git commit hash + timestamp
    const commitHash = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev';
    const timestamp = Date.now();
    return `${commitHash}-${timestamp}`;
  },

  // CDN cache control
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

### 3.5 User Preference Preservation

```typescript
// /apps/web/src/lib/migration/preserve-preferences.ts

export async function migrateUserPreferences() {
  // Read current preferences
  const currentPrefs = {
    theme: localStorage.getItem('theme'),
    dashboardLayout: localStorage.getItem('dashboardLayout'),
    widgetPositions: localStorage.getItem('widgetPositions'),
    customFilters: localStorage.getItem('customFilters'),
  };

  // Backup to IndexedDB
  const db = await openDB('SiteProofPreferences', 1, {
    upgrade(db) {
      db.createObjectStore('backups', { keyPath: 'id' });
    },
  });

  await db.put('backups', {
    id: 'pre-migration-backup',
    timestamp: Date.now(),
    preferences: currentPrefs,
  });

  // Migrate to new structure
  const migratedPrefs = {
    ui_version: 'v2',
    theme: currentPrefs.theme || 'system',
    dashboard: {
      layout: currentPrefs.dashboardLayout || 'grid',
      widgetPositions: JSON.parse(currentPrefs.widgetPositions || '[]'),
    },
    filters: JSON.parse(currentPrefs.customFilters || '{}'),
  };

  // Store in new location
  localStorage.setItem('preferences_v2', JSON.stringify(migratedPrefs));
}

export async function restorePreferences() {
  // Restore from backup
  const db = await openDB('SiteProofPreferences', 1);
  const backup = await db.get('backups', 'pre-migration-backup');

  if (backup) {
    Object.entries(backup.preferences).forEach(([key, value]) => {
      if (value) {
        localStorage.setItem(key, value as string);
      }
    });
  }
}
```

---

## 4. Production Monitoring

### 4.1 Error Tracking (Sentry)

#### Setup Sentry

```bash
pnpm add @sentry/nextjs
```

```typescript
// /apps/web/sentry.client.config.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV || 'development',

  // Release tracking
  release: process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA,

  // Performance monitoring
  tracesSampleRate: 1.0,

  // Session replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Custom integrations
  integrations: [
    new Sentry.BrowserTracing({
      tracePropagationTargets: ['localhost', /^https:\/\/siteproof\.com/],
    }),
    new Sentry.Replay({
      maskAllText: false,
      blockAllMedia: true,
    }),
  ],

  // Before send hook to filter errors
  beforeSend(event, hint) {
    // Ignore feature flag errors (expected during rollout)
    if (event.exception?.values?.[0]?.value?.includes('feature flag')) {
      return null;
    }

    // Add custom context
    event.contexts = {
      ...event.contexts,
      feature_flags: {
        design_system_v2: localStorage.getItem('ff_design-system-v2'),
      },
    };

    return event;
  },
});
```

```typescript
// /apps/web/sentry.server.config.ts

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.VERCEL_ENV || 'development',
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  tracesSampleRate: 1.0,
});
```

#### Custom Error Boundaries

```typescript
// /apps/web/src/components/error-boundaries/DesignSystemErrorBoundary.tsx

'use client';

import { Component, ReactNode } from 'react';
import * as Sentry from '@sentry/nextjs';
import { useFeatureFlags } from '@/lib/feature-flags';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class DesignSystemErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        component: {
          name: this.props.componentName,
          errorInfo: errorInfo.componentStack,
        },
      },
      tags: {
        error_boundary: 'design_system',
      },
    });

    // Automatically rollback component on critical error
    if (this.shouldAutoRollback(error)) {
      this.rollbackComponent();
    }
  }

  shouldAutoRollback(error: Error): boolean {
    const criticalErrors = [
      'ReferenceError',
      'TypeError',
      'Cannot read property',
    ];

    return criticalErrors.some(pattern =>
      error.message.includes(pattern)
    );
  }

  async rollbackComponent() {
    try {
      await fetch('/api/feature-flags/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          component: this.props.componentName,
          reason: `Auto-rollback: ${this.state.error?.message}`,
        }),
      });
    } catch (err) {
      console.error('Failed to auto-rollback:', err);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-4 bg-error-50 border border-error-200 rounded">
          <h3 className="text-error-900 font-semibold">
            Something went wrong
          </h3>
          <p className="text-error-700 text-sm mt-2">
            We're automatically reverting to the previous version.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-error-600 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### 4.2 Performance Monitoring (Vercel Analytics + Web Vitals)

```typescript
// /apps/web/src/lib/analytics/web-vitals.ts

import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals';

export function reportWebVitals() {
  onCLS((metric) => {
    sendToAnalytics({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  });

  onFCP((metric) => {
    sendToAnalytics({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  });

  onFID((metric) => {
    sendToAnalytics({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  });

  onLCP((metric) => {
    sendToAnalytics({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  });

  onTTFB((metric) => {
    sendToAnalytics({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
    });
  });
}

function sendToAnalytics(metric: any) {
  // Send to multiple destinations

  // 1. Vercel Analytics
  if (window.va) {
    window.va('track', 'Web Vital', {
      metric: metric.name,
      value: metric.value,
      rating: metric.rating,
    });
  }

  // 2. PostHog
  if (window.posthog) {
    window.posthog.capture('web_vital', {
      metric_name: metric.name,
      metric_value: metric.value,
      metric_rating: metric.rating,
      metric_delta: metric.delta,
    });
  }

  // 3. Sentry Performance
  if (window.Sentry) {
    window.Sentry.captureMessage(`Web Vital: ${metric.name}`, {
      level: metric.rating === 'good' ? 'info' : 'warning',
      tags: {
        web_vital: metric.name,
        rating: metric.rating,
      },
      contexts: {
        performance: {
          value: metric.value,
          delta: metric.delta,
        },
      },
    });
  }
}
```

```typescript
// /apps/web/src/app/layout.tsx

import { reportWebVitals } from '@/lib/analytics/web-vitals';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    reportWebVitals();
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

### 4.3 User Behavior Analytics (PostHog)

```typescript
// /apps/web/src/lib/analytics/posthog.tsx

'use client';

import posthog from 'posthog-js';
import { PostHogProvider as Provider } from 'posthog-js/react';
import { useEffect } from 'react';
import { useFeatureFlags } from '@/lib/feature-flags';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { flags } = useFeatureFlags();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug();
          }
        },
        capture_pageview: false, // Manual pageview tracking
        autocapture: true,
      });

      // Set feature flags as user properties
      posthog.register({
        design_system_v2: flags['design-system-v2'],
        new_navigation: flags['new-navigation'],
        new_dashboard_widgets: flags['new-dashboard-widgets'],
      });
    }
  }, [flags]);

  return <Provider client={posthog}>{children}</Provider>;
}

// Track component renders
export function trackComponentRender(componentName: string, props?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture('component_render', {
      component: componentName,
      props: props,
      timestamp: Date.now(),
    });
  }
}

// Track user interactions
export function trackInteraction(action: string, metadata?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.posthog) {
    window.posthog.capture(action, {
      ...metadata,
      timestamp: Date.now(),
    });
  }
}
```

### 4.4 Component Render Tracking

```typescript
// /apps/web/src/lib/monitoring/component-tracker.tsx

'use client';

import { useEffect, useRef } from 'react';
import { useFeatureFlag } from '@/lib/feature-flags';

export function useComponentTracking(
  componentName: string,
  metadata?: Record<string, any>
) {
  const renderCount = useRef(0);
  const useNewDesign = useFeatureFlag('design-system-v2');

  useEffect(() => {
    renderCount.current += 1;

    // Track render performance
    const renderStart = performance.now();

    return () => {
      const renderDuration = performance.now() - renderStart;

      // Send to analytics
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.capture('component_render_time', {
          component: componentName,
          duration: renderDuration,
          render_count: renderCount.current,
          design_version: useNewDesign ? 'v2' : 'v1',
          ...metadata,
        });
      }

      // Alert on slow renders
      if (renderDuration > 100) {
        console.warn(`Slow render detected: ${componentName} (${renderDuration}ms)`);
      }
    };
  }, [componentName, useNewDesign, metadata]);
}

// Usage in components
export function DashboardWidget() {
  useComponentTracking('DashboardWidget', { widgetType: 'project-summary' });

  return (
    <div>
      {/* Widget content */}
    </div>
  );
}
```

### 4.5 Bundle Size Monitoring

```typescript
// /apps/web/next.config.mjs

import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

const nextConfig = {
  // ... existing config

  webpack: (config, { isServer }) => {
    // Bundle analysis in CI
    if (process.env.ANALYZE === 'true') {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer
            ? '../bundle-analysis/server.html'
            : './bundle-analysis/client.html',
          openAnalyzer: false,
        })
      );
    }

    // Bundle size limits
    config.performance = {
      maxAssetSize: 500000, // 500 KB
      maxEntrypointSize: 500000,
      hints: process.env.NODE_ENV === 'production' ? 'error' : 'warning',
    };

    return config;
  },
};
```

```yaml
# /.github/workflows/bundle-analysis.yml

name: Bundle Size Analysis

on:
  pull_request:
    branches: [main]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: ANALYZE=true pnpm build
      - uses: actions/upload-artifact@v3
        with:
          name: bundle-analysis
          path: .next/bundle-analysis/

      # Compare bundle sizes
      - uses: shadcn/bundle-size-action@v1
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          build-script: pnpm build
          max-size: '500kb'
```

---

## 5. Data Migration Safety

### 5.1 User Settings Backup Strategy

```typescript
// /apps/web/src/lib/migration/backup-manager.ts

import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface BackupDB extends DBSchema {
  backups: {
    key: string;
    value: {
      id: string;
      timestamp: number;
      type: 'settings' | 'preferences' | 'dashboard' | 'filters';
      data: any;
      version: string;
    };
  };
}

class BackupManager {
  private db: IDBPDatabase<BackupDB> | null = null;

  async init() {
    if (this.db) return;

    this.db = await openDB<BackupDB>('SiteProofBackups', 1, {
      upgrade(db) {
        db.createObjectStore('backups', { keyPath: 'id' });
      },
    });
  }

  async backupUserSettings(): Promise<string> {
    await this.init();

    const backupId = `backup-${Date.now()}`;
    const settings = {
      // Theme preferences
      theme: localStorage.getItem('theme'),
      colorScheme: localStorage.getItem('colorScheme'),

      // Dashboard configuration
      dashboardLayout: localStorage.getItem('dashboardLayout'),
      widgetPositions: localStorage.getItem('widgetPositions'),
      widgetVisibility: localStorage.getItem('widgetVisibility'),

      // User preferences
      dateFormat: localStorage.getItem('dateFormat'),
      timeFormat: localStorage.getItem('timeFormat'),
      language: localStorage.getItem('language'),
      notifications: localStorage.getItem('notificationPreferences'),

      // Custom filters and views
      customFilters: localStorage.getItem('customFilters'),
      savedViews: localStorage.getItem('savedViews'),
      columnPreferences: localStorage.getItem('columnPreferences'),

      // Form drafts
      formDrafts: this.getIndexedDBData('formDrafts'),

      // Offline queue
      offlineQueue: this.getIndexedDBData('syncQueue'),
    };

    await this.db!.put('backups', {
      id: backupId,
      timestamp: Date.now(),
      type: 'settings',
      data: settings,
      version: 'pre-migration-v2',
    });

    return backupId;
  }

  async restoreBackup(backupId: string): Promise<void> {
    await this.init();

    const backup = await this.db!.get('backups', backupId);
    if (!backup) {
      throw new Error(`Backup ${backupId} not found`);
    }

    // Restore localStorage
    Object.entries(backup.data).forEach(([key, value]) => {
      if (value && typeof value === 'string') {
        localStorage.setItem(key, value);
      }
    });

    // Restore IndexedDB data
    if (backup.data.formDrafts) {
      await this.restoreIndexedDBData('formDrafts', backup.data.formDrafts);
    }
    if (backup.data.offlineQueue) {
      await this.restoreIndexedDBData('syncQueue', backup.data.offlineQueue);
    }
  }

  async listBackups() {
    await this.init();
    return this.db!.getAll('backups');
  }

  async deleteOldBackups(daysToKeep = 30) {
    await this.init();
    const cutoffDate = Date.now() - (daysToKeep * 24 * 60 * 60 * 1000);

    const allBackups = await this.db!.getAll('backups');
    const oldBackups = allBackups.filter(b => b.timestamp < cutoffDate);

    for (const backup of oldBackups) {
      await this.db!.delete('backups', backup.id);
    }
  }

  private async getIndexedDBData(storeName: string): Promise<any> {
    // Implementation depends on your IndexedDB structure
    return null;
  }

  private async restoreIndexedDBData(storeName: string, data: any): Promise<void> {
    // Implementation depends on your IndexedDB structure
  }
}

export const backupManager = new BackupManager();
```

### 5.2 Form State Preservation

```typescript
// /apps/web/src/lib/migration/form-state-manager.ts

import { db } from '@/features/inspections/offline/db';

export async function preserveFormDrafts() {
  // Get all form drafts from IndexedDB
  const drafts = await db.inspections
    .where('_syncStatus')
    .equals('pending')
    .toArray();

  // Create backup
  const backup = {
    id: `form-drafts-${Date.now()}`,
    timestamp: Date.now(),
    drafts: drafts.map(draft => ({
      id: draft.id,
      assignmentId: draft.assignment_id,
      templateId: draft.template_id,
      formData: draft.form_data,
      attachments: draft._attachments,
      createdAt: draft.created_at,
    })),
  };

  // Store in separate backup table
  await db.transaction('rw', db.inspections, async () => {
    localStorage.setItem(
      'form_drafts_backup',
      JSON.stringify(backup)
    );
  });

  return backup.id;
}

export async function restoreFormDrafts(backupId: string) {
  const backup = JSON.parse(
    localStorage.getItem('form_drafts_backup') || '{}'
  );

  if (backup.id !== backupId) {
    throw new Error('Backup not found');
  }

  // Restore drafts to IndexedDB
  for (const draft of backup.drafts) {
    await db.inspections.put({
      id: draft.id,
      assignment_id: draft.assignmentId,
      template_id: draft.templateId,
      form_data: draft.formData,
      _syncStatus: 'pending',
      _isDirty: true,
      _lastModified: Date.now(),
    });

    // Restore attachments if any
    if (draft.attachments) {
      for (const attachment of draft.attachments) {
        await db.attachments.put(attachment);
      }
    }
  }
}
```

### 5.3 Dashboard Configuration Persistence

```typescript
// /apps/web/src/lib/migration/dashboard-config.ts

export interface DashboardConfig {
  layout: 'grid' | 'list' | 'compact';
  widgets: Array<{
    id: string;
    type: string;
    position: { x: number; y: number; w: number; h: number };
    visible: boolean;
    config: Record<string, any>;
  }>;
}

export async function migrateDashboardConfig(): Promise<void> {
  // Read old configuration
  const oldLayout = localStorage.getItem('dashboardLayout');
  const oldWidgets = localStorage.getItem('widgetPositions');

  if (!oldLayout && !oldWidgets) {
    // No migration needed
    return;
  }

  // Parse old config
  const oldConfig = {
    layout: oldLayout || 'grid',
    widgets: oldWidgets ? JSON.parse(oldWidgets) : [],
  };

  // Transform to new structure
  const newConfig: DashboardConfig = {
    layout: oldConfig.layout as any,
    widgets: oldConfig.widgets.map((widget: any) => ({
      id: widget.id,
      type: widget.type,
      position: {
        x: widget.x || 0,
        y: widget.y || 0,
        w: widget.w || 4,
        h: widget.h || 3,
      },
      visible: widget.visible !== false,
      config: widget.config || {},
    })),
  };

  // Store new config
  localStorage.setItem('dashboard_config_v2', JSON.stringify(newConfig));

  // Backup old config
  localStorage.setItem('dashboard_config_v1_backup', JSON.stringify(oldConfig));
}

export async function rollbackDashboardConfig(): Promise<void> {
  const backup = localStorage.getItem('dashboard_config_v1_backup');

  if (!backup) {
    throw new Error('No backup found');
  }

  const oldConfig = JSON.parse(backup);

  // Restore old configuration
  localStorage.setItem('dashboardLayout', oldConfig.layout);
  localStorage.setItem('widgetPositions', JSON.stringify(oldConfig.widgets));

  // Remove new config
  localStorage.removeItem('dashboard_config_v2');
}
```

### 5.4 Saved Filters/Views Persistence

```typescript
// /apps/web/src/lib/migration/filters-migration.ts

export interface FilterConfig {
  id: string;
  name: string;
  view: 'projects' | 'ncrs' | 'inspections';
  filters: Record<string, any>;
  sorting: { field: string; direction: 'asc' | 'desc' }[];
  columns: string[];
  createdAt: string;
  updatedAt: string;
}

export async function migrateCustomFilters(): Promise<void> {
  const oldFilters = localStorage.getItem('customFilters');

  if (!oldFilters) return;

  const parsed = JSON.parse(oldFilters);

  // Transform to new structure
  const newFilters: FilterConfig[] = Object.entries(parsed).map(([key, value]: any) => ({
    id: key,
    name: value.name || 'Untitled Filter',
    view: value.view || 'projects',
    filters: value.filters || {},
    sorting: value.sorting || [],
    columns: value.columns || [],
    createdAt: value.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Store in new location
  localStorage.setItem('saved_filters_v2', JSON.stringify(newFilters));

  // Backup old
  localStorage.setItem('saved_filters_v1_backup', oldFilters);
}

export async function rollbackCustomFilters(): Promise<void> {
  const backup = localStorage.getItem('saved_filters_v1_backup');

  if (!backup) {
    throw new Error('No backup found');
  }

  localStorage.setItem('customFilters', backup);
  localStorage.removeItem('saved_filters_v2');
}
```

### 5.5 Local Storage Migration Plan

```typescript
// /apps/web/src/lib/migration/storage-migrator.ts

import { backupManager } from './backup-manager';
import { migrateDashboardConfig, rollbackDashboardConfig } from './dashboard-config';
import { migrateCustomFilters, rollbackCustomFilters } from './filters-migration';
import { preserveFormDrafts, restoreFormDrafts } from './form-state-manager';

export class StorageMigrator {
  private backupId: string | null = null;

  async migrate(): Promise<void> {
    try {
      console.log('Starting storage migration...');

      // 1. Create comprehensive backup
      this.backupId = await backupManager.backupUserSettings();
      console.log(`Backup created: ${this.backupId}`);

      // 2. Preserve form drafts
      await preserveFormDrafts();
      console.log('Form drafts preserved');

      // 3. Migrate dashboard configuration
      await migrateDashboardConfig();
      console.log('Dashboard config migrated');

      // 4. Migrate custom filters
      await migrateCustomFilters();
      console.log('Custom filters migrated');

      // 5. Set migration flag
      localStorage.setItem('storage_migrated_v2', 'true');
      localStorage.setItem('migration_timestamp', Date.now().toString());

      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      await this.rollback();
      throw error;
    }
  }

  async rollback(): Promise<void> {
    try {
      console.log('Rolling back migration...');

      if (this.backupId) {
        await backupManager.restoreBackup(this.backupId);
      }

      await rollbackDashboardConfig();
      await rollbackCustomFilters();

      localStorage.removeItem('storage_migrated_v2');
      localStorage.removeItem('migration_timestamp');

      console.log('Rollback completed');
    } catch (error) {
      console.error('Rollback failed:', error);
      throw error;
    }
  }

  async verifyMigration(): Promise<boolean> {
    // Verify all data is intact
    const checks = [
      localStorage.getItem('dashboard_config_v2') !== null,
      localStorage.getItem('saved_filters_v2') !== null,
      localStorage.getItem('storage_migrated_v2') === 'true',
    ];

    return checks.every(Boolean);
  }
}

// Auto-migration on app initialization
export async function initializeMigration() {
  const migrated = localStorage.getItem('storage_migrated_v2');

  if (!migrated) {
    const migrator = new StorageMigrator();

    try {
      await migrator.migrate();

      if (!(await migrator.verifyMigration())) {
        throw new Error('Migration verification failed');
      }
    } catch (error) {
      console.error('Auto-migration failed:', error);
      // Notify user to manually trigger migration
    }
  }
}
```

---

## 6. Deployment Strategy

### 6.1 Phased Deployment Timeline

#### Week 1: Internal Testing
- **Deploy to**: Staging environment + Internal team (flagsmith segment)
- **Features**: All new components enabled
- **Success Criteria**:
  - Zero critical bugs
  - Internal team approval
  - Performance metrics within budget

#### Week 2-3: Beta Rollout
- **Deploy to**: 5-25% of production users
- **Features**: Gradual component rollout
- **Monitoring**:
  - Hourly error rate checks
  - Daily performance reviews
  - User feedback collection

#### Week 4-5: Controlled Expansion
- **Deploy to**: 50% of production users
- **Features**: Full design system enabled
- **Validation**:
  - A/B test results analysis
  - Performance comparison
  - User satisfaction surveys

#### Week 6: Full Rollout
- **Deploy to**: 100% of users
- **Features**: New design as default
- **Post-Launch**:
  - 24-hour intensive monitoring
  - On-call rotation
  - Hotfix readiness

### 6.2 Deployment Checklist

```markdown
# Pre-Deployment Checklist

## Code Quality
- [ ] All tests passing (unit, integration, E2E)
- [ ] Visual regression tests reviewed
- [ ] Accessibility audit passed
- [ ] Performance benchmarks met
- [ ] Bundle size within limits
- [ ] TypeScript compilation successful
- [ ] Linting passed
- [ ] Security scan completed

## Feature Flags
- [ ] Flagsmith configured for environment
- [ ] Rollout percentages set correctly
- [ ] Segment targeting verified
- [ ] Fallback flags tested
- [ ] Emergency rollback procedure documented

## Monitoring
- [ ] Sentry DSN configured
- [ ] PostHog tracking enabled
- [ ] Vercel Analytics active
- [ ] Error boundaries deployed
- [ ] Performance monitoring setup
- [ ] Alert thresholds configured

## Data Migration
- [ ] Backup scripts tested
- [ ] Migration scripts verified
- [ ] Rollback procedures documented
- [ ] User preferences preserved
- [ ] Form drafts backed up

## Infrastructure
- [ ] Environment variables set
- [ ] CDN cache purged
- [ ] Database migrations run
- [ ] Service workers updated
- [ ] Build completed successfully
- [ ] Deployment preview reviewed

## Communication
- [ ] Team notified of deployment
- [ ] On-call schedule confirmed
- [ ] Stakeholders informed
- [ ] Support team briefed
- [ ] Rollback plan communicated

## Post-Deployment
- [ ] Smoke tests run
- [ ] Critical paths verified
- [ ] Error rates monitored
- [ ] Performance metrics checked
- [ ] User feedback channels open
```

### 6.3 Zero-Downtime Deployment

```yaml
# /apps/web/.vercel/production.json

{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "env": {
    "NEXT_PUBLIC_FLAGSMITH_ENV_ID": "@flagsmith-prod-env",
    "NEXT_PUBLIC_SENTRY_DSN": "@sentry-dsn",
    "NEXT_PUBLIC_POSTHOG_KEY": "@posthog-key"
  },
  "build": {
    "env": {
      "ANALYZE": "false"
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        }
      ]
    }
  ]
}
```

---

## 7. Emergency Procedures

### 7.1 Incident Response Plan

#### Severity Levels

**P0 - Critical (Complete Outage)**
- Application completely unavailable
- Data loss occurring
- Security breach detected

**Response Time**: < 5 minutes
**Actions**:
1. Page on-call engineer immediately
2. Disable feature flag via Flagsmith API
3. Verify rollback successful
4. Post incident report in #incidents channel

**P1 - High (Major Feature Broken)**
- Critical user journey blocked
- Payment processing failed
- Authentication issues

**Response Time**: < 15 minutes
**Actions**:
1. Notify on-call engineer
2. Assess impact scope
3. Component-level rollback if possible
4. Full rollback if necessary

**P2 - Medium (Minor Feature Impacted)**
- Non-critical feature degraded
- Visual glitches
- Performance degradation < 50%

**Response Time**: < 1 hour
**Actions**:
1. Create incident ticket
2. Assess if rollback needed
3. Monitor error rates
4. Plan fix or rollback

**P3 - Low (Visual Issues)**
- Minor UI inconsistencies
- Non-blocking bugs
- Performance degradation < 10%

**Response Time**: < 24 hours
**Actions**:
1. Create bug ticket
2. Schedule fix in next sprint
3. No rollback needed

### 7.2 Emergency Rollback Procedures

#### Immediate Rollback (< 5 minutes)

```bash
#!/bin/bash
# /scripts/emergency-rollback.sh

set -e

echo "🚨 EMERGENCY ROLLBACK INITIATED"
echo "Reason: $1"

# 1. Disable all new design flags via Flagsmith API
curl -X PUT \
  https://flagsmith.siteproof.com/api/v1/features/design-system-v2/ \
  -H "Authorization: Token ${FLAGSMITH_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false,
    "description": "Emergency rollback: '"$1"'"
  }'

# 2. Set environment variable override
vercel env add NEXT_PUBLIC_FORCE_OLD_DESIGN true production --yes

# 3. Trigger immediate revalidation
curl -X POST https://siteproof.com/api/revalidate \
  -H "Authorization: Bearer ${REVALIDATE_TOKEN}"

# 4. Notify team
curl -X POST https://hooks.slack.com/services/${SLACK_WEBHOOK} \
  -H "Content-Type: application/json" \
  -d '{
    "text": "🚨 EMERGENCY ROLLBACK EXECUTED",
    "blocks": [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "*Emergency Rollback*\nReason: '"$1"'\nTime: '"$(date)"'"
        }
      }
    ]
  }'

echo "✅ Rollback completed"
echo "Verify at: https://siteproof.com"
```

#### Verify Rollback Success

```typescript
// /apps/web/scripts/verify-rollback.ts

async function verifyRollback() {
  const checks = [
    {
      name: 'Feature Flag Disabled',
      check: async () => {
        const response = await fetch(
          'https://flagsmith.siteproof.com/api/v1/flags/',
          {
            headers: {
              'X-Environment-Key': process.env.FLAGSMITH_ENV_KEY!,
            },
          }
        );
        const flags = await response.json();
        const designFlag = flags.find((f: any) => f.feature.name === 'design-system-v2');
        return !designFlag.enabled;
      },
    },
    {
      name: 'Old UI Serving',
      check: async () => {
        const response = await fetch('https://siteproof.com/dashboard');
        const html = await response.text();
        return html.includes('data-version="v1"');
      },
    },
    {
      name: 'Error Rate Normal',
      check: async () => {
        const response = await fetch(
          'https://sentry.io/api/0/organizations/siteproof/stats_v2/',
          {
            headers: {
              Authorization: `Bearer ${process.env.SENTRY_AUTH_TOKEN}`,
            },
          }
        );
        const stats = await response.json();
        return stats.groups[0].totals['sum(quantity)'] < 10; // < 10 errors/min
      },
    },
  ];

  console.log('🔍 Verifying rollback...\n');

  for (const check of checks) {
    try {
      const result = await check.check();
      console.log(`${result ? '✅' : '❌'} ${check.name}`);
      if (!result) {
        throw new Error(`${check.name} failed`);
      }
    } catch (error) {
      console.error(`❌ ${check.name} failed:`, error);
      process.exit(1);
    }
  }

  console.log('\n✅ All rollback checks passed');
}

verifyRollback();
```

### 7.3 On-Call Rotation

```markdown
# On-Call Engineer Responsibilities

## During Rollout Phases

### Phase 1 (Week 1): Internal Testing
- **Availability**: Business hours (9 AM - 5 PM)
- **Response Time**: Best effort
- **Tools**: Slack, Sentry dashboard

### Phase 2-3 (Week 2-5): Beta Rollout
- **Availability**: Extended hours (7 AM - 9 PM)
- **Response Time**: < 30 minutes
- **Tools**: PagerDuty, Slack, Sentry, PostHog

### Phase 4 (Week 6): Full Rollout
- **Availability**: 24/7 for first 72 hours
- **Response Time**: < 15 minutes (critical), < 1 hour (non-critical)
- **Tools**: All monitoring tools + phone alerts

## Alert Triggers

### Critical Alerts (Page Immediately)
- Error rate > 5%
- Response time > 10s
- 5xx errors > 10/minute
- Sentry critical issues
- Feature flag service down

### Warning Alerts (Slack Notification)
- Error rate > 2%
- Response time > 5s
- Performance degradation > 20%
- Bundle size increase > 10%

## Incident Response Steps

1. **Acknowledge**: Respond to alert within SLA
2. **Assess**: Check dashboards (Sentry, PostHog, Vercel)
3. **Communicate**: Update #incidents channel
4. **Mitigate**: Execute rollback if needed
5. **Resolve**: Fix issue or complete rollback
6. **Document**: Post-mortem within 24 hours
```

### 7.4 Communication Templates

#### Incident Notification

```markdown
🚨 **Incident Detected**

**Severity**: [P0/P1/P2/P3]
**Component**: [Component Name]
**Impact**: [Description of user impact]
**Time Detected**: [Timestamp]
**On-Call Engineer**: [Name]

**Actions Taken**:
- [ ] Issue assessed
- [ ] Team notified
- [ ] Rollback initiated (if applicable)
- [ ] Users notified (if applicable)

**Status**: [Investigating/Mitigating/Resolved]

**Updates will be posted every 15 minutes**
```

#### Rollback Notification

```markdown
🔄 **Design System Rollback**

**Reason**: [Brief description]
**Time**: [Timestamp]
**Affected Users**: [Percentage/All]
**Expected Duration**: [Estimate]

**User Impact**:
- Old UI will be displayed
- All functionality remains available
- No data loss

**Next Steps**:
- Root cause analysis
- Fix implementation
- Re-deployment plan

**Questions?** Contact [Name] in #incidents
```

#### Resolution Notification

```markdown
✅ **Incident Resolved**

**Incident ID**: [ID]
**Duration**: [Total time]
**Resolution**: [Description]

**Root Cause**: [Brief explanation]

**Preventative Measures**:
- [Action 1]
- [Action 2]

**Post-Mortem**: [Link to document]

Thank you for your patience!
```

---

## 8. Success Criteria

### 8.1 Technical Metrics

#### Performance Benchmarks

| Metric | Baseline (V1) | Target (V2) | Acceptable Range |
|--------|---------------|-------------|------------------|
| **First Contentful Paint** | 1.2s | 1.0s | < 1.5s |
| **Largest Contentful Paint** | 2.1s | 1.8s | < 2.5s |
| **Time to Interactive** | 3.5s | 2.8s | < 3.5s |
| **Cumulative Layout Shift** | 0.15 | 0.05 | < 0.1 |
| **Total Blocking Time** | 450ms | 250ms | < 300ms |
| **Bundle Size** | 420 KB | 380 KB | < 450 KB |

#### Reliability Metrics

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| **Error Rate** | < 0.5% | < 1% |
| **Uptime** | > 99.9% | > 99.5% |
| **API Response Time** | < 200ms (p95) | < 500ms (p95) |
| **Page Load Success** | > 99.5% | > 99% |

### 8.2 User Experience Metrics

#### Engagement Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| **Daily Active Users** | 100% | ≥ 98% | PostHog |
| **Session Duration** | 12 min | ≥ 12 min | PostHog |
| **Bounce Rate** | 25% | < 30% | PostHog |
| **Feature Adoption** | N/A | > 80% in 2 weeks | PostHog |

#### User Satisfaction

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| **Net Promoter Score** | > 40 | In-app survey |
| **Customer Satisfaction** | > 4.0/5.0 | Post-interaction survey |
| **Support Tickets** | < 10% increase | Zendesk tracking |
| **Negative Feedback** | < 5% | Feedback widget |

### 8.3 Accessibility Compliance

| Requirement | Target | Validation |
|-------------|--------|------------|
| **WCAG 2.1 AA** | 100% compliance | Automated + manual audit |
| **Keyboard Navigation** | All interactions accessible | Manual testing |
| **Screen Reader Support** | All content accessible | NVDA/JAWS testing |
| **Color Contrast** | 4.5:1 minimum | Automated checks |

### 8.4 Phase-Specific Success Criteria

#### Phase 1: Internal Testing (Week 1)
- ✅ Zero blocking bugs
- ✅ Team approval from all departments
- ✅ Performance within 10% of baseline
- ✅ All critical paths functional
- ✅ Accessibility audit passed

#### Phase 2: Beta Rollout (Week 2-3)
- ✅ Error rate < 1%
- ✅ Performance degradation < 10%
- ✅ Positive user feedback > 70%
- ✅ No critical bugs reported
- ✅ Support ticket increase < 20%

#### Phase 3: Controlled Expansion (Week 4-5)
- ✅ Error rate < 0.5%
- ✅ Performance on par with V1
- ✅ NPS > 40
- ✅ Feature adoption > 60%
- ✅ Zero P0/P1 incidents

#### Phase 4: Full Rollout (Week 6)
- ✅ Error rate < 0.3%
- ✅ All performance targets met
- ✅ User satisfaction > 4.0/5.0
- ✅ Feature adoption > 80%
- ✅ Zero rollbacks needed

---

## 9. Pre-Flight Checklists

### 9.1 Phase 1 Pre-Flight: Internal Testing

```markdown
# Phase 1: Internal Testing Checklist

## Environment Setup
- [ ] Staging environment deployed
- [ ] Flagsmith configured for internal team segment
- [ ] Monitoring tools active (Sentry, PostHog)
- [ ] Test data populated
- [ ] Backup created

## Code Quality
- [ ] All unit tests passing (100% pass rate)
- [ ] E2E tests passing (100% pass rate)
- [ ] Visual regression baseline created
- [ ] Accessibility audit completed (0 critical issues)
- [ ] Performance benchmarks recorded
- [ ] Security scan completed (0 high/critical vulnerabilities)

## Feature Verification
- [ ] Navigation redesign functional
- [ ] Dashboard widgets working
- [ ] Form components operational
- [ ] Mobile UI responsive
- [ ] Dark mode functional
- [ ] Offline capabilities tested

## Documentation
- [ ] Migration guide reviewed
- [ ] Rollback procedures documented
- [ ] Known issues documented
- [ ] Team training completed

## Communication
- [ ] Team notified of testing phase
- [ ] Feedback channels established
- [ ] Bug reporting process clarified
- [ ] Daily standup scheduled

## Success Criteria
- [ ] No P0/P1 bugs
- [ ] Performance within 10% of baseline
- [ ] Team approval from stakeholders
```

### 9.2 Phase 2 Pre-Flight: Beta Rollout

```markdown
# Phase 2: Beta Rollout Checklist

## Feature Flags
- [ ] Flagsmith segments configured (beta-users)
- [ ] Rollout percentage set to 5%
- [ ] Fallback flags tested
- [ ] Emergency rollback script ready

## Monitoring
- [ ] Alert thresholds configured
- [ ] PagerDuty integration active
- [ ] Dashboard bookmarks created
- [ ] On-call rotation scheduled

## User Communication
- [ ] Beta users notified
- [ ] Feedback form created
- [ ] Support team briefed
- [ ] FAQ document published

## Testing
- [ ] Smoke tests automated
- [ ] Critical paths verified
- [ ] Cross-browser testing completed
- [ ] Mobile device testing completed

## Data Safety
- [ ] User preferences backup automated
- [ ] Form drafts preserved
- [ ] Migration scripts verified
- [ ] Rollback scripts tested

## Performance
- [ ] Lighthouse CI passing
- [ ] Bundle size verified
- [ ] CDN caching configured
- [ ] Database queries optimized

## Success Criteria
- [ ] Error rate < 1%
- [ ] Performance degradation < 10%
- [ ] Positive feedback > 70%
- [ ] Zero critical bugs
```

### 9.3 Phase 3 Pre-Flight: Controlled Expansion

```markdown
# Phase 3: Controlled Expansion Checklist

## Scale Preparation
- [ ] Infrastructure scaled for 50% traffic
- [ ] Database connection pool adjusted
- [ ] CDN capacity verified
- [ ] Rate limiting reviewed

## Feature Flags
- [ ] Rollout percentage set to 50%
- [ ] A/B testing configured
- [ ] Segment targeting verified
- [ ] Fallback mechanisms tested

## Monitoring Enhancement
- [ ] Real-time dashboards active
- [ ] Anomaly detection configured
- [ ] User behavior tracking enabled
- [ ] Performance profiling active

## User Support
- [ ] Support scripts updated
- [ ] Video tutorials created
- [ ] In-app help updated
- [ ] Chatbot trained

## Risk Mitigation
- [ ] Load testing completed
- [ ] Chaos engineering tests run
- [ ] Disaster recovery tested
- [ ] Backup verification automated

## Success Criteria
- [ ] Error rate < 0.5%
- [ ] Performance on par with V1
- [ ] NPS > 40
- [ ] Feature adoption > 60%
```

### 9.4 Phase 4 Pre-Flight: Full Rollout

```markdown
# Phase 4: Full Rollout Checklist

## Final Verification
- [ ] All previous phase criteria met
- [ ] No outstanding P1/P2 bugs
- [ ] Performance targets achieved
- [ ] User satisfaction > 4.0/5.0

## Infrastructure
- [ ] Auto-scaling configured
- [ ] Redundancy verified
- [ ] Backup systems tested
- [ ] Monitoring comprehensive

## Feature Flags
- [ ] Rollout percentage set to 100%
- [ ] Legacy code removal planned
- [ ] Feature flag deprecation scheduled
- [ ] Documentation updated

## Team Readiness
- [ ] 24/7 on-call schedule active
- [ ] Escalation paths clear
- [ ] Runbooks updated
- [ ] War room ready

## Communication
- [ ] Stakeholders notified
- [ ] Public announcement drafted
- [ ] Support team ready
- [ ] Marketing aligned

## Post-Launch Plan
- [ ] Intensive monitoring (72 hours)
- [ ] Daily status meetings
- [ ] User feedback collection
- [ ] Post-mortem scheduled (1 week)

## Success Criteria
- [ ] Error rate < 0.3%
- [ ] All performance targets met
- [ ] User satisfaction > 4.0/5.0
- [ ] Feature adoption > 80%
- [ ] Zero rollbacks needed
```

---

## 10. Conclusion

This Production Safety Architecture provides a comprehensive, production-grade framework for deploying the SiteProof v2 design overhaul with zero downtime and maximum safety.

### Key Takeaways

1. **Feature Flags are Primary Rollback Mechanism**
   - Flagsmith provides instant rollback without deployment
   - Component-level granularity for targeted fixes
   - Environment variable fallback for ultimate safety

2. **Comprehensive Testing Prevents Issues**
   - E2E tests cover all critical user paths
   - Visual regression catches UI breaks
   - Accessibility ensures WCAG compliance
   - Performance monitoring enforces budgets

3. **Data Safety is Paramount**
   - Automated backups before migration
   - Form draft preservation
   - User preference migration
   - Rollback procedures tested

4. **Monitoring Enables Fast Response**
   - Sentry for error tracking
   - PostHog for user behavior
   - Vercel Analytics for performance
   - Real-time alerting for incidents

5. **Phased Rollout Minimizes Risk**
   - Internal → Beta → 50% → 100%
   - Clear success criteria at each phase
   - Automated rollback triggers
   - Continuous validation

### Next Steps

1. **Week 1**: Set up Flagsmith and monitoring tools
2. **Week 2**: Implement comprehensive test suite
3. **Week 3**: Create backup and migration scripts
4. **Week 4**: Phase 1 deployment (internal)
5. **Week 5-6**: Beta rollout with monitoring
6. **Week 7-8**: Controlled expansion
7. **Week 9**: Full rollout
8. **Week 10**: Post-mortem and optimization

### Support Resources

- **Documentation**: `/docs/production-safety-architecture.md`
- **Runbooks**: `/docs/runbooks/`
- **Incident Response**: `/docs/incident-response-plan.md`
- **On-Call Guide**: `/docs/on-call-guide.md`

---

**Document Owner**: System Architecture Team
**Last Updated**: October 8, 2025
**Review Schedule**: Weekly during rollout, monthly post-launch
**Version**: 1.0
