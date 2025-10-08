# Accessibility Guidelines

## Overview

The SiteProof Design System adheres to **WCAG 2.1 Level AA** standards to ensure our application is accessible to all users, including those with disabilities. This document outlines our accessibility principles, implementation patterns, and testing procedures.

## Core Principles

1. **Perceivable** - Information and UI components must be presentable to users in ways they can perceive
2. **Operable** - UI components and navigation must be operable
3. **Understandable** - Information and UI operation must be understandable
4. **Robust** - Content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies

---

## Keyboard Navigation

All interactive components must be fully keyboard accessible.

### Global Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Navigate forward through interactive elements |
| `Shift + Tab` | Navigate backward through interactive elements |
| `Enter` | Activate buttons, links, and submit forms |
| `Space` | Toggle checkboxes, switches, and buttons |
| `Escape` | Close modals, dropdowns, and overlays |
| `Arrow Keys` | Navigate within components (dropdowns, tabs, etc.) |

### Component-Specific Navigation

#### Modal/Dialog
```typescript
// ✅ Proper keyboard support
<Modal isOpen={open} onClose={handleClose}>
  {/* Focus is trapped within modal */}
  {/* Escape key closes modal */}
  {/* Focus returns to trigger on close */}
</Modal>
```

**Behavior:**
- Focus trapped within modal when open
- `Escape` key closes modal
- Focus returns to trigger element on close
- First focusable element receives focus on open

#### Dropdown/Select
```typescript
<Select
  options={options}
  value={selected}
  onChange={setSelected}
/>
```

**Keyboard Controls:**
- `Enter` / `Space` - Open dropdown
- `Arrow Up/Down` - Navigate options
- `Enter` - Select option
- `Escape` - Close dropdown
- `Home` - First option
- `End` - Last option
- Type-ahead search (if searchable)

#### Tabs
```typescript
<Tabs>
  <TabList>
    <Tab>Tab 1</Tab>
    <Tab>Tab 2</Tab>
  </TabList>
  <TabPanel>Content 1</TabPanel>
  <TabPanel>Content 2</TabPanel>
</Tabs>
```

**Keyboard Controls:**
- `Arrow Left/Right` - Switch between tabs
- `Home` - First tab
- `End` - Last tab
- `Tab` - Move focus to tab panel

#### Accordion
```typescript
<Accordion>
  <AccordionItem>
    <AccordionHeader>Header</AccordionHeader>
    <AccordionPanel>Content</AccordionPanel>
  </AccordionItem>
</Accordion>
```

**Keyboard Controls:**
- `Enter` / `Space` - Toggle panel
- `Arrow Up/Down` - Navigate headers

---

## Screen Reader Support

### ARIA Labels

Always provide labels for interactive elements:

```typescript
// ✅ Good - Icon button with label
<button aria-label="Delete item">
  <Trash2 />
</button>

// ❌ Bad - No label
<button>
  <Trash2 />
</button>
```

### ARIA Descriptions

Provide additional context when needed:

```typescript
<Button
  aria-label="Close"
  aria-describedby="close-description"
>
  <X />
</Button>
<span id="close-description" className="sr-only">
  Closes the dialog and returns to the main page
</span>
```

### Live Regions

Use ARIA live regions for dynamic content updates:

```typescript
// ✅ Status updates
<div role="status" aria-live="polite">
  {isLoading ? 'Loading...' : 'Data loaded successfully'}
</div>

// ✅ Error alerts
<div role="alert" aria-live="assertive">
  {error && error.message}
</div>
```

**Live Region Types:**
- `polite` - Announces after current speech finishes (status messages)
- `assertive` - Interrupts current speech (errors, warnings)
- `off` - Don't announce (default)

### Form Accessibility

#### Input Fields

