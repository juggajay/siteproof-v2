# Report Deletion Fix - Action Checklist

**Issue**: Reports delete successfully in Chrome DevTools but reappear in production browser
**Root Cause**: Service worker caching stale data
**Status**: ✅ Code fixed, user action required

---

## ✅ Immediate User Fix (DO THIS NOW)

### Step 1: Clear Service Worker
1. Open the browser where reports are reappearing
2. Press **F12** to open Developer Tools
3. Click the **Application** tab at the top
4. In the left sidebar, click **Service Workers**
5. You should see "siteproof-v2" or similar
6. Click **Unregister** next to it
7. Close Developer Tools
8. Press **Ctrl + Shift + R** (Windows/Linux) or **Cmd + Shift + R** (Mac) to hard refresh

### Step 2: Test Deletion
1. Navigate to the reports page
2. Find a report you want to delete
3. Click the delete (trash) icon
4. Confirm deletion
5. ✅ Report should disappear immediately and NOT reappear

### Step 3: If Still Not Working
Try these alternatives:

**Option A - Test in Incognito/Private Mode**:
- Press **Ctrl + Shift + N** (Chrome) or **Ctrl + Shift + P** (Firefox)
- Log in to the application
- Try deleting a report
- If it works here, confirm it's a caching issue

**Option B - Clear All Site Data**:
1. Open Developer Tools (**F12**)
2. Go to **Application** tab
3. Click **Storage** in left sidebar
4. Click **Clear site data** button
5. Confirm and refresh page
6. Log back in and test

---

## ⚠️ For Developers: Verify Database Migration

### Check if Migration 0031 is Applied

**Run this in Supabase SQL Editor**:
```sql
SELECT
  polname as policy_name,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';
```

**Expected result**: One row with policy name `report_queue_delete_allow_org_members`

### If Migration NOT Applied

**Option 1 - Run from file**:
```bash
psql $DATABASE_URL -f packages/database/migrations/0031_final_fix_report_delete_permissions.sql
```

**Option 2 - Paste in Supabase SQL Editor**:
1. Open Supabase Dashboard → SQL Editor
2. Create new query
3. Paste contents of `/packages/database/migrations/0031_final_fix_report_delete_permissions.sql`
4. Click **Run**

**Option 3 - Use verification script**:
```bash
psql $DATABASE_URL -f scripts/verify-report-deletion-rls.sql
```

---

## ✅ Code Changes Already Made

### 1. Service Worker Updated (v2.1.0 → v2.2.0)
**File**: `/apps/web/public/sw.js`
- ✅ Added cache invalidation for report deletions
- ✅ Bumped cache version to force refresh
- ✅ Matches existing ITP cache invalidation pattern

### 2. Backend Code (Already Correct)
**File**: `/apps/web/src/app/api/reports/[id]/route.ts`
- ✅ Version logging for debugging
- ✅ No-cache headers on DELETE response
- ✅ Proper error handling
- ✅ RLS policy alignment

### 3. Frontend Code (Already Correct)
**File**: `/apps/web/src/features/reporting/components/RecentReportsList.tsx`
- ✅ Optimistic UI updates
- ✅ React Query cache invalidation
- ✅ Realtime subscriptions for live updates

---

## 🔍 Verification Steps

### 1. Check Service Worker Version
Open browser console and run:
```javascript
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(reg => {
    console.log('Service Worker:', reg.active?.scriptURL);
  });
});
```

Should show: `sw.js` (will be v2.2.0 after cache clear)

### 2. Check Cache Contents
Open browser console and run:
```javascript
caches.keys().then(keys => {
  console.log('Cache versions:', keys);
});
```

After clearing, should show: `siteproof-v2-dynamic-v2.2.0`

### 3. Test DELETE Request
1. Open Developer Tools (**F12**)
2. Go to **Network** tab
3. Filter by "reports"
4. Delete a report
5. Look for **DELETE** request to `/api/reports/[id]`
6. Check response:
   - Status: **200 OK**
   - Body: `{"success": true, "deletedCount": 1}`

### 4. Monitor Console Logs
When deleting a report, you should see:
```
[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v2
[DELETE /api/reports/[id]] Report ID: <id>
[DELETE /api/reports/[id]] User lookup result: ...
Successfully deleted report: <id> Deleted rows: 1
```

---

## 📊 Environment Comparison

| Component | Test Browser | Production Browser | Status |
|-----------|-------------|-------------------|--------|
| Database URL | slzmbpntjoaltasfxiiv.supabase.co | slzmbpntjoaltasfxiiv.supabase.co | ✅ Same |
| Next.js Server | localhost:3000 (PID 43093) | localhost:3000 (PID 43093) | ✅ Same |
| Code Version | 2025-10-11-v2 | 2025-10-11-v2 | ✅ Same |
| Service Worker | v2.2.0 (or cache disabled) | v2.1.0 (stale cache) | ❌ Different |

**Conclusion**: Both browsers use the same environment. The difference is client-side cache state.

---

## 🚨 Troubleshooting

### Problem: "Report not found" error when deleting
**Possible causes**:
- Report already deleted
- RLS policy blocking deletion
- User not in organization

**Solutions**:
1. Refresh the page to get latest report list
2. Check user's role in organization
3. Run debug function:
   ```sql
   SELECT * FROM debug_report_delete_permission('<report-id>'::uuid);
   ```

### Problem: DELETE returns 200 but deletedCount is 0
**Cause**: RLS policy is blocking the deletion

**Solutions**:
1. Verify migration 0031 is applied (see above)
2. Check user is in the same organization as the report
3. Check database logs for RLS errors

### Problem: Reports still reappear after clearing cache
**Possible causes**:
- Service worker re-registered automatically with old version
- Browser extensions interfering
- Multiple browser tabs open

**Solutions**:
1. Close ALL tabs of the application
2. Disable browser extensions
3. Test in incognito mode
4. Completely restart the browser

---

## 📁 Documentation Files

All diagnostic information is in `/docs/`:
1. **`report-deletion-environment-diagnostic.md`** - Detailed technical analysis
2. **`report-deletion-quick-fix-guide.md`** - User-friendly troubleshooting
3. **`report-deletion-diagnosis-summary.md`** - Executive summary
4. **`REPORT-DELETION-FIX-CHECKLIST.md`** - This file

Database verification script:
- **`/scripts/verify-report-deletion-rls.sql`** - Run to check RLS configuration

---

## ✅ Success Criteria

After following this checklist, you should see:
- ✅ Reports delete immediately when clicking trash icon
- ✅ Deleted reports do NOT reappear on page refresh
- ✅ Console shows "Successfully deleted report" message
- ✅ DELETE request returns 200 status with deletedCount: 1
- ✅ Service worker cache version is v2.2.0

---

## 🎯 Summary

**What was wrong**: Service worker cached `/api/reports` responses but didn't invalidate cache when reports were deleted.

**What we fixed**: Updated service worker (v2.2.0) to invalidate report caches on DELETE operations.

**What user needs to do**: Clear service worker cache once to get the updated version.

**Long-term solution**: Updated service worker will automatically invalidate cache on future deletions.

---

## Questions?

If issues persist after following this checklist:
1. Check browser console for errors
2. Review network tab for failed requests
3. Verify database migration status
4. Check Supabase logs for RLS policy errors

All environment configurations are confirmed to be identical between test and production browsers. The issue is purely client-side caching.
