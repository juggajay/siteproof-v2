# Report Deletion Issue - Detailed Analysis

**Report ID:** `59e12281-a1b2-4202-b026-eddf8d9cdb30`

**Issue:** Report keeps reappearing after deletion, despite API returning success (200 status with `deletedCount: 0`)

## Problem Summary

When attempting to delete a report:
1. DELETE request returns 200 with `{"success":true,"message":"Report deleted successfully (or already deleted)","deletedCount":0}`
2. The `deletedCount` is 0, meaning **no actual database records were deleted**
3. After deletion, the report still appears in the UI (3 reports remain visible)
4. The report persists across page refreshes

## Root Cause Analysis

### 1. API Route Behavior (apps/web/src/app/api/reports/[id]/route.ts)

**Lines 33-94:** The DELETE route has the following logic:

```typescript
// Line 35-39: Attempt to delete with RLS enforcement
const { data: deletedData, error: deleteError } = await supabase
  .from('report_queue')
  .delete()
  .eq('id', reportId)
  .select();

// Line 56-93: Handle case where no rows were deleted
if (!deletedData || deletedData.length === 0) {
  // Try to check if report exists
  const { data: checkReport } = await supabase
    .from('report_queue')
    .select('id, requested_by, organization_id')
    .eq('id', reportId)
    .maybeSingle();

  if (checkReport) {
    // Report exists but wasn't deleted - permission issue
    return NextResponse.json({ error: '...' }, { status: 403 });
  } else {
    // Report doesn't exist or user can't see it
    // THIS IS THE PROBLEMATIC PATH
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully (or already deleted)',
      deletedCount: 0,
    });
  }
}
```

**The Issue:** The code follows this path:
1. DELETE operation returns 0 rows deleted (`deletedData.length === 0`)
2. Post-delete check (SELECT) **also returns no rows** (`checkReport` is null/undefined)
3. The API assumes "report doesn't exist" and returns **success** (200 status)
4. Frontend receives success, removes report optimistically, but then refetches and sees it still exists

### 2. Why DELETE Returns 0 Rows

There are three possible causes:

#### A. RLS Policy Prevents Deletion

**Most Likely Cause:** The RLS DELETE policy on `report_queue` table doesn't allow the user to delete this specific report.

From the migrations analysis:
- Migration `0028_fix_report_queue_delete_policy.sql` (lines 12-27) defines DELETE policy
- Migration `0029_fix_report_queue_rls_final.sql` (lines 84-99) redefines DELETE policy

**Current DELETE Policy (from 0029):**
```sql
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

**Possible scenarios where DELETE fails:**
1. The report's `requested_by` field doesn't match the current user's ID
2. The user is not an admin/owner/project_manager in the report's organization
3. The user is not a member of the report's organization at all

#### B. RLS Policy Inconsistency Between SELECT and DELETE

**Critical Issue:** The SELECT policy (lines 24-38 in 0029) is MORE permissive than DELETE:

```sql
-- SELECT Policy: Users can see reports from ANY organization they belong to
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    -- NO ROLE CHECK!
  )
)

-- DELETE Policy: Users can only delete if they're ADMIN in the org
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
      -- ROLE CHECK REQUIRED!
  )
)
```

**This creates a visibility gap:**
- User CAN see the report (SELECT policy passes)
- User CANNOT delete the report (DELETE policy fails)
- But the API's post-delete SELECT check fails, suggesting the report "doesn't exist"

#### C. Migration Not Applied

**Check needed:** Verify which migration is actually applied to the production database.

The git status shows multiple 0028 and 0029 migration files, suggesting:
- Multiple attempts to fix the issue
- Possible migration file naming conflicts
- Unknown which migration (if any) is actually applied

### 3. Why SELECT Also Returns No Rows After Failed DELETE

**This is the confusing part.** After DELETE returns 0 rows, the code does:

```typescript
const { data: checkReport } = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  .maybeSingle();
```

If `checkReport` is null, it means the SELECT policy ALSO blocks the user from seeing the report.

**Possible explanations:**
1. **Timing issue:** The report was actually deleted by another process between the DELETE attempt and the SELECT check
2. **RLS policy change:** The SELECT policy was recently modified and the user no longer has permission
3. **Database trigger:** A trigger might be soft-deleting the report (changing status) instead of hard-deleting
4. **View instead of table:** The query might be hitting a view that filters out the report

### 4. Frontend Caching and Refetching

**Code location:** `apps/web/src/features/reporting/components/RecentReportsList.tsx`

**Lines 488-557:** The `deleteReport` function:

```typescript
// Line 491-494: Optimistic update - immediately removes from UI
queryClient.setQueryData<Report[]>(currentQueryKey, (oldData) => {
  if (!oldData) return oldData;
  return oldData.filter((report) => report.id !== reportId);
});

