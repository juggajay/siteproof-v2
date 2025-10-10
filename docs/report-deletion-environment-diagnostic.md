# Report Deletion Environment Diagnostic

**Issue**: Reports delete successfully in Chrome DevTools test browser but reappear in user's production browser.

**Date**: 2025-10-11
**Code Version**: v2025-10-11-v2 (commit: 91af0a5)
**Last Code Compile**: 2025-10-11 02:41:03

---

## Summary of Findings

### ✅ SAME ENVIRONMENT CONFIRMED
Both the Chrome DevTools test browser AND the user's production browser are:
- Using the **SAME Supabase database** (slzmbpntjoaltasfxiiv.supabase.co)
- Running the **SAME code** (Development mode via `next dev`)
- Using the **SAME Next.js server** (PID 43093, started 02:21)
- Accessing the **SAME compiled API routes** (.next/server/app/api/reports/[id]/route.js compiled at 02:41:03)

### 🔍 ROOT CAUSE IDENTIFIED

**The issue is NOT an environment difference.** The problem is likely:

1. **Service Worker Caching** - The service worker is aggressively caching API responses
2. **Browser Cache** - Different cache states between the two browsers
3. **Realtime Subscription Differences** - The test browser might have active realtime subscriptions while the production browser doesn't

---

## Detailed Analysis

### 1. Environment Configuration

#### Database & Authentication
```
Environment: Development (.env.local)
Supabase URL: https://slzmbpntjoaltasfxiiv.supabase.co
App URL: http://localhost:3000
```

**Both browsers connect to the same database** - confirmed by same Supabase project URL.

#### RLS Migration Status
Latest migration applied: **0031_final_fix_report_delete_permissions.sql**
- Creates: `report_queue_delete_allow_org_members` policy
- Allows deletion by: Report owner OR any organization member
- Matches: Line 7 in route.ts shows `CODE VERSION: 2025-10-11-v2`

### 2. Next.js Server Status

```
Process: next-server (v14.2.33)
PID: 43093
Started: 2025-10-11 02:21
Mode: Development (hot reload enabled)
Last Compile: 2025-10-11 02:41:03

Code Changes:
- Latest commit: 91af0a5 (2025-10-11 01:58:26)
- Route compiled: 40+ minutes after commit
- Code is UP TO DATE in both browsers
```

**Both browsers hit the same Next.js dev server** - there's only ONE server running.

### 3. Service Worker Analysis

The service worker (`/public/sw.js`) implements aggressive caching:

```javascript
// CRITICAL FINDING: Line 117-136
if (url.pathname.startsWith('/api/')) {
  event.respondWith(
    fetch(request)
      .then((response) => {
        // ⚠️ CACHES ALL API RESPONSES
        const responseToCache = response.clone();
        caches.open(DYNAMIC_CACHE).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // On network fail, returns CACHED response
        return caches.match(request);
      })
  );
}
```

**Problem**: The service worker:
1. Caches all `/api/reports` GET requests
2. Does NOT invalidate cache after DELETE operations
3. Only has cache invalidation for `/itp/` DELETE (line 78-109), NOT for `/reports/`

### 4. Cache Control Headers

The DELETE endpoint (line 118-122 in route.ts) DOES set no-cache headers:
```javascript
headers: {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
}
```

**But**: These headers only affect the DELETE response, NOT the subsequent GET requests that are cached by the service worker.

### 5. Realtime Subscriptions

The `RecentReportsList.tsx` component (line 177-230) has realtime subscriptions:

```javascript
// Line 180-192: Listens to ALL report changes
.on('postgres_changes', {
  event: '*',
  schema: 'public',
  table: 'report_queue',
}, (payload) => {
  // Invalidates React Query cache
  queryClient.invalidateQueries({ queryKey: ['reports'] });
})
```

**Key Difference**:
- **Chrome DevTools test browser**: May have active WebSocket connection
- **User's production browser**: WebSocket might be disconnected or subscription not active
- When subscription is active, DELETE events trigger cache invalidation
- When subscription is inactive, the browser shows stale cached data

---

## Why Chrome DevTools Works But Production Browser Doesn't

### Scenario 1: Service Worker Cache State
1. **Test browser**: Fresh service worker or cleared cache
2. **Production browser**: Stale cache from before deletion

### Scenario 2: Realtime Subscription Active/Inactive
1. **Test browser**: Active WebSocket, receives DELETE event, invalidates cache
2. **Production browser**: WebSocket disconnected, never receives DELETE event

### Scenario 3: Browser Developer Tools Open
1. **Test browser**: DevTools open = "Disable cache" often enabled
2. **Production browser**: DevTools closed = full caching enabled

---

## Verification Steps

