# Report Deletion 404 Error - Complete Diagnosis

## Problem Statement

DELETE /api/reports/[id] returns 404 "Report not found or you do not have permission to delete it" when:
- The same report can be successfully fetched via GET /api/reports
- The user has permission to view the report
- The report ID is valid and exists in the database

## Current Code State (v3-multi-org)

The route has already been updated to remove the problematic organization_id filter:

**File:** `/apps/web/src/app/api/reports/[id]/route.ts`
**Version:** `2025-10-11-v3-multi-org` (line 7)

### Current Logic Flow

1. **Get user** (lines 15-29)
2. **Get user's organization memberships** (lines 40-57)
3. **Lookup report via RLS** (lines 64-71) - **No explicit org filter**
4. **Verify report exists** (lines 81-91)
5. **Verify report belongs to user's org** (lines 95-105) - **Post-RLS check**
6. **Execute DELETE** (lines 108-111)
7. **Handle results** (lines 114-122)

## The Remaining Issue

Even though the code has been updated, the 404 error persists. This suggests:

### Hypothesis 1: RLS SELECT Policy is Blocking

The lookup at lines 64-71 uses:
```typescript
const { data: report } = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId)
  .maybeSingle();
```

This query is subject to RLS SELECT policy. If RLS policy filters out the report, `report` will be `null`, causing 404 at line 81.

**Evidence supporting this:**
- GET /api/reports (list endpoint) uses RLS and shows the report ✅
- DELETE pre-check uses RLS and **does not** show the report ❌

**Why the difference?**

#### GET /api/reports (List Endpoint)
```typescript
// No specific report ID filter - shows ALL accessible reports
const { data: reports } = await supabase
  .from('report_queue')
  .select('*');
  // RLS: organization_id IN (SELECT ... FROM organization_members WHERE user_id = auth.uid())
```

#### DELETE /api/reports/[id] (Pre-check)
```typescript
// Specific report ID - must match BOTH .eq() AND RLS policy
const { data: report } = await supabase
  .from('report_queue')
  .select('id, requested_by, organization_id')
  .eq('id', reportId);  // ← May fail if RLS filtering is too restrictive
```

### Hypothesis 2: RLS Policy Mismatch

Looking at the base migration `/packages/database/migrations/0010_report_queue.sql`:

**SELECT Policy (lines 294-301):**
```sql
CREATE POLICY "Users can view reports in their organization"
  ON report_queue FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM organization_members
      WHERE user_id = auth.uid()
    )
  );
```

**DELETE Policy:** **MISSING in base migration 0010**

This means:
1. SELECT works fine (policy exists)
2. DELETE would fail (no policy exists)
3. Migration 0031 was supposed to add DELETE policy, but may not be applied

### Hypothesis 3: Database Migration State

The database may be in an inconsistent state:
- Base migration 0010: ✅ Applied (SELECT policy exists)
- Migration 0031: ❓ Unknown (DELETE policy may not exist)
- Overlapping migrations (0027, 0028 variants): ❓ May have conflicts

## Root Cause Analysis

Based on the evidence:

1. **Primary Issue:** Missing or ineffective DELETE policy
   - Base migration 0010 has no DELETE policy
   - Migration 0031 should add it, but status is unknown
   - Without DELETE policy, ANY delete attempt will fail

2. **Secondary Issue:** RLS SELECT filtering edge case
   - The pre-check query at line 70 returns `null` even though RLS policy should allow access
   - This could be due to:
     - Timing: User's organization membership not yet committed
     - Multi-org: User has multiple memberships, report belongs to org #2 but checking org #1
     - RLS context: `auth.uid()` not properly set in Supabase client

3. **Code Logic Issue:** Post-RLS organization verification (lines 95-105)
   - After RLS filters, code manually checks `if (!orgIds.includes(report.organization_id))`
   - This is redundant if RLS policy is correct
   - But necessary if RLS policy has edge cases

## Diagnostic Steps

### Step 1: Verify RLS Policies Exist

**Query to run:**
```sql
SELECT
  polname as policy_name,
  CASE polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END as command,
  pg_get_expr(polqual, polrelid) as using_clause
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass
ORDER BY polcmd, polname;
```

**Expected result:**
```
policy_name                                    | command | using_clause
----------------------------------------------+---------+------------------------------------
Users can view reports in their organization   | SELECT  | (organization_id IN (...))
Users can create reports in their organization | INSERT  | (organization_id IN (...))
Users can update their own reports             | UPDATE  | (requested_by = auth.uid() OR ...)
report_queue_delete_allow_org_members          | DELETE  | (requested_by = auth.uid() OR ...) ← MUST EXIST
```

If DELETE policy is missing → Apply migration 0031

### Step 2: Test RLS Context

**Add logging to the route:**
```typescript
// After line 43, add:
console.log('[DELETE] RLS context check:', {
  supabaseURL: supabase.supabaseUrl,
  hasAuthHeader: !!_request.headers.get('authorization'),
  userId: user.id,
});

// After line 71, add:
console.log('[DELETE] Report lookup result:', {
  found: !!report,
  reportId: report?.id,
  reportOrgId: report?.organization_id,
  userOrgIds: orgIds,
});
```

This will show if RLS is properly filtering based on user context.

### Step 3: Test Report Visibility

