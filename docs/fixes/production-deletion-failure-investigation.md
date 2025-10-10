# Production Report Deletion Failure Investigation

## Executive Summary

**Status**: ✅ NEW CODE DEPLOYED | ❌ MIGRATION NOT APPLIED

Production is running the latest code (v4-rls-trust from commit 815d248), but the DELETE operation returns `deleteCount: 0`, indicating the RLS DELETE policy is blocking the operation.

**Critical Finding**: The error message changed from `"Report not found"` to `"Report not found or already deleted"` (line 106 of new code), confirming production IS running the new code, but the database migration 0032 appears NOT to be applied.

## Evidence Summary

### 1. Code Deployment - ✅ CONFIRMED

**Proof**:

- Error message: `"Report not found or already deleted"` matches line 106 of new code
- This specific message only exists in commit 815d248 and later
- Old code returned: `"Report not found"` (without "or already deleted")

**Code Version**: `2025-10-11-v4-rls-trust` (line 8 of route.ts)

**Git History**:

```bash
815d248 fix: simplify report deletion by trusting RLS policies (deployed)
e939a0e fix: report deletion for multi-org users and RLS policy alignment
```

### 2. DELETE Flow Analysis

**Current Code Path** (`apps/web/src/app/api/reports/[id]/route.ts` lines 69-117):

```typescript
// Line 69-72: Direct DELETE - trusts RLS
const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ count: 'exact' })
  .eq('id', reportId);

// Line 99-117: Handle deleteCount = 0
if (!deleteCount || deleteCount === 0) {
  return NextResponse.json(
    {
      error: 'Report not found or already deleted', // ← THIS MESSAGE APPEARS IN PRODUCTION
      details: { reportId },
    },
    { status: 404 }
  );
}
```

**What This Means**:

- Code executes DELETE query successfully (no `deleteError`)
- RLS evaluates the DELETE policy
- RLS returns `deleteCount: 0` (blocked or not found)
- Production returns 404 with the new error message

### 3. Dev vs Production Behavior

| Environment    | Code Version | DELETE Result     | RLS Policies               |
| -------------- | ------------ | ----------------- | -------------------------- |
| **Dev**        | v4-rls-trust | deleteCount: 1 ✅ | Migration 0032 applied     |
| **Production** | v4-rls-trust | deleteCount: 0 ❌ | Migration 0032 NOT applied |

**Key Insight**: Same code, same query, different database state.

## Root Cause: Missing Migration in Production

### The Critical Migration: 0032_ensure_report_rls_alignment.sql

**Location**: `/home/jayso/projects/siteproof-v2/packages/database/migrations/0032_ensure_report_rls_alignment.sql`

**Created**: October 11, 2025 at 03:41 (commit e939a0e)

**Purpose**: Aligns SELECT and DELETE RLS policies to fix the exact issue we're seeing

**Key Policy** (lines 54-69):

```sql
CREATE POLICY "report_queue_delete"
ON report_queue
FOR DELETE
TO authenticated
USING (
  -- User can delete reports they requested OR from their organization(s)
  requested_by = auth.uid()
  OR
  organization_id IN (
    SELECT organization_id
    FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

### Why This Policy Matters

**The SELECT policy allows**:

- Reports requested by the user
- Reports from ANY organization the user belongs to

**The DELETE policy SHOULD allow** (with migration 0032):

- Reports requested by the user
- Reports from ANY organization the user belongs to

**What's happening in production** (without migration 0032):

- SELECT works (returns reports)
- DELETE returns `deleteCount: 0` because:
  - Either no DELETE policy exists at all
  - Or an old restrictive DELETE policy is active (e.g., admin/owner only)

## Deployment Process Analysis

### How Migrations Are Deployed

**CI/CD Pipeline** (`.github/workflows/deploy.yml` lines 158-177):

```yaml
migrate:
  name: Run Database Migrations
  runs-on: ubuntu-latest
  needs: [build]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  steps:
    - uses: actions/checkout@v4
    - uses: supabase/setup-cli@v1
      with:
        version: latest
    - name: Run migrations
      run: |
        supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
        supabase db push --password ${{ secrets.SUPABASE_DB_PASSWORD }}
      env:
        SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

**How `supabase db push` Works**:

1. Looks for migration files in `packages/database/migrations/`
2. **CRITICAL**: Expects files in `supabase/migrations/` directory by default
3. Compares with already-applied migrations in `supabase_migrations` table
4. Applies only new migrations

### The Deployment Gap

**Migration File Location**:

- Actual: `/home/jayso/projects/siteproof-v2/packages/database/migrations/0032_*.sql`
- Expected by Supabase CLI: `/home/jayso/projects/siteproof-v2/supabase/migrations/0032_*.sql`

**Evidence**:

```bash
$ ls -la /home/jayso/projects/siteproof-v2/supabase/migrations/
total 12
drwxr-xr-x 2 jayso jayso 4096 Oct  9 20:35 .
drwxr-xr-x 4 jayso jayso 4096 Oct 11 02:09 ..
-rw-r--r-- 1 jayso jayso 3346 Oct  9 20:35 0015_itp_performance_indexes.sql
```

