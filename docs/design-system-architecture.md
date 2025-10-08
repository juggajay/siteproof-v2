# SiteProof v2 Design System Architecture

**Document Version:** 1.0
**Date:** 2025-10-08
**Status:** Proposal
**Author:** System Architecture Team

---

## Executive Summary

This document outlines a comprehensive design system overhaul for SiteProof v2, a construction management B2B SaaS platform. The proposal focuses on creating a scalable, maintainable, and performant component library that supports offline-first PWA requirements, complex forms, and mobile-first experiences.

### Key Objectives

1. **Consolidate Component Architecture**: Merge duplicate components from `apps/web/src/components/ui` and `packages/design-system/src/components`
2. **Establish Single Source of Truth**: Create authoritative design tokens and component APIs
3. **Optimize Performance**: Bundle size optimization, tree-shaking, and code-splitting strategies
4. **Enable Scalability**: Support team growth and feature expansion
5. **Maintain Backward Compatibility**: Phased migration without breaking existing features

---

## 1. Current State Analysis

### 1.1 Existing Architecture

```
siteproof-v2/
├── apps/
│   └── web/                        # Next.js 14 App Router
│       ├── src/
│       │   ├── app/               # Route handlers
│       │   ├── components/        # Feature-specific components
│       │   │   ├── ui/           # ⚠️ DUPLICATE: Local UI components
│       │   │   ├── dashboard/
│       │   │   ├── diary/
│       │   │   ├── itp/
│       │   │   └── ...
│       │   ├── features/          # Feature modules
│       │   │   ├── auth/
│       │   │   ├── inspections/
│       │   │   ├── ncr/
│       │   │   └── ...
│       │   ├── lib/              # Utilities
│       │   └── styles/           # Global CSS
│       └── tailwind.config.js    # Inherits from design-system
│
└── packages/
    ├── design-system/             # Shared component library
    │   ├── src/
    │   │   ├── components/       # ⚠️ DUPLICATE: Design system components
    │   │   │   ├── ui/
    │   │   │   ├── layout/
    │   │   │   └── ...
    │   │   ├── hooks/
    │   │   └── utils/
    │   └── tailwind.config.js    # Design tokens
    ├── config/                    # Shared config
    └── database/                  # Database types
```

### 1.2 Key Issues Identified

1. **Component Duplication**:
   - `Button.tsx` exists in both `apps/web/src/components/ui` and `packages/design-system/src/components/ui`
   - Different implementations with inconsistent APIs
   - Design system version uses Framer Motion, web version uses plain HTML

2. **Inconsistent Styling Approach**:
   - Mix of Tailwind classes, CSS modules, and inline styles
   - Global CSS files: `siteproof-design-system.css`, `design-tokens.css`, `mobile-optimizations.css`
   - Unclear precedence and overrides

3. **Token Management**:
   - Design tokens defined in `packages/design-system/tailwind.config.js`
   - Custom colors don't follow Tailwind naming conventions
   - Limited semantic token structure

4. **Type Safety Gaps**:
   - Inconsistent component prop types
   - Missing compound component patterns
   - Limited polymorphic component support

5. **Bundle Size Concerns**:
   - Framer Motion included but not tree-shaken effectively
   - All icons imported from lucide-react without optimization
   - No component-level code splitting

6. **Testing Gaps**:
   - Limited component tests (only 2 found in features)
   - No visual regression testing
   - No accessibility testing infrastructure

### 1.3 Technology Stack

**Current Dependencies:**

- **Framework**: Next.js 14 (App Router), React 18
- **Styling**: Tailwind CSS 3.4, clsx, tailwind-merge
- **Animation**: Framer Motion 11.0
- **Icons**: Lucide React 0.323
- **Forms**: React Hook Form 7.49, Zod 3.22
- **Build**: pnpm workspace, TypeScript 5.3

**Statistics:**

- **Total TSX Files**: 178 files
- **UI Component LOC**: ~1,215 lines
- **Design System Components**: 20+ components

---

## 2. Proposed Architecture

### 2.1 High-Level Design

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
│  (apps/web/src/app, apps/web/src/features)                 │
│                                                             │
│  - Page Components                                          │
│  - Feature Modules                                          │
│  - Business Logic                                           │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ imports
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Composition Layer                              │
│  (apps/web/src/components)                                  │
│                                                             │
│  - Feature-Specific Composed Components                    │
│  - Business Domain Components                              │
│  - Complex Patterns                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 │ imports
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           Design System Package                             │
│  (@siteproof/design-system)                                 │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Primitives (Atoms)                                  │  │
│  │  - Button, Input, Checkbox, Radio, Badge            │  │
│  │  - Typography, Icon, Spinner, Avatar                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Molecules                                           │  │
│  │  - FormField, Select, DatePicker, FileUpload        │  │
│  │  - Card, Alert, Toast, Tooltip                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Organisms                                           │  │
│  │  - Modal, Drawer, Navigation, Table                 │  │
│  │  - Form, EmptyState, ErrorBoundary                  │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Layout Components                                   │  │
│  │  - Grid, Stack, Container, Section                  │  │
│  │  - PageLayout, TopNav, BottomNav, Sidebar          │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Hooks & Utilities                                   │  │
│  │  - useToast, useModal, useMediaQuery                │  │
│  │  - cn(), formatters, validators                     │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  Design Tokens                                       │  │
│  │  - Colors, Typography, Spacing, Shadows             │  │
│  │  - Breakpoints, Animations, Z-Index                 │  │
│  └─────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Package Structure

