# Report Delete 404 Fix - Deployment Checklist

## Issue Fixed
Reports were appearing to delete from UI but returning with 404 error and rolling back, causing them to reappear in the list.

## Files Modified

### 1. Backend API Handler
**File:** `/apps/web/src/app/api/reports/[id]/route.ts`

**Changes:**
- Removed pre-delete verification SELECT query that was being blocked by RLS
- DELETE now executes directly (RLS policies enforce permissions)
- Added idempotent delete behavior (returns success if report already deleted)
- Improved error handling and logging

### 2. Database Migration
**File:** `/packages/database/migrations/0029_fix_report_delete_idempotent.sql`

**Changes:**
- Cleaned up duplicate/conflicting SELECT policies
- Consolidated to single comprehensive SELECT policy
- Re-created DELETE policy for consistency
- Added performance index for DELETE operations

### 3. Documentation
**File:** `/docs/fixes/report-delete-404-fix.md`
- Comprehensive documentation of the problem and solution

## Deployment Steps

### Step 1: Deploy Database Migration

#### Option A: Supabase Dashboard (Recommended for Production)
1. Open your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `/packages/database/migrations/0029_fix_report_delete_idempotent.sql`
4. Paste into SQL Editor
5. Click **RUN**
6. Verify success message

#### Option B: Supabase CLI (If available)
```bash
cd /home/jayso/projects/siteproof-v2
supabase db push
```

### Step 2: Verify Migration Success

Run this query in Supabase SQL Editor:
```sql
-- Should return exactly 4 policies (one for each operation)
SELECT
  policyname,
  cmd,
  permissive
FROM pg_policies
WHERE tablename = 'report_queue'
ORDER BY cmd, policyname;
```

Expected output:
- 1 DELETE policy: "Users can delete their own reports or org admin reports"
- 1 INSERT policy: "Users can create reports in their organization"
- 1 SELECT policy: "Users can view reports in their organization"
- 1 UPDATE policy: "Users can update their own reports"

### Step 3: Deploy Frontend Changes

The code changes are already committed to `/apps/web/src/app/api/reports/[id]/route.ts`.

#### For Development:
```bash
cd /home/jayso/projects/siteproof-v2
pnpm dev
```

#### For Production:
```bash
cd /home/jayso/projects/siteproof-v2
pnpm build
pnpm start
```

Or deploy via your CI/CD pipeline (Vercel, etc.)

### Step 4: Test the Fix

#### Test Case 1: Basic Delete (Critical)
1. Log in to the application
2. Navigate to Reports page
3. Generate a test report (or use existing)
4. Click the delete button
5. **Expected:** Report disappears immediately
6. **Expected:** No 404 error in console
7. **Expected:** Report does NOT reappear after refresh

#### Test Case 2: Admin Delete (If applicable)
1. Log in as admin/owner/project manager
2. Find a report created by another user
3. Click delete
4. **Expected:** Report is deleted successfully
5. **Expected:** No permission errors

#### Test Case 3: Idempotent Delete (Advanced)
1. Delete a report
2. Try to delete the same report ID again via API call
3. **Expected:** Returns 200 success (not 404)
4. **Expected:** Message: "Report deleted successfully (or already deleted)"

### Step 5: Monitor

#### Check Console Logs
Look for these log messages:
```
Attempting to delete report: <id> for user: <user-id>
Successfully deleted report: <id> Deleted rows: 1
```

#### Check for Errors
No more of these errors:
```
Delete response status: 404
Delete failed with error data: Object
Delete error: Error: Report not found
```

## Rollback Plan

If issues occur, you can rollback:

### Database Rollback:
```sql
-- Re-create old policies if needed
-- (Refer to migration 0027_fix_report_queue_rls.sql)
```

### Code Rollback:
```bash
git revert <commit-hash>
git push
```

## Success Criteria

- [ ] Database migration runs without errors
- [ ] All 4 RLS policies exist on report_queue table
- [ ] Reports delete successfully from UI
- [ ] No 404 errors in browser console
- [ ] Deleted reports stay deleted (no rollback)
- [ ] Optimistic UI updates work correctly
- [ ] No permission errors for authorized users

## Additional Notes

- This fix implements idempotent DELETE operations (REST best practice)
- RLS policies are now simplified and non-conflicting
- The frontend gracefully handles "already deleted" cases
- All console logs are improved for debugging

## Contact

If you encounter issues during deployment:
1. Check the console logs for specific error messages
2. Verify RLS policies are correctly applied
3. Ensure the migration ran successfully
4. Review the comprehensive documentation in `/docs/fixes/report-delete-404-fix.md`

## Post-Deployment Verification

After deployment, verify the fix:
```bash
# Check that the endpoint works
curl -X DELETE \
  https://your-domain.com/api/reports/<report-id> \
  -H "Cookie: your-auth-cookie" \
  -v

# Should return 200 OK with:
# { "success": true, "message": "Report deleted successfully", "deletedCount": 1 }
```