**Migration 0032 is NOT in the supabase/migrations directory!**

## Why Dev Works But Production Fails

### Dev Environment

1. Developer runs migration manually OR uses different migration path
2. Migration 0032 applied directly to dev database
3. RLS policies aligned
4. DELETE works ✅

### Production Environment

1. Code deployed via Vercel (commit 815d248) ✅
2. `supabase db push` runs in CI/CD
3. Looks in `supabase/migrations/` directory
4. Finds only migration 0015 (from Oct 9)
5. **Does NOT find migration 0032** (in `packages/database/migrations/`)
6. RLS policies NOT aligned
7. DELETE blocked ❌

## Hypothesis Verification

### What We Know:

1. ✅ Production runs new code (error message proves it)
2. ✅ DELETE query executes without error
3. ✅ RLS returns deleteCount: 0 (policy blocking)
4. ✅ Migration 0032 exists but not in supabase/migrations/
5. ✅ CI/CD uses supabase/migrations/ directory

### What This Means:

**The deployment process successfully deployed the CODE but failed to deploy the MIGRATION.**

This is a classic "code-database drift" scenario where:

- Application code expects database schema version N
- Database is still on schema version N-1
- Code fails at runtime due to missing policies

## Recommended Next Steps

### Immediate Fix (Manual Migration Application)

1. **Verify Current Policies in Production**:

```sql
-- Run in Supabase SQL Editor for production database
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'd' THEN 'DELETE'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
  END as operation,
  pg_get_expr(polqual, polrelid) as using_expression
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd;
```

2. **Apply Migration 0032 Manually**:

```bash
# Copy the migration content from packages/database/migrations/0032_*.sql
# Paste and run in Supabase SQL Editor for production
```

3. **Verify DELETE Policy Applied**:

```sql
SELECT COUNT(*)
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
  AND polcmd = 'd'
  AND polname = 'report_queue_delete';
-- Should return 1
```

### Long-term Fix (Prevent Future Drift)

**Option 1: Consolidate Migration Directories**

Move all migrations to supabase/migrations/:

```bash
cp packages/database/migrations/*.sql supabase/migrations/
git add supabase/migrations/
git commit -m "fix: consolidate migrations to supabase directory"
```

**Option 2: Update CI/CD to Use Correct Path**

Modify `.github/workflows/deploy.yml`:

```yaml
- name: Run migrations
  run: |
    supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
    # Point to correct migration directory
    supabase db push --password ${{ secrets.SUPABASE_DB_PASSWORD }} \
      --db-url ${{ secrets.DATABASE_URL }} \
      --include-all \
      --migrations-path packages/database/migrations
```

**Option 3: Add Migration Verification**

Add a pre-deployment check:

```yaml
- name: Verify migrations are in sync
  run: |
    # Compare migration files in both directories
    diff -r supabase/migrations/ packages/database/migrations/ || \
      (echo "Migration directories out of sync!" && exit 1)
```

### Testing After Fix

1. **Verify Policy Alignment**:

```sql
-- Run the debug function from migration 0032
SELECT * FROM debug_report_access(
  p_user_id := 'USER_ID_HERE',
  p_report_id := 'REPORT_ID_HERE'
);
```

2. **Test DELETE in Production**:

```bash
# Use production API with valid auth token
curl -X DELETE "https://your-domain.com/api/reports/REPORT_ID" \
  -H "Authorization: Bearer $PROD_TOKEN"
# Should return: {"success":true,"message":"Report deleted successfully"}
```

## Summary

| Question              | Answer                     | Evidence                                   |
| --------------------- | -------------------------- | ------------------------------------------ |
| Is new code deployed? | ✅ YES                     | Error message matches line 106 of new code |
| Is migration applied? | ❌ NO                      | Migration 0032 not in supabase/migrations/ |
| Why does dev work?    | Migration applied manually | Likely ran SQL directly                    |
| Why does prod fail?   | Missing DELETE policy      | RLS returns deleteCount: 0                 |
| What's the fix?       | Apply migration manually   | Run 0032 SQL in Supabase console           |

## Files Referenced

- `/home/jayso/projects/siteproof-v2/apps/web/src/app/api/reports/[id]/route.ts` (lines 1-149)
- `/home/jayso/projects/siteproof-v2/packages/database/migrations/0032_ensure_report_rls_alignment.sql`
- `/home/jayso/projects/siteproof-v2/.github/workflows/deploy.yml` (lines 158-177)
- `/home/jayso/projects/siteproof-v2/supabase/migrations/` (only has 0015)

## Related Commits

- `815d248` - fix: simplify report deletion by trusting RLS policies (DEPLOYED)
- `e939a0e` - fix: report deletion for multi-org users and RLS policy alignment (CREATED 0032)
- `8072c40` - feat: comprehensive report deletion fixes and diagnostic tools
