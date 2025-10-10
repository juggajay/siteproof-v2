# Report Deletion Fix - Implementation Guide

## Problem Statement

DELETE /api/reports/[id] returns 404 even when GET /api/reports shows the report. User has permission to view but cannot delete their own reports.

## Root Cause

The DELETE route at `/apps/web/src/app/api/reports/[id]/route.ts` has an unnecessary filter that breaks the authorization check:

```typescript
.eq('organization_id', member.organization_id)  // Line 64 - PROBLEMATIC
```

This filter is redundant because:
1. RLS SELECT policy already filters by organization membership
2. It may fail to match due to timing or data inconsistency
3. It causes 404 before the actual DELETE attempt

## Proposed Fix

### Option A: Remove Redundant Filter (Simplest)

**File:** `/apps/web/src/app/api/reports/[id]/route.ts`

**Change lines 56-66:**

```typescript
// BEFORE
const {
  data: report,
  error: lookupError,
} = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  .eq('organization_id', member.organization_id)  // ❌ REMOVE THIS LINE
  .maybeSingle();

// AFTER
const {
  data: report,
  error: lookupError,
} = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  // RLS policies handle organization filtering automatically
  .maybeSingle();
```

**Also update line 94 (DELETE operation):**

```typescript
// BEFORE
const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ returning: 'minimal', count: 'exact' })
  .eq('id', reportId)
  .eq('organization_id', member.organization_id);  // ❌ REMOVE THIS LINE

// AFTER
const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ returning: 'minimal', count: 'exact' })
  .eq('id', reportId);
  // RLS policies handle organization filtering automatically
```

### Option B: Remove Pre-check Entirely (More Efficient)

**Eliminate lines 56-86** and rely on DELETE count:

```typescript
// Skip lookup, go straight to DELETE
const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ returning: 'minimal', count: 'exact' })
  .eq('id', reportId);

// Handle RLS permission errors
if (deleteError) {
  if (deleteError.code === '42501') {
    return NextResponse.json(
      { error: 'You do not have permission to delete this report' },
      { status: 403 }
    );
  }
  return NextResponse.json(
    { error: `Failed to delete report: ${deleteError.message}` },
    { status: 500 }
  );
}

// Handle not found or already deleted
if (!deleteCount || deleteCount === 0) {
  return NextResponse.json(
    { error: 'Report not found or already deleted' },
    { status: 404 }
  );
}

// Success
return NextResponse.json({
  success: true,
  message: 'Report deleted successfully',
  deletedCount: deleteCount,
});
```

**Advantages:**
- One less database query (better performance)
- Simpler logic
- Let RLS handle all authorization

**Disadvantages:**
- Cannot distinguish between "not found" and "no permission" (both return 404)
- Less informative error messages

## Recommended Approach: Option A

Use **Option A** because:
1. Minimal code change (remove 1 line from 2 places)
2. Keeps the pre-check for better error messages
3. Maintains existing logging and debugging
4. Low risk of introducing new bugs

## Implementation Steps

1. **Edit the file:**
   ```bash
   # Edit /apps/web/src/app/api/reports/[id]/route.ts
   # Remove .eq('organization_id', member.organization_id) from lines 64 and 94
   ```

2. **Test locally:**
   ```bash
   # Start dev server
   pnpm dev

   # Test DELETE endpoint
   curl -X DELETE \
     -H "Authorization: Bearer $TOKEN" \
     http://localhost:3000/api/reports/YOUR_REPORT_ID
   ```

3. **Verify in browser console:**
   - Go to Reports page
   - Open browser DevTools → Console
   - Try deleting a report
   - Check response status and body

4. **Deploy:**
   ```bash
   git add apps/web/src/app/api/reports/[id]/route.ts
   git commit -m "fix: remove redundant organization_id filter from report deletion"
   git push
   ```

## Testing Checklist

- [ ] User can delete their own reports
- [ ] User cannot delete reports from other organizations (403)
- [ ] Admin can delete any report in their organization
- [ ] Non-existent report IDs return 404
- [ ] Console logs show correct diagnostic information
- [ ] Browser UI shows success message and removes deleted report

## Rollback Plan

If issues occur:
1. Revert the commit: `git revert HEAD`
2. Push: `git push`
3. Investigate deeper RLS policy issues

## Database Verification (Optional)

Check if DELETE policy exists:

```sql
-- List all policies on report_queue
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;
```

Expected output should include a DELETE policy like:
```
policy_name                            | command | using_clause
---------------------------------------+---------+------------------
report_queue_delete_allow_org_members  | DELETE  | (requested_by = auth.uid() OR ...)
```

If no DELETE policy exists, apply migration 0031:
```bash
psql $DATABASE_URL -f packages/database/migrations/0031_final_fix_report_delete_permissions.sql
```

## Post-Deployment Monitoring

Monitor these metrics for 24-48 hours:

1. **DELETE /api/reports/[id]** response codes:
   - 200: Success ✅
   - 403: Forbidden (expected for unauthorized attempts)
   - 404: Not found (should be rare)
   - 500: Server error (investigate immediately)

2. **Console errors:**
   - Watch for "Failed to delete report" messages
   - Check if deletedCount is consistently correct

3. **User feedback:**
   - Ask QA or users to test report deletion
   - Monitor support tickets

## Related Files

- `/apps/web/src/app/api/reports/[id]/route.ts` (PRIMARY FIX)
- `/apps/web/src/features/reporting/components/RecentReportsList.tsx` (client-side logic)
- `/packages/database/migrations/0010_report_queue.sql` (base migration)
- `/packages/database/migrations/0031_final_fix_report_delete_permissions.sql` (DELETE policy)
