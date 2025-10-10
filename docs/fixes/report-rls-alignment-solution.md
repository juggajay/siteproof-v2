# Report Queue RLS Policy Alignment Solution

## Problem Analysis

### Current Issue
- **GET /api/reports**: Successfully returns reports (200 OK)
- **DELETE /api/reports/[id]**: Fails with 404 Not Found for the same reports
- Root cause: Mismatch between SELECT and DELETE RLS policies

### Policy Evolution Timeline
1. **Migration 0010**: Initial policies - SELECT allows all org members
2. **Migration 0029**: Restricts DELETE to admin/owner/project_manager only
3. **Migration 0030**: Attempts to align DELETE with SELECT (all org members)
4. **Migration 0031**: Final fix attempt, but may not be properly applied

### Current State Analysis

#### SELECT Policy
```sql
-- Users can see reports from their organization
USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
)
```
**Result**: Any organization member can SELECT reports

#### DELETE Policy (Intended per Migration 0031)
```sql
-- Should allow any org member to delete
USING (
  requested_by = auth.uid()
  OR
  EXISTS (
    SELECT 1
    FROM organization_members om
    WHERE om.organization_id = report_queue.organization_id
      AND om.user_id = auth.uid()
    -- No role restriction
  )
)
```
**Result**: Should allow any org member, but may have conflicting policies

### API Route Issues

#### Current DELETE Route Problems
1. **Redundant Organization Check**: Route manually checks org membership before deletion
2. **Single Organization Assumption**: Uses `.single()` which fails for multi-org users
3. **Pre-filtering**: Adds `eq('organization_id')` which can interfere with RLS
4. **404 vs 403**: Returns 404 when report exists but user lacks permission

## Recommended Solution

### 1. Database Migration - Ensure Policy Alignment

Create migration `0032_ensure_report_rls_alignment.sql`:

```sql
-- ============================================
-- Migration 0032: Ensure Report Queue RLS Alignment
-- ============================================
-- Purpose: Guarantee SELECT and DELETE policies are aligned
-- Issue: Multiple migrations may have created conflicting policies

BEGIN;

-- Step 1: Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can view reports in their organization" ON report_queue;
DROP POLICY IF EXISTS "Users can view reports in their organization with joins" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete_allow_org_members" ON report_queue;
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;
DROP POLICY IF EXISTS "Users can delete reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;
DROP POLICY IF EXISTS "Users can delete own reports or organization reports with permission" ON report_queue;
DROP POLICY IF EXISTS "Users can create reports in their organization" ON report_queue;
DROP POLICY IF EXISTS "Users can update their own reports" ON report_queue;

-- Step 2: Create aligned SELECT policy
CREATE POLICY "report_queue_select"
ON report_queue
FOR SELECT
TO authenticated
USING (
  -- User can see reports they requested OR from their organization
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Step 3: Create aligned DELETE policy (matches SELECT exactly)
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete reports they requested OR from their organization
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Step 4: Recreate other necessary policies
CREATE POLICY "report_queue_insert"
ON report_queue
FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can only create reports in their organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
  AND requested_by = auth.uid()
);

CREATE POLICY "report_queue_update"
ON report_queue
FOR UPDATE
TO authenticated
USING (
  -- Users can update reports they requested or if admin/owner
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  -- Ensure org doesn't change
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Step 5: Add helpful comments
COMMENT ON POLICY "report_queue_select" ON report_queue IS
'Allows users to view reports they requested or from their organization';

COMMENT ON POLICY "report_queue_delete" ON report_queue IS
'Allows users to delete reports they requested or from their organization (aligned with SELECT)';

-- Step 6: Verify the policies
DO $$
DECLARE
  select_count INTEGER;
  delete_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO select_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'r';

  SELECT COUNT(*) INTO delete_count
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

  IF select_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 SELECT policy, found %', select_count;
  END IF;

  IF delete_count != 1 THEN
    RAISE EXCEPTION 'Expected exactly 1 DELETE policy, found %', delete_count;
  END IF;

  RAISE NOTICE 'Successfully created aligned policies';
END $$;

COMMIT;
```

