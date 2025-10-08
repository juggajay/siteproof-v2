# Mobile-First Design Checklist

## Overview

This checklist ensures all components and features follow mobile-first design principles and provide an optimal experience on mobile devices. SiteProof is designed to be used primarily on construction sites via mobile devices, making mobile optimization critical.

---

## Touch Targets

### Minimum Size Requirements

- [ ] **All interactive elements ≥ 44×44px** (WCAG 2.5.5 Level AA)
- [ ] **Primary mobile buttons ≥ 56×56px** (optimal for thumbs)
- [ ] **Desktop buttons ≥ 40×40px** (acceptable)
- [ ] **Form inputs ≥ 56px height** on mobile
- [ ] **Form inputs ≥ 48px height** on desktop
- [ ] **List items ≥ 48px height** (tap targets)
- [ ] **Icon-only buttons ≥ 44×44px** (minimum)

### Implementation

```typescript
// ✅ Mobile primary action
<Button size="lg">Submit Inspection</Button>  // 56px

// ✅ Desktop action
<Button size="md">Save</Button>  // 48px

// ✅ Icon button
<button className="w-11 h-11">  // 44px
  <Trash2 size={20} />
</button>
```

### Testing
- [ ] Test on actual mobile device (not just DevTools)
- [ ] Verify tap targets with finger (not mouse)
- [ ] Test with gloves (construction site use case)
- [ ] Confirm spacing between tap targets (8px minimum)

---

## Typography

### Mobile Font Sizing

- [ ] **Base font size ≥ 16px** (prevents iOS zoom on focus)
- [ ] **Line height ≥ 1.5** for body text
- [ ] **Line height ≥ 1.2** for headings
- [ ] **Heading hierarchy clear** (h1-h5 distinct sizes)
- [ ] **No text smaller than 12px** (caption text minimum)

### Implementation

```css
/* ✅ Mobile-friendly typography */
body {
  font-size: 16px;  /* Prevents iOS auto-zoom */
  line-height: 1.5;
}

h1 { font-size: 32px; line-height: 1.25; }
h2 { font-size: 28px; line-height: 1.3; }
h3 { font-size: 24px; line-height: 1.33; }
```

### Testing
- [ ] Test on iOS Safari (auto-zoom behavior)
- [ ] Test on Android Chrome
- [ ] Verify readability in bright sunlight
- [ ] Test with iOS Dynamic Type (accessibility)
- [ ] Verify text doesn't overflow on small screens

---

## Layout & Responsive Design

### Breakpoints

Our mobile-first breakpoints:

```typescript
// Mobile-first breakpoint system
screens: {
  'sm': '640px',   // Large phones (landscape)
  'md': '768px',   // Tablets (portrait)
  'lg': '1024px',  // Tablets (landscape) / Small laptops
  'xl': '1280px',  // Desktops
  '2xl': '1536px', // Large desktops
}
```

### Checklist

- [ ] **Mobile-first CSS** (base styles for mobile, media queries for larger)
- [ ] **Responsive breakpoints**: 375px, 640px, 768px, 1024px
- [ ] **Tablet-specific optimizations** (768-1024px range)
- [ ] **Landscape mode tested** on mobile
- [ ] **Portrait mode tested** on tablets
- [ ] **No horizontal scrolling** (except intentional carousels)
- [ ] **Content reflows** at all breakpoints
- [ ] **Images responsive** (max-width: 100%)

### Implementation

```typescript
// ✅ Mobile-first approach
<Grid
  className="
    grid-cols-1        /* Mobile: 1 column */
    sm:grid-cols-2     /* Large mobile: 2 columns */
    md:grid-cols-3     /* Tablet: 3 columns */
    lg:grid-cols-4     /* Desktop: 4 columns */
  "
>
  {items.map(item => <GridItem key={item.id} />)}
</Grid>
```

### Testing
- [ ] iPhone SE (375px - smallest modern iPhone)
- [ ] iPhone 14 Pro (393px)
- [ ] iPad Mini (768px)
- [ ] iPad Pro (1024px)
- [ ] Test rotation (portrait ↔ landscape)

---

## Forms

### Mobile Form Optimization

- [ ] **Input height 56px** on mobile
- [ ] **Input height 48px** on desktop
- [ ] **Labels above inputs** (not floating/inline)
- [ ] **Error messages below inputs** (clearly visible)
- [ ] **Submit buttons full-width** on mobile
- [ ] **Submit buttons auto-width** on desktop
- [ ] **Input type appropriate** (email, tel, number, etc.)
- [ ] **Autocomplete attributes** set correctly
- [ ] **Keyboard type optimized** (numeric, email, etc.)

