# SiteProof Design System - Component Usage Guide

**Version:** 1.0.0
**Last Updated:** 2025-10-08
**Status:** Production Ready

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Core Concepts](#core-concepts)
4. [Component Categories](#component-categories)
5. [UI Components](#ui-components)
6. [Layout Components](#layout-components)
7. [Specialized Components](#specialized-components)
8. [Hooks](#hooks)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Getting Started

The SiteProof Design System is a comprehensive React component library built for construction management applications. It provides mobile-first, accessible, and performant components optimized for offline-first PWA usage.

### Key Features

- **Mobile-First Design**: All components optimized for touch interfaces
- **Offline-First**: Works seamlessly with Service Worker caching
- **Accessibility**: WCAG 2.1 AA compliant
- **Type Safety**: Full TypeScript support
- **Theme Support**: Built-in dark mode and customizable themes
- **Performance**: Tree-shakeable with minimal bundle impact

---

## Installation

### Using pnpm (Recommended)

```bash
pnpm add @siteproof/design-system
```

### Using npm

```bash
npm install @siteproof/design-system
```

### Peer Dependencies

Ensure you have the required peer dependencies:

```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0"
}
```

### Tailwind CSS Configuration

Extend your `tailwind.config.js` to include the design system's configuration:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('@siteproof/design-system/tailwind.config.js')],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@siteproof/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
  // Your custom configuration
};
```

---

## Core Concepts

### Design Tokens

The design system uses a comprehensive token system for consistency:

```typescript
// Colors
const colors = {
  primary: '#0047AB',      // Primary Blue
  secondary: '#4A90E2',    // Secondary Blue
  accent: '#FF6B35',       // Accent Orange
  success: '#22C55E',      // Success Green
  error: '#EF4444',        // Error Red
  warning: '#FFC107',      // Warning Yellow
};

// Spacing
const spacing = {
  xs: '8px',
  sm: '12px',
  md: '16px',
  lg: '24px',
  xl: '32px',
};

// Typography
const fontSize = {
  h1: '32px',
  h2: '28px',
  h3: '24px',
  h4: '20px',
  body: '15px',
};
```

### Component Composition

Components follow a compound component pattern for flexibility:

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@siteproof/design-system';

function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content here */}
      </CardContent>
      <CardFooter>
        <Button>Save</Button>
      </CardFooter>
    </Card>
  );
}
```

### Theme Provider

Wrap your app with the ThemeProvider for theme support:

```tsx
import { ThemeProvider } from '@siteproof/design-system';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      {/* Your app */}
    </ThemeProvider>
  );
}
```

---

## Component Categories

### UI Components

- **Form Controls**: Button, Input, Textarea, Checkbox, Radio, Toggle, Select
- **Feedback**: Toast, Alert, Badge, Skeleton
- **Overlays**: Modal, Dialog, Popover, Tooltip, Sheet
- **Navigation**: Tabs, Breadcrumb, Pagination
- **Data Display**: Card, Table, Avatar, Progress
- **Utilities**: Separator, Label, Command

### Layout Components

- **PageLayout**: Full-page layout wrapper
- **Section**: Semantic section wrapper
- **Grid**: Responsive grid system
- **StateDisplay**: Empty states, loading states, error states

### Specialized Components

- **ITPStatusButton**: Inspection status management
- **BottomNav**: Mobile navigation
- **TopNav**: Desktop navigation
- **FAB**: Floating action buttons
- **ProgressIndicators**: Progress bars and rings

---

## UI Components

### Button

Versatile button component with multiple variants and sizes.

#### Basic Usage

```tsx
import { Button } from '@siteproof/design-system';

function Example() {
  return (
    <Button variant="primary" size="md" onClick={() => console.log('Clicked')}>
      Click Me
    </Button>
  );
}
```

#### Props API

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

#### Variants

```tsx
// Primary - Main actions
<Button variant="primary">Save Changes</Button>

// Secondary - Alternative actions
<Button variant="secondary">Cancel</Button>

// Danger - Destructive actions
<Button variant="danger">Delete Project</Button>

// Ghost - Subtle actions
<Button variant="ghost">Learn More</Button>

// Link - Text-only actions
<Button variant="link">View Details</Button>
```

#### Sizes

```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>
```

#### Loading State

```tsx
<Button loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>
```

#### With Icons

```tsx
import { Plus } from 'lucide-react';

<Button icon={<Plus />} iconPosition="left">
  Add Project
</Button>
```

---

### Input

Text input component with validation and error handling.

#### Basic Usage

```tsx
import { Input } from '@siteproof/design-system';

function Example() {
  const [value, setValue] = useState('');

  return (
    <Input
      label="Project Name"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder="Enter project name"
    />
  );
}
```

#### Props API

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}
```

#### With Validation

```tsx
<Input
  label="Email Address"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={emailError}
  hint="We'll never share your email"
  required
/>
```

#### With Icon

```tsx
import { Search } from 'lucide-react';

<Input
  placeholder="Search projects..."
  icon={<Search />}
  iconPosition="left"
/>
```

---

### Card

Container component for grouping related content.

#### Basic Usage

```tsx
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@siteproof/design-system';

function ProjectCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Alpha</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Construction site in downtown area</p>
      </CardContent>
      <CardFooter>
        <Button>View Details</Button>
      </CardFooter>
    </Card>
  );
}
```

#### Variants

```tsx
// Default
<Card>Content</Card>

// Elevated (with shadow)
<Card variant="elevated">Content</Card>

// Outlined
<Card variant="outlined">Content</Card>

// Interactive (hover effect)
<Card interactive>Content</Card>
```

---

### Select

Dropdown selection component.

#### Basic Usage

```tsx
import { Select } from '@siteproof/design-system';

function Example() {
  const options = [
    { value: 'active', label: 'Active' },
    { value: 'onhold', label: 'On Hold' },
    { value: 'completed', label: 'Completed' },
  ];

  return (
    <Select
      label="Project Status"
      options={options}
      value={status}
      onChange={setStatus}
    />
  );
}
```

#### Props API

```typescript
interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

---

### Modal

Overlay dialog component for important interactions.

#### Basic Usage

```tsx
import { Modal, ModalFooter, Button } from '@siteproof/design-system';

function Example() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>Open Modal</Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
      >
        <p>Are you sure you want to proceed?</p>

        <ModalFooter>
          <Button variant="secondary" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleConfirm}>
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
```

#### Props API

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  preventClose?: boolean;
}
```

---

### Toast

Temporary notification component.

#### Setup

Wrap your app with ToastContainer:

```tsx
import { ToastContainer } from '@siteproof/design-system';

function App() {
  return (
    <>
      <YourApp />
      <ToastContainer />
    </>
  );
}
```

#### Usage

```tsx
import { toast } from '@siteproof/design-system';

// Success toast
toast.success('Project saved successfully!');

// Error toast
toast.error('Failed to save project');

// Warning toast
toast.warning('Unsaved changes will be lost');

// Info toast
toast.info('Sync in progress...');
```

#### Custom Configuration

```tsx
toast.success('Changes saved', {
  duration: 5000,
  position: 'top-right',
  dismissible: true,
});
```

---

### Badge

Small status or label indicator.

#### Basic Usage

```tsx
import { Badge } from '@siteproof/design-system';

<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
<Badge variant="info">Draft</Badge>
```

#### Props API

```typescript
interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}
```

#### Badge Group

```tsx
import { BadgeGroup, Badge } from '@siteproof/design-system';

