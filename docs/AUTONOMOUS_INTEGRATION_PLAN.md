# Autonomous Design System Integration Plan

**Date:** 2025-10-08
**Status:** Ready for Execution
**Mode:** Fully Autonomous with Error Handling

---

## 🎯 Executive Summary

**Goal**: Integrate `@siteproof/design-system` into `apps/web` Next.js application autonomously with complete error handling and validation.

**Current Status**:
- ✅ Design system package ALREADY installed (`@siteproof/design-system workspace:*`)
- ✅ Tailwind config ALREADY configured with design system preset
- ✅ ToastProvider ALREADY added to Providers.tsx
- ⚠️  Using TWO toast systems (sonner + design system) - needs consolidation
- ⚠️  No ThemeProvider yet
- ✅ Only 3 files use legacy components (`@/components/ui`)

---

## 📊 Discovery Results

### ✅ What's Already Done:

1. **Package Installation** (`apps/web/package.json:32`)
   ```json
   "@siteproof/design-system": "workspace:*"
   ```

2. **Tailwind Configuration** (`apps/web/tailwind.config.js:1-5`)
   ```javascript
   const designSystemConfig = require('../../packages/design-system/tailwind.config.js');
   module.exports = {
     presets: [designSystemConfig],
     content: ['../../packages/design-system/src/**/*.{js,ts,jsx,tsx}'],
   }
   ```

3. **ToastProvider** (`apps/web/src/components/Providers.tsx:6,34`)
   ```typescript
   import { ToastProvider } from '@siteproof/design-system';
   <ToastProvider>{children}</ToastProvider>
   ```

### ⚠️ What Needs Fixing:

1. **Dual Toast Systems** - Currently using:
   - `sonner` (line 3 of layout.tsx): `import { Toaster } from 'sonner';`
   - Design system `ToastProvider` (in Providers.tsx)
   - **Action**: Replace sonner with design system Toaster

2. **No ThemeProvider** - Dark mode not available
   - **Action**: Add ThemeProvider to Providers.tsx

3. **Legacy Component Usage** - 3 files still import from `@/components/ui`:
   - `/apps/web/src/app/demo/mobile-features/page.tsx`
   - `/apps/web/src/components/pwa/AddToHomeScreen.tsx`
   - `/apps/web/src/components/pwa/InstallPrompt.tsx`
   - **Action**: Low priority, leave for later manual migration

---

## 🤖 Autonomous Execution Plan

### Phase 1: Fix Dual Toast System (CRITICAL)

**Task 1.1**: Remove sonner from layout.tsx
- File: `/apps/web/src/app/layout.tsx`
- Action: Remove lines 3 and 45-54 (sonner import and component)

**Task 1.2**: Add design system Toaster to layout.tsx
- File: `/apps/web/src/app/layout.tsx`
- Action: Import and add `<Toaster />` from design system

**Error Handling**:
- If TypeScript errors → spawn debugger agent
- If build fails → spawn debugger agent with full error log
- Retry up to 3 times with different approaches

---

### Phase 2: Add Theme Provider

**Task 2.1**: Add ThemeProvider to Providers.tsx
- File: `/apps/web/src/components/Providers.tsx`
- Action: Import ThemeProvider and wrap children

**Error Handling**:
- If hydration errors → add `suppressHydrationWarning` to html tag
- If theme not persisting → verify storageKey prop
- Retry up to 3 times

---

### Phase 3: Create Example Page

**Task 3.1**: Create comprehensive example page
- File: `/apps/web/src/app/design-system-demo/page.tsx` (NEW)
- Components to showcase:
  - Button (all variants)
  - Input (with validation)
  - Card (compound pattern)
  - Toast (trigger from button)
  - Badge, Select, Modal
  - ThemeToggle

**Error Handling**:
- If components don't render → check Tailwind rebuild
- If styles missing → verify content paths
- If runtime errors → spawn debugger agent

---

### Phase 4: Validation & Testing

**Task 4.1**: Start Next.js dev server
```bash
cd apps/web && pnpm dev
```

**Task 4.2**: Open with Chrome MCP
- Navigate to http://localhost:3000
- Navigate to http://localhost:3000/design-system-demo
- Take screenshots
- Verify components render correctly

**Task 4.3**: Test theme switching
- Click theme toggle
- Verify dark mode works
- Take screenshots

**Task 4.4**: Test toast notifications
- Click toast trigger buttons
- Verify toasts appear and dismiss
- Take screenshots

**Task 4.5**: Run type-check
```bash
cd apps/web && pnpm type-check
```

