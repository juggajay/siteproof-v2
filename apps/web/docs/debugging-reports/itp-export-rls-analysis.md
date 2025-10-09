# ITP Export RLS Policy Analysis

## Problem
The ITP export endpoint is failing with a 500 error when trying to fetch `itp_instances`.

## Root Cause Analysis

### RLS Policy Requirements
The `itp_instances` table has an RLS policy that requires an implicit join with the `projects` table:

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

This policy creates a subquery that joins:
1. `itp_instances` → `projects` (via `project_id`)
2. `projects` → `organization_members` (via `organization_id`)

### Working vs Failing Queries

**Working Query** (from `/api/projects/[projectId]/lots/[lotId]/itp/route.ts`):
```typescript
const { data: itpInstances, error: instancesError } = await supabase
  .from('itp_instances')
  .select('*, projects!inner(id, organization_id)')  // ✅ Explicit join
  .eq('lot_id', lotId)
  .order('created_at', { ascending: false });
```

**Failing Query** (from `/api/projects/[projectId]/lots/[lotId]/export/route.ts`):
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select('id, name, status, completion_percentage, data, project_id')  // ❌ No join
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

**Why the Page Query Works** (from `/dashboard/projects/[id]/lots/[lotId]/page.tsx`):
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select(`
    id,
    template_id,
    project_id,
    lot_id,
    organization_id,
    created_by,
    data,
    evidence_files,
    inspection_status,
    inspection_date,
    sync_status,
    is_active,
    created_at,
    updated_at,
    deleted_at,
    itp_templates(
      id,
      name,
      description,
      structure
    )
  `)
  .eq('lot_id', lotId)
  .eq('is_active', true)
  .order('created_at', { ascending: false });
```

**This works because:** Even though it doesn't explicitly join `projects`, the RLS policy is able to execute its subquery successfully. The difference might be:
1. The page query is server-side with better Supabase client configuration
2. The RLS policy can execute properly when the query is simple
3. However, the export route might be hitting a different code path or timeout

### The Real Issue
The export route removed the explicit `projects!inner(id, organization_id)` join in commit `67dd42d`, but the RLS policy actually **requires** this join to work properly. Without it:

1. The RLS policy tries to execute its subquery
2. The subquery might fail due to:
   - Missing implicit join context
   - Database query planner issues
   - PostgREST translation problems

## Solution

### Fix 1: Re-add the explicit projects join
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select('id, name, status, completion_percentage, data, project_id, projects!inner(id, organization_id)')
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

Then clean up the response:
```typescript
const cleanedInstances = (itpInstances || []).map((itp: any) => {
  const { projects, ...cleanedItp } = itp;
  return cleanedItp;
});
```

### Fix 2: Alternative - Simplify the query (like the page does)
Just select the fields we need without explicit join:
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select('id, name, status, completion_percentage, data')
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

But this might still fail if the RLS policy has issues.

### Fix 3: Use the exact same pattern as the working endpoint
```typescript
const itpPromise = supabase
  .from('itp_instances')
  .select('*, projects!inner(id, organization_id)')
  .eq('lot_id', lotId)
  .order('created_at', { ascending: false });
```

## Recommended Approach

**Use Fix 1** - Re-add the explicit join but keep our specific field selection:

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
    projects!inner(id, organization_id)
  `)
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

This:
1. Satisfies the RLS policy's join requirement
2. Keeps our specific field selection
3. Uses the same pattern as the working `/itp/route.ts` endpoint
4. Allows us to clean up the response to remove the nested `projects` object

## Files to Update
- `/mnt/c/Users/jayso/siteproof-v2/apps/web/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