### 2. Simplified DELETE Route

Update `/api/reports/[id]/route.ts`:

```typescript
// DELETE /api/reports/[id] - Delete a report
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id: reportId } = params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, try to fetch the report to verify it exists and user has access
    // RLS will automatically filter based on policies
    const { data: report, error: fetchError } = await supabase
      .from('report_queue')
      .select('id, report_name, organization_id')
      .eq('id', reportId)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching report:', fetchError);
      return NextResponse.json({ error: 'Failed to verify report' }, { status: 500 });
    }

    if (!report) {
      // Report doesn't exist OR user doesn't have permission to see it
      // Return 404 for both cases (don't leak existence info)
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Now delete the report - let RLS handle permissions
    const { error: deleteError, count } = await supabase
      .from('report_queue')
      .delete({ count: 'exact' })
      .eq('id', reportId);

    if (deleteError) {
      // Check if it's a permission error
      if (deleteError.code === '42501') {
        // This shouldn't happen if policies are aligned, but handle it
        console.error('RLS policy mismatch - user can SELECT but not DELETE:', {
          reportId,
          userId: user.id,
          error: deleteError
        });
        return NextResponse.json(
          { error: 'Permission denied - please contact support' },
          { status: 403 }
        );
      }

      console.error('Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      );
    }

    if (!count || count === 0) {
      // This shouldn't happen since we verified the report exists
      return NextResponse.json(
        { error: 'Report not found or already deleted' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Error in delete report endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### 3. Alternative: Role-Based Deletion

If you want to restrict DELETE to specific roles while keeping SELECT permissive:

```sql
-- Alternative DELETE policy with role restrictions
CREATE POLICY "report_queue_delete_restricted"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete their own reports
  requested_by = auth.uid()
  OR
  -- OR they're an admin/owner/project_manager in the organization
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager')
  )
);
```

**Note**: This creates intentional mismatch where users can see reports they can't delete. The UI should handle this by:
- Showing delete button only for authorized users
- Providing clear error messages
- Offering "Request Deletion" for non-authorized users

## Testing Strategy

### 1. Manual Testing Queries
```sql
-- Test as specific user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "USER_ID_HERE"}';

-- Check what reports user can see
SELECT id, report_name, requested_by, organization_id
FROM report_queue;

-- Check if user can delete a specific report
DELETE FROM report_queue
WHERE id = 'REPORT_ID_HERE'
RETURNING id;

ROLLBACK; -- Don't actually delete
```

### 2. API Testing
```bash
# Test SELECT access
curl -X GET "http://localhost:3000/api/reports" \
  -H "Authorization: Bearer $TOKEN"

# Test DELETE access
curl -X DELETE "http://localhost:3000/api/reports/REPORT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Automated Test
Create a test that:
1. Creates a report as User A
2. Verifies User A can see and delete it
3. Verifies User B (same org) can see it
4. Verifies User B can delete it (if policy allows)
5. Verifies User C (different org) cannot see or delete it

## Recommendations

### Immediate Actions
1. **Apply Migration 0032** to ensure policy alignment
2. **Simplify DELETE route** to rely on RLS
3. **Add logging** to track policy mismatches

### Long-term Improvements
1. **Use SECURITY DEFINER functions** for complex operations
2. **Create helper function** for permission checks
3. **Add policy testing** to CI/CD pipeline
4. **Document policy decisions** in code comments

### Monitoring
1. Track DELETE failures vs SELECT successes
2. Alert on RLS policy errors (42501)
3. Regular audit of policy consistency

## Summary

The core issue is policy mismatch caused by multiple conflicting migrations. The solution is to:
1. Clean up all existing policies
2. Create aligned SELECT and DELETE policies
3. Simplify the API route to trust RLS
4. Add proper error handling and logging

This ensures consistent behavior where users can delete any report they can see (from their organization).