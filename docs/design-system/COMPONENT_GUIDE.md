# SiteProof Design System - Component Usage Guide

## Introduction

This guide provides comprehensive documentation for using SiteProof's design system components. Our design system is built with React, TypeScript, Tailwind CSS, and Framer Motion to provide a modern, accessible, and performant component library.

## Installation

```bash
# Install the design system package
pnpm add @siteproof/design-system

# Peer dependencies (if not already installed)
pnpm add react react-dom
```

## Basic Setup

### 1. Import Components

```typescript
import { Button, Input, Card } from '@siteproof/design-system'

export function Example() {
  return (
    <Card>
      <Input placeholder="Enter name" />
      <Button variant="primary">Submit</Button>
    </Card>
  )
}
```

### 2. Configure Tailwind

Ensure your `tailwind.config.js` includes the design system content:

```javascript
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './node_modules/@siteproof/design-system/**/*.{js,ts,jsx,tsx}',
  ],
  // ... rest of config
}
```

## Core Components

### Button

The Button component provides a consistent, accessible button interface with multiple variants and states.

**Variants:**
- `primary` - Main call-to-action (blue background)
- `secondary` - Secondary actions (outlined style)
- `ghost` - Tertiary actions (transparent background)
- `danger` - Destructive actions (red/error color)

**Sizes:**
- `sm` - 40px height (desktop secondary actions)
- `md` - 48px height (default, desktop primary)
- `lg` - 56px height (mobile primary actions)

**Props:**
- `variant?: 'primary' | 'secondary' | 'ghost' | 'danger'` - Visual style
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `loading?: boolean` - Shows loading spinner
- `fullWidth?: boolean` - Makes button full width
- `leftIcon?: ReactNode` - Icon on the left side
- `rightIcon?: ReactNode` - Icon on the right side
- `disabled?: boolean` - Disables the button

**Examples:**

```typescript
// Primary button with icon
<Button
  variant="primary"
  size="lg"
  leftIcon={<CheckCircle />}
>
  Submit Inspection
</Button>

// Loading state
<Button loading>
  Saving...
</Button>

// Danger button
<Button variant="danger" onClick={handleDelete}>
  Delete NCR
</Button>

// Full width mobile button
<Button fullWidth size="lg">
  Continue
</Button>

// Ghost button with right icon
<Button
  variant="ghost"
  rightIcon={<ChevronRight />}
>
  View Details
</Button>
```

**Accessibility:**
- Keyboard navigation support
- Loading state announced to screen readers
- Proper disabled state handling
- ARIA attributes included

---

### Input

Text input component with validation states, labels, and helper text.

**Props:**
- `label?: string` - Field label
- `error?: string` - Error message (shows error state)
- `success?: boolean` - Success state indicator
- `helperText?: string` - Helper text below input
- `fullWidth?: boolean` - Makes input full width
- All standard HTML input attributes

**Examples:**

```typescript
// Basic input with label
<Input
  label="Project Name"
  placeholder="Enter project name"
/>

// Input with error
<Input
  label="Email"
  type="email"
  error="Please enter a valid email"
  defaultValue="invalid-email"
/>

// Input with success state
<Input
  label="Username"
  success
  helperText="Username is available"
/>

// Full width input
<Input
  label="Description"
  fullWidth
  placeholder="Enter description..."
/>

// Required input
<Input
  label="Required Field"
  required
  helperText="This field is required"
/>
```

**Accessibility:**
- Automatic label association
- Error messages announced to screen readers
- ARIA attributes for validation states
- Proper focus management

---

### Card

Container component for grouping related content with optional interactivity.

**Components:**
- `Card` - Main container
- `CardHeader` - Header section with bottom border
- `CardTitle` - Styled title element
- `CardContent` - Content area
- `CardFooter` - Footer section with top border

**Props:**
- `variant?: 'default' | 'interactive'` - Style variant
- `padding?: 'none' | 'small' | 'medium' | 'large'` - Internal padding
- `onClick?: () => void` - Click handler (makes card clickable)

**Examples:**

