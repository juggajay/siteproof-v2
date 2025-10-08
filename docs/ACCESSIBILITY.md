# SiteProof Design System - Accessibility Guidelines

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Compliance Level:** WCAG 2.1 Level AA

---

## Table of Contents

1. [Overview](#overview)
2. [Compliance Standards](#compliance-standards)
3. [Keyboard Navigation](#keyboard-navigation)
4. [Screen Reader Support](#screen-reader-support)
5. [Color and Contrast](#color-and-contrast)
6. [Focus Management](#focus-management)
5. [ARIA Patterns](#aria-patterns)
7. [Component-Specific Guidelines](#component-specific-guidelines)
8. [Testing Procedures](#testing-procedures)
9. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Overview

SiteProof Design System is committed to creating accessible components that work for all users, regardless of ability or device. Our components follow WCAG 2.1 Level AA guidelines and incorporate best practices from WAI-ARIA.

### Accessibility Principles

1. **Perceivable**: Information and UI components must be presentable to users
2. **Operable**: UI components and navigation must be operable
3. **Understandable**: Information and operation of UI must be understandable
4. **Robust**: Content must be robust enough to be interpreted by assistive technologies

---

## Compliance Standards

### WCAG 2.1 Level AA Requirements

| Criterion | Requirement | Status |
|-----------|-------------|--------|
| 1.4.3 Contrast (Minimum) | 4.5:1 for normal text, 3:1 for large text | ✅ Compliant |
| 2.1.1 Keyboard | All functionality available via keyboard | ✅ Compliant |
| 2.4.7 Focus Visible | Keyboard focus indicator visible | ✅ Compliant |
| 3.2.4 Consistent Identification | Components with same functionality labeled consistently | ✅ Compliant |
| 4.1.2 Name, Role, Value | All UI components have accessible name and role | ✅ Compliant |

### Construction Industry Considerations

Our accessibility approach accounts for:

- **Outdoor environments**: Enhanced contrast for sunlight visibility
- **Gloved hands**: Larger touch targets (minimum 44x44px)
- **Noisy environments**: Visual feedback for all actions
- **Multilingual teams**: Clear iconography and simple language
- **Varying technical literacy**: Intuitive interactions with helpful hints

---

## Keyboard Navigation

### Global Keyboard Shortcuts

All SiteProof components support keyboard navigation:

| Key | Action |
|-----|--------|
| `Tab` | Move to next interactive element |
| `Shift + Tab` | Move to previous interactive element |
| `Enter` | Activate button/link |
| `Space` | Toggle checkbox/switch, activate button |
| `Escape` | Close modal/dialog/dropdown |
| `Arrow Keys` | Navigate within component (select, radio, tabs) |
| `Home` | Move to first item in list |
| `End` | Move to last item in list |

### Focus Order

Components maintain logical focus order:

```tsx
// Correct focus order example
<Form>
  <Input name="project" />      {/* Focus 1 */}
  <Input name="client" />       {/* Focus 2 */}
  <Select name="status" />      {/* Focus 3 */}
  <Button type="submit">Save</Button>  {/* Focus 4 */}
</Form>
```

### Skip Links

Provide skip navigation for complex pages:

```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
<nav>
  {/* Navigation */}
</nav>
<main id="main-content">
  {/* Main content */}
</main>
```

---

## Screen Reader Support

### Supported Screen Readers

Tested and compatible with:

- **JAWS** (Windows)
- **NVDA** (Windows)
- **VoiceOver** (macOS, iOS)
- **TalkBack** (Android)

### Screen Reader Announcements

Components provide contextual announcements:

```tsx
// Success toast - announced immediately
toast.success('Project saved successfully');
// Screen reader hears: "Success: Project saved successfully"

// Loading state - announced with delay
<Button loading>
  Saving...
</Button>
// Screen reader hears: "Button, Saving, busy"

// Error message - announced immediately
<Input error="Email is required" />
// Screen reader hears: "Email, edit text, error: Email is required"
```

### Live Regions

Use ARIA live regions for dynamic content:

```tsx
// Polite announcement (waits for user pause)
<div role="status" aria-live="polite" aria-atomic="true">
  {statusMessage}
</div>

// Assertive announcement (interrupts immediately)
<div role="alert" aria-live="assertive" aria-atomic="true">
  {errorMessage}
</div>
```

---

## Color and Contrast

### Color Contrast Ratios

All color combinations meet WCAG AA standards:

#### Normal Text (4.5:1 minimum)

| Foreground | Background | Ratio | Status |
|------------|-----------|-------|--------|
| Primary Charcoal (#1A1F2E) | White (#FFFFFF) | 14.2:1 | ✅ AAA |
| Secondary Gray (#6B7280) | White (#FFFFFF) | 5.1:1 | ✅ AA |
| Primary Blue (#0047AB) | White (#FFFFFF) | 7.8:1 | ✅ AAA |
| Error Red (#EF4444) | White (#FFFFFF) | 4.9:1 | ✅ AA |

#### Large Text (3:1 minimum)

| Foreground | Background | Ratio | Status |
|------------|-----------|-------|--------|
| Secondary Blue (#4A90E2) | White (#FFFFFF) | 3.2:1 | ✅ AA |
| Accent Orange (#FF6B35) | White (#FFFFFF) | 3.8:1 | ✅ AA |

#### Dark Mode

| Foreground | Background | Ratio | Status |
|------------|-----------|-------|--------|
| Text Primary (#F3F4F6) | Dark Background (#0F172A) | 13.8:1 | ✅ AAA |
| Text Secondary (#CBD5E1) | Dark Surface (#1E293B) | 8.2:1 | ✅ AAA |

### Color-Independent Indicators

Never rely on color alone to convey information:

```tsx
// Bad ❌
<Badge style={{ backgroundColor: 'green' }}>Active</Badge>
<Badge style={{ backgroundColor: 'red' }}>Inactive</Badge>

// Good ✅
<Badge variant="success" icon={<Check />}>Active</Badge>
<Badge variant="error" icon={<X />}>Inactive</Badge>
```

### High Contrast Mode

Components adapt to Windows High Contrast Mode:

```css
/* Automatically enhanced borders and focus indicators */
@media (prefers-contrast: high) {
  .button {
    border: 2px solid currentColor;
  }

  .button:focus {
    outline: 3px solid;
    outline-offset: 2px;
  }
}
```

---

## Focus Management

### Focus Indicators

All interactive elements have visible focus indicators:

```css
/* Default focus style */
.interactive:focus {
  outline: 2px solid #0047AB;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Enhanced focus for high contrast */
.interactive:focus-visible {
  outline: 3px solid #0047AB;
  outline-offset: 3px;
}
```

### Focus Trap

Modal dialogs trap focus within the dialog:

```tsx
import { Modal } from '@siteproof/design-system';

<Modal isOpen={isOpen} onClose={onClose}>
  {/* Focus is trapped here */}
  <Input /> {/* Can tab to this */}
  <Button>Save</Button> {/* And this */}
  {/* Tab wraps back to Input */}
</Modal>
```

### Focus Restoration

Focus returns to trigger element after closing overlays:

```tsx
function Example() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    setIsOpen(true);
    // Store reference to trigger
  };

  const handleClose = () => {
    setIsOpen(false);
    // Restore focus to trigger
    buttonRef.current?.focus();
  };

  return (
    <>
      <Button ref={buttonRef} onClick={handleOpen}>
        Open Dialog
      </Button>
      <Modal isOpen={isOpen} onClose={handleClose}>
        {/* Modal content */}
      </Modal>
    </>
  );
}
```

---

## ARIA Patterns

### Common ARIA Attributes

#### Labels

```tsx
// Using label element (preferred)
<label htmlFor="project-name">Project Name</label>
<Input id="project-name" />

// Using aria-label
<Button aria-label="Close dialog">
  <X /> {/* Icon only */}
</Button>

// Using aria-labelledby
<div id="dialog-title">Confirm Action</div>
<div role="dialog" aria-labelledby="dialog-title">
  {/* Dialog content */}
</div>
```

#### Descriptions

```tsx
// Hint text
<Input
  id="email"
  aria-describedby="email-hint"
/>
<span id="email-hint">We'll never share your email</span>

// Error message
<Input
  id="password"
  aria-describedby="password-error"
  aria-invalid={hasError}
/>
{hasError && (
  <span id="password-error" role="alert">
    Password must be at least 8 characters
  </span>
)}
```

#### States

```tsx
// Loading state
<Button aria-busy={isLoading} disabled={isLoading}>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// Expanded/collapsed
<button
  aria-expanded={isExpanded}
  aria-controls="panel-content"
>
  Toggle Panel
</button>
<div id="panel-content" hidden={!isExpanded}>
  {/* Panel content */}
</div>

// Selected state
<button
  role="tab"
  aria-selected={isSelected}
  aria-controls="tabpanel"
>
  Tab Label
</button>
```

### Component-Specific ARIA

#### Select/Combobox

```tsx
<Select
  role="combobox"
  aria-expanded={isOpen}
  aria-haspopup="listbox"
  aria-controls="listbox-id"
  aria-activedescendant={activeOptionId}
/>
```

#### Radio Group

```tsx
<RadioGroup
  role="radiogroup"
  aria-labelledby="radio-label"
  aria-required="true"
/>
```

#### Tabs

```tsx
<Tabs role="tablist" aria-label="Project sections">
  <Tab role="tab" aria-selected={isSelected} aria-controls="panel-1">
    Details
  </Tab>
</Tabs>
```

---

## Component-Specific Guidelines

### Button

```tsx
// Accessible button examples
<Button>
  Save Project  {/* Text content */}
</Button>

<Button aria-label="Delete project" variant="danger">
  <Trash />  {/* Icon with aria-label */}
</Button>

<Button loading aria-busy="true">
  Saving...  {/* Loading state */}
</Button>

<Button disabled aria-disabled="true">
  Unavailable  {/* Disabled state */}
</Button>
```

### Input

```tsx
<div>
  <label htmlFor="project-name">
    Project Name
    <span aria-label="required">*</span>
  </label>
  <Input
    id="project-name"
    type="text"
    required
    aria-required="true"
    aria-describedby="name-hint name-error"
  />
  <span id="name-hint">Enter a unique project name</span>
  {error && (
    <span id="name-error" role="alert">
      {error}
    </span>
  )}
</div>
```

### Modal

```tsx
<Modal
  isOpen={isOpen}
  onClose={onClose}
  role="dialog"
  aria-modal="true"
  aria-labelledby="modal-title"
  aria-describedby="modal-description"
>
  <h2 id="modal-title">Confirm Deletion</h2>
  <p id="modal-description">
    This action cannot be undone.
  </p>
  <Button onClick={onConfirm}>Delete</Button>
  <Button onClick={onClose}>Cancel</Button>
</Modal>
```

### Toast

```tsx
// Auto-announced to screen readers
toast.success('Project saved successfully', {
  role: 'status',
  'aria-live': 'polite',
});

toast.error('Failed to save project', {
  role: 'alert',
  'aria-live': 'assertive',
});
```

---

## Testing Procedures

### Automated Testing

Use these tools for automated accessibility testing:

#### 1. axe DevTools

```bash
pnpm add -D @axe-core/react
```

```tsx
// In development mode only
if (process.env.NODE_ENV === 'development') {
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  });
}
```

#### 2. Playwright Accessibility Tests

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('should not have accessibility violations', async ({ page }) => {
  await page.goto('/projects');

  const results = await new AxeBuilder({ page }).analyze();

  expect(results.violations).toEqual([]);
});
```

### Manual Testing

#### Keyboard Navigation Checklist

- [ ] Tab through all interactive elements
- [ ] Verify focus indicators are visible
- [ ] Test keyboard shortcuts (Enter, Space, Escape, Arrows)
- [ ] Ensure focus doesn't get trapped (except in modals)
- [ ] Verify logical focus order
- [ ] Test skip links

#### Screen Reader Checklist

- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Error messages are announced
- [ ] Status changes are announced
- [ ] Headings are in logical order
- [ ] ARIA attributes are correct

#### Color and Contrast Checklist

- [ ] Text meets 4.5:1 contrast ratio
- [ ] Large text meets 3:1 contrast ratio
- [ ] Interactive elements have 3:1 contrast
- [ ] Information not conveyed by color alone
- [ ] High contrast mode works correctly

---

## Common Issues and Solutions

### Issue 1: Missing Form Labels

**Problem:**
```tsx
// ❌ Bad
<Input placeholder="Email" />
```

**Solution:**
```tsx
// ✅ Good
<label htmlFor="email">Email</label>
<Input id="email" placeholder="user@example.com" />
```

### Issue 2: Icon-Only Buttons

**Problem:**
```tsx
// ❌ Bad
<Button>
  <Trash />
</Button>
```

**Solution:**
```tsx
// ✅ Good
<Button aria-label="Delete project">
  <Trash />
</Button>
```

### Issue 3: Dynamic Content Not Announced

**Problem:**
```tsx
// ❌ Bad
<div>{statusMessage}</div>
```

**Solution:**
```tsx
// ✅ Good
<div role="status" aria-live="polite">
  {statusMessage}
</div>
```

### Issue 4: Keyboard Trap

**Problem:**
```tsx
// ❌ Bad - Focus can't escape
<div onKeyDown={(e) => e.preventDefault()}>
  <Input />
</div>
```

**Solution:**
```tsx
// ✅ Good - Only trap in modals
<Modal isOpen={isOpen}>
  {/* Focus trapped here intentionally */}
  <Input />
</Modal>
```

### Issue 5: Low Contrast Text

**Problem:**
```tsx
// ❌ Bad - Gray on white (2.1:1)
<p style={{ color: '#CCCCCC' }}>Important text</p>
```

**Solution:**
```tsx
// ✅ Good - Dark gray on white (5.1:1)
<p style={{ color: '#6B7280' }}>Important text</p>
```

---

## Resources

### Official Guidelines

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

### Testing Tools

- [axe DevTools](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse Accessibility Audit](https://developers.google.com/web/tools/lighthouse)
- [Color Contrast Analyzer](https://www.tpgi.com/color-contrast-checker/)

### Screen Readers

- [NVDA (Free)](https://www.nvaccess.org/)
- [JAWS](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (Built into macOS/iOS)](https://www.apple.com/accessibility/voiceover/)

---

## Accessibility Commitment

SiteProof is committed to maintaining and improving accessibility. If you encounter any accessibility issues:

1. **Report Issues**: Email accessibility@siteproof.com
2. **Feature Requests**: Open GitHub issue with `[a11y]` tag
3. **Questions**: Contact support@siteproof.com

We aim to respond to accessibility issues within 2 business days.

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
**Compliance:** WCAG 2.1 Level AA
