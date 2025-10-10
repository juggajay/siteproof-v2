# Backend API Deletion Flow Analysis

## Problem Summary

The DELETE API at `/api/reports/[id]` returns:
- **Status**: 200 (success)
- **Response**: `{"success":true,"message":"Report deleted successfully (or already deleted)","deletedCount":0}`
- **Issue**: `deletedCount` is 0, meaning the database DELETE operation did not remove any rows

## Root Cause Analysis

### 1. **RLS Policy Configuration Issue**

The main issue is that the **DELETE RLS policy is not applied or is blocking the deletion** at the database level.

#### Current DELETE Handler Flow
File: `/apps/web/src/app/api/reports/[id]/route.ts` (Lines 33-39)

```typescript
// Delete the report directly - RLS policies will enforce permissions
const { data: deletedData, error: deleteError } = await supabase
  .from('report_queue')
  .delete()
  .eq('id', reportId)
  .select();
```

**The Problem:**
- The DELETE query executes successfully (no error)
- BUT `deletedData` is an empty array `[]`
- This means RLS is silently blocking the deletion without raising an error

### 2. **RLS Policy State Confusion**

Looking at the git history and migration files, there have been **multiple attempts** to fix the DELETE policy:

```
0010_report_queue.sql        - Initial schema (NO DELETE policy)
0027_fix_report_queue_rls.sql - First attempt to add DELETE policy
0028_fix_report_queue_delete_policy.sql - Second attempt
0029_fix_report_queue_rls_final.sql - Latest comprehensive fix
```

**Key Issue:** The database may have conflicting or missing DELETE policies because:
1. Migration `0010` did not include a DELETE policy
2. Multiple subsequent migrations tried to add/fix it
3. The migrations may not have been applied to the production database

### 3. **Missing DELETE Policy in Original Schema**

File: `/packages/database/migrations/0010_report_queue.sql` (Lines 288-323)

```sql
-- RLS Policies
ALTER TABLE report_queue ENABLE ROW LEVEL SECURITY;

-- Users can see reports in their organization
CREATE POLICY "Users can view reports in their organization"
  ON report_queue FOR SELECT
  USING (organization_id IN (...));

-- Users can create reports in their organization
CREATE POLICY "Users can create reports in their organization"
  ON report_queue FOR INSERT
  WITH CHECK (organization_id IN (...));

-- Users can update their own reports
CREATE POLICY "Users can update their own reports"
  ON report_queue FOR UPDATE
  USING (...);

-- ❌ NO DELETE POLICY HERE!
```

**Result:** Users cannot delete any reports because there's no policy allowing it.

## Database-Level Analysis

### What's Happening at the Database Level

When the DELETE query executes:

```sql
DELETE FROM report_queue WHERE id = 'report-uuid';
```

With RLS enabled but NO DELETE policy, Postgres:
1. **Evaluates the DELETE**
2. **Checks RLS policies** for DELETE operation
3. **Finds NO policy** that allows deletion
4. **Returns 0 rows affected** (silent failure)
5. **Does NOT raise an error** (this is by design in RLS)

### Expected DELETE Policy

File: `/packages/database/migrations/0029_fix_report_queue_rls_final.sql` (Lines 84-99)

```sql
-- DELETE Policy: Consistent with visibility for proper 404 vs 403 handling
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User owns the report (can always delete their own)
  requested_by = auth.uid()
  OR
  -- User is admin/owner/project_manager in the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);
```

This policy should allow:
- Users to delete their own reports (`requested_by = auth.uid()`)
- Org admins/owners/project managers to delete any report in their org

## Verification Steps

### Step 1: Check Current RLS Policies

Run this SQL query in your Supabase SQL editor:

```sql
-- Check all policies on report_queue table
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command_type,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;
```

**Expected Result:**
You should see a policy with `command_type = 'DELETE'`. If you don't, that's the problem.

### Step 2: Check if User Can See the Report

Run this to verify SELECT policy works:

