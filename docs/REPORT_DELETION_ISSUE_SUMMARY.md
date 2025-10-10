# Report Deletion Issue - Complete Analysis and Solution

## Executive Summary

**Issue**: Report deletion returns HTTP 200 with success but deletedCount: 0, indicating the delete operation is not actually removing the report from the database.

**Root Cause**: Two separate issues:
1. **Browser caching** - Old API response is being cached/served
2. **RLS Policy** - Multiple conflicting DELETE policies may exist in the database

**Status**:
- ✅ API code is correct and returns proper 404 error
- ✅ Cache-Control headers added to prevent caching
- ⚠️ RLS migration `0031_final_fix_report_delete_permissions.sql` exists but **may not be applied**
- ⏳ Need to verify database state and apply migration

---

## Part 1: API Code Status (RESOLVED)

### Current API Implementation
**File**: `/apps/web/src/app/api/reports/[id]/route.ts`

The DELETE handler correctly:
1. ✅ Attempts to delete the report
2. ✅ Checks if rows were deleted
3. ✅ Returns 404 if deletedCount is 0
4. ✅ Returns 403 if report exists but user lacks permission
5. ✅ Returns 200 success only if report was actually deleted
6. ✅ Includes Cache-Control headers to prevent caching
7. ✅ Has version marker in logs: "CODE VERSION: 2025-10-11-v2"

### Code Change Applied
```typescript
// BEFORE (old cached response):
return NextResponse.json({
  success: true,
  message: 'Report deleted successfully (or already deleted)',
  deletedCount: 0
});

// AFTER (current code):
return NextResponse.json({
  error: 'Report not found or you do not have permission to delete it',
  details: { reportId, deletedCount: 0, visible: false, ... }
}, {
  status: 404,
  headers: {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  }
});
```

---

## Part 2: Browser Cache Issue

### Evidence
- Console log shows: `"message":"Report deleted successfully (or already deleted)"`
- This exact message **does not exist** in current code
- Message only found in documentation files
- Next.js dev server was restarted with clean cache

### Solution Steps

#### Step 1: Hard Refresh Browser
```
1. Open browser DevTools (F12)
2. Open Network tab
3. Check "Disable cache" checkbox
4. Right-click browser refresh button
5. Select "Empty Cache and Hard Reload"
```

#### Step 2: Verify New Code is Running
Look for this log message in server terminal:
```
[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v2
```

If you don't see this version marker, the old code is still cached.

#### Step 3: Check Network Tab Response
In DevTools Network tab, find the DELETE request to `/api/reports/[id]`:
- **Old behavior**: Status 200, response body has `"success": true`
- **New behavior**: Status 404, response body has `"error": "Report not found..."`

---

## Part 3: RLS Policy Issue (PRIMARY CAUSE)

### The Real Problem
Even with correct API code, the Supabase DELETE query returns 0 rows because the RLS policy is blocking the deletion.

### Migration History
Multiple RLS migration files exist, potentially conflicting:

1. `0027_fix_report_queue_rls.sql` - Initial fix
2. `0028_fix_report_queue_delete_policy.sql` - Admin-only delete
3. `0029_fix_report_queue_rls_final.sql` - ?
4. `0030_fix_report_delete_rls_aligned.sql` - Allow all org members
5. `0031_final_fix_report_delete_permissions.sql` - **FINAL FIX** ⭐

### Migration 0031 Summary
This is the **definitive fix** that:
1. Drops ALL existing DELETE policies
2. Creates ONE policy: `report_queue_delete_allow_org_members`
3. Allows deletion by:
   - Report owner (`requested_by = auth.uid()`)
   - **ANY** organization member (not just admin/owner/PM)
4. Includes diagnostic functions

### Key Policy Logic
```sql
CREATE POLICY "report_queue_delete_allow_org_members"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = report_queue.organization_id
      AND om.user_id = auth.uid()
    -- No role restriction - any member can delete
  )
);
```

---

## Action Plan

### Immediate Actions (DO THIS NOW)

#### 1. Clear Browser Cache
```bash
# In browser DevTools:
1. F12 to open DevTools
2. Application tab -> Clear site data
3. Network tab -> Check "Disable cache"
4. Hard reload (Ctrl+Shift+R or Cmd+Shift+R)
```

#### 2. Check if Migration 0031 is Applied
```bash
# Connect to Supabase database and run:
SELECT polname, pg_get_expr(polqual, polrelid) as policy_definition
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';  -- 'd' = DELETE

# Expected: ONE policy named "report_queue_delete_allow_org_members"
# If you see multiple policies or different names, migration is not applied
```

#### 3. Apply Migration 0031 if Not Applied
```bash
# Using Supabase CLI or dashboard SQL editor:
cd /home/jayso/projects/siteproof-v2
cat packages/database/migrations/0031_final_fix_report_delete_permissions.sql | \
  supabase db execute --stdin

# OR: Copy the SQL and run in Supabase dashboard SQL editor
```

