# Testing Mobile Features - Phase 4

## Quick Testing Checklist

### ✅ Touch Targets (44px minimum)

**Manual Test:**
1. Open app on mobile device or emulator
2. Try tapping all buttons with your finger
3. Verify no missed taps or difficulty selecting
4. Test on various screen sizes (320px - 768px)

**Automated Test:**
```bash
npm test -- touch-targets.test.tsx
```

### ✅ Swipe Gestures

**Manual Test:**
1. Navigate to `/demo/mobile-features`
2. Swipe left/right/up/down on the swipe box
3. Verify direction is detected correctly
4. Test on swipeable cards
5. Swipe left to delete, right to archive

**Expected Behavior:**
- Smooth animations
- Haptic feedback on swipe
- Visual confirmation of action
- Threshold prevents accidental swipes

### ✅ Pull-to-Refresh

**Manual Test:**
1. Navigate to any page with PullToRefresh
2. Pull down from top of page
3. Release when threshold reached
4. Verify refresh occurs

**Expected Behavior:**
- Only works at scroll top
- Shows progress indicator
- Checkmark appears when threshold met
- Haptic feedback at threshold
- Smooth animation

### ✅ Form Input Sizes

**Manual Test:**
1. Open any form on mobile
2. Tap input fields
3. Verify keyboard doesn't cover input
4. Test on iOS and Android keyboards

**Expected Behavior:**
- 56px height on mobile (comfortable for thumbs)
- 48px height on desktop
- No zoom on focus (touch-manipulation)
- Adequate spacing between fields

### ✅ Haptic Feedback

**Manual Test:**
1. Navigate to `/demo/mobile-features`
2. Tap buttons in haptic section
3. Feel different vibration patterns

**Devices to Test:**
- iPhone (best haptic engine)
- Android (varies by device)
- iPad (lighter haptics)

**Expected Patterns:**
- Light: 10ms (button clicks)
- Medium: 20ms (toggles)
- Heavy: 30ms (important actions)
- Success: Short-pause-short
- Error: Long-pause-long

### ✅ PWA Installation

**Manual Test - iOS Safari:**
1. Open app in Safari
2. Tap Share button
3. Select "Add to Home Screen"
4. Verify icon appears on home screen
5. Open from home screen
6. Verify standalone mode (no browser UI)

**Manual Test - Android Chrome:**
1. Open app in Chrome
2. Wait for install prompt OR
3. Tap menu > "Install app"
4. Confirm installation
5. Verify icon on home screen
6. Open and test

**Expected Behavior:**
- Auto-prompt after engagement (optional)
- Manual install option always available
- Proper icon and name display
- Standalone display mode
- Splash screen on launch

### ✅ Offline Functionality

**Manual Test:**
1. Open app while online
2. Navigate through several pages
3. Enable airplane mode
4. Refresh page
5. Navigate to cached pages

**Expected Behavior:**
- Offline page shows when no cache
- Cached pages load normally
- Images show placeholder if not cached
- Auto-reload when back online
- Background sync queues updates

### ✅ Service Worker

**Manual Test:**
1. Open DevTools > Application > Service Workers
2. Verify service worker is registered
3. Check Cache Storage for caches
4. Verify offline mode works

**DevTools Checks:**
- Service worker: Active and running
- Cache: Static, dynamic, and image caches
- Manifest: No errors
- Icons: All sizes present

### ✅ Responsive Layouts

**Screen Sizes to Test:**
- 320px (iPhone SE)
- 375px (iPhone 12/13)
- 390px (iPhone 14)
- 414px (iPhone 14 Plus)
- 768px (iPad portrait)
- 1024px (iPad landscape)

**Manual Test:**
1. Open DevTools > Device Toolbar
2. Test each screen size
3. Verify no horizontal scroll
4. Check touch target sizes
5. Verify readable text

## Automated Testing

### Unit Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm test -- touch-targets.test.tsx

# Run with coverage
npm test:coverage
```

### E2E Tests (if available)
```bash
# Run Playwright tests
npm run test:e2e

# Run specific mobile tests
npm run test:e2e -- mobile
```

### Lighthouse Audit
```bash
# PWA audit
lighthouse https://your-app.com --view --preset=desktop
lighthouse https://your-app.com --view --preset=mobile

# Expected Scores:
# PWA: 90+
# Performance: 90+
# Accessibility: 95+
# Best Practices: 95+
```

## Mobile Emulator Testing

### iOS Simulator (Mac only)
```bash
# Install Xcode from App Store
# Open Simulator from Xcode > Developer Tools > Simulator
# Navigate to app URL in Safari
```

### Android Emulator
```bash
# Install Android Studio
# Open AVD Manager
# Create device (Pixel 5, API 33+)
# Launch emulator
# Open Chrome and navigate to app
```

### Browser DevTools
```bash
# Chrome DevTools
# F12 > Toggle Device Toolbar (Ctrl+Shift+M)
# Select device or responsive mode
# Test touch emulation
```

## Performance Testing

### Mobile Performance
1. Open DevTools > Performance
2. Enable CPU throttling (4x slowdown)
3. Enable network throttling (Fast 3G)
4. Record performance profile
5. Verify acceptable load times

**Target Metrics:**
- First Contentful Paint: < 1.8s
- Largest Contentful Paint: < 2.5s
- Total Blocking Time: < 200ms
- Cumulative Layout Shift: < 0.1

## Accessibility Testing

### Touch Target Validation
```bash
# Use axe DevTools extension
# Check for touch target violations
# Verify minimum 44px × 44px
```

### Screen Reader Testing

**iOS VoiceOver:**
1. Settings > Accessibility > VoiceOver
2. Enable VoiceOver
3. Navigate app with swipes
4. Verify all buttons have labels

**Android TalkBack:**
1. Settings > Accessibility > TalkBack
2. Enable TalkBack
3. Navigate with gestures
4. Verify proper announcements

## Common Issues & Solutions

### Issue: Touch targets too small
**Solution:** Add `min-h-[44px] min-w-[44px]` classes

### Issue: Swipe doesn't work
**Solution:** Check for conflicting event listeners, add `touch-action: none`

### Issue: Pull-to-refresh conflicts with scroll
**Solution:** Ensure only activates at scrollTop === 0

### Issue: Haptic feedback not working
**Solution:** Only works on HTTPS and physical devices

### Issue: PWA won't install
**Solution:** 
- Verify manifest.json is valid
- Check HTTPS is enabled
- Ensure service worker is registered
- Verify icons are correct sizes

### Issue: Service worker not updating
**Solution:**
- Hard refresh (Ctrl+Shift+R)
- Unregister old service worker
- Clear cache storage
- Update cache version

## Documentation

- [Mobile Optimization Phase 4](/docs/mobile-optimization-phase4.md)
- [Touch Target Guidelines](https://web.dev/accessible-tap-targets/)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Service Worker Guide](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

## Support

For issues or questions:
1. Check documentation
2. Review test results
3. Test on real devices
4. Check browser console for errors
