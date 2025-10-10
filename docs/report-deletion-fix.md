# Report Deletion Fix

## Problem

The delete button in the reports list shows a spinner when clicked but doesn't actually delete the report.

## Root Cause Analysis

### 1. RLS Policy Issue

The original RLS policy for DELETE on `report_queue` table was using an `EXISTS` subquery that may not have been working correctly with the Supabase client's DELETE operation.

### 2. Backend Query Issue

The backend was adding `.eq('organization_id', report.organization_id)` which could interfere with RLS policy evaluation. RLS policies should handle organization filtering, not the application code.

### 3. Silent Failure

When the DELETE operation returned 0 rows, the backend was still returning a 200 success response in some cases, causing the frontend to not properly handle the failure.

## Solution Applied

### Backend Changes (`/apps/web/src/app/api/reports/[id]/route.ts`)

1. **Removed redundant organization filter** (Line 64-68)
   - Changed from: `.eq('id', reportId).eq('organization_id', report.organization_id)`
   - Changed to: `.eq('id', reportId)` only
   - RLS policies now handle the organization/permission checks

2. **Enhanced error logging** (Lines 60-77)
   - Added detailed console logs showing user ID, organization ID, and permission status
   - Log full error details including code, hint, and details fields

3. **Better error responses** (Lines 85-113)
   - Return 403 with debug info when deletion fails due to RLS
   - Include user ID, report owner, and organization details for debugging

### Frontend Changes (`/apps/web/src/features/reporting/components/RecentReportsList.tsx`)

1. **Added loading toast** (Line 486)
   - Shows "Deleting report..." while operation is in progress

2. **Enhanced logging** (Lines 493, 497, 502)
   - Log response status
   - Log error data when deletion fails
   - Log successful deletion result

3. **Force refetch** (Lines 507-510)
   - Invalidate query cache AND force immediate refetch
   - Ensures UI updates immediately after successful deletion

### Database Migration (`/packages/database/migrations/0028_fix_report_queue_delete_policy.sql`)

1. **Improved DELETE policy**
   - Simplified the policy structure
   - Clear precedence: own reports first, then org admin role check
   - Better parentheses grouping for the IN clause

2. **Added helper function** (`can_delete_report`)
   - Allows debugging permission issues
   - Can be called from SQL queries or backend code
   - Returns boolean indicating if user can delete

## How to Apply

### 1. Apply Database Migration

Run the SQL migration in Supabase SQL Editor:

```sql
-- Copy and paste the contents of:
-- /packages/database/migrations/0028_fix_report_queue_delete_policy.sql
```

OR if you have Supabase CLI linked:

```bash
npx supabase db push
```

### 2. Restart Development Server

```bash
pnpm dev
```

### 3. Test Deletion

1. Navigate to the reports page
2. Click the delete (trash) icon on any report
3. Confirm the deletion in the dialog
4. Check browser console for:
   - "Deleting report: [id]"
   - "Delete response status: 200"
   - "Delete result: { success: true, ... }"
   - "Successfully deleted report: [id]"
5. Verify the report disappears from the list

## Debugging

If deletion still fails:

### 1. Check Browser Console

Look for error messages starting with:

- "Delete failed with error data:"
- "Delete error:"

### 2. Check Server Logs

Look for:

- "Attempting to delete report: [id] for user: [user-id]"
- "Delete error details:"
- "No rows deleted for report:"

### 3. Test Permission Helper

In Supabase SQL Editor:

```sql
-- Check if current user can delete a specific report
SELECT can_delete_report('report-uuid-here');

-- Check user's organization membership
SELECT om.role, om.organization_id
FROM organization_members om
WHERE om.user_id = auth.uid();

-- Check report details
SELECT id, requested_by, organization_id
FROM report_queue
WHERE id = 'report-uuid-here';
```

### 4. Check RLS Policy

```sql
-- List all policies on report_queue
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'report_queue';
```

## Testing Scenarios

### Test Case 1: Delete Own Report

- User: Regular user
- Report: Requested by same user
- Expected: Success

### Test Case 2: Delete Team Report (Admin)

- User: Organization admin/owner/PM
- Report: Requested by different user in same org
- Expected: Success

### Test Case 3: Delete Other Org Report

- User: Any role
- Report: From different organization
- Expected: Fail with 403

### Test Case 4: Delete Without Login

- User: Not authenticated
- Report: Any
- Expected: Fail with 401

## Related Files

- Backend: `/apps/web/src/app/api/reports/[id]/route.ts`
- Frontend: `/apps/web/src/features/reporting/components/RecentReportsList.tsx`
- Migration: `/packages/database/migrations/0028_fix_report_queue_delete_policy.sql`
- Previous migration: `/packages/database/migrations/0027_fix_report_queue_rls.sql`

## Prevention

To avoid similar issues in the future:

1. **Always rely on RLS policies** for authorization
2. **Don't duplicate permission checks** in application code and RLS
3. **Test empty result sets** - ensure operations fail properly when RLS denies access
4. **Use `.maybeSingle()`** instead of `.single()` when checking existence
5. **Return proper error codes** - 403 for denied, 404 for not found
6. **Add comprehensive logging** for debugging production issues
