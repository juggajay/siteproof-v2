# SiteProof v2 - Mobile Development Checklist

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Target Platforms:** iOS 14+, Android 9+

---

## Table of Contents

1. [Performance](#performance)
2. [Touch Interactions](#touch-interactions)
3. [Responsive Design](#responsive-design)
4. [Offline Functionality](#offline-functionality)
5. [Forms and Inputs](#forms-and-inputs)
6. [Media and Assets](#media-and-assets)
7. [PWA Features](#pwa-features)
8. [Testing](#testing)
9. [Deployment](#deployment)

---

## Performance

### Initial Load Performance

- [ ] **First Contentful Paint < 1.8s** on 4G
- [ ] **Largest Contentful Paint < 2.5s** on 4G
- [ ] **Time to Interactive < 3.8s** on 4G
- [ ] **Cumulative Layout Shift < 0.1**
- [ ] JavaScript bundle < 200KB gzipped
- [ ] CSS bundle < 50KB gzipped
- [ ] Critical CSS inlined
- [ ] Above-the-fold content prioritized

### Runtime Performance

- [ ] 60fps scrolling on all screens
- [ ] No jank during animations
- [ ] Smooth page transitions (< 300ms)
- [ ] List virtualization for 50+ items
- [ ] Image lazy loading implemented
- [ ] Code splitting by route
- [ ] Tree-shaking enabled
- [ ] Unused CSS removed

### Network Optimization

- [ ] API responses < 100KB
- [ ] GraphQL queries optimized
- [ ] Compression enabled (gzip/brotli)
- [ ] HTTP/2 push for critical assets
- [ ] CDN for static assets
- [ ] Resource hints (preconnect, prefetch)
- [ ] Service Worker caching strategy
- [ ] Background sync for offline actions

### Measurement Tools

```bash
# Lighthouse CI
pnpm lighthouse:ci

# Bundle analysis
pnpm run build && pnpm run analyze

# Performance monitoring
pnpm performance:baseline
pnpm performance:analyze
```

---

## Touch Interactions

### Touch Targets

- [ ] **Minimum size: 44x44px** (Apple HIG)
- [ ] **Minimum size: 48x48px** (Material Design)
- [ ] Adequate spacing between targets (8px minimum)
- [ ] Primary actions at thumb-friendly positions
- [ ] FAB positioned in bottom-right (16px margin)
- [ ] Bottom navigation height: 64px
- [ ] Top navigation height: 56px

### Touch Gestures

- [ ] **Tap**: Primary action on all interactive elements
- [ ] **Long press**: Context menu or additional options
- [ ] **Swipe**:
  - Left/Right on cards for actions (edit/delete)
  - Down on modals to dismiss
  - Up on bottom sheets to expand
- [ ] **Pinch**: Zoom on images and maps
- [ ] **Pull to refresh**: On list views
- [ ] **Drag**: Reorder items in lists

### Touch Feedback

- [ ] Visual feedback on tap (100-150ms)
- [ ] Haptic feedback for important actions
- [ ] Active state styling (:active pseudo-class)
- [ ] Loading indicators for async actions
- [ ] Disabled state clearly indicated
- [ ] Success animations on completion

### Touch-Specific Code

```tsx
// Prevent 300ms click delay
<meta name="viewport" content="width=device-width, initial-scale=1">

// Touch-friendly button
<Button
  style={{
    minWidth: '44px',
    minHeight: '44px',
    padding: '12px 24px',
  }}
>
  Action
</Button>

// Swipe gesture
<div
  onTouchStart={handleTouchStart}
  onTouchMove={handleTouchMove}
  onTouchEnd={handleTouchEnd}
>
  Swipe me
</div>
```

---

## Responsive Design

### Breakpoints

```css
/* Mobile First */
@media (min-width: 640px)  { /* sm - Large phones */ }
@media (min-width: 768px)  { /* md - Tablets */ }
@media (min-width: 1024px) { /* lg - Small laptops */ }
@media (min-width: 1280px) { /* xl - Desktops */ }
```

### Layout Checklist

- [ ] Mobile: Single column layout
- [ ] Tablet: 2 column grid
- [ ] Desktop: 3+ column grid
- [ ] Responsive images with srcset
- [ ] Flexible grids (Grid/Flexbox)
- [ ] Responsive typography (clamp/vw units)
- [ ] Bottom navigation (mobile)
- [ ] Side navigation (desktop)
- [ ] Modals full-screen on mobile
- [ ] Bottom sheets instead of center modals

### Viewport Configuration

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
>
```

### Responsive Component Example

```tsx
import { useMediaQuery } from '@siteproof/design-system';

function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return (
    <Grid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>
      {isMobile ? <MobileCard /> : <DesktopCard />}
    </Grid>
  );
}
```

---

## Offline Functionality

### Service Worker

- [ ] Service Worker registered
- [ ] Cache-first strategy for static assets
- [ ] Network-first strategy for API calls
- [ ] Offline page configured
- [ ] Background sync enabled
- [ ] Push notifications setup
- [ ] Periodic background sync

### IndexedDB Storage

- [ ] Forms data cached locally
- [ ] Inspection data stored offline
- [ ] Photos queued for upload
- [ ] Sync queue management
- [ ] Storage quota management
- [ ] Data expiration policy

### Offline UI

- [ ] Offline indicator banner
- [ ] Sync status display
- [ ] Queue counter visible
- [ ] Retry mechanism for failed syncs
- [ ] Conflict resolution UI
- [ ] Clear offline data option

### Code Example

```typescript
// Service Worker registration
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// IndexedDB storage
import { openDB } from 'idb';

const db = await openDB('siteproof', 1, {
  upgrade(db) {
    db.createObjectStore('inspections');
    db.createObjectStore('photos');
  },
});

// Save offline
await db.put('inspections', data, id);

// Sync when online
window.addEventListener('online', syncOfflineData);
```

---

## Forms and Inputs

### Input Optimization

- [ ] **Font size: 16px minimum** (prevents iOS zoom)
- [ ] Appropriate `inputMode` attribute
- [ ] Autocomplete attributes
- [ ] Autofocus on first field
- [ ] Enter key submits form
- [ ] Tab navigation works correctly
- [ ] Error messages inline
- [ ] Labels visible (not just placeholders)

### Input Types

```tsx
// Email
<Input type="email" inputMode="email" autoComplete="email" />

// Phone
<Input type="tel" inputMode="tel" autoComplete="tel" />

// Number
<Input type="number" inputMode="numeric" pattern="[0-9]*" />

// Search
<Input type="search" inputMode="search" />

// URL
<Input type="url" inputMode="url" />

// Date
<Input type="date" />
```

### Mobile Keyboard

- [ ] Numeric keyboard for numbers
- [ ] Email keyboard for emails
- [ ] Tel keyboard for phones
- [ ] URL keyboard for URLs
- [ ] Decimal keyboard for decimals
- [ ] Search button shows on keyboard

### Form Validation

- [ ] Client-side validation before submit
- [ ] Clear error messages
- [ ] Field-level validation on blur
- [ ] Submit button disabled until valid
- [ ] Loading state during submission
- [ ] Success feedback after submission

---

## Media and Assets

### Images

- [ ] Responsive images with srcset
- [ ] WebP format with fallback
- [ ] Lazy loading below fold
- [ ] Placeholder for loading
- [ ] Max width: 100%
- [ ] Image compression (< 100KB per image)
- [ ] Alt text for accessibility

```html
<img
  src="photo-800.webp"
  srcset="
    photo-400.webp 400w,
    photo-800.webp 800w,
    photo-1200.webp 1200w
  "
  sizes="(max-width: 768px) 100vw, 50vw"
  alt="Construction site overview"
  loading="lazy"
/>
```

### Icons

- [ ] SVG icons preferred
- [ ] Icon sprite sheet for common icons
- [ ] Font icons as fallback
- [ ] Icon size: 20px-28px
- [ ] Touch target: 44x44px minimum
- [ ] Color inherits from parent

### Videos

- [ ] Videos < 5MB
- [ ] Autoplay muted only
- [ ] Poster image provided
- [ ] Controls visible
- [ ] Responsive sizing
- [ ] Lazy loading enabled

---

## PWA Features

### Manifest

- [ ] `manifest.json` configured
- [ ] App name and short name
- [ ] Icons (192x192, 512x512)
- [ ] Theme color matches brand
- [ ] Background color set
- [ ] Display mode: standalone
- [ ] Orientation: portrait/any

```json
{
  "name": "SiteProof",
  "short_name": "SiteProof",
  "description": "Construction Quality Management",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#0047AB",
  "background_color": "#FFFFFF",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Installation

- [ ] Add to Home Screen prompt
- [ ] Custom install banner
- [ ] Installation instructions
- [ ] Splash screen configured
- [ ] App updates automatically

### App-Like Features

- [ ] Full-screen mode
- [ ] Status bar styling
- [ ] No browser chrome
- [ ] Custom navigation
- [ ] Back button handling
- [ ] Share API integration

---

## Testing

### Device Testing

- [ ] iPhone 12/13/14 (iOS 15+)
- [ ] iPhone SE (small screen)
- [ ] iPad (tablet layout)
- [ ] Samsung Galaxy S21/S22 (Android 12+)
- [ ] Google Pixel 6/7
- [ ] OnePlus 9/10
- [ ] Various screen sizes (320px-1920px)

### Browser Testing

- [ ] Safari (iOS)
- [ ] Chrome (Android)
- [ ] Firefox (Android)
- [ ] Samsung Internet
- [ ] Edge (Android)

### Testing Scenarios

- [ ] **Slow 3G network** (1.6 Mbps, 150ms RTT)
- [ ] **Offline mode** (no connection)
- [ ] **Intermittent connection** (switching on/off)
- [ ] **Low battery mode**
- [ ] **Background/foreground transitions**
- [ ] **Orientation changes**
- [ ] **Split screen mode**
- [ ] **Zoomed in (200%)**

### Playwright Mobile Tests

```typescript
import { test, devices } from '@playwright/test';

test.use(devices['iPhone 12']);

test('mobile inspection flow', async ({ page }) => {
  await page.goto('/inspections');

  // Test touch interactions
  await page.tap('[data-testid="new-inspection"]');

  // Test form inputs
  await page.fill('[name="location"]', 'Site A');

  // Test photo upload
  await page.setInputFiles('[type="file"]', 'photo.jpg');

  // Test submit
  await page.tap('[type="submit"]');
});
```

### Performance Testing

```bash
# Lighthouse mobile audit
lighthouse https://siteproof.com \
  --preset=mobile \
  --view

# WebPageTest mobile
webpagetest test https://siteproof.com \
  --device="Moto G4" \
  --location="Dulles:Chrome"
```

---

## Deployment

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Lighthouse score > 90
- [ ] Bundle size < 200KB
- [ ] No console errors
- [ ] Service Worker updated
- [ ] Cache invalidated
- [ ] Database migrations run
- [ ] Environment variables set

### Mobile-Specific Headers

```nginx
# Enable compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;

# Cache static assets
location /static {
  expires 1y;
  add_header Cache-Control "public, immutable";
}

# Security headers
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "SAMEORIGIN";
add_header Content-Security-Policy "default-src 'self'";
```

### Progressive Enhancement

- [ ] Core functionality works without JavaScript
- [ ] Forms work with HTML5 validation
- [ ] Links work without client-side routing
- [ ] Content visible before JavaScript loads
- [ ] Graceful degradation for old browsers

### Monitoring

- [ ] Error tracking (Sentry)
- [ ] Analytics (Google Analytics)
- [ ] Performance monitoring (Web Vitals)
- [ ] User feedback collection
- [ ] Crash reporting

---

## Best Practices

### 1. Mobile-First Development

Always design and code for mobile first, then enhance for desktop:

```css
/* Mobile first (default) */
.card {
  padding: 16px;
}

/* Tablet and up */
@media (min-width: 768px) {
  .card {
    padding: 24px;
  }
}
```

### 2. Touch-Friendly Design

```tsx
// Good ✅
<Button style={{ minHeight: '48px', padding: '12px 24px' }}>
  Save
</Button>

// Bad ❌
<Button style={{ height: '32px', padding: '4px 8px' }}>
  Save
</Button>
```

### 3. Network-Aware Code

```typescript
// Check connection
if (!navigator.onLine) {
  // Save to IndexedDB
  saveOffline(data);
} else {
  // Save to server
  await saveOnline(data);
}

// Network information API
const connection = navigator.connection;
if (connection && connection.effectiveType === '4g') {
  // Load high-quality images
} else {
  // Load low-quality images
}
```

### 4. Battery Awareness

```typescript
// Battery API
const battery = await navigator.getBattery();

if (battery.level < 0.2) {
  // Reduce animations
  // Decrease polling frequency
  // Defer non-critical tasks
}
```

### 5. Adaptive Loading

```typescript
// Load different bundles based on device
if (isMobile) {
  import('./MobileComponent');
} else {
  import('./DesktopComponent');
}
```

---

## Common Mobile Issues

### Issue 1: 300ms Click Delay

**Solution:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1">
```

### Issue 2: iOS Input Zoom

**Solution:**
```css
input {
  font-size: 16px; /* Minimum to prevent zoom */
}
```

### Issue 3: Fixed Positioning

**Solution:**
```css
/* Avoid fixed positioning on mobile */
.header {
  position: sticky;
  top: 0;
}
```

### Issue 4: Viewport Height on Mobile

**Solution:**
```css
/* Use dvh instead of vh */
.full-screen {
  height: 100dvh; /* Dynamic viewport height */
}
```

### Issue 5: Touch Scrolling

**Solution:**
```css
/* Enable momentum scrolling */
.scrollable {
  -webkit-overflow-scrolling: touch;
  overflow-y: auto;
}
```

---

## Resources

### Documentation

- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design Mobile](https://material.io/design/platform-guidance/android-bars.html)
- [Web.dev Mobile Performance](https://web.dev/mobile/)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

### Tools

- [Chrome DevTools Device Mode](https://developer.chrome.com/docs/devtools/device-mode/)
- [BrowserStack](https://www.browserstack.com/) - Real device testing
- [LambdaTest](https://www.lambdatest.com/) - Mobile testing
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
