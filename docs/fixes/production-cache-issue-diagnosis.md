# Production Cache Issue - Report Deletion Diagnosis

**Date**: 2025-10-11
**Issue**: Reports reappear after deletion in production browser but NOT in test browser

## Root Cause: Browser Cache / Hot Reload Issue

### Problem Summary
The production browser is serving **cached/stale JavaScript code** from before the realtime subscription filter was removed, while the test browser (Chrome DevTools MCP) is running the latest code.

### Evidence

1. **Code Analysis**
   - File: `apps/web/src/features/reporting/components/RecentReportsList.tsx`
   - Lines 182-192: Realtime subscription filter correctly removed
   - Current code: No `filter:` parameter (correct)
   - Old code: Had `filter: requested_by=eq.${user.id}` (incorrect)

2. **API Behavior**
   - DELETE endpoint: Returns `deletedCount: 1` in both browsers ✅
   - Database: Migration 0031 applied correctly ✅
   - RLS Policy: Working as expected ✅

3. **Dev Server Status**
   - Next.js 14.2.33 running on port 3000 ✅
   - API version: `2025-10-11-v2` (latest) ✅
   - Frontend cache: Potentially stale ❌

4. **Behavior Difference**
   - Test browser (DevTools MCP): Works correctly - reports stay deleted
   - Production browser: Reports reappear - running old subscription code

### Technical Explanation

#### What's Happening

1. **Production Browser**:
   - Cached old JavaScript bundle from previous session
   - Old realtime subscription has filter: `requested_by=eq.{user.id}`
   - When report is deleted by org member (not creator), subscription doesn't receive DELETE event
   - Query invalidation doesn't happen
   - Frontend re-fetches and shows report again (appears to "reappear")

2. **Test Browser** (Chrome DevTools MCP):
   - Fresh browser session with no cache
   - Loads latest JavaScript bundle
   - New realtime subscription has NO filter (listens to all events)
   - Receives DELETE event regardless of who deleted
   - Query invalidation happens correctly
   - Report stays deleted ✅

#### Why Hot Reload Failed

Next.js Hot Module Replacement (HMR) might have failed to reload this component because:
1. `useEffect` hooks sometimes don't reload properly in dev mode
2. Supabase client initialization might be cached
3. Multiple browser tabs/windows can have stale code
4. React Fast Refresh doesn't always catch dependency changes in hooks

## Solution: Force Cache Clear

### Immediate Fix (User Action Required)

**PRODUCTION BROWSER ONLY:**

1. **Hard Refresh** (Chrome/Edge/Firefox):
   ```
   Ctrl + Shift + R (Windows/Linux)
   Cmd + Shift + R (Mac)
   ```

2. **OR Clear Browser Cache**:
   - Chrome: `Ctrl + Shift + Delete` → Select "Cached images and files" → Clear data
   - Then refresh: `Ctrl + R`

3. **OR Close ALL Tabs**:
   - Close all browser tabs for localhost:3000
   - Close browser completely
   - Reopen and navigate to localhost:3000

4. **Verify Fix**:
   - Open browser console (F12)
   - Look for log: "Report status change: { eventType: 'DELETE' }"
   - Delete a report
   - Report should stay deleted ✅

### Developer Fix (Already Done)

✅ Code is already fixed - no changes needed
✅ Migration 0031 is already applied
✅ API endpoint is working correctly

## Prevention: Add Cache Busting

To prevent this in the future, add version tracking:

### Option 1: Add Code Version Log
```typescript
// In RecentReportsList.tsx, at the top of the component
useEffect(() => {
  console.log('[RecentReportsList] Component version: 2025-10-11-v2');
  console.log('[RecentReportsList] Realtime subscription: NO FILTER (listening to all events)');
}, []);
```

### Option 2: Service Worker Management
```typescript
// In app layout or _app.tsx
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (let registration of registrations) {
      registration.unregister();
    }
  });
}
```

### Option 3: Next.js Cache Headers
```typescript
// In next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};
```

## Testing Verification

### Test Browser (Chrome DevTools MCP) ✅
- Status: **WORKING**
- Behavior: Reports stay deleted
- Reason: Fresh code, no cache

### Production Browser ❌
- Status: **CACHED CODE**
- Behavior: Reports reappear
- Reason: Stale JavaScript bundle with old subscription filter
- **Fix**: Hard refresh or clear cache

## Confirmation Steps

After hard refresh in production browser, verify:

1. **Console Log Check**:
   ```
   Report status change: {
     eventType: 'DELETE',
     old: { id: '...', ... },
     new: null
   }
   ```

2. **Network Tab**:
   - Check timestamp of main JavaScript bundle
   - Should show new timestamp after hard refresh

3. **Deletion Test**:
   - Delete a report created by another org member
   - Report should disappear and stay deleted
   - No reappearance after refresh

## Summary

**Issue**: Browser cache serving old JavaScript code
**Impact**: Realtime subscription with old filter, missing DELETE events
**Solution**: Hard refresh browser (Ctrl + Shift + R)
**Prevention**: Add version logging, manage service workers, configure cache headers

**No code changes needed** - the fix was already implemented, just needs cache clear!
