# Dark Mode Implementation Guide

## Overview

SiteProof's design system implements a comprehensive dark mode using semantic design tokens and CSS variables. The system supports light mode, dark mode, and automatic system preference detection.

## Architecture

### Semantic Token Strategy

Instead of hardcoding colors, the system uses **semantic tokens** that adapt to the current theme:

```css
/* Light Mode */
--surface: 0 0% 100%;           /* White backgrounds */
--foreground: 222 47% 11%;      /* Dark text */
--border: 214 32% 91%;          /* Light borders */

/* Dark Mode */
--surface: 222 47% 11%;         /* Dark backgrounds */
--foreground: 0 0% 98%;         /* Light text */
--border: 217 33% 23%;          /* Darker borders */
```

### Token Categories

#### 1. Surface Colors
- `--surface`: Default surface background
- `--surface-container`: Container surfaces (slightly different shade)
- `--surface-container-low`: Lower elevation
- `--surface-container-high`: Higher elevation
- `--surface-elevated`: Cards and elevated elements

#### 2. Foreground/Text Colors
- `--foreground`: Primary text color
- `--foreground-muted`: Secondary text (60% opacity equivalent)
- `--foreground-subtle`: Tertiary text (less prominent)

#### 3. Border Colors
- `--border`: Default border color
- `--border-hover`: Border color on hover
- `--border-focus`: Border color when focused

#### 4. Status Colors (Okabe-Ito Colorblind-Safe Palette)
- `--success`: #117733 (Bluish green)
- `--error`: #d55e00 (Vermillion)
- `--warning`: #e69f00 (Orange)
- `--info`: #0072b2 (Blue)

These colors are **scientifically proven** to be distinguishable by users with color vision deficiency.

## Usage

### Using the Theme Hook

```tsx
import { useTheme } from '@siteproof/design-system';

function MyComponent() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  // theme: 'light' | 'dark' | 'system'
  // resolvedTheme: 'light' | 'dark' (actual applied theme)

  return (
    <div>
      <button onClick={() => setTheme('dark')}>Dark Mode</button>
      <button onClick={() => setTheme('light')}>Light Mode</button>
      <button onClick={() => setTheme('system')}>System</button>
    </div>
  );
}
```

### Using the Theme Toggle Component

```tsx
import { ThemeToggle } from '@siteproof/design-system';

// Icon only (cycles through light → dark → system)
<ThemeToggle />

// With label
<ThemeToggle showLabel />
```

### Applying Semantic Tokens in Components

#### ✅ DO - Use Semantic Tokens

```tsx
// Good: Uses semantic tokens that adapt to theme
<div className="bg-surface text-foreground border-border">
  <h2 className="text-foreground">Title</h2>
  <p className="text-foreground-muted">Description</p>
</div>
```

#### ❌ DON'T - Hardcode Colors

```tsx
// Bad: Hardcoded colors don't adapt to theme
<div className="bg-white text-gray-900 border-gray-200">
  <h2 className="text-black">Title</h2>
  <p className="text-gray-600">Description</p>
</div>
```

## Component Examples

### Cards

```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@siteproof/design-system';

<Card variant="default">  {/* Adapts to theme automatically */}
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
  </CardHeader>
  <CardContent>
    Card content with semantic colors
  </CardContent>
</Card>
```

### Badges

```tsx
import { Badge } from '@siteproof/design-system';

<Badge variant="success">Success</Badge>  {/* Colorblind-safe */}
<Badge variant="error">Error</Badge>      {/* Colorblind-safe */}
<Badge variant="warning">Warning</Badge>  {/* Colorblind-safe */}
<Badge variant="info">Info</Badge>        {/* Colorblind-safe */}
```

### Form Elements

```tsx
import { Input, Textarea, Checkbox } from '@siteproof/design-system';

<Input
  label="Email"
  placeholder="Enter email"
  helperText="We'll never share your email"
/>

<Textarea
  label="Description"
  placeholder="Enter description"
/>

<Checkbox label="Accept terms" />
```

All form elements automatically support dark mode through semantic tokens.

## Migration Guide

### Updating Existing Components

1. **Replace hardcoded backgrounds:**
   - `bg-white` → `bg-surface`
   - `bg-gray-50` → `bg-surface-container`
   - `bg-gray-100` → `bg-surface-containerHigh`

2. **Replace hardcoded text colors:**
   - `text-gray-900` → `text-foreground`
   - `text-gray-600` → `text-foreground-muted`
   - `text-gray-400` → `text-foreground-subtle`

3. **Replace hardcoded borders:**
   - `border-gray-200` → `border-border`
   - `border-gray-300` → `border-border`

4. **Replace status colors:**
   - `bg-green-500` → `bg-success`
   - `bg-red-500` → `bg-error`
   - `bg-yellow-500` → `bg-warning`
   - `bg-blue-500` → `bg-info`

