# SiteProof Design System - Migration Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Migration Path:** Legacy Components → Design System v1.0

---

## Table of Contents

1. [Overview](#overview)
2. [Migration Strategy](#migration-strategy)
3. [Component Mapping](#component-mapping)
4. [Breaking Changes](#breaking-changes)
5. [Step-by-Step Migration](#step-by-step-migration)
6. [Code Transformations](#code-transformations)
7. [Testing Migration](#testing-migration)
8. [Rollback Plan](#rollback-plan)

---

## Overview

This guide helps you migrate from legacy SiteProof components to the new unified Design System. The migration is designed to be incremental and non-breaking.

### Why Migrate?

- **Performance**: 40% smaller bundle size
- **Consistency**: Unified design across all features
- **Accessibility**: WCAG 2.1 AA compliant
- **Type Safety**: Full TypeScript support
- **Maintainability**: Single source of truth
- **Dark Mode**: Built-in theme support

### Timeline

- **Phase 1 (Week 1-2)**: Setup and infrastructure
- **Phase 2 (Week 3-4)**: Migrate common components
- **Phase 3 (Week 5-6)**: Migrate feature components
- **Phase 4 (Week 7-8)**: Testing and cleanup

---

## Migration Strategy

### Approach: Incremental Migration

We use a gradual migration strategy to minimize risk:

1. **Coexistence**: Old and new components work side-by-side
2. **Incremental**: Migrate one component/feature at a time
3. **Testing**: Each migration is tested before proceeding
4. **Rollback**: Easy rollback if issues arise

### Migration Order

```
1. Low-risk components (Button, Input, Badge)
2. Layout components (Card, Grid, Section)
3. Complex components (Modal, Select, Toast)
4. Feature-specific components (ITPStatusButton)
5. Page-level migrations
6. Cleanup legacy code
```

---

## Component Mapping

### UI Components

| Legacy Component | New Component | Import Path |
|-----------------|---------------|-------------|
| `components/ui/button.tsx` | `Button` | `@siteproof/design-system` |
| `components/ui/input.tsx` | `Input` | `@siteproof/design-system` |
| `components/ui/card.tsx` | `Card`, `CardHeader`, `CardContent` | `@siteproof/design-system` |
| `components/ui/badge.tsx` | `Badge` | `@siteproof/design-system` |
| `components/ui/alert.tsx` | `Alert` | `@siteproof/design-system` |
| `components/ui/dialog.tsx` | `Modal` | `@siteproof/design-system` |
| `components/ui/select.tsx` | `Select` | `@siteproof/design-system` |
| `components/ui/checkbox.tsx` | `Checkbox` | `@siteproof/design-system` |
| `components/ui/radio-group.tsx` | `RadioGroup` | `@siteproof/design-system` |
| `components/ui/textarea.tsx` | `Textarea` | `@siteproof/design-system` |
| `components/ui/switch.tsx` | `Toggle` | `@siteproof/design-system` |
| `components/ui/skeleton.tsx` | `Skeleton` | `@siteproof/design-system` |
| `components/ui/toast.tsx` | `Toast`, `ToastContainer` | `@siteproof/design-system` |

### Layout Components

| Legacy Component | New Component |
|-----------------|---------------|
| `components/layout/container.tsx` | `Section` |
| `components/layout/page.tsx` | `PageLayout` |
| Custom grid implementations | `Grid`, `GridItem` |

### Navigation Components

| Legacy Component | New Component |
|-----------------|---------------|
| `components/mobile-nav.tsx` | `BottomNav` |
| `components/header.tsx` | `TopNav` |
| `components/fab.tsx` | `FAB`, `FABGroup` |

---

## Breaking Changes

### 1. Import Paths

**Before:**
```tsx
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
```

**After:**
```tsx
import { Button, Card } from '@siteproof/design-system';
```

### 2. Component Props

#### Button

**Before:**
```tsx
<Button className="primary" size="large">
  Save
</Button>
```

**After:**
```tsx
<Button variant="primary" size="lg">
  Save
</Button>
```

#### Card

**Before:**
```tsx
<Card title="Project Details" footer={<Button>Save</Button>}>
  Content
</Card>
```

**After:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Project Details</CardTitle>
  </CardHeader>
  <CardContent>
    Content
  </CardContent>
  <CardFooter>
    <Button>Save</Button>
  </CardFooter>
</Card>
```

#### Modal/Dialog

**Before:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>Title</DialogHeader>
    Content
  </DialogContent>
</Dialog>
```

**After:**
```tsx
<Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Title">
  Content
  <ModalFooter>
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </ModalFooter>
</Modal>
```

### 3. Styling Approach

**Before:** Mix of className and custom CSS
```tsx
<Button className="custom-button bg-blue-500">
  Save
</Button>
```

**After:** Use design system props
```tsx
<Button variant="primary">
  Save
</Button>
```

### 4. Toast Notifications

**Before:**
```tsx
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();
toast({
  title: 'Success',
  description: 'Project saved',
});
```

**After:**
```tsx
import { toast } from '@siteproof/design-system';

toast.success('Project saved');
```

---

## Step-by-Step Migration

### Step 1: Install Design System

```bash
# Add design system package
pnpm add @siteproof/design-system

# Verify installation
pnpm list @siteproof/design-system
```

### Step 2: Update Tailwind Config

```javascript
// tailwind.config.js
module.exports = {
  presets: [
    require('@siteproof/design-system/tailwind.config.js')
  ],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@siteproof/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  // Your custom configuration
};
```

### Step 3: Add ToastContainer (if using Toast)

```tsx
// app/layout.tsx
import { ToastContainer } from '@siteproof/design-system';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ToastContainer />
      </body>
    </html>
  );
}
```

### Step 4: Migrate Components One by One

Start with a simple, low-risk component:

```tsx
// Before: app/projects/page.tsx
import { Button } from '@/components/ui/button';

export default function ProjectsPage() {
  return (
    <div>
      <Button className="primary">New Project</Button>
    </div>
  );
}

// After: app/projects/page.tsx
import { Button } from '@siteproof/design-system';

export default function ProjectsPage() {
  return (
    <div>
      <Button variant="primary">New Project</Button>
    </div>
  );
}
```

### Step 5: Test Thoroughly

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Visual regression tests
pnpm visual:compare

# Accessibility tests
pnpm test:a11y
```

### Step 6: Repeat for All Components

Continue migrating components in order of complexity.

---

## Code Transformations

### Button Migration

```tsx
// BEFORE
import { Button } from '@/components/ui/button';

<Button className="primary large" loading={isLoading}>
  Save Project
</Button>

// AFTER
import { Button } from '@siteproof/design-system';

<Button variant="primary" size="lg" loading={isLoading}>
  Save Project
</Button>
```

### Input Migration

```tsx
// BEFORE
import { Input } from '@/components/ui/input';

<div>
  <label htmlFor="name">Project Name</label>
  <Input
    id="name"
    type="text"
    value={name}
    onChange={(e) => setName(e.target.value)}
    className={error ? 'error' : ''}
  />
  {error && <span className="error-text">{error}</span>}
</div>

// AFTER
import { Input } from '@siteproof/design-system';

<Input
  label="Project Name"
  value={name}
  onChange={(e) => setName(e.target.value)}
  error={error}
/>
```

### Card Migration

```tsx
// BEFORE
import { Card, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardTitle>Project Details</CardTitle>
  <CardContent>
    <p>Project information here</p>
  </CardContent>
</Card>

// AFTER
import { Card, CardHeader, CardTitle, CardContent } from '@siteproof/design-system';

<Card>
  <CardHeader>
    <CardTitle>Project Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Project information here</p>
  </CardContent>
</Card>
```

### Select Migration

```tsx
// BEFORE
import { Select } from '@/components/ui/select';

<Select
  value={status}
  onValueChange={setStatus}
>
  <SelectTrigger>
    <SelectValue placeholder="Select status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="active">Active</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </SelectContent>
</Select>

// AFTER
import { Select } from '@siteproof/design-system';

const options = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

<Select
  placeholder="Select status"
  options={options}
  value={status}
  onChange={setStatus}
/>
```

### Modal Migration

```tsx
// BEFORE
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Confirm Action</DialogTitle>
    </DialogHeader>
    <p>Are you sure?</p>
    <div className="dialog-footer">
      <Button onClick={() => setIsOpen(false)}>Cancel</Button>
      <Button onClick={handleConfirm}>Confirm</Button>
    </div>
  </DialogContent>
</Dialog>

// AFTER
import { Modal, ModalFooter, Button } from '@siteproof/design-system';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Confirm Action"
>
  <p>Are you sure?</p>
  <ModalFooter>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>
      Cancel
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirm
    </Button>
  </ModalFooter>
</Modal>
```

### Toast Migration

```tsx
// BEFORE
import { useToast } from '@/hooks/use-toast';

function Component() {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await saveProject();
      toast({
        title: 'Success',
        description: 'Project saved successfully',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save project',
        variant: 'destructive',
      });
    }
  };
}

// AFTER
import { toast } from '@siteproof/design-system';

function Component() {
  const handleSave = async () => {
    try {
      await saveProject();
      toast.success('Project saved successfully');
    } catch (error) {
      toast.error('Failed to save project');
    }
  };
}
```

---

## Testing Migration

### Visual Regression Testing

```bash
# Capture baseline before migration
pnpm visual:baseline

# After migration, compare
pnpm visual:current
pnpm visual:compare

# If acceptable, update baseline
pnpm visual:update
```

### Component Testing

```typescript
// Test migrated component
import { render, screen } from '@testing-library/react';
import { Button } from '@siteproof/design-system';

describe('Migrated Button', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles variants', () => {
    const { container } = render(<Button variant="primary">Save</Button>);
    expect(container.firstChild).toHaveClass('bg-primary');
  });

  it('shows loading state', () => {
    render(<Button loading>Saving...</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### E2E Testing

```typescript
import { test, expect } from '@playwright/test';

test('migrated component works in flow', async ({ page }) => {
  await page.goto('/projects');

  // Test new Button component
  await page.click('text=New Project');

  // Test new Input component
  await page.fill('[name="projectName"]', 'Test Project');

  // Test new Modal component
  await page.click('text=Save');
  await expect(page.locator('[role="dialog"]')).toBeVisible();
});
```

---

## Rollback Plan

### Quick Rollback

If issues arise, you can quickly rollback:

```bash
# Revert commits
git revert HEAD~3..HEAD

# Or checkout previous version
git checkout migration-checkpoint

# Restore package version
pnpm install @siteproof/design-system@0.9.0
```

### Gradual Rollback

Rollback specific components:

```tsx
// Temporarily use legacy component
import { Button as LegacyButton } from '@/components/ui/button';

// Use legacy for this feature
<LegacyButton className="primary">Save</LegacyButton>
```

### Safety Checkpoints

Create checkpoints during migration:

```bash
# After each major migration phase
git tag migration-phase-1
git tag migration-phase-2
git tag migration-phase-3

# Rollback to checkpoint if needed
git checkout migration-phase-1
```

---

## Migration Checklist

### Pre-Migration

- [ ] Design system package installed
- [ ] Tailwind config updated
- [ ] ToastContainer added
- [ ] Team training completed
- [ ] Migration plan reviewed

### During Migration

- [ ] Component mapping documented
- [ ] Props transformed correctly
- [ ] Styling matches design system
- [ ] Accessibility maintained
- [ ] Tests passing
- [ ] Visual regression acceptable

### Post-Migration

- [ ] All legacy imports removed
- [ ] Legacy components deleted
- [ ] Documentation updated
- [ ] Team notified
- [ ] Performance metrics verified

---

## Common Migration Issues

### Issue 1: Missing Styles

**Problem:** Component renders but has no styling.

**Solution:** Ensure Tailwind content paths include design system:
```javascript
content: [
  './src/**/*.{js,ts,jsx,tsx}',
  './node_modules/@siteproof/design-system/src/**/*.{js,ts,jsx,tsx}',
]
```

### Issue 2: Type Errors

**Problem:** TypeScript errors after migration.

**Solution:** Import types from design system:
```tsx
import type { ButtonProps } from '@siteproof/design-system';
```

### Issue 3: Inconsistent Behavior

**Problem:** Component behaves differently than legacy.

**Solution:** Check breaking changes section and update props accordingly.

### Issue 4: Toast Not Showing

**Problem:** Toast notifications don't appear.

**Solution:** Add `<ToastContainer />` to app root.

---

## Support

Need help with migration?

- **Slack**: #design-system-support
- **Email**: design-system@siteproof.com
- **Documentation**: See `/docs` folder
- **Office Hours**: Tuesdays 2-3pm PST

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
