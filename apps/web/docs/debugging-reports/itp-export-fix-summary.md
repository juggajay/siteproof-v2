# ITP Export Fix Summary

## Issue
ITP export endpoint was returning 500 error: "Failed to fetch ITP instances"

## Root Cause
The RLS (Row Level Security) policy for `itp_instances` requires an explicit join with the `projects` table to verify user authorization. The policy is defined as:

```sql
CREATE POLICY "Users can view instances in their projects"
  ON itp_instances FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_instances.project_id
      AND om.user_id = auth.uid()
    )
  );
```

In commit `67dd42d`, we removed the explicit `projects!inner(id, organization_id)` join thinking it was unnecessary. However, PostgREST/Supabase requires this explicit join to properly execute the RLS policy's subquery.

## Solution Applied

### Changed Query From:
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select('id, name, status, completion_percentage, data, project_id')
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

### Changed Query To:
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select('id, name, status, completion_percentage, data, project_id, projects!inner(id, organization_id)')
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

### Added Response Cleanup:
```typescript
// Clean up ITP instances - remove nested projects object added for RLS
const cleanedInstances = (itpInstances || []).map((itp: any) => {
  const { projects, ...cleanedItp } = itp;
  return cleanedItp;
});

// Attach ITP instances to lot
lot.itp_instances = cleanedInstances;
```

## Why This Works

1. **Explicit Join**: The `projects!inner(id, organization_id)` tells PostgREST to perform an inner join with the projects table
2. **RLS Satisfaction**: This join provides the necessary context for the RLS policy to verify:
   - The project exists
   - The user is a member of the project's organization
3. **Response Cleanup**: We strip out the nested `projects` object from the response so the frontend receives the expected data structure

## Pattern Comparison

This fix follows the same pattern used in the working `/api/projects/[projectId]/lots/[lotId]/itp/route.ts` endpoint:

```typescript
// Working endpoint pattern
const { data: itpInstances, error: instancesError } = await supabase
  .from('itp_instances')
  .select('*, projects!inner(id, organization_id)')
  .eq('lot_id', lotId)
  .order('created_at', { ascending: false });

// Clean up instances - remove nested projects object added for RLS
const cleanedInstances = (itpInstances || []).map((itp: any) => {
  const { projects, ...cleanedItp } = itp;
  return cleanedItp;
});
```

## Files Modified
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`

## Testing Required
1. Test the export endpoint with a valid lot that has ITP instances
2. Verify the response no longer includes the nested `projects` object
3. Verify the response includes all expected ITP instance fields
4. Test with different user roles to ensure RLS still works correctly

## Related Commits
- `67dd42d` - Removed explicit projects join (caused the issue)
- `6f11349` - Added projects join to all ITP instance queries (partial fix)
- `c9f7480` - Added explicit projects join to ITP export query (attempted fix)
- Current fix - Re-adds the join with proper field selection and response cleanup

## Lessons Learned
1. **Don't remove RLS-related joins**: Even if they seem unnecessary, joins referenced by RLS policies must be explicit
2. **Test RLS policies**: Always test after modifying queries that interact with RLS-protected tables
3. **Follow working patterns**: When fixing an issue, look for working examples in the codebase and follow their pattern
4. **Enhanced error logging**: The debug error response we added was helpful for diagnosing the issue
