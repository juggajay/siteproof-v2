# SiteProof v2 Design Overhaul Strategy

**Document Version:** 1.0
**Date:** October 8, 2025
**Status:** Research Complete - Ready for Implementation

---

## Executive Summary

SiteProof v2 is a functional construction site inspection and quality management system built with Next.js 14, React 18, TypeScript, and Tailwind CSS. While the application has solid technical foundations and a comprehensive feature set, it exhibits significant design inconsistencies, technical debt in the component architecture, and opportunities for modernization that would improve user experience for field inspectors, project managers, and clients.

### Key Findings

- **Component Duplication**: Two parallel component libraries exist (`packages/design-system/` and `apps/web/src/components/ui/`) with inconsistent implementations
- **Styling Fragmentation**: Mix of inline Tailwind classes, custom CSS files, and design system tokens creating maintenance challenges
- **Multiple Test Pages**: 16+ test/demo/duplicate pages cluttering the codebase
- **Design Token Gaps**: Design system exists but is inconsistently applied across 178 TSX files
- **Mobile Optimization**: Good foundations but inconsistent touch targets and visual hierarchy
- **Accessibility Concerns**: Incomplete WCAG compliance, especially in form components

### Strategic Priorities

1. **Consolidate Component Library** (High Impact, Medium Effort)
2. **Modernize Design System** (High Impact, High Effort)
3. **Improve Mobile-First Experience** (Critical Impact, Medium Effort)
4. **Enhance Accessibility** (Regulatory Impact, Medium Effort)
5. **Performance Optimization** (Medium Impact, Low Effort)

---

## Part 1: Current State Analysis

### 1.1 Codebase Structure

#### Application Architecture

```
siteproof-v2/
├── apps/web/
│   ├── src/
│   │   ├── app/                    # Next.js App Router (178 TSX files)
│   │   │   ├── dashboard/          # Main dashboard
│   │   │   ├── dashboard-demo/     # ⚠️ Test page - remove
│   │   │   ├── dashboard-minimal/  # ⚠️ Test page - remove
│   │   │   ├── dashboard-test/     # ⚠️ Test page - remove
│   │   │   ├── design-system/      # ⚠️ Test page - remove
│   │   │   └── [12+ other routes]
│   │   ├── components/             # 35+ shared components
│   │   │   ├── ui/                 # ⚠️ Duplicate component library (10 components)
│   │   │   ├── itp/                # 9 ITP-specific components (some duplicates)
│   │   │   ├── dashboard/
│   │   │   ├── mobile/
│   │   │   └── [other domains]
│   │   ├── features/               # Feature modules (well-organized)
│   │   │   ├── ai/
│   │   │   ├── auth/
│   │   │   ├── diary/
│   │   │   ├── financials/
│   │   │   ├── inspections/
│   │   │   ├── itp-forms/
│   │   │   ├── ncr/
│   │   │   └── [others]
│   │   ├── styles/                 # ⚠️ 3 separate CSS files
│   │   │   ├── design-tokens.css
│   │   │   ├── siteproof-design-system.css
│   │   │   └── mobile-optimizations.css
│   │   └── lib/                    # Utilities
│   └── tailwind.config.js          # Imports design-system config
└── packages/
    ├── design-system/              # Shared design system (21 components)
    │   ├── src/components/
    │   │   ├── ui/                 # Button, Input, Checkbox, Radio, Skeleton
    │   │   ├── layout/             # Grid, PageLayout, Section
    │   │   └── [domain components]
    │   └── tailwind.config.js      # Design tokens
    ├── database/                   # Supabase schemas
    └── config/                     # Shared configs
```

#### Technology Stack Assessment

- ✅ **Next.js 14** with App Router - Modern, well-structured
- ✅ **TypeScript** - Good type coverage
- ✅ **Tailwind CSS 3.4.1** - Latest version
- ✅ **Framer Motion 11.0.3** - Already installed for animations
- ✅ **React Hook Form + Zod** - Good form validation
- ✅ **Lucide React** - Consistent icon library
- ⚠️ **No Storybook** - Component documentation missing
- ⚠️ **No Radix UI** - Missing accessible primitives
- ⚠️ **Multiple CSS approaches** - Design tokens + custom CSS + inline classes

### 1.2 Component Library Analysis

#### Design System Package (`packages/design-system/`)

**Exported Components (21 total):**

- **UI Primitives**: Button, Input, Textarea, Radio, RadioGroup, Checkbox, CheckboxGroup, Toggle, Skeleton
- **Feedback**: Badge, Toast, ToastContainer, Modal
- **Navigation**: BottomNav, TopNav, FAB, FABGroup
- **Layout**: Card, PageLayout, Section, Grid, GridItem, StateDisplay
- **Domain-Specific**: ITPStatusButton, ProgressBar, ProgressRing

**Strengths:**

- Well-typed with TypeScript
- Framer Motion integration for animations
- Design tokens defined in Tailwind config
- Mobile-first approach with touch targets

**Weaknesses:**

- Only 21 components (missing: Table, Dropdown, Tabs, Accordion, Dialog, Popover, etc.)
- No Storybook documentation
- Limited variant coverage (Button has only 4 variants)
- Missing accessibility features (ARIA attributes incomplete)

#### Web App Components (`apps/web/src/components/ui/`)

**Duplicate Components (10 files):**

- Badge.tsx, Button.tsx, Card.tsx, FAB.tsx, Input.tsx, Modal.tsx, Progress.tsx, Select.tsx, Textarea.tsx, Toast.tsx

**Key Differences:**

1. **Button Component**:
   - Design System: Uses Framer Motion, 4 variants, better animations
   - Web App: No motion, 8 variants, different API

2. **Input Component**:
   - Design System: Basic implementation
   - Web App: Expanded touch target (56px mobile), better focus states

**Problem:**

- Developers don't know which to use
- Inconsistent UI across pages (some use design-system, some use local components)
- 94 files import from `@siteproof/design-system`, but many still use local components

### 1.3 Design Token Implementation

#### Current Design Tokens (`packages/design-system/tailwind.config.js`)

**Colors:**

