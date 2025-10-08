# Accessibility & Performance Code Review
## SiteProof v2 - Construction Site Documentation Platform

**Review Date:** 2025-10-08
**Reviewer:** Code Review Agent
**Scope:** WCAG AA Compliance + Lighthouse 90+ Performance

---

## Executive Summary

This comprehensive review identifies critical accessibility and performance issues that need immediate attention. The application has a solid foundation with some accessibility features already in place, but requires systematic improvements to achieve WCAG AA compliance and Lighthouse 90+ scores.

### Current State Assessment

**Accessibility (Estimated: 65/100)**
- Limited ARIA labels on interactive elements
- Missing focus management in modals
- No skip navigation links
- Incomplete keyboard navigation support
- Missing screen reader announcements

**Performance (Estimated: 70/100)**
- Good: Font optimization with Inter font preload
- Good: Some loading states implemented
- Issue: No code splitting for heavy components
- Issue: Unoptimized images (raw `<img>` tags)
- Issue: Large bundle size without analysis

---

## Critical Issues (Must Fix)

### 1. Modal Component - Missing Focus Trap

**File:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/components/ui/Modal.tsx`

**Issue:** The modal handles Escape key but doesn't trap focus within the dialog, allowing keyboard users to tab to elements behind the modal.

**Impact:** WCAG 2.4.3 Focus Order - Level A violation

**Current Code (Lines 31-47):**
```typescript
useEffect(() => {
  if (!open) return;

  const handleEscape = (e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  };

  document.addEventListener('keydown', handleEscape);
  document.body.style.overflow = 'hidden';

  return () => {
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = 'unset';
  };
}, [open, onClose, closeOnEscape]);
```

**Required Fix:**
```typescript
useEffect(() => {
  if (!open) return;

  const modalElement = document.querySelector('[role="dialog"]');
  if (!modalElement) return;

  // Get all focusable elements
  const focusableElements = modalElement.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  // Focus first element on open
  firstElement?.focus();

  // Trap focus within modal
  const handleTab = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement?.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement?.focus();
    }
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (closeOnEscape && e.key === 'Escape') {
      onClose();
    }
  };

  modalElement.addEventListener('keydown', handleTab);
  document.addEventListener('keydown', handleEscape);
  document.body.style.overflow = 'hidden';

  return () => {
    modalElement.removeEventListener('keydown', handleTab);
    document.removeEventListener('keydown', handleEscape);
    document.body.style.overflow = 'unset';
  };
}, [open, onClose, closeOnEscape]);
```

---

### 2. Main Layout - Missing Skip Navigation

**File:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/layout.tsx`

**Issue:** No skip navigation link for keyboard users to bypass navigation and jump to main content.

**Impact:** WCAG 2.4.1 Bypass Blocks - Level A violation

**Current Code (Line 42):**
```typescript
<body className={`${inter.className} overscroll-none`}>
  <Providers>
    {children}
```

**Required Fix:**
```typescript
<body className={`${inter.className} overscroll-none`}>
  <a
    href="#main-content"
    className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-6 focus:py-3 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-4 focus:ring-primary-300"
  >
    Skip to main content
  </a>
  <Providers>
    {children}
```

**Also Update Dashboard Layout** (`/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/dashboard/layout.tsx` Line 59):
```typescript
<main id="main-content" className="flex-1 pb-20 md:pb-0">{children}</main>
```

---

### 3. Buttons Without Accessible Names

**Multiple Files:** Found 30+ buttons without proper accessible names

**Issue:** Icon-only buttons without `aria-label` or visible text.

**Impact:** WCAG 1.1.1 Non-text Content - Level A violation

**Example Violations:**

**File:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/dashboard/contractors/page.tsx`

```typescript
// BEFORE (Inaccessible):
<button onClick={handleDelete}>
  <Trash2 className="h-5 w-5" />
</button>

// AFTER (Accessible):
<button onClick={handleDelete} aria-label="Delete contractor">
  <Trash2 className="h-5 w-5" />
  <span className="sr-only">Delete</span>
</button>
```

**Affected Files (Require Manual Review):**
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/dashboard/contractors/page.tsx`
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/dashboard/admin/resources/page.tsx`
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/dashboard/backend-database/page.tsx`
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/dashboard/materials-catalog/page.tsx`

---

### 4. Missing Screen Reader Announcements

**Issue:** No live regions for dynamic content updates (form submissions, async operations, errors).

**Impact:** WCAG 4.1.3 Status Messages - Level AA violation

**Required Implementation:**

Create utility file: `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/lib/announce.ts`

```typescript
/**
 * Announces messages to screen readers using ARIA live regions
 * @param message - The message to announce
 * @param priority - 'polite' (default) or 'assertive' for urgent messages
 */
