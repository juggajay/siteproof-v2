# SiteProof Design System - API Reference

**Version:** 1.0.0
**Last Updated:** 2025-10-08

---

## Table of Contents

1. [Components](#components)
   - [UI Components](#ui-components)
   - [Layout Components](#layout-components)
   - [Specialized Components](#specialized-components)
2. [Hooks](#hooks)
3. [Utilities](#utilities)
4. [TypeScript Types](#typescript-types)

---

## Components

### UI Components

#### Button

Primary interactive element for user actions.

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';

  /**
   * Button size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Loading state indicator
   * @default false
   */
  loading?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Full width button
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Icon element to display
   */
  icon?: React.ReactNode;

  /**
   * Icon position
   * @default 'left'
   */
  iconPosition?: 'left' | 'right';

  /**
   * Button content
   */
  children: React.ReactNode;
}
```

**Usage:**
```tsx
<Button variant="primary" size="lg" loading={isSubmitting}>
  Save Project
</Button>
```

---

#### Input

Text input field with label and validation support.

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Input label text
   */
  label?: string;

  /**
   * Error message to display
   */
  error?: string;

  /**
   * Helper text below input
   */
  hint?: string;

  /**
   * Required field indicator
   * @default false
   */
  required?: boolean;

  /**
   * Full width input
   * @default true
   */
  fullWidth?: boolean;

  /**
   * Icon element
   */
  icon?: React.ReactNode;

  /**
   * Icon position
   * @default 'left'
   */
  iconPosition?: 'left' | 'right';
}
```

**Usage:**
```tsx
<Input
  label="Email Address"
  type="email"
  required
  error={errors.email}
  hint="We'll never share your email"
/>
```

---

#### Textarea

Multi-line text input field.

```typescript
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /**
   * Textarea label
   */
  label?: string;

  /**
   * Error message
   */
  error?: string;

  /**
   * Helper text
   */
  hint?: string;

  /**
   * Required field
   * @default false
   */
  required?: boolean;

  /**
   * Number of visible rows
   * @default 3
   */
  rows?: number;

  /**
   * Resize behavior
   * @default 'vertical'
   */
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}
```

---

#### Checkbox

Checkbox input with label support.

```typescript
interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Checkbox label
   */
  label?: string;

  /**
   * Checked state
   */
  checked?: boolean;

  /**
   * Indeterminate state
   * @default false
   */
  indeterminate?: boolean;

  /**
   * Error message
   */
  error?: string;
}

interface CheckboxGroupProps {
  /**
   * Group label
   */
  label?: string;

  /**
   * Available options
   */
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;

  /**
   * Selected values
   */
  value?: string[];

  /**
   * Change handler
   */
  onChange?: (value: string[]) => void;

  /**
   * Error message
   */
  error?: string;
}
```

**Usage:**
```tsx
<CheckboxGroup
  label="Select Trades"
  options={[
    { value: 'concrete', label: 'Concrete Works' },
    { value: 'steel', label: 'Steel Structure' },
  ]}
  value={selectedTrades}
  onChange={setSelectedTrades}
/>
```

---

#### Radio

Radio button input for single selection.

```typescript
interface RadioProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Radio label
   */
  label: string;

  /**
   * Radio value
   */
  value: string;
}

interface RadioGroupProps {
  /**
   * Group label
   */
  label?: string;

  /**
   * Radio options
   */
  options: RadioOption[];

  /**
   * Selected value
   */
  value?: string;

  /**
   * Change handler
   */
  onChange?: (value: string) => void;

  /**
   * Error message
   */
  error?: string;

  /**
   * Required field
   * @default false
   */
  required?: boolean;
}

interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

---

#### Toggle

Binary switch component.

```typescript
interface ToggleProps {
  /**
   * Toggle label
   */
  label?: string;

  /**
   * Checked state
   */
  checked?: boolean;

  /**
   * Change handler
   */
  onChange?: (checked: boolean) => void;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Size variant
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}
```

**Usage:**
```tsx
<Toggle
  label="Enable notifications"
  checked={notificationsEnabled}
  onChange={setNotificationsEnabled}
/>
```

---

#### Select

Dropdown selection component.

```typescript
interface SelectProps {
  /**
   * Select label
   */
  label?: string;

  /**
   * Available options
   */
  options: SelectOption[];

  /**
   * Selected value
   */
  value?: string;

  /**
   * Change handler
   */
  onChange?: (value: string) => void;

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Error message
   */
  error?: string;

  /**
   * Required field
   * @default false
   */
  required?: boolean;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Full width
   * @default true
   */
  fullWidth?: boolean;
}

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}
```

---

#### Card

Container component for grouping content.

```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Card variant
   * @default 'default'
   */
  variant?: 'default' | 'elevated' | 'outlined';

  /**
   * Interactive card with hover effect
   * @default false
   */
  interactive?: boolean;

  /**
   * Card content
   */
  children: React.ReactNode;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /**
   * Title level
   * @default 'h3'
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: React.ReactNode;
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}
```

**Usage:**
```tsx
<Card variant="elevated">
  <CardHeader>
    <CardTitle>Project Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Project information</p>
  </CardContent>
  <CardFooter>
    <Button>Edit</Button>
  </CardFooter>
</Card>
```

---

#### Modal

Dialog overlay component.

```typescript
interface ModalProps {
  /**
   * Open/closed state
   */
  isOpen: boolean;

  /**
   * Close handler
   */
  onClose: () => void;

  /**
   * Modal title
   */
  title?: string;

  /**
   * Modal size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /**
   * Prevent closing on overlay click
   * @default false
   */
  preventClose?: boolean;

  /**
   * Modal content
   */
  children: React.ReactNode;
}

interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Footer alignment
   * @default 'right'
   */
  align?: 'left' | 'center' | 'right' | 'between';

  children: React.ReactNode;
}
```

---

#### Badge

Status or label indicator.

```typescript
interface BadgeProps {
  /**
   * Badge variant
   * @default 'neutral'
   */
  variant?: BadgeVariant;

  /**
   * Badge size
   * @default 'md'
   */
  size?: BadgeSize;

  /**
   * Badge content
   */
  children: React.ReactNode;

  /**
   * Icon element
   */
  icon?: React.ReactNode;
}

type BadgeVariant =
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'primary';

type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeGroupProps {
  /**
   * Spacing between badges
   * @default 'sm'
   */
  spacing?: 'xs' | 'sm' | 'md';

  children: React.ReactNode;
}
```

---

#### Toast

Temporary notification component.

```typescript
interface ToastProps {
  /**
   * Toast type
   */
  type: ToastType;

  /**
   * Toast message
   */
  message: string;

  /**
   * Display duration in milliseconds
   * @default 3000
   */
  duration?: number;

  /**
   * Dismissible by user
   * @default true
   */
  dismissible?: boolean;

  /**
   * Toast position
   * @default 'top-right'
   */
  position?: 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastContainerProps {
  /**
   * Maximum number of toasts
   * @default 3
   */
  maxToasts?: number;
}
```

**Usage:**
```tsx
import { toast, ToastContainer } from '@siteproof/design-system';

// In your app root
<ToastContainer />

// To show toast
toast.success('Project saved successfully');
toast.error('Failed to save project');
toast.warning('Unsaved changes');
toast.info('Syncing data...');
```

---

#### Skeleton

Loading placeholder component.

```typescript
interface SkeletonProps {
  /**
   * Skeleton width
   */
  width?: string | number;

  /**
   * Skeleton height
   */
  height?: string | number;

  /**
   * Border radius
   * @default 'md'
   */
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';

  /**
   * Animation
   * @default true
   */
  animated?: boolean;
}

interface SkeletonGroupProps {
  /**
   * Number of skeletons
   * @default 3
   */
  count?: number;

  /**
   * Spacing between skeletons
   * @default 'md'
   */
  spacing?: 'xs' | 'sm' | 'md' | 'lg';
}
```

---

### Layout Components

#### PageLayout

Full-page layout wrapper.

```typescript
interface PageLayoutProps {
  /**
   * Page title
   */
  title?: string;

  /**
   * Page subtitle
   */
  subtitle?: string;

  /**
   * Action button or element
   */
  action?: React.ReactNode;

  /**
   * Show back button
   * @default false
   */
  showBack?: boolean;

  /**
   * Back navigation handler
   */
  onBack?: () => void;

  /**
   * Page content
   */
  children: React.ReactNode;

  /**
   * Loading state
   * @default false
   */
  loading?: boolean;
}
```

---

#### Section

Semantic section wrapper.

```typescript
interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * Section title
   */
  title?: string;

  /**
   * Section subtitle
   */
  subtitle?: string;

  /**
   * Padding size
   * @default 'md'
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';

  /**
   * Section content
   */
  children: React.ReactNode;
}
```

---

#### Grid

Responsive grid layout.

```typescript
interface GridProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Number of columns per breakpoint
   */
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  } | number;

  /**
   * Gap between items
   * @default 'md'
   */
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';

  /**
   * Grid content
   */
  children: React.ReactNode;
}

interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Column span
   */
  colSpan?: number;

  /**
   * Row span
   */
  rowSpan?: number;

  children: React.ReactNode;
}
```

---

#### StateDisplay

Empty, loading, and error states.

```typescript
interface StateDisplayProps {
  /**
   * State type
   */
  type: 'empty' | 'loading' | 'error';

