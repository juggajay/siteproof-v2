# Report Queue DELETE Policy Migration Guide

## Problem

The original `report_queue` table migration (0010) did not include a DELETE policy, causing delete operations to fail silently due to RLS (Row Level Security) restrictions.

## Root Cause Analysis

The migration `0028_fix_report_queue_delete_policy.sql` was failing with error:

```
ERROR: 42883: function can_delete_report(uuid) does not exist
```

This error occurred because:

1. The function creation might be failing silently due to `auth.uid()` not being available in some contexts
2. The view was trying to use the function before it was successfully created
3. Supabase's auth schema might not be properly accessible during migration

## Solution Approaches

We've created multiple migration files to address this issue:

### 1. **Minimal Fix (RECOMMENDED)**

**File:** `0028_minimal_delete_fix.sql`

- Just adds the DELETE policy
- No functions, no views
- Most reliable, least complex
- **Use this if you just need DELETE to work**

### 2. **Safe Version**

**File:** `0028_fix_report_queue_delete_safe.sql`

- DELETE policy with safer syntax
- Debug function that takes user_id as parameter
- Debug view without function calls in SELECT
- **Use this if you need debugging capabilities**

### 3. **Separated Components** (for debugging)

- `0028_a_policy_only.sql` - Just the policy
- `0028_b_functions.sql` - Just the helper functions
- `0028_c_view.sql` - Just the diagnostic view
- **Use these to identify where failures occur**

### 4. **Debug Tools**

- `0028_debug_test.sql` - Pre-migration diagnostic
- `0028_test_suite.sql` - Post-migration verification

## Migration Steps

### Option 1: Quick Fix (Recommended)

```bash
# Apply the minimal fix
supabase migration up --file 0028_minimal_delete_fix.sql

# Verify it worked
supabase migration up --file 0028_test_suite.sql
```

### Option 2: Full Featured with Debugging

```bash
# Run diagnostics first
supabase migration up --file 0028_debug_test.sql

# Apply the safe version
supabase migration up --file 0028_fix_report_queue_delete_safe.sql

# Verify
supabase migration up --file 0028_test_suite.sql
```

### Option 3: Step-by-Step Debugging

```bash
# Apply each component separately
supabase migration up --file 0028_a_policy_only.sql
# Check if DELETE works now

supabase migration up --file 0028_b_functions.sql
# Check if functions were created

supabase migration up --file 0028_c_view.sql
# Check if view works
```

## Testing DELETE Operations

After applying the migration, test with:

```sql
-- As a user, try to delete your own report
DELETE FROM report_queue WHERE id = 'your-report-id';

-- Check what you can delete
SELECT * FROM report_queue WHERE requested_by = auth.uid();

-- If using the debug view (safe version)
SELECT * FROM report_queue_debug WHERE can_delete_calculated = true;
```

## Rollback

If you need to rollback:

```sql
-- Remove the DELETE policy
DROP POLICY IF EXISTS "Users can delete their own reports or org admin reports" ON report_queue;

-- Remove debug functions (if created)
DROP FUNCTION IF EXISTS can_delete_report(UUID);
DROP FUNCTION IF EXISTS can_delete_report(UUID, UUID);
DROP FUNCTION IF EXISTS check_report_delete_permission(UUID, UUID);

-- Remove debug views (if created)
DROP VIEW IF EXISTS report_queue_permissions;
DROP VIEW IF EXISTS report_queue_debug;
```

## Policy Logic

The DELETE policy allows two scenarios:

1. **Users can delete their own reports:** `requested_by = auth.uid()`
2. **Organization admins can delete any report in their org:** Users with roles 'owner', 'admin', or 'project_manager'

## Troubleshooting

If the migration fails:

1. **Check auth schema:**

   ```sql
   SELECT EXISTS (
     SELECT 1 FROM pg_namespace WHERE nspname = 'auth'
   ) AS auth_schema_exists;
   ```

2. **Check existing policies:**

   ```sql
   SELECT polname FROM pg_policy
   WHERE polrelid = 'report_queue'::regclass;
   ```

3. **Test auth.uid():**

   ```sql
   SELECT auth.uid();
   ```

4. **Check RLS is enabled:**
   ```sql
   SELECT relrowsecurity FROM pg_class
   WHERE relname = 'report_queue';
   ```

## Production Deployment

For production:

1. Use `0028_minimal_delete_fix.sql` for simplicity and reliability
2. Test in staging first
3. Have rollback script ready
4. Monitor for any DELETE operation failures post-deployment

## Related Files

- Original table creation: `0010_report_queue.sql`
- RLS fix for SELECT: `0027_fix_report_queue_rls.sql`
- API endpoint: `apps/web/src/app/api/reports/[id]/route.ts`