export function announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
  const existing = document.getElementById('sr-live-region');
  const liveRegion = existing || document.createElement('div');

  if (!existing) {
    liveRegion.id = 'sr-live-region';
    liveRegion.className = 'sr-only';
    liveRegion.setAttribute('aria-live', priority);
    liveRegion.setAttribute('aria-atomic', 'true');
    document.body.appendChild(liveRegion);
  }

  // Update message
  liveRegion.textContent = message;

  // Clear after 3 seconds to allow new announcements
  setTimeout(() => {
    if (liveRegion.textContent === message) {
      liveRegion.textContent = '';
    }
  }, 3000);
}

// Usage examples:
// announce('Project created successfully');
// announce('Error: Unable to save changes', 'assertive');
// announce('Form submitted, redirecting...', 'polite');
```

---

## Major Issues (Should Fix)

### 5. Unoptimized Images

**Files:**
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/components/mobile/MobileOptimizedImage.tsx`
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/features/inspections/components/PhotoCapture.tsx`

**Issue:** Using raw `<img>` tags instead of Next.js `Image` component.

**Impact:**
- Largest Contentful Paint (LCP) degradation
- Unnecessary bandwidth usage
- No lazy loading or blur placeholders

**Current Code:**
```typescript
<img src={previewUrl} alt="Captured photo" className="w-full rounded-lg" />
```

**Recommended Fix:**
```typescript
import Image from 'next/image';

<Image
  src={previewUrl}
  alt="Captured photo"
  width={800}
  height={600}
  className="w-full rounded-lg"
  loading="lazy"
  placeholder="blur"
  blurDataURL="data:image/svg+xml;base64,..."
  sizes="(max-width: 768px) 100vw, 800px"
/>
```

---

### 6. No Code Splitting

**Issue:** Heavy components loaded synchronously on page load.

**Impact:**
- Time to Interactive (TTI) degradation
- Larger initial bundle size
- Slower page loads

**Components to Split:**
- DiaryForm
- ITPBuilder
- ReportGenerator
- NCRForm
- Chart/visualization components

**Implementation:**
```typescript
// Instead of:
import { DiaryForm } from '@/features/diary/components/DiaryForm';

// Use dynamic import:
import dynamic from 'next/dynamic';

const DiaryForm = dynamic(
  () => import('@/features/diary/components/DiaryForm'),
  {
    loading: () => <Skeleton className="h-96" />,
    ssr: false, // If component doesn't need SSR
  }
);
```

---

### 7. Missing Loading Skeletons

**Issue:** No loading states for async content, showing blank space during data fetch.

**Impact:**
- Poor perceived performance
- Cumulative Layout Shift (CLS) issues

**Required Implementation:**

Create skeleton components: `/mnt/c/Users/jayso/siteproof-v2/packages/design-system/src/components/ui/skeleton.tsx`

```typescript
import { cn } from '@/lib/utils';

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200',
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-4">
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-10 w-32 mt-4" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" /> {/* Header */}
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-24 w-full" />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
```

**Usage:**
```typescript
import { Suspense } from 'react';
import { CardSkeleton } from '@/components/ui/skeleton';

<Suspense fallback={<CardSkeleton />}>
  <AsyncProjectList />
</Suspense>
```

---

## Minor Issues (Nice to Have)

### 8. Button Component - Good Accessibility

**File:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/components/ui/Button.tsx`

**Strengths:**
- ✅ Proper focus-visible ring (Line 38)
- ✅ Disabled state handling
- ✅ Loading state with spinner
- ✅ Expanded touch target for mobile (Line 73)

**Minor Improvement:**
Add `aria-busy` attribute when loading:

```typescript
<button
  className={...}
  disabled={disabled || loading}
  aria-busy={loading}
  {...props}
>
```

---

### 9. Input Component - Excellent Accessibility