```javascript
'primary-blue': '#2196F3'        // Material Blue 500
'primary-charcoal': '#1A1F2E'
'success': '#117733'              // Okabe-Ito (colorblind-safe)
'error': '#D55E00'
'warning': '#E69F00'
'info': '#0072B2'
```

**Strengths:**

- Color-blind safe palette (Okabe-Ito colors)
- WCAG AA compliant
- Construction industry appropriate (professional blues, high-visibility safety colors)

**Gaps:**

- No semantic color scales (primary-50 to primary-900)
- Missing neutral scale (gray-50 to gray-950)
- No dark mode colors defined
- Limited semantic naming (success, error, warning, info only)

#### CSS Variables (`apps/web/src/styles/design-tokens.css`)

**Duplicated Token System:**

```css
:root {
  --color-primary-500: #2196f3;
  --color-success-main: #117733;
  --spacing-4: 16px;
  --radius-lg: 12px;
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

**Problem:** CSS variables exist but Tailwind config also defines same tokens, causing confusion.

### 1.4 Styling Patterns Analysis

#### Inline Tailwind Usage (472 occurrences)

```tsx
// ❌ Example from mobile-itp-card.tsx
<button className="h-16 rounded-lg border-2 transition-all flex flex-col items-center justify-center bg-green-500 border-green-500 text-white shadow-lg">

// ❌ Example from NcrForm.tsx
<div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
```

**Issues:**

- Hard-coded colors override design tokens
- Inconsistent spacing values (gap-2, gap-3, gap-4 used interchangeably)
- No semantic naming (what is "bg-green-500" semantically?)

#### Custom CSS Classes (`apps/web/src/styles/siteproof-design-system.css`)

```css
.btn-primary {
  @apply bg-blue-500 text-white font-semibold px-6 py-3 rounded-lg
         min-h-[48px] shadow-md hover:shadow-lg hover:bg-blue-600;
}
```

**Good approach but:**

- Only 15 custom classes defined
- Not consistently used (developers still write inline classes)
- Naming convention unclear (btn-primary vs button-primary vs btn-1)

### 1.5 Mobile-First Implementation

#### Strengths

✅ Touch targets mostly 48px+ (meets WCAG 2.5.5)
✅ iOS zoom prevention (16px minimum font size)
✅ Safe area insets for notched devices
✅ Bottom navigation for mobile
✅ Offline-first with Dexie.js

#### Weaknesses

⚠️ Inconsistent button heights (40px desktop, 48px mobile, 56px large - but not applied uniformly)
⚠️ Form inputs vary: 48px vs 56px vs 64px
⚠️ Touch targets in tables/lists often < 44px
⚠️ Landscape mode not optimized
⚠️ No PWA manifest for "Add to Home Screen"

### 1.6 Accessibility Audit

#### Current State

- ✅ Color contrast meets WCAG AA (most places)
- ✅ Semantic HTML (mostly)
- ⚠️ Incomplete ARIA labels on buttons
- ⚠️ Missing focus indicators on custom components
- ⚠️ Keyboard navigation incomplete (modals, dropdowns)
- ❌ No skip navigation links
- ❌ Form error announcements missing screen reader support
- ❌ Dynamic content changes not announced

#### Example Issues

```tsx
// ❌ Missing ARIA label
<button onClick={handleSubmit}>
  <CheckCircle2 className="h-6 w-6" />
</button>

// ✅ Good example
<button onClick={handleSubmit} aria-label="Mark inspection as passed">
  <CheckCircle2 className="h-6 w-6" />
  <span className="sr-only">Pass</span>
</button>
```

### 1.7 Technical Debt Summary

| Category             | Severity | Count           | Impact                   |
| -------------------- | -------- | --------------- | ------------------------ |
| Duplicate components | High     | 10 files        | Confusion, inconsistency |
| Test/demo pages      | Medium   | 16 pages        | Code bloat, confusion    |
| Inline styling       | Medium   | 472 occurrences | Hard to maintain         |
| Missing components   | High     | 15+ components  | Inconsistent UX          |
| Accessibility gaps   | High     | ~50 issues      | Compliance risk          |
| CSS files            | Low      | 3 files         | Complexity               |
| TODOs/FIXMEs         | Low      | 16              | Technical debt           |

---

## Part 2: Industry Best Practices

### 2.1 Construction Software UI/UX Patterns

#### Research Insights from Leading Platforms

**Procore (Industry Leader):**

- Clean, professional blue/gray palette
- Large touch targets (56px minimum for primary actions)
- Card-based layouts for projects/inspections
- Progressive disclosure (expand/collapse sections)
- Status badges with clear color coding
- Offline mode with sync indicators

**PlanGrid (Autodesk):**

- Drawing-focused with minimalist UI
- Bottom sheet modals for mobile
- Floating action buttons for quick actions
- Thumbnail previews everywhere
- Annotation tools prioritized

**Fieldwire:**

- Task-based workflow (punch lists, inspections)
- Kanban-style boards
- Priority indicators (color-coded flags)
- Quick-add buttons
- Real-time collaboration indicators

**Common Patterns Across All:**

1. **Visual Hierarchy**: Status → Action → Details
2. **Mobile-First**: 80%+ of usage on tablets/phones
3. **Quick Actions**: FABs, swipe gestures, long-press menus
4. **Offline Resilience**: Clear sync status, conflict resolution
5. **Photo-Centric**: Large thumbnails, photo annotations
6. **Role-Based Views**: Foreman vs PM vs Client interfaces

### 2.2 Modern Design System Trends (2025)

#### Component Libraries

- **shadcn/ui** (Radix UI + Tailwind) - Most popular in Next.js ecosystem
- **Headless UI** (Tailwind Labs) - Accessible components
- **Radix UI** - Unstyled, accessible primitives
- **React Aria** (Adobe) - Accessibility-focused hooks

**Recommendation:** Adopt **shadcn/ui** approach:

- Copy components to your codebase (not a dependency)
- Built on Radix UI (accessible by default)
- Customizable with Tailwind
- TypeScript-first
- Tree-shakeable

#### Design Token Strategies

**Semantic Color Scales (Material Design 3 approach):**

```javascript
colors: {
  primary: {
    50: '#e3f2fd',
    100: '#bbdefb',
    // ...
    900: '#0d47a1',
    DEFAULT: '#2196f3',  // 500
  },
  surface: {
    DEFAULT: '#ffffff',
    container: '#f5f5f5',
    containerHigh: '#e0e0e0',
  }
}
```

**Benefits:**

- Semantic naming (what it is, not what it looks like)
- Easy dark mode (swap scales)
- Consistent contrast ratios

### 2.3 Accessibility Standards for Industrial Software

#### WCAG 2.1 AA Requirements (Regulatory Compliance)

- ✅ Color contrast 4.5:1 (text), 3:1 (large text, UI components)
- ✅ Touch targets 44×44px minimum
- ✅ Keyboard navigation (Tab, Enter, Escape, Arrow keys)
- ✅ Screen reader support (ARIA labels, live regions)
- ✅ Focus indicators (visible 3px outline)

#### Construction-Specific Considerations

- **Outdoor Visibility**: Higher contrast ratios (7:1 recommended)
- **Glove-Friendly**: Larger touch targets (56px recommended)
- **Varied Tech Literacy**: Clear labels, tooltips, onboarding
- **Safety-Critical**: Redundant indicators (color + icon + text)

### 2.4 Mobile-First Patterns for Field Workers

#### Thumb-Friendly Design

```
Safe Zone (Easy to reach with thumb):
┌─────────────────┐
│                 │ ← Top nav (view-only)
│                 │
│   [Main Content]│
│                 │
│   [FAB]         │ ← Bottom-right (thumb reach)
└─────────────────┘
  ←──────────────→
  Bottom Nav (primary actions)
