# Quick Fix Guide: Report Deletion Issue

## Problem
Reports delete in Chrome DevTools test browser but reappear in production browser.

## Root Cause
**Service worker is caching API responses**. Both browsers use the same database, but the production browser has stale cached data.

---

## Immediate User Fix (No Code Changes Needed)

### Option 1: Clear Service Worker (Recommended)
1. Open the browser where reports are reappearing
2. Press `F12` to open DevTools
3. Go to **Application** tab
4. Click **Service Workers** in left sidebar
5. Find "siteproof-v2" and click **Unregister**
6. Close DevTools
7. Press `Ctrl + Shift + R` to hard refresh

### Option 2: Disable Cache While DevTools Open
1. Open DevTools (`F12`)
2. Go to **Network** tab
3. Check ✅ **Disable cache**
4. Keep DevTools open while testing
5. Try deleting report again

### Option 3: Clear All Site Data
1. Open DevTools (`F12`)
2. Go to **Application** tab
3. Click **Storage** in left sidebar
4. Click **Clear site data** button at top
5. Confirm and refresh page

---

## Developer Fix (Permanent Solution)

### Check Database Migration Status

Run this in Supabase SQL Editor:

```sql
-- Verify correct DELETE policy exists
SELECT
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';
```

**Expected**: One policy named `report_queue_delete_allow_org_members`

**If migration 0031 is NOT applied:**
```bash
# Run migration
psql <connection-string> -f packages/database/migrations/0031_final_fix_report_delete_permissions.sql
```

---

## Verification Steps

### 1. Check if Service Worker is Caching

Open browser console and run:

```javascript
// Check cache contents
caches.keys().then(async keys => {
  console.log('Cache keys:', keys);
  for (const key of keys) {
    if (key.includes('dynamic')) {
      const cache = await caches.open(key);
      const requests = await cache.keys();
      const reportRequests = requests.filter(r => r.url.includes('/api/reports'));
      console.log(`${key}: ${reportRequests.length} cached /api/reports requests`);
    }
  }
});
```

### 2. Check Realtime Connection

```javascript
// Check if realtime subscription is active
if (window.supabaseClient) {
  console.log('Realtime channels:', window.supabaseClient.getChannels());
}
```

### 3. Monitor DELETE Request

1. Open DevTools → **Network** tab
2. Filter by `reports`
3. Delete a report
4. Look for DELETE request to `/api/reports/[id]`
5. Check response:
   - Status should be **200**
   - Response body should show `"success": true, "deletedCount": 1`

### 4. Check API Version

Look in console for this log when deleting:
```
[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v2
```

If you see a different version or no version, the code hasn't been compiled yet.

---

## Troubleshooting

### Issue: Reports still reappear after clearing cache

**Possible causes:**
1. Service worker re-registered automatically
2. Browser extensions interfering
3. Database migration not applied

**Solutions:**
- Completely close and reopen browser
- Test in incognito/private mode
- Disable browser extensions
- Verify migration with SQL query above

### Issue: DELETE returns 404 or 403

**Possible causes:**
1. RLS policy not allowing deletion
2. User not in organization
3. Report already deleted

**Solutions:**
- Check user's role in organization
- Verify report exists: `SELECT * FROM report_queue WHERE id = '<report-id>'`
- Run debug function:
  ```sql
  SELECT * FROM debug_report_delete_permission('<report-id>'::uuid);
  ```

### Issue: DELETE returns 200 but deletedCount is 0

**This is the RLS policy blocking the deletion.**

**Debug steps:**
```sql
-- Check if policy exists
SELECT polname FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

-- If no policy exists, migration 0031 wasn't applied
-- Re-run the migration
```

---

## Code Changes Made

### 1. Service Worker Cache Invalidation
File: `/public/sw.js`

Added cache invalidation for DELETE operations on reports (similar to existing ITP deletion handling).

### 2. Backend Logging
File: `/app/api/reports/[id]/route.ts`

Already includes:
- ✅ Version logging (`CODE VERSION: 2025-10-11-v2`)
- ✅ No-cache headers on DELETE response
- ✅ Detailed error logging

### 3. Frontend Cache Management
File: `/features/reporting/components/RecentReportsList.tsx`

Already includes:
- ✅ Optimistic updates (line 496-499)
- ✅ Query invalidation (line 552-556)
- ✅ Realtime subscriptions (line 177-230)

---

## Next Steps

1. **User should clear service worker** using Option 1 above
2. **Verify migration 0031 is applied** in database
3. **Implement permanent fix** by updating service worker
4. **Test in both browsers** to confirm fix works

---

## Key Insights

- ✅ Both browsers connect to **same database** (slzmbpntjoaltasfxiiv.supabase.co)
- ✅ Both browsers use **same Next.js server** (PID 43093)
- ✅ Both browsers run **same code version** (CODE VERSION: 2025-10-11-v2)
- ❌ **Different service worker cache states** causing the issue

**This is NOT an environment difference. It's a client-side caching issue.**
