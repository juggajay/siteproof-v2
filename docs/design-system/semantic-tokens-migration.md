# Semantic Tokens Migration Guide

## Quick Reference

This guide helps migrate existing components from hardcoded colors to semantic design tokens for dark mode support.

## Color Token Mapping

### Backgrounds

| Old (Hardcoded) | New (Semantic) | Usage |
|----------------|----------------|-------|
| `bg-white` | `bg-surface` | Default backgrounds |
| `bg-gray-50` | `bg-surface-container` | Containers, wells |
| `bg-gray-100` | `bg-surface-containerLow` | Lower elevation surfaces |
| `bg-gray-200` | `bg-surface-containerHigh` | Higher elevation surfaces |
| `bg-white` (elevated) | `bg-surface-elevated` | Cards, modals |
| `bg-gray-900` | `bg-background` | Page background |

### Text/Foreground

| Old (Hardcoded) | New (Semantic) | Usage |
|----------------|----------------|-------|
| `text-black` | `text-foreground` | Primary text |
| `text-gray-900` | `text-foreground` | Primary text |
| `text-gray-700` | `text-foreground` | Primary text |
| `text-gray-600` | `text-foreground-muted` | Secondary text |
| `text-gray-500` | `text-foreground-muted` | Secondary text |
| `text-gray-400` | `text-foreground-subtle` | Tertiary text, placeholders |

### Borders

| Old (Hardcoded) | New (Semantic) | Usage |
|----------------|----------------|-------|
| `border-gray-200` | `border-border` | Default borders |
| `border-gray-300` | `border-border` | Default borders |
| `border-gray-400` (hover) | `border-border-hover` | Hover state |
| `border-blue-500` (focus) | `border-border-focus` | Focus state |

### Status Colors (Okabe-Ito Colorblind-Safe)

| Old (Variable) | New (Semantic) | Hex Value | Usage |
|---------------|----------------|-----------|-------|
| `bg-green-500` | `bg-success` | #117733 | Success states |
| `text-green-600` | `text-success` | #117733 | Success text |
| `bg-red-500` | `bg-error` | #d55e00 | Error states |
| `text-red-600` | `text-error` | #d55e00 | Error text |
| `bg-yellow-500` | `bg-warning` | #e69f00 | Warning states |
| `text-yellow-600` | `text-warning` | #e69f00 | Warning text |
| `bg-blue-500` | `bg-info` | #0072b2 | Info states |
| `text-blue-600` | `text-info` | #0072b2 | Info text |

### Primary Colors

| Old (Hardcoded) | New (Semantic) | Usage |
|----------------|----------------|-------|
| `bg-blue-500` | `bg-primary-600` | Primary buttons |
| `bg-blue-600` | `bg-primary-700` | Primary hover |
| `bg-blue-700` | `bg-primary-800` | Primary active |
| `text-blue-600` | `text-primary-600` | Primary text/links |

## Component Migration Examples

### Example 1: Card Component

**Before:**
```tsx
<div className="bg-white border border-gray-200 rounded-lg shadow p-6">
  <h2 className="text-gray-900 text-xl font-semibold mb-2">Card Title</h2>
  <p className="text-gray-600">Card description text</p>
  <div className="border-t border-gray-200 mt-4 pt-4">
    <button className="bg-blue-500 text-white px-4 py-2 rounded">
      Action
    </button>
  </div>
</div>
```

**After:**
```tsx
<div className="bg-surface border border-border rounded-lg shadow-card p-6">
  <h2 className="text-foreground text-xl font-semibold mb-2">Card Title</h2>
  <p className="text-foreground-muted">Card description text</p>
  <div className="border-t border-border mt-4 pt-4">
    <button className="bg-primary-600 text-primary-foreground px-4 py-2 rounded">
      Action
    </button>
  </div>
</div>
```

### Example 2: Input Field

**Before:**
```tsx
<div>
  <label className="text-gray-700 font-medium">Email</label>
  <input
    type="email"
    className="w-full bg-white border border-gray-300 text-gray-900 rounded px-4 py-2
               focus:border-blue-500 placeholder:text-gray-400"
    placeholder="Enter email"
  />
  <p className="text-gray-500 text-sm mt-1">Helper text</p>
</div>
```

**After:**
```tsx
<div>
  <label className="text-foreground font-medium">Email</label>
  <input
    type="email"
    className="w-full bg-surface border border-border text-foreground rounded px-4 py-2
               focus:border-border-focus placeholder:text-foreground-subtle"
    placeholder="Enter email"
  />
  <p className="text-foreground-muted text-sm mt-1">Helper text</p>
</div>
```

### Example 3: Status Badge

**Before:**
```tsx
<span className="inline-flex px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
  Active
</span>
<span className="inline-flex px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm">
  Error
</span>
<span className="inline-flex px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
  Warning
</span>
```

**After (using Badge component):**
```tsx
import { Badge } from '@siteproof/design-system';

<Badge variant="success">Active</Badge>
<Badge variant="error">Error</Badge>
<Badge variant="warning">Warning</Badge>
```

### Example 4: Button Component

**Before:**
```tsx
<button className="bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white px-6 py-3 rounded-lg">
  Primary Action
</button>
<button className="bg-white hover:bg-gray-50 border border-gray-300 text-gray-700 px-6 py-3 rounded-lg">
  Secondary Action
</button>
```

**After:**
```tsx
<button className="bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-primary-foreground px-6 py-3 rounded-lg">
  Primary Action
</button>
<button className="bg-surface hover:bg-surface-container border border-border text-foreground px-6 py-3 rounded-lg">
  Secondary Action
</button>
```