  /**
   * State title
   */
  title: string;

  /**
   * State description
   */
  description?: string;

  /**
   * Action button
   */
  action?: React.ReactNode;

  /**
   * Custom icon
   */
  icon?: React.ReactNode;
}
```

---

### Specialized Components

#### ITPStatusButton

Inspection Test Plan status button.

```typescript
interface ITPStatusButtonProps {
  /**
   * Current ITP status
   */
  status: ITPStatus;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * Disabled state
   * @default false
   */
  disabled?: boolean;

  /**
   * Button size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

type ITPStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'approved'
  | 'rejected';
```

---

#### BottomNav

Mobile bottom navigation.

```typescript
interface BottomNavProps {
  /**
   * Navigation items
   */
  items: BottomNavItem[];

  /**
   * Active item ID
   */
  activeId?: string;

  /**
   * Item click handler
   */
  onItemClick?: (id: string) => void;
}

interface BottomNavItem {
  /**
   * Unique item ID
   */
  id: string;

  /**
   * Item label
   */
  label: string;

  /**
   * Item icon
   */
  icon: React.ReactNode;

  /**
   * Navigation href
   */
  href?: string;

  /**
   * Badge count
   */
  badge?: number;
}
```

---

#### TopNav

Desktop top navigation.

```typescript
interface TopNavProps {
  /**
   * Navigation title
   */
  title?: string;

