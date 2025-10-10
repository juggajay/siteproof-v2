# Report Deletion Fix - Summary

**Date:** 2025-10-11
**Issue:** Report with ID `59e12281-a1b2-4202-b026-eddf8d9cdb30` keeps reappearing after deletion
**Status:** Fixed (pending migration application)

## Quick Summary

The report deletion was **failing silently** due to:
1. **RLS Policy Mismatch:** Users could SEE reports from their organization but couldn't DELETE them (required admin role)
2. **False Success Response:** API returned success even when `deletedCount: 0`
3. **No Validation:** Frontend didn't check if deletion actually occurred

## Root Cause

### Database Level (Primary Issue)
- **SELECT Policy:** Allowed all organization members to view reports
- **DELETE Policy:** Only allowed admins to delete organization reports
- **Result:** Users could see reports but couldn't delete them, causing confusion

### API Level (Secondary Issue)
- **File:** `/home/jayso/projects/siteproof-v2/apps/web/src/app/api/reports/[id]/route.ts`
- **Lines 84-93:** When DELETE returned 0 rows and subsequent SELECT also found nothing, the API incorrectly returned success
- **Logic flaw:** Assumed "not visible = already deleted" when it actually meant "RLS policy blocked deletion"

### Frontend Level (Tertiary Issue)
- **File:** `/home/jayso/projects/siteproof-v2/apps/web/src/features/reporting/components/RecentReportsList.tsx`
- **Lines 528-544:** No validation of `deletedCount` field in API response
- **Result:** Optimistically removed report, received false success, refetched, report reappeared

## Fixes Applied

### 1. Database Migration (File: `packages/database/migrations/0030_fix_report_delete_rls_aligned.sql`)

**What it does:** Aligns DELETE policy with SELECT policy

**Before:**
```sql
-- DELETE policy (restrictive)
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
      -- Only admins can delete!
  )
)
```

**After:**
```sql
-- DELETE policy (aligned with SELECT)
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
    -- All org members can delete
  )
)
```

**To apply:**
```bash
# If using Supabase locally
npx supabase db push

# If using remote database
npx supabase db remote push

# Or apply manually
psql $DATABASE_URL -f packages/database/migrations/0030_fix_report_delete_rls_aligned.sql
```

### 2. API Route Fix (File: `apps/web/src/app/api/reports/[id]/route.ts`)

**Changed lines 84-100:** Stop returning success when `deletedCount: 0`

**Before:**
```typescript
} else {
  console.log('Report not found or already deleted:', reportId);
  return NextResponse.json({
    success: true,  // <-- FALSE SUCCESS!
    message: 'Report deleted successfully (or already deleted)',
    deletedCount: 0,
  });
}
```

**After:**
```typescript
} else {
  console.error('DELETE returned 0 rows, and subsequent SELECT also returned 0 rows');
  console.error('Possible causes: 1) Report already deleted, 2) User lost permissions, 3) RLS policy mismatch');
  console.error('Returning 404 to avoid false success when report may still exist');

  return NextResponse.json({
    error: 'Report not found or you do not have permission to delete it',
    details: {
      reportId,
      deletedCount: 0,
      visible: false,
      hint: 'The report may have been already deleted, or you may lack permission to delete it.'
    }
  }, { status: 404 });  // <-- Now returns error instead of success
}
```

### 3. Frontend Validation (File: `apps/web/src/features/reporting/components/RecentReportsList.tsx`)

**Added lines 538-542:** Validate `deletedCount` before treating as success

**New code:**
```typescript
// Validate that the report was actually deleted
if (result.success && result.deletedCount === 0) {
  console.error('API returned success but deletedCount is 0 - report was not actually deleted');
  throw new Error('Report was not deleted. You may not have permission to delete this report.');
}
```

## Testing Checklist

- [ ] Apply database migration
- [ ] Verify RLS policies are aligned:
  ```sql
  SELECT
    polname,
    CASE polcmd WHEN 'r' THEN 'SELECT' WHEN 'd' THEN 'DELETE' END as command,
    pg_get_expr(polqual, polrelid) as policy
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass
    AND polcmd IN ('r', 'd')
  ORDER BY polcmd;
  ```