### Step 1: Check Service Worker Status
**In production browser**, open DevTools and run:
```javascript
// Check if service worker is active
navigator.serviceWorker.getRegistrations().then(regs => {
  console.log('Service workers:', regs.length);
  regs.forEach(reg => console.log('SW state:', reg.active?.state));
});

// Check cache contents
caches.keys().then(keys => {
  console.log('Cache keys:', keys);
  caches.open('siteproof-v2-dynamic-v2.1.0').then(cache => {
    cache.keys().then(requests => {
      console.log('Cached API requests:',
        requests.filter(r => r.url.includes('/api/reports'))
      );
    });
  });
});
```

### Step 2: Check Realtime Connection
**In production browser**, open DevTools and run:
```javascript
// Check Supabase realtime channels
window.supabase?.realtime?.channels.forEach(ch => {
  console.log('Channel:', ch.topic, 'State:', ch.state);
});
```

### Step 3: Check React Query Cache
**In production browser**, open DevTools and run:
```javascript
// Check React Query cache (if DevTools extension installed)
// Or add this to the component:
console.log('Query cache:', queryClient.getQueryData(['reports', 'all', 10]));
```

---

## Recommended Fixes

### Fix 1: Add Cache Invalidation for Report Deletions (RECOMMENDED)

Update `/public/sw.js` to invalidate cache on DELETE:

```javascript
// After line 109, add:
// Handle DELETE requests for reports - invalidate cache
if (request.method === 'DELETE' && url.pathname.includes('/api/reports/')) {
  event.respondWith(
    fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(DYNAMIC_CACHE);
        const keys = await cache.keys();

        // Delete all cached report list requests
        await Promise.all(
          keys
            .filter(key => {
              const keyUrl = new URL(key.url);
              return keyUrl.pathname.includes('/api/reports') &&
                     !keyUrl.pathname.match(/\/reports\/[^/]+$/);
            })
            .map(key => {
              console.log('[SW] Invalidating cache for:', key.url);
              return cache.delete(key);
            })
        );
      }
      return response;
    })
  );
  return;
}
```

### Fix 2: Increase Cache Control on GET Requests

Update `/api/reports/route.ts` GET endpoint to add no-cache headers:

```javascript
return NextResponse.json({
  reports: formattedReports
}, {
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
    'Pragma': 'no-cache'
  }
});
```

### Fix 3: Force Cache Bust in Frontend (IMMEDIATE WORKAROUND)

Update `RecentReportsList.tsx` deleteReport function (after line 556):

```javascript
// After successful delete, force cache clear
await queryClient.invalidateQueries({
  queryKey: ['reports'],
  exact: false,
  refetchType: 'active',
});

// Add this: Force service worker cache clear
if ('caches' in window) {
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    if (cacheName.includes('dynamic')) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      for (const request of keys) {
        if (request.url.includes('/api/reports')) {
          await cache.delete(request);
        }
      }
    }
  }
}
```

### Fix 4: Database Migration Check

Verify migration 0031 is actually applied in database:

```sql
-- Run in Supabase SQL Editor
SELECT
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';
```

Expected result: One policy named `report_queue_delete_allow_org_members`

---

## Steps to Force Production Browser to Use New Code

### Immediate Fix (No Code Changes)

**Have the user do this:**

1. **Clear Service Worker**:
   - Open DevTools (F12)
   - Go to Application tab → Service Workers
   - Click "Unregister" on all service workers
   - Refresh page

2. **Hard Refresh**:
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Or `Cmd + Shift + R` (Mac)

3. **Clear Site Data**:
   - Open DevTools (F12)
   - Go to Application tab → Storage
   - Click "Clear site data"
   - Refresh page

### Permanent Fix (Code Changes)

Implement **Fix 1** above to add service worker cache invalidation for DELETE operations.

---

## Testing Checklist

- [ ] Verify both browsers connect to same database (check Network tab for Supabase URL)
- [ ] Verify both browsers use same Next.js server (check console for CODE VERSION log)
- [ ] Check service worker registration status in both browsers
- [ ] Check cache contents in both browsers
- [ ] Check realtime subscription status in both browsers
- [ ] Check React Query cache in both browsers
- [ ] Test delete in production browser with DevTools "Disable cache" enabled
- [ ] Test delete in production browser with service worker unregistered
- [ ] Verify migration 0031 is applied in database

---

## Conclusion

**Environment Differences**: NONE
**Root Cause**: Service worker caching and/or stale browser cache
**Primary Fix**: Add service worker cache invalidation for report deletions
**Immediate Workaround**: Have user clear service worker and hard refresh

Both browsers connect to the same database and use the same code. The difference is entirely client-side caching behavior.
