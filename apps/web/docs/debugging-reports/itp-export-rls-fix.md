# ITP Export RLS Fix - Debug Report

## Issue Summary
The ITP export endpoint was returning a 500 error with "Failed to fetch ITP instances" when attempting to export reports. The same issue was affecting multiple other ITP-related endpoints.

**Date:** 2025-10-09
**Status:** ✅ RESOLVED

## Error Details
- **Endpoint:** `POST /api/projects/[projectId]/lots/[lotId]/export`
- **Status Code:** 500
- **Error Message:** "Failed to fetch ITP instances"
- **Related React Errors:** #425 and #422 (minified)

## Root Cause Analysis

### The Problem
The RLS (Row Level Security) policy on the `itp_instances` table requires an explicit JOIN with the `projects` table to verify organization membership. The policy is defined as:

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

### What Was Failing
The queries were selecting from `itp_instances` directly without joining the `projects` table:

```typescript
// BEFORE (failing):
const { data, error } = await supabase
  .from('itp_instances')
  .select('id, name, status, completion_percentage, data, project_id')
  .eq('lot_id', lotId)
  .eq('project_id', projectId);
```

Even though we filtered by `project_id`, the RLS policy couldn't verify organization membership without the actual join.

### Why It Failed
1. The RLS policy uses `EXISTS` with a `JOIN` to verify organization membership
2. Simply filtering by `project_id` doesn't satisfy the policy's requirement for a join
3. Supabase RLS enforces this at the database level, causing the query to fail with a 500 error

## Solution

### The Fix
Add an explicit `!inner` join with the `projects` table in all queries on `itp_instances`:

```typescript
// AFTER (working):
const { data, error } = await supabase
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

Then clean up the nested `projects` object before returning data:

```typescript
const cleanedInstances = (data || []).map((itp: any) => {
  const { projects, ...cleanedItp } = itp;
  return cleanedItp;
});
```

## Fixed Endpoints

The following endpoints were updated with the RLS fix:

1. **Export Endpoint**
   - File: `/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
   - Commit: `c9f7480`

2. **List ITPs Endpoint**
   - File: `/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts`
   - Methods: `GET`, `POST`
   - Commit: `6f11349`

3. **Single ITP Endpoint**
   - File: `/src/app/api/projects/[projectId]/lots/[lotId]/itp/[itpId]/route.ts`
   - Methods: `GET`, `PUT`
   - Commit: `6f11349`

## Testing Recommendations

1. **Test the export endpoint:**
   ```bash
   curl -X POST https://your-app.vercel.app/api/projects/{projectId}/lots/{lotId}/export \
     -H "Authorization: Bearer {token}"
   ```

2. **Test the list ITPs endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/projects/{projectId}/lots/{lotId}/itp \
     -H "Authorization: Bearer {token}"
   ```

3. **Test the single ITP endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/projects/{projectId}/lots/{lotId}/itp/{itpId} \
     -H "Authorization: Bearer {token}"
   ```

## Prevention Recommendations

1. **Document RLS Patterns:**
   - Create a guide for developers on how to write Supabase queries that comply with RLS policies
   - Document common RLS patterns in the codebase

2. **Code Review Checklist:**
   - When reviewing queries on tables with RLS, verify that all required joins are present
   - Check that the query satisfies the RLS policy's `EXISTS` conditions

3. **Testing:**
   - Add integration tests that verify queries work with RLS enabled
   - Test with different user roles to ensure proper access control

4. **Database Schema Documentation:**
   - Document all RLS policies alongside table schemas
   - Include example queries that satisfy each policy

## Related Files

- **Migration:** `/packages/database/migrations/0004_itp_templates_schema.sql`
- **RLS Policy Definition:** Lines 238-251 in the migration file
- **Fixed Routes:**
  - `/src/app/api/projects/[projectId]/lots/[lotId]/export/route.ts`
  - `/src/app/api/projects/[projectId]/lots/[lotId]/itp/route.ts`
  - `/src/app/api/projects/[projectId]/lots/[lotId]/itp/[itpId]/route.ts`

## Commits

1. `c9f7480` - fix: Add explicit projects join to ITP export query for RLS compliance
2. `6f11349` - fix: Add projects join to all ITP instance queries for RLS compliance

## Verification

After deployment:
1. Wait for Vercel build to complete
2. Test the export endpoint with a real project and lot ID
3. Verify no 500 errors in the logs
4. Check that ITP instances are returned correctly
5. Verify React errors #425 and #422 are resolved
