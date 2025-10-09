# ITP Export Endpoint Fix - Root Cause Analysis

## Problem
The ITP export endpoint at `/api/projects/[projectId]/lots/[lotId]/export` was returning a 500 error with "Failed to fetch ITP instances".

## Root Cause

The issue was a **mismatch between the RLS policy and the query structure** for the `itp_instances` table.

### RLS Policy (from 0004_itp_templates_schema.sql)
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

The RLS policy expects to:
1. Join `itp_instances` → `projects` → `organization_members`
2. Verify the current user is a member of the project's organization
3. This happens **implicitly** through the subquery

### Original Query (WRONG)
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select(`
    id,
    name,
    status,
    completion_percentage,
    data,
    project_id,
    projects!inner(id, organization_id)  // ❌ EXPLICIT JOIN
  `)
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

**Problem**: When we explicitly join with `projects!inner`, Supabase/PostgREST changes the query structure in a way that **prevents the RLS policy's subquery from properly evaluating**. The RLS policy expects to do its own implicit join, but our explicit join interferes with that.

## Solution

Remove the explicit join and let the RLS policy handle authorization:

```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select('id, name, status, completion_percentage, data, project_id')
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

**Why this works**:
- The RLS policy's `EXISTS` subquery can now properly execute
- It checks if the user is a member of the organization that owns the project
- Authorization happens at the database level, not in the API query
- We still filter by `project_id` and `lot_id` for the correct data

## Changes Made

### File: `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`

1. **Removed explicit join** with projects table
2. **Simplified select** to only include ITP instance fields
3. **Removed cleanup code** that was stripping out the projects object
4. **Added enhanced error logging** to capture Supabase errors for future debugging

## Key Learnings

1. **RLS policies and explicit joins can conflict**: When an RLS policy uses a subquery with JOINs, adding explicit joins in the query can interfere with the policy evaluation

2. **Trust the RLS policy**: If the RLS policy is properly configured, you don't need to duplicate its logic in your queries

3. **Let PostgREST handle authorization**: The RLS policy automatically filters results based on user permissions - just query for the data you need

4. **Enhanced logging is crucial**: Without detailed error logging, we were just seeing "Failed to fetch ITP instances" instead of the actual Supabase error

## Testing

To test this fix:
1. Log in to the application with valid credentials
2. Navigate to a lot detail page
3. Click "Export ITP Report"
4. The endpoint should now return 200 with proper data

## Related Files

- **RLS Policy**: `/packages/database/migrations/0004_itp_templates_schema.sql` (lines 241-251)
- **API Route**: `/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
- **Client Component**: `/apps/web/src/app/dashboard/projects/[id]/lots/[lotId]/lot-detail-client-simple.tsx` (line 55)