```typescript
// ✅ Proper form field accessibility
<Input
  label="Email Address"
  type="email"
  required
  error={errors.email?.message}
  aria-invalid={!!errors.email}
  aria-describedby="email-error email-helper"
/>
{errors.email && (
  <p id="email-error" role="alert">
    {errors.email.message}
  </p>
)}
<p id="email-helper" className="text-body-small text-secondary-gray">
  We'll never share your email
</p>
```

**Requirements:**
- Label associated with input (explicit or implicit)
- Error messages linked via `aria-describedby`
- `aria-invalid` set when field has error
- Helper text linked via `aria-describedby`
- `required` attribute for required fields

#### Checkbox Groups

```typescript
<CheckboxGroup
  options={options}
  value={selected}
  onChange={setSelected}
  aria-labelledby="checkbox-group-label"
/>
<p id="checkbox-group-label">Select your preferences</p>
```

#### Radio Groups

```typescript
<RadioGroup
  options={options}
  value={selected}
  onChange={setSelected}
  aria-labelledby="radio-group-label"
/>
<p id="radio-group-label">Choose one option</p>
```

---

## Color and Contrast

### Text Contrast Requirements

**WCAG 2.1 AA Standards:**
- Normal text (< 18px): **4.5:1** minimum contrast ratio
- Large text (≥ 18px or ≥ 14px bold): **3:1** minimum contrast ratio
- UI components and graphics: **3:1** minimum contrast ratio

### Design System Color Contrast

All color combinations in our design system meet WCAG AA standards:

| Background | Foreground | Contrast Ratio | Pass |
|------------|------------|----------------|------|
| `primary-blue` (#2196F3) | White (#FFFFFF) | 4.52:1 | ✅ AA |
| `primary-charcoal` (#1A1F2E) | White (#FFFFFF) | 15.28:1 | ✅ AAA |
| `background-white` (#FFFFFF) | `primary-charcoal` (#1A1F2E) | 15.28:1 | ✅ AAA |
| `error` (#D55E00) | White (#FFFFFF) | 4.54:1 | ✅ AA |
| `success` (#117733) | White (#FFFFFF) | 4.68:1 | ✅ AA |

### Color-Blind Safe Colors (Okabe-Ito Palette)

Our functional colors use the Okabe-Ito color palette, which is designed to be distinguishable by people with color vision deficiencies:

```typescript
// Color-blind safe status colors
const colors = {
  success: '#117733',  // Bluish green
  error: '#D55E00',    // Vermillion (red-orange)
  warning: '#E69F00',  // Orange
  info: '#0072B2',     // Blue
  neutral: '#888888',  // Grey
};
```

**Never rely on color alone** to convey information:

```typescript
// ✅ Good - Icon + color + text
<Badge variant="error">
  <AlertCircle />
  Critical
</Badge>

// ❌ Bad - Color only
<div className="text-error">Important</div>
```

---

## Touch Targets and Click Areas

### Minimum Touch Target Sizes (WCAG 2.5.5)

All interactive elements must meet minimum size requirements:

- **Mobile:** 44×44px minimum (WCAG Level AA)
- **Desktop:** 40×40px acceptable for secondary actions
- **Preferred:** 48×48px for better usability

### Implementation

```typescript
// ✅ Mobile primary action
<Button size="lg">Submit</Button>  // 56px height

// ✅ Desktop primary action
<Button size="md">Submit</Button>  // 48px height

// ✅ Desktop secondary action
<Button size="sm">Cancel</Button>  // 40px height

// ❌ Too small for touch
<button className="p-1">X</button>  // < 44px
```

### Icon Buttons

```typescript
// ✅ Proper touch target
<button
  className="w-[44px] h-[44px] flex items-center justify-center"
  aria-label="Close"
>
  <X size={20} />
</button>

// ❌ Icon size = button size
<button className="p-0" aria-label="Close">
  <X size={16} />
</button>
```

---

## Focus Management

### Visible Focus Indicators

All interactive elements must have visible focus indicators:

```typescript
// ✅ Design system default focus
className="focus:ring-2 focus:ring-primary-blue focus:outline-none"

// ❌ Never do this
className="focus:outline-none"  // Without alternative focus indicator
```

**Focus Indicator Requirements:**
- Minimum 2px visible outline/border
- High contrast color (3:1 ratio)
- Clear distinction from unfocused state

### Focus Order

Focus order must follow the visual layout:

```typescript
// ✅ Logical tab order
<form>
  <Input name="name" tabIndex={1} />      {/* First */}
  <Input name="email" tabIndex={2} />     {/* Second */}
  <Button type="submit" tabIndex={3}>     {/* Third */}
    Submit
  </Button>
</form>
```

**Best Practice:** Use natural DOM order instead of explicit `tabIndex` values.

### Skip Links

Provide skip links for keyboard users:

```typescript
// ✅ Skip to main content
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0"
>
  Skip to main content
</a>

<main id="main-content">
  {/* Page content */}
</main>
```

---

## Semantic HTML

Use appropriate semantic HTML elements:

```typescript
// ✅ Good - Semantic HTML
<nav>
  <ul>
    <li><a href="/home">Home</a></li>
    <li><a href="/about">About</a></li>
  </ul>
</nav>

// ❌ Bad - Div soup
<div>
  <div onClick={goHome}>Home</div>
  <div onClick={goAbout}>About</div>
</div>
```

### Heading Hierarchy

Maintain proper heading hierarchy:

```typescript
// ✅ Good - Logical hierarchy
<h1>Page Title</h1>
  <h2>Section 1</h2>
    <h3>Subsection 1.1</h3>
  <h2>Section 2</h2>
    <h3>Subsection 2.1</h3>

// ❌ Bad - Skipped levels
<h1>Page Title</h1>
  <h3>Section 1</h3>  {/* Skipped h2 */}
```

### Landmarks

Use ARIA landmarks or HTML5 semantic elements:

```typescript
// ✅ Semantic landmarks
<header>
  <nav aria-label="Main navigation">
    {/* Navigation */}
  </nav>
</header>

<main>
  {/* Main content */}
  <aside aria-label="Related content">
    {/* Sidebar */}
  </aside>
</main>

<footer>
  {/* Footer content */}
</footer>
```

---

## Testing for Accessibility

### Automated Testing Tools

1. **axe DevTools** (Browser Extension)
   - Install: [Chrome](https://chrome.google.com/webstore) / [Firefox](https://addons.mozilla.org)
   - Run on every page
   - Fix all violations

2. **Lighthouse** (Built into Chrome DevTools)
   ```bash
   # Run accessibility audit
   npm run lighthouse -- --only-categories=accessibility
   ```
   - Target: 100/100 score
   - Fix all issues reported

3. **WAVE** (Browser Extension)
   - Visual feedback on accessibility issues
   - Identifies errors, alerts, and features

### Manual Testing

#### Keyboard Testing Checklist

- [ ] All interactive elements reachable via `Tab`
- [ ] Logical tab order (follows visual layout)
- [ ] All actions performable with keyboard only
- [ ] Focus indicator always visible
- [ ] No keyboard traps (can always navigate away)
- [ ] Modals/overlays trap focus appropriately
- [ ] `Escape` closes overlays
- [ ] `Enter`/`Space` activate buttons

#### Screen Reader Testing

**Recommended Screen Readers:**
- **Windows:** NVDA (free) or JAWS
- **macOS:** VoiceOver (built-in)
- **iOS:** VoiceOver (built-in)
- **Android:** TalkBack (built-in)

**Testing Checklist:**
- [ ] All content announced correctly
- [ ] Heading structure navigable
- [ ] Form fields properly labeled
- [ ] Error messages announced
- [ ] Status updates announced (live regions)
- [ ] Images have alt text
- [ ] Buttons/links have descriptive text
- [ ] Landmark navigation works

#### Visual Testing

- [ ] 200% zoom - content still accessible
- [ ] High contrast mode (Windows/macOS)
- [ ] Color blind simulation (use browser extension)
- [ ] Text contrast meets 4.5:1 (normal) or 3:1 (large)
- [ ] No information conveyed by color alone

---

## Component Accessibility Reference

### Quick Reference Table

| Component | Keyboard Support | Screen Reader | ARIA | Touch Target |
|-----------|------------------|---------------|------|--------------|
| Button | ✅ Enter/Space | ✅ Role + Label | ✅ aria-label | ✅ 44px min |
| Input | ✅ Standard | ✅ Label + Error | ✅ aria-invalid | ✅ 48px height |
| Modal | ✅ Esc + Tab trap | ✅ Role + Label | ✅ aria-modal | N/A |
| Select | ✅ Arrow keys | ✅ Role + Options | ✅ aria-expanded | ✅ 48px height |
| Checkbox | ✅ Space | ✅ Role + Label | ✅ aria-checked | ✅ 44px min |
| Radio | ✅ Arrow keys | ✅ Role + Label | ✅ aria-checked | ✅ 44px min |
| Toast | N/A | ✅ Announced | ✅ role="alert" | N/A |
| Card | ✅ If interactive | ✅ Semantic HTML | Conditional | N/A |

---

## Common Accessibility Patterns

### Loading States

```typescript
// ✅ Accessible loading indicator
<div role="status" aria-live="polite" aria-busy={isLoading}>
  {isLoading ? (
    <>
      <Loader2 className="animate-spin" aria-hidden="true" />
      <span className="sr-only">Loading content...</span>
    </>
  ) : (
    <Content data={data} />
  )}
</div>
```

### Error Messages

```typescript
// ✅ Accessible error display
<div role="alert" aria-live="assertive">
  <AlertCircle aria-hidden="true" />
  <span>{errorMessage}</span>
</div>
```

### Success Messages

```typescript
// ✅ Accessible success notification
<div role="status" aria-live="polite">
  <CheckCircle aria-hidden="true" />
  <span>Changes saved successfully</span>
</div>
```

### Image Accessibility

```typescript
// ✅ Decorative image
<img src="decoration.png" alt="" role="presentation" />

// ✅ Informative image
<img src="chart.png" alt="Sales chart showing 25% increase" />

// ✅ Complex image
<figure>
  <img src="diagram.png" alt="System architecture diagram" />
  <figcaption>
    Detailed description: The system consists of...
  </figcaption>
</figure>
```

---

## Accessibility Checklist

Before releasing any component or feature:

### Development
- [ ] Semantic HTML used correctly
- [ ] Heading hierarchy is logical
- [ ] ARIA attributes added where needed
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA (4.5:1)
- [ ] Touch targets ≥ 44×44px
- [ ] No information conveyed by color alone

### Testing
- [ ] axe DevTools shows 0 violations
- [ ] Lighthouse accessibility score = 100
- [ ] Keyboard navigation tested
- [ ] Screen reader tested (NVDA/VoiceOver)
- [ ] 200% zoom tested
- [ ] High contrast mode tested
- [ ] Color blindness simulation tested

### Documentation
- [ ] Accessibility features documented
- [ ] Keyboard shortcuts documented
- [ ] ARIA usage documented
- [ ] Known limitations documented

---

## Resources

### Tools
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/extension/
- **Lighthouse:** Built into Chrome DevTools
- **NVDA:** https://www.nvaccess.org/
- **Color Contrast Analyzer:** https://www.tpgi.com/color-contrast-checker/

### Guidelines
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **WAI-ARIA:** https://www.w3.org/WAI/ARIA/apg/
- **MDN Accessibility:** https://developer.mozilla.org/en-US/docs/Web/Accessibility

### Training
- **WebAIM:** https://webaim.org/
- **Deque University:** https://dequeuniversity.com/

---

## Support

For accessibility questions or to report accessibility issues:
- Create an issue in the GitHub repository
- Contact the design system team
- Email: accessibility@siteproof.com

---

**Remember:** Accessibility is not optional. It's a fundamental requirement for all components and features.