```
packages/design-system/
├── src/
│   ├── components/
│   │   ├── primitives/           # Atomic components
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.types.ts
│   │   │   │   ├── Button.test.tsx
│   │   │   │   ├── Button.stories.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Badge/
│   │   │   └── index.ts
│   │   │
│   │   ├── molecules/            # Composed components
│   │   │   ├── FormField/
│   │   │   ├── Select/
│   │   │   ├── Card/
│   │   │   └── index.ts
│   │   │
│   │   ├── organisms/            # Complex components
│   │   │   ├── Modal/
│   │   │   ├── Table/
│   │   │   ├── Navigation/
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/               # Layout primitives
│   │   │   ├── Grid/
│   │   │   ├── Stack/
│   │   │   ├── PageLayout/
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts              # Public API
│   │
│   ├── hooks/                    # Shared hooks
│   │   ├── useToast.ts
│   │   ├── useModal.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useKeyboardShortcut.ts
│   │   └── index.ts
│   │
│   ├── utils/                    # Utility functions
│   │   ├── cn.ts                # Class name merger
│   │   ├── formatters.ts        # Date, currency, etc.
│   │   ├── validators.ts        # Form validators
│   │   └── index.ts
│   │
│   ├── tokens/                   # Design tokens
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   ├── animations.ts
│   │   └── index.ts
│   │
│   ├── providers/                # Context providers
│   │   ├── ThemeProvider.tsx
│   │   ├── ToastProvider.tsx
│   │   └── index.ts
│   │
│   └── index.ts                  # Main entry point
│
├── tailwind.config.js            # Tailwind preset
├── postcss.config.js
├── tsconfig.json
├── package.json
└── README.md
```

### 2.3 Component API Design

#### 2.3.1 Polymorphic Component Pattern

```typescript
// packages/design-system/src/components/primitives/Button/Button.types.ts

import { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';

export type ButtonSize = 'sm' | 'md' | 'lg';

type PolymorphicProps<E extends ElementType> = {
  as?: E;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  children: ReactNode;
} & ComponentPropsWithoutRef<E>;

export type ButtonProps<E extends ElementType = 'button'> = PolymorphicProps<E>;
```

#### 2.3.2 Compound Component Pattern

```typescript
// packages/design-system/src/components/molecules/Select/Select.tsx

export const Select = {
  Root: SelectRoot,
  Trigger: SelectTrigger,
  Content: SelectContent,
  Item: SelectItem,
  Group: SelectGroup,
  Label: SelectLabel,
  Separator: SelectSeparator,
};

// Usage:
<Select.Root>
  <Select.Trigger>
    <Select.Value placeholder="Select option" />
  </Select.Trigger>
  <Select.Content>
    <Select.Item value="1">Option 1</Select.Item>
    <Select.Item value="2">Option 2</Select.Item>
  </Select.Content>
</Select.Root>
```

#### 2.3.3 Composable Variants with CVA (Class Variance Authority)

```typescript
// Alternative approach using CVA for variant management
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  // base styles
  'inline-flex items-center justify-center font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        primary: 'bg-primary-blue text-white hover:bg-blue-600 shadow-button',
        secondary: 'bg-white text-primary-blue border-2 border-primary-blue hover:bg-blue-50',
        ghost: 'bg-transparent hover:bg-secondary-light-gray',
        danger: 'bg-error text-white hover:bg-error-dark',
      },
      size: {
        sm: 'h-10 px-4 text-sm rounded-lg',
        md: 'h-12 px-6 text-base rounded-lg',
        lg: 'h-14 px-8 text-lg rounded-xl',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}
```

### 2.4 Design Token System

#### 2.4.1 Token Structure

```typescript
// packages/design-system/src/tokens/colors.ts

export const colors = {
  // Semantic tokens (preferred)
  primary: {
    DEFAULT: '#2196F3',
    light: '#4A90E2',
    dark: '#1976D2',
    contrast: '#FFFFFF',
  },

  // Status colors (colorblind-safe)
  success: {
    DEFAULT: '#117733', // Okabe-Ito bluish green
    light: '#4CAF50',
    dark: '#0D5E28',
  },
  error: {
    DEFAULT: '#D55E00', // Okabe-Ito vermillion
    light: '#EF5350',
    dark: '#AA4A00',
  },
  warning: {
    DEFAULT: '#E69F00', // Okabe-Ito orange
    light: '#FFB74D',
    dark: '#B87F00',
  },
  info: {
    DEFAULT: '#0072B2', // Okabe-Ito blue
    light: '#42A5F5',
    dark: '#005A8C',
  },

  // Neutral colors
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;
```

#### 2.4.2 Tailwind Configuration

```javascript
// packages/design-system/tailwind.config.js

const { colors } = require('./src/tokens/colors');
const { spacing } = require('./src/tokens/spacing');
const { typography } = require('./src/tokens/typography');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: colors.primary,
        success: colors.success,
        error: colors.error,
        warning: colors.warning,
        info: colors.info,
      },
      spacing: spacing,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,

      // Component-specific tokens
      borderRadius: {
        button: '0.5rem',
        card: '0.75rem',
        modal: '1rem',
        input: '0.5rem',
      },

      boxShadow: {
        button: '0 2px 4px rgba(33, 150, 243, 0.2)',
        'button-hover': '0 4px 8px rgba(33, 150, 243, 0.3)',
        card: '0 1px 3px rgba(0, 0, 0, 0.1)',
        'card-hover': '0 4px 6px rgba(0, 0, 0, 0.1)',
      },

      // Accessibility
      minHeight: {
        touch: '44px', // WCAG AA minimum touch target
        'touch-large': '56px',
      },

      // Animation
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },

      // Z-index scale
      zIndex: {
        dropdown: '10',
        sticky: '20',
        nav: '30',
        modal: '40',
        toast: '50',
      },
    },
  },
  plugins: [],
};
```

