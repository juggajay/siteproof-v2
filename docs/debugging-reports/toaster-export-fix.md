# Toaster Export Fix - Debug Report

## Problem

The web application was crashing with the following error:

```
Attempted import error: 'Toaster' is not exported from '@siteproof/design-system' (imported as 'Toaster').
```

**Location:** `/apps/web/src/app/layout.tsx:3`

```typescript
import { Toaster } from '@siteproof/design-system';
```

## Root Cause Analysis

The `Toaster` component existed in the design system at `/packages/design-system/src/components/ui/toaster.tsx` but was **not being exported** from the package's main entry point.

### Design System Structure

The design system has TWO separate toast systems:

1. **Old Custom Toast System**:
   - Hook: `/hooks/useToast.tsx` (React Context-based)
   - Components: `/components/Toast.tsx` (ToastContainer, Toast)
   - Type: Custom implementation with framer-motion

2. **New Radix UI Toast System**:
   - Hook: `/hooks/use-toast.ts` (State management)
   - Components: `/components/ui/toast.tsx` (Primitives) + `/components/ui/toaster.tsx`
   - Type: Radix UI primitives

The web app's layout was using the **new Radix UI Toaster**, but it wasn't exported.

## Solution

Added the `Toaster` export to `/packages/design-system/src/components/index.ts`:

```typescript
// Radix UI Toast primitives (use with useToast hook)
export { Toaster } from './ui/toaster';
```

### Why Simple Export?

Initially attempted to export all toast primitives:
```typescript
export { Toaster } from './ui/toaster';
export {
  Toast as ToastPrimitive,
  ToastProvider,
  ToastViewport,
  // ... etc
} from './ui/toast';
```

This caused a **TypeScript conflict**:
```
error TS2308: Module './components' has already exported a member named 'ToastProvider'.
Consider explicitly re-exporting to resolve the ambiguity.
```

The conflict occurred because:
- `/hooks/index.ts` exports `ToastProvider` from the old system
- `/components/index.ts` was trying to export `ToastProvider` from the new system

**Final solution**: Only export `Toaster` since that's what the app needs. The primitives and hooks are already available through other exports if needed.

## Verification

1. **Type Check**: No more export conflicts
   ```bash
   cd packages/design-system && pnpm type-check
   ```
   ✅ No errors related to `index.ts`

2. **Web App Type Check**: No import errors
   ```bash
   cd apps/web && pnpm type-check
   ```
   ✅ No errors about Toaster import

3. **Dev Server**: Successfully compiled
   ```bash
   cd apps/web && pnpm dev
   ```
   ✅ Ready in 19.7s (no compilation errors)

## Files Modified

1. `/packages/design-system/src/components/index.ts`
   - Added: `export { Toaster } from './ui/toaster';`

## Recommendations

1. **Consolidate Toast Systems**: The design system has two competing toast implementations. Consider:
   - Deprecating the old custom Toast system
   - Migrating all toast usage to Radix UI Toaster
   - Removing duplicate ToastProvider exports

2. **Export Strategy**: Document which toast system should be used:
   - `Toaster` + `useToast` (from `use-toast.ts`) for new code
   - Legacy `Toast` + `ToastContainer` for existing code (to be migrated)

3. **Type Safety**: Add JSDoc comments to clarify which toast system each export belongs to

## Status

✅ **FIXED** - App is no longer crashing. The Toaster component is now properly exported and the web app compiles successfully.
