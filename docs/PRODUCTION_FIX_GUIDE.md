# 🚨 PRODUCTION FIX: Report Deletion 404 Error

## Problem Summary

**Symptom**: Reports can be viewed (GET 200) but cannot be deleted (DELETE 404) in production

**Root Cause**: Migration 0032 (RLS policy alignment) applied in dev but NOT in production

**Impact**: All organization members can see reports but only admins/owners can delete them

## Quick Diagnosis (30 seconds)

Run this in your production Supabase SQL Editor:

```sql
-- Check if DELETE policy has role restrictions
SELECT
  polname,
  pg_get_expr(polqual, polrelid) as policy_logic
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd';
```

**If you see `role = ANY` or `role IN`** → Bug confirmed, proceed with fix below

## The Fix (5 minutes)

### Option 1: Apply Full Migration (Recommended)

1. Open **Supabase Dashboard** → Your Production Project → **SQL Editor**
2. Copy the ENTIRE contents of `/packages/database/migrations/0032_ensure_report_rls_alignment.sql`
3. Paste into SQL Editor and click **Run**
4. Verify success message: `SUCCESS: SELECT and DELETE policies are perfectly aligned`

### Option 2: Quick Fix (If migration fails)

Run this in Supabase SQL Editor:

```sql
BEGIN;

-- Drop old restrictive DELETE policy
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

-- Create new aligned DELETE policy (matches SELECT)
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);

-- Verify alignment
DO $$
DECLARE
  select_expr TEXT;
  delete_expr TEXT;
BEGIN
  SELECT pg_get_expr(polqual, polrelid) INTO select_expr
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'r';

  SELECT pg_get_expr(polqual, polrelid) INTO delete_expr
  FROM pg_policy
  WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';

  IF select_expr = delete_expr THEN
    RAISE NOTICE '✅ SUCCESS: Policies are aligned';
  ELSE
    RAISE WARNING '❌ MISMATCH: SELECT and DELETE differ';
    RAISE WARNING 'SELECT: %', select_expr;
    RAISE WARNING 'DELETE: %', delete_expr;
  END IF;
END $$;

COMMIT;
```

## Verification (2 minutes)

### 1. Check Policy Alignment

```sql
SELECT
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'd' THEN 'DELETE'
  END as operation,
  pg_get_expr(polqual, polrelid) as policy_logic
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd IN ('r', 'd')
ORDER BY polcmd;
```

**Expected**: Both SELECT and DELETE should have IDENTICAL `policy_logic` (no role restrictions)

### 2. Test Deletion in App

1. Navigate to production app: Reports page
2. Try deleting a report
3. **Expected**: Report deletes successfully, no 404 error
4. **Expected**: Network tab shows `DELETE 200 OK` with `deletedCount: 1`

### 3. Verify Server Logs

Look for these log entries:

```
[DELETE /api/reports/[id]] Request received - CODE VERSION: 2025-10-11-v4-rls-trust
[DELETE /api/reports/[id]] Attempting deletion, RLS will enforce permissions
Successfully deleted report: [id] deletedCount: 1
```

## Rollback (If needed)

If you need to revert to the old (restrictive) policy:

```sql
BEGIN;

-- Drop new policy
DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

-- Restore old restrictive policy
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin', 'project_manager')
  )
);

COMMIT;
```

## Why This Happened

1. **Code deployed via Vercel** → ✅ Successful (v4-rls-trust running)
2. **Database migration via Supabase CLI** → ❌ Migration 0032 not applied
3. **Result**: Code expects aligned policies, but production has old restrictive policy

## Prevent Future Issues

### Add migration to CI/CD path:

```bash
# Copy to Supabase-monitored directory
cp packages/database/migrations/0032_ensure_report_rls_alignment.sql \
   supabase/migrations/

# Commit and deploy
git add supabase/migrations/0032_ensure_report_rls_alignment.sql
git commit -m "fix: ensure migration 0032 is in CI/CD path"
git push
```

## Support

- **Migration file**: `/packages/database/migrations/0032_ensure_report_rls_alignment.sql`
- **Git commits**: 815d248 (code fix), 32029c6 (multi-org GET)
- **Investigation**: Full swarm analysis in `/docs/` folder

---

**Status**: Ready to apply
**Estimated time**: 5 minutes
**Risk level**: Low (migration includes verification and rollback)