### 2.5 Styling Strategy

**Recommendation: Tailwind-First with CSS Variables for Theming**

#### Rationale:

1. ✅ Already adopted across codebase
2. ✅ Excellent tree-shaking and bundle optimization
3. ✅ Built-in responsive design utilities
4. ✅ Supports Server Components (no runtime CSS-in-JS)
5. ✅ Easy to override at consumer level

#### Implementation:

```css
/* packages/design-system/src/styles/tokens.css */

@layer base {
  :root {
    /* Colors */
    --color-primary: 33 150 243; /* RGB for opacity support */
    --color-success: 17 119 51;
    --color-error: 213 94 0;

    /* Spacing */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;

    /* Typography */
    --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto';
  }

  [data-theme='dark'] {
    --color-primary: 66 165 245;
    /* ... dark mode overrides */
  }
}
```

```typescript
// Tailwind classes reference CSS variables
className = 'bg-[rgb(var(--color-primary))] text-white';
```

### 2.6 Server Component Compatibility

**Strategy for Next.js App Router:**

1. **Default to Server Components**:

   ```typescript
   // packages/design-system/src/components/primitives/Button/Button.tsx
   // NO 'use client' directive unless needed

   import { cn } from '../../../utils/cn';

   export function Button({ className, variant = 'primary', ...props }) {
     return (
       <button
         className={cn(buttonVariants({ variant }), className)}
         {...props}
       />
     );
   }
   ```

2. **Explicit Client Components** (when needed):

   ```typescript
   // packages/design-system/src/components/molecules/Select/Select.tsx
   'use client'; // Uses useState, event handlers

   import { useState } from 'react';

   export function Select({ options, onChange }) {
     const [isOpen, setIsOpen] = useState(false);
     // ... client-side logic
   }
   ```

3. **Composition Pattern**:

   ```typescript
   // Server component using client component
   import { Button } from '@siteproof/design-system';
   import { ClientInteractiveWrapper } from './ClientWrapper';

   export default function ServerPage() {
     return (
       <div>
         <Button variant="primary">Static Button</Button>
         <ClientInteractiveWrapper>
           {/* Client-only interactions */}
         </ClientInteractiveWrapper>
       </div>
     );
   }
   ```

### 2.7 Animation Strategy

**Recommendation: Minimize Framer Motion, Prefer CSS/Tailwind Animations**

#### Current Issue:

- Framer Motion adds ~40KB gzipped to bundle
- Forces components to be client-side
- Overkill for most UI animations

#### Proposed Approach:

1. **CSS Animations for Simple Cases** (90% of use cases):

   ```typescript
   <button className="transition-all duration-200 hover:scale-105 active:scale-95">
     Click me
   </button>
   ```

2. **Framer Motion Only for Complex Animations**:
   - Page transitions
   - Drag-and-drop interfaces (already using @dnd-kit)
   - Spring physics animations
   - Gesture-based interactions

3. **Lazy Load Framer Motion**:
   ```typescript
   const { motion } = await import('framer-motion');
   ```

### 2.8 Icon System

**Current Issue**: lucide-react bundle includes all icons

**Optimization**:

```typescript
// ❌ Bad: Imports entire library
import { User, Settings, Home } from 'lucide-react';

// ✅ Good: Tree-shakeable imports
import User from 'lucide-react/dist/esm/icons/user';
import Settings from 'lucide-react/dist/esm/icons/settings';

// ✅ Better: Icon wrapper component
// packages/design-system/src/components/primitives/Icon/Icon.tsx
import { lazy, Suspense } from 'react';

const iconMap = {
  user: lazy(() => import('lucide-react/dist/esm/icons/user')),
  settings: lazy(() => import('lucide-react/dist/esm/icons/settings')),
  // ... only icons actually used
};

export function Icon({ name, ...props }) {
  const IconComponent = iconMap[name];
  return (
    <Suspense fallback={<div className="w-5 h-5" />}>
      <IconComponent {...props} />
    </Suspense>
  );
}
```

---

## 3. Migration Strategy

### 3.1 Phased Rollout

#### Phase 1: Foundation (Week 1-2)

**Goal**: Establish design system infrastructure

- [ ] Set up Storybook in `packages/design-system`
- [ ] Create design token files (`colors.ts`, `spacing.ts`, etc.)
- [ ] Implement `Button` component as reference implementation
  - Complete with tests, stories, types
  - Document API and usage patterns
- [ ] Set up visual regression testing (Chromatic or Percy)
- [ ] Create migration guide documentation

**Deliverables**:

- ✅ Working Storybook instance
- ✅ 1 fully implemented component (Button)
- ✅ Testing infrastructure
- ✅ Developer documentation

#### Phase 2: Core Primitives (Week 3-4)

**Goal**: Migrate atomic components

- [ ] Migrate primitives:
  - Input, Textarea
  - Checkbox, Radio
  - Badge, Avatar
  - Typography components
- [ ] Create compound components:
  - FormField (Label + Input + Error)
  - Select (with keyboard navigation)
- [ ] Implement accessibility testing
- [ ] Set up bundle size monitoring

**Deliverables**:

- ✅ 10+ primitive components
- ✅ Accessibility audit passing
- ✅ Bundle size baseline

#### Phase 3: Molecules & Organisms (Week 5-6)

**Goal**: Complex composed components

- [ ] Migrate molecules:
  - Card, Alert, Toast
  - Modal, Drawer
  - Table (with sorting, pagination)
- [ ] Migrate organisms:
  - Navigation (TopNav, BottomNav)
  - Forms (with validation)
  - EmptyState, ErrorBoundary

**Deliverables**:

- ✅ 15+ molecule/organism components
- ✅ Form validation patterns
- ✅ Error handling patterns

#### Phase 4: Layout & Utilities (Week 7)

**Goal**: Layout primitives and developer experience

- [ ] Layout components:
  - Grid, Stack, Container
  - PageLayout with responsive behavior
- [ ] Hooks:
  - useToast, useModal, useMediaQuery
  - useKeyboardShortcut, useClickOutside
- [ ] Enhanced TypeScript types
- [ ] Performance optimizations

**Deliverables**:

- ✅ Complete layout system
- ✅ Developer utility hooks
- ✅ Performance benchmarks

#### Phase 5: Application Migration (Week 8-10)

**Goal**: Migrate `apps/web` to use new design system

- [ ] Create codemods for automated migration
- [ ] Migrate one feature at a time:
  1. Dashboard (high visibility, low complexity)
  2. Inspections (complex forms)
  3. ITPs (dynamic forms)
  4. NCRs (file uploads, signatures)
  5. Diary (date pickers, rich inputs)
- [ ] Remove old component implementations
- [ ] Update documentation

**Deliverables**:

- ✅ 100% migration to new components
- ✅ Zero legacy components in `apps/web/src/components/ui`
- ✅ Updated documentation

#### Phase 6: Optimization & Polish (Week 11-12)

**Goal**: Performance and DX improvements

- [ ] Bundle size optimization
- [ ] Code splitting implementation
- [ ] Dark mode support
- [ ] Animation performance audit
- [ ] Developer documentation
- [ ] Component API stabilization

**Deliverables**:

- ✅ <5% bundle size increase
- ✅ Dark mode support
- ✅ Complete documentation
- ✅ v1.0.0 release

### 3.2 Backward Compatibility Strategy

#### Coexistence Pattern

```typescript
// apps/web/src/components/ui/Button.tsx (legacy)
// DEPRECATED: Use @siteproof/design-system instead

import { Button as DSButton } from '@siteproof/design-system';

/**
 * @deprecated Use Button from @siteproof/design-system
 * This wrapper exists for backward compatibility only
 */
export const Button = DSButton;
```

#### Feature Flags

```typescript
// apps/web/src/config/features.ts

export const FEATURE_FLAGS = {
  USE_NEW_DESIGN_SYSTEM: process.env.NEXT_PUBLIC_USE_NEW_DS === 'true',
} as const;

// Usage
import { FEATURE_FLAGS } from '@/config/features';
import { Button as LegacyButton } from '@/components/ui/Button';
import { Button as NewButton } from '@siteproof/design-system';

const Button = FEATURE_FLAGS.USE_NEW_DESIGN_SYSTEM ? NewButton : LegacyButton;
```

#### Incremental Adoption

```typescript
// Allow gradual migration per feature
// apps/web/src/features/inspections/components/InspectionCard.tsx

import { Card, Button } from '@siteproof/design-system'; // New
import { Badge } from '@/components/ui/Badge'; // Old (not migrated yet)
```

---

## 4. Testing Strategy

### 4.1 Component Testing Pyramid

```
        /\
       /  \
      / E2E\ (10%)
     /______\
    /        \
   /Integration\ (30%)
  /____________\
 /              \
/  Unit + Visual \ (60%)
/__________________\
```

### 4.2 Unit Testing

**Framework**: Vitest + React Testing Library

```typescript
// packages/design-system/src/components/primitives/Button/Button.test.tsx

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders with correct variant styles', () => {
    render(<Button variant="primary">Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-primary-blue');
  });

  it('calls onClick handler when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('disables interactions when loading', () => {
    render(<Button loading>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('supports polymorphic "as" prop', () => {
    render(<Button as="a" href="/link">Link Button</Button>);
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});
```

### 4.3 Visual Regression Testing

**Tool**: Chromatic (or Percy)

```typescript
// packages/design-system/src/components/primitives/Button/Button.stories.tsx

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Primitives/Button',
  component: Button,
  parameters: {
    chromatic: { viewports: [320, 1200] },  // Mobile + Desktop
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-end gap-4">
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="lg">Large</Button>
    </div>
  ),
};

export const LoadingStates: Story = {
  render: () => (
    <div className="space-x-4">
      <Button loading>Loading</Button>
      <Button loading variant="secondary">Loading</Button>
    </div>
  ),
};
```

### 4.4 Accessibility Testing

**Tools**: jest-axe + manual testing

```typescript
// packages/design-system/src/components/primitives/Button/Button.a11y.test.tsx

import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './Button';

expect.extend(toHaveNoViolations);

describe('Button Accessibility', () => {
  it('should not have accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('has sufficient color contrast', async () => {
    const { container } = render(<Button variant="primary">Primary</Button>);
    const results = await axe(container, {
      rules: {
        'color-contrast': { enabled: true },
      },
    });
    expect(results).toHaveNoViolations();
  });

  it('supports keyboard navigation', () => {
    render(<Button>Keyboard accessible</Button>);
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });
});
```

### 4.5 Integration Testing