### Implementation

```typescript
// ✅ Mobile-optimized form
<form className="space-y-4">
  <Input
    label="Email Address"
    type="email"
    autoComplete="email"
    inputMode="email"
    className="h-14 md:h-12"  // 56px mobile, 48px desktop
  />

  <Input
    label="Phone Number"
    type="tel"
    autoComplete="tel"
    inputMode="tel"
  />

  <Button
    type="submit"
    size="lg"
    className="w-full md:w-auto"  // Full-width mobile
  >
    Submit
  </Button>
</form>
```

### Input Types for Mobile Keyboards

- [ ] `type="email"` - Shows @ and .com shortcuts
- [ ] `type="tel"` - Shows numeric keypad
- [ ] `type="number"` - Shows numeric keypad with +/-
- [ ] `type="url"` - Shows .com and / shortcuts
- [ ] `type="search"` - Shows search button
- [ ] `type="date"` - Shows date picker
- [ ] `type="time"` - Shows time picker

### Testing
- [ ] Test keyboard appearance on iOS
- [ ] Test keyboard appearance on Android
- [ ] Verify autocomplete suggestions work
- [ ] Test form submission on mobile
- [ ] Verify error states are visible

---

## Navigation

### Mobile Navigation Patterns

- [ ] **Bottom navigation** on mobile (thumb-friendly)
- [ ] **Top navigation** on desktop
- [ ] **FAB for primary action** (floating action button)
- [ ] **Hamburger menu** for secondary navigation
- [ ] **Breadcrumbs** on desktop only (hidden on mobile)
- [ ] **Back button** easily accessible
- [ ] **Max 5 items** in bottom nav (thumb reach)

### Implementation

```typescript
// ✅ Responsive navigation
<PageLayout
  topNav={
    <TopNav
      className="hidden md:flex"  // Desktop only
      title="Projects"
    />
  }
  bottomNav={
    <BottomNav
      className="md:hidden"  // Mobile only
      items={navItems}
    />
  }
>
  {content}
</PageLayout>

// ✅ FAB for primary action
<FAB
  icon={<Plus />}
  onClick={handleCreate}
  className="md:hidden"  // Mobile only
/>
```

### Testing
- [ ] Bottom nav accessible with thumb
- [ ] FAB doesn't obscure content
- [ ] Hamburger menu opens/closes smoothly
- [ ] Navigation persists across pages
- [ ] Active state clearly indicated

---

## Performance

### Mobile Performance Targets

- [ ] **First Contentful Paint < 1.5s** (on 3G)
- [ ] **Time to Interactive < 3.5s** (on 3G)
- [ ] **Largest Contentful Paint < 2.5s**
- [ ] **Cumulative Layout Shift < 0.1**
- [ ] **Total Blocking Time < 200ms**
- [ ] **Lighthouse Performance Score ≥ 90**

### Optimization Techniques

- [ ] **Images lazy loaded** (below fold)
- [ ] **Images optimized** (WebP format)
- [ ] **Images responsive** (srcset for different sizes)
- [ ] **Code-split heavy components** (React.lazy)
- [ ] **Bundle size < 300KB gzipped** (initial)
- [ ] **Critical CSS inlined**
- [ ] **Non-critical CSS deferred**
- [ ] **Fonts preloaded** (subset for performance)

### Implementation

```typescript
// ✅ Lazy loading images
<img
  src="photo.jpg"
  loading="lazy"
  srcSet="photo-320.jpg 320w, photo-640.jpg 640w"
  sizes="(max-width: 640px) 100vw, 640px"
/>

// ✅ Code splitting
const Modal = lazy(() => import('@siteproof/design-system').then(m => ({
  default: m.Modal
})));
```

### Testing
- [ ] Test on actual device with throttled network
- [ ] Run Lighthouse on mobile
- [ ] Test on slow 3G connection
- [ ] Monitor bundle size with webpack-bundle-analyzer
- [ ] Check Web Vitals in production

---

## Progressive Web App (PWA)

### PWA Requirements

- [ ] **Manifest.json configured**
- [ ] **Service worker registered**
- [ ] **App icons** (8 sizes: 72, 96, 128, 144, 152, 192, 384, 512)
- [ ] **Offline fallback page**
- [ ] **Installable prompt** (iOS + Android)
- [ ] **Splash screen** configured
- [ ] **Theme color** set
- [ ] **Display mode** set to 'standalone'

### manifest.json Example