### Example 5: Navigation

**Before:**
```tsx
<nav className="bg-white border-b border-gray-200">
  <a href="#" className="text-gray-600 hover:text-gray-900 px-4 py-2">
    Home
  </a>
  <a href="#" className="text-blue-600 bg-blue-50 px-4 py-2">
    Active
  </a>
</nav>
```

**After:**
```tsx
<nav className="bg-surface border-b border-border">
  <a href="#" className="text-foreground-muted hover:text-foreground px-4 py-2">
    Home
  </a>
  <a href="#" className="text-primary-600 bg-primary-50 px-4 py-2">
    Active
  </a>
</nav>
```

### Example 6: Modal/Dialog

**Before:**
```tsx
<div className="fixed inset-0 bg-black bg-opacity-50">
  <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-auto mt-20">
    <h2 className="text-gray-900 text-2xl font-bold mb-4">Modal Title</h2>
    <p className="text-gray-600 mb-6">Modal content goes here</p>
    <div className="flex gap-3">
      <button className="bg-blue-500 text-white px-6 py-2 rounded">Confirm</button>
      <button className="bg-gray-200 text-gray-700 px-6 py-2 rounded">Cancel</button>
    </div>
  </div>
</div>
```

**After:**
```tsx
<div className="fixed inset-0 bg-background-overlay">
  <div className="bg-surface-elevated rounded-lg shadow-modal p-6 max-w-md mx-auto mt-20">
    <h2 className="text-foreground text-2xl font-bold mb-4">Modal Title</h2>
    <p className="text-foreground-muted mb-6">Modal content goes here</p>
    <div className="flex gap-3">
      <button className="bg-primary-600 text-primary-foreground px-6 py-2 rounded">Confirm</button>
      <button className="bg-surface-container text-foreground px-6 py-2 rounded">Cancel</button>
    </div>
  </div>
</div>
```

## Find and Replace Patterns

Use these regex patterns for bulk migration:

### VS Code Find/Replace

1. **Background colors:**
   - Find: `bg-white(?!\s*dark:)`
   - Replace: `bg-surface`

2. **Text colors:**
   - Find: `text-gray-900`
   - Replace: `text-foreground`

3. **Border colors:**
   - Find: `border-gray-200`
   - Replace: `border-border`

## Common Patterns

### Pattern 1: Container with Header

```tsx
// Before
<div className="bg-gray-50 border-l-4 border-blue-500 p-4">
  <h3 className="text-gray-900 font-semibold">Title</h3>
  <p className="text-gray-600">Description</p>
</div>

// After
<div className="bg-surface-container border-l-4 border-primary-600 p-4">
  <h3 className="text-foreground font-semibold">Title</h3>
  <p className="text-foreground-muted">Description</p>
</div>
```

### Pattern 2: List Items

```tsx
// Before
<li className="border-b border-gray-200 py-3 hover:bg-gray-50">
  <div className="text-gray-900">Item Title</div>
  <div className="text-gray-500 text-sm">Item subtitle</div>
</li>

// After
<li className="border-b border-border py-3 hover:bg-surface-container">
  <div className="text-foreground">Item Title</div>
  <div className="text-foreground-muted text-sm">Item subtitle</div>
</li>
```

### Pattern 3: Form Error States

```tsx
// Before
<input className="border-red-500 focus:ring-red-500" />
<p className="text-red-600 text-sm">Error message</p>

// After
<input className="border-error focus:ring-error/30" />
<p className="text-error text-sm">Error message</p>
```

## Testing Checklist

After migration, verify:

- [ ] Component looks correct in light mode
- [ ] Component looks correct in dark mode
- [ ] Text is readable (contrast check)
- [ ] Interactive states (hover, focus) work
- [ ] Status colors are distinguishable
- [ ] No hardcoded colors remain
- [ ] No `dark:` prefixes used (should be automatic)

## Automated Testing

Run this script to find hardcoded colors:

```bash
# Find potential hardcoded colors
grep -r "bg-white\|bg-gray-\|text-gray-\|border-gray-" src/ --include="*.tsx" --include="*.jsx"
```

## Getting Help

If you encounter issues:

1. Check the [Dark Mode Implementation Guide](./dark-mode-implementation.md)
2. Review the [Storybook examples](../../packages/design-system/src/stories/themes/DarkMode.stories.tsx)
3. Ask in #design-system Slack channel

## Common Mistakes

### ❌ Mistake 1: Using dark: prefix

```tsx
// Wrong - manual dark mode handling
<div className="bg-white dark:bg-gray-900">
```

```tsx
// Correct - automatic theme handling
<div className="bg-surface">
```

### ❌ Mistake 2: Arbitrary color values

```tsx
// Wrong - hardcoded hex values
<div className="bg-[#ffffff] text-[#000000]">
```

```tsx
// Correct - semantic tokens
<div className="bg-surface text-foreground">
```

### ❌ Mistake 3: Mixing old and new tokens

```tsx
// Wrong - inconsistent token usage
<div className="bg-surface text-gray-600">
```

```tsx
// Correct - all semantic tokens
<div className="bg-surface text-foreground-muted">
```

## Performance Tips

1. **Batch migrations**: Migrate related components together
2. **Test incrementally**: Verify each component after migration
3. **Use components**: Prefer design system components (Badge, Card, etc.)
4. **Avoid !important**: Semantic tokens should work without overrides

## Success Metrics

A successful migration achieves:

- ✅ Zero hardcoded color values
- ✅ All text readable in both themes
- ✅ WCAG AA contrast compliance
- ✅ Consistent visual hierarchy
- ✅ Smooth theme transitions
- ✅ No visual regressions