**Framework**: Playwright (already configured)

```typescript
// apps/web/tests/e2e/design-system.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Design System Integration', () => {
  test('form submission with new components', async ({ page }) => {
    await page.goto('/inspections/new');

    // Fill form using new design system components
    await page.getByLabel('Inspection Title').fill('Test Inspection');
    await page.getByRole('button', { name: 'Submit' }).click();

    // Verify success
    await expect(page.getByText('Inspection created')).toBeVisible();
  });

  test('mobile navigation works correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    // Click bottom nav
    await page.getByRole('button', { name: 'Projects' }).click();
    await expect(page).toHaveURL('/projects');
  });
});
```

---

## 5. Performance Optimization

### 5.1 Bundle Size Strategy

#### Target Metrics:

- **Design System Package**: <50KB gzipped
- **First Load JS**: <100KB (Next.js recommendation)
- **Incremental**: <20KB per route

#### Optimization Techniques:

**1. Tree-Shaking**

```typescript
// ✅ Good: Named exports enable tree-shaking
export { Button } from './Button';
export { Input } from './Input';

// ❌ Bad: Default export of object
export default {
  Button,
  Input,
};
```

**2. Code Splitting**

```typescript
// packages/design-system/src/components/index.ts

// Primitives (always included)
export * from './primitives/Button';
export * from './primitives/Input';

// Complex components (lazy-loaded)
export const Modal = lazy(() => import('./organisms/Modal'));
export const Table = lazy(() => import('./organisms/Table'));
```

**3. Dynamic Imports**

```typescript
// apps/web/src/app/inspections/[id]/page.tsx

// Load complex components only when needed
const InspectionPDFExport = dynamic(
  () => import('@/features/inspections/components/PDFExport'),
  { ssr: false } // Client-only, don't need server render
);
```

**4. Bundle Analysis**

```json
// apps/web/package.json

{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "bundle:check": "pnpm build && bundlesize"
  },
  "bundlesize": [
    {
      "path": ".next/static/chunks/*.js",
      "maxSize": "100kb"
    }
  ]
}
```

### 5.2 Runtime Performance

#### 1. Memoization

```typescript
// Expensive component re-renders
import { memo } from 'react';

export const ExpensiveCard = memo(function ExpensiveCard({ data }) {
  // Complex rendering logic
  return <div>...</div>;
});
```

#### 2. Virtual Scrolling

```typescript
// For long lists (inspections, lots, etc.)
import { useVirtualizer } from '@tanstack/react-virtual';

export function InspectionList({ items }) {
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100,
  });

  return (
    <div ref={parentRef}>
      {virtualizer.getVirtualItems().map(virtualRow => (
        <InspectionCard key={virtualRow.index} {...items[virtualRow.index]} />
      ))}
    </div>
  );
}
```

#### 3. Intersection Observer

```typescript
// Lazy load images and heavy components
import { useInView } from 'react-intersection-observer';

export function InspectionImage({ src }) {
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <div ref={ref}>
      {inView ? <img src={src} /> : <Skeleton />}
    </div>
  );
}
```

### 5.3 CSS Optimization

#### PurgeCSS Configuration

```javascript
// packages/design-system/tailwind.config.js

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    '../../apps/web/src/**/*.{js,ts,jsx,tsx}', // Scan consumer app
  ],
  safelist: [
    // Dynamic classes that PurgeCSS might remove
    'bg-success',
    'bg-error',
    'bg-warning',
  ],
};
```

### 5.4 Offline-First Considerations

**Service Worker Strategy**:

```typescript
// apps/web/public/sw.js

// Cache design system assets aggressively
const DESIGN_SYSTEM_CACHE = 'ds-v1';

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/_next/static/')) {
    event.respondWith(
      caches.open(DESIGN_SYSTEM_CACHE).then((cache) =>
        cache.match(event.request).then(
          (response) =>
            response ||
            fetch(event.request).then((fetchResponse) => {
              cache.put(event.request, fetchResponse.clone());
              return fetchResponse;
            })
        )
      )
    );
  }
});
```

---

## 6. Accessibility Architecture

### 6.1 WCAG 2.1 AA Compliance

#### Key Requirements:

1. **Color Contrast**: 4.5:1 for normal text, 3:1 for large text
2. **Touch Targets**: Minimum 44x44px (preferably 48x48px)
3. **Keyboard Navigation**: All interactive elements accessible via keyboard
4. **Screen Reader Support**: Proper ARIA labels and roles
5. **Focus Management**: Visible focus indicators

### 6.2 Implementation Checklist

```typescript
// packages/design-system/src/components/primitives/Button/Button.tsx

export function Button({
  children,
  disabled,
  loading,
  ariaLabel,
  ...props
}: ButtonProps) {
  return (
    <button
      // 1. Semantic HTML
      type="button"

      // 2. ARIA attributes
      aria-label={ariaLabel}
      aria-disabled={disabled || loading}
      aria-busy={loading}

      // 3. Minimum touch target (48px)
      className={cn(
        'min-h-[48px] min-w-[88px]',  // Google Material Design Guidelines
        // ... other classes
      )}

      // 4. Disabled state
      disabled={disabled || loading}

      // 5. Focus visible (Tailwind)
      className={cn(
        'focus-visible:outline-none',
        'focus-visible:ring-2',
        'focus-visible:ring-primary',
        'focus-visible:ring-offset-2',
      )}

      {...props}
    >
      {loading && (
        <span className="sr-only">Loading...</span>  // 6. Screen reader text
      )}
      {children}
    </button>
  );
}
```

