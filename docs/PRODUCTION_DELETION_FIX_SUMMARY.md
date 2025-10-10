# Production Report Deletion Issue - Diagnostic & Fix Summary

## Problem
Report deletion works in test browser but fails in production browser with "Failed to delete report" error.

## Root Cause Analysis

### Most Likely Causes (in order of probability)

1. **Migration Not Applied** ⭐ MOST LIKELY
   - Migration 0031 may not have been applied to production database
   - Test environment has the fix, production doesn't

2. **Conflicting DELETE Policies**
   - Multiple DELETE policies causing permission conflicts
   - Policy from migration 0029 (restrictive) vs 0030 (permissive)

3. **Different Database Projects**
   - Test browser hitting different Supabase project than production
   - Environment variable mismatch

4. **User Context Issues**
   - Missing organization_id in production user session
   - Different user roles between environments

## Immediate Action Plan

### Step 1: Run Diagnostic (2 minutes)
Run this in your **PRODUCTION** Supabase SQL Editor:
```sql
-- File: scripts/diagnose_production_database.sql
```

Look for:
- ❌ Migration 0031 NOT found
- ⚠️ Multiple DELETE policies
- ❌ No DELETE policy

### Step 2: Quick Fix (If Needed)

#### If Migration Missing:
```sql
-- Apply migration manually
-- File: packages/database/migrations/0031_final_fix_report_delete_permissions.sql
```

#### If Policies Conflicting:
```sql
-- Run emergency fix
-- File: scripts/emergency_fix_production_delete.sql
BEGIN;
-- Review output, then:
COMMIT;  -- or ROLLBACK if issues
```

### Step 3: Verify Fix
Test deletion in production browser immediately after applying fix.

## Files Created for Debugging

| File | Purpose | When to Use |
|------|---------|-------------|
| `/home/jayso/projects/siteproof-v2/scripts/diagnose_production_database.sql` | Complete diagnostic of production DB | Run FIRST in production |
| `/home/jayso/projects/siteproof-v2/scripts/compare_test_vs_production.sql` | Compare test vs prod environments | Run in BOTH environments |
| `/home/jayso/projects/siteproof-v2/scripts/emergency_fix_production_delete.sql` | Quick fix for DELETE policy | If diagnostic shows issues |
| `/home/jayso/projects/siteproof-v2/scripts/add_production_debug_logging.sql` | Add audit logging | If problem persists |
| `/home/jayso/projects/siteproof-v2/docs/troubleshooting-report-deletion.md` | Complete troubleshooting guide | Reference for all scenarios |

## Quick Commands for Production Supabase SQL Editor

### Check Migration Status:
```sql
SELECT name, executed_at
FROM supabase_migrations.schema_migrations
WHERE name LIKE '%0031%';
```

### Check DELETE Policies:
```sql
SELECT policyname, qual::text
FROM pg_policies
WHERE tablename = 'report_queue' AND cmd = 'DELETE';
```

### Test Specific Report:
```sql
SELECT * FROM debug_report_delete_permission('your-report-id'::uuid);
```

### Force Delete (Emergency):
```sql
SELECT force_delete_report('your-report-id'::uuid);
```

## Expected Resolution

After running the diagnostic and applying the appropriate fix:

1. **Single DELETE policy** should exist: `report_queue_delete_allow_org_members`
2. Policy should allow deletion by:
   - Report creator (requested_by = user_id)
   - Any organization member

3. Test by:
   - Deleting a report you created
   - Confirming deletion in UI
   - Checking browser console for errors

## If Problem Persists

1. **Enable Debug Logging:**
   ```sql
   -- Run: scripts/add_production_debug_logging.sql
   ```

2. **Check Debug Logs:**
   ```sql
   SELECT * FROM get_recent_deletion_attempts();
   ```

3. **Contact Support** with:
   - Diagnostic script output
   - Debug log entries
   - Browser console errors
   - Network tab screenshots

## Prevention

1. **Ensure migrations are applied to all environments:**
   ```bash
   npm run migrate:prod
   ```

2. **Add health check endpoint:**
   ```typescript
   // Check RLS policies match expected state
   ```

3. **Monitor policy changes:**
   - Set up alerts for RLS policy modifications
   - Regular audit of database policies

## Key Insights from Code Review

The DELETE route (`/home/jayso/projects/siteproof-v2/apps/web/src/app/api/reports/[id]/route.ts`):
- Has extensive logging (CODE VERSION: 2025-10-11-v2)
- Properly checks user authentication
- Relies entirely on RLS policies for permission enforcement
- Returns detailed error information

The issue is **definitely at the database/RLS level**, not in the application code.

## Next Steps

1. ✅ Run diagnostic script in production
2. ✅ Apply appropriate fix based on results
3. ✅ Test deletion in production
4. ✅ Confirm fix with user
5. ⏳ Consider adding permanent monitoring

---

**Time to Resolution: ~5-10 minutes** once you run the diagnostic script.