**Direct database query:**
```sql
-- Set user context (replace with actual user ID)
SET request.jwt.claims.sub = 'USER_ID_HERE';

-- Try to select the report
SELECT id, organization_id, requested_by, report_name
FROM report_queue
WHERE id = 'REPORT_ID_HERE';

-- Check user's organization membership
SELECT organization_id, role
FROM organization_members
WHERE user_id = 'USER_ID_HERE';
```

If this query returns the report → RLS policy is correct, but Supabase client context is wrong

If this query returns nothing → RLS policy is blocking access

### Step 4: Test DELETE Directly

**Skip the pre-check:**
```typescript
// Comment out lines 62-105 (the entire pre-check block)
// Go straight to DELETE:

const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ count: 'exact' })
  .eq('id', reportId);

console.log('[DELETE] Direct delete result:', {
  error: deleteError,
  deleteCount,
  reportId,
});
```

**Outcomes:**
- `deleteCount = 1`: DELETE policy exists and works → Pre-check is the problem
- `deleteCount = 0`: DELETE policy missing or blocking → Apply migration 0031
- `deleteError with code 42501`: RLS policy explicitly denying DELETE → Check policy logic

## Recommended Fix

### Immediate Fix: Skip Pre-check, Trust RLS

**Edit `/apps/web/src/app/api/reports/[id]/route.ts`:**

Replace lines 62-111 with:
```typescript
// Delete directly - let RLS policies handle authorization
const { error: deleteError, count: deleteCount } = await supabase
  .from('report_queue')
  .delete({ count: 'exact' })
  .eq('id', reportId);

// Log result
console.log('[DELETE /api/reports/[id]] Delete result:', {
  reportId,
  deleteCount,
  error: deleteError?.message,
  errorCode: deleteError?.code,
});

// Handle RLS permission denied
if (deleteError) {
  if (deleteError.code === '42501') {
    console.warn('[DELETE /api/reports/[id]] RLS policy denied deletion', {
      reportId,
      userId: user.id,
    });
    return NextResponse.json(
      { error: 'You do not have permission to delete this report' },
      { status: 403 }
    );
  }

  console.error('[DELETE /api/reports/[id]] Delete error:', {
    message: deleteError.message,
    details: deleteError.details,
    hint: deleteError.hint,
    code: deleteError.code,
  });
  return NextResponse.json(
    { error: `Failed to delete report: ${deleteError.message}` },
    { status: 500 }
  );
}

// Handle not found or already deleted
if (!deleteCount || deleteCount === 0) {
  console.warn('[DELETE /api/reports/[id]] No rows deleted', {
    reportId,
    userId: user.id,
  });
  return NextResponse.json(
    {
      error: 'Report not found or you do not have permission to delete it',
      details: { reportId },
    },
    { status: 404 }
  );
}

// Success
console.log('[DELETE /api/reports/[id]] Successfully deleted report:', reportId);
return NextResponse.json({
  success: true,
  message: 'Report deleted successfully',
  deletedCount: deleteCount,
});
```

**Advantages:**
- Eliminates the problematic pre-check
- One less database query (better performance)
- RLS policies handle all authorization
- Simpler, more maintainable code

**Disadvantages:**
- Can't distinguish between "not found" and "no permission" (both return 404)
- Less granular error messages

### Database Fix: Ensure DELETE Policy Exists

**Run diagnostic query:**
```sql
SELECT COUNT(*) as delete_policy_count
FROM pg_policy
WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';
```

**If count = 0:** Apply migration 0031
```bash
# Connect to database
psql $DATABASE_URL

# Apply migration
\i packages/database/migrations/0031_final_fix_report_delete_permissions.sql

# Verify
SELECT polname FROM pg_policy WHERE polrelid = 'report_queue'::regclass AND polcmd = 'd';
```

## Testing After Fix

### Test Case 1: User deletes their own report
```bash
curl -X DELETE \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3000/api/reports/REPORT_ID
```
**Expected:** 200 OK, `{ success: true, deletedCount: 1 }`

### Test Case 2: User deletes non-existent report
```bash
curl -X DELETE \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3000/api/reports/00000000-0000-0000-0000-000000000000
```
**Expected:** 404 Not Found

### Test Case 3: User tries to delete another org's report
```bash
# Report belongs to org A, user belongs to org B
curl -X DELETE \
  -H "Authorization: Bearer $USER_TOKEN" \
  http://localhost:3000/api/reports/OTHER_ORG_REPORT_ID
```
**Expected:** 404 Not Found (RLS filters it out)

### Test Case 4: Admin deletes org member's report
```bash
# User is admin in org, report belongs to same org
curl -X DELETE \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/api/reports/ORG_REPORT_ID
```
**Expected:** 200 OK (if DELETE policy allows admin deletion)

## Conclusion

The 404 error is caused by one or both of:

1. **Pre-check returning null** even though RLS should allow SELECT
   - **Fix:** Remove pre-check, trust RLS policies

2. **Missing DELETE policy** in database
   - **Fix:** Apply migration 0031 to add DELETE policy

The recommended approach is to **do both fixes** for maximum reliability:
1. Simplify route code to skip pre-check
2. Verify and apply DELETE policy migration

This ensures the system works correctly regardless of which issue is the primary cause.
