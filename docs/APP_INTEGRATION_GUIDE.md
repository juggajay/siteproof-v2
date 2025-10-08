# SiteProof Design System - Next.js App Integration Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Target:** SiteProof Next.js App (`apps/web`)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Configure Monorepo Package](#step-1-configure-monorepo-package)
4. [Step 2: Update Tailwind Configuration](#step-2-update-tailwind-configuration)
5. [Step 3: Add Theme Provider](#step-3-add-theme-provider)
6. [Step 4: Add Toast Container](#step-4-add-toast-container)
7. [Step 5: Import and Use Components](#step-5-import-and-use-components)
8. [Step 6: Replace Legacy Components](#step-6-replace-legacy-components)
9. [Testing Integration](#testing-integration)
10. [Common Issues](#common-issues)

---

## Overview

This guide walks you through integrating the **SiteProof Design System** (`packages/design-system`) into your Next.js application (`apps/web`).

### What You'll Achieve:

- ✅ Design system components available across the app
- ✅ Tailwind CSS properly configured with design tokens
- ✅ Theme switching (light/dark mode) working
- ✅ Toast notifications system ready
- ✅ Type-safe component usage with TypeScript

---

## Prerequisites

Before starting, ensure you have:

- ✅ pnpm workspace configured (already done in this monorepo)
- ✅ Design system built: `cd packages/design-system && pnpm build-storybook`
- ✅ Next.js app running: `cd apps/web && pnpm dev`

---

## Step 1: Configure Monorepo Package

### 1.1 Verify Package Workspace Reference

Check `apps/web/package.json` includes the design system:

```json
{
  "dependencies": {
    "@siteproof/design-system": "workspace:*"
  }
}
```

### 1.2 Install Dependencies

If not already installed:

```bash
cd apps/web
pnpm add @siteproof/design-system@workspace:*
```

### 1.3 Verify Installation

```bash
pnpm list @siteproof/design-system
# Should show: @siteproof/design-system 1.0.0 -> link:../../packages/design-system
```

---

## Step 2: Update Tailwind Configuration

### 2.1 Update `apps/web/tailwind.config.ts`

**Location**: `/apps/web/tailwind.config.ts`

Replace or merge with:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  // Extend the design system preset
  presets: [
    require('../../packages/design-system/tailwind.config.js')
  ],

  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
    // IMPORTANT: Include design system components
    '../../packages/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],

  theme: {
    extend: {
      // Your app-specific customizations here
    },
  },

  plugins: [],
};

export default config;
```

### 2.2 Verify Tailwind Rebuild

```bash
cd apps/web
pnpm dev
# Should rebuild with no errors
```

---

## Step 3: Add Theme Provider

### 3.1 Update Root Layout

**Location**: `/apps/web/src/app/layout.tsx`

```typescript
import { ThemeProvider } from '@siteproof/design-system';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="siteproof-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 3.2 Add Theme Toggle to Header

**Example**: `/apps/web/src/components/Header.tsx`

```typescript
import { ThemeToggle } from '@siteproof/design-system';

export function Header() {
  return (
    <header className="flex items-center justify-between p-4">
      <h1>SiteProof</h1>

      {/* Add theme toggle */}
      <ThemeToggle />
    </header>
  );
}
```

---

## Step 4: Add Toast Container

### 4.1 Update Root Layout for Toasts

**Location**: `/apps/web/src/app/layout.tsx`

```typescript
import { ThemeProvider, Toaster } from '@siteproof/design-system';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider defaultTheme="light" storageKey="siteproof-theme">
          {children}

          {/* Add Toaster at root level */}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### 4.2 Use Toast Notifications Anywhere

**Example**: `/apps/web/src/app/projects/page.tsx`

```typescript
'use client';

import { Button, useToast } from '@siteproof/design-system';

export default function ProjectsPage() {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      // Your save logic
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

  return (
    <div>
      <Button onClick={handleSave}>Save Project</Button>
    </div>
  );
}
```

---

## Step 5: Import and Use Components

### 5.1 Basic Component Usage

**Example**: Create a new project form

```typescript
'use client';

import {
  Button,
  Input,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Label
} from '@siteproof/design-system';
import { useState } from 'react';

export function CreateProjectForm() {
  const [name, setName] = useState('');

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create New Project</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Project Name</Label>
          <Input
            id="name"
            type="text"
            placeholder="Enter project name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="secondary">Cancel</Button>
        <Button variant="primary">Create</Button>
      </CardFooter>
    </Card>
  );
}
```

### 5.2 Using Layout Components

**Example**: Project detail page

```typescript
import {
  PageLayout,
  Card,
  CardContent,
  Badge
} from '@siteproof/design-system';

export default function ProjectDetailPage({
  params
}: {
  params: { id: string }
}) {
  return (
    <PageLayout
      title="Project Details"
      subtitle="View and edit project information"
    >
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold">Project Alpha</h2>
            <Badge variant="success">Active</Badge>
          </div>

          <p className="text-gray-600">
            Construction site in downtown area
          </p>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
```

### 5.3 Using Specialized Components

**Example**: ITP status management

```typescript
import { ITPStatusButton } from '@siteproof/design-system';

export function ITPList({ itps }) {
  const handleStatusChange = async (itpId: string, newStatus: string) => {
    // Update ITP status in database
  };

  return (
    <div className="space-y-2">
      {itps.map((itp) => (
        <div key={itp.id} className="flex items-center justify-between">
          <span>{itp.name}</span>
          <ITPStatusButton
            status={itp.status}
            onClick={(newStatus) => handleStatusChange(itp.id, newStatus)}
          />
        </div>
      ))}
    </div>
  );
}
```

---

## Step 6: Replace Legacy Components

### 6.1 Find Legacy Component Usage

```bash
cd apps/web

# Find all legacy button imports
grep -r "import.*Button.*from.*@/components" src/

# Find all legacy card imports
grep -r "import.*Card.*from.*@/components" src/
```

### 6.2 Replace One File at a Time

**Before**: `/apps/web/src/app/projects/page.tsx`

```typescript
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function ProjectsPage() {
  return (
    <Card>
      <Button className="primary">New Project</Button>
    </Card>
  );
}
```

**After**: Using design system

```typescript
import { Button, Card, CardContent } from '@siteproof/design-system';

export default function ProjectsPage() {
  return (
    <Card>
      <CardContent>
        <Button variant="primary">New Project</Button>
      </CardContent>
    </Card>
  );
}
```

### 6.3 Update Props

Common prop changes:

| Legacy Prop | New Prop | Example |
|------------|----------|---------|
| `className="primary"` | `variant="primary"` | `<Button variant="primary">` |
| `className="large"` | `size="lg"` | `<Button size="lg">` |
| `isLoading` | `loading` | `<Button loading={true}>` |

---

## Step 7: Testing Integration

### 7.1 Visual Testing

1. **Start dev server**:
   ```bash
   cd apps/web
   pnpm dev
   ```

2. **Navigate to pages using design system components**

3. **Test theme switching**:
   - Click theme toggle
   - Verify all components switch to dark mode

4. **Test toast notifications**:
   - Trigger success toast
   - Trigger error toast
   - Verify they appear and auto-dismiss

### 7.2 TypeScript Check

```bash
cd apps/web
pnpm type-check
# Should pass with no errors
```

### 7.3 Build Test

```bash
cd apps/web
pnpm build
# Should build successfully
```

---

## Common Issues

### Issue 1: Components Not Styled

**Symptom**: Components render but have no styling

**Solution**: Ensure Tailwind content includes design system:

```typescript
// apps/web/tailwind.config.ts
content: [
  // ... your paths
  '../../packages/design-system/src/**/*.{js,ts,jsx,tsx}', // Add this
]
```

Then restart dev server:

```bash
pnpm dev
```

---

### Issue 2: Theme Not Persisting

**Symptom**: Theme resets on page reload

**Solution**: Check ThemeProvider has `storageKey`:

```typescript
<ThemeProvider defaultTheme="light" storageKey="siteproof-theme">
```

---

### Issue 3: Toast Not Appearing

**Symptom**: `toast()` called but nothing shows

**Solution**: Verify `<Toaster />` is in root layout:

```typescript
// apps/web/src/app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ThemeProvider>
          {children}
          <Toaster /> {/* Must be here */}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

---

### Issue 4: TypeScript Errors

**Symptom**: "Cannot find module '@siteproof/design-system'"

**Solution**:

1. Check package.json has workspace reference:
   ```json
   "@siteproof/design-system": "workspace:*"
   ```

2. Reinstall:
   ```bash
   cd apps/web
   pnpm install
   ```

3. Restart TypeScript server in VS Code:
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows)
   - Type "TypeScript: Restart TS Server"

---

### Issue 5: Hydration Errors

**Symptom**: "Hydration failed" errors in console

**Solution**: Add `suppressHydrationWarning` to `<html>` tag:

```typescript
<html lang="en" suppressHydrationWarning>
```

This is needed because theme is loaded from localStorage.

---

## Example: Full Page Migration

### Before (Legacy)

```typescript
// apps/web/src/app/projects/[id]/page.tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export default function ProjectPage() {
  return (
    <div className="container">
      <div className="header">
        <h1>Project Details</h1>
        <Badge className="success">Active</Badge>
      </div>

      <Card>
        <CardHeader>Information</CardHeader>
        <CardContent>
          <Input placeholder="Project name" />
          <Button className="primary large">Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### After (Design System)

```typescript
// apps/web/src/app/projects/[id]/page.tsx
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Badge,
  PageLayout
} from '@siteproof/design-system';

export default function ProjectPage() {
  return (
    <PageLayout
      title="Project Details"
      action={<Badge variant="success">Active</Badge>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Project name" />
          <Button variant="primary" size="lg">Save</Button>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
```

---

## Best Practices

### 1. Import Once Per File

```typescript
// Good ✅
import { Button, Card, Input, Badge } from '@siteproof/design-system';

// Avoid ❌
import { Button } from '@siteproof/design-system';
import { Card } from '@siteproof/design-system';
import { Input } from '@siteproof/design-system';
```

### 2. Use Design System Props

```typescript
// Good ✅
<Button variant="primary" size="lg" loading={isLoading}>

// Avoid ❌
<Button className="bg-blue-500 text-white px-8 py-4">
```

### 3. Compose Components

```typescript
// Good ✅
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Avoid ❌
<div className="rounded-lg border p-4">
  <h2>Title</h2>
  <p>Content</p>
</div>
```

---

## Next Steps

After integrating the design system:

1. **Migrate remaining pages** - Use [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
2. **Add mobile components** - See [MOBILE_CHECKLIST.md](./MOBILE_CHECKLIST.md)
3. **Ensure accessibility** - Review [ACCESSIBILITY.md](./ACCESSIBILITY.md)
4. **Build Storybook** - Deploy for team reference

---

## Support

Need help?

- **Documentation**: See [COMPONENT_GUIDE.md](./COMPONENT_GUIDE.md) for component usage
- **Migration**: See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for legacy → new
- **Issues**: Check [GitHub Issues](https://github.com/siteproof/siteproof-v2/issues)

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