```typescript
// Basic card
<Card>
  <CardHeader>
    <CardTitle>Project Details</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>View More</Button>
  </CardFooter>
</Card>

// Interactive card
<Card variant="interactive" onClick={handleClick}>
  <CardContent>
    Click me
  </CardContent>
</Card>

// Card with custom padding
<Card padding="large">
  <h3>Large padding card</h3>
</Card>

// Compact card
<Card padding="small">
  <p>Compact content</p>
</Card>
```

**Accessibility:**
- Interactive cards have proper keyboard support
- Role and tabIndex set for clickable cards
- Focus visible on keyboard navigation

---

### Select

Dropdown select component with search and multi-select support.

**Props:**
- `options: SelectOption[]` - Array of options
- `value?: string | string[]` - Selected value(s)
- `onChange?: (value: string | string[]) => void` - Change handler
- `placeholder?: string` - Placeholder text
- `searchable?: boolean` - Enable search
- `multiple?: boolean` - Enable multi-select
- `disabled?: boolean` - Disable select

**SelectOption Type:**
```typescript
interface SelectOption {
  label: string;
  value: string;
  disabled?: boolean;
}
```

**Examples:**

```typescript
const options = [
  { label: 'Option 1', value: '1' },
  { label: 'Option 2', value: '2' },
  { label: 'Option 3', value: '3' },
];

// Basic select
<Select
  options={options}
  placeholder="Select an option"
  onChange={(value) => console.log(value)}
/>

// Searchable select
<Select
  options={options}
  searchable
  placeholder="Search options..."
/>

// Multi-select
<Select
  options={options}
  multiple
  placeholder="Select multiple"
  onChange={(values) => console.log(values)}
/>
```

**Accessibility:**
- Keyboard navigation (Arrow keys, Enter, Escape)
- Screen reader support
- Focus management
- ARIA attributes

---

### Modal / Dialog

Modal component for overlaying content and capturing user attention.

**Components:**
- `Modal` - Main modal container
- `ModalFooter` - Footer with action buttons

**Props:**
- `isOpen: boolean` - Controls modal visibility
- `onClose: () => void` - Close handler
- `title?: string` - Modal title
- `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` - Modal size
- `closeOnOverlayClick?: boolean` - Close when clicking overlay

**Examples:**

```typescript
function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Action"
        size="md"
      >
        <p>Are you sure you want to proceed?</p>

        <ModalFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary">
            Confirm
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
```

**Accessibility:**
- Focus trap (keeps focus within modal)
- Escape key closes modal
- Focus returns to trigger element on close
- Proper ARIA attributes
- Screen reader announcements

---

### Toast

Toast notification component for displaying temporary messages.

**Components:**
- `Toast` - Individual toast message
- `ToastContainer` - Container for managing multiple toasts
- `useToast` - Hook for showing toasts

**Toast Types:**
- `success` - Success message (green)
- `error` - Error message (red)
- `warning` - Warning message (orange)
- `info` - Information message (blue)

**Examples:**

```typescript
import { useToast, ToastContainer } from '@siteproof/design-system';

function App() {
  return (
    <>
      <YourApp />
      <ToastContainer />
    </>
  );
}

function MyComponent() {
  const toast = useToast();

  const handleSuccess = () => {
    toast.success('Operation completed successfully!');
  };

  const handleError = () => {
    toast.error('An error occurred');
  };

  return (
    <div>
      <Button onClick={handleSuccess}>Show Success</Button>
      <Button onClick={handleError}>Show Error</Button>
    </div>
  );
}
```

**Accessibility:**
- ARIA live regions for screen readers
- Auto-dismiss with configurable duration
- Keyboard dismissible
- Proper color contrast

---

### Badge

Small status indicator component.

**Components:**
- `Badge` - Single badge
- `BadgeGroup` - Container for multiple badges

**Variants:**
- `success` - Green badge
- `error` - Red badge
- `warning` - Orange badge
- `info` - Blue badge
- `neutral` - Gray badge

**Sizes:**
- `sm` - Small badge
- `md` - Medium badge (default)
- `lg` - Large badge

**Examples:**