```

#### Progressive Web App (PWA) Features

- **Add to Home Screen**: Manifest + service worker
- **Offline Mode**: IndexedDB (already using Dexie)
- **Push Notifications**: Already implemented
- **Background Sync**: For photo uploads

#### Data Visualization for Construction

- **Gantt Charts**: Timeline views (not implemented)
- **Progress Indicators**: Circular for overall, linear for tasks
- **Heatmaps**: For NCR locations on plans (not implemented)
- **Photo Grids**: Masonry layout with lazy loading

---

## Part 3: Recommended Design Direction

### 3.1 Visual Design System

#### Color Palette Modernization

**Primary Colors:**

```javascript
primary: {
  50: '#e3f2fd',   // Lightest (backgrounds)
  100: '#bbdefb',
  200: '#90caf9',
  300: '#64b5f6',
  400: '#42a5f5',
  500: '#2196f3',  // Main brand color (keep current)
  600: '#1e88e5',  // Interactive states
  700: '#1976d2',
  800: '#1565c0',
  900: '#0d47a1',  // Darkest (text on light bg)
  DEFAULT: '#2196f3',
}
```

**Semantic Colors:**

```javascript
// Status colors (keep colorblind-safe Okabe-Ito palette)
success: {
  light: '#4caf50',
  DEFAULT: '#117733',  // Okabe-Ito bluish green
  dark: '#0d5e28',
},
error: {
  light: '#ef5350',
  DEFAULT: '#d55e00',  // Okabe-Ito vermillion
  dark: '#aa4a00',
},
warning: {
  light: '#ffb74d',
  DEFAULT: '#e69f00',  // Okabe-Ito orange
  dark: '#b87f00',
},
info: {
  light: '#56b4e9',
  DEFAULT: '#0072b2',  // Okabe-Ito blue
  dark: '#004d80',
},

// Neutral scale (for UI)
gray: {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#eeeeee',
  300: '#e0e0e0',
  400: '#bdbdbd',
  500: '#9e9e9e',
  600: '#757575',
  700: '#616161',
  800: '#424242',
  900: '#212121',
  950: '#0a0a0a',
}
```

**Surface Colors (for layouts):**

```javascript
surface: {
  DEFAULT: '#ffffff',      // Cards
  container: '#f9fafb',    // Page background
  containerLow: '#f5f5f5', // Subtle differentiation
  containerHigh: '#e0e0e0',// Elevated elements
}
```

#### Typography Scale

**Font Family:**

```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['Roboto Mono', 'Courier New', 'monospace'],
}
```

**Font Sizes (Mobile-First):**

```javascript
fontSize: {
  xs: ['12px', { lineHeight: '16px' }],
  sm: ['14px', { lineHeight: '20px' }],
  base: ['16px', { lineHeight: '24px' }],  // Prevents iOS zoom
  lg: ['18px', { lineHeight: '28px' }],
  xl: ['20px', { lineHeight: '28px' }],
  '2xl': ['24px', { lineHeight: '32px' }],
  '3xl': ['28px', { lineHeight: '36px' }],
  '4xl': ['32px', { lineHeight: '40px' }],
  '5xl': ['40px', { lineHeight: '48px' }],
}
```

#### Spacing & Layout

**Spacing Scale (4px base unit):**

```javascript
spacing: {
  0: '0',
  px: '1px',
  0.5: '2px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
}
```

**Border Radius (2025 modern standards):**

```javascript
borderRadius: {
  none: '0',
  sm: '4px',
  DEFAULT: '8px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '24px',
  full: '9999px',
}
```

#### Shadows & Elevation

```javascript
boxShadow: {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
}
```

### 3.2 Component Design Patterns

#### Button Variants

```tsx
// Primary - Main actions (Submit, Save, Confirm)
<Button variant="primary" size="lg">
  Submit Inspection
</Button>

// Secondary - Alternative actions (Cancel, Back)
<Button variant="secondary" size="lg">
  Cancel
</Button>

// Danger - Destructive actions (Delete, Remove)
<Button variant="danger" size="lg">
  Delete NCR
</Button>

// Ghost - Tertiary actions (View Details)
<Button variant="ghost" size="md">
  View Details
</Button>

// Icon - Icon-only buttons (with accessible label)
<Button variant="ghost" size="icon" aria-label="Edit">
  <Edit className="h-5 w-5" />