```sql
-- Replace USER_ID and REPORT_ID with actual values
SELECT
  id,
  report_name,
  requested_by,
  organization_id,
  status
FROM report_queue
WHERE id = 'REPORT_ID';
```

**If this returns the report:** The user can see it (SELECT policy works)
**If this returns nothing:** The user can't see it (problem with SELECT policy too)

### Step 3: Test DELETE Permission

Run this diagnostic query:

```sql
-- Check if the DELETE would work (without actually deleting)
SELECT
  rq.id,
  rq.report_name,
  rq.requested_by,
  rq.organization_id,
  auth.uid() as current_user,
  (rq.requested_by = auth.uid()) as is_owner,
  EXISTS(
    SELECT 1
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.organization_id = rq.organization_id
      AND om.role IN ('owner', 'admin', 'project_manager')
  ) as is_org_admin
FROM report_queue rq
WHERE rq.id = 'REPORT_ID';
```

**Expected Result:**
- `is_owner` should be `true` if user created the report
- `is_org_admin` should be `true` if user is admin in the org
- At least one should be `true` for deletion to work

## Solution

### Option 1: Apply the Migration (Recommended)

If you have access to run migrations:

```bash
# Apply the fix migration
npx supabase migration up

# Or manually run the SQL file
psql $DATABASE_URL -f packages/database/migrations/0029_fix_report_queue_rls_final.sql
```

### Option 2: Quick Fix SQL Script

If you can't run migrations, execute this directly in Supabase SQL Editor:

```sql
-- Drop any existing incomplete DELETE policies
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

-- Create the correct DELETE policy
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
);
```

### Option 3: Bypass RLS for Testing (NOT for Production)

To test if RLS is the issue, you can temporarily disable it:

```sql
-- ⚠️ DANGER: Only for testing!
ALTER TABLE report_queue DISABLE ROW LEVEL SECURITY;

-- Test your delete operation
-- DELETE FROM report_queue WHERE id = 'test-id';

-- Re-enable immediately after testing
ALTER TABLE report_queue ENABLE ROW LEVEL SECURITY;
```

## Code-Level Issues

### Issue 1: API Handler Logic

File: `/apps/web/src/app/api/reports/[id]/route.ts` (Lines 56-94)

The current logic treats `deletedCount = 0` as "already deleted" rather than a permission issue:

```typescript
if (!deletedData || deletedData.length === 0) {
  // This assumes the report doesn't exist
  // But it could also mean RLS blocked the deletion

  const { data: checkReport } = await supabase
    .from('report_queue')
    .select('id, requested_by, organization_id')
    .eq('id', reportId)
    .maybeSingle();

  if (checkReport) {
    // Report exists but wasn't deleted - permission issue
    return NextResponse.json(
      { error: 'You do not have permission to delete this report' },
      { status: 403 }
    );
  } else {
    // Report doesn't exist - idempotent success
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully (or already deleted)',
      deletedCount: 0,
    });
  }
}
```

**The Problem:** The `checkReport` query might ALSO be blocked by RLS if the user can't see the report. This makes it impossible to distinguish between:
- Report doesn't exist (404)
- User can't see report (403)
- User can see but can't delete (403)

**Better Approach:**

```typescript
// After the DELETE attempt
if (!deletedData || deletedData.length === 0) {
  // Try to see if we can SELECT the report
  const { data: checkReport, error: checkError } = await supabase
    .from('report_queue')
    .select('id, requested_by, organization_id')
    .eq('id', reportId)
    .maybeSingle();

  if (checkError) {
    console.error('Error checking report:', checkError);
    return NextResponse.json(
      { error: 'Failed to verify report status' },
      { status: 500 }
    );
  }

  if (checkReport) {
    // Report exists but DELETE returned 0 rows
    // This means RLS blocked the deletion
    return NextResponse.json(
      {
        error: 'You do not have permission to delete this report',
        debug: {
          reportId: reportId,
          userId: user.id,
          reportOwnerId: checkReport.requested_by,
          organizationId: checkReport.organization_id,
        },
      },
      { status: 403 }
    );
  } else {
    // Report not found - could be already deleted or never existed
    return NextResponse.json(
      {
        success: true,
        message: 'Report not found (already deleted or does not exist)',
        deletedCount: 0,
      },
      { status: 200 }
    );
  }
}
```