```typescript
// Basic badge
<Badge variant="success">Active</Badge>

// Badge with custom size
<Badge variant="error" size="lg">Critical</Badge>

// Badge group
<BadgeGroup>
  <Badge variant="info">New</Badge>
  <Badge variant="success">Verified</Badge>
  <Badge variant="warning">Pending</Badge>
</BadgeGroup>
```

---

### Checkbox & Radio

Form selection components with group support.

**Checkbox Examples:**

```typescript
// Single checkbox
<Checkbox
  label="Accept terms and conditions"
  onChange={(checked) => console.log(checked)}
/>

// Checkbox group
<CheckboxGroup
  options={[
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' },
    { label: 'Option 3', value: '3' },
  ]}
  value={['1', '2']}
  onChange={(values) => console.log(values)}
/>
```

**Radio Examples:**

```typescript
// Radio group
<RadioGroup
  options={[
    { label: 'Option A', value: 'a' },
    { label: 'Option B', value: 'b' },
    { label: 'Option C', value: 'c' },
  ]}
  value="a"
  onChange={(value) => console.log(value)}
/>
```

**Accessibility:**
- Keyboard navigation
- Proper ARIA attributes
- Focus visible
- Label association

---

### Textarea

Multi-line text input component.

**Props:**
- `label?: string` - Field label
- `error?: string` - Error message
- `helperText?: string` - Helper text
- `rows?: number` - Number of rows (default: 4)
- All standard HTML textarea attributes

**Examples:**

```typescript
<Textarea
  label="Description"
  placeholder="Enter description..."
  rows={6}
  helperText="Maximum 500 characters"
/>

<Textarea
  label="Comments"
  error="Comments are required"
/>
```

---

### Toggle / Switch

Toggle switch component for binary choices.

**Props:**
- `checked?: boolean` - Current state
- `onChange?: (checked: boolean) => void` - Change handler
- `label?: string` - Label text
- `disabled?: boolean` - Disable toggle

**Examples:**

```typescript
<Toggle
  label="Enable notifications"
  checked={enabled}
  onChange={setEnabled}
/>

<Toggle
  label="Dark mode"
  checked={darkMode}
  onChange={toggleDarkMode}
/>
```

---

### Skeleton

Loading placeholder component.

**Components:**
- `Skeleton` - Single skeleton element
- `SkeletonGroup` - Multiple skeletons

**Props:**
- `width?: string` - Custom width
- `height?: string` - Custom height
- `variant?: 'text' | 'circular' | 'rectangular'` - Shape variant

**Examples:**

```typescript
// Text skeleton
<Skeleton variant="text" width="200px" />

// Avatar skeleton
<Skeleton variant="circular" width="48px" height="48px" />

// Card skeleton
<Card>
  <SkeletonGroup count={3} />
</Card>
```

---

## Layout Components

### PageLayout

Main page layout wrapper with navigation slots.

**Props:**
- `topNav?: ReactNode` - Top navigation content
- `bottomNav?: ReactNode` - Bottom navigation content
- `children: ReactNode` - Page content

**Example:**

```typescript
<PageLayout
  topNav={<TopNav />}
  bottomNav={<BottomNav />}
>
  <main>
    {/* Page content */}
  </main>
</PageLayout>
```

---

### Grid

Responsive grid layout component.

**Components:**
- `Grid` - Grid container
- `GridItem` - Grid item

**Props:**
- `cols?: number | { sm?: number; md?: number; lg?: number }` - Column count
- `gap?: string` - Grid gap
- `span?: number` - Grid item span

**Examples:**

```typescript
// Responsive grid
<Grid cols={{ sm: 1, md: 2, lg: 3 }} gap="medium">
  <GridItem>Item 1</GridItem>
  <GridItem>Item 2</GridItem>
  <GridItem>Item 3</GridItem>
</Grid>

// Grid with spanning items
<Grid cols={4} gap="small">
  <GridItem span={2}>Spans 2 columns</GridItem>
  <GridItem>Regular</GridItem>
  <GridItem>Regular</GridItem>
</Grid>
```

---

### Section

Content section wrapper with optional title.

**Props:**
- `title?: string` - Section title
- `children: ReactNode` - Section content
- `spacing?: 'small' | 'medium' | 'large'` - Vertical spacing

**Example:**

