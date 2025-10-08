# Performance Optimization Guide

## Overview

This document outlines performance optimizations implemented in SiteProof v2.

## Implemented Optimizations

### 1. Code Splitting

Heavy components are lazy-loaded to reduce initial bundle size.

**Implementation:**
```typescript
import { EnhancedITPForm } from '@/components/performance/CodeSplitWrappers';

// Component is automatically code-split and lazy-loaded
<EnhancedITPForm {...props} />
```

**Available Code-Split Components:**
- EnhancedITPForm
- BasicITPManager
- ForemanITPManager
- BulkOperations
- ProjectDiaryForm
- BrandedPDFExport
- PhotoUpload
- SignatureCapture

### 2. Image Optimization

Images are optimized using Next.js Image component with lazy loading.

**Implementation:**
```typescript
import { LazyImage } from '@/components/performance/LazyImage';

<LazyImage
  src="/path/to/image.jpg"
  alt="Description"
  width={800}
  height={600}
  quality={75}
/>
```

**Features:**
- AVIF and WebP format support
- Responsive image sizes
- Lazy loading with Intersection Observer
- Automatic blur placeholder
- Optimized caching (60s minimum TTL)

### 3. Font Optimization

Fonts are optimized using Next.js font optimization with display swap.

**Configuration:**
```typescript
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',        // Prevent FOIT
  preload: true,          // Preload font files
  fallback: ['system-ui', 'arial'], // System fallback
});
```

**Benefits:**
- No flash of invisible text (FOIT)
- Reduced layout shift
- Faster initial render

### 4. Bundle Size Optimization

**Techniques:**
- Tree shaking
- Code splitting by route
- Dynamic imports for heavy components
- Package optimization (optimizePackageImports)

**Current Targets:**
- Main bundle: < 200KB gzipped
- Total JS: < 300KB gzipped
- CSS: < 50KB gzipped

**Monitor Bundle Size:**
```typescript
import { logBundleSize } from '@/lib/performance/bundle-analyzer';

// In development, log bundle size
if (process.env.NODE_ENV === 'development') {
  logBundleSize();
}
```

### 5. Performance Monitoring

Track performance metrics using Web Vitals.

**Implementation:**
```typescript
import { reportWebVitals } from '@/lib/performance/bundle-analyzer';

// In _app.tsx or layout.tsx
export function reportWebVitals(metric) {
  reportWebVitals(metric);
}
```

**Tracked Metrics:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- First Input Delay (FID)
- Time to Interactive (TTI)

### 6. Caching Strategy

**Static Assets:**
- Immutable cache for hashed files (1 year)
- Cache-Control headers for static content

**API Responses:**
- Stale-while-revalidate for data
- Client-side caching with SWR

**Service Worker:**
- Offline-first strategy for critical assets
- Background sync for data

## Performance Targets

### Lighthouse Scores

Target minimum scores (mobile):
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

### Core Web Vitals

- **LCP:** < 2.5s
- **FID:** < 100ms
- **CLS:** < 0.1

### Load Metrics

- **FCP:** < 2.0s
- **TTI:** < 3.5s
- **TBT:** < 300ms

## Testing Performance

### Local Testing

1. **Lighthouse Audit:**
```bash
# Build production version
pnpm build

# Start production server
pnpm start

# Run Lighthouse
pnpm dlx @lhci/cli@latest autorun
```

2. **Bundle Analysis:**
```bash
# Analyze bundle size
pnpm dlx @next/bundle-analyzer
```

3. **Performance Profiling:**
- Chrome DevTools > Performance tab
- Record page load
- Analyze main thread work
- Check for long tasks (> 50ms)

### Automated Testing

Lighthouse CI configuration in `.lighthouserc.js`:
```javascript
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
      },
    },
  },
};
```

## Optimization Checklist

### Before Deployment:

- [ ] Run production build
- [ ] Analyze bundle size
- [ ] Run Lighthouse audit
- [ ] Test on slow 3G
- [ ] Check Core Web Vitals
- [ ] Verify image optimization
- [ ] Test with cache disabled
- [ ] Verify code splitting works

### Component Optimization:

- [ ] Use code splitting for heavy components
- [ ] Optimize images (WebP/AVIF)
- [ ] Minimize re-renders (React.memo)
- [ ] Use virtual scrolling for long lists
- [ ] Debounce expensive operations
- [ ] Lazy load below-the-fold content

### CSS Optimization:

- [ ] Remove unused CSS
- [ ] Use CSS-in-JS efficiently
- [ ] Minimize critical CSS
- [ ] Defer non-critical styles

## Performance Budget

| Resource | Budget | Current |
|----------|--------|---------|
| Total JS | 300 KB | TBD |
| Main Bundle | 200 KB | TBD |
| CSS | 50 KB | TBD |
| Images | - | Optimized |
| Fonts | 100 KB | Optimized |

## Monitoring

### Production Monitoring

Set up Real User Monitoring (RUM) to track:
- Page load times
- Core Web Vitals
- Error rates
- Geographic performance
- Device performance

### Alerts

Configure alerts for:
- LCP > 3.0s
- FID > 200ms
- CLS > 0.2
- Bundle size > 400KB

## Resources

- [Next.js Performance](https://nextjs.org/docs/advanced-features/measuring-performance)
- [Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

## Support

For performance issues or questions, please open an issue in the repository.