### 6.3 Keyboard Navigation Patterns

#### Modal Component Example:

```typescript
export function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // 1. Focus trap
    const focusableElements = modalRef.current?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0] as HTMLElement;
    const lastElement = focusableElements?.[focusableElements.length - 1] as HTMLElement;

    firstElement?.focus();

    // 2. Tab key cycling
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // 3. Escape key to close
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleTab);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleTab);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {children}
    </div>
  );
}
```

---

## 7. Documentation Strategy

### 7.1 Documentation Hierarchy

```
Documentation/
├── README.md                    # Quick start
├── GETTING_STARTED.md          # Installation & setup
├── MIGRATION_GUIDE.md          # Legacy → New DS
├── DESIGN_PRINCIPLES.md        # Design philosophy
├── CONTRIBUTING.md             # Contributor guide
│
├── components/                 # Per-component docs
│   ├── Button.md
│   ├── Input.md
│   └── ...
│
├── patterns/                   # Common patterns
│   ├── forms.md
│   ├── layouts.md
│   └── ...
│
└── api/                        # API reference
    ├── hooks.md
    ├── utilities.md
    └── tokens.md
```

### 7.2 Component Documentation Template

```markdown
# Button

A versatile button component supporting multiple variants, sizes, and states.

## Import

\`\`\`typescript
import { Button } from '@siteproof/design-system';
\`\`\`

## Usage

\`\`\`tsx
<Button variant="primary" size="md" onClick={handleClick}>
Click me
</Button>
\`\`\`

## Props

| Prop      | Type                                            | Default   | Description             |
| --------- | ----------------------------------------------- | --------- | ----------------------- |
| variant   | 'primary' \| 'secondary' \| 'ghost' \| 'danger' | 'primary' | Visual style variant    |
| size      | 'sm' \| 'md' \| 'lg'                            | 'md'      | Button size             |
| loading   | boolean                                         | false     | Shows loading spinner   |
| fullWidth | boolean                                         | false     | Makes button full width |
| leftIcon  | ReactNode                                       | -         | Icon on the left        |
| rightIcon | ReactNode                                       | -         | Icon on the right       |

## Examples

### With Icons

\`\`\`tsx
<Button leftIcon={<User />}>Profile</Button>
\`\`\`

### Loading State

\`\`\`tsx
<Button loading>Submitting...</Button>
\`\`\`

### As Link

\`\`\`tsx
<Button as="a" href="/dashboard">Go to Dashboard</Button>
\`\`\`

## Accessibility

- Minimum touch target: 48x48px
- Keyboard accessible
- ARIA attributes for screen readers
- Focus visible indicator

## Design Tokens

- Primary color: `--color-primary`
- Border radius: `--border-radius-button`
- Shadow: `--shadow-button`
```

### 7.3 Storybook Integration

**Configuration**:

```typescript
// packages/design-system/.storybook/main.ts

import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-a11y', // Accessibility testing
    '@storybook/addon-interactions', // Interaction testing
  ],
  framework: '@storybook/react-vite',
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

---

## 8. Risk Assessment & Mitigation

### 8.1 Technical Risks

| Risk                              | Impact | Probability | Mitigation                                                                        |
| --------------------------------- | ------ | ----------- | --------------------------------------------------------------------------------- |
| **Bundle size increases**         | High   | Medium      | - Bundle analysis in CI<br>- Lazy loading strategy<br>- Tree-shaking verification |
| **Breaking changes in migration** | High   | Medium      | - Comprehensive testing<br>- Feature flags<br>- Gradual rollout                   |
| **Performance regression**        | High   | Low         | - Lighthouse CI<br>- Performance budgets<br>- Baseline benchmarks                 |
| **Accessibility violations**      | Medium | Medium      | - Automated a11y testing<br>- Manual audits<br>- Screen reader testing            |
| **TypeScript compilation errors** | Medium | Low         | - Strict type checking<br>- Incremental migration<br>- Type tests                 |
| **Developer adoption resistance** | Medium | Medium      | - Clear documentation<br>- Migration guide<br>- Pair programming sessions         |

### 8.2 Mitigation Strategies

#### 1. Continuous Integration Checks

```yaml
# .github/workflows/design-system.yml

name: Design System CI

on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm --filter @siteproof/design-system test
      - run: pnpm --filter @siteproof/design-system build

  bundle-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm --filter @siteproof/design-system build
      - uses: andresz1/size-limit-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}

  accessibility:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: pnpm install
      - run: pnpm --filter @siteproof/design-system storybook:build
      - uses: chromaui/action@v1
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          projectToken: ${{ secrets.CHROMATIC_TOKEN }}
```

#### 2. Performance Budgets

```json
// packages/design-system/package.json

{
  "size-limit": [
    {
      "name": "Entire library",
      "path": "dist/index.js",
      "limit": "50 KB"
    },
    {
      "name": "Button only",
      "path": "dist/components/primitives/Button.js",
      "limit": "5 KB"
    }
  ]
}
```

#### 3. Rollback Plan

```typescript
// Emergency rollback capability

// apps/web/.env.local
NEXT_PUBLIC_USE_LEGACY_COMPONENTS = true;

// apps/web/src/components/ComponentFactory.tsx
import { FEATURE_FLAGS } from '@/config/features';