- [ ] Test user deleting their own report (should succeed)
- [ ] Test user deleting another user's report in same org (should succeed after migration)
- [ ] Test user deleting report from different org (should fail with 403 or 404)
- [ ] Verify deleted reports don't reappear after page refresh
- [ ] Check console logs show appropriate error messages for failed deletions
- [ ] Verify optimistic UI updates are rolled back on deletion failure

## Verification Query

Run this query to check if a specific user can delete a specific report:

```sql
-- Replace with actual values
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claim.sub TO 'USER_ID_HERE';

-- Check if user can see the report
SELECT id, report_name, requested_by, organization_id
FROM report_queue
WHERE id = 'REPORT_ID_HERE';

-- Check if user can delete the report
DELETE FROM report_queue
WHERE id = 'REPORT_ID_HERE'
RETURNING id, report_name;

-- Rollback to avoid actual deletion
ROLLBACK;
```

## Impact Analysis

### User Experience
- **Before:** Users could see "Delete" button but deletion would silently fail
- **After:** Users see clear error message if they lack permission, or deletion succeeds

### Performance
- No performance impact (policy is equally efficient)

### Security
- **Consideration:** Now ALL organization members can delete ANY report in their org
- **Risk:** Medium - regular members can delete reports created by other members
- **Mitigation:**
  - Add audit logging for deletions
  - Consider soft-delete instead of hard-delete
  - Add "undo" functionality for recent deletions
  - Or revert to strict policy (only owners can delete) and hide delete button for non-owners

### Alternative Approach (Strict Deletion)

If you want **only report creators** to delete their reports:

1. Use this migration instead:
```sql
CREATE POLICY "report_queue_delete"
ON report_queue FOR DELETE TO authenticated
USING (requested_by = auth.uid());
```

2. Update frontend to hide delete button for reports the user didn't create:
```tsx
{/* Only show delete button for reports user requested */}
{report.requested_by.id === user?.id && (
  <Button onClick={() => deleteReport(report.id, report.report_name)}>
    <Trash2 />
  </Button>
)}
```

## Related Files

- **Analysis Document:** `/home/jayso/projects/siteproof-v2/docs/report-deletion-analysis.md`
- **Migration File:** `/home/jayso/projects/siteproof-v2/packages/database/migrations/0030_fix_report_delete_rls_aligned.sql`
- **API Route:** `/home/jayso/projects/siteproof-v2/apps/web/src/app/api/reports/[id]/route.ts`
- **Frontend Component:** `/home/jayso/projects/siteproof-v2/apps/web/src/features/reporting/components/RecentReportsList.tsx`

## Migration History

The following migrations attempted to fix this issue:
- `0027_fix_report_queue_rls.sql` - Initial fix attempt
- `0028_*.sql` (multiple variants) - Various fix attempts with different approaches
- `0029_fix_report_queue_rls_final.sql` - Comprehensive policy rewrite
- `0030_fix_report_delete_rls_aligned.sql` - **THIS FIX** - Aligns policies properly

## Rollback Plan

If this fix causes issues, rollback with:

```sql
-- Restore restrictive DELETE policy
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

CREATE POLICY "report_queue_delete"
ON report_queue FOR DELETE TO authenticated
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

And revert the API and frontend changes using git:
```bash
git checkout HEAD~1 apps/web/src/app/api/reports/[id]/route.ts
git checkout HEAD~1 apps/web/src/features/reporting/components/RecentReportsList.tsx
```

## Next Steps

1. **Apply the migration** to your database
2. **Test thoroughly** in development/staging
3. **Monitor logs** for deletion errors after deployment
4. **Consider adding:**
   - Audit logging for all deletions
   - Soft-delete functionality (status = 'deleted' instead of actual DELETE)
   - Bulk deletion capability
   - "Undo" functionality for accidental deletions
   - Admin dashboard to view all deletions
