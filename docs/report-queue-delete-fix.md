# Report Queue DELETE Policy Fix

## Problem Description

The `report_queue` table was missing a DELETE policy in the original migration (0010_report_queue.sql), which caused delete operations to fail silently. Users could see a spinner in the UI but reports were never actually deleted.

## Solution Overview

Migration `0028_fix_report_queue_delete_policy.sql` adds the missing DELETE policy and helper functions for debugging.

## Policy Logic

### DELETE Policy Rules

The policy allows deletion in two scenarios:

1. **Own Reports**: Users can always delete reports they requested (`requested_by = auth.uid()`)
2. **Organization Admin**: Users with roles `owner`, `admin`, or `project_manager` can delete any report in their organization

### Key Changes

1. **New DELETE Policy**: `"Users can delete their own reports or org admin reports"`
   - Properly enforces RLS for delete operations
   - Matches the permission checks in the backend API

2. **Helper Functions**:
   - `can_delete_report(report_id)`: Check if current user can delete a report
   - `can_delete_report(report_id, user_id)`: Check if specific user can delete (for testing)

3. **Diagnostic View**: `report_queue_permissions`
   - Shows all reports with permission flags
   - Useful for debugging permission issues

## Testing the Migration

### 1. Apply the Migration

```sql
-- Run the migration in Supabase SQL Editor
-- Contents of 0028_fix_report_queue_delete_policy.sql
```

### 2. Test DELETE Permission Function

```sql
-- Test as a specific user (replace with actual UUIDs)
SELECT can_delete_report('report-id-here'::uuid);

-- Test with explicit user ID
SELECT can_delete_report('report-id-here'::uuid, 'user-id-here'::uuid);
```

### 3. Check Permissions View

```sql
-- See all reports and your permissions on them
SELECT * FROM report_queue_permissions
ORDER BY created_at DESC;
```

### 4. Test Actual DELETE Operations

```sql
-- Test deleting your own report
DELETE FROM report_queue
WHERE id = 'your-report-id'::uuid
RETURNING *;

-- Test as admin (should work for any org report)
DELETE FROM report_queue
WHERE id = 'any-org-report-id'::uuid
RETURNING *;
```

### 5. Verify with Backend API

```bash
# Test DELETE endpoint
curl -X DELETE \
  'https://your-app.com/api/reports/[report-id]' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

## Troubleshooting

### If DELETE Still Fails

1. **Check User Role**:

```sql
SELECT role, organization_id
FROM organization_members
WHERE user_id = auth.uid();
```

2. **Check Report Ownership**:

```sql
SELECT id, requested_by, organization_id
FROM report_queue
WHERE id = 'report-id'::uuid;
```

3. **Debug with Helper Function**:

```sql
-- This will tell you if you can delete
SELECT can_delete_report('report-id'::uuid);
```

4. **Check Permissions View**:

```sql
-- See detailed permissions
SELECT * FROM report_queue_permissions
WHERE id = 'report-id'::uuid;
```

### Common Issues

1. **User not authenticated**: Ensure `auth.uid()` returns a valid user ID
2. **Wrong organization**: User might not be a member of the report's organization
3. **Insufficient role**: Only `owner`, `admin`, `project_manager` can delete others' reports
4. **Report doesn't exist**: The report might have already been deleted

## Backend Integration

The backend DELETE handler (`/api/reports/[id]/route.ts`) already implements the same logic:

1. Checks if user owns the report
2. If not, checks if user is admin/owner/project_manager
3. Only filters by report ID in the DELETE query (relies on RLS)

The RLS policy now matches this logic exactly.

## Performance Considerations

The DELETE policy uses a subquery to check organization membership:

```sql
organization_id IN (
  SELECT organization_id
  FROM organization_members
  WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin', 'project_manager')
)
```

This is efficient because:

- The `organization_members` table has appropriate indexes
- The subquery is only evaluated for non-owners
- Most deletes will be users deleting their own reports (fast path)

## Rollback Plan

If issues arise, you can rollback:

```sql
-- Drop the new policy
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;

-- Drop helper functions
DROP FUNCTION IF EXISTS can_delete_report(UUID);
DROP FUNCTION IF EXISTS can_delete_report(UUID, UUID);

-- Drop diagnostic view
DROP VIEW IF EXISTS report_queue_permissions;

-- Note: This will restore the original state (no DELETE policy = no deletes allowed)
```

## Verification Checklist

- [ ] Migration runs without syntax errors
- [ ] Users can delete their own reports
- [ ] Admins can delete any organization report
- [ ] Project managers can delete any organization report
- [ ] Regular users cannot delete others' reports
- [ ] Helper functions return correct results
- [ ] Permissions view shows accurate data
- [ ] Backend API DELETE works correctly
- [ ] No performance degradation

## Related Files

- **Migration**: `/packages/database/migrations/0028_fix_report_queue_delete_policy.sql`
- **Backend API**: `/apps/web/src/app/api/reports/[id]/route.ts`
- **Original Table**: `/packages/database/migrations/0010_report_queue.sql`
- **Frontend Component**: `/apps/web/src/app/dashboard/reports/page.tsx`
