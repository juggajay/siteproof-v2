# Report Queue RLS Policy Analysis & Fix

## Problem Description
DELETE operations on the `report_queue` table return 404 "Report not found" errors even when users should have permission to delete their own reports.

## Root Cause Analysis

### The Issue
The problem stems from inconsistent RLS (Row Level Security) policies between SELECT and DELETE operations:

1. **Multiple Migration Conflicts**: Several migration files (0027, 0028 variants) created overlapping and potentially conflicting policies
2. **Policy Mismatch**: SELECT and DELETE policies had different conditions, causing visibility issues
3. **API Logic Issue**: The DELETE endpoint was checking SELECT visibility first, which could fail even when DELETE would succeed

### Current State (Before Fix)
From analyzing the migrations:
- **Migration 0010**: Created initial policies (SELECT, INSERT, UPDATE but no DELETE)
- **Migration 0027**: Added DELETE policy and modified SELECT policies
- **Migration 0028 variants**: Multiple attempts to fix DELETE policy with different approaches

This led to potential duplicate or conflicting policies.

## The Solution

### 1. Database Fix (Migration 0029)
Created `/packages/database/migrations/0029_fix_report_queue_rls_final.sql` which:

1. **Cleans up all existing policies** to eliminate conflicts
2. **Creates unified, consistent policies**:
   - **SELECT**: User can see reports they requested OR reports from their organization
   - **DELETE**: User can delete reports they requested OR (if admin/owner/project_manager) reports from their organization
   - Both policies use similar logic for consistency

3. **Key Design Decision**: DELETE policy matches SELECT visibility to ensure proper HTTP status codes:
   - If user can't SELECT → 404 (report not found)
   - If user can SELECT but can't DELETE → 403 (forbidden)

### 2. API Endpoint Optimization
The endpoint at `/apps/web/src/app/api/reports/[id]/route.ts` has been updated to:

1. **Direct DELETE attempt** without pre-checking with SELECT
2. **Better error handling** to distinguish between:
   - Report doesn't exist (404)
   - No permission to delete (403)
   - Already deleted (200 - idempotent success)

## Policy Details

### SELECT Policy
```sql
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
)
```

### DELETE Policy
```sql
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])
  )
)
```

## Testing Queries

### Verify User Permissions
```sql
-- Check what reports a user can see
SELECT id, report_name, requested_by, organization_id
FROM report_queue
WHERE requested_by = 'USER_ID_HERE';

-- Check if user is admin in any organization
SELECT organization_id, role
FROM organization_members
WHERE user_id = 'USER_ID_HERE'
  AND role IN ('owner', 'admin', 'project_manager');
```

### Test RLS Policies
```sql
-- Use the test function created in the fix script
SELECT * FROM test_report_queue_rls('USER_ID', 'REPORT_ID');
```

## Implementation Steps

1. **Apply the migration**:
   ```bash
   npx supabase migration up
   ```

2. **Verify policies are correct**:
   ```sql
   SELECT polname, polcmd FROM pg_policy
   WHERE polrelid = 'report_queue'::regclass;
   ```

3. **Test with actual user**:
   - Create a test report as a user
   - Try to delete it
   - Verify both own reports and org admin deletion work

## Performance Considerations

Added indexes for common query patterns:
- `idx_report_queue_requested_by_status`: For user's own reports
- `idx_report_queue_org_status`: For organization-wide queries

## Security Implications

The unified policies ensure:
1. **Consistent visibility**: Users see the same reports across all operations
2. **Proper permissions**: Regular users can only delete their own reports
3. **Admin capabilities**: Admins can manage all reports in their organization
4. **No information leakage**: 404 vs 403 errors don't reveal report existence to unauthorized users

## Monitoring

After deployment, monitor:
1. DELETE endpoint success rates
2. Any 403/404 errors in logs
3. User feedback on report management

## Related Files

- **Migration**: `/packages/database/migrations/0029_fix_report_queue_rls_final.sql`
- **API Endpoint**: `/apps/web/src/app/api/reports/[id]/route.ts`
- **Test Script**: `/scripts/fix_report_queue_delete_rls.sql`
- **Analysis Script**: `/scripts/check_report_queue_policies.sql`