</Button>
```

**Sizes:**

- `sm`: 40px height (desktop secondary actions)
- `md`: 48px height (default)
- `lg`: 56px height (mobile primary actions)
- `icon`: 44x44px (icon-only)

#### Card Patterns

```tsx
// Project Card
<Card className="hover:shadow-lg transition-shadow">
  <CardHeader>
    <div className="flex items-center justify-between">
      <CardTitle>Project Name</CardTitle>
      <Badge variant="success">Active</Badge>
    </div>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-gray-600">Description...</p>
  </CardContent>
  <CardFooter>
    <Button variant="ghost" size="sm">View Details</Button>
  </CardFooter>
</Card>

// Stats Card
<Card>
  <CardContent className="pt-6">
    <div className="text-center">
      <div className="text-3xl font-bold text-primary-600">42</div>
      <p className="text-sm text-gray-600">Active ITPs</p>
    </div>
  </CardContent>
</Card>
```

#### Form Patterns

```tsx
// Standard Form Layout
<form className="space-y-6">
  <div className="space-y-2">
    <Label htmlFor="title">Inspection Title</Label>
    <Input id="title" type="text" placeholder="Enter title..." error={errors.title?.message} />
    {errors.title && (
      <p className="text-sm text-error" role="alert">
        {errors.title.message}
      </p>
    )}
  </div>

  <div className="space-y-2">
    <Label htmlFor="severity">Severity</Label>
    <Select id="severity" options={severityOptions} />
  </div>

  <div className="flex gap-3">
    <Button type="button" variant="secondary" className="flex-1">
      Cancel
    </Button>
    <Button type="submit" variant="primary" className="flex-1">
      Submit
    </Button>
  </div>
</form>
```

#### Mobile Navigation Patterns

```tsx
// Bottom Navigation (Mobile Only)
<BottomNav className="md:hidden">
  <BottomNavItem href="/dashboard" icon={<Home />} label="Home" />
  <BottomNavItem href="/inspections" icon={<ClipboardCheck />} label="Inspections" />
  <BottomNavItem href="/ncrs" icon={<AlertTriangle />} label="NCRs" />
  <BottomNavItem href="/diary" icon={<Calendar />} label="Diary" />
  <BottomNavItem href="/profile" icon={<User />} label="Profile" />
</BottomNav>

// FAB for Primary Action
<FAB
  onClick={handleCreateInspection}
  icon={<Plus />}
  label="New Inspection"
  className="md:hidden"
/>
```

### 3.3 Animation Strategy

#### Principles

1. **Purposeful**: Animations should guide user attention
2. **Fast**: < 300ms for UI feedback, < 500ms for transitions
3. **Respectful**: Honor `prefers-reduced-motion`
4. **Consistent**: Same timing functions throughout

#### Framer Motion Variants

```tsx
// Card hover
const cardVariants = {
  rest: { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  hover: { scale: 1.02, boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  tap: { scale: 0.98 },
};

// Modal
const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
};

// List items (stagger)
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};
```

### 3.4 Dark Mode Strategy

#### Semantic Color Approach

```javascript
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for system preference
  theme: {
    extend: {
      colors: {
        // Light mode (default)
        background: {
          DEFAULT: '#ffffff',
          subtle: '#f9fafb',
        },
        foreground: {
          DEFAULT: '#1a1f2e',
          muted: '#6b7280',
        },

        // Dark mode (auto-generated with dark: prefix)
        // or use CSS variables
      },
    },
  },
};
```

#### CSS Variables Approach (Recommended)

```css
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 207 90% 54%;
  --primary-foreground: 0 0% 100%;
}

.dark {
  --background: 222 47% 11%;
  --foreground: 0 0% 98%;
  --primary: 207 90% 54%;
  --primary-foreground: 222 47% 11%;
}
```

**Benefits:**

- Single source of truth
- Easy theme switching
- Predictable color relationships

---

## Part 4: Component Library Architecture

### 4.1 Proposed Folder Structure

```
packages/design-system/
├── src/
│   ├── components/
│   │   ├── ui/                    # Core primitives
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── label.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── accordion.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── command.tsx
│   │   │   └── calendar.tsx
│   │   │
│   │   ├── layout/                # Layout components
│   │   │   ├── page-layout.tsx
│   │   │   ├── section.tsx
│   │   │   ├── grid.tsx
│   │   │   ├── container.tsx
│   │   │   └── stack.tsx
│   │   │
│   │   ├── navigation/            # Navigation components
│   │   │   ├── top-nav.tsx
│   │   │   ├── bottom-nav.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   └── pagination.tsx
│   │   │
│   │   ├── feedback/              # Feedback components
│   │   │   ├── progress.tsx
│   │   │   ├── spinner.tsx
│   │   │   ├── empty-state.tsx
│   │   │   └── error-state.tsx
│   │   │
│   │   └── domain/                # SiteProof-specific
│   │       ├── itp-status-button.tsx
│   │       ├── ncr-severity-badge.tsx
│   │       ├── signature-pad.tsx
│   │       ├── photo-upload.tsx
│   │       └── inspection-card.tsx
│   │
│   ├── hooks/                     # Shared hooks
│   │   ├── use-toast.ts
│   │   ├── use-media-query.ts
│   │   ├── use-debounce.ts
│   │   └── use-local-storage.ts
│   │
│   ├── lib/                       # Utilities
│   │   ├── utils.ts               # cn() helper
│   │   └── constants.ts
│   │
│   └── index.ts                   # Main export
│
├── tailwind.config.js             # Design tokens
├── package.json
└── README.md

apps/web/src/
├── components/                    # App-specific components only
│   ├── dashboard/
│   ├── foreman/
│   └── mobile/
│
└── [Remove apps/web/src/components/ui/]
```

### 4.2 Component Implementation Strategy

#### Approach: shadcn/ui Pattern

**Philosophy:**

- Components live in your codebase (not npm package)
- Copy & paste, then customize
- Built on Radix UI primitives
- Styled with Tailwind CSS
- Fully typed with TypeScript

**Example: Button Component**

```tsx
// packages/design-system/src/components/ui/button.tsx
import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base styles
  'inline-flex items-center justify-center rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow-md',
        secondary:
          'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 hover:border-primary-700',
        danger: 'bg-error text-white hover:bg-error-dark shadow-sm',
        ghost: 'hover:bg-gray-100 hover:text-gray-900',
        link: 'text-primary-600 underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-10 px-4 py-2',
        md: 'h-12 px-6 py-3',
        lg: 'h-14 px-8 py-4',
        icon: 'h-11 w-11',
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
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Usage:**

