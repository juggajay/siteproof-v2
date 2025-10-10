# Quick Fix Reference - Report Deletion Bug

## TL;DR

**Problem**: Users can see reports but cannot delete them
**Cause**: DELETE policy requires admin role, SELECT policy doesn't
**Fix**: Remove role restriction from DELETE policy

---

## 1-Minute Diagnosis

Run in Supabase SQL Editor:

```sql
-- Check if bug exists
SELECT pg_get_expr(polqual, polrelid) AS delete_policy
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';
```

**If output contains `role = ANY(ARRAY['owner', 'admin', 'project_manager'])`** → BUG CONFIRMED ❌

**If output does NOT contain role check** → ALREADY FIXED ✓

---

## 1-Minute Fix

### Option A: Quick Fix (30 seconds)

```sql
BEGIN;

DROP POLICY IF EXISTS "report_queue_delete" ON report_queue;

CREATE POLICY "report_queue_delete"
ON report_queue FOR DELETE TO authenticated
USING (
  requested_by = auth.uid() OR
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);

COMMIT;
```

### Option B: Full Fix Script (1 minute)

Copy and run: `/scripts/PRODUCTION_IMMEDIATE_FIX.sql`

### Option C: Complete Migration (2 minutes)

Copy and run: `/packages/database/migrations/0032_ensure_report_rls_alignment.sql`

---

## 1-Minute Verification

```sql
-- Test DELETE (rolled back, safe to run)
BEGIN;

DELETE FROM report_queue WHERE id = '[report-id]' RETURNING id;
-- Should return 1 row

ROLLBACK;
```

**If returns 1 row** → FIXED ✓
**If returns 0 rows** → Still broken ❌

---

## Test in App

1. Go to Reports page
2. Delete any report
3. Should succeed (before: 404 error)

---

## If Fix Doesn't Work

Run full diagnostic: `/scripts/diagnose_production_rls_policies.sql`

Check for:

- Multiple DELETE policies (should be exactly 1)
- auth.uid() returns NULL (auth issue)
- User not in organization (data issue)

---

## Files

- **Full Report**: `/docs/DEBUGGER_FINAL_REPORT.md`
- **Detailed Analysis**: `/docs/RLS_POLICY_SMOKING_GUN.md`
- **Fix Script**: `/scripts/PRODUCTION_IMMEDIATE_FIX.sql`
- **Migration**: `/packages/database/migrations/0032_ensure_report_rls_alignment.sql`
- **Diagnostic**: `/scripts/diagnose_production_rls_policies.sql`

---

## The Bug in One Sentence

Migration 0029 added `AND role = ANY(ARRAY['owner', 'admin', 'project_manager'])` to the DELETE policy but not the SELECT policy, causing users to see reports they cannot delete.
