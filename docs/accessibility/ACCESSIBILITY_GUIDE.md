# Accessibility Guide

## Overview

This document outlines the accessibility features and best practices implemented in SiteProof v2.

## Implemented Features

### 1. Skip Navigation

Skip navigation links allow keyboard users to bypass repetitive navigation and jump directly to main content.

**Implementation:**
- Skip links are visible only when focused
- Located at the top of every page
- Implemented in `/apps/web/src/components/accessibility/SkipNav.tsx`

**Usage:**
- Press Tab on any page to reveal skip links
- Press Enter to jump to main content or navigation

### 2. Screen Reader Support

Screen reader announcements provide context for dynamic content changes.

**Implementation:**
- Live regions for announcements
- Helper functions for common announcements
- Located in `/apps/web/src/components/accessibility/ScreenReaderAnnouncer.tsx`

**Usage:**
```typescript
import { announce } from '@/lib/accessibility/announcer';

// Announce a message
announce('Item added to cart', 'polite');

// Announce an error
announce('Form submission failed', 'assertive');
```

### 3. Focus Management

Proper focus management ensures keyboard users can navigate efficiently.

**Features:**
- Focus trapping in modals
- Focus restoration when closing dialogs
- Visual focus indicators
- Focus management hooks

**Implementation:**
```typescript
import { useFocusManagement } from '@/hooks/useFocusManagement';

const { saveFocus, restoreFocus, trapFocus } = useFocusManagement();

// Save current focus before opening modal
saveFocus();

// Trap focus within modal
trapFocus(modalElement);

// Restore focus when closing
restoreFocus();
```

### 4. ARIA Labels and Landmarks

All interactive elements have proper ARIA labels and semantic HTML.

**Key Areas:**
- Navigation with proper `role="navigation"` and `aria-label`
- Buttons with `aria-label` for icon-only buttons
- Forms with associated labels
- Loading states with `aria-live` regions

**Helper Functions:**
```typescript
import { getIconButtonProps, getModalProps } from '@/lib/accessibility/aria-helpers';

// Icon button
<button {...getIconButtonProps('Close menu', isOpen)}>
  <X />
</button>

// Modal
<div {...getModalProps('modal-title', 'modal-description')}>
  <h2 id="modal-title">Title</h2>
  <p id="modal-description">Description</p>
</div>
```

### 5. Keyboard Navigation

Full keyboard support for all interactive elements.

**Features:**
- Tab navigation through all interactive elements
- Arrow key navigation for lists and menus
- Escape key to close modals and dropdowns
- Enter/Space to activate buttons

**Implementation:**
```typescript
import { useKeyboardNav } from '@/hooks/useKeyboardNav';

useKeyboardNav({
  onEscape: closeModal,
  onEnter: submit,
  onArrowUp: selectPrevious,
  onArrowDown: selectNext,
});
```

## Testing Accessibility

### Automated Testing

We provide an A11y test helper component that runs in development mode:

```typescript
import { A11yTestHelper } from '@/components/accessibility/A11yTestHelper';

// Add to your root layout in development
{process.env.NODE_ENV === 'development' && <A11yTestHelper />}
```

### Manual Testing

1. **Keyboard Navigation:**
   - Tab through all interactive elements
   - Ensure visible focus indicators
   - Test with Tab, Shift+Tab, Arrow keys, Enter, Escape

2. **Screen Reader Testing:**
   - macOS: VoiceOver (Cmd+F5)
   - Windows: NVDA (free) or JAWS
   - Test all interactive flows

3. **Color Contrast:**
   - Use browser DevTools Accessibility panel
   - Ensure 4.5:1 contrast ratio for normal text
   - Ensure 3:1 contrast ratio for large text

### Tools

- **axe DevTools:** Browser extension for accessibility testing
- **Lighthouse:** Built-in Chrome DevTools audit
- **WAVE:** Web accessibility evaluation tool

## Accessibility Checklist

### Every Component Should:

- [ ] Have semantic HTML (button, nav, main, etc.)
- [ ] Include proper ARIA labels where needed
- [ ] Support keyboard navigation
- [ ] Have visible focus indicators
- [ ] Maintain proper heading hierarchy (h1, h2, h3...)
- [ ] Provide alternative text for images
- [ ] Ensure sufficient color contrast
- [ ] Support screen reader announcements
- [ ] Work with reduced motion preferences
- [ ] Support high contrast mode

### Forms Should:

- [ ] Associate labels with inputs
- [ ] Provide clear error messages
- [ ] Announce errors to screen readers
- [ ] Support keyboard-only interaction
- [ ] Indicate required fields
- [ ] Provide helpful placeholder text
- [ ] Show clear focus states

### Modals/Dialogs Should:

- [ ] Trap focus within the dialog
- [ ] Restore focus on close
- [ ] Close with Escape key
- [ ] Have proper ARIA attributes
- [ ] Prevent background interaction
- [ ] Announce to screen readers

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [WebAIM](https://webaim.org/)
- [A11y Project](https://www.a11yproject.com/)

## Support

For accessibility issues or questions, please open an issue in the repository.