```typescript
<Section title="Project Details" spacing="large">
  <p>Section content here</p>
</Section>
```

---

## Navigation Components

### TopNav

Top navigation bar for desktop and mobile.

**Props:**
- `title?: string` - Page title
- `leftAction?: ReactNode` - Left action (e.g., back button)
- `rightAction?: ReactNode` - Right action (e.g., menu)

**Example:**

```typescript
<TopNav
  title="Projects"
  leftAction={<Button variant="ghost">Back</Button>}
  rightAction={<Button variant="ghost">Menu</Button>}
/>
```

---

### BottomNav

Bottom navigation bar for mobile apps.

**Props:**
- `items: BottomNavItem[]` - Navigation items
- `activeId?: string` - Currently active item ID

**BottomNavItem Type:**
```typescript
interface BottomNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}
```

**Example:**

```typescript
<BottomNav
  items={[
    { id: 'home', label: 'Home', icon: <Home />, onClick: () => {} },
    { id: 'projects', label: 'Projects', icon: <Folder />, onClick: () => {} },
    { id: 'profile', label: 'Profile', icon: <User />, onClick: () => {} },
  ]}
  activeId="home"
/>
```

---

### FAB (Floating Action Button)

Floating action button for primary mobile actions.

**Components:**
- `FAB` - Single FAB
- `FABGroup` - Multiple FABs

**Props:**
- `icon: ReactNode` - Button icon
- `onClick: () => void` - Click handler
- `label?: string` - Accessibility label

**Examples:**

```typescript
// Single FAB
<FAB
  icon={<Plus />}
  onClick={handleCreate}
  label="Create new item"
/>

// FAB group
<FABGroup
  fabs={[
    { icon: <Camera />, onClick: handlePhoto, label: 'Take photo' },
    { icon: <Upload />, onClick: handleUpload, label: 'Upload file' },
  ]}
/>
```

---

## Progress Components

### ProgressBar

Linear progress indicator.

**Props:**
- `value: number` - Progress value (0-100)
- `max?: number` - Maximum value (default: 100)
- `segments?: ProgressSegment[]` - Multi-segment progress
- `showLabel?: boolean` - Show percentage label
- `color?: string` - Custom color

**Examples:**

```typescript
// Simple progress bar
<ProgressBar value={75} showLabel />

// Multi-segment progress
<ProgressBar
  segments={[
    { value: 30, color: '#22C55E', label: 'Complete' },
    { value: 20, color: '#FFC107', label: 'In Progress' },
  ]}
/>
```

---

### ProgressRing

Circular progress indicator.

**Props:**
- `value: number` - Progress value (0-100)
- `size?: number` - Ring size in pixels
- `strokeWidth?: number` - Ring thickness
- `color?: string` - Ring color

**Example:**

```typescript
<ProgressRing
  value={65}
  size={120}
  strokeWidth={8}
  color="#2196F3"
/>
```

---

## State Display Components

### StateDisplay

Component for displaying empty, error, and loading states.

**Props:**
- `state: 'loading' | 'empty' | 'error'` - Current state
- `title?: string` - State title
- `description?: string` - State description
- `action?: ReactNode` - Action button
- `icon?: ReactNode` - Custom icon

**Examples:**

```typescript
// Loading state
<StateDisplay state="loading" title="Loading..." />

// Empty state
<StateDisplay
  state="empty"
  title="No projects found"
  description="Get started by creating your first project"
  action={<Button>Create Project</Button>}
/>

// Error state
<StateDisplay
  state="error"
  title="Something went wrong"
  description="Please try again later"
  action={<Button onClick={retry}>Retry</Button>}
/>
```

---

## Theming

### Color System

The design system uses a semantic color system based on Tailwind CSS:

**Primary Colors:**
- `primary-blue` - #2196F3 (Main brand color)
- `primary-charcoal` - #1A1F2E (Text color)
- `primary-white` - #FFFFFF

**Secondary Colors:**
- `secondary-blue-light` - #4A90E2
- `secondary-gray` - #6B7280
- `secondary-light-gray` - #F3F4F6

**Functional Colors (Color-blind Safe - Okabe-Ito Palette):**
- `success` - #117733 (Bluish green)
- `error` - #D55E00 (Vermillion)
- `warning` - #E69F00 (Orange)
- `info` - #0072B2 (Blue)