```tsx
import { Button } from '@siteproof/design-system'

<Button variant="primary" size="lg">Submit</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="danger" size="sm">Delete</Button>
```

#### Dependencies to Add

```json
{
  "dependencies": {
    "@radix-ui/react-dialog": "^1.0.5",
    "@radix-ui/react-dropdown-menu": "^2.0.6",
    "@radix-ui/react-popover": "^1.0.7",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.4",
    "@radix-ui/react-toast": "^1.1.5",
    "@radix-ui/react-tooltip": "^1.0.7",
    "@radix-ui/react-slot": "^1.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

### 4.3 Missing Components to Build

**Priority 1 (Critical for UX consistency):**

1. **Dialog** - Modal dialogs (currently using custom Modal)
2. **DropdownMenu** - Context menus, action menus
3. **Select** - Improved dropdown select (current version basic)
4. **Table** - Data tables with sorting, filtering
5. **Tabs** - For organizing content
6. **Tooltip** - Contextual help

**Priority 2 (Important for functionality):** 7. **Accordion** - Collapsible sections 8. **Popover** - Floating content 9. **Command** - Command palette / search 10. **Calendar** - Date picker for scheduling 11. **Sheet** - Side panels for filters/details 12. **Alert** - Important notifications

**Priority 3 (Nice to have):** 13. **Slider** - For ranges (e.g., severity) 14. **Breadcrumb** - Navigation context 15. **Pagination** - For lists/tables 16. **Avatar** - User profiles 17. **Separator** - Visual dividers

### 4.4 Storybook Setup

#### Why Storybook?

- Component documentation
- Visual regression testing
- Isolated development
- Design team collaboration
- Accessibility testing

#### Setup Steps

```bash
# Install Storybook
npx storybook@latest init

# Install addons
pnpm add -D @storybook/addon-a11y @storybook/addon-themes
```

**Directory Structure:**

```
packages/design-system/
├── .storybook/
│   ├── main.ts
│   ├── preview.ts
│   └── manager.ts
└── src/
    └── components/
        └── ui/
            ├── button.tsx
            └── button.stories.tsx
```

**Example Story:**

```tsx
// packages/design-system/src/components/ui/button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost', 'link'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'icon'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Submit Inspection',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="link">Link</Button>
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
```

---

## Part 5: Phased Implementation Roadmap

### Phase 1: Foundation & Cleanup (2-3 weeks)

#### Week 1: Audit & Prepare

**Tasks:**

- [ ] Remove 16 test/demo pages (`dashboard-demo`, `dashboard-test`, `design-system`, etc.)
- [ ] Document all component usage across codebase
- [ ] Set up Storybook in `packages/design-system`
- [ ] Install Radix UI dependencies
- [ ] Configure CVA (class-variance-authority)

**Deliverables:**

- Clean codebase (remove ~3,000 LOC)
- Storybook running locally
- Component usage audit document

#### Week 2-3: Core Component Library

**Tasks:**

- [ ] Rebuild Button component (Radix + CVA)
- [ ] Rebuild Input component with proper accessibility
- [ ] Rebuild Select component (Radix Select)
- [ ] Add Dialog component (replace Modal)
- [ ] Add DropdownMenu component
- [ ] Add Tooltip component
- [ ] Write Storybook stories for all components

**Deliverables:**

- 6 production-ready components
- Storybook documentation
- Accessibility audit passed

**Migration Strategy:**

```tsx
// Create alias during migration
// packages/design-system/src/index.ts
export { Button } from './components/ui/button';
export { Button as ButtonLegacy } from './components/ui-legacy/Button';

// In consuming code, gradually migrate:
// ❌ Old
import { Button } from '@siteproof/design-system';

// ✅ New (explicitly use legacy during migration)
import { ButtonLegacy as Button } from '@siteproof/design-system';