### Issue 2: Frontend Optimistic Update

File: `/apps/web/src/features/reporting/components/RecentReportsList.tsx` (Lines 468-558)

The frontend immediately removes the report from the UI (optimistic update) before checking if the DELETE succeeded:

```typescript
// Line 491: Optimistic update
queryClient.setQueryData<Report[]>(currentQueryKey, (oldData) => {
  if (!oldData) return oldData;
  return oldData.filter((report) => report.id !== reportId);
});

// Line 501-507: Then call the API
const response = await fetch(`/api/reports/${reportId}`, {
  method: 'DELETE',
  credentials: 'include',
});
```

**The Problem:** The UI shows the report as deleted even if the backend returns `deletedCount: 0`.

**Fix:** Check the `deletedCount` in the response:

```typescript
const result = JSON.parse(responseText);

// Check if deletion actually happened
if (result.deletedCount === 0 && !result.success) {
  throw new Error('Report could not be deleted - possibly a permission issue');
}

// If deletedCount is 0 but success is true, it means already deleted (OK)
if (result.deletedCount === 0) {
  console.warn('Report was not found or already deleted');
}

toast.success('Report deleted successfully', { id: `delete-${reportId}` });
```

## Testing Checklist

After applying the fix:

- [ ] **Test 1: User deletes their own report**
  - Create a report as User A
  - Delete it as User A
  - Should succeed with `deletedCount: 1`

- [ ] **Test 2: Admin deletes org report**
  - Create a report as User B (regular member)
  - Delete it as User A (admin)
  - Should succeed with `deletedCount: 1`

- [ ] **Test 3: Non-admin tries to delete other user's report**
  - Create a report as User A
  - Try to delete it as User B (not admin, different user)
  - Should fail with 403 Forbidden

- [ ] **Test 4: Delete non-existent report**
  - Try to delete a fake UUID
  - Should return 200 with `deletedCount: 0` (idempotent)

- [ ] **Test 5: Delete already-deleted report**
  - Create and delete a report
  - Try to delete it again
  - Should return 200 with `deletedCount: 0` (idempotent)

## Summary of Required Fixes

### 1. **Database (Highest Priority)**
   - ✅ Apply migration `0029_fix_report_queue_rls_final.sql`
   - ✅ Or manually create the DELETE policy
   - ✅ Verify policy with the diagnostic queries above

### 2. **Backend API (Medium Priority)**
   - Improve error handling to distinguish between:
     - Report not found (404)
     - Permission denied (403)
     - Already deleted (200)
   - Add more detailed logging
   - Return `deletedCount` accurately

### 3. **Frontend (Low Priority)**
   - Check `deletedCount` in response
   - Better error messages for users
   - Handle edge cases (already deleted, permission denied)

## Monitoring & Logging

Add these logs to track the issue:

```typescript
// In the DELETE handler
console.log('[DELETE] Starting deletion', {
  reportId,
  userId: user.id,
  timestamp: new Date().toISOString(),
});

console.log('[DELETE] Database response', {
  deletedCount: deletedData?.length || 0,
  deletedData,
  error: deleteError,
});

console.log('[DELETE] Verification check', {
  reportExists: !!checkReport,
  reportData: checkReport,
});
```

## References

- **Main API file**: `/apps/web/src/app/api/reports/[id]/route.ts`
- **Original schema**: `/packages/database/migrations/0010_report_queue.sql`
- **Fix migration**: `/packages/database/migrations/0029_fix_report_queue_rls_final.sql`
- **Frontend component**: `/apps/web/src/features/reporting/components/RecentReportsList.tsx`
- **Previous analysis**: `/docs/report-queue-rls-analysis.md`
- **Diagnostic script**: `/scripts/check_report_queue_policies.sql`