<BadgeGroup>
  <Badge variant="success">Approved</Badge>
  <Badge variant="info">3 ITPs</Badge>
  <Badge variant="warning">2 Pending</Badge>
</BadgeGroup>
```

---

### Checkbox

Checkbox input with label support.

#### Basic Usage

```tsx
import { Checkbox } from '@siteproof/design-system';

<Checkbox
  label="I agree to the terms"
  checked={agreed}
  onChange={(e) => setAgreed(e.target.checked)}
/>
```

#### Checkbox Group

```tsx
import { CheckboxGroup } from '@siteproof/design-system';

const options = [
  { value: 'concrete', label: 'Concrete Works' },
  { value: 'steel', label: 'Steel Structure' },
  { value: 'electrical', label: 'Electrical' },
];

<CheckboxGroup
  label="Select Trades"
  options={options}
  value={selectedTrades}
  onChange={setSelectedTrades}
/>
```

---

### Radio

Radio button input for single selection.

#### Basic Usage

```tsx
import { Radio, RadioGroup } from '@siteproof/design-system';

const options = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'na', label: 'N/A' },
];

<RadioGroup
  label="Inspection Result"
  options={options}
  value={result}
  onChange={setResult}
/>
```

---

### Textarea

Multi-line text input.

#### Basic Usage

```tsx
import { Textarea } from '@siteproof/design-system';