// ✅ Final (after migration)
import { Button } from '@siteproof/design-system';
```

### Phase 2: Component Expansion (3-4 weeks)

#### Week 4-5: Data Display Components

**Tasks:**

- [ ] Build Table component (sortable, filterable)
- [ ] Build Card component (multiple variants)
- [ ] Build Badge component (status indicators)
- [ ] Build Avatar component (user profiles)
- [ ] Build Tabs component
- [ ] Build Accordion component

**Deliverables:**

- 6 additional components
- Update 20+ pages to use new components

#### Week 6-7: Feedback & Navigation

**Tasks:**

- [ ] Build Toast component (Radix Toast)
- [ ] Build Alert component
- [ ] Build Progress component (circular + linear)
- [ ] Build Breadcrumb component
- [ ] Build Pagination component
- [ ] Build Command palette component

**Deliverables:**

- 6 additional components
- Complete navigation system

### Phase 3: Design Token Consolidation (2 weeks)

#### Week 8: Tailwind Config Overhaul

**Tasks:**

- [ ] Implement semantic color scales (primary-50 to primary-900)
- [ ] Add neutral gray scale (gray-50 to gray-950)
- [ ] Define surface/background semantic colors
- [ ] Remove CSS variable duplication
- [ ] Update all components to use new tokens

**Before:**

```tsx
<button className="bg-blue-500 text-white hover:bg-blue-600">
```

**After:**

```tsx
<button className="bg-primary-600 text-white hover:bg-primary-700">
```

#### Week 9: Dark Mode Implementation

**Tasks:**

- [ ] Set up CSS variable approach for theming
- [ ] Create dark mode color palette
- [ ] Add theme toggle component
- [ ] Test all components in dark mode
- [ ] Add `useTheme` hook

**Deliverables:**

- Fully functional dark mode
- Theme persistence (localStorage)

### Phase 4: Mobile Optimization (2-3 weeks)

#### Week 10: Touch Targets & Gestures

**Tasks:**

- [ ] Audit all touch targets (ensure 44px minimum)
- [ ] Implement swipe gestures for lists/cards
- [ ] Add pull-to-refresh on lists
- [ ] Optimize form inputs (56px height on mobile)
- [ ] Add haptic feedback (vibration API)

#### Week 11: PWA Enhancement

**Tasks:**

- [ ] Create PWA manifest
- [ ] Add app icons (multiple sizes)
- [ ] Improve service worker (already exists for offline)
- [ ] Add "Add to Home Screen" prompt
- [ ] Test on iOS and Android devices

#### Week 12: Responsive Refinement

**Tasks:**

- [ ] Optimize tablet layout (768px-1024px)
- [ ] Add landscape mode optimizations
- [ ] Test on rugged devices (small screens, outdoor visibility)
- [ ] Performance testing on slow 3G
- [ ] Cross-browser testing (Safari, Chrome, Edge)

### Phase 5: Accessibility & Performance (2 weeks)

#### Week 13: WCAG 2.1 AA Compliance

**Tasks:**

- [ ] Add skip navigation links
- [ ] Ensure all interactive elements are keyboard accessible
- [ ] Add proper ARIA labels to all buttons/links
- [ ] Implement focus management (modals, dialogs)
- [ ] Add screen reader announcements (form errors, dynamic content)
- [ ] Test with screen readers (NVDA, JAWS, VoiceOver)

**Tools:**

- axe DevTools
- WAVE browser extension
- Lighthouse accessibility audit

#### Week 14: Performance Optimization

**Tasks:**

- [ ] Code-split heavy components
- [ ] Lazy load images (already using next/image)
- [ ] Optimize Framer Motion animations
- [ ] Reduce bundle size (tree-shaking, dynamic imports)
- [ ] Add loading skeletons for all async content
- [ ] Optimize font loading (preload, display swap)

**Metrics:**

- Lighthouse Performance score > 90
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s

### Phase 6: Documentation & Training (1 week)

#### Week 15: Documentation

**Tasks:**

- [ ] Write component usage guide
- [ ] Create design system website (Storybook)
- [ ] Document accessibility guidelines
- [ ] Create mobile-first design checklist
- [ ] Write migration guide for developers

**Deliverables:**

- Public Storybook (storybook.siteproof.app)
- Component API documentation
- Design principles document

---

## Part 6: Risk Mitigation Strategies

### 6.1 Migration Risks

| Risk                                 | Impact | Probability | Mitigation                                   |
| ------------------------------------ | ------ | ----------- | -------------------------------------------- |
| Breaking existing functionality      | High   | Medium      | Gradual migration with legacy exports        |
| Developer resistance to new patterns | Medium | High        | Training sessions, clear docs                |
| Inconsistent adoption                | Medium | Medium      | Linting rules, PR reviews                    |
| Performance regression               | High   | Low         | Benchmark before/after, Lighthouse CI        |
| Accessibility regressions            | High   | Medium      | Automated a11y testing in CI                 |
| Timeline overruns                    | Medium | High        | Buffer 20% extra time, prioritize ruthlessly |

### 6.2 Backward Compatibility Plan

**Approach: Dual Export Strategy**

```typescript
// packages/design-system/src/index.ts
// New components (recommended)
export * from './components/ui';

// Legacy components (deprecated, will be removed in v2.0)
export * as Legacy from './components/ui-legacy';
```

**Usage:**

```tsx
// Phase 1: Both available
import { Button } from '@siteproof/design-system'; // New
import { Button as ButtonOld } from '@siteproof/design-system/legacy'; // Old

// Phase 2: Warnings
console.warn('Legacy Button is deprecated, use new Button');

// Phase 3: Remove legacy (v2.0.0)
```

### 6.3 Testing Strategy

#### Unit Tests

- **Coverage goal**: 80% for UI components
- **Tool**: Vitest + React Testing Library
- **Focus**: Accessibility, keyboard navigation, edge cases

```tsx
// Example: button.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    await userEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('is keyboard accessible', async () => {
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click me</Button>);

    const button = screen.getByRole('button');
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Visual Regression Tests

- **Tool**: Chromatic (Storybook cloud)
- **Coverage**: All component variants
- **Frequency**: Every PR

#### Integration Tests

- **Tool**: Playwright (already installed)
- **Coverage**: Critical user flows
- **Examples**:
  - Create inspection → Add items → Submit
  - Create NCR → Upload photo → Assign
  - Daily diary → Fill form → Export PDF

#### Accessibility Tests

- **Tool**: axe-core + jest-axe
- **Coverage**: All components
- **CI Integration**: Block merge if a11y violations

```tsx
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from './button';

expect.extend(toHaveNoViolations);

describe('Button accessibility', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 6.4 Performance Monitoring

#### Lighthouse CI Integration

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [pull_request]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - uses: treosh/lighthouse-ci-action@v9
        with:
          urls: |
            http://localhost:3000
            http://localhost:3000/dashboard
            http://localhost:3000/inspections
          budgetPath: ./budget.json
          uploadArtifacts: true
```

**Performance Budgets:**

```json
{
  "budget": [
    {
      "path": "/*",
      "timings": [
        { "metric": "first-contentful-paint", "budget": 1500 },
        { "metric": "interactive", "budget": 3500 }
      ],
      "resourceSizes": [
        { "resourceType": "script", "budget": 300 },
        { "resourceType": "stylesheet", "budget": 50 },
        { "resourceType": "image", "budget": 200 }
      ]
    }
  ]
}
```

---

## Part 7: Performance & Accessibility Considerations

### 7.1 Performance Optimization Strategies

#### Code Splitting

**Current State:**

- Single bundle for entire app
- All components load upfront

**Proposed:**

```tsx
// Lazy load heavy components
const DiaryForm = lazy(() => import('@/features/diary/components/DiaryForm'))
const ITPBuilder = lazy(() => import('@/features/itp/components/ITPBuilder'))

// Use Suspense with skeleton
<Suspense fallback={<DiaryFormSkeleton />}>
  <DiaryForm />
</Suspense>
```

