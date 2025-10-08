# ITP Export Endpoint RLS Fix

## Issue
The ITP export endpoint was returning a 500 error with "Failed to fetch ITP instances" when attempting to export reports.

**Error Location:** `/api/projects/[projectId]/lots/[lotId]/export`

## Root Cause

The RLS (Row Level Security) policy for `itp_instances` table requires verification through the `projects` table to check organization membership:

```sql
CREATE POLICY "Users can view instances in their projects"
  ON itp_instances FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN organization_members om ON om.organization_id = p.organization_id
      WHERE p.id = itp_instances.project_id
      AND om.user_id = auth.uid()
    )
  );
```

The original query was filtering ITP instances by `lot_id` only, without explicitly filtering by `project_id`. This caused the RLS policy to fail because Supabase couldn't efficiently verify the user had access to the project.

## Solution

Added explicit `project_id` filter to the ITP instances query:

**Before:**
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select(`
    id,
    name,
    status,
    completion_percentage,
    data
  `)
  .eq('lot_id', lotId);
```

**After:**
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select(`
    id,
    name,
    status,
    completion_percentage,
    data,
    project_id
  `)
  .eq('lot_id', lotId)
  .eq('project_id', projectId);  // Added explicit project_id filter
```

## Why This Works

1. The RLS policy checks `itp_instances.project_id` against the projects table
2. By explicitly filtering on `project_id`, we provide the value needed for the RLS policy check
3. This allows Supabase to efficiently verify the user's organization membership through the project
4. The query now passes RLS validation and returns the expected data

## Prevention

When querying tables with RLS policies that depend on foreign key relationships:
- Always include explicit filters for the key columns referenced in RLS policies
- Review RLS policy definitions in `/packages/database/migrations/0004_itp_templates_schema.sql`
- Test queries against tables with multi-level organization access patterns

## Related Files
- `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts` (fixed)
- `/packages/database/migrations/0004_itp_templates_schema.sql` (RLS policy definitions)

## Testing
To verify the fix works:
1. Navigate to a lot with ITP instances
2. Click the export button
3. Verify the export succeeds without 500 errors
4. Check that only ITPs from the correct project/lot are included

## Date Fixed
2025-10-09
