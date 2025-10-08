# Accessibility Documentation

## Quick Links

- [Accessibility Guide](./ACCESSIBILITY_GUIDE.md) - Complete implementation guide
- [Phase 5 Completion Report](./PHASE5_COMPLETION_REPORT.md) - Implementation details

## Overview

SiteProof v2 is built with accessibility as a core principle, following WCAG 2.1 Level AA guidelines.

## Key Features

### ✅ Keyboard Navigation
- Full keyboard support for all interactive elements
- Skip navigation links
- Focus management in modals
- Visual focus indicators

### ✅ Screen Reader Support
- ARIA labels on all interactive elements
- Live regions for dynamic updates
- Semantic HTML structure
- Proper heading hierarchy

### ✅ Visual Accessibility
- Sufficient color contrast (4.5:1 minimum)
- Minimum touch target sizes (44x44px)
- Reduced motion support
- High contrast mode support

### ✅ Testing Tools
- A11y Test Helper (development)
- Automated testing scripts
- Lighthouse CI integration

## Quick Start

### Run Accessibility Tests

```bash
# Automated testing
./scripts/test-a11y.sh

# Manual keyboard testing
1. Press Tab to navigate
2. Use Skip Navigation links
3. Test modal focus trapping
4. Verify all actions work with keyboard
```

### Using Accessibility Components

```typescript
// Skip Navigation
import { SkipNav } from '@/components/accessibility/SkipNav';
<SkipNav />

// Screen Reader Announcements
import { announce } from '@/lib/accessibility/announcer';
announce('Item added to cart', 'polite');

// ARIA Helpers
import { getIconButtonProps } from '@/lib/accessibility/aria-helpers';
<button {...getIconButtonProps('Close menu')}>
  <X />
</button>

// Focus Management
import { useFocusManagement } from '@/hooks/useFocusManagement';
const { saveFocus, restoreFocus, trapFocus } = useFocusManagement();
```

## Testing Checklist

- [ ] Keyboard navigation works on all pages
- [ ] Skip navigation links appear on Tab
- [ ] All images have alt text
- [ ] Forms have associated labels
- [ ] Color contrast meets 4.5:1 ratio
- [ ] Screen reader announces updates
- [ ] Focus is visible on all elements
- [ ] Modals trap focus correctly
- [ ] No keyboard traps exist

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Accessibility Guide](./ACCESSIBILITY_GUIDE.md)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

## Support

For accessibility issues, please open an issue in the repository with the label `accessibility`.