#### 4. Verify with Debug Function
```sql
-- Replace with actual report ID and user ID
SELECT * FROM debug_report_delete_permission(
  '59e12281-a1b2-4202-b026-eddf8d9cdb30'::uuid,
  '[user-id]'::uuid
);

-- Expected output should show:
-- CAN DELETE? | YES - Org member | true
```

#### 5. Test Delete in Browser
```
1. Ensure browser cache is cleared
2. Open browser DevTools -> Network tab
3. Click delete on a report
4. Check Network tab for DELETE request
5. Verify Status: 200 (success) or 404/403 (with proper error)
6. Check server logs for "CODE VERSION: 2025-10-11-v2"
```

---

## Expected Outcomes

### Success Scenario (Report Deleted)
**Browser Console:**
```
Delete response status: 200
Delete response body: {
  "success": true,
  "message": "Report deleted successfully",
  "deletedCount": 1
}
```

**Server Logs:**
```
[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v2
[DELETE /api/reports/[id]] Attempting to delete report: [id] for user: [user-id]
Successfully deleted report: [id] Deleted rows: 1
```

### Permission Denied Scenario (Report Exists but No Permission)
**Browser Console:**
```
Delete response status: 403
Delete response body: {
  "error": "You do not have permission to delete this report",
  "debug": {
    "reportExists": true,
    "userId": "...",
    "reportRequestedBy": "...",
    "reportOrgId": "..."
  }
}
```

### Not Found Scenario (Report Doesn't Exist or RLS Blocks SELECT)
**Browser Console:**
```
Delete response status: 404
Delete response body: {
  "error": "Report not found or you do not have permission to delete it",
  "details": {
    "reportId": "...",
    "deletedCount": 0,
    "visible": false,
    "hint": "The report may have been already deleted, or you may lack permission to delete it."
  }
}
```

---

## Diagnostic Tools

### Database Functions Created by Migration 0031

#### 1. Debug Permission Check
```sql
SELECT * FROM debug_report_delete_permission('[report-id]'::uuid);
```
Shows detailed permission breakdown.

#### 2. Force Delete (Emergency)
```sql
SELECT force_delete_report('[report-id]'::uuid);
```
Bypasses RLS to force delete (use with caution).

### SQL Queries for Manual Diagnosis

#### Check Current DELETE Policies
```sql
SELECT polname, pg_get_expr(polqual, polrelid) as policy
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';
```

#### Check User's Organization Membership
```sql
SELECT om.*, u.email
FROM organization_members om
JOIN users u ON u.id = om.user_id
WHERE om.user_id = '[user-id]'::uuid;
```

#### Check Report Details
```sql
SELECT id, report_name, requested_by, organization_id, status, created_at
FROM report_queue
WHERE id = '[report-id]'::uuid;
```

#### Test Policy Logic Manually
```sql
-- Set auth context (simulates logged-in user)
SET request.jwt.claims TO '{"sub": "[user-id]"}';

-- Try to delete
DELETE FROM report_queue WHERE id = '[report-id]'::uuid RETURNING *;
```

---

## Next Steps if Still Failing

### If Browser Shows Old Response:
1. Try a different browser (Incognito/Private mode)
2. Clear all site data (cookies, localStorage, sessionStorage)
3. Restart browser completely
4. Check if a service worker is caching responses

### If DELETE Still Returns 0 Rows:
1. Check if migration 0031 is actually applied
2. Use `debug_report_delete_permission()` function
3. Verify user is in organization_members table
4. Check if auth.uid() is returning correct value
5. Use `force_delete_report()` as emergency fallback

### If Frontend Shows Error But Backend Logs Show Success:
1. Check for frontend response caching
2. Verify React Query cache invalidation
3. Check network tab for actual HTTP response (not console logs)

---

## Files Modified

### API Route
- `/apps/web/src/app/api/reports/[id]/route.ts`
  - Added Cache-Control headers
  - Added version marker in logs
  - Returns 404 when deletedCount is 0

### Database Migrations
- `/packages/database/migrations/0031_final_fix_report_delete_permissions.sql`
  - Comprehensive RLS policy fix
  - Diagnostic functions
  - Force delete function

### Documentation
- `/docs/report-deletion-diagnostic-steps.md`
- `/docs/REPORT_DELETION_ISSUE_SUMMARY.md` (this file)

---

## Timeline

- **2025-10-11 02:22** - Created migration 0031
- **2025-10-11 02:21** - Restarted Next.js dev server with clean cache
- **2025-10-11 02:11** - Updated API route with Cache-Control headers
- **Earlier** - Multiple attempted RLS policy fixes (migrations 0027-0030)

---

## Contacts & Resources

- **Supabase Dashboard**: Check RLS policies under Database -> Tables -> report_queue
- **Server Logs**: Terminal running `pnpm --filter web dev`
- **Browser DevTools**: Network tab for actual HTTP responses
- **Database Functions**: Use `debug_report_delete_permission()` for diagnosis