#### Image Optimization

**Already using:** next/image (good!)

**Additional improvements:**

```tsx
<Image
  src={photo.url}
  alt={photo.description}
  width={800}
  height={600}
  placeholder="blur" // Add blur placeholder
  blurDataURL={photo.thumbnail} // Low-res preview
  loading="lazy" // Already default, but explicit
  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
/>
```

#### Font Optimization

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap', // Prevent flash of unstyled text
  preload: true,
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
```

#### Bundle Size Optimization

**Current dependencies to review:**

- `@react-pdf/renderer` (4.3.0) - 500KB+
- `xlsx` (0.18.5) - 600KB+
- `jspdf` (3.0.1) - 300KB+

**Recommendation:**

```tsx
// Lazy load heavy libraries
const exportToPDF = async (data) => {
  const jsPDF = (await import('jspdf')).default;
  // Use jsPDF...
};

// Or use dynamic imports
const PDFExport = dynamic(() => import('@/components/reports/PDFExport'), {
  ssr: false, // Don't load on server
  loading: () => <Spinner />,
});
```

### 7.2 Accessibility Improvements

#### Keyboard Navigation

**Add to all interactive components:**

```tsx
const Dialog = ({ open, onClose, children }) => {
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    // Trap focus inside dialog
    const dialog = dialogRef.current;
    const focusableElements = dialog?.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements?.[0];
    const lastElement = focusableElements?.[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    // Focus first element
    firstElement?.focus();

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
    };
  }, [open, onClose]);

  // ...
};
```

#### Screen Reader Announcements

```tsx
// Add to form error handling
const FormField = ({ error, ...props }) => {
  const errorId = useId();

  return (
    <div>
      <Input aria-invalid={!!error} aria-describedby={error ? errorId : undefined} {...props} />
      {error && (
        <p id={errorId} role="alert" className="text-error text-sm">
          {error}
        </p>
      )}
    </div>
  );
};

// Add to dynamic content
const InspectionList = ({ inspections }) => {
  const [liveRegion, setLiveRegion] = useState('');

  const handleDelete = async (id) => {
    await deleteInspection(id);
    setLiveRegion('Inspection deleted successfully');
  };

  return (
    <>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveRegion}
      </div>
      {/* List content */}
    </>
  );
};
```

#### Focus Management

```tsx
// Return focus after modal closes
const useReturnFocus = (isOpen: boolean) => {
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
    } else if (previousFocus.current) {
      previousFocus.current.focus();
    }
  }, [isOpen]);
};
```

### 7.3 Outdoor Visibility Enhancements

**Problem:** Construction sites are often in bright sunlight

**Solutions:**

1. **High Contrast Mode:**

```css
@media (prefers-contrast: high) {
  .button-primary {
    @apply bg-primary-800 border-2 border-white;
  }

  .text-muted {
    @apply text-gray-900; /* Darken muted text */
  }
}
```

2. **Increased Font Weight:**

```tsx
// For critical status indicators
<Badge variant="warning" className="font-bold text-lg">
  Pending Review
</Badge>
```

3. **Redundant Information:**

```tsx
// ✅ Color + Icon + Text
<div className="flex items-center gap-2 text-error">
  <XCircle className="h-5 w-5" />
  <span className="font-semibold">Failed</span>
</div>