**File:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/components/ui/Input.tsx`

**Strengths:**
- ✅ Proper label association (Line 52)
- ✅ aria-invalid for errors (Line 78)
- ✅ aria-describedby for error/helper text (Line 79-81)
- ✅ Required field indicator (Line 54)
- ✅ Auto-generated unique IDs (Line 32)

**This component is a model for accessibility!** No changes needed.

---

## Performance Optimization Recommendations

### 10. Bundle Size Analysis

**Action Required:** Install and configure bundle analyzer

```bash
pnpm add -D @next/bundle-analyzer
```

**Update** `/mnt/c/Users/jayso/siteproof-v2/apps/web/next.config.js`:

```javascript
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  async headers() {
    return [
      {
        source: '/(favicon.ico|favicon-16x16.png|favicon-32x32.png|apple-touch-icon.png)',
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

module.exports = withBundleAnalyzer(nextConfig);
```

**Run analysis:**
```bash
ANALYZE=true pnpm build
```

---

### 11. Font Optimization

**File:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/layout.tsx`

**Current State:** Good foundation with Inter font

**Improvement:** Add `display: 'swap'` and preload

```typescript
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',      // Add this
  preload: true,        // Add this
  variable: '--font-inter',  // Add this for CSS variable
});

// Then in HTML:
<html lang="en" className={`touch-manipulation ${inter.variable}`}>
```

**Update Tailwind config** to use CSS variable:
```javascript
fontFamily: {
  sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
}
```

---

### 12. Lighthouse CI Configuration

**File:** `/mnt/c/Users/jayso/siteproof-v2/.lighthouserc.js`

**Status:** Already exists (good!)

**Recommended Test URLs to Add:**
```javascript
collect: {
  url: [
    'http://localhost:3000',
    'http://localhost:3000/dashboard',
    'http://localhost:3000/dashboard/projects',
    'http://localhost:3000/dashboard/contractors',
  ],
  numberOfRuns: 3,
},
```

---

## Accessibility Testing Implementation

### 13. Install axe-core for Automated Testing

```bash
pnpm add -D @axe-core/react jest-axe @testing-library/react @testing-library/jest-dom
```

**Create test utility:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/test/a11y.ts`

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

export async function testA11y(ui: React.ReactElement) {
  const { container } = render(ui);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
}
```

**Example test:** `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/components/ui/__tests__/Button.test.tsx`

```typescript
import { testA11y } from '@/test/a11y';
import { Button } from '../Button';

describe('Button Accessibility', () => {
  it('has no accessibility violations', async () => {
    await testA11y(
      <Button>Click me</Button>
    );
  });

  it('loading state is accessible', async () => {
    await testA11y(
      <Button loading>Submitting...</Button>
    );
  });
});
```

---

## Summary of Required Actions

### Immediate (This Week):
1. ✅ Add skip navigation link to main layout
2. ✅ Fix Modal focus trap
3. ✅ Add ARIA labels to all icon-only buttons
4. ✅ Create screen reader announcement utility
5. ✅ Add loading skeletons

### Short-term (Next 2 Weeks):
6. ✅ Implement code splitting for heavy components
7. ✅ Optimize images with Next.js Image
8. ✅ Install and run bundle analyzer
9. ✅ Set up axe-core testing
10. ✅ Run Lighthouse audit

### Ongoing:
11. ✅ Add accessibility tests for all new components
12. ✅ Monitor Lighthouse scores in CI/CD
13. ✅ Regular manual keyboard navigation testing

---

## Success Metrics

**Target Scores:**
- Lighthouse Performance: 90+
- Lighthouse Accessibility: 95+
- Lighthouse Best Practices: 90+
- Lighthouse SEO: 85+

**Accessibility:**
- ✅ Zero axe-core violations
- ✅ Full keyboard navigation support
- ✅ Screen reader compatible
- ✅ WCAG AA compliant

**Performance:**
- ✅ First Contentful Paint (FCP) < 1.5s
- ✅ Largest Contentful Paint (LCP) < 2.5s
- ✅ Time to Interactive (TTI) < 3.5s
- ✅ Cumulative Layout Shift (CLS) < 0.1
- ✅ Total Bundle Size < 300KB (gzipped)

---

## Positive Findings

**Already Implemented Well:**
1. ✅ Font optimization with Inter (preloaded)
2. ✅ Semantic HTML structure
3. ✅ Input component has excellent accessibility
4. ✅ Button component has good focus management
5. ✅ Modal has proper ARIA roles and labels
6. ✅ Lighthouse CI configuration exists
7. ✅ Touch-friendly button targets (48px minimum)
8. ✅ React Strict Mode enabled
9. ✅ Proper meta tags for mobile

**Good Foundation to Build Upon!**

---

## Conclusion

This codebase has a solid foundation with some accessibility features already in place. The main gaps are:

1. **Focus management** in modals
2. **Skip navigation** for keyboard users
3. **ARIA labels** for icon-only buttons
4. **Screen reader announcements** for dynamic content
5. **Performance optimizations** (code splitting, image optimization)

By addressing these issues systematically, the application can achieve WCAG AA compliance and Lighthouse 90+ scores within 2-3 weeks.

**Estimated Effort:**
- Critical fixes: 16-20 hours
- Major improvements: 12-16 hours
- Testing and validation: 8-10 hours
- **Total: 36-46 hours**

---

**Review Completed:** 2025-10-08
**Next Review:** After critical fixes implementation
**Contact:** Code Review Agent

---

## Appendix: Useful Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Next.js Image Optimization](https://nextjs.org/docs/basic-features/image-optimization)
- [Lighthouse Performance](https://web.dev/performance-scoring/)
- [axe-core Testing](https://github.com/dequelabs/axe-core)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