  /**
   * Logo element
   */
  logo?: React.ReactNode;

  /**
   * Navigation items
   */
  items?: React.ReactNode;

  /**
   * Action elements
   */
  actions?: React.ReactNode;
}
```

---

#### FAB

Floating Action Button.

```typescript
interface FABProps {
  /**
   * FAB icon
   */
  icon: React.ReactNode;

  /**
   * FAB label
   */
  label?: string;

  /**
   * Click handler
   */
  onClick?: () => void;

  /**
   * FAB position
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';

  /**
   * FAB size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
}

interface FABGroupProps {
  /**
   * FAB actions
   */
  actions: Array<{
    id: string;
    icon: React.ReactNode;
    label: string;
  }>;

  /**
   * Action click handler
   */
  onActionClick?: (id: string) => void;

  /**
   * Group position
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left';
}
```

---

#### ProgressIndicators

Progress visualization components.

```typescript
interface ProgressBarProps {
  /**
   * Current value
   */
  value: number;

  /**
   * Maximum value
   * @default 100
   */
  max?: number;

  /**
   * Progress label
   */
  label?: string;

  /**
   * Show percentage
   * @default true
   */
  showPercentage?: boolean;

  /**
   * Progress color
   * @default 'primary'
   */
  color?: 'primary' | 'success' | 'warning' | 'error';