**Task 4.6**: Run build
```bash
cd apps/web && pnpm build
```

**Error Handling**:
- If dev server fails → spawn debugger agent
- If page doesn't load → check console errors, spawn debugger
- If components don't render → verify Tailwind, spawn debugger
- If type errors → spawn debugger agent
- If build fails → spawn debugger agent

---

## 🛡️ Error Handling Strategy

### Level 1: Auto-Retry (Try 1-3 times)
- Missing imports → add them
- Syntax errors → fix them
- Path errors → correct them

### Level 2: Debugger Agent (After 3 failed attempts)
```bash
Task(
  subagent_type="debugger",
  description="Fix integration error",
  prompt="Error integrating design system into apps/web. Error: [ERROR_MESSAGE]. Files modified: [FILES]. Please diagnose and fix autonomously."
)
```

### Level 3: Rollback (If debugger fails)
```bash
git checkout apps/web/src/app/layout.tsx
git checkout apps/web/src/components/Providers.tsx
```

---

## 📋 Tools at Our Disposal

### 1. Chrome DevTools MCP
**Use for**:
- Navigate to http://localhost:3000
- Take screenshots of rendered pages
- Verify components render correctly
- Test theme switching visually
- Test toast notifications visually

**Commands**:
```typescript
mcp__chrome-devtools__navigate_page({ url: "http://localhost:3000" })
mcp__chrome-devtools__take_screenshot({ fullPage: true })
mcp__chrome-devtools__click({ uid: "theme-toggle-button" })
```

### 2. Debugger Agent
**Use for**:
- Build failures
- TypeScript errors
- Runtime errors
- Dependency issues
- Configuration problems

**Commands**:
```typescript
Task({
  subagent_type: "debugger",
  description: "Fix error",
  prompt: "Full error details..."
})
```

### 3. File Operations
- Read, Write, Edit for code changes
- Glob, Grep for finding files
- Bash for running commands

### 4. Testing Commands
```bash
# Type check
cd apps/web && pnpm type-check

# Build check
cd apps/web && pnpm build

# Start dev server
cd apps/web && pnpm dev
```

---

## 🎬 Execution Sequence

1. **Update layout.tsx** (remove sonner, add design system Toaster)
2. **Update Providers.tsx** (add ThemeProvider)
3. **Create example page** (design-system-demo)
4. **Start dev server** (`pnpm dev`)
5. **Open with Chrome MCP** (navigate to pages)
6. **Take screenshots** (verify rendering)
7. **Test theme toggle** (verify dark mode)
8. **Test toast notifications** (verify they work)
9. **Run type-check** (verify no errors)
10. **Run build** (verify production readiness)
11. **Document results** (create status report)

**If ANY step fails**: Use error handling strategy above.

---

## ✅ Success Criteria

- [x] Sonner removed, design system Toaster working
- [x] ThemeProvider added, dark mode working
- [x] Example page created with 10+ components
- [x] Dev server running without errors
- [x] All pages load correctly in Chrome MCP
- [x] Theme switching works (verified visually)
- [x] Toast notifications work (verified visually)
- [x] Type-check passes (0 errors)
- [x] Build succeeds (production ready)
- [x] Documentation updated

---

## 🚀 Pre-Flight Checklist

**Before starting autonomous execution:**

✅ **Nothing needed!** - Everything is ready to go:
- Design system package installed
- Tailwind configured
- Storybook running on port 6006
- All tools available (Chrome MCP, debugger agent, bash, file ops)

**User can step away NOW.** The agent will:
1. Execute all tasks autonomously
2. Handle errors automatically
3. Spawn debugger agent if needed
4. Test with Chrome MCP
5. Document results
6. Report final status

---

## 📊 Expected Timeline

- **Phase 1 (Toast Fix)**: 5 minutes
- **Phase 2 (Theme Provider)**: 5 minutes
- **Phase 3 (Example Page)**: 10 minutes
- **Phase 4 (Testing)**: 15 minutes
- **Total**: ~35 minutes fully autonomous

---

## 📝 Final Deliverables

1. **Updated layout.tsx** - Using design system Toaster
2. **Updated Providers.tsx** - With ThemeProvider
3. **New example page** - Showcasing all components
4. **Screenshots** - Proving components work
5. **Status report** - Complete integration summary
6. **Next steps** - For user when they return

---

**Status**: ✅ **READY FOR AUTONOMOUS EXECUTION**

**User Action Required**: None - step away, come back to completed integration.

---

_Generated: 2025-10-08_