// ❌ Color only
<div className="text-red-500">Failed</div>
```

---

## Part 8: Estimated Effort & Priority Rankings

### 8.1 Effort Estimation

| Phase               | Duration        | FTE         | Complexity      | Dependencies   |
| ------------------- | --------------- | ----------- | --------------- | -------------- |
| Phase 1: Foundation | 2-3 weeks       | 1-2         | Medium          | None           |
| Phase 2: Components | 3-4 weeks       | 2           | High            | Phase 1        |
| Phase 3: Tokens     | 2 weeks         | 1           | Low             | Phase 1        |
| Phase 4: Mobile     | 2-3 weeks       | 1-2         | Medium          | Phase 2        |
| Phase 5: A11y/Perf  | 2 weeks         | 1           | Medium          | Phase 2        |
| Phase 6: Docs       | 1 week          | 1           | Low             | All phases     |
| **Total**           | **12-15 weeks** | **1-2 FTE** | **Medium-High** | **Sequential** |

### 8.2 Priority Matrix

| Task                               | Business Value | User Impact | Technical Debt Reduction | Effort | Priority Score | Rank |
| ---------------------------------- | -------------- | ----------- | ------------------------ | ------ | -------------- | ---- |
| Consolidate component libraries    | High           | Medium      | High                     | Medium | 9/10           | 🥇 1 |
| Mobile touch targets (44px+)       | Critical       | High        | Low                      | Low    | 9/10           | 🥇 1 |
| Add Radix Dialog, Select, Dropdown | High           | High        | Medium                   | Medium | 8/10           | 🥈 2 |
| Implement dark mode                | Medium         | Medium      | Low                      | Medium | 6/10           | 🥉 3 |
| Remove test/demo pages             | Low            | None        | High                     | Low    | 6/10           | 🥉 3 |
| Build Table component              | High           | High        | Low                      | High   | 7/10           | 🥉 3 |
| WCAG 2.1 AA compliance             | High           | Medium      | Low                      | Medium | 7/10           | 🥉 3 |
| Storybook setup                    | Medium         | Low         | Low                      | Medium | 5/10           | 4    |
| PWA enhancements                   | Medium         | Medium      | Low                      | Medium | 6/10           | 4    |
| Performance optimization           | Medium         | Medium      | Medium                   | Low    | 6/10           | 4    |

### 8.3 Quick Wins (Week 1)

**Tasks that can be completed in < 2 days with high impact:**

1. **Remove test pages** (4 hours)
   - Delete 16 test/demo pages
   - Immediate 3,000 LOC reduction

2. **Fix touch targets** (1 day)
   - Audit all buttons/links
   - Add `min-h-[44px] min-w-[44px]` class

3. **Add focus indicators** (4 hours)
   - Update global focus styles
   - Test keyboard navigation

4. **Consolidate CSS files** (1 day)
   - Merge design-tokens.css into Tailwind config
   - Remove duplicate definitions

5. **Add skip navigation** (2 hours)
   ```tsx
   <a href="#main" className="sr-only focus:not-sr-only">
     Skip to main content
   </a>
   ```

**Impact:** Cleaner codebase, better accessibility, improved mobile UX

---

## Part 9: Recommended Next Steps

### Immediate Actions (This Week)

1. **Stakeholder Review**
   - Present this strategy to product, design, and engineering leads
   - Get alignment on priorities and timeline
   - Identify any blockers or concerns

2. **Team Assignment**
   - Assign 1-2 frontend developers to design system work
   - Identify design partner for Storybook review
   - Set up recurring sync meetings (weekly)

3. **Environment Setup**
   - Create `feat/design-system-overhaul` branch
   - Install Radix UI dependencies
   - Set up Storybook in `packages/design-system`

### Week 1 Tasks

```markdown
- [ ] Remove test/demo pages (4 hours)
- [ ] Install Radix UI + CVA dependencies (1 hour)
- [ ] Set up Storybook (4 hours)
- [ ] Create component usage audit spreadsheet (4 hours)
- [ ] Fix critical touch target issues (1 day)
- [ ] Write migration guide draft (2 hours)
```

### Success Metrics

**Phase 1 (Foundation):**

- ✅ 0 test/demo pages remaining
- ✅ Storybook running with ≥ 5 components documented
- ✅ 100% of touch targets ≥ 44px
- ✅ Lighthouse accessibility score ≥ 90

**Phase 2 (Components):**

- ✅ 20+ components in design system
- ✅ 80% test coverage on UI components
- ✅ 0 console warnings in Storybook

**Phase 3 (Tokens):**

- ✅ All colors using semantic tokens (no hardcoded hex)
- ✅ Dark mode functional on all pages
- ✅ CSS variables → Tailwind config migration complete

**Phase 4 (Mobile):**

- ✅ PWA manifest valid
- ✅ Lighthouse mobile score ≥ 90
- ✅ Tested on iOS Safari, Chrome Android

**Phase 5 (A11y/Perf):**

- ✅ WCAG 2.1 AA compliant (axe DevTools 0 violations)
- ✅ Lighthouse performance score ≥ 90
- ✅ Bundle size < 300KB (gzipped)

**Phase 6 (Docs):**

- ✅ Public Storybook deployed
- ✅ Component API docs complete
- ✅ Migration guide published

---

## Appendix A: Code Examples

### A.1 Tailwind Config (Recommended)

```javascript
// packages/design-system/tailwind.config.js
const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Semantic colors (light mode)
        background: {
          DEFAULT: 'hsl(var(--background))',
          subtle: 'hsl(var(--background-subtle))',
        },
        foreground: {
          DEFAULT: 'hsl(var(--foreground))',
          muted: 'hsl(var(--foreground-muted))',
        },
        primary: {
          50: '#e3f2fd',
          100: '#bbdefb',
          200: '#90caf9',
          300: '#64b5f6',
          400: '#42a5f5',
          500: '#2196f3',
          600: '#1e88e5',
          700: '#1976d2',
          800: '#1565c0',
          900: '#0d47a1',
          DEFAULT: '#2196f3',
          foreground: '#ffffff',
        },
        success: {
          light: '#4caf50',
          DEFAULT: '#117733',
          dark: '#0d5e28',
          foreground: '#ffffff',
        },
        error: {
          light: '#ef5350',
          DEFAULT: '#d55e00',
          dark: '#aa4a00',
          foreground: '#ffffff',
        },
        warning: {
          light: '#ffb74d',
          DEFAULT: '#e69f00',
          dark: '#b87f00',
          foreground: '#000000',
        },
        info: {
          light: '#56b4e9',
          DEFAULT: '#0072b2',
          dark: '#004d80',
          foreground: '#ffffff',
        },
      },
      borderRadius: {
        lg: '12px',
        md: '8px',
        sm: '4px',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};
```

### A.2 Global CSS (Minimal)

```css
/* apps/web/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222 47% 11%;
    --background-subtle: 210 20% 98%;
    --foreground-muted: 215 16% 47%;
  }

  .dark {
    --background: 222 47% 11%;
    --foreground: 0 0% 98%;
    --background-subtle: 217 33% 17%;
    --foreground-muted: 215 20% 65%;
  }

  * {
    @apply border-gray-200 dark:border-gray-800;
  }

  body {
    @apply bg-background text-foreground;
    font-feature-settings:
      'rlig' 1,
      'calt' 1;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

### A.3 Component Template (shadcn/ui style)

```tsx
// packages/design-system/src/components/ui/badge.tsx
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-gray-100 text-gray-900 hover:bg-gray-100/80',
        success: 'border-transparent bg-success text-success-foreground',
        error: 'border-transparent bg-error text-error-foreground',
        warning: 'border-transparent bg-warning text-warning-foreground',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
```

---

## Appendix B: Resource Links

### Design Systems Reference

- **shadcn/ui**: https://ui.shadcn.com/
- **Radix UI**: https://www.radix-ui.com/
- **Tailwind CSS**: https://tailwindcss.com/
- **CVA (Class Variance Authority)**: https://cva.style/docs

### Accessibility Resources

- **WCAG 2.1 Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **A11y Project**: https://www.a11yproject.com/

### Testing Tools

- **Storybook**: https://storybook.js.org/
- **Chromatic**: https://www.chromatic.com/
- **Playwright**: https://playwright.dev/
- **jest-axe**: https://github.com/nickcolley/jest-axe

### Industry Examples

- **Procore Design System**: https://design.procore.com/
- **Shopify Polaris**: https://polaris.shopify.com/
- **Material Design 3**: https://m3.material.io/

---

## Document Change Log

| Version | Date       | Author         | Changes                                 |
| ------- | ---------- | -------------- | --------------------------------------- |
| 1.0     | 2025-10-08 | Research Agent | Initial comprehensive strategy document |

---

**End of Design Overhaul Strategy Document**

**Next Action:** Schedule stakeholder review meeting to discuss priorities and timeline approval.