```json
{
  "name": "SiteProof - Inspection Management",
  "short_name": "SiteProof",
  "description": "Construction site inspection and quality management",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#2196F3",
  "background_color": "#FFFFFF",
  "orientation": "portrait-primary",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Testing
- [ ] Install on iOS (Add to Home Screen)
- [ ] Install on Android (Install App prompt)
- [ ] Verify icons display correctly
- [ ] Test offline functionality
- [ ] Verify splash screen shows
- [ ] Test push notifications (if applicable)

---

## Gestures & Interactions

### Mobile Gestures

- [ ] **Swipe to delete** on lists (optional, provide button alternative)
- [ ] **Pull-to-refresh** on list/feed views
- [ ] **Pinch to zoom** on images (where appropriate)
- [ ] **Long press** for context menu (with visual feedback)
- [ ] **Drag to reorder** items (with haptic feedback if available)

### Implementation

```typescript
// ✅ Pull-to-refresh
import { motion } from 'framer-motion';

<motion.div
  drag="y"
  dragConstraints={{ top: 0, bottom: 100 }}
  onDragEnd={(event, info) => {
    if (info.offset.y > 50) {
      handleRefresh();
    }
  }}
>
  {content}
</motion.div>
```

### Testing
- [ ] Test gestures on actual device
- [ ] Verify haptic feedback (iOS)
- [ ] Confirm visual feedback on interaction
- [ ] Test gesture conflicts (e.g., swipe + scroll)
- [ ] Provide keyboard alternatives

---

## Offline Support

### Offline Capabilities

- [ ] **Critical assets cached** (service worker)
- [ ] **Offline fallback page** displayed
- [ ] **Queue actions** when offline (sync when online)
- [ ] **Offline indicator** visible to user
- [ ] **Data persistence** (IndexedDB or localStorage)
- [ ] **Background sync** when connection restored

### Implementation

```typescript
// ✅ Offline detection
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const handleOnline = () => setIsOnline(true);
  const handleOffline = () => setIsOnline(false);

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}, []);

// Show offline banner
{!isOnline && (
  <Banner variant="warning">
    You're offline. Changes will sync when connection is restored.
  </Banner>
)}
```

### Testing
- [ ] Test with airplane mode enabled
- [ ] Verify queued actions sync when online
- [ ] Test offline fallback page
- [ ] Verify data persistence
- [ ] Test intermittent connection

---

## Camera & Media

### Mobile Camera Integration

- [ ] **Camera access** for photo capture
- [ ] **Gallery access** for photo upload
- [ ] **Photo preview** before upload
- [ ] **Photo compression** (reduce file size)
- [ ] **Photo orientation** handled correctly (EXIF)
- [ ] **Multiple photo selection** supported
- [ ] **Video recording** (if applicable)

### Implementation

```typescript
// ✅ Camera input
<Input
  type="file"
  accept="image/*"
  capture="environment"  // Rear camera
  onChange={handlePhotoCapture}
/>

// ✅ Multiple photos
<Input
  type="file"
  accept="image/*"
  multiple
  onChange={handleMultiplePhotos}
/>
```

### Testing
- [ ] Test camera on iOS
- [ ] Test camera on Android
- [ ] Verify photo orientation correct
- [ ] Test file size limits
- [ ] Test upload progress indicator

---

## iOS-Specific Considerations

### Safari Mobile Quirks

- [ ] **100vh fix** (viewport height bug)
- [ ] **Input zoom prevention** (font-size ≥ 16px)
- [ ] **Safe area insets** (iPhone notch)
- [ ] **Bounce effect** disabled (overscroll-behavior)
- [ ] **Tap highlight** removed (-webkit-tap-highlight-color)
- [ ] **Momentum scrolling** enabled (-webkit-overflow-scrolling)

### Implementation

```css
/* ✅ iOS fixes */

/* Fix 100vh */
.full-height {
  height: 100vh;
  height: -webkit-fill-available;
}