<Textarea
  label="Comments"
  value={comments}
  onChange={(e) => setComments(e.target.value)}
  rows={4}
  placeholder="Enter your comments..."
/>
```

---

### Toggle

Binary switch component.

#### Basic Usage

```tsx
import { Toggle } from '@siteproof/design-system';

<Toggle
  label="Enable notifications"
  checked={notificationsEnabled}
  onChange={(e) => setNotificationsEnabled(e.target.checked)}
/>
```

---

### Skeleton

Loading placeholder component.

#### Basic Usage

```tsx
import { Skeleton, SkeletonGroup } from '@siteproof/design-system';

// Single skeleton
<Skeleton width="200px" height="20px" />

// Skeleton group
<SkeletonGroup count={3} spacing="md" />
```

---

## Layout Components

### PageLayout

Full-page layout wrapper with navigation.

#### Basic Usage

```tsx
import { PageLayout } from '@siteproof/design-system';

function ProjectsPage() {
  return (
    <PageLayout
      title="Projects"
      subtitle="Manage your construction projects"
      action={
        <Button onClick={handleCreate}>
          New Project
        </Button>
      }
    >
      {/* Page content */}
    </PageLayout>
  );
}
```

---

### Grid

Responsive grid layout system.

#### Basic Usage

```tsx
import { Grid, GridItem } from '@siteproof/design-system';

<Grid cols={{ mobile: 1, tablet: 2, desktop: 3 }} gap="lg">
  <GridItem>Item 1</GridItem>
  <GridItem>Item 2</GridItem>
  <GridItem>Item 3</GridItem>
</Grid>
```

---

### StateDisplay

Displays empty, loading, or error states.

#### Basic Usage

```tsx
import { StateDisplay } from '@siteproof/design-system';

// Empty state
<StateDisplay
  type="empty"
  title="No projects yet"
  description="Create your first project to get started"
  action={<Button>Create Project</Button>}
/>

// Loading state
<StateDisplay type="loading" title="Loading projects..." />

// Error state
<StateDisplay
  type="error"
  title="Failed to load projects"
  description="Please try again later"
  action={<Button onClick={retry}>Retry</Button>}
/>
```

---

## Specialized Components

### ITPStatusButton

Inspection Test Plan status button.

#### Basic Usage

```tsx
import { ITPStatusButton } from '@siteproof/design-system';

<ITPStatusButton
  status="pending"
  onClick={handleStatusChange}
/>
```

#### Status Values

- `pending` - Not started
- `in-progress` - Currently being inspected
- `completed` - Inspection complete
- `approved` - Approved by authority
- `rejected` - Requires rework

---

### BottomNav

Mobile navigation bar.

#### Basic Usage

```tsx
import { BottomNav } from '@siteproof/design-system';
import { Home, Calendar, FileText, User } from 'lucide-react';

const items = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home />, href: '/dashboard' },
  { id: 'diary', label: 'Diary', icon: <Calendar />, href: '/diary' },
  { id: 'reports', label: 'Reports', icon: <FileText />, href: '/reports' },
  { id: 'profile', label: 'Profile', icon: <User />, href: '/profile' },
];

<BottomNav items={items} activeId="dashboard" />
```

---

### FAB

Floating Action Button for primary mobile actions.

#### Basic Usage

```tsx
import { FAB } from '@siteproof/design-system';
import { Plus } from 'lucide-react';

<FAB
  icon={<Plus />}
  label="New Entry"
  onClick={handleCreate}