**Background Colors:**
- `background-white` - #FFFFFF
- `background-light` - #F9FAFB
- `background-offwhite` - #F5F7FA

### Spacing Scale

```typescript
micro: 4px
tiny: 8px
small: 12px
default: 16px
medium: 20px
large: 24px
xl: 32px
xxl: 40px
xxxl: 48px
```

### Typography Scale

**Headings:**
- `h1` - 32px / 700 weight
- `h2` - 28px / 600 weight
- `h3` - 24px / 600 weight
- `h4` - 20px / 500 weight
- `h5` - 18px / 500 weight

**Body:**
- `body-large` - 17px
- `body` - 15px (default)
- `body-small` - 13px

**Special:**
- `caption` - 12px / 500 weight
- `button-text` - 16px / 500 weight

### Border Radius

```typescript
card: 12px
button: 8px
input: 8px
modal: 16px
fab: 28px
```

---

## Best Practices

### 1. Touch Targets

Always ensure touch targets meet minimum size requirements:

```typescript
// ✅ Good - Use lg size for mobile primary actions
<Button size="lg">Submit</Button>

// ❌ Bad - sm size on mobile
<Button size="sm">Submit</Button>
```

### 2. Semantic Colors

Use semantic color variants instead of custom classes:

```typescript
// ✅ Good - Semantic variant
<Button variant="danger">Delete</Button>

// ❌ Bad - Custom styling
<Button className="bg-red-500">Delete</Button>
```

### 3. Error Handling

Always provide error messages for form inputs:

```typescript
// ✅ Good - Clear error message
<Input
  label="Email"
  error={errors.email?.message}
/>

// ❌ Bad - No error feedback
<Input label="Email" />
```

### 4. Loading States

Use Skeleton components for loading content:

```typescript
// ✅ Good - Skeleton loading
{isLoading ? (
  <SkeletonGroup count={5} />
) : (
  <List items={data} />
)}

// ❌ Bad - No loading state
<List items={data} />
```

### 5. Responsive Design

Use responsive size props for different screen sizes:

```typescript
// ✅ Good - Responsive grid
<Grid cols={{ sm: 1, md: 2, lg: 3 }}>

// ❌ Bad - Fixed layout
<Grid cols={3}>
```

### 6. Accessibility

Always provide proper labels and ARIA attributes:

```typescript
// ✅ Good - Proper label
<Input label="Username" required />

// ❌ Bad - No label
<Input placeholder="Enter username" />
```

---

## Performance Tips

1. **Import only what you need:**
   ```typescript
   // ✅ Good
   import { Button, Input } from '@siteproof/design-system';

   // ❌ Bad
   import * as DS from '@siteproof/design-system';
   ```

2. **Use lazy loading for modals:**
   ```typescript
   const Modal = lazy(() => import('@siteproof/design-system').then(m => ({ default: m.Modal })));
   ```

3. **Memoize callbacks:**
   ```typescript
   const handleClick = useCallback(() => {
     // handler
   }, [dependencies]);
   ```

---

## TypeScript Support

All components are fully typed with TypeScript:

```typescript
import type { ButtonProps, InputProps } from '@siteproof/design-system';

// Extend props
interface CustomButtonProps extends ButtonProps {
  customProp?: string;
}

// Type-safe usage
const MyButton: React.FC<CustomButtonProps> = (props) => {
  return <Button {...props} />;
};
```

---

## Animation

Components use Framer Motion for animations. You can customize animations:

```typescript
<Button
  whileHover={{ scale: 1.05 }}
  whileTap={{ scale: 0.95 }}
>
  Custom Animation
</Button>
```

---

## Support & Resources

- **Documentation:** `/docs/design-system`
- **Storybook:** [Live component explorer]
- **GitHub:** [Repository link]
- **Design Figma:** [Figma link]

For questions or issues, contact the design system team.

---

## Version History

**v1.0.0** - Initial release
- 25+ production-ready components
- Full TypeScript support
- WCAG 2.1 AA compliance
- Mobile-first responsive design
- Dark mode ready (future)