// Line 496-526: API call
const response = await fetch(`/api/reports/${reportId}`, {
  method: 'DELETE',
  // ...
});

// Line 540-545: Invalidate and refetch ALL report queries
await queryClient.invalidateQueries({
  queryKey: ['reports'],
  exact: false,
  refetchType: 'active',
});
```

**What happens:**
1. Report is removed from UI immediately (optimistic update)
2. DELETE API call returns success (even though `deletedCount: 0`)
3. All report queries are invalidated and refetched
4. The refetch retrieves the report again (because it was never actually deleted)
5. Report reappears in the UI

**Lines 159-163:** Auto-refetch for processing reports:
```typescript
refetchInterval: ({ state }) => {
  const hasProcessing = state.data?.some((r: Report) => r.status === 'processing');
  return hasProcessing ? 5000 : false;
},
```

This means the UI refetches every 5 seconds if there are processing reports, which would cause the deleted report to reappear quickly.

**Lines 177-225:** Realtime subscription:
```typescript
const channel = supabase
  .channel('report-status-changes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'report_queue',
    // ...
  }, (payload) => {
    queryClient.invalidateQueries({ queryKey: ['reports'] });
  })
  .subscribe();
```

Any database changes trigger a refetch, including failed deletion attempts.

## Specific Code Locations

### Problem Areas:

1. **API Route - False Success Response**
   - **File:** `/home/jayso/projects/siteproof-v2/apps/web/src/app/api/reports/[id]/route.ts`
   - **Lines:** 84-93
   - **Issue:** Returns success when `checkReport` is null, even though report wasn't deleted

2. **RLS Policy Mismatch**
   - **File:** `/home/jayso/projects/siteproof-v2/packages/database/migrations/0029_fix_report_queue_rls_final.sql`
   - **Lines:** 24-38 (SELECT policy) vs 84-99 (DELETE policy)
   - **Issue:** SELECT allows all org members to see reports, DELETE only allows admins to delete

3. **Frontend Optimistic Update**
   - **File:** `/home/jayso/projects/siteproof-v2/apps/web/src/features/reporting/components/RecentReportsList.tsx`
   - **Lines:** 488-557
   - **Issue:** Optimistically removes report but doesn't rollback when API returns `deletedCount: 0`

4. **Multiple Migration Files**
   - **Directory:** `/home/jayso/projects/siteproof-v2/packages/database/migrations/`
   - **Files:** Multiple 0028_*.sql and 0029_*.sql files
   - **Issue:** Unclear which migration is applied, possible conflicts

## Why `deletedCount` is 0

**Direct Answer:** The DELETE operation is blocked by the RLS policy. Specifically:

1. The user attempting deletion is likely a **regular member** of the organization
2. The report was **requested by someone else** in the organization
3. The user can **SEE** the report (SELECT policy allows it)
4. But the user cannot **DELETE** the report (DELETE policy requires admin role)

The API then does a SELECT check, which ALSO fails (returns null), leading the API to incorrectly assume the report "doesn't exist" and return success.

## What's Preventing Actual Database Deletion

**Primary Issue:** RLS DELETE policy on `report_queue` table

**Secondary Issue:** API logic treats "report not found in post-delete check" as success

**Tertiary Issue:** Frontend doesn't properly handle `deletedCount: 0` in success responses

## Is This an RLS Policy, Trigger, or Query Issue?

**Answer: It's an RLS Policy Issue with Bad API Logic**

1. **RLS Policy Problem:** DELETE policy is more restrictive than SELECT policy
2. **API Logic Problem:** API returns success when it shouldn't
3. **NOT a Trigger Issue:** No evidence of triggers modifying behavior
4. **NOT a Query Issue:** The queries themselves are correct

## Recommended Fix

### 1. Database Migration (Highest Priority)

Apply the correct migration to align SELECT and DELETE policies:

**Option A: Make DELETE match SELECT (Allow all org members to delete their reports)**

```sql
-- File: packages/database/migrations/0030_align_delete_with_select.sql

DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User owns the report (can always delete their own)
  requested_by = auth.uid()
  OR
  -- User is a member of the organization (matches SELECT policy)
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    -- Removed role restriction to match SELECT policy
  )
);
```

**Option B: Make DELETE more specific (Only allow owners to delete their own reports)**

```sql
-- File: packages/database/migrations/0030_strict_delete_policy.sql

DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- Only the person who requested the report can delete it
  requested_by = auth.uid()
);

-- Also update SELECT to match (if desired)
DROP POLICY IF EXISTS "report_queue_select" ON report_queue;

CREATE POLICY "report_queue_select"
ON report_queue
FOR SELECT
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

**Recommendation:** Use Option A if you want team members to manage all reports in their org, or Option B if you want strict ownership. The logs suggest the user expected to delete the report, so Option A is likely the right choice.

### 2. API Route Fix (High Priority)

**File:** `apps/web/src/app/api/reports/[id]/route.ts`
**Lines:** 84-93

Change this:

```typescript
} else {
  // Report doesn't exist or user can't see it
  console.log('Report not found or already deleted:', reportId);
  return NextResponse.json({
    success: true,
    message: 'Report deleted successfully (or already deleted)',
    deletedCount: 0,
  });
}
```

To this:

```typescript
} else {
  // Report doesn't exist or user can't see it
  // This is ambiguous - could be already deleted OR never existed OR no permission
  console.log('Report not found after failed delete:', reportId);

  // Since we tried to delete and got 0 rows, and now we can't see it,
  // this is likely a permission issue rather than "already deleted"
  return NextResponse.json({
    error: 'Unable to delete report. It may not exist, or you may not have permission.',
    details: {
      reportId,
      deletedCount: 0,
      visible: false
    }
  }, { status: 404 });
}
```

Or better yet, add more diagnostic info:

```typescript
} else {
  // Report doesn't exist or user can't see it after failed DELETE
  // Log for debugging
  console.error('DELETE returned 0 rows, and subsequent SELECT also returned 0 rows');
  console.error('This suggests either:');
  console.error('1. Report was deleted by another process');
  console.error('2. User lost permission between requests');
  console.error('3. RLS policy inconsistency');

  // Return ambiguous error
  return NextResponse.json({
    error: 'Report not found or insufficient permissions',
    deletedCount: 0
  }, { status: 404 });
}
```

### 3. Frontend Fix (Medium Priority)

**File:** `apps/web/src/features/reporting/components/RecentReportsList.tsx`
**Lines:** 528-537

Add validation for `deletedCount`:

```typescript
const result = JSON.parse(responseText);
console.log('Delete result:', result);

// Check if actually deleted
if (result.success && result.deletedCount === 0) {
  console.warn('API returned success but deletedCount is 0');
  throw new Error('Report was not deleted. You may not have permission to delete this report.');
}

toast.success('Report deleted successfully', { id: `delete-${reportId}` });
```

### 4. Verify Migrations Applied

**Commands to run:**

```bash
# Check which migrations are applied
npx supabase db remote ls

# Or if using direct connection
psql $DATABASE_URL -c "SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;"

# Verify current policies
psql $DATABASE_URL -c "
SELECT
  polname,
  polcmd::text,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd;
"
```

## Testing Plan

1. **Verify current RLS policies in database**
2. **Apply the correct migration** (Option A or B above)
3. **Update API route** to not return success on `deletedCount: 0`
4. **Update frontend** to validate `deletedCount`
5. **Test deletion scenarios:**
   - User deletes their own report (should succeed)
   - User deletes another user's report in same org (depends on policy choice)
   - Admin deletes any report in org (should succeed if Option A)
6. **Verify report doesn't reappear after successful deletion**
7. **Verify appropriate error messages for failed deletions**

## Prevention Recommendations

1. **Consistent RLS Policies:** Always align SELECT, UPDATE, and DELETE policies for predictable behavior
2. **Better Error Handling:** Distinguish between "not found", "no permission", and "already deleted"
3. **Validate Success:** Don't trust API success responses that have `deletedCount: 0`
4. **Migration Management:** Clean up duplicate/experimental migration files
5. **Add Tests:** Create integration tests for RLS policies (see `/home/jayso/projects/siteproof-v2/tests/reports-functionality.spec.ts`)
6. **Audit Logging:** Log all deletion attempts with user ID, report ID, and result for debugging

## Summary

**Why deletedCount is 0:** The RLS DELETE policy blocks the deletion because the user is not the report owner AND is not an admin in the organization.

**Why API returns success:** The API incorrectly interprets "can't see report after failed delete" as "report was already deleted" (lines 84-93 in route.ts).

**Why report reappears:** The frontend optimistically removes the report, receives a false success, refetches data, and the report is still there because it was never actually deleted.

**Fix:** Update the RLS DELETE policy to match SELECT policy (or vice versa), fix the API to not return success when `deletedCount: 0`, and update frontend to validate deletion actually occurred.