/>
```

#### FAB Group

```tsx
import { FABGroup } from '@siteproof/design-system';

const actions = [
  { id: 'photo', icon: <Camera />, label: 'Take Photo' },
  { id: 'note', icon: <FileText />, label: 'Add Note' },
  { id: 'itp', icon: <CheckSquare />, label: 'Start ITP' },
];

<FABGroup actions={actions} onActionClick={handleAction} />
```

---

### ProgressIndicators

Visual progress feedback components.

#### Progress Bar

```tsx
import { ProgressBar } from '@siteproof/design-system';

<ProgressBar value={65} max={100} label="Project Completion" />
```

#### Progress Ring

```tsx
import { ProgressRing } from '@siteproof/design-system';

<ProgressRing value={75} size={120} strokeWidth={8} />
```

---

## Hooks

### useTheme

Access and control theme state.

```tsx
import { useTheme } from '@siteproof/design-system';

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </Button>
  );
}
```

### useMediaQuery

Responsive breakpoint detection.

```tsx
import { useMediaQuery } from '@siteproof/design-system';

function ResponsiveComponent() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  return isMobile ? <MobileView /> : <DesktopView />;
}
```

### useToast

Programmatic toast notifications.

```tsx
import { useToast } from '@siteproof/design-system';

function Example() {
  const { toast } = useToast();

  const handleSave = async () => {
    try {
      await saveData();
      toast({ type: 'success', message: 'Saved successfully' });
    } catch (error) {
      toast({ type: 'error', message: 'Failed to save' });
    }
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

---

## Best Practices

### 1. Component Composition

Build complex UIs by composing simple components:

```tsx
// Good ✅
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// Avoid ❌
<ComplexCardWithEverything title="Title" content="Content" />
```

### 2. Accessibility

Always provide labels and ARIA attributes:

```tsx
// Good ✅
<Input
  label="Email"
  aria-required="true"
  aria-describedby="email-hint"
/>

// Avoid ❌
<input placeholder="Email" />
```

### 3. Mobile-First

Design for mobile first, enhance for desktop:

```tsx
// Good ✅
<Grid cols={{ mobile: 1, tablet: 2, desktop: 3 }}>

// Avoid ❌
<Grid cols={3}> {/* Breaks on mobile */}
```

### 4. Loading States

Always show feedback during async operations:

```tsx
// Good ✅
<Button loading={isSubmitting}>
  {isSubmitting ? 'Saving...' : 'Save'}
</Button>

// Avoid ❌
<Button onClick={handleSave}>Save</Button>
```

### 5. Error Handling

Provide clear error messages:

```tsx
// Good ✅
<Input
  label="Email"
  value={email}
  error={emailError || ''}
  onChange={handleEmailChange}
/>

// Avoid ❌
<Input value={email} /> {/* No error feedback */}
```

---

## Troubleshooting

### Common Issues

#### 1. Styles Not Applied

**Problem:** Components render but don't have proper styling.

**Solution:** Ensure Tailwind CSS is configured correctly:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@siteproof/design-system/src/**/*.{js,ts,jsx,tsx}',
  ],
};
```

#### 2. TypeScript Errors

**Problem:** Type errors when using components.

**Solution:** Ensure `@types/react` is installed:

```bash
pnpm add -D @types/react @types/react-dom
```

#### 3. Toast Not Showing

**Problem:** `toast()` called but nothing appears.

**Solution:** Add `<ToastContainer />` to your app root:

```tsx
function App() {
  return (
    <>
      <YourApp />
      <ToastContainer />
    </>
  );
}
```

#### 4. Theme Not Working

**Problem:** Dark mode toggle doesn't work.

**Solution:** Wrap app with `ThemeProvider`:

```tsx
import { ThemeProvider } from '@siteproof/design-system';

<ThemeProvider defaultTheme="light">
  <App />
</ThemeProvider>
```

---

## Support

For issues, feature requests, or questions:

- **Documentation**: See `/docs` folder
- **GitHub Issues**: [github.com/siteproof/design-system/issues](https://github.com/siteproof/design-system/issues)
- **Email**: support@siteproof.com

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