/* Safe area insets */
.safe-area {
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Disable bounce */
body {
  overscroll-behavior-y: none;
}

/* Remove tap highlight */
* {
  -webkit-tap-highlight-color: transparent;
}
```

### Testing
- [ ] Test on iPhone with notch (safe areas)
- [ ] Verify 100vh displays correctly
- [ ] Test input focus (no unwanted zoom)
- [ ] Verify smooth scrolling
- [ ] Test landscape orientation

---

## Android-Specific Considerations

### Chrome Mobile Quirks

- [ ] **Address bar height** (viewport changes on scroll)
- [ ] **PWA install prompt** configured
- [ ] **Back button** behavior (browser history)
- [ ] **Theme color** in status bar
- [ ] **Splash screen** for PWA

### Implementation

```html
<!-- ✅ Android theme -->
<meta name="theme-color" content="#2196F3">

<!-- PWA installability -->
<link rel="manifest" href="/manifest.json">
```

### Testing
- [ ] Test on Android Chrome
- [ ] Test PWA installation
- [ ] Verify theme color in status bar
- [ ] Test back button navigation
- [ ] Test different Android versions

---

## Accessibility on Mobile

### Mobile-Specific A11y

- [ ] **Screen reader tested** (TalkBack on Android)
- [ ] **Screen reader tested** (VoiceOver on iOS)
- [ ] **Focus order** logical (follows visual order)
- [ ] **Zoom support** (up to 200%)
- [ ] **Large text support** (iOS Dynamic Type)
- [ ] **Reduce motion** respected
- [ ] **High contrast mode** supported

### Testing
- [ ] Enable TalkBack (Android)
- [ ] Enable VoiceOver (iOS)
- [ ] Enable Large Text (iOS Settings)
- [ ] Enable Reduce Motion
- [ ] Test with external keyboard (Bluetooth)
- [ ] Test with switch control (iOS)

---

## Testing Devices & Tools

### Required Test Devices

**Minimum:**
- [ ] iPhone SE (smallest modern iPhone - 375px)
- [ ] iPhone 14 Pro (modern iPhone - 393px)
- [ ] Samsung Galaxy S23 (Android - 360px)
- [ ] iPad Mini (smallest tablet - 768px)
- [ ] iPad Pro (large tablet - 1024px)

**Optional:**
- [ ] iPhone 14 Pro Max (largest iPhone - 430px)
- [ ] Samsung Galaxy S23 Ultra (large Android)
- [ ] Foldable devices (Samsung Z Fold)

### Browser Testing

- [ ] **iOS Safari** (primary)
- [ ] **Chrome Android** (primary)
- [ ] **Chrome iOS** (uses Safari WebKit)
- [ ] **Firefox Android**
- [ ] **Samsung Internet** (popular in some markets)

### Testing Tools

- [ ] **Chrome DevTools** (device emulation)
- [ ] **BrowserStack** (real device testing)
- [ ] **Lighthouse** (mobile audit)
- [ ] **WebPageTest** (performance on mobile networks)
- [ ] **Google Mobile-Friendly Test**

### Network Throttling

- [ ] **Slow 3G** (400Kbps down, 400ms RTT)
- [ ] **Fast 3G** (1.6Mbps down, 150ms RTT)
- [ ] **4G** (9Mbps down, 85ms RTT)
- [ ] **Offline** (airplane mode)
- [ ] **Intermittent** (connection drops)

---

## Final Mobile Checklist

### Pre-Launch Verification

**Design:**
- [ ] All touch targets ≥ 44px
- [ ] Typography readable on small screens
- [ ] Layout responsive (320px - 1024px)
- [ ] Images optimized for mobile
- [ ] Icons clearly visible

**Functionality:**
- [ ] All features work on mobile
- [ ] Forms easy to complete
- [ ] Navigation intuitive
- [ ] Camera/photo upload works
- [ ] Offline mode functional

**Performance:**
- [ ] Lighthouse mobile score ≥ 90
- [ ] First Contentful Paint < 1.5s
- [ ] Bundle size optimized
- [ ] Images lazy loaded
- [ ] Service worker active

**Accessibility:**
- [ ] Screen reader compatible
- [ ] Keyboard accessible
- [ ] Touch targets adequate
- [ ] Color contrast WCAG AA
- [ ] Zoom support (200%)

**PWA:**
- [ ] Installable on iOS
- [ ] Installable on Android
- [ ] Icons configured
- [ ] Offline fallback
- [ ] Works in standalone mode

**Testing:**
- [ ] Tested on real iOS device
- [ ] Tested on real Android device
- [ ] Tested on tablet (iPad)
- [ ] Tested offline
- [ ] Tested on slow network

---

## Resources

### Tools
- **Lighthouse:** Built into Chrome DevTools
- **BrowserStack:** https://www.browserstack.com
- **WebPageTest:** https://www.webpagetest.org
- **Mobile-Friendly Test:** https://search.google.com/test/mobile-friendly

### Testing Guides
- **iOS Testing:** https://developer.apple.com/design/human-interface-guidelines/ios
- **Android Testing:** https://developer.android.com/guide
- **PWA Testing:** https://web.dev/pwa-checklist/

---

## Support

For mobile-specific issues or questions:
- Create an issue in the GitHub repository
- Tag with `mobile` label
- Include device and OS version

---

**Remember:** Mobile-first is not mobile-only. Ensure desktop experience is equally polished.