  /**
   * Progress segments
   */
  segments?: ProgressSegment[];
}

interface ProgressRingProps {
  /**
   * Current value
   */
  value: number;

  /**
   * Maximum value
   * @default 100
   */
  max?: number;

  /**
   * Ring size in pixels
   * @default 100
   */
  size?: number;

  /**
   * Stroke width in pixels
   * @default 8
   */
  strokeWidth?: number;

  /**
   * Progress color
   * @default 'primary'
   */
  color?: 'primary' | 'success' | 'warning' | 'error';

  /**
   * Show percentage label
   * @default true
   */
  showLabel?: boolean;
}

interface ProgressSegment {
  value: number;
  color: string;
  label?: string;
}
```

---

## Hooks

### useTheme

Theme management hook.

```typescript
interface UseThemeReturn {
  /**
   * Current theme
   */
  theme: 'light' | 'dark';

  /**
   * Set theme
   */
  setTheme: (theme: 'light' | 'dark') => void;

  /**
   * Toggle theme
   */
  toggleTheme: () => void;
}

function useTheme(): UseThemeReturn;
```

**Usage:**
```tsx
const { theme, setTheme, toggleTheme } = useTheme();
```

---

### useMediaQuery

Responsive breakpoint detection.

```typescript
function useMediaQuery(query: string): boolean;
```

**Usage:**
```tsx
const isMobile = useMediaQuery('(max-width: 768px)');
const isTablet = useMediaQuery('(min-width: 769px) and (max-width: 1024px)');
const isDesktop = useMediaQuery('(min-width: 1025px)');
```

---

### useToast

Toast notification hook.

```typescript
interface UseToastReturn {
  /**
   * Show toast
   */
  toast: (options: ToastOptions) => void;
}

interface ToastOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
  dismissible?: boolean;
}

function useToast(): UseToastReturn;
```

---

## Utilities

### cn (classNames)

Utility for merging class names.

```typescript
function cn(...inputs: ClassValue[]): string;

type ClassValue = string | number | boolean | undefined | null | ClassArray | ClassDictionary;
```

**Usage:**
```tsx
import { cn } from '@siteproof/design-system';

<div className={cn(
  'base-class',
  isActive && 'active-class',
  { 'conditional-class': someCondition }
)} />
```

---

## TypeScript Types

### Exported Types

All component prop types are exported for reuse:

```typescript
import type {
  ButtonProps,
  InputProps,
  CardProps,
  ModalProps,
  // ... etc
} from '@siteproof/design-system';
```

### Generic Types

```typescript
/**
 * Component with polymorphic 'as' prop
 */
type PolymorphicComponentProps<C extends React.ElementType> = {
  as?: C;
} & React.ComponentPropsWithoutRef<C>;

/**
 * Component with ref forwarding
 */
type ComponentWithRef<C extends React.ElementType, Props = {}> =
  PolymorphicComponentProps<C> & Props;
```

---

## Support

- **Documentation**: `/docs/COMPONENT_GUIDE.md`
- **Accessibility**: `/docs/ACCESSIBILITY.md`
- **Migration**: `/docs/MIGRATION_GUIDE.md`
- **GitHub**: [github.com/siteproof/design-system](https://github.com/siteproof/design-system)

---

**Last Updated:** 2025-10-08
**Version:** 1.0.0