export const getButton = () => {
  if (FEATURE_FLAGS.USE_LEGACY_COMPONENTS) {
    return require('./legacy/Button').Button;
  }
  return require('@siteproof/design-system').Button;
};
```

---

## 9. Success Metrics

### 9.1 Key Performance Indicators (KPIs)

| Metric                           | Baseline | Target | Measurement             |
| -------------------------------- | -------- | ------ | ----------------------- |
| **Bundle Size**                  | 250KB    | <260KB | Webpack bundle analyzer |
| **First Contentful Paint (FCP)** | 1.2s     | <1.0s  | Lighthouse CI           |
| **Time to Interactive (TTI)**    | 3.5s     | <3.0s  | Lighthouse CI           |
| **Component Reuse Rate**         | 40%      | >80%   | Code analysis           |
| **Accessibility Score**          | 85       | >95    | axe DevTools            |
| **Developer Satisfaction**       | N/A      | >4/5   | Survey                  |
| **Build Time**                   | 45s      | <50s   | CI metrics              |

### 9.2 Acceptance Criteria

**Phase 1-4 Complete**:

- ✅ 30+ components documented in Storybook
- ✅ 90% test coverage for design system
- ✅ Zero critical accessibility violations
- ✅ Bundle size <50KB gzipped

**Phase 5-6 Complete**:

- ✅ 100% migration of `apps/web` to new components
- ✅ Zero legacy components remaining
- ✅ Performance metrics met or exceeded
- ✅ Developer documentation complete
- ✅ Dark mode support implemented

---

## 10. Technology Recommendations

### 10.1 Recommended Tools

#### 1. Storybook (Component Documentation)

**Recommendation**: ✅ Adopt

**Rationale**:

- Industry standard for component libraries
- Excellent documentation and testing capabilities
- Supports accessibility testing via @storybook/addon-a11y
- Visual regression testing integration

#### 2. CVA (Class Variance Authority)

**Recommendation**: ✅ Adopt

**Rationale**:

- Type-safe variant management
- Better than manual className concatenation
- Excellent TypeScript inference
- Small bundle size (~1KB)

**Alternative Considered**: Tailwind Variants (similar, but CVA has better TS support)

#### 3. Radix UI (Headless Components)

**Recommendation**: 🤔 Consider for Complex Components

**Rationale**:

- **Pros**:
  - Unstyled, accessible primitives
  - Keyboard navigation out-of-the-box
  - WCAG compliant
- **Cons**:
  - Additional dependency
  - Learning curve
  - May be overkill for simple components

**Recommendation**: Use for Select, Dropdown, Dialog, Tooltip (complex interaction patterns)

#### 4. Tailwind CSS IntelliSense

**Recommendation**: ✅ Required

**Configuration**:

```json
// .vscode/settings.json
{
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"],
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

#### 5. Changesets (Versioning)

**Recommendation**: ✅ Adopt

**Rationale**:

- Semantic versioning automation
- Changelog generation
- Works well with monorepos
- Used by major design systems (Radix, Chakra)

### 10.2 Avoid / Defer

| Tool                  | Recommendation | Rationale                                             |
| --------------------- | -------------- | ----------------------------------------------------- |
| **Styled Components** | ❌ Avoid       | Runtime CSS-in-JS incompatible with Server Components |
| **Emotion**           | ❌ Avoid       | Same as above                                         |
| **Material UI**       | ❌ Avoid       | Too opinionated, large bundle size                    |
| **Ant Design**        | ❌ Avoid       | Design language mismatch                              |
| **Tailwind UI**       | 🤔 Consider    | Paid product, but high-quality components             |

---

## 11. Implementation Roadmap

### 11.1 Gantt Chart (12 Weeks)

```
Week  1  2  3  4  5  6  7  8  9  10 11 12
      │  │  │  │  │  │  │  │  │  │  │  │
Phase 1: Foundation
████████
      │  │
Phase 2: Core Primitives
      ████████
         │  │  │
Phase 3: Molecules/Organisms
            ████████
               │  │  │
Phase 4: Layout & Utilities
                  ████
                     │  │  │  │  │
Phase 5: App Migration
                     ████████████
                              │  │  │
Phase 6: Optimization
                           ████████

Milestones:
●  Week 2: Storybook + First Component
●  Week 4: 10+ Primitives Complete
●  Week 6: Complex Components Done
●  Week 7: Layout System Ready
●  Week 10: Migration Complete
●  Week 12: v1.0.0 Release
```

### 11.2 Team Allocation

**Recommended Team Structure**:

- **Design System Lead** (1): Architecture, API design, reviews
- **Frontend Engineers** (2-3): Component implementation, testing
- **Designer** (0.5): Token definition, Storybook stories
- **QA Engineer** (0.5): Accessibility testing, visual regression

**Total Effort**: ~3-4 FTE over 12 weeks

---

## 12. Folder Structure (Final)

```
packages/design-system/
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── theme.ts
│
├── src/
│   ├── components/
│   │   ├── primitives/
│   │   │   ├── Button/
│   │   │   │   ├── Button.tsx
│   │   │   │   ├── Button.types.ts
│   │   │   │   ├── Button.test.tsx
│   │   │   │   ├── Button.stories.tsx
│   │   │   │   └── index.ts
│   │   │   ├── Input/
│   │   │   ├── Badge/
│   │   │   ├── Checkbox/
│   │   │   ├── Radio/
│   │   │   ├── Avatar/
│   │   │   ├── Icon/
│   │   │   ├── Spinner/
│   │   │   ├── Typography/
│   │   │   └── index.ts
│   │   │
│   │   ├── molecules/
│   │   │   ├── FormField/
│   │   │   ├── Select/
│   │   │   ├── DatePicker/
│   │   │   ├── Card/
│   │   │   ├── Alert/
│   │   │   ├── Toast/
│   │   │   ├── Tooltip/
│   │   │   └── index.ts
│   │   │
│   │   ├── organisms/
│   │   │   ├── Modal/
│   │   │   ├── Drawer/
│   │   │   ├── Table/
│   │   │   ├── Navigation/
│   │   │   ├── Form/
│   │   │   ├── EmptyState/
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/
│   │   │   ├── Grid/
│   │   │   ├── Stack/
│   │   │   ├── Container/
│   │   │   ├── Section/
│   │   │   ├── PageLayout/
│   │   │   ├── TopNav/
│   │   │   ├── BottomNav/
│   │   │   └── index.ts
│   │   │
│   │   └── index.ts
│   │
│   ├── hooks/
│   │   ├── useToast.ts
│   │   ├── useModal.ts
│   │   ├── useMediaQuery.ts
│   │   ├── useKeyboardShortcut.ts
│   │   ├── useClickOutside.ts
│   │   ├── useFocusTrap.ts
│   │   └── index.ts
│   │
│   ├── utils/
│   │   ├── cn.ts
│   │   ├── formatters.ts
│   │   ├── validators.ts
│   │   ├── accessibility.ts
│   │   └── index.ts
│   │
│   ├── tokens/
│   │   ├── colors.ts
│   │   ├── typography.ts
│   │   ├── spacing.ts
│   │   ├── shadows.ts
│   │   ├── animations.ts
│   │   ├── breakpoints.ts
│   │   ├── zIndex.ts
│   │   └── index.ts
│   │
│   ├── providers/
│   │   ├── ThemeProvider.tsx
│   │   ├── ToastProvider.tsx
│   │   └── index.ts
│   │
│   ├── styles/
│   │   ├── tokens.css
│   │   ├── reset.css
│   │   └── utilities.css
│   │
│   └── index.ts
│
├── docs/
│   ├── README.md
│   ├── GETTING_STARTED.md
│   ├── MIGRATION_GUIDE.md
│   └── components/
│       ├── Button.md
│       └── ...
│
├── .changeset/
│   └── config.json
│
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vitest.config.ts
├── package.json
└── README.md
```

---

## 13. Next Steps

### Immediate Actions (This Week)

1. **Get Stakeholder Buy-In**:
   - [ ] Review this document with engineering team
   - [ ] Present to product/design stakeholders
   - [ ] Approve timeline and resource allocation

2. **Setup Infrastructure**:
   - [ ] Install Storybook: `pnpm add -D @storybook/react-vite -w`
   - [ ] Install testing tools: `pnpm add -D vitest @testing-library/react jest-axe`
   - [ ] Create `.changeset` configuration

3. **Create Baseline**:
   - [ ] Run Lighthouse audit on current app
   - [ ] Measure current bundle size
   - [ ] Document current component inventory

4. **Kickoff Phase 1**:
   - [ ] Set up Storybook
   - [ ] Implement Button component (reference implementation)
   - [ ] Write comprehensive tests and documentation

---

## 14. Appendix

### A. Component Inventory

**Current Components** (packages/design-system/src/components):

- Badge ✅
- BottomNav ✅
- Card ✅
- FAB ✅
- ITPStatusButton ⚠️ (feature-specific, move to apps/web)
- Modal ✅
- ProgressIndicators ✅
- Select ✅
- Toast ✅
- TopNav ✅
- Button (ui/) ✅
- Checkbox (ui/) ✅
- Input (ui/) ✅
- Radio (ui/) ✅
- Skeleton (ui/) ✅

**Missing Components** (to implement):

- Textarea
- Avatar
- Tooltip
- Drawer
- Dropdown
- DatePicker
- FileUpload
- Table
- Pagination
- Tabs
- Accordion
- Breadcrumb
- EmptyState
- ErrorBoundary

### B. Design Token Specification

See `packages/design-system/tailwind.config.js` for current token definitions.

**Recommended Additions**:

- Semantic color tokens (e.g., `bg-surface`, `text-primary`, `border-default`)
- Elevation system (8dp increments for shadows/z-index)
- Motion tokens (easing functions, durations)

### C. Accessibility Checklist

- [ ] All interactive elements have minimum 44x44px touch targets
- [ ] Color contrast ratio meets WCAG AA (4.5:1 for text)
- [ ] All form inputs have associated labels
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus indicators are visible
- [ ] Screen reader announcements for dynamic content
- [ ] Skip links for main content
- [ ] Proper heading hierarchy
- [ ] ARIA landmarks used correctly
- [ ] Error messages are descriptive and programmatically associated

### D. Browser Support Matrix

| Browser        | Min Version | Notes                  |
| -------------- | ----------- | ---------------------- |
| Chrome         | 90+         | Evergreen              |
| Firefox        | 88+         | Evergreen              |
| Safari         | 14+         | iOS 14+                |
| Edge           | 90+         | Chromium-based         |
| Mobile Safari  | iOS 14+     | Primary mobile browser |
| Chrome Android | 90+         | PWA support            |

### E. Related Documentation

- [Next.js 14 App Router Docs](https://nextjs.org/docs/app)
- [Tailwind CSS v3 Docs](https://tailwindcss.com/docs)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Atomic Design Methodology](https://atomicdesign.bradfrost.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)

---

## Document History

| Version | Date       | Author            | Changes          |
| ------- | ---------- | ----------------- | ---------------- |
| 1.0     | 2025-10-08 | Architecture Team | Initial proposal |

---

**End of Document**