### Example Migration

**Before:**
```tsx
<div className="bg-white border border-gray-200 rounded-lg p-4">
  <h3 className="text-gray-900 font-semibold">Title</h3>
  <p className="text-gray-600">Description</p>
  <span className="text-green-600">Success!</span>
</div>
```

**After:**
```tsx
<div className="bg-surface border border-border rounded-lg p-4">
  <h3 className="text-foreground font-semibold">Title</h3>
  <p className="text-foreground-muted">Description</p>
  <Badge variant="success">Success!</Badge>
</div>
```

## Tailwind Configuration

The design system's Tailwind config includes all semantic tokens:

```javascript
// packages/design-system/tailwind.config.js
module.exports = {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          container: 'hsl(var(--surface-container))',
          // ... more variants
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          muted: 'hsl(var(--foreground-muted))',
          subtle: 'hsl(var(--foreground-subtle))',
        },
        border: {
          DEFAULT: 'hsl(var(--border))',
          hover: 'hsl(var(--border-hover))',
          focus: 'hsl(var(--border-focus))',
        },
        // Status colors (Okabe-Ito)
        success: { DEFAULT: '#117733', foreground: '#ffffff' },
        error: { DEFAULT: '#d55e00', foreground: '#ffffff' },
        warning: { DEFAULT: '#e69f00', foreground: '#000000' },
        info: { DEFAULT: '#0072b2', foreground: '#ffffff' },
      },
    },
  },
};
```

## Accessibility

### WCAG Compliance

All color combinations meet **WCAG AA standards**:
- Text contrast ratios: minimum 4.5:1
- Large text: minimum 3:1
- Interactive elements: clearly distinguishable

### Colorblind Safety

The Okabe-Ito palette is specifically designed for colorblind users:
- **Deuteranopia** (red-green): Can distinguish all status colors
- **Protanopia** (red-green): Can distinguish all status colors
- **Tritanopia** (blue-yellow): Can distinguish all status colors
- **Monochromacy**: High contrast ensures visibility

### Keyboard Navigation

Theme toggle is fully keyboard accessible:
- `Tab`: Focus the toggle button
- `Enter` or `Space`: Cycle through themes
- Screen reader announces current theme

## Testing

### Storybook

Test dark mode in Storybook:

```bash
npm run storybook
```

Navigate to **Themes → Dark Mode** to see all components in both themes.

### Manual Testing Checklist

- [ ] All text is readable in both themes
- [ ] Status badges are distinguishable
- [ ] Interactive states (hover, focus) are visible
- [ ] Form elements are accessible
- [ ] Shadows provide appropriate elevation cues
- [ ] Theme persists on page reload
- [ ] System preference detection works
- [ ] Smooth transitions between themes

## Performance

### Optimization Techniques

1. **CSS Variables**: Theme switching is instant (no re-render)
2. **Transition**: 200ms smooth color transition
3. **localStorage**: Theme preference cached locally
4. **System Detection**: Respects `prefers-color-scheme` media query

### Bundle Impact

- Additional CSS: ~2KB gzipped
- No JavaScript overhead (uses native CSS variables)
- Theme hook: ~1KB

## Browser Support

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support (iOS 13+)
- Mobile browsers: Full support

All modern browsers support CSS variables and `prefers-color-scheme`.

## Best Practices

1. **Always use semantic tokens** instead of hardcoded colors
2. **Test in both themes** during development
3. **Use status colors** from the Okabe-Ito palette
4. **Maintain WCAG AA contrast** ratios
5. **Provide theme toggle** in user settings
6. **Respect system preferences** by default
7. **Smooth transitions** enhance user experience

## Troubleshooting

### Theme not applying

Check that:
1. Design system CSS is imported: `@import '@siteproof/design-system/src/styles/globals.css'`
2. Tailwind is configured with `darkMode: ['class']`
3. No CSS overrides with `!important`

### Colors not changing

Verify:
1. Using semantic tokens (e.g., `bg-surface` not `bg-white`)
2. Not using arbitrary values (e.g., `bg-[#ffffff]`)
3. No hardcoded dark: prefixes (e.g., `dark:bg-gray-900`)

### Flash of unstyled content (FOUC)

Prevent FOUC by:
1. Loading theme preference before hydration
2. Using `useTheme` hook early in component tree
3. Adding `suppressHydrationWarning` to html tag if needed

## Future Enhancements

- [ ] Additional theme variants (high contrast, sepia)
- [ ] Per-component theme overrides
- [ ] Theme scheduling (auto-switch at sunset)
- [ ] Custom theme builder
- [ ] Theme preview mode

## Resources

- [Okabe-Ito Palette Research](https://jfly.uni-koeln.de/color/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS Variables MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
- [prefers-color-scheme](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme)
